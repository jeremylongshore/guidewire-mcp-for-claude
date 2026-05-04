# 09 — Architectural Diagram (placeholder)

> *Final diagram lands as `09-DR-DIAG-architecture.svg` (+ `.mmd`
> source) via the `/engineer-design-diagram` skill in **GW-1.4**.*

**Status:** PLACEHOLDER. Diagram authoring is **GW-1.4**.
**Bead:** `guidewire-7jt` → GW-1.4 sub-bead (TBD).

---

## What the diagram will show

A layered architecture diagram covering:

1. **Agent host layer** — Claude Desktop, Claude Code, etc.
2. **MCP server layer** — `policycenter-mcp`, `claimcenter-mcp`,
   `billingcenter-mcp`, `producer-mcp`, `events-mcp` (query-only),
   `payments-mcp` (separate, dual-control).
3. **Harness library + CLI** — `packages/harness/` (NOT an MCP
   server). Plan → policy → approval → execute → audit → rollback.
4. **Guidewire Cloud client + vendor clients** — `packages/guidewire-client/`,
   `clients/policycenter/`, `clients/claimcenter/`, `clients/one-inc/`,
   etc.
5. **Customer profiles** — `profiles/<customer>/` (auth, roles, LOB
   mappings, typelists, custom entities, field aliases, approval
   matrix, PII policy).

### Cross-cutting planes (overlaid):

- **Audit plane** — hash-chained Postgres + evidence bundle export.
- **Observability plane** — OpenTelemetry collector, pino log sink,
  Sentry.
- **Events plane** — webhook → BullMQ queue → suite MCP consumers.
- **Auth plane** — Guidewire Hub OAuth + JWT propagation.

### Cowork-fork relationship

The diagram includes a callout showing the
**one-master-blueprint, N-forked-domain-implementations** pattern —
cohort members fork the architecture for their domain, the master
blueprint stays canonical.

---

## Tooling

`/engineer-design-diagram` (Intent Solutions skill) — produces a
self-contained dark-themed HTML file with accessible inline SVG, plus
a Mermaid `.mmd` source for future edits. Grounded in real repo
topology via DCI (package manifests, etc.) — but at GW-1.4 time the
repo is mostly empty, so the diagram is intent-grounded rather than
import-graph-grounded. Re-runs of the skill against the populated
repo (post-E1) catch architectural drift.

## Outputs (when GW-1.4 lands)

- `09-DR-DIAG-architecture.svg` (committed; embedded in
  `00-MASTER-BLUEPRINT.md` and `03-ARCHITECTURE.md`).
- `09-DR-DIAG-architecture.mmd` (Mermaid source, for future edits).
- `09-DR-DIAG-architecture.html` (optional; standalone diagram page).

## Audit gate

Reviewed by:

- `architect-reviewer`
- `article-consistency-checker` (diagram tells the same story as
  the prose architecture in `03-ARCHITECTURE.md`)
