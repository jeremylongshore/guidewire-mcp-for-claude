# 008-DR-MEMO — Guidewire Cloud API archaeologist memo (Mode A)

**Filed:** 2026-05-04
**Author:** `guidewire-api-archaeologist` (specialist agent, Mode A — Phase 0 Day 3 design memo)
**Bead:** `guidewire-mgn`
**Feeds blueprint sections:** GW-1.2 (PRD content) · GW-1.3 (architecture) · GW-1.10 (testing policy + recordings strategy)
**Status:** Phase 0 design memo — pre-sandbox. Findings here are public-docs-grounded; sandbox-blocked items are flagged inline so `fact-checker` can route them.

---

## How to read this memo

This memo answers, for the proposed v4 tool catalog, the eleven-point rubric in
[`.claude/agents/guidewire-api-archaeologist.md`](../.claude/agents/guidewire-api-archaeologist.md):
endpoint mapping correctness, customer-config dependence, pagination,
eventual consistency, App Events vs polling, IG boundary, auth, and
the per-customer-config gotchas (LOB inheritance, typelist drift,
Money typing, custom-entity traversal).

Two notation conventions:

- **AUTHORITATIVE** = sourced from `docs.guidewire.com`, `www.guidewire.com`,
  or `developer.guidewire.com` with a release-versioned URL.
  **community-mirror** = third-party documentation (treat as orientation
  only). **Practitioner knowledge** = grounded in published API surface
  + Guidewire Cloud Platform conventions but not directly quoted from a
  public page; flagged so it can be re-verified post-sandbox.
- Cloud release versions: `202302` Innsbruck, `202411` Las Leñas (CC),
  `202503` Las Leñas (PC), `202603` InsuranceSuite cross-suite docs
  (Palisades-track, current as of 2026-05). **Always cite the
  release-versioned path; never `latest/` (per librarian's standing
  instruction in `005-DR-REF`).**

---

## 1. The center-of-gravity claim, restated for record

The v4 architecture (`003-DR-ARCH`, decision D-001) says: **tool names
are carrier-vocabulary, not API verbs.** From an API correctness
perspective, that decision is *not* a free pass. A tool named
`whats-our-appetite-on-this-risk` still calls real Cloud API endpoints
underneath, and if those endpoint mappings assume a portable shape
that doesn't survive contact with carrier configuration, the tool
returns garbage on half the book — the persona-1 indictment, verbatim.

Carrier-vocabulary on top, profile-driven mappings underneath. The
profile is where API correctness is enforced. **There is no working
tool without a complete `profiles/<customer>/` set of mappings.**
Every tool in §3 below is annotated with the profile keys it consumes.

---

## 2. Cloud API surface — the modules each MCP server lives over

