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

**Marketplace target:** `claude-code-plugins-plus` — this repo will
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

1. **Blueprint-first.** No code in `servers/` / `packages/` until the
   master blueprint at `000-docs/blueprint/` exists, the staffed audit
   panel has filed memos, and FAILs are resolved or accepted in
   `000-docs/blueprint/audits/00-AUDIT-RESPONSES.md`.

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

## 10-Epic Public Roadmap

| Epic | Title |
|---|---|
| E1 | Foundation (mcp-runtime, schemas, auth, audit, client-sdk, observability) |
| E2 | PolicyCenter MCP (read-only) — 5-7 carrier-vocabulary tools |
| E3 | Harness library + CLI (plan / approve / execute / audit / rollback) |
| E4 | Customer profile template + cowork fork starter |
| E5 | Core writes — drafting tools (referral note, endorsement) |
| E6 | Workflow + Events (webhook receiver + queue + events-mcp query) |
| E7 | ClaimCenter MCP |
| E8 | BillingCenter + Payments (separate `payments-mcp` with dual control) |
| E9 | Producer-side MCP (MGA / broker scope) |
| E10 | Onboarding + certification CLI |

Public roadmap committed in `000-docs/blueprint/07-ROADMAP.md`.

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
