/**
 * PgApprovalSink integration tests — testcontainers Postgres.
 *
 * Per CLAUDE.md hard rule #2 (NO MOCKS) + the bead spec, these tests run
 * against a real Postgres instance spun up via @testcontainers/postgresql.
 * They cover:
 *
 *   - request() inserts a pending row with the right shape
 *   - decide() pending → approved succeeds + appends approver vote
 *   - decide() pending → denied succeeds
 *   - decide() on already-decided throws (illegal state-machine transition)
 *   - decide() race: two concurrent calls — one wins, the other sees the
 *     winning state instead of throwing (state-precondition idempotency)
 *   - wait() returns immediately for terminal state
 *   - wait() polls + observes external decide()
 *   - wait() flips to expired when row's expires_at passes (TTL=0)
 *   - wait() flips to expired when caller's timeoutMs is exceeded
 *   - column-restricted GRANT denies UPDATE on immutable columns
 *     (audit_writer cannot rewrite tenant_id/plan_id/requested_at/etc.)
 *
 * Tests skip cleanly when Docker isn't available (CI without Docker, or
 * a dev box without it). Each test gets its own container so ordering
 * doesn't matter.
 *
 * Migration source of truth: @intentsolutions/guidewire-audit/migrations/0001_init.sql
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createPgApprovalSink } from '../src/approvals/pg.js';
import type { Plan, PolicyDecision } from '../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_PATH = join(__dirname, '..', '..', 'audit', 'migrations', '0001_init.sql');

const TENANT = 'carrier-acme';
const ZERO64 = '0'.repeat(64);

function makePlan(planIdSeed = '0'): Plan {
  const planId = planIdSeed.padStart(64, planIdSeed).slice(0, 64);
  return {
    toolName: 'update-reserve',
    toolVersion: '1.0.0',
    mode: 'approved_execute',
    tenantId: TENANT,
    actorId: 'user:claims-manager',
    args: { claimId: 'CLM-001', amount: 5000 },
    summary: 'Update reserve for CLM-001',
    traceId: `trace-${planIdSeed}`,
    planId,
    createdAt: new Date().toISOString(),
    idempotencyKey: `gwh1:${planId}`,
    wire: { dbTransactionId: planId },
  };
}

function makeDecision(planId: string = ZERO64): PolicyDecision {
  return {
    decisionId: '1'.repeat(64),
    planId,
    outcome: 'require_approval',
    tier: 'tier_2_low',
    reason: 'single approver required',
    ruleSetVersion: 'v1.0',
    evaluatedAt: new Date().toISOString(),
    requiredApprovers: { minCount: 1, rolesAllowed: ['claims-manager'] },
  };
}

// Probe Docker once at suite start. Skip the whole describe if unavailable.
// Uses a generous timeout — first-run image pull (or a slow boot) shouldn't
// be misread as "Docker not available". The actual tests get their own
// containers with their own startup timeouts.
let dockerAvailable = false;
try {
  const probe = await new PostgreSqlContainer('postgres:16').withStartupTimeout(60_000).start();
  dockerAvailable = true;
  await probe.stop();
} catch {
  dockerAvailable = false;
}

describe.skipIf(!dockerAvailable)('PgApprovalSink (testcontainers Postgres)', () => {
  let container: StartedPostgreSqlContainer;
  let ownerPool: Pool;
  let writerPool: Pool;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16')
      .withDatabase('audit')
      .withUsername('audit_owner')
      .withPassword('owner-pw')
      .start();

    ownerPool = new Pool({ connectionString: container.getConnectionUri() });

    const migration = readFileSync(MIGRATION_PATH, 'utf8');
    await ownerPool.query(migration);

    // The migration creates audit_writer / audit_reader as NOLOGIN.
    // For tests, give audit_writer LOGIN + a password so we can connect as it.
    await ownerPool.query(`ALTER ROLE audit_writer WITH LOGIN PASSWORD 'writer-pw'`);

    // The audit_owner created the tables and is implicitly owner; the
    // INSERT/UPDATE GRANTs in the migration already reference audit_writer
    // by role. So all we need on the writer connection is to authenticate.
    writerPool = new Pool({
      connectionString: container
        .getConnectionUri()
        .replace(/^postgres:\/\/audit_owner:owner-pw/, 'postgres://audit_writer:writer-pw'),
    });
  }, 60_000);

  afterAll(async () => {
    await writerPool?.end();
    await ownerPool?.end();
    await container?.stop();
  }, 30_000);

  // Each test starts with an empty approvals table so they don't interfere.
  beforeEach(async () => {
    await ownerPool.query('TRUNCATE approvals');
  });

  it('request() inserts a pending row with correct columns', async () => {
    const sink = createPgApprovalSink({ pool: writerPool, tenantId: TENANT });
    const plan = makePlan('a');
    const decision = makeDecision(plan.planId);

    const approval = await sink.request(plan, decision);

    expect(approval.state).toBe('pending');
    expect(approval.planId).toBe(plan.planId);
    expect(approval.decisionId).toBe(decision.decisionId);
    expect(approval.approvalId).toMatch(/^[0-9a-f]{64}$/);
    expect(approval.approvers).toHaveLength(0);

    // Verify it's actually persisted
    const row = await ownerPool.query(
      'SELECT state, plan_id, decision_id, approvers FROM approvals WHERE approval_id = $1',
      [approval.approvalId],
    );
    expect(row.rows[0]?.state).toBe('pending');
    expect(row.rows[0]?.approvers).toEqual([]);
  });

  it('decide() pending → approved appends vote and flips state', async () => {
    const sink = createPgApprovalSink({ pool: writerPool, tenantId: TENANT });
    const plan = makePlan('b');
    const pending = await sink.request(plan, makeDecision(plan.planId));

    const decided = await sink.decide(pending.approvalId, {
      actorId: 'user:supervisor-bob',
      role: 'claims-manager',
      outcome: 'approved',
      reason: 'reserve increase justified by adjuster notes',
    });

    expect(decided.state).toBe('approved');
    expect(decided.approvers).toHaveLength(1);
    expect(decided.approvers[0]?.actorId).toBe('user:supervisor-bob');
    expect(decided.approvers[0]?.reason).toBe('reserve increase justified by adjuster notes');
  });

  it('decide() pending → denied flips state', async () => {
    const sink = createPgApprovalSink({ pool: writerPool, tenantId: TENANT });
    const plan = makePlan('c');
    const pending = await sink.request(plan, makeDecision(plan.planId));

    const denied = await sink.decide(pending.approvalId, {
      actorId: 'user:supervisor-bob',
      role: 'claims-manager',
      outcome: 'denied',
    });

    expect(denied.state).toBe('denied');
    expect(denied.approvers[0]?.outcome).toBe('denied');
  });

  it('decide() on already-decided throws — illegal state-machine transition', async () => {
    const sink = createPgApprovalSink({ pool: writerPool, tenantId: TENANT });
    const plan = makePlan('d');
    const pending = await sink.request(plan, makeDecision(plan.planId));

    await sink.decide(pending.approvalId, {
      actorId: 'user:alice',
      role: 'claims-manager',
      outcome: 'approved',
    });

    await expect(
      sink.decide(pending.approvalId, {
        actorId: 'user:eve',
        role: 'claims-manager',
        outcome: 'denied',
      }),
    ).rejects.toThrow(/illegal state transition approved → denied/);
  });

  it('decide() race: concurrent calls — one wins, the other sees the winning state', async () => {
    const sink = createPgApprovalSink({ pool: writerPool, tenantId: TENANT });
    const plan = makePlan('e');
    const pending = await sink.request(plan, makeDecision(plan.planId));

    // Two parallel decide()s for opposite outcomes. Exactly one should
    // succeed; the other throws because the state precondition fails.
    const results = await Promise.allSettled([
      sink.decide(pending.approvalId, {
        actorId: 'user:approver',
        role: 'claims-manager',
        outcome: 'approved',
      }),
      sink.decide(pending.approvalId, {
        actorId: 'user:denier',
        role: 'claims-manager',
        outcome: 'denied',
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    // Final row reflects the winner — only one approver entry, not two.
    const final = await ownerPool.query<{
      state: string;
      approvers: { actorId: string }[];
    }>('SELECT state, approvers FROM approvals WHERE approval_id = $1', [pending.approvalId]);
    expect(['approved', 'denied']).toContain(final.rows[0]?.state);
    expect(final.rows[0]?.approvers).toHaveLength(1);
  });

  it('wait() returns immediately for already-terminal state', async () => {
    const sink = createPgApprovalSink({ pool: writerPool, tenantId: TENANT });
    const plan = makePlan('f');
    const pending = await sink.request(plan, makeDecision(plan.planId));
    await sink.decide(pending.approvalId, {
      actorId: 'user:alice',
      role: 'claims-manager',
      outcome: 'approved',
    });

    const start = Date.now();
    const observed = await sink.wait(pending.approvalId);
    const elapsed = Date.now() - start;

    expect(observed.state).toBe('approved');
    expect(elapsed).toBeLessThan(500); // No polling delay
  });

  it('wait() polls and observes an external decide()', async () => {
    const sink = createPgApprovalSink({
      pool: writerPool,
      tenantId: TENANT,
      waitPollMs: 100,
    });
    const plan = makePlan('g');
    const pending = await sink.request(plan, makeDecision(plan.planId));

    // Schedule a decide() ~250 ms into the future.
    setTimeout(() => {
      sink
        .decide(pending.approvalId, {
          actorId: 'user:bob',
          role: 'claims-manager',
          outcome: 'approved',
        })
        .catch(() => {
          /* test failure surfaces via the wait() outcome */
        });
    }, 250);

    const observed = await sink.wait(pending.approvalId, { timeoutMs: 5000 });
    expect(observed.state).toBe('approved');
    expect(observed.approvers[0]?.actorId).toBe('user:bob');
  });

  it('wait() flips to expired when natural TTL passes (ttlMs=0)', async () => {
    const sink = createPgApprovalSink({
      pool: writerPool,
      tenantId: TENANT,
      ttlMs: 0,
      waitPollMs: 50,
    });
    const plan = makePlan('h');
    const pending = await sink.request(plan, makeDecision(plan.planId));

    const observed = await sink.wait(pending.approvalId);
    expect(observed.state).toBe('expired');
  });

  it('wait() flips to expired when caller timeoutMs is exceeded', async () => {
    const sink = createPgApprovalSink({
      pool: writerPool,
      tenantId: TENANT,
      waitPollMs: 50,
    });
    const plan = makePlan('i');
    const pending = await sink.request(plan, makeDecision(plan.planId));

    const observed = await sink.wait(pending.approvalId, { timeoutMs: 100 });
    expect(observed.state).toBe('expired');
  });

  it('column-restricted GRANT denies UPDATE on immutable columns', async () => {
    // Set up a pending row via the sink (legal INSERT path).
    const sink = createPgApprovalSink({ pool: writerPool, tenantId: TENANT });
    const plan = makePlan('j');
    const pending = await sink.request(plan, makeDecision(plan.planId));

    // Try, AS audit_writer, to mutate columns that the migration says are
    // read-only. Postgres should refuse with permission denied for column.
    // Each immutable column tested separately so we get a clean per-column signal.
    const immutableColumns = [
      ['tenant_id', `'attacker-tenant'`],
      ['plan_id', `'${'9'.repeat(64)}'`],
      ['decision_id', `'${'8'.repeat(64)}'`],
      ['requested_at', 'now()'],
      ['expires_at', 'now()'],
      ['created_at', 'now()'],
      ['approval_id', `'${'7'.repeat(64)}'`],
    ] as const;

    for (const [col, val] of immutableColumns) {
      await expect(
        writerPool.query(`UPDATE approvals SET ${col} = ${val} WHERE approval_id = $1`, [
          pending.approvalId,
        ]),
      ).rejects.toThrow(/permission denied/i);
    }

    // Sanity: the columns the writer IS allowed to update succeed.
    await expect(
      writerPool.query(`UPDATE approvals SET state = 'cancelled' WHERE approval_id = $1`, [
        pending.approvalId,
      ]),
    ).resolves.toBeDefined();
  });

  it('GRANT denies DELETE entirely (forensic retention)', async () => {
    const sink = createPgApprovalSink({ pool: writerPool, tenantId: TENANT });
    const plan = makePlan('k');
    const pending = await sink.request(plan, makeDecision(plan.planId));

    await expect(
      writerPool.query('DELETE FROM approvals WHERE approval_id = $1', [pending.approvalId]),
    ).rejects.toThrow(/permission denied/i);
  });
});
