# 03-AR — Architectural review

**Auditor:** `architect-reviewer`
**Date:** 2026-05-04
**Target:** `00-MASTER-BLUEPRINT.md`, `03-ARCHITECTURE.md` (entire),
`05-TECHNICAL-SPEC.md` § 2 package layout + § 7 build/deploy,
`07-ROADMAP.md` epic dependency graph, `09-DR-DIAG-architecture.md`,
`004-DR-DEC` decisions D-002 / D-003 / D-004 / D-013 / D-019.
**Scope:** layering soundness, system boundaries, package
responsibilities, dependency direction, scaling posture, epic
sequencing, SOLID adherence at the macro level. **Out of scope:**
Cloud API correctness (`guidewire-api-archaeologist`), per-tool
blast radius (`mcp-safety-reviewer`), audit chain semantics
(`harness-runtime-architect`). I read those memos but defer.

---

## Verdict

**PASS-WITH-NOTES.** The 5-layer model is sound, the boundaries
are physical (depcruise + AST + escape-scan rules), and the
dependency direction is enforceable in CI. The harness-as-library
decision (D-003) and the per-suite server cut (D-002) both survive
contact with the rest of the document set; nothing in PRD § 3 or
ROADMAP epic exits demands a structure the architecture doesn't
support. The findings below are layering polish, not structural
breaks. None blocks E1.

## Findings

### F-1 — Layered model is physical, not advisory
- **Severity:** PASS
- **Section:** `03-ARCHITECTURE.md` § 2 (layered model) + § 4
  (boundaries table) + `05-TECHNICAL-SPEC.md` § 2.1 (per-package
  contracts) + § 4.7 (architecture rule enforcement).
- **Finding:** The blueprint enforces every layer boundary in CI via
  three orthogonal mechanisms — depcruise import-graph rules, AST
  call-site analysis, and escape-scan path globs. The combination
  catches both naïve violations (`servers/foo` imports
  `clients/bar` directly) and clever ones (inline `fetch()` that
  bypasses the client layer; `console.log` in production paths;
  `latest/` URLs that drift silently). The 13-row "forbidden table"
  in § 4 with REFUSE/CHALLENGE/FLAG severity tags is the right
  shape: enforcement gradient, not all-or-nothing. This is the
  single highest-leverage architectural property in the blueprint.
  Few staffed-audit reviewers see a layered architecture this
  rigorously enforced before any code lands.
- **Recommendation:** None. Keep the boundaries table as the
  living artifact when E1 wires the rules; refresh on each new
  package, not on each new file.
- **Cite:** `03-ARCHITECTURE.md:546-574`, `05-TECHNICAL-SPEC.md`
  § 4.7, `009-DR-MEMO § 8.1-8.2`.

### F-2 — `packages/harness/` legitimate read into `guidewire-client` is a layering exception that needs its own boundary contract
- **Severity:** CHALLENGE
- **Section:** `05-TECHNICAL-SPEC.md` § 2.1 per-package contract row
  for `packages/harness/`.
- **Finding:** The per-package allowed-imports table grants the
  harness "(read-only — write injection is the sole exception)"
  access to `packages/guidewire-client/`. The exception is correct
  by intent — the harness is the gate; `harness.execute()` calls
  the client's write methods inside an `execute()` callback that
  carries the policy decision + approval. But the table prose has
  no machine-readable encoding of the "read-only except for
  injection" carve. Depcruise can enforce "harness imports client";
  it cannot enforce "harness imports client only via execute()".
  The AST call-site rule in § 4.7 row 6 (`GW-DBTransaction-ID`
  injection only in `packages/guidewire-client/`) is adjacent but
  doesn't directly police the harness→client read shape. A future
  contributor can add a new `harness/src/foo.ts` that imports
  `guidewire-client` and calls a write method outside an `execute()`
  block, and the existing rules pass.
- **Recommendation:** add a 14th row to the § 4 boundaries table:
  *"Calls into `packages/guidewire-client/**`'s write-shaped methods
  (HTTP `POST`/`PUT`/`PATCH`/`DELETE`) outside an `execute()`
  callback, including from `packages/harness/**` itself"* — REFUSE.
  The AST rule in `009 § 8.2` already describes this; surface it in
  the architecture doc's boundaries table so the layering rule and
  the enforcement are co-located.
- **Cite:** `05-TECHNICAL-SPEC.md:107`, `009-DR-MEMO § 8.2`,
  `03-ARCHITECTURE.md:557` (rule 1).

### F-3 — Build order in § 7.1 reproduces the dependency direction; verify pnpm topo derives it
- **Severity:** NOTE
- **Section:** `05-TECHNICAL-SPEC.md` § 7.1 (build order).
- **Finding:** The declared build order is
  `schemas → observability → audit → auth → guidewire-client →
  harness → servers/* → clients/*`. That order is correct
  (downstream deps first, harness before servers, servers before
  vendor clients) and matches the per-package contracts table. But
  the order is asserted — `pnpm` derives topological order from
  per-package `package.json` `dependencies`. If a package's
  `package.json` declares the wrong dep set, the documented order
  silently disagrees with the executed order. The mismatch surfaces
  as "build green locally, breaks on a fresh CI" — the worst
  failure mode for a foundational package.
