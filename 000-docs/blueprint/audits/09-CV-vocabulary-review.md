# 09-CV — Carrier-vocabulary review (Mode B)

**Auditor:** `carrier-vocabulary-curator` (project-scoped)
**Date:** 2026-05-04
**Target:** `02-PRD.md` § 3 (full tool catalog, every server) +
§ 7.3 ("what stays carrier-vocabulary-shaped"), `04-USER-JOURNEY.md`
all six journeys (operator-voice opening quotes + tool call
sequences), `004-DR-DEC` D-001 + D-016, `007-DR-MEMO-carrier-vocabulary.md`
(Mode A predecessor), README marketing copy where tool names
appear.
**Scope:** tool-name authenticity ("would a real underwriter /
adjuster / billing operator say this?"), missing carrier-
vocabulary surface, the 8-rule PR-time vocabulary checklist's
applicability to every tool in the catalog, the `propose-endorsement →
draft-endorsement` style D-016 renames, the adjuster vs
integration-engineer split for events tools. **Out of scope:**
Cloud API correctness underneath the tool names
(`guidewire-api-archaeologist`); blast radius
(`mcp-safety-reviewer`).

---

## Verdict

**PASS-WITH-NOTES.** Across 39 tools in 5 servers (PolicyCenter
incl. underwriting-manager view, ClaimCenter, BillingCenter,
Producer, Events) the catalog scores 0 API-VERB-LEAK, 0
ARTIFICIAL, with the D-016 renames consistently applied —
`draft-endorsement` (not `propose-endorsement`),
`where-are-we-on-this-payment` (not `whats-the-payment-status`),
`whats-going-on-with-this-account` (not
`find-billing-issues-for-this-policy`), `show-event-payload`
(not `replay-event`), and the new `show-activity-on-this-claim`
adjuster path distinct from `find-events-for-claim`
integration-engineer path. The Mode A memo's recommendations all
landed; the Persona 9 underwriting-manager tranche (PRD § 2.1 +
§ 3.1.2) closes the manager-vocabulary gap I flagged in `007 §
4.6`. The journeys in `04-USER-JOURNEY.md` open with verbatim
operator quotes that I'd recognize as authentic on first read.
The findings below are residual polish — discoverability inside
a single server (cross-references red-team F-RT-2.2 /
F-RT-7.1), a missing producer "contract net" tool, and an
ordering question on `find-submissions-waiting-on-me` semantics
the line UW raised.

## Findings

### F-1 — D-016 canonical names are applied consistently across PRD § 3, journeys, ROADMAP, and architecture
- **Severity:** PASS
- **Section:** `02-PRD.md` § 3 + `04-USER-JOURNEY.md` all
  journeys + `07-ROADMAP.md` E2 / E5 / E6 / E8 / E9 sections +
  `004-DR-DEC` D-016.
- **Finding:** I walked every tool name across the document set:
  PRD § 3 carries D-016 forms (`draft-endorsement`,
  `where-are-we-on-this-payment`,
  `whats-going-on-with-this-account`, `show-event-payload`,
  `show-activity-on-this-claim`). The journeys use the same
  forms verbatim. ROADMAP E5 lists "draft-endorsement (canonical
  per D-016; formerly `propose-endorsement`)" — keeping the
  rename pointer is the right pattern for future readers. The
  pre-audit consistency audit's `F-CON-002` / `F-CON-003`
  flagged residual pre-D-016 names in README + 5 spots in 07-
  ROADMAP narrative; if those fixes haven't merged yet they're
  the only outstanding cleanup. From this lane's perspective,
  the D-016 discipline is the strongest property of the
  blueprint — the rename was a real architectural decision
  (tool names ARE the architecture per D-001) and the discipline
  carried through every doc that mentions a tool.
- **Recommendation:** Verify `01-CONSISTENCY-AUDIT.md`'s
  F-CON-002 and F-CON-003 fixes have merged. If not, that's the
  trivial cleanup. Hold the line on D-016 forms in every
  marketing surface (README, blog posts, cowork curriculum). A
  single rebound to `propose-endorsement` in a blog post is
  enough to seed contributor confusion.
- **Cite:** `004-DR-DEC` D-016, `02-PRD.md:131-135` (§ 3.1.1
  draft-endorsement), `02-PRD.md:181-183` (§ 3.3
  where-are-we-on-this-payment, whats-going-on-with-this-account),
  `02-PRD.md:228-230` (§ 3.5 show-event-payload), § 4.6 of 007.

