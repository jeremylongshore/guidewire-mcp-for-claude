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

## D-019 — Audit chain is tamper-resistant, NOT tamper-evident against a compromised harness DBA

- **decided:** 2026-05-04
- **decision:** The per-tenant linear hash chain in
  `audit_entries` is **tamper-resistant** (an outsider without DB
  write access cannot alter entries undetected) but is **NOT
  tamper-evident against a privileged operator with Postgres write
  access** (a compromised harness DBA who recomputes every
  `entry_hash` and `prev_hash` consistently re-verifies cleanly via
  `verifyChain()`). The OSS scope of this project does NOT ship an
  external commitment surface (KMS-signed checkpoints, transparency
  log, customer-controlled lock store) at append time — that is
  E3+ work per [009 § 5.5](../000-docs/009-DR-MEMO-harness-runtime.md).
  The threat-model and tamper-evidence claims in
  [`02-PRD § 5.5`](./blueprint/02-PRD.md), [`05-TECHNICAL-SPEC § 8.2`](./blueprint/05-TECHNICAL-SPEC.md),
  [`05-TECHNICAL-SPEC § 8.5`](./blueprint/05-TECHNICAL-SPEC.md), and
  [`009-DR-MEMO § 2.1`](./009-DR-MEMO-harness-runtime.md) must be
  scoped honestly: the chain detects **outsider tampering and
  unprivileged-operator tampering**, NOT a compromised privileged
  DBA. Defence-in-depth for the privileged-operator threat is
  **Postgres role separation** — the harness's `audit_writer` role
  is granted INSERT only (no UPDATE / DELETE on `audit_entries`),
  the role for `verifyChain` is read-only, and the schema-owner
  role is held by a separate operational identity. Residual risk:
  a privileged DBA with the schema-owner role can still bypass the
  RLS / role separation. That residual risk is documented and is
  the trigger for adding the E3+ external-commitment surface.

- **because:** Per
  [`./blueprint/audits/02-RED-TEAM-PANEL.md F-RT-5.1`](./blueprint/audits/02-RED-TEAM-PANEL.md)
  (Persona 5 CISO red-team finding, FAIL severity). The tamper-
  *evidence* claim is load-bearing in the SOC 2 / regulator-grade
  positioning of this OSS lead-magnet; if the claim is wider than
  the architecture defends, an inbound CISO reads the doc, finds
  the gap, and walks. Sharpening the claim now (rather than
  conceding under audit pressure at GW-1.8) keeps the lead-magnet
  thesis intact and lets E3+ pick up the external-commitment work
  as a known follow-on rather than a discovered gap.

- **operational consequences:**
  - PRD § 5.5 + TECH-SPEC § 8.2 / § 8.5 / 009 § 2.1 prose updates
    to use **tamper-resistant against an outsider; tamper-evident
    against an unprivileged operator; defence-in-depth via role
    separation against a privileged DBA**. Update threat-model
    table row "Compromised harness DB" accordingly.
  - `packages/audit/` schema (E1) ships with three Postgres roles:
    `audit_writer` (INSERT-only on `audit_entries`), `audit_reader`
    (SELECT-only), `audit_owner` (DDL / GRANT). The harness runs
    as `audit_writer`; `verifyChain` as `audit_reader`; the
    schema-owner identity is held outside the harness process.
  - E3+ external-commitment surface enters the roadmap as a
    follow-on epic candidate (KMS-signed checkpoints emitted at
    append time, published to a customer-controlled commitment
    store — implementation TBD per customer trust model).
  - GW-1.8 staffed-audit `security-auditor` lane reviews the role-
    separation implementation when E1 lands.

- **attacked-by:** Persona 5 (CISO) — F-RT-5.1.

## D-020 — Profile schema is versioned; v1 = 9 YAMLs (MVP), v2 = +1 (E2.5 aggregation-grouping)

