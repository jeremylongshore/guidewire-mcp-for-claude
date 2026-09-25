/**
 * @intentsolutions/guidewire-harness
 *
 * Plan → policy → approval → execute → audit pipeline. NOT an MCP server
 * (D-003 — harness is library + CLI). The `guidewire-harness` binary
 * exposes plan-export, audit-verify, and evidence-export subcommands.
 *
 * Per 02-PRD § 5.1-5.9 + 05-TECHNICAL-SPEC § 3.0-3.8.
 *
 * Three-mode contract (D-005):
 *   read_only        → no harness required (but allowed for uniformity)
 *   draft_only       → policy gate, no approval required
 *   approved_execute → policy gate + approval + execute + audit chain
 *
 * Key design rule: `execute()` is the ONLY function that performs external
 * writes. Depcruise CI rule: no file in servers/star-star/src/star-star may import
 * clients/star-star directly. Every write goes through the harness.
 */

// ─── Re-exports from @intentsolutions/guidewire-schemas ──────────────────────
// Tools and tests import everything they need from this single entry point.
export type {
  Approval,
  // Approval
  ApprovalState,
  ApprovalVote,
  AuditEntry,
  // Audit
  AuditEventType,
  AuditQuery,
  ChainVerification,
  // Evidence
  EvidenceBundle,
  // Execute
  ExecuteOutcome,
  ExecuteResult,
  // Error codes
  HarnessErrorCode,
  OtelSpanSnapshot,
  Plan,
  PlanInput,
  PolicyDecision,
  // Policy
  PolicyOutcome,
  PolicyTier,
  // Rollback
  RollbackHint,
  // Plan
  ToolMode,
} from '@intentsolutions/guidewire-schemas';
// Schema validators — exported so callers can round-trip their own data.
export {
  ApprovalSchema,
  ApprovalStateSchema,
  ApprovalVoteSchema,
  AuditEntrySchema,
  AuditEventTypeSchema,
  AuditQuerySchema,
  ChainVerificationSchema,
  EvidenceBundleSchema,
  ExecuteOutcomeSchema,
  ExecuteResultSchema,
  HarnessErrorCodeSchema,
  PlanInputSchema,
  PlanSchema,
  PolicyDecisionSchema,
  PolicyOutcomeSchema,
  PolicyTierSchema,
  RollbackHintSchema,
  ToolModeSchema,
} from '@intentsolutions/guidewire-schemas';
export { createInMemoryApprovalSink } from './approvals/in-memory.js';
export type { PgApprovalSinkOpts } from './approvals/pg.js';
// ─── Production sinks (Postgres-backed) ──────────────────────────────────────
export { createPgApprovalSink } from './approvals/pg.js';
export type { HarnessErrorOpts } from './error.js';
// ─── Typed error ─────────────────────────────────────────────────────────────
export { HarnessError, makeHarnessError } from './error.js';
export { tryAsHarnessError } from './error-translation.js';
export { createEvidenceExporter } from './evidence/exporter.js';
// ─── Factory + config ────────────────────────────────────────────────────────
export { createHarness } from './harness.js';
export type { AllowRule } from './policy/in-memory.js';
// ─── In-memory stubs (dev + tests) ───────────────────────────────────────────
export { createInMemoryPolicyEngine } from './policy/in-memory.js';
// ─── Pipeline interfaces ──────────────────────────────────────────────────────
export type {
  ApprovalSink,
  EvidenceExporter,
  ExecuteContext,
  Harness,
  HarnessConfig,
  PolicyEngine,
  SideEffect,
  SignedEvidenceBundle,
} from './types.js';
