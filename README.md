# Guidewire MCP for Claude

[![CI](https://github.com/jeremylongshore/guidewire-mcp-for-claude/actions/workflows/ci.yml/badge.svg)](https://github.com/jeremylongshore/guidewire-mcp-for-claude/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](./LICENSE)
[![Status: v0.1.1 — E1 + E2 built](https://img.shields.io/badge/Status-v0.1.1%20%C2%B7%20E1%20%2B%20E2%20built-3fb950)](./000-docs/blueprint/)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-7c3aed)](https://modelcontextprotocol.io)
[![Built with Claude](https://img.shields.io/badge/Built%20with-Claude-d4a857)](https://claude.ai)
[![Live architecture](https://img.shields.io/badge/Live%20diagram-guidewire--mcp.intentsolutions.io-58a6ff)](https://guidewire-mcp.intentsolutions.io/)

> Carrier-native MCP server for the Guidewire **InsuranceSuite**
> (PolicyCenter, ClaimCenter, BillingCenter). Ask Claude underwriter /
> claims / billing questions in operator vocabulary; the harness gates
> writes. Built Claude/Anthropic-first.

---

## Install (Claude Code plugin)

```
/plugin install jeremylongshore/guidewire-mcp-for-claude
```

That's it. Claude Code clones the repo, runs `pnpm install` (the
`prepare` hook builds all workspaces), and registers the
`policycenter` MCP server. Restart Claude Code; the 5 carrier-
vocabulary tools are now in your tool catalog.

## Configure (4 environment variables)

Set these in your shell, `.env`, or wherever your Claude Code
session inherits env from. The MCP server reads them on boot.

| Variable | What it is |
|---|---|
| `GUIDEWIRE_OAUTH_CLIENT_ID` | Dev-tier OAuth client ID from your Guidewire Hub |
| `GUIDEWIRE_OAUTH_CLIENT_SECRET` | Matching client secret |
| `GUIDEWIRE_TOKEN_ENDPOINT` | OAuth token endpoint URL — your tenant's Hub `/oauth2/v1/token` |
| `GUIDEWIRE_PC_BASE_URL` | PolicyCenter Cloud API base URL — `https://<your-tenant>.pc.guidewire.net/pc/api` |

No dev-tier creds yet? Apply to the
[Guidewire developer program](https://developer.guidewire.com/) — the
[librarian KB](./000-docs/005-DR-REF-guidewire-public-resources.md)
maps every public Guidewire surface, including the developer access
path.

## Use it

In any Claude Code session, ask carrier questions:

> *"find submissions waiting on me"*
> *"show me policies for **Acme Manufacturing**"*
> *"summarize submission **6-2845-1**"*
> *"why isn't the **Acme** account active anymore?"*
> *"open submission **6-2845-1**"*

The MCP server hits the real Cloud API, returns responses in your
operator's vocabulary (`namedInsured`, not `Account.insured`;
`submissionNumber`, not `jobNumber`), and every call writes to the
hash-chained audit trail.

## What ships v0.1.0

**5 read-only PolicyCenter tools** (E2 built):

- `find-submissions-waiting-on-me` — assigned-to-me queue
- `show-policies-for-this-insured` — cross-LOB policy lookup
- `summarize-this-submission` — full submission narrative
- `did-we-lose-this-account` — non-renewal / cancellation history
- `pull-this-submission` — single submission detail

**6 E1 foundation packages** (used by every server) — all published
under the `@intentsolutions/guidewire-*` scope:

- `@intentsolutions/guidewire-schemas` (Zod)
- `@intentsolutions/guidewire-observability` (OTel + pino + Sentry)
- `@intentsolutions/guidewire-auth` (Hub OAuth + JWT propagation)
- `@intentsolutions/guidewire-audit` (Postgres + hash-chain)
- `@intentsolutions/guidewire-client` (undici + two-key idempotency)
- `@intentsolutions/guidewire-mcp-runtime` (stdio + HTTP transports)

135 tests pass. Architecture diagram:
[guidewire-mcp.intentsolutions.io](https://guidewire-mcp.intentsolutions.io/).

## What's next on the public roadmap

| Epic | Title | Status |
|---|---|---|
| E1 | Foundation (6 packages) | **built** |
| E2 | PolicyCenter MCP (read-only · 5 tools) | **built** |
| E2.5 | Aggregate-query tools (UW manager tranche) | planned |
| E3 | Harness library + CLI (writes gate behind plan/approve/audit/rollback) | planned |
| E4 | Per-tenant profile loader | partial — scaffold landed in [#75](https://github.com/jeremylongshore/guidewire-mcp-for-claude/pull/75) |
| E5 | Drafting tools (`draft-referral-note`, `draft-endorsement`) | planned |
| E6 | Workflow + Events (webhook receiver + events-mcp) | planned |
| E7 | ClaimCenter MCP | planned |
| E8 | BillingCenter + Payments (separate dual-control `payments-mcp`) | planned |
| E9 | Producer-side MCP (MGA / broker scope) | planned |
| E10 | Onboarding + certification CLI | planned |
| E11+ | Publish to `claude-code-plugins-plus-skills` marketplace | partial — plugin manifest landed in [#76](https://github.com/jeremylongshore/guidewire-mcp-for-claude/pull/76); marketplace listing pending |

Full per-epic exit criteria:
[`000-docs/blueprint/07-ROADMAP.md`](./000-docs/blueprint/07-ROADMAP.md).

## Hard rules

- **No mocks.** Real Guidewire Cloud endpoints from day one.
- **Carrier vocabulary, not API verbs.** Tool names are the question
  an operator would actually ask (`find-submissions-waiting-on-me`),
  never API-shaped (`search_policies`). The tool's *implementation*
  hits real Guidewire endpoints (`GET /job/v1/jobs?subtype=Submission&...`)
  and the profile's `field-aliases.yaml` translates Guidewire's raw
  field names back to operator-speak before the response returns.
  Outside layer = operator-speak; inside layer = Guidewire-speak;
  translation is the product. PR review rejects `search_*`, `get_*`,
  `list_*` tool names.
- **Three execution modes per tool:** `read_only`, `draft_only`,
  `approved_execute` — selected via customer profile.
- **No write without audit, policy, idempotency.** Hash-chained audit
  trail mandatory.
- **Observability from line 1.** OpenTelemetry + pino + Sentry wired
  into every server + the harness.

Full list: [`CLAUDE.md`](./CLAUDE.md).

## Per-tenant profile (advanced)

The default plug-and-play install uses an in-memory profile that
covers all 5 v0.1.0 read-only tools. Carriers with custom LOB codes,
typelists, role mappings, or field aliases override via a 9-YAML
profile directory. See
[`profiles/_template/README.md`](./profiles/_template/README.md) and
[`profiles/oss-demo/`](./profiles/oss-demo/) for the schema, then run:

```bash
node servers/policycenter-mcp/dist/cli.js --profile profiles/<your-tenant>
```

## Develop / contribute

```bash
git clone https://github.com/jeremylongshore/guidewire-mcp-for-claude.git
cd guidewire-mcp-for-claude
pnpm install              # prepare hook builds all workspaces
pnpm -r test              # 135 tests (TS orchestration / unit / integration)
pnpm smoke-reach          # ping Guidewire endpoints with your dev-tier creds

# Cloud API contract tests use Karate (Guidewire's official OSS test framework, JDK 11 + Gradle):
cd tests/contract
./gradlew test            # 6 .feature files exercising the v0.1.0 endpoints
```

The contract layer uses Karate per [D-022](./000-docs/004-DR-DEC-architecture-decisions.md#d-022)
— same framework Guidewire's own engineers regression-test their
Cloud API releases with. The orchestration layer (profile loading,
field aliasing, harness gating, audit-chain integrity) stays on
TypeScript / Vitest.

Contribution guide: [CONTRIBUTING.md](./CONTRIBUTING.md). The
[5 specialist agents](./.claude/agents/) auto-review carrier-vocabulary
tool design, harness contract semantics, Guidewire Cloud API
correctness, MCP safety, and authoritative-doc citation.

## Design + audit

- [Master blueprint](./000-docs/blueprint/00-MASTER-BLUEPRINT.md) — index
- [Architecture decisions D-001..D-021](./000-docs/004-DR-DEC-architecture-decisions.md)
- [Public Guidewire docs map](./000-docs/005-DR-REF-guidewire-public-resources.md) — librarian-curated
- [11-auditor staffed panel](./000-docs/blueprint/audits/) — security, MCP safety, harness contract, etc.

## License

[Apache-2.0](./LICENSE) — same license as the Guidewire developer
documentation paths we cite.

## Author

Jeremy Longshore — Intent Solutions ·
[intentsolutions.io](https://intentsolutions.io) ·
[jeremylongshore.com](https://jeremylongshore.com) ·
[startaitools.com](https://startaitools.com) ·
`jeremy@intentsolutions.io`
