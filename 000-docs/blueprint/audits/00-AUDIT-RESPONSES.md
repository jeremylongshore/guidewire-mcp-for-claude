# 00-AUDIT-RESPONSES — GW-1.8 staffed audit panel summary + GW-1.9 response stubs

**Filed:** 2026-05-04
**Status:** Panel filed (GW-1.8 close); response stubs await
GW-1.9 author edits.
**Inputs:** the 11 staffed-panel memos at
[`./03-AR-architecture-review.md`](./03-AR-architecture-review.md)
through
[`./13-FC-fact-check.md`](./13-FC-fact-check.md), plus the three
pre-audit gauntlet passes:
[`./00-LIBRARIAN-CITATION-AUDIT.md`](./00-LIBRARIAN-CITATION-AUDIT.md),
[`./01-CONSISTENCY-AUDIT.md`](./01-CONSISTENCY-AUDIT.md),
[`./02-RED-TEAM-PANEL.md`](./02-RED-TEAM-PANEL.md).

---

## How this document works

This file is the **single audit-response register** for the
GW-1.8 staffed panel. Every CHALLENGE / FAIL across the 11 memos
becomes a row below with a status of `open` (the panel filed it
and GW-1.9 has not yet acted on it), `accepted` (GW-1.9
explicitly accepted the finding-as-stated with a rationale, no
edit), or `fixed` (GW-1.9 landed a blueprint edit; row links to
the PR). NOTEs are flagged for GW-1.9 awareness but do not
require a row unless escalated. PASSes are recorded in the
panel-summary table for completeness.

Per `audits/README.md` § "Gate criteria — when E1 unblocks":
- All 11 memos filed ✓
- Every flag triaged → tracked here
- CHALLENGEs resolved by edit OR explicit acceptance with
  rationale below
- No FAIL flags open
- Updated blueprint re-reviewed by `architect-reviewer` +
  `article-consistency-checker` after edits land

---

## Panel summary — one-line verdict per auditor

| # | Memo | Auditor | Verdict |
|---|---|---|---|
| 1 | [03-AR](./03-AR-architecture-review.md) | architect-reviewer | PASS-WITH-NOTES — layering enforcement + epic graph endorsed; one E1 exit-criterion add (role-separation testcontainers test); cowork-fork harness upgrade path needs decision |
| 2 | [04-SA](./04-SA-security-review.md) | security-auditor | PASS-WITH-NOTES — `no audit = no write` + two-key idempotency endorsed; 4 hardening edits (revocation latency, `audit_owner` operational identity, approval-timeout signal availability, BAA carve runtime check) |
| 3 | [05-BA](./05-BA-backend-review.md) | backend-architect | PASS-WITH-NOTES — TS contracts + per-package boundaries endorsed; manifest schema + per-tenant OAuth lifecycle need explicit sections before E1 packages ship |
| 4 | [06-DA](./06-DA-docs-review.md) | docs-architect | PASS-WITH-NOTES — reading-order + librarian KB endorsed; `audits/README.md` renumber + `000-INDEX.md` + CONTRIBUTING section list pending |
| 5 | [07-BZ](./07-BZ-business-review.md) | business-analyst | PASS-WITH-NOTES — four-audience model + payments carve + inbound framing endorsed; CIO cost-bounding + cowork-fork-vs-SI margin language needed |
| 6 | [08-MS](./08-MS-mcp-safety-review.md) | mcp-safety-reviewer | PASS-WITH-NOTES — three-mode harness gate + OSS demo default-deny + canary contract + payments-mcp repo-level carve endorsed; manifest mode + BAA runtime check + read-only refusal ordering need edits |
| 7 | [09-CV](./09-CV-vocabulary-review.md) | carrier-vocabulary-curator | PASS-WITH-NOTES — D-016 discipline + Persona-9 manager tranche + producer density endorsed; events-mcp role disambiguator + "waiting on me" projection clarification + tool-description-shape rule needed |
| 8 | [10-GA](./10-GA-guidewire-api-review.md) | guidewire-api-archaeologist | PASS-WITH-NOTES — two-key idempotency + Composite-vs-Graph + `primaryObject.id` shard endorsed; read-after-write `confirmWrite()` + admin-scope OAuth threat row + Address shape gotcha need edits |
| 9 | [11-HR](./11-HR-harness-review.md) | harness-runtime-architect | PASS-WITH-NOTES — TS contract fidelity + D-019-honest hash-chain + library/CLI parity endorsed; `idempotency.pruned` event + TTL story + `approvals` DDL need additions |
| 10 | [12-CC](./12-CC-consistency-review.md) | article-consistency-checker | PASS-WITH-NOTES — librarian P1-P5 cross-doc consistency + diagram agreement endorsed; epic-count + sandbox-terminology + `audits/README.md` numbering edits pending |
| 11 | [13-FC](./13-FC-fact-check.md) | fact-checker | PASS-WITH-NOTES — release versioning + App Events + `GW-DBTransaction-ID` + pagination + commission endpoint all AUTHORITATIVE; ProNavigator date precision is the only NOTE |

## Aggregate counts

| Severity | Count |
|---|---|
| FAIL | 0 |
| CHALLENGE | 25 |
| NOTE | 14 |
| PASS | 32 |
| **Total findings** | **71** |

(Counts include only the 11 staffed memos, not the 3 pre-audit
passes, which produced 2 FAILs that were resolved via D-019 +
D-020 before this panel ran.)

## Verdict

**The panel passes the GW-1.8 gate.** No FAILs were filed; the
2 pre-audit FAILs (audit-chain tamper-evidence claim
F-RT-5.1 → D-019; profile-schema E2.5 gap F-RT-9.1 → D-020) are
already resolved. Every staffed-panel memo lands at
PASS-WITH-NOTES — meaning the auditor endorses the design with
specific recommendations that do not block E1. The 25
CHALLENGEs cluster around four cross-cutting themes:
1. **Manifest schema** — backend-architect F-3, mcp-safety F-5,
   carrier-vocabulary F-6, and `architect-reviewer` F-2's
   harness-write-call boundary all converge on a single
   `02-PRD.md § 3.0` addition that codifies the tool manifest
   shape including `mode`, `requiredProfileSchema`, description
   format, and write-call-only-via-`execute()` discipline.
