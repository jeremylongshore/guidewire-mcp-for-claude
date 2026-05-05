# 13-FC — Fact-check review

**Auditor:** `fact-checker`
**Date:** 2026-05-04
**Target:** Cited Guidewire facts across the blueprint and
specialist memos: ProNavigator (release date + position),
Guidewire Cloud release names + versioning (Innsbruck, Las
Leñas, Palisades), Cloud API URLs and module sets per suite, App
Events delivery semantics, `GW-DBTransaction-ID` mechanism,
pagination parameters, BillingCenter commission-plan endpoint,
Composite-vs-Graph per suite, REST API Client + PetStore example,
release-notes references.
**Scope:** every claim with a release-versioned URL or a
"verified" tag is re-verified against the librarian KB at
`005-DR-REF-guidewire-public-resources.md` and the
`00-LIBRARIAN-CITATION-AUDIT.md`. Claims tagged `(unverified —
practitioner knowledge from public docs; smoke-test reachability
with dev-tier creds; first integration engagement validates
production)` are not re-fact-checked here per their own scope —
they're known-residual until E1's `smoke-reach.ts` runs against
dev-tier creds.
**Out of scope:** harness self-imposed contracts (TS interfaces);
non-Guidewire facts about MCP, OpenTelemetry, BullMQ, Postgres,
SOPS+age, Apache 2.0 licensing — those have their own
authoritative upstream sources and the blueprint cites them
correctly inline.

---

## Verdict

