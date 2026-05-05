# 08-MS — MCP safety review (Mode B)

**Auditor:** `mcp-safety-reviewer` (project-scoped specialist)
**Date:** 2026-05-04
**Target:** `02-PRD.md` § 3 (full tool catalog) + § 4 (three-mode
contract) + § 5 (harness contract) + § 6.7 (`approval-matrix.yaml`)
+ § 6.8 (`pii-policy.yaml`), `03-ARCHITECTURE.md` § 5 (three-mode
architectural flow) + § 6 (failure modes), `05-TECHNICAL-SPEC.md`
§ 4.5 (`AppError` typed class + Sentry tagging), `004-DR-DEC`
D-005 / D-006 / D-018, `006-DR-MEMO-mcp-safety.md` (Mode A
predecessor).
**Scope:** per-tool blast-radius bounding, three-mode design
correctness per tool, refusal-scenario coverage, harness gating
(physical not advisory), `payments-mcp` carve discipline,
default-deny posture for the OSS demo profile. **Out of scope:**
Cloud API correctness (`guidewire-api-archaeologist`); harness
internal contract semantics (`harness-runtime-architect`);
audit-chain tamper-evidence claim (covered by D-019 +
`security-auditor` lane).

---

## Verdict

**PASS-WITH-NOTES.** The Mode A memo's `006 § 7` cross-cutting
harness invariants (mode is non-negotiable mid-call; idempotency
keys derived not user-supplied; PII redaction is a harness
pipeline; refusal is structured not exceptional) survive the
authored blueprint intact. PRD § 4.1's mode-comparison table
walks each refusal scenario per mode, citing the source in the
006 memo by section number — that traceability is exactly the
shape this lane wants. The `payments-mcp` carve is enforced at
the repo level (no directory + escape-scan path rule per
`03-ARCHITECTURE.md` § 4 row 13). `draft-denial-letter` defaults
to **disabled** in the OSS demo profile per `02-PRD.md` § 4.3.
The `reconcile-this-payment` canary contract per `006 § 3.4`
landed in PRD § 3.3 verbatim. Findings below are the residual
surface — the manifest schema for mode declaration (cross-cuts
to `backend-architect`'s F-3), the BAA carve runtime check
(cross-cuts to `security-auditor`'s F-6), and a refusal-coverage
question on the `tier_4_blocked` policy tier.

## Findings

### F-1 — Three-mode contract is enforced architecturally per `006 § 7`; the harness-side enforcement is named correctly
- **Severity:** PASS
- **Section:** `02-PRD.md` § 5.9 (three-mode enforcement at
  harness layer) + `03-ARCHITECTURE.md` § 4 boundaries +
  `05-TECHNICAL-SPEC.md` § 4.7 + `009 § 8.1-8.3`.
- **Finding:** The 006 memo's Section 7 (cross-cutting harness
  invariants) made one architectural claim load-bearing: tools
  declare a mode, the harness enforces it, tools cannot bypass
  the harness for writes. PRD § 5.9 + ARCHITECTURE § 4 rules 1
  + 6 + TECH-SPEC § 4.7's depcruise + AST rules make this
  *physical*. A `servers/**` file cannot import `clients/**`
  directly; any HTTP write outside `execute()` callback fails
  CI; mode mismatch produces a `tier_4_blocked` policy decision
  that refuses execute. Combined, "the gate isn't theirs to
  remove" is a structural property of the codebase, not a
  convention. From this lane's perspective, this is the single
  most important property in the blueprint — without it, every
  per-tool blast-radius analysis collapses into "trust the tool
  author." With it, every tool inherits the gate by default.
- **Recommendation:** None. Hold the line on the depcruise rules
  through E1; the temptation to "add an exception for this one
  case" will appear. Refuse.
- **Cite:** `02-PRD.md:668-687`, `03-ARCHITECTURE.md:557-573`
  (rules 1 + 6), `05-TECHNICAL-SPEC.md:664-679`, `009 § 8`.

### F-2 — `tier_4_blocked` policy tier semantics are consistent; `approved_execute` defaults in OSS demo profile are default-deny
- **Severity:** PASS
- **Section:** `02-PRD.md` § 4.3 (OSS demo profile defaults) +
  § 5.2 (`tier_4_blocked`) + `006 § 6.3` (`draft-denial-letter`
  default-disabled in demo).
- **Finding:** `006 § 9` recommendation 3 was "default-deny on
  every `approved_execute` tool in the public-demo profile."
  That landed in `02-PRD.md` § 4.3 verbatim:
  - Every `read_only` tool: enabled
  - Every `draft_only` tool: enabled *except*
    `draft-denial-letter`
  - Every `approved_execute` tool: disabled
  The structural mechanism is the `tier_4_blocked` policy tier:
  the OSS demo profile applies this tier to every
  `approved_execute` tool by default per § 4.3 + TECH-SPEC § 3.2.
  An operator flipping the flag in their forked profile is the
  only way out. This is the right shape — the public demo never
  executes a real write, but the code path ships in E3 so a
  real customer can opt in by editing their profile + bringing
  sandbox creds. From a blast-radius perspective, the OSS demo
  profile carries the lowest-possible blast surface (zero writes
  to Guidewire) consistent with the codebase still being
  exercisable end-to-end.
- **Recommendation:** None. Add to `07-ROADMAP.md` § E3 exit
  criteria a row: *"`profiles/oss-demo/policy/` ships a default
  ruleset that returns `tier_4_blocked` for every
  `approved_execute` tool; integration test verifies a fresh
  clone's `harness.execute()` against any approved-execute tool
  returns a structured policy-denied refusal."* Currently
  implicit; making it explicit at E3 close is cheap insurance.
- **Cite:** `02-PRD.md:292-308` (§ 4.3),
  `02-PRD.md:381-395` (§ 5.2 — `tier_4_blocked`),
  `006 § 6.3` + `006 § 9.3`.

### F-3 — `reconcile-this-payment` canary contract per `006 § 3.4` is intact in PRD § 3.3 + § 4.1; six refusal scenarios named
- **Severity:** PASS
- **Section:** `02-PRD.md` § 3.3 (canary description) + § 4.1
  (mode-comparison row "approved_execute" — refusal scenarios
  list) + `004-DR-DEC` D-018.
- **Finding:** The Mode A memo named six refusal scenarios for
  `reconcile-this-payment` per `006 § 3.4`: idempotency-key
  collision; idempotency-key match short-circuit; approval
  timeout; profile-policy violation by amount tier; sandbox
  unreachable; evidence-bundle export failure with rollback. PRD
  § 4.1's `approved_execute` row carries all six (plus
  `chain_broken` from D-019 + `idempotency_collision` /
  `IDEMPOTENCY_MISMATCH` distinction from librarian P1). The
  "atomic rollback on evidence-bundle export failure" property
  is the load-bearing one — Postgres write succeeded, JSON
  bundle could not be sealed → rollback harness state, then
  refuse atomically. PRD § 4.1 carries the language verbatim.
  D-018 sharpens the boundary: reconcile mutates BillingCenter
  ledger state and is reversible by another reconcile call;
  money movement (ACH, card, wire) lives in a future
  `payments-mcp` with dual-control. The carve is correct; the
  canary contract is intact; every future `approved_execute`
  tool inherits the contract.
