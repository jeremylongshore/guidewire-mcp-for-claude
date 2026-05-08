/**
 * Tool manifest schema for the PolicyCenter MCP server.
 *
 * **Why this lives here, not in `packages/schemas/`:** the staffed-audit
 * panel filed CHALLENGEs `BA-3 / MS-5 / CV-3 / CV-6 / AR-2` flagging that the
 * canonical `ToolManifestEntry` schema needed codification. GW-1.9 codified
 * the canonical shape in PRD § 3.0 + TECH-SPEC § 3.0 (see PR #78). This
 * file's interface matches that canonical shape; when
 * `packages/schemas/src/manifest/` ships in E1, update the import and
 * delete the inline interface. See:
 *   - 000-docs/blueprint/audits/05-BA-backend-review.md F-3 (recommended interface)
 *   - 000-docs/blueprint/audits/08-MS-mcp-safety-review.md F-5 (mode load-bearing)
 *   - 000-docs/blueprint/audits/09-CV-vocabulary-review.md F-6 (description-shape)
 *   - 000-docs/blueprint/audits/03-AR-architecture-review.md F-2 (writes-via-execute)
 *
 * The shape adheres to all four CHALLENGEs:
 *   - `mode` is a load-bearing field; runtime enforces parity (MS-5).
 *   - `vocabulary.question` + `vocabulary.whenToUse` codify the
 *     `<carrier-question> · <when-to-use>` description-shape rule (CV-6).
 *   - `epicTag` lets the validator reject E5+ tools sneaking into E2 builds.
 *   - `requiredProfileSchema` + `requiredProfileFiles` make profile gating
 *     boot-time-checkable (D-020 v2.0 gating; PRD § 6.0a).
 *   - `requiresHarnessExecute` is true for `draft_only` / `approved_execute`
 *     to satisfy AR-2 (servers cannot bypass harness on writes).
 */

import type { GuidewireClient } from '@intentsolutions/guidewire-client';
import type { Harness } from '@intentsolutions/guidewire-harness';
import type { ObservabilityHandle } from '@intentsolutions/guidewire-observability';
import type { ToolMode } from '@intentsolutions/guidewire-schemas';
import type { Tracer } from '@opentelemetry/api';
import type { z } from 'zod';

import type { ProfileHandle } from './profile.js';

/**
 * Type-erased manifest entry — what the catalog array stores. The MCP
 * runtime + tests consume this shape; per-tool authoring uses
 * `TypedToolManifestEntry<TArgs, TResult>` for end-to-end type safety
 * inside the handler body, then widens to `ToolManifestEntry` for
 * catalog membership.
 *
 * The widening is necessary because an array literal of mixed-arg-shape
 * generics cannot be inferred as a single concrete generic instantiation
 * — TypeScript variance rules forbid assigning `ToolManifestEntry<X, A>`
 * to `ToolManifestEntry<Y, B>` even when `X` and `Y` both extend
 * `z.ZodTypeAny`.
 */
export interface ToolManifestEntry {
  readonly name: string;
  readonly version: string;
  readonly mode: ToolMode;
  readonly description: string;
  readonly vocabulary: {
    readonly question: string;
    readonly whenToUse: string;
  };
  readonly inputSchema: z.ZodTypeAny;
  readonly requiredProfileSchema: string;
  readonly requiredProfileFiles: readonly ProfileFileName[];
  readonly epicTag: 'E2' | 'E2.5' | 'E5' | 'E6' | 'E7' | 'E8' | 'E9' | 'E10';
  readonly personas: readonly number[];
  readonly requiresHarnessExecute: boolean;
  readonly incompleteWithoutProfile: boolean;
  readonly handler: (args: unknown, ctx: ToolContext) => Promise<unknown>;
}

