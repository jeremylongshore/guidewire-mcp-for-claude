# 10-GA — Guidewire Cloud API review (Mode B)

**Auditor:** `guidewire-api-archaeologist` (project-scoped)
**Date:** 2026-05-04
**Target:** `02-PRD.md` § 3 (every tool row's Cloud API
endpoint(s) column) + § 5.4 (`Plan.wire.dbTransactionId`) + § 6
(profile contract — esp. § 6.1 auth.yaml, § 6.3 lob.yaml, § 6.4
typelists.yaml, § 6.5 custom-entities.yaml, § 6.6 field-aliases.yaml,
§ 6.9 events.yaml), `03-ARCHITECTURE.md` § 3.2 (events plane), § 3.5
(auth plane), § 5.3 step 6 (the `GW-DBTransaction-ID` wire
behavior), `05-TECHNICAL-SPEC.md` § 5.5-5.6 (Composite vs Graph,
pagination), `004-DR-DEC` D-004 + D-008 + D-021,
`008-DR-MEMO-guidewire-api.md` (Mode A predecessor),
`00-LIBRARIAN-CITATION-AUDIT.md` (which I read carefully because
its corrections fix Mode-A drift in this lane).
**Scope:** Cloud API endpoint mapping correctness, App Events
delivery semantics + the `primaryObject.id` shard requirement,
Integration Gateway (IG) boundary discipline, OAuth + JWT
propagation auth model, Composite-vs-Graph correctness per suite,
typelist + custom-entity + LOB extension story, Money / date /
Address / Producer.code wire-format gotchas, the librarian-P1
two-key idempotency model, the librarian-P3 commission-endpoint
correction. **Out of scope:** harness internal contract semantics
(`harness-runtime-architect`); per-tool blast radius
(`mcp-safety-reviewer`).

---

## Verdict

**PASS-WITH-NOTES.** The librarian audit (P1-P5) cleaned up the
load-bearing API-correctness drift before this audit ran:
P1 (`Idempotency-Key` → `GW-DBTransaction-ID` two-key model)
landed in PRD § 5.4 + TECH-SPEC § 3.4.1 + ARCHITECTURE § 5.3
verbatim with the right semantic distinction (harness-side replay
short-circuit vs server-side `AlreadyExecutedException`); P2 (CC
has no Graph API → use Composite) landed in PRD § 3.2 + TECH-SPEC
§ 5.5 + 008 § 2; P3 (`whats-my-commission-status` →
`/admin/v1/commission-plans` not `/billing/v1/commission*`)
landed in PRD § 3.4 + 04-USER-JOURNEY § J-4 verbatim with
admin-scope OAuth implications named; P4 (BC has its own apiref
+ Composite API) landed in 008 § 2; P5 (pagination
AUTHORITATIVE) landed in TECH-SPEC § 5.6. D-021 reframed
"sandbox" honestly: dev-tier OAuth credentials + real
endpoints, not Guidewire-isolated-tenant. The findings below
are residual API-correctness items that surface only when
contract tests start running against real endpoints — most are
"sandbox-confirm at first integration engagement" items that
shouldn't block E1 but need to be tracked as known-residual so
the live-sandbox post-merge job (TECH-SPEC § 5.7) catches
drift.

## Findings

### F-1 — Two-key idempotency model is the cleanest articulation I've reviewed in a Cloud-API governance design
- **Severity:** PASS
- **Section:** `02-PRD.md` § 5.4 (the canonical contract) +
  `05-TECHNICAL-SPEC.md` § 3.4.1 (the table) +
  `03-ARCHITECTURE.md` § 5.3 step 6 (the wire-call narrative) +
  `00-LIBRARIAN-CITATION-AUDIT.md` § 3 P1.