Per the PolicyCenter 202503 reference
([AUTHORITATIVE](https://docs.guidewire.com/cloud/pc/202503/apiref/),
verified 2026-05-04), the PolicyCenter Cloud API ships with these
modules:

| Module | Role for our project |
|---|---|
| **Account API** | Account-level reads — `policycenter-mcp` and `producer-mcp` consume |
| **Admin API** | User / role / org reads — bootstrap-only; never in conversational tool surface |
| **Async API** | Long-running job tracking — `approved_execute` writes that exceed sync timeouts must check this |
| **Common API** | **Typelists** + reference data — every tool that emits enum-shaped fields hits Common |
| **Policy API** | Policy graph reads — primary surface for `policycenter-mcp` reads |
| **Composite API** | Batched / chained calls — see §6 below; relevant for tools that need multi-graph reads in one round trip |
| **Graph API** | Object-graph reads — relevant for `summarize-this-loss` and similar wide-fan-out tools |
| **Job API** | Submission / renewal / endorsement / cancellation jobs — primary surface for *write-shaped* PolicyCenter tools (E5+) |
| **Product Definition API** | LOB / coverage / coverage-term metadata — **the profile-generation source of truth** for `lob.yaml` |
| **System Tools API** | Diagnostics / hot-reload — never in tool surface; debug only |

ClaimCenter 202411 reference
([AUTHORITATIVE](https://docs.guidewire.com/cloud/cc/202411/apiref/),
verified 2026-05-04) ships **Admin / Async / Common / Claim / System
Tools**. BillingCenter is documented under the InsuranceSuite
cross-suite docs at `docs.guidewire.com/cloud/is/202603/cloudapibf/`
([AUTHORITATIVE](https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/Basic-REST-operations/introduction-to-Cloud-API/c_endpoints.html)).

**Mapping the v4 servers → modules:**

| Server | Primary modules | Secondary |
|---|---|---|
| `policycenter-mcp` | Policy, Account, Job, Common (typelists), Product Definition (boot only) | Composite, Graph, Async (writes) |
| `claimcenter-mcp` | Claim, Common, Account | Async, Composite |
| `billingcenter-mcp` | (BillingCenter REST under IS docs) | Common |
| `producer-mcp` | Account, Policy (read), Job (read) | Common |
| `events-mcp` | (App Events stream — not a Cloud API module; see §7) | Async (replay) |

**Practitioner knowledge:** the Cloud API exposes Swagger 2.0 specs
per module, generated from the carrier's product configuration. The
`apiref/` page explicitly states the APIs are "built using the Swagger
2.0 Specification" (verified 2026-05-04). This means **per-customer
endpoint paths and field sets are emitted by the customer's tenant
build** — the public docs reference is the *base* shape; carrier-
specific shape only lands when sandbox lands. Any tool that hard-codes
a field name not present in the base Swagger is asking for a runtime
404 / 422 in production.

---

## 3. Per-tool API mapping — proposed catalog (PRD §3)

For every tool in `02-PRD.md` §3, I list (a) the Cloud API endpoint(s)
underneath, (b) the profile keys it consumes, (c) the per-customer
config dependence, (d) read-after-write or eventual-consistency
concerns, (e) recording-priority rank for first batch.

### 3.1 `policycenter-mcp` (E2 + E5)

#### `find-submissions-waiting-on-me` — `read_only`

- **Endpoint(s):** `GET /job/v1/jobs?subtype=Submission&assignedToMe=true&status=Open`
  (path/parameter shape derived from PolicyCenter Job module, 202503;
  exact filter param names are practitioner knowledge — verify post-sandbox).
- **Profile keys:** `roles.yaml` (which JobSubtype values count as
  "submission" per carrier — some carriers add `LineSlip`,
  `BoundQuote`, etc.); `field-aliases.yaml` (carrier may rename
  `assignedToMe` semantics).
- **Per-customer config:** `JobSubtype` is a typelist; carriers
  extend it. Acme's "submission" may be Beta's "NewBusinessQuote".
- **Pagination:** Job list endpoints return cursor-paginated
  collections. Tool MUST iterate transparently; never expose
  cursor to the agent (see §5).
- **Eventual consistency:** N/A (read-only).
- **Recording priority:** **HIGH** — first batch. This is the
  flagship E2 demo tool.

#### `whats-our-appetite-on-this-risk` — `read_only`

- **Endpoint(s):** combines `GET /policy/v1/policies` filtered by
  insured + LOB, `GET /admin/v1/users/{userId}/permissions`, and
  carrier-defined appetite rules (most carriers store these in
  UnderwritingCenter, accessed via `/policy/v1/...` per
  PolicyCenter integration with UWCenter — practitioner knowledge,
  verify post-sandbox).
- **Profile keys:** `lob.yaml` (LOB → appetite rule set);
  `custom-entities.yaml` (UWCenter rule entity name varies);
  `roles.yaml` (who can see appetite rationale).
- **Per-customer config:** **highest variance tool in the catalog.**
  UWCenter is the area of Guidewire most heavily customized.
  Implementation MUST be profile-driven from line one. Suggest
  this tool ships in E5 (not E2) so its profile contract is
  written against >1 sandbox tenant.
- **Pagination:** N/A for the rule trace; HIGH for the policy
  history collection.
- **Recording priority:** **MEDIUM** — defer to E5 when multiple
  sandbox tenants are accessible.

#### `show-policies-for-this-insured` — `read_only`

- **Endpoint(s):** `GET /account/v1/accounts/{accountId}/policies`
  AND `GET /policy/v1/policies?accountId={accountId}` (the
  account-scoped reads are AUTHORITATIVE per the Account + Policy
  module structure; exact path resolution post-sandbox).
- **Profile keys:** `field-aliases.yaml` (carrier may rename
  "insured" to "named insured" or "policyholder"); `lob.yaml`
  (cross-LOB display rules).
- **Per-customer config:** `Account.contactRoles` typelist is
  extended per carrier. "Insured" is the most common value but
  not the only one.
- **Pagination:** cursor-paginated.
- **Eventual consistency:** N/A.
- **Recording priority:** **HIGH** — second-tier demo tool.

#### `summarize-this-submission` — `read_only`

- **Endpoint(s):** `GET /job/v1/jobs/{jobId}` + Composite request
  pulling related contacts, locations, coverages. **Composite API
  is the right call here** — one round trip vs. five.
- **Profile keys:** `field-aliases.yaml`, `pii-policy.yaml` (the
  summary text may contain PII; redaction rules vary).
- **Pagination:** N/A for the single-job read; relevant for
  associated coverage list.
- **Recording priority:** **HIGH** — first batch.

#### `did-we-lose-this-account` — `read_only`

- **Endpoint(s):** `GET /policy/v1/policies?accountId={accountId}&status=Cancelled,Lapsed,Lost`
  + cancellation reason traversal via `GET /policy/v1/policies/{id}/transactions`.
- **Profile keys:** `typelists.yaml` (`PolicyTermStatus` and
  `CancellationReason` are extended per carrier — Acme's "lost to
  competitor" may be Beta's "non-renewal_competitor_quote").
- **Per-customer config:** **HIGH** — `CancellationReason` is one
  of the most-extended typelists across carriers. This tool is a
  poster-child for typelist drift.
- **Recording priority:** **MEDIUM** — useful but not blocking E2 demo.

#### `explain-why-this-got-referred` — `read_only`

- **Endpoint(s):** `GET /job/v1/jobs/{jobId}/uwIssues` + carrier-
  specific UW rule trace endpoint (varies per UWCenter setup).
- **Profile keys:** `custom-entities.yaml` (UW issue entity
  shape); `field-aliases.yaml`.
- **Per-customer config:** **HIGHEST.** UW rule traces are
  *entirely* carrier-defined. This tool likely ships partial in
  E2 and gets a per-carrier finish in onboarding.
- **Recording priority:** **LOW** — defer; mark as post-sandbox.

#### `draft-referral-note` — `draft_only` (E5)

- **Endpoint(s):** READ side: `GET /job/v1/jobs/{jobId}` + UW issues
  read above. **No write to Guidewire** in `draft_only` mode —
  draft is composed in-process and returned as artifact.
- **Profile keys:** `field-aliases.yaml`, `pii-policy.yaml`,
  `roles.yaml` (who can request a draft).
- **Per-customer config:** moderate (template tone varies).
- **Recording priority:** **HIGH** for the read inputs.

#### `propose-endorsement` — `draft_only` (E5)

- **Endpoint(s):** READ side: `GET /policy/v1/policies/{policyId}` +
  `GET /policy/v1/policies/{id}/coverages`. The proposed endorsement
  is the *plan artifact* (per harness contract); only when promoted
  to `approved_execute` does it call `POST /job/v1/jobs` with
  subtype `PolicyChange`.
- **Profile keys:** `lob.yaml`, `typelists.yaml` (`CoverageType`
  values are extended per carrier — heavily), `approval-matrix.yaml`
  (which endorsement amounts gate on which approver tier).
- **Per-customer config:** **HIGH.** Endorsement workflows are
  per-LOB, per-state, per-broker.
- **Eventual consistency (when promoted to write):** the
  endorsement job creation returns 202 Accepted with a job ID;
  reading back `GET /job/v1/jobs/{jobId}` immediately after may
  return stale state for several seconds. Tool MUST poll the job
  status with backoff before treating the write as confirmed.
- **Recording priority:** **HIGH** for read; **MEDIUM** for write.

### 3.2 `claimcenter-mcp` (E7)

#### `find-claims-at-risk-of-leakage` — `read_only`

- **Endpoint(s):** `GET /claim/v1/claims?status=Open` filtered by
  carrier-defined leakage indicators (reserves vs. exposure
  estimate, days-open thresholds, missing investigations).
- **Profile keys:** `custom-entities.yaml` (carriers often define
  `LeakageRiskScore` as a custom entity); `lob.yaml`; `roles.yaml`.
- **Per-customer config:** **HIGH.** "Leakage" is not a Guidewire
  out-of-the-box concept; it's a carrier KPI.
- **Recording priority:** **MEDIUM**.

#### `summarize-this-loss` — `read_only`

- **Endpoint(s):** **Graph API call** — this is the canonical
  Graph use case. `GET /claim/v1/claims/{claimId}` with Graph
  expansion to pull exposures, reserves, activities, documents,
  notes in one round trip.
- **Profile keys:** `field-aliases.yaml`, `pii-policy.yaml`
  (claim notes contain heavy PII), `custom-entities.yaml`.
- **Per-customer config:** moderate. Claim graph shape is more
  stable than UWCenter rule shape, but exposure types extend.
- **Recording priority:** **HIGH** — first batch (E7 anchor).

#### `whats-the-reserve-picture` — `read_only`

- **Endpoint(s):** `GET /claim/v1/claims/{claimId}/reserves` +
  `GET /claim/v1/claims/{claimId}/exposures`.
- **Profile keys:** `lob.yaml`, `typelists.yaml`
  (`ReserveCategory`, `ExposureType` — both extended).
- **Per-customer config:** **HIGH.** Reserve categories are
  often LOB-specific and carrier-extended.
- **Money typing:** **CRITICAL.** Reserves are returned as
  Money-typed fields with `{amount, currency}` shape (per Guidewire
  Cloud API conventions — practitioner knowledge, but standard
  across InsuranceSuite). Tool MUST NOT strip currency on
  serialization; profile `field-aliases.yaml` MUST preserve the
  Money structure.
- **Recording priority:** **HIGH** — first batch.

#### `draft-denial-letter` — `draft_only`

- **Endpoint(s):** READ: claim graph (per `summarize-this-loss`).
  Smart Comms / template engine integration is **out of API plane**
  — this is a draft artifact, not a Smart Comms render call.
- **Profile keys:** `roles.yaml`, `pii-policy.yaml`,
  `typelists.yaml` (`LossCause`, `DenialReason` — both extended).
- **Per-customer config:** **HIGH** on `DenialReason` typelist.
- **Recording priority:** **MEDIUM** for read inputs.

### 3.3 `billingcenter-mcp` (E8)

#### `show-overdue-accounts` — `read_only`

- **Endpoint(s):** BillingCenter `GET /billing/v1/accounts?delinquencyStatus=...&producerCode=...`
  (path shape practitioner knowledge — BC Cloud API less heavily
  documented in the public refs than PC/CC; verify post-sandbox).
- **Profile keys:** `field-aliases.yaml` (`producerCode` vs
  `agencyCode` vs `brokerNumber`); `roles.yaml`.
- **Per-customer config:** **CRITICAL** — `Producer.code`
  uniqueness is **not** a portable assumption. Some carriers
  scope producer codes by region; others use globally unique
  codes; some have parent/child code hierarchies. Profile MUST
  declare the producer code uniqueness model.
- **Recording priority:** **MEDIUM**.

#### `whats-the-payment-status` — `read_only`

- **Endpoint(s):** `GET /billing/v1/accounts/{accountId}/invoices`
  + `GET /billing/v1/accounts/{accountId}/payments`.
- **Profile keys:** `field-aliases.yaml`, `typelists.yaml`
  (`PaymentMethod`, `PaymentStatus`).
- **Money typing:** payments are Money-typed.
- **Recording priority:** **HIGH**.

#### `find-billing-issues-for-this-policy` — `read_only`

- **Endpoint(s):** cross-call between `/policy/v1/policies/{id}` →
  `BillingCenter /billing/v1/accounts/{accountId}/...`. Crosses
  suite boundaries; cannot use Composite API (Composite is
  intra-suite).
- **Profile keys:** `field-aliases.yaml`, `lob.yaml`.
- **Per-customer config:** moderate.
- **Recording priority:** **MEDIUM**.

#### `reconcile-this-payment` — `approved_execute`

- **Endpoint(s):** READ: payment + invoice. WRITE:
  `POST /billing/v1/payments/{paymentId}/applications` (path shape
  practitioner knowledge — verify).
- **Profile keys:** `approval-matrix.yaml` (reconciliation amount
  thresholds), `roles.yaml`, `pii-policy.yaml`.
- **Per-customer config:** **HIGH** on approval matrix.
- **Eventual consistency:** payment apply is async; idempotency
  key required (per harness D-005). Read-back of the application
  may show stale state for 2-5 seconds; tool MUST poll.
- **Recording priority:** **HIGH** for read; **MEDIUM** for write
  (defer until E8 + safe sandbox).

### 3.4 `producer-mcp` (E9)

#### `show-my-book-of-business` — `read_only`

- **Endpoint(s):** `GET /policy/v1/policies?producerCode={code}` +
  `GET /account/v1/accounts?producerCode={code}`.
- **Profile keys:** `roles.yaml` (producer scope), `field-aliases.yaml`.
- **Per-customer config:** producer code uniqueness model again
  (see `show-overdue-accounts`).
- **Recording priority:** **MEDIUM**.

#### `whats-my-commission-status` — `read_only`

- **Endpoint(s):** BillingCenter commission endpoints — exact
  paths under `/billing/v1/commission*` (practitioner knowledge,
  BC docs are lighter; verify).
- **Profile keys:** `lob.yaml`, `typelists.yaml`,
  `pii-policy.yaml` (commission amounts are sensitive).
- **Per-customer config:** **HIGH.** Commission rules are
  contract-specific.
- **Money typing:** all commission amounts Money-typed.
- **Recording priority:** **LOW** — defer to E9.

#### `find-my-pending-quotes` — `read_only`

- **Endpoint(s):** `GET /job/v1/jobs?subtype=Submission&status=Quoted&producerCode={code}`.
- **Profile keys:** `roles.yaml`, `typelists.yaml`.
- **Recording priority:** **LOW** — E9.

### 3.5 `events-mcp` (E6, query-only)

#### `replay-event` — `read_only`

- **Endpoint(s):** **NOT a Cloud API call.** Reads from the
  internal queue (BullMQ in dev, Cloud Tasks/SQS in prod) and the
  audit store. App Events ingestion lands in infra (per D-004);
  this tool inspects what arrived.
- **Profile keys:** `roles.yaml` (event-replay permission).
- **Recording priority:** N/A — recordings are App Event payloads
  captured at ingestion, not Cloud API HTTP recordings. See §7.

#### `find-events-for-claim` — `read_only`

- **Endpoint(s):** internal events store query.
- **Profile keys:** `roles.yaml`, `pii-policy.yaml`.
- **Recording priority:** N/A (same as above).

---

## 4. Profile template requirements — what `profiles/_template/` MUST contain

The `profiles/_template/` directory does not yet exist (verified
2026-05-04). Below is the prescription for what each YAML file
needs, derived from the per-tool dependence table in §3. **Every
file must round-trip through Zod schemas in `packages/schemas/`** —
no executable code in profiles, validated at boot (per D-007).

### 4.1 `auth.yaml`

```yaml
# Guidewire Hub OAuth (per Cloud API Consumer Guide;
# specific token endpoints vary per tenant — discovered via
# OpenID Connect well-known when available).
oauth:
  client_id_env: GUIDEWIRE_CLIENT_ID    # name of env var, never the value
  client_secret_env: GUIDEWIRE_CLIENT_SECRET
  token_endpoint: https://<tenant>.guidewire.com/oauth2/token
  scopes:
    - policy.read
    - claim.read
    - billing.read
    # write scopes appended only when approved_execute mode is enabled
  token_lifetime_seconds: 3600        # default; tenant-overridable
  refresh_strategy: proactive          # refresh at 80% of lifetime
  jwt_propagation:
    enabled: true                      # propagate user JWT downstream
    actor_claim: sub                   # which claim carries actor_id
api:
  base_url_pc: https://<tenant>.guidewire.com/pc/rest
  base_url_cc: https://<tenant>.guidewire.com/cc/rest
  base_url_bc: https://<tenant>.guidewire.com/bc/rest
  cloud_release: Las Leñas             # PC 202503, CC 202411 — pin per tenant
```

**Rationale:** Persona 5 (CISO) demands no standing service-account
credentials. JWT propagation per-tool means the carrier's user
identity flows to Guidewire — auth decisions stay in the carrier's
OAuth provider, not in our service-account. Token lifetime is
documented per-tenant; assume 1 hour as a starting default but
profile-overridable. **Refresh strategy must be proactive (80% of
lifetime)** because in-flight `approved_execute` writes cannot afford
a mid-write 401.

### 4.2 `roles.yaml`

```yaml
# Map carrier roles to tool/mode permission sets.
roles:
  CL_Underwriter:
    policycenter-mcp:
      find-submissions-waiting-on-me: read_only
      whats-our-appetite-on-this-risk: read_only
      draft-referral-note: draft_only
    claimcenter-mcp: {}                # no claim access
  Claims_Adjuster_I:
    claimcenter-mcp:
      summarize-this-loss: read_only
      whats-the-reserve-picture: read_only
      draft-denial-letter: draft_only
  Claims_Adjuster_II:
    claimcenter-mcp:
      # everything Adjuster_I has, plus:
      reconcile-this-payment: approved_execute    # gated via approval-matrix
```

**Rationale:** roles are profile-mapped because Guidewire role names
are not portable across carriers (Acme's `CL_Underwriter` is Beta's
`Comm_UW_L1`). The agent never sees the carrier role names — it sees
the tool catalog scoped per actor.

### 4.3 `lob.yaml`

```yaml
# Map carrier LOB codes to canonical product family + UWCenter rule
# set + relevant typelist subsets.
lob_mappings:
  CL_PROP:                             # carrier code
    canonical: CommercialProperty      # cross-carrier label
    uwcenter_rule_set: AcmeCommProp    # per-carrier rule entity
    coverage_typelist: AcmeCovType     # per-carrier coverage typelist
  CL_GL:
    canonical: GeneralLiability
    uwcenter_rule_set: AcmeGL
    coverage_typelist: AcmeGLCovType
  BOPProperty:                         # different carrier, "same" LOB
    canonical: CommercialProperty
    uwcenter_rule_set: BetaBOPProp
    coverage_typelist: BetaBOPCovType
```

**Rationale:** the persona-1 attack — "Acme's `CL_PROP` may be Beta's
`BOPProperty`." Profile is the *only* place this mapping lives.
Tools NEVER hard-code LOB codes. The `canonical` value is what flows
into tool inputs; the carrier code is what flows into Cloud API calls.

### 4.4 `typelists.yaml`

```yaml
# Per-typelist value mappings. Base catalog is portable; carrier
# extensions are not. List every typelist any tool emits, with the
# carrier's actual values.
typelists:
  LossCause:
    source: customer_extended          # vs base
    base_uri: https://docs.guidewire.com/cloud/cc/202411/apiref/...
    values:                            # carrier's full set
      - code: 1_collision
        label: Collision
      - code: 2_theft
        label: Theft
      - code: acme_unique_99
        label: Acme-Specific-Loss-Type
        carrier_extension: true        # not in base catalog
  CancellationReason:
    source: customer_extended
    values:
      - { code: lost_competitor, label: "Lost to competitor" }
      - { code: non_renewal_premium, label: "Non-renewal — premium" }
      # …
  PolicyTermStatus:
    source: base
    base_uri: https://docs.guidewire.com/cloud/pc/202503/apiref/...
    # values omitted — profile inherits base
```

**Rationale:** typelist drift is the most common per-customer source
of broken tools. Treat every enum-shaped Cloud API field as `string`
+ profile-validated, NOT as a closed enum at the schema layer. The
`source` field tells us when a Guidewire release-drift check needs
to re-validate the typelist (only `customer_extended` lists drift on
upgrade — base lists drift on Guidewire release boundary).

### 4.5 `custom-entities.yaml`

```yaml
# Custom entities that tools must traverse.
custom_entities:
  LeakageRiskScore:
    parent_entity: Claim
    relation: claim_to_leakage_score
    required_fields:
      - score: number
      - reasonCodes: string[]
    optional_fields:
      - lastEvaluatedAt: datetime
    api_path: /claim/v1/claims/{claimId}/customLeakageRiskScore
    # ↑ generated per tenant; profile knows the actual path
  AcmeUWRule:
    parent_entity: Job
    relation: job_to_uw_rule_trace
    required_fields:
      - ruleName: string
      - decision: string
      - rationaleText: string
    api_path: /job/v1/jobs/{jobId}/customUwRuleTrace
```

**Rationale:** custom entities are emitted per-tenant Swagger. The
`api_path` is what makes the tool work against this carrier; never
guess this path — the profile must declare it explicitly.

### 4.6 `field-aliases.yaml`

```yaml
# Map carrier-vocabulary terms to Guidewire field paths. Scoped
# per entity to keep aliases unambiguous.
aliases:
  Account:
    insured: namedInsured              # carrier-vocab → GW field
    policyholder: namedInsured         # synonym to same field
    primary_contact: primaryContact
  Producer:
    agency_code: code                  # NOT producerNumber — carrier-specific
    region: customRegion               # custom field
  Claim:
    loss_summary_text: lossDescription
    paid_to_date_amount: paidAmount    # Money-typed — preserve currency
money_fields:                          # explicit list — never strip currency
  - Claim.paidAmount
  - Claim.reserveAmount
  - Policy.totalPremiumAmount
  - Payment.amount
date_fields:                           # explicit per-field date convention
  - field: Policy.effectiveDate
    format: ISO_8601_date              # date-only, no time
  - field: Policy.boundDate
    format: ISO_8601_datetime          # datetime with TZ
  - field: Claim.lossDate
    format: ISO_8601_date
```

**Rationale:** Address `street1` is the canonical "we assumed it" —
not every carrier ships Address with a `street1` field; some merge
into a single `streetAddress`, some split further. Same for date vs
datetime: some Cloud entities store effective dates as date-only,
others as datetime. Make the convention per-field explicit so tools
don't get a runtime parse error mid-summary.

### 4.7 `approval-matrix.yaml`

```yaml
# Map (tool × amount/scope) → required approver tier.
# Drives harness approval gate decisions for approved_execute tools.
matrix:
  policycenter-mcp.propose-endorsement:
    - condition: { premium_change_lt: 1000, currency: USD }
      approver_tier: T1_Underwriter
    - condition: { premium_change_lt: 10000, currency: USD }
      approver_tier: T2_Senior_Underwriter
    - condition: { premium_change_gte: 10000, currency: USD }
      approver_tier: T3_Manager_Underwriter
  billingcenter-mcp.reconcile-this-payment:
    - condition: { amount_lt: 5000, currency: USD }
      approver_tier: T1_Billing_Op
    - condition: { amount_gte: 5000, currency: USD }
      approver_tier: T2_Billing_Manager
```

**Rationale:** Persona 3 (Claims VP) demanded that NOT every write
gates on human approval. The matrix is how a carrier expresses "auto-
approve below $X, escalate above." Money typing is preserved here too
— conditions reference both `amount` and `currency`.

### 4.8 `pii-policy.yaml`

```yaml
# PII handling rules per data class.
classes:
  high_pii:
    fields:
      - Claim.lossDescription
      - Claim.notes[*].body
      - Account.contactInfo[*].email
    handling: redact_in_summaries      # never returned in tool output
  medium_pii:
    fields:
      - Account.namedInsured
    handling: redact_unless_role_in
    allowed_roles: [Claims_Adjuster_II, Claims_Manager]
  low_pii:
    fields:
      - Producer.code
    handling: pass_through
baa_required:                          # for health-LOB carriers
  enabled: false                       # toggle when LOB includes health
  # when true: tool catalog filters down to BAA-cleared tools only
```

**Rationale:** Persona 5 (CISO) + the BAA-path carve-out. The PII
policy is profile-shape, not code-shape, because a carrier's PII
posture changes with the LOB mix.

---

## 5. Pagination + rate-limit posture

**AUTHORITATIVE finding** (verified via the InsuranceSuite cross-suite
docs at `cloudapibf/cloudAPI/Basic-REST-operations/`, 202603, 2026-05-04):
the Cloud API uses **query-parameter-based pagination** with a
"pagination query parameters" section in the Consumer Guide. Composite
Requests are explicitly supported as a batching feature.

**Practitioner knowledge (verify post-sandbox):** the canonical
parameters in current releases are `pageSize` and `pageOffset` for
offset-style pagination; cursor-style uses `Link` HTTP header
`<...>;rel="next"` semantics for navigation. Earlier marketing-deck
references to "cursor pagination" are imprecise — Cloud API list
endpoints expose both, with cursor preferred for large collections.

**Tool implementation rule:** tools NEVER expose pagination details
to the agent. The `packages/guidewire-client/` MUST iterate
transparently with a configurable per-call cap (default 200 rows;
hard ceiling 5000 for safety) and signal "result truncated" in tool
output if the cap is hit. The agent should never see `nextLink` or
`pageOffset` — those are infrastructure concerns.

**Rate limits** — practitioner knowledge: Cloud API enforces
per-tenant rate limits documented per-tenant (not in public docs).
The client MUST handle `429 Too Many Requests` with exponential
backoff + jitter, and the harness audit MUST record rate-limit
events as policy-decision metadata (not as success). Sandbox-blocked
item: discover the actual limit values when sandbox lands.

---

## 6. Composite Requests — adopt; Graph API — adopt; both with care

Two patterns are in the AUTHORITATIVE PolicyCenter 202503 module list
that the v4 plan should explicitly take advantage of:

**Composite API.** Allows multiple endpoint calls to be batched into
a single round trip. Use this for tools like `summarize-this-submission`
that need (job + contacts + locations + coverages) in one call. The
public docs explicitly call it out as "Optimizing calls — Features
that execute multiple requests at once." **Adopt for:** any tool
whose read fan-out is >2 endpoints in the same suite.

**Graph API.** Object-graph reads — pass-through for selective
expansion of related entities. Use this for `summarize-this-loss`,
where the tool needs the full claim graph in one read. **Adopt for:**
any single-aggregate-root summary tool.

**Caveat — practitioner knowledge:** Composite + Graph each have
per-tenant configuration (which endpoints are exposed under
Composite, depth limits on Graph). Profile MUST declare the tenant's
Composite/Graph configuration so the client knows whether to
short-circuit to single-call mode on tenants that disable batching.

**Pattern to AVOID:** N+1 reads from inside a tool. Every "loop and
fetch each child" pattern is a Composite/Graph candidate. CI rule:
flag any client method that calls `client.fetch()` inside a
`for`/`map` over a collection unless the collection size is bounded
by 1 (`.find`/`.first`).

---

## 7. App Events vs polling — D-004 verified, with refinement

**Finding (AUTHORITATIVE).** Per the App Events overview at
[`docs.guidewire.com/education/cloud-integration-basics/latest/docs/integration_cloud_basics/appevents_overview/`](https://docs.guidewire.com/education/cloud-integration-basics/latest/docs/integration_cloud_basics/appevents_overview/)
(verified 2026-05-04):

> "App Events makes it easy to publish events and full claim graph
> snapshots from the InsuranceSuite apps to downstream systems."

> "Events are delivered at least once."
> "Events are safe-ordered by the primary object that they are associated with."

> Subscriptions remain isolated — failures don't cascade. Consumers
> do not affect the performance of InsuranceSuite.

**This directly maps to D-004's design:**

- App Events Webhooks → our `events-mcp` **webhook receiver** (E6
  infra, NOT the MCP server itself). The MCP server is *query-only
  over the events stream*, per D-004 verbatim.
- BullMQ queue → handles the at-least-once delivery (consumer
  idempotency keys are mandatory; subscription per primary-object
  ID guarantees safe ordering at the queue layer).
- Suite MCPs (`policycenter-mcp`, `claimcenter-mcp`, etc.) consume
  from the queue when an event is needed for a workflow primitive
  (e.g. "claim opened → kick off triage workflow"); they do not
  ingest App Events directly.

**Refinement to D-004 (not a contradiction; an addition):** the
per-primary-object safe ordering means consumer code must shard
queue processing by `primaryObject.id`. Cross-claim event ordering
is NOT guaranteed; in-claim event ordering IS guaranteed at the
delivery boundary. The events-receiver implementation contract
must respect this — round-robin processing across claims, but
strictly serial within a single claim.

**App Events vs polling — per-tool decision:**

| Tool surface | Pattern |
|---|---|
| User-driven reads (`find-submissions-waiting-on-me`, `summarize-this-loss`) | Direct Cloud API call; no events needed |
| Workflow triggers (E6+ — "when a claim opens, do X") | App Events subscription; never polling |
| `events-mcp` query/replay surface | Reads from internal events store; never re-subscribes from agent thread |
| Batch reconciliation (E8 billing) | Cloud API + Async API job; NOT App Events (events are not a query plane) |

**Sandbox-blocked items:** the App Events subscription configuration
(which event types, which filters) lives on the carrier tenant, not
in the public docs. The events-receiver MUST be profile-driven
(`events.yaml` — not in the v4 profile list yet; **recommend adding
this to `profiles/_template/`**).

---

## 8. Integration Gateway boundary — IG and MCP coexist; do not blur

**AUTHORITATIVE.** The App Events overview lists two delivery
mechanisms: **App Events Webhooks** (no-code UI subscriptions) and
**Integration Gateway** (developer-written Apache Camel routes).

The Cloud Integration Framework hub
([AUTHORITATIVE](https://www.guidewire.com/resources/blog/technology/cloud-integration-framework-the-right-tools-for-the-job))
positions IG as the right tool for "cross-system bulk integrations
with downstream systems," typically batch / file / queue-protocol
heavy.

**Boundary the v4 architecture must hold:**

| Use case | Right tool |
|---|---|
| Conversational tool call ("show me X") | MCP server |
| Workflow trigger consumed by an agent | App Events → queue → MCP query |
| Batch ETL to downstream warehouse | Integration Gateway (Camel) |
| File-based EDI to a vendor | Integration Gateway |
| Real-time SMS notification on claim open | App Events Webhook (direct) — not MCP |

**Anti-pattern to refuse:** building an MCP tool that "subscribes
to App Events on every call." That makes MCP a stream consumer; it
is not. MCP tools query state, IG/AE move data. Persona 7 was right:
event ingestion belongs in infra. The blueprint encodes this
correctly via D-004.

---

## 9. Eventual consistency / read-after-write traps

**Practitioner knowledge** (verify with sandbox; standard across
event-sourced + CQRS-shaped APIs of which Cloud API is one):

- `POST /job/v1/jobs` returns 202 Accepted with a job ID.
  Subsequent `GET /job/v1/jobs/{jobId}` may return stale state for
  several seconds (typical 1-5s; observed up to 30s under load).
- Reserve changes (`PATCH /claim/v1/claims/{id}/reserves/{reserveId}`)
  follow the same pattern — write returns 200 but downstream reads
  may lag.
- App Events for the write fire AFTER the read consistency window
  closes; consuming the App Event is the canonical "the write is
  durable" signal.

**Implications for `approved_execute` tools:**

1. Every write tool MUST take an idempotency key (per D-006). Replays
   of the same key return the original outcome, not a duplicate write.
2. After write, do NOT do an immediate read-back to confirm. Either:
   - (a) trust the write's response (200/201/202 + body) and emit
     audit "written-pending-confirmation," OR
   - (b) wait for the App Event corresponding to the write before
     emitting "written-confirmed" audit.
3. If the workflow requires synchronous confirmation, poll
   `/async/v1/jobs/{asyncJobId}` (Async API) with bounded backoff
   — never a tight loop on the resource endpoint.

**Recommend:** the harness ships a `confirmWrite()` helper that
abstracts (a)/(b)/(c) into one decision per tool, profile-driven on
which mode the carrier wants. Sandbox lands first → start with (a)
+ Async API poll, layer (b) once App Events ingestion is wired.

---

## 10. Auth model — Guidewire Hub OAuth + JWT propagation

**Practitioner knowledge** (Cloud API Consumer Guide referenced
the Guidewire Hub identity model, not directly quotable from public
HTML refs; flag for verification post-sandbox):

- Carrier identities federate to Guidewire Hub via OIDC / SAML.
- Cloud API access tokens are issued by the Hub OAuth server.
- Token lifetime defaults to 1 hour (carrier-overridable).
- **JWT propagation** is the recommended pattern for SOC 2 / BAA
  paths: the carrier user's identity flows through to Cloud API
  calls so audit at Guidewire's side names the actual user, not a
  shared service account.

**Concrete prescription for `packages/auth/` (E1):**

- `openid-client` library (per stack table in 003-DR-ARCH).
- Token cache keyed by `(tenant_id, actor_id)`.
- Proactive refresh at 80% of lifetime (a 1-hour token refreshes
  at 48 minutes — leaves a 12-min safety margin for in-flight
  writes).
- On 401 Unauthorized from Cloud API: refresh once, retry once,
  then surface as auth failure (never silent loops).
- Refresh-on-refresh-failure: refuse the request, harness audits
  "auth-failure-non-recoverable," operator alerts via Sentry.

**Sandbox-blocked items:** the actual token endpoint URL, scopes
catalog, and JWKS URI for the project's sandbox tenant. These flow
into `auth.yaml` once `guidewire-adj` (sandbox provisioning) closes.

---

## 11. Date / time / Money / currency — the wire-format gotchas

**Practitioner knowledge** (verify per-field with sandbox + Swagger):

- **Effective dates** (`Policy.effectiveDate`, `Policy.expirationDate`):
  date-only ISO 8601 (`YYYY-MM-DD`), no time, no TZ. Stored as the
  carrier's local convention; profile MUST declare the carrier's
  policy-day boundary timezone.
- **Bound dates / system-time fields** (`Policy.boundDate`,
  `Claim.createdDate`): full ISO 8601 datetime with offset
  (`YYYY-MM-DDTHH:mm:ss±HH:mm`). UTC by default.
- **Loss dates** (`Claim.lossDate`): variable per carrier — some
  store date-only (carrier policy decision), some store datetime.
  `field-aliases.yaml` declares the convention.
- **Money fields** (`reserveAmount`, `paidAmount`, `premium*Amount`,
  `commission*Amount`, `Payment.amount`): ALWAYS Money-typed JSON
  object `{ amount: number | string, currency: string }`. NEVER
  serialized as bare number. Tool output MUST preserve both fields.
  Currency precision varies (USD = 2dp, JPY = 0dp); if the tool
  rounds, it MUST cite the originating currency's minor-unit
  convention. Recommend a `Money` Zod schema in `packages/schemas/`
  with `amount: z.string()` (string for arbitrary precision —
  do not use JS `number` for financial values).

**The Address gotcha (call-out for `pii-policy.yaml` + `field-aliases.yaml`):**
the assumption that every Address has `street1` is WRONG. Some
carriers use a single `streetAddress` field; some use a structured
`streetLines: string[]`. Profile MUST declare the carrier's Address
shape, and the `pii-policy.yaml` rules MUST scope to the actual
field paths.

**The Producer.code gotcha:** uniqueness is not guaranteed across
carriers. Some scope by region/state; some have parent/child code
hierarchies. Tools that filter by `producerCode` MUST also know
whether they need a region/scope qualifier (declared in profile).

---

## 12. Cloud API patterns — adopt list / avoid list

### Adopt

1. **Composite API for intra-suite multi-read** (§6) — measurably
   reduces round trips on summarize-style tools.
2. **Graph API for aggregate-root reads** (§6) — `summarize-this-loss`
   poster child.
3. **Async API polling for long-running writes** (§9) — the only
   correct pattern for jobs that exceed sync timeout.
4. **App Events for workflow triggers** (§7) — never poll for
   "did anything happen?"
5. **Idempotency keys on every write** (D-006) — Cloud API supports
   client-supplied idempotency keys via header (per practitioner
   knowledge; verify post-sandbox).
6. **Proactive token refresh at 80% of lifetime** (§10).
7. **Structured `Money` typing throughout** (§11).
8. **Profile-declared LOB / typelist / custom-entity mappings** (§4).
9. **Per-primary-object event sharding** (§7) — preserves Guidewire's
   safe-ordering guarantee.
10. **Rate-limit handling in client, not in tools** (§5).

### Avoid

1. **Hard-coded LOB or typelist values in tool code.** Profile
   them all. Single-tenant pilot is a smell.
2. **N+1 reads inside a tool.** Use Composite/Graph.
3. **Polling Cloud API for events.** Use App Events. Polling
   is rate-limit suicide.
4. **Reading-back immediately after a write.** Use idempotency +
   either Async API poll or App Event consumption.
5. **Stripping currency on Money fields.** Catastrophic for
   multi-currency carriers.
6. **Assuming `Address.street1` exists.** Profile it.
7. **Assuming `Producer.code` is unique.** Profile it.
8. **Treating `LossCause` / `CancellationReason` / `CoverageType`
   as closed enums at the schema layer.** They are open per
   carrier — string + profile-validated.
9. **Subscribing to App Events from inside an MCP tool.** Ingestion
   lives in infra (D-004).
10. **One service-account credential for everything.** JWT
    propagation per actor (Persona 5 hard-no).
11. **`/latest/` URLs in code, docs, or recordings.** Pin to a
    release-versioned path (Palisades / Las Leñas / Innsbruck).
12. **Ignoring 429.** Rate-limit responses are normal; tool failure
    is not the same as rate-limit-with-backoff.

---

## 13. Recording-replay strategy — first batch when sandbox lands

When `guidewire-adj` (sandbox provisioning, GH #1) closes, capture
in this priority order. The MANIFEST schema in
[`tests/recordings/MANIFEST.md`](../tests/recordings/MANIFEST.md) is
the provenance contract; every recording carries
`guidewire_release`, `tenant_tag`, `capture_method`, `sanitized` and
the rest.

**First batch (E1 + early E2 — week 1 of sandbox):**

| Endpoint | Method | Purpose | Tool depending |
|---|---|---|---|
| `/policy/v1/policies/{policyId}` | GET | Single-policy read shape | `show-policies-for-this-insured`, `propose-endorsement` |
| `/policy/v1/policies` | GET | Policy list pagination shape | multiple |
| `/job/v1/jobs?subtype=Submission&assignedToMe=true` | GET | Submission queue shape | `find-submissions-waiting-on-me` |
| `/job/v1/jobs/{jobId}` | GET | Single-job read shape | `summarize-this-submission` |
| `/account/v1/accounts/{accountId}/policies` | GET | Account-scoped policy list | `show-policies-for-this-insured` |
| `/common/v1/typelists/{typelistName}` | GET | Typelist value shape (base + extended) | profile generation |
| OAuth token endpoint | POST | Auth round-trip (sanitized) | `packages/auth/` |
| `/policy/v1/policies` | GET 401 | Auth failure shape | error-path tests |
| `/policy/v1/policies?pageSize=2` | GET | Cursor-pagination shape | client iterator |

**Second batch (E7 ClaimCenter — week 2):**

| Endpoint | Method | Purpose |
|---|---|---|
| `/claim/v1/claims/{claimId}` | GET (with Graph expansion) | `summarize-this-loss` |
| `/claim/v1/claims/{claimId}/reserves` | GET | `whats-the-reserve-picture` |
| `/claim/v1/claims/{claimId}/exposures` | GET | reserve picture child |
| `/claim/v1/claims?status=Open` | GET | leakage scan |
| Custom-entity sample (per tenant) | GET | `custom-entities.yaml` validation |

**Third batch (E8 BillingCenter + E5 writes — week 3+):**

| Endpoint | Method | Purpose |
|---|---|---|
| `/billing/v1/accounts/{accountId}/invoices` | GET | `whats-the-payment-status` |
| `/billing/v1/payments/{paymentId}/applications` | POST 202 | `reconcile-this-payment` write |
| `/async/v1/jobs/{asyncJobId}` | GET | async write confirmation |
| Composite Request bundle | POST | summarize-* batched read |
| App Event payload (from receiver, not Cloud API) | (asynchronous) | `events-mcp` replay test |

**Sanitization checklist for every recording (per MANIFEST §
"Sanitization rules"):** PII replaced with regex-matching
placeholders, customer-internal IDs replaced with stable pseudonyms,
field shapes preserved exactly, `sanitized: true` set in MANIFEST
entry. Recording filenames carry `from-<tenant-tag>` —
`from-sandbox-jeremy-dev` for the project's primary tenant.

---

## 14. Open questions — sandbox-blocked items for `fact-checker` and post-sandbox follow-up

The following can NOT be resolved from public docs alone. They are
flagged here so `fact-checker` does not promote practitioner-knowledge
claims to authoritative without sandbox corroboration:

1. **Exact pagination parameter names.** Public docs cite "pagination
   query parameters" but don't list `pageSize` / `pageOffset` /
   cursor token names in the AUTHORITATIVE summary. → verify against
   sandbox response headers + Swagger.
2. **Idempotency-key header name.** Practitioner knowledge says
   `Idempotency-Key` (industry standard). → verify against per-tenant
   Swagger.
3. **Token endpoint URL pattern.** Per-tenant; only resolvable via
   Hub OIDC discovery once a sandbox is provisioned.
4. **Rate-limit values per tenant.** Not in public docs; tenant-
   provisioned.
5. **Async API path shape for long-running write confirmation.**
   Practitioner knowledge cites `/async/v1/jobs/{asyncJobId}` — the
   Async API module exists per AUTHORITATIVE module list, but the
   exact endpoint contract isn't quoted in the public summary.
6. **App Events subscription configuration shape.** Lives on the
   carrier tenant, not in public docs. → drives `events.yaml`
   profile addition.
7. **Composite Request body shape.** AUTHORITATIVE existence
   confirmed; concrete batched-call schema needs Swagger.
8. **Custom-entity `api_path` resolution rules.** Generated per
   tenant build; only knowable from sandbox Swagger.
9. **Money typing — exact amount serialization (string vs number).**
   Recommend string; sandbox-verify against actual Money payloads.
10. **Exact list of base typelists vs extended.** Need a sandbox
    typelist dump to seed `typelists.yaml` defaults.

These ten items belong on the post-sandbox checklist — first thing
to verify when `guidewire-adj` closes and tenant access is live.

---

## 15. Cross-references

- Agent definition: [`.claude/agents/guidewire-api-archaeologist.md`](../.claude/agents/guidewire-api-archaeologist.md)
- Sibling librarian (citation source-of-truth): [`.claude/agents/guidewire-reference-librarian.md`](../.claude/agents/guidewire-reference-librarian.md)
- Public-resources map: [`./005-DR-REF-guidewire-public-resources.md`](./005-DR-REF-guidewire-public-resources.md)
- v4 architecture: [`./003-DR-ARCH-oss-cowork.md`](./003-DR-ARCH-oss-cowork.md)
- Decision log (D-001, D-004, D-005, D-006, D-007, D-008): [`./004-DR-DEC-architecture-decisions.md`](./004-DR-DEC-architecture-decisions.md)
- Adversarial personas (1, 5, 6, 7 most relevant here): [`./002-DR-CRIT-personas.md`](./002-DR-CRIT-personas.md)
- PRD skeleton (this memo feeds GW-1.2): [`./blueprint/02-PRD.md`](./blueprint/02-PRD.md)
- Architecture skeleton (this memo feeds GW-1.3): [`./blueprint/03-ARCHITECTURE.md`](./blueprint/03-ARCHITECTURE.md)
- Recordings MANIFEST (this memo feeds GW-1.10): [`../tests/recordings/MANIFEST.md`](../tests/recordings/MANIFEST.md)
- Sandbox-application bead: `guidewire-adj` ↔ GH #1
- This memo's bead: `guidewire-mgn`
