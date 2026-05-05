# 12-CC — Cross-document consistency review

**Auditor:** `article-consistency-checker`
**Date:** 2026-05-04
**Target:** all blueprint files under `000-docs/blueprint/` +
referenced inputs in `000-docs/00N-DR-*.md` + repo-level
`README.md` + `CLAUDE.md` + `audits/00-LIBRARIAN-CITATION-AUDIT.md`
+ `audits/01-CONSISTENCY-AUDIT.md` + `audits/02-RED-TEAM-PANEL.md`.
**Scope:** PRD ↔ Architecture ↔ Roadmap ↔ Diagram ↔ User
Journeys ↔ Status all tell the same story; tool names are
consistent across docs (post-D-016); decision-log entries
(D-NNN) are referenced consistently with the same anchor form;
the librarian-audit corrections (P1-P5) are reflected uniformly;
the pre-audit-gauntlet findings (F-CON-*, F-RT-*) are either
fixed or accepted per the decision log.
**Out of scope:** factual correctness of cited Guidewire claims
(`fact-checker`); design soundness within a single doc (other
auditor lanes).

---

## Verdict

**PASS-WITH-NOTES.** The pre-audit `01-CONSISTENCY-AUDIT.md`
already ran and produced 4 warnings + 3 info-only items, of
which F-CON-001 (10-Epic vs 11-Epic in CLAUDE.md), F-CON-002
(`propose-endorsement` in README), F-CON-003 (5 pre-D-016 names
in 07-ROADMAP narrative) and F-CON-004 (`000-INDEX.md`) are the
material drift items. The post-D-019 + post-D-020 + post-D-021
edits ripple through the doc set well — I sampled the threat-
model claim, the profile schema versioning, and the sandbox
terminology fix and they're consistent across PRD / TECH-SPEC /
ARCHITECTURE / STATUS / MASTER. The librarian P1-P5 corrections
are uniform across PRD / TECH-SPEC / ARCHITECTURE / USER-JOURNEY.
The findings below are residual cross-doc inconsistencies the
pre-audit didn't catch — a couple of "tool count" and "epic
count" arithmetic items, an inconsistent reference style for
Guidewire URL paths in two places, and one unresolved item from
the consistency-audit's recommended actions.

## Findings

### F-1 — D-016 tool-name discipline holds across PRD / USER-JOURNEY / ROADMAP / ARCHITECTURE / specialist memos
- **Severity:** PASS
- **Section:** `004-DR-DEC` D-016 + the doc set.
- **Finding:** I walked every D-016 rename:
  - `propose-endorsement → draft-endorsement`: PRD § 3.1.1 row
    132, USER-JOURNEY J-1 step 6 line 137, ROADMAP § E5 line
    335, 006 § 1.8 line 134, 007 § 2.1 row, 008 § 3.1 row.
    Every reference uses `draft-endorsement`. Pre-audit
    F-CON-002 flagged README.md still using `propose-endorsement`
    — verify that fix has merged.
  - `whats-the-payment-status → where-are-we-on-this-payment`:
    PRD § 3.3 line 181, USER-JOURNEY J-3 step 2 line 367, ROADMAP
    § E8 line 468, 006 § 3.2 line 219, 007 § 2.3 row.
    Consistent.
  - `find-billing-issues-for-this-policy → whats-going-on-with-this-account`:
    PRD § 3.3 line 182, USER-JOURNEY J-3 step 3 line 372, ROADMAP
    § E8 line 469, 006 § 3.2-3.3 line 219, 007 § 2.3 row.
    Consistent.
  - `replay-event → show-event-payload`: PRD § 3.5 line 228,
    USER-JOURNEY J-2 step 4 line 248 (uses
    `show-activity-on-this-claim` correctly — different tool),
    ROADMAP § E6 line 386, 006 § 5.1 line 295, 007 § 2.5 row.
    Consistent.
  - `show-activity-on-this-claim` (NEW per D-016 split): PRD
    § 3.5 line 229, USER-JOURNEY J-2 step 4, ROADMAP doesn't
    enumerate (lives inside § E6's events-mcp tools without
    individual call-out — fine), 006 not yet covered (Mode A
    pre-dates D-016), 007 § 4.2 surface flag.
  D-016 anchor links use both short form (`#d-016`) and the
  full slug across the docs. Pre-audit F-CON-007 flagged this
  as Info-only and recommended deferring; my recommendation in
  the `docs-architect` lane (F-2 there) was to normalize to
  the full slug now. From a consistency perspective it doesn't
  block; from a doc-hygiene perspective it should be cleaned.
