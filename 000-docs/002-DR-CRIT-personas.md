# 002-DR-CRIT — Adversarial 8-persona red team

**Filed:** 2026-05-04
**Author:** synthesized red-team memo, multi-persona
**Bead:** `guidewire-wtq`
**Feeds:** Blueprint epic `guidewire-7jt` / GH #2
**Status:** Phase 0 input artifact

---

## Purpose

The original Guidewire MCP research report (`001-DR-RES`) was
critiqued from eight distinct sectoral perspectives. Each persona
attacks one assumption. The cross-cutting finding — that the
architecture's center of gravity is wrong (organized around Guidewire
APIs, not around carrier work) — is the load-bearing input to the
v4 architecture.

This memo records each attack so the v4 architectural decisions in
`003-DR-ARCH-oss-cowork.md` and `004-DR-DEC` can be audited against
the persona that justifies them.

## Persona 1 — P&C Carrier CIO (Guidewire Cloud customer)

> "Your 'universal' tool surface dies the moment it meets my custom
> entities, jurisdictional forms, and producer hierarchy. Acme has 47
> LOB-specific coverage extensions. Your `get_policy` returns garbage
> on half my book unless you map them. So which is it — universal,
> or am I paying you to write 47 mappings?"

**Attacks:** H4 (producer hierarchy), H6 (Cloud API specificity), W5
(adapter-pack as consultancy disguise).

**v4 fix:** `profiles/_template/` ships with full mapping set from
day 1 — auth, roles, LOB mappings, typelists, custom entities, field
aliases, approval matrix, PII policy. Profiles are small, not full
re-implementations.

## Persona 2 — Underwriter (the actual user)

> "I don't say `search_policies`. I say *show me submissions waiting
> on me*, or *what's our appetite on this risk*, or *did we lose
> this account last year*. Your tool names read like Postman. If I
> have to learn API verbs, I'd rather use the existing UI."

**Attacks:** the entire tool-naming convention.

**v4 fix:** carrier-vocabulary tools become the dominant abstraction.
Tool names are the question an operator would ask a junior analyst —
`find-submissions-waiting-on-me`, `whats-our-appetite-on-this-risk`,
`did-we-lose-this-account`.

## Persona 3 — Claims VP

> "Your harness has approval gates. Good. But claims people make 80
> decisions a day. If every reserve change needs a human approval,
> the agent is slower than a junior adjuster. Define which writes
> auto-approve and which gate. Or your platform ships and dies in
> pilot."

**Attacks:** H7 (read/write split), H8 (degraded mode).

**v4 fix:** three execution modes per tool — `read_only`,
`draft_only`, `approved_execute` — selected per-tool via the customer
profile. Drafts (e.g. denial letter) auto-generate; only the
materially-binding actions gate on human approval.

## Persona 4 — MGA Broker (producer side)

> "I'm a producer, not the carrier. Your `agent-harness-mcp` assumes
> the carrier owns the deployment. What about the broker side? Do I
> get the same agent platform pointed at the same Cloud API but
> scoped to my agency hierarchy? Or am I the second-class citizen
> who gets a producer portal scrap?"

**Attacks:** missing producer-side persona; H10 (commercial framing).

**v4 fix:** dedicated `producer-mcp` (E9) with broker-scoped tools —
`show-my-book-of-business`, `whats-my-commission-status`,
`find-my-pending-quotes`.

## Persona 5 — Security / CISO

> "Standing service-account credentials with read access to all
> policies and claims is a SOC 2 finding waiting to happen. Show me:
> per-tool authorization, per-call audit trail with hash-chain
> integrity, immutable evidence storage, secret rotation cadence,
> BAA path for health insurance LOBs. Otherwise this never gets past
> my review."

**Attacks:** auth model + audit model rigor.

**v4 fix:** auth is OAuth-with-JWT-propagation per-tool; audit is
hash-chained (Postgres + chain-of-custody); evidence bundle exports
as immutable JSON; SOPS+age secrets posture (per IS standard); BAA
path scoped to specific LOB carriers, not OSS demo.

## Persona 6 — Guidewire SI Partner (Deloitte / PwC / Capgemini)

> "Your `adapters/customers/<name>/` pack is exactly what my
> consulting team gets paid to build over 18 months. Are you
> replacing me, or selling me a tool? If selling, what's the margin?
> If replacing, my sales team will price-bomb you on every deal."

**Attacks:** H10 (commercial framing).

