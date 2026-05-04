# 007-DR-MEMO — Carrier-vocabulary curation memo (Phase 0 Day 3)

**Filed:** 2026-05-04
**Author:** carrier-vocabulary-curator (Mode A design memo)
**Bead:** `guidewire-mgn`
**Feeds:** GW-1.2 (PRD tool catalog authoring), GW-1.5 (User Journeys content authoring)
**Status:** Phase 0 input artifact — feeds blueprint sections **02-PRD § 3** and **04-USER-JOURNEY § J-1..J-6**.

Reviewed against `004-DR-DEC` D-001 (carrier-vocabulary as dominant abstraction); `002-DR-CRIT` Personas 2 / 3 / 4 / 8; `003-DR-ARCH` § "What the architecture is built around"; `CLAUDE.md` Hard rule #2.

Boundary: **language lane only.** A tool that sounds authentic but maps to the wrong endpoint or has the wrong blast radius is a finding for `guidewire-api-archaeologist` or `mcp-safety-reviewer`, not this memo.

---

## 1. Verdict legend

| Verdict | Meaning |
|---|---|
| **AUTHENTIC** | An operator with 3+ years in role would say this exact phrase to a colleague unprompted. |
| **PASSABLE** | Reads as carrier vocabulary, but isn't quite how a senior operator phrases it. Polish, not block. |
| **ARTIFICIAL** | API verb in an English costume. Rename before catalog ships. |
| **API-VERB-LEAK** | Contains `search_*` / `get_*` / `list_*` / `fetch_*` / `query_*` / `update_*` / `create_*` / `delete_*`. Instant fail per Hard rule #2. |

Every verdict below is demonstrated with a sentence in the operator's voice — the line itself, not a description *about* the operator.

---

## 2. Catalog review — by suite

Catalog under review = union of tools in `02-PRD § 3`, the carrier-verb table in `003-DR-ARCH`, and the journeys in `04-USER-JOURNEY`. One verdict per tool.

### 2.1 `policycenter-mcp` (PolicyCenter + UnderwritingCenter)

| Tool | Verdict | Operator's voice |
|---|---|---|
| `find-submissions-waiting-on-me` | **AUTHENTIC** | *"Pull up everything waiting on me — I want to clear my queue before lunch."* "Waiting on me" is exactly how underwriters describe their personal queue. Possessive scope is doing real work. |
| `whats-our-appetite-on-this-risk` | **AUTHENTIC** | *"What's our appetite on this risk — are we even writing trucking in this state right now?"* "Appetite" is the load-bearing carrier term. Persona 2's exact attack quote, encoded. |
| `show-policies-for-this-insured` | **PASSABLE** | An underwriter would more likely say *"what does this insured have with us?"* — which is in fact the carrier-verb table's wording. **Rename:** `what-does-this-insured-have-with-us`. |
| `summarize-this-submission` | **AUTHENTIC** | *"Give me the elevator pitch on this submission before I dig in."* The persona is implicit; drop the old `_for_underwriter` suffix. |
| `did-we-lose-this-account` | **AUTHENTIC** | *"Did we lose this account last year, or did we non-renew it? I don't want to re-quote a body we already walked away from."* Verbatim Persona 2. |
| `explain-why-this-got-referred` | **AUTHENTIC** | *"Explain why this got referred — was it the loss ratio or the limits?"* "Got referred" (passive) is referral-matrix vocabulary. |
| `draft-referral-note` | **AUTHENTIC** | *"Draft a referral note for the senior underwriter — flag the prior loss and the SIC code."* Mode `draft_only` per Persona 8's separation demand. |
| `propose-endorsement` | **PASSABLE** | "Propose" reads as one beat too formal — underwriters say *"draft an endorsement"*. **Rename:** `draft-endorsement` (parallel to `draft-referral-note`, `draft-denial-letter`). |

**Strong.** 5 AUTHENTIC, 2 PASSABLE, 0 leaks. Persona 2 attacked here hardest and v4 responded best.

### 2.2 `claimcenter-mcp` (ClaimCenter)