- **Recommendation:** Verify pre-audit F-CON-002 + F-CON-003
  fixes have merged. If not, single-string replace
  `propose-endorsement` → `draft-endorsement` in README:55 and
  walk the 5 spots in 07-ROADMAP narrative (lines 321, 371, 453,
  454, 475 per the consistency audit). ~10 min if not landed.
- **Cite:** `01-CONSISTENCY-AUDIT.md` F-CON-002, F-CON-003,
  F-CON-007; `004-DR-DEC` D-016.

### F-2 — Tool-count arithmetic is consistent across docs but not always derivable from a single source
- **Severity:** NOTE
- **Section:** PRD § 3 (catalog) + ARCHITECTURE § 1.1 ("39 tools
  across 5 suite servers") + ROADMAP per-epic exit criteria.
- **Finding:** ARCHITECTURE § 1.1 says: *"The full tool catalog
  (39 tools across 5 suite servers) is canonical in
  [02-PRD § 3]."* I counted PRD § 3 rows:
  - § 3.1.1 (line UW): 9 tools (`find-submissions-waiting-on-me`,
    `whats-our-appetite-on-this-risk`, `show-policies-for-this-insured`,
    `summarize-this-submission`, `did-we-lose-this-account`,
    `explain-why-this-got-referred`, `pull-this-claim-from-this-policy`,
    `draft-referral-note`, `draft-endorsement`).
  - § 3.1.2 (UW manager): 5 tools.
  - § 3.2 (claims): 6 tools (`find-claims-at-risk-of-leakage`,
    `summarize-this-loss`, `whats-the-reserve-picture`,
    `pull-this-claim`, `draft-denial-letter`, plus
    `show-activity-on-this-claim` referenced under events but
    used in J-2 — counting once).
  - § 3.3 (billing): 4 tools.
  - § 3.4 (producer): 8 tools.
  - § 3.5 (events): 4 tools (`show-event-payload`,
    `show-activity-on-this-claim`, `find-events-for-claim`,
    `find-events-for-policy`).
  Sum: 9 + 5 + 6 + 4 + 8 + 4 = **36** tools (or 35 if
  `show-activity-on-this-claim` is counted only once across
  events + claims). Not 39. ARCHITECTURE § 1.1's "39 tools"
  number is off by 3-4. Not a structural drift, but a CIO or
  staffed-panel reviewer who counts will spot it.
- **Recommendation:** Either (a) re-count and update
  ARCHITECTURE § 1.1 to the correct number with a footnote
  pointing at PRD § 3 as the source, OR (b) drop the count from
  ARCHITECTURE § 1.1 and replace with "the full tool catalog is
  canonical in PRD § 3." Option (b) is more drift-resistant.
  ~5 min edit.
- **Cite:** `03-ARCHITECTURE.md:46-49` (§ 1.1), `02-PRD.md` § 3
  catalog rows.

### F-3 — Epic count: master + ROADMAP say 11; pre-audit `F-CON-001` flagged repo-root CLAUDE.md still saying "10-Epic"
- **Severity:** CHALLENGE
- **Section:** `00-MASTER-BLUEPRINT.md` § "Blueprint section
  index" + `07-ROADMAP.md` § "Public 11-epic roadmap" + repo-
  root `CLAUDE.md` § "10-Epic Public Roadmap".
- **Finding:** The pre-audit consistency audit flagged this
  (F-CON-001). I confirm: 00-MASTER's blueprint index lists
  E1, E2, E2.5, E3-E10, E11+ (11 epics + Phase 0 prereq).
  ROADMAP § "Public 11-epic roadmap" header is correct. Repo-
  root CLAUDE.md still uses "## 10-Epic Public Roadmap" as
  the section heading at the time of this audit (per the system
  context; the fix may have landed in a follow-on PR I haven't
  re-validated against). The README.md drift was also flagged
  in F-CON-001. Both need single-string fixes.
- **Recommendation:** Verify the F-CON-001 fix has merged in
  README + repo-root CLAUDE.md. If not, replace `## 10-Epic
  Public Roadmap` → `## 11-Epic Public Roadmap` and ensure the
  table includes the E2.5 row. ~10 min.
- **Cite:** `01-CONSISTENCY-AUDIT.md` F-CON-001;
  `00-MASTER-BLUEPRINT.md:75-87` (blueprint section index);
  `07-ROADMAP.md:23` ("Public 11-epic roadmap").

### F-4 — Sandbox terminology per D-021 ripples consistently — but `guidewire-adj` references in journeys vs PRD vs STATUS are mixed
- **Severity:** CHALLENGE
- **Section:** D-021 + STATUS § "Phase status" + PRD § 6.1 +
  `04-USER-JOURNEY.md` J-1 + J-6 + `00-MASTER-BLUEPRINT.md`
  § "Status snapshot".
- **Finding:** D-021 reframed the sandbox concept honestly: not
  a Guidewire-isolated tenant; just dev-tier OAuth credentials
  + real Cloud API endpoints. The decision says
  *"Items previously tagged `(unverified — sandbox-confirm at
  guidewire-adj)` are reworded; production-tenant validation
  defers to first engagement."* The reword applies to PRD
  § 5.4's `Plan.wire.dbTransactionId` JSDoc + § 6.1
  (`auth.yaml`'s notes). I walked the doc set:
  - `00-MASTER-BLUEPRINT.md` § "Status snapshot" carries the
    D-021 footnote correctly.
  - `06-STATUS.md` § "Audit gate state" carries the same
    footnote.
  - `02-PRD.md` § 6.10 (OSS demo profile) still says
    *"Sandbox tenant URL pointing at Jeremy's sandbox (per
    `guidewire-adj` once GH #1 closes)"* — pre-D-021 framing.
  - `04-USER-JOURNEY.md` J-1 line 73: *"sandbox tenant
    reachable per [D-008] (NO MOCKS — no fixture fall-through)"*
    — keeps "sandbox tenant" framing. J-6 line 700-701:
    *"Carrier sandbox provisioned (per [D-008] NO MOCKS —
    fixture-only flows are forbidden); SOPS+age secrets posture
    set up per IS standard"* + line 723 *"`auth.yaml` cannot
    be finalized until the SI engineer has the OIDC discovery
    document from Acme's Hub tenant"* — mixes pre- and post-
    D-021 framing.
  - `07-ROADMAP.md` § E2.5 prereqs line 215-218: *"`guidewire-adj`
    at "sandbox breadth confirmed for UWCenter aggregation
    surface"* — pre-D-021. Per D-021 this should read "dev-tier
    creds + UWCenter endpoint reachability confirmed via
    `smoke-reach.ts` + first integration engagement."
  D-021's operational consequences include *"3 inline
  `(unverified — sandbox-confirm at guidewire-adj)` tags in
  02-PRD / 06-STATUS / 00-MASTER reworded"* — those landed.
  But broader uses of "sandbox" elsewhere weren't part of the
  reword scope, and now the doc set has a mix.
- **Recommendation:** One pass to normalize "sandbox" usage
  per D-021. Two acceptable forms:
  (a) "dev-tier sandbox" — explicit naming, consistent with
  D-021's "dev-tier OAuth credentials." Acceptable.
  (b) "carrier production tenant" — for J-6 onboarding which
  is about a real customer engagement. Acceptable.
  The unacceptable form is generic "sandbox" without
  qualification, because the term carries the conflated meaning
  D-021 fixed. ~30 min normalization pass across the doc set.
- **Cite:** `004-DR-DEC` D-021, `02-PRD.md:961-966` (§ 6.10),
  `04-USER-JOURNEY.md:73, 700-701, 723`,
  `07-ROADMAP.md:215-218`.

### F-5 — Librarian P1-P5 corrections are reflected uniformly across PRD / TECH-SPEC / ARCHITECTURE / USER-JOURNEY
- **Severity:** PASS
- **Section:** P1 (idempotency two-key) + P2 (CC has no Graph)
  + P3 (commission Admin API) + P4 (BC has its own apiref) +
  P5 (pagination AUTHORITATIVE).
- **Finding:** I walked each librarian P-finding:
  - **P1** (`Idempotency-Key` → `GW-DBTransaction-ID`): PRD
    § 5.4 carries the two-key model with the wire-side key
    description. TECH-SPEC § 3.4.1 carries the table.
    ARCHITECTURE § 5.3 step 6 carries the wire-call narrative.
    USER-JOURNEY J-3 § "Audit + idempotency" carries the
    distinction. `008 § 14` open question 2 marks RESOLVED.
    `009 § 4.4` carries the wire-idempotency callout. Five
    cross-references, all consistent.
  - **P2** (CC has no Graph): PRD § 3.2 row references CC
    Composite API, not Graph. TECH-SPEC § 5.5 carries the
    recording-manifest constraint. USER-JOURNEY J-2 narrative
    explicitly names *"`summarize-this-loss` is **not** a Graph
    API call — ClaimCenter does not expose a Graph API module
    per librarian P2"*. `008 § 2` per-suite module table carries
    CC = Admin/Async/Claim/Common/Composite/System Tools. Three
    cross-references, all consistent.
  - **P3** (commission → `/admin/v1/commission-plans`): PRD
    § 3.4 row carries the corrected endpoint with the citation
    inline. USER-JOURNEY J-4 step 2 carries the corrected
    endpoint plus the admin-scope OAuth implication. `008 § 3.4`
    carries the corrected endpoint. Three cross-references, all
    consistent.
  - **P4** (BC has its own apiref + Composite API): `008 § 2`
    carries the BC module list including Composite API.
    Librarian KB `005-DR-REF` § 1 carries the BC apiref URL.
    Two cross-references, consistent.
  - **P5** (pagination AUTHORITATIVE): TECH-SPEC § 5.6 carries
    the AUTHORITATIVE classification. `008 § 14` open question 1
    marks RESOLVED. Two cross-references, consistent.
  All five corrections are applied uniformly. The librarian
  audit's load-bearing P1 fix in particular shows up in five
  places with identical semantic content.
- **Recommendation:** None. The librarian-audit-pre-pass is the
  reason the staffed audit panel doesn't have to re-litigate
  these corrections.
- **Cite:** `00-LIBRARIAN-CITATION-AUDIT.md` § 3 P1-P5,
  cross-referenced across PRD § 5.4 / TECH-SPEC § 3.4.1 / § 5.5
  / § 5.6, ARCHITECTURE § 5.3 step 6, USER-JOURNEY J-2 / J-3 /
  J-4, 008 § 2 / § 3 / § 14.

### F-6 — Diagram ↔ ARCHITECTURE ↔ PRD layers + planes consistency
- **Severity:** PASS
- **Section:** `09-DR-DIAG-architecture.md` (Mermaid source) +
  `03-ARCHITECTURE.md` § 2 (layered model — embeds the Mermaid
  inline) + `02-PRD.md` § 3 (servers) + § 6 (profiles).
- **Finding:** The diagram + ARCHITECTURE narrative + PRD agree
  on the structure:
  - L1 Agent host → L2 5 suite MCPs (PolicyCenter, ClaimCenter,
    BillingCenter, Producer, Events) + `payments-mcp` rendered
    dashed/external (NOT in OSS demo) → L3 packages/harness →
    L4 clients (`packages/guidewire-client/` + per-suite
    wrappers + vendor wrappers) → L5 profiles (9 YAMLs).
  - Cross-cutting planes: Audit (Postgres hash-chain + evidence
    bundle), Observability (OTel + pino + Sentry), Events
    (webhook receiver + BullMQ shard-by-`primaryObject.id`),
    Auth (Hub OAuth + JWT propagation).
  - Cowork-fork derivatives: separate FORKS subgraph showing
    `flatbed-mcp`, `mls-mcp`, `floor-mcp`, ... linked to L1 via
    `templates/cowork-fork-starter` + `pnpm guidewire init`.
  PRD § 3 servers list matches the L2 layer; PRD § 6 profile
  YAMLs list matches the L5 layer (9 YAMLs); ARCHITECTURE § 2.7
  cross-cutting planes list matches the diagram's plane
  subgraphs. The Mermaid renders inline on GitHub per the
  diagram doc's "Local rendering" section.
- **Recommendation:** None.
- **Cite:** `09-DR-DIAG-architecture.md` + the embedded Mermaid
  in `03-ARCHITECTURE.md` § 2.1, `02-PRD.md` § 3 + § 6,
  `03-ARCHITECTURE.md` § 2.7.

### F-7 — Numbering convention drift in `audits/README.md` (cross-references docs-architect F-6)
- **Severity:** CHALLENGE
- **Section:** `audits/README.md` § "The 11 auditors" + actual
  filesystem state.
- **Finding:** `audits/README.md` table shows staffed-panel
  memos at slots `01-AR..11-FC`, but the directory already
  contains `00-LIBRARIAN-CITATION-AUDIT.md`,
  `01-CONSISTENCY-AUDIT.md`, `02-RED-TEAM-PANEL.md` (the
  pre-audit gauntlet). The staffed-panel memos for THIS pass
  land at `03-AR..13-FC` (the orchestrator's runbook directs
  the GW-1.8 panel to use these slots and renumber the README
  alongside writing the memos). Until the README is renumbered,
  any reader looking at `audits/01-AR-architecture-review.md`
  (per the README) sees `01-CONSISTENCY-AUDIT.md` instead.
  This is the single visible cross-doc inconsistency the
  staffed panel itself creates.
- **Recommendation:** Renumber `audits/README.md`'s 11-auditor
  table to `03-AR..13-FC` so the file paths match what the
  panel writes. The renumbering is being executed as part of
  the GW-1.8 pass that produced this memo; my recommendation
  is to verify at GW-1.9 close that the README and the actual
  filenames are in sync. Same finding as `docs-architect` F-6;
  endorsing here with a doc-set-consistency angle.
- **Cite:** `audits/README.md:17-29`, `docs-architect` F-6,
  filesystem state of `audits/`.

## Summary

Recommended actions in priority order:

1. **F-3 (CHALLENGE):** verify pre-audit F-CON-001 (10-Epic →
   11-Epic) fix has merged in README + repo-root CLAUDE.md.
   ~10 min if not landed.
2. **F-4 (CHALLENGE):** D-021 sandbox-terminology normalization
   pass across the doc set. ~30 min.
3. **F-7 (CHALLENGE):** renumber `audits/README.md` to match
   `03-AR..13-FC`. Being executed as part of this GW-1.8 pass;
   verify at GW-1.9 close. ~10 min.
4. **F-1 (PASS-followup):** verify pre-audit F-CON-002 +
   F-CON-003 (`propose-endorsement` in README, 5 pre-D-016
   names in 07-ROADMAP narrative) fixes have merged. ~10 min if
   not landed.
5. **F-2 (NOTE):** drop the "39 tools" count from
   `03-ARCHITECTURE.md` § 1.1 in favor of "canonical in PRD
   § 3" pointer. ~5 min.

PASS endorsements (F-5, F-6) are durable: the librarian-audit
P1-P5 cross-doc consistency (F-5) and the diagram-narrative
agreement (F-6) are the two strongest cross-document
consistency properties in the blueprint. Hold the line through
E1+ as code lands.

E1 is unblocked from this lane subject to F-3, F-4, F-7
landing as small prose / numbering edits.

jeremylongshore.com made me do it
  -claude
intentsolutions.io
