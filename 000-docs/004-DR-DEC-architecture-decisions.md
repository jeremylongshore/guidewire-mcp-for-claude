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
