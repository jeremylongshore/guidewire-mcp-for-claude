# 05-BA — Backend / API contract review

**Auditor:** `backend-architect`
**Date:** 2026-05-04
**Target:** `02-PRD.md` § 3 (tool catalog) + § 5 (harness
contract) + § 6 (profile contract), `05-TECHNICAL-SPEC.md` § 2
(package layout) + § 3 (TS contracts) + § 7 (build/deploy),
`03-ARCHITECTURE.md` § 2 (layered model) + § 6 (failure modes),
`07-ROADMAP.md` per-epic exit criteria.
**Scope:** API contract clarity + completeness, MCP tool schemas,
package boundary correctness from a code-shape perspective,
TypeScript contract surface, scaling assumptions in the per-package
contracts, async + queue semantics. **Out of scope:** Cloud API
correctness against Guidewire (separate
`guidewire-api-archaeologist` lane); harness internal semantics
(separate `harness-runtime-architect` lane).

---

## Verdict

**PASS-WITH-NOTES.** The TypeScript contracts in `02-PRD.md` § 5 +
`05-TECHNICAL-SPEC.md` § 3 are unusually complete for a pre-code
artifact — every interface has its module path, every field has
its semantic, every failure mode has its `HarnessError.code`. The
package contract table in `05-TECHNICAL-SPEC.md` § 2.1 cleanly
separates allowed-imports from forbidden-imports per package; this
is the right level of rigor for E1. The per-tool MCP surface in
PRD § 3 is well-shaped (mode + endpoint + persona + profile-dep +
citation per row), and the three-mode semantics in PRD § 4.1 cover
inputs / side effects / refusal scenarios / audit emissions /
telemetry / failure modes per mode in a single normalized table
that a backend engineer can implement against without ambiguity.
The findings below are scaling questions and contract gaps that
only surface when code lands; none re-litigates the design.

## Findings

### F-1 — TS contracts in § 3 are reproducible from § 5; the verbatim-duplication discipline is correct
- **Severity:** PASS
- **Section:** `02-PRD.md` § 5 + `05-TECHNICAL-SPEC.md` § 3.
- **Finding:** Both documents reproduce the same TypeScript
  signatures for `Plan`, `PolicyDecision`, `Approval`,
  `ExecuteContext`, `ExecuteResult`, `AuditEntry`, `AuditStore`,
  `RollbackHint`, `EvidenceBundle`, `EvidenceExporter`,
  `HarnessConfig`, `HarnessError`. The verbatim-reproduction
  discipline (PRD as prose-bearing canonical; TECH-SPEC as
  governance copy with module-path + Zod-schema annotations) is
  the right shape — the PRD reads as product spec, the TECH-SPEC
  reads as engineer reference, both encode the same contract. The
  `010-DR-MEMO-harness-runtime-rev.md` deviation rule from `009
  § 11` is the lock that prevents drift. As a backend reviewer
  I look for the contract to be in exactly one place; here it's
  in two coordinated places, which is acceptable because the
  deviation rule names the canonical source.
- **Recommendation:** None. When E3 lands and
  `packages/harness/src/index.ts` is real, add a CI check that
  diffs the file against the PRD/TECH-SPEC excerpts. If they
  drift, fail the build with a pointer at the deviation rule.
  This is a future enhancement, not an E1 blocker.
- **Cite:** `02-PRD.md:325-660`, `05-TECHNICAL-SPEC.md:142-521`,
  `009 § 11`.

### F-2 — `HarnessError` discriminator union is closed; consider extension policy
- **Severity:** NOTE
- **Section:** `02-PRD.md` § 5.8, `05-TECHNICAL-SPEC.md` § 3.8.
- **Finding:** `HarnessError.code` is a union of 10 string
  literals: `'AUDIT_UNREACHABLE' | 'POLICY_UNREACHABLE' |
  'POLICY_DENIED' | 'APPROVAL_TIMEOUT' | 'APPROVAL_DENIED' |
  'IDEMPOTENCY_MISMATCH' | 'CHAIN_BROKEN' | 'MODE_MISMATCH' |
  'TENANT_UNKNOWN' | 'GW_DBTRANSACTION_DUPLICATE'`. Closed unions
  are correct from a type-safety perspective — the consumer
  (Sentry tagging, log fingerprints, refusal handling) can
  exhaustively switch on the code. But the union is also a
  **versioned contract** in `@intentsolutions/guidewire-harness`:
  adding a code is a minor bump from the consumer's perspective
  (new code added) but a breaking change from a Sentry-rule or
  Slack-routing rule that depends on the closed enumeration. The
  blueprint doesn't state the extension policy. When E5 ships
  drafting tools and a new failure mode surfaces (e.g.
  `DRAFT_RENDER_FAILURE`), is that a new `HarnessError.code` or
  is it an `AppError` subclass with its own code namespace?
