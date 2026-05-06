/**
 * D-019 / AR-7 role-separation enforcement tests — testcontainers Postgres.
 *
 * Per CLAUDE.md hard rule #3 + audit-response triage AR-7, the audit
 * chain ships with three Postgres roles whose privilege boundaries must
 * be binding at the database layer (not just policy prose):
 *
 *   audit_writer  — INSERT-only on audit_entries; INSERT+SELECT+UPDATE
 *                   on audit_chain_heads (needed for the SELECT FOR
 *                   UPDATE + UPDATE pattern on the per-tenant head row);
 *                   INSERT+UPDATE+SELECT on approvals (covered separately
 *                   in packages/harness/tests/approvals.pg.test.ts).
 *                   The harness runtime binds as this role.
 *
 *   audit_reader  — SELECT-only on audit_entries, audit_chain_heads,
 *                   approvals. verifyChain() + compliance-job replay
 *                   bind here as a separate operational identity.
 *
 *   audit_owner   — DDL / GRANT only; held outside the harness process.
 *                   Runs the migration. Never the runtime identity.
 *
 * The defense-in-depth claim of D-019 — *"a compromised harness cannot
 * silently rewrite or delete audit rows"* — is only true if Postgres
 * actually enforces these boundaries. This file proves it does, end-to-
 * end, against a real Postgres instance via @testcontainers/postgresql.
 *
 * Coverage:
 *   audit_entries:
 *     • writer INSERT ✓                   • writer UPDATE ✗ (denied)
 *     • writer DELETE ✗ (denied)          • writer SELECT ✗ (denied)
 *     • reader SELECT ✓                   • reader INSERT/UPDATE/DELETE ✗
 *
 *   audit_chain_heads:
 *     • writer INSERT/SELECT/UPDATE ✓     • writer DELETE ✗ (denied)
 *     • reader SELECT ✓                   • reader INSERT/UPDATE/DELETE ✗
 *
 *   pg-store integration:
 *     • append() succeeds via writer pool (end-to-end)
 *     • verifyChain() succeeds via reader pool on a writer-populated chain
 *     • verifyChain() fails via writer pool (writer has no SELECT on entries)
 *
 * Tests skip cleanly when Docker is unavailable. Each test reuses a single
 * container per suite for performance — beforeEach truncates so test
 * ordering is irrelevant.
 *
 * Migration source of truth: packages/audit/migrations/0001_init.sql
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createPgAuditStore } from '../src/pg-store.js';
import type { AuditAppendInput } from '../src/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_PATH = join(__dirname, '..', 'migrations', '0001_init.sql');

const TENANT = 'sandbox-jeremy-dev';

function baseInput(overrides: Partial<AuditAppendInput> = {}): AuditAppendInput {
  return {
    entryId: `e-${Math.random().toString(36).slice(2)}`,
    tenantId: TENANT,
    eventType: 'plan.created',
    planId: 'p-1',
    traceId: 't-1',
    actorId: 'actor:underwriter@demo',
    toolName: 'find-submissions-waiting-on-me',
    toolVersion: '1.0.0',
    mode: 'read_only',
    idempotencyKey: `gwh1:${'a'.repeat(64)}`,
    recordedAt: new Date().toISOString(),
    ...overrides,
  };
}

// Docker probe — first-run image pull may take longer than a default
// startup window; give it 60s before deciding Docker is unavailable.
let dockerAvailable = false;
try {
  const probe = await new PostgreSqlContainer('postgres:16').withStartupTimeout(60_000).start();
  dockerAvailable = true;
  await probe.stop();
} catch {
  dockerAvailable = false;
}

describe.skipIf(!dockerAvailable)('audit chain role separation (D-019 / AR-7)', () => {
  let container: StartedPostgreSqlContainer;
  let ownerPool: Pool;
  let writerPool: Pool;
  let readerPool: Pool;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16')
      .withDatabase('audit')
      .withUsername('audit_owner')
      .withPassword('owner-pw')
      .start();

    ownerPool = new Pool({ connectionString: container.getConnectionUri() });

    const migration = readFileSync(MIGRATION_PATH, 'utf8');
    await ownerPool.query(migration);

    // Migration creates writer + reader as NOLOGIN. Promote both for tests.
    await ownerPool.query("ALTER ROLE audit_writer WITH LOGIN PASSWORD 'writer-pw'");
    await ownerPool.query("ALTER ROLE audit_reader WITH LOGIN PASSWORD 'reader-pw'");

    const baseUri = container.getConnectionUri();
    writerPool = new Pool({
      connectionString: baseUri.replace(
        /^postgres:\/\/audit_owner:owner-pw/,
        'postgres://audit_writer:writer-pw',
      ),
    });
    readerPool = new Pool({
      connectionString: baseUri.replace(
        /^postgres:\/\/audit_owner:owner-pw/,
        'postgres://audit_reader:reader-pw',
      ),
    });
  }, 60_000);

  afterAll(async () => {
    await readerPool?.end();
    await writerPool?.end();
    await ownerPool?.end();
    await container?.stop();
  }, 30_000);

  beforeEach(async () => {
    await ownerPool.query('TRUNCATE audit_entries, audit_chain_heads');
  });

  // ─── audit_entries — writer role ─────────────────────────────────────

  it('audit_writer can INSERT into audit_entries (the canonical write path)', async () => {
    // Bare-minimum INSERT — pg-store integration is covered separately.
    await expect(
      writerPool.query(
        `INSERT INTO audit_entries
           (entry_id, tenant_id, chain_seq, event_type, plan_id, trace_id,
            actor_id, tool_name, tool_version, mode, recorded_at,
            prev_hash, entry_hash)
         VALUES ($1, $2, 1, 'plan.created', 'p-1', 't-1',
            'actor:test', 'tool', '1.0.0', 'read_only', now(),
            $3, $4)`,
        [`e-${Date.now()}`, TENANT, '0'.repeat(64), '1'.repeat(64)],
      ),
    ).resolves.toBeDefined();
  });

  it('audit_writer cannot UPDATE audit_entries (forensic immutability)', async () => {
    // Set up a row as audit_owner (who can UPDATE — they own the table).
    await ownerPool.query(
      `INSERT INTO audit_entries
         (entry_id, tenant_id, chain_seq, event_type, plan_id, trace_id,
          actor_id, tool_name, tool_version, mode, recorded_at,
          prev_hash, entry_hash)
       VALUES ('e-target', $1, 1, 'plan.created', 'p-1', 't-1',
          'actor', 'tool', '1.0.0', 'read_only', now(),
          $2, $3)`,
      [TENANT, '0'.repeat(64), '1'.repeat(64)],
    );

    // The writer role must not be able to mutate the row post-insert.
    await expect(
      writerPool.query(
        `UPDATE audit_entries SET actor_id = 'actor:attacker' WHERE entry_id = 'e-target'`,
      ),
    ).rejects.toThrow(/permission denied/i);
  });

  it('audit_writer cannot DELETE audit_entries (forensic retention)', async () => {
    await ownerPool.query(
      `INSERT INTO audit_entries
         (entry_id, tenant_id, chain_seq, event_type, plan_id, trace_id,
          actor_id, tool_name, tool_version, mode, recorded_at,
          prev_hash, entry_hash)
       VALUES ('e-target', $1, 1, 'plan.created', 'p-1', 't-1',
          'actor', 'tool', '1.0.0', 'read_only', now(),
          $2, $3)`,
      [TENANT, '0'.repeat(64), '1'.repeat(64)],
    );

    await expect(
      writerPool.query(`DELETE FROM audit_entries WHERE entry_id = 'e-target'`),
    ).rejects.toThrow(/permission denied/i);
  });

  it('audit_writer cannot SELECT audit_entries (verifyChain runs as audit_reader)', async () => {
    // Asymmetry vs approvals: the writer drives the approvals state machine
    // and reads what it just wrote. For audit_entries the writer is purely
    // append-only — verifyChain + compliance jobs run as audit_reader, a
    // separate operational identity per D-019.
    await expect(writerPool.query('SELECT * FROM audit_entries')).rejects.toThrow(
      /permission denied/i,
    );
  });

  // ─── audit_entries — reader role ─────────────────────────────────────

  it('audit_reader can SELECT audit_entries', async () => {
    await ownerPool.query(
      `INSERT INTO audit_entries
         (entry_id, tenant_id, chain_seq, event_type, plan_id, trace_id,
          actor_id, tool_name, tool_version, mode, recorded_at,
          prev_hash, entry_hash)
       VALUES ('e-readable', $1, 1, 'plan.created', 'p-1', 't-1',
          'actor', 'tool', '1.0.0', 'read_only', now(),
          $2, $3)`,
      [TENANT, '0'.repeat(64), '1'.repeat(64)],
    );

    const res = await readerPool.query<{ entry_id: string }>(
      `SELECT entry_id FROM audit_entries WHERE entry_id = 'e-readable'`,
    );
    expect(res.rows[0]?.entry_id).toBe('e-readable');
  });

  it('audit_reader cannot INSERT into audit_entries', async () => {
    await expect(
      readerPool.query(
        `INSERT INTO audit_entries
           (entry_id, tenant_id, chain_seq, event_type, plan_id, trace_id,
            actor_id, tool_name, tool_version, mode, recorded_at,
            prev_hash, entry_hash)
         VALUES ($1, $2, 1, 'plan.created', 'p-1', 't-1',
            'actor', 'tool', '1.0.0', 'read_only', now(),
            $3, $4)`,
        [`e-${Date.now()}`, TENANT, '0'.repeat(64), '1'.repeat(64)],
      ),
    ).rejects.toThrow(/permission denied/i);
  });

  it('audit_reader cannot UPDATE or DELETE audit_entries', async () => {
    await ownerPool.query(
      `INSERT INTO audit_entries
         (entry_id, tenant_id, chain_seq, event_type, plan_id, trace_id,
          actor_id, tool_name, tool_version, mode, recorded_at,
          prev_hash, entry_hash)
       VALUES ('e-immut', $1, 1, 'plan.created', 'p-1', 't-1',
          'actor', 'tool', '1.0.0', 'read_only', now(),
          $2, $3)`,
      [TENANT, '0'.repeat(64), '1'.repeat(64)],
    );

    await expect(
      readerPool.query(`UPDATE audit_entries SET actor_id = 'attacker' WHERE entry_id = 'e-immut'`),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      readerPool.query(`DELETE FROM audit_entries WHERE entry_id = 'e-immut'`),
    ).rejects.toThrow(/permission denied/i);
  });

  // ─── audit_chain_heads — writer role ─────────────────────────────────

  it('audit_writer can INSERT, SELECT, UPDATE audit_chain_heads (for the SELECT FOR UPDATE pattern)', async () => {
    // pg-store's append() does:
    //   BEGIN ISOLATION LEVEL SERIALIZABLE;
    //   SELECT current_seq, current_hash FROM audit_chain_heads ... FOR UPDATE;
    //   INSERT INTO audit_entries ...;
    //   INSERT or UPDATE audit_chain_heads ...;
    //   COMMIT;
    // All three operations on chain_heads must be allowed for the writer.

    await expect(
      writerPool.query(
        `INSERT INTO audit_chain_heads (tenant_id, current_seq, current_hash)
         VALUES ($1, 1, $2)`,
        [TENANT, '1'.repeat(64)],
      ),
    ).resolves.toBeDefined();

    await expect(
      writerPool.query(
        `SELECT current_seq, current_hash FROM audit_chain_heads
         WHERE tenant_id = $1 FOR UPDATE`,
        [TENANT],
      ),
    ).resolves.toBeDefined();

    await expect(
      writerPool.query(
        `UPDATE audit_chain_heads SET current_seq = 2, current_hash = $2
         WHERE tenant_id = $1`,
        [TENANT, '2'.repeat(64)],
      ),
    ).resolves.toBeDefined();
  });

  it('audit_writer cannot DELETE audit_chain_heads (forensic retention)', async () => {
    await ownerPool.query(
      `INSERT INTO audit_chain_heads (tenant_id, current_seq, current_hash)
       VALUES ($1, 1, $2)`,
      [TENANT, '1'.repeat(64)],
    );
    await expect(
      writerPool.query('DELETE FROM audit_chain_heads WHERE tenant_id = $1', [TENANT]),
    ).rejects.toThrow(/permission denied/i);
  });

  // ─── audit_chain_heads — reader role ─────────────────────────────────

  it('audit_reader can SELECT but not mutate audit_chain_heads', async () => {
    await ownerPool.query(
      `INSERT INTO audit_chain_heads (tenant_id, current_seq, current_hash)
       VALUES ($1, 5, $2)`,
      [TENANT, '5'.repeat(64)],
    );

    const sel = await readerPool.query<{ current_seq: string }>(
      'SELECT current_seq FROM audit_chain_heads WHERE tenant_id = $1',
      [TENANT],
    );
    expect(sel.rows[0]?.current_seq).toBe('5');

    await expect(
      readerPool.query(
        `INSERT INTO audit_chain_heads (tenant_id, current_seq, current_hash)
         VALUES ('other', 1, $1)`,
        ['1'.repeat(64)],
      ),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      readerPool.query('UPDATE audit_chain_heads SET current_seq = 999 WHERE tenant_id = $1', [
        TENANT,
      ]),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      readerPool.query('DELETE FROM audit_chain_heads WHERE tenant_id = $1', [TENANT]),
    ).rejects.toThrow(/permission denied/i);
  });

  // ─── pg-store integration ────────────────────────────────────────────

  it('pg-store via audit_writer pool: append() works end-to-end', async () => {
    // The full hash-chain bookkeeping (SELECT FOR UPDATE on chain_heads,
    // INSERT into audit_entries, INSERT/UPDATE on chain_heads) must all
    // succeed under the writer role's grants.
    const store = createPgAuditStore(writerPool);
    const entry = await store.append(baseInput({ entryId: 'e-store-1' }));
    expect(entry.chainSeq).toBe(1);
    expect(entry.prevHash).toBe('0'.repeat(64));
    expect(entry.entryHash).toMatch(/^[0-9a-f]{64}$/);

    const next = await store.append(baseInput({ entryId: 'e-store-2' }));
    expect(next.chainSeq).toBe(2);
    expect(next.prevHash).toBe(entry.entryHash);
  });

  it('pg-store via audit_reader pool: verifyChain() succeeds on a writer-populated chain', async () => {
    // Writer populates the chain; reader verifies it. This is the canonical
    // operational shape — runtime writes go through audit_writer; compliance
    // jobs / regulator-export bundles run as audit_reader.
    const writerStore = createPgAuditStore(writerPool);
    await writerStore.append(baseInput({ entryId: 'e-w-1' }));
    await writerStore.append(baseInput({ entryId: 'e-w-2', eventType: 'policy.decided' }));
    await writerStore.append(baseInput({ entryId: 'e-w-3', eventType: 'execute.completed' }));

    const readerStore = createPgAuditStore(readerPool);
    const result = await readerStore.verifyChain(TENANT);
    expect(result.valid).toBe(true);
    expect(result.toSeq).toBe(3);
  });

  it('pg-store via audit_writer pool: verifyChain() fails (writer has no SELECT on audit_entries)', async () => {
    // Negative test — confirms the role contract: the writer is genuinely
    // append-only and cannot read what it wrote. Compliance work must use
    // the reader pool.
    const writerStore = createPgAuditStore(writerPool);
    await writerStore.append(baseInput({ entryId: 'e-w-only' }));

    await expect(writerStore.verifyChain(TENANT)).rejects.toThrow(/permission denied/i);
  });
});
