# Guidewire MCP for Claude

> Carrier-native MCP servers + governance harness for Guidewire
> estates. Built Claude/Anthropic-first.

**Status:** Pre-MVP. Master blueprint paperwork in flight. Code lands
once the staffed audit panel passes (see [`000-docs/blueprint/`](./000-docs/blueprint/)).

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

## Roadmap (10 public epics)

See [`000-docs/blueprint/07-ROADMAP.md`](./000-docs/blueprint/07-ROADMAP.md)
once filed. Tracked live in beads:

```bash
bd list --type=feature
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

## Hard rules

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
servers/              # Per-Guidewire-suite MCP servers
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

## Contributing

CONTRIBUTING.md will land in **E1**. Until then, watch the repo,
file issues that ask hard questions, or DM the author. The OSS
process is in build-in-public mode — early questions shape E2-E4.

## License

Apache-2.0 (planned for `LICENSE` file in E1).

## Author

Jeremy Longshore — [intentsolutions.io](https://intentsolutions.io)
· [jeremylongshore.com](https://jeremylongshore.com)

---

*Build-in-public status updates: this README updates as epics land.
ROADMAP and blueprint are the source of truth.*
