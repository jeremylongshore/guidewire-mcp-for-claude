# tests/recordings/ — MANIFEST + provenance schema

> *Real Guidewire Cloud sandbox HTTP recordings live here. Hand-written
> JSON fixtures are explicitly forbidden (per D-008 NO MOCKS). This
> doc is the schema every recording in this directory must satisfy.*

**Filed:** 2026-05-04 (E spec; concrete recordings land post-sandbox)
**Bead:** `guidewire-qmt` (this scaffold) → recordings filled by E1+
**Authoritative source for tool/contract shapes:** these recordings.
**Authoritative source for endpoint catalogs (pre-sandbox):**
[`../../000-docs/005-DR-REF-guidewire-public-resources.md`](../../000-docs/005-DR-REF-guidewire-public-resources.md)
(maintained by [`guidewire-reference-librarian`](../../.claude/agents/guidewire-reference-librarian.md)).

---

## Why a MANIFEST exists

Hand-written fixtures pretend to know things they don't:

- Field-set variation across carriers (per persona-1 finding)
- Eventual consistency between writes and reads
- Real failure modes (auth expiry, rate-limit, idempotency replay)
- Custom-entity surfaces unique to each carrier's product config

Real recordings carry that complexity for free. But a recording
without provenance is just a hand-written fixture wearing a costume.
This MANIFEST is the provenance contract.

---

## Filename schema

```
<endpoint-slug>.recorded-<YYYY-MM-DD>.from-<tenant-tag>.<seq>.json
```

| Token | Meaning | Example |
|---|---|---|
| `endpoint-slug` | kebab-case path of the Cloud API endpoint, no leading slash, version stripped | `policy-v1-policies` |
| `recorded-YYYY-MM-DD` | UTC date the recording was captured | `recorded-2026-05-04` |
| `from-<tenant-tag>` | Sandbox tenant identifier (NOT the secret) | `from-sandbox-acme-dev` |
| `seq` | Two-digit sequence for multiple recordings of the same endpoint that day | `01` |
| `.json` | Required extension | |

**Examples:**

```
policy-v1-policies.recorded-2026-05-04.from-sandbox-jeremy-dev.01.json
claim-v1-claims-{claimId}.recorded-2026-05-04.from-sandbox-jeremy-dev.01.json
billing-v1-accounts-overdue.recorded-2026-05-04.from-sandbox-jeremy-dev.01.json
```

Path collisions in the endpoint (e.g. `{policyId}` vs `{accountId}`)
keep the literal placeholder text. Don't substitute real IDs into
the filename.

---

## Manifest entry schema

Every file in this directory MUST have a corresponding entry in this
MANIFEST. Entries live in this README under the
[Recordings table](#recordings-table) section below. Schema:

| Column | Required | Type | Description |
|---|---|---|---|
| filename | yes | string | exact `<endpoint>.recorded-<date>...json` |
| endpoint | yes | string | Cloud API path with `{params}`, e.g. `/policy/v1/policies/{policyId}` |
| method | yes | string | HTTP verb (GET, POST, PATCH, DELETE) |
| guidewire_release | yes | string | Cloud release the tenant ran when captured (`Palisades`, `Las Leñas`, `Innsbruck`, etc.) |
| tenant_tag | yes | string | non-secret tenant identifier matching the filename |
| capture_method | yes | enum | `sandbox-direct` \| `vendor-partner` \| `partner-validated` |
| sanitized | yes | bool | `true` if PII / customer-internal IDs replaced with deterministic placeholders; `false` only for fully synthetic-tenant captures |
| status_code | yes | int | HTTP response status (200, 201, 400, 404, 409, etc.) |
| purpose | yes | string | one-sentence why this recording is in the repo (which tool/profile/test depends on it) |
| captured_by | yes | string | github username or human readable name |
| issue_link | optional | string | bead/PR/issue this recording was captured for |
| notes | optional | string | gotchas, drift watch, etc. |

---

## Sanitization rules

Real recordings touch real systems — even sandbox tenants can
contain internal IDs, names, emails, etc. Before committing a
recording:

1. **Replace personally-identifying data** (names, emails, phones,
   SSNs) with deterministic placeholders matching the field's regex
   (e.g. `J*** L***`, `redacted-1@example.test`).
2. **Replace customer-internal account/contact IDs** with stable
   pseudonymous IDs (e.g. `ACC-PSEUDO-0001`). Keep IDs internally
   consistent across the recording so cross-references resolve.
3. **Preserve all field SHAPES** (lengths, formats, codes). The
   recording's job is to faithfully represent the API's response
   shape — sanitization can't change shape.
4. **Mark `sanitized: true`** in the MANIFEST entry.

If a recording is from a fully synthetic tenant (no real customer
data ever existed), mark `sanitized: false` and document the
synthetic-tenant provenance in `notes`.

---

## When to record

Record when:

- Drafting a tool that hits a new endpoint (E2 PolicyCenter onward)
- Sandbox API behavior diverges from what the public Cloud API docs
  say (cite the divergence)
- A new App Event subscription is being designed (capture the
  inbound event payload)
- A failure mode needs a contract test (capture the 4xx/5xx response)
- Guidewire releases (Palisades+1, etc.) — re-record the
  representative endpoints to catch drift

Don't record when:

- The endpoint is well-documented and you're not implementing it
- You can shape the contract from the public Cloud API ref alone
- You're tempted to add a "hand-tweaked" recording — instead, record
  the real failure or skip the test

---

## Recordings table

> Empty until sandbox provisioning closes (`guidewire-adj` / GH #1).
> First recordings land alongside E1 PolicyCenter MCP tool drafts.

| filename | endpoint | method | guidewire_release | tenant_tag | capture_method | sanitized | status_code | purpose | captured_by | issue_link | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| _(no recordings yet)_ | | | | | | | | | | | |

---

## Cross-references

- D-008 NO MOCKS rule: [`../../000-docs/004-DR-DEC-architecture-decisions.md`](../../000-docs/004-DR-DEC-architecture-decisions.md)
- v4 architecture (NO MOCKS section): [`../../000-docs/003-DR-ARCH-oss-cowork.md`](../../000-docs/003-DR-ARCH-oss-cowork.md)
- Sandbox application playbook: bead `guidewire-adj` ↔ GH #1
- Public-docs reference: [`../../000-docs/005-DR-REF-guidewire-public-resources.md`](../../000-docs/005-DR-REF-guidewire-public-resources.md)
- Testing policy (lands in GW-1.10): `tests/TESTING.md` will reference this MANIFEST
