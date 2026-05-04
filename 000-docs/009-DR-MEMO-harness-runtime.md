# 009-DR-MEMO — Harness runtime contract (Phase 0 design memo)

**Filed:** 2026-05-04
**Author:** `harness-runtime-architect` (Mode A — Phase 0 Day 3)
**Bead:** `guidewire-mgn`
**Feeds blueprint sections:**
- `03-ARCHITECTURE.md` § 2 layered model, § 5 three-mode flows, § 6 failure modes (GW-1.3)
- `05-TECHNICAL-SPEC.md` § 3 contracts, § 4 observability, § 8 security posture (GW-1.3 + GW-1.11)
- `02-PRD.md` § 4 mode contract, § 5 harness contract (GW-1.2)
- Future epic E3 — `packages/harness/` library + CLI (`guidewire-7jt` → E3 sub-bead)
**Status:** Phase 0 input artifact, pre-code. Becomes the literal interface
file in `packages/harness/src/index.ts` when E3 opens.

---

## Why this memo exists

The harness is the durable moat. Anyone can ship MCP tools that wrap a
Guidewire endpoint. Almost nobody ships the runtime that gates those
writes with a hash-chained audit, an approval flow, an idempotency
contract, and an evidence bundle a CISO can hand to an auditor.
Everything load-bearing in the v4 architecture — D-003 (harness as
library), D-005 (three modes), D-006 (no audit no write), D-008 (no
mocks), D-013 (observability from line 1) — collapses to a single
runtime contract. This memo is that contract.

Persona 5 (CISO) and Persona 8 (Kim from claims) both read this layer
before they trust the rest of the platform. Persona 3 (Claims VP)
needs the `draft_only` path to be cheap, the `approved_execute` path
to be possible, and the line between them physical. The runtime must
make the line physical at the harness layer, not at the tool layer.

This memo is long because the harness is deep. Every primitive below
either ships in E3 or fails the audit panel.

---

## 1. Library API surface (TypeScript)

The harness exports six primitives, two factory functions, one
result type, and one error type. The CLI is a thin shell over the
library — see § 9 for parity rules. All types live in
`@intentsolutions/guidewire-harness`.

### 1.1 `Plan` — what the agent intends

A `Plan` is a frozen, serializable description of a *single* intended
side effect. Plans are content-addressable: the same logical action
produces the same plan ID. Plans never carry secrets in payload —
secret references are by ID into the profile's secret store.

```ts
export type ToolMode = 'read_only' | 'draft_only' | 'approved_execute';

export interface PlanInput {
  /** Tool name (carrier-vocabulary). e.g. "reconcile-this-payment". */
  toolName: string;
  /** Semver of the tool's contract; idempotency keys version-pin. */
  toolVersion: string;
  /** Mode the tool declared in its metadata. */
  mode: ToolMode;
  /** Customer profile slug. e.g. "acme-mutual". */
  tenantId: string;
  /** Authenticated principal (user or service-account JWT subject). */
  actorId: string;
  /** Tool-specific arguments, already Zod-validated by the server. */
  args: Record<string, unknown>;
  /** Human-readable summary; surfaces in approval UIs + audit search. */
  summary: string;
  /** OpenTelemetry trace ID; binds plan to its span tree. */
  traceId: string;
}

export interface Plan extends Readonly<PlanInput> {
  /** Content hash of the plan canonical form (sha256, hex). */
  readonly planId: string;
  /** ISO-8601, set at plan creation. */
  readonly createdAt: string;
  /** Deterministic idempotency key — see § 4. */
  readonly idempotencyKey: string;
}

export function plan(input: PlanInput): Plan;
```

`plan()` is pure (no I/O). Hashing input → planId is the only side
work. Plans are passed by value; mutation throws.

### 1.2 `Policy` — the gate decision

Policy decisions are first-class records. Every plan that reaches
`execute()` must be paired with a `PolicyDecision`. Open Policy Agent
(Rego) is the inspiration for the data shape — decisions are
deterministic, reason-bearing, and replayable from inputs.

```ts
export type PolicyOutcome = 'allow' | 'deny' | 'require_approval';

export type PolicyTier =
  | 'tier_0_safe'      // read_only with no PII; no approval
  | 'tier_1_draft'     // draft artifact; no approval
  | 'tier_2_low'       // approved_execute, single approver
  | 'tier_3_high'      // approved_execute, dual control (e.g. payments)
  | 'tier_4_blocked';  // structurally refused (e.g. payments in OSS demo)

export interface PolicyDecision {
  readonly decisionId: string;       // sha256 of (planId + ruleSetVersion)
  readonly planId: string;
  readonly outcome: PolicyOutcome;
  readonly tier: PolicyTier;
  readonly reason: string;           // human-readable, audit-ready
  readonly ruleSetVersion: string;   // profile + harness rule package semver
  readonly evaluatedAt: string;
  readonly requiredApprovers?: {
    minCount: number;                // e.g. 1, 2 for dual control
    rolesAllowed: readonly string[]; // e.g. ['claims-supervisor']
  };
}

export interface PolicyEngine {
  evaluate(plan: Plan): Promise<PolicyDecision>;
}
```

