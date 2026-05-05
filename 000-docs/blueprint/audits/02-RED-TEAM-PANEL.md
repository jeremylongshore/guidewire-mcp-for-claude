# 02 — Multi-persona red-team panel (pre-staffed-audit gate)

**Filed:** 2026-05-04
**Tool:** `/loop` multi-persona red-team — 9 personas channeled from
[`../../002-DR-CRIT-personas.md`](../../002-DR-CRIT-personas.md).
**Why this audit exists:** before the GW-1.8 staffed 11-auditor panel
opens, the blueprint runs the gauntlet of the same 9 attacker
personas that drove its design. The librarian audit
([`./00-LIBRARIAN-CITATION-AUDIT.md`](./00-LIBRARIAN-CITATION-AUDIT.md))
caught factual / citation drift; the consistency audit
([`./01-CONSISTENCY-AUDIT.md`](./01-CONSISTENCY-AUDIT.md)) caught
mechanical drift; this red team catches *load-bearing-claim* drift —
the kind of finding where the prose looks fine but the persona's
mental model breaks if you press on it. The cost of running this
informally now is one session; the cost of a specialist auditor
discovering the same break during GW-1.8 is a whole lane re-run.

---

## Executive summary

| Persona | FAIL | CHALLENGE | PASS |
|---|---|---|---|
| 1 P&C Carrier CIO | 0 | 3 | 0 |
| 2 Underwriter (line) | 0 | 2 | 1 |
| 3 Claims VP | 0 | 2 | 0 |
| 4 MGA Broker / Producer | 0 | 2 | 1 |
| 5 Security / CISO | 1 | 2 | 0 |
| 6 Guidewire SI Partner | 0 | 2 | 1 |
| 7 Anthropic / MCP architect | 0 | 3 | 0 |
| 8 Kim — claims operator | 0 | 2 | 1 |
| 9 Underwriting manager | 1 | 1 | 0 |
| **Totals** | **2** | **19** | **4** |

## Verdict

**Block GW-1.8 until 2 FAILs resolved; the 19 CHALLENGEs are not
blockers but most should be addressed for blueprint v1.0.** The two
FAILs are both *load-bearing claim drift*: (1) the harness audit
chain ships a tamper-evidence guarantee that the persona-5 attacker
breaks because the per-tenant chain has no cross-tenant root and no
external commitment surface, so a privileged operator can rewrite an
entire tenant's chain unobservably; (2) the manager view (Persona 9
+ E2.5) declares 5 tools but the schema fields they query (LOB-rollup,
segment dimensions, declination patterns) require profile YAML
extensions that the 9-YAML profile contract doesn't yet declare —
boot-time fail-fast cannot validate what the schema doesn't model.
Both fixes are structural and one decision-log entry away. Neither
discredits the wedge; both compromise the audience's trust if not
fixed before the staffed panel.

The 19 CHALLENGEs cluster around 4 cross-cutting themes (see § Cross-
cutting findings) that warrant either a D-019 / D-020 entry in the
decision log or explicit acceptance in `00-AUDIT-RESPONSES.md`.

---

## Findings by persona

### Persona 1 — P&C Carrier CIO

The CIO's load-bearing question is "what does it cost me, in
engineering hours, to take this from clone-zero to production-grade
on my Guidewire estate?" The blueprint answers that question
implicitly by listing the 9 profile YAMLs; the CIO presses on each
field.

**F-RT-1.1 — 🟡 CHALLENGE — Per-customer mapping cost is described,
not estimated**

- **Attack:** *"Your `profiles/_template/` is nine YAML files. Acme
  has 47 LOB extensions, 12 jurisdictions of denial-reason typelists,
  3 custom UWCenter rule families, and a producer-code uniqueness
  model that breaks the moment we acquired a competitor in 2024.
  Tell me — in engineer-weeks — what filling those YAMLs costs me.
  If you can't, I'm not signing the SOW."*
- **What the blueprint says:** [`01-BUSINESS-CASE.md` § 4](../01-BUSINESS-CASE.md)
  enumerates the customization surface as "exactly what an SI ships,"
  but no document estimates engineer-weeks for a representative
  carrier shape (e.g. mid-sized commercial carrier, single
  jurisdiction, 12 LOBs). [`02-PRD.md` § 6](../02-PRD.md) names the
  9 YAMLs but does not quantify population effort.
- **Why this lands:** the CIO needs a cost story, not a process
  story. The lead-magnet thesis (D-010) presumes the SI engagement
  follows the clone-read; the SI quote follows a cost question the
  CIO asks first. Without a "small / medium / large carrier shape →
  engineer-weeks" rubric, the CIO cannot anchor their internal
  approval ask. The repo answers "is this credible" but not "is this
  *bounded*."
