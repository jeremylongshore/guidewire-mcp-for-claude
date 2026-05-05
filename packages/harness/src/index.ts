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

// ─── Factory + config ────────────────────────────────────────────────────────
export { createHarness } from './harness.js';
export type { Harness, HarnessConfig } from './types.js';

// ─── Typed error ─────────────────────────────────────────────────────────────
export { HarnessError, makeHarnessError } from './error.js';
export type { HarnessErrorOpts } from './error.js';

// ─── Pipeline interfaces ──────────────────────────────────────────────────────
export type {
  PolicyEngine,
  ApprovalSink,
  EvidenceExporter,
  SignedEvidenceBundle,
  ExecuteContext,
  SideEffect,
} from './types.js';

// ─── In-memory stubs (dev + tests) ───────────────────────────────────────────
export { createInMemoryPolicyEngine } from './policy/in-memory.js';
export type { AllowRule } from './policy/in-memory.js';

export { createInMemoryApprovalSink } from './approvals/in-memory.js';

export { createEvidenceExporter } from './evidence/exporter.js';

// ─── Re-exports from @intentsolutions/guidewire-schemas ──────────────────────
// Tools and tests import everything they need from this single entry point.
export type {
  // Plan
  ToolMode,
  PlanInput,
  Plan,
  // Policy
  PolicyOutcome,
  PolicyTier,
  PolicyDecision,
  // Approval
  ApprovalState,
  ApprovalVote,
  Approval,
  // Execute
  ExecuteOutcome,
  ExecuteResult,
  // Audit
  AuditEventType,
  AuditEntry,
  AuditQuery,
  ChainVerification,
  // Rollback
  RollbackHint,
  // Evidence
  EvidenceBundle,
  OtelSpanSnapshot,
  // Error codes
  HarnessErrorCode,
} from '@intentsolutions/guidewire-schemas';

// Schema validators — exported so callers can round-trip their own data.
export {
  ToolModeSchema,
  PlanInputSchema,
  PlanSchema,
  PolicyOutcomeSchema,
  PolicyTierSchema,
  PolicyDecisionSchema,
  ApprovalStateSchema,
  ApprovalVoteSchema,
  ApprovalSchema,
  ExecuteOutcomeSchema,
  ExecuteResultSchema,
  AuditEventTypeSchema,
  AuditEntrySchema,
  AuditQuerySchema,
  ChainVerificationSchema,
  RollbackHintSchema,
  EvidenceBundleSchema,
  HarnessErrorCodeSchema,
} from '@intentsolutions/guidewire-schemas';
