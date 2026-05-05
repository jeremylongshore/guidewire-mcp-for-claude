# 04-SA — Security review

**Auditor:** `security-auditor`
**Date:** 2026-05-04
**Target:** `02-PRD.md` § 5 (harness contract) + § 6.1 / § 6.7 /
§ 6.8, `03-ARCHITECTURE.md` § 1.3 trust boundaries + § 3.3 audit
plane + § 3.5 auth plane, `05-TECHNICAL-SPEC.md` § 4 observability
+ § 8 security posture, `004-DR-DEC` D-006 / D-008 / D-019.
**Scope:** auth model (OAuth + JWT propagation), audit hash-chain
integrity, secrets posture (SOPS+age), BAA / PII surface,
revocation, threat model honesty, blast-radius bounding.
**Out of scope:** per-tool blast radius narrative
(`mcp-safety-reviewer` lane); Cloud API shape correctness
(`guidewire-api-archaeologist`).

---

## Verdict

**PASS-WITH-NOTES.** The pre-audit red-team panel already extracted
the load-bearing audit-chain finding (F-RT-5.1) and produced D-019,
which scopes the tamper-evidence claim honestly. With D-019 landed,
the security posture is the strongest I've reviewed in an OSS-tier
artifact: no standing service accounts, JWT propagation per actor,
`no audit = no write` as a hard rule (D-006), SOPS+age secrets, role
separation on the audit DB, structured refusals end-to-end. The
findings below are residual surface — revocation latency,
notification-on-pending, `audit_owner` operational identity
specification, and a cross-tenant correlation question. None is
load-bearing in the sense that F-RT-5.1 was; all are common-sense
hardening that an enterprise CISO will ask about in the second
review pass.

## Findings

### F-1 — `no audit = no write` (D-006) is enforced architecturally, not by convention
- **Severity:** PASS
- **Section:** `02-PRD.md` § 5.4 (execute), `03-ARCHITECTURE.md`
  § 5.3 step 7 + § 6 failure table row "Audit storage unreachable",
  `05-TECHNICAL-SPEC.md` § 4.7 architecture rules.
- **Finding:** This is the property I look for first in any
  governance-claiming runtime, and it's the property most
  governance-claiming runtimes botch. The blueprint enforces it
  *architecturally*: `harness.execute()` writes the audit row in a
  serializable transaction *before* invoking the side effect; if
  Postgres is unreachable, the failure surfaces as
  `AUDIT_UNREACHABLE` and the side effect is never invoked. The
  asymmetry vs `OBSERVABILITY_UNREACHABLE` (degraded warning, write
  proceeds) is named and defended in `03-ARCHITECTURE.md` § 6
  closing paragraph + `009 § 6` — observability is diagnostic,
  audit is correctness, treat them differently. The depcruise +
  AST rules in `05-TECHNICAL-SPEC.md` § 4.7 make the property
  un-bypassable: a `servers/**` file cannot import
  `clients/**`, and any HTTP write outside `execute()` fails CI.
  This is the right shape; SOC 2 reviewers will recognize it.
- **Recommendation:** Hold the line on the asymmetry through E1.
  The temptation under cold-start latency pressure (cf. F-5 in the
  architect-reviewer memo) will be to "fast-path" audit writes
  (write-behind, batched, async). Don't. The correctness story
  collapses if audit writes are reorderable with respect to side
  effects.
- **Cite:** `004-DR-DEC` D-006, `03-ARCHITECTURE.md:719-741`,
  `009 § 6`.

### F-2 — Revocation latency is silent in the auth model
- **Severity:** CHALLENGE
- **Section:** `02-PRD.md` § 6.1 (`auth.yaml`),
  `05-TECHNICAL-SPEC.md` § 8.1.
- **Finding:** Token lifetime defaults to 3600s with proactive
  refresh at 80%. JWT propagation per actor is correct. But there
  is no documented revocation surface. An offboarded employee with
  a valid JWT keeps working access for up to 60 minutes after
  HR's offboarding event. In carrier deployments, employee
  termination is a same-day SLO (often same-hour for sensitive
  roles). The blueprint inherits the OAuth lifetime default and
  doesn't surface the trade-off. **The pre-audit red team raised
  this as F-RT-5.3** — the recommendation there was to document
  the trade-off and offer (a) shorter `oauth.token_lifetime_seconds`
  or (b) per-call JWT introspection (RFC 7662). I don't see that
  recommendation reflected in the merged blueprint. It needs to
  land before the staffed panel passes.
