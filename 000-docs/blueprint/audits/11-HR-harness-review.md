# 11-HR — Harness runtime review (Mode B)

**Auditor:** `harness-runtime-architect` (project-scoped)
**Date:** 2026-05-04
**Target:** `02-PRD.md` § 5 (full harness contract — § 5.1 Plan
through § 5.9 enforcement) + § 4 (three-mode contract +
refusal),  `05-TECHNICAL-SPEC.md` § 3 (TS contracts) + § 4
(observability fan-out) + § 8.2 (audit hash-chain
implementation), `03-ARCHITECTURE.md` § 5 (three-mode
architectural flow) + § 6 (failure modes), `004-DR-DEC` D-006 +
D-019, `009-DR-MEMO-harness-runtime.md` (Mode A predecessor —
this is the spec the Mode B verifies against).
**Scope:** harness library + CLI surface fidelity (does the
authored blueprint match `009 § 1.1-1.8` verbatim?), plan /
policy / approval / execute / audit / rollback semantics,
hash-chain integrity claims (the F-RT-5.1 fix per D-019),
idempotency two-key model (the librarian P1 fix), evidence
bundle reproducibility, three-mode enforcement at the harness
layer, library-vs-CLI parity. **Out of scope:** Cloud API
endpoint correctness (`guidewire-api-archaeologist`); per-tool
blast radius (`mcp-safety-reviewer`); audit-DB role-separation
operational story (`security-auditor` lane covers it).

---

## Verdict

**PASS-WITH-NOTES.** The Mode A memo's `009 § 11` declared a
hard contract: *"`packages/harness/src/index.ts` contains the
TypeScript signatures from § 1 verbatim. The Postgres DDL in
§ 2 becomes the migration in
`packages/harness/migrations/0001_init.sql`. The CLI commands
in § 9 become `packages/harness/src/cli/*.ts`. The failure
table in § 6 becomes the test matrix in
`packages/harness/test/failure-modes.test.ts`."* I verified each
deliverable surfaces in the authored blueprint:
- TS signatures: PRD § 5.1-5.8 + TECH-SPEC § 3.1-3.8 reproduce
  the exports verbatim with only one structural addition —
  `Plan.wire.dbTransactionId` per librarian P1.
- DDL: TECH-SPEC § 8.2 carries the `audit_chain_heads` +
  `audit_entries` tables with the serializable-`FOR UPDATE`
  append protocol per `009 § 2.3`.
- CLI: PRD § 5 + ARCHITECTURE § 5.3 reference the CLI commands
  per `009 § 9`; full mapping deferred to E3 implementation.
- Failure table: ARCHITECTURE § 6 + PRD § 4.1 carry the failure
  scenarios per `009 § 6` with the asymmetry between
  `AUDIT_UNREACHABLE` (refuse) and `OBSERVABILITY_UNREACHABLE`
  (degraded warning) named correctly.
The pre-audit red team's F-RT-5.1 (chain tamper-evidence claim)
got D-019 and the threat-model rewording landed across PRD § 5.5
+ TECH-SPEC § 8.2 + § 8.5. The librarian P1 two-key idempotency
fix landed verbatim with the right semantic distinction. The
findings below are residual harness-correctness items: the
`approvals` table DDL (Mode A § 3 mentioned but blueprint
doesn't surface), the `Plan.wire.dbTransactionId` TTL story (009
§ 4.5), an open question on `Approval.expiresAt` notification.

## Findings

### F-1 — TS contracts match `009 § 1` verbatim with one principled addition (`Plan.wire`)
- **Severity:** PASS
- **Section:** `02-PRD.md` § 5.1-5.8 + `05-TECHNICAL-SPEC.md`
  § 3.1-3.8 + `009 § 1.1-1.8`.