- **Finding:** Pre-librarian-audit, the blueprint conflated
  Stripe-style replay-on-collision with Guidewire's
  `AlreadyExecutedException`-on-collision. Post-audit, the
  blueprint distinguishes:
  - `Plan.idempotencyKey` (`gwh1:` prefix) — harness-side
    Postgres cache key; replay short-circuit returns prior
    result; never reaches Guidewire.
  - `Plan.wire.dbTransactionId` — `GW-DBTransaction-ID` HTTP
    header on Cloud API write; Guidewire fails duplicate with
    `AlreadyExecutedException`; should never fire because the
    harness cache short-circuits first.
  - `HarnessError.code: 'GW_DBTRANSACTION_DUPLICATE'` —
    forensic-only; surfaces only on harness cache miss /
    cross-process race.
  This is the right architectural shape and matches the
  AUTHORITATIVE source ([IS Consumer Guide — Preventing
  duplicate database transactions](https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/Basic-REST-operations/request-headers/c_preventing-duplicate-database-transactions.html)).
  PRD § 5.4 + TECH-SPEC § 3.4.1 + ARCHITECTURE § 5.3 all carry
  the same model with the same vocabulary. From this lane's
  perspective, this is the single highest-leverage API-
  correctness property in the blueprint — most governance-
  claiming runtimes assume Stripe-style replay; this one
  models Guidewire's actual behavior.
- **Recommendation:** None. When E3 ships
  `packages/guidewire-client/`, the integration test must verify:
  (a) the wrapper injects `GW-DBTransaction-ID` on every write;
  (b) `dbTransactionId = sha256(idempotencyKey)` (64-hex, no
  prefix) per the documented derivation; (c) a forced replay
  through the Postgres cache returns prior result *and* never
  hits the wire. The post-merge live-sandbox job (TECH-SPEC § 5.7)
  catches contract drift if Guidewire ever changes the header
  contract.
- **Cite:** `00-LIBRARIAN-CITATION-AUDIT.md` § 3 P1,
  `02-PRD.md:482-522`, `05-TECHNICAL-SPEC.md:316-350`,
  `03-ARCHITECTURE.md:670-695`, `008 § 14` open question 2
  resolution.

### F-2 — Composite-vs-Graph correctness per suite is right; ClaimCenter `summarize-this-loss` uses Composite per librarian P2
- **Severity:** PASS
- **Section:** `02-PRD.md` § 3.2 (`summarize-this-loss` row
  endpoint column), `05-TECHNICAL-SPEC.md` § 5.5 (recordings
  schema constraint), `04-USER-JOURNEY.md` J-2 narrative,
  `008 § 2` per-suite module table, `00-LIBRARIAN-CITATION-AUDIT.md`
  P2.
- **Finding:** Pre-librarian-audit, `summarize-this-loss` was
  specified against Graph API expansion. CC 202411 has no Graph
  API module — only Admin / Async / Claim / Common / **Composite**
  / System Tools. The corrected mapping uses CC Composite API
  (`POST /composite/v1/composite`) which IS present in
  CC 202411. PRD § 3.2 carries the corrected endpoint with the
  citation; TECH-SPEC § 5.5 makes the recording-manifest schema
  constraint explicit (the `Endpoint` field for any CC suite
  recording must reference `/composite/v1/composite`); J-2's
  narrative says it explicitly: *"`summarize-this-loss` is
  **not** a Graph API call — ClaimCenter does not expose a Graph
  API module per librarian P2"*. PolicyCenter has both Graph
  and Composite (per `008 § 2`); CC has only Composite. The
  per-suite distinction is preserved.
- **Recommendation:** None. The recordings-lint validator from
  TECH-SPEC § 5.2 should fail on a CC recording whose
  `Endpoint` field references Graph; verify when E2.5/E7
  recordings land.
- **Cite:** `02-PRD.md:163-167` (§ 3.2 summarize-this-loss),
  `05-TECHNICAL-SPEC.md:862-882`, `04-USER-JOURNEY.md:201-219`
  (J-2), `008 § 2`, librarian P2.

### F-3 — `whats-my-commission-status` correctly hits `/admin/v1/commission-plans` per librarian P3; admin-scope OAuth implication needs surface in Mode B
- **Severity:** CHALLENGE
- **Section:** `02-PRD.md` § 3.4 (`whats-my-commission-status`
  endpoint column) + `04-USER-JOURNEY.md` J-4 narrative,
  `00-LIBRARIAN-CITATION-AUDIT.md` P3,
  `02-RED-TEAM-PANEL.md` F-RT-4.2.