- **Recommendation:** Add to `05-TECHNICAL-SPEC.md` § 8.1 a
  sub-row in the auth model section:

  > "Revocation latency. OSS default is bounded by token lifetime
  > (3600s = 60 min). Carriers requiring shorter revocation can:
  > (a) reduce `oauth.token_lifetime_seconds` to 600 or lower,
  > accepting the OAuth refresh load; (b) enable per-call JWT
  > introspection (RFC 7662) by setting
  > `auth.yaml.oauth.introspect: true` — adds approx 30ms per call.
  > The trade-off is operator-driven, not OSS-defaulted."

  Then extend the `auth.yaml` schema in `02-PRD.md` § 6.1 with the
  optional `oauth.introspect: bool` field. ~15 min edit.
- **Cite:** `02-PRD.md:732-746`, `05-TECHNICAL-SPEC.md` § 8.1,
  `02-RED-TEAM-PANEL.md` F-RT-5.3.

### F-3 — `audit_owner` Postgres role is named but its operational owner is unspecified
- **Severity:** CHALLENGE
- **Section:** `004-DR-DEC` D-019, `05-TECHNICAL-SPEC.md` § 8.2.
- **Finding:** D-019 + `05-TECHNICAL-SPEC.md` § 8.2 declare three
  Postgres roles: `audit_writer` (INSERT-only on `audit_entries`;
  the harness runs as this role), `audit_reader` (SELECT-only;
  `verifyChain` runs as this role), `audit_owner` (DDL/GRANT;
  "held outside the harness process by a separate operational
  identity"). The first two are concrete and testable. The third
  is the one a CISO will press hardest: *who* is the operational
  identity? Cloud Run service account? A human DBA? A human DBA's
  break-glass credential? The text says "separate operational
  identity" without naming it. In single-operator OSS deployments
  (the default per `03-ARCHITECTURE.md` § 7.1), there is no
  separate operational identity — the operator who runs the
  harness *is* the DBA. The role separation collapses unless the
  documentation directs the operator to provision the
  `audit_owner` role to a credential the harness process never
  loads. As-written, a fresh contributor who pushes the
  Postgres migration and runs the harness against the same
  `DATABASE_URL` defeats the role separation by accident.
- **Recommendation:** Add to `05-TECHNICAL-SPEC.md` § 8.2 (the
  audit hash-chain section) an "Operational identity for
  `audit_owner`" subsection that says:

  > "The `audit_owner` role MUST NOT be granted to any credential
  > the harness process loads at runtime. In single-operator OSS
  > deployments, this means the human operator runs the migration
  > as `audit_owner`, then revokes that credential from the
  > harness's `DATABASE_URL` and leaves only the `audit_writer`
  > grant. In multi-tenant deployments with Cloud SQL, the
  > recommended posture is: a separate Cloud SQL admin
  > credential held by the platform team performs DDL; the
  > harness service account is granted only `audit_writer`."

  Then add to `07-ROADMAP.md` § E1 exit criteria a row asserting
  the migration script documents the role-grant order explicitly
  and the integration test verifies that the harness process
  cannot UPDATE / DELETE `audit_entries` (i.e. the
  `audit_writer`-only assumption is enforced at the test
  boundary).
- **Cite:** `004-DR-DEC` D-019, `05-TECHNICAL-SPEC.md:404-414`,
  `03-ARCHITECTURE.md:752-756`.

### F-4 — Cross-tenant correlation as defence is named in D-019 but not surfaced in the threat model table
- **Severity:** NOTE
- **Section:** `05-TECHNICAL-SPEC.md` § 8.5 (threat model).
- **Finding:** D-019's option (3) (red-team F-RT-5.1
  recommendation) was: *"cross-tenant correlation — independent
  customers' chains are independently observed; a rewrite of
  tenant A is detectable by tenant B's copy of trans-tenant
  evidence."* The threat-model table at § 8.5 doesn't mention
  this property. It's not load-bearing for the OSS scope (single-
  tenant deployments don't get it), but it *is* a property
  enterprise carriers will discover when they run the platform
  for multiple LOBs against multiple Hub tenants — the platform
  ships them a free additional defense layer they didn't ask
  for. Noting it in the threat model table strengthens the
  artifact without re-architecting anything.