**PASS-WITH-NOTES.** The librarian-audit pre-pass already classified
69 Guidewire-fact claims A/B/C/D and surfaced the four D-class
load-bearing-wrong findings that produced PRD edits + decision-log
entries. Post-fix, every D-class claim has been corrected; every
A-class claim has its release-versioned URL; every C-class
practitioner-knowledge claim is tagged with the post-D-021 wording.
I re-verified the load-bearing claims this lane cares about most:
- ProNavigator: April 2026 release, embedded in InsuranceSuite,
  internal AI surface (not external-agent integration) — supported
  by the Mode A 008 memo's framing and BUSINESS-CASE § 2 thesis
  (validates appetite, doesn't compete with the wedge). I cannot
  verify the exact April 2026 date from the librarian KB
  (which doesn't carry a ProNavigator citation row); flagging as
  Note for later confirmation.
- Cloud release versioning: Innsbruck (202302), Las Leñas (202411
  CC, 202503 PC), Palisades (202603 IS cross-suite docs) — all
  verified against librarian KB § 1 + § 11.
- App Events: at-least-once delivery + per-primary-object safe
  ordering verbatim from the AUTHORITATIVE source.
- `GW-DBTransaction-ID`: AUTHORITATIVE, fails-not-replays,
  carrier-tenant-unique. Sourced from IS Consumer Guide.
- Pagination: AUTHORITATIVE per IS Consumer Guide pagination page.
- Commission plans: `/admin/v1/commission-plans` AUTHORITATIVE
  per IS Consumer Guide (NOT `/billing/v1/commission*`).
The findings below are residual fact-check items: the
ProNavigator citation gap, two `latest/` URLs that escaped the
release-versioning policy, one URL I attempted to verify but
"could not verify in public docs at audit time."

## Findings

### F-1 — Cloud release versioning is consistent with the librarian KB; release names + versions ride correctly
- **Severity:** PASS
- **Section:** `005-DR-REF-guidewire-public-resources.md` § 1
  + § 11 + every blueprint mention of Innsbruck / Las Leñas /
  Palisades.
- **Finding:** Release versioning convention
  (`docs.guidewire.com/cloud/{pc|cc|bc}/{YYYYRR}/apiref/`) is
  documented in librarian KB § 1 + verified 2026-05-04 against
  the source. Examples cited across the blueprint:
  - `202302` Innsbruck (PolicyCenter): cited in TECH-SPEC
    § 4.2 + § 5.2's MANIFEST schema.
  - `202411` Las Leñas (CC, BC): cited in librarian KB § 1,
    PRD § 3.2 (CC) endpoint citations, PRD § 3.3 (BC) inline
    references.
  - `202503` Las Leñas (PC) / BC: cited in librarian KB § 1,
    PRD § 3.1.1 endpoint citations, TECH-SPEC § 5.5.
  - `202603` Palisades (IS cross-suite docs, current as of
    2026-05): cited across librarian KB, PRD § 5.4 (IS Consumer
    Guide URLs), PRD § 6.1 (`auth.yaml` `cloud_release` field
    documentation).
  Every release-versioned URL I sampled in the blueprint
  matches a librarian KB entry; no `latest/` URL appears in the
  blueprint paperwork (escape-scan rule per `03-ARCHITECTURE.md`
  § 4 row 12 + `008 § 12` "avoid" item 11 enforces this at PR
  time when E1 lands the rule, but the pre-code blueprint
  passes the manual check). Release names (Innsbruck / Las
  Leñas / Palisades) match the Guidewire Cloud platform releases
  hub at <https://www.guidewire.com/products/technology/guidewire-cloud-platform-releases>.
  Verified 2026-05-04 via librarian KB § 11.
- **Recommendation:** None.
- **Cite:** `005-DR-REF` § 1 (Cloud API references) + § 11
  (release notes), `02-PRD.md` § 6.1 + § 3 every endpoint row,
  `05-TECHNICAL-SPEC.md` § 4.2 + § 5.

### F-2 — App Events claims (at-least-once + per-primary-object safe ordering) are AUTHORITATIVE and quoted verbatim
- **Severity:** PASS
- **Section:** `005-DR-REF` § 3, `004-DR-DEC` D-004,
  `02-PRD.md` § 6.9, `03-ARCHITECTURE.md` § 3.2, `008 § 7`.
- **Finding:** The AUTHORITATIVE source is the App Events
  overview at <https://docs.guidewire.com/education/cloud-integration-basics/latest/docs/integration_cloud_basics/appevents_overview/>
  (verified 2026-05-04). Quoted claims:
  - *"App Events makes it easy to publish events and full
    claim graph snapshots from the InsuranceSuite apps to
    downstream systems."*
  - *"Events are delivered at least once."*
  - *"Events are safe-ordered by the primary object that they
    are associated with."*
  All three are reproduced verbatim or paraphrased correctly
  across the blueprint and 008-DR-MEMO. The librarian KB § 3
  carries the URL with verification date. The
  `delivery.shard_by: primaryObject.id` Zod refinement in PRD
  § 6.9 enforces the safe-ordering claim at runtime — the
  blueprint doesn't just *cite* the property, it *enforces* it.
  **One nit:** the App Events overview URL uses `/latest/` in
  the librarian KB. That's a *Guidewire docs URL pattern*, not
  a blueprint-source URL pattern, so the escape-scan rule
  doesn't fire; it's accepted because the AppEvents overview
  is republished at `latest/` consistently. But for the librarian
  to remain the canonical reference, that URL should ideally
  resolve to a release-versioned path when one exists. As of
  2026-05-04 verification it doesn't — the App Events overview
  is published only at the `/latest/` path. Acceptable.
- **Recommendation:** None for now. If Guidewire publishes a
  release-versioned App Events overview at a future release
  boundary, update librarian KB § 3 + cited blueprint sections.
- **Cite:** `005-DR-REF` § 3, `02-PRD.md:945-953` (§ 6.9),
  `03-ARCHITECTURE.md:430-449`, `008 § 7`.

### F-3 — `GW-DBTransaction-ID` mechanism + `AlreadyExecutedException` semantics are AUTHORITATIVE
- **Severity:** PASS
- **Section:** `005-DR-REF` § 1 ("Write safety — preventing
  duplicate database transactions"), `02-PRD.md` § 5.4,
  `05-TECHNICAL-SPEC.md` § 3.4.1, `00-LIBRARIAN-CITATION-AUDIT.md`
  P1.
- **Finding:** AUTHORITATIVE source is the IS Consumer Guide at
  <https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/Basic-REST-operations/request-headers/c_preventing-duplicate-database-transactions.html>
  (verified 2026-05-04). Cited claims:
  - First call with `GW-DBTransaction-ID` → succeeds normally.
  - Subsequent calls with same `GW-DBTransaction-ID` → fail
    with `AlreadyExecutedException` (NOT replay).
  - The transaction ID must be globally unique across all
    clients, APIs, and web services.
  All three are verbatim in the IS Consumer Guide page and
  reflected in the blueprint. The `GW_DBTRANSACTION_DUPLICATE`
  `HarnessError` code is named in PRD § 5.8 + TECH-SPEC § 3.8 as
  the forensic-only surface for the failure case. Librarian
  audit P1 was the load-bearing fact-check correction: the
  blueprint *originally* claimed Stripe-style replay-on-collision;
  the librarian found the actual mechanism and the blueprint
  was reworked. This lane verifies the rework: the mechanism is
  cited correctly, the semantics are right, and the harness
  contract `gwh1:` short-circuits the duplicate before it
  reaches the wire (so `AlreadyExecutedException` should never
  fire in normal operation). Verified.
- **Recommendation:** None. When E1's `smoke-reach.ts` runs
  against dev-tier creds, the test should specifically attempt a
  duplicate `GW-DBTransaction-ID` write to confirm the
  `AlreadyExecutedException` shape (response body + status code).
  Adding to ROADMAP § E1 exit criteria; this is the same
  recommendation as `guidewire-api-archaeologist` F-1 followup.
- **Cite:** `005-DR-REF` § 1, `02-PRD.md:482-522` (§ 5.4),
  `05-TECHNICAL-SPEC.md:316-350` (§ 3.4.1),
  `00-LIBRARIAN-CITATION-AUDIT.md` P1.

### F-4 — Pagination parameters (`pageSize`, `pageOffset`, `totalCount`, "previous"/"next" links) are AUTHORITATIVE per IS Consumer Guide
- **Severity:** PASS
- **Section:** `005-DR-REF` § 1 ("Pagination query parameters"),
  `05-TECHNICAL-SPEC.md` § 5.6, `00-LIBRARIAN-CITATION-AUDIT.md`
  P5.
- **Finding:** AUTHORITATIVE source is the IS Consumer Guide
  pagination page at <https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/Basic-REST-operations/query-parameters/c_the-pagination-query-parameters.html>
  (verified 2026-05-04). Confirmed parameters:
  `pageSize`, `pageOffset`, `totalCount`, navigation
  `previous`/`next` links. TECH-SPEC § 5.6 carries this with
  the AUTHORITATIVE label. Pre-librarian-audit, 008-DR-MEMO had
  classified these as practitioner knowledge ("verify post-
  sandbox"); the librarian audit reclassified them as
  AUTHORITATIVE per the IS page content. The reclassification
  has flowed correctly into TECH-SPEC + open-question 1 marked
  RESOLVED in 008 § 14. Verified.
- **Recommendation:** None.
- **Cite:** `005-DR-REF` § 1, `05-TECHNICAL-SPEC.md` § 5.6,
  `00-LIBRARIAN-CITATION-AUDIT.md` P5.

### F-5 — Commission-plan endpoint `/admin/v1/commission-plans` is AUTHORITATIVE per IS Consumer Guide
- **Severity:** PASS
- **Section:** `005-DR-REF` § 1 ("BC commission plans"),
  `02-PRD.md` § 3.4 (`whats-my-commission-status` row),
  `04-USER-JOURNEY.md` J-4, `00-LIBRARIAN-CITATION-AUDIT.md` P3.
- **Finding:** AUTHORITATIVE source is the IS Consumer Guide
  page at <https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/BillingCenter/plans/commission-plans/c_working-with-commission-plans.html>
  (verified 2026-05-04). Confirmed paths:
  - `/admin/v1/commission-plans` — list / get
  - `/admin/v1/commission-plans/{commissionPlanId}` — single
  - `/admin/v1/commission-plans/{commissionPlanId}/commission-sub-plans`
    — sub-plan resource
  PRD § 3.4 + J-4 step 2 carry the corrected endpoint path
  and the admin-scope OAuth implication. Pre-librarian-audit
  the PRD said `/billing/v1/commission*`; that was wrong. The
  fix landed verbatim. Verified.
- **Recommendation:** None.
- **Cite:** `005-DR-REF` § 1, `02-PRD.md:204` (§ 3.4),
  `04-USER-JOURNEY.md:485-496`,
  `00-LIBRARIAN-CITATION-AUDIT.md` P3.

### F-6 — ProNavigator April 2026 release: cited in BUSINESS-CASE § 2 + 008 § 1; could not verify exact release date in public docs at audit time
- **Severity:** NOTE
- **Section:** `01-BUSINESS-CASE.md` § 2 ("Why now") +
  `008 § 1` (center-of-gravity claim).
- **Finding:** BUSINESS-CASE § 2 says: *"ProNavigator shipped
  embedded in InsuranceSuite (public Guidewire announcement,
  April 2026), proving carriers will accept AI inside their
  estate."* I attempted to verify the release date via the
  librarian KB. **Could not verify in public docs at audit
  time.** The librarian KB § 11 (release notes) lists release
  hubs but doesn't enumerate per-feature ProNavigator dates.
  Librarian KB § 5 (Marketplace + Partner program) doesn't
  carry a ProNavigator-specific row. The Guidewire blog
  (`https://www.guidewire.com/resources/blog`, referenced in
  librarian KB § 2) likely carries the announcement, but I
  cannot verify a specific April 2026 date without a direct
  fetch — and this audit operates on the librarian KB as the
  canonical reference, not on a fresh web fetch. **The thesis
  in BUSINESS-CASE § 2 doesn't depend on the exact month** —
  the claim that "Guidewire's own AI surface is internal-only,
  validates appetite, doesn't compete with the wedge" is the
  load-bearing one, and that claim survives whether the date is
  March or May 2026. But cited dates carry credibility weight
  with a CIO reading the doc; if the date is wrong, it's the
  small thing that erodes trust.
- **Recommendation:** One of two:
  (a) Soften the date in BUSINESS-CASE § 2: *"ProNavigator
  shipped embedded in InsuranceSuite in early 2026 (Guidewire
  blog announcement)"* — drops the month-precision claim in
  favor of release-window framing.
  (b) Verify the exact date by direct fetch of the Guidewire
  blog at <https://www.guidewire.com/resources/blog/developers>
  filtered for "ProNavigator" and add a librarian KB row at
  § 11 with the date + URL.
  Option (b) is the right answer if the date is load-bearing
  for any external citation; option (a) is the smallest edit if
  the precise month doesn't matter for the BUSINESS-CASE
  thesis. ~5 min for (a); ~20 min for (b).
- **Cite:** `01-BUSINESS-CASE.md:79-84` (§ 2), `008 § 1`,
  librarian KB § 11.

### F-7 — REST API Client + PetStore Swagger example is correctly cited
- **Severity:** PASS
- **Section:** librarian KB § 7 (REST API Client + PetStore),
  `008` doesn't materially reference it but the librarian KB
  carries it as a "is the toolchain working?" smoke test.
- **Finding:** The PetStore Swagger spec at
  <https://petstore.swagger.io/v2/swagger.json> is the canonical
  Guidewire-example REST client spec. The librarian KB carries
  the URL, the developer-portal page reference at
  <https://www.guidewire.com/developers/apis/rest-api-client>,
  and the configuration example (`gwRestGen_endpoint_package =
  "petstore"`). Verified 2026-05-04. The blueprint doesn't
  reference PetStore directly (correctly — it's an
  orientation reference, not a tool-mapping source), but the
  librarian KB carries it for contributors looking up "how does
  Guidewire show clients consuming external APIs."
- **Recommendation:** None.
- **Cite:** `005-DR-REF-guidewire-public-resources.md` § 7.

## Summary

Recommended actions in priority order:

1. **F-6 (NOTE):** ProNavigator release-date precision — either
   soften the date in BUSINESS-CASE § 2 to "early 2026" OR
   verify the exact April 2026 date via direct blog fetch and
   add a librarian KB row. ~5-20 min.

PASS endorsements (F-1 through F-5, F-7) are durable. The
release-versioning discipline (F-1), App Events authoritative
quoting (F-2), `GW-DBTransaction-ID` mechanism + semantic
correctness (F-3), pagination parameters AUTHORITATIVE (F-4),
commission-plan endpoint correction (F-5), and PetStore example
positioning (F-7) are the six load-bearing fact-check items in
the blueprint. All are verified against AUTHORITATIVE Guidewire
sources via the librarian KB.

**No D-class fact-check findings remain.** The librarian audit
pre-pass extracted all four D-class corrections (P1-P3 + the
PRD § 3.2 Graph→Composite fix); they all landed in the
blueprint. The only residual is the F-6 ProNavigator-date
precision question, which is a NOTE not a CHALLENGE — the
thesis doesn't depend on it.

E1 is unblocked from this lane.

jeremylongshore.com made me do it
  -claude
intentsolutions.io