Policy rules live in the customer profile (`profiles/<tenant>/policy/`)
plus a small core ruleset shipped by the harness (refuse if mode
mismatch, refuse on missing PII redaction profile, etc.). Per D-006
the harness refuses to call `execute()` without a `PolicyDecision`
whose `outcome` is `allow` or, for `approved_execute`, an `Approval`
record (§ 1.3) attached.

### 1.3 `Approval` — blocking flow

Approvals are state machines, not webhook callbacks. The state lives
in Postgres (`approvals` table) so a restart, a network partition, or
a CLI session ending mid-wait does not lose the request. Web
UI / Slack are future surfaces — the data shape ships day-1.

```ts
export type ApprovalState =
  | 'pending'
  | 'approved'
  | 'denied'
  | 'expired'
  | 'cancelled';

export interface Approval {
  readonly approvalId: string;        // sha256(planId + nonce)
  readonly planId: string;
  readonly decisionId: string;        // FK to PolicyDecision
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
  /** Persist a pending approval; idempotent on approvalId. */
  request(plan: Plan, decision: PolicyDecision): Promise<Approval>;
  /** Block until terminal state OR expiry. */
  wait(approvalId: string, opts?: { timeoutMs?: number }): Promise<Approval>;
  /** External tool/CLI driver records a decision. */
  decide(approvalId: string, vote: ApprovalVote): Promise<Approval>;
}

export interface ApprovalVote {
  actorId: string;
  role: string;
  outcome: 'approved' | 'denied';
  reason?: string;
}
```

The CLI binds `decide()` to `guidewire-harness approve <approvalId>`
(see § 3). The library mode binds the same calls in-process. Slack /
web UI are future drivers of `decide()` — the contract does not
change.

### 1.4 `Execute` — side effect with idempotency

`execute()` is the *only* function in the harness that performs an
external write. It accepts a plan + policy decision (+ approval if
required) and a *side-effect callback* the tool author wrote. The
harness wraps the callback with idempotency-key replay, audit, and
span emission. The tool author cannot bypass it — depcruise rule
enforces the edge in CI (see § 8).

```ts
export interface ExecuteContext {
  readonly plan: Plan;
  readonly decision: PolicyDecision;
  readonly approval?: Approval;
  /** Carries the harness's pre-opened span; tool propagates it. */
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
```

Idempotency contract is per § 4. If the harness sees a previously
recorded result for `idempotencyKey`, it short-circuits — the
`SideEffect` is never invoked, the previous `value` is returned, and
the span is annotated `harness.execute.replay=true`.

### 1.5 `Audit` — hash-chained entry

Audit entries are append-only, hash-chained, and small (fixed schema,
no nested blobs — large bodies are referenced by content hash into a
sibling `audit_blobs` table). The chain is per-tenant (a tampered
chain in tenant A does not invalidate tenant B). See § 2 for the
storage layout.

```ts
export type AuditEventType =
  | 'plan.created'
  | 'policy.decided'
  | 'approval.requested'
  | 'approval.decided'
  | 'execute.started'
  | 'execute.completed'
  | 'execute.failed'
  | 'execute.replayed'
  | 'rollback.hint.issued';

export interface AuditEntry {
  readonly entryId: string;          // ULID — sortable, unique
  readonly tenantId: string;
  readonly chainSeq: number;         // monotonic within (tenantId, chain)
  readonly eventType: AuditEventType;
  readonly planId: string;
  readonly traceId: string;
  readonly actorId: string;
  readonly toolName: string;
  readonly toolVersion: string;
  readonly mode: ToolMode;
  readonly idempotencyKey: string;
  readonly recordedAt: string;
  /** sha256 of the previous entry's `entryHash`; chain anchor for seq=1. */
  readonly prevHash: string;
  /** sha256 of canonical(this entry minus entryHash). */
  readonly entryHash: string;
  /** Reference to body blob if any (response, draft artifact, etc.). */
  readonly blobRef?: string;
}

export interface AuditStore {
  append(entry: Omit<AuditEntry, 'chainSeq' | 'prevHash' | 'entryHash'>): Promise<AuditEntry>;
  verifyChain(tenantId: string, fromSeq?: number): Promise<ChainVerification>;
  query(filter: AuditQuery): AsyncIterable<AuditEntry>;
}

export interface ChainVerification {
  ok: boolean;
  brokenAt?: number;     // chainSeq where prevHash mismatched
  verifiedThrough: number;
}
```

