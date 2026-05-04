# 001-DR-RES — Guidewire MCP research report (synthesis)

**Filed:** 2026-05-04
**Author:** Jeremy Longshore (research input), synthesized for the
v4 plan record
**Bead:** `guidewire-wtq`
**Feeds:** Blueprint epic `guidewire-7jt` / GH #2
**Status:** Phase 0 input artifact (precedes blueprint scaffolding)

---

## Purpose

This document captures the original "Guidewire MCP" research report
that initiated this project. It is preserved here as a Phase 0 input
artifact — the v4 architecture in `003-DR-ARCH-oss-cowork.md`
materially diverges from the original proposal, but the diverging
direction is only legible when the starting point is on file.

## Original proposal — 6 servers, capability-organized

The research report proposed a Guidewire MCP platform organized as
six separate MCP servers, each owning one capability dimension across
the Guidewire suite:

| Server (original) | Scope (original) |
|---|---|
| `guidewire-core-mcp` | Cross-suite read primitives — search, fetch, summarize across PolicyCenter, ClaimCenter, BillingCenter |
| `agent-harness-mcp` | Plan / approve / execute / audit / rollback (the governance layer) |
| `workflow-event-mcp` | App Events ingestion + Integration Gateway triggers + workflow primitives |
| `payments-billing-mcp` | BillingCenter-specific writes + payment partner integrations |
| `data-insight-mcp` | Read-only analytics — loss ratio, cycle time, leakage, etc. |
| `customer-adapter-mcp` | Per-customer config (auth, roles, adapter-pack mappings) |

**Counts:** 60-130 tools total across 6 servers (10-22 tools per
server). Two MCP servers in MVP, all six in buildout.

## Original scaffold — pnpm monorepo

The report ships with a TypeScript / pnpm-workspaces monorepo
scaffold:

```
packages/
├── mcp-runtime/      # SDK wrap, transports
├── schemas/          # Zod schemas
├── auth/             # OAuth + JWT
├── audit/            # Audit log
├── adapter-sdk/      # Customer adapter pack contract
└── guidewire-client/ # Cloud API client
servers/
└── (6 MCP servers)
adapters/
├── guidewire/        # Per-suite Guidewire wrappers
├── partners/         # Vendor adapters (One Inc, etc.)
└── customers/        # Per-customer "adapter packs"
infra/
├── docker/
├── cloud-run/        # GCP Cloud Run deploy
└── tofu/             # OpenTofu IaC
```

## Original 10-epic roadmap (4 MVP + 6 buildout)

| Epic | Original framing |
|---|---|
| E1 | Foundation packages — mcp-runtime, schemas, auth, audit, adapter-sdk |
| E2 | First read-only MCP — `guidewire-core-mcp` (one big server) |
| E3 | Harness — `agent-harness-mcp` server |
| E4 | Customer adapter pack template (`_template/`) |
| E5 | Core writes — add write actions to core-mcp |
| E6 | Workflow + Events — `workflow-event-mcp` |
| E7 | ClaimCenter writes (inside core-mcp) |
| E8 | Payments + Billing |
| E9 | (unspecified — left open in original) |
| E10 | Onboarding + customer certification |

## Open questions left by the original proposal

The research report explicitly flagged seven open architectural
questions for the next pass:

1. **H1** Should the harness be an MCP server, or a runtime library
   the agent host uses? (Recursive concern: the harness invokes MCPs.)
2. **H2** Where do App Events / IG triggers actually live — in
   `workflow-event-mcp`, or as infra (webhook + queue) outside MCP?
3. **H3** Is BillingCenter a server, or a slice inside core?
4. **H4** Does producer / agency hierarchy get its own server, or is
   it always scoped within whatever suite the request is for?
5. **H6** Cloud API only, or do we ship SOAP / InsuranceNow / legacy
   adapters?
6. **H7** Should read and write be separate servers or modes?
7. **H8** What's the degraded-mode / no-write fallback contract?
8. **H9** Tool count distribution — how do we keep tool selection
   quality high past ~15-20 per server?
9. **H10** Who's the customer? Carrier? MGA? SI? OSS contributor?
10. **W5** Is `adapters/customers/<name>/` a valid "adapter pack" or
    is it consultancy work in disguise?

## What the v4 plan does with this

`003-DR-ARCH-oss-cowork.md` resolves these questions through a
multi-persona red team (`002-DR-CRIT-personas.md`) and arrives at a
materially different architecture:

- **Carrier-vocabulary tools** become the dominant abstraction.
  "Adapters" survive only at the API-client layer and the vendor
  layer — not as a customer-facing abstraction.
- **6 servers organized by Guidewire suite** (PolicyCenter,
  ClaimCenter, BillingCenter, Producer, Events) — not by capability.
  Plus a small `events-mcp` for query-only access; the actual events
  ingestion is webhook + queue infra.
- **Harness becomes a library + CLI**, not an MCP server (resolves
  H1).
- **Public OSS from day 1** at
  `github.com/jeremylongshore/guidewire-mcp-for-claude` — the
  research report did not contemplate distribution; v4 does.
- **Cowork integration** (template fork-starter for non-Guidewire
  domains) — added in v4 because Jeremy's Claude Code & Cowork
  Accelerator cohort is one of the audiences.
- **NO MOCKS** — real Guidewire Cloud sandbox from day 1 (research
  report assumed fixture-backed dev would suffice).

The decision log in `004-DR-DEC-architecture-decisions.md` records
each pivot with rationale.

## Reference

The original research report transcript lives in conversation history
(session id `b55dcd1d-…`). The points above are extracted; details
beyond what's captured here are recoverable from that transcript.
