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

### Cloud API top-level landing

| What | URL |
|---|---|
| **Cloud APIs landing (open)** | <https://www.guidewire.com/developers/apis/cloud-apis> |

### Per-suite API references

| Suite | Latest reference | Module set |
|---|---|---|
| **PolicyCenter** | <https://docs.guidewire.com/cloud/pc/202503/apiref/> | Product Definition, Admin, Job, Policy, Account, Async, Common, Composite, Graph, System Tools |
| **ClaimCenter** | <https://docs.guidewire.com/cloud/cc/202411/apiref/> | Admin, Async, Claim, Common, **Composite**, System Tools |
| **ClaimCenter (older — 202111)** | <https://docs.guidewire.com/cloud/cc/202111/apiref/> | Older release; useful for tracking module-evolution drift |
| **BillingCenter** | <https://docs.guidewire.com/cloud/bc/202411/apiref/> | Admin, Async, **Billing**, Common, Composite, System Tools |
| **BillingCenter (202503)** | <https://docs.guidewire.com/cloud/bc/202503/apiref/> | Same module set as 202411 |
| **InsuranceSuite (cross, Palisades)** | <https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/Basic-REST-operations/introduction-to-Cloud-API/c_endpoints.html> | Cross-suite endpoint primer + BillingCenter Consumer Guide |

### Tenant-bundled Swagger UI (once an engagement is live)

Per the Guidewire developer portal, **Swagger UI is automatically
bundled with every InsuranceSuite Cloud application**. From inside
a tenant (or partner sandbox), the path is:

```
<applicationURL>/resources/swagger-ui/
```

This serves interactive API docs for the tenant's actual deployed
modules (Common, Policy, Claim, Billing, Admin, etc.). For our
project: when the first integration engagement opens, this is the
**capture-the-recordings entry point** — the tenant-specific
Swagger gives us the exact request/response shapes for THIS
carrier's product configuration, including custom-entity paths
that don't exist in the public apiref. See
[`05-TECHNICAL-SPEC.md` § 5](./blueprint/05-TECHNICAL-SPEC.md) for
the recording-capture pattern.

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

## 5. Marketplace + Partner program (sandbox path lives here)

| What | URL |
|---|---|
| **Guidewire Marketplace** | <https://marketplace.guidewire.com/> |
| Partner Connect (overview) | <https://www.guidewire.com/partners/for-guidewire-partners-partnerconnect> |
| Partner Connect — Technology Partners | <https://www.guidewire.com/partnerconnect/solution/> |
| Partner Connect — Consulting Partners | <https://www.guidewire.com/partners/for-guidewire-partners-partnerconnect/consulting-partners> |
| **Cloud Platform releases** (where new sandbox features land) | <https://www.guidewire.com/products/technology/guidewire-cloud-platform-releases> |

### InsuranceSuite API Sandbox (Palisades release, 2026)

Guidewire launched an **InsuranceSuite API Sandbox** in their
**Palisades** Cloud Platform release. Per the release notes
(2026-05-04): **same-day partner onboarding**, exposes API limits
exploration, and PolicyCenter + ClaimCenter API/app tutorials.
Access is **gated behind PartnerConnect** — not open-public — but
onboarding is now fast.

