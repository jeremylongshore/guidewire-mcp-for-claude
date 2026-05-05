# `@intentsolutions/guidewire-audit`

Postgres-backed hash-chain audit store. Linear per-tenant chain (NOT
Merkle, see [009 § 2.1](../../000-docs/009-DR-MEMO-harness-runtime.md)).

**Tamper-resistant against an outsider; tamper-evident against an
unprivileged operator; defence-in-depth via Postgres role separation
against a privileged DBA — NOT cryptographic tamper-evidence against the
schema-owner role.** Honest scope per
[D-019](../../000-docs/004-DR-DEC-architecture-decisions.md#d-019). KMS-signed
external commitment is E3+ work.

Reference spec: [05-TECHNICAL-SPEC § 8.2](../../000-docs/blueprint/05-TECHNICAL-SPEC.md).

## Public API

```ts
import { Pool } from 'pg';
import {
  createPgAuditStore,
  createMemoryAuditStore,
  computeEntryHash,
  GENESIS_PREV_HASH,
} from '@intentsolutions/guidewire-audit';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const store = createPgAuditStore(pool);

const entry = await store.append({
  entryId: '01J9X4HN5G8RXKX7P0VGAR3G7T',
  tenantId: 'sandbox-jeremy-dev',
  eventType: 'execute.completed',
  planId: 'p-1',
  traceId: 't-1',
  actorId: 'actor:billing-op@demo',
  toolName: 'reconcile-this-payment',
  toolVersion: '1.0.0',
  mode: 'approved_execute',
  idempotencyKey: `gwh1:${'a'.repeat(64)}`,
  recordedAt: new Date().toISOString(),
});

const verification = await store.verifyChain('sandbox-jeremy-dev');
// verification.valid === true if untampered; false if any prev_hash or
// entry_hash recomputation fails.
```

## Migration

`migrations/0001_init.sql` is the canonical schema. Applies via
`node-pg-migrate` (per [05-TECHNICAL-SPEC § 1](../../000-docs/blueprint/05-TECHNICAL-SPEC.md))
or any SQL migration runner. Three Postgres roles per D-019:

| Role | Grant | Held by |
|---|---|---|
| `audit_writer` | `INSERT` on `audit_entries`; `SELECT, UPDATE, INSERT` on `audit_chain_heads` | the harness process |
| `audit_reader` | `SELECT` on `audit_entries` + `audit_chain_heads` | the `verifyChain` process |
| `audit_owner` | DDL / GRANT (table ownership) | a separate operational identity, outside the harness |

The migration's `REVOKE UPDATE, DELETE ON audit_entries FROM audit_writer`
makes the writer's INSERT-only contract explicit.

## Append protocol

Per [05-TECHNICAL-SPEC § 8.2](../../000-docs/blueprint/05-TECHNICAL-SPEC.md):

1. Open serializable transaction.
2. `SELECT current_seq, current_hash FROM audit_chain_heads WHERE tenant_id = ? FOR UPDATE`.
3. Compute `entry_hash = sha256(prev_hash || canonical_serialization(entry_fields))`.
4. `INSERT` row.
5. `UPDATE` head row (or `INSERT` for tenant's first row).
6. Commit.

Single-writer per tenant; concurrent appends serialize on the head row.

## verifyChain

Walks forward from `fromSeq` (default 1), recomputing `entry_hash` and
asserting `prev_hash` matches the prior `entry_hash`. Any mismatch returns
`{ valid: false, brokenAtSeq, reason }`; the harness then refuses all
writes for that tenant until `chain.repair.acknowledged` (manual operator
action).

## Memory store (testing only)

`createMemoryAuditStore()` is the unit-test backend. It implements the same
chain protocol without persistence; the test helper `_tamper()` lets tests
flip a stored byte and exercise the `verifyChain` failure paths. **Never
use the memory store in production** — no durability, no role separation,
no concurrency coordination beyond the JS event loop.

## Testing

```bash
pnpm --filter @intentsolutions/guidewire-audit test
```

L4-integration tests (testcontainers Postgres) land at GW-2.x. Unit tests
exercise the memory store + hash-chain semantics.
