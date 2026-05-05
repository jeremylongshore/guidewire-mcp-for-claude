# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Guidewire MCP for Claude** — a Claude Code plugin (`/plugin install
jeremylongshore/guidewire-mcp-for-claude`) + carrier-native MCP server
for the Guidewire **InsuranceSuite** (PolicyCenter, ClaimCenter,
BillingCenter). v0.1.0 ships **read-only PolicyCenter** with 5
carrier-vocabulary tools. Live architecture diagram:
[guidewire-mcp.intentsolutions.io](https://guidewire-mcp.intentsolutions.io/).

The thesis: tool names are operator questions
(`find-submissions-waiting-on-me`), never API verbs (`search_policies`).
A governance harness gates all writes via plan → policy → approval →
execute → audit → rollback (E3, planned). The audit hash-chain + the
carrier vocabulary are the durable moats.

## Build / test / run

pnpm workspace, Node 22 LTS, TypeScript 5.5+, Vitest, Biome (single
linter+formatter, no ESLint+Prettier). Cloud API contract tests live
in `tests/contract/` on **Karate** (JDK 11 + Gradle) per
[D-022](./000-docs/004-DR-DEC-architecture-decisions.md#d-022) — TS
covers orchestration / unit / integration; Karate covers the Cloud
API wire contract.

```bash
pnpm install                                    # prepare hook builds all workspaces
pnpm -r build                                   # rebuild all 7 workspaces (6 packages + 1 server)
pnpm -r test                                    # 54 tests across all workspaces
pnpm --filter @intentsolutions/guidewire-audit test                            # single workspace
pnpm --filter @intentsolutions/guidewire-audit test -- audit-store.test.ts     # single test file
pnpm typecheck                                  # tsc --noEmit across all workspaces
pnpm lint                                       # biome check .
pnpm format                                     # biome format --write .
pnpm smoke-reach                                # ping librarian-cataloged Cloud endpoints with dev-tier creds
node servers/policycenter-mcp/dist/cli.js                              # boot with in-memory default profile
node servers/policycenter-mcp/dist/cli.js --profile profiles/oss-demo  # boot with on-disk profile

