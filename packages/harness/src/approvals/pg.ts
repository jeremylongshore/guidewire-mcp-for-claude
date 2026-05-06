import { createHash, randomUUID } from 'node:crypto';

import type {
  Approval,
  ApprovalState,
  ApprovalVote,
  Plan,
  PolicyDecision,
} from '@intentsolutions/guidewire-schemas';
import type { Pool } from 'pg';

import type { ApprovalSink } from '../types.js';

/**
 * Postgres-backed `ApprovalSink` per 02-PRD § 5.3 + 05-TECHNICAL-SPEC § 8.2.0.
 *
 * Replaces the in-memory sink for any deployment that needs approvals to
 * survive a restart, network partition, or CLI session ending mid-`wait()`.
 * Schema lives in `@intentsolutions/guidewire-audit/migrations/0001_init.sql`
 * (the `approvals` table + `approvals_pending_idx` partial index +
 * `approvals_one_pending_per_plan_idx` partial unique index +
 * `approvals_set_updated_at()` trigger). The pool's connection identity
 * MUST hold the `audit_writer` Postgres role — see § 8.2.1 for the
 * three-role separation enforced by D-019.
 *
 * State-machine guard
 * -------------------
 * Per the migration header, the application enforces the legal transitions
 * (`pending → approved | denied | expired | cancelled`); the DDL does not.
 * The pg sink does this via a state precondition in the `WHERE` clause of
 * every `UPDATE`:
 *
 *   UPDATE approvals SET state = $new
 *    WHERE approval_id = $id AND state = 'pending'
 *
 * - Race-safe: two concurrent decide() calls cannot both flip the row.
 *   The second one's `WHERE state = 'pending'` matches zero rows.
 * - Idempotent for the loser: returns the current (already-decided) state
 *   instead of throwing on the lost race.
 * - Hard-error on illegal user-driven transitions: an explicit decide()
 *   on a non-pending approval throws so the harness can surface it as
 *   `APPROVAL_DENIED` or similar at the boundary.
 *
 * Column-restricted GRANT
 * -----------------------
 * The migration grants `audit_writer` UPDATE only on `(state, approvers,
 * updated_at)` — every other column is read-only after INSERT. So even if
 * this code tried to mutate `tenant_id` / `plan_id` / `requested_at` /
 * `expires_at` / `created_at` / `approval_id`, Postgres would refuse with
 * `permission denied for column …`. Defense-in-depth per D-019.
 *
 * `wait()` semantics
 * ------------------
 * Polls the row at `waitPollMs` intervals (default 1 s). Returns when:
 *   - state transitions out of pending (decided externally),
 *   - the row's `expires_at` passes — sink transitions to `expired`,
 *   - the caller's `timeoutMs` is exceeded — sink transitions to `expired`.
 *
 * Production deployments typically also run a periodic sweeper job that
 * marks past-expires_at pending rows as `expired` so callers that aren't
 * actively waiting still see expiry. That job is out of scope for this
 * sink; the sweeper would issue the same `UPDATE … WHERE state = 'pending'
 * AND expires_at < now()` SQL.
 */
export interface PgApprovalSinkOpts {
  /** Connection pool. Pool's role must hold `audit_writer`. */
  readonly pool: Pool;
  /** Tenant ID — every row carries this in the `tenant_id` column. */
  readonly tenantId: string;
  /** Approval TTL in ms. Default: 86_400_000 (24h). */
  readonly ttlMs?: number;
  /** Poll interval inside `wait()`. Default: 1000 ms. */
  readonly waitPollMs?: number;
}

const DEFAULT_TTL_MS = 86_400_000;
const DEFAULT_WAIT_POLL_MS = 1000;

interface ApprovalRow {
  readonly approval_id: string;
  readonly plan_id: string;
  readonly decision_id: string;
  readonly state: ApprovalState;
  readonly requested_at: Date;
  readonly expires_at: Date;
  readonly approvers: readonly Approval['approvers'][number][];
}

function rowToApproval(row: ApprovalRow): Approval {
  return {
    approvalId: row.approval_id,
    planId: row.plan_id,
    decisionId: row.decision_id,
    state: row.state,
    requestedAt: row.requested_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    approvers: row.approvers,
  };
}

const SELECT_COLUMNS =
  'approval_id, plan_id, decision_id, state, requested_at, expires_at, approvers';

