/**
 * Profile loader — E4.
 *
 * Replaces the E2 stub with a real on-disk loader that reads 9 YAML files
 * from `profiles/<tenant>/`, validates each against the Zod schemas in
 * `packages/schemas/src/profile/`, and returns a `ProfileHandle` backed by
 * the loaded data.
 *
 * `createDefaultProfile()` is preserved for test suites that don't need an
 * on-disk profile. It mirrors the empty-but-valid shape of `profiles/_template/`.
 *
 * Per-file validation errors surface the exact file name and Zod issue path
 * so the operator knows exactly which YAML and which key to fix — not a
 * generic "profile invalid" message. Hard rule: no silent fallback on boot
 * failure (D-008 / D-021).
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  type ApprovalMatrixYaml,
  ApprovalMatrixYamlSchema,
  type AuthYaml,
  AuthYamlSchema,
  type CustomEntitiesYaml,
  CustomEntitiesYamlSchema,
  type EventsYaml,
  EventsYamlSchema,
  type FieldAliasesYaml,
  FieldAliasesYamlSchema,
  type HarnessErrorCode,
  type LobYamlV1,
  LobYamlV1Schema,
  ManifestYamlSchema,
  type PiiPolicyYaml,
  PiiPolicyYamlSchema,
  type RolesYaml,
  RolesYamlSchema,
  type TypelistsYaml,
  TypelistsYamlSchema,
  checkBaaGate,
} from '@intentsolutions/guidewire-schemas';
import jsYaml from 'js-yaml';

export interface ProfileHandle {
  /** Stable tenant slug (e.g. `acme-insurance-pc-dev`). */
  readonly tenantId: string;
  /** Profile schema version (e.g. `v1.0`, `v2.0` per D-020). */
  readonly schemaVersion: string;
  /**
   * Maps a Guidewire raw field name to the carrier-vocabulary term per
   * `field-aliases.yaml`. Returns the original name when no alias is
   * declared — a missing alias is not a refusal at read time, it just
   * surfaces the raw field.
   */
  fieldAlias(scope: AliasScope, rawField: string): string;
  /**
   * Maps a typelist value (e.g. `JobSubtype.Submission`) to its
   * customer-extended label per `typelists.yaml`. Returns the code when
   * no extension is declared.
   */
  typelistLabel(typelist: string, code: string): string;
  /**
   * Whether the profile has all required files for the named tool. The
   * E2 stub returns `true` for all 5 in-scope tools' requirements; when
   * the real loader lands, it walks the actual file set.
   */
  hasRequiredFiles(requiredFiles: readonly string[]): boolean;
}

export type AliasScope =
  | 'pc.job'
  | 'pc.policy'
  | 'pc.account'
  | 'pc.contact'
  | 'pc.coverage'
  | 'pc.transaction';

/**
 * Typed error thrown when a profile fails validation at load time.
 *
 * `code` carries the canonical `HarnessErrorCode` for cross-file invariants
 * that an upstream harness wrapper may want to pattern-match (e.g.
 * `BAA_GATE_MISSING` from the SA-6 / MS-6 carve). Per-file Zod failures
 * leave `code` undefined — the `file` + `zodPath` pair is the discriminator
 * for those.
 */
export class ProfileLoadError extends Error {
  readonly file: string;
  readonly zodPath: string;
  readonly code?: HarnessErrorCode;

  constructor(file: string, zodPath: string, message: string, code?: HarnessErrorCode) {
    super(message);
    this.name = 'ProfileLoadError';
    this.file = file;
    this.zodPath = zodPath;
    if (code !== undefined) {
      this.code = code;
    }
  }
}

/**
 * Maps an AliasScope to the entity key used inside `field-aliases.yaml`.
 * The aliases file is keyed by Guidewire entity names (Account, Job, etc.);
 * AliasScope carries the PC module prefix for tool callers.
 */
const SCOPE_TO_ENTITY: Record<AliasScope, string> = {
  'pc.job': 'Job',
  'pc.policy': 'Policy',
  'pc.account': 'Account',
  'pc.contact': 'Contact',
  'pc.coverage': 'Coverage',
  'pc.transaction': 'Transaction',
};

/**
 * Load and validate a single YAML file from disk, parsing through the given
 * Zod schema. On any Zod error, throws a `ProfileLoadError` naming the file
 * and the failing path.
 *
 * Unknown keys are preserved (passthrough schemas) so carrier-specific
 * metadata in profile YAMLs does not cause boot failures.
 */