2. **Audit-DB role separation runtime check** —
   `architect-reviewer` F-7 + `security-auditor` F-3 +
   `harness-runtime-architect` F-2 endorse adding to E1 exit
   criteria a testcontainers integration test asserting the
   `audit_writer` Postgres role cannot UPDATE / DELETE
   `audit_entries`. Makes D-019 binding at runtime.
3. **Doc-set hygiene** — `docs-architect` F-2 / F-3 / F-4 / F-6 +
   `consistency-checker` F-3 / F-4 / F-7 cluster around: renumber
   `audits/README.md`, normalize D-NNN anchors, sandbox
   terminology pass per D-021, verify F-CON-001/002/003 fixes
   merged, add `000-INDEX.md`.
4. **Hardening edits with named cross-references** — revocation
   latency (security F-2), approval-timeout signal availability
   (security F-5 + harness F-6), BAA carve runtime check
   (security F-6 + mcp-safety F-6), `audit_owner` operational
   identity (security F-3), read-after-write `confirmWrite()`
   (api-archaeologist F-6), `idempotency.pruned` event +
   `approvals` DDL (harness F-3 + F-4).

**Recommendation to GW-1.9:** treat the four cross-cutting themes
as a single working set; address them in that order. The
manifest schema is the highest-leverage edit (cross-cuts five
findings); the audit-DB testcontainers test is the highest-
leverage E1-runtime commitment (cross-cuts three findings).
Doc-set hygiene is the most mechanical (largely single-string
replaces); hardening edits are the most prose-heavy.