| Tool | Verdict | Operator's voice |
|---|---|---|
| `find-claims-at-risk-of-leakage` | **AUTHENTIC** | *"Find claims at risk of leakage — anything where reserves haven't moved in 60 days but medicals are still open."* "Leakage" is *the* claims-VP word; Persona 3's idiom encoded. |
| `summarize-this-loss` | **AUTHENTIC** | *"Summarize this loss for me — what happened, who's hurt, and where are we on coverage?"* Adjusters use "the loss" as the noun for the file. |
| `whats-the-reserve-picture` | **AUTHENTIC** | *"What's the reserve picture on this file? I think we're under on indemnity."* Veteran-adjuster language — anyone with 3+ years says it without irony. |
| `draft-denial-letter` | **AUTHENTIC** | *"Draft a denial letter citing the late-notice provision and the policy effective date."* Canonical example in the agent definition. Mode `draft_only` — Persona 8 endorsed. |

**Strong but thin.** All 4 AUTHENTIC; 0 leaks. Deficit is breadth, not authenticity — see § 4.2.

### 2.3 `billingcenter-mcp` (BillingCenter)

| Tool | Verdict | Operator's voice |
|---|---|---|
| `show-overdue-accounts` | **AUTHENTIC** | *"Show me what's overdue for Acme Brokerage — I need to know who I'm calling tomorrow."* Verbatim from carrier-verb table. |
| `whats-the-payment-status` | **PASSABLE** | A billing operator would more likely say *"where are we on this payment?"* — "the payment status" reads slightly like a UI field label. **Polish:** `where-are-we-on-this-payment`. Not a block. |
| `find-billing-issues-for-this-policy` | **PASSABLE** | "Billing issues" is generic; operators use specific terms (dunning, autopay-fail, write-off pending). **Rename:** `whats-going-on-with-this-account` — matches operator's actual wide-aperture-then-drill mental model. |
| `reconcile-this-payment` | **AUTHENTIC** | *"Reconcile this payment — the producer says they sent it Tuesday but it's not showing up."* "Reconcile" is the carrier-native verb; mode `approved_execute` correct because money. |

**Mostly OK.** 2 AUTHENTIC, 2 PASSABLE, 0 leaks.

### 2.4 `producer-mcp` (Producer hierarchy across suites)

Highest-stakes suite for vocabulary because Persona 4 explicitly attacked the original architecture for treating producers as "second-class citizens who get a producer portal scrap." Wrong language here = Persona 4 walks.

| Tool | Verdict | Operator's voice |
|---|---|---|
| `show-my-book-of-business` | **AUTHENTIC** | *"Show me my book — what's bound, what's quoted, what's expiring next quarter."* Producers say "my book" hundreds of times per quarter. The `my-` is doing real work. |
| `whats-my-commission-status` | **AUTHENTIC** | *"What's my commission status on the renewals from last month? My statement looked light."* Verbatim Persona 4. |
| `find-my-pending-quotes` | **AUTHENTIC** | *"Find my pending quotes — anything I've started that I haven't bound yet."* |

**Pristine but dangerously thin.** 3 tools is not first-class citizenship — it's a portal scrap by another name. Names that exist are excellent; the vocabulary deficit is severe (see § 4.5).

### 2.5 `events-mcp` (query-only)

| Tool | Verdict | Operator's voice |
|---|---|---|
| `replay-event` | **PASSABLE → ARTIFICIAL leaning** | "Replay event" is engineering-speak; the operator who'd use this isn't an underwriter or adjuster — it's an integration engineer / SRE, where "replay" *is* native (Datadog, Stripe, Splunk). Verdict depends on which persona owns events-mcp. |
| `find-events-for-claim` | **PASSABLE** | The carrier word for an event-on-a-claim is "activity" — *"show me the activity history on this claim"*. **Rename for adjuster path:** `show-activity-on-this-claim`. Keep `find-events-for-claim` if both audiences need served. |

**Persona-scoping unclear.** D-004 implies integration engineers; if so, names are fine. If business operators are the audience, both need rework. **Recommendation:** state events-mcp's persona explicitly in PRD §3 header.

### 2.6 `payments-mcp` (out of OSS demo)

No tools enumerated. Pre-flag: payments tools will need **treasury-operator** vocabulary — *sweep the trust account, release the disbursement, net the producer commissions* — different idiom than billing or claims.

---

## 3. Aggregate scoreboard

| Suite | AUTHENTIC | PASSABLE | ARTIFICIAL | API-VERB-LEAK | Total |
|---|---|---|---|---|---|
| policycenter-mcp | 5 | 2 | 0 | 0 | 7 |
| claimcenter-mcp | 4 | 0 | 0 | 0 | 4 |
| billingcenter-mcp | 2 | 2 | 0 | 0 | 4 |
| producer-mcp | 3 | 0 | 0 | 0 | 3 |
| events-mcp | 0 | 2 | 0 | 0 | 2 |
| **Total** | **14** | **6** | **0** | **0** | **20** |

