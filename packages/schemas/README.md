# `@intentsolutions/guidewire-schemas`

Zod schemas + TypeScript contracts for the Guidewire MCP harness, customer
profiles, and audit chain. The cycle-free root of the workspace —
imports `zod` only (per 05-TECHNICAL-SPEC § 2.1).

## What's in here

### Harness contracts (`./harness`)

Direct port of the verbatim TS interfaces from
[`02-PRD § 5`](../../000-docs/blueprint/02-PRD.md). Every signature lands in
the harness when E3 opens; deviation requires a `010-DR-MEMO-harness-runtime-rev.md`
with a `replaces:` link.

| Module | Contract |
|---|---|
| `plan.ts` | `ToolMode`, `PlanInput`, `Plan` (with `wire.dbTransactionId` per librarian P1) |
| `policy.ts` | `PolicyOutcome`, `PolicyTier`, `PolicyDecision` |
| `approval.ts` | `ApprovalState`, `Approval`, `ApprovalVote` |
| `execute.ts` | `ExecuteOutcome`, `ExecuteResult<T>` |
| `audit.ts` | `AuditEventType`, `AuditEntry`, `ChainVerification`, `AuditQuery` |
| `rollback.ts` | `RollbackHint` |
| `evidence.ts` | `EvidenceBundle`, `OtelSpanSnapshot` |
| `error.ts` | `HarnessErrorCode` (includes `GW_DBTRANSACTION_DUPLICATE` per librarian P1) |

### Profile schemas (`./profile`)

Per [02-PRD § 6](../../000-docs/blueprint/02-PRD.md). The 9 YAML files of a
v1.0 customer profile, plus the v2.0 hook (`lob.yaml.aggregations:`) per
[D-020](../../000-docs/004-DR-DEC-architecture-decisions.md#d-020).

| File | What it maps |
|---|---|
| `auth.yaml` | OAuth + JWT propagation + Cloud API base URLs |
| `roles.yaml` | role × tool × mode permission matrix |
| `lob.yaml` | LOB code mappings (+ v2.0 `aggregations:` for E2.5 tools) |
| `typelists.yaml` | typelist value mappings (base vs customer-extended) |
| `custom-entities.yaml` | per-tenant Swagger custom entity bindings |
| `field-aliases.yaml` | Guidewire field name → carrier-vocabulary, plus money + date typing |
| `approval-matrix.yaml` | write actions → required approver tier (preserves currency) |
| `pii-policy.yaml` | redaction rules + BAA carve-out for health LOBs |
| `events.yaml` | App Events subscription config (`shard_by: primaryObject.id` only) |

## Usage

```ts
import { PlanInputSchema, type Plan } from '@intentsolutions/guidewire-schemas';

const input = PlanInputSchema.parse({
  toolName: 'find-submissions-waiting-on-me',
  toolVersion: '1.0.0',
  mode: 'read_only',
  tenantId: 'sandbox-jeremy-dev',
  actorId: 'actor:uw@demo',
  args: { assignedToMe: true },
  summary: 'list open submissions assigned to me',
  traceId: '01J9X4HN5G8RXKX7P0VGAR3G7T',
});
```

The `Plan` type extends `PlanInput` with `planId`, `createdAt`,
`idempotencyKey` (`gwh1:` prefix), and `wire.dbTransactionId` (raw hex,
no prefix — per the librarian P1 two-key model).

## Hard rules this package enforces

1. **Cycle-free root.** No imports outside `zod`. Other packages import
   from here; this package imports from no one.
2. **Closed enum sets.** `ToolMode`, `ApprovalState`, `PolicyOutcome`,
   `PolicyTier`, `AuditEventType`, `HarnessErrorCode`, and the profile
   `schemaVersion` are exhaustive — extending them is a major version
   bump.
3. **Deterministic shapes.** Idempotency keys are regex-locked
   (`gwh1:[0-9a-f]{64}` for the harness key, `[0-9a-f]{64}` for the wire
   `GW-DBTransaction-ID` value).

## Testing

```bash
pnpm --filter @intentsolutions/guidewire-schemas test
```
