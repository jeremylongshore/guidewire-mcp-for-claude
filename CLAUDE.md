# CLAUDE.md — Guidewire MCP for Claude

This file provides guidance to Claude Code when working in this repo.

## What This Is

**Guidewire MCP for Claude** — public OSS repo at
`github.com/jeremylongshore/guidewire-mcp-for-claude`. Carrier-native
MCP servers + governance harness for Guidewire estates, designed
Claude/Anthropic-first.

**Works with the Guidewire InsuranceSuite**: PolicyCenter (E2),
ClaimCenter (E7), BillingCenter (E8), plus the producer / events /
payments surfaces around them.

**Marketplace target:** `claude-code-plugins-plus-skills` — this repo will
eventually be packaged for the marketplace. Plugin manifest +
marketplace conventions land in a dedicated epic
(`guidewire-mkt`, see roadmap).

Local dir kept short as `guidewire/`; full name lives in the repo
identity.

## Why This Exists

OSS lead magnet for custom carrier / MGA / SI build engagements. The
repo is a credibility artifact, not a complete product. README +
ROADMAP credibility matters more than end-to-end completeness.

Audiences (priority order):
1. Confirmed inbound (2 unprompted contacts as of 2026-05-04) +
   future carrier / MGA / SI inbound — primary economic driver
2. Anthropic Enterprise + SI partner credibility
3. Cowork cohort (Claude Code & Cowork Accelerator) using as template
   + curriculum
4. Broad OSS reach (stars, forks, npm)

## Hard Rules (these don't bend)

> **Status:** these rules are **codified now, enforced when E1 lands.**
> Until E1 introduces `packages/`, `servers/`, and CI/CD, the rules
> are policy — not yet machine-enforced. From E1 onward, the
> `audit-harness` + architecture rules in CI fail any change that
> violates them.

1. **Blueprint-first.** No code in `servers/` / `packages/` until the
   master blueprint at `000-docs/blueprint/` exists, the staffed audit
   panel has filed memos, and FAILs are resolved or accepted in
   `000-docs/blueprint/audits/00-AUDIT-RESPONSES.md` (this file lands
   when GW-1.9 closes — see
   [`audits/README.md`](./000-docs/blueprint/audits/README.md) for
   the gate criteria).

2. **Carrier-vocabulary tools, not API verbs.** Tool names underwriters
   / claims / billing operators actually say. `find-submissions-waiting-on-me`
   not `search_policies`. Reject API-shaped names at PR review.

3. **NO MOCKS.** Real Guidewire Cloud sandbox from day 1. `tests/recordings/`
   holds HTTP recordings captured from a real tenant with provenance
   in filenames + `MANIFEST.md`. No hand-written `fixtures/` JSON. CI
   fails loudly if sandbox unreachable — never silently degrades.

4. **Three execution modes per tool**: `read_only`, `draft_only`,
   `approved_execute`. Selected per-tool via customer profile. No
   audit = no write. No policy decision = no write. No idempotency
   key = no write.

5. **Harness governs writes.** Plan → policy gate → human approval →
   execute → audit trail (hash-chain) → rollback hint. Harness is a
   library + CLI, NOT an MCP server (recursive + breaks tool
   selection).

6. **Observability from day 1.** OpenTelemetry tracing + pino
   structured logs + Sentry error capture. Every public function in
   `servers/*` and `packages/harness/` opens a span. Architecture
   rules enforce this in CI.

7. **Enforcement travels with the code.** `@intentsolutions/audit-harness`
   installed as dev dep; CI calls `pnpm exec audit-harness …` — never
   `~/.claude/` paths. Hash-pin policy via `audit-harness init` after
   any policy edit.

8. **Beads for ALL task tracking.** Never TodoWrite / TaskCreate /
   markdown TODO. Every bead carries a `Blueprint:` reference to the
   relevant `000-docs/blueprint/` section.

## Stack

| Layer | Choice |
|---|---|
| Language | TypeScript 5.5+ on Node 22 LTS |
| Package manager | pnpm with workspaces |
| MCP | `@modelcontextprotocol/sdk` (official TS) |
| Schemas | Zod |
| HTTP | undici (native) |
| Tests | Vitest |
| Lint/format | Biome (single tool, no ESLint+Prettier) |
| Build | tsup (lib), tsx (dev) |
| Auth | openid-client (Guidewire Hub OAuth) |
| Queue | BullMQ on Redis (dev) → Cloud Tasks / SQS (prod) |
| Audit store | Postgres + hash-chain |
| Secrets | SOPS + age (per IS standard) |
| Observability | OpenTelemetry + pino + Sentry |
| Container | Docker |
| Deploy | Cloud Run (TS-friendly serverless) |
| IaC | OpenTofu |

