import type { AuditStore } from '@intentsolutions/guidewire-audit';
import type {
  AuditEntry,
  AuditQuery,
  EvidenceBundle,
  OtelSpanSnapshot,
} from '@intentsolutions/guidewire-schemas';
import type { EvidenceExporter } from '../types.js';

/**
 * Builds the `EvidenceBundle` by replaying the audit chain for a given
 * `traceId` from the configured `AuditStore`.
 *
 * Per 02-PRD § 5.7 + 05-TECHNICAL-SPEC § 3.7:
 *   - PII redaction runs at export time, not on the execute() hot path.
 *   - `sign?` is forward-compat surface (E3+ KMS-resident Ed25519).
 *   - Span snapshots are currently a stub — full OTel span collector is
 *     an E3+ follow-up (harness collects spans via the tracer + exporter;
 *     the in-memory exporter here returns an empty spans array).
 *   - `piiRedactionApplied` is false in this skeleton; the real flag flips
 *     when the `pii-policy.yaml` runner applies field redaction.
 *
 * The exporter does NOT hold the Plan, PolicyDecision, Approval, or
 * ExecuteResult in its own state — everything is reconstituted from the
 * audit chain entries. This makes the bundle "reproducible from the audit
 * chain alone" per 009 § 5.
 */
export function createEvidenceExporter(opts: {
  readonly audit: AuditStore;
  readonly tenantId: string;
}): EvidenceExporter {
  const { audit, tenantId } = opts;

  const build = async (
    traceId: string,
    buildOpts?: { includeSpans?: boolean },
  ): Promise<EvidenceBundle> => {
    const generatedAt = new Date().toISOString();

    // Collect all audit entries for this traceId by streaming the query.
    const entries: AuditEntry[] = [];
    const filter: AuditQuery = { tenantId, ...(traceId !== '' && {}) };
    for await (const entry of audit.query(filter)) {
      if (entry.traceId === traceId) {
        entries.push(entry);
      }
    }

    // Sort by chainSeq ascending — the chain is linear per tenant, so entries
    // for this trace may be interleaved with other traces.
    entries.sort((a, b) => a.chainSeq - b.chainSeq);

    // Verify the chain over the observed seqs. If entries span non-contiguous
    // seqs (because other traces interleave), we still verify; any broken link
    // covers the whole tenant chain.
    const chainVerification = await audit.verifyChain(tenantId);

    // Pull salient fields from the first entry (plan.created) to reconstruct
    // the Plan shape. The harness wrote the planId into every entry; the full
    // Plan is not stored verbatim in the audit chain by the skeleton (a
    // follow-up bead will write the plan JSON into blobRef / a blob store and
    // reference it via AuditEntry.blobRef). Until then, the exporter
    // reconstructs from the available fields and marks plan fields as opaque.
    //
    // NOTE: Full Plan reconstruction requires a blob store binding. The
    // skeleton returns a structural placeholder that satisfies the
    // EvidenceBundle shape and passes Zod validation in tests. The real
    // implementation hydrates from blobRef.
    const planEntry = entries.find((e) => e.eventType === 'plan.created');
    const executeEntry = entries.find((e) => e.eventType === 'execute.completed');
    const policyEntry = entries.find((e) => e.eventType === 'policy.decided');
    const approvalEntry = entries.find((e) => e.eventType === 'approval.decided');

    if (planEntry === undefined) {
      // Return a minimal valid bundle for empty chains (e.g. CLI audit-verify
      // on a fresh store).
      return {
        bundleVersion: '1.0',
        traceId,
        tenantId,
        generatedAt,
        plan: buildPlaceholderPlan(traceId, tenantId),
        decision: buildPlaceholderDecision(),
        auditEntries: entries,
        chainVerification,
        spans: [],
        piiRedactionApplied: false,
      };
    }

    const spans: OtelSpanSnapshot[] = buildOpts?.includeSpans === true
      ? collectSpanSnapshots(traceId)
      : [];

    return {
      bundleVersion: '1.0',
      traceId,
      tenantId,
      generatedAt,
      plan: buildPlanFromEntry(planEntry),
      decision: buildDecisionFromEntry(policyEntry),
      ...(approvalEntry !== undefined && { approval: buildApprovalPlaceholder(planEntry, approvalEntry) }),
      ...(executeEntry !== undefined && { execution: buildExecutionFromEntry(executeEntry) }),
      auditEntries: entries,
      chainVerification,
      spans,
      piiRedactionApplied: false,
    };
  };

  // sign? is E3+ — forward-compat surface, not implemented here.
  return { build };
}