**Headline:** zero API-verb leaks, zero ARTIFICIAL. Persona 2's attack on the original `001-DR-RES` API-verb naming convention drove a clean cut, and the catalog has stayed on the right side. Remaining work = density (especially Persona 4) and polish on six PASSABLE entries. Most MCP server projects ship far worse — the structural temptation toward `search_*` / `get_*` / `list_*` is real, and v4 has resisted it.

---

## 4. Missing carrier-vocabulary surface — by persona

Phrases operators say weekly with no v4 tool counterpart. Top-5 each, ordered by frequency.

### 4.1 Underwriter (Persona 2)

1. **`show-my-renewal-pipeline`** — *"Show me my renewals coming up in the next 60 days, sorted by premium."* The #1 forward-looking underwriter question.
2. **`is-this-account-profitable`** — *"Is this account losing money? Pull the loss ratio across the last three policy periods."*
3. **`whats-the-loss-history-on-this-risk`** — *"Pull the loss runs — five years, all carriers if we have them."* "Loss runs" is the most-cited input to underwriting decisions.
4. **`who-else-has-quoted-this`** — *"Did we already quote this submission through another producer? I don't want to double-write."* Real headache in MGA-heavy lines.
5. **`compare-this-quote-to-the-incumbent`** — *"How does our quote stack up against what they have now? Where are we tighter and where are we looser?"*

### 4.2 Claims adjuster (Persona 8 — Kim)

1. **`show-claims-on-my-desk`** — *"Show me what's on my desk this morning — sorted by reserve, oldest first."* Adjuster's daily-queue phrase, parallel to underwriter's "waiting on me."
2. **`whats-the-coverage-position`** — *"What's the coverage position on this loss? Are we ROR, denying, or paying clean?"*
3. **`show-the-activity-on-this-claim`** — *"Show me the activity — what's been done, who touched it, what's open."* (Overlaps `find-events-for-claim` — see § 2.5.)
4. **`is-this-claim-going-to-litigation`** — *"Is this one heading to lit? Litigated claims have a different reserve playbook."*
5. **`whose-handling-this-claim`** — *"Who's the assigned adjuster? I need to hand off the medicals."* Even read-only assignment lookups belong in carrier vocab, not generic `get-claim-by-id`.

### 4.3 Claims VP (Persona 3)

VPs care about portfolio shape, not file-level work. v4 has `find-claims-at-risk-of-leakage` and stops there.

1. **`whats-our-severity-trending`** — *"What's our severity trending across BI claims? Last quarter's average is up — is the new MD network the culprit?"*
2. **`show-stale-files-in-my-org`** — *"Which files in my org haven't moved in 90 days? Sort by adjuster — I want to know who's drowning."*
3. **`whats-our-cycle-time-on-this-LOB`** — *"What's our cycle time on auto BI right now versus six months ago? Are we slipping?"* VP KPI.
4. **`show-reopen-rate-by-adjuster`** — *"Show me reopen rates by adjuster — anyone above the org average?"* Adjuster-quality signal.
5. **`find-leakage-categories-for-this-quarter`** — *"What kind of leakage are we seeing this quarter — overpayment, late-deny, missed subro?"*

### 4.4 Billing operator

1. **`show-the-aging-buckets`** — *"Walk me through the aging — what's in 30-60, 60-90, 90+? Who's getting a NOC letter?"*
2. **`whats-pending-in-dunning`** — *"What's currently in dunning? Anything escalated to legal yet?"*
3. **`is-this-account-on-autopay`** — *"Is this on autopay? Did the bank reject the last sweep?"*
4. **`refund-this-overpayment`** — *"Refund the $4,200 overpayment to the producer's trust account, not the policyholder."* Mode `approved_execute`.
5. **`whats-the-cancellation-status`** — *"Where are we on the cancel? Notice issued, in flight, or rescinded?"*

### 4.5 MGA broker / producer (Persona 4)

**Where the v4 catalog is most under-served vs Persona 4's attack.** Three tools is not first-class citizenship.