- **Recommendation:** Add to `05-TECHNICAL-SPEC.md` § 3.8 a
  one-paragraph "Extension policy for `HarnessError.code`":

  > "New `HarnessError.code` values are minor-version additions
  > to `@intentsolutions/guidewire-harness`. Consumers should
  > treat the union as open at runtime (default-case in
  > exhaustive switches). Codes that are tool-specific (e.g.
  > `DRAFT_RENDER_FAILURE` from a drafting tool) live in their
  > own `AppError` subclass in `packages/observability/`, not in
  > `HarnessError` — the rule is: `HarnessError` codes are
  > harness-runtime concerns, `AppError` codes are tool-
  > implementation concerns."

  This avoids a future PR that adds tool-specific codes to
  `HarnessError` and bloats the union into noise.
- **Cite:** `02-PRD.md:646-661`, `05-TECHNICAL-SPEC.md:501-521`.

### F-3 — Tool MCP schema is implicit (Zod input + `mode` field); make the manifest schema explicit
- **Severity:** CHALLENGE
- **Section:** `02-PRD.md` § 3 (tool catalog rows) + § 4.1 (mode
  comparison) + `05-TECHNICAL-SPEC.md` § 2.1 (`servers/<suite>-mcp/`
  per-package contract).
- **Finding:** Tools are described per row with mode, description,
  endpoint, persona, profile-dep, citation. The manifest schema
  itself — the actual JSON shape an MCP server registers with
  `@modelcontextprotocol/sdk` — is implicit. PRD § 4 references
  "tool metadata (Zod schema + manifest)" and `06 § 7.2` says
  "tool's `mode` is declared in the tool registration (Zod schema
  + manifest entry)" but neither doc shows the canonical
  manifest entry shape. For E2 to ship 5-7 tools, the engineer
  needs to know:
  - What's the field name? `mode`? `executionMode`? `tier`?
  - What about `requiredProfileSchema` (per D-020 v2.0 gating)?
  - What about `incompleteWithoutProfile` for ⚠ tools (PRD
    § 3.1.1)?
  - What's the boot-time validator's contract for these fields?
  - How does the harness extract them from the SDK's tool
    registration?
  Without the manifest schema, every server author re-invents it,
  and the boot-time validation rule from D-020 (refuses tools
  whose `requiredProfileSchema` isn't satisfied) cannot land
  consistently.
- **Recommendation:** Add a `§ 3.0` subsection to `02-PRD.md`
  *before* § 3.1 with the canonical tool-manifest schema:

  ```ts
  export interface ToolManifestEntry {
    name: string;                          // carrier-vocabulary, kebab-case
    description: string;                   // operator-voice, "<question> · <when>"
    mode: ToolMode;                        // PRD § 4 contract
    inputSchema: z.ZodTypeAny;             // Zod, single source of truth
    requiredProfileSchema?: string;        // semver range, e.g. ">=v2.0"
    incompleteWithoutProfile?: boolean;    // ⚠ banner per PRD § 3.1.1
    persona: ReadonlyArray<number>;        // 002-DR-CRIT persona indices
    suiteServer: 'policycenter-mcp' | ...; // for cross-server tools
  }
  ```

  Add the corresponding Zod schema in
  `05-TECHNICAL-SPEC.md` § 3 as `ToolManifestEntrySchema`. ~45
  min edit; pays back in E2 + E2.5 + every subsequent epic.
- **Cite:** `02-PRD.md:95-258`, `05-TECHNICAL-SPEC.md:96-117`,
  `02-PRD.md:706-731` (D-020 reference).

### F-4 — `packages/auth/` package contract is thin; OAuth client lifecycle for multi-tenant deployments needs a section
- **Severity:** CHALLENGE
- **Section:** `05-TECHNICAL-SPEC.md` § 2.1 (`packages/auth/`
  row) + `02-PRD.md` § 6.1 (`auth.yaml`) + `03-ARCHITECTURE.md`
  § 3.5 (auth plane).
- **Finding:** The `packages/auth/` per-package contract row is:
  *Public API: `getOAuthClient(profile.auth)`, JWT propagation
  helpers; allowed: `openid-client`, `packages/observability`,
  `packages/schemas`; forbidden: `clients/**`, `packages/harness`,
  `servers/**`.* That's an under-specified API surface for a
  package that handles per-tenant OAuth client lifecycle, JWT
  refresh, JWKS rotation, and discovery-doc resolution. In the
  multi-tenant case (`03-ARCHITECTURE.md` § 7.2 "one server
  instance per profile"), each instance gets its own
  OAuth client — fine. But in single-process dev (the OSS demo
  default), what happens when a developer reloads a profile?
  Does `getOAuthClient` cache by profile slug? When does the
  cache invalidate? When the JWKS rotates (carriers do this
  frequently), how does the client refresh without dropping
  in-flight requests? These are the questions a backend engineer
  needs answered before E1 ships `packages/auth/`.
- **Recommendation:** Add to `05-TECHNICAL-SPEC.md` § 8.1 a
  "Per-tenant OAuth client lifecycle" subsection that states:
  - `getOAuthClient(auth: AuthConfig): Promise<OAuthClient>` —
    cache key is `(tenantId, oidcDiscoveryUrl, clientId)` tuple;
    cache invalidates on profile reload event.
  - JWKS refresh strategy: refresh on first `kid` not in cache;
    background refresh at 80% of JWKS TTL; refresh failures emit
    pino WARN + Sentry tag.
  - Token cache key is `(tenantId, actorId)`; eviction is
    LRU-bounded at 10k actors (configurable).
  - In-flight request handling on JWKS rotation: drain on rotate;
    new requests use new key.

  This goes in TECH-SPEC § 8 (security posture) rather than § 2
  (package contracts) because it's auth-policy not just package
  topology. ~45 min edit.
- **Cite:** `05-TECHNICAL-SPEC.md:105`, `02-PRD.md:732-746`,
  `03-ARCHITECTURE.md:524-543`.

### F-5 — Events plane queue topology is correct; backpressure under burst is unaddressed
- **Severity:** NOTE
- **Section:** `03-ARCHITECTURE.md` § 3.2 (async events plane),
  `05-TECHNICAL-SPEC.md` Stack table (BullMQ on Redis dev → Cloud
  Tasks / SQS prod), `02-PRD.md` § 6.9 (`events.yaml`).
- **Finding:** Webhook receiver → BullMQ on Redis (sharded by
  `primaryObject.id`) → suite MCP consumer is the right shape.
  At-least-once delivery with consumer-side idempotency keys is
  consistent with Guidewire App Events guarantees (per librarian
  KB § 3). The `delivery.shard_by: primaryObject.id` constraint
  is enforced by Zod refinement at boot — that's the right place.
  **What's missing:** what happens when a carrier's claim spike
  produces a burst that exceeds the suite MCP's consumption
  rate? BullMQ on Redis can backpressure; the architectural
  story doesn't state which back-pressure shape (drop oldest,
  refuse webhook with 503, queue grows unbounded). For E6 to
  ship, this needs a stated policy.
- **Recommendation:** Add to `03-ARCHITECTURE.md` § 3.2 (async
  events plane) a "Backpressure" paragraph:

  > "When the per-`primaryObject.id` queue depth exceeds a
  > profile-configured threshold (default 10k), the webhook
  > receiver returns HTTP 503 with `Retry-After`. Guidewire App
  > Events retries per its at-least-once contract; eventually the
  > consumer drains. Dropping events is never an option — the
  > read-side projection state-of-record is at risk if events are
  > lost."

  Optionally extend `events.yaml` (`02-PRD.md` § 6.9) with
  `delivery.queue_depth_threshold: int` (default 10000). ~20 min.
- **Cite:** `03-ARCHITECTURE.md:417-449`,
  `05-TECHNICAL-SPEC.md` Stack table row "Queue", `02-PRD.md`
  § 6.9.

### F-6 — Per-package boundaries cleanly enforce write-path isolation; cross-vendor isolation is also enforced and named
- **Severity:** PASS
- **Section:** `05-TECHNICAL-SPEC.md` § 2.1 (per-package
  contracts), `03-ARCHITECTURE.md` § 4 (boundaries table rule
  2 + rule 3).
- **Finding:** Three properties from a backend perspective are
  load-bearing for an OSS-tier multi-vendor integration platform:
  (1) writes travel through one and only one place (the harness);
  (2) vendor wrappers cannot import each other (One Inc and
  Smart Comms cannot see each other's modules); (3) the Cloud
  API client and vendor wrappers are peers, not nested. All
  three are explicitly forbidden in the per-package table + the
  boundaries table + depcruise rules. Cross-vendor isolation
  (rule 2) is the property a future `clients/<vendor>/` author
  will trip over first — they want to "share" a utility between
  One Inc and Smart Comms; the architecture refuses, and shared
  utilities live in `packages/observability/` or
  `packages/schemas/` instead. Right answer.
- **Recommendation:** None. When E5+ adds `clients/<vendor>/`
  packages, the depcruise rule flags the first cross-vendor
  import attempt. Hold the line on the rule even when the
  refactor "would be small."
- **Cite:** `05-TECHNICAL-SPEC.md:96-117`,
  `03-ARCHITECTURE.md:557-560` rules 1-3.

### F-7 — `packages/sentry-bead-bridge/` is post-E1 — confirm the dependency direction now to avoid late surprise
- **Severity:** NOTE
- **Section:** `05-TECHNICAL-SPEC.md` § 4.8 (Sentry → bead
  pipeline) + § 4.11 deferred items.
- **Finding:** § 4.8 describes a small `packages/sentry-bead-bridge/`
  package that turns sustained Sentry Issues into beads via the
  `claude_ai_Sentry` MCP + `bd-sync`. § 4.11 marks it as
  "post-E1." From a backend perspective, the dependency direction
  is the question: does this package *depend on* the harness, or
  is it standalone? If it depends on the harness, it must respect
  the layering rules (no `servers/**` import, no
  cross-`clients/**`, etc.). If it's standalone, it lives outside
  the workspace as a separate repo. The blueprint doesn't say.
- **Recommendation:** Add a one-line footnote to
  `05-TECHNICAL-SPEC.md` § 4.8: *"`packages/sentry-bead-bridge/`
  is allowed to import `packages/observability/` (for the
  `AppError` shape) but is forbidden from importing
  `packages/harness/`, `servers/**`, `clients/**`. It runs as a
  standalone Cloud Run service consuming Sentry webhooks; deployed
  per-tenant alongside the harness, not in-process."* ~5 min
  edit; resolves the dependency-direction question before the
  post-E1 author tries to "save lines" by sharing harness types.
- **Cite:** `05-TECHNICAL-SPEC.md:684-697` + § 4.11.

## Summary

Recommended actions in priority order:

1. **F-3 (CHALLENGE):** add canonical `ToolManifestEntry` schema
   to `02-PRD.md` § 3.0 + corresponding Zod schema in TECH-SPEC
   § 3. Closes a load-bearing gap for E2 implementation. ~45 min.
2. **F-4 (CHALLENGE):** add per-tenant OAuth client lifecycle
   subsection to `05-TECHNICAL-SPEC.md` § 8.1. Required before
   `packages/auth/` ships in E1. ~45 min.
3. **F-2 (NOTE):** add `HarnessError.code` extension policy
   paragraph to TECH-SPEC § 3.8. ~15 min.
4. **F-5 (NOTE):** add backpressure paragraph to ARCHITECTURE
   § 3.2 + optional `events.yaml.delivery.queue_depth_threshold`
   field. ~20 min.
5. **F-7 (NOTE):** add the dependency-direction footnote for
   `packages/sentry-bead-bridge/` in TECH-SPEC § 4.8. ~5 min.

PASS endorsements (F-1, F-6) are the contract-clarity and
boundary-enforcement properties — both load-bearing for E1's
foundation work. Hold the line on both as code lands.

E1 is unblocked from this lane, subject to F-3 + F-4 landing
before the corresponding package work begins. Both are blueprint
edits, not re-design.

jeremylongshore.com made me do it
  -claude
intentsolutions.io