This is the path-to-tenant for the "first integration engagement"
model in [D-021](../../000-projects/guidewire/000-docs/004-DR-DEC-architecture-decisions.md#d-021).
Where D-021 says "first integration engagement brings their own
production tenant," the practical alternate path is **PartnerConnect
sandbox onboarding** — useful for Intent Solutions IO directly (as
a partner) when an inbound engagement opens, OR for the inbound
itself if they're not already a partner.

Operational note: the sandbox is a **shared partner sandbox** by
default (multi-tenant within the partner program), not an
isolated-per-engagement tenant. For per-engagement isolation, the
engagement either uses their own production tenant or requests a
dedicated sandbox.

Relevant for E11+ marketplace publish (`guidewire-qqx`) AND for
any engagement that needs sandbox-grade reachability before going
to production.

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
contributors.

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

| What | URL | Why useful |
|---|---|---|
| **`dev-power-up/initialize`** (community guide for spinning up Centers locally on macOS) | <https://github.com/dev-power-up/initialize> | Older but useful for pattern-matching Guidewire's stack — written by an ex-Guidewire engineer. |
| Guidewire Masters tutorials | <https://guidewiremasters.in/guidewire-policycenter-step-by-step-tutorial/> · <https://guidewiremasters.in/guidewire-documentation/> | Step-by-step PolicyCenter walkthroughs |
| CloudFoundation training | <https://learning.cloudfoundation.com/p/guidewire-training-free-course> | Free course |
| Guidewire certification overview (community) | <https://cloudfoundation.com/blog/guidewire-certification/> | Cert path overview |
| MyTectra training | <https://www.mytectra.com/guidewire-training> | Paid courses |
| ExcelR training | <https://www.excelr.com/guidewire-training> | Paid courses |
| Real Trainings — free PDFs | <https://www.realtrainings.com/institutes/view/guidewire-training-material> | PDF training material |
| Scribd: PolicyCenter Academy V1.0 (course PDF mirror) | <https://www.scribd.com/presentation/560464017/GuideWire-PolicyCenter-Academy-Course-V1-0-Version-9-1031> | Course PDF mirror |

### Guidewire's open-source test framework stack

Guidewire's official test framework runs on entirely open-source
tooling — useful for pattern-matching test design without ever
touching a Guidewire license:

| Tool | Role |
|---|---|
| **Karate** | API test DSL (Cucumber-extension) |
| **Cucumber** | BDD scenarios |
| **Gradle** | Build |
| **IntelliJ IDEA** | IDE |
| **JDK 11** | Runtime |

Pattern: the test recordings + replay framework in our
[`packages/audit/`](../packages/audit/) + the contract test layer
in `tests/recordings/` (see
[`05-TECHNICAL-SPEC.md` § 5](./blueprint/05-TECHNICAL-SPEC.md))
mirrors this approach in TypeScript / Vitest / undici. Carrier
test engineers reading our repo will recognize the shape.

---

## 10. Guidewire's public open-source — `guidewire-oss` GitHub org

**Updated 2026-05-04** (was previously logged as "gap"):
Guidewire maintains an official OSS hub at
[`github.com/guidewire-oss`](https://github.com/guidewire-oss) —
**~30 repos**, Apache-2.0-licensed, public. None of these expose
the InsuranceSuite Cloud API itself (that surface stays in
PartnerConnect / customer-tenant), but they reveal Guidewire's
infrastructure/tooling posture and provide useful
pattern-matching for our own architecture.

| Repo | URL | Why relevant |
|---|---|---|
| **`fern-platform`** | <https://github.com/guidewire-oss/fern-platform> | Unified test intelligence platform with multi-format ingestion, real-time analytics, LLM-powered insights. Go, ~444 stars. **Closest analog to our observability + testing-harness ambitions.** |
| **`guac`** | <https://github.com/guidewire-oss/guac> | Software security metadata graph DB. Pattern-relevant for our hash-chain audit + supply-chain provenance work. |
| `kubevela` (fork) | <https://github.com/guidewire-oss/kubevela> | Modern app platform — relevant if E10+ ever explores Guidewire-internal-app patterns. |
| `sawchain`, `ocm`, `uaa`, `teams360` | (see org listing) | Various infrastructure/platform tooling. |

**Browse the full list:** <https://github.com/guidewire-oss>

### Gosu — the Guidewire config/customization language (open source)

Guidewire Software created **Gosu** — an open-source, general-purpose
JVM language. **All Guidewire config and customization runs on Gosu.**
Useful to understand if our profile schema (`profiles/<customer>/`)
ever needs to mirror Guidewire-side rule shapes for higher-fidelity
mappings.

| What | URL |
|---|---|
| Gosu Language home | <https://gosu-lang.github.io/> |
| Gosu source on GitHub | <https://github.com/gosu-lang/gosu-lang> |

We do NOT plan to write Gosu in this project (TypeScript stack per
[D-001](../004-DR-DEC-architecture-decisions.md) + 05-TECH-SPEC § 1).
Gosu is in the librarian KB strictly as **read-only orientation**
for understanding what carrier teams' customizations look like.

### Implication for our positioning

The earlier "no Guidewire-published OSS sample" claim was wrong as
of Palisades. The corrected framing for the lead-magnet thesis:

- Guidewire's OSS org is real but lives at the **infrastructure /
  tooling** layer (test platforms, security graph, K8s).
- **Our repo is still the first substantial public OSS anchored on
  Guidewire's *Cloud API surface* + carrier-vocabulary tool design.**
  The differentiation holds — we're filling a different gap than
  what `guidewire-oss` covers.
- Reviewers from carrier IT who recognize `guidewire-oss` (e.g.
  `fern-platform` for test telemetry) will find our governance
  harness immediately legible because it sits on the same OSS-
  ergonomics + Apache-2.0 + observability-first foundation.

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
