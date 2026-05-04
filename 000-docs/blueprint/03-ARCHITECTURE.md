# 03 — System Architecture

> *Layered architecture — agent host → MCP servers → harness library →
> Guidewire Cloud + vendor clients → customer profiles, with audit,
> observability, events, and auth as cross-cutting planes.*

**Filed:** 2026-05-04
**Bead:** `guidewire-u0o` (under epic `guidewire-7jt` — GH [#2](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/2))
**Inputs:** [`./02-PRD.md`](./02-PRD.md),
[`../003-DR-ARCH-oss-cowork.md`](../003-DR-ARCH-oss-cowork.md),
[`../004-DR-DEC-architecture-decisions.md`](../004-DR-DEC-architecture-decisions.md),
[`../005-DR-REF-guidewire-public-resources.md`](../005-DR-REF-guidewire-public-resources.md),
[`../006-DR-MEMO-mcp-safety.md`](../006-DR-MEMO-mcp-safety.md),
[`../007-DR-MEMO-carrier-vocabulary.md`](../007-DR-MEMO-carrier-vocabulary.md),
[`../008-DR-MEMO-guidewire-api.md`](../008-DR-MEMO-guidewire-api.md),
[`../009-DR-MEMO-harness-runtime.md`](../009-DR-MEMO-harness-runtime.md),
[`./09-DR-DIAG-architecture.md`](./09-DR-DIAG-architecture.md).
**Status:** authored content (replaces GW-1.1 skeleton).

---

## 1. Architecture context

### 1.1 What this is

Guidewire MCP for Claude is a set of carrier-native MCP servers — one
per Guidewire suite — fronted by a governance harness that gates every
write. It's a workshop, not a SaaS. Each customer runs the stack
inside their own trust boundary: their machine, their VPC, their
Cloud Run project. There is intentionally no central control plane in
the OSS distribution. The repo's job is to be credible enough that an
inbound carrier, MGA, or SI engages for custom build work — per
[D-009](../004-DR-DEC-architecture-decisions.md#d-009--public-oss-from-day-1-day-3-release)
and [D-010](../004-DR-DEC-architecture-decisions.md#d-010--oss--lead-magnet-for-custom-build-work-not-a-complete-product),
the OSS surface is the wedge; the customization is the margin.

The center of gravity is operator vocabulary plus governance, not API
verbs plus adapters. Tools speak the question the operator would ask
a junior analyst — *"find submissions waiting on me,"* *"what's our
appetite on this risk,"* *"reconcile this payment"* — per
[D-001](../004-DR-DEC-architecture-decisions.md#d-001--carrier-vocabulary-tools-are-the-dominant-abstraction).
Underneath, every write passes through plan → policy → approval →
execute → audit → rollback hint per
[D-005](../004-DR-DEC-architecture-decisions.md#d-005--three-execution-modes-per-tool)
and [D-006](../004-DR-DEC-architecture-decisions.md#d-006--hard-rule-no-audit--no-write).
The full tool catalog (39 tools across 5 suite servers) is canonical
in [02-PRD § 3](./02-PRD.md#3-tools--by-guidewire-suite); this
document does not redefine it.

### 1.2 What this isn't

- **Not a SaaS.** No multi-tenant control plane in the OSS repo. A
  customer who wants their own operator UI for approvals can build
  one against the harness CLI; the OSS does not host one.
- **Not a Guidewire replacement.** Cloud APIs remain authoritative.
  When a tool returns a balance, Cloud API is the source; the harness
  audits the read but does not cache state.
- **Not an event-driven runtime.** App Events ingest into a queue
  consumed by suite MCPs per
  [D-004](../004-DR-DEC-architecture-decisions.md#d-004--events-webhook--queue-infra--small-events-mcp-query-only),
  but tools never subscribe at call-time. The MCP surface is a
  conversational query plane on top of an event-driven world.
- **Not Integration Gateway.** Bulk ETL, file-based EDI, and
  cross-system batch flows belong in IG ([008 § 8](../008-DR-MEMO-guidewire-api.md#8-integration-gateway-boundary--ig-and-mcp-coexist-do-not-blur)).
  MCP and IG coexist; they do not overlap.
- **Not a money-movement runtime.** `payments-mcp` does not exist as
  a directory in this repo per
  [D-018](../004-DR-DEC-architecture-decisions.md#d-018--reconcile-payment-vs-money-movement-boundary-sharpened-pre-audit)
  + [006 § 6.1](../006-DR-MEMO-mcp-safety.md). `reconcile-this-payment`
  applies an already-received payment to an account; no banking rail
  is touched.

### 1.3 Trust boundaries

The runtime model is **local-first, customer-hosted**. Three trust
zones operate against three credential sets:

| Zone | What runs | Credentials | Who controls |
|---|---|---|---|
| **User machine** | Agent host (Claude Desktop / Claude Code / Cursor) and — in single-operator deployments — the suite MCP servers as stdio child processes | None of the carrier's; the agent host holds the user's Anthropic key | The end user |
| **Customer-hosted server** | The MCP servers + harness + Postgres audit store, running per-tenant on Cloud Run / VM / on-prem | Guidewire Hub OAuth client/secret (per-tenant, SOPS-encrypted), JWT-propagated actor identity, sandbox/prod tenant credentials | The carrier / MGA / SI |
| **Guidewire Cloud** | PolicyCenter, ClaimCenter, BillingCenter, Hub OAuth, App Events | Carrier-tenant credentials issued by Guidewire | Guidewire + carrier |

There is no fourth "Intent Solutions cloud" zone. The OSS repo does
not phone home; there's no telemetry sink we operate. Observability
sinks (OTel collector, pino log target, Sentry DSN) are
user-configured per
[D-013](../004-DR-DEC-architecture-decisions.md#d-013--observability-is-wired-in-from-day-1-not-bolted-on)
— shipped wired, defaulted off until the operator points them
somewhere.

This shape addresses two persona threats by name. **Persona 1 (P&C
Carrier CIO)** asked who runs this and where the data goes; the
answer is "you, in your VPC, against your tenant — we never see it"
([02-PRD § 2](./02-PRD.md#2-personas) row 1). **Persona 5 (Security /
CISO)** asked about standing service credentials; the answer is
JWT-propagated actor identity per tool call, no shared service-account
key with read-all scopes (002-DR-CRIT Persona 5; [008 § 10](../008-DR-MEMO-guidewire-api.md#10-auth-model--guidewire-hub-oauth--jwt-propagation);
[02-PRD § 6.1](./02-PRD.md#61-authyaml--guidewire-hub-oauth--jwt-propagation)).

### 1.4 Why this shape works as a credibility artifact

A SaaS control plane in the OSS would invert the trust story — it
would mean every cohort fork and every inbound prospect was sending
state through us. The local-first shape is what makes the repo a
credibility artifact that an enterprise CIO can read end-to-end
without flinching, which is the entire point of
[D-010](../004-DR-DEC-architecture-decisions.md#d-010--oss--lead-magnet-for-custom-build-work-not-a-complete-product).
The custom build engagements that follow can layer a SaaS control
plane if the customer wants one; the OSS does not.

---

## 2. Layered model

Five layers, top-down. Each layer has a public interface, a set of
dependencies, and a list of things it must not do. The architecture
diagram in [09-DR-DIAG](./09-DR-DIAG-architecture.md) is the
single-page reference for the whole shape; the source of truth is
[`09-DR-DIAG-architecture.mmd`](./09-DR-DIAG-architecture.mmd) and
GitHub renders the same diagram inline below.

### 2.1 The diagram

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

    subgraph FORKS ["Cowork-fork derivatives (one master · N forks)"]
        direction LR
        FLATBED["flatbed-mcp<br/>(trucking · Jeremy)"]:::fork
        MLS["mls-mcp<br/>(real estate)"]:::fork
        FLOOR["floor-mcp<br/>(restaurant ops)"]:::fork
        DOTS["..."]:::fork
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

    L1 -. "templates/cowork-fork-starter +<br/>pnpm guidewire init &lt;domain&gt;" .-> FORKS

    classDef external fill:#1a1a2e,stroke:#9d4edd,color:#e0e0ff
    classDef dashed fill:#1a1a2e,stroke:#ff6b6b,stroke-dasharray:5 5,color:#ffd0d0
    classDef fork fill:#0f1f0f,stroke:#52b788,color:#d0ffd0,stroke-dasharray:3 3

    style L1 fill:#0d1b2a,stroke:#1b9aaa,color:#e0e0ff
    style L2 fill:#0d1b2a,stroke:#1b9aaa,color:#e0e0ff
    style L3 fill:#1a0d2a,stroke:#9d4edd,color:#e0e0ff
    style L4 fill:#0d1b2a,stroke:#1b9aaa,color:#e0e0ff
    style L5 fill:#1a1a0d,stroke:#f9c74f,color:#fffde0
    style PLANE_AUDIT fill:#2a0d0d,stroke:#e76f51,color:#ffe0d0
    style PLANE_OBS fill:#0d2a1a,stroke:#52b788,color:#d0ffd0
    style PLANE_EVENTS fill:#0d2a2a,stroke:#76c893,color:#d0fff0
    style PLANE_AUTH fill:#2a1a0d,stroke:#f9844a,color:#ffe0d0
    style FORKS fill:#0a1a0a,stroke:#52b788,color:#d0ffd0
```

### 2.2 L1 — Agent host

Claude Desktop, Claude Code, Cursor — any MCP client. Speaks Model
Context Protocol over stdio (single-operator) or HTTP (server mode).
Holds the user's Anthropic credentials.

- **Public interface:** the MCP wire protocol. Tool inventory is
  discovered at handshake from each suite server's manifest.
- **Depends on:** L2 servers being reachable.
- **Must not:** maintain its own copy of carrier state, persist
  Guidewire credentials, or interpret tool outputs in a way that
  bypasses the L3 harness gate. The agent host is a transport, not a
  custodian.

### 2.3 L2 — MCP servers (per Guidewire suite)

One server per Guidewire suite, organized by suite cut rather than
capability cut per
[D-002](../004-DR-DEC-architecture-decisions.md#d-002--6-servers-organized-by-guidewire-suite-not-by-capability):
`policycenter-mcp` (E2 + E5 + E2.5),
`claimcenter-mcp` (E7), `billingcenter-mcp` (E8), `producer-mcp` (E9),
`events-mcp` (E6, query-only). Each lives at `servers/<suite>-mcp/`.
`payments-mcp` is **explicitly excluded** from this repository per
[D-018](../004-DR-DEC-architecture-decisions.md#d-018--reconcile-payment-vs-money-movement-boundary-sharpened-pre-audit)
+ [006 § 6.1](../006-DR-MEMO-mcp-safety.md) — money movement lives in a
separate future package with its own dual-control review.

Each server holds 5–15 tools per
[D-002](../004-DR-DEC-architecture-decisions.md#d-002--6-servers-organized-by-guidewire-suite-not-by-capability)
(Persona 7's tool-selection budget). Tool names are carrier-vocabulary
strings, fixed by [D-016](../004-DR-DEC-architecture-decisions.md#d-016--tool-vocabulary-canonical-names-carrier-vocabulary-curator-renames--adjuster-split):
`find-submissions-waiting-on-me`, `whats-our-appetite-on-this-risk`,
`summarize-this-loss`, `where-are-we-on-this-payment`,
`reconcile-this-payment`, `show-event-payload`, etc.

- **Public interface:** MCP tool definitions with Zod input schemas
  and a declared `mode: 'read_only' | 'draft_only' | 'approved_execute'`.
- **Depends on:** L3 harness for every Guidewire interaction; L5
  profile for actor → tool authorization.
- **Must not:** import L4 clients directly. Every call into Cloud or
  vendor APIs goes through `harness.execute()` (or the read-side
  harness equivalent), enforced by the depcruise rule in
  [009 § 8.2](../009-DR-MEMO-harness-runtime.md#82-ci-enforcement-architecture-rule).
  Servers also must not mutate their own mode mid-call ([006 § 7.2](../006-DR-MEMO-mcp-safety.md#72-mode-is-not-negotiable-mid-call)).

### 2.4 L3 — Harness (library + CLI, NOT an MCP server)

`packages/harness/`. Library mode for in-process suite servers; CLI
mode for operator-driven approval flows
([009 § 9](../009-DR-MEMO-harness-runtime.md#9-library-vs-cli-parity)).
**Not** an MCP server, per
[D-003](../004-DR-DEC-architecture-decisions.md#d-003--harness-is-a-library--cli-not-an-mcp-server)
— if the harness were itself an MCP, it would gate itself recursively
and burn the agent's tool-selection budget. The TypeScript surface is
fixed verbatim in [02-PRD § 5](./02-PRD.md#5-harness-contract):
`plan()`, `PolicyEngine.evaluate()`, `ApprovalSink.{request,wait,decide}()`,
`execute()`, `AuditStore.{append,verifyChain,query}()`, `rollbackHint()`,
`EvidenceExporter.build()`.

- **Public interface:** `@intentsolutions/guidewire-harness` npm
  package (TypeScript). The exported types are the contract; deviation
  requires a `010-DR-MEMO` revision per [009 § 11](../009-DR-MEMO-harness-runtime.md#11-what-this-memo-commits-to).
- **Depends on:** L4 clients (the only layer that does);
  Postgres for audit + approvals + idempotency cache; the
  observability package for spans, logs, and Sentry tagging.
- **Must not:** call MCP servers (it sits below them); know about
  carrier vocabulary (tool names pass through opaquely as strings);
  short-circuit any of plan / policy / audit / approval / execute /
  evidence — every step is mandatory in `approved_execute`.

### 2.5 L4 — Clients

`packages/guidewire-client/` is the Cloud API client; `clients/<suite>/`
hold per-suite wrappers (e.g. `clients/policycenter/`,
`clients/claimcenter/`, `clients/billingcenter/`); `clients/<vendor>/`
hold third-party wrappers (e.g. `clients/one-inc/`,
`clients/smart-comms/`). Pure HTTP + protocol mapping. No carrier
business logic, no policy decisions, no audit emission.

- **Public interface:** typed methods named after Cloud API endpoints
  (e.g. `policy.searchJobs`, `claim.getReserves`). Input/output Zod
  schemas live in `packages/schemas/`.
- **Depends on:** undici for HTTP, openid-client for token refresh
  ([008 § 10](../008-DR-MEMO-guidewire-api.md#10-auth-model--guidewire-hub-oauth--jwt-propagation)),
  the auth plane for tokens.
- **Must not:** make decisions. A client method may not refuse a call
  based on policy; that's the harness's job. A client method may not
  add fields to a request; if a profile mapping is needed, the harness
  applies it before calling. Clients also must not import each other
  cross-vendor (One Inc and Smart Comms can't see each other's
  modules).

### 2.6 L5 — Customer profiles

`profiles/<customer>/` — exactly nine YAML files per
[02-PRD § 6](./02-PRD.md#6-customer-profile-contract): `auth.yaml`,
`roles.yaml`, `lob.yaml`, `typelists.yaml`, `custom-entities.yaml`,
`field-aliases.yaml`, `approval-matrix.yaml`, `pii-policy.yaml`,
`events.yaml` (the ninth, added per
[008 § 7](../008-DR-MEMO-guidewire-api.md#7-app-events-vs-polling--d-004-verified-with-refinement)).
Configuration data only. Never code.
[D-007](../004-DR-DEC-architecture-decisions.md#d-007--customer-config-is-profiles-not-adapterscustomers)
locks this — Persona 6 (the SI partner) flagged a code-shaped customer
adapter pack as 18-month consultancy work in disguise; profiles stay
as mappings.

- **Public interface:** Zod schemas in `packages/schemas/src/profile/`
  validate the YAMLs at boot. Boot-time fail-fast on malformed shape
  ([02-PRD § 6](./02-PRD.md#6-customer-profile-contract)).
- **Depends on:** nothing. Profiles are leaves.
- **Must not:** contain executable code, reference paths outside
  `profiles/<name>/`, or hard-code any LOB code or typelist value
  that should travel via mapping ([008 § 12](../008-DR-MEMO-guidewire-api.md#12-cloud-api-patterns--adopt-list--avoid-list)
  "avoid" item 1).

### 2.7 The four cross-cutting planes

Auth, audit, observability, and events span the layers rather than
sitting in any single one. Section 3 covers their mechanics; this
section names them.

- **Auth plane** — Guidewire Hub OAuth (per-tenant client/secret in
  SOPS) → token issued → JWT-propagated actor identity attached at
  every L3 → L4 call. No standing service-account credentials per
  [008 § 10](../008-DR-MEMO-guidewire-api.md#10-auth-model--guidewire-hub-oauth--jwt-propagation).
- **Audit plane** — hash-chained Postgres entries per-tenant
  ([009 § 2](../009-DR-MEMO-harness-runtime.md#2-hash-chain-implementation-strategy)),
  evidence bundle export reproducible from trace_id alone.
- **Observability plane** — OpenTelemetry spans + pino structured
  logs + Sentry-tagged typed errors per
  [D-013](../004-DR-DEC-architecture-decisions.md#d-013--observability-is-wired-in-from-day-1-not-bolted-on)
  and [009 § 7](../009-DR-MEMO-harness-runtime.md#7-observability-fan-out).
- **Events plane** — webhook receiver → BullMQ on Redis (sharded by
  `primaryObject.id`) → suite MCPs consume; `events-mcp` queries the
  store. Per
  [D-004](../004-DR-DEC-architecture-decisions.md#d-004--events-webhook--queue-infra--small-events-mcp-query-only)
  and the App Events overview at
  <https://docs.guidewire.com/education/cloud-integration-basics/latest/docs/integration_cloud_basics/appevents_overview/>.

---

## 3. Data planes

The system has four concurrent data planes. They share Postgres and
the OTel collector but otherwise run independently.

### 3.1 Synchronous tool calls (top-down through the layers)

The dominant path. Source: agent host. Sink: Guidewire Cloud or a
vendor API. Ordering: per-call, single-threaded — the harness
serializes the plan → policy → (approval) → execute → audit fan-out
within the call.

```
agent host          L1
   │ MCP request
   ▼
suite MCP server    L2  (Zod-validates args; declares mode)
   │ harness.plan(input) + harness.policy.evaluate(plan)
   ▼
harness             L3  (records plan, policy decision)
   │ (if approved_execute) ApprovalSink.wait(...)
   │ harness.execute(plan, decision, sideEffect)
   ▼
guidewire-client    L4  (HTTP — Cloud API or vendor)
   │ JWT-propagated auth header
   ▼
Guidewire Cloud / vendor   external
   │ response
   ◀── back up the chain
```

Retention: nothing on this path is retained as a primary artifact —
the response goes to the agent host immediately. The audit row
(written before the response returns) is the durable record.
Synchronous tool calls block the agent until the harness writes the
audit row; this is a deliberate property, not a perf bug, per
[D-006](../004-DR-DEC-architecture-decisions.md#d-006--hard-rule-no-audit--no-write).

### 3.2 Async events plane (App Events → queue → suite MCPs)

Source: Guidewire Cloud App Events Webhooks. Sink: the suite MCP that
maintains the workflow primitive for the affected primary object.
Per the App Events overview cited above, *"events are delivered at
least once"* and *"events are safe-ordered by the primary object that
they are associated with."* Ordering: in-claim ordering preserved at
the queue boundary (sharded by `primaryObject.id`); cross-claim
ordering is **not** guaranteed and tools must not assume it
([008 § 7](../008-DR-MEMO-guidewire-api.md#7-app-events-vs-polling--d-004-verified-with-refinement)).

```
Guidewire Cloud
   │ App Events webhook
   ▼
events-receiver (HTTP endpoint)
   │ enqueue (sharded by primaryObject.id)
   ▼
BullMQ on Redis
   │ at-least-once delivery; consumer idempotency-keys mandatory
   ▼
suite MCP consumer (e.g. claimcenter-mcp)
   │ consumes for workflow primitives
   │ also writes audit + observability
   ▼
events store (Postgres) — for events-mcp query / replay
```

Retention: events store retention is profile-driven via
`events.yaml.replay.retention_days` per
[02-PRD § 6.9](./02-PRD.md#69-eventsyaml--app-events-subscription-configuration-the-9th).
Tools never re-subscribe at call-time; the `events-mcp` query surface
reads the local store, never the live App Events stream
([D-004](../004-DR-DEC-architecture-decisions.md#d-004--events-webhook--queue-infra--small-events-mcp-query-only)).

### 3.3 Audit plane (hash-chained Postgres, per-tenant)

Source: every harness step that mutates state of record (plan
created, policy decided, approval requested/decided, execute
started/completed/failed/replayed, rollback hint issued — see
`AuditEventType` in [02-PRD § 5.5](./02-PRD.md#55-audit--hash-chained-entry)).
Sink: the `audit_entries` table in Postgres, append-only, per-tenant
linear hash chain — **not** Merkle, per
[009 § 2.1](../009-DR-MEMO-harness-runtime.md#21-linear-chain-per-tenant--not-merkle).
Linear is enough for tamper-evidence and is cheaper to write; if a
public transparency log is ever wanted, Merkle proofs can layer over
the linear chain as a secondary commitment.

Ordering: enforced by serializable-transaction `FOR UPDATE` on the
`audit_chain_heads` row per
[009 § 2.3](../009-DR-MEMO-harness-runtime.md#23-append-protocol).
Single-writer property is architectural — concurrent appends serialize
on the chain head. Retention: append-only, retention bounded by
profile policy. Tenant chains are fully separable — tenant A's
tampering does not invalidate tenant B's history; an enterprise
customer takes their chain on offboarding
([009 § 2.1](../009-DR-MEMO-harness-runtime.md#21-linear-chain-per-tenant--not-merkle)).

The evidence bundle is the second artifact this plane produces.
`harness.evidence.build(traceId)` reassembles the plan, policy
decision, approval, audit entries, and span snapshots for a given
trace into a single JSON document, reproducible from the audit chain
alone ([02-PRD § 5.7](./02-PRD.md#57-evidence-bundle), [009 § 5](../009-DR-MEMO-harness-runtime.md#5-evidence-bundle-schema)).
PII redaction runs at bundle export — not on the hot path of
`execute()` — because what a CISO can read is profile-driven
([006 § 7.5](../006-DR-MEMO-mcp-safety.md#75-pii-redaction-is-a-harness-pipeline-not-per-tool-code),
[009 § 5.4](../009-DR-MEMO-harness-runtime.md#54-pii-redaction-at-export)).

### 3.4 Observability plane (OTel + pino + Sentry)

Source: every public function in `servers/*` and `packages/harness/`
opens a span. Sink: user-configured OTel collector for spans,
user-configured pino transport for logs, Sentry DSN for typed errors.
The standard span tree per
[009 § 7.1](../009-DR-MEMO-harness-runtime.md#71-span-tree-per-mcp-tool-call):

```
mcp.tool.invoke                          (root, opened by server)
└── harness.plan.create
└── harness.policy.evaluate               (attrs: outcome, tier, ruleSetVersion)
└── harness.approval.wait                 (only if require_approval; attrs: state, durationMs)
└── client.guidewire.cloud.<endpoint>     (attrs: tenant_id, lob, http.status, http.method)
└── harness.audit.write                   (attrs: chainSeq, eventType)
└── harness.evidence.bundle               (lazy — on bundle build, not per-call)
```

Required span attributes per
[D-013](../004-DR-DEC-architecture-decisions.md#d-013--observability-is-wired-in-from-day-1-not-bolted-on):
`trace_id`, `tenant_id`, `tool_name`, `tool_version`, `mode`,
`actor_id`. Architecture rules in CI fail any function in
`packages/harness/src/**` that does not open a span
([009 § 7.1](../009-DR-MEMO-harness-runtime.md#71-span-tree-per-mcp-tool-call)).

Logs and audit entries are deliberately **not** the same thing
([009 § 7.2](../009-DR-MEMO-harness-runtime.md#72-pino-log-shape-per-step)):
logs are diagnostic (lossy, sampleable, retention-bounded); audit
entries are correctness (lossless, hash-chained). Logs reference
`audit_entry_id` so an operator debugging a problem can pivot from
log → audit chain.

Ordering: spans inherit OTel's parent-child causality; logs are a
loose stream; Sentry issues are de-duplicated per `[code, tool_name,
mode]` tuple per [02-PRD § 5.8](./02-PRD.md#58-factory--result--error)
so the same refusal across multiple tenants groups into one issue.
Retention: per the user's collector / log target / Sentry plan — none
of it lives in the harness store.

### 3.5 Auth plane

Source: Guidewire Hub OAuth token endpoint per `auth.yaml`
([02-PRD § 6.1](./02-PRD.md#61-authyaml--guidewire-hub-oauth--jwt-propagation)).
Sink: a JWT attached to every L4 → Cloud API call. Refresh strategy
is `proactive` — refresh at 80% of token lifetime; an in-flight
`approved_execute` write cannot afford a mid-write 401 per
[008 § 10](../008-DR-MEMO-guidewire-api.md#10-auth-model--guidewire-hub-oauth--jwt-propagation).
Ordering: token refresh is serialized per tenant. Retention: tokens
live in process memory, never written to disk; client/secret
themselves live in SOPS-encrypted profile files.

JWT propagation is what makes Persona 5 happy — actor identity rides
the call from the agent host to Guidewire Cloud. Cloud API supports
`actor_claim` (default `sub`) per the carrier's OIDC config
*(unverified — sandbox-confirm at `guidewire-adj`)*; the canonical
JWT propagation flow is documented but the per-tenant token endpoint
shape varies and resolves at sandbox provisioning time per
[008 § 14](../008-DR-MEMO-guidewire-api.md#14-open-questions--sandbox-blocked-items-for-fact-checker-and-post-sandbox-follow-up)
open question 3.

---

## 4. Boundaries — what each layer cannot do

The depcruise architecture rules in CI enforce these at the import
graph; the AST escape-scan from `@intentsolutions/audit-harness`
catches the patterns the import graph misses (e.g. inline `fetch()`
that bypasses the client layer, `console.log` in production paths,
unwrapped writes that skip the harness). REFUSE / CHALLENGE / FLAG
labels are the audit-harness escape-scan severity tiers.

| # | Forbidden | Reasoning | Enforcement |
|---|---|---|---|
| 1 | `servers/**/src/**` may not import `clients/**` or `packages/guidewire-client/**` | Writes must travel through the harness; bypassing the gate breaks [D-006](../004-DR-DEC-architecture-decisions.md#d-006--hard-rule-no-audit--no-write) | depcruise; AST call-site rule per [009 § 8.2](../009-DR-MEMO-harness-runtime.md#82-ci-enforcement-architecture-rule). REFUSE |
| 2 | `clients/**` may not import each other cross-vendor (e.g. `one-inc/` ↔ `smart-comms/`) | Cross-vendor logic lives in suite MCPs, not in the wrapper layer | depcruise. REFUSE |
| 3 | `clients/<vendor>/**` may not import `packages/guidewire-client/**` (and inverse) | Vendor wrappers and the Cloud API client are peers, not nested | depcruise. REFUSE |
| 4 | `profiles/**` may not contain `.ts` / `.js` / `.sh` / `.py` files | Profiles are configuration data per [D-007](../004-DR-DEC-architecture-decisions.md#d-007--customer-config-is-profiles-not-adapterscustomers); code in a profile is the start of an `adapters/customers/` regression | escape-scan rejects non-YAML files at boot. REFUSE |
| 5 | `profiles/<name>/**` may not reference filesystem paths outside `profiles/<name>/` | A profile must be self-contained — copying a profile to a new tenant must not pull in cross-profile state | YAML schema validation, escape-scan path rule. CHALLENGE |
| 6 | `packages/harness/src/**` functions may not open external HTTP except via L4 clients | The harness is governance, not transport | depcruise + AST call-site rule. REFUSE |
| 7 | `packages/harness/src/**` functions must open an OTel span | Architecture rule per [D-013](../004-DR-DEC-architecture-decisions.md#d-013--observability-is-wired-in-from-day-1-not-bolted-on); silent functions are forensically opaque | AST check ([009 § 7.1](../009-DR-MEMO-harness-runtime.md#71-span-tree-per-mcp-tool-call)). REFUSE |
| 8 | `console.log` / `console.error` in production paths | Logs must be pino-structured per [D-013](../004-DR-DEC-architecture-decisions.md#d-013--observability-is-wired-in-from-day-1-not-bolted-on); raw console writes are unstructured + un-filterable | escape-scan AST rule. REFUSE |
| 9 | Hand-written `fixtures/*.json` | NO MOCKS per [D-008](../004-DR-DEC-architecture-decisions.md#d-008--no-mocks--real-guidewire-cloud-sandbox-from-day-1); only `tests/recordings/` with `MANIFEST.md` provenance is allowed | escape-scan path rule + manifest validator. REFUSE |
| 10 | Hard-coded LOB codes or typelist values in tool source | LOB / typelist values are profile-mapped per [008 § 4.3 / § 4.4](../008-DR-MEMO-guidewire-api.md#43-lobyaml) and [02-PRD § 6.3](./02-PRD.md#63-lobyaml--lob-code-mappings-the-only-place-lob-code-mapping-lives); hard-coding poisons portability | escape-scan regex + Zod typelist binding check at boot. REFUSE |
| 11 | API-verb-shaped tool names (`search_policies`, `get_account`, `replay_event`) | [D-001](../004-DR-DEC-architecture-decisions.md#d-001--carrier-vocabulary-tools-are-the-dominant-abstraction); enforced by `audit-harness vocab-lint` per the 8-rule checklist in [007 § 7](../007-DR-MEMO-carrier-vocabulary.md#7-recommendations-to-gw-12-prd-authors--encode-at-pr-review) | vocab-lint AST rule against tool manifest. REFUSE |
| 12 | `latest/` URLs in code, docs, or recordings (Cloud API doc paths) | [008 § 12](../008-DR-MEMO-guidewire-api.md#12-cloud-api-patterns--adopt-list--avoid-list) "avoid" item 11; release-versioned paths only — `202503` (PolicyCenter), `202411` (ClaimCenter), `202603` (InsuranceSuite) per [005-DR-REF § 1](../005-DR-REF-guidewire-public-resources.md#1-cloud-api-references-open-no-signup) | regex on commits + escape-scan. FLAG |
| 13 | Direct creation of a `payments-mcp` directory in this repo | [D-018](../004-DR-DEC-architecture-decisions.md#d-018--reconcile-payment-vs-money-movement-boundary-sharpened-pre-audit) + [006 § 6.1](../006-DR-MEMO-mcp-safety.md); the carve is at the repo level so a contributor cannot add `initiate-refund` next | escape-scan path rule. REFUSE |

The combination is what makes the harness gate physical rather than
advisory. A forked carrier-vocabulary tool cannot remove the gate
because the gate isn't theirs to remove ([02-PRD § 5.9](./02-PRD.md#59-three-mode-enforcement-at-the-harness-layer)).

---

## 5. Three execution modes — architectural flow

The mode contract is canonical in [02-PRD § 4](./02-PRD.md#4-three-execution-modes--full-contract);
this section shows how each mode threads the five layers. Mode is
declared in tool metadata (Zod schema + manifest), bound at
MCP-handshake time, and is **not negotiable mid-call** per
[006 § 7.2](../006-DR-MEMO-mcp-safety.md#72-mode-is-not-negotiable-mid-call).

Because of [D-008](../004-DR-DEC-architecture-decisions.md#d-008--no-mocks--real-guidewire-cloud-sandbox-from-day-1)
(NO MOCKS), every mode below assumes a reachable Guidewire Cloud
sandbox. Sandbox unreachable means CI fails loudly — there is no
silent degradation to fixtures. The OSS demo profile defaults to
`read_only` and `draft_only` per
[02-PRD § 4.3](./02-PRD.md#43-oss-demo-profile-defaults-per-006--9-recommendation-3);
`reconcile-this-payment` is the canonical canary for `approved_execute`
per
[D-018](../004-DR-DEC-architecture-decisions.md#d-018--reconcile-payment-vs-money-movement-boundary-sharpened-pre-audit)
+ [006 § 3.4](../006-DR-MEMO-mcp-safety.md#34-reconcile-this-payment--approved_execute-if-ever).

### 5.1 `read_only` — query, no side effect

Example: `find-submissions-waiting-on-me`.

1. **L1** Agent host calls the tool with Zod-validated args.
2. **L2** Server constructs `PlanInput { mode: 'read_only', ... }` and
   calls `harness.plan()`.
3. **L3** Harness records the plan, calls `policy.evaluate(plan)`.
   The OSS demo profile's read-side rule returns
   `outcome: 'allow', tier: 'tier_0_safe'`. Policy decision is
   audited.
4. **L3 → L4** Harness opens an OTel span, attaches the JWT (auth
   plane), invokes the L4 client read method.
5. **L4** Cloud API client makes the HTTP `GET` (e.g.
   `GET /job/v1/jobs?subtype=Submission&assignedToMe=true&status=Open`
   per [02-PRD § 3.1.1](./02-PRD.md#311-line-underwriter-view-e2--e5)).
6. **L3** Harness writes a read-side audit entry (Persona 5 wants
   tamper-evident records of every read for exfil detection per
   [006 § 1.1](../006-DR-MEMO-mcp-safety.md#11-find-submissions-waiting-on-me--read_only)).
7. **L2 → L1** Server returns the response; redactor applies
   `pii-policy.yaml` rules per [02-PRD § 6.8](./02-PRD.md#68-pii-policyyaml--pii-redaction-rules).

No queue. No approval. The read-side audit row is what makes
`read_only` distinct from a no-op — Persona 5's exfil concern is the
reason every read writes its own audit entry
([006 § 1.1](../006-DR-MEMO-mcp-safety.md#11-find-submissions-waiting-on-me--read_only)).

### 5.2 `draft_only` — compose, never commit

Example: `draft-denial-letter`. (Disabled by default in OSS demo per
[006 § 6.3](../006-DR-MEMO-mcp-safety.md#63-draft-denial-letter-in-the-oss-demo-profile).)

1. **L1 → L2** Tool call with draft-context args.
2. **L2 → L3** `harness.plan()` with `mode: 'draft_only'`.
3. **L3** Policy evaluates to `tier_1_draft`, allow.
4. **L3 → L4** Read-side calls only — pull the source data the draft
   composes from (claim, exposures, reasoned codes per
   [02-PRD § 3.2](./02-PRD.md#32-claimcenter-mcp--claimcenter-e7)).
5. **L2** Server composes the draft artifact in-process. Smart Comms
   is **not** rendered through (the draft never becomes a real
   letter in this mode per [006 § 2.4](../006-DR-MEMO-mcp-safety.md#24-draft-denial-letter--draft_only)).
6. **L3** Harness writes the draft to the harness draft store; audit
   entry hash-summarizes the draft body but never stores plaintext
   per [02-PRD § 4.1](./02-PRD.md#41-mode-comparison)
   row "Audit emitted". Persona 5 doesn't want denial-letter drafts
   sitting in the audit DB.
7. **L2 → L1** Server returns a draft-id reference. Promotion to a
   real letter is a *different tool* in `approved_execute` mode that
   takes the draft-id as input — physical separation between drafting
   and doing per [006 § 2.4](../006-DR-MEMO-mcp-safety.md#24-draft-denial-letter--draft_only).

### 5.3 `approved_execute` — gated write with idempotency

Example: `reconcile-this-payment` (gated profile flag, NOT in OSS
demo path per [02-PRD § 3.3](./02-PRD.md#33-billingcenter-mcp--billingcenter-e8)).

1. **L1 → L2** Tool call with the inputs that derive the idempotency
   key.
2. **L2 → L3** `harness.plan()` with `mode: 'approved_execute'`.
   Idempotency key derived deterministically as
   `gwh1:sha256(toolName:toolVersion:tenantId:canonicalize(args):actorId)`
   per [02-PRD § 5.4](./02-PRD.md#54-execute--side-effect-with-idempotency)
   and [009 § 4.1](../009-DR-MEMO-harness-runtime.md#41-generation).
3. **L3** `policy.evaluate(plan)` reads `approval-matrix.yaml` per
   [02-PRD § 6.7](./02-PRD.md#67-approval-matrixyaml--write-actions--required-approver-tier);
   for amount tier ≥ T2 returns `outcome: 'require_approval'`.
4. **L3** `approvals.request(plan, decision)` → state `pending` in
   Postgres `approvals` table. `approvals.wait()` blocks. CLI mode
   (`guidewire-harness approve <approvalId>`) and library-mode
   in-process surfaces both write to the same row per
   [009 § 3](../009-DR-MEMO-harness-runtime.md#3-approval-flow-mechanics).
5. **L3** Approval state transitions to `approved`. If the harness
   sees an idempotency-key collision *here* — same key, prior result
   cached — it short-circuits, returns the prior value, writes an
   `execute.replayed` audit entry, and never invokes the side effect
   ([009 § 4.2](../009-DR-MEMO-harness-runtime.md#42-storage--replay-short-circuit)).
6. **L3 → L4** `harness.execute()` invokes the side effect. For
   `reconcile-this-payment`, the L4 call is a Cloud API write
   (canonical shape `POST /billing/v1/payments/{id}/applications`,
   async per [02-PRD § 3.3](./02-PRD.md#33-billingcenter-mcp--billingcenter-e8)).
   Idempotency key is included in the request per
   [008 § 5](../008-DR-MEMO-guidewire-api.md#5-pagination--rate-limit-posture).
7. **L3** Harness writes `execute.completed` audit entry to the
   per-tenant hash chain in a serializable transaction
   ([009 § 2.3](../009-DR-MEMO-harness-runtime.md#23-append-protocol)).
   Evidence bundle is materializable from this trace_id alone.
8. **L3 → L2 → L1** Result returns with the audit entry id and
   evidence bundle ref. Optional `harness.rollbackHint()` produces a
   structured hint the operator (not the agent) can act on per
   [02-PRD § 5.6](./02-PRD.md#56-rollback--hint-not-magic).

The deliberate property of step 6 is that `reconcile-this-payment`
**does not cross a banking integration boundary** —
[D-018](../004-DR-DEC-architecture-decisions.md#d-018--reconcile-payment-vs-money-movement-boundary-sharpened-pre-audit)
locks the carve. It mutates BillingCenter ledger state (payment →
account assignment) and is reversible by another
`reconcile-this-payment` against the corrected target. Money movement
(card capture, ACH, wire) belongs in a future `payments-mcp` with
dual-control approval, not this repo.

---

## 6. Failure modes

Every failure has a defined detection, a defined harness behavior, an
audit entry (or refusal), and a defined recovery. Per
[009 § 6](../009-DR-MEMO-harness-runtime.md#6-failure-semantics)
the canonical table is in the harness memo; this section maps each
failure to the architectural layer that detects it.

| Failure | Detected at | Behavior | Recovery |
|---|---|---|---|
| Sandbox unreachable | L4 (HTTP timeout / DNS failure) | CI fails loudly per [D-008](../004-DR-DEC-architecture-decisions.md#d-008--no-mocks--real-guidewire-cloud-sandbox-from-day-1); runtime returns structured `sandbox_unreachable` refusal ([006 § 1.1.3](../006-DR-MEMO-mcp-safety.md#11-find-submissions-waiting-on-me--read_only)) | Operator restores connectivity; no fixture fallback exists |
| Auth failure (401 from Cloud API) | L4 client | Refresh once, retry once; if still 401, `HarnessError({ code: 'TENANT_UNKNOWN' })` per [02-PRD § 5.8](./02-PRD.md#58-factory--result--error) and [008 § 10](../008-DR-MEMO-guidewire-api.md#10-auth-model--guidewire-hub-oauth--jwt-propagation) | Operator rotates `auth.yaml` env-var-bound creds in SOPS |
| Approval timeout | L3 (`approvals.wait` returns `state: 'expired'`) | `approval.decided` audit entry with outcome=expired; tool returns `awaiting-approval` state per [009 § 6](../009-DR-MEMO-harness-runtime.md#6-failure-semantics). No auto-approve fallback ever — Persona 5 fails the design otherwise ([009 § 3.4](../009-DR-MEMO-harness-runtime.md#34-escape-hatch--approver-unreachable)) | Operator re-requests approval or aborts |
| Idempotency replay (same key, same plan) | L3 (`harness.execute()` lookup) | Short-circuit — return prior value, write `execute.replayed` entry, never invoke side effect ([009 § 4.2](../009-DR-MEMO-harness-runtime.md#42-storage--replay-short-circuit)) | None needed — the system is operating correctly |
| Idempotency mismatch (same key, different plan) | L3 | Hard refusal: `IDEMPOTENCY_MISMATCH`. Indicates a canonicalization bug — `canonicalize(args)` produced different output for what should be the same logical input ([009 § 4.3](../009-DR-MEMO-harness-runtime.md#43-collision-handling)) | Engineer fixes canonicalization; manual incident review |
| Audit storage unreachable | L3 (Postgres `audit_entries` write fails) | `AUDIT_UNREACHABLE` refusal *before* invoking the side effect per [D-006](../004-DR-DEC-architecture-decisions.md#d-006--hard-rule-no-audit--no-write). The asymmetry with observability is deliberate ([009 § 6](../009-DR-MEMO-harness-runtime.md#6-failure-semantics) closing paragraph) | Operator restores Postgres; `chain.repair.acknowledged` if any rollback needed |
| Hash-chain integrity broken | L3 (`harness.audit.verifyChain()` finds prev_hash mismatch) | Refuses **all writes for the affected tenant** until `chain.repair.acknowledged` recorded by an operator ([009 § 2.4](../009-DR-MEMO-harness-runtime.md#24-tamper-evidence-proof-export), [§ 11](../009-DR-MEMO-harness-runtime.md#11-what-this-memo-commits-to) commitment) | Operator investigates tamper / corruption, signs the maintenance entry, resumes |
| Profile validation failure (boot) | L5 (Zod schema rejects on load) | Server fails fast; surfaces which YAML field failed which schema check per [02-PRD § 6](./02-PRD.md#6-customer-profile-contract) | Engineer fixes the profile YAML; restart |
| Carrier-vocabulary tool maps to non-existent endpoint | L4 (HTTP 404 from Cloud API) | Structured `profile_incomplete_for_this_carrier` refusal — the ⚠ tools (`whats-our-appetite-on-this-risk`, `explain-why-this-got-referred`) carry an incomplete-without-profile banner that surfaces here per [02-PRD § 3.1.1](./02-PRD.md#311-line-underwriter-view-e2--e5) and [006 § 1.2 / § 1.6](../006-DR-MEMO-mcp-safety.md#12-whats-our-appetite-on-this-risk--read_only-with-caveat); driven by missing `lob.yaml` / `typelists.yaml` / `custom-entities.yaml` rows | Operator's profile authors fill in the missing typelist / custom-entity / LOB mapping rows |
| Harness contract violation (write attempted without policy decision) | L3 (`execute()` precondition check) | `HarnessError({ code: 'POLICY_DENIED' })` — the harness refuses to call `execute()` without a `PolicyDecision` whose outcome is `allow` (or `require_approval` paired with an attached `Approval`) per [02-PRD § 5.2](./02-PRD.md#52-policy--the-gate-decision) and [D-006](../004-DR-DEC-architecture-decisions.md#d-006--hard-rule-no-audit--no-write) | Engineer fixes the calling tool; CI rule prevents recurrence |
| Observability unreachable (OTel collector down) | L3 (span emission fails) | Degraded warning logged via pino; audit + execute continue. Asymmetric with audit-unreachable on purpose — observability is diagnostic, audit is correctness ([009 § 6](../009-DR-MEMO-harness-runtime.md#6-failure-semantics) closing paragraph) | Operator fixes collector; no customer-facing impact |

The "every failure has a structured refusal, never a thrown
exception that bubbles to the agent as `tool errored`" rule per
[006 § 7.8](../006-DR-MEMO-mcp-safety.md#78-refusal-is-structured-not-exceptional)
makes refusal the architectural default. The agent reasons about
*why* it was refused and decides whether to retry, escalate, or stop
— a behavior that requires the refusal to carry a machine-readable
`reason` code.

---

## 7. Scaling / deployment

### 7.1 Local-first single-tenant default

The expected first deployment is one operator, one Guidewire tenant,
running the suite MCPs as stdio child processes of the agent host on
the operator's laptop. Postgres can be local (Docker) or shared with
the carrier's existing dev infra. The OSS demo path is exactly this
shape.

### 7.2 Multi-tenant via per-customer process

There is no built-in multi-tenant control plane in the suite servers.
A multi-tenant deployment runs **one server instance per profile** —
`policycenter-mcp-acme`, `policycenter-mcp-beta`, etc. — each bound
to a single profile slug. Per-tenant isolation falls out of the
architecture: the audit hash chain is per-tenant
([009 § 2.1](../009-DR-MEMO-harness-runtime.md#21-linear-chain-per-tenant--not-merkle));
Hub OAuth credentials are per-tenant; the BullMQ events queue is
sharded by `primaryObject.id` per
[02-PRD § 6.9](./02-PRD.md#69-eventsyaml--app-events-subscription-configuration-the-9th).
A carrier running 3 LOBs against one tenant uses one process; an MGA
hosting 12 carriers runs 12 processes.

### 7.3 Cloud Run as default deploy target

Cloud Run is TS-friendly serverless — fits the stack
([003-DR-ARCH § Stack](../003-DR-ARCH-oss-cowork.md#stack)). Each
profile maps to a Cloud Run service with horizontal-autoscaling
revisions; cold-start is acceptable because tool calls are
operator-driven (low QPS, high care). Postgres lives at Cloud SQL or
the customer's existing Postgres. Redis (BullMQ) lives at Memorystore
or the customer's existing Redis.

### 7.4 IaC and infrastructure layout

`infra/tofu/` (OpenTofu) holds the per-tenant scaffolds, per the repo
layout in [`CLAUDE.md`](../../CLAUDE.md) § "Repo Layout (planned)".
`infra/cloud-run/` holds the deployment manifests; `infra/docker/`
holds the local-dev compose (including the demo OTel collector +
Jaeger UI per [02-PRD § 8.1](./02-PRD.md#81-e1--foundation-mcp-runtime-schemas-auth-audit-client-sdk-observability)).

### 7.5 No SaaS control plane in OSS

Per
[D-009](../004-DR-DEC-architecture-decisions.md#d-009--public-oss-from-day-1-day-3-release)
+ [D-010](../004-DR-DEC-architecture-decisions.md#d-010--oss--lead-magnet-for-custom-build-work-not-a-complete-product),
the OSS does not ship a hosted control plane. A second customer who
asks for one is the trigger to build it — until then, the
architecture stays local-first and the credibility story stays
clean. Custom build engagements can layer a multi-tenant operator UI
on top of the harness CLI; the OSS does not.

---

## Audit gate

Reviewed in GW-1.8 by:

- `architect-reviewer` (system fit + boundaries + epic dependency soundness)
- `backend-architect` (API contracts, package boundaries)
- `security-auditor` (trust boundaries, audit-chain integrity, JWT propagation)
- `harness-runtime-architect` (Mode B re-issue of 009-DR-MEMO)
- `mcp-safety-reviewer` (Mode B re-issue of 006-DR-MEMO; three-mode flow)
- `guidewire-api-archaeologist` (Mode B re-issue of 008-DR-MEMO; endpoint + App Events claims)
- `article-consistency-checker` (Architecture ↔ PRD ↔ Roadmap ↔ Diagram tell the same story)

Audit responses land in
[`./audits/00-AUDIT-RESPONSES.md`](./audits/) once GW-1.9 closes.