- **Recommended fix:** add § 4.5 to `01-BUSINESS-CASE.md` ("Bounding
  the customization surface — three carrier shapes") with three
  worked examples of profile-population effort. Anchor each in
  publicly-defensible Guidewire-estate complexity proxies (LOB count,
  state count, custom-entity count). Or accept as out-of-scope and
  declare it in `00-AUDIT-RESPONSES.md` — the cost question moves
  from the public artifact to the one-on-one engagement
  conversation.

**F-RT-1.2 — 🟡 CHALLENGE — "Local-first, customer-hosted" trust
boundary glosses over Postgres operability**

- **Attack:** *"You say I host the audit DB. Postgres 15 with
  serializable transactions and a hash-chain that refuses all writes
  on `chain_broken`. Who runs that on-call? Because if your harness
  refuses every write across an entire tenant because Postgres had a
  network blip, the agent dies in the middle of the underwriter's
  shift and the pilot becomes a whiteboard war story."*
- **What the blueprint says:** [`03-ARCHITECTURE.md` § 7.1-7.3](../03-ARCHITECTURE.md)
  declares "Postgres can be local (Docker) or shared with the
  carrier's existing dev infra"; [`05-TECHNICAL-SPEC.md` § 6](../05-TECHNICAL-SPEC.md)
  names Cloud SQL as default. [`02-PRD.md` § 5.5 / § 8.3](../02-PRD.md)
  describes `chain_broken` refusing all writes for the affected
  tenant.
- **Why this lands:** the document treats Postgres as a transparent
  dependency. Real carriers run their own Postgres SLOs separately
  from their underwriting agents. A network hiccup → harness sees
  audit unreachable → harness refuses every `approved_execute` write
  for that tenant atomically (D-006 hard rule) → the tenant
  perceives "the agent broke." The blueprint correctly preserves
  correctness over availability, but the operability story is
  unwritten — what does an on-call engineer *do*? What's the
  expected MTTR? What's the runbook for `chain.repair.acknowledged`?
- **Recommended fix:** add a "harness operability" subsection to
  [`05-TECHNICAL-SPEC.md` § 8](../05-TECHNICAL-SPEC.md) — define the
  expected MTTR target, the runbook for `chain_broken` recovery, and
  the Cloud SQL HA recommendation. Or accept as "lands in customer
  engagement, not OSS docs" and declare it.

**F-RT-1.3 — 🟡 CHALLENGE — `lob.yaml` schema does not surface
acquisition / book-merge complexity**

- **Attack:** *"We acquired Brand-X in 2023. Their book runs on the
  same tenant but with a parallel `BrandXPropertyLoss` typelist that
  duplicates `LossCause` codes with different labels. Show me where
  in your nine YAMLs that lives. Not 'extend `typelists.yaml`' —
  show me the schema field."*
- **What the blueprint says:** [`02-PRD.md` § 6.3 / § 6.4](../02-PRD.md)
  models `lob_mappings.<carrier_code>` and `typelists` keyed by
  typelist name. There is no "branch" or "tenant-internal book"
  concept — the schema implicitly assumes one carrier identity per
  profile.
- **Why this lands:** post-acquisition complexity is the dominant
  middle-market carrier shape in 2024-2026. Almost every P&C carrier
  the CIO would represent is post-merge. The blueprint's schema
  treats the carrier as monolithic; the CIO sees the gap on first
  read.
- **Recommended fix:** either extend the profile schema with an
  optional `book_segment` discriminator (so `LossCause` can have
  `code_acme: 1_collision` vs `code_brandx: BX_COLL`) or explicitly
  declare in `00-AUDIT-RESPONSES.md` that "post-acquisition book
  reconciliation is a customer-engagement-tier extension, not OSS
  scope." Either is defensible; silence is the failure mode.

### Persona 2 — Underwriter (line)

**F-RT-2.1 — 🟢 PASS — `whats-our-appetite-on-this-risk` survives the
underwriter's vocabulary test**

- **Attack:** *"`whats-our-appetite-on-this-risk` — yes, I'd say
  that. But the moment your `profile_incomplete_for_this_carrier`
  refusal fires on my first call, do I just walk away?"*
- **What the blueprint says:** [`02-PRD.md` § 3.1.1](../02-PRD.md)
  declares the ⚠ banner; [`04-USER-JOURNEY.md` J-1](../04-USER-JOURNEY.md)
  shows the structured refusal in narrative form.
- **Why this lands / doesn't:** the vocabulary survives — the
  refusal text is "operator-voice + structured" and the journey
  walks the underwriter through the recovery (the manager populates
  the missing UWCenter mapping; underwriter retries). The contract
  for what the agent *does* on refusal is clear. **PASS.**

**F-RT-2.2 — 🟡 CHALLENGE — Tool catalog is dense, but
discoverability is unaddressed**

- **Attack:** *"You ship 39 tools across 5 servers (08-PRD § 3 row
  count). When I open Claude Desktop, how do I find the right tool
  for *this* question? My carrier's UI has a search bar. Yours has
  a list."*
- **What the blueprint says:** [`02-PRD.md` § 3](../02-PRD.md)
  enumerates the catalog. There is no documented discoverability
  surface — no "by-question" lookup, no role-aware filtering at the
  agent level beyond `roles.yaml` permissions.
- **Why this lands:** Persona 7 (the MCP architect) raised the
  tool-selection budget; the budget is preserved at the *server*
  level (5-15 tools per server). The persona-2 attack is downstream:
  *within* a server, when 7 tools live in `policycenter-mcp`, how
  does the agent (or the underwriter) find the right one without
  reading the catalog? The blueprint trusts the agent's tool
  selection. That works for top-3 tools; it gets weaker at tool 7.