**v4 fix:** OSS lead-magnet model — the repo establishes
credibility, drives inbound, doesn't ship "complete enough" to
displace SI engagements. SI partners *use* this as their MCP
foundation; per-customer customization is still where they earn.

## Persona 7 — Anthropic / MCP architect

> "Six servers × 10-22 tools each is 60-130 tools the agent has to
> reason over. Tool selection quality drops past ~15-20 per server.
> Either split servers further or use dynamic capability surfacing
> (only show tools the agent's role permits). And `agent-harness-mcp`
> being an MCP server is recursive — the harness invokes MCPs; it
> shouldn't be one."

**Attacks:** H1 (harness as MCP), H9 (tool count distribution).

**v4 fix:** harness is library + CLI, not an MCP server. Servers
re-organized by Guidewire suite (5-7 tools per suite at MVP, growing
within tool-selection budget).

## Persona 8 — Kim from claims processing (skeptical operator)

> "I don't trust agents. They make stuff up. They cite policies that
> don't exist. Why would I let one near my claim system? Show me
> *exactly* where the agent draws the line between 'drafting' and
> 'doing.' Because if the line is fuzzy, my answer is no."

**Attacks:** demands physical separation of drafting vs doing.

**v4 fix:** three-mode tool design — `read_only` and `draft_only`
NEVER write. `approved_execute` requires plan + policy gate + human
approval + idempotency key + audit. Hard rule: no audit = no write.

## Persona 9 — Underwriting Manager *(added 2026-05-04 per `007-DR-MEMO-carrier-vocabulary.md`)*

> "Your tools serve the line underwriter. Fine. Where's *my* view? I
> need to see *who* referred me *what* this week, what my team's
> bind ratio looks like by class, which of my UWs are stacking
> referrals, and where we're concentrated. `explain-why-this-got-
> referred` tells me the rule trace on one risk — that's a leaf, not
> a tree. I need the portfolio view, the staff view, and the
> authority-overrides view. Otherwise I'm running a black box and
> the line UWs are running the show."

**Attacks:** persona-coverage gap (the manager role is implicit in
`explain-why-this-got-referred` — referrals go *to* a manager — but
has no dedicated tool surface), tool-density gap on the receiving
side of the referral flow, and the assumption that one persona
(Persona 2 the line underwriter) covers underwriting authority
hierarchy.

**v4 fix:** dedicated `underwriting-manager` subsection in PRD § 3
(Personas) + dedicated tool surface in `policycenter-mcp` for the
manager view. Tool surface should at minimum cover:

- `show-referrals-routed-to-me` (the manager's queue, opposite end of
  Persona 2's `find-submissions-waiting-on-me`)
- `whats-my-team-bind-ratio` (by class / by UW / by quarter)
- `show-uws-stacking-referrals` (operational signal — which line UW
  is escalating disproportionately)
- `whats-our-concentration-on-this-class` (portfolio view —
  appetite enforcement at the manager level)
- `what-authority-overrides-this-quarter` (audit trail of the
  manager's own approved exceptions)

These names pass the `carrier-vocabulary-curator` rubric (operator-
voice + possessive-scope + question-form). They land in **GW-1.2**
PRD authoring as part of the PolicyCenter tool catalog under a new
"underwriting-manager view" subsection.

**Why surfaced now (and not in v3 plan):** the v3 architecture
focused on the 8 critique perspectives that *attack* the plan from
*outside* the line-underwriter role. Persona 9 is an *inside*
attack — same building, different floor. The carrier-vocabulary
memo (007) caught the gap by noting that `producer-mcp` had a
density problem (Persona 4's "portal scrap" complaint) but
`policycenter-mcp` had a *role-coverage* problem (manager view
absent) that wasn't even on the v3 radar.

## Cross-cutting finding

**Eight of nine personas** attack assumptions the original plan does
not fully answer. Persona 2 is the user's own pivot question dressed
up in an underwriter's voice; Persona 9 was caught downstream by the
specialist memo pass after this red team's first publication. **The
center of gravity is wrong** — the architecture is organized around
Guidewire APIs, not around carrier work. Carrier-vocabulary tools
become the dominant abstraction in v4; adapters survive only at the
API-client and vendor-partner layers.

Adding Persona 9 reinforces the meta-finding: vocabulary-grounded
tools are the abstraction, *and* role-coverage within the carrier
hierarchy (line UW vs UW manager vs portfolio risk officer) needs
the same density treatment that cross-role hierarchy (carrier vs
producer/MGA, carrier vs SI partner) already gets.