- **decided:** 2026-05-04
- **decision:** The customer-profile contract per
  [`02-PRD § 6`](./blueprint/02-PRD.md) is now treated as a
  **versioned contract**, with `profiles/<customer>/profile.yaml`
  carrying a `schemaVersion` field (semver-style major.minor).
  - **v1.0** = the 9 YAMLs as currently specified in 02-PRD § 6
    (auth, roles, lob, typelists, custom-entities, field-aliases,
    approval-matrix, pii-policy, events). Sufficient for E1-E4
    and the per-submission tools in E2.
  - **v2.0** = v1.0 + a 10th-block aggregation-grouping schema
    extension (carried inside `lob.yaml` as a new top-level
    `aggregations:` map, NOT a separate YAML file — keeps the
    9-file count and minimizes profile-template churn). The
    aggregation schema models the dimensions Persona 9's E2.5
    tools query: class, segment, region, declination-pattern,
    cycle-time. Each dimension declares its source field, its
    grouping rule, and its rollup unit.
  - Tool authors declare a minimum profile version in their tool
    metadata (`requiredProfileSchema: ">=v2.0"` for the 5 E2.5
    aggregate tools). Boot-time validation refuses tools whose
    required schema is not satisfied by the profile.
  - **E2.5 is gated on v2.0 of the profile schema landing**, in
    addition to the existing UWCenter sandbox-breadth prereq from
    [D-017](#d-017--persona-9-underwriting-manager-tools-land-in-a-fresh-sub-epic-e25-not-e2-or-e5).
    07-ROADMAP § E2.5 is updated to make this explicit.

- **because:** Per
  [`./blueprint/audits/02-RED-TEAM-PANEL.md F-RT-9.1`](./blueprint/audits/02-RED-TEAM-PANEL.md)
  (Persona 9 underwriting-manager FAIL). The 9-YAML profile is a
  load-bearing safety boundary (D-007: profile validates at boot;
  unmodelled fields fail fast). Manager tools query aggregation
  fields the v1 schema doesn't model. Without versioning the
  contract, either (a) the manager tools cannot ship until the
  profile schema extends — but the extension itself is undeclared,
  so the prereq is unwritten and the tools are gated on a non-
  decision; or (b) the tools ship with implicit fields that bypass
  boot validation — which violates D-007. Versioning the contract
  + declaring v2.0 explicitly resolves both: the schema extension
  is now first-class, validatable, and the E2.5 prereq is concrete.

- **operational consequences:**
  - 02-PRD § 6 gets a `## 6.0a Profile schema versioning` subsection
    documenting `schemaVersion`, the v1.0 content (= existing § 6
    content), and the v2.0 extension (LOB-aggregations schema).
  - `lob.yaml` schema (02-PRD § 6.3) gets a v2.0 `aggregations:`
    block specification.
  - 07-ROADMAP § E2.5 is updated: prereq list now reads
    "(1) UWCenter sandbox breadth confirmed via `guidewire-adj`;
    (2) profile schema v2.0 landed (+ `lob.yaml.aggregations:`
    block added)."
  - `packages/schemas/` (E1) ships v1.0 + v2.0 Zod schemas; tool
    authors import the version they require.
  - E4 customer-profile-template ships v1.0 by default; cowork-
    fork-starter inherits v1.0; carriers opting into E2.5 tools
    flip their profile to v2.0 with the aggregation block.

- **attacked-by:** Persona 9 (underwriting manager) — F-RT-9.1.

## D-021 — Terminology fix: "sandbox" meant Guidewire isolated tenant; what we actually need is dev-tier credentials + real endpoints

- **decided:** 2026-05-04
- **decision:** Earlier blueprint sections used "sandbox" ambiguously
  to mean a Guidewire-provisioned isolated tenant (heavy,
  partner-program-gated, weeks to obtain). That is **not** what an
  MCP integration needs. What we actually need is the same thing
  any HTTP API client needs: **(1) developer-tier OAuth credentials
  (client ID + secret, obtainable via Guidewire developer program
  signup) + (2) the documented Cloud API endpoint URLs (already
  enumerated in the librarian KB at [`005-DR-REF`](./005-DR-REF-guidewire-public-resources.md))**.
  The MCP server runs on the dev box — that's the execution
  environment; nothing isolated-tenant-shaped is required.

  Concretely:
  - `packages/guidewire-client/` is wired to the real Cloud API
    URLs and accepts a dev-tier OAuth credential pair from
    SOPS-encrypted env.
  - An E1 smoke-test job hits each endpoint enumerated in the
    librarian KB to confirm reachability + auth (expect 200/401/etc.;
    the test passes when the host responds and the endpoint exists).
  - End-to-end production validation defers to the first integration
    engagement (a carrier / SI / MGA brings their own production
    tenant credentials) — that's a deployment concern, not a
    development blocker.
  - `guidewire-adj` bead closes as superseded — there is no
    isolated-tenant-provisioning step needed to start.

- **what stays unchanged from the prior plan:**
  - Carrier-vocabulary tool naming (D-001) — load-bearing for how
    Claude / MCP discovers and activates tools via natural language.
  - Three execution modes (D-005), harness governance (D-002, D-006),
    profile contract (D-007, D-020), audit chain (D-019), three-layer
    bead↔GH↔Plane mirror (D-012), staffed audit panel (D-014).
  - **NO MOCKS hard rule** — no fixtures, no invented endpoint
    shapes. We hit real Guidewire URLs with dev-tier creds; what
    comes back is what comes back.
  - The lead-magnet thesis (D-009, D-010) — the repo is a credibility
    artifact for inbound custom-build engagements.

- **because:** Resolving the terminology confusion (raised by the
  project owner 2026-05-04) unblocks E1 immediately. The plan was
  always sound; the word "sandbox" was carrying two different
  meanings, and the heavier meaning had drifted into being treated
  as a hard prereq.

- **operational consequences:**
  - `CLAUDE.md` hard rule 3 + "NO MOCKS — sandbox prerequisite"
    section: rewording to drop "isolated tenant required" framing,
    keep NO MOCKS, keep "real endpoints + real responses."
  - 3 inline `(unverified — sandbox-confirm at guidewire-adj)` tags
    in 02-PRD / 06-STATUS / 00-MASTER reworded to `(unverified —
    practitioner knowledge from public docs; smoke-test reachability
    against dev-tier creds; first integration engagement validates
    production)`.
  - `guidewire-adj` bead + GH issue #1 close with supersession
    pointing at this decision.
  - 07-ROADMAP § E1 picks up a `smoke-reach.ts` deliverable (hit
    each librarian-KB endpoint with dev-tier creds, assert
    structurally-valid response).
  - 06-STATUS + 00-MASTER status snapshots: drop the "sandbox
    prereq" line; pending gates become {staffed audit panel +
    audit response}.

- **attacked-by:** project owner 2026-05-04, who pointed out the
  terminology conflation directly.