E1 (`guidewire-4rd` / GH #3) **unblocks** when:
- All CHALLENGE rows below are either `fixed` or `accepted`.
- The doc-set hygiene rows are `fixed`.
- The audit-DB role-separation test is added to E1 exit
  criteria.
- `architect-reviewer` + `article-consistency-checker` re-pass
  signs off on the post-edit blueprint per
  `audits/README.md` § "Gate criteria".

### GW-1.9 closure (2026-05-04)

GW-1.9 is **resolved.** Triage of the staffed audit panel's
CHALLENGE / FAIL / NOTE inventory completed across four PRs
(Themes 1-4 in this register) with the following terminal state:

- **All 25 CHALLENGE rows** across 4 themes: `fixed` or
  `accepted` with rationale. Zero `open`.
- **All 14 NOTE rows** worth tracking: triaged. Either landed as
  rows above (when the auditor's recommendation was substantive)
  or recorded in the "Notes triaged but not requiring rows here"
  section (when the auditor's recommendation was self-resolving
  observability / hygiene).
- **The four cross-cutting themes** identified at panel close
  (manifest schema; audit-DB role separation; doc-set hygiene;
  hardening edits) are all addressed:
  - **Theme 1** (manifest schema): § 3.0 of PRD + § 3.0 of
    TECH-SPEC + AR-2 14th boundary row + CV-3 events-mcp
    disambiguator + CV-6 description-shape rule + MS-5
    boot-validation.
  - **Theme 2** (audit-DB role separation): § 8.2.1 operational
    identity + E1 exit-criterion testcontainers test makes
    [D-019](../004-DR-DEC-architecture-decisions.md#d-019--audit-chain-is-tamper-resistant-not-tamper-evident-against-a-compromised-harness-dba)
    binding at runtime.
  - **Theme 3** (doc-set hygiene): F-CON-001/002/003 verified;
    sandbox-terminology pass per [D-021](../004-DR-DEC-architecture-decisions.md#d-021--terminology-fix-sandbox-meant-guidewire-isolated-tenant-what-we-actually-need-is-dev-tier-credentials--real-endpoints)
    landed; `audits/README.md` numbering verified; flat
    `000-INDEX.md` refreshed.
  - **Theme 4** (hardening edits): SA-2 revocation latency +
    SA-5 approval-timeout signal availability + SA-6/MS-6 BAA
    runtime check + BA-4 OAuth client lifecycle + MS-7 read-only
    refusal ordering + CV-4 "waiting on me" projection + GA-3
    admin-scope OAuth threat row + `oauth_scope` audit field +
    GA-6 read-after-write `confirmWrite()` + HR-3
    `idempotency.pruned` + HR-4 `approvals` DDL — all landed.
- **The single re-pass** per [`audits/README.md`](./README.md) §
  "Gate criteria" is the only remaining step between this
  closure and full unblock of E1
  (`guidewire-4rd` / GH #3).

The two follow-up beads flagged in the rationale columns —
extending `packages/schemas/src/harness/audit.ts` with the new
`oauthScope` field (GA-3) + the `idempotency.pruned` event type
(HR-3), and extending `packages/audit/migrations/0001_init.sql`
with the `approvals` table (HR-4) — are E3 implementation work,
not blueprint work. They land when the harness wires the
matching code; the blueprint is the contract, the code follows.

---

## Response stubs (one row per CHALLENGE / FAIL)

> **GW-1.9 instructions:** for each row, set status to
> `open` / `accepted` / `fixed`. If `fixed`, link the PR. If
> `accepted`, write 2-4 sentences of rationale.

### Theme 1 — Manifest schema cluster

| ID | Memo | Severity | Title | Status | Rationale / PR |
|---|---|---|---|---|---|
| AR-2 | [03-AR](./03-AR-architecture-review.md#f-2) | CHALLENGE | Add 14th boundary-table row codifying harness writes-only-via-`execute()` | fixed | Added the 14th boundary-table row at `03-ARCHITECTURE.md:570` codifying *"Calls into `packages/guidewire-client/**`'s write-shaped methods (HTTP `POST`/`PUT`/`PATCH`/`DELETE`) from **any** module — including `packages/harness/**` itself — outside an `execute()` callback"* as a REFUSE-tier boundary, enforced by depcruise + AST call-site rule per [009 § 8.2](../009-DR-MEMO-harness-runtime.md#82-ci-enforcement-architecture-rule). The row's reasoning explicitly closes the harness-internal loophole the architect-reviewer flagged: row 1 covers `servers/**`, but row 1 alone is insufficient because the per-package contract at [05-TECHNICAL-SPEC § 2.1](../05-TECHNICAL-SPEC.md#21-package-contracts-allowed-imports--public-api) `packages/harness/` carves out *"read-only — write injection is the sole exception"* into `packages/guidewire-client/` — meaning a future contributor adding a write call inside `packages/harness/src/foo.ts` outside `execute()` would pass row 1 silently. Row 14 closes that loophole. The manifest-level corollary (every `draft_only` / `approved_execute` tool sets `requiresHarnessExecute: true`) is declared at [02-PRD § 3.0](../02-PRD.md#30-tool-manifest-contract) `02-PRD.md:117-272` (the new "Tool manifest contract" section, which cites AR-2 inline at `02-PRD.md:209-225`). The architecture rule and the manifest contract are now co-located: § 3.0 *declares* the boundary on the tool side; § 4 row 14 *enforces* it on the import-graph side. (this PR) |
| BA-3 | [05-BA](./05-BA-backend-review.md#f-3) | CHALLENGE | Add canonical `ToolManifestEntry` schema to PRD § 3.0 + Zod schema in TECH-SPEC § 3 | fixed | Added new § 3.0 "Tool manifest contract" subsection at `02-PRD.md:117-272` before § 3.1 (the per-suite tool tables). The section opens with the canonical `ToolManifestEntry` TypeScript interface — name, version, mode, vocabulary {question, whenToUse}, description, inputSchema, requiredProfileSchema, requiredProfileFiles, epicTag, personas, requiresHarnessExecute, incompleteWithoutProfile, handler — exactly mirroring the type-erased shape already shipping in [`servers/policycenter-mcp/src/manifest.ts`](../../../servers/policycenter-mcp/src/manifest.ts) (cited inline as the reference implementation). The corresponding Zod sketch landed as a new § 3.0 "Tool manifest — what the server registers" subsection at `05-TECHNICAL-SPEC.md:155-299` directly before § 3.1 Plan. The Zod sketch defines `ToolModeSchema`, `EpicTagSchema`, `ProfileFileNameSchema`, `ToolVocabularySchema`, and `ToolManifestEntrySchema` with: kebab-case `name` regex (D-001), semver `version`, semver-range `requiredProfileSchema`, persona ints 1-9, plus a `superRefine` block that codifies the AR-2 + CV-6 + MS-5 invariants (read_only ⟹ requiresHarnessExecute=false; draft_only/approved_execute ⟹ requiresHarnessExecute=true; description must equal `formatDescription(vocabulary)`). The Zod sketch is flagged as the next E1 follow-up — `packages/schemas/src/manifest/tool-manifest-entry.ts` lands when the schemas package adds the `manifest/` subpath (the policycenter-mcp server currently duplicates the structural shape inline so the server boots before that subpath ships; when it lands, the server imports `ToolManifestEntrySchema` from `@intentsolutions/guidewire-schemas` and the inline interface deletes — `05-TECHNICAL-SPEC.md:165-173` documents this transition). PRD § 3.0 is the authoritative shape; TECH-SPEC § 3.0 is the Zod realisation. (this PR) |
| MS-5 | [08-MS](./08-MS-mcp-safety-review.md#f-5) | CHALLENGE | Make manifest-schema `mode` field load-bearing (boot validation + runtime mode parity) | fixed | Made `mode` load-bearing across both boot validation and runtime parity. Boot validation: `02-PRD.md:227-256` ("Boot-validation requirement (MS-5)") enumerates 6 boot-time predicates the server iterates over its registered tools — (1) `mode` is a valid `ToolMode` enum value; (2) `requiredProfileSchema` resolves against active profile's `schemaVersion` per [§ 6.0a](../02-PRD.md#60a--profile-schema-versioning-per-d-020); (3) every `requiredProfileFiles` entry resolves and round-trips its Zod schema; (4) `requiresHarnessExecute: true` tools have non-null harness handle; (5) `draft_only` tools have non-null evidence-bundle exporter; (6) `description === formatDescription(vocabulary)` (CV-6 drift guard). Runtime mode parity: `02-PRD.md:251-256` codifies that the harness MUST refuse `harness.execute()` if `plan.mode !== manifest.mode` at call time, raising `HarnessError({ code: 'MODE_MISMATCH' })` — the same typed code the boot-time check uses, so Sentry groups the failures across boot vs. runtime under one issue per the existing `[code, tool_name, mode]` grouping rule at [02-PRD § 5.8](../02-PRD.md#58-factory--result--error). The `MODE_MISMATCH` code already exists in the `HarnessError.code` discriminator union at `02-PRD.md:653` and `05-TECHNICAL-SPEC.md:506` — no DDL extension required. The Zod-side superRefine at `05-TECHNICAL-SPEC.md:248-273` enforces the same `mode` ↔ `requiresHarnessExecute` parity that the prose codifies, so `ToolManifestEntrySchema.parse(entry)` at boot is the deterministic gate. (this PR) |
| CV-3 | [09-CV](./09-CV-vocabulary-review.md#f-3) | CHALLENGE | Add `roles.yaml`-as-disambiguator paragraph to PRD § 3.5 (events-mcp) | fixed | Added the disambiguator paragraph at `02-PRD.md:396-413` immediately after the existing § 3.5 events-mcp closing prose ("`events-mcp` consumes from a queue sharded by `primaryObject.id`...") and before § 3.6. The paragraph names the two tools (`show-activity-on-this-claim` in `claimcenter-mcp` for adjuster-facing access; `find-events-for-claim` in `events-mcp` for integration-engineer / SRE / compliance / audit access), notes they read the same underlying events store but answer different questions in different vocabulary, and explicitly states the agent never has both tools simultaneously visible for a single actor: the adjuster role's [§ 6.2](../02-PRD.md#62-rolesyaml--role--tool--mode-permission-matrix) `roles.yaml` catalog scope lists `claimcenter-mcp.show-activity-on-this-claim` only; integration-engineer / compliance / audit roles list `events-mcp.find-events-for-claim` only. Cross-cites [D-016](../004-DR-DEC-architecture-decisions.md#d-016--show-activity-on-this-claim-is-a-new-tool-not-a-rename) (the new-tool decision rationale), CV-3 inline, and [F-RT-7.1](./02-RED-TEAM-PANEL.md) (the red-team finding the disambiguator closes). Vocabulary stays the contract; `roles.yaml` is the per-actor scope filter that prevents Claude from picking inconsistently. (this PR) |
| CV-6 | [09-CV](./09-CV-vocabulary-review.md#f-6) | CHALLENGE | Add tool-description-shape rule (`<question> · <when-to-use>`) to PRD § 3.0 | fixed | Added the description-shape rule as a dedicated subsection at `02-PRD.md:187-207` ("Description-shape rule (CV-6)") inside the new § 3.0 contract. Every tool's `vocabulary` object carries `question` (the operator's literal phrasing, ≤10 words — example `"What's on my plate?"`) and `whenToUse` (the operational moment, ≤25 words — example `"Daily morning queue review for line underwriters."`). The MCP-catalog `description` is computed from these via `formatDescription({question, whenToUse})` → ``${question} · ${whenToUse}`` (the `formatDescription()` helper is already shipping at `servers/policycenter-mcp/src/manifest.ts:228-233` and cited as the reference implementation in PRD § 3.0). Authoring `description` by hand is forbidden — `audit-harness vocab-lint` rule 7 flags any tool whose `description !== formatDescription(tool.vocabulary)`. The Zod boundary fires the same invariant via the `superRefine` block at `05-TECHNICAL-SPEC.md:265-273` (boot-time fail). Character-budget proxies (`question` ≤80 chars, `whenToUse` ≤160 chars) are encoded in `ToolVocabularySchema` at `05-TECHNICAL-SPEC.md:189-192` — these are heuristic word-count proxies; the human-readable word-count limits stay in PRD § 3.0 prose as the authoring guidance. Cross-cites [F-RT-2.2](./02-RED-TEAM-PANEL.md) (the red-team finding on within-server discoverability), [007 § 7](../007-DR-MEMO-carrier-vocabulary.md#7-recommendations-to-gw-12-prd-authors--encode-at-pr-review) (the 8-rule checklist), and the formatDescription reference implementation. (this PR) |

### Theme 2 — Audit-DB role separation runtime check

| ID | Memo | Severity | Title | Status | Rationale / PR |
|---|---|---|---|---|---|
| AR-7 | [03-AR](./03-AR-architecture-review.md#f-7) | CHALLENGE | Add E1 exit-criterion: testcontainers test asserts `audit_writer` cannot UPDATE/DELETE | fixed | Added a new top-level E1 exit-criterion bullet to `07-ROADMAP.md:56-71` (under "Done when") naming `packages/audit/tests/role-separation.test.ts` as the testcontainers boot+migrate+assert harness: connection assuming `audit_writer` succeeds on `INSERT INTO audit_entries` but `UPDATE` and `DELETE` fail with `permission denied for table audit_entries`; parallel assertion confirms `audit_reader` can `SELECT` but cannot `INSERT`. The bullet cross-cites AR-7, SA-3, and HR-2 inline so the audit linkage survives a future re-pass, and explicitly names [D-019](../004-DR-DEC-architecture-decisions.md#d-019--audit-chain-is-tamper-resistant-not-tamper-evident-against-a-compromised-harness-dba) as the decision the runtime check makes binding ("makes the D-019 tamper-resistance claim binding at runtime, not just policy prose"). Test runs in CI on every PR; without it, a future harness change that quietly broadens the runtime grant set silently re-creates the threat surface D-019 was scoped to defend against. (this PR) |
| SA-3 | [04-SA](./04-SA-security-review.md#f-3) | CHALLENGE | Specify operational identity for `audit_owner` in TECH-SPEC § 8.2 | fixed | Added a new § 8.2.1 "Postgres role separation — operational identity" subsection at `05-TECHNICAL-SPEC.md:1291-1332` directly under the audit hash-chain implementation contract. Specifies that `audit_owner` owns `audit_entries` + `audit_chain_heads` and runs `migrations/0001_init.sql` only via a dedicated CI job (`pnpm audit:migrate`) or out-of-band ops job, **never the runtime connection identity**; the credential lives in `runbook/secrets.prod.sops.yaml` (SOPS + age per repo `CLAUDE.md` § Stack and the rotation cadence in TECH-SPEC § 8.3) and is **never injected into MCP server or harness runtime envs**. For single-operator OSS deployments the operator drops `audit_owner` creds from shell history / env files before starting the harness; the `DATABASE_URL` carries only the `audit_writer` grant. `audit_writer` is the only runtime role used by `packages/audit/` and the AR-7 testcontainers test makes this constraint binding. `audit_reader` is documented as SELECT-only, used by `verifyChain()` in compliance jobs, never granted to the MCP runtime. The subsection cross-cites [D-019](../004-DR-DEC-architecture-decisions.md#d-019--audit-chain-is-tamper-resistant-not-tamper-evident-against-a-compromised-harness-dba), 04-SA F-3, and the AR-7 E1 exit-criterion link, plus restates the residual privileged-DBA risk as the trigger for E3+ KMS-signed external-commitment. (this PR) |
| HR-2 | [11-HR](./11-HR-harness-review.md#f-2) | (PASS w/cross-ref) | Endorse the role-separation test addition (cross-references AR-7 + SA-3) | accepted | Endorsement-only finding cross-referencing AR-7 (now `fixed` via the `07-ROADMAP.md:56-71` E1 exit-criterion addition) and SA-3 (now `fixed` via the `05-TECHNICAL-SPEC.md:1291-1332` § 8.2.1 operational-identity subsection). The harness-runtime-architect's exact recommendation reads "I endorse from this lane: without that E1-close test, the D-019 prose claim is paper, not runtime. Add it." Both required edits have landed; no standalone HR-2 edit is required. (this PR — verified via AR-7 + SA-3) |

### Theme 3 — Doc-set hygiene

| ID | Memo | Severity | Title | Status | Rationale / PR |
|---|---|---|---|---|---|
| DA-2 | [06-DA](./06-DA-docs-review.md#f-2) | NOTE→CHALLENGE | Normalize D-NNN anchors to full slug across blueprint set | accepted | Markdown anchors auto-generate from header text on GitHub, and inline `D-NNN` mentions in the blueprint render as plain text — both short-form (`#d-016`) and full-slug links resolve correctly today, so the doc set is not user-broken. The canonical anchor pattern for live HTML is the explicit `id="d-NNN-ref"` already shipped in `pages/index.html` per PR #70 (Decision References section). Forcing a full-slug rewrite across the markdown blueprint trades 15-20 min of churn for editorial consistency without changing rendered behavior; revisit when D-022+ lands and a fresh sweep is cheap. (this PR — accepted, no edit) |
| DA-3 | [06-DA](./06-DA-docs-review.md#f-3) | NOTE | Verify F-CON-001 fix landed (10-Epic → 11-Epic in repo CLAUDE.md) | accepted | Verified — repo `CLAUDE.md:162` reads `## 11-Epic Public Roadmap` and the table includes the E2.5 row; `README.md:27` reads "the public 11-epic roadmap (E3-E11+)" and `README.md:44` reads `## Roadmap (11 public epics)`. F-CON-001 fix has merged; no edit needed. (this PR — verified) |
| DA-4 | [06-DA](./06-DA-docs-review.md#f-4) | CHALLENGE | Add `000-docs/000-INDEX.md` flat index per F-CON-004 | fixed | The flat index already existed at `000-docs/000-INDEX.md` (created in an earlier pass); refreshed two stale lines in this PR — bumped the decision-log range from "D-001 through D-018" to "D-001 through D-021" reflecting D-019/D-020/D-021, and rewrote the `blueprint/audits/` description to enumerate the 3 pre-audit gauntlet passes, the staffed `03-AR..13-FC` panel, and the response register. See `000-docs/000-INDEX.md:16,48`. (this PR) |
| DA-5 | [06-DA](./06-DA-docs-review.md#f-5) | CHALLENGE | Add explicit `CONTRIBUTING.md` required-sections list to ROADMAP § E1 | fixed | Added a 9-item required-sections nested bullet under E1 exit criteria in `07-ROADMAP.md` (development setup, branch convention, PR convention, beads workflow link, agent specialist workflow, Gemini review requirement, DCO + license posture, carrier-vocabulary 8-rule checklist, audit-harness gates). The sub-bullet cites 06-DA F-5 inline so the audit linkage survives a future re-pass. See `07-ROADMAP.md:58-87` (the 9 numbered sub-bullets). (this PR) |
| DA-6 | [06-DA](./06-DA-docs-review.md#f-6) | CHALLENGE | Renumber `audits/README.md` to 03-AR..13-FC | accepted | Verified — `audits/README.md:9-12` already states the 11 memos landed at slots `03-AR..13-FC`, the numbering-convention table at `:23-28` documents the 00/01/02 pre-audit slots vs. 03–13 staffed-panel slots, and the auditor table at `:41-51` links each row to the actual on-disk file (`03-AR-architecture-review.md` through `13-FC-fact-check.md`). The README and the filesystem are in sync; no edit needed. (this PR — verified) |
| CC-1 | [12-CC](./12-CC-consistency-review.md#f-1) | PASS-followup | Verify F-CON-002 + F-CON-003 fixes merged | accepted | Verified — `README.md` no longer contains `propose-endorsement` (F-CON-002 fix landed; the README roadmap table uses the canonical D-016 forms). `07-ROADMAP.md:336,386,468,469` show the 5 D-016 narrative names with explicit `(canonical per [D-016]; formerly <old>)` parenthetical pointers per the F-CON-003 recommended pattern. Both fixes are merged; no edit needed. (this PR — verified) |
| CC-3 | [12-CC](./12-CC-consistency-review.md#f-3) | CHALLENGE | Verify F-CON-001 fix merged (cross-references DA-3) | accepted | Cross-references DA-3 above. Verified — repo `CLAUDE.md:162` and `README.md:27,44` all reflect the 11-epic roadmap with the E2.5 row included. (this PR — verified, see DA-3) |
| CC-4 | [12-CC](./12-CC-consistency-review.md#f-4) | CHALLENGE | D-021 sandbox-terminology normalization pass | fixed | Targeted normalization at the four cited locations: (1) `02-PRD.md:961-966` § 6.10 — replaced "Sandbox tenant URL pointing at Jeremy's sandbox (per `guidewire-adj` once GH #1 closes)" with a reference to dev-tier endpoints from the librarian KB + `smoke-reach.ts` per D-021. (2) `04-USER-JOURNEY.md:73` J-1 — reworded "sandbox tenant reachable per [D-008]" to "dev-tier Cloud API endpoints reachable with dev-tier OAuth credentials per [D-008] + [D-021]". (3) `04-USER-JOURNEY.md:729-735` J-6 step 1 — replaced "**sandbox-blocked** until `guidewire-adj` closes" with "**tenant-specific** — they resolve from the customer's Hub OIDC discovery document at onboarding time" + a parenthetical noting reachability is covered by `smoke-reach.ts`. (4) `07-ROADMAP.md:215-222` § E2.5 prereqs — replaced the `guidewire-adj`-keyed prereq with a `scripts/smoke-reach.ts` UWCenter aggregation reachability prereq citing D-021. Plus a meaning-preserving Phase 0 row update at `07-ROADMAP.md:20` marking the superseded sandbox-provisioning row with strikethrough + D-021 link. Generic "sandbox" usage tied to D-008 NO-MOCKS in `01-BUSINESS-CASE`, `03-ARCHITECTURE`, `05-TECHNICAL-SPEC`, and "PartnerConnect sandbox" (a Guidewire product surface name) are intentionally preserved — that usage is the legitimate isolated-tenant meaning. (this PR) |
| CC-7 | [12-CC](./12-CC-consistency-review.md#f-7) | CHALLENGE | Renumber `audits/README.md` (cross-references DA-6) | accepted | Cross-references DA-6 above. Verified — `audits/README.md` and the filesystem are in sync at `03-AR..13-FC`. (this PR — verified, see DA-6) |

### Theme 4 — Hardening edits

| ID | Memo | Severity | Title | Status | Rationale / PR |
|---|---|---|---|---|---|
| AR-4 | [03-AR](./03-AR-architecture-review.md#f-4) | CHALLENGE | Decide vendored-vs-published harness for cowork forks | accepted | Per the project-owner directive 2026-05-04, the cowork-fork-starter scope is dropped — this is an internal Guidewire MCP product, not a cohort template. The vendored-vs-published question presupposes cohort forks exist; with that scope removed, the question is moot. The harness still ships as `@intentsolutions/guidewire-harness` on npm for the SI / carrier integration audience per [D-003](../004-DR-DEC-architecture-decisions.md#d-003--harness-is-a-library--cli-not-an-mcp-server) — that's the only consumer. (this PR — accepted, no edit) |
| SA-2 | [04-SA](./04-SA-security-review.md#f-2) | CHALLENGE | Add revocation-latency trade-off + `auth.yaml.oauth.introspect` field | fixed | Added `oauth.introspect` (default `false`; when `true`, RFC 7662 token introspection adds ~30ms per call) and tightened the `oauth.token_lifetime_seconds` row to cite the trade-off explicitly in `02-PRD.md` § 6.1 (`02-PRD.md:917-918`). Then added a new § 8.1.1 "Revocation latency (per SA-2)" subsection at `05-TECHNICAL-SPEC.md:1393+` with a two-row trade-off table — (a) reduce `oauth.token_lifetime_seconds` (≈6× refresh load) and (b) `oauth.introspect: true` (~30ms per-call overhead) — explicitly framed as operator-driven, not OSS-defaulted. Closes red-team [F-RT-5.3](./02-RED-TEAM-PANEL.md). The OSS still ships the bounded-by-token-lifetime default (60-min worst-case), but the carrier-side levers are surfaced and machine-validated via the extended `auth.yaml` schema. (this PR) |
| SA-5 | [04-SA](./04-SA-security-review.md#f-5) | CHALLENGE | Add approval-timeout signal-availability commitment to TECH-SPEC § 4.5 | fixed | Added a new § 4.5.1 "Approval timeout (per SA-5 + HR-6)" subsection at `05-TECHNICAL-SPEC.md` directly after the AppError + Sentry tagging section. Codifies the **signal availability** commitment — pino WARN log with full structured fields, typed `AppError({ code: 'APPROVAL_TIMEOUT', tool_name, mode })` via `refuseApprovalTimeout(ctx)`, Sentry fingerprint `[APPROVAL_TIMEOUT, tool_name, mode]`, plus the `approval.decided` audit row with `outcome: expired` written *before* the AppError raises — without committing the OSS to delivery (Slack, PagerDuty, ntfy, email all stay carrier-wired per § 4.9). Closes red-team [F-RT-5.2](./02-RED-TEAM-PANEL.md), SA-5, and HR-6 in one edit; HR-6 row below cross-references this. (this PR) |
| SA-6 | [04-SA](./04-SA-security-review.md#f-6) | NOTE | Add `lob_class: health` field + Zod refinement enforcing BAA carve | fixed | Added an optional `lob_class: health \| non_health` field (default `non_health`) to `lob.yaml` schema in `02-PRD.md` § 6.3 (`02-PRD.md:957`), plus a normative paragraph naming the runtime check: the `packages/schemas/` profile validator's `superRefine` raises `HarnessError({ code: 'BAA_GATE_MISSING' })` at boot if any LOB carries `lob_class: health` while `pii-policy.yaml.baa_required: false`. The carve transitions from policy prose ("SHOULD set baa_required: true") to a machine-validated boot-time check, exactly the gap [04-SA F-6](./04-SA-security-review.md#f-6) and [08-MS F-6](./08-MS-mcp-safety-review.md#f-6) named. Cross-referenced from MS-6 (which lands the same edit from the mcp-safety lane). (this PR — see also MS-6) |
| BA-4 | [05-BA](./05-BA-backend-review.md#f-4) | CHALLENGE | Add per-tenant OAuth client lifecycle subsection to TECH-SPEC § 8.1 | fixed | Added a new § 8.1.2 "Per-tenant OAuth client lifecycle (per BA-4)" subsection at `05-TECHNICAL-SPEC.md` after the SA-2 revocation-latency subsection. Specifies (1) cache key `(tenantId, oidcDiscoveryUrl, clientId)` with explicit cross-tenant rejection; (2) cache invalidation on profile-reload events with LRU bound (default 100, configurable via `auth.yaml.client_cache.max_entries`); (3) JWKS refresh — foreground on `kid` miss, background at 80% TTL, non-fatal failures emit pino WARN + Sentry tag `auth.jwks_refresh_failed`; (4) per-actor token cache keyed by `(tenantId, actorId)` with LRU bound 10000 (configurable via `auth.yaml.token_cache.max_entries`); (5) JWKS-rotation drain pattern with bounded 30s in-flight window. The lifecycle properties live in § 8 (Security posture) rather than § 2 (per-package contracts) per the BA-4 recommendation that this is auth-policy, not just package topology. Closes BA-4. (this PR) |
| BZ-2 | [07-BZ](./07-BZ-business-review.md#f-2) | accepted | Address Persona-1 cost-bounding question (author small/med/large table OR accept out-of-scope) | accepted | Per the project-owner directive 2026-05-04: cost is engagement-specific, not a published list price. Adding fabricated tier-cost numbers to the BUSINESS-CASE would mislead carriers reading the artifact and undermine the lead-magnet thesis. The accept-side option from [07-BZ F-2](./07-BZ-business-review.md#f-2) is the right call — declared explicitly via a new bullet under `01-BUSINESS-CASE.md:370-373` § 8 ("What this document doesn't decide") with a 6-line rationale that names BZ-2, makes the silence audible ("This is the public stance, not silence"), and frames cost-bounding as a scoping conversation in the first inbound call. (this PR — accepted with explicit declaration) |
| BZ-3 | [07-BZ](./07-BZ-business-review.md#f-3) | CHALLENGE | Land soft fork-license note for cowork-fork-vs-SI margin | accepted | Per the project-owner directive 2026-05-04, the cowork-fork narrative is dropped (see AR-4) — this is an internal product, not a cohort template. The repo is Apache-2.0 (already declared in LICENSE + README), which is the only license clarification needed. The "soft fork-license note for cowork-fork-vs-SI margin" question presupposes the cowork-fork audience exists; with that scope dropped, the question doesn't apply. (this PR — accepted, no edit) |
| MS-6 | [08-MS](./08-MS-mcp-safety-review.md#f-6) | CHALLENGE | Add `lob_class: health` + Zod refinement (cross-references SA-6) | fixed | Cross-references SA-6 above. The `lob_class: health \| non_health` field on `lob.yaml` (PRD § 6.3, `02-PRD.md:957`) plus the `packages/schemas/` `superRefine` rule raising `HarnessError({ code: 'BAA_GATE_MISSING' })` at boot if any LOB carries `lob_class: health` while `pii-policy.yaml.baa_required: false` is the runtime check the mcp-safety-reviewer lane endorsed. The MS-6 finding's exact recommendation — "Endorse `security-auditor` F-6 from this lane" — is satisfied by the SA-6 edit; one edit covers both rows. (this PR — see SA-6) |
| MS-7 | [08-MS](./08-MS-mcp-safety-review.md#f-7) | NOTE | Clarify refusal ordering for read-only tools in PRD § 4.2 | fixed | Added a new "Refusal ordering for read-only tools (per MS-7)" subsection at `02-PRD.md` § 4.2 with a two-row table separating (a) pre-plan refusals — `auth_expired`, `sandbox_unreachable`, `tenant_mismatch`, `actor_unresolved` (one short-circuited audit row, no `policy.evaluate()` call) from (b) post-plan refusals — `profile_policy_violation`, `profile_incomplete_for_this_carrier`, `pii_redaction_failure_in_critical_path` (two rows: `plan.created` then `policy.decided` with `outcome: 'deny'`). Makes the read-side exfil-detection audit pattern reproducible in tests — class (a) is infrastructure-detected, class (b) is policy-detected. NOTE-tier; closes MS-7's "slightly underspecified" flag without changing semantics. (this PR) |
| CV-4 | [09-CV](./09-CV-vocabulary-review.md#f-4) | CHALLENGE | Add "waiting on me" projection note to PRD § 3.1.1 | fixed | Added a new "'Waiting on me' projection (per CV-4)" subsection inside `02-PRD.md` § 3.1.1 directly after the ⚠ tools paragraph. Names the OSS demo's projection (`assignedToMe=true`, single Boolean filter — the simplest defensible projection); enumerates the typical carrier composite (`assignedToMe=true OR referredTo=me OR needsApprovalFromMe=true`); points carriers at `roles.yaml` per-role bindings (already exists) + a future `tool-projections.yaml` for projection customization. Frames the contract: vocabulary is the contract, projection is the customization. Closes red-team [F-RT-2.3](./02-RED-TEAM-PANEL.md) and CV-4 in the right doc. (this PR) |
| GA-3 | [10-GA](./10-GA-guidewire-api-review.md#f-3) | CHALLENGE | Add admin-scope OAuth threat-model row + `oauth_scope` audit field | fixed | Two changes in one row. (1) Threat-model row added to `05-TECHNICAL-SPEC.md` § 8.5 immediately after the "Compromised agent host" row, naming the admin-scope OAuth surface (commission reads, etc.) as harness-scope-filtered (not Guidewire-scope-filtered) and codifying the mitigation — `roles.yaml` boot validation refuses producer-tier roles bound to non-`producerCode`-scopable endpoints, plus per-call `oauth_scope` recording. (2) Added optional `oauthScope` field to the `AuditEntry` interface in both `02-PRD.md` § 5.5 and `05-TECHNICAL-SPEC.md` § 3.5 with a new `OAuthScope = 'read' \| 'write' \| 'admin' \| 'producer'` type — every admin-scope call writes a distinct audit row so a compromised harness cannot quietly broaden access without a chain-visible trail. Closes red-team [F-RT-4.2](./02-RED-TEAM-PANEL.md). The shipped E3 schema at `packages/schemas/src/harness/audit.ts` will need a follow-up bead to extend `AuditEntrySchema` with the `oauthScope` field (currently nine fields shipped; this would be the tenth — `oauthScope` is optional for backward-compat). (this PR) |
| GA-5 | [10-GA](./10-GA-guidewire-api-review.md#f-5) | NOTE | Add `address_shape` block to PRD § 6.6 | accepted | NOTE-tier. The Address-shape gotcha (per 008 § 11) is real, and `field-aliases.yaml` already declares the right structure ("declare per profile") — but committing to a specific `address_shape: { shape, pii_classification, fields }` schema in PRD § 6.6 *before* the first integration engagement risks freezing a shape that doesn't match what real carrier Swaggers emit. The librarian KB doesn't carry an authoritative public Address schema (Account.contactInfo[*].address structure varies per carrier), so the right authoring move is to defer the `address_shape` block formalization to E4 profile-template work, where the first inbound carrier's tenant Swagger drives the schema. The `008 § 11` warning ("Address.street1 assumption is WRONG") is captured in the existing `field-aliases.yaml` § 6.6 prose. Per the NOTE-tier guidance — small future tweak that's `accepted` rather than `fixed`. (this PR — accepted with rationale) |
| GA-6 | [10-GA](./10-GA-guidewire-api-review.md#f-6) | CHALLENGE | Add read-after-write `confirmWrite()` to PRD § 5.4 + ARCHITECTURE § 6 + TECH-SPEC § 3 | fixed | Three edits, one logical change. (1) **PRD § 5.4** — full contract at a new "Read-after-write consistency: `confirmWrite()` (per GA-6)" subsection with a three-row strategy table: (a) `trust_202` (OSS demo default, ~0 added latency), (b) `poll_async_job` (poll `/async/v1/jobs/{id}` to terminal), (c) `wait_for_app_event` (match by `primaryObject.id` per [D-004](../004-DR-DEC-architecture-decisions.md#d-004--app-events-shard-by-primaryobjectid)). Strategy is profile-level via `profile.yaml.write_confirmation.strategy`, NOT per-tool. (2) **ARCHITECTURE § 6** — failure-mode table row "Stale read after write" with detection at L4 (Cloud API 202 + Async job ID), behavior referencing `confirmWrite(plan, opts)` per profile strategy, and recovery semantics per strategy. (3) **TECH-SPEC § 3.4** — TS interface signature for `confirmWrite(plan, ConfirmWriteOptions)` with `WriteConfirmStrategy` union, `ConfirmWriteOptions` carrying `maxWaitMs` / `asyncJobId` / `expectedEvent`, and `ConfirmWriteResult` carrying `outcome: 'confirmed' \| 'timed_out' \| 'failed'` plus evidence. Closes 008 § 9 and GA-6. (this PR) |
| HR-3 | [11-HR](./11-HR-harness-review.md#f-3) | CHALLENGE | Add `idempotency.pruned` event type + TTL story | fixed | Two changes. (1) Added `'idempotency.pruned'` to the `AuditEventType` union in both `02-PRD.md` § 5.5 and `05-TECHNICAL-SPEC.md` § 3.5 (and inline-commented as the maintenance-event slot per HR-3). (2) Added a new "Idempotency-key TTL + `idempotency.pruned` (per HR-3)" subsection inside `02-PRD.md` § 5.4 after the replay short-circuit narrative — the `gwh1:` TTL is profile-configured (default 30 days; `idempotency.retention_days`); pruning emits an `idempotency.pruned` event carrying the count and the prune-window boundary; harness-side TTL is independent of any Guidewire-side TTL on `GW-DBTransaction-ID` (which resolves at first integration engagement per [D-021](../004-DR-DEC-architecture-decisions.md#d-021--terminology-fix-sandbox-meant-guidewire-isolated-tenant-what-we-actually-need-is-dev-tier-credentials--real-endpoints)). The shipped E3 schema at `packages/schemas/src/harness/audit.ts` currently ships nine event types; the new tenth type (`idempotency.pruned`) will need a follow-up bead to extend `AuditEventTypeSchema` when the harness adds the prune job. The blueprint contract is the source of truth; the schema package follows. (this PR + follow-up bead for schema extension) |
| HR-4 | [11-HR](./11-HR-harness-review.md#f-4) | CHALLENGE | Extend TECH-SPEC § 8.2 with `approvals` table DDL | fixed | Added a new § 8.2.0 "`approvals` table DDL (per HR-4)" subsection in `05-TECHNICAL-SPEC.md` directly before the existing § 8.2.1 role-separation subsection. Carries the full DDL — `approval_id` (sha256(planId + nonce)) PRIMARY KEY, `tenant_id`, `plan_id`, `decision_id`, `state` (pending / approved / denied / expired / cancelled), timestamps, `approver_votes JSONB`, with `UNIQUE (tenant_id, plan_id)` and the partial index `approvals_pending_idx ON (tenant_id, state) WHERE state = 'pending'` for the CLI's `approve` list + harness `wait()` poll hot path. The `approvals` table is owned by `audit_owner` (same role separation as `audit_entries`); runtime grants are `audit_writer: INSERT, UPDATE` (state transitions are idempotent updates) and `audit_reader: SELECT` (compliance-job replay). Updated § 8.2.1 to enumerate `approvals` alongside `audit_entries` + `audit_chain_heads` in the role-separation surface. The shipped `packages/audit/migrations/0001_init.sql` currently ships only the audit-chain DDL; a follow-up bead will extend the migration to include the `approvals` table when E3 wires up the approval state machine. The blueprint contract is the source of truth; the migration follows. (this PR + follow-up bead for migration extension) |

### Future-tool candidates (not blueprint edits — captured for E9+)

| ID | Memo | Tool | Status |
|---|---|---|---|
| CV-5-followup | [09-CV](./09-CV-vocabulary-review.md#f-5) | `whats-my-contract-net` (producer commission − chargebacks − overrides − sub-broker shares) for E9 expansion | future |

### Notes triaged but not requiring rows here

NOTEs that don't need explicit response rows because they are
self-resolving observability / hygiene improvements at later
epics (rather than blueprint edits): AR-3 (build-order CI
assertion at E1), AR-5 (cold-start posture documentation), BA-2
(`HarnessError.code` extension policy), BA-5 (events queue
backpressure), BA-7 (`sentry-bead-bridge` dependency direction),
DA-7 (link-checker CI for librarian KB at E1+), HR-5
(chain-head latency observability), CC-2 (drop "39 tools" count
in ARCHITECTURE § 1.1), FC-6 (ProNavigator date precision).

GW-1.9 may roll any of these into the response set if the author
chooses; otherwise they remain `panel-noted` and are addressed
opportunistically as code lands.

---

## Re-pass requirement (per `audits/README.md` gate criteria)

After GW-1.9 lands the response edits, the **single re-pass** is:
1. `architect-reviewer` re-walks the layered model + epic
   dependency graph + boundary rules to confirm the manifest-
   schema + role-separation + cowork-harness-upgrade decisions
   land cleanly.
2. `article-consistency-checker` re-walks the doc set to
   confirm the doc-hygiene cluster (anchor normalization,
   sandbox terminology, `audits/README.md` renumber, epic
   count, F-CON-001/002/003 fixes) is internally consistent.

If both re-passes return clean, GW-1.9 closes and E1
(`guidewire-4rd` / GH #3) unblocks.

jeremylongshore.com made me do it
  -claude
intentsolutions.io
