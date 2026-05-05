# profiles/_template — Customer profile scaffold

This directory is the canonical starting point for a per-carrier / per-tenant
Guidewire MCP profile. Copy it to `profiles/<your-tenant>/`, fill in every
`# TODO:` placeholder, and the MCP server will load your profile at boot.

## Quick start

```bash
cp -R profiles/_template profiles/acme-insurance-prod
# Edit each YAML — replace every TODO: placeholder
# Then start the server against your profile:
pnpm dev policycenter-mcp -- --profile profiles/acme-insurance-prod
```

The server validates all 9 YAMLs against their Zod schemas at boot. Any
missing required field surfaces a typed error that names the exact file
and the failing field path — not a generic "profile invalid" message.

## What each file does

| File | PRD section | Purpose |
|---|---|---|
| `manifest.yaml` | § 6.0a | Profile root: tenant ID, display name, cloud release, declared LOBs + servers, checksum slot |
| `auth.yaml` | § 6.1 | Guidewire Hub OAuth config (env-var names only — never credential values) + API base URLs + cloud release |
| `roles.yaml` | § 6.2 | Operator role × tool × mode permission matrix. Controls who can call what at what authorization level |
| `lob.yaml` | § 6.3 | Line-of-business code mappings. THE ONLY PLACE LOB mapping lives. Hard-coding in tool code = CI failure |
| `typelists.yaml` | § 6.4 | Typelist value maps with `source: base | customer_extended` flag and release-versioned base URI |
| `custom-entities.yaml` | § 6.5 | Per-tenant custom entity mappings with `api_path` templates for carrier-specific Cloud API extensions |
| `field-aliases.yaml` | § 6.6 | Guidewire raw field names → carrier-vocabulary terms, plus money field and date field declarations |
| `approval-matrix.yaml` | § 6.7 | Write-action approval thresholds. Empty (`matrix: {}`) is valid for read-only deployments |
| `pii-policy.yaml` | § 6.8 | PII redaction classes (high/medium/low) and BAA requirement flag |
| `events.yaml` | § 6.9 | App Events subscriptions. Empty (`subscriptions: []`) is valid until E6 events-mcp ships |

## Schema versioning rule (D-020)

`manifest.yaml` carries `schemaVersion`:

- `v1.0` — the 9 YAMLs above. Default for per-tenant deployments.
  Sufficient for E1, E2, E3, E4, E5–E10 per-submission tools.
- `v2.0` — v1.0 plus an `aggregations:` block inside `lob.yaml` (no 10th
  file; the 9-file count is preserved). Required by E2.5 underwriting-
  manager aggregate-query tools. Tools declare `requiredProfileSchema: ">=v2.0"`
  in metadata; boot-time validation refuses to load them against a v1.0 profile.

Upgrade path: add the `aggregations:` block to your `lob.yaml` and change
`schemaVersion` in `manifest.yaml` to `"v2.0"`. See `packages/schemas/src/profile/lob.ts`
for the `LobYamlV2Schema` shape.

## Security invariants

`auth.yaml` stores env-var **names** only — never credential values. The
server reads the actual values from the named environment variables at boot.
Committing credentials to this file is a hard CI failure.

Health-LOB carriers must set `baa_required.enabled: true` in `pii-policy.yaml`.
A profile carrying health LOBs without this flag is a hard boot failure.

## Full schema reference

- `02-PRD.md § 6` — full field tables and validation rules
- `packages/schemas/src/profile/*.ts` — Zod schema source of truth
- `004-DR-DEC-architecture-decisions.md` — D-007 (profile-as-data), D-020
  (versioning), D-021 (no Jeremy-controlled sandbox)

## Fully-populated example

`profiles/oss-demo/` contains a complete, populated example using the OSS
demo defaults (all read-only tools enabled, Palisades release, P&C LOBs).
Fork that directory instead of `_template/` if you want a richer starting
point and fewer empty placeholders to fill.
