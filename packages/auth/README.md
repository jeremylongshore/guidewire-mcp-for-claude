# `@intentsolutions/guidewire-auth`

Guidewire Hub OAuth + JWT propagation. Per-tenant `auth.yaml` declares the
OIDC discovery URL; this package pulls the JWKS, rotates tokens at 80% of
lifetime, and propagates the actor JWT through to Cloud API as
`Authorization: Bearer <jwt>`.

Reference spec: [05-TECHNICAL-SPEC § 8.1](../../000-docs/blueprint/05-TECHNICAL-SPEC.md).

## Public API

```ts
import { createAuth } from '@intentsolutions/guidewire-auth';
import type { AuthYaml } from '@intentsolutions/guidewire-schemas';

const profile: AuthYaml = /* parsed from profile.yaml via Zod */;

const auth = await createAuth({
  profile,
  clientId: process.env.GUIDEWIRE_OAUTH_CLIENT_ID!,
  clientSecret: process.env.GUIDEWIRE_OAUTH_CLIENT_SECRET!,
});

const { accessToken } = await auth.getToken();
// fetch.headers.set('Authorization', `Bearer ${accessToken}`)

const claims = auth.validateJwt(jwtString);
// claims.sub is the actor identity for audit-chain attribution
```

## Refresh strategy (proactive, 80% of lifetime)

In-flight `approved_execute` writes cannot afford a mid-write 401 (008 § 10).
The `getToken()` accessor caches a token whose `expiresAt` is set to
`Date.now() + (lifetime * 0.8)`; subsequent calls return the cache until
that boundary passes, then refresh transparently.

## JWT validation (sandbox-blocked, librarian P6)

`validateJwt()` currently does **structural** validation only — segment
shape, base64url decode, JSON parse, required `sub` claim. Full JWKS-backed
signature verification activates when an integration engagement provides
a real Hub OIDC discovery URL + JWKS. Until then, structural validation
covers the unit-test boundary; integration tests against a live Hub will
exercise the JWKS path.

## Hard rules

- Dev-tier creds via env (per D-021); never written to disk; never logged.
- `refresh_strategy` is locked to `'proactive'` in
  [`@intentsolutions/guidewire-schemas`](../schemas/) — there's no
  `'reactive'` mode (waiting for a 401 to refresh is unsafe for writes).
- The factory returns a pure interface — no globals. Each tenant gets its
  own `AuthHandle`.

## Testing

```bash
pnpm --filter @intentsolutions/guidewire-auth test
```

Unit tests cover the structural-validation path without making any live
Guidewire call.
