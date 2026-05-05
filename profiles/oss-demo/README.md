# profiles/oss-demo — OSS demo profile

This is a **fully-populated reference profile** for the `guidewire-mcp-for-claude`
repo. It targets the Palisades Cloud Platform release with read-only E2
PolicyCenter tools and P&C commercial LOBs.

## This is read-only reference material

Per 02-PRD § 6.10 — customers fork to a new directory and edit. Do NOT use
`oss-demo` as the production path for any live tenant. The tenant ID `oss-demo`
is a placeholder; a real tenant requires a real tenant slug and real OAuth
credentials.

## How to use as a starting point

```bash
cp -R profiles/oss-demo profiles/acme-insurance-prod
# Replace every placeholder value:
#   manifest.yaml: tenantId, displayName
#   auth.yaml:     token_endpoint, base_url_pc (and cc/bc when needed)
#   roles.yaml:    carrier-specific role names
#   lob.yaml:      carrier LOB codes
#   typelists.yaml: carrier typelist extensions
#   field-aliases.yaml: carrier field vocabulary
# Then start the server:
pnpm dev policycenter-mcp -- --profile profiles/acme-insurance-prod
```

## Defaults (per 02-PRD § 6.10)

- All `read_only` tools enabled (E2: 5 PolicyCenter tools)
- All `draft_only` tools enabled in roles — except `draft-denial-letter` (E5, not yet shipped)
- All `approved_execute` tools disabled (`approval-matrix.yaml` → `matrix: {}`)
- `pii-policy.yaml` → `baa_required.enabled: false` (P&C only, no health LOBs)
- Empty App Events subscriptions (E6 events-mcp not yet shipped)
- Cloud release: `Palisades`

## Connecting to a real tenant

The OSS demo uses placeholder URLs and env-var names. To connect to an actual
Guidewire tenant:

1. Get OAuth credentials from Guidewire developer program or PartnerConnect
   sandbox (Palisades release supports same-day partner onboarding — 005-DR-REF § 5).
2. Set environment variables:
   ```
   GUIDEWIRE_OAUTH_CLIENT_ID=<your-client-id>
   GUIDEWIRE_OAUTH_CLIENT_SECRET=<your-client-secret>
   GUIDEWIRE_TOKEN_ENDPOINT=https://<your-tenant>.guidewire.net/oauth2/v1/token
   GUIDEWIRE_PC_BASE_URL=https://<your-tenant>.pc.guidewire.net/pc/api
   GUIDEWIRE_TENANT_ID=<your-tenant-slug>
   ```
3. Start the server:
   ```bash
   pnpm dev policycenter-mcp -- --profile profiles/oss-demo
   ```
   Or with your forked profile:
   ```bash
   pnpm dev policycenter-mcp -- --profile profiles/acme-insurance-prod
   ```

The server validates the profile at boot. Tools surface structured failure
responses when creds are missing — the server never silently degrades to
fixtures or mocks (D-021 / D-008).
