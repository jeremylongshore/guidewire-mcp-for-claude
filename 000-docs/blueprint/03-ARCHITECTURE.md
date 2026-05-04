# 03 — System Architecture

> *Layered architecture narrative — agent host → harness → MCP servers
> → Guidewire Cloud client + vendor clients → customer profiles.*

**Status:** SKELETON — full content lands in **GW-1.3**.
**Bead:** `guidewire-7jt` → GW-1.3 sub-bead (TBD).
**Inputs:** [`../003-DR-ARCH-oss-cowork.md`](../003-DR-ARCH-oss-cowork.md).

---

## Sections to author in GW-1.3

### 1. Architecture context

- What the system is (and isn't).
- Trust boundaries.
- Runtime model — local-first, customer-hosted.

### 2. Layered model

(Will be embedded — diagram lands in
[`09-DR-DIAG-architecture.svg`](./09-DR-DIAG-architecture.md) via
`/engineer-design-diagram` in **GW-1.4**.)

Five layers, top-down:

1. **Agent host** — Claude Desktop, Claude Code, Cursor, etc. Talks
   MCP.
2. **MCP servers (per Guidewire suite)** — `policycenter-mcp`,
   `claimcenter-mcp`, `billingcenter-mcp`, `producer-mcp`,
   `events-mcp` (query). Each is its own process / transport.
3. **Harness library + CLI** — `packages/harness/`. Library mode for
   in-process; CLI mode for orchestration / approval flows. NOT an
   MCP server.
4. **Guidewire Cloud client + vendor clients** — `packages/guidewire-client/`,
   `clients/policycenter/` etc., `clients/one-inc/` etc. Pure HTTP +
   protocol mapping; no business logic.
5. **Customer profiles** — `profiles/<customer>/`. Configuration
   data, never code. Auth, roles, mappings, approval matrix, PII
   policy.

### 3. Data planes

- **Synchronous tool calls** — top-down through the layers.
- **Async events** — webhook → BullMQ queue → suite MCPs consume +
  write to audit; `events-mcp` provides query / replay surface.
- **Audit** — hash-chained Postgres; evidence bundle export.
- **Observability** — OpenTelemetry → user-configured collector;
  pino → user-configured log sink; Sentry DSN.

### 4. Boundaries — what each layer cannot do

The bright lines that prevent layer violations (enforced via
depcruise architecture rules in CI):

- Servers cannot import from `clients/`. They use the harness, which
  uses the clients.
- Profiles cannot contain executable code. Validated at boot.
- The harness cannot be imported from inside an MCP server runtime
  (it's the host's responsibility to invoke).
- Vendor clients (`clients/one-inc/`) cannot import the Guidewire
  client (and vice versa). Cross-vendor logic lives in suite MCPs.

### 5. Three execution modes — architecture impact

How each mode flows through the layers:

- `read_only`: server → harness (read-policy gate) → client → server
  → caller. No queue. Audit "read" entry only.
- `draft_only`: server → harness (draft-policy gate) → client (read)
  → server (compose draft) → harness (audit) → caller (draft
  artifact). No write to Guidewire.
- `approved_execute`: server → harness (plan) → harness (policy gate)
  → harness (approval wait) → client (write with idempotency key) →
  harness (audit + chain) → harness (evidence bundle) → caller.

### 6. Failure modes

- Sandbox unreachable → CI fails loudly (NO MOCKS).
- Auth failure → harness refuses; structured error.
- Approval timeout → policy decision recorded; tool returns
  "awaiting-approval" state.
- Idempotency replay → harness recognizes and short-circuits.
- Rollback → harness emits `rollback-hint` JSON for human operator.

### 7. Scaling / deployment

- Local-first / single-tenant by default.
- Multi-tenant deployment is per-customer (separate process per
  profile).
- Cloud Run as default deploy target; horizontal scaling via revisions.

---

## Audit gate

Reviewed by:

- `architect-reviewer`
- `backend-architect`
- `security-auditor` (trust boundaries, audit chain integrity)
- `harness-runtime-architect`
- `mcp-safety-reviewer`