- **Finding:** The endpoint is correct: BC commission plans live
  in the BC **Admin API**, not the Billing API. PRD § 3.4
  carries `/admin/v1/commission-plans` and notes "Admin scope,
  NOT billing scope (librarian audit P3)." J-4's narrative names
  the admin-scope implication explicitly: *"commission queries
  require **admin-scope OAuth**, not billing-scope. `auth.yaml`
  must declare admin scope explicitly for any producer running
  this tool."* The endpoint correction is intact across PRD,
  USER-JOURNEY, and 008. **What's residual:** the red team's
  F-RT-4.2 attack from the producer-CISO perspective —
  *"Granting admin scope at the OAuth layer means any call the
  harness makes carries the broader scope; `roles.yaml` is
  harness-side filtering, not Guidewire-side. My CISO will eat
  me alive."* The red team recommended adding to TECH-SPEC § 8.5
  (threat model) an explicit row for "OAuth admin scope
  (commission reads) → harness-scope-filtered, not Guidewire-
  scope-filtered" with a mitigation: `roles.yaml` boot validation
  rejects if a producer-tier role has a tool whose endpoint
  isn't producer-code-scopable, and the harness audit chain
  captures every admin-scope call distinctively. That
  recommendation has not landed.
- **Recommendation:** Add to TECH-SPEC § 8.5 (threat model) the
  red-team-recommended row:

  > "Admin-scope OAuth surface (commission reads, etc.) →
  > harness-scope-filtered, not Guidewire-scope-filtered.
  > Mitigation: `roles.yaml` boot validation refuses any
  > producer-tier role with a tool whose endpoint cannot be
  > producer-code-scoped at the harness layer. Every admin-scope
  > call writes a distinct `audit_entries` row with
  > `oauth_scope: admin` for forensic review."

  Add a corresponding `oauth_scope` field to the read-side audit
  row schema in PRD § 4.1 (the row on Audit emitted). ~30 min
  edit. Closes red-team F-RT-4.2 from this lane.
- **Cite:** `02-PRD.md:204` (§ 3.4 whats-my-commission-status),
  `04-USER-JOURNEY.md:485-496` (J-4),
  `00-LIBRARIAN-CITATION-AUDIT.md` P3,
  `02-RED-TEAM-PANEL.md` F-RT-4.2.

### F-4 — App Events `primaryObject.id` shard discipline is enforced via Zod refinement at boot
- **Severity:** PASS
- **Section:** `02-PRD.md` § 6.9 (`events.yaml` validation rule)
  + `03-ARCHITECTURE.md` § 3.2 (events plane sharding) +
  `004-DR-DEC` D-004 + `008 § 7` + librarian KB
  `005-DR-REF` § 3.
- **Finding:** App Events delivers at-least-once with safe
  ordering by primary object (verbatim from the AUTHORITATIVE
  overview at `docs.guidewire.com/education/cloud-integration-basics/.../appevents_overview/`).
  Cross-claim ordering is NOT guaranteed; in-claim ordering IS.
  PRD § 6.9 enforces this as a Zod boot validation rule:
  *"`shard_by` must equal `primaryObject.id` (any other value is
  a CI failure)."* ARCHITECTURE § 3.2 carries the consumer-side
  shape: BullMQ on Redis sharded by `primaryObject.id`; suite
  MCPs consume per-shard. The 9th profile YAML (`events.yaml`)
  added per `008 § 7` recommendation is the right place for
  the per-tenant subscription configuration. Tools never
  subscribe to App Events at call-time; the events store is
  query-only over what arrived. D-004 + D-021 + 008 § 7 all
  preserve the IG-vs-MCP boundary correctly.
- **Recommendation:** None. When E6 ships, the integration test
  for the events-receiver must verify:
  (a) `delivery.shard_by: primaryObject.id` is enforced at boot
  (Zod refinement test);
  (b) cross-claim events arrive out-of-order at the consumer
  but per-claim events arrive in-order (testcontainers BullMQ
  test);
  (c) `events-mcp` query tools never trigger a re-subscription
  (depcruise rule on the events-mcp source).
- **Cite:** `02-PRD.md:945-953` (§ 6.9),
  `03-ARCHITECTURE.md:430-449`, `008 § 7`, librarian KB
  `005-DR-REF` § 3.

### F-5 — Money / date / Address / Producer.code wire-format gotchas: profile contract carries them; one residual question on Address shape
- **Severity:** NOTE
- **Section:** `02-PRD.md` § 6.6 (`field-aliases.yaml` —
  `money_fields` + `date_fields` blocks) + `008 § 11`.