- **Recommended fix:** declare in
  [`02-PRD.md` § 3](../02-PRD.md) (or a new § 3.7) that tool
  descriptions follow a consistent
  "<carrier-question> · <when-to-use>" pattern that drives MCP
  selection quality. Or note the gap as an accepted limitation
  ("D-NNN — tool discoverability is a server-level boundary; agents
  use server-bound name + description for selection"). The
  carrier-vocabulary-curator's 8-rule checklist already touches
  this; surface it explicitly as the discoverability story.

**F-RT-2.3 — 🟡 CHALLENGE — `find-submissions-waiting-on-me` does not
disambiguate "waiting on me" semantics**

- **Attack:** *"My queue, sorted by stake. But what's `waiting on
  me`? Is that `assignedToMe=true`? Is it `referredTo=me` if
  someone bumped a submission up to me? Is it both? My carrier's UI
  shows them in different tabs."*
- **What the blueprint says:** [`02-PRD.md` § 3.1.1](../02-PRD.md)
  shows the endpoint as `GET /job/v1/jobs?subtype=Submission&assignedToMe=true&status=Open`
  — single Boolean filter.
- **Why this lands:** in real carriers, "waiting on me" is a
  composite (assigned + referred + escalated + needs-approval). A
  single Boolean filter is tutorial-grade. The line UW will read
  this and realize the tool ships a *projection* of their actual
  queue, not their queue. Persona 9 (the UW manager) attacks this
  separately for the referrals view; the line UW persona attacks it
  here for the "my work" view.
- **Recommended fix:** clarify in [`02-PRD.md` § 3.1.1](../02-PRD.md)
  that "waiting on me" is implementer-defined and the OSS demo uses
  `assignedToMe=true` as a starting projection; carrier profiles
  override via the `roles.yaml` (which already permits per-role tool
  bindings) or via a future `tool-projections.yaml`. Most carriers
  will customize this; flag it as a known customization point.

### Persona 3 — Claims VP

**F-RT-3.1 — 🟡 CHALLENGE — Approval throughput estimate is missing**

- **Attack:** *"Three modes. Fine. Most claims writes are
  `draft_only`, only the binding ones gate. Quantify it. What
  fraction of my adjusters' daily 80 decisions go through human
  approval in a typical pilot? If it's 5, I'm in. If it's 30, I'm
  out."*
- **What the blueprint says:** [`02-PRD.md` § 3.2 / § 4](../02-PRD.md)
  describes the modes in narrative; [`002-DR-CRIT-personas.md`
  Persona 3](../../002-DR-CRIT-personas.md) names the threshold
  concern. No document quantifies approval rate per persona.
- **Why this lands:** the Claims VP signs the SOW based on a
  throughput model. Without a "per claim type → approval ratio"
  table, the VP cannot project the operations cost of the platform.
  The blueprint optimizes for correctness, not for the VP's TCO
  story.
- **Recommended fix:** add to
  [`02-PRD.md` § 4.3](../02-PRD.md) (OSS demo profile defaults) a
  table of "expected approval ratio by tool tier" — for the canary
  `reconcile-this-payment`, the demo defaults to 100% gated; for the
  draft tools, the ratio is 0% (drafts never gate). For future
  `approved_execute` tools (post-E5), declare that the
  `approval-matrix.yaml` *is* the answer to "what gates" and the
  blueprint cannot pre-quantify it without carrier policy.

**F-RT-3.2 — 🟡 CHALLENGE — `find-claims-at-risk-of-leakage` carries
the ⚠ banner but no failure-mode narrative for absent
`LeakageRiskScore`**

- **Attack:** *"You say `find-claims-at-risk-of-leakage` surfaces
  the ⚠ banner if `LeakageRiskScore` is unset. So my agent can't
  find leakage on day 1 unless I've already mapped a custom entity
  that I haven't built yet? That's a chicken-and-egg story I don't
  have time for."*
- **What the blueprint says:** [`02-PRD.md` § 3.2](../02-PRD.md)
  declares the tool with `Profile dep: HIGH`. The narrative says
  "leakage heuristic is profile-supplied."
- **Why this lands:** the blueprint correctly refuses to lie about
  leakage when the carrier hasn't mapped the heuristic. But
  Persona 3's pilot story dies if the agent's claim-side flagship
  tool doesn't work on day one. The OSS demo profile must ship a
  *workable* leakage heuristic that the carrier can override —
  otherwise the agent feels broken before the customization
  conversation starts.
- **Recommended fix:** [`02-PRD.md` § 6.10`](../02-PRD.md) (OSS
  demo profile) should declare a default `LeakageRiskScore`
  surrogate computed from base-API-only fields (e.g. claim age +
  reserves-untouched-since-open). Honest leakage is profile-
  supplied; *some* signal is base-API-derivable and the OSS demo
  profile should ship it. Alternatively, declare in the tool's
  description that "in OSS demo profile this returns claims with
  `daysOpen > 30 && reservesUntouched > 14d` as a starter heuristic
  — replace via `custom-entities.yaml` for production."

### Persona 4 — MGA Broker / Producer

**F-RT-4.1 — 🟢 PASS — Producer density gap closed (3 → 8 tools)**

- **Attack:** *"Three tools. Portal scrap. I'm out."*
- **What the blueprint says:** [`02-PRD.md` § 3.4](../02-PRD.md)
  ships 8 tools; [`07-ROADMAP.md` § E9](../07-ROADMAP.md) declares
  the new 5 explicitly as "missing" before E9 ships them. Cross-
  broker leakage is a hard refusal at the harness gate.
- **Why this lands / doesn't:** density story is real. 8 tools cover
  book / commission / pipeline / loss-ratio / bind-ratio / retention /
  lost-business / appetite-flip. **PASS.** This is the strongest
  persona-coverage improvement in v4 vs v3.

**F-RT-4.2 — 🟡 CHALLENGE — `whats-my-commission-status` admin-scope
implication compounds the auth complexity**

- **Attack:** *"Commission queries need admin-scope OAuth, not
  billing-scope (per librarian P3). So my profile's `auth.yaml` has
  to declare admin scope. Now any tool I run as a producer can —
  what — read commission plans across the whole carrier? My CISO
  will eat me alive."*
- **What the blueprint says:** [`02-PRD.md` § 6.1](../02-PRD.md) +
  [`04-USER-JOURNEY.md` J-4](../04-USER-JOURNEY.md) name the
  admin-scope requirement. The producer's `roles.yaml` constrains
  which tools the producer-tier role can call.
- **Why this lands:** OAuth scope is coarser than tool-level
  authorization. Granting admin scope at the OAuth layer means *any
  call* the harness makes carries the broader scope; the
  `roles.yaml` is harness-side filtering, not Guidewire-side.
  Persona 5 (CISO) will read this and identify it as a privilege-
  escalation surface. The producer's CISO will read this as "you
  ask for admin scope so the producer can see their commission" —
  it's the right pattern, but the blueprint doesn't surface the
  trade-off.
- **Recommended fix:** add to
  [`05-TECHNICAL-SPEC.md` § 8.5](../05-TECHNICAL-SPEC.md) (Threat
  model) an explicit row for "OAuth admin scope (commission
  reads) → harness-scope-filtered, not Guidewire-scope-filtered."
  Mitigation: `roles.yaml` validation rejects boot if a producer-
  tier role has any tool whose endpoint isn't producer-code-
  scopable, and the harness audit chain captures every
  admin-scope call distinctively.

**F-RT-4.3 — 🟡 CHALLENGE — Producer's "what's my contract net?"
question is missing from the catalog**

- **Attack:** *"You ship 8 producer tools. I see book, commission,
  pending, loss ratio, bind ratio, retention, lost, appetite. What
  about contract net — what is the carrier paying me, after
  charge-backs, after sub-broker shares, after the override? That
  is the question my CFO asks me weekly. It's not commission
  status; it's net dollars."*
- **What the blueprint says:** the catalog at
  [`02-PRD.md` § 3.4](../02-PRD.md) covers commission status;
  contract-net (commission − charge-backs − overrides) is not in
  the surface.
- **Why this lands:** the producer-side density story is "8 tools,
  not 3." The persona-4 satisfaction test is "the surface covers my
  weekly questions." Contract net is one of the top-3 questions
  every producer asks of their carrier; the blueprint stops at
  commission gross.
