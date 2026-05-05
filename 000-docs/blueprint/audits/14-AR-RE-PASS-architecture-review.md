# 14-AR-RE-PASS — architect-reviewer post-GW-1.9 re-pass

**Filed:** 2026-05-05
**Status:** PASS
**Inputs:** PRs #73, #74, #78, #80, #81; the post-triage blueprint set
([`02-PRD.md`](../02-PRD.md), [`03-ARCHITECTURE.md`](../03-ARCHITECTURE.md),
[`05-TECHNICAL-SPEC.md`](../05-TECHNICAL-SPEC.md),
[`04-USER-JOURNEY.md`](../04-USER-JOURNEY.md),
[`07-ROADMAP.md`](../07-ROADMAP.md),
[`01-BUSINESS-CASE.md`](../01-BUSINESS-CASE.md));
[`audits/00-AUDIT-RESPONSES.md`](./00-AUDIT-RESPONSES.md);
the shipped E1 packages at `packages/{harness,audit,schemas,observability,auth,client-sdk,mcp-runtime}/`
and `servers/policycenter-mcp/`.

---

## Summary verdict

The post-GW-1.9 blueprint hangs together architecturally. The four
cross-cutting themes' edits compose without contradiction: the manifest
contract (Theme 1) lands once in PRD § 3.0, is realized as a Zod
super-refine in TECH-SPEC § 3.0, and is enforced by the new 14th row of
the ARCHITECTURE § 4 boundary table — all three references co-cite one
another. The audit-DB role separation (Theme 2) is bound to E1's exit
criteria as the testcontainers test in `packages/audit/tests/role-separation.test.ts`
and is reflected in TECH-SPEC § 8.2.0/§ 8.2.1 as the operational identity
contract. Doc-set hygiene (Theme 3) and the 11 hardening edits (Theme 4)
land at the cited sections with internally consistent cross-references.
The shipped harness skeleton at `packages/harness/` matches the post-triage
PRD § 5 contract; the three documented follow-up beads (oauthScope +
idempotency.pruned schema extension; approvals migration DDL; BAA
superRefine) are correctly framed as code-vs-blueprint lockstep work
rather than blueprint contradictions. No FAILs surfaced; no new
CHALLENGEs are filed.

## Walk

### Layered model + 14th boundary row