- **Finding:** PRD § 6.6 declares per-carrier `money_fields`
  + `date_fields` mappings explicitly, and the prose carries the
  `008 § 11` constraints verbatim: Money is
  `{ amount: string, currency: string }` (`amount` as string for
  arbitrary precision); date-only vs datetime is per-field;
  `Producer.code` uniqueness is per-carrier (declared in
  `field-aliases.yaml`); stripping currency is a catastrophic
  error (008 § 12 "avoid" item 5 + ARCHITECTURE § 4 boundaries
  table). **Residual:** the Address gotcha from `008 § 11` was
  *"the assumption that every Address has `street1` is WRONG.
  Some carriers use a single `streetAddress`; some use a
  structured `streetLines: string[]`."* PRD § 6.6 lists Account /
  Producer / Claim aliases but does not carry an Address shape
  entry. The PII policy at § 6.8 references `Account.namedInsured`
  + `Account.contactInfo[*].email` but not Address paths. From
  an API-correctness perspective, when a carrier's tenant
  Swagger emits a structured `streetLines` Address, the harness
  needs to know — both for `pii-policy.yaml` field-path
  accuracy and for the field-aliases.yaml's redactable-field
  declarations.
- **Recommendation:** Add to `02-PRD.md` § 6.6 a sub-block:

  ```yaml
  address_shape:                     # carrier-defined; declare per profile
    Account.contactInfo[*].address:
      shape: structured              # 'flat' (street1/2) | 'structured' (streetLines[])
      pii_classification: medium_pii
      fields:
        - streetLines[*]
        - city
        - state
        - postalCode
  ```

  And update `pii-policy.yaml` examples in PRD § 6.8 to reference
  the address fields by their per-carrier shape via the alias
  in `address_shape`. ~20 min edit; closes the 008 § 11 Address
  gotcha at the schema layer.
- **Cite:** `02-PRD.md:837-872` (§ 6.6 field-aliases.yaml),
  `008 § 11`.

### F-6 — Eventual-consistency / read-after-write trap (`008 § 9`) is unstated in the blueprint failure-mode tables
- **Severity:** CHALLENGE
- **Section:** `03-ARCHITECTURE.md` § 6 (failure modes table) +
  `02-PRD.md` § 4.1 (mode comparison "Failure modes & recovery"
  row) + `008 § 9`.
- **Finding:** The Mode A memo § 9 named a real Cloud API
  pattern: writes return 202 Accepted with a job ID; subsequent
  GETs may return stale state for several seconds (typical
  1-5s; observed up to 30s under load). Reserve changes follow
  the same pattern. App Events fire AFTER the read consistency
  window closes; consuming the App Event is the canonical
  "the write is durable" signal. The recommendation in 008 § 9
  was: harness ships a `confirmWrite()` helper that abstracts
  three options into one decision per tool, profile-driven on
  which mode the carrier wants. None of this lands in the
  blueprint:
  - PRD § 5.4 (execute) doesn't mention read-after-write.
  - ARCHITECTURE § 6 failure-mode table doesn't include "stale
    read after write" as a named failure.
  - TECH-SPEC § 3.4 doesn't expose a `confirmWrite()` API on
    the harness.
  This is a real `approved_execute` failure mode: an operator
  reconciles a payment, the harness writes
  `execute.completed`, the agent does an immediate read-back to
  confirm, and the read returns stale state — the operator
  reads "the payment is still on the wrong account" and re-tries
  the reconcile. The replay short-circuit catches the duplicate,
  good. But the operator's mental model is broken: they think
  the write failed.
- **Recommendation:** Add to `02-PRD.md` § 5.4 (post the
  idempotency story) a new sub-section "Read-after-write
  consistency":

  > "Cloud API writes return 202 Accepted with an Async API job
  > ID; subsequent reads may return stale state for several
  > seconds. The harness ships a `confirmWrite(plan, options)`
  > helper that takes one of three confirmation strategies per
  > the carrier's `profile.yaml`:
  > (a) trust the 202 + emit `execute.completed`;
  > (b) poll `/async/v1/jobs/{asyncJobId}` until terminal;
  > (c) wait for the corresponding App Event before emitting
  > `execute.completed`. Default for OSS demo: (a)."

  Add to ARCHITECTURE § 6 failure-mode table a row "Stale read
  after write — Detection: Async API status `RUNNING`; Behavior:
  per `confirmWrite` strategy; Recovery: operator polls / waits
  for App Event." Add to TECH-SPEC § 3 a `confirmWrite` interface
  signature. ~45 min edit; closes 008 § 9's primary
  recommendation.
