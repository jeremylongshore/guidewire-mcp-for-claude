# 00-AUDIT-RESPONSES — GW-1.8 staffed audit panel summary + GW-1.9 response stubs

**Filed:** 2026-05-04
**Status:** Panel filed (GW-1.8 close); response stubs await
GW-1.9 author edits.
**Inputs:** the 11 staffed-panel memos at
[`./03-AR-architecture-review.md`](./03-AR-architecture-review.md)
through
[`./13-FC-fact-check.md`](./13-FC-fact-check.md), plus the three
pre-audit gauntlet passes:
[`./00-LIBRARIAN-CITATION-AUDIT.md`](./00-LIBRARIAN-CITATION-AUDIT.md),
[`./01-CONSISTENCY-AUDIT.md`](./01-CONSISTENCY-AUDIT.md),
[`./02-RED-TEAM-PANEL.md`](./02-RED-TEAM-PANEL.md).

---

## How this document works

This file is the **single audit-response register** for the
GW-1.8 staffed panel. Every CHALLENGE / FAIL across the 11 memos
becomes a row below with a status of `open` (the panel filed it
and GW-1.9 has not yet acted on it), `accepted` (GW-1.9
explicitly accepted the finding-as-stated with a rationale, no
edit), or `fixed` (GW-1.9 landed a blueprint edit; row links to
the PR). NOTEs are flagged for GW-1.9 awareness but do not
require a row unless escalated. PASSes are recorded in the
panel-summary table for completeness.

Per `audits/README.md` § "Gate criteria — when E1 unblocks":
- All 11 memos filed ✓
- Every flag triaged → tracked here
- CHALLENGEs resolved by edit OR explicit acceptance with
  rationale below
- No FAIL flags open
- Updated blueprint re-reviewed by `architect-reviewer` +
  `article-consistency-checker` after edits land

---

## Panel summary — one-line verdict per auditor

| # | Memo | Auditor | Verdict |
|---|---|---|---|
| 1 | [03-AR](./03-AR-architecture-review.md) | architect-reviewer | PASS-WITH-NOTES — layering enforcement + epic graph endorsed; one E1 exit-criterion add (role-separation testcontainers test); cowork-fork harness upgrade path needs decision |
| 2 | [04-SA](./04-SA-security-review.md) | security-auditor | PASS-WITH-NOTES — `no audit = no write` + two-key idempotency endorsed; 4 hardening edits (revocation latency, `audit_owner` operational identity, approval-timeout signal availability, BAA carve runtime check) |
| 3 | [05-BA](./05-BA-backend-review.md) | backend-architect | PASS-WITH-NOTES — TS contracts + per-package boundaries endorsed; manifest schema + per-tenant OAuth lifecycle need explicit sections before E1 packages ship |
| 4 | [06-DA](./06-DA-docs-review.md) | docs-architect | PASS-WITH-NOTES — reading-order + librarian KB endorsed; `audits/README.md` renumber + `000-INDEX.md` + CONTRIBUTING section list pending |
| 5 | [07-BZ](./07-BZ-business-review.md) | business-analyst | PASS-WITH-NOTES — four-audience model + payments carve + inbound framing endorsed; CIO cost-bounding + cowork-fork-vs-SI margin language needed |
| 6 | [08-MS](./08-MS-mcp-safety-review.md) | mcp-safety-reviewer | PASS-WITH-NOTES — three-mode harness gate + OSS demo default-deny + canary contract + payments-mcp repo-level carve endorsed; manifest mode + BAA runtime check + read-only refusal ordering need edits |
| 7 | [09-CV](./09-CV-vocabulary-review.md) | carrier-vocabulary-curator | PASS-WITH-NOTES — D-016 discipline + Persona-9 manager tranche + producer density endorsed; events-mcp role disambiguator + "waiting on me" projection clarification + tool-description-shape rule needed |
| 8 | [10-GA](./10-GA-guidewire-api-review.md) | guidewire-api-archaeologist | PASS-WITH-NOTES — two-key idempotency + Composite-vs-Graph + `primaryObject.id` shard endorsed; read-after-write `confirmWrite()` + admin-scope OAuth threat row + Address shape gotcha need edits |
| 9 | [11-HR](./11-HR-harness-review.md) | harness-runtime-architect | PASS-WITH-NOTES — TS contract fidelity + D-019-honest hash-chain + library/CLI parity endorsed; `idempotency.pruned` event + TTL story + `approvals` DDL need additions |
| 10 | [12-CC](./12-CC-consistency-review.md) | article-consistency-checker | PASS-WITH-NOTES — librarian P1-P5 cross-doc consistency + diagram agreement endorsed; epic-count + sandbox-terminology + `audits/README.md` numbering edits pending |
| 11 | [13-FC](./13-FC-fact-check.md) | fact-checker | PASS-WITH-NOTES — release versioning + App Events + `GW-DBTransaction-ID` + pagination + commission endpoint all AUTHORITATIVE; ProNavigator date precision is the only NOTE |

