# 006-DR-MEMO — MCP Safety Review (Phase 0 Day 3 design memo)

**Filed:** 2026-05-04
**Author:** `mcp-safety-reviewer` (project-scoped specialist agent)
**Bead:** `guidewire-mgn`
**Feeds:** `GW-1.2` PRD authoring (tool catalog + three-mode contract),
`GW-1.3` architecture authoring (harness gates + audit fan-out),
`GW-1.10` testing policy (refusal-path coverage), `GW-1.11`
observability spec (mandatory audit/span fields).
**Status:** Phase 0 Day 3 design memo (Mode A). Precedes blueprint
authoring. Will be re-issued as a Mode B audit memo
(`blueprint/audits/06-MS-mcp-safety-review.md`) at GW-1.8 once the
PRD lands.

---

## TL;DR

Of the 22 tools sketched in the PRD skeleton (`02-PRD.md` § 3):

- **17 ship as `read_only`** — no harness writes, but audit row +
  refusal contract still apply.
- **3 ship as `draft_only`** in E5 — artifact real, side effect zero.
- **1 ships as `approved_execute`** (`reconcile-this-payment`) only
  after dual-control is wired and a real customer has opted in.
- **0 tools should ship `approved_execute` in the OSS demo profile.**
  Per D-005 + 003-DR-ARCH § 8, the public floor is `read_only` /
  `draft_only`; `approved_execute` is a code path customers flip on.
- **Don't ship `payments-mcp` at all** in OSS — carve it at the repo
  level (no directory).

The dominant risk is not a single tool failing open — it's the
**harness contract leaking** (a `draft_only` tool with a side effect
through a vendor adapter, or a `read_only` tool that caches a bearer
token to a customer log). Section 7 covers the cross-cutting harness
invariants that make this architecturally impossible.

---

## 1. Per-tool review — `policycenter-mcp` (E2 + E5)

### 1.1 `find-submissions-waiting-on-me` — **read_only**

| Field | Value |
|---|---|
| Mode | `read_only` |
| Approval tier | n/a |
| Blast radius (open) | Discloses the actor's submission queue to the
                        wrong session if `actor_id` resolution is
                        wrong. Bounded scope (this user's queue, not
                        all submissions). |
| Idempotency | n/a (no writes) |

**Refusal scenarios the tool MUST handle:**

1. Auth expired / token revoked → return structured refusal
   `{decision: "refused", reason: "auth_expired", retry_after: "..."}`,
   never silently truncate to "no results".
2. `actor_id` cannot be resolved from the JWT (no `sub` claim, no
   role mapping in the active profile) → refuse, don't fall through
   to "queue is empty".
3. Sandbox unreachable (per D-008 NO MOCKS) → fail loudly with
   `reason: "sandbox_unreachable"`. Do NOT degrade to a cached
   snapshot. Persona 8 (Kim) is allergic to "the agent showed me
   stale data and I trusted it."
4. Profile-policy violation: profile's `roles.yaml` does not grant
   the calling actor visibility on submissions → refuse with the role
   that's missing, not silently empty.

**Audit row (read_only schema):** `trace_id`, `tenant_id`, `tool_name`,
`mode`, `actor_id`, `decision` (`ok` / `refused`), `decision_reason`,
`pii_redacted` (boolean — was the response passed through the redactor),
`latency_ms`, `result_count` (NOT result body — never log claim/policy
content). No `idempotency_key` (no write); no `evidence_bundle_id`
(no approved_execute).

**Why even read_only audits:** Persona 5 (CISO) attacks read-side too
— exfiltration of policy/account data IS the threat. SOC 2 access
trails require it.

### 1.2 `whats-our-appetite-on-this-risk` — **read_only** (with caveat)

Mode `read_only`. Blast radius: returns underwriting-decline rules
often **trade-secret to the carrier**. Wrong tenant + wrong rule
disclosure = competitive leak.

**Special refusal — `tenant_id` cross-check.** The JWT's `tenant`
claim must equal the URL's `tenant` parameter must equal the
profile's `tenant.yaml` value. Any mismatch → refuse with
`reason: "tenant_mismatch"`. Classic horizontal-privilege attack; the
appetite data is the bait.

### 1.3 `show-policies-for-this-insured` — **read_only**

