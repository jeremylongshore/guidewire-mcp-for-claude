-- 0001_init.sql — canonical hash-chain migration per 02-PRD § 5.5 +
-- 05-TECHNICAL-SPEC § 8.2 + D-019 (role separation). Extended per HR-4
-- (approvals state machine, § 8.2.0).
--
-- Three Postgres roles per D-019:
--   audit_writer  — INSERT-only on audit_entries; INSERT+UPDATE on
--                   approvals (state-machine transitions per HR-4).
--                   The harness runs as this role.
--   audit_reader  — SELECT-only on audit_entries, audit_chain_heads,
--                   and approvals. verifyChain + compliance jobs bind here.
--   audit_owner   — DDL / GRANT only; held outside the harness process.
--
-- Tamper-resistant against an outsider; tamper-evident against an
-- unprivileged operator; defence-in-depth via role separation against a
-- privileged DBA — NOT cryptographic tamper-evidence against the
-- schema-owner role. KMS-signed external commitment is E3+ work.

CREATE TABLE IF NOT EXISTS audit_chain_heads (
  tenant_id        TEXT PRIMARY KEY,
  current_seq      BIGINT NOT NULL DEFAULT 0,
  current_hash     TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS audit_entries (
  entry_id         TEXT PRIMARY KEY,
  tenant_id        TEXT NOT NULL,
  chain_seq        BIGINT NOT NULL,
  event_type       TEXT NOT NULL,
  plan_id          TEXT NOT NULL,
  trace_id         TEXT NOT NULL,
  actor_id         TEXT NOT NULL,
  tool_name        TEXT NOT NULL,
  tool_version     TEXT NOT NULL,
  mode             TEXT NOT NULL,
  idempotency_key  TEXT,
  recorded_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  prev_hash        TEXT NOT NULL,
  entry_hash       TEXT NOT NULL,
  blob_ref         TEXT,
  -- GA-3: which OAuth scope authorized this call (read|write|admin|producer).
  -- Recorded per-call so a compromised harness cannot quietly broaden access
  -- without a chain-visible trail. NULL for entries written before HR-3
  -- landed; canonical hash filters undefined → backward-compatible.
  oauth_scope      TEXT,
  UNIQUE (tenant_id, chain_seq)
);

CREATE INDEX IF NOT EXISTS audit_entries_tenant_seq_idx
  ON audit_entries (tenant_id, chain_seq);

CREATE INDEX IF NOT EXISTS audit_entries_plan_idx
  ON audit_entries (plan_id);

CREATE INDEX IF NOT EXISTS audit_entries_trace_idx
  ON audit_entries (trace_id);

-- HR-4: approvals state machine persisted per 02-PRD § 5.3 +
-- 05-TECHNICAL-SPEC § 8.2.0. Persists so a restart, network partition,
-- or CLI session ending mid-wait does not lose the request. The
-- application enforces the legal transitions
-- (pending → approved | denied | expired | cancelled); the DDL does not.
--
-- Two intentional deviations from the literal blueprint § 8.2.0 SQL,
-- both flagged + filed for blueprint update:
--   1. Column `approvers` (JSONB) — the blueprint label `approver_votes`
--      drifts from the runtime contract in `packages/schemas/src/harness/
--      approval.ts` line 37 (field `approvers`). The DDL aligns with the
--      runtime schema so pg-store reads/writes do not need a name remap.
--   2. UNIQUE (tenant_id, plan_id) is REMOVED in favor of a partial
--      unique index on the `pending` state below. The blueprint constraint
--      contradicts `approval_id = sha256(planId + nonce)` — the system is
--      designed to support multiple distinct approvals per plan (e.g.
--      a re-request after a previous request expired or was denied);
--      a hard UNIQUE blocks every legitimate re-request. The partial index
--      keeps the spec's intent (only one *active* approval per plan) while
--      allowing the historical chain.
CREATE TABLE IF NOT EXISTS approvals (
  approval_id      TEXT PRIMARY KEY,        -- sha256(planId + nonce)
  tenant_id        TEXT NOT NULL,
  plan_id          TEXT NOT NULL,
  decision_id      TEXT NOT NULL,
  state            TEXT NOT NULL,           -- pending | approved | denied | expired | cancelled
  requested_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at       TIMESTAMPTZ NOT NULL,
  approvers        JSONB NOT NULL DEFAULT '[]',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enforce: at most one PENDING approval per (tenant, plan). Approved /
-- denied / expired / cancelled rows are retained for forensics and do
-- not block a re-request. Replaces the blueprint's UNIQUE (tenant_id,
-- plan_id) which would have blocked legitimate re-requests.
CREATE UNIQUE INDEX IF NOT EXISTS approvals_one_pending_per_plan_idx
  ON approvals (tenant_id, plan_id)
  WHERE state = 'pending';

-- Hot-path query: the CLI's `approve` list and the harness's `wait()`
-- poll filter pending approvals per tenant. Partial index keeps size
-- proportional to in-flight approvals, not historical decided ones
-- (which dominate after a few weeks of production traffic).
CREATE INDEX IF NOT EXISTS approvals_pending_idx
  ON approvals (tenant_id, state)
  WHERE state = 'pending';

-- HR-4 / D-019: keep `updated_at` honest on every state-machine
-- transition. Postgres does NOT auto-update DEFAULT now() on UPDATE;
-- a trigger is the only way the column reflects the actual last-write
-- time. Without this, `updated_at` equals `requested_at` for the life
-- of the row — useless for forensic timelines.
CREATE OR REPLACE FUNCTION approvals_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS approvals_updated_at_trg ON approvals;
CREATE TRIGGER approvals_updated_at_trg
  BEFORE UPDATE ON approvals
  FOR EACH ROW
  EXECUTE FUNCTION approvals_set_updated_at();

-- Role separation per D-019. The schema owner runs this migration; the
-- harness process and verifier process bind via the writer / reader roles.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'audit_writer') THEN
    CREATE ROLE audit_writer NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'audit_reader') THEN
    CREATE ROLE audit_reader NOLOGIN;
  END IF;
END
$$;

GRANT INSERT ON audit_entries TO audit_writer;
GRANT SELECT, UPDATE ON audit_chain_heads TO audit_writer;
GRANT INSERT ON audit_chain_heads TO audit_writer;

-- HR-4 + D-019: approvals are state-transitioned by the harness via
-- idempotent updates keyed by approval_id. INSERT for new requests;
-- UPDATE is COLUMN-RESTRICTED to (state, approvers, updated_at) so a
-- compromised harness cannot rewrite immutable provenance metadata
-- (tenant_id, plan_id, decision_id, requested_at, expires_at, created_at,
-- approval_id) and silently erase the history of a specific request.
-- DELETE is denied — expired/cancelled rows are retained for forensics
-- per the same rationale as audit_entries.
GRANT INSERT ON approvals TO audit_writer;
GRANT UPDATE (state, approvers, updated_at) ON approvals TO audit_writer;

GRANT SELECT ON audit_entries TO audit_reader;
GRANT SELECT ON audit_chain_heads TO audit_reader;
GRANT SELECT ON approvals TO audit_reader;

-- Explicitly deny mutations the writer should not have. Postgres has no
-- "DENY"; absence of GRANT achieves the same. The schema-owner identity
-- (audit_owner, held outside the harness) retains DDL by virtue of being
-- the table owner.
REVOKE UPDATE, DELETE ON audit_entries FROM audit_writer;
REVOKE DELETE ON audit_chain_heads FROM audit_writer;
REVOKE DELETE ON approvals FROM audit_writer;
