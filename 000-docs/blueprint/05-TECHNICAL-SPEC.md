# 05 — Technical Specification

> *Stack, contracts, package layout, observability, NO MOCKS,
> quality gates.*

**Status:** SKELETON — full content lands in **GW-1.3** (alongside
03-ARCHITECTURE) and **GW-1.10** / **GW-1.11** (testing + observability
sections).
**Bead:** `guidewire-7jt` → GW-1.3 / GW-1.10 / GW-1.11 sub-beads (TBD).
**Inputs:** [`../003-DR-ARCH-oss-cowork.md`](../003-DR-ARCH-oss-cowork.md),
[`../../CLAUDE.md`](../../CLAUDE.md) (Stack section).

---

## Sections to author

### 1. Stack (table form)

(Already enumerated in `CLAUDE.md`. This section preserves it as the
governance artifact and adds version pinning + rationale.)

### 2. Package layout (the canonical map)

```
guidewire/
├── 000-docs/blueprint/        # Master paperwork
├── servers/
│   ├── policycenter-mcp/      # E2
│   ├── claimcenter-mcp/       # E7
│   ├── billingcenter-mcp/     # E8
│   ├── producer-mcp/          # E9
│   └── events-mcp/            # E6 (query-only)
├── packages/
│   ├── harness/               # E3 — library + CLI
│   ├── observability/         # E1 — OTel + pino + Sentry factory
│   ├── guidewire-client/      # E1 — Cloud API client
│   ├── auth/                  # E1 — OAuth + JWT
│   ├── audit/                 # E1 — hash-chain + evidence bundle
│   └── schemas/               # E1 — Zod schemas, shared
├── clients/                   # Vendor wrappers (One Inc, etc.)
├── profiles/                  # Per-customer config
│   ├── _template/             # E4
│   └── ...
├── templates/
│   └── cowork-fork-starter/   # E4
├── tests/
│   ├── recordings/            # Real Guidewire sandbox HTTP recordings
│   └── TESTING.md             # Coverage / mutation / CRAP / arch
└── infra/
    ├── docker/
    ├── cloud-run/
    └── tofu/
```

### 3. Contracts (TypeScript signatures)

Per the PRD's tool / harness / profile contracts — concrete
TypeScript interface definitions live here so `02-PRD.md` can stay
prose.

### 4. Observability — span, log, error contract *(GW-1.11)*

> *Authored 2026-05-04. Inputs: [`../009-DR-MEMO-harness-runtime.md`](../009-DR-MEMO-harness-runtime.md)
> § Observability fan-out, [`../../CLAUDE.md`](../../CLAUDE.md) Hard
> Rule #6, decision [D-013](../004-DR-DEC-architecture-decisions.md).*

#### 4.1 Three signals, three sinks

