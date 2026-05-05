# 04 — User Journeys

> *End-to-end journeys for the underwriter, claims adjuster, billing
> operator, MGA broker, and the carrier integration engineer — written
> from the operator's chair, not the API console.*

**Filed:** 2026-05-04
**Bead:** `guidewire-318` (under epic `guidewire-7jt` — GH [#2](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/2))
**Inputs:** [`./02-PRD.md`](./02-PRD.md) § 3 / § 4 / § 6,
[`./03-ARCHITECTURE.md`](./03-ARCHITECTURE.md) § 5,
[`../002-DR-CRIT-personas.md`](../002-DR-CRIT-personas.md),
[`../004-DR-DEC-architecture-decisions.md`](../004-DR-DEC-architecture-decisions.md),
[`./audits/00-LIBRARIAN-CITATION-AUDIT.md`](./audits/00-LIBRARIAN-CITATION-AUDIT.md),
[`../005-DR-REF-guidewire-public-resources.md`](../005-DR-REF-guidewire-public-resources.md).
**Status:** authored content (replaces GW-1.1 skeleton).

---

## 0. TL;DR + how to read this doc

The architecture is only useful if the operator can recognize their
day in it. Five journeys anchor the rest of the blueprint: four
carrier-side (PolicyCenter / ClaimCenter / BillingCenter / Producer)
and one toolchain-side (carrier integration onboarding). The
canonical tool names from
[D-016](../004-DR-DEC-architecture-decisions.md#d-016--tool-vocabulary-canonical-names-carrier-vocabulary-curator-renames--adjuster-split)
appear verbatim in every journey; tool catalog and Cloud-API claims
trace back to [02-PRD § 3](./02-PRD.md#3-tools--by-guidewire-suite)
and the librarian KB at
[`../005-DR-REF-guidewire-public-resources.md`](../005-DR-REF-guidewire-public-resources.md).

| Journey | Persona | Epic | Mode |
|---|---|---|---|
| J-1 Underwriter triage | Persona 2 (line UW) | E2 + E5 | read_only → draft_only |
| J-2 Claims summary + reserve check | Persona 8 (Kim) + Persona 3 (claims VP) | E7 | read_only |
| J-3 Billing reconciliation | Persona 5 (CISO oversight) + AR operator | E8 | read_only → approved_execute |
| J-4 Producer book review | Persona 4 (MGA broker) | E9 | read_only |
| J-6 Carrier integration onboarding | (SI engineer) | E10 | n/a (toolchain) |

**How journeys are structured.** Each journey opens with a verbatim
operator quote, names its primary persona, lists modes used, and
declares the profile YAMLs and sandbox preconditions that must be
populated before the journey runs. Then a 3-5 paragraph narrative
written from the operator's voice, a numbered tool-call sequence
(canonical D-016 names; mode per call; Cloud-API endpoint citation
where relevant), an audit + idempotency section that distinguishes
the harness `gwh1:` replay key from the wire `GW-DBTransaction-ID`
header per
[the librarian audit § 3 P1](./audits/00-LIBRARIAN-CITATION-AUDIT.md#p1--idempotency-mechanism-mismatch-f-prd-015--f-api-013--f-ms-006--d),
and 3-5 acceptance bullets the journey must satisfy to be considered
shippable. Cross-journey shared concerns (audit gate, evidence
bundle, vocabulary lint) collect in § 7.

---

## J-1 — Underwriter triage (E2 + E5 demo)

> *"Find the submissions waiting on me, then walk me through them.
> Don't tell me what's in the system; tell me what to do next."*

**Persona:** Persona 2 — line underwriter.
**Epic context:** E2 (read-only catalog, 5-7 tools), with one
draft tool from E5 at the tail.
**Modes used:** `read_only` for the queue + drill-downs;
`draft_only` for the referral note.
**Preconditions:** `auth.yaml` populated with the underwriter's
PolicyCenter scopes + JWT-propagation enabled per Persona 5;
`roles.yaml` mapping `CL_Underwriter` to the read-only PC tools per
[02-PRD § 6.2](./02-PRD.md#62-rolesyaml--role--tool--mode-permission-matrix);
`lob.yaml` declaring at least the carrier's commercial property + GL
rule sets; dev-tier Cloud API endpoints reachable with dev-tier OAuth
credentials per
[D-008](../004-DR-DEC-architecture-decisions.md#d-008--no-mocks--real-guidewire-cloud-sandbox-from-day-1)
+ [D-021](../004-DR-DEC-architecture-decisions.md#d-021--terminology-fix-sandbox-meant-guidewire-isolated-tenant-what-we-actually-need-is-dev-tier-credentials--real-endpoints)
(NO MOCKS — no fixture fall-through).

### Narrative

The line underwriter starts the day on their personal queue.
Submissions land from the producer side, get auto-routed by the
carrier's underwriting rules, and pile up. The agent's value isn't
to translate the underwriter's question into a Postman-shaped API
call; it's to ask the same question the underwriter already asks a
junior analyst. That's the reason
[D-001](../004-DR-DEC-architecture-decisions.md#d-001--carrier-vocabulary-tools-are-the-dominant-abstraction)
codifies carrier-vocabulary tools as the dominant abstraction.

The underwriter opens the agent and types *"find submissions waiting
on me."* The agent calls the literal-named tool and returns a sorted
top-N list with stake (premium, LOB, producer, days since referral).
The underwriter eyeballs the top three and asks *"what's our
appetite on this risk?"* — sometimes the answer is a clean fit,
sometimes the agent surfaces the structured refusal
`profile_incomplete_for_this_carrier` because the UWCenter rule
shapes for that LOB haven't resolved in the customer profile yet
(the ⚠ banner on this tool surfaces *as* the refusal per
[02-PRD § 3.1.1](./02-PRD.md#311-line-underwriter-view-e2--e5)).

When a submission needs to escalate, the underwriter asks the agent
to draft the referral note. `draft-referral-note` runs in
`draft_only` mode — the harness composes a draft with reason codes
from the read-side, hashes the draft body for the audit row (never
plaintext per Persona 5), and returns a `draft-id`. **The agent
never files the referral.** The human reads the draft in the
existing PC UI — physical separation between drafting and doing per
[D-005](../004-DR-DEC-architecture-decisions.md#d-005--three-execution-modes-per-tool)
+ 006 § 2.4. Filing is a different tool in a different mode that
takes the draft-id as input — Persona 8's "show me exactly where the
agent draws the line" is satisfied by the *file system*, not a
config flag.

### Tool call sequence

1. **`find-submissions-waiting-on-me`** — `read_only`. Personal
   queue sorted by stake.
   `GET /job/v1/jobs?subtype=Submission&assignedToMe=true&status=Open`
   per [02-PRD § 3.1.1](./02-PRD.md#311-line-underwriter-view-e2--e5);
   query params practitioner knowledge per
   [librarian F-PRD-001](./audits/00-LIBRARIAN-CITATION-AUDIT.md#21-02-prdmd).
2. **`whats-our-appetite-on-this-risk`** — `read_only` (⚠ slipped
   E2→E5). Composite read across `/policy/v1/policies` +
   `/admin/v1/users/{id}/permissions` + UWCenter rule entity. If
   profile missing rule shape, harness returns structured
   `profile_incomplete_for_this_carrier` refusal (not exception).
3. **`show-policies-for-this-insured`** — `read_only`. Cross-LOB
   rollup; `GET /account/v1/accounts/{id}/policies` +
   `/policy/v1/policies?accountId=...` per
   [librarian F-PRD-002](./audits/00-LIBRARIAN-CITATION-AUDIT.md#21-02-prdmd).
4. **`summarize-this-submission`** — `read_only`. Job + Composite
   read; one-screen pitch (insured, LOB, premium, exposures,
   contact roles). Composite API AUTHORITATIVE in PC 202503.
5. **`did-we-lose-this-account`** — `read_only` (optional).
   Cancellation / non-renewal history with reason codes.
   `CancellationReason` is the typelist-drift case
   ([librarian F-PRD-004](./audits/00-LIBRARIAN-CITATION-AUDIT.md#21-02-prdmd)).
6. **`draft-referral-note`** — `draft_only` (E5). Composes the
   referral in-process; read-side endpoints only. Returns
   `{ draftId, hashSummary }`.

### Audit + idempotency

Every step writes a read-side audit row per
[02-PRD § 4.1](./02-PRD.md#41-mode-comparison) + 006 § 1.1
(Persona 5's exfil concern is the reason `read_only` audits exist).
Schema: `trace_id`, `tenant_id`, `tool_name`, `mode`, `actor_id`,
`decision`, `decision_reason`, `pii_redacted`, `latency_ms`,
`result_count`. Bodies are never logged. The `draft-referral-note`
step adds a `hash_summary` of the draft body — never plaintext.
No `GW-DBTransaction-ID` and no `gwh1:` key fire here — the
journey never crosses the write boundary. That contrast is what
makes J-3 real.

### Acceptance criteria

- All six tools above appear in the `policycenter-mcp` manifest with
  the canonical D-016 names; no API-verb leaks
  (`pnpm exec audit-harness vocab-lint` returns 0).
- A clean clone of the repo runs the J-1 sandbox recording
  end-to-end against the OSS demo profile per
  [02-PRD § 6.10](./02-PRD.md#610-oss-demo-profile).
- The two ⚠ tools surface the
  `profile_incomplete_for_this_carrier` refusal against a
  stripped-down profile with no UWCenter rule entity declared.
- Every step's audit row is reproducible from the trace-id; the
  evidence bundle exporter materializes the journey as JSON.
- `draft-referral-note` returns a draft-id; calling any
  `approved_execute` filing tool with that draft-id is a different
  tool name in a different manifest entry — verified by inspecting
  the manifest, not by config.

---

## J-2 — Claims summary + reserve check (E7)

> *"Summarize this loss and tell me if our reserves look right.
> Don't make me click through six tabs."*

**Persona:** Persona 8 (Kim from claims) on the operator side;
Persona 3 (claims VP) is the budget-holder behind the use case.
**Epic context:** E7 (`claimcenter-mcp`).
**Modes used:** `read_only` throughout; `draft_only` for the
optional denial-letter draft, which is *disabled by default* in
the OSS demo profile per
[02-PRD § 4.3](./02-PRD.md#43-oss-demo-profile-defaults-per-006--9-recommendation-3)
+ 006 § 6.3.
**Preconditions:** `auth.yaml` with ClaimCenter scopes;
`pii-policy.yaml` declaring `Claim.lossDescription` and
`Claim.notes[*].body` as `high_pii` (handling: `redact_in_summaries`)
per [02-PRD § 6.8](./02-PRD.md#68-pii-policyyaml--pii-redaction-rules);
`custom-entities.yaml` declaring `LeakageRiskScore` if the carrier
uses it (otherwise the leakage tool surfaces the ⚠ banner);
sandbox tenant reachable.

### Narrative

Kim works claims. She doesn't trust agents — they make stuff up,
they cite policies that don't exist. Her opening question to any
agent rollout is: *"show me exactly where the agent draws the line
between drafting and doing."* J-2 is where she verifies the
read-only path is read-only, full stop.

She picks up a claim sitting open for nine days and asks
*"summarize this loss."* `summarize-this-loss` is **not** a Graph
API call — ClaimCenter does not expose a Graph API module per
[librarian P2](./audits/00-LIBRARIAN-CITATION-AUDIT.md#p2--graph-api-not-present-in-claimcenter-f-prd-007--f-api-014--d).
CC 202411 offers Composite API for multi-resource one-shots, and
that is what the tool uses — a single Composite request that reads
the claim, exposures, reserves, activities, documents, and notes in
one round trip. The harness applies `pii-policy.yaml` redaction at
response time before the agent sees the body.

Kim asks *"what's the reserve picture?"* — `whats-the-reserve-picture`
returns the Money-typed reserve and exposure breakdown
(`{ amount: string, currency: string }` per
[02-PRD § 6.6](./02-PRD.md#66-field-aliasesyaml--guidewire-field-name--carrier-vocabulary-term)
+ 008 § 11). If numbers look off, she asks
`show-activity-on-this-claim` — the D-016 adjuster path. That's
distinct from `find-events-for-claim`, the integration-engineer
path: same data, different question, different presentation. The
D-016 vocabulary distinction is structural, not cosmetic.

If facts support it, the optional `draft-denial-letter` composes a
denial-letter draft in `draft_only` mode. Smart Comms is **never**
rendered through — the draft is composed in-process, hash-summarized
in audit (never plaintext per Persona 5), and the tool returns a
draft-id. Default-disabled in OSS demo per 006 § 6.3. Promotion to
a filed letter is a different tool in `approved_execute` that takes
the draft-id as input — the same physical-separation property J-1
uses for referrals.

### Tool call sequence

1. **`find-claims-at-risk-of-leakage`** — `read_only`. Optional
   warmup. Filters by `LeakageRiskScore` (custom entity, profile-
   supplied path per
   [02-PRD § 6.5](./02-PRD.md#65-custom-entitiesyaml--custom-entity--tool-input-mappings)).
   Surfaces the ⚠ banner if `custom-entities.yaml` is unset.
2. **`summarize-this-loss`** — `read_only`. **CC Composite API**,
   NOT Graph API. CC 202411 apiref modules: Admin, Async, Claim,
   Common, **Composite**, System Tools — Graph API absent per
   [librarian P2](./audits/00-LIBRARIAN-CITATION-AUDIT.md#p2--graph-api-not-present-in-claimcenter-f-prd-007--f-api-014--d).
   Composite request expands exposures, reserves, activities,
   documents, notes in one round trip; PII redaction at response.
3. **`whats-the-reserve-picture`** — `read_only`.
   `GET /claim/v1/claims/{claimId}/reserves` and `/exposures` per
   [librarian F-PRD-008](./audits/00-LIBRARIAN-CITATION-AUDIT.md#21-02-prdmd).
   Money typing end-to-end; `amount` is string per 008 § 11.
4. **`show-activity-on-this-claim`** — `read_only`. NEW per D-016
   adjuster path. Reads from the harness internal events store
   (not a Cloud API call) keyed by `primaryObject.id` per App
   Events safe-ordering
   ([librarian F-API-006](./audits/00-LIBRARIAN-CITATION-AUDIT.md#24-008-dr-memo-guidewire-apimd)).
5. **`pull-this-claim`** — `read_only`. Single-claim deep-read leaf
   (`GET /claim/v1/claims/{id}`).
6. **`draft-denial-letter`** — `draft_only` (default-disabled in
   OSS demo per 006 § 6.3). Read-side only; draft composed in-
   process. Returns draft-id + hash-summary. Promotion to a filed
   letter is a different tool in `approved_execute` (deferred).

### Audit + idempotency

Every read writes a read-side audit row. PII handling is load-
bearing: redaction lives in `packages/harness/redaction/` per
006 § 7.5 + 02-PRD § 6.8 — tools declare redactable fields in
their Zod schema; the harness applies profile rules at response
time. Tools never call the redactor directly.

The draft step writes the draft body's hash to audit, never
plaintext. No `GW-DBTransaction-ID` or `gwh1:` key fires here —
the journey is pure read + draft, no `harness.execute()` call. If
the future `approved_execute` letter-filing tool ships, it would
derive a fresh `gwh1:` key per
[02-PRD § 5.4](./02-PRD.md#54-execute--side-effect-with-idempotency)
and inject `GW-DBTransaction-ID` per librarian P1.

### Acceptance criteria

- `summarize-this-loss` is implemented against CC Composite API
  (NOT Graph API); the implementation references the CC 202411
  apiref URL in `packages/guidewire-client/`.
- PII redaction provably runs at response time — verified by an
  integration test that asserts `Claim.lossDescription` is
  redacted in the agent-visible response when `pii-policy.yaml`
  declares it `high_pii` with `redact_in_summaries`.
- `show-activity-on-this-claim` exists in the manifest as the
  D-016 adjuster path, separate from `find-events-for-claim`
  (integration-engineer path).
- `draft-denial-letter` is default-disabled in `profiles/oss-demo/`;
  the OSS demo smoke run does not exercise the draft path.
- Every step's audit row contains `result_count` and `pii_redacted`
  flags; bodies and draft plaintext never appear in the audit
  table — verified by post-run inspection.

---

## J-3 — Billing reconciliation (E8)

> *"A payment came in. It's sitting on the wrong account. Move it
> to the right one. And if you can't do it cleanly, refuse — don't
> make me clean up after the agent."*

**Persona:** Billing operator + Persona 5 (CISO / compliance
oversight). Persona 5 is the ultimate auditor of this journey.
**Epic context:** E8 (`billingcenter-mcp`).
**Modes used:** `read_only` (the wide-aperture-then-drill discovery
loop) → `approved_execute` (the canonical canary tool). This is
**the** canonical `approved_execute` journey for the entire
project.
**Preconditions:** `auth.yaml` with BC scopes (separate from
PolicyCenter and ClaimCenter); `approval-matrix.yaml` populated
per [02-PRD § 6.7](./02-PRD.md#67-approval-matrixyaml--write-actions--required-approver-tier)
with amount-tier conditions for `reconcile-this-payment`; the
operator's profile must explicitly opt in to `approved_execute`
mode (default-disabled in OSS demo per
[02-PRD § 4.3](./02-PRD.md#43-oss-demo-profile-defaults-per-006--9-recommendation-3));
hash-chained Postgres audit store reachable per
[D-006](../004-DR-DEC-architecture-decisions.md#d-006--hard-rule-no-audit--no-write).

### Narrative

This is where the harness earns its keep. Persona 5 reads the audit
chain on Monday morning and either trusts the platform or kills the
pilot. Persona 8 reads the same chain and either lets the agent
near the system or doesn't. The journey opens wide and drills
narrow — typical AR operator pattern.

The operator opens with *"show me overdue accounts for Acme
Brokerage."* `show-overdue-accounts` filters by producer code.
`GET /billing/v1/accounts?delinquencyStatus=...&producerCode=...` —
the base path is AUTHORITATIVE per the BC accounts querying page in
the IS Consumer Guide
([librarian F-PRD-009](./audits/00-LIBRARIAN-CITATION-AUDIT.md#21-02-prdmd)).
The operator picks an account and asks *"where are we on this
payment?"* — canonical D-016 `where-are-we-on-this-payment`. The
agent returns the invoice + payment chain. The operator notices the
payment is sitting on Account A but belongs on Account B — a
misallocation, fixable by reconciliation.

The operator widens the lens with *"what's going on with this
account?"* — canonical D-016 `whats-going-on-with-this-account`.
Scope is account-level, not policy-level — that's how AR speaks.
Cross-suite lookup pulls policy + account + invoice + delinquency
status into one view.

Now the write. *"Reconcile that payment to Account B."* The agent
calls `reconcile-this-payment` in `approved_execute` mode. The
harness fires the full plan → policy → approval → execute → audit
chain (see
[03-ARCHITECTURE § 5.3](./03-ARCHITECTURE.md#53-approved_execute--gated-write-with-idempotency)
for the layered call diagram). The boundary is sharp:
`reconcile-this-payment` is `approved_execute` because it mutates
BillingCenter ledger state (payment→account assignment), has a
known final state, and is reversible by another reconcile call. It
does **NOT** cross a banking integration boundary — no ACH, no card
capture, no wire — per
[D-018](../004-DR-DEC-architecture-decisions.md#d-018--reconcile-payment-vs-money-movement-boundary-sharpened-pre-audit).
Money movement lives in a future `payments-mcp` with dual-control.
CISO can sign off on this carve precisely because the boundary is
named, not implied.

### Tool call sequence

1. **`show-overdue-accounts`** — `read_only`.
   `GET /billing/v1/accounts?delinquencyStatus=...&producerCode=...`
   — base path AUTHORITATIVE per
   [BC accounts querying](https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/BillingCenter/billing/accounts/c_querying_for_accounts.html);
   query params practitioner knowledge.
2. **`where-are-we-on-this-payment`** — `read_only`. Canonical
   D-016 (was `whats-the-payment-status`).
   `GET /billing/v1/accounts/{id}/invoices` + `/payments` — base
   AUTHORITATIVE
   ([librarian F-PRD-010](./audits/00-LIBRARIAN-CITATION-AUDIT.md#21-02-prdmd)).
3. **`whats-going-on-with-this-account`** — `read_only`. Canonical
   D-016 (was `find-billing-issues-for-this-policy`). Cross-suite:
   `GET /policy/v1/policies/{id}` →
   `GET /billing/v1/accounts/{accountId}/...`.
4. **`reconcile-this-payment`** — `approved_execute` (canonical
   canary per
   [D-018](../004-DR-DEC-architecture-decisions.md#d-018--reconcile-payment-vs-money-movement-boundary-sharpened-pre-audit)
   + 006 § 3.4). Read first (payment + invoice). Then
   `harness.plan()` → `policy.evaluate()` against
   `approval-matrix.yaml`. If amount tier ≥ T2,
   `outcome: 'require_approval'` and `approvals.wait()` blocks
   until the human approves via CLI
   (`guidewire-harness approve <approvalId>`) or in-process. On
   `approved`, `harness.execute()` invokes
   `POST /billing/v1/payments/{paymentId}/applications` (Async per
   BC Billing API; sub-path practitioner knowledge per
   [librarian F-PRD-011](./audits/00-LIBRARIAN-CITATION-AUDIT.md#21-02-prdmd)).

### Audit + idempotency

This is the journey where the two-key story matters. **Two
distinct keys, two distinct purposes**, per librarian P1:

- **Harness `gwh1:` key** (client-side):
  `gwh1:sha256(toolName + ':' + toolVersion + ':' + tenantId + ':'
  + canonicalize(args) + ':' + actorId)` per
  [02-PRD § 5.4](./02-PRD.md#54-execute--side-effect-with-idempotency)
  + 009 § 4.1. On replay (same key in the harness's Postgres
  `idempotency_keys` table), the harness short-circuits, returns
  the prior value, writes `execute.replayed`, and **never invokes
  the side effect**. Two operators racing get different keys
  (`actorId` differs); a release boundary does not replay
  (`toolVersion` differs).
- **Guidewire `GW-DBTransaction-ID`** (server-side, wire):
  derived from `idempotencyKey`, injected by
  `packages/guidewire-client/` on every write. Per
  [the IS Consumer Guide](https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/Basic-REST-operations/request-headers/c_preventing-duplicate-database-transactions.html),
  duplicates **fail** with `AlreadyExecutedException` — they do
  NOT replay. Complementary safety net to `gwh1:`, not the same.

Failure modes per
[02-PRD § 4.1](./02-PRD.md#41-mode-comparison) + 009 § 6:
`idempotency_collision` (harness short-circuit);
`IDEMPOTENCY_MISMATCH` (same key, different `planId` — canonical-
ization bug); `approval_timeout`; `policy_violation_amount_tier`;
`evidence_bundle_export_failed_with_rollback` (rollback + refuse
atomically); `chain_broken` (refuse all tenant writes until
`chain.repair.acknowledged` per 009 § 2.4). Audit entries are
hash-chained per-tenant (linear, not Merkle).

The evidence bundle exporter materializes the entire journey from
the trace_id alone per
[02-PRD § 5.7](./02-PRD.md#57-evidence-bundle) — what Persona 5
hands the SOC 2 auditor.

### Acceptance criteria

- All four tools use canonical D-016 names in the manifest.
- `reconcile-this-payment` runs read → plan → policy → approval →
  execute → audit in order; a Postgres-unreachable simulation
  refuses the write before any Cloud API call goes out (the
  [D-006](../004-DR-DEC-architecture-decisions.md#d-006--hard-rule-no-audit--no-write)
  guarantee).
- The Cloud API write carries `GW-DBTransaction-ID` — verified by
  replaying the recording and inspecting the request header.
- Same `(args, actorId)` replayed against the harness returns
  `outcome: 'replayed'` without invoking the side effect.
- Evidence bundle is byte-reproducible across two runs with the
  same trace_id (009 § 5.1).
- No money-movement code path exercised (no ACH, card, wire); the
  [D-018](../004-DR-DEC-architecture-decisions.md#d-018--reconcile-payment-vs-money-movement-boundary-sharpened-pre-audit)
  carve is enforced by manifest absence — `payments-mcp` is not in
  `servers/`.

---

## J-4 — Producer book review (E9)

> *"Show me my book. Then tell me what I'm being paid on it. Then
> tell me what I lost."*

**Persona:** Persona 4 — MGA broker / producer.
**Epic context:** E9 (`producer-mcp`).
**Modes used:** `read_only` throughout. Producer-scoped reads only;
no write surface in the OSS demo path.
**Preconditions:** `auth.yaml` with the producer's scoped
credentials — JWT propagation enforces producer-scope at every
read, per Persona 5; `roles.yaml` declaring the producer-tier role
with NO cross-broker visibility (cross-broker leakage is a hard
refusal at the harness gate per 006 § 4.2, not an empty-result
silent fall-through); `lob.yaml` declaring the carrier classes
the producer is appointed for; `field-aliases.yaml` declaring
`Producer.code` mapping (producer-code uniqueness model varies per
carrier — CRITICAL profile dependency per
[02-PRD § 3.4](./02-PRD.md#34-producer-mcp--producer-hierarchy-across-suites-e9)).

### Narrative

Persona 4's v3 complaint was "your tools serve the carrier; am I
the second-class citizen who gets a producer-portal scrap?" v4
answers with density — eight `producer-mcp` tools, not three (per
007 § 4.5 + 07-ROADMAP § E9). The producer journey is read-heavy:
book, commission, pending quotes, loss ratio, retention. The
producer doesn't write to the carrier's system, which is why
`producer-mcp`'s OSS demo path is `read_only`-only.

The producer opens with *"show my book of business for Q2."*
`show-my-book-of-business` is scoped by the producer's own code
from the JWT. `roles.yaml` enforces producer scope per 008 § 4.2
— the producer cannot see another producer's book. This is not
"empty results"; it's a hard `tenant_mismatch` refusal (006 § 1.2)
if the agent tries to spoof another producer code. Persona 5
cares specifically: cross-broker leakage at the read layer is a
SOC 2 finding waiting to happen.

The producer follows with *"what's my commission status?"* —
`whats-my-commission-status`. **The endpoint is
`/admin/v1/commission-plans`, NOT `/billing/v1/commission*`** per
[librarian P3](./audits/00-LIBRARIAN-CITATION-AUDIT.md#p3--billing-commission-endpoint-path-wrong-f-prd-012--d).
The librarian audit corrected the PRD draft after verifying the
[BC commission plans page](https://docs.guidewire.com/cloud/is/202603/cloudapibf/cloudAPI/BillingCenter/plans/commission-plans/c_working-with-commission-plans.html).
Auth-scope implication: commission queries require **admin-scope
OAuth**, not billing-scope. `auth.yaml` must declare admin scope
explicitly for any producer running this tool.

The producer then drills: `find-my-pending-quotes`,
`whats-my-loss-ratio-by-class` (survival metric for a producer
relationship), `whats-my-bind-ratio`, `whats-my-retention`,
`which-accounts-did-i-lose-this-year` (producer-side mirror of
`did-we-lose-this-account` with `CancellationReason` drift). The
closer is `which-carriers-have-appetite-for-this-class` — flips
the line-UW question to the producer side, scoped to the
producer's appointed-carrier list. This is the density tool
Persona 4 specifically asked for.

### Tool call sequence

1. **`show-my-book-of-business`** — `read_only`.
   `GET /policy/v1/policies?producerCode={code}` +
   `GET /account/v1/accounts?producerCode={code}` (PC 202503).
   Scoped by producer code derived from JWT.
2. **`whats-my-commission-status`** — `read_only`.
   **`GET /admin/v1/commission-plans`** (NOT
   `/billing/v1/commission*` — corrected per
   [librarian P3](./audits/00-LIBRARIAN-CITATION-AUDIT.md#p3--billing-commission-endpoint-path-wrong-f-prd-012--d)).
   Sub-paths: `/admin/v1/commission-plans/{commissionPlanId}` and
   `/admin/v1/commission-plans/{commissionPlanId}/commission-sub-plans`.
   Auth scope: **admin**, not billing.
3. **`find-my-pending-quotes`** — `read_only`.
   `GET /job/v1/jobs?subtype=Submission&status=Quoted&producerCode={code}`.
4. **`whats-my-loss-ratio-by-class`** — `read_only`. Aggregate of
   `GET /claim/v1/claims?producerCode=...` (numerator) and
   `GET /policy/v1/policies?producerCode=...` (premium denominator).
5. **`whats-my-bind-ratio`** — `read_only`.
   `GET /job/v1/jobs?subtype=Submission&producerCode=...` aggregated
   by status.
6. **`whats-my-retention`** — `read_only`. Aggregate of
   `GET /policy/v1/policies?producerCode=...&status=Renewed,NonRenewed,Lapsed`.
7. **`which-accounts-did-i-lose-this-year`** — `read_only`.
   `GET /policy/v1/policies?producerCode=...&status=Lost,NonRenewed`
   + transactions. `CancellationReason` typelist drift exposed.
8. **`which-carriers-have-appetite-for-this-class`** — `read_only`.
   Composite of `whats-our-appetite-on-this-risk`-shaped reads
   scoped to the producer's appointment authority.

### Audit + idempotency

Every tool writes a read-side audit entry. The `actor_id` claim
from the producer's JWT is what makes the producer scope physical
— the `roles.yaml` validator rejects boot if the producer-tier
role has any tool whose endpoint is not producer-code-scopable.
No `gwh1:` key, no `GW-DBTransaction-ID` — pure read journey.

The cross-broker leakage refusal is the load-bearing audit case.
If the agent attempts `show-my-book-of-business` with a producer
code that does not match the JWT's claim, the harness returns a
structured refusal `tenant_mismatch` (006 § 1.2) and writes the
attempt to the audit chain. Persona 5 reviews these audit entries
on Monday morning. A tampered chain in producer A's tenant doesn't
invalidate producer B's chain — per-tenant isolation is the
[009 § 2.1](../009-DR-MEMO-harness-runtime.md) hash-chain
property.

### Acceptance criteria

- `whats-my-commission-status` is implemented against
  `/admin/v1/commission-plans` (NOT `/billing/v1/commission*`);
  the implementation cites the IS Consumer Guide commission-plans
  URL.
- `auth.yaml` for the producer profile declares admin-scope OAuth,
  not just billing-scope — verified by inspecting the
  scope-required field per tool in the manifest.
- All eight tools above appear in the `producer-mcp` manifest;
  none have API-verb names; vocab-lint passes.
- An integration test attempts cross-broker access (producer A
  spoofs producer B's code) and verifies the harness returns a
  structured `tenant_mismatch` refusal AND writes the attempt to
  the audit chain.
- The OSS demo profile for the producer path runs `read_only`
  only; no `approved_execute` writes are exercised.

---

## J-6 — Carrier integration onboarding (E10)

> *"My company is Acme Insurance. I have a Guidewire estate. I want
> to know what it takes to plug this MCP into us. Walk me through
> it without telling me to file a ticket."*

**Persona:** SI engineer at a Guidewire SI partner (Persona 6 in
the red team) onboarding a new carrier customer. Could equally be
a carrier-side integration engineer.
**Epic context:** E10 (`pnpm gw onboard <customer>`).
**Modes used:** n/a — this is the carrier-onboarding journey. The
output is a populated `profiles/<customer>/` directory that the
suite MCPs will run against.
**Preconditions:** Carrier has tenant access (per
[D-008](../004-DR-DEC-architecture-decisions.md#d-008--no-mocks--real-guidewire-cloud-sandbox-from-day-1)
+ [D-021](../004-DR-DEC-architecture-decisions.md#d-021--terminology-fix-sandbox-meant-guidewire-isolated-tenant-what-we-actually-need-is-dev-tier-credentials--real-endpoints)
NO MOCKS — fixture-only flows are forbidden). Tenant access can be
the carrier's own production tenant credentials, OR — for partners
without their own tenant — the **Guidewire PartnerConnect sandbox**
(Palisades release, same-day partner onboarding per
[`005-DR-REF § 5`](../005-DR-REF-guidewire-public-resources.md#5-marketplace--partner-program-sandbox-path-lives-here)).
SOPS+age secrets posture set up per IS standard; the SI engineer
has `guidewire-mcp-for-claude` cloned locally. The tenant's
**Swagger UI at `<applicationURL>/resources/swagger-ui/`** is the
authoritative source for tenant-specific endpoint shapes (custom
entity paths, extended typelists) — onboarding step 0 is to bookmark
it and capture the relevant endpoint specs.

### Narrative

The SI engineer runs `pnpm gw onboard acme-insurance`. The CLI
walks them through the nine YAMLs from
[02-PRD § 6](./02-PRD.md#6-customer-profile-contract). At each
step the CLI prompts for the input it needs and round-trips the
result through the Zod schema in `packages/schemas/` — the profile
fails to validate at boot, *not* at first call, if any field is
malformed.

Step by step:

1. **`auth.yaml`** — Acme's Guidewire Hub OAuth client ID + secret
   (loaded from SOPS, never raw), token endpoint, scopes, JWKS URI.
   Per [02-PRD § 6.1](./02-PRD.md#61-authyaml--guidewire-hub-oauth--jwt-propagation)
   + [librarian P6](./audits/00-LIBRARIAN-CITATION-AUDIT.md#p6--hub-oauth--auth-model-f-prd-016--f-api-012--c):
   token endpoint, scopes catalog, and JWKS URI are
   **tenant-specific** — they resolve from the customer's Hub OIDC
   discovery document at onboarding time. The CLI surfaces this
   — `auth.yaml` cannot be finalized until the SI engineer has the
   OIDC discovery document from Acme's Hub tenant. (Generic
   reachability against the public Cloud API is covered separately
   by the `smoke-reach.ts` job in [07-ROADMAP § E1](../blueprint/07-ROADMAP.md#e1--foundation)
   per [D-021](../004-DR-DEC-architecture-decisions.md#d-021--terminology-fix-sandbox-meant-guidewire-isolated-tenant-what-we-actually-need-is-dev-tier-credentials--real-endpoints).)
2. **`roles.yaml`** — Acme's role hierarchy mapped to the
   role × tool × mode matrix. CLI validates every referenced tool
   exists in the corresponding server's manifest (boot-time fail-
   fast per
   [02-PRD § 6.2](./02-PRD.md#62-rolesyaml--role--tool--mode-permission-matrix)).
3. **`lob.yaml`** — per-LOB code dictionaries (`uwcenter_rule_set`,
   `coverage_typelist`). Acme has 47 LOB-specific coverage
   extensions (Persona 1's complaint).
4. **`typelists.yaml`** — base vs customer_extended typelists per
   [02-PRD § 6.4](./02-PRD.md#64-typelistsyaml--typelist-value-mappings).
   `LossCause` is the drift case
   ([librarian F-PRD-020](./audits/00-LIBRARIAN-CITATION-AUDIT.md#21-02-prdmd)).
5. **`custom-entities.yaml`** — Acme's custom entities (e.g.
   `LeakageRiskScore`) with `parent_entity`, `relation`,
   required/optional fields, `api_path` from Acme's per-tenant
   Swagger (not public).
6. **`field-aliases.yaml`** — Guidewire field name → carrier
   vocabulary, including `money_fields` + `date_fields` per
   [02-PRD § 6.6](./02-PRD.md#66-field-aliasesyaml--guidewire-field-name--carrier-vocabulary-term).
   Money typing non-negotiable: `{ amount: string, currency: string }`;
   date vs datetime is a silent footgun.
7. **`approval-matrix.yaml`** — write actions → approver tier per
   amount band. CLI validates every `approver_tier` exists in
   `roles.yaml`.
8. **`pii-policy.yaml`** — PII redaction rules. SI engineer
   declares `Claim.lossDescription` as `high_pii`,
   `Account.namedInsured` as `medium_pii` with allowed roles, etc.
   Health-LOB carriers flip `baa_required: true` and the tool
   catalog filters to BAA-cleared tools only per 006 § 6.2.
9. **`events.yaml`** — App Events subscription configuration per
   [02-PRD § 6.9](./02-PRD.md#69-eventsyaml--app-events-subscription-configuration-the-9th).
   `delivery.shard_by` MUST equal `primaryObject.id` (CI failure
   otherwise — safe-ordering guarantee per
   [librarian F-API-006](./audits/00-LIBRARIAN-CITATION-AUDIT.md#24-008-dr-memo-guidewire-apimd)).

After the nine YAMLs land, the CLI runs `pnpm -r test` against
Acme's sandbox recordings — and **only sandbox recordings**, never
fixtures. The CLI emits a security-review checklist: profile
completeness, scope inventory, BAA state, hash-chain init, SOPS
recipient list, producer-code uniqueness model. The SI engineer
hands this to Acme's CISO before the agent runs in production.

### Tool call sequence (the toolchain side)

1. **`pnpm gw onboard acme-insurance`** — kicks off the wizard.
2. Per-YAML prompt + Zod-validate cycle, nine times.
3. **`pnpm exec audit-harness verify`** — confirms hash-pinned
   policies still match.
4. **`pnpm -r test`** — runs Acme's contract tests against their
   sandbox recordings.
5. **CLI emits `acme-insurance-security-checklist.md`** — the
   audit handoff to Acme's CISO.

### Audit + idempotency

The onboarding journey doesn't itself emit harness audit entries
— it's a profile-authoring tool, not a runtime path. But the
*output* of the journey is what makes every subsequent runtime
journey auditable: the `roles.yaml` is the actor-scoping source;
the `pii-policy.yaml` drives the redaction pipeline; the
`approval-matrix.yaml` drives the policy gate; the `events.yaml`
drives the events-receiver shard. If any of the nine YAMLs is
malformed, the suite MCPs fail to boot — boot-time fail-fast is
the [D-007](../004-DR-DEC-architecture-decisions.md#d-007--customer-config-is-profiles-not-adapterscustomers)
discipline.

### Acceptance criteria

- `pnpm gw onboard <customer>` produces a complete
  `profiles/<customer>/` directory with all nine YAMLs.
- Each YAML round-trips through its Zod schema in
  `packages/schemas/` — boot-time validation rejects a malformed
  profile and surfaces which field failed.
- The CLI surfaces the librarian P6 sandbox-blocked status on
  `auth.yaml` (`token_endpoint` + scopes catalog + JWKS URI cannot
  be finalized until `guidewire-adj` closes).
- `events.yaml`'s `delivery.shard_by` validation rejects any value
  other than `primaryObject.id`.
- The security-review checklist is emitted as a file the SI
  engineer can hand to the carrier's CISO without further editing.
- The journey runs end-to-end against Jeremy's sandbox once
  `guidewire-adj` lands; no portion runs against fixtures (NO
  MOCKS).

---

## 7. Cross-journey acceptance + audit gate

Six journeys, one set of cross-cutting properties. The journeys are
"shippable" only if **all** of the following hold:

1. **Tool names follow D-016 verbatim.** No journey uses
   `propose-endorsement`, `whats-the-payment-status`,
   `find-billing-issues-for-this-policy`, `replay-event`, or any
   other pre-D-016 form. The `carrier-vocabulary-curator` lane in
   GW-1.8 enforces; `audit-harness vocab-lint` runs on every PR.
2. **Every step is audited.** `read_only` writes a read-side row;
   `draft_only` writes a hash-summary; `approved_execute` writes
   the full plan/policy/approval/execute chain to a per-tenant
   linear hash chain in Postgres. Depcruise + AST call-site rules
   per
   [02-PRD § 5.9](./02-PRD.md#59-three-mode-enforcement-at-the-harness-layer)
   make the gate architectural.
3. **Three-mode distinction is observable, not policy.** `read_only`
   and `draft_only` cannot reach the write path — the harness
   physically refuses. `approved_execute` cannot run without a
   `PolicyDecision` whose outcome is `allow` or `require_approval`
   (paired with an `Approval`).
4. **Evidence bundles are exportable.** Any trace_id produces a
   deterministic JSON bundle per
   [02-PRD § 5.7](./02-PRD.md#57-evidence-bundle) — Plan,
   PolicyDecision, Approval, ExecuteResult, audit entries, chain
   verification, OTel spans, redaction flag. SOC-2 handoff-ready.
5. **Sandbox recordings exist for end-to-end runs.** No `fixtures/`
   directory in the repo, ever
   ([D-008](../004-DR-DEC-architecture-decisions.md#d-008--no-mocks--real-guidewire-cloud-sandbox-from-day-1)).
   `tests/recordings/MANIFEST.md` lists every recording with
   provenance. End-to-end runs are gated on `guidewire-adj`.
6. **LOB mapping validates at boot.** Boot-time fail-fast per
   [D-007](../004-DR-DEC-architecture-decisions.md#d-007--customer-config-is-profiles-not-adapterscustomers).
7. **For `approved_execute`: `GW-DBTransaction-ID` is on the wire;
   `gwh1:` drives client-side replay.** Per
   [librarian P1](./audits/00-LIBRARIAN-CITATION-AUDIT.md#p1--idempotency-mechanism-mismatch-f-prd-015--f-api-013--f-ms-006--d).
   The Postgres `idempotency_keys` table short-circuits on `gwh1:`
   match (returns prior result, never invokes side effect). The
   wire `GW-DBTransaction-ID` is Guidewire's server-side
   duplicate-prevention — duplicates **fail** with
   `AlreadyExecutedException`, they do NOT replay. In steady state
   the wire collision should never fire (the harness short-
   circuits first); if it does, that's a harness-bypass detection
   signal.

### Audit gate (who reviews this doc)

Per the GW-1.8 staffed-audit panel:

- **`business-analyst`** — journey realism. Would a real line UW,
  Kim, AR operator, MGA broker, or SI engineer
  recognize their day here?
- **`carrier-vocabulary-curator`** (Mode B) — operator-language
  fidelity. D-016 names verbatim. No `propose-endorsement`
  regression. Adjuster vs integration-engineer split
  (`show-activity-on-this-claim` vs `find-events-for-claim`)
  preserved.
- **`mcp-safety-reviewer`** (Mode B) — per-step blast radius. Does
  every `approved_execute` step name a refusal scenario? Does J-2
  honor `draft-denial-letter` default-disabled? Does J-3 honor the
  D-018 no-banking-integration carve?
- **`guidewire-api-archaeologist`** (Mode B) — Cloud API
  correctness post-librarian P1/P2/P3. Is `summarize-this-loss`
  using CC Composite API (not Graph)? Is
  `whats-my-commission-status` hitting `/admin/v1/commission-plans`
  (not `/billing/v1/commission*`)? Is `GW-DBTransaction-ID` named
  on the wire?
- **`article-consistency-checker`** — cross-doc. Tool names match
  [02-PRD § 3](./02-PRD.md#3-tools--by-guidewire-suite); modes
  match [02-PRD § 4](./02-PRD.md#4-three-execution-modes--full-contract);
  call flows match
  [03-ARCHITECTURE § 5](./03-ARCHITECTURE.md#5-three-execution-modes--architectural-flow);
  personas match [`002-DR-CRIT`](../002-DR-CRIT-personas.md).

Audit responses land in `000-docs/blueprint/audits/00-AUDIT-RESPONSES.md`
when GW-1.9 closes. E1 does not begin until all FAILs in this
doc's lane are resolved or accepted.