async function loadYaml<T>(
  profilePath: string,
  fileName: string,
  schema: {
    safeParse(
      data: unknown,
    ):
      | { success: true; data: T }
      | { success: false; error: { issues: { path: (string | number)[]; message: string }[] } };
  },
): Promise<T> {
  const filePath = join(profilePath, fileName);
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf-8');
  } catch (err) {
    throw new ProfileLoadError(
      fileName,
      '',
      `${fileName}: file not found at ${filePath} — ${(err as NodeJS.ErrnoException).message}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = jsYaml.load(raw);
  } catch (err) {
    throw new ProfileLoadError(
      fileName,
      '',
      `${fileName}: YAML parse error — ${(err as Error).message}`,
    );
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const path = firstIssue?.path.join('.') ?? '';
    const msg = firstIssue?.message ?? 'unknown validation error';
    throw new ProfileLoadError(
      fileName,
      path,
      `${fileName}: validation failed at "${path}" — ${msg}`,
    );
  }
  return result.data;
}

/**
 * Loaded and validated profile data for all 9 YAMLs.
 * Used internally by `loadProfile()` to build the `ProfileHandle`.
 */
interface LoadedProfile {
  readonly tenantId: string;
  readonly schemaVersion: string;
  readonly fieldAliases: FieldAliasesYaml;
  readonly typelists: TypelistsYaml;
  readonly auth: AuthYaml;
  readonly roles: RolesYaml;
  readonly lob: LobYamlV1;
  readonly customEntities: CustomEntitiesYaml;
  readonly approvalMatrix: ApprovalMatrixYaml;
  readonly piiPolicy: PiiPolicyYaml;
  readonly events: EventsYaml;
  readonly loadedFiles: ReadonlySet<string>;
}

/**
 * Load all 9 profile YAMLs from `profilePath/`, validate each, and return a
 * `ProfileHandle` backed by the loaded data.
 *
 * Validation is MINIMUM-PERMISSIVE: required fields fail hard, optional fields
 * pass through, unknown keys are preserved (carriers add tenant-specific
 * metadata we can't anticipate). Per E4 hard rule: no silent fallback on
 * validation failure — throw `ProfileLoadError` naming the file and key.
 *
 * @param profilePath - Directory containing the 9 YAML files (e.g. `profiles/oss-demo`).
 * @throws `ProfileLoadError` if any YAML is missing, malformed, or fails Zod validation.
 */
export async function loadProfile(profilePath: string): Promise<ProfileHandle> {
  // Manifest loads first — it carries tenantId + schemaVersion which the
  // other files are interpreted against. A missing manifest = hard boot failure.
  const manifest = await loadYaml(profilePath, 'manifest.yaml', ManifestYamlSchema);

  // Load remaining 8 files concurrently; any single failure throws immediately.
  const [
    auth,
    roles,
    lob,
    typelists,
    customEntities,
    fieldAliases,
    approvalMatrix,
    piiPolicy,
    events,
  ] = await Promise.all([
    loadYaml(profilePath, 'auth.yaml', AuthYamlSchema),
    loadYaml(profilePath, 'roles.yaml', RolesYamlSchema),
    loadYaml(profilePath, 'lob.yaml', LobYamlV1Schema),
    loadYaml(profilePath, 'typelists.yaml', TypelistsYamlSchema),
    loadYaml(profilePath, 'custom-entities.yaml', CustomEntitiesYamlSchema),
    loadYaml(profilePath, 'field-aliases.yaml', FieldAliasesYamlSchema),
    loadYaml(profilePath, 'approval-matrix.yaml', ApprovalMatrixYamlSchema),
    loadYaml(profilePath, 'pii-policy.yaml', PiiPolicyYamlSchema),
    loadYaml(profilePath, 'events.yaml', EventsYamlSchema),
  ]);

  // SA-6 + MS-6: BAA gate is a cross-file invariant between lob.yaml +
  // pii-policy.yaml. Refuse to boot with a typed code so an upstream
  // harness wrapper can surface this as `HarnessError({ code: 'BAA_GATE_MISSING' })`.
  // Per 02-PRD § 6.3 + § 6.8 + 05-TECHNICAL-SPEC § 8.4.
  const baaGate = checkBaaGate(lob, piiPolicy);
  if (!baaGate.ok) {
    throw new ProfileLoadError(
      'lob.yaml + pii-policy.yaml',
      `lob_mappings.[${baaGate.offendingLobs.join(',')}].lob_class`,
      `BAA_GATE_MISSING: lob.yaml declares lob_class:health for [${baaGate.offendingLobs.join(', ')}] but pii-policy.yaml has baa_required.enabled:false. Health LOBs require an executed BAA — set baa_required.enabled:true in pii-policy.yaml or remove lob_class:health from the offending LOB(s). Per 02-PRD § 6.3 + § 6.8.`,
      'BAA_GATE_MISSING',
    );
  }

  const loadedFiles = new Set([
    'manifest.yaml',
    'auth.yaml',
    'roles.yaml',
    'lob.yaml',
    'typelists.yaml',
    'custom-entities.yaml',
    'field-aliases.yaml',
    'approval-matrix.yaml',
    'pii-policy.yaml',
    'events.yaml',
  ]);

  const loaded: LoadedProfile = {
    tenantId: manifest.tenantId,
    schemaVersion: manifest.schemaVersion,
    fieldAliases,
    typelists,
    auth,
    roles,
    lob,
    customEntities,
    approvalMatrix,
    piiPolicy,
    events,
    loadedFiles,
  };

  return buildHandle(loaded);
}

/** Build a `ProfileHandle` from a fully-loaded profile. */
function buildHandle(loaded: LoadedProfile): ProfileHandle {
  return {
    tenantId: loaded.tenantId,
    schemaVersion: loaded.schemaVersion,

    fieldAlias(scope, rawField): string {
      const entity = SCOPE_TO_ENTITY[scope];
      const entityAliases = loaded.fieldAliases.aliases[entity];
      if (entityAliases === undefined) return rawField;
      // aliases map is <carrier_term> → <guidewire_field>; we resolve the
      // inverse: given the Guidewire field, find the carrier term. The YAML
      // stores carrier_term → gw_field, so we invert at lookup time.
      for (const [carrierTerm, gwField] of Object.entries(entityAliases)) {
        if (gwField === rawField) return carrierTerm;
      }
      return rawField;
    },

    typelistLabel(typelist, code): string {
      const entry = loaded.typelists.typelists[typelist];
      if (entry === undefined || entry.values === undefined) return code;
      const match = entry.values.find((v) => v.code === code);
      return match?.label ?? code;
    },

    hasRequiredFiles(requiredFiles): boolean {
      return requiredFiles.every((f) => loaded.loadedFiles.has(f));
    },
  };
}

/**
 * In-memory default profile used when no `--profile <path>` flag is given
 * (e.g. unit tests, dev-tier smoke runs without a profile directory).
 * Mirrors the empty-but-valid shape `profiles/_template/` ships.
 *
 * All pre-existing E2 tests use this function; it must remain stable.
 */
export function createDefaultProfile(tenantId: string): ProfileHandle {
  // Minimal alias map covering the field names the 5 in-scope tools surface.
  // Real per-carrier maps land in `profiles/<tenant>/field-aliases.yaml`.
  const defaultAliases: Record<AliasScope, Record<string, string>> = {
    'pc.job': {
      jobNumber: 'submissionNumber',
      jobStatus: 'status',
      assignedToUser: 'assignedTo',
      jobSubtype: 'kind',
    },
    'pc.policy': {
      policyNumber: 'policyNumber',
      policyStatus: 'status',
      effectiveDate: 'effectiveDate',
      expirationDate: 'expirationDate',
      productCode: 'lineOfBusiness',
    },
    'pc.account': {
      accountNumber: 'accountNumber',
      accountHolder: 'namedInsured',
    },
    'pc.contact': {
      displayName: 'displayName',
    },
    'pc.coverage': {
      coverageType: 'coverageType',
    },
    'pc.transaction': {
      reasonCode: 'reasonCode',
      transactionType: 'transactionType',
    },
  };

  return {
    tenantId,
    schemaVersion: 'v1.0',
    fieldAlias(scope, rawField): string {
      return defaultAliases[scope]?.[rawField] ?? rawField;
    },
    typelistLabel(_typelist, code): string {
      // Default profile carries no carrier extensions; return the code.
      return code;
    },
    hasRequiredFiles(_requiredFiles): boolean {
      return true;
    },
  };
}