### F-2 — Persona 9 underwriting-manager tranche (E2.5) closes the `007 § 4.6` density gap with operator-voice tools
- **Severity:** PASS
- **Section:** `02-PRD.md` § 2.1 (Persona 9 introduction) +
  § 3.1.2 (manager-view tool table) + `07-ROADMAP.md` § E2.5 +
  `004-DR-DEC` D-017 + D-020.
- **Finding:** The Mode A memo flagged that the v3 tool catalog
  served the line UW (Persona 2) but not the underwriting
  manager. PRD § 2.1 + § 3.1.2 ship five manager-view tools, all
  passing the 8-rule checklist on first read:
  - `show-referrals-routed-to-me` — *"anything still sitting
    after 24 hours gets a phone call"* — possessive scope on
    "me" is doing real work; manager queue.
  - `whats-my-team-bind-ratio` — *"who's quoting fine but
    closing soft?"* — exact KPI an UW manager owns.
  - `show-uws-stacking-referrals` — *"if one person owns the
    referral spike, I want to know"* — manager's people-
    management view of referrals.
  - `whats-our-concentration-on-this-class` — *"are we
    over-concentrated on California trucking? Portfolio-level,
    not file-level."* — the portfolio shape question Persona 9
    asks.
  - `what-authority-overrides-this-quarter` — *"I need the trail
    before the auditor asks."* — manager's audit of their own
    exceptions.
  All 5 satisfy operator-voice + possessive-scope + question-form.
  D-017 defers them into E2.5 to avoid bloating E2 from 5-7
  tools to 12; D-020 versions the profile schema (v1 = 9 YAMLs,
  v2 = +aggregation block in `lob.yaml`) to support the manager
  tools' aggregation queries. This is the right discipline.
- **Recommendation:** None. When E2.5 ships, the
  `audit-harness vocab-lint` should accept all 5 names without
  modification. Run vocab-lint at E2.5 close as a confirmation.
- **Cite:** `02-PRD.md:71-91` (§ 2.1) + § 3.1.2,
  `004-DR-DEC` D-017 + D-020.

### F-3 — Adjuster vs integration-engineer split (`show-activity-on-this-claim` vs `find-events-for-claim`) is structural, not synonymic — but Persona-7's tool-selection concern (red team F-RT-7.1) needs a documented disambiguator
- **Severity:** CHALLENGE
- **Section:** `02-PRD.md` § 3.5 (events-mcp tools) +
  `004-DR-DEC` D-016 (the new `show-activity-on-this-claim`
  rationale) + `02-RED-TEAM-PANEL.md` F-RT-7.1.
- **Finding:** `show-activity-on-this-claim` lives in
  `claimcenter-mcp` and reads from the harness internal events
  store from the adjuster's perspective ("activity"). The Mode A
  memo § 4.2 introduced this rename; D-016 codifies it as a
  *new* tool, not a rename — adjusters say "activity," engineers
  say "events," same data, different question, different answer
  shape. From a vocabulary-authenticity perspective both names
  PASS. **The Persona-7 attack from the red team:** *the agent
  doesn't know whether the user is an adjuster or an engineer
  at tool-selection time*; both tools are in the actor's
  catalog if `roles.yaml` gives them both; agent picks
  inconsistently. The red-team recommendation was to declare in
  PRD § 3.5 that `roles.yaml` is the disambiguator — the
  adjuster role's catalog only includes
  `show-activity-on-this-claim`; the integration-engineer
  role's only `find-events-for-claim`. That recommendation has
  not landed in the merged blueprint as of this audit. Without
  it, the red team's concern stands: vocabulary is right, agent
  selection is potentially sloppy.
- **Recommendation:** Add to `02-PRD.md` § 3.5 (immediately
  after the events-mcp tool table) a paragraph:

  > "`show-activity-on-this-claim` and `find-events-for-claim`
  > are not redundant: the adjuster role and the integration-
  > engineer role have different `roles.yaml` catalog scopes, so
  > a given actor sees only the tool that matches their role.
  > The agent never has both tools simultaneously visible for a
  > single actor — `roles.yaml` is the disambiguator that closes
  > the tool-selection ambiguity."

  ~10 min edit. Closes red-team F-RT-7.1 from this lane.
- **Cite:** `02-PRD.md:227-229` (§ 3.5),
  `004-DR-DEC` D-016 (new tool rationale),
  `02-RED-TEAM-PANEL.md` F-RT-7.1.

