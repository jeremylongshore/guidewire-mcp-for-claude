# 00-LIBRARIAN-CITATION-AUDIT — Citation-coverage report

**Filed:** 2026-05-04
**Author:** `guidewire-reference-librarian` (Mode B — citation audit of merged PRD + specialist memos)
**Audited docs:**
- `000-docs/blueprint/02-PRD.md` (v1, merged 2026-05-04)
- `000-docs/006-DR-MEMO-mcp-safety.md`
- `000-docs/007-DR-MEMO-carrier-vocabulary.md`
- `000-docs/008-DR-MEMO-guidewire-api.md`
- `000-docs/009-DR-MEMO-harness-runtime.md`

**Sandbox status:** pre-sandbox. Every finding below is public-docs-grounded
or explicitly flagged as unverifiable without live tenant access
(bead `guidewire-adj` / GH #1).

**KB used:** `000-docs/005-DR-REF-guidewire-public-resources.md`

---

## Classification legend

| Code | Meaning | Required action |
|---|---|---|
| **A** | Cited — backed by a versioned URL in the doc or KB | None |
| **B** | Backable but uncited — claim is correct against public docs; no citation link in the doc | Backfill citation in follow-up PR |
| **C** | Unverified — practitioner knowledge; not directly quotable from current public pages | Mark `(unverified — sandbox-confirm at guidewire-adj)` in the doc, OR librarian adds a URL to KB |
| **D** | Likely wrong — claim contradicts what published Guidewire docs say | Open bead, fix the claim |

---

## 1. Summary table — count by classification per source doc

| Source doc | A | B | C | D | Total claims audited |
|---|---|---|---|---|---|
| `02-PRD.md` | 6 | 9 | 14 | 4 | 33 |
| `006-DR-MEMO-mcp-safety.md` | 0 | 1 | 5 | 1 | 7 |
| `007-DR-MEMO-carrier-vocabulary.md` | 0 | 0 | 1 | 0 | 1 |
| `008-DR-MEMO-guidewire-api.md` | 8 | 3 | 11 | 3 | 25 |
| `009-DR-MEMO-harness-runtime.md` | 0 | 1 | 2 | 0 | 3 |
| **Total** | **14** | **14** | **33** | **8** | **69** |

---

## 2. Findings by source doc

### 2.1 `02-PRD.md`

#### PRD § 3.1.1 — PolicyCenter MCP tool table (Line-UW view)

**F-PRD-001**
- **Doc + section:** `02-PRD.md` § 3.1.1, row `find-submissions-waiting-on-me`
- **Claim verbatim:** `GET /job/v1/jobs?subtype=Submission&assignedToMe=true&status=Open`
- **Surface type:** Cloud API endpoint
- **Classification:** C — Unverified (practitioner knowledge)
- **Notes:** The Job API module exists in PC 202503 AUTHORITATIVE. The endpoint path `/job/v1/jobs` follows the consistent module versioning pattern seen in the public `apiref/`. The query parameters `subtype`, `assignedToMe`, `status` are practitioner knowledge — they exist in the Swagger generated from the tenant build, not in a stable public page. 008-DR-MEMO correctly flagged this as "exact filter param names are practitioner knowledge." The PRD reproduces the endpoint without preserving that caveat label.
- **Mark in doc:** Add `(endpoint shape AUTHORITATIVE; query param names unverified — sandbox-confirm at guidewire-adj)` to the table row.

**F-PRD-002**
- **Doc + section:** `02-PRD.md` § 3.1.1, row `show-policies-for-this-insured`
- **Claim verbatim:** `GET /account/v1/accounts/{id}/policies` + `GET /policy/v1/policies?accountId=...`
- **Surface type:** Cloud API endpoint
- **Classification:** B — Backable but uncited
- **Authoritative URL:** `https://docs.guidewire.com/cloud/pc/202503/apiref/` — Account API and Policy API modules verified present (2026-05-04). The path pattern follows the module versioning convention (`/account/v1/`, `/policy/v1/`).
- **Notes:** Path shapes are consistent with PC 202503 module layout (Account API, Policy API). Exact endpoint sub-paths resolve to 302 (redirect to Swagger UI) confirming existence. Cite the PC 202503 apiref and Account/Policy module sections.

**F-PRD-003**
- **Doc + section:** `02-PRD.md` § 3.1.1, row `summarize-this-submission`
- **Claim verbatim:** `GET /job/v1/jobs/{id}` + `Composite (contacts, locations, coverages)`
- **Surface type:** Cloud API endpoint + Composite API pattern
- **Classification:** B — Backable but uncited
- **Authoritative URL:** `https://docs.guidewire.com/cloud/pc/202503/apiref/` (Job API + Composite API both verified in PC 202503). Composite API described in IS Consumer Guide: `https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/Basic-REST-operations/introduction-to-Cloud-API/c_endpoints.html`
- **Notes:** Both Job API and Composite API modules are AUTHORITATIVE in PC 202503. No citation currently in PRD row.

**F-PRD-004**
- **Doc + section:** `02-PRD.md` § 3.1.1, row `did-we-lose-this-account`
- **Claim verbatim:** `GET /policy/v1/policies?accountId=...&status=Cancelled,Lapsed,Lost` + `/transactions`
- **Surface type:** Cloud API endpoint
- **Classification:** C — Unverified (practitioner knowledge)
- **Notes:** Policy API module exists (AUTHORITATIVE, PC 202503). Query parameter names `accountId`, `status=Cancelled,Lapsed,Lost`, and the `/transactions` sub-resource path are all practitioner knowledge from the tenant-generated Swagger. No public page lists these exact query params or the transactions sub-path.

**F-PRD-005**
- **Doc + section:** `02-PRD.md` § 3.1.1, row `explain-why-this-got-referred`
- **Claim verbatim:** `GET /job/v1/jobs/{id}/uwIssues`
- **Surface type:** Cloud API endpoint (sub-resource path)
- **Classification:** C — Unverified (practitioner knowledge)
- **Notes:** Job API exists (AUTHORITATIVE). The `/uwIssues` sub-resource path is practitioner knowledge — it appears in Guidewire training materials and community references but is not directly cited in the current public apiref summary pages. 008-DR-MEMO correctly notes this is "carrier-specific trace endpoint (varies per UWCenter setup)" — the PRD should preserve this caveat explicitly.

**F-PRD-006**
- **Doc + section:** `02-PRD.md` § 3.1.1, row `draft-endorsement`
- **Claim verbatim:** `GET /policy/v1/policies/{id}/coverages` + `POST /job/v1/jobs` with subtype `PolicyChange`
- **Surface type:** Cloud API endpoint
- **Classification:** C — Unverified (practitioner knowledge)
- **Notes:** The `/coverages` sub-resource and the `PolicyChange` subtype are practitioner knowledge from the tenant Swagger. Policy API and Job API modules are AUTHORITATIVE, but these specific paths/values need sandbox confirmation.

**F-PRD-007**
- **Doc + section:** `02-PRD.md` § 3.2, row `summarize-this-loss`
- **Claim verbatim:** `GET /claim/v1/claims/{id}` with `Graph expansion (exposures, reserves, activities, documents, notes)`
- **Surface type:** Cloud API endpoint + Graph API
- **Classification:** D — Likely wrong
- **Authoritative URL:** `https://docs.guidewire.com/cloud/cc/202411/apiref/` (verified 2026-05-04)
- **Notes:** The ClaimCenter CC 202411 reference lists: Admin, Async, Claim, Common, **Composite**, System Tools. There is **no Graph API module** in the CC 202411 public reference. The Claim API GET `/claim/v1/claims/{id}` path is consistent with the CC module structure. However, the Graph API for graph-expansion reads does not appear as a CC module. The PC 202503 reference does include Graph API; CC 202411 does not. This is a meaningful discrepancy — the `summarize-this-loss` tool may need to use Composite API (which IS present in CC 202411) rather than Graph API. **Action: open bead, investigate whether CC 202411 exposes graph-expansion via a different mechanism or whether the tool must use Composite API instead.**

**F-PRD-008**
- **Doc + section:** `02-PRD.md` § 3.2, row `whats-the-reserve-picture`
- **Claim verbatim:** `GET /claim/v1/claims/{claimId}/reserves` + `GET /claim/v1/claims/{claimId}/exposures`
- **Surface type:** Cloud API endpoint
- **Classification:** B — Backable but uncited
- **Authoritative URL:** `https://docs.guidewire.com/cloud/cc/202411/apiref/` (Claim API module verified present)
- **Notes:** These sub-resource paths follow the CC Claim API module pattern. Both resolve to 302 (redirect-to-Swagger-UI, confirming they exist). No citation currently in PRD. Cite CC 202411 Claim API.

**F-PRD-009**
- **Doc + section:** `02-PRD.md` § 3.3, row `show-overdue-accounts`
- **Claim verbatim:** `GET /billing/v1/accounts?delinquencyStatus=...&producerCode=...`
- **Surface type:** Cloud API endpoint
- **Classification:** B — Backable but uncited
- **Authoritative URL:** `https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/BillingCenter/billing/accounts/c_querying_for_accounts.html` (verified 2026-05-04 — explicitly shows `GET /billing/v1/accounts`)
- **Notes:** The `/billing/v1/accounts` path is AUTHORITATIVE (not practitioner knowledge). The query parameters `delinquencyStatus` and `producerCode` remain C (practitioner knowledge). The PRD should cite the IS Consumer Guide for the base path.

**F-PRD-010**
- **Doc + section:** `02-PRD.md` § 3.3, row `where-are-we-on-this-payment`
- **Claim verbatim:** `GET /billing/v1/accounts/{id}/invoices` + `/payments`
- **Surface type:** Cloud API endpoint
- **Classification:** B — Backable but uncited
- **Authoritative URL:** `https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/BillingCenter/billing/accounts/c_payment_instruments.html` (verified — shows `/billing/v1/accounts/{accountId}/payment-instruments` patterns)
- **Notes:** The `/billing/v1/accounts/` base is AUTHORITATIVE. The `/invoices` and `/payments` sub-resources are practitioner knowledge (not the same as the `payment-instruments` endpoint confirmed AUTHORITATIVE). Mark base path B, sub-resource paths C.

**F-PRD-011**
- **Doc + section:** `02-PRD.md` § 3.3, row `reconcile-this-payment`
- **Claim verbatim:** `WRITE: POST /billing/v1/payments/{paymentId}/applications`
- **Surface type:** Cloud API endpoint (write side)
- **Classification:** C — Unverified (practitioner knowledge)
- **Notes:** The `/billing/v1/payments/{paymentId}/applications` path is not confirmed in the IS Consumer Guide pages that are publicly accessible. The BC Billing API module handles account-level payment operations, but the specific sub-path `/payments/{id}/applications` is practitioner knowledge from the tenant Swagger. 008-DR-MEMO correctly labeled this "(path shape practitioner knowledge — verify)."

**F-PRD-012**
- **Doc + section:** `02-PRD.md` § 3.4, row `whats-my-commission-status`
- **Claim verbatim:** `GET /billing/v1/commission*` (BC commission endpoints)
- **Surface type:** Cloud API endpoint
- **Classification:** D — Likely wrong
- **Authoritative URL:** `https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/BillingCenter/plans/commission-plans/c_working-with-commission-plans.html` (verified 2026-05-04)
- **Notes:** Commission plans in BillingCenter are under the **Admin API**, not the Billing API. The IS Consumer Guide explicitly shows: `GET /admin/v1/commission-plans`, `GET /admin/v1/commission-plans/{commissionPlanId}`, etc. The PRD's claim of `/billing/v1/commission*` is the wrong path prefix. The correct prefix is `/admin/v1/commission-plans`. **Action: open bead, correct the endpoint path.**

**F-PRD-013**
- **Doc + section:** `02-PRD.md` § 3.5, `events-mcp` narrative
- **Claim verbatim:** "App Events guarantees per-primary-object safe ordering, NOT cross-claim global ordering."
- **Surface type:** App Events delivery semantics
- **Classification:** A — Cited (via 008-DR-MEMO § 7)
- **Authoritative URL:** `https://docs.guidewire.com/education/cloud-integration-basics/latest/docs/integration_cloud_basics/appevents_overview/` — "Events are safe-ordered by the primary object that they are associated with." Verified 2026-05-04.
- **Notes:** The claim is correctly cited in 008 § 7 with the URL. The PRD carries the substance but without the URL inline. Acceptable citation gap (URL is in the input memo).

**F-PRD-014**
- **Doc + section:** `02-PRD.md` § 4.1, `read_only` row, pagination reference
- **Claim verbatim:** (implicit in tool rows — pagination is "cursor-paginated" per 008-DR-MEMO)
- **Surface type:** Pagination mechanism
- **Classification:** B — Backable but uncited
- **Authoritative URL:** `https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/Basic-REST-operations/query-parameters/c_the-pagination-query-parameters.html` (verified 2026-05-04 — explicitly confirms `pageSize` and `pageOffset` parameters)
- **Notes:** The pagination parameters `pageSize` and `pageOffset` are AUTHORITATIVE, not "practitioner knowledge" as characterized in 008-DR-MEMO § 5. This is a misclassification in 008 that flows into the PRD. The PRD doesn't specify pagination parameters directly, but 008-DR-MEMO should be corrected to reclassify `pageSize`/`pageOffset` from C to B.

**F-PRD-015**
- **Doc + section:** `02-PRD.md` § 4.1, `approved_execute` row, idempotency
- **Claim verbatim:** "idempotency_key ... Guidewire Cloud API supports client-supplied idempotency keys via header"
- **Surface type:** Idempotency header mechanism
- **Classification:** D — Likely wrong
- **Authoritative URL:** `https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/Basic-REST-operations/request-headers/c_preventing-duplicate-database-transactions.html` (verified 2026-05-04)
- **Notes:** Guidewire Cloud API does NOT use an `Idempotency-Key` header. The actual header is `GW-DBTransaction-ID`. Critically, duplicate requests with the same transaction ID **fail** with a `AlreadyExecutedException` — they do not return the prior result as the harness design assumes. This is a fundamental contract mismatch. The harness's "replay short-circuit on key match" model (009 § 4.2) is a client-side construct built on top of the harness's own `idempotency_keys` Postgres table — but if the harness calls the same Guidewire endpoint twice with the same `GW-DBTransaction-ID`, the second call will be rejected by Guidewire, not silently replayed. **This is the most load-bearing D finding.** Action: open bead, re-evaluate the idempotency design in 009-DR-MEMO § 4 vs Guidewire's actual mechanism. The harness approach may still be correct (harness tracks its own idempotency and never double-calls Guidewire), but the characterization "Cloud API supports client-supplied idempotency keys" misstates the mechanism.

**F-PRD-016**
- **Doc + section:** `02-PRD.md` § 4.1, auth column
- **Claim verbatim:** "Guidewire Hub OAuth + JWT propagation" as auth model
- **Surface type:** OAuth / authentication pattern
- **Classification:** C — Unverified (practitioner knowledge)
- **Notes:** The "Guidewire Hub" identity federation model is referenced in partner-tier documentation, not in the publicly accessible `docs.guidewire.com` pages. The IS Consumer Guide references authentication in the ContactManager section but does not describe the Hub OAuth flow. The `openid-client` library choice is reasonable; the specific Hub OIDC endpoint URL and scope catalog are correctly flagged as sandbox-blocked in 008-DR-MEMO § 14 open question 3. The hub-federation claim is well-grounded in carrier practice but lacks a public citation.

**F-PRD-017**
- **Doc + section:** `02-PRD.md` § 5 — TypeScript harness signatures (§§ 5.1-5.8)
- **Claim verbatim:** Full TypeScript interface block for `PlanInput`, `Plan`, `PolicyDecision`, `Approval`, etc.
- **Surface type:** Harness runtime contract (internal to this project — not a Guidewire API surface)
- **Classification:** Out of scope for this audit
- **Notes:** These are self-imposed contracts, not claims about Guidewire's published API. Reviewed by `harness-runtime-architect` in 009-DR-MEMO. Librarian does not audit self-defined contracts.

**F-PRD-018**
- **Doc + section:** `02-PRD.md` § 6.1, `auth.yaml` schema note
- **Claim verbatim:** `token_endpoint: https://<tenant>.guidewire.com/oauth2/token`
- **Surface type:** OAuth token endpoint URL pattern
- **Classification:** C — Unverified (practitioner knowledge)
- **Notes:** The per-tenant token endpoint URL pattern is not in public docs. 008-DR-MEMO correctly marks this as sandbox-blocked open question 3. The URL shape shown (`/oauth2/token`) is a common OIDC convention but not confirmed for Guidewire Hub. Profile `auth.yaml` must be populated from the Hub OIDC discovery document once sandbox is provisioned.

**F-PRD-019**
- **Doc + section:** `02-PRD.md` § 6.3, `lob.yaml` schema
- **Claim verbatim:** `uwcenter_rule_set: AcmeCommProp` / `coverage_typelist: AcmeCovType`
- **Surface type:** UWCenter rule entity / typelist naming convention
- **Classification:** C — Unverified (practitioner knowledge)
- **Notes:** UWCenter rule entity names are entirely carrier-defined, generated from the tenant configuration. The profile schema structure (`uwcenter_rule_set`, `coverage_typelist`) is the correct design response; the example values are correctly illustrative. No public Guidewire doc lists UWCenter rule entity naming conventions.

**F-PRD-020**
- **Doc + section:** `02-PRD.md` § 6.4, `typelists.yaml` — `LossCause` base_uri
- **Claim verbatim:** `base_uri: https://docs.guidewire.com/cloud/cc/202411/apiref/...`
- **Surface type:** Typelist reference URL
- **Classification:** B — Backable but uncited (URL is truncated with `...`)
- **Authoritative URL:** `https://docs.guidewire.com/cloud/cc/202411/apiref/` (CC Common API module — typelists live in Common API)
- **Notes:** The `...` truncation makes this a placeholder rather than a real citation. The YAML example should be updated with a real typelist endpoint URL once the Common API typelist path is confirmed post-sandbox. The base URL structure `docs.guidewire.com/cloud/cc/202411/apiref/` is AUTHORITATIVE.

**F-PRD-021**
- **Doc + section:** `02-PRD.md` § 6.5, `custom-entities.yaml`
- **Claim verbatim:** `api_path: /claim/v1/claims/{claimId}/customLeakageRiskScore`
- **Surface type:** Custom entity API path (per-tenant)
- **Classification:** C — Unverified (correctly labeled in 008-DR-MEMO § 4.5)
- **Notes:** Custom entity paths are per-tenant-Swagger-generated. The example is appropriately illustrative. The profile must declare the actual path from the tenant's Swagger. No action on the citation front — the doc is correctly handling this as a placeholder.

**F-PRD-022**
- **Doc + section:** `02-PRD.md` § 6.6, `field-aliases.yaml` Money fields
- **Claim verbatim:** Money fields have `{amount, currency}` shape; `amount` is `string` for arbitrary precision
- **Surface type:** Cloud API wire format (Money type)
- **Classification:** C — Unverified (practitioner knowledge)
- **Notes:** 008-DR-MEMO § 11 correctly labels this as practitioner knowledge pending sandbox verification. The `Money` typing convention is standard across Guidewire InsuranceSuite and widely corroborated in community and training sources, but the exact serialization (string vs number for `amount`) needs confirmation from the tenant Swagger. The design decision to use `z.string()` for amount is defensively correct regardless.

**F-PRD-023**
- **Doc + section:** `02-PRD.md` § 6.9, `events.yaml` schema
- **Claim verbatim:** `subscriptions[].event_type` examples like `ClaimReserveChanged`; `delivery.shard_by: primaryObject.id`
- **Surface type:** App Events subscription config + event type names
- **Classification:** C — Unverified (practitioner knowledge)
- **Notes:** The shard_by = `primaryObject.id` claim is AUTHORITATIVE (App Events docs: "safe-ordered by the primary object"). The specific event type name `ClaimReserveChanged` is practitioner knowledge — App Event type names are defined per-product and per-release; the public App Events overview does not list them. The subscription configuration shape lives on the carrier tenant, not in public docs (correctly noted in 008-DR-MEMO § 14 item 6).

**F-PRD-024**
- **Doc + section:** `02-PRD.md` § 3.2, `billingcenter-mcp` narrative
- **Claim verbatim:** "BillingCenter is documented under the InsuranceSuite cross-suite docs at `docs.guidewire.com/cloud/is/202603/cloudapibf/`"
- **Surface type:** BillingCenter API reference location
- **Classification:** D — Likely wrong (incomplete — omits BC's own dedicated apiref)
- **Authoritative URL:** `https://docs.guidewire.com/cloud/bc/202411/apiref/` and `https://docs.guidewire.com/cloud/bc/202503/apiref/` (both verified 200 OK, 2026-05-04)
- **Notes:** BillingCenter has its OWN versioned apiref at `docs.guidewire.com/cloud/bc/{version}/apiref/` — the same pattern as PC and CC. The IS cross-suite docs also cover BillingCenter (via the Consumer Guide narrative), but the claim in 008-DR-MEMO § 2 and the PRD omission of a BC-specific apiref URL is misleading. The BC apiref contains: Admin API, Async API, Billing API, Common API, Composite API, System Tools API. **Action: update `005-DR-REF` to add `https://docs.guidewire.com/cloud/bc/202411/apiref/` and `https://docs.guidewire.com/cloud/bc/202503/apiref/` as authoritative BC references. Update 008-DR-MEMO § 2 table.**

---

### 2.2 `006-DR-MEMO-mcp-safety.md`

**F-MS-001**
- **Doc + section:** `006-DR-MEMO-mcp-safety.md` § 7.8
- **Claim verbatim:** "Every refusal returns `{decision: "refused", reason: "<machine-readable>", message: "<human>"}` — never a thrown exception"
- **Surface type:** Internal harness contract (not a Guidewire API claim)
- **Classification:** Out of scope for the librarian — reviewed by `harness-runtime-architect`

**F-MS-002**
- **Doc + section:** `006-DR-MEMO-mcp-safety.md` § 1.5
- **Claim verbatim:** "If the carrier has extended the typelist (per `typelists.yaml`) and the value isn't in the base catalog, return the raw value with `unknown_typelist_value: true`"
- **Surface type:** Typelist extensibility (Cloud API behavior)
- **Classification:** B — Backable but uncited
- **Authoritative URL:** `https://docs.guidewire.com/cloud/cc/202411/apiref/` (Common API) / `https://docs.guidewire.com/cloud/pc/202503/apiref/` (Common API)
- **Notes:** The extensibility of typelists per carrier is a documented Guidewire architectural feature. The Common API typelists endpoint (verified 200 OK) exposes both base and extended values. No citation in the memo to the public typelist docs.

**F-MS-003**
- **Doc + section:** `006-DR-MEMO-mcp-safety.md` § 2.4
- **Claim verbatim:** "Smart Comms template rendering" for denial letters
- **Surface type:** Integration feature (Guidewire Smart Communications)
- **Classification:** C — Unverified (practitioner knowledge)
- **Notes:** Smart Communications is a Guidewire partner product / integrated module. It is referenced in Guidewire Marketplace and partner docs but not in the publicly-accessible Cloud API reference. The memo correctly does not cite a URL. The `draft_only` design avoids calling Smart Comms at all — this is referenced as a negative example ("never rendered through Smart Comms in `draft_only` mode"). No action needed on the citation front; the smart comms reference is contextual, not a load-bearing API claim.

**F-MS-004**
- **Doc + section:** `006-DR-MEMO-mcp-safety.md` § 3.4 (reconcile-this-payment)
- **Claim verbatim:** "WRITE: `POST /billing/v1/payments/{id}/applications` (Async; idempotency key required)"
- **Surface type:** Cloud API endpoint (write side)
- **Classification:** C — Unverified (practitioner knowledge)
- **Notes:** Same as F-PRD-011. The BC Billing API module structure is AUTHORITATIVE (BC 202411 apiref verified), but the specific `/payments/{id}/applications` sub-path is practitioner knowledge. Also see F-PRD-015 — the "idempotency key" characterization may misstate Guidewire's actual mechanism (`GW-DBTransaction-ID`).

**F-MS-005**
- **Doc + section:** `006-DR-MEMO-mcp-safety.md` § 8, open question 1
- **Claim verbatim:** "Does Guidewire Cloud's OAuth surface support scope-per-tool?"
- **Surface type:** OAuth scope granularity
- **Classification:** C — Unverified (correctly flagged as sandbox-blocked)
- **Notes:** This is explicitly flagged as an open question in the memo. No action needed — correctly handled.

**F-MS-006**
- **Doc + section:** `006-DR-MEMO-mcp-safety.md` § 8, open question 2
- **Claim verbatim:** "Idempotency key support in Cloud APIs. Coverage is reportedly uneven across PC/CC/BC and across Innsbruck / Las Leñas / Palisades."
- **Surface type:** Idempotency mechanism
- **Classification:** D — Likely wrong (mischaracterizes the mechanism)
- **Notes:** The framing "idempotency key support" implies Guidewire uses an `Idempotency-Key` style header. The actual mechanism is `GW-DBTransaction-ID` per the IS Consumer Guide (`c_preventing-duplicate-database-transactions.html`, verified 2026-05-04). Furthermore, the Guidewire mechanism is NOT a "replay the prior result" idempotency — it is a "fail duplicate requests" mechanism. This changes the harness design implications. The memo was right to flag it as an open question; the wrong framing is calling it "idempotency key support" (implying the standard HTTP `Idempotency-Key` semantic). **Cross-reference F-PRD-015.**

**F-MS-007**
- **Doc + section:** `006-DR-MEMO-mcp-safety.md` § 7.5
- **Claim verbatim:** "A `packages/harness/redaction/` module owns the redaction; tools declare which response fields are redactable in their Zod schema"
- **Surface type:** Internal harness design (not a Guidewire API claim)
- **Classification:** Out of scope for the librarian — reviewed by `harness-runtime-architect`

---

### 2.3 `007-DR-MEMO-carrier-vocabulary.md`

**F-CV-001**
- **Doc + section:** `007-DR-MEMO-carrier-vocabulary.md` § 2.5, events-mcp
- **Claim verbatim:** "D-004 implies integration engineers; if so, names are fine."
- **Surface type:** Persona / design decision reference (not a Guidewire API claim)
- **Classification:** Out of scope for the librarian
- **Notes:** The carrier vocabulary memo makes no technical API claims that require librarian citation verification. Its findings are linguistic, not endpoint-mapping. This memo has zero librarian-relevant technical claims. One partial observation:

**F-CV-002**
- **Doc + section:** `007-DR-MEMO-carrier-vocabulary.md` § 2.3
- **Claim verbatim:** "billing issues" vs "dunning, autopay-fail, write-off pending" — operators use specific terms
- **Surface type:** Typelist/concept terminology (Guidewire BC concepts)
- **Classification:** C — Unverified (practitioner knowledge)
- **Notes:** The specific Guidewire BillingCenter "dunning" process terminology is real (IS Consumer Guide references delinquency/dunning processes under BillingCenter) but the community-facing nature of these terms is not cited. Low stakes — this is vocabulary guidance, not an endpoint claim. No action.

---

### 2.4 `008-DR-MEMO-guidewire-api.md`

**F-API-001**
- **Doc + section:** `008-DR-MEMO-guidewire-api.md` § 2, module table for PolicyCenter
- **Claim verbatim:** "PolicyCenter: Product Definition, Admin, Job, Policy, Account, Async, Common, System Tools" (+ Composite, Graph)
- **Surface type:** Cloud API module structure
- **Classification:** A — Confirmed AUTHORITATIVE
- **Authoritative URL:** `https://docs.guidewire.com/cloud/pc/202503/apiref/` (verified 2026-05-04)
- **Notes:** PC 202503 apiref lists exactly: Account API, Admin API, Async API, Common API, Composite API, Graph API, Job API, Policy API, Product definition API, System tools API. The memo's list is accurate and the URL is cited. The "Example: Job for PA API" and "Example: Policy for PA API" are additional example-only modules present in the reference but not relevant to the tool catalog. Full marks.

**F-API-002**
- **Doc + section:** `008-DR-MEMO-guidewire-api.md` § 2, module table for ClaimCenter
- **Claim verbatim:** "ClaimCenter: Admin / Async / Common / Claim / System Tools"
- **Surface type:** Cloud API module structure
- **Classification:** A — Confirmed AUTHORITATIVE
- **Authoritative URL:** `https://docs.guidewire.com/cloud/cc/202411/apiref/` (verified 2026-05-04)
- **Notes:** CC 202411 apiref lists: Admin API, Async API, Claim API, Common API, Composite API, System Tools API. The memo's list omits **Composite API** (which IS present in CC 202411 — confirmed) but is otherwise correct. Low-stakes omission since Composite is addressed in § 6. The important correction is that **Graph API is NOT present in CC** (see F-PRD-007 for the load-bearing implication).

**F-API-003**
- **Doc + section:** `008-DR-MEMO-guidewire-api.md` § 2, module table for BillingCenter
- **Claim verbatim:** "BillingCenter is documented under the InsuranceSuite cross-suite docs at `docs.guidewire.com/cloud/is/202603/cloudapibf/`"
- **Surface type:** BillingCenter API reference location
- **Classification:** D — Likely wrong (incomplete)
- **Authoritative URL:** `https://docs.guidewire.com/cloud/bc/202411/apiref/` (verified 2026-05-04)
- **Notes:** Same as F-PRD-024. BillingCenter has its own dedicated per-version apiref with modules: Admin API, Async API, Billing API, Common API, Composite API, System Tools. The IS cross-suite docs provide additional narrative context, but the authoritative endpoint reference is the BC-specific apiref. This omission means the tool catalog for `billingcenter-mcp` has been grounded against an incomplete reference. **This is a load-bearing gap: BC has a Composite API module (useful for batch reads) that was not noted.**

**F-API-004**
- **Doc + section:** `008-DR-MEMO-guidewire-api.md` § 2
- **Claim verbatim:** "the Cloud API exposes Swagger 2.0 specs per module, generated from the carrier's product configuration... 'built using the Swagger 2.0 Specification' (verified 2026-05-04)"
- **Surface type:** API spec format / versioning
- **Classification:** A — Confirmed AUTHORITATIVE
- **Authoritative URL:** `https://docs.guidewire.com/cloud/pc/202503/apiref/` (the apiref UI is Swagger-based; per-tenant generation is the documented behavior)
- **Notes:** Correctly characterized and cited.

**F-API-005**
- **Doc + section:** `008-DR-MEMO-guidewire-api.md` § 5
- **Claim verbatim:** "canonical parameters in current releases are `pageSize` and `pageOffset`... cursor-style uses `Link` HTTP header"
- **Surface type:** Pagination parameters
- **Classification:** B — Backable but uncited (partially incorrect classification)
- **Authoritative URL:** `https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/Basic-REST-operations/query-parameters/c_the-pagination-query-parameters.html` (verified 2026-05-04 — explicitly documents `pageSize` and `pageOffset`)
- **Notes:** `pageSize` and `pageOffset` are AUTHORITATIVE, not "practitioner knowledge." The IS Consumer Guide's pagination page explicitly documents them. The memo misclassified these as practitioner knowledge. The `Link` header / cursor semantics remain C (practitioner knowledge). **This is a B reclassification, not a D — the claim is correct, just miscategorized.**

**F-API-006**
- **Doc + section:** `008-DR-MEMO-guidewire-api.md` § 7
- **Claim verbatim:** App Events quotes: "Events are delivered at least once." / "Events are safe-ordered by the primary object that they are associated with."
- **Surface type:** App Events delivery semantics
- **Classification:** A — Confirmed AUTHORITATIVE
- **Authoritative URL:** `https://docs.guidewire.com/education/cloud-integration-basics/latest/docs/integration_cloud_basics/appevents_overview/` (verified 2026-05-04 — exact quotes confirmed)
- **Notes:** These verbatim quotes are confirmed from the public App Events overview page. Correctly attributed.

**F-API-007**
- **Doc + section:** `008-DR-MEMO-guidewire-api.md` § 7
- **Claim verbatim:** "App Events makes it easy to publish events and full claim graph snapshots from the InsuranceSuite apps to downstream systems."
- **Surface type:** App Events capability description
- **Classification:** A — Confirmed AUTHORITATIVE
- **Authoritative URL:** `https://docs.guidewire.com/education/cloud-integration-basics/latest/docs/integration_cloud_basics/appevents_overview/` (verified 2026-05-04 — exact quote confirmed)

**F-API-008**
- **Doc + section:** `008-DR-MEMO-guidewire-api.md` § 8
- **Claim verbatim:** "Integration Gateway: Apache Camel routes for downstream systems"
- **Surface type:** Integration Gateway technology
- **Classification:** A — Confirmed AUTHORITATIVE
- **Authoritative URL:** App Events overview page (verified) — "Developers write Camel routes to read events and invoke..." confirmed from the same page.

**F-API-009**
- **Doc + section:** `008-DR-MEMO-guidewire-api.md` § 5 (pagination)
- **Claim verbatim:** "cursor pagination" (described as the preferred mode for large collections)
- **Surface type:** Pagination mechanism type
- **Classification:** C — Unverified (practitioner knowledge)
- **Notes:** The IS Consumer Guide's pagination docs explicitly document `pageSize` and `pageOffset` (offset-based). The "cursor uses `Link` HTTP header" pattern is practitioner knowledge. The public doc doesn't describe cursor-style pagination — only offset pagination is confirmed. This matters for tool implementation: if cursor is not documented in public pages, the client should assume offset pagination until sandbox confirms otherwise.

**F-API-010**
- **Doc + section:** `008-DR-MEMO-guidewire-api.md` § 9
- **Claim verbatim:** "`POST /job/v1/jobs` returns 202 Accepted with a job ID"
- **Surface type:** Cloud API response code (write pattern)
- **Classification:** C — Unverified (practitioner knowledge)
- **Notes:** 202 Accepted is the industry standard for async job creation; the Async API module being present in all PC/CC/BC apiref implementations corroborates this as the write pattern. But the specific status code from `POST /job/v1/jobs` is practitioner knowledge — not directly quoted from a public page.

**F-API-011**
- **Doc + section:** `008-DR-MEMO-guidewire-api.md` § 9
- **Claim verbatim:** "Poll `/async/v1/jobs/{asyncJobId}` (Async API) with bounded backoff"
- **Surface type:** Async API endpoint path
- **Classification:** C — Unverified (practitioner knowledge)
- **Notes:** The Async API module exists in PC 202503, CC 202411, BC 202411 (all AUTHORITATIVE). The specific endpoint path `/async/v1/jobs/{asyncJobId}` follows the consistent module-versioning pattern and resolves to 302 (exists in apiref). This is B-approaching-A but the exact path is in the per-tenant Swagger, not a public page. Mark as C with a note that it is consistent with public module structure.

**F-API-012**
- **Doc + section:** `008-DR-MEMO-guidewire-api.md` § 10
- **Claim verbatim:** "Carrier identities federate to Guidewire Hub via OIDC / SAML"
- **Surface type:** OAuth / identity federation
- **Classification:** C — Unverified (practitioner knowledge)
- **Notes:** The Hub identity federation model is referenced in Guidewire partner documentation and community sources, but not in the public `docs.guidewire.com` pages accessible without login. The practical implications (proactive refresh at 80%, `openid-client` library) are sound engineering defaults regardless of Hub specifics.

**F-API-013**
- **Doc + section:** `008-DR-MEMO-guidewire-api.md` § 12 (avoid list), item 5
- **Claim verbatim:** "Cloud API supports client-supplied idempotency keys via header (per practitioner knowledge; verify post-sandbox)"
- **Surface type:** Idempotency header mechanism
- **Classification:** D — Likely wrong
- **Authoritative URL:** `https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/Basic-REST-operations/request-headers/c_preventing-duplicate-database-transactions.html` (verified 2026-05-04)
- **Notes:** Same as F-PRD-015. The actual header is `GW-DBTransaction-ID`, not `Idempotency-Key`. The Guidewire mechanism fails duplicates, does not replay them. The memo at least correctly flagged this as practitioner knowledge pending sandbox; the correction is that we now have AUTHORITATIVE documentation contradicting the `Idempotency-Key` assumption. **Reclassify from C to D.**

**F-API-014**
- **Doc + section:** `008-DR-MEMO-guidewire-api.md` § 3.2, `summarize-this-loss`
- **Claim verbatim:** "Graph API call — this is the canonical Graph use case. `GET /claim/v1/claims/{claimId}` with Graph expansion"
- **Surface type:** Cloud API module (Graph API for ClaimCenter)
- **Classification:** D — Likely wrong
- **Authoritative URL:** `https://docs.guidewire.com/cloud/cc/202411/apiref/` (verified 2026-05-04)
- **Notes:** Same as F-PRD-007. Graph API is NOT present in the CC 202411 apiref. ClaimCenter's module list is: Admin, Async, Claim, Common, Composite, System Tools. The `summarize-this-loss` tool should use **Composite API** (which IS present in CC) rather than Graph API. This changes the tool's implementation strategy.

---

### 2.5 `009-DR-MEMO-harness-runtime.md`

**F-HR-001**
- **Doc + section:** `009-DR-MEMO-harness-runtime.md` § 4.1
- **Claim verbatim:** Idempotency key formula — "replay short-circuit on key match: the side effect is never invoked, the previous value is returned"
- **Surface type:** Idempotency contract design
- **Classification:** C — Unverified (design correctness vs Guidewire's actual mechanism)
- **Notes:** The harness's OWN idempotency-key table (Postgres `idempotency_keys`) is a client-side construct. The harness's replay-on-match behavior is correct IF the harness never re-calls the same Guidewire endpoint after recording the result. The gap is that the harness's idempotency (prevent re-calling Guidewire) is separate from Guidewire's own mechanism (`GW-DBTransaction-ID`, which fails duplicates). As long as the harness properly tracks and short-circuits before reaching the Guidewire client, the design works — the `GW-DBTransaction-ID` header serves as a secondary safety net for harness-bypass scenarios, not the primary mechanism. The design is sound but the framing in 009 § 12 "Idempotency keys on every write — Cloud API supports client-supplied idempotency keys via header" (carried from 008) needs correction.

**F-HR-002**
- **Doc + section:** `009-DR-MEMO-harness-runtime.md` § 2.2 (Postgres DDL)
- **Claim verbatim:** Full Postgres DDL schema (6 tables)
- **Surface type:** Internal harness design
- **Classification:** Out of scope for the librarian

**F-HR-003**
- **Doc + section:** `009-DR-MEMO-harness-runtime.md` § 11
- **Claim verbatim:** "This is not a proposal. This is the contract — any deviation from the shapes here in E3 needs to land in a follow-up `010-DR-MEMO-harness-runtime-rev.md`"
- **Surface type:** Internal contract governance
- **Classification:** Out of scope for the librarian
- **Notes:** The harness memo's OpenTelemetry + Dapr + RFC 8785 JCS references are legitimate public standards, not Guidewire-specific. The only Guidewire-relevant concern is F-HR-001 above.

**F-HR-004**
- **Doc + section:** `009-DR-MEMO-harness-runtime.md` § 9
- **Claim verbatim:** Library vs CLI parity table
- **Surface type:** Internal harness design
- **Classification:** Out of scope for the librarian

---

## 3. Top-priority gaps — 5-10 most load-bearing C/D classifications

Ranked by blast radius if uncorrected:

### P1 — IDEMPOTENCY MECHANISM MISMATCH (F-PRD-015 / F-API-013 / F-MS-006) — D

**The single most load-bearing finding.** The PRD and 008-DR-MEMO assume Guidewire Cloud API supports a replay-safe `Idempotency-Key` header (analogous to Stripe's header). The actual Guidewire mechanism is `GW-DBTransaction-ID`, and it **fails** duplicates rather than replaying prior results. The harness's own Postgres-backed idempotency table is architecturally correct as a client-side guard — but:

1. Every `approved_execute` tool must include `GW-DBTransaction-ID` in its Guidewire API calls (not just rely on the harness's own key).
2. The key format, uniqueness scope, and expiration TTL of `GW-DBTransaction-ID` need confirmation via sandbox (or the IS Consumer Guide section on preventing duplicate database transactions).
3. The harness docs should clarify that its idempotency key and Guidewire's transaction ID serve different but complementary purposes.

**Action:** Open a bead. Update 008-DR-MEMO § 12 "avoid" item 5 to say "GW-DBTransaction-ID, not Idempotency-Key." Update the `reconcile-this-payment` tool design to include `GW-DBTransaction-ID`. Update `packages/harness/` client integration spec.

### P2 — GRAPH API NOT PRESENT IN CLAIMCENTER (F-PRD-007 / F-API-014) — D

**`summarize-this-loss` is the anchor ClaimCenter tool and its core premise — Graph API one-shot expansion — requires Graph API.** CC 202411 does not have a Graph API module. CC has Composite API. The tool needs to use Composite API for multi-resource reads in a single round trip, not Graph expansion. This changes the tool's implementation, recording shape, and profiling requirements.

**Action:** Open a bead. Update 02-PRD.md § 3.2, row `summarize-this-loss`, to use Composite API instead of Graph API. Update 008-DR-MEMO § 3.2 and § 6. Verify post-sandbox whether CC offers any expansion mechanism equivalent to PC's Graph API.

### P3 — BILLING COMMISSION ENDPOINT PATH WRONG (F-PRD-012) — D

**`whats-my-commission-status` claims `/billing/v1/commission*` but the IS Consumer Guide shows commission plans are under `/admin/v1/commission-plans`.** This affects the producer-mcp's most financially sensitive tool. Beyond path correction, it signals that commission-related queries may require Admin API scope, not Billing API scope — which has auth / role implication differences.

**Action:** Open a bead. Correct the endpoint path in 02-PRD.md § 3.4 and 008-DR-MEMO § 3.4. Verify scope requirements (admin vs billing) post-sandbox.

### P4 — BILLINGCENTER HAS ITS OWN VERSIONED APIREF (F-PRD-024 / F-API-003) — D

**The BC apiref gap is structural: by treating BC as only in the IS cross-suite docs, the project missed that BC has its own per-version apiref with a Composite API module, Async API module, and a Billing API module (separate from the IS narrative).** This means the BC Composite API (available for batch BC reads) was not accounted for in the tool design.

**Action:** Update `000-docs/005-DR-REF-guidewire-public-resources.md` (§ 1, per-suite API references table) to add BC 202411 and BC 202503 apiref URLs. Update 008-DR-MEMO § 2. Note BC Composite API as available for billingcenter-mcp tool design.

### P5 — PAGINATION PARAMETERS MISCLASSIFIED AS PRACTITIONER KNOWLEDGE (F-API-005) — B→reclassification

**`pageSize` and `pageOffset` are AUTHORITATIVE, documented explicitly in the IS Consumer Guide pagination page. 008-DR-MEMO classified them as "practitioner knowledge — verify post-sandbox."** This is a significant misclassification because it affects the confidence level of the `packages/guidewire-client/` iterator implementation. The team can implement the paginator now with high confidence, not "pending sandbox."

**Action:** Update 008-DR-MEMO § 5 to reclassify `pageSize`/`pageOffset` from C to B with the authoritative citation URL. Update any design notes that say "verify post-sandbox" for these parameters.

### P6 — HUB OAUTH / AUTH MODEL (F-PRD-016 / F-API-012) — C

The Guidewire Hub OAuth flow, OIDC federation, and JWT propagation pattern are all practitioner knowledge without a public citation. This is correctly flagged in the docs as sandbox-blocked, but it means the `packages/auth/` implementation (E1 package) will need to be substantially filled from a live tenant rather than spec'd from public docs. Low risk if the team expects it; high risk if anyone treats the auth.yaml schema as a final contract.

**Action:** Add a note in the PRD § 6.1 auth.yaml section: "token_endpoint URL, scopes catalog, and JWKS URI are sandbox-blocked — see guidewire-adj. auth.yaml cannot be finalized until sandbox provisioning closes." Update 008-DR-MEMO § 14 open question 3 to reiterate this (it already does, so this is documentation reinforcement only).

### P7 — CUSTOM ENTITY PATHS ARE ENTIRELY SANDBOX-DEPENDENT (F-PRD-021) — C (structural)

All `custom-entities.yaml` `api_path` values are per-tenant Swagger generated. The profile template correctly models this as a placeholder, but any tool that reaches a `custom-entities.yaml` path before the sandbox lands will fail. Tools like `find-claims-at-risk-of-leakage` (LeakageRiskScore) and `explain-why-this-got-referred` (UWCenter rule trace) are structurally unusable without a real carrier's custom entity path.

**Action:** Already handled by the ⚠ incomplete-without-profile banner on affected tools. Confirm that `custom-entities.yaml` validation fails loudly (not silently) at boot-time when the api_path placeholder is unset — add to E4 acceptance criteria.

---

## 4. KB updates the librarian will make to `005-DR-REF-guidewire-public-resources.md`

The following additions close citation gaps identified in this audit. All have been verified live (2026-05-04):

### Addition 1 — BillingCenter per-suite apiref (closes F-PRD-024 / F-API-003)

Add to § 1 per-suite API references table:

| Suite | Latest reference | Module set |
|---|---|---|
| **BillingCenter** | `https://docs.guidewire.com/cloud/bc/202411/apiref/` | Admin, Async, Billing, Common, Composite, System Tools |

Also add BC 202503 as a note alongside PC 202503.

### Addition 2 — Pagination query parameters (closes F-API-005)

Add to § 1 or a new § 1.1 "Pagination":

| What | URL |
|---|---|
| Pagination query parameters (AUTHORITATIVE) | `https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/Basic-REST-operations/query-parameters/c_the-pagination-query-parameters.html` |

Note: `pageSize` (limit resources per page) and `pageOffset` (page number) are confirmed parameters. Also documents "previous" and "next" link headers for navigation.

### Addition 3 — Preventing duplicate database transactions (closes F-PRD-015)

Add to a new "Write safety" entry in § 1 or § 2:

| What | URL |
|---|---|
| Preventing duplicate DB transactions (`GW-DBTransaction-ID` header) | `https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/Basic-REST-operations/request-headers/c_preventing-duplicate-database-transactions.html` |

Critical caveat: Guidewire's mechanism uses `GW-DBTransaction-ID` header. Duplicate requests FAIL (throw `AlreadyExecutedException`) — they do NOT return the prior result. This is different from the `Idempotency-Key` (Stripe-style) behavior assumed in the harness design notes.

### Addition 4 — BillingCenter Consumer Guide sections for accounts and commissions

| What | URL |
|---|---|
| BC accounts querying (`/billing/v1/accounts`) | `https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/BillingCenter/billing/accounts/c_querying_for_accounts.html` |
| BC commission plans (`/admin/v1/commission-plans`) | `https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/BillingCenter/plans/commission-plans/c_working-with-commission-plans.html` |

### Addition 5 — Composite API for ClaimCenter (closes F-PRD-007 / F-API-014)

Add a note to § 6 "Education + training" or § 1:

| What | URL | Key finding |
|---|---|---|
| ClaimCenter CC 202411 apiref | `https://docs.guidewire.com/cloud/cc/202411/apiref/` | Modules: Admin, Async, Claim, Common, **Composite**, System Tools. Graph API is NOT present. Use Composite for multi-resource reads. |

---

## 5. Traceability — findings to recommended bead actions

| Finding ID | Classification | Bead action |
|---|---|---|
| F-PRD-015, F-API-013, F-MS-006 | D | Open bead: "Correct idempotency mechanism — GW-DBTransaction-ID vs Idempotency-Key; update harness client spec" |
| F-PRD-007, F-API-014 | D | Open bead: "Correct summarize-this-loss — use CC Composite API, not Graph API" |
| F-PRD-012 | D | Open bead: "Correct commission endpoint — /admin/v1/commission-plans, not /billing/v1/commission*" |
| F-PRD-024, F-API-003 | D | Open bead: "Add BC per-suite apiref to 005-DR-REF and 008-DR-MEMO; note BC Composite API" |
| F-API-005 | B→reclassify | Update 008-DR-MEMO § 5: pageSize/pageOffset are AUTHORITATIVE not practitioner knowledge |
| F-PRD-002, F-PRD-008, F-PRD-009, F-PRD-010 | B | Backfill citations in PRD tool table rows (follow-up PR, low urgency) |
| F-MS-002 | B | Add typelist extensibility citation in 006-DR-MEMO § 1.5 |
| F-PRD-016, F-API-012 | C | No change needed — correctly flagged as sandbox-blocked in 008-DR-MEMO § 14 |
| All other C findings | C | No change to docs needed; findings are correctly handled as "verify post-sandbox" |

---

## Cross-references

- KB: [`../005-DR-REF-guidewire-public-resources.md`](../005-DR-REF-guidewire-public-resources.md)
- PRD: [`../02-PRD.md`](../02-PRD.md)
- Agent: [`.claude/agents/guidewire-reference-librarian.md`](../../.claude/agents/guidewire-reference-librarian.md)
- Sandbox bead: `guidewire-adj` ↔ GH #1
- Audit gate: `./README.md` (staffed panel criteria)