- **Recommendation:** None. When E8 ships the actual
  `reconcile-this-payment` implementation, the test matrix from
  `009 § 11` ("the failure table in § 6 becomes the test matrix
  in `packages/harness/test/failure-modes.test.ts`") needs to
  cover all six scenarios + the `chain_broken` and
  `IDEMPOTENCY_MISMATCH` cases. This lane re-runs at E8 close
  to verify the test matrix hits each named refusal.
- **Cite:** `02-PRD.md:178-194` (§ 3.3 canary description),
  `02-PRD.md:266-272` (§ 4.1 `approved_execute` refusals),
  `004-DR-DEC` D-018, `006 § 3.4`.

### F-4 — `payments-mcp` carve is at the repo level, not just the catalog level — verified
- **Severity:** PASS
- **Section:** `02-PRD.md` § 3.6 (`payments-mcp` explicitly NOT
  in this repo) + `03-ARCHITECTURE.md` § 4 boundaries table row
  13 (escape-scan rejects creating `servers/payments-mcp/`
  directory) + `004-DR-DEC` D-018 + `006 § 6.1` + § 9
  recommendation 4.
- **Finding:** The Mode A memo's strongest recommendation was
  to carve `payments-mcp` at the repo level (no directory) so
  contributors couldn't add `initiate-refund` next. That carve
  is enforced architecturally: PRD § 3.6 declares the absence;
  ARCHITECTURE § 4 rule 13 makes "Direct creation of a
  `payments-mcp` directory in this repo" a REFUSE-tier
  escape-scan path rule. The carve is also named in
  `01-BUSINESS-CASE.md` § 4 (customization surface), § 8
  (out-of-scope decisions), and `07-ROADMAP.md` § E8 ("payments-mcp
  directory does NOT exist"). The discipline is consistent
  across the doc set; no inconsistency to flag.
- **Recommendation:** None. Hold the line through E11+. When a
  paying customer asks for `payments-mcp`, it lives in a
  separate repo with its own dual-control review — D-018's
  operational consequence is binding.
- **Cite:** `02-PRD.md:236-248` (§ 3.6), `03-ARCHITECTURE.md`
  § 4 rule 13, `004-DR-DEC` D-018, `006 § 6.1`.

### F-5 — Manifest schema for `mode` declaration is implicit; cross-references `backend-architect` F-3
- **Severity:** CHALLENGE
- **Section:** `02-PRD.md` § 3 (per-tool rows) + § 4 (three-mode
  contract) + `006 § 7.2` (mode is not negotiable mid-call) +
  `009 § 8.1` (mechanism: tool metadata declares mode, harness
  reads + enforces).
- **Finding:** From this lane's perspective the question is
  *enforcement*: how does the harness know a tool's declared
  mode? The Mode A memo's § 7.2 stated "mode is declared in the
  tool registration (Zod schema + manifest entry) and is bound
  at MCP-handshake time." `009 § 8.1` repeats: "Each tool's
  metadata (in the MCP server's tool definition, exposed via the
  SDK) includes a `mode: ToolMode` field." But there's no
  canonical manifest-entry schema in the blueprint. PRD § 3 lists
  modes per tool in a Markdown table, but the actual TypeScript
  shape — what the server registers, what the harness reads —
  is left to the implementation. From a *safety* perspective,
  the missing schema is a pre-E2 risk: every server author
  re-invents the registration shape; the harness's
  `policy.evaluate()` reads `plan.mode` (per `009 § 8.1` step 3)
  but the *path* from server-side registration to harness-side
  policy evaluation is unstated. If two servers disagree on the
  field name, the harness silently treats one of them as
  unknown-mode and the policy gate fails open or fails closed
  depending on the default — neither is auditable.
- **Recommendation:** Cross-reference + amplify
  `backend-architect`'s F-3. From a safety perspective, the
  manifest entry schema must include `mode` as a *required* Zod
  field, the policy engine must refuse boot if any registered
  tool's manifest entry fails the schema, and the harness must
  refuse `execute()` if `plan.mode !== manifest.mode` at call
  time. Encode this in `02-PRD.md` § 3.0 (per backend-architect
  F-3 recommendation) AND add a sentence to PRD § 5.9 that
  *"Mode mismatch between manifest registration and plan is a
  CI-failing build-time check (the harness runs the manifest
  through Zod at boot) and a runtime `MODE_MISMATCH`
  HarnessError."* ~10 min on top of the F-3 work.
- **Cite:** `02-PRD.md:96-117` (§ 3 row format) + § 5.9,
  `006 § 7.2`, `009 § 8.1` step 1.

### F-6 — Health-LOB BAA carve is correctly designed but boot-time enforcement is missing; cross-references `security-auditor` F-6
- **Severity:** CHALLENGE
- **Section:** `02-PRD.md` § 6.8 (`pii-policy.yaml`) + `006
  § 6.2` (Health-LOB carrier tools).
- **Finding:** The Mode A memo's `006 § 6.2` stated:
  *"Health-carrier profiles (if/when) must gate on
  `pii.baa_required: true` disabling every `approved_execute`
  until a BAA is in place."* PRD § 6.8 ships the schema:

  ```yaml
  baa_required:
    enabled: false
    # when true: tool catalog filters down to BAA-cleared tools only;
    # health-LOB carrier profiles MUST set enabled: true
  ```

  The schema is right. The runtime check is missing. From this
  lane's perspective, the failure mode is a carrier with a
  health LOB whose `pii-policy.yaml` has `baa_required: false`
  by mistake — the harness loads the profile, every
  `approved_execute` tool is enabled, the carrier writes against
  health-PHI data, and BAA-non-compliance is the result. PRD § 6.8
  comments "health-LOB carrier profiles MUST set enabled: true"
  as policy; nothing in the codebase or schema enforces it.
  `security-auditor` F-6 raised the same finding from the
  audit-chain side and proposed a `lob_class: health |
  non_health` field on `lob.yaml` + a Zod boot-time refinement.
- **Recommendation:** Endorse `security-auditor` F-6 from this
  lane. Add to `02-PRD.md` § 6.3 an optional `lob_class: health
  | non_health` field per LOB; add to `packages/schemas/`'s
  profile validator a refinement that refuses boot if any LOB
  has `lob_class: health` and `pii-policy.yaml.baa_required:
  false`. Without that boot-time check, the BAA carve is policy
  on paper and not enforced in code. The
  `mcp-safety-reviewer` GW-1.8 mode B claim "verifies the
  carve-out is honored at boot" cannot be substantiated unless
  the boot-time check exists.
- **Cite:** `02-PRD.md:902-926` (§ 6.8), `006 § 6.2`, this
  panel's `04-SA-security-review.md` F-6.

### F-7 — Refusal contract end-to-end (`006 § 7.8`) is intact; one residual question on `decision: 'refused'` for `read_only` tools
- **Severity:** NOTE
- **Section:** `02-PRD.md` § 4.2 (refusal contract JSON shape) +
  `006 § 7.8` (refusal is structured, not exceptional).
- **Finding:** PRD § 4.2 declares the structured-refusal JSON
  shape (`{ decision: 'refused', reason: ..., message: ...,
  retry_after?: ... }`) and TECH-SPEC § 4.5's `AppError` typed
  class + refusal helpers (`refuseAuthExpired`,
  `refuseSandboxDown`, etc.) make every named refusal scenario
  in 006 §§ 1.1.1-3.4.6 available as a typed constructor. The
  contract is consistent across PRD, ARCHITECTURE § 6 failure
  table, and TECH-SPEC § 4.5. **One residual question:** the
  `decision: 'refused'` shape applies to all three modes per
  PRD § 4.2; for `read_only` tools, the audit row schema (PRD
  § 4.1 row "Audit emitted") includes `decision (ok / refused)`,
  `decision_reason`. So a refused read-only call writes an audit
  row with `decision: 'refused'` and the reason. That's right
  per `006 § 1.1`'s "Why even read_only audits" — Persona 5
  cares about exfiltration attempts, and a refused read-only is
  a signal worth auditing. **What's slightly underspecified:**
  the policy decision recorded for a refused read_only — does
  `policy.evaluate()` return `outcome: 'deny'` (so the
  `policy.decided` audit row carries the structured reason), or
  does the tool refuse pre-policy (e.g. on auth_expired before
  the harness gets the plan)? PRD § 4.1 implies both happen
  ("Mandatory per Persona 5 read-side exfil threat") but the
  ordering isn't stated.
- **Recommendation:** Add to PRD § 4.2 a one-paragraph "Refusal
  ordering for read-only tools": *"For `read_only` tools, refusal
  scenarios fall into two classes: (a) pre-plan refusals
  (auth_expired, sandbox_unreachable, tenant_mismatch on
  cross-check) — the harness writes an audit row with
  `decision: 'refused', decision_reason: <code>` but does NOT
  invoke `policy.evaluate()`; (b) post-plan refusals
  (profile_policy_violation, profile_incomplete_for_this_carrier
  for ⚠ tools) — the harness writes a `policy.decided` audit row
  with `outcome: 'deny'` and the structured reason."* ~15 min.
  Closes the ordering ambiguity; makes the read-side exfil-
  detection audit pattern reproducible in tests.
- **Cite:** `02-PRD.md:273-285` (§ 4.2), `02-PRD.md:268-269`
  (§ 4.1 `read_only` refusal scenarios row), `006 § 1.1` +
  § 7.8.

## Summary

Recommended actions in priority order:

1. **F-5 (CHALLENGE):** make manifest-schema `mode` field
   load-bearing (cross-references `backend-architect` F-3); add
   to PRD § 5.9 the boot-time + runtime enforcement of mode
   parity. ~10 min on top of F-3.
2. **F-6 (CHALLENGE):** endorse `security-auditor` F-6 — add
   `lob_class` field + Zod refinement so the BAA carve is a
   runtime check, not a documentation policy. ~30 min.
3. **F-7 (NOTE):** clarify refusal ordering for read-only tools
   in PRD § 4.2. ~15 min.

PASS endorsements (F-1, F-2, F-3, F-4) are durable. The harness
gate enforcement (F-1), the OSS demo default-deny (F-2), the
canary contract (F-3), and the `payments-mcp` repo-level carve
(F-4) are the four properties that make this MCP catalog safe
to publish. None weakens; all are load-bearing.

E1 is unblocked from this lane subject to F-5 + F-6 landing as
schema additions before the corresponding package work begins.

jeremylongshore.com made me do it
  -claude
intentsolutions.io
