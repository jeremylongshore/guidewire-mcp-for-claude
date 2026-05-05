# 09 — Architectural Diagram

**Source of truth:** [`09-DR-DIAG-architecture.mmd`](./09-DR-DIAG-architecture.mmd)
(Mermaid). This file embeds the same diagram inline so GitHub renders
it directly when contributors view this page.

**Filed:** 2026-05-04 (GW-1.4)
**Bead:** `guidewire-sd7`
**Authored via:** `/engineer-design-diagram` (intent-grounded; the
repo has no `package.json` / docker-compose / k8s / terraform yet,
so DCI returned empty — the diagram is grounded in the architecture
documents, not import graph). Re-runs of the skill against the
populated repo post-E1 will catch architectural drift.

---

## What the diagram shows

A 5-layer architecture with 4 cross-cutting planes.

**Layers (top → bottom, synchronous data plane):**

1. **L1 Agent host** — Claude Desktop, Claude Code, Cursor; speaks
   MCP.
2. **L2 MCP servers** — one per Guidewire suite: `policycenter-mcp`
   (E2 + E5), `claimcenter-mcp` (E7), `billingcenter-mcp` (E8),
   `producer-mcp` (E9), `events-mcp` (E6 query-only). `payments-mcp`
   is separate, dual-control, **NOT in the OSS demo path** (per
   [`006-DR-MEMO-mcp-safety.md`](../006-DR-MEMO-mcp-safety.md) finding #2).
3. **L3 Harness** — `packages/harness/` library + CLI. **NOT an
   MCP server** (per D-003 + persona-7 attack). Owns plan / policy /
   approval / execute / audit (linear hash-chain per-tenant) /
   rollback hint / evidence bundle.
4. **L4 Clients** — `packages/guidewire-client` (Cloud API), per-suite
   wrappers in `clients/policycenter/` etc., vendor wrappers in
   `clients/one-inc/` etc. Pure HTTP + protocol mapping; no business
   logic.
5. **L5 Customer profiles** — `profiles/<customer>/` 9 YAML files
   (auth, roles, lob, typelists, custom-entities, field-aliases,
   approval-matrix, pii-policy, **events** — the 9th file added per
   [`008-DR-MEMO-guidewire-api.md`](../008-DR-MEMO-guidewire-api.md) recommendation).

**Cross-cutting planes (right side, dotted edges):**

- **Audit plane** — Postgres linear hash-chain per-tenant + evidence
  bundle export (per `009-DR-MEMO-harness-runtime.md`)
- **Observability plane** — OpenTelemetry collector + pino structured
  logs + Sentry (per D-013)
- **Events plane** — Webhook receiver + BullMQ on Redis, **sharded by
  `primaryObject.id`** so in-claim ordering is preserved (per
  `008-DR-MEMO` § 8 — App Events spec mandates per-primary-object
  safe ordering, not cross-claim)
- **Auth plane** — Guidewire Hub OAuth + JWT propagation

---

## Diagram (renders inline on GitHub)

```mermaid
flowchart TB
    subgraph L1 ["L1 · Agent host"]
        direction LR
        AH["Claude Desktop · Claude Code · Cursor<br/>(MCP client)"]
    end

    subgraph L2 ["L2 · MCP servers (per Guidewire suite)"]
        direction LR
        PC["policycenter-mcp<br/>(E2 read-only · E5 drafts)"]
        CC["claimcenter-mcp<br/>(E7)"]
        BC["billingcenter-mcp<br/>(E8)"]
        PR["producer-mcp<br/>(E9 · MGA / broker)"]
        EV["events-mcp<br/>(E6 · query-only)"]
        PM["payments-mcp<br/>(E8 · separate, dual-control<br/>NOT in OSS demo)"]:::dashed
    end

    subgraph L3 ["L3 · packages/harness (library + CLI · governance)"]
        direction LR
        HARN["plan → policy → approval → execute<br/>→ audit (hash-chain) → rollback hint<br/>→ evidence bundle (JSON)"]
    end

    subgraph L4 ["L4 · Clients (HTTP + protocol mapping; no business logic)"]
        direction LR
        GWC["packages/guidewire-client<br/>(Cloud API)"]
        SUITE_CL["clients/{policycenter,claimcenter,<br/>billingcenter}<br/>(per-suite wrappers)"]
        VENDOR["clients/{one-inc, smart-comms, ...}<br/>(vendor wrappers)"]
    end

    subgraph L5 ["L5 · profiles/&lt;customer&gt;/ (config only · never code)"]
        direction LR
        PROF["auth · roles · lob · typelists<br/>custom-entities · field-aliases<br/>approval-matrix · pii-policy · events"]
    end

    GW_CLOUD[("Guidewire Cloud<br/>PolicyCenter / ClaimCenter /<br/>BillingCenter / Hub OAuth<br/>App Events")]:::external
    VENDOR_API[("Vendor APIs<br/>(One Inc, Smart Comms, ...)")]:::external

    subgraph PLANE_AUDIT ["Audit plane"]
        direction TB
        AUD_DB[("Postgres<br/>linear hash-chain · per-tenant")]
        AUD_BUNDLE["Evidence bundle export<br/>(JSON · reproducible from trace_id)"]
    end

    subgraph PLANE_OBS ["Observability plane"]
        direction TB
        OTEL["OpenTelemetry collector<br/>(user-configured endpoint)"]
        PINO["pino → user log sink<br/>(stdout JSON)"]
        SENTRY["Sentry<br/>(typed AppError → bead via bd-sync)"]
    end

    subgraph PLANE_EVENTS ["Events plane"]
        direction LR
        WEBHOOK["Webhook receiver"]
        QUEUE["BullMQ on Redis<br/>(sharded by primaryObject.id)"]
    end

    subgraph PLANE_AUTH ["Auth plane"]
        direction TB
        OAUTH["Guidewire Hub OAuth<br/>(per-tenant client + secret · SOPS)"]
        JWT["JWT propagation<br/>(actor_id · scopes)"]
    end

    AH ==>|MCP / stdio · HTTP| PC & CC & BC & PR & EV
    AH -. "(opt-in, mature deployments)" .-> PM
    PC & CC & BC & PR & EV ==> HARN
    PM -. dashed .-> HARN
    HARN ==> GWC & SUITE_CL & VENDOR
    HARN ==> PROF
    GWC ==> GW_CLOUD
    SUITE_CL ==> GW_CLOUD
    VENDOR ==> VENDOR_API

    GW_CLOUD -. App Events .-> WEBHOOK
    WEBHOOK ==> QUEUE
    QUEUE -. shard by primaryObject.id .-> CC & BC & PC
    QUEUE -. query / replay .-> EV

    HARN -. audit · hash-chain .-> AUD_DB
    HARN -. evidence bundle .-> AUD_BUNDLE
    PC & CC & BC & PR & EV & HARN -. spans · logs · errors .-> OTEL
    PC & CC & BC & PR & EV & HARN -. structured logs .-> PINO
    PC & CC & BC & PR & EV & HARN -. AppError .-> SENTRY

    OAUTH -. token .-> HARN
    HARN -. JWT .-> GWC & SUITE_CL & VENDOR

    classDef external fill:#1a1a2e,stroke:#9d4edd,color:#e0e0ff
    classDef dashed fill:#1a1a2e,stroke:#ff6b6b,stroke-dasharray:5 5,color:#ffd0d0

    style L1 fill:#0d1b2a,stroke:#1b9aaa,color:#e0e0ff
    style L2 fill:#0d1b2a,stroke:#1b9aaa,color:#e0e0ff
    style L3 fill:#1a0d2a,stroke:#9d4edd,color:#e0e0ff
    style L4 fill:#0d1b2a,stroke:#1b9aaa,color:#e0e0ff
    style L5 fill:#1a1a0d,stroke:#f9c74f,color:#fffde0
    style PLANE_AUDIT fill:#2a0d0d,stroke:#e76f51,color:#ffe0d0
    style PLANE_OBS fill:#0d2a1a,stroke:#52b788,color:#d0ffd0
    style PLANE_EVENTS fill:#0d2a2a,stroke:#76c893,color:#d0fff0
    style PLANE_AUTH fill:#2a1a0d,stroke:#f9844a,color:#ffe0d0
```

---

## Reading the edges

| Style | Meaning |
|---|---|
| Solid `==>` | Synchronous data plane (request / response) |
| Dotted `-. ... .->` | Async event / governance / cross-cutting plane |
| Dashed border (red) | Out-of-OSS-demo / opt-in only — `payments-mcp` |
| Cylinder shape | External system or persistent store |

## Reading the colors

| Color | Plane / role |
|---|---|
| Blue | Synchronous data planes (L1, L2, L4) |
| Purple | Governance (L3 harness) |
| Yellow | Configuration data (L5 profiles) |
| Red | Audit plane |
| Green | Observability plane |
| Teal | Events plane |
| Orange | Auth plane |

---

## Local rendering

GitHub renders the Mermaid block above natively. To produce a
standalone SVG / PNG / PDF locally:

```bash
# Install mermaid-cli if not present
pnpm add -g @mermaid-js/mermaid-cli   # or: npm install -g

# Render to SVG (dark theme, transparent background)
mmdc -i 09-DR-DIAG-architecture.mmd \
     -o 09-DR-DIAG-architecture.svg \
     -t dark \
     -b transparent \
     --width 1600 --height 1200

# Render to PNG (for slides / pitch decks)
mmdc -i 09-DR-DIAG-architecture.mmd \
     -o 09-DR-DIAG-architecture.png \
     -t dark --width 2400
```

Generated `.svg` / `.png` outputs are **not committed** (they're
regenerable artifacts). The `.mmd` source is the canonical artifact.

**Note (2026-05-04):** mmdc on the dev box where this diagram was
authored fails to launch Chrome via Puppeteer. Workaround: render
the SVG on any machine with a working Chrome / Chromium, or rely on
GitHub's native Mermaid rendering for in-doc display.

---

## When to update this diagram

- Each time a new MCP server is added or removed (E6 events-mcp;
  E9 producer-mcp; etc.)
- When a cross-cutting plane materially changes (audit storage swap,
  observability sink change)
- When the harness contract changes (D-003 / D-005 / D-006 revisions)

Updates land via `/design:diff` (post-E1 once import-graph DCI is
available) or by direct edit of the `.mmd` source. PR title:
`docs: refresh architectural diagram (<reason>)`. Refs `#2`.

---

## Cross-references

- v4 architecture (the prose this diagram visualizes):
  [`../003-DR-ARCH-oss-cowork.md`](../003-DR-ARCH-oss-cowork.md)
- Decision log:
  [`../004-DR-DEC-architecture-decisions.md`](../004-DR-DEC-architecture-decisions.md)
  (D-003, D-004, D-005, D-006, D-008, D-013)
- Specialist memos that grounded the diagram details:
  [`006-DR-MEMO-mcp-safety.md`](../006-DR-MEMO-mcp-safety.md) ·
  [`008-DR-MEMO-guidewire-api.md`](../008-DR-MEMO-guidewire-api.md) ·
  [`009-DR-MEMO-harness-runtime.md`](../009-DR-MEMO-harness-runtime.md)
- Master blueprint section that links here:
  [`./03-ARCHITECTURE.md`](./03-ARCHITECTURE.md) (embeds this diagram inline)
- Source: [`./09-DR-DIAG-architecture.mmd`](./09-DR-DIAG-architecture.mmd)