**Don't use Express/Fastify** for MCP servers — use the SDK's stdio +
HTTP transports directly.

## Repo Layout (planned, lands incrementally)

```
guidewire/
├── 000-docs/blueprint/        # Master paperwork (lands FIRST, before any code)
│   ├── 00-MASTER-BLUEPRINT.md
│   ├── 01-BUSINESS-CASE.md
│   ├── 02-PRD.md
│   ├── 03-ARCHITECTURE.md
│   ├── 04-USER-JOURNEY.md
│   ├── 05-TECHNICAL-SPEC.md
│   ├── 06-STATUS.md
│   ├── 07-ROADMAP.md
│   ├── 08-COWORK-CURRICULUM.md
│   ├── 09-DR-DIAG-architecture.{svg,mmd}
│   ├── 10-AAR/                # Per-epic after-action reports
│   └── audits/                # Staffed audit panel memos (11 auditors)
├── servers/
│   ├── policycenter-mcp/      # E2 (read-only first)
│   ├── claimcenter-mcp/       # E7
│   ├── billingcenter-mcp/     # E8
│   ├── producer-mcp/          # E9
│   └── events-mcp/            # E6 (query-only)
├── packages/
│   ├── harness/               # E3 — library + CLI, NOT an MCP server
│   ├── observability/         # E1 — OTel + pino + Sentry factory
│   ├── guidewire-client/      # Cloud API client
│   ├── auth/                  # E1
│   ├── audit/                 # E1
│   └── schemas/               # Zod schemas, shared
├── clients/                   # Vendor wrappers (One Inc, etc.)
├── profiles/                  # Per-customer config (auth, roles, LOB
│   ├── _template/             #   mappings, typelists, custom entities,
│   └── ...                    #   field aliases, approval matrix, PII)
├── templates/
│   └── cowork-fork-starter/   # E4 — `pnpm guidewire init <domain>`
├── tests/
│   ├── recordings/            # Real Guidewire sandbox HTTP recordings
│   ├── TESTING.md             # Coverage/mutation/CRAP/arch policy
│   └── ...
└── infra/
    ├── docker/
    ├── cloud-run/
    └── tofu/
```

## 11-Epic Public Roadmap

| Epic | Title |
|---|---|
| E1 | Foundation (mcp-runtime, schemas, auth, audit, client-sdk, observability) |
| E2 | PolicyCenter MCP (read-only) — 5-7 carrier-vocabulary tools |
| E2.5 | Aggregate-query tools (underwriting manager tranche, per D-017) |
| E3 | Harness library + CLI (plan / approve / execute / audit / rollback) |
| E4 | Customer profile template + cowork fork starter |
| E5 | Core writes — drafting tools (`draft-referral-note`, `draft-endorsement`) |
| E6 | Workflow + Events (webhook receiver + queue + events-mcp query) |
| E7 | ClaimCenter MCP |
| E8 | BillingCenter + Payments (separate `payments-mcp` with dual control) |
| E9 | Producer-side MCP (MGA / broker scope) |
| E10 | Onboarding + certification CLI |
| E11+ | Publish to `claude-code-plugins-plus-skills` marketplace |

Public roadmap committed in `000-docs/blueprint/07-ROADMAP.md`.

## Project-level specialist agents

Five purpose-built specialists live in `.claude/agents/` (project-
scoped, committed). They run in two modes — Phase 0 design memos
(feed blueprint authoring) and GW-1.8 staffed-audit memos (review
the finished blueprint).

