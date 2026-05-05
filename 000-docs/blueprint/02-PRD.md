# 02 — Product Requirements (PRD)

> *Carrier-vocabulary tools, three-mode harness, customer profiles,
> cowork fork-starter — the full product surface for Guidewire MCP for
> Claude.*

**Filed:** 2026-05-04
**Bead:** `guidewire-hss` (under epic `guidewire-7jt` — GH [#2](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/2))
**Feeds:** this section is the canonical PRD; cross-feeds
[`03-ARCHITECTURE.md`](./03-ARCHITECTURE.md) (tool inventory →
layered model) and [`04-USER-JOURNEY.md`](./04-USER-JOURNEY.md)
(tool names appear verbatim in journeys per 007-DR-MEMO § 7 rule 8).
**Inputs:** [`../006-DR-MEMO-mcp-safety.md`](../006-DR-MEMO-mcp-safety.md),
[`../007-DR-MEMO-carrier-vocabulary.md`](../007-DR-MEMO-carrier-vocabulary.md),
[`../008-DR-MEMO-guidewire-api.md`](../008-DR-MEMO-guidewire-api.md),
[`../009-DR-MEMO-harness-runtime.md`](../009-DR-MEMO-harness-runtime.md),
[`../002-DR-CRIT-personas.md`](../002-DR-CRIT-personas.md),
[`../003-DR-ARCH-oss-cowork.md`](../003-DR-ARCH-oss-cowork.md),
[`../004-DR-DEC-architecture-decisions.md`](../004-DR-DEC-architecture-decisions.md),
[`./07-ROADMAP.md`](./07-ROADMAP.md).
**Status:** authored content (replaces GW-1.2 skeleton).

---

## 1. Vision

> **The carrier-native MCP surface for Guidewire estates, with
> governance strong enough to earn trust on writes.**

Tool names are the question an operator would ask a junior analyst —
*"find submissions waiting on me,"* *"what's our appetite on this
risk,"* *"summarize this loss,"* *"reconcile this payment."* The
agent does not translate carrier vocabulary into API verbs; the tool
name *is* the question. Underneath, the harness gates every write
behind a planned, policy-evaluated, approved, idempotency-keyed,
hash-chain-audited contract — a contract that ships in the OSS code
path even when the OSS demo profile defaults to `read_only` /
`draft_only` so that any customer who flips on `approved_execute`
inherits the same guarantees as a regulator-graded enterprise
deployment.

The center of gravity per [`003-DR-ARCH § "What the architecture is
built around"`](../003-DR-ARCH-oss-cowork.md) and [D-001](../004-DR-DEC-architecture-decisions.md) is
operator vocabulary plus governance, not API verbs plus adapters.
The OSS repo is a credibility artifact for inbound carrier / MGA / SI
work (per [D-009](../004-DR-DEC-architecture-decisions.md), [D-010](../004-DR-DEC-architecture-decisions.md));
this PRD is the contract that artifact promises.

---

## 2. Personas

The 8 personas in [`002-DR-CRIT`](../002-DR-CRIT-personas.md) attack
the architecture from outside the line-underwriter role. Persona 9
was added 2026-05-04 (per the carrier-vocabulary memo 007 § 4.6) to
close an inside-the-carrier role-coverage gap that the v3 plan had
missed.

| # | Persona | One-line | Tool surfaces serving this persona |
|---|---|---|---|
| 1 | P&C Carrier CIO | "Universal tool surface dies on my custom entities and 47 LOB extensions." | `profiles/<customer>/` set (every YAML) — profiles are the answer to portability |
| 2 | Underwriter (line) | "I don't say `search_policies`, I say *what's our appetite on this risk*." | `policycenter-mcp` — submission queue, appetite, policy-for-insured, summarize, lost-account, referral-explanation, draft-referral, draft-endorsement |
| 3 | Claims VP | "Claims people make 80 decisions a day; if every reserve change gates on approval, the agent dies in pilot." | `claimcenter-mcp` portfolio reads + three-mode design (most writes are `draft_only`, only the binding ones gate) |
| 4 | MGA Broker / Producer | "Am I the second-class citizen who gets a producer-portal scrap?" | `producer-mcp` — book of business, commission, pending quotes, loss ratio, bind ratio, retention, lost-business, carrier-availability |
| 5 | Security / CISO | "Standing service-account credentials with read-all is a SOC 2 finding waiting to happen." | Harness audit hash-chain + evidence bundle export + JWT-propagation + structured refusals |
| 6 | Guidewire SI Partner | "Your `adapters/customers/` pack is what my consulting team gets paid 18 months to build." | `profiles/_template/` (mappings only, never re-implementations) per [D-007](../004-DR-DEC-architecture-decisions.md), [D-010](../004-DR-DEC-architecture-decisions.md) |
| 7 | Anthropic / MCP architect | "60-130 tools across 6 capability servers blows the tool-selection budget; harness can't itself be an MCP." | 6 servers organized by Guidewire suite (5-15 tools each) per [D-002](../004-DR-DEC-architecture-decisions.md); harness as library + CLI per [D-003](../004-DR-DEC-architecture-decisions.md) |
| 8 | Kim from claims (skeptical operator) | "Show me *exactly* where the agent draws the line between drafting and doing." | Three-mode design — `read_only` and `draft_only` never write; `approved_execute` requires plan + policy + approval + idempotency + audit |
| 9 | Underwriting Manager | "Your tools serve the line UW. Where's *my* portfolio view?" | `policycenter-mcp` underwriting-manager view (see § 2.1) |

### 2.1 Persona 9 — underwriting manager (dedicated subsection)

Per [`002-DR-CRIT § Persona 9`](../002-DR-CRIT-personas.md) and 007 §
4.6, the line underwriter ([Persona 2](../002-DR-CRIT-personas.md))
covers the bottom of the underwriting authority hierarchy; the
manager's portfolio / staff / authority-overrides view was absent in
v3 and now lives as a dedicated tool surface inside `policycenter-mcp`:

| Tool | Mode | Operator's voice |
|---|---|---|
| `show-referrals-routed-to-me` | read_only | *"Show me everything that's been referred up to me. Anything still sitting after 24 hours gets a phone call."* |
| `whats-my-team-bind-ratio` | read_only | *"What's my team's bind ratio this quarter, by class? Who's quoting fine but closing soft?"* |
| `show-uws-stacking-referrals` | read_only | *"Which line UW is escalating disproportionately? If one person owns the referral spike, I want to know."* |
| `whats-our-concentration-on-this-class` | read_only | *"Are we over-concentrated on California trucking? Portfolio-level appetite, not file-level."* |
| `what-authority-overrides-this-quarter` | read_only | *"Audit my own approved exceptions this quarter. I need the trail before the auditor asks."* |

These pass the carrier-vocabulary-curator 8-rule checklist (007 § 7)
on first read — operator-voice + possessive-scope + question-form.
They land as a sub-tranche of E2 (PolicyCenter); the roadmap notes
they may slip to a later sub-epic depending on UWCenter sandbox
breadth (007 § 4.6).

---

## 3. Tools — by Guidewire suite

Five MCP servers ship in scope. **`servers/payments-mcp/` does NOT
exist as a directory in this repository**, per 006 § 6.1 and § 9
recommendation 4 — the carve is at the repo level (not just the
catalog level) so contributors can't add `initiate-refund` next.
Money-movement tools live in a separate fork or package after
dual-control review; not in the OSS demo path.

Each tool table column:

- **Tool name** — carrier-vocabulary, hash-coupled, no API-verb
  prefix per [D-001](../004-DR-DEC-architecture-decisions.md)
- **Mode** — `read_only` / `draft_only` / `approved_execute` per
  [D-005](../004-DR-DEC-architecture-decisions.md)
- **Description** — one sentence, operator-voice
- **Cloud API endpoint(s)** — per 008 § 3 (release-versioned base shapes;
  exact paths land post-sandbox per 008 § 14)
- **Persona(s)** — Roman numeral keyed to § 2 above
- **Profile-config dependence** — LOW / MEDIUM / HIGH per 008 § 3 grades
- **Cited in memo** — origin trace

### 3.1 `policycenter-mcp` — PolicyCenter + UnderwritingCenter

E2 ships the read-only catalog (5-7 tools per [`07-ROADMAP § E2`](./07-ROADMAP.md)).
E5 ships the drafting tools and the slipped-from-E2 tools that depend
on multi-tenant UWCenter rule traces.

#### 3.1.1 Line underwriter view (E2 + E5)

| Tool | Mode | Description | Cloud API endpoint(s) | Persona | Profile dep | Cited |
|---|---|---|---|---|---|---|
| `find-submissions-waiting-on-me` | read_only | The underwriter's personal queue, sorted by stake. | `GET /job/v1/jobs?subtype=Submission&assignedToMe=true&status=Open` | 2 | MEDIUM (`JobSubtype` carrier-extended) | 007 § 2.1, 008 § 3.1 |
| `whats-our-appetite-on-this-risk` ⚠ | read_only | *Slipped E2→E5 — incomplete-without-profile banner required.* Trade-secret carrier appetite rules; full trace ships when ≥1 sandbox tenant resolves UWCenter rule entities. | composite of `GET /policy/v1/policies` + `GET /admin/v1/users/{id}/permissions` + UWCenter rule entity | 2, 9 | HIGH (highest variance) | 006 § 1.2, 007 § 2.1, 008 § 3.1, 07-ROADMAP § E2 slip note |
| `show-policies-for-this-insured` | read_only | Cross-LOB rollup of what this insured has with us. | `GET /account/v1/accounts/{id}/policies` + `GET /policy/v1/policies?accountId=...` | 2 | MEDIUM (`Account.contactRoles` extended) | 007 § 2.1, 008 § 3.1 |
| `summarize-this-submission` | read_only | The elevator-pitch read on a submission before the UW digs in. | `GET /job/v1/jobs/{id}` + Composite (contacts, locations, coverages) | 2 | MEDIUM | 006 § 1.4 (LLM-side, not LLM-proxy), 008 § 3.1 |
| `did-we-lose-this-account` | read_only | Cancellation / non-renewal history with reason codes. | `GET /policy/v1/policies?accountId=...&status=Cancelled,Lapsed,Lost` + `/transactions` | 2 | HIGH (`CancellationReason` heavily extended per carrier — poster-child for typelist drift) | 007 § 2.1, 008 § 3.1 |
| `explain-why-this-got-referred` ⚠ | read_only | *Slipped E2→E5 — incomplete-without-profile banner required.* UW rule trace; carrier-defined entirely. | `GET /job/v1/jobs/{id}/uwIssues` + carrier-specific trace endpoint | 2, 9 | HIGHEST (entirely carrier-defined) | 006 § 1.6, 008 § 3.1, 07-ROADMAP § E2 slip note |
| `pull-this-claim-from-this-policy` | read_only | Cross-suite read — surface a claim sitting against a policy. | `GET /policy/v1/policies/{id}` + `GET /claim/v1/claims?policyId=...` | 2, 8 | MEDIUM | 07-ROADMAP § E2 |
| `draft-referral-note` | draft_only (E5) | Compose a referral-up artifact for the senior UW; never files it. | READ side: `GET /job/v1/jobs/{id}` + uwIssues; no write | 2 | MEDIUM | 006 § 1.7, 007 § 2.1 |
| `draft-endorsement` | draft_only (E5) | Compose an endorsement plan; promotion to write is a *different* tool. | READ side: `GET /policy/v1/policies/{id}` + `/coverages`; write only when promoted to `approved_execute` (deferred) | 2 | HIGH (per-LOB / per-state / `CoverageType` extended) | 006 § 1.8, 007 § 2.1 (renamed from `propose-endorsement`), 008 § 3.1 |

The two ⚠ tools carry an **incomplete-without-profile** banner in
their tool descriptions and surface a structured refusal
`reason: "profile_incomplete_for_this_carrier"` until the customer's
`typelists.yaml` + `custom-entities.yaml` resolve the UWCenter rule
shapes (per 006 § 1.2 + 008 § 3.1 + 07-ROADMAP § E2). They ship
runnable in E2 against the sandbox tenant whose profile is complete;
they ship inert (with the banner) against any incomplete profile.
Slipping these to E5 was a roadmap-side correction made when 008
clarified the multi-tenant requirement.

#### 3.1.2 Underwriting-manager view (Persona 9, E2 sub-tranche or later)

See § 2.1 above for the operator-voice rationale.

| Tool | Mode | Description | Cloud API endpoint(s) | Persona | Profile dep | Cited |
|---|---|---|---|---|---|---|
| `show-referrals-routed-to-me` | read_only | The manager's referral queue. | `GET /job/v1/jobs?status=Referred&referredTo={managerId}` | 9 | MEDIUM | 007 § 4.6 |
| `whats-my-team-bind-ratio` | read_only | Bind ratio by class / by UW / by quarter — manager KPI. | `GET /job/v1/jobs?subtype=Submission&teamId=...` aggregated by status | 9 | MEDIUM | 007 § 4.6 |
| `show-uws-stacking-referrals` | read_only | Which line UW is escalating disproportionately. | `GET /job/v1/jobs?status=Referred` aggregated by `referredBy` | 9 | MEDIUM | 007 § 4.6 |
| `whats-our-concentration-on-this-class` | read_only | Portfolio concentration per coverage class — manager-level appetite enforcement. | `GET /policy/v1/policies` filtered by LOB / state / class, aggregated by exposure | 9 | HIGH (LOB classes carrier-extended) | 007 § 4.6 |
| `what-authority-overrides-this-quarter` | read_only | Audit trail of the manager's own approved exceptions. | harness audit chain query (NOT a Cloud API call — reads the local audit store) | 9 | LOW (uses harness audit, not profile mapping) | 007 § 4.6, 009 § 1.5 |

### 3.2 `claimcenter-mcp` — ClaimCenter (E7)

| Tool | Mode | Description | Cloud API endpoint(s) | Persona | Profile dep | Cited |
|---|---|---|---|---|---|---|
| `find-claims-at-risk-of-leakage` | read_only | Claims where reserves haven't moved but exposure remains open — leakage heuristic is profile-supplied. | `GET /claim/v1/claims?status=Open` filtered by carrier-defined indicators | 3 | HIGH (`LeakageRiskScore` is a custom entity) | 006 § 2.1, 007 § 2.2, 008 § 3.2 |
| `summarize-this-loss` | read_only | What happened, who's hurt, where coverage stands — multi-resource read via **CC Composite API** (CC has no Graph API per [librarian audit P2](./audits/00-LIBRARIAN-CITATION-AUDIT.md#p2--graph-api-not-present-in-claimcenter-f-prd-007--f-api-014--d)). | `POST /composite/v1/composite` against CC fanning out to claim/exposures/reserves/activities/documents/notes in one round trip ([CC 202411 apiref](https://docs.guidewire.com/cloud/cc/202411/apiref/)) | 3, 8 | MEDIUM | 006 § 2.2 (PII-redaction critical-path), 007 § 2.2, 008 § 3.2, audit § 3 P2 |
| `whats-the-reserve-picture` | read_only | Reserve and exposure picture on the file — Money-typed throughout. | `GET /claim/v1/claims/{id}/reserves` + `/exposures` | 3, 8 | HIGH (`ReserveCategory`, `ExposureType` extended) | 006 § 2.3, 007 § 2.2, 008 § 3.2 (Money typing critical) |
| `pull-this-claim` | read_only | Single-claim deep-read used as a leaf in conversational flows. | `GET /claim/v1/claims/{id}` | 8 | LOW | 07-ROADMAP § E7 |
| `draft-denial-letter` | draft_only (default `disabled` in OSS demo profile) | Compose a denial-letter artifact citing reason codes; promotion to filing is a separate `approved_execute` tool requiring dual-control. | READ side only — the draft is composed in-process, never rendered through Smart Comms in `draft_only` mode | 3, 8 | HIGH (`DenialReason`, `LossCause` extended) | 006 § 2.4 (highest-blast-radius tool in OSS catalog), § 6.3 (default-disabled in demo profile), 007 § 2.2, 008 § 3.2 |

Per 006 § 2.4, the draft-denial-letter contract is the strongest
example of physical separation between drafting and doing: the
harness emits a draft-id; promoting it to a real letter is a
*different tool* in `approved_execute` mode that takes the draft-id
as input. The agent cannot accidentally turn a draft into a filing
by re-calling the same tool with different arguments.

### 3.3 `billingcenter-mcp` — BillingCenter (E8)

| Tool | Mode | Description | Cloud API endpoint(s) | Persona | Profile dep | Cited |
|---|---|---|---|---|---|---|
| `show-overdue-accounts` | read_only | The producer-scoped or carrier-wide overdue list. | `GET /billing/v1/accounts?delinquencyStatus=...&producerCode=...` | 4 (producer scope), other billing roles | CRITICAL (`Producer.code` uniqueness model varies) | 006 § 3.1, 007 § 2.3, 008 § 3.3 |
| `where-are-we-on-this-payment` | read_only | *(Renamed from `whats-the-payment-status` per 007 § 2.3 polish.)* Payment status on a single account / invoice. | `GET /billing/v1/accounts/{id}/invoices` + `/payments` | billing operator | MEDIUM | 007 § 2.3, 008 § 3.3 |
| `whats-going-on-with-this-account` | read_only | *(Renamed from `find-billing-issues-for-this-policy` per 007 § 2.3 — matches the wide-aperture-then-drill mental model.)* Cross-suite billing issues for a policy. | cross-call: `GET /policy/v1/policies/{id}` → `GET /billing/v1/accounts/{accountId}/...` | billing operator | MEDIUM | 007 § 2.3, 008 § 3.3 |
| `reconcile-this-payment` | approved_execute (gated profile flag; NOT in OSS demo path) | Apply a payment to an account — the canary tool for `approved_execute`. | READ: payment + invoice; WRITE: `POST /billing/v1/payments/{id}/applications` (Async; idempotency key required) | billing operator, 5 | HIGH (`approval-matrix.yaml` thresholds + producer-code uniqueness) | 006 § 3.4 (canary), 007 § 2.3, 008 § 3.3 |

`reconcile-this-payment` is the **canary**: the rest of `approved_execute`
inherits its contract. Its six refusal scenarios (idempotency-key
collision; idempotency-key match short-circuit; approval timeout;
profile-policy violation by amount tier; sandbox unreachable;
evidence-bundle export failure with rollback) are the template every
future write tool follows. Per 006 § 9 recommendation 1, getting this
contract right and shipping it sloppy sets the wrong precedent for
every other tool in the platform.

### 3.4 `producer-mcp` — Producer hierarchy across suites (E9)

Per 007 § 4.5 the v3 catalog of three producer tools was Persona 4's
"portal scrap" complaint encoded — three tools is not first-class
citizenship. E9 ships **at least 8 tools** to close the density gap.
Per 07-ROADMAP § E9 the 5 missing tools are explicitly enumerated.

| Tool | Mode | Description | Cloud API endpoint(s) | Persona | Profile dep | Cited |
|---|---|---|---|---|---|---|
| `show-my-book-of-business` | read_only | The producer's bound + quoted + expiring book. | `GET /policy/v1/policies?producerCode={code}` + `GET /account/v1/accounts?producerCode={code}` | 4 | producer-code uniqueness model (CRITICAL) | 007 § 2.4, 008 § 3.4 |
| `whats-my-commission-status` | read_only | Commission earned + pending + statement-light flag, Money-typed. | `GET /admin/v1/commission-plans` + related Admin API endpoints ([BC Commission plans Consumer Guide](https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/BillingCenter/plans/commission-plans/c_working-with-commission-plans.html)). **Admin scope, NOT billing scope** ([librarian audit P3](./audits/00-LIBRARIAN-CITATION-AUDIT.md#p3--billing-commission-endpoint-path-wrong-f-prd-012--d)). | 4 | HIGH (commission rules contract-specific; admin OAuth scope required) | 007 § 2.4, 008 § 3.4, audit § 3 P3 |
| `find-my-pending-quotes` | read_only | Submissions started but not bound. | `GET /job/v1/jobs?subtype=Submission&status=Quoted&producerCode={code}` | 4 | MEDIUM | 007 § 2.4, 008 § 3.4 |
| `whats-my-loss-ratio-by-class` | read_only | Producer-side loss ratio per LOB / class — survival metric. | aggregate of `GET /claim/v1/claims?producerCode=...` and `GET /policy/v1/policies?producerCode=...` (premium denominator) | 4 | HIGH (LOB / class) | 007 § 4.5, 07-ROADMAP § E9 |
| `whats-my-bind-ratio` | read_only | Quoted vs bound this month vs last — producer-team performance signal. | `GET /job/v1/jobs?subtype=Submission&producerCode=...` aggregated by status | 4 | MEDIUM | 007 § 4.5, 07-ROADMAP § E9 |
| `whats-my-retention` | read_only | Renewal retention rate — directly drives carrier-relationship survival. | aggregate of `GET /policy/v1/policies?producerCode=...&status=Renewed,NonRenewed,Lapsed` | 4 | MEDIUM | 007 § 4.5, 07-ROADMAP § E9 |
| `which-accounts-did-i-lose-this-year` | read_only | Producer-side mirror of carrier's `did-we-lose-this-account` — lost to BOR / competitor / non-renewal. | `GET /policy/v1/policies?producerCode=...&status=Lost,NonRenewed` + transactions | 4 | HIGH (`CancellationReason` extended) | 007 § 4.5, 07-ROADMAP § E9 |
| `which-carriers-have-appetite-for-this-class` | read_only | Cross-carrier appetite from the producer perspective — flips the line-UW question. | composite of `whats-our-appetite-on-this-risk`-shaped reads scoped to producer authority | 4 | HIGH (per-class, per-state) | 007 § 4.5, 07-ROADMAP § E9 |

Producer scoping is enforced by `roles.yaml` per 008 § 4.2 — no
producer can see another producer's book; cross-broker leakage is a
hard refusal at the harness gate, not an empty-result silent fall-
through (per 006 § 4.2 commission-status cross-broker leakage check).

### 3.5 `events-mcp` — query-only over the events stream (E6)

Per [D-004](../004-DR-DEC-architecture-decisions.md): events ingestion
lives in webhook-receiver + BullMQ queue *infra*; the MCP server is
query-only over what arrived. Per 008 § 7 + § 8 the Integration
Gateway boundary is preserved — IG handles bulk / ETL / file-based
data movement, MCP handles conversational query. Tools never
subscribe to App Events at call-time; ingestion is one-way.

| Tool | Mode | Description | Source | Persona | Profile dep | Cited |
|---|---|---|---|---|---|---|
| `show-event-payload` | read_only | *(Renamed from `replay-event` per 006 § 5.1 — "replay" reads as a verb that implies re-firing the side effect; this tool does NOT.)* Returns the historical event payload for inspection. | internal events store (NOT a Cloud API call) | 7, integration engineer | LOW | 006 § 5.1, 007 § 2.5 |
| `show-activity-on-this-claim` | read_only | *(Adjuster-facing path per 007 § 2.5 — the carrier word for an event-on-a-claim is "activity.")* Lists activity history on a claim. | internal events store query (claim-scoped) | 8 | LOW | 007 § 2.5, 007 § 4.2 |
| `find-events-for-claim` | read_only | Engineer / SRE-facing path — event records for a claim by event-type. | internal events store query | 7, integration engineer | LOW | 006 § 5.2, 008 § 3.5 |
| `find-events-for-policy` | read_only | Policy-scoped event history. | internal events store query | 7, integration engineer | LOW | 07-ROADMAP § E6 |

`events-mcp` consumes from a queue sharded by `primaryObject.id` per
008 § 7 — App Events guarantees per-primary-object safe ordering, NOT
cross-claim global ordering. Tools must respect that boundary.

### 3.6 `payments-mcp` — explicitly NOT in this repo

Per 006 § 6.1 + § 9 recommendation 4, **`servers/payments-mcp/` does
NOT exist as a directory** in this repository. Money-movement tools
(`initiate-refund`, `process-payment`, `release-disbursement`,
treasury-operator vocabulary per 007 § 2.6) require dual-control
security review that has not happened, and even read-only-sounding
tools in that area are an attractive nuisance for contributors. The
carve is at the repo level — when `payments-mcp` ships, it lives in
a separate package or fork with its own threat model and dual-
control review. The reconcile-this-payment tool in `billingcenter-mcp`
deliberately stops short of money-movement: it applies an *already-
received* payment to the right account; it does not move money.

---

## 4. Three execution modes — full contract

Per [D-005](../004-DR-DEC-architecture-decisions.md), [D-006](../004-DR-DEC-architecture-decisions.md),
and 006 § 7. Mode is declared in tool metadata (Zod schema +
manifest), bound at MCP-handshake time, and is not negotiable mid-call
(006 § 7.2). The harness enforces — tools cannot upgrade mode on
their own (009 § 8). The hash-chain integrity property (009 § 2.6)
makes the gate physical, not advisory.

### 4.1 Mode comparison

| Aspect | `read_only` | `draft_only` | `approved_execute` |
|---|---|---|---|
| **Inputs accepted** | Tool args (Zod-validated) + actor JWT | Same as read_only + draft-context args | Same + idempotency-key-deriving inputs + (when promoted) draft-id reference for draft→file flows |
| **Side effects allowed** | Zero Guidewire writes | Zero Guidewire writes; writes only to harness draft store | Exactly one Guidewire write per idempotency key, gated through `harness.execute()` |
| **Refusal scenarios** (cite 006) | auth_expired (006 § 1.1.1); actor_unresolved (006 § 1.1.2); sandbox_unreachable per [D-008](../004-DR-DEC-architecture-decisions.md) NO MOCKS (006 § 1.1.3); profile_policy_violation (006 § 1.1.4); tenant_mismatch on cross-check (006 § 1.2); insured_not_found vs no_access distinct (006 § 1.3 — enumeration attack defense); typelist_unknown_value (006 § 1.5); profile_incomplete_for_this_carrier (006 § 1.2 / 1.6 for ⚠ tools) | Same as read_only + reason_code_unknown (006 § 2.4.1); template_render_failure (006 § 2.4.2 — never fall back to LLM draft); state_violation_closed_claim (006 § 2.4.3); pii_redaction_failure_in_critical_path (006 § 2.4.4 / § 2.2); profile_immutable_field (006 § 1.8 — producer can't endorse named-insured DOB); honeypot_ux_refusal (006 § 1.7 — refuse at draft generation if actor lacks `approval-matrix.yaml` permission to file) | Same as draft_only + idempotency_collision (006 § 3.4.1); approval_timeout (006 § 3.4.3 — no auto-approve fallback; Persona 5 will fail the design); policy_violation_amount_tier (006 § 3.4.4); evidence_bundle_export_failed_with_rollback (006 § 3.4.6 — Postgres write succeeded, JSON bundle could not be sealed → rollback harness state, then refuse atomically); chain_broken (009 § 2.4 — refuse all tenant writes until `chain.repair.acknowledged`) |
| **Audit emitted** | Mandatory per Persona 5 read-side exfil threat (006 § 1.1 "Why even read_only audits"). Schema: `trace_id`, `tenant_id`, `tool_name`, `mode`, `actor_id`, `decision`, `decision_reason`, `pii_redacted`, `latency_ms`, `result_count` (NEVER body). | All read_only fields + draft body **hash-summarized only** (006 § 1.7); never plaintext draft in audit. Persona 5 doesn't want denial-letter drafts in the audit DB. | All read_only fields + `idempotency_key`, `evidence_bundle_id`, `approver_ids[]`, `approval_decisions[]`, `policy_chain[]`, `harness_plan_id`, `rollback_hint`, `hash_chain_prev` (006 § 3.4 audit row schema). Hash-chained per 009 § 2 with linear chain per-tenant. |
| **Telemetry emitted** (per [D-013](../004-DR-DEC-architecture-decisions.md) + 05-TECHNICAL-SPEC § 4) | OTel span: `mcp.tool.invoke` → `harness.plan.create` → `harness.policy.evaluate` → `client.guidewire.cloud.<endpoint>` → `harness.audit.write`. Required attrs: `trace_id`, `tenant_id`, `tool_name`, `tool_version`, `mode`, `actor_id`. | Same as read_only span tree (no `client.guidewire.cloud.<endpoint>` for the draft itself; only for read inputs). | Full span tree per 05-TECHNICAL-SPEC § 4.2 — adds `harness.approval.wait`, `harness.evidence.bundle`. Approval span carries `state`, `durationMs`. |
| **Failure modes & recovery** | Sandbox-unreachable → loud fail (no mock fallback per [D-008](../004-DR-DEC-architecture-decisions.md)); auth-failure → refresh once + retry once + structured refusal (008 § 10); rate-limit 429 → exponential backoff + jitter at client layer, never tool concern (008 § 5). | Read-side failures (above) + draft-render failure → refuse with reason; never fall back to LLM-only output for regulator-facing artifacts (006 § 2.4.2). | Per 009 § 6 failure table — every failure has a defined state, an audit entry (or refusal), and a return shape. The asymmetry between *audit unreachable* (refuse the write per [D-006](../004-DR-DEC-architecture-decisions.md)) and *observability unreachable* (degraded warning, write proceeds) is deliberate (009 § 6 closing paragraph). Idempotency replay short-circuits to prior result; `IDEMPOTENCY_MISMATCH` (same key, different plan) is a hard refusal indicating canonicalization bug. |

### 4.2 Refusal contract

Per 006 § 7.8 every refusal is structured, not exceptional:

```json
{
  "decision": "refused",
  "reason": "<machine-readable code from the catalog above>",
  "message": "<human-readable, audit-ready>",
  "retry_after": "<optional ISO-8601 duration when applicable>"
}
```

The agent must be able to reason about *why* the refusal happened to
decide whether to retry, escalate, or stop. A thrown exception that
bubbles to the agent as "tool errored" is a CI failure (per 009 § 6
table — `AppError` typed class mandatory in `servers/*` and
`packages/harness/`).

### 4.3 OSS demo profile defaults (per 006 § 9 recommendation 3)

The OSS demo profile (the publicly-shipped `profiles/_template/` plus
the seeded demo profile in `profiles/oss-demo/`) defaults to:

- Every `read_only` tool: **enabled**
- Every `draft_only` tool: **enabled** *except* `draft-denial-letter`
  which defaults to **disabled** (006 § 6.3 — public demo risk too
  high for an unsupervised agent to reach a real claim)
- Every `approved_execute` tool: **disabled** (006 § 9.3 — default-deny
  on every approved-execute in the public demo path)

Customers flip these on by editing their own profile + bringing
sandbox creds; the harness ships the code path in E3 (per
[`07-ROADMAP § E3 Out of scope`](./07-ROADMAP.md)) but the OSS demo
never executes a real write.

---

## 5. Harness contract

The harness is the durable moat per 009 § "Why this memo exists" — the
runtime that gates writes with hash-chained audit, approval flow,
idempotency contract, and evidence bundle. Per [D-003](../004-DR-DEC-architecture-decisions.md)
it ships as a library + CLI (`@intentsolutions/guidewire-harness` on
npm), NOT as an MCP server (recursive + breaks Persona 7's tool-
selection budget per [D-002](../004-DR-DEC-architecture-decisions.md)).

These TypeScript signatures are the literal contract — they land in
`packages/harness/src/index.ts` verbatim when E3 opens (per 009 § 11
"What this memo commits to"). Deviation requires a follow-up
`010-DR-MEMO-harness-runtime-rev.md` with a `replaces:` link.

### 5.1 Plan — what the agent intends

```ts
export type ToolMode = 'read_only' | 'draft_only' | 'approved_execute';

export interface PlanInput {
  toolName: string;          // carrier-vocabulary
  toolVersion: string;       // semver; idempotency keys version-pin
  mode: ToolMode;
  tenantId: string;          // customer profile slug
  actorId: string;           // JWT sub
  args: Record<string, unknown>;  // already Zod-validated
  summary: string;           // surfaces in approval UIs + audit search
  traceId: string;           // OpenTelemetry trace ID
}

export interface Plan extends Readonly<PlanInput> {
  readonly planId: string;        // sha256 content hash, hex
  readonly createdAt: string;
  readonly idempotencyKey: string; // harness-side gwh1: key (see § 5.4)
  readonly wire: {
    /**
     * Guidewire-side server-side duplicate-prevention key, sent as
     * `GW-DBTransaction-ID` header on Cloud API write requests.
     * Distinct from `idempotencyKey` (which is the harness-side cache
     * key for client-side replay short-circuit). Per librarian audit
     * P1 — Guidewire's mechanism FAILS duplicates with
     * AlreadyExecutedException, it does not replay.
     * Currently derived as sha256(idempotencyKey) (64 hex, no prefix);
     * sandbox-confirm at guidewire-adj for accepted shape/length/TTL.
     */
    readonly dbTransactionId: string;
  };
}

export function plan(input: PlanInput): Plan;
```

Pure (no I/O). Hashing input → planId is the only side work. Plans
pass by value; mutation throws.

**Two-key model (librarian P1).** `Plan.idempotencyKey` is the
harness-side `gwh1:`-prefixed key driving Postgres replay
short-circuit. `Plan.wire.dbTransactionId` is the Guidewire-side
`GW-DBTransaction-ID` header value the client wrapper injects on
writes ([IS Consumer Guide — preventing duplicate database
transactions](https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/Basic-REST-operations/request-headers/c_preventing-duplicate-database-transactions.html)).
The two are complementary safety nets for distinct purposes — never
the same value, never the same mechanism. See
[`./audits/00-LIBRARIAN-CITATION-AUDIT.md` § 3 P1](./audits/00-LIBRARIAN-CITATION-AUDIT.md#p1--idempotency-mechanism-misnamed-and-mischaracterized-f-prd-015--d).

### 5.2 Policy — the gate decision

```ts
export type PolicyOutcome = 'allow' | 'deny' | 'require_approval';

export type PolicyTier =
  | 'tier_0_safe'      // read_only with no PII; no approval
  | 'tier_1_draft'     // draft artifact; no approval
  | 'tier_2_low'       // approved_execute, single approver
  | 'tier_3_high'      // approved_execute, dual control (e.g. payments)
  | 'tier_4_blocked';  // structurally refused (e.g. payments in OSS demo)

export interface PolicyDecision {
  readonly decisionId: string;       // sha256(planId + ruleSetVersion)
  readonly planId: string;
  readonly outcome: PolicyOutcome;
  readonly tier: PolicyTier;
  readonly reason: string;
  readonly ruleSetVersion: string;
  readonly evaluatedAt: string;
  readonly requiredApprovers?: {
    minCount: number;
    rolesAllowed: readonly string[];
  };
}

export interface PolicyEngine {
  evaluate(plan: Plan): Promise<PolicyDecision>;
}
```

Rules live in `profiles/<tenant>/policy/` plus a small core ruleset
shipped by the harness (refuse on mode mismatch, refuse on missing
PII redaction profile). Per [D-006](../004-DR-DEC-architecture-decisions.md)
the harness refuses to call `execute()` without a `PolicyDecision`
whose outcome is `allow` (or `require_approval` paired with an
attached `Approval`).

### 5.3 Approval — blocking flow as state machine

```ts
export type ApprovalState = 'pending' | 'approved' | 'denied' | 'expired' | 'cancelled';

export interface Approval {
  readonly approvalId: string;        // sha256(planId + nonce)
  readonly planId: string;
  readonly decisionId: string;
  readonly state: ApprovalState;
  readonly requestedAt: string;
  readonly expiresAt: string;         // default 24h, profile-overridable
  readonly approvers: ReadonlyArray<{
    actorId: string;
    role: string;
    decidedAt: string;
    outcome: 'approved' | 'denied';
    reason?: string;
  }>;
}

export interface ApprovalSink {
  request(plan: Plan, decision: PolicyDecision): Promise<Approval>;
  wait(approvalId: string, opts?: { timeoutMs?: number }): Promise<Approval>;
  decide(approvalId: string, vote: ApprovalVote): Promise<Approval>;
}

export interface ApprovalVote {
  actorId: string;
  role: string;
  outcome: 'approved' | 'denied';
  reason?: string;
}
```

Approvals persist in Postgres so a restart, network partition, or
CLI session ending mid-wait does not lose the request (009 § 1.3).
Per 009 § 3.4 there is no auto-approval bypass — a missing approval
is indistinguishable from a missing audit (per [D-006](../004-DR-DEC-architecture-decisions.md)).

### 5.4 Execute — side effect with idempotency

```ts
export interface ExecuteContext {
  readonly plan: Plan;
  readonly decision: PolicyDecision;
  readonly approval?: Approval;
  readonly span: import('@opentelemetry/api').Span;
}

export type SideEffect<T> = (ctx: ExecuteContext) => Promise<T>;

export interface ExecuteResult<T> {
  readonly outcome: 'executed' | 'replayed' | 'short_circuited';
  readonly idempotencyKey: string;
  readonly auditEntryId: string;
  readonly value: T;
  readonly evidenceBundleRef: string;
}

export function execute<T>(
  plan: Plan,
  decision: PolicyDecision,
  effect: SideEffect<T>,
  opts?: { approval?: Approval }
): Promise<ExecuteResult<T>>;
```

`execute()` is the only function in the harness that performs an
external write. The tool author cannot bypass — depcruise CI rule
(009 § 8.2) fails any `servers/**` file that imports `clients/**`
directly, forcing all writes through the harness. The
idempotency-key formula is deterministic (009 § 4.1):

```
idempotencyKey = "gwh1:" + sha256(
  toolName + ':' + toolVersion + ':' + tenantId + ':' +
  canonicalize(args) + ':' + actorId
)
```

`canonicalize()` is JCS-style canonical JSON (RFC 8785) so map-order
doesn't matter. The `gwh1:` prefix is the harness major-version tag
so a future replay-store schema change is distinguishable. Two
operators racing the same intent get different keys (because `actorId`
is part of the input); a contract-changing release does not replay
across the boundary (because `toolVersion` is part of the input).

Replay short-circuit on key match: the side effect is never invoked,
the previous value is returned, the span is annotated
`harness.execute.replay = true`, and an `execute.replayed` audit entry
is written referencing the original `audit_entry_id`. **On a
short-circuit, no `GW-DBTransaction-ID` header is sent to Guidewire**
— the harness layer absorbs the duplicate before the wire call.

**Wire idempotency mechanism (librarian P1).** When the side effect
*does* fire, the `packages/guidewire-client/` wrapper injects
`Plan.wire.dbTransactionId` as the `GW-DBTransaction-ID` HTTP header
on the Cloud API write. Per the [IS Consumer Guide](https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/Basic-REST-operations/request-headers/c_preventing-duplicate-database-transactions.html),
Guidewire **fails** duplicate-key writes with `AlreadyExecutedException`
— it does NOT replay the prior result like Stripe-style
`Idempotency-Key`. The two-key model is deliberate: `gwh1:` drives
*harness-side* replay short-circuit (returns prior value); the
`GW-DBTransaction-ID` header is the *server-side* defence that should
never fire in normal operation because the harness's own cache will
have absorbed the duplicate first. If `GW_DBTRANSACTION_DUPLICATE`
ever surfaces, it indicates a harness cache miss or a cross-process
race — forensic-only.

### 5.5 Audit — hash-chained entry

```ts
export type AuditEventType =
  | 'plan.created' | 'policy.decided'
  | 'approval.requested' | 'approval.decided'
  | 'execute.started' | 'execute.completed' | 'execute.failed' | 'execute.replayed'
  | 'rollback.hint.issued';

export interface AuditEntry {
  readonly entryId: string;          // ULID
  readonly tenantId: string;
  readonly chainSeq: number;
  readonly eventType: AuditEventType;
  readonly planId: string;
  readonly traceId: string;
  readonly actorId: string;
  readonly toolName: string;
  readonly toolVersion: string;
  readonly mode: ToolMode;
  readonly idempotencyKey: string;
  readonly recordedAt: string;
  readonly prevHash: string;
  readonly entryHash: string;
  readonly blobRef?: string;
}

export interface AuditStore {
  append(entry: Omit<AuditEntry, 'chainSeq' | 'prevHash' | 'entryHash'>): Promise<AuditEntry>;
  verifyChain(tenantId: string, fromSeq?: number): Promise<ChainVerification>;
  query(filter: AuditQuery): AsyncIterable<AuditEntry>;
}
```

Linear hash chain per-tenant (NOT Merkle — 009 § 2.1). Tamper-evidence
demands content-addressing per 006 § 7.7. A tampered chain in tenant
A does not invalidate tenant B; an enterprise customer takes their
chain on offboarding. Single-writer property is enforced via
serializable-transaction `FOR UPDATE` on the `audit_chain_heads` row
(009 § 2.3). The Postgres DDL lands as the canonical migration in
`packages/harness/migrations/0001_init.sql` per 009 § 2.2.

### 5.6 Rollback — hint, not magic

```ts
export interface RollbackHint {
  readonly hintId: string;
  readonly planId: string;
  readonly auditEntryId: string;
  readonly humanInstruction: string;       // 1-3 sentences
  readonly suggestedTool?: string;         // e.g. "revert-reserve-change"
  readonly suggestedArgs?: Record<string, unknown>;
  readonly cautions: readonly string[];    // e.g. "this letter has already been mailed"
  readonly issuedAt: string;
}

export function rollbackHint(
  result: ExecuteResult<unknown>,
  opts: { humanInstruction: string; cautions?: readonly string[] }
): Promise<RollbackHint>;
```

Per 009 § 1.6 rollback is a *hint*, not an automated revert.
Guidewire writes are rarely idempotent in reverse — a reserve change
can be reversed; an issued denial letter cannot. The harness records
that the hint was issued (`rollback.hint.issued` audit event); the
human operator executes.

### 5.7 Evidence bundle

```ts
export interface EvidenceBundle {
  readonly bundleVersion: '1.0';
  readonly traceId: string;
  readonly tenantId: string;
  readonly generatedAt: string;
  readonly plan: Plan;
  readonly decision: PolicyDecision;
  readonly approval?: Approval;
  readonly execution?: ExecuteResult<unknown>;
  readonly auditEntries: readonly AuditEntry[];
  readonly chainVerification: ChainVerification;
  readonly spans: readonly OtelSpanSnapshot[];
  readonly piiRedactionApplied: boolean;
}

export interface EvidenceExporter {
  build(traceId: string, opts?: { includeSpans?: boolean }): Promise<EvidenceBundle>;
  sign?(bundle: EvidenceBundle): Promise<SignedEvidenceBundle>;  // E3+
}
```

The artifact a CISO or SOC 2 auditor receives (009 § 5). Reproducible
from the audit chain alone. PII redaction runs at bundle export
(009 § 5.4) — not on the hot path of `execute()` — applying the
profile's `pii-policy.yaml` to the assembled bundle. Bundle signing
ships as `evidence.sign?` in v1 (forward-compatible surface; the
operational story for KMS-resident Ed25519 is E3+ per 009 § 5.5).

### 5.8 Factory + result + error

```ts
export interface HarnessConfig {
  audit: AuditStore;
  policy: PolicyEngine;
  approvals: ApprovalSink;
  evidence: EvidenceExporter;
  observability: import('@intentsolutions/guidewire-observability').Observability;
  profile: { tenantId: string; ruleSetVersion: string };
}

export function createHarness(cfg: HarnessConfig): Harness;

export class HarnessError extends Error {
  readonly code:
    | 'AUDIT_UNREACHABLE' | 'POLICY_UNREACHABLE' | 'POLICY_DENIED'
    | 'APPROVAL_TIMEOUT' | 'APPROVAL_DENIED'
    | 'IDEMPOTENCY_MISMATCH' | 'CHAIN_BROKEN'
    | 'MODE_MISMATCH' | 'TENANT_UNKNOWN'
    | 'GW_DBTRANSACTION_DUPLICATE';  // librarian P1: forensic-only;
                                      // surfaces when Guidewire returns
                                      // AlreadyExecutedException because
                                      // harness cache missed the duplicate
  readonly planId?: string;
  readonly decisionId?: string;
}
```

`HarnessError` extends the `AppError` typed class shipped in
`packages/observability/` per 05-TECHNICAL-SPEC § 4.5 — Sentry tagging
groups failures by `[code, tool_name, mode]` so the same refusal across
multiple tenants groups into one Sentry issue rather than fragmenting.

### 5.9 Three-mode enforcement at the harness layer

Per 009 § 8 — tools declare a mode; the harness enforces it. Tools
cannot bypass the harness for writes. Two CI rules make this
architectural:

1. **Depcruise layer rule:** no file in `servers/**/src/**` may
   import any module from `clients/**` or
   `packages/guidewire-client/**` except via `packages/harness/`.
2. **AST call-site rule:** any call into `packages/guidewire-client`'s
   write-shaped methods (HTTP `POST`/`PUT`/`PATCH`/`DELETE`) must be
   inside an `execute()` callback (verified by call-site analysis).

Combined, the harness becomes the only path to writes. When a forked
carrier-vocabulary tool ships, it cannot remove the gate because
the gate isn't theirs to remove.

Cross-link: 05-TECHNICAL-SPEC § 4 has the full observability +
architecture-rule enforcement spec; the PRD does not duplicate.

---

## 6. Customer profile contract

`profiles/_template/` ships **9 YAML files** (per 008 § 4 — eight
originally specified plus `events.yaml` added as the 9th per 008 § 7
recommendation). Profiles are small mapping data, never executable
code (per [D-007](../004-DR-DEC-architecture-decisions.md) — Persona 6
flagged `adapters/customers/` as 18-month consultancy disguise).
Every YAML round-trips through Zod schemas in `packages/schemas/` —
validated at boot per [D-007](../004-DR-DEC-architecture-decisions.md).

The schema fields below are the minimum prescribed shape; the full
worked examples live in the `profiles/_template/` directory once E4
ships, with the canonical schema definitions in
`packages/schemas/src/profile/*.ts`.

### 6.1 `auth.yaml` — Guidewire Hub OAuth + JWT propagation

| Field | Required | Notes |
|---|---|---|
| `oauth.client_id_env` | yes | Name of env var carrying client ID — never the value (008 § 4.1) |
| `oauth.client_secret_env` | yes | Same — env var name only |
| `oauth.token_endpoint` | yes | Per-tenant URL; resolvable via OIDC discovery once sandbox lands (008 § 14 open question 3) |
| `oauth.scopes` | yes | List; write scopes appended only when `approved_execute` mode is enabled (008 § 4.1) |
| `oauth.token_lifetime_seconds` | no | Default 3600; tenant-overridable |
| `oauth.refresh_strategy` | yes | `proactive` mandatory — refresh at 80% of lifetime; in-flight `approved_execute` writes cannot afford a mid-write 401 (008 § 10) |
| `oauth.jwt_propagation.enabled` | yes | Per Persona 5 — no standing service-account credentials |
| `oauth.jwt_propagation.actor_claim` | yes | Which JWT claim carries `actor_id` (default `sub`) |
| `api.base_url_pc` / `api.base_url_cc` / `api.base_url_bc` | yes | Cloud API base URLs |
| `api.cloud_release` | yes | Pin per tenant — `Innsbruck` / `Las Leñas` / `Palisades` (008 § 2). `latest/` URLs in code, docs, or recordings forbidden per 008 § 12 "avoid" item 11 |

### 6.2 `roles.yaml` — role × tool × mode permission matrix

```yaml
roles:
  CL_Underwriter:
    policycenter-mcp:
      find-submissions-waiting-on-me: read_only
      whats-our-appetite-on-this-risk: read_only
      draft-referral-note: draft_only
    claimcenter-mcp: {}        # no claim access
  Claims_Adjuster_II:
    claimcenter-mcp:
      summarize-this-loss: read_only
      whats-the-reserve-picture: read_only
      draft-denial-letter: draft_only
      reconcile-this-payment: approved_execute  # gated via approval-matrix
```

Role names are profile-mapped — Acme's `CL_Underwriter` is Beta's
`Comm_UW_L1` (008 § 4.2). The agent never sees carrier role names; it
sees the tool catalog scoped per actor. Validation rule: every
referenced tool must exist in the corresponding server's manifest
(boot-time fail-fast).

### 6.3 `lob.yaml` — LOB code mappings (the only place LOB code-mapping lives)

Per 008 § 4.3 + § 12 "avoid" item 1 — hard-coded LOB or typelist
values in tool code is a CI failure.

| Field | Required | Notes |
|---|---|---|
| `lob_mappings.<carrier_code>.canonical` | yes | Cross-carrier label flowing into tool inputs (e.g. `CommercialProperty`) |
| `lob_mappings.<carrier_code>.uwcenter_rule_set` | yes | Per-carrier UWCenter rule entity name |
| `lob_mappings.<carrier_code>.coverage_typelist` | yes | Which typelist (in `typelists.yaml`) holds coverage values for this LOB |

Tools never hard-code LOB codes; the canonical value flows into tool
inputs, the carrier code flows into Cloud API calls (008 § 4.3).

### 6.4 `typelists.yaml` — typelist value mappings

Per 008 § 4.4 + § 12 "avoid" item 8 — typelists are open per carrier;
treat enum-shaped Cloud API fields as `string` + profile-validated,
NOT as closed enums.

```yaml
typelists:
  LossCause:
    source: customer_extended       # vs base
    base_uri: https://docs.guidewire.com/cloud/cc/202411/apiref/...
    values:
      - { code: 1_collision, label: Collision }
      - { code: acme_unique_99, label: Acme-Specific-Loss-Type, carrier_extension: true }
  PolicyTermStatus:
    source: base
    base_uri: https://docs.guidewire.com/cloud/pc/202503/apiref/...
    # values omitted — profile inherits base
```

The `source: base | customer_extended` flag tells the harness when a
release-drift check needs to re-validate the typelist (only
`customer_extended` lists drift on upgrade; `base` lists drift on
Guidewire release boundary). Validation rule: every tool that emits
a typelist field must declare its typelist binding, and every
declared typelist must round-trip a sample value through the
profile-loader Zod schema at boot.

### 6.5 `custom-entities.yaml` — custom entity → tool input mappings

Per 008 § 4.5 — custom entities are emitted per-tenant Swagger; the
`api_path` is what makes the tool work against this carrier.

```yaml
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
```

Validation rule: `api_path` must be a syntactically-valid Cloud API
path template; `parent_entity` must match a known base entity name.

### 6.6 `field-aliases.yaml` — Guidewire field name → carrier-vocabulary term

Per 008 § 4.6 — Address `street1` is the canonical "we assumed it";
Producer `code` uniqueness is not portable; date / datetime
distinction varies per carrier. Profile must declare per-field.

```yaml
aliases:
  Account:
    insured: namedInsured
    policyholder: namedInsured        # synonym to same field
  Producer:
    agency_code: code                 # NOT producerNumber
  Claim:
    loss_summary_text: lossDescription
    paid_to_date_amount: paidAmount   # Money-typed — preserve currency

money_fields:                         # explicit list — never strip currency
  - Claim.paidAmount
  - Claim.reserveAmount
  - Policy.totalPremiumAmount
  - Payment.amount

date_fields:                          # explicit per-field convention
  - field: Policy.effectiveDate
    format: ISO_8601_date             # date-only, no time
  - field: Policy.boundDate
    format: ISO_8601_datetime         # datetime with TZ
  - field: Claim.lossDate
    format: ISO_8601_date             # variable per carrier; declare here
```

`money_fields` is non-negotiable per 008 § 11 — Money typing is
`{ amount: string, currency: string }` shape; `amount` is string for
arbitrary precision (do not use JS `number` for financial values);
currency precision varies (USD = 2dp, JPY = 0dp); stripping currency
is a catastrophic error for multi-currency carriers (008 § 12 "avoid"
item 5). `date_fields` distinguishes date-only vs datetime — wrong
format = mid-summary parse error.

### 6.7 `approval-matrix.yaml` — write actions → required approver tier

```yaml
matrix:
  policycenter-mcp.draft-endorsement:    # when promoted to approved_execute
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

Per Persona 3 ([`002-DR-CRIT § Persona 3`](../002-DR-CRIT-personas.md)):
not every write gates on human approval — claims people make 80
decisions a day. The matrix is how a carrier expresses "auto-approve
below $X, escalate above." Money typing is preserved here too;
conditions reference both `amount` and `currency`. Validation rule:
every `approved_execute` tool referenced must exist in the manifest;
every `approver_tier` must exist in `roles.yaml`.

### 6.8 `pii-policy.yaml` — PII redaction rules

Per Persona 5 + the BAA-path carve-out (008 § 4.8):

```yaml
classes:
  high_pii:
    fields:
      - Claim.lossDescription
      - Claim.notes[*].body
      - Account.contactInfo[*].email
    handling: redact_in_summaries
  medium_pii:
    fields:
      - Account.namedInsured
    handling: redact_unless_role_in
    allowed_roles: [Claims_Adjuster_II, Claims_Manager]
  low_pii:
    fields:
      - Producer.code
    handling: pass_through

baa_required:
  enabled: false
  # when true: tool catalog filters down to BAA-cleared tools only;
  # health-LOB carrier profiles MUST set enabled: true (006 § 6.2)
```

PII redaction is a harness pipeline (per 006 § 7.5), not per-tool code
— `packages/harness/redaction/` owns the redactor; tools declare
which response fields are redactable in their Zod schema; the harness
applies the profile's rules at response time. Never asking each tool
author to remember to call the redactor is the only safe shape;
half will forget.

### 6.9 `events.yaml` — App Events subscription configuration (the 9th)

Added per 008 § 7 recommendation — App Events subscription
configuration lives on the carrier tenant, not in public docs; the
events-receiver MUST be profile-driven.

| Field | Required | Notes |
|---|---|---|
| `subscriptions[].event_type` | yes | Guidewire App Event name (e.g. `ClaimReserveChanged`) |
| `subscriptions[].subscription_id` | yes | Per-tenant subscription identifier |
| `subscriptions[].consumer_target` | yes | Which suite MCP server consumes (`claimcenter-mcp` etc.) |
| `subscriptions[].filter` | no | Carrier-side filter expression if applicable |
| `delivery.retry_policy` | yes | At-least-once retry policy parameters (008 § 7 "Events are delivered at least once") |
| `delivery.shard_by` | yes | Always `primaryObject.id` per 008 § 7 — preserves Guidewire's safe-ordering guarantee |
| `replay.retention_days` | yes | How long event replay surface keeps payloads |

Validation rule: `consumer_target` must be a known suite MCP server;
`shard_by` must equal `primaryObject.id` (any other value is a CI
failure — the safe-ordering refinement of [D-004](../004-DR-DEC-architecture-decisions.md)
is not negotiable).

### 6.10 OSS demo profile

`profiles/oss-demo/` ships a fully-populated example profile with the
defaults of § 4.3:

- All `read_only` tools enabled
- All `draft_only` tools enabled except `draft-denial-letter` (disabled)
- All `approved_execute` tools disabled
- `pii-policy.yaml` baa_required: false
- Sandbox tenant URL pointing at Jeremy's sandbox (per
  `guidewire-adj` once GH #1 closes)

Customers fork to a new directory and edit; the OSS demo profile is
read-only reference material, not the production path.

---

## 7. Cowork fork-starter contract

`templates/cowork-fork-starter/` ships in E4 per [D-011](../004-DR-DEC-architecture-decisions.md)
+ [`07-ROADMAP § E4`](./07-ROADMAP.md). The contract: forking the
template is the cohort assignment. The template renames carrier
vocabulary into the cohort member's domain vocabulary, but the
*architecture* — three modes, harness, audit chain, profile schema,
observability, NO MOCKS — stays identical. The architecture is the
lesson; the carrier domain is the example.

### 7.1 The init script

```bash
pnpm guidewire init <domain>
# e.g. pnpm guidewire init flatbed-mcp     (Jeremy's trucking domain)
#      pnpm guidewire init mls-mcp         (real estate)
#      pnpm guidewire init floor-mcp       (restaurant ops)
#      pnpm guidewire init shopify-mcp     (e-com)
```

Behavior:

1. Copies the canonical layout (`servers/`, `packages/`, `profiles/_template/`, `tests/`, `infra/`).
2. Renames `servers/policycenter-mcp` → `servers/<domain>-mcp` (one per the cohort member's primary suite).
3. Substitutes carrier-domain placeholders in tool stubs — three
   stubbed `read_only` tools per the cohort member to fill in.
4. Drops `profiles/_template/` unchanged (the schema is universal).
5. Drops `packages/harness/` unchanged (the governance contract is
   universal).
6. Updates `package.json` workspace + READMEs with the new name.
7. Runs `pnpm install && pnpm -r test` as the smoke test.

### 7.2 What gets renamed

| Stays unchanged | Renamed per domain |
|---|---|
| `packages/harness/` (the durable moat) | `servers/<domain>-mcp/src/tools/*` (carrier verbs → domain verbs) |
| `packages/audit/` (hash chain semantics) | Tool descriptions + tool-name examples in READMEs |
| `packages/observability/` (OTel + pino + Sentry) | `profiles/_template/lob.yaml` (LOB → domain class) — schema unchanged, contents replaced |
| `packages/schemas/` (Zod base schemas) | Recordings provenance metadata (`from-<sandbox-tag>` → `from-<domain-source-tag>`) |
| `tests/TESTING.md` policy floor | Repo name, package names, npm scope (per cohort member's choice) |
| Three-mode design (`read_only` / `draft_only` / `approved_execute`) | Approval-matrix conditions (Money typing → domain currency / amount unit) |

### 7.3 What stays carrier-vocabulary-shaped (the lesson)

The cohort member's domain tools should be in *domain* vocabulary —
*"find-loads-waiting-on-me"* (Jeremy's flatbed-mcp) replaces
*"find-submissions-waiting-on-me"*; *"summarize-this-listing"*
replaces *"summarize-this-submission"*. The grammatical shape — the
question form, possessive scope, hyphen-coupled sentence-readable
name — stays identical. The 8-rule PR-time vocabulary checklist (007
§ 7) applies to every cohort fork, mechanically enforced via the
same `audit-harness vocab-lint` (per 05-TECHNICAL-SPEC § 6.5). When
a cohort member ships a tool named `search_loads_by_id`, the lint
fails the same way it would fail in this repo — enforcement travels
with the code per CLAUDE.md hard rule 7.

### 7.4 One worked fork example (E4 milestone)

Per [`07-ROADMAP § E4`](./07-ROADMAP.md), Jeremy's own `flatbed-mcp`
(trucking dispatch) ships as the milestone fork — three stubbed
trucking tools demonstrating the rename + the harness inheritance.
This is the proof that the template works; subsequent cohort forks
follow the same playbook.

---

## 8. Acceptance criteria — MVP epics

Per CLAUDE.md "What This Is" + [D-009](../004-DR-DEC-architecture-decisions.md):
the OSS repo is a credibility artifact for inbound carrier / MGA / SI
work. Acceptance for the MVP epics is shaped at the user (operator,
inbound prospect, cohort member) verification level — not the
engineer-facing exit criteria (those live in
[`07-ROADMAP.md`](./07-ROADMAP.md) per-epic). The two views are
complementary: ROADMAP says "the build is done"; PRD acceptance says
"the user can verify it works."

### 8.1 E1 — Foundation (`mcp-runtime`, `schemas`, `auth`, `audit`, `client-sdk`, `observability`)

Acceptance — what an inbound user verifies:

- A fresh clone of the repo runs `pnpm install && pnpm -r build &&
  pnpm -r test` to a clean green status without manual setup beyond
  Node 22 LTS + pnpm.
- The CI badge in the README points at a green GitHub Actions run on
  the tip of `main`.
- Each foundation package (`mcp-runtime`, `schemas`, `auth`, `audit`,
  `client-sdk`, `observability`) has a public README that explains
  what it does, and at least one Vitest test that exercises the
  public API.
- A demo OTel collector + Jaeger UI (via `infra/docker/observability.yml`)
  comes up with `docker-compose up -d`; an inbound user can see a span
  tree from a smoke run of `packages/observability` per 05-TECHNICAL-SPEC
  § 4.10 quick-start.
- `LICENSE` is Apache-2.0, `CONTRIBUTING.md` is real (not template),
  and the `tests/TESTING.md` hash-pin matches what's committed
  (`pnpm exec audit-harness verify` returns 0).
- Per CLAUDE.md hard rule 3 (NO MOCKS): there are zero hand-written
  fixture JSON files in the repo; `tests/recordings/MANIFEST.md`
  exists with at least the auth round-trip recording entry.
- Per CLAUDE.md hard rule 7: enforcement travels with the code —
  `pnpm exec audit-harness arch` passes, and CI does NOT reference
  `~/.claude/` paths.

### 8.2 E2 — PolicyCenter MCP (read-only)

Acceptance — what an underwriter or inbound prospect verifies:

- An underwriter (or anyone with the demo profile) can wire
  `servers/policycenter-mcp` into Claude Desktop using the example
  config in the README, and ask *"find submissions waiting on me"* —
  the tool returns a deterministic top-N list from a recording
  replayed against the demo tenant.
- All 5-7 carrier-vocabulary tools (per § 3.1.1) pass the 8-rule
  vocabulary checklist (`pnpm exec audit-harness vocab-lint`) with
  zero API-verb leaks and zero engineering-speak hits.
- The two ⚠ tools (`whats-our-appetite-on-this-risk`,
  `explain-why-this-got-referred`) surface their incomplete-without-
  profile banner against any profile that does not declare the
  required UWCenter rule shapes — verified by running the tool
  against the demo profile (which declares them) AND a stripped-down
  profile (which doesn't), and confirming the structured refusal
  surfaces in the latter (006 § 1.2 / § 1.6).
- Every tool emits a read-side audit row (per 006 § 1.1 "Why even
  read_only audits") — verified by inspecting the `audit_entries`
  table after a smoke run and confirming `result_count` is logged
  but no policy/account body is.
- Per CLAUDE.md hard rule 3 (NO MOCKS): every tool's contract test
  replays against a recording in `tests/recordings/` with a complete
  `MANIFEST.md` entry (provenance: `recorded-2026-MM-DD.from-sandbox-jeremy-dev`,
  sanitized: true).
- Persona 9 underwriting-manager view (§ 2.1) tools pass the same
  vocabulary checklist; whether they ship in E2 or slip to a later
  sub-epic, their acceptance criteria are identical.

### 8.3 E3 — Harness library + CLI

Acceptance — what a CISO (Persona 5) or compliance reviewer verifies:

- `npm install @intentsolutions/guidewire-harness` resolves; the
  package's TypeScript definitions match the signatures in § 5.1-5.8
  verbatim.
- Running `guidewire-harness chain verify --tenant <tag>` against a
  populated audit chain returns `✓ verified N entries` end-to-end;
  introducing a single-byte tamper into any `audit_entries.entry_hash`
  causes the verify command to print `BREAK at row N` and refuse all
  subsequent writes for that tenant until `chain.repair.acknowledged`
  is recorded (009 § 2.4).
- The idempotency-key formula (`gwh1:sha256(...)`) is reproducible —
  given the same `(toolName, toolVersion, tenantId, args, actorId)`
  inputs, the harness emits the same key, and a second
  `harness.execute()` call with that key returns
  `outcome: 'replayed'` without invoking the side effect (009 § 4.2).
- Two operators racing the same intent get *different* idempotency
  keys (because `actorId` differs) — verified by an integration test
  exercising the race.
- An `IDEMPOTENCY_MISMATCH` error fires when the same key arrives
  with a different `planId` — verified by an integration test that
  forges a key collision (009 § 4.3).
- Three-mode enforcement is architectural — verified by an
  integration test that proves a tool declaring `read_only` cannot
  reach the write path (009 § 8.1) and a depcruise CI check that
  fails the build if a `servers/**` file imports `clients/**`
  directly (009 § 8.2).
- An evidence bundle exported via `guidewire-harness evidence export
  --trace <id>` is reproducible from the audit chain alone — the
  same trace_id produces the same bundle hash across two runs (009
  § 5.1).
- Per CLAUDE.md hard rule 4 (no audit = no write): an integration
  test that simulates Postgres unreachable during `execute()` proves
  the side effect is NEVER invoked and `AUDIT_UNREACHABLE` surfaces
  to the caller before any Cloud API call goes out (009 § 6 table).

### 8.4 E4 — Customer profile template + cowork fork starter

Acceptance — what a cohort member or carrier-onboarding engineer verifies:

- `profiles/_template/` contains all 9 YAMLs from § 6 (including
  `events.yaml` as the 9th).
- Each YAML round-trips through its Zod schema in `packages/schemas/`
  — boot-time validation rejects a malformed profile and surfaces
  which field failed.
- The OSS demo profile (`profiles/oss-demo/`) loads cleanly and the
  smoke test in E2 runs against it.
- `pnpm guidewire init <domain>` produces a working monorepo in a
  sibling directory: `pnpm install && pnpm -r test` passes from a
  fresh clone of the cohort member's fork.
- The flatbed-mcp worked example (Jeremy's trucking domain) sits in
  the repo as the milestone proof and demonstrates the rename +
  harness inheritance — three stubbed trucking tools, all
  carrier-vocabulary-shaped (now in trucking vocabulary).
- The `audit-harness vocab-lint` from the original repo applies to
  the fork without modification (enforcement travels with the code).
- A cohort member with no Guidewire experience, given the template
  + a 30-minute walkthrough, can get to a green `pnpm -r test` on
  their own fork — acceptance is "the architecture is the lesson,
  the carrier domain is just the example" (per 003-DR-ARCH § Cowork
  integration).

---

## Audit gate

Reviewed in GW-1.8 by:

- `architect-reviewer` (system fit + boundaries + epic dependency soundness)
- `backend-architect` (API contracts, package boundaries)
- `mcp-safety-reviewer` (per-tool blast radius, three-mode design,
  refusal scenarios) — Mode B re-issue of 006-DR-MEMO
- `carrier-vocabulary-curator` (tool-name authenticity) — Mode B
  re-issue of 007-DR-MEMO
- `guidewire-api-archaeologist` (Cloud API mapping correctness) —
  Mode B re-issue of 008-DR-MEMO
- `harness-runtime-architect` (harness contract semantics) — Mode B
  re-issue of 009-DR-MEMO
- `business-analyst` (commercial fit + acceptance-criteria realism)
- `article-consistency-checker` (PRD ↔ Architecture ↔ Roadmap ↔
  Diagram tell the same story)

Audit responses land in
[`./audits/00-AUDIT-RESPONSES.md`](./audits/) once GW-1.9 closes.