Bounded scope. Refusal must distinguish `"insured_not_found"` from
`"no_access"` — conflating them is an enumeration attack (known
Persona 5 finding).

### 1.4 `summarize-this-submission` — **read_only**

Summarization is LLM-side (the agent), not tool-side. **The tool MUST
NOT call out to a different LLM endpoint inside the MCP handler** —
that makes the MCP a hidden LLM proxy, breaking the audit story.

### 1.5 `did-we-lose-this-account` — **read_only**

Cancellation reason codes. If the carrier has extended the typelist
(per `typelists.yaml`) and the value isn't in the base catalog,
return the raw value with `unknown_typelist_value: true` — never
fabricate a human-readable label.

### 1.6 `explain-why-this-got-referred` — **read_only**

Underwriting referral rule trace. Same trade-secret caveat as 1.2.

### 1.7 `draft-referral-note` — **draft_only** (E5)

Mode `draft_only`. Blast radius: the draft is in the agent's
response. If the harness mode declaration leaks (tool wired to
`approved_execute` on a misconfigured profile), a real PolicyCenter
activity gets created.

**Critical refusal:** if the active profile sets this to
`approved_execute` but the calling actor lacks the required role in
`approval-matrix.yaml`, refuse at draft-generation time. Don't
generate a draft the actor can't file — that's a honeypot UX.

**Audit:** the draft body is hash-summarized, not stored plaintext in
the audit log (Persona 5 doesn't want denial-letter drafts in the
audit DB). Hash + length + redaction-applied flag is sufficient.

### 1.8 `propose-endorsement` — **draft_only** (E5)

Same shape as 1.7. Add a refusal for "endorsement would change a
field the profile's `pii-policy.yaml` marks immutable for the actor's
role" (e.g., a producer can't endorse the named-insured DOB).

---

## 2. Per-tool review — `claimcenter-mcp` (E7)

### 2.1 `find-claims-at-risk-of-leakage` — **read_only**

Leakage = claim paid more than it should be. The leakage heuristic is
trade-secret per carrier; **expose via profile config, not
hardcoded.** Tool's role is "apply the configured rule," not "decide
what counts as leakage."

**Refusal:** profile has no leakage heuristic →
`reason: "leakage_policy_unset"`, refuse rather than apply a default.
Silent defaults = wrong answer for everyone but one carrier.

### 2.2 `summarize-this-loss` — **read_only**

Same LLM-proxy caveat as 1.4. **PII redaction mandatory before the
claim narrative crosses the MCP boundary back to the agent.** Refusal
if redactor unavailable — do NOT pass the raw narrative through. Per
Persona 5 + 8: a single un-redacted claim narrative reaching a model
log is a BAA-trigger event.

### 2.3 `whats-the-reserve-picture` — **read_only**

Numerical, low PII. Refusal if profile lacks reserve-bucket mappings
(reserves categorized differently per carrier) — surface the missing
mapping name.

### 2.4 `draft-denial-letter` — **draft_only**

| Field | Value |
|---|---|
| Mode | `draft_only` |
| Approval tier | n/a for the draft. If ever promoted to
                  `approved_execute`, **dual-control mandatory** —
                  denial letters are regulator-facing artifacts; one
                  human is not enough. |
| Blast radius (open) | If the harness's mode declaration leaks, a
                        denial letter could be filed against an
                        insured who is owed payment. This is the
                        single highest-blast-radius tool in the OSS
                        catalog. |

**Refusal scenarios specific to this tool:**

1. Reason code from the agent does not exist in the profile's
   reason-code typelist → refuse. Don't synthesize.
2. Smart Comms template rendering fails → refuse with
   `reason: "template_render_failure"`. Don't fall back to an LLM
   draft — denial letters have legally-required language.
3. Claim is closed → refuse. Closed claims can't be denied; this is
   a state-violation refusal.
4. PII redaction failure on the rendered output (the letter
   accidentally includes another insured's name due to a template
   bug) → refuse. The redactor is in the critical path.

**Persona 8 alignment:** "show me *exactly* where the agent draws the
line between drafting and doing." The draft is delivered as a
**hash-anchored artifact** (the harness emits a draft-id; the tool's
response embeds the draft-id; promoting it to a real letter is a
*different tool* in `approved_execute` mode that takes the draft-id
as input). The agent cannot accidentally turn a draft into a filing
by re-calling the same tool with different arguments.

