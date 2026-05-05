# Guidewire Cloud API Contract Tests (Karate)

**Decision record:** D-022 in [`000-docs/004-DR-DEC-architecture-decisions.md`](../../000-docs/004-DR-DEC-architecture-decisions.md)

This directory contains the JVM-side Karate contract test suite. It exercises Guidewire's Cloud API endpoints directly — asserting request shape, response envelope shape, error handling, and auth behaviour at the HTTP layer.

The orchestration layer (TS unit / integration tests in `packages/*/tests/` and `servers/*/tests/`) uses Vitest and stays separate. See D-022 for the rationale on the two-runner split.

---

## What this is NOT

- Not a mock server. There are no hand-written fixture JSON files here.
- Not a replacement for the Vitest orchestration tests. The two suites test different layers.
- Not a complete end-to-end suite — it asserts API contracts (envelope shape, HTTP status codes, auth flows). Business-logic assertions live in the orchestration tests.

---

## Environment variables required

| Variable | Description |
|---|---|
| `GUIDEWIRE_OAUTH_CLIENT_ID` | OAuth 2.0 client ID from Guidewire Hub |
| `GUIDEWIRE_OAUTH_CLIENT_SECRET` | OAuth 2.0 client secret |
| `GUIDEWIRE_TOKEN_ENDPOINT` | Full token URL, e.g. `https://<tenant>.guidewire.net/oauth2/v1/token` |
| `GUIDEWIRE_PC_BASE_URL` | PolicyCenter Cloud API base URL, e.g. `https://<tenant>.guidewire.net/pc` |

**The suite skips cleanly when any of these is unset.** Features tagged `@requiresCreds` abort with a clear message rather than failing. This is by design — per D-022: "skip cleanly when creds not present, never silently degrade to a green check."

The first integration engagement (carrier / MGA / SI inbound bringing their own tenant credentials) provides the validation environment per D-021. Dev-tier OAuth credentials for smoke-testing are tracked in bead `guidewire-adj`.

---

## Running locally

Prerequisites: JDK 11 (Temurin recommended) and a local Gradle 8.x installation.

```bash
# Set the 4 env vars in your shell (or .env file — never commit secrets)
export GUIDEWIRE_OAUTH_CLIENT_ID=...
export GUIDEWIRE_OAUTH_CLIENT_SECRET=...
export GUIDEWIRE_TOKEN_ENDPOINT=https://<tenant>.guidewire.net/oauth2/v1/token
export GUIDEWIRE_PC_BASE_URL=https://<tenant>.guidewire.net/pc

# Run the full suite
cd tests/contract
./gradlew test

# Or, if gradlew is still a stub (see below), use a locally installed gradle:
gradle test
```

Without the env vars set, the suite outputs a clear skip message per feature and exits 0. No false greens.

---

## Gradle wrapper note

The `gradlew` and `gradlew.bat` files in this directory are **stubs** until the real Gradle wrapper is generated. Generate them once with a locally installed Gradle 8.x:

```bash
cd tests/contract
gradle wrapper --gradle-version 8.7
chmod +x gradlew
```

After generation, commit `gradlew`, `gradlew.bat`, `gradle/wrapper/gradle-wrapper.jar`, and `gradle/wrapper/gradle-wrapper.properties`. From that point forward, all runs use `./gradlew` without a local Gradle install.

---

## Recording baseline payloads

When dev-tier credentials are provisioned, capture baseline HTTP recordings via:

```bash
cd tests/contract
./gradlew karateRecord
```

`karateRecord` runs in `--no-fail` mode — all scenarios execute even if some fail, and raw payloads are written to `karate-recordings/` (gitignored). Review the captured payloads, distil the exact field shapes into the `.feature` assertions, then remove the raw files.

Per D-022, new recordings land as Karate `.feature` artifacts — not in `tests/recordings/MANIFEST.md` (which is retained as historical context for the pre-D-022 recording scheme).

---

## Adding a new feature when a new tool ships

1. Read the new tool's TS source in `servers/policycenter-mcp/src/tools/<tool-name>.ts` to find the exact Cloud API endpoint it calls.
2. Look up the endpoint in the librarian KB: [`000-docs/005-DR-REF-guidewire-public-resources.md`](../../000-docs/005-DR-REF-guidewire-public-resources.md) — always use the release-versioned Palisades URL, never `latest/`.
3. Create `src/test/resources/policycenter/<tool-name>.feature` following the pattern of existing feature files:
   - `@requiresCreds` tag + `Background:` skip guard
   - Source path comment at the top
   - Librarian KB URL comment at the top
   - Happy path, pagination, 401, empty-result scenarios at minimum
4. The `KarateRunner.java` discovers all `.feature` files automatically — no registration needed.

---

## CI behaviour

CI runs this suite via `.github/workflows/cloud-api-contract.yml`. The workflow:

- Triggers on push to `main`, PRs labelled `cloud-api-contract`, and `workflow_dispatch`
- Sets up JDK 11 (Temurin) and runs `./gradlew test`
- Injects the 4 `GUIDEWIRE_*` secrets from GitHub Actions secrets
- Skips the entire job (exit 0) when `GUIDEWIRE_OAUTH_CLIENT_ID` is not set — so PRs from forks never fail on missing secrets

---

## Librarian KB

Endpoint URLs used in these feature files come from the guidewire-reference-librarian knowledge base. Always use release-versioned Palisades URLs:

PolicyCenter (202503):
`https://docs.guidewire.com/cloud/pc/202503/apiref/`

Cross-suite Cloud API primer (Palisades 202603):
`https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/Basic-REST-operations/introduction-to-Cloud-API/c_endpoints.html`