- **Recommended fix:** flag as a CHALLENGE for the future E9 sub-
  epic — do NOT add a tool to the blueprint pre-staffed-audit per
  the panel's no-new-tools rule. Capture in
  `00-AUDIT-RESPONSES.md` as a future-tool candidate
  (`whats-my-contract-net`) for E9 expansion; defer the population
  story to the carrier engagement (the chargeback model is
  carrier-specific).

### Persona 5 — Security / CISO

**F-RT-5.1 — 🔴 FAIL — Per-tenant linear hash chain has no
cross-tenant root or external commitment surface**

- **Attack:** *"Tamper-evident. Sure. A privileged operator with
  Postgres write access to the audit DB rewrites every entry in
  tenant Acme's chain — recomputes every `entry_hash`, recomputes
  every `prev_hash`, updates `audit_chain_heads.current_hash`. The
  chain re-verifies. How do I detect that? Your `verifyChain()`
  walks the chain forward. It cannot detect a fully consistent
  rewrite. Your linear-chain-per-tenant ships a tamper-*evidence*
  property only against an outsider; against a privileged insider,
  it's tamper-*resistant-modulo-correlation-with-an-external-
  commitment* — and I don't see that commitment surface anywhere."*
- **What the blueprint says:** [`02-PRD.md` § 5.5](../02-PRD.md) +
  [`05-TECHNICAL-SPEC.md` § 8.2](../05-TECHNICAL-SPEC.md) +
  [`009-DR-MEMO § 2.1`](../../009-DR-MEMO-harness-runtime.md)
  declare "Linear hash chain per-tenant (NOT Merkle)." Threat model
  at [`05-TECHNICAL-SPEC.md` § 8.5](../05-TECHNICAL-SPEC.md)
  mitigates "Compromised harness DB" with: "Linear hash chain +
  serializable single-writer makes tampering tamper-evident;
  `verifyChain` detects."
