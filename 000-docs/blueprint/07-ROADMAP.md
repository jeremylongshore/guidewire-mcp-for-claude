# 07 — Roadmap

> *Source-of-truth public roadmap. Every bead's `Blueprint:` reference
> points back here. Each epic has concrete exit criteria + a 30-second
> demo path + an explicit out-of-scope list.*

**Status:** Content authored 2026-05-04 (GW-1.6).
**Bead:** `guidewire-8oj`.
**Inputs:** all 4 specialist memos (006-009) + 003-DR-ARCH +
004-DR-DEC + 002-DR-CRIT (incl. Persona 9).

---

## Epic table

### Hard prereqs (Phase 0)

| # | Title | Bead | GH | Type |
|---|---|---|---|---|
| Phase 0 | Sandbox provisioning | `guidewire-adj` | [#1](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/1) | Hard prereq |
| Blueprint | Master blueprint paperwork (this directory) | `guidewire-7jt` | [#2](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/2) | Pre-code gate |

### Public 11-epic roadmap

| # | Title | Bead | GH | Type |
|---|---|---|---|---|
| E1 | Foundation — `mcp-runtime`, `schemas`, `auth`, `audit`, `client-sdk`, `observability` | `guidewire-4rd` | [#3](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/3) | MVP |
| E2 | PolicyCenter MCP (read-only) | `guidewire-0qf` | [#4](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/4) | MVP |
| E2.5 | Aggregate-query tools (underwriting manager tranche) | TBD | TBD | MVP |
| E3 | Harness library + CLI | `guidewire-jpu` | [#5](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/5) | MVP |
| E4 | Customer profile template + fork starter | `guidewire-86h` | [#6](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/6) | MVP |
| E5 | Drafting tools | `guidewire-413` | [#7](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/7) | Buildout |
| E6 | Workflow + Events | `guidewire-un8` | [#8](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/8) | Buildout |
| E7 | ClaimCenter MCP | `guidewire-4ps` | [#9](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/9) | Buildout |
| E8 | BillingCenter MCP (+ separate `payments-mcp`) | `guidewire-zgu` | [#10](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/10) | Buildout |
| E9 | Producer-side MCP — MGA / broker scope | `guidewire-2ha` | [#11](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/11) | Buildout |
| E10 | Onboarding + certification CLI | `guidewire-dua` | [#12](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/12) | Buildout |
| E11+ | Publish to `claude-code-plugins-plus-skills` marketplace | `guidewire-qqx` | [#14](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/14) | Distribution |

---

## E1 — Foundation

**Done when:**

- `pnpm install && pnpm -r build && pnpm -r test` passes on a fresh
  clone with no manual setup beyond Node 22 + pnpm
- These packages exist with public APIs + READMEs + ≥1 test each:
  `mcp-runtime`, `schemas`, `auth`, `audit`, `client-sdk`,
  `observability`
- `packages/observability/` exposes a `getObservability()` factory
  returning `{ tracer, logger, error }` (OTel + pino + Sentry) — every
  other package consumes it
- `tests/TESTING.md` is hash-pinned via `audit-harness init`; the
  policy file's hash matches what's committed
- `.github/workflows/ci.yml` swap from paperwork-no-op to real
  pipeline (pnpm + Biome + Vitest + audit-harness gates)
- `LICENSE` (Apache-2.0) and `CONTRIBUTING.md` are real (currently
  templated); CI status badge in README points at a green run
- **Endpoint reachability smoke test** (per [D-021](../004-DR-DEC-architecture-decisions.md#d-021--terminology-fix-sandbox-meant-guidewire-isolated-tenant-what-we-actually-need-is-dev-tier-credentials--real-endpoints)):
  a `scripts/smoke-reach.ts` script reads dev-tier OAuth credentials
  from SOPS-encrypted env (`runbook/secrets.prod.sops.yaml`), iterates
  over the endpoints enumerated in the librarian KB
  ([`005-DR-REF`](../005-DR-REF-guidewire-public-resources.md)), and
  asserts each returns a structurally-valid response (200 / 401 /
  documented 4xx — the test passes when the host responds and the
  endpoint exists; it's reachability + auth-flow validation, not
  business-logic validation). Runs in CI when
  `GUIDEWIRE_OAUTH_CLIENT_ID` is configured; skipped with a visible
  "no dev creds configured" status otherwise. Replaces the
  superseded `guidewire-adj` sandbox-provisioning bead.

**Demo path (30s):**

```bash
git clone github.com/jeremylongshore/guidewire-mcp-for-claude
cd guidewire-mcp-for-claude && pnpm install && pnpm -r test
# All packages green. Foundation only — no MCP servers yet.
```

**Out of scope (deliberate):**

- Any `servers/*` MCP server (those start in E2)
- Any tool authoring (E2+)
- Any harness internals beyond a typed-error class skeleton (E3 owns
  the contract)
- Any customer profile (E4)

**Blueprint sections governing:** §02 PRD § Foundation packages,
§03 Architecture § L4 Clients + L3 Harness skeleton, §05 Technical
Spec § Stack + Quality Gates + Observability, §05 § NO MOCKS sandbox
contract.

**Memo inputs:** 006 § 7 cross-cutting harness invariants + 008 § 4
profile template prerequisites + 009 § Library API surface signatures.

---

## E2 — PolicyCenter MCP (read-only)

**Done when:**

- `servers/policycenter-mcp/` exists with **5-7 carrier-vocabulary
  read-only tools**
- All tool names pass the `carrier-vocabulary-curator` 8-rule
  PR-time checklist (`audit-harness` enforces mechanically)
- All tools `read_only` mode, declared in tool metadata
- All tools backed by **real Guidewire Cloud sandbox recordings** in
  `tests/recordings/` with `MANIFEST.md` provenance entries
- `mcp-safety-reviewer` audit-rubric pass (per 006 memo): every tool
  emits audit row even though read_only (Persona 5 read-side
  exfiltration concern)
- Claude Desktop config example in README that runs against this
  server out-of-the-box

**Tool catalog (per 007 memo's authenticity verdict + 008 memo's API
correctness):**

| Tool | Mode | Slips to E5? | Notes |
|---|---|---|---|
| `find-submissions-waiting-on-me` | read_only | no | AUTHENTIC; works against base API |
| `show-policies-for-this-insured` | read_only | no | AUTHENTIC; cross-LOB rollup |
| `summarize-this-submission` | read_only | no | AUTHENTIC; LLM summary over Cloud API fetch |
| `did-we-lose-this-account` | read_only | no | PASSABLE; renewal/cancel history query |
| `whats-our-appetite-on-this-risk` | read_only | **YES → E5** | Hits UWCenter rule entities = entirely carrier-defined (008 § 3); ship E2 with "incomplete-without-profile" banner OR slip to E5 |
| `explain-why-this-got-referred` | read_only | **YES → E5** | Same — UWCenter rule trace; carrier-defined |
| `pull-this-claim-from-this-policy` | read_only | no | Cross-suite read |

**Underwriting-manager view (per Persona 9 + 007 memo, may slip to a
later sub-epic):**

- `show-referrals-routed-to-me` (manager queue, opposite of
  `find-submissions-waiting-on-me`)
- `whats-my-team-bind-ratio` (by class / UW / quarter)
- `show-uws-stacking-referrals` (operational signal)
- `whats-our-concentration-on-this-class` (portfolio view)
- `what-authority-overrides-this-quarter` (manager's own audit)

**Demo path (30s):**

```
Claude Desktop → "find submissions waiting on me"
  → policycenter-mcp.find-submissions-waiting-on-me
  → top-N from sandbox tenant (replayed recording)
  → drill: "summarize this submission"
  → summarize-this-submission with evidence-bundle reference
```

**Out of scope (deliberate):**

- Any write tool (E5 drafting tools, E5+ approved_execute)
- ClaimCenter or BillingCenter tools (E7, E8)
- Producer-side rollup tools (E9)
- App Events ingestion (E6)

**Blueprint sections governing:** §02 PRD § PolicyCenter tools, §03
Architecture § L2, §04 Journeys § J-1 underwriter triage.

**Memo inputs:** 007 § PolicyCenter authenticity (5/7 AUTHENTIC, 2
PASSABLE) + 008 § per-customer-config-dependence spectrum + 006 §
read-side audit emission rule.

---

## E2.5 — Aggregate-query tools (underwriting manager tranche)

**Why this exists as its own sub-epic** (per [D-017](../004-DR-DEC-architecture-decisions.md#d-017--persona-9-underwriting-manager-tools-land-in-a-fresh-sub-epic-e25-not-e2-or-e5)):
the 5 underwriting-manager tools introduced by [Persona 9](../002-DR-CRIT-personas.md)
+ [007-DR-MEMO § 4.6](../007-DR-MEMO-carrier-vocabulary.md) are a
coherent capability tranche (loss-ratio / aggregate-exposure /
declination-pattern queries) with one prerequisite the rest of E2
doesn't share: **UWCenter sandbox breadth + aggregation API
mappings**, both unknown until `guidewire-adj` (sandbox provisioning
— [GH #1](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/1))
closes. Bundling into E2 would bloat the first read-only cut from
5-7 → 12 tools and force E2 to wait on the unknown prereq; deferring
to E5 would mix `read_only` aggregate tools with `draft_only`
drafting tools (confused governance shape). E2.5 keeps E2 fast and
sequences the manager tools when the prereq lands.

**Done when:**

- 5 underwriting-manager tools shipping in `policycenter-mcp`,
  all `read_only`, all backed by sandbox recordings:
  - `whats-our-aggregate-on-this-class`
  - `whats-our-loss-ratio-on-this-segment`
  - `whats-our-declination-pattern-by-region`
  - `find-similar-risks-we-declined`
  - `whats-the-cycle-time-on-our-submissions`
  (final names confirmed against the [`carrier-vocabulary-curator`](../../.claude/agents/carrier-vocabulary-curator.md)
  agent before E2.5 opens — D-016 canonical-name discipline applies)
- UWCenter aggregation endpoints mapped in
  [`005-DR-REF`](../005-DR-REF-guidewire-public-resources.md) (or
  flagged unverified per the citation discipline if still
  sandbox-blocked at the time of the build)
- `profiles/_template/lob.yaml` extended with aggregation-grouping
  fields (LOB-rollup definitions, segment dimensions) needed by the
  tools

**Demo path:** an underwriting manager asks *"what's our aggregate
on this builder's risk class?"* and gets a real-shape answer with
audit trail and source-recording provenance.

**Out of scope (deliberate):**

- Anything `draft_only` or `approved_execute` (those are E5+)
- Per-tool drill-down into individual submissions (those are E2's
  per-submission tools — composable in the agent host's session
  rather than sub-call from the aggregate tool)
- Cross-suite aggregates (e.g. claim-side loss-ratio rollups — that's
  E7 with its own aggregate tool surface)

**Prereq gates:**

1. **`guidewire-adj` at "sandbox breadth confirmed for UWCenter
   aggregation surface"** — before this epic opens. If
   `guidewire-adj` closes with insufficient UWCenter breadth, E2.5
   may slip behind E5/E6/E7 with no MVP impact.
2. **Profile schema v2.0 landed** (per [D-020](../004-DR-DEC-architecture-decisions.md#d-020--profile-schema-is-versioned-v1--9-yamls-mvp-v2--1-e25-aggregation-grouping)) — adds the `aggregations:` map inside `lob.yaml` modelling class / segment / region / declination-pattern / cycle-time dimensions. Without v2.0 the manager tools cannot ship: their queries reference fields the profile contract does not validate at boot, which violates [D-007](../004-DR-DEC-architecture-decisions.md). The schema extension itself is a small E1.5-grade ticket — concretely a Zod schema bump + 02-PRD § 6.3 edit + cowork-fork-template upgrade path.

**Cross-references:**
[D-017](../004-DR-DEC-architecture-decisions.md#d-017--persona-9-underwriting-manager-tools-land-in-a-fresh-sub-epic-e25-not-e2-or-e5),
[02-PRD § 3.1.2](./02-PRD.md#312-policycenter-mcp--persona-9-underwriting-manager),
[002-DR-CRIT-personas Persona 9](../002-DR-CRIT-personas.md),
[007-DR-MEMO § 4.6](../007-DR-MEMO-carrier-vocabulary.md).

---

## E3 — Harness library + CLI

**Done when:**

- `packages/harness/` exposes the typed library API per 009 memo §1:
  `Plan`, `Policy`, `Approval`, `Execute`, `Audit`, `Rollback`,
  `Evidence` interfaces matching the TypeScript signatures in the
  memo verbatim
- Postgres `audit_entries` + `audit_chain` + `idempotency_keys` +
  `evidence_bundles` tables ship via SQL migrations matching 009
  memo § 2's DDL
- **Linear hash chain per-tenant** (NOT Merkle); chain verification
  CLI command runs end-to-end on a populated tenant
- **Idempotency key = `gwh1:sha256(toolName + toolVersion + tenantId
  + JCS-canonicalized-args + actorId)`** with `IDEMPOTENCY_MISMATCH`
  refusal when same key + different `planId`
- CLI: `guidewire-harness plan|policy|approve|execute|audit-verify|
  evidence-export` all functional
- **Architecture rules in CI**: depcruise + AST checks fail any PR
  where a `servers/**` file imports `clients/**` directly (must go
  through `packages/harness`); any `throw` in `servers/*` or
  `packages/harness/` not using `AppError` typed class fails CI
- Three-mode enforcement at the harness layer (NOT the tool) —
  validated by an integration test that proves a tool declaring
  `read_only` cannot reach the write path
- Published as `@intentsolutions/guidewire-harness` on npm

**Demo path (30s):**

```bash
guidewire-harness plan create \
  --tool find-submissions-waiting-on-me \
  --tenant sandbox-jeremy-dev
# emits PLAN-... id; harness verifies + audit-row writes

guidewire-harness audit-verify --tenant sandbox-jeremy-dev
# walks the chain; emits VERIFIED or BREAK at row N
```

**Out of scope (deliberate):**

- Live `approved_execute` against real Guidewire (the code path
  ships, but customers flip on with config + sandbox creds; no OSS
  demo path executes a real write)
- Bundle signing key rotation (deferred to E3+)
- Cross-region audit replication (deferred to E3+)
- Approval delegation (out-of-office routing) — profile concern,
  later release
- Web UI / Slack approval surfaces (CLI-only in E3)

**Blueprint sections governing:** §02 PRD § Harness contract, §03
Architecture § L3 + § 5 three-mode flows, §05 Technical Spec § 3
Contracts + § 4 Observability + § 8 Security posture.

**Memo inputs:** 009 entire memo (TS signatures, DDL, idempotency
formula, hash-chain strategy, depcruise rules) + 006 § 7 invariants.

---

## E4 — Customer profile template + fork starter

**Done when:**

- `profiles/_template/` exists with **9 YAML files** (per 008 memo
  §4): `auth.yaml`, `roles.yaml`, `lob.yaml`, `typelists.yaml`,
  `custom-entities.yaml`, `field-aliases.yaml`, `approval-matrix.yaml`,
  `pii-policy.yaml`, **`events.yaml`** (the 9th, App Events
  subscription config)
- Each YAML has the schema prescribed in 008 memo § 4 — typelists
  carry `source: base|customer_extended` flag, `field-aliases` enumerates
  `money_fields` + `date_fields` per-field formats
- Profile schema validation runs at boot via Zod
- `templates/cowork-fork-starter/` exists with `pnpm guidewire init
  <domain>` script: copies + renames the canonical layout for a
  cohort member's domain
- One worked fork example committed: Jeremy's own `flatbed-mcp`
  (trucking) demonstrating the rename + 3-tool starter

**Demo path (30s):**

```bash
pnpm guidewire init flatbed-mcp
cd ../flatbed-mcp
pnpm install && pnpm dev
# Renamed copy of the architecture, 3 stub tools, ready for the cohort
# member to fill in carrier-vocabulary tools for trucking dispatch.
```

**Out of scope (deliberate):**

- Any real customer profile (those land per-engagement in E10
  customer onboarding)
- Cowork curriculum / week-by-week session content (deferred)
- Profile linting / migration tooling (later)

**Blueprint sections governing:** §02 PRD § Customer profile
contract + § Cowork fork-starter contract.

**Memo inputs:** 008 § 4 profile template prerequisites (8 → 9 YAMLs).

---

## E5 — Drafting tools

**Done when:**

- `policycenter-mcp` adds at minimum: `draft-referral-note`,
  `draft-endorsement` (canonical per [D-016](../004-DR-DEC-architecture-decisions.md#d-016); formerly `propose-endorsement`) — both in `draft_only` mode
- The two slipped-from-E2 tools (`whats-our-appetite-on-this-risk`,
  `explain-why-this-got-referred`) ship here with full UWCenter rule
  trace integration via the `profiles/<customer>/typelists.yaml +
  custom-entities.yaml` mappings
- All draft outputs go through harness `draft_only` flow: plan +
  policy gate + audit row + evidence bundle, NEVER write
- Draft artifact format documented (JSON schema + human-readable
  preview)
- Human reviews + applies via existing Guidewire UI (no auto-apply)

**Demo path (30s):**

```
Claude Desktop → "draft a referral note for submission #ABC-123"
  → policycenter-mcp.draft-referral-note (draft_only)
  → harness gate: PASS (draft_only, no side effect)
  → returns DraftArtifact { id, format: "referral-note", body, evidence_bundle_id }
  → user copies into PC UI manually
```

**Out of scope (deliberate):**

- Any `approved_execute` write (E8 reconcile-this-payment is the
  canary)
- Auto-application back to Guidewire Cloud (never)
- Multi-step drafts that reference each other (sequence orchestration
  is harness territory, not draft tool territory)

**Blueprint sections governing:** §02 PRD § Drafting tools, §03
Architecture § three-mode flows § draft_only path.

**Memo inputs:** 006 § draft_only refusal scenarios + 007 § draft tool
authenticity test.

---

## E6 — Workflow + Events

**Done when:**

- Webhook receiver (Cloud Run service) accepts Guidewire App Events
  POSTs, validates HMAC, enqueues to BullMQ
- BullMQ queue **shards by `primaryObject.id`** so per-claim ordering
  is preserved (per 008 memo § 8 — App Events spec mandates
  per-primary-object safe ordering, NOT cross-claim)
- Suite MCPs (`policycenter-mcp`, `claimcenter-mcp`,
  `billingcenter-mcp`) consume from the queue and update their local
  read-side projections / triggers
- `events-mcp` (small server) provides query-only / replay tools:
  `show-event-payload` (canonical per [D-016](../004-DR-DEC-architecture-decisions.md#d-016); formerly `replay-event`), `find-events-for-claim`, `find-events-for-policy`
- Subscription configuration lives in
  `profiles/<customer>/events.yaml` (the 9th profile YAML from E4)
- Audit row emitted for every event consumed (provenance: which
  primary object, which subscription, when received vs when consumed)

**Demo path (30s):**

```
[in sandbox] adjust a claim reserve in ClaimCenter UI
  → Guidewire emits App Event "ClaimReserveChanged"
  → webhook receiver validates + enqueues
  → BullMQ shards by primaryObject.id (the claim)
  → claimcenter-mcp consumer updates internal projection
  → audit row written

Claude Desktop → "find events for claim 0001-ABC"
  → events-mcp.find-events-for-claim → list with timestamps + types
```

**Out of scope (deliberate):**

- Integration Gateway (Apache Camel routes) — out of scope; IG is
  Guidewire's bulk integration tool, MCP is the conversational tool
  surface (008 memo § Integration Gateway boundary)
- Event-driven `approved_execute` chains (later)
- Cross-claim global ordering (NOT guaranteed by App Events spec)

**Blueprint sections governing:** §02 PRD § events-mcp tools, §03
Architecture § Events plane.

**Memo inputs:** 008 § App Events subscription contract + per-primary-
object ordering refinement.

---

## E7 — ClaimCenter MCP

**Done when:**

- `servers/claimcenter-mcp/` exists with claims-vocabulary tools per
  007 memo verdict (uniformly AUTHENTIC):
  - `find-claims-at-risk-of-leakage` (read_only)
  - `summarize-this-loss` (read_only)
  - `whats-the-reserve-picture` (read_only)
  - `pull-this-claim` (read_only)
  - `draft-denial-letter` (draft_only)
- All tools backed by real ClaimCenter sandbox recordings
- All write/draft paths go through harness; per-tool mode declared
  in metadata
- `mcp-safety-reviewer` audit-rubric pass for the new write surface

**Demo path (30s):**

```
Claude Desktop → "summarize this loss for claim 0001-ABC"
  → claimcenter-mcp.summarize-this-loss
  → drill: "what's the reserve picture"
  → whats-the-reserve-picture
  → "draft a denial letter"
  → draft-denial-letter (draft_only) → DraftArtifact
```

**Out of scope (deliberate):**

- Auto-apply denial letters (never)
- ClaimCenter approved_execute (deferred until customer opt-in)
- Cross-claim aggregation tools beyond what's in the catalog

**Blueprint sections governing:** §02 PRD § ClaimCenter tools.

**Memo inputs:** 007 § ClaimCenter authenticity (uniform AUTHENTIC) +
006 § draft_only write path.

---

## E8 — BillingCenter MCP (+ separate `payments-mcp`)

**Done when:**

- `servers/billingcenter-mcp/` exists with these read tools:
  - `show-overdue-accounts` (read_only)
  - `where-are-we-on-this-payment` (read_only; canonical per [D-016](../004-DR-DEC-architecture-decisions.md#d-016) — formerly `whats-the-payment-status`)
  - `whats-going-on-with-this-account` (read_only; canonical per D-016 — formerly `find-billing-issues-for-this-policy`)
- **`servers/payments-mcp/` directory does NOT exist in this repo**
  (per 006 memo finding #2: carve at repo level, not just tool
  level — prevents attractive-nuisance contributions). When and if
  payments-mcp ships, it lives in a separate package or fork with
  dual-control review.
- `reconcile-this-payment` is the **canary tool** for `approved_
  execute` per 006 memo finding #1 — fully spec'd with
  idempotency-key derivation, 6 refusal scenarios, dual-control +
  3-of-5 threshold, atomic evidence-bundle/state pairing. Sets the
  contract every future write tool inherits.
- Reconcile flow from MCP server → harness → human approval (CLI for
  now) → Cloud API write → audit chain entry → evidence bundle export
- BillingCenter sandbox recordings cover all 4 tools

**Demo path (30s):**

```
Claude Desktop → "show overdue accounts for Acme Brokerage"
  → billingcenter-mcp.show-overdue-accounts (filtered by producer)
  → drill: "where are we on the payment on account 0042"
  → where-are-we-on-this-payment
[in CLI, separately, with sandbox creds]:
guidewire-harness plan create --tool reconcile-this-payment ...
guidewire-harness approve <plan-id> --by jeremy@intentsolutions.io
guidewire-harness execute <plan-id>
# audit + evidence bundle written
```

**Out of scope (deliberate):**

- `payments-mcp` directory (per 006 finding #2)
- Money-movement tools beyond reconcile (no `initiate-refund`,
  `process-payment`, etc. in OSS)
- Treasury-operator persona tools (007 § 8 open question — defer)

**Blueprint sections governing:** §02 PRD § BillingCenter tools +
§ payments deliberately-out, §03 Architecture § approved_execute
path.

**Memo inputs:** 006 § reconcile-this-payment canary + payments-mcp
repo-level guardrail.

---

## E9 — Producer-side MCP — MGA / broker scope

**Done when:**

- `servers/producer-mcp/` exists with **at least 8 tools** —
  closes the density gap from 007 memo finding #2 (current 3 tools
  = "portal scrap" per Persona 4):
  - `show-my-book-of-business` (read_only)
  - `whats-my-commission-status` (read_only)
  - `find-my-pending-quotes` (read_only)
  - `whats-my-loss-ratio-by-class` (read_only) **(missing)**
  - `whats-my-bind-ratio` (read_only) **(missing)**
  - `whats-my-retention` (read_only) **(missing)**
  - `which-accounts-did-i-lose-this-year` (read_only) **(missing)**
  - `which-carriers-have-appetite-for-this-class` (read_only)
    **(missing)**
- Producer scoping enforced by `profiles/<customer>/roles.yaml`
  (no producer can see another producer's book)
- Producer-tagged audit entries

**Demo path (30s):**

```
Claude Desktop (as broker user) → "show my book of business for Q2"
  → producer-mcp.show-my-book-of-business
  → drill: "what's my loss ratio by class"
  → whats-my-loss-ratio-by-class (filtered by my agency code)
```

**Out of scope (deliberate):**

- Quote binding (write — defer)
- Multi-agency rollup (E10 onboarding may scaffold)
- MGA-specific accounting tools (defer)

**Blueprint sections governing:** §02 PRD § producer-mcp tools.

**Memo inputs:** 007 § producer-mcp density gap (5 missing tools).

---

## E10 — Onboarding + certification CLI

**Done when:**

- `pnpm gw onboard <customer>` CLI walks through profile creation:
  auth, roles, lob, typelists, custom-entities, field-aliases,
  approval-matrix, pii-policy, events
- CLI runs contract tests against the customer's sandbox using each
  filled mapping
- Generates a security-review checklist (CISO-facing) covering: auth
  scope coverage, audit-chain integrity test, approval-matrix audit,
  PII redaction unit tests, BAA-applicable LOB flags
- Generates a runbook for the customer's first deployment (Cloud
  Run + Postgres + secrets via SOPS)
- One real customer onboarded end-to-end as the milestone

**Demo path (30s):**

```bash
pnpm gw onboard acme-insurance
# walks 9-step interview, writes profiles/acme-insurance/*.yaml,
# runs contract tests against sandbox, emits security checklist
# + deploy runbook
```

**Out of scope (deliberate):**

- Self-service customer signup (we're not SaaS yet; onboarding is
  human-driven engagement)
- Multi-tenant SaaS control plane

**Blueprint sections governing:** §04 User Journeys § J-6 carrier
onboarding.

---

## E11+ — Publish to `claude-code-plugins-plus-skills` marketplace

**Done when:**

- Plugin manifest exists per IS marketplace standard
  ([6767-b-SPEC](https://github.com/jeremylongshore/claude-code-plugins-plus-skills/blob/main/000-docs/6767-b-SPEC-DR-STND-claude-skills-standard.md))
- Any `SKILL.md` / `agents/*.md` in the plugin satisfies the IS
  enterprise 8-field set: `name`, `description`, `allowed-tools`,
  `version`, `author`, `license`, `compatibility`, `tags`
- `validate-skills-schema.py --enterprise` (the IS marketplace tier
  validator) passes
- Marketplace README + plugin description copy
- Listed in `claude-code-plugins-plus-skills/marketplace/`

**Out of scope (deliberate):**

- Listing on Anthropic's first-party marketplace if/when it exists
  (separate epic)
- Other marketplaces (defer)

**Memo inputs:** none directly; reuses Phase 0 infrastructure.

---

## Distribution metrics worth tracking

(Not in repo; tracked in head + per-status-update.)

- Stars / week
- Forks / week (forks > stars × 0.1 = healthy contribution signal)
- Open issues from external contributors
- Inbound DMs / emails referencing the repo
- npm downloads of `@intentsolutions/guidewire-harness` (post-E3)
- Carrier / MGA / SI inbound conversion rate (the lead-magnet thesis
  metric)

---

## Audit gate

This roadmap is reviewed by:

- `business-analyst` — epic exit-criteria realism
- `architect-reviewer` — epic dependency soundness (E5 depends on E2
  + E3, E7-E9 depend on E1 + E3, E10 depends on E4, E11+ depends on
  E1 + E3 + E4)
- `article-consistency-checker` — PRD ↔ Architecture ↔ Roadmap ↔
  Diagram tell the same story

Filed in **GW-1.8** staffed audit panel.