1. **`whats-my-loss-ratio-on-this-program`** — *"What's my loss ratio on the trucking book? The carrier just non-renewed me on aviation; I'm watching trucking like a hawk."* Producer-survival question.
2. **`show-my-bind-ratio-this-month`** — *"What's my bind ratio this month vs. last month? My team's quoting fine but closing soft."* THE producer-side performance metric.
3. **`whats-my-renewal-retention`** — *"What's my retention rate? If I'm under 80% the carrier's going to call me."*
4. **`find-accounts-going-to-the-competition`** — *"Which accounts did I lose to the competition this year? Pull the BORs and the renewal-shop notes."* Producer-side mirror of `did-we-lose-this-account`.
5. **`whats-my-carrier-availability-for-this-class`** — *"What carriers can I write trucking-flatbed for in Texas right now? I just lost two markets."* Flips `whats-our-appetite-on-this-risk` to producer perspective.

### 4.6 Underwriting manager / referrer

**Not currently named in `002-DR-CRIT`** but implicit in `explain-why-this-got-referred` (referrals go *to* an underwriting manager).

1. **`show-my-referral-queue`** — *"Show me everything that's been referred up to me. Anything still sitting after 24 hours gets a phone call."*
2. **`whats-the-authority-stack-on-this`** — *"Who has authority for this? It's $5M limits in California — that's outside the line UWs."*
3. **`approve-this-referral-with-conditions`** — *"Approve it, but flag the loss-control inspection requirement and add the protective-safeguard endorsement."* Mode `approved_execute`.
4. **`show-my-team-referral-volume`** — *"How many referrals did my team push up this week? If it's spiking, I want to know which UW."*
5. **`is-this-referral-pattern-normal`** — *"Is this account getting referred every renewal? If so, why aren't we just adjusting the authority?"*

**Recommendation to GW-1.2 authors:** add **underwriting manager** as a named persona in `02-PRD § 2`; consider adding to `002-DR-CRIT` as Persona 9. The role exists, the vocabulary exists, the v4 catalog has nowhere for it to live.

---

## 5. Domain-density gaps by suite

| Suite | Today | Operator phrases said weekly with no tool | Rough deficit |
|---|---|---|---|
| policycenter-mcp | 7 | renewal pipeline, loss runs, profitability, competitive comparison, cross-producer dedupe, account-class history | ~5-6 missing |
| claimcenter-mcp | 4 | adjuster desk view, coverage position, activity history, litigation flag, assignment lookup, subrogation status | ~6-7 missing |
| billingcenter-mcp | 4 | aging buckets, dunning pipeline, autopay state, refund authority, cancellation lifecycle, NSF handling | ~5-6 missing |
| producer-mcp | 3 | loss ratio, bind ratio, retention, lost-business analysis, carrier-availability, commission projections | ~6+ missing (deepest deficit) |
| events-mcp | 2 | depends on persona scoping (§ 2.5) | TBD |