### F-4 — `find-submissions-waiting-on-me` "waiting on me" semantics: red-team F-RT-2.3 raises a real composite-vs-single-filter concern
- **Severity:** CHALLENGE
- **Section:** `02-PRD.md` § 3.1.1 (line underwriter view) +
  `04-USER-JOURNEY.md` J-1 + `02-RED-TEAM-PANEL.md` F-RT-2.3.
- **Finding:** The red team channeled Persona 2 to attack the
  semantics: *"My queue, sorted by stake. But what's `waiting
  on me`? Is that `assignedToMe=true`? Is it `referredTo=me` if
  someone bumped a submission up to me? Is it both?"* The
  blueprint at PRD § 3.1.1 shows the endpoint as
  `GET /job/v1/jobs?subtype=Submission&assignedToMe=true&status=Open`
  — single Boolean filter. From a vocabulary perspective the
  *name* is authentic; from a semantic perspective the *shape*
  is a projection. In real carriers, "waiting on me" is a
  composite (assigned + referred + escalated + needs-approval).
  A line UW reading the tool will assume "my queue" — and the
  tool's projection is narrower than that. The red-team
  recommendation was to clarify in PRD § 3.1.1 that "waiting on
  me" is implementer-defined and the OSS demo uses
  `assignedToMe=true` as a starting projection; carriers
  customize via `roles.yaml` (which already permits per-role
  tool bindings) or via a future `tool-projections.yaml`.
- **Recommendation:** Add a footnote-shaped note to PRD § 3.1.1's
  `find-submissions-waiting-on-me` row, or to the section's
  closing paragraph:

  > "The 'waiting on me' projection is implementer-defined. The
  > OSS demo uses `assignedToMe=true` as the starting projection;
  > most carriers customize this — common extensions include
  > `referredTo=me` (escalations bumped to the actor) and
  > `needsApprovalFromMe=true`. Carriers override via
  > `roles.yaml` (per-role tool bindings) or a forthcoming
  > `tool-projections.yaml` extension. The vocabulary is the
  > contract; the projection is the customization."

  ~10 min edit. Closes red-team F-RT-2.3 from this lane while
  preserving the vocabulary authenticity (PASS) finding.
- **Cite:** `02-PRD.md:127` (§ 3.1.1
  find-submissions-waiting-on-me row), `04-USER-JOURNEY.md`
  J-1, `02-RED-TEAM-PANEL.md` F-RT-2.3.

### F-5 — Producer-side density (8 tools per § 3.4) closes the Persona-4 "portal scrap" attack; one missing tool (red team F-RT-4.3 — `whats-my-contract-net`) flagged for a future sub-epic
- **Severity:** PASS-with-followup
- **Section:** `02-PRD.md` § 3.4 (producer-mcp tool catalog) +
  `02-RED-TEAM-PANEL.md` F-RT-4.3 + Mode A `007 § 4.5`.
- **Finding:** v3 had 3 producer tools — *"portal scrap by
  another name"*. v4 ships 8: book of business, commission
  status, pending quotes, loss ratio, bind ratio, retention,
  lost-this-year, appetite-flip. All 8 PASS the 8-rule checklist
  on operator-voice + possessive-scope + question-form. The
  cross-broker leakage hard-refusal at the harness gate per
  `006 § 4.2` is enforced by `roles.yaml` boot validation
  (`02-PRD.md` § 6.2 + § 8.2 of 008-DR-MEMO). This is the
  strongest persona-coverage improvement in v4; it's also the
  cleanest "we heard you" response to a v3 critique in the
  doc set. **The red-team flagged one missing tool:**
  `whats-my-contract-net` — commission − chargebacks − overrides
  − sub-broker shares. That's a top-3 weekly producer question
  per F-RT-4.3 and is genuine vocabulary the producer would say.
  The red-team recommendation was *not* to add it to the
  blueprint pre-staffed-audit (panel's no-new-tools rule); just
  capture it for E9 expansion.
- **Recommendation:** Capture `whats-my-contract-net` in
  `00-AUDIT-RESPONSES.md` as a future-tool candidate for E9
  expansion. Do not add to `02-PRD.md` § 3.4 in this audit pass;
  the E9 epic owner adds it during E9 scoping.
- **Cite:** `02-PRD.md:201-218` (§ 3.4 producer-mcp catalog),
  `007 § 4.5`, `02-RED-TEAM-PANEL.md` F-RT-4.3.

### F-6 — Discoverability *within* a single server (red-team F-RT-2.2): tool descriptions need the "<question> · <when-to-use>" pattern
- **Severity:** CHALLENGE
- **Section:** `02-PRD.md` § 3 (per-tool description column),
  `02-RED-TEAM-PANEL.md` F-RT-2.2.
- **Finding:** Persona 7's tool-selection budget concern (D-002,
  5-15 tools per server) is preserved. Persona 2's *within-a-
  server* discoverability concern is downstream: when 7 tools
  live in `policycenter-mcp` (E2 close) or 14 tools after E2.5
  + E5, the agent picks based on tool name + tool description.
  Tool names are excellent. Tool descriptions in PRD § 3 are
  one-sentence operator-voice — also good — but they lack a
  consistent "<carrier-question> · <when-to-use>" pattern. From
  a tool-selection perspective the agent's selection-quality
  improves materially when descriptions follow that pattern,
  because Claude's tool-selection prompt explicitly weights
  description matching. The red team flagged this, and the
  recommendation was to declare in PRD § 3 a description-
  consistency rule.
- **Recommendation:** Add to PRD § 3.0 (the section the
  `backend-architect` lane is also asking for, F-3 in that memo)
  a description-shape rule:

  > "Tool description format: every tool's `description` field
  > follows the pattern `<carrier-question> · <when-to-use>`,
  > where `<carrier-question>` is operator-voice (matches the
  > tool name's question form) and `<when-to-use>` is a one-
  > clause situational anchor. Example:
  > `find-submissions-waiting-on-me`: *"What's on my plate? ·
  > Daily morning queue review for line underwriters."*
  > Inconsistent format = `audit-harness vocab-lint` failure
  > under rule 7 (no engineering-jargon)."

  ~10 min edit on top of `backend-architect` F-3. Closes
  red-team F-RT-2.2 by making within-server discoverability a
  written description-shape contract.
- **Cite:** `02-PRD.md` § 3 every tool row's "Description"
  column, `02-RED-TEAM-PANEL.md` F-RT-2.2.

### F-7 — `payments-mcp` treasury-operator vocabulary is correctly out-of-scope; pre-flag from Mode A memo `007 § 2.6` is intact
- **Severity:** PASS
- **Section:** `02-PRD.md` § 3.6 (`payments-mcp` not in repo)
  + Mode A `007 § 2.6` pre-flag + `006 § 6.1` repo-level
  carve.
- **Finding:** The Mode A memo § 2.6 noted that `payments-mcp`
  tools would need treasury-operator vocabulary (*sweep the
  trust account, release the disbursement, net the producer
  commissions* — a different idiom than billing or claims). PRD
  § 3.6 carves the entire server out of the OSS repo at the
  directory level, not just at the catalog level. The
  treasury-operator vocabulary work *belongs* to a future
  `payments-mcp` repo and the pre-flag stays a pre-flag — the
  blueprint correctly resists the temptation to "ship a stub
  payments-mcp with placeholder treasury vocabulary." That's
  the right discipline: the wrong vocabulary on a money-
  movement tool is worse than no tool at all (treasury operators
  will read placeholder names as evidence the team doesn't know
  the domain).
- **Recommendation:** None. Hold the line on `payments-mcp`
  staying out. When the future `payments-mcp` repo opens, this
  lane re-runs against the treasury-vocabulary catalog at that
  time.
- **Cite:** `02-PRD.md:236-248` (§ 3.6), `007 § 2.6`,
  `006 § 6.1`.

## Summary

Recommended actions in priority order:

1. **F-3 (CHALLENGE):** add `roles.yaml`-as-disambiguator
   paragraph to PRD § 3.5 (events-mcp). Closes red-team
   F-RT-7.1. ~10 min.
2. **F-4 (CHALLENGE):** add the "waiting on me" projection
   note to PRD § 3.1.1. Closes red-team F-RT-2.3. ~10 min.
3. **F-6 (CHALLENGE):** add description-shape rule to PRD § 3.0
   (cross-references `backend-architect` F-3 and
   `mcp-safety-reviewer` F-5; piggyback on the same edit).
   Closes red-team F-RT-2.2. ~10 min.
4. **F-5 followup (NOTE):** capture
   `whats-my-contract-net` as a future-tool candidate in
   `00-AUDIT-RESPONSES.md`. ~5 min.

PASS endorsements (F-1, F-2, F-5-main, F-7) are durable. The
D-016 discipline (F-1), the Persona 9 manager-view tranche (F-2),
and the producer-side density (F-5) are the three properties
that make this catalog operator-credible on first read. Hold the
line on all three through E11+.

E1 is unblocked from this lane. All CHALLENGEs are 10-15 min
prose edits, not architecture changes.

jeremylongshore.com made me do it
  -claude
intentsolutions.io