---

## 3. Per-tool review — `billingcenter-mcp` (E8)

### 3.1 `show-overdue-accounts` — **read_only**

Standard read with producer-scope caveat: the actor's role determines
"all overdue for the carrier" vs. "overdue for my book." Persona 4
explicitly attacked this — the tool must not return cross-broker data
when the caller is a broker.

**Refusal:** if producer-scope filter can't be applied (profile lacks
broker-id mapping), refuse rather than return all accounts.

### 3.2 `whats-the-payment-status` / 3.3 `find-billing-issues-for-this-policy` — **read_only**

Bounded to one policy/account. Standard refusal set.

### 3.4 `reconcile-this-payment` — **approved_execute** (if ever)

| Field | Value |
|---|---|
| Mode | `approved_execute` (NOT in OSS demo path; gated profile
        flag) |
| Approval tier | **Dual-control minimum.** Recommend three-of-five
                  for amounts above a profile-configured threshold. |
| Blast radius (open) | Misallocates a payment between accounts. In
                        the worst case: payment posted to the wrong
                        carrier within a multi-carrier MGA →
                        commingling → regulatory finding. |
| Idempotency | **Mandatory.** Idempotency key derived from
                `(payment_id, target_account_id, posted_amount,
                actor_id)` + a profile-supplied salt. |

**Refusal scenarios:**

1. Idempotency-key collision with a different `posted_amount` →
   refuse with `reason: "idempotency_collision"`. Never overwrite the
   prior outcome.
2. Idempotency-key match with the same `posted_amount` → short-circuit
   to the prior `decision` + `evidence_bundle_id`. Replay must
   short-circuit, not double-write (D-006).
3. Approval timeout (the second approver hasn't acknowledged within
   the profile's TTL) → refuse with `reason: "approval_timeout"`.
   Don't "auto-approve after 24h" — Persona 5 will fail the design.
4. Profile-policy violation: actor's role is `billing-clerk` but the
   amount exceeds the role's `max_reconcile_amount` →
   `reason: "policy_violation"`, identifies which policy fired.
5. Sandbox unreachable → refuse. No degraded mode.
6. Evidence bundle export failed (Postgres write succeeded, JSON
   bundle could not be sealed) → **rollback the harness state**, then
   refuse. The evidence bundle and the side effect must be atomic.

**Audit row (approved_execute schema):** all read_only fields **plus**
`idempotency_key`, `evidence_bundle_id`, `approver_ids[]` (array; for
dual-control), `approval_decisions[]`, `policy_chain[]` (which policy
gates fired in which order), `harness_plan_id`, `rollback_hint`,
`hash_chain_prev` (for tamper-evidence per Persona 5).

**This tool is the canary** for `approved_execute`. Get its contract
right and the rest of the mode follows; ship it sloppy and it sets the
wrong precedent.

---

## 4. Per-tool review — `producer-mcp` (E9)

### 4.1 `show-my-book-of-business` — **read_only**

Producer-scoped. Same refusal as 3.1 — broker-id resolution must be
explicit, never fall through to "the carrier's book."

### 4.2 `whats-my-commission-status` — **read_only**

PII-adjacent (commission amounts are sensitive between brokers).
Refusal: cross-broker leakage check — the calling broker's
`producer_id` must match the policy's writing-producer chain, not
just be present in the profile.

### 4.3 `find-my-pending-quotes` — **read_only**. Standard.

---

## 5. Per-tool review — `events-mcp` (E6)

### 5.1 `replay-event` — **read_only** (carrier-vocabulary handoff)

The name suggests a side effect ("replay" = fire it again). Per D-004
`events-mcp` is query-only — this tool returns the historical event
payload. **Flagging for `carrier-vocabulary-curator`**: the safety
story collapses if a contributor reads "replay" as a verb and wires a
producer call. Suggest a rename like `show-event-payload`.

### 5.2 `find-events-for-claim` — **read_only**

Refusal: tenant cross-check on the claim ID.

---

## 6. Tools I recommend NOT shipping in OSS

### 6.1 Anything in `payments-mcp`

Per 003-DR-ARCH § 8 + Persona 5: money movement needs dual-control
security review that hasn't happened. Even `whats-the-payment-status`
(read-only-sounding) is an attractive nuisance — contributors will
add `initiate-refund` next, and OSS is where those PRs land. **Carve
`payments-mcp` at the repo level** (no `servers/payments-mcp/`
directory). PRD should say so explicitly, not imply it.

### 6.2 Health-LOB carrier tools

Per 003-DR-ARCH § "PII / BAA boundary": no health-PII through the OSS
demo. Health-carrier profiles (if/when) must gate on
`pii.baa_required: true` disabling every `approved_execute` until a
BAA is in place. Ongoing reviewer job: refuse any PR adding health-LOB
typelist mappings to the OSS demo profile.

### 6.3 `draft-denial-letter` in the OSS demo profile

Code ships in E7, but the **public demo profile** must NOT enable it.
Persona 8 + Persona 3: the risk of a wrongly-drafted denial reaching a
real claim through an unsupervised demo is high enough that the demo
profile defaults this tool to `disabled`, not `draft_only`.

---

## 7. Cross-cutting harness invariants (the contract for `packages/harness/`)

These apply to every tool regardless of mode. They feed `GW-1.3`
architecture authoring.

### 7.1 The harness owns the audit row

Tools call `harness.audit.write(row)` exactly once per invocation,
in a `finally` block — never inside the success branch. A tool that
crashes mid-write must still produce an audit row with
`decision: "errored"` and `error_class`. A tool with a passing test
that doesn't audit-write is a CI failure.

### 7.2 Mode is not negotiable mid-call

The tool's `mode` is declared in the tool registration (Zod schema +
manifest entry) and is bound at MCP-handshake time. A tool cannot
"upgrade" from `draft_only` to `approved_execute` based on its
arguments. If a customer wants both shapes (draft + commit), that's
**two tools** with two names — never one tool that branches on a
flag.