| Agent | Lane |
|---|---|
| [`mcp-safety-reviewer`](./.claude/agents/mcp-safety-reviewer.md) | Per-tool blast radius, three-mode design, refusal scenarios, harness gating |
| [`carrier-vocabulary-curator`](./.claude/agents/carrier-vocabulary-curator.md) | Tool-name authenticity ("would an operator say this?") + missing carrier-vocabulary surface |
| [`guidewire-api-archaeologist`](./.claude/agents/guidewire-api-archaeologist.md) | Cloud API mapping correctness, LOB/typelist/custom-entity assumptions, App Events vs polling |
| [`harness-runtime-architect`](./.claude/agents/harness-runtime-architect.md) | Harness lib/CLI surface, plan/policy/approval/execute/audit/rollback semantics, hash-chain integrity |
| [`guidewire-reference-librarian`](./.claude/agents/guidewire-reference-librarian.md) | Authoritative public Guidewire docs map; cites release-versioned URLs; primary substitute for sandbox-driven contract drafting until `guidewire-adj` closes |

The librarian's knowledge base is
[`000-docs/005-DR-REF-guidewire-public-resources.md`](./000-docs/005-DR-REF-guidewire-public-resources.md)
(11 categories, every public Guidewire surface). Use it directly, or
invoke the librarian for dynamic Q&A.

## Source-doc citation discipline (MANDATORY for every authoring bead)

**Any claim about Cloud API endpoints, request/response syntax,
typelist values, LOB codes, custom-entity shape, App Events,
Integration Gateway, Cloud Console, Hub OAuth flows, GT Framework,
or any other Guidewire technical surface MUST cite an authoritative
public reference** — typically a release-versioned URL from
[`000-docs/005-DR-REF-guidewire-public-resources.md`](./000-docs/005-DR-REF-guidewire-public-resources.md).

When opening any blueprint authoring bead (GW-1.3 architecture,
GW-1.5 user journeys, GW-1.10 testing, etc.) or when drafting tool
schemas / profile YAMLs / contract recordings, the workflow is:

1. **Before writing the API/integration claim:** consult the
   `guidewire-reference-librarian` agent OR read
   `005-DR-REF-guidewire-public-resources.md` directly to find the
   authoritative source.
2. **If a public source exists:** cite it inline (release-versioned
   URL preferred — e.g., "Palisades Cloud API reference §
   /policy/v1/policies").
3. **If no public source exists:** explicitly mark the claim as
   `(unverified — practitioner knowledge, sandbox-confirm at
   guidewire-adj)` so the GW-1.8 staffed audit + post-blueprint
   `/validate-consistency` red-team panel know what's load-bearing
   on assumption vs. citation.
4. **Never invent endpoint shapes, typelist names, or syntax.** If
   the librarian KB has a gap, the librarian agent's job is to
   fill it (research + add to the KB) — not the authoring agent's
   job to guess.

**Enforcement:** every PR that touches `000-docs/blueprint/` or
adds `servers/` / `packages/` code must pass a librarian
citation-coverage check before merge. The check is:
> "Every API/integration/syntax claim in the diff is either (a)
> backed by a `005-DR-REF` citation, or (b) explicitly marked
> `(unverified — sandbox-confirm)`."

This rule is **non-negotiable** because the OSS repo's credibility
artifact value to inbound carrier / SI / MGA reviewers depends
entirely on the technical content being grounded in real published
Guidewire surfaces. Drift here kills the lead-magnet thesis.

## Workflow

```bash
bd ready              # Find available work
bd show <id>          # Read issue + blueprint reference
bd update <id> --claim
# work on a feature branch
bd close <id> -r "evidence"
```

Every bead's notes carry `Blueprint:` reference to the relevant
section so post-compaction `bd show <id>` rehydrates context without
grep.

## Pre-Plan Discipline

PRs and commits are pre-planned per blueprint section. Each blueprint
section maps to one bead with a stable branch name + pre-stated
commit list + pre-stated PR title. See
`000-docs/blueprint/00-MASTER-BLUEPRINT.md` for the table.

## Gemini PR Review

Gemini Code Assist GitHub App is the required external review for
every PR. Branch protection on `main` requires Gemini review pass +
1 human approval. Never merge before Gemini completes (per global
feedback memory).

## NO MOCKS — sandbox prerequisite

`GW-1.0` (sandbox provisioning) is a hard prereq. Without Guidewire
Cloud sandbox access (developer or partner program), neither the
staffed audit panel nor E1 begins. Sandbox creds live in
`runbook/secrets.prod.sops.yaml` (SOPS+age) for local + GitHub
Actions secret `GUIDEWIRE_SANDBOX_TOKEN` for CI. If sandbox is
unobtainable, scope pivots to a vendor-partner integration where API
access exists — never to mocks.

## Author

Jeremy Longshore, Intent Solutions IO.