/**
 * The strongly-typed authoring shape — every tool file declares its tool
 * with `TypedToolManifestEntry<typeof argsSchema, ResultShape>` so the
 * handler body keeps end-to-end types. The exported `tool` object is
 * structurally compatible with `ToolManifestEntry` (handler args are
 * narrower, return type is narrower) so widening is safe at catalog time.
 *
 * Matches the canonical shape codified in `02-PRD § 3.0` + the Zod schema
 * sketched in `05-TECHNICAL-SPEC § 3.0` (per GW-1.9, PR #78). When
 * `packages/schemas/src/manifest/` lands in E1 it will become the import
 * source of truth; this inline interface deletes at that point.
 */
export interface TypedToolManifestEntry<
  TArgs extends z.ZodTypeAny = z.ZodTypeAny,
  TResult = unknown,
> {
  /** Carrier-vocabulary, hyphen-coupled, kebab-case (D-001 + D-016). */
  readonly name: string;
  /**
   * Tool version — pinned into the harness idempotency-key derivation.
   * Bumping this version invalidates prior `gwh1:` cache entries by design
   * (Plan.idempotencyKey carries `toolVersion`).
   */
  readonly version: string;
  /**
   * Three-mode declaration per D-005 + 02-PRD § 4. Bound at MCP-handshake
   * time and NOT negotiable mid-call (006 § 7.2). The runtime enforces
   * parity: a tool registered as `read_only` cannot upgrade itself by
   * calling `harness.execute()` per AR-2.
   */
  readonly mode: ToolMode;
  /**
   * Operator-voice description — surfaced to the LLM during tool selection.
   * Composed from `vocabulary.question` + `vocabulary.whenToUse` per the
   * `<carrier-question> · <when-to-use>` rule (CV-6).
   */
  readonly description: string;
  /**
   * Description-shape rule (CV-6). The two parts compose into `description`
   * via `formatDescription()`. Keeping them split makes the rule
   * machine-checkable when `audit-harness vocab-lint` rule 7 lands.
   */
  readonly vocabulary: {
    /** Operator-voice question form (matches the tool name's question form). */
    readonly question: string;
    /** One-clause situational anchor (when an operator would reach for this tool). */
    readonly whenToUse: string;
  };
  /** Local Zod schema validating tool args at the server boundary. */
  readonly inputSchema: TArgs;
  /**
   * Minimum profile schema version required (semver-range string per D-020).
   * Boot-time validation refuses to load tools whose required schema is not
   * satisfied by the active profile.
   */
  readonly requiredProfileSchema: string;
  /**
   * The profile YAMLs this tool reads from. Boot-time validator checks each
   * file exists in the loaded profile + matches its declared schema. A
   * missing-but-required file surfaces as `profile_incomplete_for_this_carrier`
   * at tool-call time (per 006 § 1.2 / 1.6).
   */
  readonly requiredProfileFiles: readonly ProfileFileName[];
  /** Which epic introduces this tool — a pre-E2 tool sneaking into a v0.1.0 build is a CI failure. */
  readonly epicTag: 'E2' | 'E2.5' | 'E5' | 'E6' | 'E7' | 'E8' | 'E9' | 'E10';
  /**
   * Personas this tool serves (002-DR-CRIT persona indices). Drives persona-
   * density gates per `05-TECHNICAL-SPEC § 6.2` ("≥5 tools per declared persona").
   */
  readonly personas: readonly number[];
  /**
   * Whether the tool requires `harness.execute()` rather than a direct read.
   * Always `false` for `read_only` (writes are the only mode that need
   * `execute()`). Set `true` for `draft_only` / `approved_execute` so the
   * AR-2 architecture rule fires when a server bypasses the harness on
   * writes.
   */
  readonly requiresHarnessExecute: boolean;
  /**
   * `incompleteWithoutProfile` — the ⚠ banner per PRD § 3.1.1. When the
   * declared `requiredProfileFiles` aren't fully populated for the active
   * tenant, the runtime surfaces a structured
   * `profile_incomplete_for_this_carrier` refusal instead of executing.
   * E2's 5 in-scope tools all have this `false`; the 2 ⚠ tools that slipped
   * to E5 will set this `true` when they land.
   */
  readonly incompleteWithoutProfile: boolean;
  /**
   * Tool implementation. The runtime opens spans + writes audit before /
   * after; the handler focuses on the read mapping.
   */
  readonly handler: (args: z.infer<TArgs>, ctx: ToolContext) => Promise<TResult>;
}