- **Cite:** `008 § 9`, `02-PRD.md:455-522` (§ 5.4),
  `03-ARCHITECTURE.md:712-741`.

### F-7 — UWCenter rule entity dependency for `whats-our-appetite-on-this-risk` and `explain-why-this-got-referred` is correctly scoped via the ⚠ banner; some fact-checker overlap
- **Severity:** PASS-with-followup
- **Section:** `02-PRD.md` § 3.1.1 (line UW view) + librarian
  F-PRD-005 + `008 § 3.1`.
- **Finding:** The two ⚠ tools (`whats-our-appetite-on-this-risk`
  and `explain-why-this-got-referred`) carry an
  "incomplete-without-profile" banner per PRD § 3.1.1 and
  surface a structured `profile_incomplete_for_this_carrier`
  refusal until the customer's `typelists.yaml` +
  `custom-entities.yaml` resolve the UWCenter rule entity
  shapes. They ship runnable in E2 against the sandbox tenant
  whose profile is complete; they ship inert against any
  incomplete profile. This is the right design — the tools
  exist in the catalog at E2 close (so the catalog's vocabulary
  story is intact), but they refuse honestly when the profile
  hasn't been authored. **Followup:** the librarian-audit's
  F-PRD-005 noted that `/job/v1/jobs/{id}/uwIssues` is
  practitioner knowledge — the sub-resource path appears in
  Guidewire training materials and community references but is
  not directly cited in the public apiref summary pages. PRD
  § 3.1.1 carries the endpoint; the `(unverified — sandbox-confirm
  at guidewire-adj)` tag has been reworded per D-021 to
  `(unverified — practitioner knowledge from public docs;
  smoke-test reachability with dev-tier creds; first integration
  engagement validates production)`.
- **Recommendation:** When E1's `smoke-reach.ts` runs against
  dev-tier creds (per D-021 + ROADMAP § E1 exit criteria), it
  should specifically attempt `GET /job/v1/jobs/{some-job-id}/uwIssues`
  against the dev tier and report whether the endpoint resolves.
  If not, the ⚠ banner flips for that tool from "incomplete-
  without-profile" to "endpoint-not-reachable" and the tool
  remains inert. Add this to ROADMAP § E1 exit criteria
  smoke-test enumeration. ~10 min.
- **Cite:** `02-PRD.md:128-132` + `02-PRD.md:138-145`
  (§ 3.1.1), librarian F-PRD-005, `008 § 3.1`, D-021.

## Summary

Recommended actions in priority order:

1. **F-6 (CHALLENGE):** add read-after-write consistency
   sub-section to PRD § 5.4 + new failure row to ARCHITECTURE §
   6 + `confirmWrite` interface in TECH-SPEC § 3. Closes 008 § 9
   primary recommendation. ~45 min.
2. **F-3 (CHALLENGE):** add admin-scope OAuth threat-model row
   to TECH-SPEC § 8.5 + `oauth_scope` audit field to PRD § 4.1.
   Closes red-team F-RT-4.2. ~30 min.
3. **F-5 (NOTE):** add `address_shape` block to PRD § 6.6 and
   reference from § 6.8's PII policy examples. Closes 008 § 11
   Address gotcha. ~20 min.
4. **F-7 followup (NOTE):** extend ROADMAP § E1 smoke-reach.ts
   coverage to include the `/uwIssues` sub-resource. ~10 min.

PASS endorsements (F-1, F-2, F-4, F-7-main) are durable and
load-bearing. The two-key idempotency model (F-1) and the
Composite-vs-Graph per-suite distinction (F-2) are the two
properties that make the wire-level governance correct.

E1 is unblocked from this lane. F-6 is the largest residual
edit; F-3 closes a red-team finding; F-5 + F-7 followup are
small.

jeremylongshore.com made me do it
  -claude
intentsolutions.io
