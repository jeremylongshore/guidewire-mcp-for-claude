# `@intentsolutions/policycenter-mcp`

PolicyCenter MCP server — 5 read-only carrier-vocabulary tools for the
line-underwriter persona (Persona 2). Implements the J-1 Underwriter Triage
demo path end-to-end (`000-docs/blueprint/04-USER-JOURNEY.md` § J-1).

This is the first MCP server in the Guidewire MCP for Claude project (E2).
It depends only on E1 packages and ships no writes.

## Tools (E2 in-scope, 5 of 5)

| Tool | Mode | Cloud API endpoint |
|---|---|---|
| `find-submissions-waiting-on-me` | `read_only` | `GET /job/v1/jobs?subtype=Submission&assignedToUser={actorId}&status=Open` |
| `show-policies-for-this-insured` | `read_only` | `GET /policy/v1/policies?accountId={accountId}` |
| `summarize-this-submission` | `read_only` | `GET /job/v1/jobs/{jobId}` |
| `did-we-lose-this-account` | `read_only` | `GET /policy/v1/policies?accountId={accountId}&status=Cancelled,Lapsed,Lost` |
| `pull-this-submission` | `read_only` | `GET /job/v1/jobs/{jobId}` |

All endpoints are sourced from the PolicyCenter apiref at
<https://docs.guidewire.com/cloud/pc/202503/apiref/> per the librarian
KB (`000-docs/005-DR-REF-guidewire-public-resources.md`).

### Tools deferred to E5 per `02-PRD` § 3.1.1

- `whats-our-appetite-on-this-risk` — slipped E2 → E5; surfaces
  `profile_incomplete_for_this_carrier` until UWCenter rule entity shapes
  resolve.
- `explain-why-this-got-referred` — slipped E2 → E5; entirely
  carrier-defined rule trace.

Both are in-scope for the catalog when the customer profile resolves them.

## Install

```bash
pnpm add @intentsolutions/policycenter-mcp
```

This is a workspace package; for in-repo development:

```bash
cd /path/to/guidewire
pnpm install
pnpm -r build
```

## Run

### Stdio transport (default — what Claude Desktop expects)

```bash
node dist/cli.js --transport stdio
# or via the bin shim:
policycenter-mcp --transport stdio
# or in dev mode (no build needed):
pnpm --filter @intentsolutions/policycenter-mcp dev:stdio
```

### Streamable HTTP transport

```bash
node dist/cli.js --transport http --port 3030
# or:
pnpm --filter @intentsolutions/policycenter-mcp dev:http
```

The HTTP transport uses the MCP SDK's `StreamableHTTPServerTransport`
directly — no Express / Fastify wrapper (per the project's `CLAUDE.md`
hard rule).

## Claude Desktop configuration

Add this block to your Claude Desktop config (typically at
`~/.config/Claude/config.json` on Linux,
`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS,
or `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "policycenter": {
      "command": "node",
      "args": [
        "/absolute/path/to/guidewire/servers/policycenter-mcp/dist/cli.js",
        "--transport",
        "stdio"
      ],
      "env": {
        "GUIDEWIRE_TENANT_ID": "your-tenant-slug",
        "GUIDEWIRE_PC_BASE_URL": "https://pc.your-tenant.guidewire.cloud",
        "GUIDEWIRE_TOKEN_ENDPOINT": "https://login.your-tenant.guidewire.cloud/oauth/token",
        "GUIDEWIRE_OAUTH_CLIENT_ID": "your-client-id",
        "GUIDEWIRE_OAUTH_CLIENT_SECRET": "your-client-secret",
        "GUIDEWIRE_OAUTH_SCOPES": "pc.read",
        "GUIDEWIRE_ACTOR_ID": "actor:your-underwriter@example.com"
      }
    }
  }
}
```

After editing the config, fully quit and relaunch Claude Desktop. The 5
tools will appear in the tool picker.

## Dev-tier credentials per `D-021`

Per the architecture decision log (`000-docs/004-DR-DEC-architecture-decisions.md`
§ D-021), this server reaches **real Guidewire endpoints** with
**dev-tier OAuth credentials** — never mocked, never recorded fixtures.
The credentials are obtainable via Guidewire's developer program signup.

When credentials aren't configured:

- The server still starts (so the MCP handshake / `tools/list` works).
- Every tool call surfaces a structured failure (`Guidewire OAuth not
  configured`).
- The server **never falls back to fixtures** per `D-008` (NO MOCKS).

## Environment variables

| Variable | Purpose |
|---|---|
| `GUIDEWIRE_TENANT_ID` | Stable tenant slug (e.g. `sandbox-jeremy-dev`); default `dev-local` |
| `GUIDEWIRE_PC_BASE_URL` | PolicyCenter Cloud API base URL (e.g. `https://pc.acme.guidewire.cloud`) |
| `GUIDEWIRE_TOKEN_ENDPOINT` | OAuth token endpoint URL |
| `GUIDEWIRE_OAUTH_CLIENT_ID` | OAuth client ID |
| `GUIDEWIRE_OAUTH_CLIENT_SECRET` | OAuth client secret |
| `GUIDEWIRE_OAUTH_SCOPES` | Space-separated scopes (default `pc.read`) |
| `GUIDEWIRE_ACTOR_ID` | Fallback actor ID when no JWT propagation; default `actor:dev-local` |
| `GUIDEWIRE_OBS_LOG_LEVEL` | Pino log level (`info` / `warn` / `error` / `debug` / `silent`) |