- **Finding:** I diffed the TS signatures across the three
  documents:
  - `PlanInput`, `Plan`: PRD § 5.1 = TECH-SPEC § 3.1 = 009
    § 1.1, with the addition of `Plan.wire: { dbTransactionId:
    string }` per librarian P1. The addition is required and
    correctly scoped.
  - `PolicyOutcome`, `PolicyTier`, `PolicyDecision`,
    `PolicyEngine`: identical across PRD § 5.2 / TECH-SPEC § 3.2 /
    009 § 1.2. `tier_4_blocked` lands consistently.
  - `ApprovalState`, `Approval`, `ApprovalSink`, `ApprovalVote`:
    identical across PRD § 5.3 / TECH-SPEC § 3.3 / 009 § 1.3.
  - `ExecuteContext`, `SideEffect<T>`, `ExecuteResult<T>`,
    `execute()`: identical across PRD § 5.4 / TECH-SPEC § 3.4 /
    009 § 1.4. `outcome: 'executed' | 'replayed' |
    'short_circuited'` matches.
  - `AuditEventType`, `AuditEntry`, `AuditStore`: identical
    across PRD § 5.5 / TECH-SPEC § 3.5 / 009 § 1.5.
  - `RollbackHint`, `rollbackHint()`: identical across PRD § 5.6 /
    TECH-SPEC § 3.6 / 009 § 1.6.
  - `EvidenceBundle`, `EvidenceExporter`: identical across PRD
    § 5.7 / TECH-SPEC § 3.7 / 009 § 1.7. The optional
    `evidence.sign?` is forward-compatible with E3+ KMS work
    per 009 § 5.5.
  - `HarnessConfig`, `createHarness`, `HarnessError`: identical
    across PRD § 5.8 / TECH-SPEC § 3.8 / 009 § 1.8 with the
    addition of the `GW_DBTRANSACTION_DUPLICATE` code per
    librarian P1.
  This is the closest contract-to-spec fidelity I've reviewed
  in a pre-code IS audit. The `010-DR-MEMO-harness-runtime-rev.md`
  deviation rule per `009 § 11` is the long-term lock that
  prevents drift; until E3 lands, the contract is binding on
  paper.
- **Recommendation:** None. When E3 ships, add a CI check that
  diffs `packages/harness/src/index.ts` against the PRD § 5
  excerpts; on mismatch, fail the build with a pointer at the
  deviation rule.
- **Cite:** `009 § 1.1-1.8` + `009 § 11`,
  `02-PRD.md:323-666` (§ 5.1-5.8),
  `05-TECHNICAL-SPEC.md:142-521` (§ 3.1-3.8).

### F-2 — Hash-chain claim is honestly scoped per D-019 — tamper-evidence claim and the role-separation defence-in-depth
- **Severity:** PASS
- **Section:** `02-PRD.md` § 5.5 + `05-TECHNICAL-SPEC.md` § 8.2
  + § 8.5 + `004-DR-DEC` D-019 + `009 § 2`.
- **Finding:** Pre-D-019, the blueprint claimed tamper-evidence
  against compromised harness DBs. The pre-audit red team
  F-RT-5.1 demonstrated the claim was wider than the
  architecture defends — a privileged DBA can rewrite an entire
  tenant's chain consistently, and `verifyChain` cannot detect
  it (linear hash chain re-walks from `prev_hash` and
  recomputes; consistent rewrite re-verifies). D-019 fixes the
  scoping: tamper-resistant against an outsider; tamper-evident
  against an unprivileged operator; defence-in-depth via
  Postgres role separation against a privileged DBA — NOT
  cryptographic tamper-evidence against a compromised
  schema-owner. The defence-in-depth posture is three roles:
  - `audit_writer` — INSERT-only on `audit_entries`. Harness
    runs as this role.
  - `audit_reader` — SELECT-only. `verifyChain` runs as this
    role.
  - `audit_owner` — DDL/GRANT only. Held by a separate
    operational identity outside the harness process.
  Residual risk: privileged DBA with `audit_owner` role still
  bypasses. Trigger for E3+ external commitment surface
  (KMS-signed checkpoints, customer-controlled lock store). The
  honest scoping is the right answer; the claim is defensible
  on its own terms now. From this lane's perspective, this is
  the property D-019 closes correctly.