- **Recommendation:** When E1 lands, add a CI step
  `pnpm -r ls --depth=0 | <validator>` that asserts the topological
  order matches the documented one. Trivial check; catches the
  failure mode before a downstream package consumes a stale build
  artifact. Or: drop the documented order from § 7.1 and let pnpm
  be the single source of truth, with a comment pointing readers
  at `pnpm -r ls`.
- **Cite:** `05-TECHNICAL-SPEC.md:1154-1162`.

### F-4 — Cowork-fork derivatives inherit `packages/harness/` verbatim — but the package version-pin discipline is unstated
- **Severity:** CHALLENGE
- **Section:** `02-PRD.md` § 7.2 (what stays unchanged) + § 7.3
  (the lesson) + `04-USER-JOURNEY.md` J-5.
- **Finding:** The fork-starter copies `packages/harness/`,
  `packages/audit/`, `packages/observability/`, `packages/schemas/`
  unchanged. PRD § 7.2 says "harness package stays the durable
  moat." J-5 § "Audit + idempotency" says "the fork inherits the
  harness verbatim." But the copy mechanism is `pnpm guidewire init
  <domain>` per § 7.1 step 1 — a literal directory copy. That makes
  every fork a *vendored* copy of the harness at the time of init,
  not a dep-pinned consumer of `@intentsolutions/guidewire-harness`
  on npm. When the harness ships v1.1.0 with a CVE patch, every
  fork that took the v1.0.0 vendored copy is now stale, and there
  is no upgrade path documented. This is exactly the failure mode
  `/sync-testing-harness` solves for `@intentsolutions/audit-harness`
  in the broader IS ecosystem; the harness package faces the same
  drift risk and has no stated solution.
- **Recommendation:** Decide and document one of two stances:
  (a) the cowork-fork-starter installs `packages/harness/` as a
  `workspace:*` dep that resolves to the published
  `@intentsolutions/guidewire-harness` package — copies the
  *consumer* shape, not the source. The fork updates by `pnpm up`.
  (b) the fork vendors the source at init time and accepts drift;
  the fork-starter README explicitly directs cohort members to
  `pnpm guidewire upgrade-harness` (a future tool) periodically.
  Either is defensible; the current "stays unchanged" framing
  papers over the upgrade story.
- **Cite:** `02-PRD.md:1006-1037`, `04-USER-JOURNEY.md:653-682`,
  `07-ROADMAP.md` E4 exit criteria.

### F-5 — Per-tenant process isolation (§ 7.2) is the right shape; cold-start latency under Cloud Run is unaddressed
- **Severity:** NOTE
- **Section:** `03-ARCHITECTURE.md` § 7.2-7.3 (multi-tenant +
  Cloud Run deploy).
- **Finding:** "One server instance per profile" is the correct
  multi-tenant story for an OSS that doesn't ship a control plane.
  Per-tenant process means per-tenant chain, per-tenant Hub OAuth,
  per-tenant queue shard — clean isolation. Cloud Run is a
  reasonable default. The architectural footnote acknowledges
  cold-start ("acceptable because tool calls are operator-driven,
  low QPS, high care") but doesn't quantify or test the property.
  An MGA hosting 12 carriers runs 12 services. If 11 of them are
  cold most of the day, the operator-perceived "first call latency"
  per-carrier is dominated by Cloud Run cold-start, which under
  Node 22 + a moderately-sized npm graph is 800ms-2s typical, more
  with native modules (pg, undici, opentelemetry). For a pilot
  carrier whose first impression is the agent, that's the wrong
  bound.
- **Recommendation:** Add a "Cold-start posture" subsection to
  § 7.3 or to `05-TECHNICAL-SPEC.md` § 7.3. Options to surface:
  (1) Cloud Run min-instances=1 per active carrier (cost vs latency
  trade); (2) keep Cloud Run, accept cold-start, document the
  warmup smoke endpoint that ops can hit on a schedule; (3) for
  multi-tenant SI deployments, recommend a single GKE cluster with
  per-tenant pods (different deployment shape, no cold-start). The
  decision is not blocking; the silence is.
- **Cite:** `03-ARCHITECTURE.md:752-772`, `05-TECHNICAL-SPEC.md`
  § 7.3.

### F-6 — Epic dependency soundness: ROADMAP is consistent; E2.5 / E5 / E11+ trail dependencies are correct
- **Severity:** PASS
- **Section:** `07-ROADMAP.md` epic table + `06-STATUS.md`
  dependency graph.
- **Finding:** I walked the dependency graph: E1 → {E2, E3} → {E4,
  E5, E6, E7, E8, E9, E10} → E11+; E2.5 correctly gates on D-017
  (UWCenter sandbox breadth) + D-020 (profile schema v2.0); E5
  correctly takes the slipped-from-E2 ⚠ tools; E10 correctly
  depends on E4 for the `_template/` profile shape; E11+ correctly
  depends on E1 + E3 + E4 for the marketplace publish artifact.
  The reconcile-vs-payments carve in D-018 keeps E8 deliverable
  without entangling money movement. The "out-of-scope" list per
  epic catches the failure mode I look for first (an epic that
  silently absorbs scope from a downstream epic). This is the
  cleanest epic dependency graph I've reviewed in an Intent
  Solutions repo at the staffed-panel stage.
- **Recommendation:** None. Hold the line on E11+ being
  marketplace-only; an attractive temptation in a staffed-panel
  pass is to absorb additional content into E11+ ("while we're
  there"). Don't.
- **Cite:** `07-ROADMAP.md:14-39`, `06-STATUS.md:96-122`.

### F-7 — D-019 fixes the audit-chain claim honestly, but the role-separation runtime is E1, the *commitment* surface is E3+ — make sure E1 doesn't silently re-broaden the claim
- **Severity:** CHALLENGE
- **Section:** `004-DR-DEC` D-019 + `02-PRD.md` § 5.5 +
  `05-TECHNICAL-SPEC.md` § 8.2 / § 8.5.
- **Finding:** The pre-audit red team panel produced D-019, which
  scopes the audit-chain claim honestly: tamper-resistant against
  outsiders + unprivileged operators, defence-in-depth via Postgres
  role separation against privileged DBAs, NOT cryptographically
  tamper-evident against a compromised schema-owner. The
  prose updates in PRD § 5.5 + TECH-SPEC § 8.2 / § 8.5 reflect
  the new scope. **The risk:** D-019 is correct *now*, but E1
  ships the runtime. When the `packages/audit/` migration goes
  in (E1), there's a real possibility that the role-separation
  implementation is incomplete (e.g. `audit_writer` role granted
  but never tested for INSERT-only constraint; `audit_owner`
  role doc'd but not split out from a DBA who has both roles).
  If E1 ships role separation half-implemented, the runtime
  silently re-broadens the threat surface back to where the
  pre-audit red team flagged it. Architectural risk: the
  decision-log honesty doesn't carry into runtime correctness
  unless E1 verifies it.
- **Recommendation:** Add a row to `07-ROADMAP.md` § E1 exit
  criteria: *"`packages/audit/migrations/0001_init.sql` includes
  `audit_writer` (INSERT-only), `audit_reader` (SELECT-only),
  `audit_owner` (DDL/GRANT) Postgres roles; testcontainers L4
  test asserts that `audit_writer` cannot UPDATE or DELETE
  `audit_entries` (raises permission denied). The harness process
  runs as `audit_writer` only — verified by an integration test."*
  This makes the D-019 prose claim binding on E1 implementation.
  Without it, the staffed-audit pass declares D-019 honest, then
  E1 ships, and the runtime re-creates the gap.
- **Cite:** `004-DR-DEC` D-019, `02-PRD.md:558-575`,
  `05-TECHNICAL-SPEC.md:404-426` + § 8.5,
  `02-RED-TEAM-PANEL.md` F-RT-5.1.

## Summary

Recommended actions in priority order:

1. **F-7 (CHALLENGE):** add to `07-ROADMAP.md` § E1 exit criteria
   the role-separation testcontainers assertion. Makes the D-019
   claim binding at E1 close. ~30 min edit; large architectural
   yield.
2. **F-2 (CHALLENGE):** add the 14th boundary-table row in
   `03-ARCHITECTURE.md` § 4 codifying the "harness writes only via
   `execute()` callback" rule, with cross-link to `009 § 8.2`.
   ~15 min edit.
3. **F-4 (CHALLENGE):** decide vendored-vs-published harness for
   cowork forks; document in `02-PRD.md` § 7.2 + `04-USER-JOURNEY.md`
   J-5. ~30 min decision + edit.
4. **F-3 (NOTE):** add the topological-order CI assertion to E1's
   exit criteria, OR drop the asserted build order from
   `05-TECHNICAL-SPEC.md` § 7.1 in favor of a pointer at
   `pnpm -r ls`. ~15 min.
5. **F-5 (NOTE):** add a "Cold-start posture" subsection naming
   the trade-off, even if the decision is "accept default Cloud
   Run cold-start." ~20 min.

PASS endorsements (F-1, F-6) are durable — the layering enforcement
mechanism and the epic dependency graph are the two strongest
properties of the blueprint from an architectural perspective.
Neither needs maintenance other than to keep the patterns alive
as code lands.

E1 is unblocked from this lane subject to F-7's exit-criteria
addition; the rest are CHALLENGEs that resolve with edits, not
re-design.

jeremylongshore.com made me do it
  -claude
intentsolutions.io
