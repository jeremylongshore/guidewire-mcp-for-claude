import { createHash } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import type {
  Approval,
  ApprovalState,
  ApprovalVote,
  Plan,
  PolicyDecision,
} from '@intentsolutions/guidewire-schemas';
import type { ApprovalSink } from '../types.js';

/**
 * In-memory `ApprovalSink` for development and unit tests.
 *
 * Default mode: auto-approves on `wait()` after 0 ms, using a synthetic
 * system-actor vote. Good for local dev and happy-path unit tests.
 *
 * Configure `denyMode: true` to make every `wait()` resolve with `denied` —
 * used for testing the `APPROVAL_DENIED` error path.
 *
 * Configure `timeoutMs: N` with `denyMode: false` to test the
 * `APPROVAL_TIMEOUT` error path (the `wait()` caller must pass the same
 * `timeoutMs` to actually observe the timeout; the sink uses `timeoutMs` as
 * the TTL for `expiresAt`).
 *
 * Production uses a Postgres-backed sink (subsequent bead) so approvals
 * survive restarts, network partitions, and CLI session endings.
 */
export function createInMemoryApprovalSink(opts?: {
  /** When true, every wait() resolves as denied (for testing denial path). */
  readonly denyMode?: boolean;
  /** TTL for expiresAt (ms). Default: 86_400_000 (24 h). */
  readonly ttlMs?: number;
}): ApprovalSink & {
  /** Test-only: directly set the state of a stored approval. */
  readonly _setState: (approvalId: string, state: ApprovalState) => void;
} {
  const denyMode = opts?.denyMode ?? false;
  const ttlMs = opts?.ttlMs ?? 86_400_000;
  const store = new Map<string, Approval>();

  const request = async (plan: Plan, decision: PolicyDecision): Promise<Approval> => {
    const nonce = randomUUID();
    const approvalId = createHash('sha256')
      .update(`${plan.planId}:${nonce}`)
      .digest('hex');
    const now = new Date();
    const approval: Approval = {
      approvalId,
      planId: plan.planId,
      decisionId: decision.decisionId,
      state: 'pending',
      requestedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
      approvers: [],
    };
    store.set(approvalId, approval);
    return approval;
  };

  const wait = async (approvalId: string, waitOpts?: { timeoutMs?: number }): Promise<Approval> => {
    const stored = store.get(approvalId);
    if (stored === undefined) {
      throw new Error(`InMemoryApprovalSink: no approval with id=${approvalId}`);
    }

    // If already decided (any terminal state), return immediately.
    if (
      stored.state === 'approved' ||
      stored.state === 'denied' ||
      stored.state === 'expired' ||
      stored.state === 'cancelled'
    ) {
      return stored;
    }

    // Check expiry before simulating the decision.
    const expiresAt = new Date(stored.expiresAt).getTime();
    const remaining = expiresAt - Date.now();

    if (remaining <= 0) {
      // Already past TTL — mark expired.
      const expired: Approval = { ...stored, state: 'expired' };
      store.set(approvalId, expired);
      return expired;
    }

    // Check caller-supplied timeout: if timeoutMs is provided and is less than
    // the remaining TTL (i.e., the caller will stop waiting before the natural
    // expiry), simulate the timeout state.
    if (waitOpts?.timeoutMs !== undefined && waitOpts.timeoutMs < remaining) {
      const timedOut: Approval = { ...stored, state: 'expired' };
      store.set(approvalId, timedOut);
      return timedOut;
    }

    // Simulate auto-approve or auto-deny based on denyMode.
    const decidedAt = new Date().toISOString();
    const outcome = denyMode ? 'denied' : 'approved';
    const decided: Approval = {
      ...stored,
      state: outcome,
      approvers: [
        {
          actorId: 'system:in-memory-auto',
          role: 'admin',
          decidedAt,
          outcome,
          reason: denyMode
            ? 'InMemoryApprovalSink denyMode=true'
            : 'InMemoryApprovalSink auto-approve (dev mode)',
        },
      ],
    };
    store.set(approvalId, decided);
    return decided;
  };

  const decide = async (approvalId: string, vote: ApprovalVote): Promise<Approval> => {
    const stored = store.get(approvalId);
    if (stored === undefined) {
      throw new Error(`InMemoryApprovalSink: no approval with id=${approvalId}`);
    }
    const updated: Approval = {
      ...stored,
      state: vote.outcome,
      approvers: [
        ...stored.approvers,
        {
          actorId: vote.actorId,
          role: vote.role,
          decidedAt: new Date().toISOString(),
          outcome: vote.outcome,
          ...(vote.reason !== undefined && { reason: vote.reason }),
        },
      ],
    };
    store.set(approvalId, updated);
    return updated;
  };

  const _setState = (approvalId: string, state: ApprovalState): void => {
    const stored = store.get(approvalId);
    if (stored === undefined) return;
    store.set(approvalId, { ...stored, state });
  };

  return { request, wait, decide, _setState };
}