// ─── Reconstruction helpers ──────────────────────────────────────────────────
// Until blobRef-backed full serialization lands, the exporter reconstructs
// Plan / PolicyDecision / Approval from the fields that ARE present in each
// AuditEntry (toolName, toolVersion, mode, idempotencyKey, planId, actorId,
// tenantId). Any field that cannot be reconstructed is marked with a sentinel
// comment in the type — this is intentional and documented in the skeleton
// contract.

import type { Plan, PolicyDecision, Approval, ExecuteResult } from '@intentsolutions/guidewire-schemas';

function buildPlanFromEntry(entry: AuditEntry): Plan {
  return {
    toolName: entry.toolName,
    toolVersion: entry.toolVersion,
    mode: entry.mode,
    tenantId: entry.tenantId,
    actorId: entry.actorId,
    args: {},                              // opaque until blobRef
    summary: `reconstructed from audit chain seq=${entry.chainSeq}`,
    traceId: entry.traceId,
    planId: entry.planId,
    createdAt: entry.recordedAt,
    idempotencyKey: entry.idempotencyKey,
    wire: {
      dbTransactionId: entry.idempotencyKey.replace(/^gwh1:/, ''),
    },
  };
}

function buildPlaceholderPlan(traceId: string, tenantId: string): Plan {
  const zero = '0'.repeat(64);
  return {
    toolName: 'unknown',
    toolVersion: '0.0.0',
    mode: 'read_only',
    tenantId,
    actorId: 'unknown',
    args: {},
    summary: `empty chain for traceId=${traceId}`,
    traceId,
    planId: zero,
    createdAt: new Date().toISOString(),
    idempotencyKey: `gwh1:${zero}`,
    wire: { dbTransactionId: zero },
  };
}

function buildDecisionFromEntry(entry: AuditEntry | undefined): PolicyDecision {
  if (entry === undefined) {
    return buildPlaceholderDecision();
  }
  return {
    decisionId: entry.planId,              // decisionId stored in planId column
    planId: entry.planId,
    outcome: 'allow',                      // skeleton: outcome not persisted to column
    tier: 'tier_0_safe',
    reason: `reconstructed from audit chain seq=${entry.chainSeq}`,
    ruleSetVersion: 'reconstructed',
    evaluatedAt: entry.recordedAt,
  };
}

function buildPlaceholderDecision(): PolicyDecision {
  return {
    decisionId: '0'.repeat(64),
    planId: '0'.repeat(64),
    outcome: 'allow',
    tier: 'tier_0_safe',
    reason: 'placeholder — no audit entries found for traceId',
    ruleSetVersion: 'none',
    evaluatedAt: new Date().toISOString(),
  };
}

function buildApprovalPlaceholder(planEntry: AuditEntry, approvalEntry: AuditEntry): Approval {
  return {
    approvalId: approvalEntry.planId,
    planId: planEntry.planId,
    decisionId: planEntry.planId,
    state: 'approved',
    requestedAt: planEntry.recordedAt,
    expiresAt: new Date(Date.parse(planEntry.recordedAt) + 86_400_000).toISOString(),
    approvers: [],
  };
}

function buildExecutionFromEntry(entry: AuditEntry): ExecuteResult<unknown> {
  return {
    outcome: 'executed',
    idempotencyKey: entry.idempotencyKey,
    auditEntryId: entry.entryId,
    value: undefined,                      // serialized value lives in blobRef (E3+)
    evidenceBundleRef: entry.traceId,
  };
}

/** Stub — full OTel span collection is an E3+ follow-up. */
function collectSpanSnapshots(_traceId: string): OtelSpanSnapshot[] {
  return [];
}
