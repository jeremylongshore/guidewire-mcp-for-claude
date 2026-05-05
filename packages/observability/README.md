# `@intentsolutions/guidewire-observability`

OpenTelemetry traces + pino structured logs + Sentry error capture. Wired in
from day 1 per [Hard Rule #6](../../CLAUDE.md) + [D-013](../../000-docs/004-DR-DEC-architecture-decisions.md#d-013--observability-is-wired-in-from-day-1-not-bolted-on).
Never bolted on later.

Reference spec: [05-TECHNICAL-SPEC § 4](../../000-docs/blueprint/05-TECHNICAL-SPEC.md).

## Public API

```ts
import {
  getObservability,
  AppError,
  refuseDbTxnDuplicate,
} from '@intentsolutions/guidewire-observability';

const obs = getObservability({
  server_name: 'policycenter-mcp',
  tenant_id: 'sandbox-jeremy-dev',
  otlp_endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  sentry_dsn: process.env.SENTRY_DSN,
  log_level: 'info',
});

const span = obs.tracer.startSpan('mcp.tool.invoke', {
  attributes: {
    tenant_id: 'sandbox-jeremy-dev',
    tool_name: 'find-submissions-waiting-on-me',
    mode: 'read_only',
  },
});

obs.logger.info({ trace_id: span.spanContext().traceId }, 'tool invocation started');

try {
  // ...tool work...
} catch (raw) {
  const err = refuseDbTxnDuplicate({
    trace_id: span.spanContext().traceId,
    tenant_id: 'sandbox-jeremy-dev',
    tool_name: 'reconcile-this-payment',
    mode: 'approved_execute',
    cause: raw,
  });
  obs.reportError(err);
  throw err;
}
```

## Required span attributes

Per [05-TECHNICAL-SPEC § 4.3](../../000-docs/blueprint/05-TECHNICAL-SPEC.md):

| Attribute | Type | Required | Notes |
|---|---|---|---|
| `trace_id` | string | yes | W3C trace context |
| `tenant_id` | string | yes | non-secret tenant identifier |
| `tool_name` | string | yes | exact carrier-vocabulary tool name |
| `tool_version` | string | yes | matches the version in idempotency-key derivation |
| `mode` | enum | yes | `read_only` / `draft_only` / `approved_execute` |
| `actor_id` | string | yes | `actor:<user-or-service>` |
| `idempotency_key` | string | conditional | required when `mode != read_only`; `gwh1:<sha256-hex>` |
| `db_transaction_id` | string | conditional | required on write spans; 64-hex-char (librarian P1) |
| `policy_decision` | enum | conditional | required for `harness.policy.evaluate` |
| `evidence_bundle_id` | string | conditional | required for `harness.evidence.bundle` |

## Refusal helpers

Every refusal scenario from
[006-DR-MEMO](../../000-docs/006-DR-MEMO-mcp-safety.md) has a typed
constructor in [`./src/refusals.ts`](./src/refusals.ts):

- `refuseAuthExpired` — OAuth token expired before write completed
- `refuseSandboxDown` — Guidewire Cloud sandbox host unreachable
- `refuseIdempMismatch` — cache hit but cached response shape differs
- `refuseDbTxnDuplicate` — Guidewire returned `AlreadyExecutedException` (librarian P1)
- `refuseModeMismatch` — tool invoked in unmatched mode
- `refuseChainBroken` — `verifyChain` detected hash mismatch

Add new refusal helpers here when new named refusals enter the harness. Do
not raw-throw `Error` from `servers/*` or `packages/harness/` — the
architecture rule fails CI.

## Testing

```bash
pnpm --filter @intentsolutions/guidewire-observability test
```
