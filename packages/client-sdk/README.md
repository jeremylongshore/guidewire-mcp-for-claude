# `@intentsolutions/guidewire-client`

Guidewire Cloud API client (undici-based). The ONLY place
`GW-DBTransaction-ID` is injected on writes (librarian P1 + AST call-site
rule per [05-TECHNICAL-SPEC § 4.7](../../000-docs/blueprint/05-TECHNICAL-SPEC.md)).

**Servers cannot consume this client directly.** depcruise REFUSEs
`servers/**` importing `clients/**` or
`packages/guidewire-client/**`; writes travel through
`packages/harness/.execute()`. This is the architectural gate per
[D-006](../../000-docs/004-DR-DEC-architecture-decisions.md#d-006--hard-rule-no-audit--no-write).

Reference spec: [05-TECHNICAL-SPEC § 2.1](../../000-docs/blueprint/05-TECHNICAL-SPEC.md).

## Public API

```ts
import { createClient, withPagination } from '@intentsolutions/guidewire-client';
import { createAuth } from '@intentsolutions/guidewire-auth';

const auth = await createAuth({ /* ... */ });

const client = createClient({
  auth,
  baseUrls: {
    pc: 'https://pc.acme.guidewire.cloud',
    cc: 'https://cc.acme.guidewire.cloud',
    bc: 'https://bc.acme.guidewire.cloud',
  },
});

// Read path — pagination via authoritative pageSize/pageOffset (librarian P5).
const submissions = await client.get({
  suite: 'pc',
  path: '/job/v1/jobs',
  query: withPagination({ subtype: 'Submission', status: 'Open' }),
});

// Write path — GW-DBTransaction-ID required on every POST/PUT.
const result = await client.post({
  suite: 'bc',
  path: '/billing/v1/payments/p-1/applications',
  dbTransactionId: plan.wire.dbTransactionId, // from harness
  body: { accountId: 'a-1', amount: { amount: '100.00', currency: 'USD' } },
});
```

## Contract: dbTransactionId is REQUIRED for writes

Per [librarian P1](../../000-docs/blueprint/audits/00-LIBRARIAN-CITATION-AUDIT.md):
the Cloud API uses `GW-DBTransaction-ID` (not `Idempotency-Key`), and
duplicates **fail** with `AlreadyExecutedException` — they do NOT replay.
The client wrapper asserts the value is 64 hex chars and throws if missing
or malformed. Servers cannot construct this value; only
`Plan.wire.dbTransactionId` (built by the harness) is acceptable.

## Pagination

Per [`005-DR-REF`](../../000-docs/005-DR-REF-guidewire-public-resources.md)
+ librarian P5 — **AUTHORITATIVE**:

| Param | Source | Notes |
|---|---|---|
| `pageSize` | IS 202603 Consumer Guide | limits resources per page |
| `pageOffset` | IS 202603 Consumer Guide | which page to return |
| `totalCount` | response field | total result set size |
| previous/next links | response navigation links | iterator follows them |

`withPagination()` defaults to `pageSize=20, pageOffset=0`; callers
override via the second argument.

## Testing

```bash
pnpm --filter @intentsolutions/guidewire-client test
```

Unit tests inject a stub `GuidewireFetch` into `createClient({ fetch })` —
they exercise real client logic (URL construction, header propagation,
JSON parsing, dbTransactionId enforcement, error handling) without making
a live HTTP call. The same `GuidewireFetch` interface backs the recordings
replayer for L4-contract tests in `tests/recordings/`.