### 1.6 `Rollback` — hint, not magic

Per the rubric (rule 7) rollback is a *hint*, not an automated
revert. The harness emits a structured JSON document that tells the
human operator how to undo the side effect, given the recorded
`ExecuteResult`. The hint itself is an audit event
(`rollback.hint.issued`). The harness records that the hint was
issued — it does not execute the rollback automatically because
Guidewire writes are rarely idempotent in reverse (a reserve change
can be reversed; an issued denial letter cannot).

```ts
export interface RollbackHint {
  readonly hintId: string;
  readonly planId: string;
  readonly auditEntryId: string;
  readonly humanInstruction: string;       // 1-3 sentences
  readonly suggestedTool?: string;         // e.g. "revert-reserve-change"
  readonly suggestedArgs?: Record<string, unknown>;
  readonly cautions: readonly string[];    // "this letter has already been mailed"
  readonly issuedAt: string;
}

export function rollbackHint(
  result: ExecuteResult<unknown>,
  opts: { humanInstruction: string; cautions?: readonly string[] }
): Promise<RollbackHint>;
```

### 1.7 `Evidence` — exportable bundle

Evidence bundles are the artifact a CISO or SOC 2 auditor receives.
They are reproducible from the audit chain alone. Signing is
pre-spec'd here (see § 5) but is an addition for E3+; v1 ships
unsigned but tamper-evident via the chain.

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
  readonly spans: readonly OtelSpanSnapshot[];   // see § 7
  readonly piiRedactionApplied: boolean;
}

export interface EvidenceExporter {
  build(traceId: string, opts?: { includeSpans?: boolean }): Promise<EvidenceBundle>;
  sign?(bundle: EvidenceBundle): Promise<SignedEvidenceBundle>;  // E3+
}
```

### 1.8 Factory + result + error

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
    | 'AUDIT_UNREACHABLE'
    | 'POLICY_UNREACHABLE'
    | 'POLICY_DENIED'
    | 'APPROVAL_TIMEOUT'
    | 'APPROVAL_DENIED'
    | 'IDEMPOTENCY_MISMATCH'
    | 'CHAIN_BROKEN'
    | 'MODE_MISMATCH'
    | 'TENANT_UNKNOWN';
  readonly planId?: string;
  readonly decisionId?: string;
}
```

The `Harness` interface returned by `createHarness()` exposes the
six primitives (§ 1.1–1.7) wired against the configured stores. This
is the in-process surface MCP servers depend on.

---

## 2. Hash-chain implementation strategy

### 2.1 Linear chain, per-tenant — not Merkle