| Signal | Library | Default dev sink | Default prod sink |
|---|---|---|---|
| Traces | OpenTelemetry SDK (`@opentelemetry/sdk-node`) | Local OTLP collector → Jaeger UI on `localhost:16686` (docker-compose) | OTLP exporter to user-configured endpoint (Honeycomb / Grafana Tempo / Grafana Cloud / self-hosted Jaeger) |
| Logs | `pino` | `pino-pretty` to stdout | JSON to stdout, user collects (Loki, CloudWatch, etc.) |
| Errors | `@sentry/node` | Self-hosted Sentry instance (Jeremy's `claude_ai_Sentry` MCP) | User-configured Sentry DSN (commented-out by default in `.env.sops`) |

Wired in from day 1, not bolted on later. Per Hard Rule #6.

#### 4.2 Standard span tree (every MCP tool call)

```
mcp.tool.invoke (root span)
├── harness.plan.create
├── harness.policy.evaluate
│   └── attributes: mode (read_only | draft_only | approved_execute), tier
├── harness.approval.wait                    (if mode = approved_execute)
├── client.guidewire.cloud.<endpoint>
│   └── attributes: tenant_id, lob, http.status, response_size,
│                   release_version (Palisades / Las Leñas / Innsbruck)
├── harness.audit.write
│   └── attributes: chain_position, prev_hash, hash
└── harness.evidence.bundle                  (if mode = approved_execute)
    └── attributes: bundle_id, signed (boolean — Ed25519/KMS, optional in v1)
```

Spans MUST be opened in this order; failure to open a span at a
required step is **a CI failure**, not a runtime warning. Architecture
rule enforcement: see § 4.6.

#### 4.3 Required span attributes

Every span carries:

| Attribute | Type | Required | Notes |
|---|---|---|---|
| `trace_id` | string (W3C trace context) | yes | propagates through every layer |
| `span_id` | string | yes (auto) | OTel default |
| `tenant_id` | string | yes | non-secret tenant identifier (e.g. `sandbox-jeremy-dev`) |
| `tool_name` | string | yes | exact carrier-vocabulary tool name (`find-submissions-waiting-on-me`) |
| `tool_version` | string | yes | matches the version in idempotency-key derivation |
| `mode` | enum | yes | `read_only` / `draft_only` / `approved_execute` |
| `actor_id` | string | yes | `actor:<user-or-service>` — ties to JWT propagation |
| `idempotency_key` | string | conditional | required when `mode != read_only`; format: `gwh1:<sha256-hex>` |
| `policy_decision` | enum | conditional | required for `harness.policy.evaluate`; `allow` / `deny` / `require_approval` |
| `evidence_bundle_id` | string | conditional | required for `harness.evidence.bundle`; format: `eb1:<ulid>` |

A failed tool call surfaces with one query: filter spans by
`trace_id=<id>` to see the entire journey.

#### 4.4 Pino log shape

```json
{
  "level": 50,
  "time": "2026-05-04T19:23:00.000Z",
  "trace_id": "abc123",
  "span_id": "def456",
  "tenant_id": "sandbox-jeremy-dev",
  "tool_name": "find-submissions-waiting-on-me",
  "tool_version": "1.0.0",
  "mode": "read_only",
  "actor_id": "actor:underwriter@demo",
  "msg": "Cloud API returned 503",
  "err": {
    "type": "ECONNREFUSED",
    "code": "GW_CLOUD_UNREACHABLE",
    "stack": "..."
  }
}
```

Levels follow pino conventions: `10 trace · 20 debug · 30 info ·
40 warn · 50 error · 60 fatal`. **Production code paths use level
≥30**; `console.log` and pino level 10/20 fail CI in production
paths (see § 4.6).

#### 4.5 `AppError` typed class + Sentry tagging

Errors thrown in `servers/*` and `packages/harness/` MUST inherit
from a single `AppError` class so Sentry receives consistent tags
and the bead-pipeline (§ 4.7) can correlate.

```typescript
// packages/observability/src/error.ts
export class AppError extends Error {
  public readonly code: string;        // GW_CLOUD_UNREACHABLE, IDEMPOTENCY_MISMATCH, ...
  public readonly trace_id: string;
  public readonly tenant_id: string;
  public readonly tool_name?: string;
  public readonly mode?: 'read_only' | 'draft_only' | 'approved_execute';
  public readonly retryable: boolean;
  public readonly cause?: unknown;

  constructor(opts: AppErrorOpts) { /* … */ }

  toSentryEvent(): SentryEventLike { /* tags + fingerprint */ }
}

// Refusal helpers — every refusal scenario from 006-DR-MEMO §
// has a typed constructor:
export const refuseAuthExpired   = (ctx: ErrorCtx): AppError => /* … */;
export const refuseSandboxDown   = (ctx: ErrorCtx): AppError => /* … */;
export const refuseIdempMismatch = (ctx: ErrorCtx): AppError => /* … */;
// … and so on for every named refusal
```

Sentry tagging via `toSentryEvent()` produces a fingerprint of
`[code, tool_name, mode]` so the same refusal across multiple
tenants groups into one Sentry issue rather than fragmenting.

#### 4.6 `packages/observability/getObservability()` factory

Single import surface every other package consumes:

```typescript
// packages/observability/src/index.ts
export interface ObservabilityHandle {
  tracer: Tracer;       // OpenTelemetry tracer scoped to this server/tool
  logger: Logger;       // pino instance with mandatory fields pre-bound
  reportError: (err: AppError) => void;   // Sentry tag + send
  audit: AuditWriter;   // injected for harness use; structured audit row writer
}

export function getObservability(opts: ObservabilityOpts): ObservabilityHandle;
// opts: { server_name, tenant_id, otlp_endpoint?, sentry_dsn?, log_level }
```

Every MCP server's bootstrap calls this once at startup. Zero
ambient `console.log` or untyped `throw new Error(...)` in
production code paths.

#### 4.7 Architecture rule enforcement (depcruise + AST)

Two CI checks make span coverage and structured-error coverage
non-negotiable:

| Check | Tool | Failure mode |
|---|---|---|
| Public functions in `servers/*` and `packages/harness/` open at least one span | custom AST rule (ts-morph), runs in `pnpm exec audit-harness arch` | CI fails the PR |
| Every `throw` in those packages uses `AppError`-derived class | custom AST rule | CI fails the PR |
| `console.log` / `console.error` in production paths | dependency-cruiser regex rule | CI fails the PR |
| `servers/*` cannot import from `clients/*` directly (must go through harness) | dependency-cruiser layer rule | CI fails the PR (matches `tests/TESTING.md` § arch.servers_must_invoke_via_packages_harness) |
| Profiles cannot contain executable code (`.ts` / `.js` files banned) | depcruise + path-glob rule | CI fails the PR |

These rules are hash-pinned in `tests/TESTING.md` § Hash manifest
under `.dependency-cruiser.cjs`.

#### 4.8 Sentry → bead pipeline (correlate prod errors to work)

For sustained error patterns (Sentry "Issue" with ≥5 events / ≥1
distinct user / over a 24h window), an automated pipeline:

1. Sentry alert → ntfy `prod-alerts` topic (existing tailnet ntfy
   setup; Jeremy's phone subscribed)
2. For Issues meeting the threshold: auto-create a `bd create
   --type=bug` via the `claude_ai_Sentry` MCP integration +
   `bd-sync` (the same bd ↔ GH ↔ Plane mirror pattern in
   `~/.claude/CLAUDE.md`). Bead body links back to the Sentry Issue
   URL.
3. PR fixing the bug references both the bead and the Sentry Issue;
   close-on-merge fans out via `bd-sync close --also-close-plane`.

Pipeline implementation: post-E1, lands as a small package
`packages/sentry-bead-bridge/` (NOT in scope for E1 itself).

#### 4.9 Per-environment endpoint configuration

Loaded from SOPS-encrypted `secrets.<env>.sops.yaml` at runtime:

```yaml
observability:
  otel_collector_endpoint: "..."   # https://otel.example.com:4318
  sentry_dsn: "..."                # commented-out in .env.example
  log_level: "info"                # info | warn | error in prod; debug in dev
```

The `getObservability()` factory reads these via `secretsLoader`
(see § 8 Security posture); never logs the raw values.

#### 4.10 Quick-start (when E1 lands)

```bash
# Local dev: spin up OTLP collector + Jaeger
docker-compose -f infra/docker/observability.yml up -d
# Visit Jaeger: http://localhost:16686

# Run a server with observability wired in
pnpm --filter servers/policycenter-mcp dev
# Server emits spans to local OTLP, structured logs to stdout via pino-pretty,
# errors to local Sentry (claude_ai_Sentry MCP host)
```

#### 4.11 What's deferred to later epics

| Item | Lands in |
|---|---|
| Bundle signing (Ed25519 / KMS) — `evidence.sign?` optional in v1 | E3+ |
| Cross-region audit replication | post-E1 ops work |
| Slack approval surface (vs CLI-only) | post-E3 |
| Approval delegation (out-of-office routing) | post-E10 |
| Auto-bead-creation Sentry pipeline (`packages/sentry-bead-bridge/`) | post-E1 |

### 5. NO MOCKS — sandbox + recording-replay contract

(Authored in **GW-1.3** alongside architecture.)

- `tests/recordings/*.json` filename provenance schema.
- `MANIFEST.md` shape.
- Replay framework selection (e.g. nock, msw, custom).
- Live-sandbox CI job (post-merge, catches API drift).
- `samples/` directory (read-only replay material, never test ground
  truth).

### 6. Quality gates (testing policy — `tests/TESTING.md`) *(GW-1.10)*

> *Authored 2026-05-04. The full policy lives at
> [`../../tests/TESTING.md`](../../tests/TESTING.md) (engineer-owned,
> hash-pinned). This section summarizes the contract; the canonical
> source is the TESTING.md file, which is the hash-pin target.*

#### 6.1 7-layer testing taxonomy applicability

Per the IS Testing SOP (`~/000-projects/CLAUDE.md` § Intent
Solutions Testing SOP) and the layer-applicability matrix:

| Layer | Status | Applies to |
|---|---|---|
| L1 Hooks | ✅ required | workspace root + every package |
| L2 Static (Biome, depcruise, tsc strict) | ✅ required | every package |
| L3 Unit (Vitest + fast-check + Stryker) | ✅ required | every package |
| L4-integration (testcontainers Postgres) | ✅ required | `packages/audit`, `packages/harness` |
| L4-contract (recordings-replay) | ✅ required (regulated overlay) | every `servers/*` |
| L4-migration (audit-chain SQL migrations) | ✅ required | `packages/audit` |
| L5-sec (gitleaks, OWASP grade A) | ✅ required (regulated overlay) | workspace root |
| L5-perf | ⭕ recommended (promoted post-E1) | `servers/*`, `packages/harness` |
| L5-a11y, L6-e2e, L6-visual | ❌ waived | no UI in OSS scope |
| L6-smoke (CLI + MCP smoke) | ⭕ recommended | `packages/harness` CLI, `servers/*` |
| L7-UAT (E10 onboarding flow) | ⭕ recommended | `pnpm gw onboard` flow |

Compliance overlay: **SOC 2** (audit hash-chain integrity, evidence
bundle export, secret rotation, BAA path for health LOBs). The
overlay promotes L2, L4-contract, L5-sec, L7-UAT to ✅.

#### 6.2 Threshold floors (hash-pinned)

| Gate | Repo-wide | Per-module override |
|---|---|---|
| Line coverage | 80 | — |
| Branch coverage | 70 | — |
| Mutation kill rate (Stryker) | 70 | `harness` 85, `audit` 85, `auth` 85, `observability` 80, `servers/*` 75, `clients/*` 70 |
| CRAP (per-function) | prod ≤ 30, test ≤ 15 | — |
| CRAP (project avg) | ≤ 10 | — |
| Flaky tolerance | 0/3 runs | — |
| Test complexity ceiling | 15 cyclomatic | — |
| OWASP coverage | grade A | — |
| Vocabulary linter (007 memo § 7) | api-verb-leak = 0, engineering-speak = 0 | — |
| Persona density | ≥ 5 tools per declared persona | — |
| Recordings | required for read AND write tools | — |
| Architecture rules | servers/* cannot import clients/* directly | — |
| Bias guards | tautology = 0, over-mocked-modules = 0 | — |

Higher harness/audit/auth mutation floors per
[`009-DR-MEMO`](../009-DR-MEMO-harness-runtime.md) § hash-chain
criticality and [`006-DR-MEMO`](../006-DR-MEMO-mcp-safety.md) §
cross-cutting harness invariants.

#### 6.3 Hash-pinning

All policy values above are hash-pinned via:

```bash
pnpm exec audit-harness init   # after engineer policy edits
```

`escape-scan.sh` REFUSES any AI-proposed diff that touches policy
lines unless preceded by engineer-initiated `audit-harness init`.
Hash manifest lives at `.harness-hash` (committed). Protected files
listed in `tests/TESTING.md` § Hash manifest.

#### 6.4 NO MOCKS — mandatory recording-replay

Per D-008 + 008 memo. Every `servers/*` test that touches the
Guidewire Cloud API surface MUST replay against a real recording in
`tests/recordings/` with `MANIFEST.md` provenance. Hand-written
fixture JSON is forbidden (`recordings.fixture_files_forbidden:
true` in `tests/TESTING.md`).

CI fails loudly when sandbox is unreachable on the live-sandbox
post-merge job; never silently degrades to mocks.

#### 6.5 Vocabulary 8-rule PR-time checklist (per 007 memo § 7)

Mechanically enforced via `audit-harness vocab-lint`:

1. No API-verb prefixes (`search_*`, `get_*`, `list_*`, `fetch_*`,
   `query_*`, `update_*`, `create_*`, `delete_*`)
2. No engineering-speak in tool names (`serialize`, `mutate`,
   `fetch`, `payload`, `cursor`, `pagination`)
3. Hyphen-coupled names readable as a sentence
4. Possessive scope (`my`, `our`, `this`) where the operator's
   perspective applies
5. Question form for question-tools, imperative for action-tools
6. Each persona has ≥5 tools speaking their language
7. No engineering-jargon in tool descriptions
8. Tool name + description together pass the "would an operator say
   this?" test

`carrier-vocabulary-curator` reviews the result at PR time when
ambiguous; the linter handles deterministic rules.

### 7. Build / deploy

- pnpm workspaces topology + build order.
- Docker image strategy (per-server vs. monorepo).
- Cloud Run deployment manifests.
- OpenTofu IaC modules.
- Secret loading (SOPS+age) at runtime.

### 8. Security posture

(Authored alongside `security-auditor` audit memo in GW-1.8.)

- Auth model — OAuth + JWT propagation.
- Audit hash-chain — implementation contract.
- Secret rotation cadence.
- BAA path (when applicable LOBs).
- Threat model.

---

## Audit gate

Reviewed by:

- `backend-architect`
- `security-auditor`
- `architect-reviewer`
- `harness-runtime-architect`