### 7.3 Idempotency keys are derived, not user-supplied

Per D-006, every `approved_execute` tool generates the idempotency
key from a deterministic function of (entity_id, action, salient
fields, actor_id, profile.salt). Accepting a client-supplied
idempotency key opens replay attacks where the client picks a
collision. The harness validates the key shape and rejects malformed
keys at the entrance.

### 7.4 Approval blocks the side effect, not the response

The harness's approval step gates `client.guidewire.cloud.<endpoint>`
— not the tool's response. The tool returns `{decision: "pending",
approval_url, ttl}` immediately; the actual carrier write happens
after approval (out-of-band, via the harness's queue). This matters
because Persona 3 (Claims VP) will not tolerate 80 stalls per day on
synchronous approval. The approval-pending response is the
non-blocking path.

### 7.5 PII redaction is a harness pipeline, not per-tool code

A `packages/harness/redaction/` module owns the redaction; tools
declare which response fields are redactable in their Zod schema; the
harness applies the profile's `pii-policy.yaml` rules at response
time. **Never** ask each tool author to remember to call the redactor
— half will forget. Harness-side enforcement is the only safe shape.

### 7.6 Hash-chain integrity is a single-writer property

The audit hash-chain (D-006) requires a single writer. Two MCP
servers writing concurrently to the audit chain must serialize
through `packages/audit/` (Postgres advisory lock or a dedicated
sequence row). Recommend: `packages/audit/` exposes a single
`appendAuditRow(row): Promise<{seq, hash}>` that is the only path to
the chain. Direct DB writes from tool code = CI failure (architecture
rule).

### 7.7 Evidence bundle is the immutable artifact

For `approved_execute`, the evidence bundle is a JSON file written to
object storage (S3/GCS) with a content-addressed path
(`bundle-<sha256>.json`). The audit row references the bundle by
hash; the bundle is never updated. Per Persona 5: tamper-evidence
demands content-addressing, not "we promise we don't edit it."

### 7.8 Refusal is structured, not exceptional

Every refusal returns
`{decision: "refused", reason: "<machine-readable>", message: "<human>"}`
— never a thrown exception that bubbles to the agent as "tool errored."
The agent needs to reason about *why* the refusal happened to
decide whether to retry, escalate, or stop. Per D-008 (NO MOCKS) +
the mcp-safety rubric: structured refusals are a contract, not an
implementation detail.

---

## 8. Open questions / things needing PartnerConnect or sandbox to resolve

These I cannot answer from the input materials alone; they need
sandbox access (per `guidewire-adj`) or PartnerConnect-tier docs:

1. **Per-tool authorization granularity in Cloud APIs.** Does
   Guidewire Cloud's OAuth surface support scope-per-tool (a token
   that can call `/policies` but not `/payments`)? If yes, profile-
   level role gating gets cheaper; if no, we need a token-narrowing
   layer in `packages/auth/`. Defer to `guidewire-api-archaeologist`.

2. **Idempotency key support in Cloud APIs.** Coverage is reportedly
   uneven across PC/CC/BC and across Innsbruck / Las Leñas / Palisades.
   The harness's idempotency story degrades to client-side replay
   tracking if carrier-side support is missing. Need sandbox.

3. **Approval timeout TTL.** What's the regulator-acceptable TTL for
   a pending-approval write held in "draft" state in PC/CC? Persona 5
   wants a profile-configurable ceiling. PartnerConnect doc, not
   public.

4. **App Events delivery semantics for audit fan-out.** If we mirror
   audit rows to the carrier SIEM via App Events, what's the
   at-least-once vs exactly-once posture? Affects SIEM-side dedup.

5. **Per-LOB regulator constraints on `draft_only`.** Some LOBs
   (workers' comp, some auto jurisdictions) reportedly treat drafted
   denials as discoverable in litigation even if never sent. If true,
   the profile needs `draft_retention.yaml`. Legal review, not
   technical.

6. **BAA-LOB carve-outs at the typelist level.** The base typelist
   catalog is portable, but health-LOB extensions are where PHI
   surfaces. Need a profile-level mechanism to mark typelists as
   PHI-bearing so `pii-policy.yaml` references them by name, not
   string match.

---

## 9. Recommended actions, priority order

1. **Bind these mode designations in `02-PRD.md` § 3** as the default
   row-3 ("Mode") column for each tool. The PRD authoring (GW-1.2) is
   the place this becomes load-bearing.
2. **Author `02-PRD.md` § 4 ("Three execution modes — full contract")
   from § 7 of this memo.** The harness invariants ARE the mode
   contract; don't re-derive them.
3. **Add an explicit "OSS demo profile" subsection** to PRD § 6
   listing which tools are `enabled` / `disabled` / mode-locked in
   the public-demo profile. Default-deny on every `approved_execute`
   tool. `draft-denial-letter` defaults to `disabled` (§ 6.3).
4. **Carve `payments-mcp` out of the repo layout** in `02-PRD.md` and
   `03-ARCHITECTURE.md` — no directory, not just no tools. Reduces
   the contributor attractive-nuisance.
5. **Specify the audit row schema in `05-TECHNICAL-SPEC.md`** with
   the read_only and approved_execute variants from § 1.1 and § 3.4.
   Make the schema a Zod definition in `packages/audit/`; CI
   architecture rule fails any tool whose audit emission doesn't
   satisfy the schema.
6. **File the open questions in § 8 as beads** under the
   `guidewire-api-archaeologist` lane (1, 2) and the
   `harness-runtime-architect` lane (3, 4, 6). Question 5 needs a
   legal-review bead under E5.
7. **At GW-1.8, re-issue this memo as Mode B** with PASS / NOTE /
   CHALLENGE / FAIL verdicts on the authored PRD + ARCHITECTURE +
   TECHNICAL-SPEC.

---

## 10. Decision-log + persona traceability (for the audit panel)

Every recommendation in this memo cites a decision-log entry or a
persona attack:

| Recommendation | Cite |
|---|---|
| Three modes per tool | D-005, Persona 3, Persona 8 |
| No audit = no write | D-006, Persona 5, Persona 8 |
| Profile-driven configuration | D-007, Persona 1, Persona 6 |
| NO MOCKS / no degraded mode | D-008, Persona 8 |
| Carrier-vocabulary tool naming respected (not reviewed here) | D-001, deferred to `carrier-vocabulary-curator` |
| Suite-organized servers (5-15 tools each) | D-002, Persona 7 |
| Harness as library + CLI, not MCP server | D-003, Persona 7 |
| Audit row mandatory on read_only too | Persona 5 (CISO read-side exfil threat) |
| Producer-scope filtering | D-002, Persona 4 |
| Carve out payments + health-LOB | 003-DR-ARCH § 8 "stays out" |

---

**End memo.** Hand off to `GW-1.2` (PRD authoring) and the
`harness-runtime-architect` for § 7 internalization.