- **Recommendation:** Cross-references `architect-reviewer` F-7
  and `security-auditor` F-3 — both lanes recommend that E1
  exit criteria assert role-separation testcontainers integration
  test (`audit_writer` cannot UPDATE / DELETE
  `audit_entries`). I endorse from this lane: without that
  E1-close test, the D-019 prose claim is paper, not runtime.
  Add it.
- **Cite:** `004-DR-DEC` D-019, `02-PRD.md:558-575`,
  `05-TECHNICAL-SPEC.md:404-426` + § 8.5,
  `02-RED-TEAM-PANEL.md` F-RT-5.1, `architect-reviewer` F-7,
  `security-auditor` F-3.

### F-3 — Idempotency two-key model is intact; `Plan.wire.dbTransactionId` TTL story per `009 § 4.5` is unstated in the blueprint
- **Severity:** CHALLENGE
- **Section:** `02-PRD.md` § 5.4 + `05-TECHNICAL-SPEC.md`
  § 3.4.1 + `009 § 4.5`.
- **Finding:** The two-key model (`gwh1:` harness-side, no
  prefix wire-side) is consistent across PRD / TECH-SPEC /
  ARCHITECTURE per the `guidewire-api-archaeologist` F-1
  finding. **What's missing:** the TTL story. `009 § 4.5`
  declared:

  > "Keys are pruned after the customer-profile-configured
  > retention window (default 30 days). After pruning, the same
  > intent is treated as new — which is correct, because at
  > that point a retry is effectively a fresh authorization.
  > Pruning is a maintenance audit event
  > (`'idempotency.pruned'`). The harness-side `gwh1:` key TTL
  > is independent of any TTL Guidewire applies to
  > `GW-DBTransaction-ID` (sandbox-confirm at `guidewire-adj`)."

  PRD § 5.4 doesn't mention the TTL or the `idempotency.pruned`
  audit event. ARCHITECTURE § 3.3 (audit plane) doesn't list
  `idempotency.pruned` in the `AuditEventType` union (PRD § 5.5
  carries 9 event types: plan.created, policy.decided,
  approval.requested, approval.decided, execute.started,
  execute.completed, execute.failed, execute.replayed,
  rollback.hint.issued — no `idempotency.pruned`). When E3
  ships and the harness reaches 30 days of accumulated
  `idempotency_keys` rows, pruning needs to start. If
  `idempotency.pruned` isn't in the `AuditEventType` union, the
  audit hash chain doesn't carry a record of the pruning
  decision — operationally fine (pruning isn't a write to
  Guidewire), but it breaks the principle that *every harness
  decision lands in audit*.
- **Recommendation:** Add `idempotency.pruned` to the
  `AuditEventType` union in PRD § 5.5 + TECH-SPEC § 3.5. Add a
  one-paragraph TTL story to PRD § 5.4 (post the
  short-circuit narrative):

  > "Idempotency-key TTL. The `gwh1:` harness-side keys are
  > pruned after a customer-profile-configured retention window
  > (default 30 days; configurable in `profile.yaml`). After
  > pruning, the same intent is treated as new (a retry is then
  > a fresh authorization). Pruning is a maintenance audit
  > event (`idempotency.pruned`) recorded in the per-tenant
  > chain so the prune decision is forensic-reviewable. The
  > harness-side TTL is independent of any Guidewire-side TTL
  > on `GW-DBTransaction-ID` (sandbox-confirm at first
  > integration engagement)."

  ~20 min edit.
- **Cite:** `009 § 4.5`, `02-PRD.md:533-549` (§ 5.5
  AuditEventType union), `02-PRD.md:482-522` (§ 5.4),
  `05-TECHNICAL-SPEC.md` § 3.4 + § 3.5.

### F-4 — `approvals` table DDL is mentioned in `009 § 1.3` ("approvals persist in Postgres") but the schema doesn't land in TECH-SPEC § 8.2
- **Severity:** CHALLENGE
- **Section:** `05-TECHNICAL-SPEC.md` § 8.2 (audit hash-chain
  DDL) + `009 § 1.3` (approvals state machine in Postgres).