**Pattern:** catalog is **shallow but well-shaped**. Names that exist are right. Work remaining = broadening within each suite to ~8-12 tools (well within Persona 7's 15-20-tools-per-server budget), then re-auditing at the new breadth.

---

## 6. Anti-pattern call-outs (PR-time forbidden list)

Engineering-speak that doesn't leak today but will the moment a new contributor adds a tool. Hash-pin this list in `audit-harness`:

| Anti-pattern | Why it leaks | Counter-pattern |
|---|---|---|
| `serialize`, `deserialize`, `marshal` | API-stub idioms | Speak about the artifact: `summarize-`, `draft-`, `show-` |
| `mutate` | Database / REST verb | `change-`, `update-` only when the operator would say it (rare) |
| `fetch`, `pull` (network sense) | Engineer's "go get the bytes" verb | `pull-` is OK in operator sense (*"pull this claim"*); `fetch-` always reads as engineer |
| `payload`, `body`, `request`, `response` | HTTP wrapper vocabulary | Operators describe content (the loss, the policy), not the wrapper |
| `cursor`, `pagination`, `offset`, `limit` | Database concepts | Operators say *"show me the next 50,"* *"the rest"* |
| `search_`, `query_`, `filter_` | Forbidden API-verb prefixes | `find-`, `show-`, `pull-` per carrier-verb table |
| `by_id`, `by_criteria` | SQL-clause leakage | Operator already has the identifier; phrase as *"this claim,"* *"this account"* |
| `_for_underwriter`, `_for_adjuster` | Persona-as-suffix | Drop — persona is implicit in the suite |

---

## 7. Recommendations to GW-1.2 PRD authors — encode at PR review

1. **The "junior analyst" test.** Read the tool name aloud. Could you say it to a junior in the operator's role and have them know what to do? If you have to translate, the name fails.
2. **The "API-verb-prefix scan."** Grep for `search_` / `get_` / `list_` / `fetch_` / `query_` / `update_` / `create_` / `delete_` / `find_*_by_*`. Any hit blocks PR. (`find-` without `_by_` is fine.)
3. **The "possessive scope check."** Tools operating on a record the operator already has in context use *"this"* or *"my"*. Generic `-by-id` style fails.
4. **The "question-form check."** Read-only diagnostics → questions (*"what's our appetite,"* *"did we lose"*); writes → imperatives (*"draft,"* *"reconcile"*). Systematic mixing = author writing API verbs in disguise.
5. **The "engineering-speak grep."** Block anything containing § 6's left column. Hash-pin so it can't drift.
6. **The "persona density check."** Before merging, count tools per persona (§ 4.1-4.6). Any persona under 5 tools = explicitly call out as a known gap in PRD; don't paper over.
7. **The "suite-density check."** List the top-10 weekly phrases an operator says per suite (§ 5). Phrases without tool coverage = document in PRD §3 footer as "next-tranche additions."
8. **The "GW-1.5 user-journey echo test."** Every PRD tool name should appear verbatim in at least one user journey. If the journey author can't naturally write the operator's voice around the tool name, the name is wrong.

---

## 8. Open questions for GW-1.2 / GW-1.5 authors

1. **events-mcp persona.** Integration engineers (`replay-event` fine) or business operators (rename to activity-vocabulary)? Affects 6 downstream tools.
2. **Underwriting manager persona.** Add to `002-DR-CRIT` as Persona 9? If yes, the 5 tools in § 4.6 deserve a dedicated PRD subsection.
3. **producer-mcp density.** Persona 4's first-class-citizen claim stands or falls on density. Three tools is a portal scrap. Is the v4 commitment to ~8-12 producer tools in E9, or is producer scope deferred? PRD should state target explicitly.
4. **Treasury-operator persona for payments-mcp.** Add to `002-DR-CRIT`, or fold into billing-operator? Different idioms — *sweep, net, disburse, hold, reverse* — that don't read as billing.
5. **Profile-driven tool-name aliases.** `profiles/_template/field-aliases.yaml` (D-007) maps Guidewire field names to carrier-vocabulary terms. Should it also drive **tool-name aliases per customer** — a carrier that calls submissions "applications" gets `find-applications-waiting-on-me`? v2 question, but flag it now before the schema freezes.

---

## 9. TL;DR for GW-1.2 author

- **20 tools reviewed across 5 suites.** 14 AUTHENTIC, 6 PASSABLE, 0 ARTIFICIAL, 0 API-VERB-LEAK. No hard rejects.
- **Six PASSABLE renames** suggested in § 2 — all polish, none block PRD.
- **Density is the real gap.** PolicyCenter / ClaimCenter / BillingCenter want ~5-6 more tools each. producer-mcp wants ~6+ more — Persona 4's first-class-citizen claim depends on closing this.
- **Add underwriting manager** as a named persona (§ 4.6).
- **§ 7's 8-rule PR-time checklist is the load-bearing deliverable.** Encode in `audit-harness` so it gates every tool-catalog PR mechanically.

The center of gravity is in the right place. Work remaining = filling out the rest of the room.

---

## Cross-references

- D-001: [`./004-DR-DEC-architecture-decisions.md`](./004-DR-DEC-architecture-decisions.md)
- Persona attacks: [`./002-DR-CRIT-personas.md`](./002-DR-CRIT-personas.md) §§ Persona 2, 3, 4, 8
- Carrier-verb table: [`./003-DR-ARCH-oss-cowork.md`](./003-DR-ARCH-oss-cowork.md) § "What the architecture is built around"
- Tool catalog under review: [`./blueprint/02-PRD.md`](./blueprint/02-PRD.md) § 3
- User journeys under review: [`./blueprint/04-USER-JOURNEY.md`](./blueprint/04-USER-JOURNEY.md) §§ J-1..J-6
- Public Guidewire docs: [`./005-DR-REF-guidewire-public-resources.md`](./005-DR-REF-guidewire-public-resources.md)
- Agent definition: [`../.claude/agents/carrier-vocabulary-curator.md`](../.claude/agents/carrier-vocabulary-curator.md)
