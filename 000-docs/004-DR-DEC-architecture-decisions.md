# 004-DR-DEC — Architecture decision log

**Filed:** 2026-05-04
**Owner:** Jeremy Longshore
**Bead:** `guidewire-wtq`
**Feeds:** Blueprint epic `guidewire-7jt` / GH #2
**Status:** Phase 0 input artifact (live; updated as new decisions land)

---

## Format

Each entry: `D-<seq>` · `decided:` date · `decision:` what was decided
· `because:` why · `attacked-by:` which persona/risk · `replaces:`
prior decision (if any).

Decisions are not retroactively edited. New decisions either supersede
or augment prior ones, with a `replaces:` link.

---

## D-001 — Carrier-vocabulary tools are the dominant abstraction

- **decided:** 2026-05-04
- **decision:** Tool names are carrier-native verbs ("find-submissions-
  waiting-on-me", "whats-our-appetite-on-this-risk") not API verbs
  ("search_policies", "get_account").
- **because:** Persona 2 (the underwriter) refused to learn API verbs
  when the existing UI already speaks the right language. Tool names
  ARE the user's mental model; the agent shouldn't translate.
- **attacked-by:** Persona 2 (underwriter), Persona 8 (Kim from
  claims).
- **replaces:** original `001-DR-RES` API-verb naming convention.

## D-002 — 6 servers organized by Guidewire suite, not by capability

- **decided:** 2026-05-04
- **decision:** Servers split as `policycenter-mcp`, `claimcenter-mcp`,
  `billingcenter-mcp`, `producer-mcp`, `events-mcp` (query-only),
  `payments-mcp` (separate, dual-control). NOT `core-mcp` /
  `harness-mcp` / `workflow-event-mcp` / `data-insight-mcp`.
- **because:** Persona 7 (Anthropic / MCP architect) flagged that
  60-130 tools across 6 capability-servers blows past the
  ~15-20-tools-per-server tool-selection budget. Suite-organized
  servers each carry 5-15 tools.
- **attacked-by:** Persona 7, Persona 4 (MGA broker — producer needs
  its own scope).
- **replaces:** original `001-DR-RES` 6-capability-servers proposal.

## D-003 — Harness is a library + CLI, NOT an MCP server

- **decided:** 2026-05-04
- **decision:** `packages/harness/` ships as a library + CLI
  (published as `@intentsolutions/guidewire-harness` on npm). Agent
  hosts invoke it; it is not a peer MCP server.
- **because:** The harness invokes MCPs and gates writes — making it
  itself an MCP server is recursive (harness gates harness?) and
  competes for the agent's tool-selection budget.
- **attacked-by:** Persona 7 (Anthropic / MCP architect).
- **replaces:** `001-DR-RES` `agent-harness-mcp` server design.

## D-004 — Events: webhook + queue (infra) + small `events-mcp` (query only)

- **decided:** 2026-05-04
- **decision:** App Events ingestion + IG triggers live in
  webhook-receiver + BullMQ queue infra. A small `events-mcp` exists
  for query-only / replay access. Workflow primitives move into the
  relevant suite MCP, not a separate `workflow-event-mcp`.
- **because:** Events are an asynchronous data plane, not a
  conversational tool surface. MCP isn't the right place for
  ingestion.
- **attacked-by:** Persona 7.
- **replaces:** `001-DR-RES` `workflow-event-mcp` server.

## D-005 — Three execution modes per tool

- **decided:** 2026-05-04
- **decision:** Every tool ships in one of three modes selected
  per-tool via the customer profile: `read_only`, `draft_only`,
  `approved_execute`.
- **because:** Persona 3 (Claims VP) refused a platform where every
  write needs human approval (80 decisions/day kills throughput).
  Persona 8 (Kim) demanded physical separation between drafting and
  doing. Three modes resolve both.
- **attacked-by:** Persona 3, Persona 8.

## D-006 — Hard rule: no audit = no write

- **decided:** 2026-05-04
- **decision:** Writes are conditional on (a) hash-chained audit
  entry, (b) policy decision recorded, (c) idempotency key,
  (d) known final state OR reconciliation path. Any missing → refuse.
- **because:** Persona 5 (CISO) and Persona 8 (Kim) both demanded
  tamper-evident audit before trusting any write. SOC 2 / BAA paths
  require this anyway.
- **attacked-by:** Persona 5, Persona 8.

## D-007 — Customer config is `profiles/`, not `adapters/customers/`

- **decided:** 2026-05-04
- **decision:** Per-customer config is `profiles/<customer>/`
  containing auth, roles, LOB mappings, typelists, custom entities,
  field aliases, approval matrix, PII policy. Each profile is small
  (mapping data) — never a full re-implementation.
- **because:** Persona 6 (SI partner) flagged "adapters/customers/"
  as 18-month consultancy work in disguise — the OSS shouldn't
  duplicate what SIs sell. Profiles are a map, not a build.
- **attacked-by:** Persona 6, W5 (research-report concern).
- **replaces:** `001-DR-RES` `adapters/customers/` adapter-pack.

## D-008 — NO MOCKS — real Guidewire Cloud sandbox from day 1

- **decided:** 2026-05-04
- **decision:** No hand-written `fixtures/`. `tests/recordings/`
  holds HTTP recordings captured from a real Guidewire Cloud sandbox
  tenant, with provenance (`recorded-2026-05-04.from-sandbox-XYZ`).
  CI fails loudly if sandbox is unreachable. Sandbox provisioning
  (`guidewire-adj` / GH #1) is a hard prereq for the audit panel and
  E1.
- **because:** The mock-vs-real distinction creates confusion when
  debugging, demoing, or onboarding. Cutting it at the root forces
  every line of code to handle real-world failure modes from day 1.
- **attacked-by:** original `001-DR-RES` framing assumed
  fixture-backed dev would suffice.

## D-009 — Public OSS from day 1 (Day 3 release)

- **decided:** 2026-05-04
- **decision:** `github.com/jeremylongshore/guidewire-mcp-for-claude`
  goes public on Phase 0 Day 3 with README + ROADMAP + 12-epic beads
  + Phase 0 design docs. No closed-door demo. No private fork "for
  the real version."
- **because:** Demand is confirmed (2 unprompted inbounds before any
  public footprint). Build-in-public converts inbound. The repo's
  public footprint IS the credibility artifact.
- **replaces:** any implicit "build privately, ship later" model from
  `001-DR-RES`.

## D-010 — OSS = lead magnet for custom build work, not a complete product

- **decided:** 2026-05-04
- **decision:** Optimize for "credible enough that an inbound carrier
  asks for custom work" — NOT "complete enough to be the entire
  product end-to-end." Don't over-build the OSS to the point where
  there's no remaining customization surface for paid engagements.
- **because:** Persona 6 (SI partner) and the v4 commercial framing
  both depend on this — the OSS is the wedge, custom integrations
  are the margin.
- **attacked-by:** Persona 6.

## D-011 — Cowork integration — fork-starter template + curriculum

- **decided:** 2026-05-04
- **decision:** `templates/cowork-fork-starter/` ships in E4 with
  `pnpm guidewire init <domain>` scaffolding script. Each of the 10
  epics ≈ 1 week of cowork content. Non-engineer contribution
  surfaces (tool descriptions, fixture provenance docs, README
  examples) are first-class.
- **because:** Cowork cohort is one of the four named audiences;
  template-driven reuse turns each cohort member's domain into a
  derived MCP they can ship.

## D-012 — Three-layer mirror: bead ↔ GH issue ↔ Plane (when configured)

- **decided:** 2026-05-04
- **decision:** Every tracked unit of work has correlated records
  across the three layers, kept in sync via `~/bin/bd-sync`. PRs
  reference GH issues with `Refs #N` while children remain;
  `Closes #N` only on the PR that retires the last child bead.
- **because:** Per Jeremy's request — "be a nice feature if u
  created issues for the beads so we can track there as well."
  Matches IS-wide conventions in `~/.claude/CLAUDE.md`.

## D-013 — Observability is wired in from day 1, not bolted on

- **decided:** 2026-05-04
- **decision:** OpenTelemetry tracing + pino structured logs + Sentry
  error capture are part of E1 foundation (`packages/observability/`).
  Architecture rules in CI enforce span coverage; `console.log` in
  production paths fails CI. Sentry issues auto-create beads via the
  `claude_ai_Sentry` MCP + `bd-sync`.
- **because:** Bolt-on observability hides root cause for days.
  Wiring it in from line 1 means a failed tool call is one query
  away from cause.

## D-014 — Staffed audit panel as the gate before E1

- **decided:** 2026-05-04
- **decision:** 11 auditors review the blueprint before any code is
  written: 5 existing IS specialists (`architect-reviewer`,
  `security-auditor`, `backend-architect`, `docs-architect`,
  `business-analyst`) + 4 new agents created via `/agent-creator`
  (`mcp-safety-reviewer`, `carrier-vocabulary-curator`,
  `guidewire-api-archaeologist`, `harness-runtime-architect`) +
  `article-consistency-checker` + `fact-checker`. E1 is blocked
  until all FAILs are resolved or accepted in
  `000-docs/blueprint/audits/00-AUDIT-RESPONSES.md`.
- **because:** Architectural mistakes compound through 10 epics of
  code. Cost ~2-3 days of agent runs vs. months of refactoring.

## D-015 — Repo path is short (`guidewire/`) but full name is "Guidewire MCP for Claude"

- **decided:** 2026-05-04
- **decision:** Local dir `/home/jeremy/000-projects/guidewire/`,
  GitHub `jeremylongshore/guidewire-mcp-for-claude`. README + npm
  package descriptions use the full name "Guidewire MCP for Claude"
  for Claude/Anthropic-native positioning.
- **because:** Per Jeremy's call 2026-05-04 — short local, descriptive
  remote.

## D-016 — Tool-vocabulary canonical names (carrier-vocabulary-curator renames + adjuster split)

- **decided:** 2026-05-04
- **decision:** The following 5 renames + 1 new tool from
  [`007-DR-MEMO-carrier-vocabulary.md § 2`](./007-DR-MEMO-carrier-vocabulary.md)
  are the canonical names for the project. Anywhere a tool name
  appears (PRD § 3, 04-USER-JOURNEY when authored, 07-ROADMAP epic
  exit criteria, README marketing copy, cowork curriculum, blog
  posts), it uses these forms:

  | Was (initial PRD draft) | Canonical | Rationale |
  |---|---|---|
  | `propose-endorsement` | `draft-endorsement` | Mode-name in tool: `draft_only` mode is the contract; verb matches |
  | `whats-the-payment-status` | `where-are-we-on-this-payment` | How a billing operator actually phrases the question — "where are we on" is the carrier verb |
  | `find-billing-issues-for-this-policy` | `whats-going-on-with-this-account` | Scope is account-level, not policy-level; matches how AR speaks |
  | `replay-event` | `show-event-payload` | Replay is a developer verb; show-payload is the integration-engineer's question |
  | (none) | `show-activity-on-this-claim` | NEW. Adjuster-path complement to `find-events-for-claim` (integration-engineer path). Different persona, different question, different answer shape — vocabulary distinction, not just a synonym. |

- **because:** Tool names ARE the architecture in this repo (per
  [D-001](#d-001--architecture-organized-around-carrier-vocabulary-not-api-verbs)).
  Treating renames as "routine catalog edits" leaves the names
  vulnerable to bikeshedding rebounds (someone renames
  `draft-endorsement` back to `propose-endorsement` because nothing
  pins it). A decision-log entry is the only durable structure.
  The `show-activity-on-this-claim` addition is structural — it
  creates a vocabulary distinction between the adjuster path and
  the integration-engineer path, not a synonym pair.
- **attacked-by:** Persona 2 (the underwriter — pushed for vocabulary
  rigor in the first place).
- **scope:** Applies retroactively to the merged 02-PRD (already
  uses canonical names) and forward to all blueprint authoring.
  GW-1.8 staffed audit (`carrier-vocabulary-curator` lane) is the
  enforcement check.

## D-017 — Persona 9 (underwriting manager) tools land in a fresh sub-epic E2.5, not E2 or E5

- **decided:** 2026-05-04
- **decision:** The 5 underwriting-manager tools introduced by
  [`002-DR-CRIT-personas.md` Persona 9](./002-DR-CRIT-personas.md) +
  [`007-DR-MEMO-carrier-vocabulary.md § 4.6`](./007-DR-MEMO-carrier-vocabulary.md)
  ship as a dedicated tranche **E2.5 — Aggregate-query tools**, not
  bundled into E2 or deferred into E5.
- **because:** They are a coherent capability tranche
  (loss-ratio / aggregate-exposure / declination-pattern queries)
  with one prerequisite the rest of E2 doesn't share: UWCenter
  sandbox breadth + aggregation API mappings, both unknown until
  `guidewire-adj` (sandbox) closes. Three options considered:
  - **E2 (rejected):** bloats the first read-only cut from 5-7 → 12
    tools and forces it to wait on the unknown sandbox-breadth
    prereq. Delays the first "we shipped" moment.
  - **E5 (rejected):** bundles aggregate-query tools (`read_only`)
    with drafting tools (`draft_only`) — different mode profiles,
    different governance shape, confused narrative.
  - **E2.5 (chosen):** clean break, ships when the prereq is known,
    keeps E2 fast and E5 focused on drafting.
- **roadmap impact:** [`07-ROADMAP.md`](./blueprint/07-ROADMAP.md)
  needs an E2.5 entry inserted between E2 and E3 with: "Ships the
  5 underwriting-manager aggregate-query tools when UWCenter
  sandbox breadth + aggregation API surface confirmed via
  `guidewire-adj` follow-up."

## D-018 — Reconcile-payment vs. money-movement boundary (sharpened pre-audit)

- **decided:** 2026-05-04
- **decision:** Sharpen the boundary now (rather than deferring to
  the GW-1.8 `mcp-safety-reviewer` Mode B audit response). The
  carve:

  **`reconcile-this-payment` is `approved_execute` because it:**
  - Mutates BillingCenter ledger state (payment→account assignment).
  - Has a known final state — idempotency key over
    `paymentId + accountId + amount`.
  - Does NOT cross a banking integration boundary (no ACH
    instruction, no card capture, no wire, no external rail call).
  - Failure mode is a misallocation that is reversible by another
    `reconcile-this-payment` call against the corrected target.

  **Money movement is OUT-OF-SCOPE for `billingcenter-mcp` and
  belongs in a future `payments-mcp` because it:**
  - Crosses an irreversible banking integration boundary.
  - Has a failure mode (unauthorized debit/credit) that is NOT
    reversible in-system; reversal requires an external rail
    operation with its own approval flow.
  - Requires dual-control (two-human approval), not single-approver
    `approved_execute` — out of band of the harness's current
    approval contract per
    [`009-DR-MEMO-harness-runtime.md`](./009-DR-MEMO-harness-runtime.md).

- **because:** The line between reconciliation and money movement
  is exactly where a CISO reads the doc. Defining it under audit
  pressure (GW-1.8 Mode B) means the audit response itself becomes
  the regulatory artifact — that is not the document we want to be
  the proof. Defining it from first principles now means E3
  (harness contract) and E8 (BillingCenter MCP) ship with the
  right boundaries instead of re-litigating mid-build.
- **operational consequences:**
  - BillingCenter MCP can ship `approved_execute` mode in E8
    without compliance gate-keeping payments work.
  - `payments-mcp` stays a separate future repo with stronger
    controls (dual-control approval, harder hardware-attested
    audit, separate compliance review).
  - `reconcile-this-payment` is the canonical canary for
    `approved_execute` per
    [`006-DR-MEMO-mcp-safety.md § 3.4`](./006-DR-MEMO-mcp-safety.md)
    — confirmed.
- **attacked-by:** Persona 5 (CISO) + `mcp-safety-reviewer` Mode B
  at GW-1.8.