- **Finding:** The Mode A memo declared approvals persist in
  Postgres so a restart, network partition, or CLI session
  ending mid-wait does not lose the request. PRD § 5.3 carries
  the `Approval` interface verbatim. `009 § 11` committed:
  *"the failure table in § 6 becomes the test matrix in
  `packages/harness/test/failure-modes.test.ts`."* But the
  `approvals` table DDL itself is not in TECH-SPEC § 8.2 — only
  the `audit_chain_heads` and `audit_entries` tables are
  surfaced. From a harness-correctness perspective, the
  approvals state machine (pending → approved/denied/expired/
  cancelled) is a load-bearing primitive for `approved_execute`;
  the DDL needs to be in the blueprint at the same level of
  detail as the audit chain, otherwise E3 implementation
  re-derives the schema from the TS interface and may diverge.
- **Recommendation:** Extend TECH-SPEC § 8.2 with the
  `approvals` table DDL:

  ```sql
  CREATE TABLE approvals (
    approval_id      TEXT PRIMARY KEY,        -- sha256(planId + nonce)
    tenant_id        TEXT NOT NULL,
    plan_id          TEXT NOT NULL,
    decision_id      TEXT NOT NULL,
    state            TEXT NOT NULL,           -- pending/approved/denied/expired/cancelled
    requested_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at       TIMESTAMPTZ NOT NULL,
    approver_votes   JSONB NOT NULL DEFAULT '[]',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, plan_id)
  );

  CREATE INDEX approvals_pending_idx ON approvals (tenant_id, state)
    WHERE state = 'pending';
  ```

  The partial index on `(tenant_id, state) WHERE state =
  'pending'` is the hot-path query for the CLI's `approve`
  command and the harness's `wait()` polling. Add to PRD § 5.3
  a note: *"DDL in TECH-SPEC § 8.2."* ~20 min edit; pays back
  in E3 implementation clarity.
- **Cite:** `009 § 1.3` "approvals persist in Postgres",
  `05-TECHNICAL-SPEC.md:1235-1265` (§ 8.2 audit DDL),
  `02-PRD.md:415-453` (§ 5.3 Approval interface).

### F-5 — Hot-path latency story (`009 § 10.1`) is unaddressed — chain-head serialization under high concurrency
- **Severity:** NOTE
- **Section:** `009 § 10.1` (open question deferred to E3+) +
  `05-TECHNICAL-SPEC.md` § 8.2 (single-writer per tenant via
  `FOR UPDATE` on `audit_chain_heads`).
- **Finding:** The Mode A memo § 10.1 named the open question:
  *"Hot-path latency under concurrent appends. The single chain
  head per tenant serializes writes. For very high tenants
  (claims-heavy carriers approaching 1000+ writes/min) this may
  need either chain-head sharding (per-(tenant, sub-chain)) or
  a batched commit strategy. Pre-spec only — measure first."*
  The blueprint's TECH-SPEC § 8.2 carries the single-writer
  property correctly (`SELECT ... FOR UPDATE` on
  `audit_chain_heads`); concurrent appends serialize on the
  chain head row. For most carriers this is fine — operator-
  driven workloads are low QPS, high care. For a claims-heavy
  carrier processing 1000+ writes/min, the chain head becomes
  the bottleneck. Not load-bearing for E1-E8; load-bearing only
  for high-volume customer engagements.
- **Recommendation:** Defer per `009 § 10.1`. Add to
  `07-ROADMAP.md` § "Distribution metrics worth tracking" (or a
  new "Operational metrics" section) a single line: *"Chain-
  head latency (p99 audit append duration per tenant) — observe
  via `harness.audit.write` span attribute; threshold for
  chain-head sharding research is 1000+ writes/min sustained
  per tenant."* This makes the property *observable* via the
  existing OTel spans (per TECH-SPEC § 4) without committing the
  E3 timeline to optimization work. ~10 min.
- **Cite:** `009 § 10.1`, `05-TECHNICAL-SPEC.md:1267-1276`
  (§ 8.2 append protocol), `07-ROADMAP.md:617-625`.

### F-6 — `Approval.expiresAt` notification surface (red team F-RT-5.2) cross-references `security-auditor` F-5
- **Severity:** PASS-with-followup
- **Section:** `02-PRD.md` § 5.3 (Approval state machine) +
  `02-RED-TEAM-PANEL.md` F-RT-5.2 + `009 § 6` (failure table
  row "Approval timeout").