# Cloud API contract tests (Karate — JVM-side; runs when GUIDEWIRE_OAUTH_CLIENT_ID is set, skips cleanly when not):
cd tests/contract && ./gradlew test
```

The `prepare` script (`pnpm -r build || true` in root `package.json`)
fires on every `pnpm install` so plugin-install end-users get a built
`dist/` automatically. `dist/` is gitignored; CI rebuilds in workflows.

## Architecture big-picture

**5 layers, top to bottom** (the live diagram visualizes this):

1. **Agent host** — Claude Code, Claude Desktop, Anthropic API
2. **MCP servers** — `servers/<suite>-mcp/` (only `policycenter-mcp`
   built; claimcenter / billingcenter / producer / events planned)
3. **Harness** — `packages/harness/` (E3, planned). Gates writes.
   Library + CLI, **NOT an MCP server** (recursion + tool-selection problem).
4. **E1 foundation packages** (all built; `packages/`):
   - `@intentsolutions/guidewire-schemas` — Zod schemas + TS contracts
   - `@intentsolutions/guidewire-observability` — OTel + pino + Sentry factory
   - `@intentsolutions/guidewire-auth` — Hub OAuth + JWT propagation
   - `@intentsolutions/guidewire-audit` — Postgres + hash-chain audit store
   - `@intentsolutions/guidewire-client` — undici Cloud API client with
     two-key idempotency (harness `gwh1:` cache key + Guidewire
     `GW-DBTransaction-ID` wire header — never reuse the same value)
   - `@intentsolutions/guidewire-mcp-runtime` — MCP SDK wrapper
5. **External** — Guidewire Cloud API, Hub OAuth, Postgres (audit chain),
   OTLP collector + Sentry

**Profile system** (loader + scaffold landed; full per-tenant story is E4):

- **Plug-and-play default**: `createDefaultProfile()` in
  `servers/policycenter-mcp/src/profile.ts` returns an in-memory
  profile covering all 5 v0.1.0 read-only tools. **Zero YAML editing
  required for the 80% case.** This is what the Claude Code plugin
  install uses.
- **Per-tenant override**: `loadProfile(path)` reads 9 YAMLs from
  `profiles/<tenant>/` (auth, roles, lob, typelists, custom-entities,
  field-aliases, approval-matrix, pii-policy, events; per PRD § 6.1-6.9),
  validates each via Zod schemas in `packages/schemas/src/profile/`.
  Customers copy `profiles/_template/` → `profiles/<their-tenant>/`,
  edit, run with `--profile <path>`.
- `profiles/oss-demo/` is a fully-populated reference. Read-only — never
  the production path.

**Three execution modes per tool** (selected per-tool via profile):
`read_only` (E2 ships these), `draft_only` (E5), `approved_execute`
(E3 + harness). The harness is the only path to writes — depcruise
+ AST rules in CI prevent server code from importing
`packages/guidewire-client` write methods except inside an
`execute()` callback.

## Hard rules

These travel with the code; CI workflows in `.github/workflows/`
enforce what's enforceable.

1. **Carrier-vocabulary tool names.** Tool names are the question an
   operator would actually ask. Reject API-shaped names (`search_*`,
   `list_*`, `get_*`) at PR review.
2. **NO MOCKS.** Real Guidewire Cloud endpoints from day one. No
   hand-written `fixtures/`. `tests/recordings/` holds HTTP recordings
   captured from real dev-tier sandbox calls with provenance metadata.
   Per [D-008](./000-docs/004-DR-DEC-architecture-decisions.md) +
   [D-021](./000-docs/004-DR-DEC-architecture-decisions.md#d-021).
3. **No write without audit, policy, idempotency.** Hash-chained
   audit per tenant; tamper-resistant via three Postgres roles
   (writer / reader / verifier) per
   [D-019](./000-docs/004-DR-DEC-architecture-decisions.md#d-019).
   E1 ships a testcontainers test asserting `audit_writer` cannot
   `UPDATE` / `DELETE` (per audit-response triage AR-7 in
   [`audits/00-AUDIT-RESPONSES.md`](./000-docs/blueprint/audits/00-AUDIT-RESPONSES.md)).
4. **Observability from line 1.** Every public function in
   `servers/*` and `packages/harness/` opens a span. Every `throw`
   uses a typed `AppError` in `packages/observability/`. CI fails on
   raw `console.log` in production code paths.
5. **Source-doc citation discipline.** Every claim about Cloud API
   endpoints, typelist values, LOB codes, custom-entity shape, App
   Events, or any Guidewire technical surface must cite an
   authoritative public reference (typically a release-versioned URL
   from
   [`000-docs/005-DR-REF-guidewire-public-resources.md`](./000-docs/005-DR-REF-guidewire-public-resources.md))
   OR explicitly mark the claim `(unverified — practitioner knowledge
   from public docs; first integration engagement validates)`. Never
   invent endpoint shapes or syntax.
6. **Beads for ALL task tracking.** Never `TodoWrite`,
   `TaskCreate`, or markdown TODO. Each bead carries a `Blueprint:`
   reference to the relevant `000-docs/blueprint/` section.

## Workflow

```bash
bd ready                                   # find available work
bd update <id> --status=in_progress
git checkout -b <type>/<short-description>
# work
bd close <id> -r "evidence" && git add ... && git commit ... && git push -u origin <branch>
gh pr create --title "..." --body "..."
gh pr merge <N> --squash --auto --delete-branch     # auto-merges after Gemini review + checks
```

**Gemini Code Assist** is the required external review for every PR.
Branch protection on `main` requires Gemini pass + 1 human approval.
Never merge before Gemini completes.

**5 specialist agents** in [`.claude/agents/`](./.claude/agents/) (project-scoped)
auto-review designs:
[`mcp-safety-reviewer`](./.claude/agents/mcp-safety-reviewer.md),
[`carrier-vocabulary-curator`](./.claude/agents/carrier-vocabulary-curator.md),
[`guidewire-api-archaeologist`](./.claude/agents/guidewire-api-archaeologist.md),
[`harness-runtime-architect`](./.claude/agents/harness-runtime-architect.md),
[`guidewire-reference-librarian`](./.claude/agents/guidewire-reference-librarian.md).
Spawn the librarian before drafting any tool / profile / recording
that asserts a Cloud API shape — it consults the public-docs KB and
flags `unverified` gaps.

## Where to look (canonical sources of truth)

| Topic | File |
|---|---|
| Architectural decisions D-001..D-021 | [`000-docs/004-DR-DEC-architecture-decisions.md`](./000-docs/004-DR-DEC-architecture-decisions.md) |
| Public Guidewire docs map | [`000-docs/005-DR-REF-guidewire-public-resources.md`](./000-docs/005-DR-REF-guidewire-public-resources.md) |
| Profile schema (9 YAMLs) | [`000-docs/blueprint/02-PRD.md`](./000-docs/blueprint/02-PRD.md) § 6.1-6.9 |
| Per-tool spec (5 v0.1.0 tools) | [`000-docs/blueprint/02-PRD.md`](./000-docs/blueprint/02-PRD.md) § 3 + § 4 |
| Operator user journeys | [`000-docs/blueprint/04-USER-JOURNEY.md`](./000-docs/blueprint/04-USER-JOURNEY.md) |
| Stack + observability + quality gates | [`000-docs/blueprint/05-TECHNICAL-SPEC.md`](./000-docs/blueprint/05-TECHNICAL-SPEC.md) |
| 11-epic public roadmap | [`000-docs/blueprint/07-ROADMAP.md`](./000-docs/blueprint/07-ROADMAP.md) |
| 11-auditor staffed panel + response register | [`000-docs/blueprint/audits/`](./000-docs/blueprint/audits/) |
| Audit response triage state | [`000-docs/blueprint/audits/00-AUDIT-RESPONSES.md`](./000-docs/blueprint/audits/00-AUDIT-RESPONSES.md) (Themes 2 + 3 closed; Themes 1 + 4 remain) |

## Plugin / installation surface

The repo ships as a Claude Code plugin via
[`.claude-plugin/plugin.json`](./.claude-plugin/plugin.json) +
[`.mcp.json`](./.mcp.json). End-users run `/plugin install ...`,
set 4 env vars (`GUIDEWIRE_OAUTH_CLIENT_ID`,
`GUIDEWIRE_OAUTH_CLIENT_SECRET`, `GUIDEWIRE_TOKEN_ENDPOINT`,
`GUIDEWIRE_PC_BASE_URL`), and ask Claude carrier questions in their
session. The plugin path is the primary product surface; the
`pnpm install && pnpm dev` flow is the developer / contributor path.

## Author

Jeremy Longshore, Intent Solutions IO ·
[intentsolutions.io](https://intentsolutions.io) ·
`jeremy@intentsolutions.io`
