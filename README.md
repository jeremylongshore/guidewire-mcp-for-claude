# Guidewire MCP for Claude

[![CI](https://github.com/jeremylongshore/guidewire-mcp-for-claude/actions/workflows/ci.yml/badge.svg)](https://github.com/jeremylongshore/guidewire-mcp-for-claude/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](./LICENSE)
[![Status: Paperwork-First](https://img.shields.io/badge/Status-Paperwork--First-orange)](./000-docs/blueprint/)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-7c3aed)](https://modelcontextprotocol.io)
[![Built with Claude](https://img.shields.io/badge/Built%20with-Claude-d4a857)](https://claude.ai)
[![Marketplace target](https://img.shields.io/badge/Marketplace-claude--code--plugins--plus--skills-success)](https://github.com/jeremylongshore/claude-code-plugins-plus-skills)
[![Live architecture diagram](https://img.shields.io/badge/Live%20diagram-demo.intentsolutions.io%2Fguidewire--mcp-58a6ff)](https://demo.intentsolutions.io/guidewire-mcp/)

> Works with the Guidewire **InsuranceSuite** (PolicyCenter,
> ClaimCenter, BillingCenter, etc.). Carrier-native MCP servers +
> governance harness for Guidewire estates. Built
> Claude/Anthropic-first. Will publish to the
> [`claude-code-plugins-plus-skills`](https://github.com/jeremylongshore/claude-code-plugins-plus-skills)
> marketplace.

**Status:** Master blueprint paperwork in flight. Code lands once the
staffed audit panel passes (see [`000-docs/blueprint/`](./000-docs/blueprint/)).

This repository is in **paperwork-first** mode. The architectural
blueprint, audit memos, and observability/testing/security policies
live alongside the code from day one — they precede it.

---

## Why this exists

Underwriters don't say `search_policies(query, limit)`. They say
*"find submissions waiting on me"* or *"what's our appetite on this
risk."* This repo's thesis is that **carrier-native tool vocabulary
+ a governance harness is the right MCP surface** for Guidewire
estates — not API-verb wrappers. The harness (plans, approvals,
audit hash-chain, rollback) is the durable moat; the tools are the
language operators already speak.

For full context: [`000-docs/blueprint/01-BUSINESS-CASE.md`](./000-docs/blueprint/01-BUSINESS-CASE.md)
(once filed).

## Roadmap (11 public epics)

See [`000-docs/blueprint/07-ROADMAP.md`](./000-docs/blueprint/07-ROADMAP.md)
for per-epic exit criteria + demo paths. Tracked live in beads:

```bash
bd list --type=epic
```

| Epic | Title | Status |
|---|---|---|
| E1 | Foundation | planned |
| E2 | PolicyCenter MCP (read-only) | planned |
| E3 | Harness library + CLI | planned |
| E4 | Customer profile template + cowork fork starter | planned |
| E5 | Drafting tools (`draft-referral-note`, `propose-endorsement`) | planned |
| E6 | Workflow + Events (webhook + queue + events-mcp) | planned |
| E7 | ClaimCenter MCP | planned |
| E8 | BillingCenter + Payments | planned |
| E9 | Producer-side MCP (MGA / broker scope) | planned |
| E10 | Onboarding + certification CLI | planned |
| E11+ | Publish to `claude-code-plugins-plus-skills` marketplace | planned |

## Hard rules

These rules are **codified now, enforced when E1 lands**. Until E1
introduces `packages/`, `servers/`, and CI/CD, the rules are policy
— not yet machine-enforced. From E1 onward the `audit-harness` and
architecture rules in CI fail any change that violates them.

This isn't a fixture-toy. From day 1:

- **No mocks.** Real Guidewire Cloud sandbox required.
- **No API-verb tools.** Carrier-vocabulary names only.
- **Three execution modes per tool:** `read_only`, `draft_only`,
  `approved_execute`. Per-tool selection via customer profile.
- **No write without audit, policy, idempotency.** Hash-chained audit
  trail mandatory.
- **Observability from line 1.** OpenTelemetry + pino + Sentry wired
  into every server + the harness.
- **Blueprint-first.** No `servers/` or `packages/` code until the
  staffed 11-auditor panel passes.

See [`CLAUDE.md`](./CLAUDE.md) for the full hard-rules list.

## Repo layout

```
000-docs/blueprint/   # Master paperwork (lands first, before any code)
000-docs/             # Phase 0 design inputs + Guidewire public-docs reference
.claude/agents/       # 5 project-level specialist agents
servers/              # Per-Guidewire-suite MCP servers (E2, E7, E8, E9, E6)
packages/             # harness, observability, schemas, auth, audit, client
profiles/             # Per-customer config (auth/roles/LOB/typelists/etc.)
templates/            # cowork-fork-starter
clients/              # Vendor adapters (One Inc, etc.)
tests/recordings/     # Real-sandbox HTTP recordings (with provenance)
infra/                # docker / cloud-run / tofu
```

## Getting started

Not yet runnable. Scaffold lands as **E1** ships.

To track progress:

```bash
git clone https://github.com/jeremylongshore/guidewire-mcp-for-claude.git
cd guidewire-mcp-for-claude
bd ready    # see what's next; install bd from gastownhall/beads
```

To explore the design without cloning:

- [Master blueprint](./000-docs/blueprint/00-MASTER-BLUEPRINT.md) — index + executive summary
- [Architecture decisions](./000-docs/004-DR-DEC-architecture-decisions.md) — D-001 through D-015
- [Persona red team](./000-docs/002-DR-CRIT-personas.md) — 9 perspectives that shaped v4
- [Public Guidewire docs map](./000-docs/005-DR-REF-guidewire-public-resources.md) — every public reference surface, librarian-curated

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). For Guidewire-specific
contributions (carrier-vocabulary tools, profile templates), the
[5 specialist agents](./.claude/agents/) review designs against
blast-radius, vocabulary authenticity, Cloud API correctness,
harness contract semantics, and authoritative-doc citation. PRs
that follow the agent-reviewed pattern land faster.

## License

[Apache-2.0](./LICENSE) — same license as the Guidewire developer
documentation paths we cite, and as Anthropic's reference Claude
plugins.

## Author

Jeremy Longshore — [intentsolutions.io](https://intentsolutions.io)
· [jeremylongshore.com](https://jeremylongshore.com)

---

*[ROADMAP](./000-docs/blueprint/07-ROADMAP.md) and
[blueprint](./000-docs/blueprint/) are the source of truth.*