## Aggregate counts

| Severity | Count |
|---|---|
| FAIL | 0 |
| CHALLENGE | 25 |
| NOTE | 14 |
| PASS | 32 |
| **Total findings** | **71** |

(Counts include only the 11 staffed memos, not the 3 pre-audit
passes, which produced 2 FAILs that were resolved via D-019 +
D-020 before this panel ran.)

## Verdict

**The panel passes the GW-1.8 gate.** No FAILs were filed; the
2 pre-audit FAILs (audit-chain tamper-evidence claim
F-RT-5.1 → D-019; profile-schema E2.5 gap F-RT-9.1 → D-020) are
already resolved. Every staffed-panel memo lands at
PASS-WITH-NOTES — meaning the auditor endorses the design with
specific recommendations that do not block E1. The 25
CHALLENGEs cluster around four cross-cutting themes:
1. **Manifest schema** — backend-architect F-3, mcp-safety F-5,
   carrier-vocabulary F-6, and `architect-reviewer` F-2's
   harness-write-call boundary all converge on a single
   `02-PRD.md § 3.0` addition that codifies the tool manifest
   shape including `mode`, `requiredProfileSchema`, description
   format, and write-call-only-via-`execute()` discipline.
2. **Audit-DB role separation runtime check** —
   `architect-reviewer` F-7 + `security-auditor` F-3 +
   `harness-runtime-architect` F-2 endorse adding to E1 exit
   criteria a testcontainers integration test asserting the
   `audit_writer` Postgres role cannot UPDATE / DELETE
   `audit_entries`. Makes D-019 binding at runtime.
3. **Doc-set hygiene** — `docs-architect` F-2 / F-3 / F-4 / F-6 +
   `consistency-checker` F-3 / F-4 / F-7 cluster around: renumber
   `audits/README.md`, normalize D-NNN anchors, sandbox
   terminology pass per D-021, verify F-CON-001/002/003 fixes
   merged, add `000-INDEX.md`.
4. **Hardening edits with named cross-references** — revocation
   latency (security F-2), approval-timeout signal availability
   (security F-5 + harness F-6), BAA carve runtime check
   (security F-6 + mcp-safety F-6), `audit_owner` operational
   identity (security F-3), read-after-write `confirmWrite()`
   (api-archaeologist F-6), `idempotency.pruned` event +
   `approvals` DDL (harness F-3 + F-4).

**Recommendation to GW-1.9:** treat the four cross-cutting themes
as a single working set; address them in that order. The
manifest schema is the highest-leverage edit (cross-cuts five
findings); the audit-DB testcontainers test is the highest-
leverage E1-runtime commitment (cross-cuts three findings).
Doc-set hygiene is the most mechanical (largely single-string
replaces); hardening edits are the most prose-heavy.