export function createPgApprovalSink(opts: PgApprovalSinkOpts): ApprovalSink {
  const { pool, tenantId } = opts;
  const ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
  const waitPollMs = opts.waitPollMs ?? DEFAULT_WAIT_POLL_MS;

  async function fetchRow(approvalId: string): Promise<Approval | null> {
    const res = await pool.query<ApprovalRow>(
      `SELECT ${SELECT_COLUMNS} FROM approvals
       WHERE tenant_id = $1 AND approval_id = $2`,
      [tenantId, approvalId],
    );
    const row = res.rows[0];
    return row !== undefined ? rowToApproval(row) : null;
  }

  /**
   * State-precondition UPDATE. Returns whether the transition succeeded
   * + the post-transition row. Does NOT use RETURNING (which would
   * require a column-list SELECT permission); on success, callers
   * supply the pre-known fields (we just wrote them) plus the new state.
   * On loss-of-race, fetches the current row to report the winner's state.
   */
  async function transitionFromPending(
    approvalId: string,
    targetState: Exclude<ApprovalState, 'pending'>,
    appendVote: Approval['approvers'][number] | null,
  ): Promise<{ readonly transitioned: boolean; readonly current: Approval }> {
    const params: unknown[] = [tenantId, approvalId, targetState];
    let approversExpr = 'approvers';
    if (appendVote !== null) {
      params.push(JSON.stringify([appendVote]));
      approversExpr = `approvers || $${params.length}::jsonb`;
    }
    const res = await pool.query(
      `UPDATE approvals
         SET state = $3,
             approvers = ${approversExpr}
       WHERE tenant_id = $1
         AND approval_id = $2
         AND state = 'pending'`,
      params,
    );
    if ((res.rowCount ?? 0) === 0) {
      // Lost the race or illegal transition: refresh + return the winner.
      const current = await fetchRow(approvalId);
      if (current === null) {
        throw new Error(`PgApprovalSink: no approval with id=${approvalId}`);
      }
      return { transitioned: false, current };
    }
    // Successful transition. Refresh to pick up the trigger-updated
    // updated_at + the appended approvers row exactly as Postgres stored
    // them. Cheap because we already established this connection.
    const current = await fetchRow(approvalId);
    if (current === null) {
      // Should be unreachable — UPDATE returned rowCount > 0.
      throw new Error(`PgApprovalSink: row vanished after successful UPDATE: ${approvalId}`);
    }
    return { transitioned: true, current };
  }

  const request = async (plan: Plan, decision: PolicyDecision): Promise<Approval> => {
    const nonce = randomUUID();
    const approvalId = createHash('sha256').update(`${plan.planId}:${nonce}`).digest('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs);

    await pool.query(
      `INSERT INTO approvals
         (approval_id, tenant_id, plan_id, decision_id, state,
          requested_at, expires_at, approvers)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, '[]'::jsonb)`,
      [
        approvalId,
        tenantId,
        plan.planId,
        decision.decisionId,
        now.toISOString(),
        expiresAt.toISOString(),
      ],
    );
    return {
      approvalId,
      planId: plan.planId,
      decisionId: decision.decisionId,
      state: 'pending',
      requestedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      approvers: [],
    };
  };

  const wait = async (approvalId: string, waitOpts?: { timeoutMs?: number }): Promise<Approval> => {
    const startTime = Date.now();
    const callerTimeout = waitOpts?.timeoutMs;

    while (true) {
      const stored = await fetchRow(approvalId);
      if (stored === null) {
        throw new Error(`PgApprovalSink: no approval with id=${approvalId}`);
      }
      if (stored.state !== 'pending') return stored;

      const expiresAt = new Date(stored.expiresAt).getTime();
      const callerDeadline =
        callerTimeout !== undefined ? startTime + callerTimeout : Number.POSITIVE_INFINITY;

      // Natural TTL expired or caller's wait window expired — flip to expired
      // via the state-precondition UPDATE (race-safe vs an external decide()).
      if (Date.now() >= expiresAt || Date.now() >= callerDeadline) {
        const { current } = await transitionFromPending(approvalId, 'expired', null);
        return current;
      }

      const nextWake = Math.min(Date.now() + waitPollMs, expiresAt, callerDeadline);
      const sleepMs = Math.max(0, nextWake - Date.now());
      await sleep(sleepMs);
    }
  };

  const decide = async (approvalId: string, vote: ApprovalVote): Promise<Approval> => {
    const newApprover: Approval['approvers'][number] = {
      actorId: vote.actorId,
      role: vote.role,
      decidedAt: new Date().toISOString(),
      outcome: vote.outcome,
      ...(vote.reason !== undefined && { reason: vote.reason }),
    };
    const { current, transitioned } = await transitionFromPending(
      approvalId,
      vote.outcome,
      newApprover,
    );
    if (!transitioned) {
      // The row exists but was not pending — illegal user-driven transition.
      throw new Error(
        `PgApprovalSink: illegal state transition ${current.state} → ${vote.outcome} ` +
          `for approval ${approvalId} (current state was not 'pending')`,
      );
    }
    return current;
  };

  return { request, wait, decide };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