/**
 * The 9 profile YAMLs per 02-PRD § 6 + D-020 v1.0.
 */
export type ProfileFileName =
  | 'auth.yaml'
  | 'roles.yaml'
  | 'lob.yaml'
  | 'typelists.yaml'
  | 'custom-entities.yaml'
  | 'field-aliases.yaml'
  | 'approval-matrix.yaml'
  | 'pii-policy.yaml'
  | 'events.yaml';

/**
 * Per-call context handed to every tool handler. Derived from the MCP
 * runtime's `ToolContext` (`packages/mcp-runtime`) plus the client + profile
 * + tracer + logger + harness that tools need.
 *
 * **Note on harness:** every tool call in this server is now governed by
 * the harness (`packages/harness/`). `read_only` tools can still call
 * `client.get(...)` directly for simple lookups, but MUST call
 * `emitAudit()` to preserve the Persona 5 read-side exfil trail.
 * `draft_only` and `approved_execute` tools MUST use `harness.execute()`
 * to satisfy the AR-2 boundary.
 */
export interface ToolContext {
  /** OpenTelemetry trace ID propagated from the MCP-handshake span. */
  readonly traceId: string;
  /** Stable tenant slug from `auth.yaml` (e.g. `acme-insurance-pc-dev`). */
  readonly tenantId: string;
  /** Resolved actor identity from the JWT `sub` claim (per `auth.yaml.actor_claim`). */
  readonly actorId: string;
  /** Cloud API client (read-only methods only at the server boundary). */
  readonly client: GuidewireClient;
  /** Profile lookup + alias-mapping helper. */
  readonly profile: ProfileHandle;
  /** OTel tracer scoped to this server. */
  readonly tracer: Tracer;
  /** Pino logger with mandatory fields pre-bound. */
  readonly observability: ObservabilityHandle;
  /**
   * Read-side audit emitter — Persona 5 wants tamper-evident records of
   * every read for exfil detection per 006 § 1.1. The runtime invokes this
   * before/after the handler runs; handlers do NOT call it directly.
   */
  readonly emitAudit: (event: AuditEventBrief) => Promise<void>;
  /**
   * The harness handle for governed execution (plan → policy → execute).
   * Required for `draft_only` and `approved_execute` tools (AR-2).
   */
  readonly harness: Harness;
}

/**
 * Compact audit-event shape the runtime + tools share. Maps to the
 * `AuditEntry` schema in `packages/schemas/harness/audit.ts` when E3 wires
 * the harness in.
 */
export interface AuditEventBrief {
  readonly eventType: 'execute.started' | 'execute.completed' | 'execute.failed';
  readonly mode: ToolMode;
  readonly toolName: string;
  readonly toolVersion: string;
  readonly resultCount?: number;
  readonly latencyMs?: number;
  readonly decisionReason?: string;
}

/**
 * Composes `description` from `vocabulary.question` + `vocabulary.whenToUse`
 * per the CV-6 `<carrier-question> · <when-to-use>` rule. Centralised so the
 * shape is the same across tools + future vocab-lint can verify by hash.
 */
export function formatDescription(vocabulary: {
  question: string;
  whenToUse: string;
}): string {
  return `${vocabulary.question} · ${vocabulary.whenToUse}`;
}

/**
 * Widens a `TypedToolManifestEntry<TArgs, TResult>` to the type-erased
 * `ToolManifestEntry` for catalog membership. Single funnel point so the
 * `as unknown as` cast is named + auditable.
 *
 * The cast is sound: `TypedToolManifestEntry`'s handler accepts narrower
 * args and returns a narrower type than `ToolManifestEntry`'s
 * `(args: unknown) => Promise<unknown>`; reading the catalog as the wider
 * shape is always safe.
 */
export function widenManifestEntry<TArgs extends z.ZodTypeAny, TResult>(
  entry: TypedToolManifestEntry<TArgs, TResult>,
): ToolManifestEntry {
  return entry as unknown as ToolManifestEntry;
}