E1 (`guidewire-4rd` / GH #3) **unblocks** when:
- All CHALLENGE rows below are either `fixed` or `accepted`.
- The doc-set hygiene rows are `fixed`.
- The audit-DB role-separation test is added to E1 exit
  criteria.
- `architect-reviewer` + `article-consistency-checker` re-pass
  signs off on the post-edit blueprint per
  `audits/README.md` § "Gate criteria".

---

## Response stubs (one row per CHALLENGE / FAIL)

> **GW-1.9 instructions:** for each row, set status to
> `open` / `accepted` / `fixed`. If `fixed`, link the PR. If
> `accepted`, write 2-4 sentences of rationale.

### Theme 1 — Manifest schema cluster

| ID | Memo | Severity | Title | Status | Rationale / PR |
|---|---|---|---|---|---|
| AR-2 | [03-AR](./03-AR-architecture-review.md#f-2) | CHALLENGE | Add 14th boundary-table row codifying harness writes-only-via-`execute()` | open | |
| BA-3 | [05-BA](./05-BA-backend-review.md#f-3) | CHALLENGE | Add canonical `ToolManifestEntry` schema to PRD § 3.0 + Zod schema in TECH-SPEC § 3 | open | |
| MS-5 | [08-MS](./08-MS-mcp-safety-review.md#f-5) | CHALLENGE | Make manifest-schema `mode` field load-bearing (boot validation + runtime mode parity) | open | |
| CV-3 | [09-CV](./09-CV-vocabulary-review.md#f-3) | CHALLENGE | Add `roles.yaml`-as-disambiguator paragraph to PRD § 3.5 (events-mcp) | open | |
| CV-6 | [09-CV](./09-CV-vocabulary-review.md#f-6) | CHALLENGE | Add tool-description-shape rule (`<question> · <when-to-use>`) to PRD § 3.0 | open | |

### Theme 2 — Audit-DB role separation runtime check

| ID | Memo | Severity | Title | Status | Rationale / PR |
|---|---|---|---|---|---|
| AR-7 | [03-AR](./03-AR-architecture-review.md#f-7) | CHALLENGE | Add E1 exit-criterion: testcontainers test asserts `audit_writer` cannot UPDATE/DELETE | open | |
| SA-3 | [04-SA](./04-SA-security-review.md#f-3) | CHALLENGE | Specify operational identity for `audit_owner` in TECH-SPEC § 8.2 | open | |
| HR-2 | [11-HR](./11-HR-harness-review.md#f-2) | (PASS w/cross-ref) | Endorse the role-separation test addition (cross-references AR-7 + SA-3) | open | |

### Theme 3 — Doc-set hygiene

| ID | Memo | Severity | Title | Status | Rationale / PR |
|---|---|---|---|---|---|
| DA-2 | [06-DA](./06-DA-docs-review.md#f-2) | NOTE→CHALLENGE | Normalize D-NNN anchors to full slug across blueprint set | accepted | Markdown anchors auto-generate from header text on GitHub, and inline `D-NNN` mentions in the blueprint render as plain text — both short-form (`#d-016`) and full-slug links resolve correctly today, so the doc set is not user-broken. The canonical anchor pattern for live HTML is the explicit `id="d-NNN-ref"` already shipped in `pages/index.html` per PR #70 (Decision References section). Forcing a full-slug rewrite across the markdown blueprint trades 15-20 min of churn for editorial consistency without changing rendered behavior; revisit when D-022+ lands and a fresh sweep is cheap. (this PR — accepted, no edit) |
| DA-3 | [06-DA](./06-DA-docs-review.md#f-3) | NOTE | Verify F-CON-001 fix landed (10-Epic → 11-Epic in repo CLAUDE.md) | accepted | Verified — repo `CLAUDE.md:162` reads `## 11-Epic Public Roadmap` and the table includes the E2.5 row; `README.md:27` reads "the public 11-epic roadmap (E3-E11+)" and `README.md:44` reads `## Roadmap (11 public epics)`. F-CON-001 fix has merged; no edit needed. (this PR — verified) |
| DA-4 | [06-DA](./06-DA-docs-review.md#f-4) | CHALLENGE | Add `000-docs/000-INDEX.md` flat index per F-CON-004 | fixed | The flat index already existed at `000-docs/000-INDEX.md` (created in an earlier pass); refreshed two stale lines in this PR — bumped the decision-log range from "D-001 through D-018" to "D-001 through D-021" reflecting D-019/D-020/D-021, and rewrote the `blueprint/audits/` description to enumerate the 3 pre-audit gauntlet passes, the staffed `03-AR..13-FC` panel, and the response register. See `000-docs/000-INDEX.md:16,48`. (this PR) |
| DA-5 | [06-DA](./06-DA-docs-review.md#f-5) | CHALLENGE | Add explicit `CONTRIBUTING.md` required-sections list to ROADMAP § E1 | fixed | Added a 9-item required-sections nested bullet under E1 exit criteria in `07-ROADMAP.md` (development setup, branch convention, PR convention, beads workflow link, agent specialist workflow, Gemini review requirement, DCO + license posture, carrier-vocabulary 8-rule checklist, audit-harness gates). The sub-bullet cites 06-DA F-5 inline so the audit linkage survives a future re-pass. See `07-ROADMAP.md:58-87` (the 9 numbered sub-bullets). (this PR) |
| DA-6 | [06-DA](./06-DA-docs-review.md#f-6) | CHALLENGE | Renumber `audits/README.md` to 03-AR..13-FC | accepted | Verified — `audits/README.md:9-12` already states the 11 memos landed at slots `03-AR..13-FC`, the numbering-convention table at `:23-28` documents the 00/01/02 pre-audit slots vs. 03–13 staffed-panel slots, and the auditor table at `:41-51` links each row to the actual on-disk file (`03-AR-architecture-review.md` through `13-FC-fact-check.md`). The README and the filesystem are in sync; no edit needed. (this PR — verified) |
| CC-1 | [12-CC](./12-CC-consistency-review.md#f-1) | PASS-followup | Verify F-CON-002 + F-CON-003 fixes merged | accepted | Verified — `README.md` no longer contains `propose-endorsement` (F-CON-002 fix landed; the README roadmap table uses the canonical D-016 forms). `07-ROADMAP.md:336,386,468,469` show the 5 D-016 narrative names with explicit `(canonical per [D-016]; formerly <old>)` parenthetical pointers per the F-CON-003 recommended pattern. Both fixes are merged; no edit needed. (this PR — verified) |
| CC-3 | [12-CC](./12-CC-consistency-review.md#f-3) | CHALLENGE | Verify F-CON-001 fix merged (cross-references DA-3) | accepted | Cross-references DA-3 above. Verified — repo `CLAUDE.md:162` and `README.md:27,44` all reflect the 11-epic roadmap with the E2.5 row included. (this PR — verified, see DA-3) |
| CC-4 | [12-CC](./12-CC-consistency-review.md#f-4) | CHALLENGE | D-021 sandbox-terminology normalization pass | fixed | Targeted normalization at the four cited locations: (1) `02-PRD.md:961-966` § 6.10 — replaced "Sandbox tenant URL pointing at Jeremy's sandbox (per `guidewire-adj` once GH #1 closes)" with a reference to dev-tier endpoints from the librarian KB + `smoke-reach.ts` per D-021. (2) `04-USER-JOURNEY.md:73` J-1 — reworded "sandbox tenant reachable per [D-008]" to "dev-tier Cloud API endpoints reachable with dev-tier OAuth credentials per [D-008] + [D-021]". (3) `04-USER-JOURNEY.md:729-735` J-6 step 1 — replaced "**sandbox-blocked** until `guidewire-adj` closes" with "**tenant-specific** — they resolve from the customer's Hub OIDC discovery document at onboarding time" + a parenthetical noting reachability is covered by `smoke-reach.ts`. (4) `07-ROADMAP.md:215-222` § E2.5 prereqs — replaced the `guidewire-adj`-keyed prereq with a `scripts/smoke-reach.ts` UWCenter aggregation reachability prereq citing D-021. Plus a meaning-preserving Phase 0 row update at `07-ROADMAP.md:20` marking the superseded sandbox-provisioning row with strikethrough + D-021 link. Generic "sandbox" usage tied to D-008 NO-MOCKS in `01-BUSINESS-CASE`, `03-ARCHITECTURE`, `05-TECHNICAL-SPEC`, and "PartnerConnect sandbox" (a Guidewire product surface name) are intentionally preserved — that usage is the legitimate isolated-tenant meaning. (this PR) |
| CC-7 | [12-CC](./12-CC-consistency-review.md#f-7) | CHALLENGE | Renumber `audits/README.md` (cross-references DA-6) | accepted | Cross-references DA-6 above. Verified — `audits/README.md` and the filesystem are in sync at `03-AR..13-FC`. (this PR — verified, see DA-6) |

### Theme 4 — Hardening edits

| ID | Memo | Severity | Title | Status | Rationale / PR |
|---|---|---|---|---|---|
| AR-4 | [03-AR](./03-AR-architecture-review.md#f-4) | CHALLENGE | Decide vendored-vs-published harness for cowork forks | open | |
| SA-2 | [04-SA](./04-SA-security-review.md#f-2) | CHALLENGE | Add revocation-latency trade-off + `auth.yaml.oauth.introspect` field | open | |
| SA-5 | [04-SA](./04-SA-security-review.md#f-5) | CHALLENGE | Add approval-timeout signal-availability commitment to TECH-SPEC § 4.5 | open | |
| SA-6 | [04-SA](./04-SA-security-review.md#f-6) | NOTE | Add `lob_class: health` field + Zod refinement enforcing BAA carve | open | |
| BA-4 | [05-BA](./05-BA-backend-review.md#f-4) | CHALLENGE | Add per-tenant OAuth client lifecycle subsection to TECH-SPEC § 8.1 | open | |
| BZ-2 | [07-BZ](./07-BZ-business-review.md#f-2) | CHALLENGE | Address Persona-1 cost-bounding question (author small/med/large table OR accept out-of-scope) | open | |
| BZ-3 | [07-BZ](./07-BZ-business-review.md#f-3) | CHALLENGE | Land soft fork-license note for cowork-fork-vs-SI margin | open | |
| MS-6 | [08-MS](./08-MS-mcp-safety-review.md#f-6) | CHALLENGE | Add `lob_class: health` + Zod refinement (cross-references SA-6) | open | |
| MS-7 | [08-MS](./08-MS-mcp-safety-review.md#f-7) | NOTE | Clarify refusal ordering for read-only tools in PRD § 4.2 | open | |
| CV-4 | [09-CV](./09-CV-vocabulary-review.md#f-4) | CHALLENGE | Add "waiting on me" projection note to PRD § 3.1.1 | open | |
| GA-3 | [10-GA](./10-GA-guidewire-api-review.md#f-3) | CHALLENGE | Add admin-scope OAuth threat-model row + `oauth_scope` audit field | open | |
| GA-5 | [10-GA](./10-GA-guidewire-api-review.md#f-5) | NOTE | Add `address_shape` block to PRD § 6.6 | open | |
| GA-6 | [10-GA](./10-GA-guidewire-api-review.md#f-6) | CHALLENGE | Add read-after-write `confirmWrite()` to PRD § 5.4 + ARCHITECTURE § 6 + TECH-SPEC § 3 | open | |
| HR-3 | [11-HR](./11-HR-harness-review.md#f-3) | CHALLENGE | Add `idempotency.pruned` event type + TTL story | open | |
| HR-4 | [11-HR](./11-HR-harness-review.md#f-4) | CHALLENGE | Extend TECH-SPEC § 8.2 with `approvals` table DDL | open | |

### Future-tool candidates (not blueprint edits — captured for E9+)

| ID | Memo | Tool | Status |
|---|---|---|---|
| CV-5-followup | [09-CV](./09-CV-vocabulary-review.md#f-5) | `whats-my-contract-net` (producer commission − chargebacks − overrides − sub-broker shares) for E9 expansion | future |

### Notes triaged but not requiring rows here

NOTEs that don't need explicit response rows because they are
self-resolving observability / hygiene improvements at later
epics (rather than blueprint edits): AR-3 (build-order CI
assertion at E1), AR-5 (cold-start posture documentation), BA-2
(`HarnessError.code` extension policy), BA-5 (events queue
backpressure), BA-7 (`sentry-bead-bridge` dependency direction),
DA-7 (link-checker CI for librarian KB at E1+), HR-5
(chain-head latency observability), CC-2 (drop "39 tools" count
in ARCHITECTURE § 1.1), FC-6 (ProNavigator date precision).

GW-1.9 may roll any of these into the response set if the author
chooses; otherwise they remain `panel-noted` and are addressed
opportunistically as code lands.

---

## Re-pass requirement (per `audits/README.md` gate criteria)

After GW-1.9 lands the response edits, the **single re-pass** is:
1. `architect-reviewer` re-walks the layered model + epic
   dependency graph + boundary rules to confirm the manifest-
   schema + role-separation + cowork-harness-upgrade decisions
   land cleanly.
2. `article-consistency-checker` re-walks the doc set to
   confirm the doc-hygiene cluster (anchor normalization,
   sandbox terminology, `audits/README.md` renumber, epic
   count, F-CON-001/002/003 fixes) is internally consistent.

If both re-passes return clean, GW-1.9 closes and E1
(`guidewire-4rd` / GH #3) unblocks.

jeremylongshore.com made me do it
  -claude
intentsolutions.io
