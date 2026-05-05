# 01 — Business Case

> *Why this exists, who it serves, what makes the OSS-as-lead-magnet
> framing work, and what would prove it isn't working.*

**Filed:** 2026-05-04
**Bead:** `guidewire-9mm` (under epic `guidewire-7jt` — GH [#2](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/2))
**Inputs:** [`../003-DR-ARCH-oss-cowork.md`](../003-DR-ARCH-oss-cowork.md), [`../004-DR-DEC-architecture-decisions.md`](../004-DR-DEC-architecture-decisions.md), [`./02-PRD.md`](./02-PRD.md) § 1, [`../002-DR-CRIT-personas.md`](../002-DR-CRIT-personas.md).
**Status:** authored content (replaces GW-1.1 skeleton).

---

## 0. TL;DR

Guidewire MCP for Claude is a public OSS repository whose job is to
**convert carrier / MGA / SI inbound into custom build engagements**.
It is not a complete end-to-end product. The wedge is two
differentiators that are hard to copy and that operators recognize on
first read: **carrier-vocabulary tools** (the tool name *is* the
question an underwriter would ask) and a **governance harness**
(plan → policy → approval → execute → hash-chain audit → rollback)
strong enough to earn trust on writes. Four audiences (in priority
order: inbound carriers / MGAs / SIs, MCP-ecosystem partner
credibility, cowork cohort, broad OSS reach) are served by the same
artifact. Margin lives in per-customer profile work (LOB mappings,
typelists, custom entities, approval matrices) — exactly the surface
an SI with deep Guidewire practice ships, and exactly what the OSS
deliberately does not pretend to ship.

---

## 1. The thesis

Underwriters do not say `search_policies(query, limit)`. They say
*"find submissions waiting on me."* Claims adjusters do not say
`get_claim(id)`. They say *"summarize this loss."* Billing
operators do not say `apply_payment(payment_id, account_id)`. They
say *"reconcile this payment."* The vocabulary the operators already
speak is the right MCP surface — and it isn't the API surface
reskinned with friendlier verbs. The two are different abstractions.

The carrier-vocabulary thesis is one of two halves. The other is the
governance harness. Wrapping a Guidewire estate in MCP tools without
a governance contract on writes is exactly the SOC 2 finding a CISO
wrote into the persona red team
([Persona 5](../002-DR-CRIT-personas.md#persona-5--security--ciso)):
standing service-account credentials, no per-call audit, no
idempotency, no policy gate. A carrier-credible MCP needs writes
that are planned, policy-evaluated, approved, idempotency-keyed, and
hash-chain audited — and the ability to refuse, with a structured
reason, when any of those is missing.

The combination is the wedge. API-verb wrappers are commoditized;
governance-wrapped carrier-vocabulary tools are not. This repo's
[D-001](../004-DR-DEC-architecture-decisions.md#d-001--carrier-vocabulary-tools-are-the-dominant-abstraction)
makes vocabulary the dominant abstraction.
[D-002](../004-DR-DEC-architecture-decisions.md#d-002--6-servers-organized-by-guidewire-suite-not-by-capability)
organizes servers by Guidewire suite (PolicyCenter, ClaimCenter,
BillingCenter, Producer, Events) rather than by capability, so each
server stays inside the agent's tool-selection budget while still
covering the operator's full workflow.
[D-003](../004-DR-DEC-architecture-decisions.md#d-003--harness-is-a-library--cli-not-an-mcp-server)
keeps the harness as a library + CLI rather than another MCP — the
harness invokes MCPs and gates writes; making it itself an MCP is
recursive and competes for the same selection budget.

One sentence: *the tools the operators actually speak — wired
through a governance harness that earns trust on writes — is the
right MCP surface for Guidewire.*

---

## 2. Why now

Three signals converge in the first half of 2026.

**Guidewire's own AI surface is internal-only.** ProNavigator
shipped embedded in InsuranceSuite (public Guidewire announcement,
April 2026), proving carriers will accept AI inside their estate.
But it is Guidewire's AI for Guidewire data — internal, suite-bound,
not an external-agent integration story. The space for an external
agent surface that handles Claude / Anthropic ecosystem governance
and per-customer profile mapping is unfilled. ProNavigator validates
the appetite; it doesn't compete with the wedge.

**The MCP / Anthropic ecosystem is production-grade.** The official
TypeScript SDK is stable, MCP is a recognizable standard inside
enterprises evaluating agent platforms, and Claude Code is moving
into engineering organizations that include carriers. A
TypeScript-on-Node-22 build today rides on infrastructure that
didn't exist eighteen months ago.

**Early demand signal.** Unprompted inbound from carrier-touching
engineers reached this project before it had any public footprint.
That signal is not the same thing as a sale, but it answers the
"is this a real practice?" question that every credibility artifact
exists to answer. The repo's existence and depth is now the
follow-up. **Build-in-public** ([D-009](../004-DR-DEC-architecture-decisions.md#d-009--public-oss-from-day-1-day-3-release))
is the publishing strategy — the public footprint is the credibility
artifact.

---

## 3. The four audiences

The repo serves four audiences in priority order. They share an
artifact; they do not share success criteria. Treating them as one
audience is how OSS lead magnets fail.

### 3.1 Inbound carriers / MGAs / SIs (primary economic driver)

| Dimension | Detail |
|---|---|
| Who | Engineers + architects inside carriers, MGAs, brokers, and Guidewire SI partners who are evaluating an agent strategy for their Guidewire estate. |
| Why this audience | Custom build engagements are the revenue. Every other audience is upstream of this one. |
| What they want from the repo | Evidence the author has thought about Guidewire-specific failure modes (custom entities, jurisdictional forms, typelist drift, approval matrices), not generic API plumbing. They want the 30-minute repo read to compress a "do we trust these people enough to scope work" cycle from weeks. |
| What we ship for them | Public blueprint + decision log + persona red team + carrier-vocabulary tool catalog + harness contract. The `profiles/_template/` shape (per [D-007](../004-DR-DEC-architecture-decisions.md#d-007--customer-config-is-profiles-not-adapterscustomers)) is the visible "this is the thing your team can fill in" surface. |
| What we deliberately do NOT ship | Working `approved_execute` against a real customer estate; carrier-specific LOB mappings; production approval matrices. Those are the engagement, not the lead magnet. |

### 3.2 MCP-ecosystem partner credibility

| Dimension | Detail |
|---|---|
| Who | The Anthropic / MCP ecosystem — partner reviewers, technical evaluators, anyone who needs depth-of-thinking proof on agent governance for regulated estates. |
| Why this audience | A public, depth-rich repo is the credibility artifact partner conversations need. No closed-door demo, no NDA round-trip — the repo IS the proof. |
| What they want from the repo | The harness contract ([009](../006-DR-MEMO-mcp-safety.md) memo + the harness-runtime memo), real-world refusal scenarios, hash-chain audit story, span coverage policy in CI ([D-013](../004-DR-DEC-architecture-decisions.md#d-013--observability-is-wired-in-from-day-1-not-bolted-on)). |
| What we ship for them | Same artifact, foregrounding the harness package + observability + safety reviewer memos. |
| What we deliberately do NOT ship | Marketing copy that sells partnership before depth. The voice stays operator-first. |

### 3.3 Cowork cohort (Claude Code & Cowork Accelerator)

| Dimension | Detail |
|---|---|
| Who | Cohort members who are not Guidewire engineers, learning the agent + governance pattern by forking the template into their own domain. |
| Why this audience | Repeated, public, week-by-week build cadence (each of the 10 epics ≈ one week of cowork content per [D-011](../004-DR-DEC-architecture-decisions.md#d-011--cowork-integration--fork-starter-template--curriculum)) is its own distribution channel. Their derivative MCPs become the second-order proof the pattern generalizes. |
| What they want from the repo | A fork-starter that scaffolds (`pnpm guidewire init <domain>`), a per-epic curriculum, and non-engineer contribution surfaces (tool descriptions, fixture provenance docs, README examples). |
| What we ship for them | E4 ships `templates/cowork-fork-starter/` and the init script. Per-epic curriculum lands as a chapter in `08-COWORK-CURRICULUM.md`. |
| What we deliberately do NOT ship | A version of the repo that only makes sense if you're a cowork member. The artifact has to read as carrier-credible first; cowork is layered on, not the floor. |

### 3.4 Broad OSS reach

| Dimension | Detail |
|---|---|
| Who | The standard OSS distribution surface — stars, forks, npm downloads, drive-by issues, blog references. |
| Why this audience | Distribution itself is the moat. The author's previous OSS distribution (a separate Claude Code plugins repo at scale, multiple thousand stars and tens of thousands of npm downloads) is the playbook this repo applies. |
| What they want from the repo | A README that compresses the thesis to thirty seconds, a working install once E1 ships, a roadmap that doesn't read like vapor. |
| What we ship for them | Public roadmap, public decisions, public audit panel, public release of `@intentsolutions/guidewire-harness` once E3 lands. |
| What we deliberately do NOT ship | Star-bait. No clickbait READMEs, no "we wrap your Guidewire" framing, no claims the harness is doing things it isn't doing yet. |

The four audiences share the same artifact precisely because the
artifact is dense enough to serve all four. A thinner artifact
(Anthropic-style demo + token marketing) loses 3.1 and 3.2; a
denser artifact (full reference implementation with carrier
mappings) loses 3.3 and 3.4 and crowds out the SI engagement
margin discussed in § 4.

---

## 4. Why this isn't a complete product

The
[v4 architecture memo](../003-DR-ARCH-oss-cowork.md) and
[D-010](../004-DR-DEC-architecture-decisions.md#d-010--oss--lead-magnet-for-custom-build-work-not-a-complete-product)
both encode the same constraint: optimize for "credible enough that
an inbound carrier scopes work" — not "complete enough to be the
entire product end-to-end." Over-building the OSS until there is no
remaining customization surface kills the funnel. The discipline is
to leave the customization surface visible and well-shaped, not to
fill it.

This answers
[Persona 6](../002-DR-CRIT-personas.md#persona-6--guidewire-si-partner-deloitte--pwc--capgemini)
— the Guidewire SI partner — directly. The SI's question is
"are you replacing me, or selling me a tool?" The honest answer is:
this is the *tool* SIs use to deliver. The OSS surface is:

- The harness library + CLI ([D-002](../004-DR-DEC-architecture-decisions.md#d-002--6-servers-organized-by-guidewire-suite-not-by-capability), [D-003](../004-DR-DEC-architecture-decisions.md#d-003--harness-is-a-library--cli-not-an-mcp-server)) — published as `@intentsolutions/guidewire-harness` once E3 ships.
- The five suite MCP servers in `read_only` and `draft_only` mode by default ([D-005](../004-DR-DEC-architecture-decisions.md#d-005--three-execution-modes-per-tool)).
- The `profiles/_template/` shape ([D-007](../004-DR-DEC-architecture-decisions.md#d-007--customer-config-is-profiles-not-adapterscustomers)).
- The Phase 0 design corpus + the staffed audit panel memos.

The customization surface — what the OSS deliberately does not ship
— is the multi-month per-customer mapping work an SI with ten years
of Guidewire practice already sells:

- LOB mappings for the specific carrier book.
- Typelists for jurisdictional forms, cancellation reasons, denial
  reason codes, leakage-risk indicators (the `CancellationReason`
  poster-child for typelist drift in [PRD § 3.1.1](./02-PRD.md#311-line-underwriter-view-e2--e5)).
- Custom entity mappings (`LeakageRiskScore`, `ReserveCategory`,
  `ExposureType`, carrier-specific UWCenter rule entities).
- Field aliases per the carrier's data model.
- Approval matrices per role × dollar tier × LOB.
- PII policy per LOB (BAA path is in scope only for specific health
  insurance LOBs — never the OSS demo).
- Vendor-partner integrations (One Inc + similar payments surfaces,
  carrier-side document/comms integrations, fraud / underwriting
  data vendors).

That list is exactly what a Guidewire SI ships, exactly what no OSS
repo can usefully ship, and exactly the line on which the lead-
magnet thesis stays honest. The repo's existence does not threaten
the SI's billable hours — it shortens the SI's "is this team
credible enough to subcontract" cycle.

---

## 5. What makes this a credible artifact, not vapor

Four differentiators turn the repo from "another MCP wrapper" into
something a carrier engineer reads for thirty minutes and forwards
internally.

**5.1 Carrier-vocabulary tools.**
Per [D-001](../004-DR-DEC-architecture-decisions.md#d-001--carrier-vocabulary-tools-are-the-dominant-abstraction).
The tool catalog reads like the question an operator would ask a
junior analyst: `find-submissions-waiting-on-me`,
`whats-our-appetite-on-this-risk`, `did-we-lose-this-account`,
`summarize-this-loss`, `whats-the-reserve-picture`,
`reconcile-this-payment`, `show-my-book-of-business`. An
underwriter reading the catalog laughs in recognition. An API-shaped
catalog (`search_policies`, `get_claim`, `apply_payment`) gets
filed under "another integration that doesn't speak my language."
The tool name *is* the user's mental model. Refusing API-shaped
names at PR review is enforcement; the
[`carrier-vocabulary-curator`](../../.claude/agents/carrier-vocabulary-curator.md)
agent is the curator.

**5.2 Harness library + governance.**
Per [D-002](../004-DR-DEC-architecture-decisions.md#d-002--6-servers-organized-by-guidewire-suite-not-by-capability),
[D-003](../004-DR-DEC-architecture-decisions.md#d-003--harness-is-a-library--cli-not-an-mcp-server),
[D-005](../004-DR-DEC-architecture-decisions.md#d-005--three-execution-modes-per-tool),
[D-006](../004-DR-DEC-architecture-decisions.md#d-006--hard-rule-no-audit--no-write).
Three execution modes per tool (`read_only`, `draft_only`,
`approved_execute`), selected per-tool via the customer profile.
Hash-chain audit (Postgres + chain-of-custody). Idempotency keys
required on every write. Evidence bundles exported as immutable
JSON. Dual-control reserved for high-blast-radius writes
([D-018](../004-DR-DEC-architecture-decisions.md#d-018--reconcile-payment-vs-money-movement-boundary-sharpened-pre-audit)
sharpens where dual-control kicks in vs. where single-approver
`approved_execute` is enough). The hard rule, repeated everywhere:
no audit = no write. No policy decision = no write. No idempotency
key = no write. No known final state = no second attempt without
reconciliation.

**5.3 NO MOCKS.**
Per [D-008](../004-DR-DEC-architecture-decisions.md#d-008--no-mocks--real-guidewire-cloud-sandbox-from-day-1).
Hand-written `fixtures/` JSON is rejected. `tests/recordings/`
holds HTTP recordings captured from a real Guidewire Cloud sandbox
tenant, with provenance in filenames + a `MANIFEST.md` describing
each recording's source. CI fails loudly if the sandbox is
unreachable — never silently degrades. The OSS quickstart path
requires the user to bring their own Guidewire Cloud sandbox
credentials. The mock-vs-real distinction is the distinction
between "tutorial repo" and "credibility artifact"; cutting it at
the root forces every line of code to handle real-world failure
modes from day one.

**5.4 Observability from line one.**
Per [D-013](../004-DR-DEC-architecture-decisions.md#d-013--observability-is-wired-in-from-day-1-not-bolted-on).
OpenTelemetry tracing + pino structured logs + Sentry error capture
are part of the E1 foundation, not bolted on. Every public function
in `servers/*` and `packages/harness/` opens a span. Every span
carries `trace_id`, `tenant_id`, `tool_name`, `mode`, `actor_id`.
Architecture rules in CI enforce span coverage; raw `console.log`
in production paths fails CI. Sentry issues auto-create beads via
the `claude_ai_Sentry` MCP + `bd-sync`. Bolt-on observability hides
root cause for days; wiring it in from line one means a failed tool
call is one query away from cause.

A reviewer who reads § 5.1 through § 5.4 and the linked decisions
sees an opinionated team that has answered the questions a carrier
review will ask. That is the lead-magnet outcome.

---

## 6. Success criteria

The lead-magnet thesis is working when three signal classes move at
once.

**Inbound conversion.**
Carrier / MGA / SI engineers reach out about scoped custom work —
profile authoring, vendor-adapter builds, deployment hardening,
approval-matrix tuning. The repo's existence shortens a "do we
trust these people" evaluation from weeks of reference calls to a
30-minute read. The right metric is the count and the conversation
shape: "we've read your harness contract, we have questions about X
on our estate" is the conversation we want; "send us a deck" is
the conversation we don't.

**Distribution metrics.**
Stars by week (cumulative + delta), forks (especially the ratio
forks ÷ stars — healthy contribution interest sits above 0.10),
open issues from external contributors, npm downloads of
`@intentsolutions/guidewire-harness` once E3 ships, blog and
ecosystem references. None of these are revenue; all of them are
leading indicators that flag whether the artifact is being read by
the right population.

**Cowork-fork derivatives.**
Cohort members shipping their own domain MCPs from the fork-starter
([D-011](../004-DR-DEC-architecture-decisions.md#d-011--cowork-integration--fork-starter-template--curriculum)).
The first canonical derivative is the author's own `flatbed-mcp`
(trucking domain). Each derivative is a forcing function on the
template's quality (mappings shape, harness usability, observability
defaults), and each derivative becomes second-order proof that the
pattern generalizes beyond Guidewire — which strengthens § 3.2
(MCP-ecosystem partner credibility) without diluting § 3.1 (carrier
inbound).

A failed program looks the opposite: stars accumulate but no
inbound conversation rises above "interesting"; forks happen but
nobody ships a derivative; npm installs are dominated by drive-bys
with zero issues filed. Those signals invalidate the thesis even
without a single bug. The metrics worth tracking are the leading
ones; the trailing one is the engagement contract.

---

## 7. Risks that would kill the thesis

Three real risks, in plain language.

**7.1 Guidewire ships their own external-agent governance before
this gains distribution.** Guidewire's own AI surface is internal
today (§ 2). If they extend it outward — exposing per-tool
governance, audit, approval semantics on the carrier side directly
— the harness wedge narrows. Mitigation: ship fast (E1–E3 in weeks
not months). Distribution is the moat. A repo that has been read
by enough carrier engineers, has enough harness installs in npm,
and has the publishing rhythm of a maintained OSS project is harder
to displace than a vendor-bundled feature.

**7.2 Inbound never converts to scoped engagement.** Credibility
artifact is read but never bought. This is the failure mode every
OSS lead magnet faces. Mitigation: three of four audiences (3.2
MCP-ecosystem partner credibility, 3.3 cowork cohort, 3.4 broad OSS
reach) are independent of the carrier-conversion path. If the
carrier funnel is slow, the project still produces partner
credibility, derivative MCPs, and distribution. The thesis ages
into "carrier wedge with three secondary surfaces" instead of
collapsing.

**7.3 Sandbox prerequisite blocks E1 indefinitely.** No mocks
([D-008](../004-DR-DEC-architecture-decisions.md#d-008--no-mocks--real-guidewire-cloud-sandbox-from-day-1))
means E1 cannot start without a real Guidewire Cloud sandbox
tenant. The sandbox provisioning bead (`guidewire-adj`) being
unobtainable for an extended window is a real risk. Mitigation
(per the [D-008 footnote](../004-DR-DEC-architecture-decisions.md#d-008--no-mocks--real-guidewire-cloud-sandbox-from-day-1)):
pivot scope to a vendor-partner integration where API access exists
— never to mocks. The discipline of "real estate or no estate"
holds; the choice of *which* real estate is flexible.

The risk we are not mitigating is bad-faith execution. If the
artifact is shipped sloppy — vapor in the harness, mocks sneaking
in by another name, observability that doesn't actually run, a
README that overpromises — none of the four audiences reward it.
That risk is closed by the staffed audit panel
([D-014](../004-DR-DEC-architecture-decisions.md#d-014--staffed-audit-panel-as-the-gate-before-e1))
gating E1: eleven auditors review the blueprint before any code
lands.

---

## 8. What this document doesn't decide

This is the boundary the business case respects.

- **Pricing for custom engagements.** Those happen one-on-one with
  carrier / MGA / SI counterparties; pricing depends on profile
  scope, deployment posture, and operational support. Out of scope.
- **Cost-bounding for the customization surface.** Per [BZ-2](./audits/07-BZ-business-review.md#f-2)
  the question "in engineer-weeks, what does filling those YAMLs
  cost me?" is **deliberately not answered in this artifact**.
  Cost is engagement-specific — a single-LOB, single-state carrier
  with no custom entities lives in a different scope than a 47-LOB
  / 12-state / 3-custom-entity carrier — and a published list price
  would mislead more than it would inform. The cost-bounding
  conversation belongs in the first inbound call, where the actual
  shape (LOB count, state count, custom-entity count, typelist-
  extension count, approval-matrix complexity) is on the table.
  This is the public stance, not silence: cost is scoping
  conversation, not list price.
- **Which inbound to prioritize.** Engagement fit, regulatory
  surface, and timeline determine that — not the business case.
- **Whether a paid SaaS control plane exists later.**
  [D-009](../004-DR-DEC-architecture-decisions.md#d-009--public-oss-from-day-1-day-3-release)
  rules out a SaaS control plane in OSS today; it does not preclude
  a future paid one if a paying customer asks for it. That is a
  separate decision when the question is real.
- **Specific named inbound, customer names, or partnership
  structure.** The audiences in § 3 are forward-looking
  archetypes. Named relationships, when they exist, live in
  one-on-one channels — never in committed repo files.
- **Marketplace pricing and bundling for `claude-code-plugins-plus-skills`.**
  The marketplace target is referenced; the packaging epic
  (`guidewire-mkt`) handles the specifics.
- **The `payments-mcp` go / no-go.** Money movement
  ([D-018](../004-DR-DEC-architecture-decisions.md#d-018--reconcile-payment-vs-money-movement-boundary-sharpened-pre-audit))
  belongs in a separate future repo with stronger controls. Whether
  and when that repo opens is downstream of the carrier-engagement
  conversation, not upstream.

The business case is the framing layer. The PRD ([02](./02-PRD.md))
is the contract that framing promises; the architecture
([03](./03-ARCHITECTURE.md), authored next) is the shape that
contract takes; the roadmap ([07](./07-ROADMAP.md)) is the
sequencing. This document only asks one question and answers it:
*should this repo exist, in this shape, for these audiences?*
Yes — for the reasons above.
