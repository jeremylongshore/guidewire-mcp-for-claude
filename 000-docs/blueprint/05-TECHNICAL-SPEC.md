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

### 4. Observability — span, log, error contract

(Authored in **GW-1.11**. Deep version of CLAUDE.md's "Observability
from day 1" section.)

- Span structure (tree shape on every MCP tool call).
- Required attributes (`trace_id`, `tenant_id`, `tool_name`, `mode`,
  `actor_id`).
- Pino log shape.
- AppError class + Sentry tagging.
- The `packages/observability/getObservability()` factory contract.
- Architecture rules CI enforcement (depcruise + AST checks for
  span coverage).
- Sentry → bead auto-creation pipeline (via `claude_ai_Sentry` MCP +
  `bd-sync`).

### 5. NO MOCKS — sandbox + recording-replay contract

(Authored in **GW-1.3** alongside architecture.)

- `tests/recordings/*.json` filename provenance schema.
- `MANIFEST.md` shape.
- Replay framework selection (e.g. nock, msw, custom).
- Live-sandbox CI job (post-merge, catches API drift).
- `samples/` directory (read-only replay material, never test ground
  truth).

### 6. Quality gates (testing policy — `tests/TESTING.md`)

(Authored in **GW-1.10**.)

- Coverage floor (per-package + repo-wide).
- Mutation kill rate (Stryker baseline).
- CRAP threshold.
- Architecture rules (depcruise).
- Bias count (max false-positive guard tests).
- Gherkin lint rules for L6 acceptance scenarios.
- All thresholds hash-pinned via `audit-harness init`.

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