In production, these come from `secrets.<env>.sops.yaml` decrypted by the
`secretsLoader` in `packages/auth/` per `05-TECHNICAL-SPEC.md` § 7.5.

## Test

```bash
pnpm --filter @intentsolutions/policycenter-mcp test
```

Tests mock the `undici` boundary only — tool mapping, alias resolution,
audit emission, and span lifecycle are tested for real. Per the `NO MOCKS`
hard rule (`CLAUDE.md` § Hard Rules), tests do not load fixtures from
disk; expected response shapes are derived from the public PC apiref.

## Manifest schema

The `ToolManifestEntry` shape defined in
[`src/manifest.ts`](./src/manifest.ts) anticipates the audit panel's
CHALLENGEs `BA-3` / `MS-5` / `CV-3` / `CV-6` / `AR-2`. When `GW-1.9`
codifies the canonical shape in `02-PRD` § 3.0 + Zod in
`05-TECHNICAL-SPEC` § 3, this server's tools should pass without rework.

Key invariants the shape enforces:

- `mode` is load-bearing (MS-5).
- `vocabulary.question` + `vocabulary.whenToUse` codify the
  `<carrier-question> · <when-to-use>` description-shape rule (CV-6).
- `requiredProfileSchema` / `requiredProfileFiles` make profile gating
  boot-time-checkable (D-020).
- `requiresHarnessExecute` is `false` for `read_only`; `true` for
  `draft_only` / `approved_execute` so AR-2 (servers cannot bypass
  harness on writes) is statically auditable.

## Known limitations (E2)

- **Profile loader is a stub.** `createDefaultProfile()` returns a
  carrier-neutral default. Per-tenant `profiles/<tenant>/` directories
  ship in E4.
- **Audit emission goes to the structured logger.** The hash-chained
  Postgres audit store wires in via `packages/audit` once `packages/harness`
  (E3) lands and the harness mediates every read.
- **No JWT propagation yet.** The `actorId` falls back to `GUIDEWIRE_ACTOR_ID`.
  Per-actor JWT propagation lands when the harness boots a per-request
  context (E3).
- **Composite-API fan-out for `summarize-this-submission`** is wired as a
  single-resource Job read until `guidewire-adj` smoke-tests confirm the
  Composite request shape. PC has Composite + Graph API (CC has Composite
  only — no Graph) per the librarian KB.

## Citations

- `02-PRD.md` § 3.1.1 — canonical tool catalog
- `04-USER-JOURNEY.md` § J-1 — underwriter triage demo path
- `03-ARCHITECTURE.md` § 5.1 — read_only mode flow
- `05-TECHNICAL-SPEC.md` § 2.1 / § 3 / § 4 / § 5 / § 8
- `005-DR-REF-guidewire-public-resources.md` — Cloud API URL source-of-truth
- `008-DR-MEMO-guidewire-api.md` § 3.1 — PC API mapping memo
- `004-DR-DEC-architecture-decisions.md` D-001 / D-005 / D-006 / D-016 / D-021

## License

Apache-2.0 — see [LICENSE](../../LICENSE) at the repo root.