- **Recommendation:** Add a row to the threat model table at
  `05-TECHNICAL-SPEC.md` § 8.5: *"Compromised harness DB
  (privileged DBA, multi-tenant) — defence-in-depth via cross-
  tenant correlation: a rewrite of tenant A's chain does not
  alter tenant B's chain; carriers running multiple tenants can
  cross-check chain heads. Single-tenant deployments do not get
  this property."*
- **Cite:** `004-DR-DEC` D-019 option 3, `05-TECHNICAL-SPEC.md`
  § 8.5.

### F-5 — Approval timeout has no notification commitment
- **Severity:** CHALLENGE
- **Section:** `02-PRD.md` § 5.3 (approval state machine),
  `05-TECHNICAL-SPEC.md` § 4.11 (deferred Slack/PagerDuty/ntfy).
- **Finding:** The pre-audit red team raised this as F-RT-5.2.
  An approval that expires writes a single audit row and a Sentry
  fingerprint; nothing on the operator's pager. In a real pilot,
  approver PTO + harness silence = silently-blocked underwriters.
  The red-team recommendation was that the blueprint commit to
  *signal availability* (pino WARN, AppError code, Sentry
  fingerprint) without committing to *delivery* (Slack /
  PagerDuty / ntfy is the carrier's responsibility). I don't see
  that explicit signal-availability commitment in the merged
  blueprint at § 4 or § 8. Without it, the carrier reads the doc
  and cannot tell whether they're on the hook for wiring the
  notification or whether the platform does it.
- **Recommendation:** Add a sub-paragraph to
  `05-TECHNICAL-SPEC.md` § 4.5 (the AppError / Sentry section):

  > "Approval timeout. When `approvals.wait()` returns
  > `state: 'expired'`, the harness emits a WARN-level pino log
  > carrying the full structured fields (§ 4.4 schema) AND raises
  > `AppError({ code: 'APPROVAL_TIMEOUT', tool_name, mode })`,
  > which Sentry groups as a single Issue per `[code, tool_name,
  > mode]` tuple. The blueprint commits to *signal availability*
  > at this surface; *delivery* (Slack, PagerDuty, ntfy, email) is
  > the operator's wiring per § 4.9 endpoint configuration."

  ~15 min edit. Closes the red-team finding without committing
  the OSS to a notification surface it doesn't ship.
- **Cite:** `02-PRD.md` § 5.3, `05-TECHNICAL-SPEC.md` § 4.5 +
  § 4.11, `02-RED-TEAM-PANEL.md` F-RT-5.2.

### F-6 — SOPS+age secret rotation cadence is documented; the BAA carve-out for health LOBs is correct but the carve mechanic deserves a runtime check
- **Severity:** NOTE
- **Section:** `02-PRD.md` § 6.8 (`pii-policy.yaml`),
  `05-TECHNICAL-SPEC.md` § 8.3 (rotation table) + § 8.4 (BAA
  path).
- **Finding:** The rotation table at § 8.3 is well-bounded:
  Guidewire OAuth client secret per carrier policy (90d typical),
  age private key annual, Sentry DSN on suspected exposure,
  Postgres password quarterly, GitHub Actions
  `GUIDEWIRE_SANDBOX_TOKEN` per sandbox tenant policy. Honest +
  defensible. The BAA carve at § 8.4 + `02-PRD.md` § 6.8 is the
  right shape — a carrier with health LOBs MUST set
  `pii-policy.yaml.baa_required: true`, and the harness MUST
  refuse to load a profile carrying health LOBs without the flag.
  The mechanism description is sound. **What's missing:** the
  runtime-check enforcement. § 8.4 says "the
  `mcp-safety-reviewer` GW-1.8 lane verifies the carve-out is
  honored at boot" — but verification by audit-memo-narrative is
  not the same as verification by code. A boot-time check that
  inspects every LOB in the active profile, identifies any
  classified as health (need a `lob_class: health` tag, currently
  absent from the schema), and refuses if `baa_required: false`,
  would be the architectural enforcement. As-shipped, the carrier
  with a health LOB and a misconfigured profile fails open.
- **Recommendation:** Two changes. (a) Add to `02-PRD.md` § 6.3
  (`lob.yaml`) an optional `lob_class: health | non_health` field
  per LOB. Default `non_health`. (b) Add to the harness's boot
  validation (`packages/schemas/`) a rule:
  *"If any LOB in `lob.yaml` has `lob_class: health` and
  `pii-policy.yaml.baa_required: false`, refuse boot."*
  The `mcp-safety-reviewer` lane verifies the rule exists; the
  rule itself enforces at runtime. ~30 min PRD edit + 1 line of
  Zod refinement at E4.
- **Cite:** `02-PRD.md:776-790` (§ 6.3) + `02-PRD.md:900-926`
  (§ 6.8), `05-TECHNICAL-SPEC.md` § 8.3-8.4.

### F-7 — Idempotency two-key model honestly distinguishes harness-side vs wire-side; one residual risk worth noting
- **Severity:** PASS
- **Section:** `02-PRD.md` § 5.4, `05-TECHNICAL-SPEC.md` § 3.4,
  `03-ARCHITECTURE.md` § 5.3 step 6, `009 § 4`.
- **Finding:** The librarian-audit P1 fix landed cleanly. `gwh1:`
  is the harness-side replay key (Postgres cache, returns prior
  result); `GW-DBTransaction-ID` is the wire-side
  duplicate-rejection key (Cloud API fails with
  `AlreadyExecutedException`). The two purposes are distinguished
  in PRD § 5.4, in TECH-SPEC § 3.4.1's table, and in
  ARCHITECTURE § 5.3 step 6. The `HarnessError` enum carries
  `GW_DBTRANSACTION_DUPLICATE` as a forensic-only code (PRD §
  5.8). No `latest/` URLs, no Stripe-style idempotency-replay
  conflation. **This is the cleanest articulation of a two-tier
  idempotency contract I've reviewed in an OSS audit-chain
  design.**
- **Recommendation:** None. One forensic-only note: when E3 lands
  the harness, the integration test that simulates
  `GW_DBTRANSACTION_DUPLICATE` should also assert that an audit
  entry of type `execute.failed` with the corresponding code
  fires — proves the failure is observable, not silent.
- **Cite:** `02-PRD.md:482-522`, `05-TECHNICAL-SPEC.md` § 3.4.1,
  `03-ARCHITECTURE.md:670-695`.

## Summary

Recommended actions in priority order:

1. **F-2 (CHALLENGE):** add revocation-latency trade-off to
   `05-TECHNICAL-SPEC.md` § 8.1 + extend `auth.yaml` schema in
   `02-PRD.md` § 6.1. Closes red-team F-RT-5.3. ~15 min.
2. **F-3 (CHALLENGE):** specify the operational identity for
   `audit_owner` in `05-TECHNICAL-SPEC.md` § 8.2 + add E1 exit
   criterion that the integration test asserts `audit_writer`
   cannot UPDATE / DELETE. ~30 min.
3. **F-5 (CHALLENGE):** add the approval-timeout signal-
   availability commitment to `05-TECHNICAL-SPEC.md` § 4.5.
   Closes red-team F-RT-5.2. ~15 min.
4. **F-6 (NOTE):** add `lob.yaml.lob_class` field + Zod refinement
   making the BAA carve a runtime check. ~30 min PRD + 1 line of
   Zod at E4.
5. **F-4 (NOTE):** mention cross-tenant correlation in the threat
   model table. ~10 min.

PASS endorsements (F-1, F-7) are durable. The audit-chain
architectural enforcement (F-1) and the two-key idempotency
articulation (F-7) are the security-side properties that make
this artifact credible to a CISO on first read.

E1 is unblocked from this lane subject to the F-3 exit-criteria
addition. The CHALLENGEs (F-2, F-3, F-5, F-6) are all blueprint
edits, not re-design.

jeremylongshore.com made me do it
  -claude
intentsolutions.io
