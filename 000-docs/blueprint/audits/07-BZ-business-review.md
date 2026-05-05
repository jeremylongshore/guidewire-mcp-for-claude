# 07-BZ — Business / commercial review

**Auditor:** `business-analyst`
**Date:** 2026-05-04
**Target:** `01-BUSINESS-CASE.md` (entire), `00-MASTER-BLUEPRINT.md`
§ executive summary, `02-PRD.md` § 8 acceptance criteria,
`07-ROADMAP.md` § "Distribution metrics worth tracking",
`004-DR-DEC` D-009 / D-010 / D-011 / D-014, persona memo
`002-DR-CRIT-personas.md` (especially Persona 1, 4, 6).
**Scope:** four-audience model coherence, OSS-as-lead-magnet
thesis defensibility, KPI realism, success-vs-failure framing,
commercial scope discipline (what the OSS does NOT ship), pricing
+ engagement model honesty. **Out of scope:** product spec
(`backend-architect`); technical roadmap dependencies
(`architect-reviewer`); marketing copy quality.

---

## Verdict

**PASS-WITH-NOTES.** The lead-magnet thesis is the most
honestly-scoped commercial framing I've reviewed in an OSS
artifact. The four-audience model in `01-BUSINESS-CASE.md` § 3
correctly distinguishes audiences with different success criteria
(carrier inbound is revenue; partner credibility is positioning;
cohort is distribution; broad OSS is moat). § 4 ("Why this isn't
a complete product") draws the line between OSS scope and SI
margin precisely where Persona 6 (the SI partner) needs it drawn.
§ 7 (risks) names three real failure modes without hedging. The
findings below are gaps a CFO would press on — engineering-
weeks bounding, conversion ratios, the audience-3 (cowork) /
audience-1 (SI) tension that the pre-audit red team flagged but
hasn't been written into the doc set yet. None blocks E1; all
are credibility hardening for the inbound-conversation surface.

## Findings

### F-1 — Four-audience model is coherent and audience-specific success criteria are named
- **Severity:** PASS
- **Section:** `01-BUSINESS-CASE.md` § 3 (the four audiences) +
  § 6 (success criteria).
- **Finding:** § 3 walks four audiences (inbound carriers/MGAs/SIs;
  MCP-ecosystem partner credibility; cowork cohort; broad OSS
  reach) and for each names: who, why, what they want from the
  repo, what we ship, what we deliberately do NOT ship. § 6
  carries that into success criteria with three signal classes
  (inbound conversion, distribution metrics, cowork-fork
  derivatives) and explicitly names the failure mode for each
  ("a failed program looks the opposite: stars accumulate but no
  inbound conversation rises above 'interesting'"). This is the
  level of audience-discipline that distinguishes a credibility
  artifact from marketing copy. Most OSS lead-magnet docs collapse
  the four audiences into one and end up serving none well. This
  one resists that compression.
- **Recommendation:** None.
- **Cite:** `01-BUSINESS-CASE.md:104-156` (§ 3) +
  `01-BUSINESS-CASE.md:277-318` (§ 6).

### F-2 — Per-customer mapping cost is qualitative; pre-audit red team F-RT-1.1 stands open
- **Severity:** CHALLENGE
- **Section:** `01-BUSINESS-CASE.md` § 4 ("Why this isn't a
  complete product") + the customization surface bullet list.
- **Finding:** The pre-audit red team raised this as F-RT-1.1
  (Persona 1 P&C Carrier CIO): *"Tell me — in engineer-weeks —
  what filling those YAMLs costs me. If you can't, I'm not
  signing the SOW."* The red-team recommendation was to add a
  § 4.5 to BUSINESS-CASE with three carrier-shape worked
  examples (small / medium / large) anchored in publicly-
  defensible Guidewire-estate complexity proxies (LOB count,
  state count, custom-entity count, typelist extension count) and
  rough engineer-week ranges, OR to explicitly accept the cost-
  bounding question as out-of-scope-for-the-public-artifact and
  declare it in `00-AUDIT-RESPONSES.md`. Neither option has
  landed in the merged blueprint as of this audit. The CIO's
  cost question is the load-bearing one for the inbound
  conversion thesis — without a bounded answer, the artifact
  reads as "credible, but commitment-shaped" instead of
  "credible AND scoped."
- **Recommendation:** Author the small/medium/large carrier-shape
  table at `01-BUSINESS-CASE.md` § 4.5 OR explicitly accept the
  bound as out-of-scope in `00-AUDIT-RESPONSES.md`. The author
  side: even a coarse table ("12 LOBs, 1 state, 0 custom entities
  → 4-6 engineer-weeks; 47 LOBs, 12 states, 3 custom entities →
  18-24 engineer-weeks") gives the CIO an anchor for their own
  scope conversation. The accept side: declare that
  "engineer-week sizing is one-on-one engagement scoping; the
  public artifact does not commit to a bound" — that's also
  defensible if the author wants to keep the conversation
  exclusively in commercial channels. The middle ground (silence)
  is the failure mode.
- **Cite:** `01-BUSINESS-CASE.md:160-205`,
  `02-RED-TEAM-PANEL.md` F-RT-1.1.

### F-3 — Cowork-derivative competition with SI margin (red team F-RT-6.2) is unaddressed
- **Severity:** CHALLENGE
- **Section:** `01-BUSINESS-CASE.md` § 3.3 (cowork cohort) + § 4
  (SI margin) + `02-PRD.md` § 7 (cowork fork-starter contract).
- **Finding:** The pre-audit red team flagged that the
  cowork-fork contract is permissive — nothing in the documents
  prevents a cohort member from forking the template, keeping it
  carrier-shaped (e.g. `flatbed-insurance-mcp` instead of the
  expected `flatbed-mcp`), and competing directly with the SI
  partner the lead-magnet thesis is meant to seed engagement
  with. The red-team recommendation was either (a) a soft
  fork-license note in `02-PRD.md` § 7.5 directing carrier-shape
  forks to engage rather than fork, OR (b) explicit acceptance
  that "competition for SI margin from cohort forks is a
  feature, not a bug." Neither has landed. From a business
  perspective the omission is more visible than F-RT-1.1 because
  Persona 6 (SI partner) is the audience the BUSINESS-CASE most
  carefully courts in § 4 — leaving the cowork-derivative
  question silent in front of the same audience reads as the
  SI's first nervousness un-answered.
- **Recommendation:** Land the soft fork-license note: add to
  `02-PRD.md` § 7.5 (or a new sub-section) something like:

  > "Cowork-fork derivatives are licensed Apache-2.0. The soft
  > expectation is that domain forks land *outside* Guidewire's
  > carrier surface — trucking, real estate, restaurant ops,
  > e-commerce. Carrier-domain forks are not endorsed by the
  > project; SI partners building on the harness should engage
  > directly through the lead-magnet conversation channel."

  Alternatively, accept the open-domain contract in
  `00-AUDIT-RESPONSES.md` and surface it in `01-BUSINESS-CASE.md`
  § 7 (risks) as a fourth named risk: *"7.4 Cowork derivatives
  cannibalize SI margin."* Either is a defensible position; the
  silence is what reads as evasion.
- **Cite:** `01-BUSINESS-CASE.md:130-138` (§ 3.3) +
  `01-BUSINESS-CASE.md:160-205` (§ 4) + `02-PRD.md:973-1037`,
  `02-RED-TEAM-PANEL.md` F-RT-6.2.

### F-4 — `pnpm gw onboard` boundary (CLI structures vs CLI generates) is a credibility lever for SI partners
- **Severity:** NOTE
- **Section:** `01-BUSINESS-CASE.md` § 4 (what we deliberately do
  NOT ship) + `02-PRD.md` § 8.4 (E4 acceptance) +
  `04-USER-JOURNEY.md` J-6.
- **Finding:** Pre-audit red team F-RT-6.3 raised this. The CLI
  in J-6 is a wizard that *collects* the SI's carrier-knowledge
  inputs and *structures* them into the 9 YAMLs — it is not a
  generator that synthesizes carrier mappings from a Guidewire
  tenant scan. That's the right boundary. But the BUSINESS-CASE
  does not surface the boundary explicitly. Reading § 4 alone, an
  SI partner could plausibly worry the CLI eats their billable
  hours by automating profile authoring. The journey doc J-6
  walks the wizard, but a 5-minute reader of the BUSINESS-CASE
  shouldn't need to navigate to J-6 to confirm the boundary.
- **Recommendation:** Add a one-sentence to
  `01-BUSINESS-CASE.md` § 4: *"The `pnpm gw onboard <customer>`
  CLI shipped in E10 structures the SI's carrier-knowledge
  output; it does not auto-generate carrier mappings. The SI's
  18-month per-carrier authoring work is the input the CLI
  collects, not a deliverable the CLI replaces."* ~5 min edit;
  closes red-team F-RT-6.3 in the right doc.
- **Cite:** `01-BUSINESS-CASE.md:160-205`,
  `04-USER-JOURNEY.md:687-806`, `02-RED-TEAM-PANEL.md`
  F-RT-6.3.

### F-5 — Distribution KPIs are leading indicators only; the lagging revenue indicator is named but not framed
- **Severity:** NOTE
- **Section:** `01-BUSINESS-CASE.md` § 6 (success criteria) +
  `07-ROADMAP.md` § "Distribution metrics worth tracking".
- **Finding:** § 6 names three signal classes:
  inbound conversion, distribution metrics, cowork-fork
  derivatives. The phrasing distinguishes leading vs trailing
  ("None of these are revenue; all of them are leading indicators
  ... the trailing one is the engagement contract."). That
  phrasing is correct. **What's underspecified:** what's the
  expected leading-to-trailing ratio? In any lead-magnet program,
  the question a CFO asks is "how many stars / forks / inbounds
  does it take to produce one engagement?" The blueprint says
  "stars by week" / "forks ÷ stars > 0.10" / "npm downloads of
  `@intentsolutions/guidewire-harness` once E3 ships" — these
  are the right metrics, but no expected funnel ratio is named.
  Without a target ratio, "the artifact is being read by the
  right population" lacks a falsifiability test.
- **Recommendation:** Add to § 6 ("Distribution metrics") a
  one-paragraph "Expected funnel shape" with the author's best
  guess at conversion ratios (even if rough — e.g. "~1k stars
  with fork ratio > 0.10 corresponds to ~5-10 inbound
  conversations per quarter at maturity, of which ~1-2 convert
  to scoped engagement"). The numbers will be wrong; that's
  fine. The point is to make the success / failure framing
  testable in a year. The current framing isn't.
- **Cite:** `01-BUSINESS-CASE.md:277-318` (§ 6),
  `07-ROADMAP.md:617-625`.

### F-6 — `payments-mcp` carve at repo level is the right discipline; the future opening trigger is named correctly
- **Severity:** PASS
- **Section:** `01-BUSINESS-CASE.md` § 8 (what this document
  doesn't decide) + `02-PRD.md` § 3.6 + `004-DR-DEC` D-018 +
  `006 § 6.1` + § 9 recommendation 4.
- **Finding:** Across the entire blueprint set, the discipline
  for `payments-mcp` is consistent: no directory in this repo,
  carve at the repo level (not just the catalog level), money
  movement requires dual-control review that hasn't happened,
  the trigger to open `payments-mcp` is "a paying customer asks
  for it" (D-018 + § 8 of business case). § 8 is the right
  place for this — the business case names what it doesn't
  decide ("whether and when that repo opens is downstream of the
  carrier-engagement conversation, not upstream"). This
  discipline is what makes the lead-magnet thesis honest.
  Loosening it (e.g. shipping a "starter" `payments-mcp` to
  attract SI engagement) would convert the OSS from credibility
  artifact to attractive-nuisance. § 8 holds the line.
- **Recommendation:** None. Hold the line through all of
  E1-E11+. The temptation to "while we're at it, ship a stub
  payments-mcp" will appear; refuse it.
- **Cite:** `01-BUSINESS-CASE.md:386-392` (§ 8 — `payments-mcp`
  go/no-go), `004-DR-DEC` D-018, `006 § 6.1`.

### F-7 — Inbound credibility list (2 unprompted contacts) is honestly framed and the audience-1 thesis hangs on it
- **Severity:** PASS
- **Section:** `01-BUSINESS-CASE.md` § 2 ("Why now") +
  `00-MASTER-BLUEPRINT.md` § executive summary +
  `004-DR-DEC` D-009.
- **Finding:** The "Early demand signal" paragraph (§ 2)
  acknowledges 2 unprompted inbound contacts before public
  footprint. It explicitly notes that's not the same thing as a
  sale ("That signal is not the same thing as a sale, but it
  answers the 'is this a real practice?' question"). D-009
  ("Public OSS from day 1") follows from this signal: build-in-
  public converts inbound. From a business-analyst perspective
  this is the right framing — overclaiming the inbound (e.g.
  "two carrier customers committed before public launch") would
  poison the artifact's credibility for the next reader. Under-
  claiming would lose the audience-1 thesis. The phrasing in
  § 2 is calibrated: the inbound is real signal, not yet
  revenue, the artifact converts the signal into engagement.
- **Recommendation:** None. When the inbound conversation list
  grows (it will), keep the § 2 framing calibrated — name the
  count, name the conversion, never name the counterparty.
  Per `00-MASTER-BLUEPRINT.md` § "Status snapshot" + § 8 of
  BUSINESS-CASE the discipline is to keep named relationships in
  one-on-one channels — never in committed repo files. Hold the
  line.
- **Cite:** `01-BUSINESS-CASE.md:74-101` (§ 2),
  `004-DR-DEC` D-009.

## Summary

Recommended actions in priority order:

1. **F-2 (CHALLENGE):** address Persona 1's cost-bounding
   question — either author the small/medium/large carrier-shape
   table at § 4.5 or explicitly accept the bound as out-of-scope
   in `00-AUDIT-RESPONSES.md`. The silence is the failure mode.
   ~30-60 min if authoring; ~10 min if accepting.
2. **F-3 (CHALLENGE):** land the soft fork-license note in
   `02-PRD.md` § 7 closing the cowork-derivative SI-margin
   concern. ~15 min.
3. **F-4 (NOTE):** add the one-sentence CLI-boundary
   clarification to `01-BUSINESS-CASE.md` § 4. ~5 min.
4. **F-5 (NOTE):** add expected funnel-shape paragraph to
   BUSINESS-CASE § 6. ~15 min.

PASS endorsements (F-1, F-6, F-7) are the framing-discipline
properties: four-audience separation, payments carve, calibrated
inbound framing. All three are durable and load-bearing.

E1 is unblocked from this lane. F-2 + F-3 are credibility-
hardening edits, not blockers; the staffed-panel verdict can
ship with both as accepted CHALLENGEs in `00-AUDIT-RESPONSES.md`
if the author prefers to defer the prose work.

jeremylongshore.com made me do it
  -claude
intentsolutions.io
