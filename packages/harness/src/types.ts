import type { Span } from '@opentelemetry/api';
import type { ObservabilityHandle } from '@intentsolutions/guidewire-observability';
import type { AuditStore } from '@intentsolutions/guidewire-audit';
import type {
  Approval,
  ApprovalVote,
  EvidenceBundle,
  Plan,
  PlanInput,
  PolicyDecision,
  ExecuteResult,
  RollbackHint,
} from '@intentsolutions/guidewire-schemas';

// Re-export for convenience — callers import from the single harness entry point.
export type {
  Approval,
  ApprovalVote,
  EvidenceBundle,
  Plan,
  PlanInput,
  PolicyDecision,
  ExecuteResult,
  RollbackHint,
};

// ─── Policy engine ──────────────────────────────────────────────────────────

/**
 * Pluggable policy evaluator. Rules live in `profiles/<tenant>/policy/` plus
 * a core ruleset shipped by the harness (02-PRD § 5.2). The harness refuses
 * to call `execute()` without a `PolicyDecision` whose `outcome` is `allow`
 * (or `require_approval` paired with an attached `Approval`) per D-006.
 */
export interface PolicyEngine {
  evaluate(plan: Plan): Promise<PolicyDecision>;
}

// ─── Approval sink ───────────────────────────────────────────────────────────

/**
 * Pluggable approval workflow. Production: Postgres-backed with a human-facing
 * UI. Dev/test: `InMemoryApprovalSink` auto-approves after 0 ms.
 *
 * No auto-approval bypass in the harness itself — a missing approval is
 * indistinguishable from a missing audit (D-006).
 */
export interface ApprovalSink {
  request(plan: Plan, decision: PolicyDecision): Promise<Approval>;
  wait(approvalId: string, opts?: { timeoutMs?: number }): Promise<Approval>;
  decide(approvalId: string, vote: ApprovalVote): Promise<Approval>;
}

// ─── Evidence exporter ───────────────────────────────────────────────────────

/**
 * Builds the SOC 2 / CISO evidence bundle from the audit chain (02-PRD § 5.7
 * + 05-TECHNICAL-SPEC § 3.7). PII redaction applies at export time, not on
 * the `execute()` hot path. `sign?` is forward-compat surface for E3+ KMS-
 * resident Ed25519 signing.
 */
export interface EvidenceExporter {
  build(traceId: string, opts?: { includeSpans?: boolean }): Promise<EvidenceBundle>;
  sign?: (bundle: EvidenceBundle) => Promise<SignedEvidenceBundle>;
}

/** Forward-compat type — signing body is E3+. */
export interface SignedEvidenceBundle {
  readonly bundle: EvidenceBundle;
  readonly signature: string;    // base64url Ed25519 over bundle JSON
  readonly publicKey: string;    // base64url DER-encoded public key
  readonly algorithm: 'Ed25519';
}

// ─── Execute context ─────────────────────────────────────────────────────────

/**
 * Context injected into every `SideEffect` callback. `span` is the active
 * OTel span so the callback can add tool-specific attributes without
 * opening a new root span.
 */
export interface ExecuteContext {
  readonly plan: Plan;
  readonly decision: PolicyDecision;
  readonly approval?: Approval;
  readonly span: Span;
}

/** The callable the tool author provides to `Harness.execute()`. */
export type SideEffect<T> = (ctx: ExecuteContext) => Promise<T>;

// ─── Harness interface ────────────────────────────────────────────────────────

/**
 * The Harness handle returned by `createHarness()`. Tools call these in
 * sequence: plan → policy → (approve?) → execute → evidence.
 *
 * The full pipeline per 02-PRD § 5.8 + 05-TECHNICAL-SPEC § 3.8:
 *   plan()    → assigns planId, idempotencyKey, wire.dbTransactionId
 *   policy()  → evaluates rules; throws POLICY_DENIED on deny
 *   approve() → optional; required when decision.outcome === 'require_approval'
 *   execute() → guarded side effect with idempotency + audit
 *   evidence()→ replay audit chain → EvidenceBundle
 *   rollback()→ issue a RollbackHint; NOT an automated revert
 */
export interface Harness {
  plan(input: PlanInput): Plan;
  policy(plan: Plan): Promise<PolicyDecision>;
  approve(plan: Plan, decision: PolicyDecision): Promise<Approval>;
  execute<T>(plan: Plan, decision: PolicyDecision, effect: SideEffect<T>, opts?: { approval?: Approval }): Promise<ExecuteResult<T>>;
  evidence(traceId: string, opts?: { includeSpans?: boolean }): Promise<EvidenceBundle>;
  rollback(result: ExecuteResult<unknown>, opts: { humanInstruction: string; cautions?: readonly string[] }): Promise<RollbackHint>;
}

// ─── HarnessConfig ───────────────────────────────────────────────────────────

/**
 * Wiring passed to `createHarness()`. Every field is required — there is no
 * default audit store, policy engine, or approval sink at the factory level.
 * Use the in-memory stubs exported from this package for tests and local dev.
 */
export interface HarnessConfig {
  readonly audit: AuditStore;
  readonly policy: PolicyEngine;
  readonly approvals: ApprovalSink;
  readonly evidence: EvidenceExporter;
  readonly observability: ObservabilityHandle;
  readonly profile: {
    readonly tenantId: string;
    readonly ruleSetVersion: string;
  };
}