- **Why this lands:** `verifyChain` re-walks the chain from
  `prev_hash` and recomputes `entry_hash` against the canonical
  serialization. If a privileged operator with Postgres write
  access updates every row to a fresh chain, every hash matches
  every prev_hash — the chain re-verifies. Tamper-evidence requires
  *something the operator cannot alter*: an external commitment
  (signed checkpoint published to a transparency log; a Merkle root
  pinned to public storage; or per-N-entries an Ed25519 signature
  by a key the operator doesn't hold). The blueprint declares the
  Ed25519 / KMS bundle signing as "E3+ deferred"
  ([`02-PRD.md` § 5.7](../02-PRD.md),
  [`05-TECHNICAL-SPEC.md` § 4.11](../05-TECHNICAL-SPEC.md)) — but
  the bundle signing happens at *export*, not at *append*. The
  append-time chain has no external anchor. This is the load-
  bearing audit-chain claim the CISO will press hardest; the
  current architecture cannot defend against the threat the threat
  model claims it does.
- **Recommended fix:** one of three:
  1. Add a D-019 entry: "Audit chain ships with
     append-time external commitment — every N append (N=100 or
     time-bound), the harness signs the chain head with a KMS-
     resident key the application identity cannot use, and posts
     the signed checkpoint to (a) a customer-controlled S3 bucket
     with object lock, or (b) a public transparency log." Move the
     Ed25519 / KMS surface from "E3+" to "E1 in skeleton, E3 fully
     wired." This is the right architectural answer.
  2. Re-scope the tamper-evidence claim to "tamper-*evident-against-
     application-level compromise* (the harness application identity
     is constrained by Postgres role separation; only the audit-
     write role can append, and that role cannot modify prior rows)."
     Document the Postgres role topology explicitly; promote
     `audit_entries` to `INSERT`-only via row-level security. Note
     the residual risk that a DBA-tier compromise still rewrites the
     chain; declare that risk accepted-for-OSS-scope.
  3. Add a third option to the threat model row 2: "Cross-tenant
     correlation — independent customers' chains are independently
     observed; a rewrite of tenant A is detectable by tenant B's
     copy of the same trans-tenant evidence (e.g. customer-shared
     events). For single-tenant deployments, this property does not
     hold." Honest scoping.

  The architecturally cleanest of the three is (1); (2) is the
  smallest blueprint change; (3) is the most honest if the team
  doesn't want to wire (1) before E1 ships. **What is *not*
  acceptable** is the current state: a tamper-evidence claim the
  architecture can't substantiate.

**F-RT-5.2 — 🟡 CHALLENGE — Approval timeout has no notification
guarantee; pending writes accumulate silently**

- **Attack:** *"`approval-matrix.yaml` says T2 / T3 approvers vote.
  My approver is on PTO. The approval expires after 24h (default).
  Show me the SLA: when does my SOC engineer notice? Email? ntfy?
  PagerDuty? Or do I find out at month-end review when the audit
  shows 47 expired approvals and my underwriters were silently
  blocked?"*
- **What the blueprint says:** [`02-PRD.md` § 5.3](../02-PRD.md) +
  [`05-TECHNICAL-SPEC.md` § 4.11](../05-TECHNICAL-SPEC.md)
  ("Slack approval surface — post-E3"). Approval timeout is
  modeled in the state machine; the *notification* surface is
  deferred.
- **Why this lands:** approval timeout writes a single audit row.
  Pino logs at warn-level. Sentry fingerprint groups them. None of
  these reach the operator without explicit configuration — the
  CISO sees a backlog of expired approvals and asks "why didn't I
  know?" The notification surface is not an MVP, but the absence of
  *any commitment* in the blueprint is an oversight.
- **Recommended fix:** declare in
  [`05-TECHNICAL-SPEC.md` § 4](../05-TECHNICAL-SPEC.md) that
  approval timeouts emit at pino-level WARN, raise an `AppError`
  with `code: 'APPROVAL_TIMEOUT'`, and surface as Sentry issue with
  fingerprint `[APPROVAL_TIMEOUT, tool_name, mode]`. Wiring to
  Slack / PagerDuty / ntfy is the carrier's responsibility; the
  blueprint commits to *signal availability*, not delivery.

**F-RT-5.3 — 🟡 CHALLENGE — JWT propagation is declared but the
revocation story is silent**

- **Attack:** *"Actor JWT propagates to every Cloud API call.
  Underwriter Smith leaves the company at 11:30 Tuesday. At 11:45
  she logs in from her personal laptop, gets a JWT, and triggers
  `find-submissions-waiting-on-me`. When does her token stop
  working? What's the revocation latency?"*
- **What the blueprint says:** [`02-PRD.md` § 6.1](../02-PRD.md) +
  [`05-TECHNICAL-SPEC.md` § 8.1](../05-TECHNICAL-SPEC.md) declare
  proactive refresh at 80% of token lifetime (default 3600s = 60
  min). Revocation is not addressed.
- **Why this lands:** in carrier deployments, employee offboarding
  is a same-day SLO. A 60-min token lifetime means up to 60 minutes
  of post-offboarding access. The blueprint inherits the OAuth
  default; the CISO needs to know whether short-lifetime tokens or
  introspection-on-call are options.
- **Recommended fix:** add to
  [`05-TECHNICAL-SPEC.md` § 8.1](../05-TECHNICAL-SPEC.md) a row in
  the auth model section: "Revocation latency — OSS default ≤60min
  (token lifetime). Carriers requiring shorter revocation can (a)
  reduce `oauth.token_lifetime_seconds`, or (b) enable per-call JWT
  introspection (RFC 7662) by setting `auth.yaml.introspect: true`
  — adds ~30ms per call." Note that introspection is the trade-off:
  the carrier picks lifetime vs latency.

### Persona 6 — Guidewire SI Partner

**F-RT-6.1 — 🟢 PASS — Lead-magnet thesis directly answers
"replace me or sell me"**

- **Attack:** *"You're either replacing me or selling me. Which?"*
- **What the blueprint says:** [`01-BUSINESS-CASE.md` § 4](../01-BUSINESS-CASE.md)
  + [D-010](../../004-DR-DEC-architecture-decisions.md) explicitly
  scope what the OSS does NOT ship (LOB mappings, typelists, custom
  entities, approval matrices, vendor adapters) and name them as
  the SI engagement surface.
- **Why this lands / doesn't:** the answer is honest, the boundary
  is named, and the lead-magnet vs product framing is consistent
  across business case, PRD, and decision log. **PASS.**

**F-RT-6.2 — 🟡 CHALLENGE — Cowork-fork derivatives could undercut SI
margin**

- **Attack:** *"Your cowork cohort forks the template into their
  own domain. Fine for trucking, real estate, restaurants. But
  what if one of your cohort members is an Insuretech that builds
  `flatbed-insurance-mcp` — a *carrier-domain* derivative that
  isn't yours? Now my prospect picks the cohort member's free fork
  over my consulting engagement."*
- **What the blueprint says:** [`02-PRD.md` § 7](../02-PRD.md)
  scopes the fork to "the cohort member's domain" without
  restricting domain choice; [`01-BUSINESS-CASE.md` § 6](../01-BUSINESS-CASE.md)
  treats "cohort member shipping their own domain MCP" as a
  success metric.
- **Why this lands:** the cowork story explicitly assumes domains
  *outside* the carrier surface. But the contract is permissive —
  nothing prevents a cohort member from forking the template,
  keeping it carrier-shaped, and competing with the SI partner.
  The blueprint hopes the natural separation holds; the SI's
  attorney does not hope.
- **Recommended fix:** add to [`02-PRD.md` § 7.5](../02-PRD.md) a
  fork-license note: "the cowork-fork-starter is licensed
  Apache-2.0 like the rest of the repo, with the soft expectation
  that domain forks are *outside* Guidewire's carrier surface. The
  master Guidewire surface is canonical at this repo; carrier-shape
  forks are not endorsed by the project. SI partners building on
  the harness should engage directly." Or accept the open-domain
  contract explicitly and note that "competition for SI margin from
  cohort forks is a feature, not a bug, of OSS distribution."
  Either is defensible; ambiguity is the failure mode.

**F-RT-6.3 — 🟡 CHALLENGE — Profile authoring tooling (the SI's
billable hours surface) is undocumented**

- **Attack:** *"E10 ships `pnpm gw onboard <customer>`. That's a
  CLI wizard. I bill my consultancy 18 months on profile authoring.
  Does your CLI eat my margin? Or does it just collect the inputs I
  produce — meaning I still bill the work, the CLI just structures
  it?"*
- **What the blueprint says:** [`04-USER-JOURNEY.md` J-6](../04-USER-JOURNEY.md)
  walks the 9-YAML population flow; [`02-PRD.md` § 8.4](../02-PRD.md)
  + [`07-ROADMAP.md` E10](../07-ROADMAP.md) describe the CLI as
  "walks through the nine YAMLs."
- **Why this lands:** the boundary between "CLI structures the
  output" and "CLI auto-generates the output" is not explicitly
  drawn. The CLI is described as a wizard in J-6 (good — it
  collects, doesn't generate); the SI partner needs that
  reassurance in the BUSINESS-CASE narrative, not just in the
  journey.
- **Recommended fix:** in [`01-BUSINESS-CASE.md` § 4](../01-BUSINESS-CASE.md),
  list `pnpm gw onboard` explicitly as "structures the SI's
  output, does not auto-generate carrier mappings — the SI's
  carrier-knowledge work is the input." Or add a sentence to D-010
  reinforcing that the onboarding CLI is *scaffolding for the
  customization the SI ships*, not a replacement for it.

### Persona 7 — Anthropic / MCP architect

**F-RT-7.1 — 🟡 CHALLENGE — `events-mcp` query surface duplicates
some `claimcenter-mcp` capabilities**

- **Attack:** *"`show-activity-on-this-claim` lives in
  `claimcenter-mcp` and reads from the harness internal events
  store. `find-events-for-claim` lives in `events-mcp` and reads
  from the same store. Two servers, same backend, similar
  questions. Tool selection inside Claude is going to be sloppy
  here — which tool is the agent going to pick when the user
  asks 'what events are on this claim'?"*
- **What the blueprint says:** [D-016](../../004-DR-DEC-architecture-decisions.md)
  declares the split as deliberate — adjuster path
  (`show-activity-on-this-claim`) vs integration-engineer path
  (`find-events-for-claim`); [`02-PRD.md` § 3.5](../02-PRD.md)
  reinforces.
- **Why this lands:** the *vocabulary* split is real — adjusters
  say "activity," engineers say "events." But the agent's tool
  selection is driven by tool *description* + tool *name*; the
  agent doesn't know the user is an adjuster vs an engineer at
  selection time. The split benefits the human reading the
  catalog; it confuses the agent.
- **Recommended fix:** declare in [`02-PRD.md` § 3.5](../02-PRD.md)
  that `roles.yaml` is the disambiguator — the adjuster role's
  catalog only includes `show-activity-on-this-claim`; the
  integration-engineer role's catalog only includes
  `find-events-for-claim`. The agent never sees both simultaneously
  for a single actor. This is already implicit in how
  `roles.yaml` works; making it explicit as the disambiguation
  story closes the persona-7 attack.

**F-RT-7.2 — 🟡 CHALLENGE — Tool count grows under E2.5 + E5 +
post-E9 expansion; the per-server budget headroom shrinks**

- **Attack:** *"`policycenter-mcp` ships 7 tools in E2 + 5 manager
  tools in E2.5 + 2 drafts in E5 = 14 tools at E5 close. Producer
  is 8. Claims is 5 read + 1 draft = 6. Billing is 3 read + 1
  approved = 4. Events is 4. You're at the headroom of the per-
  server tool-selection budget by E5; what's the runway for E11+
  growth?"*
- **What the blueprint says:** [D-002](../../004-DR-DEC-architecture-decisions.md)
  declares 5-15 tools per server. The current trajectory hits 14
  on policycenter-mcp at E5 close.
- **Why this lands:** the budget headroom is tighter than the v3
  → v4 transition appreciated. Persona 7 will read the trajectory
  and note that the room for E11+ extensions is small. The split
  decision (D-002) is correct; the extension rule is unwritten.
- **Recommended fix:** add to [`07-ROADMAP.md` § Distribution
  metrics worth tracking](../07-ROADMAP.md) (or a new "tool budget
  monitoring" section) the rule: "if any suite server crosses 12
  tools, the next addition triggers a sub-server split decision
  recorded as D-NNN." This makes the budget observable; today it's
  implicit.

**F-RT-7.3 — 🟡 CHALLENGE — Stdio + HTTP transports declared but
multi-transport selection logic is undocumented**

- **Attack:** *"`@modelcontextprotocol/sdk` covers stdio + HTTP.
  When does each apply? I run my agent host on a developer laptop;
  is that stdio? My production deployment is Cloud Run; is that
  HTTP? Show me the selection rule."*
- **What the blueprint says:** [`05-TECHNICAL-SPEC.md` § 1](../05-TECHNICAL-SPEC.md)
  declares the SDK supports both; [`03-ARCHITECTURE.md` § 7.1-7.2](../03-ARCHITECTURE.md)
  describes single-tenant stdio child process and multi-tenant
  Cloud Run, but the transport mapping is implicit.
- **Why this lands:** the MCP architect needs to know which
  transport ships in which deployment shape. Cloud Run does not
  natively support stdio MCP transport — the
  [`05-TECHNICAL-SPEC.md` Stack table](../05-TECHNICAL-SPEC.md)
  references "gRPC adapter" but does not explain. This is a
  paragraph of clarification.
- **Recommended fix:** add to [`05-TECHNICAL-SPEC.md` § 7.3](../05-TECHNICAL-SPEC.md)
  a sentence: "Single-operator deployments use stdio child-process
  transport (agent host spawns the MCP). Server deployments
  (Cloud Run) use HTTP transport (the SDK's HTTP server adapter
  exposes the MCP over HTTP/2)." Reference the SDK transport
  documentation.

### Persona 8 — Kim — claims operator

**F-RT-8.1 — 🟢 PASS — Drafting / doing line is physically separated
via separate tool names**

- **Attack:** *"Show me exactly where the agent draws the line."*
- **What the blueprint says:** [`02-PRD.md` § 3.2](../02-PRD.md):
  "draft-denial-letter contract is the strongest example of physical
  separation between drafting and doing: the harness emits a draft-
  id; promoting it to a real letter is a *different tool* in
  `approved_execute` mode that takes the draft-id as input."
- **Why this lands / doesn't:** the line is mechanical — a
  different tool name, a different mode, a different
  manifest entry. Kim sees the file, not the config flag. **PASS.**

**F-RT-8.2 — 🟡 CHALLENGE — Hallucination contract is implicit, not
declared**

- **Attack:** *"I don't trust agents because they make stuff up.
  Where in your blueprint do you tell me what happens when the
  agent fabricates a policy number, a claim number, an account
  ID? Does the harness reject it? Or does the Cloud API call go
  out and 404, and the agent just retries with a different number?"*
- **What the blueprint says:** [`02-PRD.md` § 4.2](../02-PRD.md)
  lists `insured_not_found` and `no_access` as distinct refusal
  reasons (anti-enumeration). No document declares an
  hallucination defense at the harness level beyond Zod validation
  of *input shape*.
- **Why this lands:** Zod validates that `claimId` is a string of
  the right shape; it cannot validate that the string corresponds
  to a real claim in the carrier's tenant. The defense is
  effectively "Cloud API will 404 if the claim doesn't exist."
  This is *technically* sufficient (the agent gets a structured
  refusal and reasons about it), but Kim's mental model wants a
  stronger commitment: "the harness pre-validates that any entity
  the agent references *exists* before issuing a write."
- **Recommended fix:** declare in
  [`02-PRD.md` § 4.1](../02-PRD.md) or a new § 4.4 that the
  harness defends against agent fabrication via three layers:
  (1) Zod input validation, (2) structured refusal on Cloud API
  404 (`entity_not_found`), (3) for `approved_execute`, a
  precondition read against the entity is required before the
  policy gate fires. The third is the strongest commitment;
  declare it explicitly so Kim sees the defense. Or accept that
  the defense is API-side (404 → refuse) and describe Kim's
  recourse explicitly.

**F-RT-8.3 — 🟡 CHALLENGE — Read-side audit captures `result_count`
but not query-shape provenance**

- **Attack:** *"You audit every read with `result_count`. Good.
  But if the agent queried `find-claims-at-risk-of-leakage` with a
  filter that returned 1000 claims (because the filter was wrong),
  the audit row says `result_count: 1000` and that's it. How do I
  reconstruct what the agent *asked* for? The query shape is the
  evidence I need."*
- **What the blueprint says:** [`02-PRD.md` § 4.1](../02-PRD.md)
  audit row schema lists fields; query args / filter shape is not
  in the schema (only `result_count` post-execution).
- **Why this lands:** Kim's post-incident reconstruction depends
  on knowing what the agent *asked*. The Plan structure carries
  `args` (the query), but `args` does not appear in the audit row
  schema — it appears in the Plan blob, referenced via `planId`.
  Forensic reconstruction therefore requires the audit chain *plus*
  the Plan store; if the Plan store is GC'd or the join key is
  broken, the audit chain alone is insufficient.
- **Recommended fix:** declare in
  [`02-PRD.md` § 4.1](../02-PRD.md) that `args` (Zod-validated,
  PII-redacted) is captured in the audit row's `blob_ref` field,
  not just referenced via `planId`. Or declare that the `plan`
  store is co-retained with the audit chain (the chain's tamper-
  evidence depends on the plan being available for reconstruction).
  Either makes Kim's forensic story explicit.

### Persona 9 — Underwriting manager

**F-RT-9.1 — 🔴 FAIL — E2.5 manager tools query schema fields the
9-YAML profile does not model**

- **Attack:** *"Five tools: `whats-our-aggregate-on-this-class`,
  `whats-our-loss-ratio-on-this-segment`, `whats-our-declination-
  pattern-by-region`, `find-similar-risks-we-declined`, `whats-the-
  cycle-time-on-our-submissions`. These ask aggregate questions
  along dimensions — class, segment, region — that your 9-YAML
  profile does not model. Where does 'class' live in `lob.yaml`?
  Where does 'region' live? Where does 'segment' live? Where does
  'declination pattern' live? The profile contract has 9 YAMLs;
  where is the aggregation-grouping schema?"*
- **What the blueprint says:** [`07-ROADMAP.md` § E2.5](../07-ROADMAP.md)
  lists "extending `profiles/_template/lob.yaml` with aggregation-
  grouping fields (LOB-rollup definitions, segment dimensions)"
  as part of E2.5's "Done when" — but the YAML schema for
  aggregation grouping is not declared in
  [`02-PRD.md` § 6.3](../02-PRD.md). The profile contract is
  still 9 YAMLs; the manager-tool schema is a future schema
  addition that the contract does not pre-commit to.
- **Why this lands:** boot-time fail-fast is one of the load-
  bearing safety properties (D-007, [`02-PRD.md` § 6](../02-PRD.md)).
  The contract validates 9 YAMLs at boot. Manager tools query
  fields the contract cannot validate. Either (a) the manager
  tools cannot ship until the profile schema extends, or (b) they
  ship with implicit fields that bypass the boot validation. The
  blueprint claims (a) implicitly via the E2.5 prereq, but the
  *schema extension* is the unwritten prereq, not just the
  sandbox-breadth confirmation. Persona 9's tools are gated on a
  schema decision that hasn't been made.
- **Recommended fix:** add a D-019 entry: "Persona-9 manager tools
  require profile schema extensions for aggregation grouping; the
  9-YAML contract grows to model `aggregation-grouping.yaml` (the
  10th, optional YAML), or `lob.yaml` extends with structured
  `class`, `segment`, `region` discriminator dimensions." Update
  [`02-PRD.md` § 6](../02-PRD.md) to reflect either the 10-YAML
  contract or the lob.yaml extension. E2.5's prereq becomes "(1)
  sandbox breadth + (2) profile schema extension landed." Without
  this, E2.5 cannot ship and the manager view does not exist —
  Persona 9 is structurally unsatisfied even though the tool
  *names* are listed.

**F-RT-9.2 — 🟡 CHALLENGE — Manager view tools are read-only; the
manager's *override* surface is missing**

- **Attack:** *"`what-authority-overrides-this-quarter` is a read.
  Where do I *issue* an override? When my line UW escalates a
  submission outside their authority, I either approve or decline.
  Where's the manager's `decide-this-referral` tool? Or am I supposed
  to log into the existing UI for that? Half-an-agent at best."*
- **What the blueprint says:** [`02-PRD.md` § 2.1](../02-PRD.md) +
  [`07-ROADMAP.md` § E2.5](../07-ROADMAP.md) limit the manager view
  to 5 read-only tools. The decide / approve / decline surface
  for the manager is not in scope.
- **Why this lands:** Persona 9's complaint is about *running the
  show* vs *running a black box.* Read tools observe; the manager
  needs to act. The current scope tells the manager "use the
  existing UI for action" — which is the v3 framing the persona
  rejected.
- **Recommended fix:** capture as a future-tool candidate in
  `00-AUDIT-RESPONSES.md`: `decide-this-referral` (`approved_execute`
  mode, eligible for E5 or a future E5.5 tranche). Honest scope: the
  manager's read view ships in E2.5; the manager's write view ships
  later. Don't ship an unfinished manager surface; do declare that
  the surface *will* extend.

---

## Cross-cutting findings

The 19 CHALLENGEs cluster into 4 cross-cutting themes that are
worth surfacing as candidate D-019+ entries:

**X-1 — Quantitative cost / throughput / latency stories are absent
across audiences (F-RT-1.1, F-RT-3.1, F-RT-5.3).**
The blueprint optimizes for correctness; audiences ask for
*bounding* (engineer-weeks for profile authoring, approval-ratio for
throughput, revocation latency for security). Each audience has a
different cost question; none get a quantitative answer. **Suggested
direction:** declare what the blueprint *does* and *does not* commit
to quantify. The lead-magnet thesis lives in qualitative trust;
quantitative bounds live in the engagement.

**X-2 — Profile schema gaps undermine boot-time fail-fast (F-RT-1.3,
F-RT-9.1, partly F-RT-3.2).**
The 9-YAML profile contract is the load-bearing safety boundary
(D-007). Multiple personas press on schema gaps: post-acquisition
book topology, manager-aggregation grouping, leakage-heuristic
defaults. The contract claims to validate everything at boot;
several tools query fields the contract doesn't model. **Suggested
direction:** treat the profile schema as a versioned contract
(v1 = 9 YAMLs; v2 = 10 YAMLs once aggregation lands); pin
the version per profile and per tool dependency. **F-RT-9.1 is the
load-bearing instance and is FAIL-grade.**

**X-3 — Tamper-evidence claim outruns the architecture (F-RT-5.1,
F-RT-8.3).**
The audit chain is described as tamper-evident; against the threat
the threat model claims (compromised harness DB), it is not.
External commitment (signing, transparency log, cross-tenant
correlation) is the missing layer. **F-RT-5.1 is the load-bearing
instance and is FAIL-grade.**

**X-4 — Notification / observability commitments are deferred to
post-E1 (F-RT-5.2, F-RT-7.3, F-RT-8.2).**
Multiple personas press on signal availability — approval timeouts,
transport selection, fabrication defense. The blueprint defers all
of these to "later epics" or "user-configured." **Suggested
direction:** distinguish in the blueprint between "signal *available*
in E1" (the harness emits a typed error / log / span / Sentry issue)
and "signal *delivered* in E1" (Slack / PagerDuty / ntfy wiring).
The blueprint can commit to the former at E1 without committing to
the latter.

A note on disagreement: F-RT-7.1 (events tool overlap) and F-RT-9.2
(manager write surface) push in opposite directions — Persona 7
wants tighter tool-selection budget; Persona 9 wants more tools
covering the manager workflow. The disagreement is real and is the
manifestation of the cross-cutting tension between "tool count
discipline" (D-002) and "role coverage density" (D-017 + persona-4
producer expansion). The blueprint resolves this through `roles.yaml`
filtering; the resolution is correct but is not surfaced as the
load-bearing tension it is. **Suggested direction:** add to D-002 (or
a new D-NNN) the explicit framing: "tool count discipline applies
*per actor's filtered catalog*, not per server total — `roles.yaml`
filtering is the disambiguator between Persona 7's budget and the
density extensions Personas 4, 8 (adjuster path), and 9 demand."

---

## Recommendations summary

**FAIL fixes (must merge before GW-1.8 opens):**

1. **F-RT-5.1** — Resolve the tamper-evidence claim. Add a D-019
   decision-log entry choosing one of the three options (external
   commitment via KMS-signed checkpoints; Postgres role separation
   with documented residual risk; honest re-scoping). Update
   [`05-TECHNICAL-SPEC.md` § 8.5](../05-TECHNICAL-SPEC.md) threat
   model row 2 to match. **Architecturally cleanest:** option (1).
2. **F-RT-9.1** — Resolve the manager-view profile schema gap. Add a
   D-019 decision-log entry committing to the schema extension
   (either a 10th YAML or `lob.yaml` extensions for aggregation
   grouping). Update [`02-PRD.md` § 6](../02-PRD.md) and
   [`07-ROADMAP.md` § E2.5](../07-ROADMAP.md) to reflect the
   extension as an explicit prereq alongside sandbox breadth.

**CHALLENGE fixes (recommended for blueprint v1.0 sign-off in
GW-1.9, but not blockers for GW-1.8 opening):**

3. **F-RT-1.1, F-RT-3.1, F-RT-5.3** — Add a "what the blueprint
   does and does not quantify" section to
   [`01-BUSINESS-CASE.md`](../01-BUSINESS-CASE.md). Or accept and
   declare in `00-AUDIT-RESPONSES.md`.
4. **F-RT-1.2** — Add harness operability subsection to
   [`05-TECHNICAL-SPEC.md` § 8](../05-TECHNICAL-SPEC.md).
5. **F-RT-1.3** — Decide post-acquisition book schema policy
   (extend or scope-out).
6. **F-RT-2.2, F-RT-7.1** — Surface `roles.yaml` as the
   tool-selection-disambiguation story explicitly.
7. **F-RT-2.3** — Document `assignedToMe=true` as a starter
   projection that profiles override.
8. **F-RT-3.2** — Ship a base-API-derivable `LeakageRiskScore`
   surrogate in the OSS demo profile.
9. **F-RT-4.2** — Add OAuth-admin-scope row to the threat model.
10. **F-RT-4.3** — Capture `whats-my-contract-net` as a future-tool
    candidate.
11. **F-RT-5.2** — Declare approval-timeout signal availability
    commitment (pino warn + Sentry fingerprint).
12. **F-RT-6.2** — Resolve the cohort-fork carrier-domain ambiguity.
13. **F-RT-6.3** — Reinforce `pnpm gw onboard` as SI scaffolding,
    not generation, in
    [`01-BUSINESS-CASE.md` § 4](../01-BUSINESS-CASE.md).
14. **F-RT-7.2** — Add a tool-budget-monitoring rule.
15. **F-RT-7.3** — Document the stdio vs HTTP transport selection.
16. **F-RT-8.2** — Declare hallucination defense layers explicitly.
17. **F-RT-8.3** — Capture query-args provenance in the audit row.
18. **F-RT-9.2** — Capture `decide-this-referral` as a future-tool
    candidate.
19. **X-1 through X-4** — Treat the four cross-cutting themes as
    candidate D-019+ entries to consolidate the CHALLENGE fixes.

---

## Cross-references

- Blueprint master index: [`../00-MASTER-BLUEPRINT.md`](../00-MASTER-BLUEPRINT.md)
- Personas (the 9 attackers): [`../../002-DR-CRIT-personas.md`](../../002-DR-CRIT-personas.md)
- Decision log (D-001 through D-018; D-019+ is where new
  decisions from this audit land):
  [`../../004-DR-DEC-architecture-decisions.md`](../../004-DR-DEC-architecture-decisions.md)
- Librarian audit (sibling — citation-coverage report):
  [`./00-LIBRARIAN-CITATION-AUDIT.md`](./00-LIBRARIAN-CITATION-AUDIT.md)
- Consistency audit (sibling — mechanical drift sweep):
  [`./01-CONSISTENCY-AUDIT.md`](./01-CONSISTENCY-AUDIT.md)
- Audit-panel gate criteria: [`./README.md`](./README.md)
- Specialist memos (the deep-substance ground truth):
  [`../../006-DR-MEMO-mcp-safety.md`](../../006-DR-MEMO-mcp-safety.md),
  [`../../007-DR-MEMO-carrier-vocabulary.md`](../../007-DR-MEMO-carrier-vocabulary.md),
  [`../../008-DR-MEMO-guidewire-api.md`](../../008-DR-MEMO-guidewire-api.md),
  [`../../009-DR-MEMO-harness-runtime.md`](../../009-DR-MEMO-harness-runtime.md)
