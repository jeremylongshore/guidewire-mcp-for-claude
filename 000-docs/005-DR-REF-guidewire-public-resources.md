# 005-DR-REF — Guidewire public reference resources

**Filed:** 2026-05-04
**Updated:** 2026-05-04 (librarian citation audit — see `blueprint/audits/00-LIBRARIAN-CITATION-AUDIT.md`)
**Maintainer:** `guidewire-reference-librarian` agent + Jeremy
**Bead:** `guidewire-oq2`
**Status:** Living document — agent updates this as new public surfaces appear or URLs change.

---

## Why this exists

The Guidewire MCP for Claude project must build *without* live sandbox
access during Phase 0 + most of E1. The public Guidewire documentation
is the substitute — it lets us draft tool signatures, profile
templates, contract test stubs, and architectural decisions against
real-world API shapes long before sandbox creds arrive.

This document is the canonical map of every public Guidewire reference
surface we use. The
[`guidewire-reference-librarian`](../.claude/agents/guidewire-reference-librarian.md)
agent treats this as its primary knowledge base; you can also browse
it directly.

**Sandbox status:** see [`./blueprint/05-TECHNICAL-SPEC.md § NO MOCKS`](./blueprint/05-TECHNICAL-SPEC.md)
and bead `guidewire-adj` (issue [#1](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/1)) for the application playbook + "planet" provisioning nuance.

---

## 1. Cloud API references (open, no signup)

Guidewire publishes the full Cloud API reference for InsuranceSuite
products at versioned paths under `docs.guidewire.com`. Every endpoint,
every request/response shape, every typelist is here. **This is our
primary substitute for sandbox-driven contract drafting.**

### Per-suite API references

| Suite | Latest reference | Module set |
|---|---|---|
| **PolicyCenter** | <https://docs.guidewire.com/cloud/pc/202503/apiref/> | Product Definition, Admin, Job, Policy, Account, Async, Common, Composite, Graph, System Tools |
| **ClaimCenter** | <https://docs.guidewire.com/cloud/cc/202411/apiref/> | Admin, Async, Claim, Common, **Composite**, System Tools |
| **BillingCenter** | <https://docs.guidewire.com/cloud/bc/202411/apiref/> | Admin, Async, **Billing**, Common, Composite, System Tools |
| **BillingCenter (202503)** | <https://docs.guidewire.com/cloud/bc/202503/apiref/> | Same module set as 202411 |
| **InsuranceSuite (cross, Palisades)** | <https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/Basic-REST-operations/introduction-to-Cloud-API/c_endpoints.html> | Cross-suite endpoint primer + BillingCenter Consumer Guide |

**Critical notes on the module tables (verified 2026-05-04):**

- **ClaimCenter does NOT have a Graph API module.** The `summarize-this-loss`
  tool and any other CC tool that needs multi-resource reads in one round
  trip must use **Composite API**, which IS present in CC 202411.
- **BillingCenter has its own per-version `apiref/`** at the same path
  pattern as PC/CC. This was missing from the original KB. The BC module
  called **Billing API** (not "BillingCenter API") contains account-level
  endpoints (`/billing/v1/accounts/...`). Commission plan endpoints live
  in the BC **Admin API** (`/admin/v1/commission-plans/...`), not in the
  Billing API.
- **PolicyCenter has both Composite API and Graph API.** Use Graph for
  single-aggregate-root reads (wide object expansion); use Composite for
  multi-resource batch reads within a suite.

### Versioning convention

Paths embed the Guidewire Cloud release version:

```
docs.guidewire.com/cloud/{pc|cc|bc}/{YYYYRR}/apiref/
                                     ^^^^^^
                                     YYYY = year, RR = release seq
```

Examples seen in 2025-2026:
- `202302` Innsbruck (PolicyCenter)
- `202411` Las Leñas (ClaimCenter, BillingCenter)
- `202503` Las Leñas (PC) / BillingCenter
- `202603` InsuranceSuite cross-suite docs (Palisades-track, current as of 2026-05)

**When citing a doc URL in the codebase, blueprint, or recordings,
always use the versioned path.** Generic paths (e.g.
`docs.guidewire.com/cloud/pc/latest/`) drift silently.

### Typelist references

| What | URL |
|---|---|
| Common typelist endpoint shape | <https://docs.guidewire.com/cloud/cc/202011/apiref/docs/specDocs/CommonAPI/typelists--typelist-> |
| Per-suite typelist catalog | inside each `apiref/` page above (Common API module per suite) |

**Critical caveat (per `guidewire-api-archaeologist`):** typelists are
extensible per customer. The base catalog is portable; carrier
extensions are not. Profile `typelists.yaml` files in
`profiles/<customer>/` map per-customer values.

### Pagination query parameters (AUTHORITATIVE)

| What | URL |
|---|---|
| Pagination parameters | <https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/Basic-REST-operations/query-parameters/c_the-pagination-query-parameters.html> |

**Confirmed parameters (verified 2026-05-04 from the above URL):**

- `pageSize` — limits the number of resources returned per page
- `pageOffset` — specifies which page of resources to return
- `totalCount` — returned in response to indicate total result set size
- Navigation links: "previous" and "next" links in response for page traversal

**These are AUTHORITATIVE, not practitioner knowledge.** The IS Consumer
Guide's pagination page explicitly documents them. Implementors of
`packages/guidewire-client/` can build the paginator now with high
confidence; no sandbox needed for the parameter names.

### Write safety — preventing duplicate database transactions (AUTHORITATIVE)

| What | URL |
|---|---|
| Preventing duplicate DB transactions | <https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/Basic-REST-operations/request-headers/c_preventing-duplicate-database-transactions.html> |

**Critical design note (verified 2026-05-04):**

Guidewire Cloud API uses the **`GW-DBTransaction-ID`** request header to
prevent duplicate database writes — NOT an `Idempotency-Key` header.

Key behavioral difference from Stripe-style idempotency:
- First call with a given `GW-DBTransaction-ID`: succeeds normally.
- Subsequent calls with the **same** `GW-DBTransaction-ID`: **fail** with
  `AlreadyExecutedException` — they do NOT replay the prior result.
- The transaction ID must be globally unique across all clients, APIs, and
  web services.

**Implication for harness design:** The harness's own Postgres-backed
`idempotency_keys` table is a client-side guard that prevents the harness
from calling the same Guidewire endpoint twice for the same logical action.
The `GW-DBTransaction-ID` header is a secondary server-side safety net for
bypass scenarios. Both serve different purposes:

1. Harness idempotency key: prevents re-invoking the side effect callback
   at all (harness-layer replay short-circuit).
2. `GW-DBTransaction-ID`: Guidewire-server-side rejection of repeated writes
   (different semantic — fails rather than replays).

Every `approved_execute` tool that writes to a Guidewire API MUST include a
`GW-DBTransaction-ID` in its Cloud API call. The value should be derived from
the harness's `idempotencyKey` or `planId` for traceability. Verify exact
TTL and uniqueness scope at `guidewire-adj` sandbox landing.

### BillingCenter Consumer Guide — key endpoint pages

| What | URL |
|---|---|
| BC accounts querying (`/billing/v1/accounts`) | <https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/BillingCenter/billing/accounts/c_querying_for_accounts.html> |
| BC payment instruments (`/billing/v1/accounts/{id}/payment-instruments`) | <https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/BillingCenter/billing/accounts/c_payment_instruments.html> |
| BC commission plans (`/admin/v1/commission-plans`) | <https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/BillingCenter/plans/commission-plans/c_working-with-commission-plans.html> |

**Confirmed path patterns (verified 2026-05-04):**

- `/billing/v1/accounts` — AUTHORITATIVE (querying for accounts)
- `/billing/v1/accounts/{accountId}/payment-instruments` — AUTHORITATIVE
- `/admin/v1/commission-plans` — AUTHORITATIVE (NOT `/billing/v1/commission*`)
- Commission sub-plans: `/admin/v1/commission-plans/{commissionPlanId}/commission-sub-plans`

The PRD's `whats-my-commission-status` tool must use `/admin/v1/commission-plans`,
not the `/billing/v1/commission*` path originally assumed. See audit
finding F-PRD-012.

---

## 2. Developer portal + API hub (open)

| What | URL |
|---|---|
| **Developers home** | <https://www.guidewire.com/developers> |
| Cloud APIs hub | <https://www.guidewire.com/developers/apis/cloud-apis> |
| All APIs index | <https://www.guidewire.com/developers/apis> |
| REST API Client (consume external services) | <https://www.guidewire.com/developers/apis/rest-api-client> · <https://developer.guidewire.com/rest-api-client/> |
| Configuration Guides | <https://www.guidewire.com/developers/developer-tools-and-guides/configuration-guides> |
| Integration Framework hub | <https://www.guidewire.com/developers/developer-tools-and-guides/integration-framework> |
| Integrations overview | <https://developer.guidewire.com/integrations/> |
| Configuration | <https://developer.guidewire.com/configuration/> |
| Developers blog | <https://www.guidewire.com/resources/blog/developers> (filterable) |

The historical standalone portal at `developer.guidewire.com` redirects
to `www.guidewire.com/developers` (verified 2026-05-04). Some
sub-pages on `developer.guidewire.com/...` paths still resolve.

---

## 3. App Events + Integration Gateway (event-driven outbound)

| What | URL |
|---|---|
| **App Events overview** | <https://docs.guidewire.com/education/cloud-integration-basics/latest/docs/integration_cloud_basics/appevents_overview/> |
| App Events blog (intro) | <https://www.guidewire.com/resources/blog/technology/simplify-event-driven-integrations-on-guidewire-cloud-with-app-events> |
| Application Events for Developers (PDF, third-party mirror) | <https://www.scribd.com/document/713300614/Application-Events-for-Developers> |
| Engineering blog post on Application Events Service | <https://medium.com/guidewire-engineering-blog/guidewire-application-events-service-d1b0bee685b3> |
| Outbound integrations (Part 1) | <https://www.guidewire.com/resources/blog/developers/simplifying-outbound-integrations-in-insurancesuite-cloud-part-1> |
| Outbound integrations (Part 2) | <https://www.guidewire.com/resources/blog/developers/simplifying-outbound-integrations-in-insurancesuite-cloud-part-2> |
| Cloud Integration Framework: tools | <https://www.guidewire.com/resources/blog/technology/cloud-integration-framework-the-right-tools-for-the-job> |

**Confirmed quotes from the App Events overview (AUTHORITATIVE, verified 2026-05-04):**

> "App Events makes it easy to publish events and full claim graph
> snapshots from the InsuranceSuite apps to downstream systems."

> "Events are delivered at least once."

> "Events are safe-ordered by the primary object that they are
> associated with."

> Webhooks subscriptions and Integration Gateway Camel route subscriptions
> are isolated — failures don't cascade. Consumers do not affect the
> performance of InsuranceSuite.

**Why this matters for our project:**

- App Events Webhooks → maps directly onto our `events-mcp` (E6)
  webhook receiver design.
- Integration Gateway = Apache Camel routes for downstream systems →
  out-of-scope for our MCP (we don't replace IG; we coexist).
- Per persona-7 finding (Anthropic / MCP architect), event ingestion
  belongs in infra, not MCP. App Events docs reinforce that decision.
- Per-primary-object safe ordering confirms the `shard_by: primaryObject.id`
  requirement in `events.yaml` profile config.

---

## 4. Cloud Console + provisioning (existing-customer surface)

| What | URL |
|---|---|
| Manage InsuranceSuite apps in GCC | <https://docs.guidewire.com/cloud/gcc-guide/insurer-developer/latest/manage-is-apps/> |
| Cloud platform releases hub (Palisades, Las Leñas, etc.) | <https://www.guidewire.com/products/technology/guidewire-cloud-platform-releases> |

**Note:** Guidewire Cloud Console (GCC) is the customer-facing control
plane. Customers access dev environments ("**planets**") via the
provisioning team — not via a public form. Our tools target the
**API plane** (Cloud APIs above), not the GCC plane.

---

## 5. Marketplace + Partner program

| What | URL |
|---|---|
| **Guidewire Marketplace** | <https://marketplace.guidewire.com/> |
| Partner Connect (overview) | <https://www.guidewire.com/partners/for-guidewire-partners-partnerconnect> |
| Partner Connect — Technology Partners | <https://www.guidewire.com/partnerconnect/solution/> |
| Partner Connect — Consulting Partners | <https://www.guidewire.com/partners/for-guidewire-partners-partnerconnect/consulting-partners> |

Relevant for E11+ marketplace publish epic (`guidewire-qqx`) and the
sandbox-application playbook in bead `guidewire-adj`.

---

## 6. Education + training

| What | URL | Access |
|---|---|---|
| **Guidewire Education** | <https://education.guidewire.com> | Account required |
| Best training courses for developers (blog) | <https://www.guidewire.com/resources/blog/developers/guidewires-best-training-courses-for-developers> | Open |
| Cloud Integration Basics (free) | <https://docs.guidewire.com/education/cloud-integration-basics/latest/> | Open |
| System API overview | <https://docs.guidewire.com/education/cloud-integration-basics/latest/docs/integration_cloud_basics/system_api_overview/> | Open |
| REST API Client overview | <https://docs.guidewire.com/education/cloud-integration-basics/latest/docs/integration_cloud_basics/rest_api_client_overview/> | Open |

The Cloud Integration Basics path under `docs.guidewire.com/education/`
is freely accessible and is the best zero-cost training for
contributors and cohort members.

---

## 7. REST API Client + PetStore example

Guidewire's REST API Client is the in-Studio tool for *consuming*
external services from inside InsuranceSuite. The reference example
uses **Swagger PetStore** — useful for us because it's the canonical
"is the toolchain working?" smoke test.

| What | URL |
|---|---|
| REST API Client guide | <https://www.guidewire.com/developers/apis/rest-api-client> |
| Developer reference | <https://developer.guidewire.com/rest-api-client/> |
| PetStore Swagger spec used in Guidewire example | <https://petstore.swagger.io/v2/swagger.json> |

**Configuration the reference shows:**

```
gwRestGen_endpoint_package    = "petstore"
gwRestGen_endpoint_source     = "https://petstore.swagger.io/v2/swagger.json"
gwRestGen_isInsuranceSuite    = "true"
```

(Useful as a mental model for how Guidewire generates client stubs
from OpenAPI specs.)

---

## 8. Community + support

| What | URL |
|---|---|
| Developer Community (account required) | <https://community.guidewire.com/s/> |
| Resources hub (case studies, blog) | <https://www.guidewire.com/resources> |
| Get-in-touch / contact | <https://www.guidewire.com/about/get-in-touch/contact-us> |

---

## 9. Third-party / community references (not Guidewire-published)

Useful for orientation but **not authoritative**. The
`guidewire-reference-librarian` agent flags these as "community"
when citing.

| What | URL |
|---|---|
| Guidewire Masters tutorials | <https://guidewiremasters.in/guidewire-policycenter-step-by-step-tutorial/> · <https://guidewiremasters.in/guidewire-documentation/> |
| CloudFoundation training | <https://learning.cloudfoundation.com/p/guidewire-training-free-course> |
| Guidewire certification overview (community) | <https://cloudfoundation.com/blog/guidewire-certification/> |
| MyTectra training | <https://www.mytectra.com/guidewire-training> |
| ExcelR training | <https://www.excelr.com/guidewire-training> |
| Real Trainings — free PDFs | <https://www.realtrainings.com/institutes/view/guidewire-training-material> |
| Scribd: PolicyCenter Academy V1.0 (course PDF mirror) | <https://www.scribd.com/presentation/560464017/GuideWire-PolicyCenter-Academy-Course-V1-0-Version-9-1031> |

---

## 10. Public open-source samples — gap

**As of 2026-05-04 there is no Guidewire-published public GitHub
repo of sample code.** The official sample code lives inside
InsuranceSuite Studio's "PetStore" walkthrough referenced above.

This gap is a **feature, not a bug**, for our project: the OSS repo
at `github.com/jeremylongshore/guidewire-mcp-for-claude` is the first
substantial public open-source sample anchored on Guidewire's published
API surface. (Lead-magnet thesis reinforced.)

---

## 11. Release notes (for tracking API drift)

| Release | URL |
|---|---|
| Cloud platform releases hub | <https://www.guidewire.com/products/technology/guidewire-cloud-platform-releases> |
| Palisades (current as of 2026-05) | published as part of the hub above |
| Las Leñas | (older release, see hub) |
| Innsbruck | (older release, see hub) |

`guidewire-reference-librarian` keeps an eye on this hub for typelist
changes, endpoint deprecations, and new App Events that affect our
tool catalog.

---

## How the agent uses this

The
[`guidewire-reference-librarian`](../.claude/agents/guidewire-reference-librarian.md)
agent:

1. **Reads this doc as its primary knowledge base.**
2. When a contributor or another agent asks "where's the spec for
   X?", it cites the relevant section above.
3. When a citation is missing or stale, it (a) does a `WebSearch` to
   verify, (b) updates this doc, and (c) responds with the corrected
   citation.
4. When designing a tool/profile/recording without sandbox access, it
   walks the contributor through the equivalent public-docs path so
   the work can ground in real Guidewire shapes.
5. When a Guidewire release lands (Palisades+1, etc.), it scans the
   release notes (§11) for changes that affect our tool catalog +
   profile templates + recordings.

## How to update this doc

- **Trivial fix (broken link, version bump):** edit + commit on a
  feature branch + PR. No issue needed.
- **Section addition (new public surface, new partner program):**
  open a small PR, link to the source, update both this doc + the
  agent's frontmatter description if scope materially changes.
- **Major restructure:** open an issue first, get a +1, then PR.

---

## Cross-references

- Agent: [`.claude/agents/guidewire-reference-librarian.md`](../.claude/agents/guidewire-reference-librarian.md)
- Citation audit: [`./blueprint/audits/00-LIBRARIAN-CITATION-AUDIT.md`](./blueprint/audits/00-LIBRARIAN-CITATION-AUDIT.md)
- Sandbox application playbook: bead `guidewire-adj` ↔ GH issue [#1](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/1)
- NO MOCKS rule: [`./blueprint/05-TECHNICAL-SPEC.md`](./blueprint/05-TECHNICAL-SPEC.md)
- v4 architecture: [`./003-DR-ARCH-oss-cowork.md`](./003-DR-ARCH-oss-cowork.md)
- Decision D-008 (NO MOCKS): [`./004-DR-DEC-architecture-decisions.md`](./004-DR-DEC-architecture-decisions.md)