A linear hash chain is enough for tamper-evidence and is *cheaper*
to write than a Merkle tree. Merkle helps when you want fast
membership proofs over a large historical set without scanning the
chain — useful for blockchain settlement, overkill for SOC 2 audit
exports. Given the typical exam pattern ("show me the audit trail
for this trace_id"), linear traversal in Postgres with an index on
`(tenant_id, trace_id)` answers in milliseconds.

If Merkle becomes useful (e.g. shipping a public transparency log of
audit roots), it can be added as a *secondary* commitment over the
linear chain without changing the linear shape. Apache Atlas is a
useful precedent: Atlas keeps linear lineage, layers Merkle proofs
over snapshots only when external attestation is required.

Per-tenant chains (not a single global chain) keep tenant A's
tampering from invalidating tenant B's history, and let an enterprise
customer take their chain with them on offboarding.

### 2.2 Storage layout (Postgres)

```sql
-- One row per audit event.
CREATE TABLE audit_entries (
  entry_id          TEXT PRIMARY KEY,         -- ULID
  tenant_id         TEXT NOT NULL,
  chain_seq         BIGINT NOT NULL,
  event_type        TEXT NOT NULL,
  plan_id           TEXT NOT NULL,
  trace_id          TEXT NOT NULL,
  actor_id          TEXT NOT NULL,
  tool_name         TEXT NOT NULL,
  tool_version      TEXT NOT NULL,
  mode              TEXT NOT NULL,
  idempotency_key   TEXT NOT NULL,
  recorded_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  prev_hash         TEXT NOT NULL,
  entry_hash        TEXT NOT NULL,
  blob_ref          TEXT,
  UNIQUE (tenant_id, chain_seq)
);
CREATE INDEX ON audit_entries (tenant_id, trace_id);
CREATE INDEX ON audit_entries (tenant_id, plan_id);
CREATE INDEX ON audit_entries (idempotency_key);

-- Body blobs for entries that carry response/draft payloads.
CREATE TABLE audit_blobs (
  blob_ref          TEXT PRIMARY KEY,         -- sha256 of body
  tenant_id         TEXT NOT NULL,
  body_json         JSONB NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-tenant chain anchor. Last-known seq + hash for fast appends.
CREATE TABLE audit_chain_heads (
  tenant_id         TEXT PRIMARY KEY,
  last_seq          BIGINT NOT NULL,
  last_hash         TEXT NOT NULL,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotency replay cache.
CREATE TABLE idempotency_keys (
  idempotency_key   TEXT PRIMARY KEY,
  tenant_id         TEXT NOT NULL,
  plan_id           TEXT NOT NULL,
  result_json       JSONB NOT NULL,
  audit_entry_id    TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Evidence bundles (cached after first build per trace_id).
CREATE TABLE evidence_bundles (
  bundle_id         TEXT PRIMARY KEY,         -- sha256 of bundle JSON
  tenant_id         TEXT NOT NULL,
  trace_id          TEXT NOT NULL,
  bundle_json       JSONB NOT NULL,
  built_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Approvals state machine.
CREATE TABLE approvals (
  approval_id       TEXT PRIMARY KEY,
  tenant_id         TEXT NOT NULL,
  plan_id           TEXT NOT NULL,
  decision_id       TEXT NOT NULL,
  state             TEXT NOT NULL,
  requested_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at       TIMESTAMPTZ NOT NULL,
  approvers_json   JSONB NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX ON approvals (tenant_id, state);
```

### 2.3 Append protocol

`append()` runs in a serializable transaction:

1. `SELECT last_seq, last_hash FROM audit_chain_heads WHERE tenant_id = $1 FOR UPDATE`.
2. Compute `entry_hash = sha256(canonical(entry without entryHash))`.
3. `INSERT INTO audit_entries (...)` with `chain_seq = last_seq + 1`,
   `prev_hash = last_hash`, `entry_hash` from step 2.
4. `UPDATE audit_chain_heads SET last_seq = ..., last_hash = entry_hash`.
5. Commit.

Concurrent appends serialize on the chain head row — throughput is
plenty for carrier-scale audit volume (low thousands of writes/min
per tenant) and the simplicity is worth more than the lost
parallelism.

### 2.4 Tamper-evidence proof export

`harness.audit.verifyChain(tenantId)` walks the chain, recomputes
`entry_hash` for each entry, and asserts `prev_hash` matches the
prior entry's `entry_hash`. Result is a `ChainVerification` (§ 1.5).
Single-command form via the CLI:

```
guidewire-harness chain verify --tenant acme-mutual
  ✓ verified 12,431 entries
  chain head: ulid=01HX… seq=12431 hash=8e1f…
```

Chain breaks are the loudest possible failure: harness refuses
*all subsequent writes* for the affected tenant until the operator
acknowledges the break in a signed maintenance entry (recorded as
`event_type = 'chain.repair.acknowledged'` with the actor and
reason). Per D-008 spirit (no silent fallback) silent repair is a
non-starter.

---

## 3. Approval flow mechanics

### 3.1 CLI mode (operator-driven)

Operators approve via the CLI binary published with the harness
package:

```
$ guidewire-harness pending --tenant acme-mutual
APPR-01HX1Q…  reconcile-this-payment   tier_2_low   adjuster:kim   28m ago
APPR-01HX1Q…  draft-denial-letter      tier_1_draft adjuster:joe   3m ago

$ guidewire-harness approve APPR-01HX1Q… --reason "verified BillingCenter posting"
✓ approval recorded; harness will resume execution
```

`approve` resolves the role from the approver's authenticated CLI
identity (OAuth, same `auth/` package as MCP servers) and validates
against `decision.requiredApprovers`. Dual-control flows refuse the
second approval if the same `actorId` is recorded for both.

### 3.2 Library mode (in-process MCP server)

An MCP server typically runs in a process that *does not* have a
human at the keyboard. The library mode is the in-process surface
that hands the approval off to *whoever the host configures*. The
factory pattern:

```ts
const harness = createHarness({
  audit: postgresAuditStore(cfg.db),
  policy: regoPolicyEngine(cfg.profile),
  approvals: postgresApprovalSink(cfg.db),  // pending state in DB
  evidence: postgresEvidenceExporter(cfg.db),
  observability: getObservability(),
  profile: { tenantId: cfg.tenantId, ruleSetVersion: cfg.ruleSetVersion },
});

const plan = harness.plan({...});
const decision = await harness.policy.evaluate(plan);
const approval = decision.outcome === 'require_approval'
  ? await harness.approvals.request(plan, decision)
      .then(a => harness.approvals.wait(a.approvalId, { timeoutMs: ms('1h') }))
  : undefined;
const result = await harness.execute(plan, decision, sideEffect, { approval });
```

`approvals.wait()` returns when the approval reaches a terminal state
*or* the timeout fires. The MCP server propagates the result back to
the agent host as a structured response (`outcome: awaiting-approval`
when timeout fires, `outcome: denied` when denied, `outcome: ok` when
executed). Agents are not hung waiting — the host can proceed with
other work, and the user reaches the approval state via the CLI / UI.

### 3.3 Slack / web UI / future surfaces

Slack and a web approval UI sit on top of `approvals.decide()` — they
are *drivers* of the same state machine. Spec'd out of scope for E3
(out of scope for OSS demo path); the data shape is fixed so they
slot in without breaking existing approvals.

### 3.4 Escape hatch — approver unreachable

Three failure modes, each with a defined state:

1. **Timeout (`approval.expiresAt` passed)** — state transitions to
   `expired`. Audit `approval.decided` entry written with `outcome:
   expired`. The plan is *not* executable; the agent must re-plan.
2. **Approver decline** — state `denied`. Audit recorded with the
   denial reason. Plan dies; the agent must re-plan or escalate.
3. **`harness.approvals.wait` timeout (caller-side)** — the *call*
   times out but the approval row remains pending. The MCP server
   returns `awaiting-approval` to the agent. The approval resolves
   later via CLI / Slack / UI. When it does, the next agent attempt
   sees the resolved state and either replays (if approved within
   the idempotency window) or refuses (if expired).

There is no auto-approval bypass. Per D-006 a missing approval is
indistinguishable from a missing audit — refuse the write. If a
customer profile flips a tool to a lower tier, that's a *profile
change* logged with its own audit, not a runtime escape.

---

## 4. Idempotency-key strategy

### 4.1 Generation

Idempotency keys are deterministic over the *intent* of the plan,
not the wall-clock time. This is what enables retry safety.

```
idempotencyKey = sha256(
  toolName + ':' +
  toolVersion + ':' +
  tenantId + ':' +
  canonicalize(args) + ':' +
  actorId
)
```

`canonicalize()` is JCS-style canonical JSON (RFC 8785) so map order
doesn't matter. Including `actorId` prevents two operators racing the
same intent from accidentally sharing a result; including
`toolVersion` prevents a contract-changing release from replaying
across the boundary. The key is prefix-tagged with the harness major
version (e.g. `gwh1:`) so a future replay-store schema change is
distinguishable.

### 4.2 Storage + replay short-circuit

`execute()`'s first action (after audit `execute.started` event) is
`SELECT result_json, audit_entry_id FROM idempotency_keys WHERE
idempotency_key = $1`. If the row exists, the harness:

1. Writes a `execute.replayed` audit entry referencing the original
   `audit_entry_id`.
2. Annotates the span `harness.execute.replay = true`.
3. Returns `ExecuteResult { outcome: 'replayed', value: stored.result, ... }`.
4. Does *not* call the `SideEffect`.

If the row does *not* exist, the harness invokes the side effect,
captures the result, INSERTs the row, writes the `execute.completed`
audit entry, returns `outcome: 'executed'`.

### 4.3 Collision handling

A genuine sha256 collision is statistically impossible at carrier
scale. A *near-collision* (two intents hashing to the same key
because the canonicalization missed a discriminator) is the failure
mode to design against. Defenses:

- The key includes everything the tool author considers part of the
  intent. Tools that take "natural language" arguments hash the
  resolved structured form, not the prose.
- The harness verifies the stored `plan_id` in
  `idempotency_keys.audit_entry_id → audit_entries.plan_id` matches
  the incoming `plan.planId`. Mismatch → `HarnessError({ code:
  'IDEMPOTENCY_MISMATCH' })`. This catches the case where the same
  key landed against a *different* plan, which means the
  canonicalization is wrong and the harness must refuse the write.

### 4.4 TTL

Keys are pruned after the customer-profile-configured retention
window (default 30 days). After pruning, the same intent is treated
as new — which is correct, because at that point a retry is
effectively a fresh authorization. Pruning is a maintenance audit
event (`'idempotency.pruned'`).

---

## 5. Evidence bundle schema

### 5.1 Top-level shape

```json
{
  "bundleVersion": "1.0",
  "traceId": "1bc2…",
  "tenantId": "acme-mutual",
  "generatedAt": "2026-05-04T18:22:11Z",
  "plan": { "planId": "…", "toolName": "reconcile-this-payment", "…": "…" },
  "decision": { "decisionId": "…", "outcome": "require_approval", "tier": "tier_2_low", "…": "…" },
  "approval": { "approvalId": "…", "state": "approved", "approvers": [ { "actorId": "kim@acme", "decidedAt": "…" } ] },
  "execution": { "outcome": "executed", "idempotencyKey": "gwh1:…", "auditEntryId": "01HX…", "evidenceBundleRef": "self" },
  "auditEntries": [ "…ordered by chainSeq…" ],
  "chainVerification": { "ok": true, "verifiedThrough": 12431 },
  "spans": [ "…OTel snapshot per § 7…" ],
  "piiRedactionApplied": true
}
```

### 5.2 What's included

- The full `Plan`, `PolicyDecision`, `Approval`, `ExecuteResult` for
  the trace.
- All `AuditEntry` rows with `trace_id = $1`, ordered by `chainSeq`.
- A fresh `ChainVerification` over the bracket of seqs covered.
- Span snapshots for the trace (subject to `includeSpans` opt).
- A flag indicating whether the profile's PII redactor ran on
  bundle export.

### 5.3 What's excluded

- Raw HTTP bodies that contain unredacted PII unless the profile's
  `pii-policy.yaml` permits and the requestor is authorized.
- Secrets — every secret reference in plan args / response bodies is
  replaced with its profile-store ID, never the value.
- Other tenants' chain entries.

### 5.4 PII redaction at export

PII redaction is *not* a runtime concern of `execute()` — that would
slow the hot path. It runs at bundle export, applying the profile's
`pii-policy.yaml` to the assembled bundle. The bundle records
`piiRedactionApplied: true` so a downstream consumer knows the
applied redaction matches the profile's current policy. If the
auditor wants the unredacted form, that's a separate authorized
export path (`--include-pii` + audit log + dual-control on the
export call itself).

### 5.5 Signing (E3+ pre-spec)

Bundles are content-addressable (`bundle_id = sha256(bundle_json)`).
Signing layers a detached signature over `bundle_id` using a
profile-bound signing key (Ed25519 by default, KMS-resident in
production). The signed form is:

```json
{
  "bundle": { "...": "...as above..." },
  "signature": {
    "alg": "Ed25519",
    "kid": "acme-mutual:audit-signer-2026Q2",
    "bundleId": "…",
    "sig": "base64(sig)"
  }
}
```

E3 ships unsigned bundles + the signing surface as `evidence.sign?` —
the contract is forward-compatible. Dapr's workflow attestation
pattern is the model — payload hash + KMS signature, not the whole
payload signed, so bundles can be re-derived if needed without
invalidating the signature.

---

## 6. Failure semantics

Each failure has a defined state, an audit entry (or refusal), and
a return shape.

| Failure | Harness behavior | Audit | Returned |
|---|---|---|---|
| Plan generation invalid (Zod fails) | `plan()` throws synchronously before any I/O | none | `HarnessError` to caller |
| Policy engine unreachable | `policy.evaluate()` rejects with `POLICY_UNREACHABLE`. Harness refuses to call execute. | none (no decision = no entry) | `HarnessError` |
| Policy denies | Returns `outcome: 'deny'`. `execute()` will refuse with `POLICY_DENIED`. | `policy.decided` entry recorded | denied decision |
| Approval timeout | `approvals.wait` returns `state: 'expired'`. | `approval.decided` with outcome=expired | expired approval |
| Approver denies | `approvals.wait` returns `state: 'denied'`. | `approval.decided` with outcome=denied | denied approval |
| Execute fails post-approval | `execute()` writes `execute.failed` audit entry with error stringification, then re-throws. Idempotency key NOT written (failure isn't a final state). | `execute.failed` entry | thrown error |
| Audit storage unreachable | `execute()` rejects with `AUDIT_UNREACHABLE` *before* invoking the side effect. **Per D-006: no audit, no write.** | none possible | `HarnessError` |
| Observability unreachable | Harness logs degraded warning; audit + execute continue. Span emission is best-effort; pino logs accumulate locally. | normal entries | normal result |
| Idempotency replay | Harness short-circuits: writes `execute.replayed` entry, returns prior result, does not call side effect. | `execute.replayed` | `outcome: 'replayed'` |
| Idempotency mismatch (same key, different plan) | Harness rejects with `IDEMPOTENCY_MISMATCH`. Indicates canonicalization bug. | `execute.failed` with reason | `HarnessError` |
| Chain broken | Harness refuses *all writes for the tenant* until `chain.repair.acknowledged` recorded. | refusal entry | `HarnessError({ code: 'CHAIN_BROKEN' })` |
| Tool declares mode that profile forbids | `policy.evaluate()` returns `tier_4_blocked`. Harness refuses execute. | `policy.decided` with deny | denied decision |

The asymmetry between *audit unreachable* and *observability
unreachable* is deliberate: audit is correctness-critical,
observability is diagnostic. Per D-013 the harness emits a degraded
warning when telemetry can't be shipped, but does not refuse writes
on that basis — that would convert a Sentry outage into a customer
outage. Per D-006 the inverse holds for audit.

---

## 7. Observability fan-out

### 7.1 Span tree (per MCP tool call)

```
mcp.tool.invoke                          (root, opened by server)
└── harness.plan.create
└── harness.policy.evaluate               attrs: outcome, tier, ruleSetVersion
└── harness.approval.wait                 (only if require_approval) attrs: state, durationMs
└── client.guidewire.cloud.<endpoint>     attrs: tenant_id, lob, http.status, http.method
└── harness.audit.write                   attrs: chainSeq, eventType
└── harness.evidence.bundle               (lazy — on bundle build, not per-call)
```

Every span carries the required attributes per D-013:
`trace_id`, `tenant_id`, `tool_name`, `tool_version`, `mode`,
`actor_id`. Architecture rules in CI (depcruise + AST checks) fail
any function in `packages/harness/src/**` that does not open a span.

### 7.2 Pino log shape per step

```json
{
  "level": "info",
  "time": "2026-05-04T18:22:11.412Z",
  "trace_id": "1bc2…",
  "tenant_id": "acme-mutual",
  "tool_name": "reconcile-this-payment",
  "tool_version": "1.4.0",
  "mode": "approved_execute",
  "actor_id": "kim@acme",
  "step": "harness.policy.evaluate",
  "outcome": "require_approval",
  "tier": "tier_2_low",
  "rule_set_version": "1.7.0",
  "msg": "policy decision recorded"
}
```

Logs and audit entries are *not* the same thing — logs are diagnostic
(can be lossy, sampled, retention-bounded), audit entries are
correctness (lossless, hash-chained, retention-bound by policy).
Logs reference `audit_entry_id` when relevant, so an operator
debugging a problem can pivot from log → audit chain.

### 7.3 Sentry tagging

A single typed `AppError` class in `@intentsolutions/guidewire-observability`
auto-tags Sentry issues with `tenant_id`, `tool_name`, `mode`,
`harness_step`. Sentry issues fire `bd-sync` to auto-create beads
per D-013 — the harness participates by wrapping its own `HarnessError`
class to extend `AppError` so codes like `AUDIT_UNREACHABLE` become
deterministic Sentry issue groups.

---

## 8. Three-mode enforcement at the harness layer

The architectural rule that breaks the frame: **tools declare a mode;
the harness enforces it.** Tools cannot bypass the harness for writes.

### 8.1 Mechanism

1. Each tool's metadata (in the MCP server's tool definition, exposed
   via the SDK) includes a `mode: ToolMode` field.
2. The MCP server passes the tool's `mode` into `harness.plan()`.
3. `harness.policy.evaluate()` reads `plan.mode` and the profile's
   per-tool mode override. If they disagree, the policy emits
   `outcome: deny, reason: 'mode mismatch'`.
4. `harness.execute()` refuses to run a side effect unless `mode ===
   'approved_execute'` AND a valid `Approval` is attached, OR `mode
   === 'draft_only'` AND the side effect is harness-tagged
   non-destructive (drafts write only to the harness's draft store,
   never to Guidewire), OR `mode === 'read_only'` AND the side effect
   makes no Guidewire write.

### 8.2 CI enforcement (architecture rule)

A depcruise rule in CI:

> No file in `servers/**/src/**` may import any module from
> `clients/**` or `packages/guidewire-client/**` except via
> `packages/harness/`.

This makes "tool author bypasses harness for writes" a build failure.
Combined with an AST rule that any call into `packages/guidewire-client`'s
write-shaped methods (HTTP `POST`/`PUT`/`PATCH`/`DELETE`) must be
inside an `execute()` callback (verified by call-site analysis), the
harness becomes the only path to writes.

### 8.3 Why at the harness, not at the tool

If the tool gates itself, every tool author re-implements the same
gate (badly). If the harness gates, a single change to the contract
(e.g. add dual-control for tier 3) lands in one place and every
tool inherits. This is also the rule that protects the OSS surface:
when a forked carrier-vocabulary tool ships, it can't accidentally
remove the gate, because the gate isn't theirs to remove.

---

## 9. Library vs CLI parity

Same semantics, two skins. The library is the substrate; the CLI is
a narrow shell over the same calls.

| Surface | Library | CLI |
|---|---|---|
| Plan creation | `harness.plan(input)` | implicit in `guidewire-harness invoke <tool>` |
| Policy evaluate | `harness.policy.evaluate(plan)` | `guidewire-harness policy evaluate --plan <id>` |
| Request approval | `harness.approvals.request(plan, decision)` | implicit during CLI invoke |
| Wait for approval | `harness.approvals.wait(approvalId)` | not blocking (CLI exits, returns approvalId) |
| Decide approval | `harness.approvals.decide(approvalId, vote)` | `guidewire-harness approve <approvalId>` |
| Execute | `harness.execute(plan, decision, fn)` | `guidewire-harness execute --plan <id>` (re-runs side effect via stored callback) |
| Verify chain | `harness.audit.verifyChain(tenantId)` | `guidewire-harness chain verify --tenant <slug>` |
| Build evidence | `harness.evidence.build(traceId)` | `guidewire-harness evidence export --trace <id>` |

### 9.1 When does a contributor use which?

- **MCP server author** uses the *library* exclusively. The MCP
  server is the host for tool execution; the harness is in-process.
- **Operator / approver** uses the *CLI* — they don't run an MCP
  server, they make decisions about pending approvals.
- **Auditor / SOC 2 reviewer** uses the *CLI* (`evidence export`,
  `chain verify`).
- **Cowork forker** prototyping a new tool uses the *library* to
  scaffold the MCP server, the CLI to drive interactive testing
  ("here's a pending plan, approve it from another terminal").

The CLI is intentionally thin: every CLI command is implementable
in ≤30 lines on top of the library. This keeps parity cheap.

---

## 10. Risks and open questions deferred to E3+

1. **Hot-path latency under concurrent appends.** The single chain
   head per tenant serializes writes. For very high tenants
   (claims-heavy carriers approaching 1000+ writes/min) this may
   need either chain-head sharding (per-`(tenant, sub-chain)`) or a
   batched commit strategy. Pre-spec only — measure first.
2. **Bundle signing key rotation.** The kid+key rotation cadence,
   key hierarchy, and KMS integration are E3+ concerns. The bundle
   shape supports rotation now; the operational story doesn't.
3. **Cross-region audit replication.** A tenant deployed in two
   regions for HA needs the chain to converge. Likely strategy:
   leader-elected primary with logical replication; document for E3+.
4. **Evidence bundle export over MCP.** Should there be a tool —
   `export-evidence-for-this-trace` — exposed via an MCP server, or
   is CLI-only correct? Persona 5 (CISO) probably wants both. Defer
   the tool to E10 once auth + role-binding are mature.
5. **Approval delegation.** Out of office → who approves? Not
   spec'd here; profile-level concern. Likely a future
   `approval-delegation.yaml` per profile.
6. **Live `approved_execute` against real Guidewire.** Per the v4
   architecture, this stays out of OSS demo until a real customer
   opts in with sandbox creds — but the harness ships the code path
   in E3 so the customer can flip it on with config.

---

## 11. What this memo commits to

When E3 opens, `packages/harness/src/index.ts` contains the
TypeScript signatures from § 1 verbatim. The Postgres DDL in § 2
becomes the migration in `packages/harness/migrations/0001_init.sql`.
The CLI commands in § 9 become `packages/harness/src/cli/*.ts`. The
failure table in § 6 becomes the test matrix in
`packages/harness/test/failure-modes.test.ts`.

This is not a proposal. This is the contract — any deviation from
the shapes here in E3 needs to land in a follow-up
`010-DR-MEMO-harness-runtime-rev.md` (numbered next available
sequence) with a `replaces:` link the way decision log entries do.
The agent rubric (rule 6: evidence bundle is reproducible from the
audit chain; rule 11: three-mode enforcement at the harness) is
satisfied by this contract — the GW-1.8 staffed-audit memo for the
harness will verify against this document.

---

## References

- D-003 (harness as library + CLI, not MCP server) — `004-DR-DEC` § D-003
- D-005 (three execution modes) — `004-DR-DEC` § D-005
- D-006 (no audit = no write) — `004-DR-DEC` § D-006
- D-008 (NO MOCKS) — `004-DR-DEC` § D-008
- D-013 (observability from day 1) — `004-DR-DEC` § D-013
- Persona 5 (CISO) — `002-DR-CRIT` § Persona 5
- Persona 8 (Kim) — `002-DR-CRIT` § Persona 8
- Persona 3 (Claims VP) — `002-DR-CRIT` § Persona 3
- Three-mode flows — `003-DR-ARCH` § Three execution modes per tool
- Hard rule #5 (harness governs writes) — `CLAUDE.md`
- Open Policy Agent (Rego decision shape inspiration) — `openpolicyagent.org`
- Apache Atlas (linear lineage with optional Merkle attestation) — `atlas.apache.org`
- Dapr workflow (plan / state / signed attestation pattern) — `dapr.io/docs/concepts/dapr-services/workflow/`
- RFC 8785 JCS canonical JSON (idempotency key canonicalization) — `datatracker.ietf.org/doc/rfc8785/`