- **Finding:** From a harness-runtime perspective the contract
  is correct: `approvals.wait()` returns `state: 'expired'`;
  the harness writes an `approval.decided` audit entry with
  `outcome: expired`; no auto-approval bypass per `009 § 3.4`.
  The state machine + audit emission satisfy the
  harness-correctness rubric. **Followup:** the red team's
  F-RT-5.2 attack is one level upstream — *the operator finds
  out at month-end review when the audit shows 47 expired
  approvals*. The red-team recommendation was to commit at
  TECH-SPEC § 4 to *signal availability* (pino WARN, AppError
  code, Sentry fingerprint) without committing to *delivery*
  (Slack / PagerDuty / ntfy is the carrier's responsibility).
  The `security-auditor` lane raised the same finding (F-5 in
  that memo) and recommended the same fix.
- **Recommendation:** Endorse `security-auditor` F-5 from this
  lane. The harness commitment to *signal availability* lives at
  TECH-SPEC § 4.5; the carrier wires *delivery*.
- **Cite:** `02-PRD.md:415-453` (§ 5.3),
  `02-RED-TEAM-PANEL.md` F-RT-5.2, `009 § 6` failure-table row,
  `security-auditor` F-5.

### F-7 — Library-vs-CLI parity per `009 § 9` is preserved in the blueprint at the contract level; full CLI command mapping deferred to E3
- **Severity:** PASS
- **Section:** `02-PRD.md` § 5 references CLI commands;
  `009 § 9` carries the full mapping; `03-ARCHITECTURE.md`
  § 5.3 step 4 narrates the CLI / library overlap.
- **Finding:** The Mode A memo § 9 declared library-vs-CLI
  parity as a contract: same semantics, two skins. The library
  is the substrate; the CLI is a narrow shell. PRD § 5 + the
  ROADMAP § E3 demo path show the CLI commands
  (`guidewire-harness plan|policy|approve|execute|audit-verify|
  evidence-export`) without re-deriving the mapping. ARCHITECTURE
  § 5.3 step 4 narrates the parity at the
  `approved_execute` flow — CLI mode and library mode both
  write to the same `approvals` row, the wait/decide are the
  same Postgres operations. The blueprint trusts `009 § 9` as
  the canonical reference. That's the right shape — re-deriving
  the CLI mapping in the blueprint would create drift risk
  against `009`.
- **Recommendation:** None. When E3 lands the CLI, run the
  parity test: every library call has a CLI equivalent;
  `guidewire-harness <command> --help` output round-trips
  through `009 § 9`'s table. Consider adding to
  `07-ROADMAP.md` § E3 exit criteria a row asserting the
  parity test exists.
- **Cite:** `009 § 9`, `02-PRD.md` § 5, `07-ROADMAP.md` § E3,
  `03-ARCHITECTURE.md:660-695`.

## Summary

Recommended actions in priority order:

1. **F-3 (CHALLENGE):** add `idempotency.pruned` event type +
   TTL story to PRD § 5.4 / § 5.5 + TECH-SPEC § 3.5. Closes
   `009 § 4.5`. ~20 min.
2. **F-4 (CHALLENGE):** extend TECH-SPEC § 8.2 with the
   `approvals` table DDL. Pays back in E3 clarity. ~20 min.
3. **F-5 (NOTE):** add chain-head-latency observability to
   ROADMAP § "Operational metrics". ~10 min.

PASS endorsements (F-1, F-2, F-7, and via cross-reference F-6)
are the harness-correctness properties that make this artifact
credible to a CISO + SOC 2 auditor on first read. The TS
contract fidelity (F-1) and the honestly-scoped tamper-evidence
claim post-D-019 (F-2) are the load-bearing ones.

E1 is unblocked from this lane; E3 implementation work is
unblocked subject to F-3 + F-4 landing as schema additions
before the corresponding code work begins.

jeremylongshore.com made me do it
  -claude
intentsolutions.io
