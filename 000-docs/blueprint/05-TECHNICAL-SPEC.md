# 05 — Technical Specification

> *Stack, contracts, package layout, observability, NO MOCKS,
> quality gates.*

**Filed:** 2026-05-04
**Bead:** `guidewire-z4j` (under epic `guidewire-7jt` — GH [#2](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/2))
**Inputs:** [`./02-PRD.md`](./02-PRD.md) § 5, [`./03-ARCHITECTURE.md`](./03-ARCHITECTURE.md) § 3 + § 5, [`../004-DR-DEC-architecture-decisions.md`](../004-DR-DEC-architecture-decisions.md), [`./audits/00-LIBRARIAN-CITATION-AUDIT.md`](./audits/00-LIBRARIAN-CITATION-AUDIT.md), [`../005-DR-REF-guidewire-public-resources.md`](../005-DR-REF-guidewire-public-resources.md), [`../../CLAUDE.md`](../../CLAUDE.md) Stack section, [`../../../CLAUDE.md`](../../../CLAUDE.md) IS Testing SOP.
**Status:** authored content (replaces partial GW-1.1 skeleton).

---

## Sections to author

### 1. Stack (table form)

The canonical stack lives verbatim in
[`../../CLAUDE.md`](../../CLAUDE.md) § Stack. This section is the
governance copy: same rows, plus version pin + rationale columns. The
stack is a closed set — adding a new top-level dependency requires a
new bead and a `D-NNN` decision-log entry; bumping a version inside
the pin range is dependabot's job.

| Layer | Choice | Version pin | Rationale |
|---|---|---|---|
| Language | TypeScript | `^5.5.0` | Strict mode + verbatim module syntax + const-type-parameters; required for Zod 3.23+ inference depth |
| Runtime | Node.js | `>=22.0.0` (22 LTS) | LTS through 2027; native `fetch` + `--experimental-strip-types` available; matches the Anthropic SDK floor |
| Package manager | pnpm | `>=9.0.0` | Workspace topology in `pnpm-workspace.yaml`; CAS store survives ecosystem-wide harness bumps with minimal duplicated install |
| MCP | `@modelcontextprotocol/sdk` | `^1.0.0` | Official TypeScript SDK; covers stdio + HTTP transports without an Express/Fastify shim |
| Schemas | Zod | `^3.23.0` | Single source of truth for tool args + profile YAML round-trip; pairs with the SDK's input schema convention |
| HTTP | undici | `^6.0.0` | Native HTTP/1.1 + HTTP/2; the only client allowed in `packages/guidewire-client/` (axios / got banned by depcruise) |
| Tests | Vitest | `^2.0.0` | Workspace-aware; first-class TS support; `vitest --coverage --reporter=verbose` is the L3 entry point |
| Property-based | fast-check | `^3.20.0` | Powers the L3 invariants — JCS canonicalization round-trip, idempotency-key stability, hash-chain monotonicity |
| Mutation | Stryker | `^8.0.0` | Per-module kill-rate floors set in `tests/TESTING.md`; harness floor is 85 (load-bearing) |
| Lint/format | Biome | `^1.8.0` | One tool, one config, one process — replaces ESLint + Prettier + import-sort. Custom AST rules layer via `audit-harness` |
| Dep-graph rules | dependency-cruiser | `^16.0.0` | Architecture rules per [`./03-ARCHITECTURE.md`](./03-ARCHITECTURE.md) § 4 — `servers/**` cannot import `clients/**` directly |
| Build (libs) | tsup | `^8.0.0` | esbuild-backed; emits dual ESM+CJS for the harness lib and the client SDK |
| Build (dev) | tsx | `^4.0.0` | Watch-mode bootstrap for `servers/*` during local sandbox development |
| Auth | openid-client | `^5.6.0` | OIDC discovery + JWT propagation per [`./02-PRD.md`](./02-PRD.md) § 6.1; pluggable per-tenant `auth.yaml` |
| Queue | BullMQ on Redis (dev) → Cloud Tasks / SQS (prod) | `^5.0.0` (BullMQ) | Local-first; events plane uses at-least-once delivery + sharded ordering per [`./03-ARCHITECTURE.md`](./03-ARCHITECTURE.md) § 3.2 |
| Audit store | Postgres | `>=15` | Serializable transactions + `FOR UPDATE` on `audit_chain_heads` per [`./03-ARCHITECTURE.md`](./03-ARCHITECTURE.md) § 3.3; pgTAP for L4-migration tests |
| Migrations | node-pg-migrate | `^7.0.0` | Plain-SQL migrations under `packages/audit/migrations/`; replays in CI via testcontainers |
| Secrets | SOPS + age | SOPS `^3.9` / age `^1.2` | Per IS standard ([global CLAUDE.md](../../../CLAUDE.md) SOPS initiative); never plaintext `.env` in commits |
| Observability — traces | OpenTelemetry SDK | `^1.27.0` | `@opentelemetry/sdk-node`; exporter is OTLP (Honeycomb / Tempo / Jaeger user-configured) |
| Observability — logs | pino | `^9.0.0` | Structured JSON to stdout in prod; `pino-pretty` in dev |
| Observability — errors | `@sentry/node` | `^8.0.0` | DSN profile-driven; `AppError` typed class drives fingerprint per § 4.5 |
| Container | Docker | `>=24` | Multi-stage builds; one image per `servers/*` member; harness CLI ships as a separate `harness` image |
| Deploy | Cloud Run | n/a | TS-friendly serverless; supports stdio MCP transport via gRPC adapter; per-tenant process isolation per [`./03-ARCHITECTURE.md`](./03-ARCHITECTURE.md) § 7.2 |
| IaC | OpenTofu | `>=1.7` | Cloud Run + Postgres + Redis + Secret Manager modules under `infra/tofu/` |
| Audit-harness | `@intentsolutions/audit-harness` | latest minor | Dev-dep per IS Testing SOP; CI calls `pnpm exec audit-harness …` — never `~/.claude/` paths |

**Version-bump policy.** Patch + minor are dependabot PRs against
`main` with the standard CI gate (lint → test → contract → escape-scan
→ coverage → arch). Major bumps require an explicit bead with a
`Blueprint:` reference plus an entry in
[`../004-DR-DEC-architecture-decisions.md`](../004-DR-DEC-architecture-decisions.md).
**Don't use Express/Fastify** for MCP servers — the SDK's stdio + HTTP
transports are the supported surface; adding a framework around them
is a depcruise REFUSE per [`./03-ARCHITECTURE.md`](./03-ARCHITECTURE.md) § 4.

### 2. Package layout (the canonical map)

```
guidewire/
├── 000-docs/blueprint/        # Master paperwork
├── servers/
│   ├── policycenter-mcp/      # E2
│   ├── claimcenter-mcp/       # E7
│   ├── billingcenter-mcp/     # E8
│   ├── producer-mcp/          # E9
│   └── events-mcp/            # E6 (query-only)
├── packages/
│   ├── harness/               # E3 — library + CLI
│   ├── observability/         # E1 — OTel + pino + Sentry factory
│   ├── guidewire-client/      # E1 — Cloud API client
│   ├── auth/                  # E1 — OAuth + JWT
│   ├── audit/                 # E1 — hash-chain + evidence bundle
│   └── schemas/               # E1 — Zod schemas, shared
├── clients/                   # Vendor wrappers (One Inc, etc.)
├── profiles/                  # Per-customer config
│   ├── _template/             # E4
│   └── ...
├── tests/
│   ├── recordings/            # Real Guidewire sandbox HTTP recordings
│   └── TESTING.md             # Coverage / mutation / CRAP / arch
└── infra/
    ├── docker/
    ├── cloud-run/
    └── tofu/
```

#### 2.1 Per-package contracts

Each package below has a stable public API surface, an epic owner, an
allowed-imports list (enforced by depcruise), and a
forbidden-imports list. The harness itself is the only package that
crosses suite boundaries; everything else is single-purpose.

| Package | Epic | Public API | Allowed imports | Forbidden imports |
|---|---|---|---|---|
| `packages/observability/` | E1 | `getObservability()`, `AppError`, refusal helpers | `pino`, `@opentelemetry/*`, `@sentry/node` | `clients/**`, `servers/**`, `packages/harness/**` |
| `packages/schemas/` | E1 | Zod schemas for tool args, profile YAML, audit rows | `zod` only | Everything else (must be cycle-free root) |
| `packages/auth/` | E1 | `getOAuthClient(profile.auth)`, JWT propagation helpers | `openid-client`, `packages/observability`, `packages/schemas` | `clients/**`, `packages/harness`, `servers/**` |
| `packages/audit/` | E1 | `AuditStore` impl (Postgres), migrations under `migrations/`, `verifyChain()` | `pg`, `packages/schemas`, `packages/observability` | `clients/**`, `servers/**`, `packages/harness/**` |
| `packages/guidewire-client/` | E1 | Per-suite read methods + write methods (PC/CC/BC); `GW-DBTransaction-ID` injection on writes | `undici`, `packages/auth`, `packages/observability`, `packages/schemas` | `servers/**`, `packages/harness/**`, `clients/**` (cross-vendor isolation) |
| `packages/harness/` | E3 | `createHarness()`, `plan()`, `policy.evaluate()`, `approvals.*`, `execute()`, `audit.*`, `evidence.*`, `rollbackHint()` | `packages/audit`, `packages/observability`, `packages/schemas`, `packages/guidewire-client` (read-only — write injection is the sole exception) | `servers/**`, `clients/**` |
| `clients/<vendor>/` | E5+ | Per-vendor client (e.g. `clients/one-inc/` for One Inc) | `packages/observability`, `packages/schemas` | `clients/<other-vendor>/`, `packages/guidewire-client/`, `packages/harness/`, `servers/**` |
| `servers/<suite>-mcp/` | E2/E6/E7/E8/E9 | MCP tool registrations; per-tool Zod schemas; mode declarations | `@modelcontextprotocol/sdk`, `packages/harness` (the only path to writes), `packages/observability`, `packages/schemas` | `clients/**` (writes must travel through the harness), `packages/guidewire-client/**` (servers cannot bypass the harness) |

The "forbidden" column is the depcruise contract — see § 4.7 for AST
enforcement and [`./03-ARCHITECTURE.md`](./03-ARCHITECTURE.md) § 4 for
the full boundary table. **Crucially**, `servers/**` cannot import
`packages/guidewire-client/**` directly; every Guidewire write must
travel through `packages/harness/.execute()` or the gate is gone.

#### 2.2 Audit-harness as a dev dep, not a runtime dep

Per the IS Testing SOP ([`../../../CLAUDE.md`](../../../CLAUDE.md) §
Intent Solutions Testing SOP),
`@intentsolutions/audit-harness` is installed as a **dev**
dependency in the workspace root and called from CI / pre-commit /
the two skills (`/audit-tests`, `/implement-tests`). Hooks reference
`pnpm exec audit-harness …` — never `~/.claude/` paths. This is the
"enforcement travels with the code" rule per Hard Rule #7
([`../../CLAUDE.md`](../../CLAUDE.md) § Hard Rules); a fresh clone of
this repo reproduces every gate without any developer-machine setup.

#### 2.3 Profiles directory — data only, no code

`profiles/<tenant>/` ships **9 YAML files** per
[`./02-PRD.md`](./02-PRD.md) § 6 (`auth`, `roles`, `lob`, `typelists`,
`custom-entities`, `field-aliases`, `approval-matrix`, `pii-policy`,
`events`). The escape-scan rule rejects any `.ts` / `.js` / `.sh` /
`.py` file under `profiles/**` at boot — profiles are configuration,
not adapters per [`../004-DR-DEC-architecture-decisions.md`](../004-DR-DEC-architecture-decisions.md)
D-007. The `_template/` ships the empty-but-valid version; the
`oss-demo/` ships a fully-populated example pointing at the sandbox
tenant per § 6.10 of the PRD.

### 3. Contracts (TypeScript signatures)

Every signature in this section is the **literal** form that lands in
`packages/harness/src/index.ts` (or its peer modules) when E3 opens.
The text is reproduced verbatim from [`./02-PRD.md`](./02-PRD.md) § 5
so the PRD can stay prose; deviation requires a follow-up
`010-DR-MEMO-harness-runtime-rev.md` with a `replaces:` link
([`../009-DR-MEMO-harness-runtime.md`](../009-DR-MEMO-harness-runtime.md) § 11).

The Zod schemas that round-trip the wire shapes live one level
shallower in `packages/schemas/src/` — their module names (not the
full schemas) are listed alongside each interface for traceability.

#### 3.0 Tool manifest — what the server registers

The canonical `ToolManifestEntry` interface is authored in
[`./02-PRD.md`](./02-PRD.md#30-tool-manifest-contract) § 3.0 (per
staffed-audit
[BA-3](./audits/05-BA-backend-review.md#f-3) +
[MS-5](./audits/08-MS-mcp-safety-review.md#f-5)) and
shipped today as the type-erased interface in
[`servers/policycenter-mcp/src/manifest.ts`](../../servers/policycenter-mcp/src/manifest.ts).
The Zod round-trip below validates the same shape at boot. The
schema lands as `packages/schemas/src/manifest/tool-manifest-entry.ts`
in the next E1 follow-up — the policycenter-mcp server currently
duplicates the structural shape inline so the server boots
before the schemas package ships its `manifest/` subpath. When
the package lands, the server imports
`ToolManifestEntrySchema` from
`@intentsolutions/guidewire-schemas` and the inline interface
deletes.

```ts
import { z } from 'zod';
import { ProfileSchemaVersionSchema } from '../profile/profile-version.js';

export const ToolModeSchema = z.enum(['read_only', 'draft_only', 'approved_execute']);
export type ToolMode = z.infer<typeof ToolModeSchema>;

export const EpicTagSchema = z.enum(['E2', 'E2.5', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10']);
export type EpicTag = z.infer<typeof EpicTagSchema>;

export const ProfileFileNameSchema = z.enum([
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

/** Operator-voice description-shape rule (CV-6). */
export const ToolVocabularySchema = z.object({
  question: z.string().min(1).max(80),    // ≤10 words by character-budget proxy
  whenToUse: z.string().min(1).max(160),  // ≤25 words by character-budget proxy
});

/**
 * Validates the static, JSON-serialisable surface of `ToolManifestEntry`.
 * `inputSchema` (a `z.ZodTypeAny`) and `handler` (a function) are
 * `z.unknown()` here because they are runtime-only objects — the
 * boot-validator checks them by predicate ("is a Zod schema?", "is a
 * function?") rather than via `z.unknown()`.parse(...). The structural
 * shape is what's worth round-tripping through Zod for boot-time
 * REFUSE-on-bad-manifest behaviour per MS-5.
 */
export const ToolManifestEntrySchema = z.object({
  name: z.string()
    .min(1)
    .regex(/^[a-z][a-z0-9-]*[a-z0-9]$/, 'kebab-case, no API verb prefix (D-001)'),
  version: z.string().regex(/^\d+\.\d+\.\d+/, 'semver — pinned into Plan.idempotencyKey'),
  mode: ToolModeSchema,
  description: z.string().min(1),
  vocabulary: ToolVocabularySchema,
  inputSchema: z.unknown().refine(
    (v) => typeof v === 'object' && v !== null && '_def' in v,
    { message: 'inputSchema must be a Zod schema' },
  ),
  requiredProfileSchema: z.string().regex(
    /^(>=|>|<=|<|=)?v\d+\.\d+(\.\d+)?(\s+\|\|\s+.+)?$/,
    'semver-range string per D-020 (e.g. ">=v1.0")',
  ),
  requiredProfileFiles: z.array(ProfileFileNameSchema).readonly(),
  epicTag: EpicTagSchema,
  personas: z.array(z.number().int().min(1).max(9)).readonly(),
  requiresHarnessExecute: z.boolean(),
  incompleteWithoutProfile: z.boolean(),
  handler: z.unknown().refine(
    (v) => typeof v === 'function',
    { message: 'handler must be a function' },
  ),
}).superRefine((entry, ctx) => {
  // MS-5 boot-validation rule: requiresHarnessExecute parity with mode.
  if (entry.mode === 'read_only' && entry.requiresHarnessExecute) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'read_only tools must not set requiresHarnessExecute (writes-only-via-execute, AR-2)',
      path: ['requiresHarnessExecute'],
    });
  }
  if (entry.mode !== 'read_only' && !entry.requiresHarnessExecute) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'draft_only / approved_execute tools must set requiresHarnessExecute=true (AR-2)',
      path: ['requiresHarnessExecute'],
    });
  }
  // CV-6: description must equal formatDescription(vocabulary).
  const expected = `${entry.vocabulary.question} · ${entry.vocabulary.whenToUse}`;
  if (entry.description !== expected) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'description must equal formatDescription(vocabulary) — CV-6',
      path: ['description'],
    });
  }
});
export type ToolManifestEntry = z.infer<typeof ToolManifestEntrySchema>;
```

**Boot-time validation contract (MS-5).** Each MCP server
iterates its registered tools and calls
`ToolManifestEntrySchema.parse(entry)`. Any failure throws and
the runtime surfaces it as a typed
`HarnessError({ code: 'MODE_MISMATCH' })` per
[02-PRD § 5.8](./02-PRD.md#58-factory--result--error) (the same
typed code the runtime uses for plan/manifest mode parity, so
boot vs. runtime failures group into one Sentry issue per the
`[code, tool_name, mode]` grouping rule). The harness's
`createHarness()` factory in § 3.7 below additionally validates
that:

1. `requiredProfileSchema` resolves against the active
   profile's `schemaVersion` (loaded via
   `ProfileSchemaVersionSchema` from
   `packages/schemas/src/profile/profile-version.ts`).
2. Every `ProfileFileName` in `requiredProfileFiles` is present
   in the loaded profile bundle.
3. For `requiresHarnessExecute: true` tools — the `Harness`
   handle is non-null at server-boot time.
4. For `mode === 'draft_only'` tools — the `EvidenceExporter`
   binding is non-null.

A failed precondition refuses the server boot with a typed
error citing the failing tool's `name` + the failing predicate
— consistent with the read/audit precedent in § 8.2.1 (audit-DB
role separation) where boot-time refusal is the safest stance.

**Cross-reference.** The PRD § 3.0 contract is the
authoritative shape; this section is the Zod realisation. When
the schemas package adds the `manifest/` subpath in E1, the
sketch above lands verbatim at
`packages/schemas/src/manifest/tool-manifest-entry.ts` and
`servers/policycenter-mcp/src/manifest.ts` switches from the
inline interface to the published export.

#### 3.1 Plan — what the agent intends

```ts
export type ToolMode = 'read_only' | 'draft_only' | 'approved_execute';

export interface PlanInput {
  toolName: string;          // carrier-vocabulary
  toolVersion: string;       // semver; idempotency keys version-pin
  mode: ToolMode;
  tenantId: string;          // customer profile slug
  actorId: string;           // JWT sub
  args: Record<string, unknown>;  // already Zod-validated
  summary: string;           // surfaces in approval UIs + audit search
  traceId: string;           // OpenTelemetry trace ID
}

export interface Plan extends Readonly<PlanInput> {
  readonly planId: string;        // sha256 content hash, hex
  readonly createdAt: string;
  readonly idempotencyKey: string; // see § 3.4
  readonly wire: {
    readonly dbTransactionId: string;  // GW-DBTransaction-ID; see § 3.4
  };
}

export function plan(input: PlanInput): Plan;
```

`plan()` is pure (no I/O). Hashing input → `planId` is the only side
work. Plans pass by value; mutation throws.
**Schema**: `packages/schemas/src/harness/plan.ts` — `PlanInputSchema`
+ `PlanSchema`. The `args` payload is `unknown` here because each
tool's Zod schema is the local validator at the server boundary;
`packages/harness/` treats args as opaque after the server has
validated.

The two-field idempotency split (`idempotencyKey` vs.
`wire.dbTransactionId`) is the **librarian P1 correction** materialised
in code. See § 3.4.

#### 3.2 Policy — the gate decision

```ts
export type PolicyOutcome = 'allow' | 'deny' | 'require_approval';

export type PolicyTier =
  | 'tier_0_safe'      // read_only with no PII; no approval
  | 'tier_1_draft'     // draft artifact; no approval
  | 'tier_2_low'       // approved_execute, single approver
  | 'tier_3_high'      // approved_execute, dual control (e.g. payments)
  | 'tier_4_blocked';  // structurally refused (e.g. payments in OSS demo)

export interface PolicyDecision {
  readonly decisionId: string;       // sha256(planId + ruleSetVersion)
  readonly planId: string;
  readonly outcome: PolicyOutcome;
  readonly tier: PolicyTier;
  readonly reason: string;
  readonly ruleSetVersion: string;
  readonly evaluatedAt: string;
  readonly requiredApprovers?: {
    minCount: number;
    rolesAllowed: readonly string[];
  };
}

export interface PolicyEngine {
  evaluate(plan: Plan): Promise<PolicyDecision>;
}
```

Rules live in `profiles/<tenant>/policy/` plus a small core ruleset
shipped by the harness (refuse on mode mismatch, refuse on missing
PII redaction profile). Per
[`../004-DR-DEC-architecture-decisions.md`](../004-DR-DEC-architecture-decisions.md)
D-006 the harness refuses to call `execute()` without a
`PolicyDecision` whose outcome is `allow` (or `require_approval`
paired with an attached `Approval`). **Schema**:
`packages/schemas/src/harness/policy.ts`.

`tier_4_blocked` is the structural refusal — the OSS demo profile
applies this tier to every `approved_execute` tool by default per
[`./02-PRD.md`](./02-PRD.md) § 4.3 / 006 § 9.3. The block is a Plan-
level structural decision, not a missing approval; an operator
flipping the flag in their forked profile is the only way out.

#### 3.3 Approval — blocking flow as state machine

```ts
export type ApprovalState = 'pending' | 'approved' | 'denied' | 'expired' | 'cancelled';

export interface Approval {
  readonly approvalId: string;        // sha256(planId + nonce)
  readonly planId: string;
  readonly decisionId: string;
  readonly state: ApprovalState;
  readonly requestedAt: string;
  readonly expiresAt: string;         // default 24h, profile-overridable
  readonly approvers: ReadonlyArray<{
    actorId: string;
    role: string;
    decidedAt: string;
    outcome: 'approved' | 'denied';
    reason?: string;
  }>;
}

export interface ApprovalSink {
  request(plan: Plan, decision: PolicyDecision): Promise<Approval>;
  wait(approvalId: string, opts?: { timeoutMs?: number }): Promise<Approval>;
  decide(approvalId: string, vote: ApprovalVote): Promise<Approval>;
}

export interface ApprovalVote {
  actorId: string;
  role: string;
  outcome: 'approved' | 'denied';
  reason?: string;
}
```

Approvals persist in the `approvals` Postgres table so a restart,
network partition, or CLI session ending mid-wait does not lose the
request. There is **no auto-approval bypass** — a missing approval is
indistinguishable from a missing audit per
[`../004-DR-DEC-architecture-decisions.md`](../004-DR-DEC-architecture-decisions.md)
D-006. **Schema**: `packages/schemas/src/harness/approval.ts`.

#### 3.4 Execute — side effect with idempotency (P1 librarian correction inline)

```ts
export interface ExecuteContext {
  readonly plan: Plan;
  readonly decision: PolicyDecision;
  readonly approval?: Approval;
  readonly span: import('@opentelemetry/api').Span;
}

export type SideEffect<T> = (ctx: ExecuteContext) => Promise<T>;

export interface ExecuteResult<T> {
  readonly outcome: 'executed' | 'replayed' | 'short_circuited';
  readonly idempotencyKey: string;
  readonly auditEntryId: string;
  readonly value: T;
  readonly evidenceBundleRef: string;
}

export function execute<T>(
  plan: Plan,
  decision: PolicyDecision,
  effect: SideEffect<T>,
  opts?: { approval?: Approval }
): Promise<ExecuteResult<T>>;

// GA-6: read-after-write consistency. See 02-PRD § 5.4 "Read-after-write
// consistency" for the operator-facing contract; this is the harness API.
export type WriteConfirmStrategy =
  | 'trust_202'           // OSS demo default; emit execute.completed on 202
  | 'poll_async_job'      // poll /async/v1/jobs/{id} to terminal
  | 'wait_for_app_event'; // wait for matching App Event by primaryObject.id

export interface ConfirmWriteOptions {
  readonly strategy: WriteConfirmStrategy;
  readonly maxWaitMs?: number;        // poll_async_job + wait_for_app_event; default 30000
  readonly asyncJobId?: string;       // required for poll_async_job
  readonly expectedEvent?: {          // required for wait_for_app_event
    readonly eventType: string;       // e.g. 'ClaimReserveChanged'
    readonly primaryObjectId: string; // for shard-correct event matching
  };
}

export interface ConfirmWriteResult {
  readonly outcome: 'confirmed' | 'timed_out' | 'failed';
  readonly elapsedMs: number;
  readonly evidence?: { kind: 'async_job'; status: string } | { kind: 'app_event'; eventId: string };
}

/**
 * GA-6 + 008 § 9. Confirm a Guidewire write reached durable state per
 * the per-profile strategy. Called from inside the SideEffect callback
 * AFTER the Cloud API write returned 202; the harness writes
 * execute.completed only when this resolves to `confirmed` (for
 * non-trust_202 strategies). For trust_202 the harness emits
 * execute.completed on the 202 response itself and confirmWrite is
 * a no-op pass-through.
 */
export function confirmWrite(
  plan: Plan,
  opts: ConfirmWriteOptions
): Promise<ConfirmWriteResult>;
```

`execute()` is the only function in the harness that performs an
external write. The depcruise CI rule fails any `servers/**` file
that imports `clients/**` directly, forcing all writes through the
harness. `confirmWrite()` is the read-after-write companion per
[GA-6](./audits/10-GA-guidewire-api-review.md#f-6) — the strategy
choice is profile-level, not per-tool, so the operator's mental
model stays consistent across every `approved_execute` tool in
the catalog.

##### 3.4.1 Two distinct keys, two distinct purposes (librarian P1)

Per the librarian audit
([`./audits/00-LIBRARIAN-CITATION-AUDIT.md`](./audits/00-LIBRARIAN-CITATION-AUDIT.md)
§ 3 P1, finding F-PRD-015), Guidewire Cloud API does **not** use a
Stripe-style `Idempotency-Key` header. The actual mechanism is the
`GW-DBTransaction-ID` request header
([Preventing duplicate database transactions, IS 202603](https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/Basic-REST-operations/request-headers/c_preventing-duplicate-database-transactions.html)),
and a duplicate request **fails** with `AlreadyExecutedException` —
it does not return the prior result. Two keys, two purposes:

| Key | Where it lives | Purpose | On collision |
|---|---|---|---|
| `Plan.idempotencyKey` (`gwh1:` prefix) | Harness's Postgres `idempotency_keys` cache | Client-side replay short-circuit; never re-invokes the side effect | Returns prior result, writes `execute.replayed` audit entry, never reaches Cloud API |
| `Plan.wire.dbTransactionId` | HTTP `GW-DBTransaction-ID` header on the Cloud API request | Server-side duplicate prevention enforced by Guidewire | Cloud API throws `AlreadyExecutedException` (the harness should never reach this in normal operation — its own cache short-circuits first) |

Both keys are derived deterministically. `gwh1:` is the harness major-
version tag so a future replay-store schema change is distinguishable;
`canonicalize()` is JCS-style canonical JSON
([RFC 8785](https://datatracker.ietf.org/doc/html/rfc8785)) so map-
order doesn't matter:

```
idempotencyKey  = "gwh1:" + sha256(toolName + ':' + toolVersion + ':' +
                                   tenantId + ':' + canonicalize(args) + ':' +
                                   actorId)
dbTransactionId = sha256(idempotencyKey)   # 64-hex chars; no prefix
```

**Wire format note** (unverified — sandbox-confirm at `guidewire-adj`):
the exact accepted shape, length, and TTL of `GW-DBTransaction-ID` are
not in the public docs. The harness derives a 64-hex-char value from
the `gwh1:` key by hashing it; this is conservative and stable. The
client wrapper (`packages/guidewire-client/`) is the **only** place
that injects the header; servers cannot inject it (depcruise REFUSE).

##### 3.4.2 Replay short-circuit

On `idempotencyKey` match in the Postgres cache, `execute()`:

1. Returns the prior `ExecuteResult.value` from the cache.
2. Annotates the span with `harness.execute.replay = true`.
3. Writes an `execute.replayed` audit entry referencing the original
   `audit_entry_id`.
4. **Never invokes the side effect.** The Cloud API is not contacted;
   `GW-DBTransaction-ID` is not sent.

If two operators race the same intent, they get **different** keys
because `actorId` is part of the input. A contract-changing release
does not replay across the boundary because `toolVersion` is part of
the input.

#### 3.5 Audit — hash-chained entry

```ts
export type AuditEventType =
  | 'plan.created' | 'policy.decided'
  | 'approval.requested' | 'approval.decided'
  | 'execute.started' | 'execute.completed' | 'execute.failed' | 'execute.replayed'
  | 'rollback.hint.issued'
  | 'idempotency.pruned';   // HR-3: maintenance event recorded when the harness-side idempotency cache prunes expired keys

/** GA-3: admin-scope OAuth carve. The actual scope used on the wire,
 *  recorded per-call so a compromised harness cannot quietly broaden
 *  access without a chain-visible trail. */
export type OAuthScope = 'read' | 'write' | 'admin' | 'producer';

export interface AuditEntry {
  readonly entryId: string;          // ULID
  readonly tenantId: string;
  readonly chainSeq: number;
  readonly eventType: AuditEventType;
  readonly planId: string;
  readonly traceId: string;
  readonly actorId: string;
  readonly toolName: string;
  readonly toolVersion: string;
  readonly mode: ToolMode;
  readonly idempotencyKey: string;
  readonly recordedAt: string;
  readonly prevHash: string;
  readonly entryHash: string;
  readonly blobRef?: string;
  /** GA-3: which OAuth scope authorized this call. `admin` flags
   *  commission reads + similar privileged reads for forensic review. */
  readonly oauthScope?: OAuthScope;
}

export interface AuditStore {
  append(entry: Omit<AuditEntry, 'chainSeq' | 'prevHash' | 'entryHash'>): Promise<AuditEntry>;
  verifyChain(tenantId: string, fromSeq?: number): Promise<ChainVerification>;
  query(filter: AuditQuery): AsyncIterable<AuditEntry>;
}
```

Linear hash chain per-tenant (NOT Merkle —
[`../009-DR-MEMO-harness-runtime.md`](../009-DR-MEMO-harness-runtime.md)
§ 2.1). **Tamper-resistant against an outsider; tamper-evident
against an unprivileged operator; defence-in-depth via Postgres role
separation against a privileged DBA — NOT cryptographic
tamper-evidence against the schema-owner role.** The DB ships three
Postgres roles per [D-019](../../004-DR-DEC-architecture-decisions.md#d-019--audit-chain-is-tamper-resistant-not-tamper-evident-against-a-compromised-harness-dba):

- `audit_writer` — INSERT-only on `audit_entries`. The harness runs
  as this role.
- `audit_reader` — SELECT-only. `verifyChain` runs as this role.
- `audit_owner` — DDL / GRANT only. Held outside the harness process
  by a separate operational identity.

Residual risk against a privileged DBA who holds `audit_owner` is
documented and is the trigger for the E3+ external-commitment
surface (KMS-signed checkpoints to a customer-controlled lock store,
implementation TBD per customer trust model). Single-writer property
is enforced via serializable-transaction `FOR UPDATE` on the
`audit_chain_heads` row. The Postgres DDL lands as the canonical
migration in `packages/audit/migrations/0001_init.sql`. **Schema**:
`packages/schemas/src/harness/audit.ts`.

A tampered chain in tenant A does not invalidate tenant B; an
enterprise customer takes their chain on offboarding.

#### 3.6 Rollback — hint, not magic

```ts
export interface RollbackHint {
  readonly hintId: string;
  readonly planId: string;
  readonly auditEntryId: string;
  readonly humanInstruction: string;       // 1-3 sentences
  readonly suggestedTool?: string;         // e.g. "revert-reserve-change"
  readonly suggestedArgs?: Record<string, unknown>;
  readonly cautions: readonly string[];    // e.g. "this letter has already been mailed"
  readonly issuedAt: string;
}

export function rollbackHint(
  result: ExecuteResult<unknown>,
  opts: { humanInstruction: string; cautions?: readonly string[] }
): Promise<RollbackHint>;
```

Rollback is a *hint*, not an automated revert. Guidewire writes are
rarely idempotent in reverse — a reserve change can be reversed; an
issued denial letter cannot. The harness records that the hint was
issued (`rollback.hint.issued` audit event); the human operator
executes. **Schema**: `packages/schemas/src/harness/rollback.ts`.

#### 3.7 Evidence bundle

```ts
export interface EvidenceBundle {
  readonly bundleVersion: '1.0';
  readonly traceId: string;
  readonly tenantId: string;
  readonly generatedAt: string;
  readonly plan: Plan;
  readonly decision: PolicyDecision;
  readonly approval?: Approval;
  readonly execution?: ExecuteResult<unknown>;
  readonly auditEntries: readonly AuditEntry[];
  readonly chainVerification: ChainVerification;
  readonly spans: readonly OtelSpanSnapshot[];
  readonly piiRedactionApplied: boolean;
}

export interface EvidenceExporter {
  build(traceId: string, opts?: { includeSpans?: boolean }): Promise<EvidenceBundle>;
  sign?(bundle: EvidenceBundle): Promise<SignedEvidenceBundle>;  // E3+
}
```

The artifact a CISO or SOC 2 auditor receives. Reproducible from the
audit chain alone. PII redaction runs at bundle export — not on the
hot path of `execute()` — applying the profile's `pii-policy.yaml`
rules. Bundle signing ships as `evidence.sign?` in v1 (forward-
compatible surface; the operational story for KMS-resident Ed25519 is
E3+ per
[`../009-DR-MEMO-harness-runtime.md`](../009-DR-MEMO-harness-runtime.md)
§ 5.5). **Schema**: `packages/schemas/src/harness/evidence.ts`.

#### 3.8 Factory + result + error

```ts
export interface HarnessConfig {
  audit: AuditStore;
  policy: PolicyEngine;
  approvals: ApprovalSink;
  evidence: EvidenceExporter;
  observability: import('@intentsolutions/guidewire-observability').Observability;
  profile: { tenantId: string; ruleSetVersion: string };
}

export function createHarness(cfg: HarnessConfig): Harness;

export class HarnessError extends Error {
  readonly code:
    | 'AUDIT_UNREACHABLE' | 'POLICY_UNREACHABLE' | 'POLICY_DENIED'
    | 'APPROVAL_TIMEOUT' | 'APPROVAL_DENIED'
    | 'IDEMPOTENCY_MISMATCH' | 'CHAIN_BROKEN'
    | 'MODE_MISMATCH' | 'TENANT_UNKNOWN'
    | 'GW_DBTRANSACTION_DUPLICATE';   // server-side duplicate from Cloud API
  readonly planId?: string;
  readonly decisionId?: string;
}
```

`HarnessError` extends the `AppError` typed class shipped in
`packages/observability/` — Sentry tagging groups failures by
`[code, tool_name, mode]` so the same refusal across multiple tenants
groups into one Sentry issue rather than fragmenting. The
`GW_DBTRANSACTION_DUPLICATE` code is the librarian P1 corollary:
should the Cloud API reject a duplicate `GW-DBTransaction-ID` (which
the harness should never trigger in normal operation because its own
cache short-circuits first), the failure is structurally distinct
from `IDEMPOTENCY_MISMATCH` (which indicates a canonicalization bug).

### 4. Observability — span, log, error contract *(GW-1.11)*

> *Authored 2026-05-04. Inputs: [`../009-DR-MEMO-harness-runtime.md`](../009-DR-MEMO-harness-runtime.md)
> § Observability fan-out, [`../../CLAUDE.md`](../../CLAUDE.md) Hard
> Rule #6, decision [D-013](../004-DR-DEC-architecture-decisions.md).*

#### 4.1 Three signals, three sinks

| Signal | Library | Default dev sink | Default prod sink |
|---|---|---|---|
| Traces | OpenTelemetry SDK (`@opentelemetry/sdk-node`) | Local OTLP collector → Jaeger UI on `localhost:16686` (docker-compose) | OTLP exporter to user-configured endpoint (Honeycomb / Grafana Tempo / Grafana Cloud / self-hosted Jaeger) |
| Logs | `pino` | `pino-pretty` to stdout | JSON to stdout, user collects (Loki, CloudWatch, etc.) |
| Errors | `@sentry/node` | Self-hosted Sentry instance (Jeremy's `claude_ai_Sentry` MCP) | User-configured Sentry DSN (commented-out by default in `.env.sops`) |

Wired in from day 1, not bolted on later. Per Hard Rule #6.

#### 4.2 Standard span tree (every MCP tool call)

```
mcp.tool.invoke (root span)
├── harness.plan.create
├── harness.policy.evaluate
│   └── attributes: mode (read_only | draft_only | approved_execute), tier
├── harness.approval.wait                    (if mode = approved_execute)
├── client.guidewire.cloud.<endpoint>
│   └── attributes: tenant_id, lob, http.status, response_size,
│                   release_version (Palisades / Las Leñas / Innsbruck)
├── harness.audit.write
│   └── attributes: chain_position, prev_hash, hash
└── harness.evidence.bundle                  (if mode = approved_execute)
    └── attributes: bundle_id, signed (boolean — Ed25519/KMS, optional in v1)
```

Spans MUST be opened in this order; failure to open a span at a
required step is **a CI failure**, not a runtime warning. Architecture
rule enforcement: see § 4.7.

#### 4.3 Required span attributes

Every span carries:

| Attribute | Type | Required | Notes |
|---|---|---|---|
| `trace_id` | string (W3C trace context) | yes | propagates through every layer |
| `span_id` | string | yes (auto) | OTel default |
| `tenant_id` | string | yes | non-secret tenant identifier (e.g. `sandbox-jeremy-dev`) |
| `tool_name` | string | yes | exact carrier-vocabulary tool name (`find-submissions-waiting-on-me`) |
| `tool_version` | string | yes | matches the version in idempotency-key derivation |
| `mode` | enum | yes | `read_only` / `draft_only` / `approved_execute` |
| `actor_id` | string | yes | `actor:<user-or-service>` — ties to JWT propagation |
| `idempotency_key` | string | conditional | required when `mode != read_only`; format: `gwh1:<sha256-hex>` |
| `db_transaction_id` | string | conditional | required on `client.guidewire.cloud.<endpoint>` write spans; format: 64-hex-char |
| `policy_decision` | enum | conditional | required for `harness.policy.evaluate`; `allow` / `deny` / `require_approval` |
| `evidence_bundle_id` | string | conditional | required for `harness.evidence.bundle`; format: `eb1:<ulid>` |

A failed tool call surfaces with one query: filter spans by
`trace_id=<id>` to see the entire journey.

#### 4.4 Pino log shape

```json
{
  "level": 50,
  "time": "2026-05-04T19:23:00.000Z",
  "trace_id": "abc123",
  "span_id": "def456",
  "tenant_id": "sandbox-jeremy-dev",
  "tool_name": "find-submissions-waiting-on-me",
  "tool_version": "1.0.0",
  "mode": "read_only",
  "actor_id": "actor:underwriter@demo",
  "msg": "Cloud API returned 503",
  "err": {
    "type": "ECONNREFUSED",
    "code": "GW_CLOUD_UNREACHABLE",
    "stack": "..."
  }
}
```

Levels follow pino conventions: `10 trace · 20 debug · 30 info ·
40 warn · 50 error · 60 fatal`. **Production code paths use level
≥30**; `console.log` and pino level 10/20 fail CI in production
paths (see § 4.7).

#### 4.5 `AppError` typed class + Sentry tagging

Errors thrown in `servers/*` and `packages/harness/` MUST inherit
from a single `AppError` class so Sentry receives consistent tags
and the bead-pipeline (§ 4.8) can correlate.

```typescript
// packages/observability/src/error.ts
export class AppError extends Error {
  public readonly code: string;        // GW_CLOUD_UNREACHABLE, IDEMPOTENCY_MISMATCH, ...
  public readonly trace_id: string;
  public readonly tenant_id: string;
  public readonly tool_name?: string;
  public readonly mode?: 'read_only' | 'draft_only' | 'approved_execute';
  public readonly retryable: boolean;
  public readonly cause?: unknown;

  constructor(opts: AppErrorOpts) { /* … */ }

  toSentryEvent(): SentryEventLike { /* tags + fingerprint */ }
}

// Refusal helpers — every refusal scenario from 006-DR-MEMO §
// has a typed constructor:
export const refuseAuthExpired   = (ctx: ErrorCtx): AppError => /* … */;
export const refuseSandboxDown   = (ctx: ErrorCtx): AppError => /* … */;
export const refuseIdempMismatch = (ctx: ErrorCtx): AppError => /* … */;
export const refuseDbTxnDuplicate = (ctx: ErrorCtx): AppError => /* … */;  // librarian P1
// … and so on for every named refusal
```

Sentry tagging via `toSentryEvent()` produces a fingerprint of
`[code, tool_name, mode]` so the same refusal across multiple
tenants groups into one Sentry issue rather than fragmenting.

##### 4.5.1 Approval timeout (per SA-5 + HR-6)

Per [SA-5](./audits/04-SA-security-review.md#f-5) +
[HR-6](./audits/11-HR-harness-review.md#f-6) + red-team
[F-RT-5.2](./audits/02-RED-TEAM-PANEL.md). When `approvals.wait()`
returns `state: 'expired'` per the
[02-PRD § 5.3](./02-PRD.md#53-approval--blocking-flow-as-state-machine)
state machine, the harness MUST emit:

1. **Pino WARN log** carrying the full structured fields per
   § 4.4 schema (`code: 'APPROVAL_TIMEOUT'`, `trace_id`,
   `tenant_id`, `tool_name`, `mode`, `plan_id`, plus
   `approval.duration_ms` and `approval.expired_at`). `pino`
   defaults to `info` level in prod; the WARN level is the
   loud-but-not-error tier carriers route to their existing
   pager surface.
2. **Typed error** — `AppError({ code: 'APPROVAL_TIMEOUT', tool_name, mode })`,
   constructed via `refuseApprovalTimeout(ctx)`. Sentry receives
   the event with the standard fingerprint
   `[APPROVAL_TIMEOUT, tool_name, mode]` so the same expiry
   pattern across multiple tenants and approvers groups into one
   Sentry Issue (per § 4.5 grouping rule above).
3. **Audit row** — `approval.decided` event type with
   `outcome: expired`, written before the `AppError` is raised
   so the audit chain captures the decision regardless of
   downstream delivery state.

The blueprint commits to **signal availability** at this surface
— pino WARN, typed AppError, Sentry fingerprint, audit row. The
blueprint does NOT commit to **delivery** (Slack, PagerDuty,
ntfy, email) — delivery is the carrier's wiring per § 4.9
endpoint configuration. This separation is deliberate: a carrier
already operating a pager surface routes the existing pino-WARN
stream and the existing Sentry feed into it; the OSS does not
re-implement notification surfaces it doesn't own. The carrier's
operator never asks "is the platform notifying my pager?" — the
blueprint says yes if you wire the existing observability surface
to your existing pager. Closes red-team F-RT-5.2 + SA-5 + HR-6.

#### 4.6 `packages/observability/getObservability()` factory

Single import surface every other package consumes:

```typescript
// packages/observability/src/index.ts
export interface ObservabilityHandle {
  tracer: Tracer;       // OpenTelemetry tracer scoped to this server/tool
  logger: Logger;       // pino instance with mandatory fields pre-bound
  reportError: (err: AppError) => void;   // Sentry tag + send
  audit: AuditWriter;   // injected for harness use; structured audit row writer
}

export function getObservability(opts: ObservabilityOpts): ObservabilityHandle;
// opts: { server_name, tenant_id, otlp_endpoint?, sentry_dsn?, log_level }
```

Every MCP server's bootstrap calls this once at startup. Zero
ambient `console.log` or untyped `throw new Error(...)` in
production code paths.

#### 4.7 Architecture rule enforcement (depcruise + AST)

Two CI checks make span coverage and structured-error coverage
non-negotiable:

| Check | Tool | Failure mode |
|---|---|---|
| Public functions in `servers/*` and `packages/harness/` open at least one span | custom AST rule (ts-morph), runs in `pnpm exec audit-harness arch` | CI fails the PR |
| Every `throw` in those packages uses `AppError`-derived class | custom AST rule | CI fails the PR |
| `console.log` / `console.error` in production paths | dependency-cruiser regex rule | CI fails the PR |
| `servers/*` cannot import from `clients/*` directly (must go through harness) | dependency-cruiser layer rule | CI fails the PR (matches `tests/TESTING.md` § arch.servers_must_invoke_via_packages_harness) |
| Profiles cannot contain executable code (`.ts` / `.js` files banned) | depcruise + path-glob rule | CI fails the PR |
| `GW-DBTransaction-ID` injection happens only in `packages/guidewire-client/` | AST call-site rule | CI fails the PR (servers / harness cannot inject) |

These rules are hash-pinned in `tests/TESTING.md` § Hash manifest
under `.dependency-cruiser.cjs`.

#### 4.8 Sentry → bead pipeline (correlate prod errors to work)

For sustained error patterns (Sentry "Issue" with ≥5 events / ≥1
distinct user / over a 24h window), an automated pipeline:

1. Sentry alert → ntfy `prod-alerts` topic (existing tailnet ntfy
   setup; Jeremy's phone subscribed)
2. For Issues meeting the threshold: auto-create a `bd create
   --type=bug` via the `claude_ai_Sentry` MCP integration +
   `bd-sync` (the same bd ↔ GH ↔ Plane mirror pattern in
   `~/.claude/CLAUDE.md`). Bead body links back to the Sentry Issue
   URL.
3. PR fixing the bug references both the bead and the Sentry Issue;
   close-on-merge fans out via `bd-sync close --also-close-plane`.

Pipeline implementation: post-E1, lands as a small package
`packages/sentry-bead-bridge/` (NOT in scope for E1 itself).

#### 4.9 Per-environment endpoint configuration

Loaded from SOPS-encrypted `secrets.<env>.sops.yaml` at runtime:

```yaml
observability:
  otel_collector_endpoint: "..."   # https://otel.example.com:4318
  sentry_dsn: "..."                # commented-out in .env.example
  log_level: "info"                # info | warn | error in prod; debug in dev
```

The `getObservability()` factory reads these via `secretsLoader`
(see § 8 Security posture); never logs the raw values.

#### 4.10 Quick-start (when E1 lands)

```bash
# Local dev: spin up OTLP collector + Jaeger + Postgres + Redis
docker-compose -f infra/docker/observability.yml up -d
# Visit Jaeger:        http://localhost:16686
# Visit Sentry (dev):  http://localhost:9000
# Postgres on:         localhost:5432   (audit chain)
# Redis on:            localhost:6379   (BullMQ events)

# Run a server with observability wired in
pnpm --filter servers/policycenter-mcp dev
# Server emits spans to local OTLP, structured logs to stdout via pino-pretty,
# errors to local Sentry (claude_ai_Sentry MCP host)
```

The docker-compose layout under `infra/docker/observability.yml`
ships with E1 and is the documented onboarding path — a fresh clone
of the repo plus `docker-compose up` plus `pnpm install` plus the
sandbox cred SOPS file is the entire local-dev setup.

#### 4.11 What's deferred to later epics

| Item | Lands in |
|---|---|
| Bundle signing (Ed25519 / KMS) — `evidence.sign?` optional in v1 | E3+ |
| Cross-region audit replication | post-E1 ops work |
| Slack approval surface (vs CLI-only) | post-E3 |
| Approval delegation (out-of-office routing) | post-E10 |
| Auto-bead-creation Sentry pipeline (`packages/sentry-bead-bridge/`) | post-E1 |

### 5. NO MOCKS — sandbox + recording-replay contract

> *Inputs: [D-008](../004-DR-DEC-architecture-decisions.md#d-008--no-mocks--real-guidewire-cloud-sandbox-from-day-1),
> [D-021](../004-DR-DEC-architecture-decisions.md#d-021--terminology-fix-sandbox-meant-guidewire-isolated-tenant-what-we-actually-need-is-dev-tier-credentials--real-endpoints),
> [`../008-DR-MEMO-guidewire-api.md`](../008-DR-MEMO-guidewire-api.md)
> § 12 "avoid" item 11, librarian audit P2 / P5.*

The hard rule per [D-008](../004-DR-DEC-architecture-decisions.md):
no fixtures, real Cloud API recordings only. Hand-written
`fixtures/*.json` is forbidden — escape-scan + manifest validator
REFUSE such files at boot. CI fails loudly when sandbox is
unreachable on the live-sandbox post-merge job; never silently
degrades to mocks.

**Recording-capture entry point per engagement.** Per the Guidewire
developer portal, every InsuranceSuite Cloud application bundles
**Swagger UI at `<applicationURL>/resources/swagger-ui/`** — that's
the per-tenant interactive API docs reflecting the carrier's actual
deployed modules + product configuration (including custom-entity
paths that don't exist in the public apiref). When the first
integration engagement opens, that's where we point the
recording-capture script (`infra/recording/capture.ts`) — the
tenant Swagger reveals the exact endpoint shapes for THIS
carrier, the recordings get captured + sanitized + provenance-tagged
into `tests/recordings/`. See
[`005-DR-REF § 1` Tenant-bundled Swagger UI](../005-DR-REF-guidewire-public-resources.md).

#### 5.1 Recording filename provenance

Every recording in `tests/recordings/` follows this filename schema
so provenance is on-disk, not just in `MANIFEST.md`:

```
tests/recordings/<recording-name>.recorded-<YYYY-MM-DD>.from-sandbox-<tag>.json
```

Examples:

```
tests/recordings/find-submissions-waiting-on-me.recorded-2026-05-12.from-sandbox-jeremy-dev.json
tests/recordings/summarize-this-loss.recorded-2026-05-14.from-sandbox-jeremy-dev.json
tests/recordings/reconcile-this-payment.recorded-2026-06-02.from-sandbox-jeremy-dev.json
```

The `<tag>` is the SOPS-encrypted sandbox slug from
`profiles/oss-demo/auth.yaml`. The schema is universal across
deployments.

#### 5.2 `tests/recordings/MANIFEST.md` schema

`MANIFEST.md` is the human-readable index. Per recording:

```markdown
## find-submissions-waiting-on-me.recorded-2026-05-12.from-sandbox-jeremy-dev.json

| Field | Value |
|---|---|
| Capture date | 2026-05-12 |
| Source tenant | sandbox-jeremy-dev |
| Suite | PolicyCenter |
| Cloud release | Palisades (PC 202503) |
| Endpoint | `GET /job/v1/jobs?subtype=Submission&assignedToMe=true&status=Open` |
| HTTP method | GET |
| Response status | 200 |
| Response shape | List<Submission> |
| Pagination | pageSize=20, pageOffset=0 |
| Scrubbing applied | `*.namedInsured`, `*.contactInfo[*].email`, `*.taxId` (PII masks) |
| Replay-fitness | Confidence-grade — pageSize/pageOffset AUTHORITATIVE per librarian P5 |
| Captured by | scripts/record.ts (E1) |
| Captured at trace | `01J9X4HN5G8RXKX7P0VGAR3G7T` (correlation to OTel) |
```

The validator (`pnpm exec audit-harness recordings-lint`) checks:

- Filename matches the pattern in § 5.1.
- Every recording has a row in `MANIFEST.md`.
- `Cloud release` matches a release in
  [`../005-DR-REF-guidewire-public-resources.md`](../005-DR-REF-guidewire-public-resources.md)
  § 1 (Innsbruck / Las Leñas / Palisades).
- No `latest/` URLs anywhere in the recording or manifest (per
  [`../008-DR-MEMO-guidewire-api.md`](../008-DR-MEMO-guidewire-api.md)
  § 12 "avoid" item 11).
- PII scrubbing claims match a real scrubber pass (the recorder logs
  what it stripped; the manifest must report it).

#### 5.3 Capture pattern (`infra/recording/`)

Recordings are captured by a one-off script that:

1. Reads SOPS-encrypted creds from
   `profiles/oss-demo/secrets.sops.yaml` (or the per-tenant equivalent)
   via the standard `scripts/sops-env` wrapper.
2. Runs the tool's read or write call against the real sandbox via
   `packages/guidewire-client/`.
3. Captures the full HTTP request + response (headers, body, status).
4. Applies the PII scrubber from `packages/harness/redaction/`
   (configured by the active profile's `pii-policy.yaml`).
5. Writes the recording to `tests/recordings/` with the § 5.1 filename
   and updates `MANIFEST.md`.

The script lives under `infra/recording/record.ts` and ships in E1.
Recordings are committed to git like any other test asset; they are
the test ground truth.

#### 5.4 Replay framework

Contract tests (L4-contract per the IS Testing SOP taxonomy) replay
recordings via a thin replayer in `packages/guidewire-client/test-utils/`:

```typescript
import { withRecording } from '@guidewire/client/test-utils';

it('find-submissions-waiting-on-me round-trips', async () => {
  await withRecording(
    'find-submissions-waiting-on-me.recorded-2026-05-12.from-sandbox-jeremy-dev',
    async (client) => {
      const result = await client.policyCenter.findSubmissionsWaitingOnMe({
        actorId: 'actor:underwriter@demo',
      });
      expect(result.length).toBeGreaterThan(0);
    },
  );
});
```

The replayer matches request shape (method + URL + canonicalized
query params + body shape) against the recorded request and serves
the recorded response. **No mocking the harness, no mocking the
client; only replaying the wire.** Mismatch in request shape =
test failure, not a stub.

#### 5.5 Librarian P2 — ClaimCenter uses Composite API, not Graph API

Per the librarian audit
([`./audits/00-LIBRARIAN-CITATION-AUDIT.md`](./audits/00-LIBRARIAN-CITATION-AUDIT.md)
§ 3 P2, finding F-PRD-007 / F-API-014), the
`summarize-this-loss` recording must use **CC Composite API**, not
Graph API. ClaimCenter
([CC 202411 apiref](https://docs.guidewire.com/cloud/cc/202411/apiref/))
exposes Admin, Async, Claim, Common, **Composite**, System Tools —
**no Graph API module**. PolicyCenter has Graph API; ClaimCenter does
not. The recording filename for the canonical CC anchor:

```
tests/recordings/summarize-this-loss.recorded-<date>.from-sandbox-<tag>.json
```

…must record a **Composite API** call shape, not a Graph expansion.
Schema constraint: the manifest row's `Endpoint` field must reference
`/composite/v1/composite` (or the equivalent CC Composite surface
confirmed at sandbox-provisioning time) when the suite is `ClaimCenter`.

#### 5.6 Librarian P5 — pagination is confidence-grade

Per the librarian audit § 3 P5 (finding F-API-005), `pageSize` and
`pageOffset` are **AUTHORITATIVE** per the
[IS 202603 pagination page](https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/Basic-REST-operations/query-parameters/c_the-pagination-query-parameters.html),
not "practitioner knowledge — verify post-sandbox" as
[`../008-DR-MEMO-guidewire-api.md`](../008-DR-MEMO-guidewire-api.md)
§ 5 originally classified them. **Pagination contract tests are
confidence-grade now**: the L4-contract suite includes pagination
round-trip cases for every list-shaped tool, asserting that
`pageSize` and `pageOffset` query params are sent in the canonical
shape, with no `(unverified)` flag on the assertion. The "previous"
and "next" link headers documented on the same page provide the
secondary cursor surface; the client iterator follows them.

#### 5.7 Live-sandbox CI job

Two CI surfaces separate sandbox availability concerns:

| Surface | Trigger | Behavior on sandbox unreachable |
|---|---|---|
| Per-PR contract tests | Pull request | Replay-only; sandbox not contacted; passes if recordings match |
| Live-sandbox post-merge job | Merge to `main` | Re-runs the same contract suite **against the live sandbox**; **CI fails loudly** if sandbox unreachable. Records drift if API contract changed since the last recording. |

The post-merge job is the API-drift detector — when Guidewire ships
a release boundary (Palisades → next), the live job catches the
contract change and produces a PR to refresh the recording.

#### 5.8 `samples/` — read-only replay material, never test ground truth

`samples/` (top-level) holds documentation-grade illustrative payloads
(e.g. for the README, blog posts). Tests do
not load from `samples/`. Recordings in `tests/recordings/` are the
only test ground truth. The escape-scan REFUSEs any test file that
imports from `samples/`.

### 6. Quality gates (testing policy — `tests/TESTING.md`) *(GW-1.10)*

> *Authored 2026-05-04. The full policy lives at
> [`../../tests/TESTING.md`](../../tests/TESTING.md) (engineer-owned,
> hash-pinned). This section summarizes the contract; the canonical
> source is the TESTING.md file, which is the hash-pin target.
> Cite IS Testing SOP at [`../../../CLAUDE.md`](../../../CLAUDE.md)
> § Intent Solutions Testing SOP.*

#### 6.1 7-layer testing taxonomy applicability

Per the IS Testing SOP ([`../../../CLAUDE.md`](../../../CLAUDE.md) §
Intent Solutions Testing SOP) and the layer-applicability matrix at
`~/.claude/skills/audit-tests/references/layer-applicability.md`:

| Layer | Status | Applies to |
|---|---|---|
| L1 Hooks | ✅ required | workspace root + every package |
| L2 Static (Biome, depcruise, tsc strict) | ✅ required | every package |
| L3 Unit (Vitest + fast-check + Stryker) | ✅ required | every package |
| L4-integration (testcontainers Postgres) | ✅ required | `packages/audit`, `packages/harness` |
| L4-contract (recordings-replay) | ✅ required (regulated overlay) | every `servers/*` |
| L4-migration (audit-chain SQL migrations) | ✅ required | `packages/audit` |
| L5-sec (gitleaks, OWASP grade A) | ✅ required (regulated overlay) | workspace root |
| L5-perf | ⭕ recommended (promoted post-E1) | `servers/*`, `packages/harness` |
| L5-a11y, L6-e2e, L6-visual | ❌ waived | no UI in OSS scope |
| L6-smoke (CLI + MCP smoke) | ⭕ recommended | `packages/harness` CLI, `servers/*` |
| L7-UAT (E10 onboarding flow) | ⭕ recommended | `pnpm gw onboard` flow |

Compliance overlay: **SOC 2** (audit hash-chain integrity, evidence
bundle export, secret rotation, BAA path for health LOBs). The
overlay promotes L2, L4-contract, L5-sec, L7-UAT to ✅.

#### 6.2 Threshold floors (hash-pinned)

| Gate | Repo-wide | Per-module override |
|---|---|---|
| Statement coverage | 80 | `harness` 90 (load-bearing per [`../009-DR-MEMO-harness-runtime.md`](../009-DR-MEMO-harness-runtime.md) § 2.6) |
| Branch coverage | 75 | — |
| Mutation kill rate (Stryker) | 70 (deferred initial enforcement to E1.5) | `harness` 85, `audit` 85, `auth` 85, `observability` 80, `servers/*` 75, `clients/*` 70 |
| CRAP per function (prod) | ≤ 30 | — |
| CRAP per function (test) | ≤ 15 | — |
| CRAP project average | ≤ 10 | — |
| Flaky tolerance | 0/3 runs | — |
| Test complexity ceiling | 15 cyclomatic | — |
| OWASP coverage | grade A | — |
| Architecture rules (depcruise) | zero violations | — |
| Bias count (escape-scan) | zero REFUSE, ≤ 3 CHALLENGE per PR | — |
| Vocabulary linter (007 memo § 7) | api-verb-leak = 0, engineering-speak = 0 | — |
| Persona density | ≥ 5 tools per declared persona | — |
| Recordings | required for read AND write tools | — |
| Gherkin lint (E10 acceptance) | pass | — |
| Bias guards | tautology = 0, over-mocked-modules = 0 | — |

Higher harness/audit/auth mutation floors per
[`../009-DR-MEMO-harness-runtime.md`](../009-DR-MEMO-harness-runtime.md)
§ hash-chain criticality and
[`../006-DR-MEMO-mcp-safety.md`](../006-DR-MEMO-mcp-safety.md) §
cross-cutting harness invariants. Mutation testing carries an
intentionally lower bar at initial E1 release — mutation runs are
expensive on a fresh codebase; the 70 floor lifts to module-specific
floors at E1.5 once baseline mutation coverage is established.

#### 6.3 Hash-pinning (engineer-only edits)

All policy values above are hash-pinned via:

```bash
pnpm exec audit-harness init   # after engineer policy edits
```

The harness stamps a manifest hash into `.harness-hash` (committed)
covering every protected file in `tests/TESTING.md` § Hash manifest:

```
protected_files:
  - tests/TESTING.md#policy
  - features/*.feature
  - .dependency-cruiser.cjs
  - vitest.config.ts#thresholds
  - .stryker.config.json
```

`escape-scan.sh` REFUSES any AI-proposed diff that touches policy
lines unless preceded by engineer-initiated `audit-harness init`.
The pre-commit hook + the per-PR CI step both run the verifier.
This is the anti-drift property: **AI cannot lower a threshold**.

#### 6.4 `tests/TESTING.md` schema

Per the IS Testing SOP testing-md-spec
(`~/.claude/skills/audit-tests/references/testing-md-spec.md`),
`tests/TESTING.md` carries:

- `## Classification (policy)` — repo type, languages, applicable
  layers, waived layers, compliance overlay (engineer-edited).
- `## Thresholds (policy, hash-pinned)` — the § 6.2 table in machine-
  readable form.
- `## Installed gates (observational)` — what L1/L2/L3/… are wired.
- `## Frameworks (observational)` — Vitest/Stryker/Biome/depcruise
  versions, per-tool config locations.
- `## Last audit (observational)` — date, grade, P0/P1/P2 gap counts,
  populated by `/audit-tests`.
- `## Traceability (observational)` — RTM, personas, journeys (driven
  by `audit-harness rtm`).
- `## Hash manifest` — the protected-files block + the latest
  `audit-harness init` timestamp + author.

Engineer edits the policy sections; AI edits only the observational
sections. The escape-scan boundary is enforced by an AST diff on the
file's section headers.

#### 6.5 Recording-replay enforcement (NO MOCKS)

Per [D-008](../004-DR-DEC-architecture-decisions.md). Every
`servers/*` test that touches the Guidewire Cloud API surface MUST
replay against a real recording in `tests/recordings/` with
`MANIFEST.md` provenance. Hand-written fixture JSON is forbidden
(`recordings.fixture_files_forbidden: true` in `tests/TESTING.md`).

CI fails loudly when sandbox is unreachable on the live-sandbox
post-merge job (per § 5.7); never silently degrades to mocks.

#### 6.6 Vocabulary 8-rule PR-time checklist

Per [`../007-DR-MEMO-carrier-vocabulary.md`](../007-DR-MEMO-carrier-vocabulary.md)
§ 7. Mechanically enforced via `audit-harness vocab-lint`:

1. No API-verb prefixes (`search_*`, `get_*`, `list_*`, `fetch_*`,
   `query_*`, `update_*`, `create_*`, `delete_*`)
2. No engineering-speak in tool names (`serialize`, `mutate`,
   `fetch`, `payload`, `cursor`, `pagination`)
3. Hyphen-coupled names readable as a sentence
4. Possessive scope (`my`, `our`, `this`) where the operator's
   perspective applies
5. Question form for question-tools, imperative for action-tools
6. Each persona has ≥5 tools speaking their language
7. No engineering-jargon in tool descriptions
8. Tool name + description together pass the "would an operator say
   this?" test

`carrier-vocabulary-curator` reviews the result at PR time when
ambiguous; the linter handles deterministic rules. Tool-name
canonical forms are pinned by
[D-016](../004-DR-DEC-architecture-decisions.md).

#### 6.7 CI gate ordering

The CI workflow is parallel where possible, sequential where the gate
depends on a prior step. Per-PR pipeline:

```
[lint:biome] [lint:tsc] [arch:depcruise] [escape-scan]   # parallel L2
       │           │            │              │
       └───────────┴────────────┴──────────────┘
                          │
              [unit:vitest --coverage]                    # L3
                          │
              [contract:replay]                           # L4-contract (replays only — no sandbox)
                          │
              [integration:testcontainers]                # L4-integration
                          │
              [migration:pgtap]                           # L4-migration
                          │
              [audit-harness harness-hash --verify]       # hash-pin check
                          │
              [audit-harness coverage --min=<floor>]      # floor enforcement
                          │
              [audit-harness vocab-lint]                  # tool-name vocabulary
                          │
              [audit-harness recordings-lint]             # MANIFEST.md schema
                          │
              [gemini-code-assist review]                 # external review (per CLAUDE.md hard rule)
                          │
              [1 human approval]                          # branch protection
                          │
                       [merge to main]
                          │
              [post-merge: contract:live-sandbox]         # API-drift detector (§ 5.7)
              [post-merge: stryker --since=last-merge]    # mutation (post-merge only at E1.5+)
```

Branch protection on `main` requires every gate above + Gemini Code
Assist + 1 human approval. **Gemini must complete before merge** per
[`../../CLAUDE.md`](../../CLAUDE.md) Hard Rule "Gemini PR Review".

#### 6.8 Pre-commit hooks

Husky-style hooks under `.husky/`:

| Hook | Action |
|---|---|
| `pre-commit` | `pnpm exec audit-harness escape-scan` (REFUSE on policy diff without re-init), `pnpm exec biome check --staged`, `pnpm exec audit-harness harness-hash --verify` |
| `commit-msg` | Conventional Commits validation via commitlint |
| `pre-push` | `pnpm test --run` (unit only); `pnpm exec audit-harness arch` |

**Every command above calls `pnpm exec audit-harness …` — never
`~/.claude/` paths.** Enforcement travels with the code per
[`../../CLAUDE.md`](../../CLAUDE.md) Hard Rule #7.

### 7. Build / deploy

#### 7.1 pnpm workspace topology

`pnpm-workspace.yaml`:

```yaml
packages:
  - 'packages/*'
  - 'servers/*'
  - 'clients/*'
  - 'profiles/*'
  - 'templates/*'
```

Build order (topological, derived by pnpm from per-package
dependencies):

```
schemas → observability → audit → auth → guidewire-client → harness → servers/* → clients/*
```

`pnpm -r build` walks the order; `pnpm -r --parallel test` runs
test suites concurrently after build.

#### 7.2 Docker image strategy

One image per `servers/*` member (e.g.
`ghcr.io/jeremylongshore/policycenter-mcp:<git-sha>`). Multi-stage:

1. `builder` stage runs `pnpm install --frozen-lockfile` and `pnpm
   --filter <server> build`.
2. `runtime` stage copies the built artifact + minimal Node 22 LTS
   runtime + the per-server `package.json`.

Harness CLI ships as a separate image
(`ghcr.io/jeremylongshore/guidewire-harness:<git-sha>`) so operators
can run approval flows independently of the servers.

#### 7.3 Cloud Run deployment

`infra/cloud-run/<server>.yaml` per server. Per-tenant process
isolation per [`./03-ARCHITECTURE.md`](./03-ARCHITECTURE.md) § 7.2:
each carrier customer runs their own service revision with their own
profile mounted. Concurrency capped to 1 per instance for the harness
CLI service (to keep approval flows simple); servers can scale
horizontally because the harness is the only write boundary.

#### 7.4 OpenTofu IaC modules

`infra/tofu/`:

- `modules/cloud-run/` — service + revision + IAM + env wiring
- `modules/postgres/` — Cloud SQL Postgres 15 with serializable-tx
  defaults
- `modules/redis/` — Memorystore for events queue
- `modules/secret-manager/` — secret bindings (the SOPS-encrypted
  files decrypt on the runtime side via `secretsLoader`; Secret
  Manager only carries the age private key)

#### 7.5 Secrets at runtime (SOPS + age)

Per IS standard ([global CLAUDE.md](../../../CLAUDE.md) § SOPS
initiative):

1. `runbook/secrets.<env>.sops.yaml` is committed (encrypted) under
   each profile.
2. The age private key is delivered to the runtime via Cloud Run
   Secret Manager binding — never in the container image.
3. `secretsLoader` (in `packages/auth/`) decrypts the SOPS file at
   process boot, populates env vars in-process, never writes to disk.
4. The `eval "$(sops -d ... | sed -nE 's/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/export \1=\2/p')"`
   pattern (anchored regex) is the only allowed shell-side surface
   per the global CLAUDE.md OPS-8ft postmortem.

### 8. Security posture

> *Co-authored alongside the `security-auditor` audit memo at GW-1.8.*

#### 8.1 Auth model — OAuth + JWT propagation

Guidewire Hub OAuth via `openid-client`. Per-tenant `auth.yaml`
declares the OIDC discovery URL; the `packages/auth/` factory pulls
the JWKS, rotates tokens at 80% of lifetime (proactive refresh per
[`../008-DR-MEMO-guidewire-api.md`](../008-DR-MEMO-guidewire-api.md)
§ 10), and propagates the actor JWT through to Cloud API as the
`Authorization: Bearer <jwt>` header. The `actor_claim`
(default `sub`) is the JWT field carrying actor identity for audit-
chain attribution.

Token endpoint URL, scopes catalog, and JWKS URI are sandbox-blocked
per librarian P6 — `auth.yaml` cannot be finalized until
`guidewire-adj` (sandbox) closes.

##### 8.1.1 Revocation latency (per SA-2)

Per [SA-2](./audits/04-SA-security-review.md#f-2) and [red-team
F-RT-5.3](./audits/02-RED-TEAM-PANEL.md). With OAuth token-lifetime
defaults at 3600s (60 min) and proactive refresh at 80%, an
offboarded employee whose JWT was issued just before HR's
offboarding event keeps usable access for up to the token's
remaining lifetime. Carrier offboarding SLOs are typically
same-day; for sensitive roles, often same-hour. The OSS default is
deliberately bounded by token lifetime — the platform makes no
revocation commitment beyond what the OAuth provider issues.
Carriers requiring tighter revocation have two carrier-side levers:

| Lever | `auth.yaml` change | Trade-off |
|---|---|---|
| (a) Reduce token lifetime | `oauth.token_lifetime_seconds: 600` (or lower) | Approximately 6× the OAuth refresh load on Hub; in-flight `approved_execute` writes still need proactive-refresh discipline (§ 8.1 above) |
| (b) Per-call introspection | `oauth.introspect: true` ([RFC 7662](https://datatracker.ietf.org/doc/html/rfc7662)) | Adds ~30ms per Cloud API call; drops effective revocation latency to the introspection cache TTL (typically <60s); requires the carrier's Hub to expose a `token_introspection_endpoint` in OIDC discovery |

The trade-off is operator-driven, not OSS-defaulted. Carriers with
faster revocation SLOs pick the levers that match their operational
posture; the platform ships the surface, the carrier wires the
policy. The `packages/auth/` factory honors both knobs via the
extended `auth.yaml` schema at
[02-PRD § 6.1](./02-PRD.md#61-authyaml--guidewire-hub-oauth--jwt-propagation).

##### 8.1.2 Per-tenant OAuth client lifecycle (per BA-4)

Per [BA-4](./audits/05-BA-backend-review.md#f-4). The
`packages/auth/` package exposes a thin public API
(`getOAuthClient(profile.auth)`); the lifecycle around it bears on
multi-tenant correctness and is not derivable from the per-package
contract row alone:

- **Cache key.** `getOAuthClient` caches by the
  `(tenantId, oidcDiscoveryUrl, clientId)` tuple. Two tenants with
  the same `clientId` against different Hub tenants resolve as
  distinct entries; reusing a single instance across them would
  cross-tenant the JWKS cache and is rejected by depcruise +
  runtime assertion.
- **Cache invalidation.** Profile-reload events (operator-driven —
  edit a profile YAML and SIGHUP / restart the server) invalidate
  the cache entry for that profile slug. The cache is bounded
  (LRU; default 100 entries; configurable via
  `auth.yaml.client_cache.max_entries`); evicted clients close
  their underlying HTTP keep-alive pool.
- **JWKS refresh.** First call with a `kid` not in the in-memory
  JWKS cache triggers a foreground refresh; background refresh
  fires at 80% of the JWKS TTL (`Cache-Control: max-age` from the
  JWKS endpoint). Refresh failures emit pino WARN (`"jwks.refresh.failed"`)
  + Sentry tag `auth.jwks_refresh_failed` and are non-fatal — the
  in-flight cache continues to serve until the next call's `kid`
  miss.
- **Token cache.** Per-actor access-token cache keyed by
  `(tenantId, actorId)`. Eviction is LRU-bounded at 10 000 actors
  (configurable via `auth.yaml.token_cache.max_entries`). Tokens
  evicted before expiry trigger a fresh OAuth round-trip on the
  next call.
- **In-flight on rotation.** When the JWKS rotates mid-flight, the
  drain pattern is: existing requests complete with the
  pre-rotation key; new requests acquire the post-rotation key on
  next call. The drain window is bounded by Cloud API request-
  timeout (default 30s). No request is dropped on rotation.

This lifecycle is auth-policy, not just package topology — it
lives here in § 8 (Security posture) rather than in
§ 2 (per-package contracts) because the multi-tenant correctness
properties are what a carrier CISO will probe at SOW review.

#### 8.2 Audit hash-chain — implementation contract

Per `packages/audit/` and
[`../009-DR-MEMO-harness-runtime.md`](../009-DR-MEMO-harness-runtime.md)
§ 2:

```sql
-- packages/audit/migrations/0001_init.sql (excerpt)
CREATE TABLE audit_chain_heads (
  tenant_id        TEXT PRIMARY KEY,
  current_seq      BIGINT NOT NULL DEFAULT 0,
  current_hash     TEXT NOT NULL DEFAULT ''
);

CREATE TABLE audit_entries (
  entry_id         TEXT PRIMARY KEY,         -- ULID
  tenant_id        TEXT NOT NULL,
  chain_seq        BIGINT NOT NULL,
  event_type       TEXT NOT NULL,
  plan_id          TEXT NOT NULL,
  trace_id         TEXT NOT NULL,
  actor_id         TEXT NOT NULL,
  tool_name        TEXT NOT NULL,
  tool_version    TEXT NOT NULL,
  mode             TEXT NOT NULL,
  idempotency_key  TEXT,
  recorded_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  prev_hash        TEXT NOT NULL,
  entry_hash       TEXT NOT NULL,
  blob_ref         TEXT,
  UNIQUE (tenant_id, chain_seq)
);
```

Append protocol: serializable transaction; `SELECT … FOR UPDATE` on
`audit_chain_heads` row; compute `entry_hash = sha256(prev_hash ||
canonical_serialization(entry_fields))`; insert row; update
`current_seq` and `current_hash`. Single-writer per tenant; concurrent
appends serialize on the head row.

`verifyChain(tenantId)` walks the chain forward and recomputes hashes;
any mismatch = `chain_broken`, harness refuses all writes for that
tenant until `chain.repair.acknowledged` (manual operator action).

##### 8.2.0 `approvals` table DDL (per HR-4)

Per [HR-4](./audits/11-HR-harness-review.md#f-4) +
[009 § 1.3](../009-DR-MEMO-harness-runtime.md). The
`Approval` state machine at
[02-PRD § 5.3](./02-PRD.md#53-approval--blocking-flow-as-state-machine)
is load-bearing for `approved_execute` and persists in Postgres so
that a restart, network partition, or CLI session ending mid-wait
does not lose the request. The DDL lands in the same migration as
the audit chain so E3 implementation does not re-derive the schema
from the TS interface (and risk drift).

The block below is the **shipped DDL** in
`packages/audit/migrations/0001_init.sql`. Six items deviate from
the original blueprint draft; each is explained inline below the
SQL and underwent code-review confirmation (Gemini Code Assist on
PR #86 + the AR-7 testcontainers test in PR #94). The migration is
the single source of truth — this section mirrors it.

```sql
-- packages/audit/migrations/0001_init.sql (extended per HR-4)
CREATE TABLE IF NOT EXISTS approvals (
  approval_id      TEXT PRIMARY KEY,        -- sha256(planId + nonce)
  tenant_id        TEXT NOT NULL,
  plan_id          TEXT NOT NULL,
  decision_id      TEXT NOT NULL,
  state            TEXT NOT NULL,           -- pending | approved | denied | expired | cancelled
  requested_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at       TIMESTAMPTZ NOT NULL,
  approvers        JSONB NOT NULL DEFAULT '[]',  -- ① renamed from `approver_votes`
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
  -- ② NO `UNIQUE (tenant_id, plan_id)` — see partial unique index below
);

-- ② Replaces the originally-drafted `UNIQUE (tenant_id, plan_id)`. That
-- constraint contradicts `approval_id = sha256(planId + nonce)`: the
-- system is designed to allow multiple distinct approvals per plan
-- (e.g. a re-request after a previous request expired or was denied).
-- A hard UNIQUE blocks every legitimate re-request. The partial unique
-- index keeps the spec's intent (only one *active* approval per plan)
-- while allowing the historical chain to retain decided rows.
CREATE UNIQUE INDEX IF NOT EXISTS approvals_one_pending_per_plan_idx
  ON approvals (tenant_id, plan_id)
  WHERE state = 'pending';

-- Hot-path query: the CLI's `approve` list + the harness's wait()
-- poll both filter pending approvals per tenant. The partial index
-- keeps the index size proportional to in-flight approvals, not
-- historical decided ones (which dominate after a few weeks of
-- production traffic).
CREATE INDEX IF NOT EXISTS approvals_pending_idx
  ON approvals (tenant_id, state)
  WHERE state = 'pending';

-- ③ `updated_at` trigger. Postgres does NOT auto-update DEFAULT now()
-- on UPDATE; without a trigger, `updated_at` would equal `requested_at`
-- for the life of the row — useless for forensic timelines. The trigger
-- function is CREATE OR REPLACE + DROP TRIGGER IF EXISTS so the
-- migration stays idempotent.
CREATE OR REPLACE FUNCTION approvals_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS approvals_updated_at_trg ON approvals;
CREATE TRIGGER approvals_updated_at_trg
  BEFORE UPDATE ON approvals
  FOR EACH ROW
  EXECUTE FUNCTION approvals_set_updated_at();
```

Six deviations from the original blueprint draft, each carrying its
operational rationale. Each is discoverable inline as a numbered
comment in the migration; this list is the long-form why:

- **① Column `approvers` (not `approver_votes`).** The runtime contract
  in [`packages/schemas/src/harness/approval.ts`](../../packages/schemas/src/harness/approval.ts)
  declares the field as `approvers` (an array of vote-shaped objects).
  Aligning the DDL with the TS contract avoids an app-layer name remap
  on every read/write. Caught by Gemini Code Assist on PR #86.

- **② Partial unique index on `pending`, not table-level UNIQUE.**
  Explained inline above; the originally-drafted `UNIQUE (tenant_id,
  plan_id)` would have prevented the legitimate re-request flow that
  `approval_id = sha256(planId + nonce)` is designed to support.

- **③ `approvals_set_updated_at` trigger.** Required for
  `updated_at` to be honest after state-machine transitions; without
  it the column equals `requested_at` for the row's lifetime.

- **④ Column-restricted `GRANT UPDATE` to `audit_writer`** —
  `(state, approvers, updated_at)` only. A compromised harness must
  not be able to rewrite immutable provenance (`tenant_id`, `plan_id`,
  `decision_id`, `requested_at`, `expires_at`, `created_at`,
  `approval_id`). See § 8.2.1's grant block. Verified by the
  `column-restricted GRANT denies UPDATE on immutable columns` test
  in [`packages/harness/tests/approvals.pg.test.ts`](../../packages/harness/tests/approvals.pg.test.ts).

- **⑤ `GRANT USAGE ON SCHEMA public` to both runtime roles.**
  PostgreSQL 15+ removed the implicit `USAGE` on the `public`
  schema for new roles
  ([PG 15 release notes](https://www.postgresql.org/docs/15/release-15.html)).
  Without an explicit grant, the table-level GRANTs below have no
  effect — every query throws `permission denied for table …`.
  Discovered by the testcontainers tests in PR #92.

- **⑥ `GRANT SELECT ON approvals TO audit_writer`.** This is
  asymmetric with `audit_entries`, where the writer is purely
  append-only and never reads its own log (verifyChain runs as
  `audit_reader`). The `approvals` table is different: the harness
  *drives* the state machine, and the `wait()` polling loop must
  read what it just wrote. Forcing a separate reader pool for the
  polling path adds connection-management complexity with zero
  tamper-evidence benefit (provenance chains via `audit_entries`
  rows that reference `approval_id`, not via `approvals` row
  visibility). The defense-in-depth that matters — column-restricted
  UPDATE + denied DELETE — remains intact.

The `approvals` table is owned by `audit_owner` (same role
separation as `audit_entries` per § 8.2.1 below). Runtime grants:
`audit_writer` gets `INSERT`, column-restricted `UPDATE`, and
`SELECT` on `approvals` (state-machine transitions + polling read);
`audit_reader` gets `SELECT` for compliance-job replay. The
update-path's legal transitions
(`pending → approved | denied | expired | cancelled`) are enforced
by the application-layer state-precondition pattern in
[`packages/harness/src/approvals/pg.ts`](../../packages/harness/src/approvals/pg.ts) —
every UPDATE includes `WHERE state = 'pending'`, so illegal
transitions match zero rows and surface as either a no-op (race
loser) or a typed throw (user-driven illegal transition). The DDL
does not encode the state machine; the spec lives in TS.

##### 8.2.1 Postgres role separation — operational identity

Per [D-019](../004-DR-DEC-architecture-decisions.md#d-019--audit-chain-is-tamper-resistant-not-tamper-evident-against-a-compromised-harness-dba)
and [04-SA F-3](./audits/04-SA-security-review.md#f-3), the audit
DB ships three roles. Their operational identities (the principals
that hold the credentials, not just the SQL grants) are:

- **`audit_owner`** — owns `audit_entries`, `audit_chain_heads`,
  and `approvals` (per HR-4 above);
  runs `packages/audit/migrations/0001_init.sql` and any future
  schema migration. **NEVER the runtime connection identity.**
  Migrations execute via a dedicated CI job (`pnpm audit:migrate`)
  or an out-of-band ops job, both authenticating with credentials
  scoped only to the migration window. The `audit_owner` password /
  cert lives in `runbook/secrets.prod.sops.yaml` (SOPS + age, per
  repo `CLAUDE.md` § Stack and the rotation cadence in § 8.3
  below), is decrypted only by the migration job, and is **never
  injected into MCP server or harness runtime envs**. In single-operator OSS deployments where
  the operator is also the DBA, the operator runs the migration
  with `audit_owner` credentials, then drops them from any
  long-lived shell history / env file before starting the harness;
  the harness's `DATABASE_URL` carries only the `audit_writer`
  grant.
- **`audit_writer`** — the **only** role used by `packages/audit/`
  + `packages/harness/src/approvals/pg.ts` at runtime. Loaded into
  the MCP server / harness process via `DATABASE_URL` from the
  runtime SOPS-encrypted env. The role-separation testcontainers
  tests in
  [`packages/audit/tests/role-separation.pg.test.ts`](../../packages/audit/tests/role-separation.pg.test.ts)
  + [`packages/harness/tests/approvals.pg.test.ts`](../../packages/harness/tests/approvals.pg.test.ts)
  (per AR-7, the E1 exit criterion) make this runtime constraint
  binding: any future change that quietly broadens the runtime grant
  set fails CI. Grant set:
    - `audit_entries` — `INSERT` only. No `SELECT`, no `UPDATE`,
      no `DELETE`. The writer never reads its own log; verifyChain
      runs as `audit_reader`.
    - `audit_chain_heads` — `INSERT`, `SELECT`, `UPDATE`. Required
      for the `SELECT … FOR UPDATE` + `UPDATE` pattern that drives
      the per-tenant chain head under serializable isolation.
      `DELETE` denied.
    - `approvals` — `INSERT`, column-restricted `UPDATE (state,
      approvers, updated_at)`, `SELECT`. The asymmetry vs
      `audit_entries` is deliberate: the harness drives the
      approval state machine and `wait()` polling reads its own
      writes. `DELETE` denied.
    - `USAGE` on `public` schema (PG 15+ requirement — see § 8.2.0
      deviation ⑤).
- **`audit_reader`** — `SELECT`-only on `audit_entries`,
  `audit_chain_heads`, and `approvals`. Used by `verifyChain()` in
  compliance jobs (re-hash sweep, regulator-export bundle) and any
  out-of-band approval-history readback. Held by an ops-only
  identity; never granted to the MCP server runtime. Also receives
  `USAGE` on `public` schema for the same PG 15+ reason.

The `audit_writer` ↔ `audit_owner` split is the **defence-in-depth
layer D-019 names**; the `audit_reader` split is operational
hygiene (read traffic doesn't share connection limits or risk
posture with write traffic). Residual risk: a privileged DBA
holding `audit_owner` credentials can still bypass the chain and
is the trigger for the E3+ KMS-signed external-commitment surface
(implementation TBD per customer trust model — see
[D-019 § operational consequences](../004-DR-DEC-architecture-decisions.md#d-019--audit-chain-is-tamper-resistant-not-tamper-evident-against-a-compromised-harness-dba)).

#### 8.3 Secret rotation cadence

| Secret | Rotation | Mechanism |
|---|---|---|
| Guidewire OAuth client secret | per carrier policy (typical 90 days) | rotate in SOPS file; PR; redeploy; old token gracefully expires |
| Age private key | annual | re-encrypt all SOPS files with new recipient; commit; deploy; delete old key from Secret Manager |
| Sentry DSN | rotate on suspected exposure | DSN per env; rotation is in Sentry org admin |
| Postgres password | quarterly | rotate via Cloud SQL; OpenTofu manages binding |
| GitHub Actions `GUIDEWIRE_SANDBOX_TOKEN` | per sandbox tenant policy | regenerate in Guidewire Console; update in GH org Secrets |

Per `~/.claude/CLAUDE.md` `feedback_no_redundant_rotation_asks.md` —
do not propose secondary rotation cycles unless a specific exposure is
identified.

#### 8.4 BAA path (health LOBs)

When `pii-policy.yaml.baa_required: true` (set by carriers running
health LOBs), the tool catalog filters down to BAA-cleared tools
only. Health-LOB carrier profiles MUST set this — the harness
refuses to load a profile carrying health LOBs without
`baa_required: true`. The `mcp-safety-reviewer` GW-1.8 lane verifies
the carve-out is honored at boot.

#### 8.5 Threat model — bounded summary

| Threat | Mitigation |
|---|---|
| Compromised agent host issues unauthorized writes | Three-mode declaration + harness gate + `approved_execute` requires policy + approval + audit; even a fully compromised agent cannot write without an approver vote |
| Admin-scope OAuth surface (commission reads, etc.) is harness-scope-filtered, not Guidewire-scope-filtered (per [GA-3](./audits/10-GA-guidewire-api-review.md#f-3) + red-team [F-RT-4.2](./audits/02-RED-TEAM-PANEL.md)) | `roles.yaml` boot validation refuses any producer-tier role bound to a tool whose endpoint cannot be producer-code-scoped at the harness layer (e.g. `/admin/v1/commission-plans`, which has no `producerCode` filter — the harness must filter the response after fetch). Every admin-scope call writes a distinct `audit_entries` row with `oauth_scope: 'admin'` (vs `producer` / `read` / `write`) for forensic review. Mitigates the "admin scope leaks past the harness" attack shape — the admin scope is granted at OAuth, but the per-call audit row records which scope was actually used so a compromised harness cannot quietly broaden access without a chain-visible trail. |
| Compromised harness DB (unprivileged operator) | Linear hash chain + serializable single-writer makes tampering tamper-evident; `verifyChain` detects |
| Compromised harness DB (privileged DBA) | **Defence-in-depth, NOT tamper-evident** per [D-019](../004-DR-DEC-architecture-decisions.md#d-019--audit-chain-is-tamper-resistant-not-tamper-evident-against-a-compromised-harness-dba). Postgres role separation: `audit_writer` is INSERT-only, `audit_reader` is SELECT-only, schema-owner identity is held outside the harness process. Residual risk: a privileged DBA with the schema-owner role can still bypass — closed by E3+ KMS-signed external commitment surface. |
| Cross-tenant attack | Per-tenant linear hash chain + tenant-isolated rows in `audit_entries` contain blast radius (an attacker who compromises tenant A's chain cannot tamper with tenant B's) |
| Token leak | Tokens never written to disk; SOPS-encrypted at rest; proactive refresh limits stale-token blast radius |
| Replay attacks against Guidewire | Two-key idempotency: harness short-circuits replay; `GW-DBTransaction-ID` is the secondary safety net (librarian P1) |
| Profile-data injection | Zod validation at boot; escape-scan refuses non-YAML files in `profiles/**`; depcruise refuses cross-profile imports |
| PII exfil through read tools | Read-side audit + `pii-policy.yaml` redaction at response time + bundle-time redaction at evidence export |
| Unauthorized money movement | Out-of-scope — `payments-mcp` is a separate future repo with dual-control approval ([D-018](../004-DR-DEC-architecture-decisions.md)) |

The full threat model lands in the `security-auditor` GW-1.8 audit
memo; this section is the bounded summary.

---

## Audit gate

Reviewed by:

- `backend-architect`
- `security-auditor`
- `architect-reviewer`
- `harness-runtime-architect`