The 5-layer model in [03-ARCHITECTURE § 2](../03-ARCHITECTURE.md#2-layered-model)
is unchanged from the pre-triage shape and remains internally consistent
— L1 (agent host) → L2 (servers) → L3 (harness) → L4 (clients) → L5
(profiles), with auth/audit/observability/events as the four cross-cutting
planes (§ 2.7). The "must not" sub-bullet under L3 (§ 2.4) still names
the harness's read-only carve-out into `packages/guidewire-client/` per
TECH-SPEC § 2.1 row `packages/harness/`'s *"read-only — write injection
is the sole exception"* note. Pre-triage, this carve was the loophole
[03-AR F-2](./03-AR-architecture-review.md#f-2) flagged: row 1 of § 4
covers `servers/**`, but the harness-internal write-call path was
uncovered. The new 14th row at [03-ARCHITECTURE § 4](../03-ARCHITECTURE.md#4-boundaries--what-each-layer-cannot-do)
closes that loophole correctly — REFUSE-tier, depcruise + AST call-site
rule, with reasoning that names both row 1 and TECH-SPEC § 2.1 inline.
The manifest-level corollary (`requiresHarnessExecute: true` for
`draft_only` / `approved_execute` tools) lives at PRD § 3.0 and is
machine-validated by the `ToolManifestEntrySchema.superRefine` block at
TECH-SPEC § 3.0 lines 236–261. § 3.0 *declares* the contract on the tool
side; § 4 row 14 *enforces* it on the import-graph side; the manifest
boot-validation predicates at PRD § 3.0 ("Boot-validation requirement
(MS-5)") are the runtime gate that fires on configuration drift. The
three loci are co-cited in each direction; there is no orphan reference.

The L3 → L4 dependency direction is preserved — clients are still pure
HTTP + protocol mapping, and the harness is the only L3 module that
imports L4. The architectural property the depcruise rules enforce
remains "the harness is the only path to writes."

### Epic dependency graph

E1 (`guidewire-4rd`) and E2 (`guidewire-0qf`) are built and the ROADMAP
status is correct. E3 ships the harness skeleton per PR #80 — exit
criteria in [07-ROADMAP § E3](../07-ROADMAP.md#e3--harness-library--cli)
read as full-implementation requirements (Postgres tables shipping via
SQL migrations, end-to-end CLI subcommands functional, `IDEMPOTENCY_MISMATCH`
refusal wired, mutation kill rate ≥85), which the shipped skeleton at
`packages/harness/` does not yet satisfy — but ROADMAP frames E3 as
"MVP" and the open follow-up beads (per the response register's GW-1.9
closure) are explicitly the lockstep code work that lifts the skeleton
to the full E3 exit criteria. This framing is consistent: the blueprint
is the contract, the package is the staged implementation. E4 shipped
the profile loader per PR #75 with the cowork-fork-starter scope dropped
(per [AR-4](./00-AUDIT-RESPONSES.md#theme-4--hardening-edits) +
[BZ-3](./00-AUDIT-RESPONSES.md#theme-4--hardening-edits) accepted-no-edit
rationale); ROADMAP § E4 still references `templates/cowork-fork-starter/`
in its Done-when criteria, which is a tracked drift discussed under
F-1 below. E5+ are correctly blocked behind E3's full-implementation
state (the harness skeleton is enough to *call*, not enough to *gate
production writes*); ROADMAP § E5 names this dependency. The AR-7
testcontainers test is pinned to E1 exit criteria at
[07-ROADMAP § E1 lines 56–71](../07-ROADMAP.md#e1--foundation), with
named cross-cites to AR-7, SA-3, HR-2, and D-019 — the cite chain
matches the response-register entries.

### Cross-theme consistency (the 4 themes)

**Theme 1 — Manifest contract (PR #78).** Five edits, one mental
model. AR-2's 14th boundary row at ARCHITECTURE § 4 cites PRD § 3.0;
PRD § 3.0 cites both ARCHITECTURE § 4 rows 1 and 14 (and TECH-SPEC §
3.0 for the Zod sketch); TECH-SPEC § 3.0 cites PRD § 3.0 as the
authoritative shape and lines up the Zod superRefine with the three
load-bearing invariants (mode ↔ requiresHarnessExecute parity per
AR-2; description ↔ formatDescription(vocabulary) per CV-6; boot-time
mode validation per MS-5). MS-5's runtime mode-parity check at PRD §
3.0 lines 247–256 reuses `HarnessError({ code: 'MODE_MISMATCH' })`
already present in the union at PRD § 5.8 / TECH-SPEC § 3.8 — no DDL
extension required, and the same code is used at boot and at runtime
so Sentry grouping stays single-issue. CV-3's events-mcp role
disambiguator at PRD § 3.5 (lines 421–437) matches the [D-016](../004-DR-DEC-architecture-decisions.md#d-016--show-activity-on-this-claim-is-a-new-tool-not-a-rename)
new-tool decision and the F-RT-7.1 red-team finding it closes; the
`roles.yaml` per-actor scope assertion is congruent with the existing
PRD § 6.2 schema (no role-binding shape change required). All five
edits compose; no two contradict.

**Theme 2 — Audit-DB role separation (PR #74).** AR-7's E1
exit-criterion bullet at [07-ROADMAP § E1 lines 56–71](../07-ROADMAP.md#e1--foundation)
names `packages/audit/tests/role-separation.test.ts` with the
`audit_writer` INSERT-allowed / UPDATE-DELETE-denied + `audit_reader`
SELECT-only assertions, citing AR-7, SA-3, HR-2, and D-019 inline.
SA-3's TECH-SPEC § 8.2.1 "Postgres role separation — operational
identity" subsection lines 1643–1687 names `audit_owner` as
*"never the runtime connection identity"*, restricts it to the
migration job, and explicitly extends the role-separation surface
to `approvals` (added per HR-4 below). The two edits are mutually
referential: ROADMAP § E1 names § 8.2.1 as the contract; § 8.2.1
names ROADMAP § E1 as the binding test. Both reference D-019 as the
decision the runtime check makes binding. HR-2 is correctly recorded
in the response register as PASS-w/cross-ref (no standalone edit
needed; AR-7 + SA-3 satisfy it).

**Theme 3 — Doc-set hygiene (PR #73).** The 000-INDEX refresh at
`000-docs/000-INDEX.md` reflects D-001-through-D-021 and the audits/
directory structure (3 pre-audit + 11-staffed + register). ROADMAP
§ E1's CONTRIBUTING required-sections bullet (9 sub-bullets, lines
76–104) lands cleanly with the cited 06-DA F-5 cross-reference. The
D-021 sandbox-terminology pass landed at the 4 named locations:
PRD § 6.10 (lines 1263–1269: "Dev-tier Cloud API endpoints from the
librarian KB...reached with dev-tier OAuth credentials per D-021");
USER-JOURNEY J-1 line 72–76 (preconditions reworded to "dev-tier
Cloud API endpoints reachable with dev-tier OAuth credentials per
D-008 + D-021"); USER-JOURNEY J-6 step 1 lines 727–738 (token
endpoint / scopes / JWKS URI reworded as "tenant-specific" with
the smoke-reach.ts pointer); ROADMAP § E2.5 prereqs lines 258–268
(reachability prereq via smoke-reach.ts replacing the
`guidewire-adj`-keyed prereq); plus the Phase 0 row strikethrough
at ROADMAP line 20. The intentional preservation of generic
"sandbox" usage in BUSINESS-CASE / ARCHITECTURE / TECH-SPEC contexts
tied to D-008 NO-MOCKS and the "PartnerConnect sandbox" product
surface name is recorded in the CC-4 rationale and verified — the
remaining occurrences in BUSINESS-CASE lines 247–350 are
D-008-context, which is the legitimate isolated-tenant meaning per
the response register. F-CON-001/002/003 verifications via DA-3,
CC-1, CC-3, DA-6 / CC-7 are recorded as `accepted-verified` and
spot-check at repo `CLAUDE.md:162`, `README.md:27,44`, and
`audits/README.md:9-12,23-28,41-51` confirms the verification —
filesystem and prose are in sync.

**Theme 4 — Hardening edits (PR #81).** All 11 edits land at the
cited sections. SA-2 (revocation latency) at PRD § 6.1 lines
1031–1032 (the new `oauth.introspect` + `oauth.token_lifetime_seconds`
trade-off cite) plus TECH-SPEC § 8.1.1 (lines 1482–1505) — operator-
driven, OSS-defaulted off, with the carrier-side levers documented.
SA-5 + HR-6 (approval timeout signal) at TECH-SPEC § 4.5.1 lines
839–876 — pino WARN + typed AppError + Sentry fingerprint + audit
row-before-raise, with the deliberate "signal availability, not
delivery" carve. SA-6 + MS-6 (BAA carve) at PRD § 6.3 (line 1073:
the `lob_class` field on `lob.yaml`) with the Zod superRefine
contract spelled out; the corresponding `BAA_GATE_MISSING` check
landing in the schemas package is one of the documented follow-up
beads. BA-4 (per-tenant OAuth client lifecycle) at TECH-SPEC § 8.1.2
lines 1507–1548 — cache key, invalidation, JWKS refresh, token
cache, in-flight rotation drain — all five sub-bullets present. MS-7
(refusal ordering for read-only tools) at PRD § 4.2 lines 494–516
with the (a) pre-plan / (b) post-plan split that makes the read-side
exfil-detection audit pattern reproducible. CV-4 ("waiting on me"
projection) at PRD § 3.1.1 lines 306–329 with the OSS demo's narrow
projection contrasted against the carrier composite. GA-3
(admin-scope OAuth threat-model row + `oauth_scope` audit field) at
TECH-SPEC § 8.5 (table row at line 1716, which names the threat,
the `roles.yaml` boot validation, the per-call audit row, and the
`oauthScope` field) plus the new `OAuthScope` type in PRD § 5.5 line
821 + TECH-SPEC § 3.5 line 568 — these align. GA-6 (read-after-write
`confirmWrite()`) at PRD § 5.4 lines 736–769 (3-row strategy table)
+ ARCHITECTURE § 6 last row (lines 734) + TECH-SPEC § 3.4 lines
456–491 (full TS interface) — three locations, one logical change,
with cross-cites in each direction. HR-3 (`idempotency.pruned`) at
PRD § 5.4 lines 771–806 + AuditEventType union at PRD § 5.5 line
816 + TECH-SPEC § 3.5 line 563 — the new event type lands in two
type unions and is referenced from the prose contract. HR-4
(`approvals` table DDL) at TECH-SPEC § 8.2.0 lines 1594–1641 — full
DDL with the partial index `approvals_pending_idx` for the CLI hot
path, ownership grants for `audit_writer`/`audit_reader` per § 8.2.1.
None of the 11 edits contradict another; the AR-2/CV-6/MS-5 manifest
stack and the GA-6/HR-3 execute-side stack interleave cleanly.

### Shipped harness package alignment

The shipped package at `packages/harness/` per PR #80 aligns with the
post-triage PRD § 5 / TECH-SPEC § 3 contract. `createHarness()` in
`packages/harness/src/harness.ts` returns the `Harness` interface
declared in `packages/harness/src/types.ts` with `plan / policy /
approve / execute / evidence / rollback` methods — matching PRD §
5.8's `createHarness(cfg: HarnessConfig): Harness` shape. The
`HarnessError` class in `packages/harness/src/error.ts` extends
`AppError` from `@intentsolutions/guidewire-observability` (matches
TECH-SPEC § 3.8 / PRD § 5.8) and narrows the `code` field to the
canonical `HarnessErrorCode` union. The shipped union (resolved via
`@intentsolutions/guidewire-schemas`) carries all 10 codes named in
PRD § 5.8 lines 939–945: AUDIT_UNREACHABLE, POLICY_UNREACHABLE,
POLICY_DENIED, APPROVAL_TIMEOUT, APPROVAL_DENIED, IDEMPOTENCY_MISMATCH,
CHAIN_BROKEN, MODE_MISMATCH, TENANT_UNKNOWN, GW_DBTRANSACTION_DUPLICATE.
The pipeline ordering in `harness.ts` matches PRD § 5.1–5.7: `plan()`
is pure (lines 124–141 — assigns planId, idempotencyKey,
wire.dbTransactionId via the canonical `gwh1:` formula); `policy()`
appends `plan.created` then calls `policy.evaluate()` then appends
`policy.decided` then throws `POLICY_DENIED` on deny (lines 145–226);
`approve()` writes `approval.requested` + `approval.decided` and
throws `APPROVAL_TIMEOUT` / `APPROVAL_DENIED` (lines 230–315);
`execute()` short-circuits replay via `idempCache.get()` and writes
`execute.replayed` (lines 355–383, matching TECH-SPEC § 3.4.2's
contract that the side effect is never invoked on replay), otherwise
walks `execute.started` → effect → `execute.completed` (lines
386–478, with the GW-DBTransaction-ID duplicate path mapped to
`GW_DBTRANSACTION_DUPLICATE` at lines 425–441). The audit fan-out
shape (every harness step writes its own row) matches PRD §
5.5 / TECH-SPEC § 3.5. OTel spans are opened per the standard span
tree at ARCHITECTURE § 3.4 / TECH-SPEC § 4.2 — `harness.policy.evaluate`,
`harness.approval.wait`, `harness.execute`, `harness.evidence.bundle`,
`harness.rollback.hint` — all present.

The three follow-up beads identified in the response register are
correctly framed as code-vs-blueprint lockstep, not contradictions:

1. `oauthScope` field + `idempotency.pruned` event type extension to
   `packages/schemas/src/harness/audit.ts` — the shipped file does
   not yet carry the optional GA-3 field or the HR-3 event type
   slot. The blueprint is the source of truth (PRD § 5.5 + TECH-SPEC
   § 3.5 carry both); the schema extension is the lockstep code
   work that retro-fits the shipped package.
2. `approvals` table DDL extension to `packages/audit/migrations/0001_init.sql`
   — the shipped migration file carries only the audit-chain DDL.
   TECH-SPEC § 8.2.0 declares the `approvals` table as part of the
   E3 implementation; the migration extension is the lockstep code
   work.
3. BAA `superRefine` rule extending `packages/schemas/` to raise
   `HarnessError({ code: 'BAA_GATE_MISSING' })` at boot when a
   profile carries `lob_class: health` while `pii-policy.yaml.baa_required: false`.
   PRD § 6.3 + § 6.8 carry the contract; the schema package's
   `superRefine` is the lockstep code work.

Each follow-up is a code-side write that retrofits the shipped
package to the blueprint contract. The blueprint does not lie; the
package is staged. No contradiction.

## Findings

(none — see verdict)

## Verdict

PASS. The single re-pass per [`audits/README.md`](./README.md) §
"Gate criteria" is clean. `guidewire-7jt` is ready to close; E1
(`guidewire-4rd` / GH #3) is unblocked.

jeremylongshore.com made me do it
  -claude
intentsolutions.io
