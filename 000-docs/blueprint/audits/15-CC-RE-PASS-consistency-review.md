# 15-CC-RE-PASS — article-consistency-checker post-GW-1.9 re-pass

**Filed:** 2026-05-05
**Status:** PASS-WITH-NOTES
**Inputs:** PRs #73, #74, #78, #80, #81; the post-triage blueprint set
at `000-docs/blueprint/`; the response register at
`000-docs/blueprint/audits/00-AUDIT-RESPONSES.md`; the live
`pages/index.html`.

---

## Summary verdict

The post-triage blueprint is internally consistent on the load-bearing
design contracts: the 25 CHALLENGE rows are all `fixed` or `accepted`,
zero `open` rows remain in the register, and the four cross-cutting
themes (manifest schema, audit-DB role separation, sandbox terminology,
hardening edits) are coherently resolved. Three consistency notes
require follow-up beads but none block E1 unblock: (1) the README
roadmap table omits E11+ while every other surface says "11-epic
roadmap"; (2) PRD § 7 and `08-COWORK-CURRICULUM.md` present cohort /
cowork-fork-starter as live scope while the response register explicitly
accepted that scope as dropped per project-owner directive 2026-05-04;
(3) three stale "sandbox" usages in the old isolated-tenant sense
survived the CC-4 normalization pass. CLAUDE.md carries a stale
in-session triage state pointer. None of these contradict the core
architecture or governance contracts.

---

## Walk

### Epic count alignment

The canonical ROADMAP.md header says "Public 11-epic roadmap" and its
epic table lists E1, E2, E2.5, E3-E10, E11+ (11 entries). The repo
CLAUDE.md `Where to look` table says "11-epic public roadmap." Both
align. The README `## What's next on the public roadmap` table,
however, stops at E10 — E11+ ("Publish to `claude-code-plugins-plus-
skills` marketplace") is absent. The README's section header does not
include the "11-epic" count claim, so the README does not directly
contradict itself, but it is out of sync with the ROADMAP.md source of
truth by one row. The DA-3/CC-3 acceptance in the register cited
`README.md:27` and `README.md:44` as containing explicit "11-epic"
language; the current README has neither of those strings at those line
numbers, suggesting the README was substantially updated after the
acceptance check was written. See F-CON-005 below.

### Tool catalog alignment

All five surfaces agree on the five v0.1.0 PolicyCenter tools and their
canonical names. The `servers/policycenter-mcp/src/tools/` directory
contains exactly five files:
`did-we-lose-this-account.ts`,
`find-submissions-waiting-on-me.ts`,
`pull-this-submission.ts`,
`show-policies-for-this-insured.ts`,
`summarize-this-submission.ts`.
The README "What ships v0.1.0" block, PRD § 3.1.1 tool table, ROADMAP
E2 exit criteria, and `pages/index.html` diagram all name the same five
tools with the same canonical kebab-case names. The `manifest.ts`
`formatDescription` helper returns `` `${question} · ${whenToUse}` ``
matching the PRD § 3.0 and TECH-SPEC § 3.0 specifications verbatim.
The `ToolManifestEntry` interface in `manifest.ts` and PRD § 3.0 are
structurally identical; the `EpicTag` union (`'E2' | 'E2.5' | 'E5' |
'E6' | 'E7' | 'E8' | 'E9' | 'E10'`) matches across PRD, TECH-SPEC, and
`manifest.ts`. This check is clean.

### Sandbox-terminology coverage post-Theme-4

The CC-4 fix (Theme 3) correctly normalized the four locations named in
the rationale: PRD § 6.10 now references dev-tier endpoints + D-021
explicitly (line 1263-1269); USER-JOURNEY J-1 and J-6 are updated;
ROADMAP E2.5 prereq is updated; the superseded Phase 0 sandbox-
provisioning row is struck. The `pages/index.html` Decision References
section correctly defines D-021 and uses "sandbox unreachable" only in
the `sandbox_unreachable` refusal-code sense (D-008 NO-MOCKS), which
the CC-4 rationale explicitly preserves. However three stale usages
survived the pass. PRD § 6.1 `auth.yaml` table at the
`oauth.token_endpoint` row still reads "resolvable via OIDC discovery
once sandbox lands (008 § 14 open question 3)" — the old isolated-
tenant sense. PRD § 6.0a line 1019 reads "Cowork-fork derivatives
inherit v1.0 by default" (cowork scope; adjacent to profile schema
versioning; not a sandbox issue but see cowork section below). The
`servers/policycenter-mcp/src/manifest.ts` `ToolContext.tenantId`
JSDoc comment reads `e.g. \`sandbox-jeremy-dev\`` — an explicit Jeremy-
controlled sandbox tenant example that D-021 superseded. See F-CON-006
and F-CON-007 below.

### Cowork-fork-starter scope drop

The response register (AR-4 rationale, BZ-3 rationale) explicitly
states: "the cowork-fork-starter scope is dropped — this is an internal
Guidewire MCP product, not a cohort template." Neither PRD § 7 nor
`08-COWORK-CURRICULUM.md` carries any deprecation marker, scope-dropped
note, or `[deprecated — see project-owner directive 2026-05-04]`
annotation. Both documents present cowork/cohort as live active scope
with no qualification. PRD § 7 "Cowork fork-starter contract" (lines
1276-1341) describes the `pnpm guidewire init <domain>` script in
detail; PRD § 8.4 acceptance criteria reference cohort-member
verification; PRD header tagline (line 4) says "cowork fork-starter —
the full product surface." `08-COWORK-CURRICULUM.md` header says "10-
epic roadmap" (also wrong — 11 epics) and presents a full cohort build-
along and fork curriculum as the active plan. ROADMAP § E4 "Done when"
criteria include the `templates/cowork-fork-starter/` directory and the
`pnpm guidewire init` demo path. The acceptance (AR-4, BZ-3) notes that
the follow-up work was "no edit" — meaning neither the register nor any
triage PR added the deprecation markers the register's own scope-drop
rationale implies are needed. This is the largest consistency gap in the
post-triage blueprint set. See F-CON-008 below.

### PRD § 3.0 Tool manifest vs shipped manifest.ts

The PRD § 3.0 `ToolManifestEntry` TypeScript interface and the
`manifest.ts` `ToolManifestEntry` interface match field-for-field. The
`formatDescription` reference implementation at `manifest.ts:228-233`
matches the PRD and TECH-SPEC description-shape rule. The one
terminology drift is temporal: `manifest.ts` header comment (lines 7-9,
74) says "GW-1.9 will codify the canonical shape" and "Anticipates
GW-1.9 promotion to `02-PRD § 3.0`" — but GW-1.9 closed with those
exact promotions landed. The forward-reference is now a false present-
tense claim ("will codify") for work that has been done. This is a
code-comment housekeeping note, not an architecture contradiction. See
F-CON-009 below.

### Audit register state

`grep "| open |"` returns zero rows. The GW-1.9 closure section at
register lines 121-167 correctly states "All 25 CHALLENGE rows: `fixed`
or `accepted` with rationale. Zero `open`." The Aggregate counts table
(FAILs: 0, CHALLENGEs: 25, NOTEs: 14, PASSes: 32, Total: 71) matches
the original panel filing — these are pre-triage snapshot counts, not
triage state, and they are not expected to change. The Verdict prose at
lines 72-79 reads "The panel passes the GW-1.8 gate. No FAILs were
filed" — correct for the original panel; the GW-1.9 closure addendum
(lines 121-167) correctly distinguishes the original panel verdict from
the triage completion state. One inaccuracy: the `Where to look` table
in `CLAUDE.md` at line 170 still reads "(Themes 2 + 3 closed; Themes 1
+ 4 remain)" — this was accurate mid-triage but is now stale. All four
themes are closed per the register. See F-CON-010 below.

---

## Findings

### F-CON-005 — NOTE
**README roadmap table omits E11+**
`README.md` "What's next on the public roadmap" table (lines 83-95)
lists E1 through E10 and stops. ROADMAP.md explicitly lists E11+
("Publish to `claude-code-plugins-plus-skills` marketplace") as the
11th epic in the "Public 11-epic roadmap" header. CLAUDE.md says
"11-epic public roadmap." The README table implies a 10-epic roadmap
by omission. Additionally, the DA-3 / CC-3 acceptance check claimed
verification at `README.md:27` ("the public 11-epic roadmap") and
`README.md:44` ("## Roadmap (11 public epics)") — neither string
exists at those line numbers in the current file, suggesting the
acceptance was checked against an older README version.
**Severity:** NOTE — the README is a reader-facing document but the
ROADMAP.md is the source of truth; the gap is a display omission, not
an architecture contradiction.
**Fix:** Add E11+ row to the README roadmap table. A single line: `|
E11+ | Publish to \`claude-code-plugins-plus-skills\` marketplace |
planned |`

### F-CON-006 — NOTE
**PRD § 6.1 auth.yaml table: "once sandbox lands" survives CC-4 pass**
`000-docs/blueprint/02-PRD.md` line 1029 (§ 6.1 `auth.yaml` table,
`oauth.token_endpoint` row) reads: "Per-tenant URL; resolvable via OIDC
discovery once sandbox lands (008 § 14 open question 3)." The phrase
"once sandbox lands" uses "sandbox" in the old isolated-tenant sense —
exactly the usage D-021 and the CC-4 fix were meant to normalize. The
CC-4 rationale named four fix locations (§ 6.10, J-1, J-6, ROADMAP E2.5
prereq) but did not include § 6.1.
**Severity:** NOTE — the auth.yaml table is read by carrier engineers
evaluating the profile schema; the stale phrasing implies Jeremy's
isolated tenant is still a prereq for token endpoint resolution when
D-021 replaced that dependency with OIDC discovery from the inbound
carrier's own Hub.
**Fix:** Rewrite the Notes cell to: "Per-tenant URL; typically the
inbound carrier's Hub OIDC discovery document resolves this at
onboarding time (008 § 14, D-021). For OSS demo use, supply the dev-
tier Hub token endpoint directly."

### F-CON-007 — NOTE
**manifest.ts ToolContext.tenantId JSDoc: "e.g. `sandbox-jeremy-dev`"**
`servers/policycenter-mcp/src/manifest.ts` line 188 reads: `Stable
tenant slug from \`auth.yaml\` (e.g. \`sandbox-jeremy-dev\`).` This
example explicitly uses Jeremy's old isolated sandbox tenant as the
illustrative value — the exact usage D-021 superseded. A carrier
reading the source code sees Jeremy's personal sandbox slug as the
canonical example tenant ID.
**Severity:** NOTE — it is a code comment, not a contract; it does not
affect runtime behavior.
**Fix:** Replace the example with a generic carrier slug, e.g.:
`(e.g. \`acme-insurance-pc-dev\`)`.

### F-CON-008 — CHALLENGE
**PRD § 7, ROADMAP § E4, and 08-COWORK-CURRICULUM.md present cowork
scope as live after the project-owner directive dropped it**
The response register (AR-4 rationale, BZ-3 rationale) both state
"the cowork-fork-starter scope is dropped — this is an internal
Guidewire MCP product, not a cohort template." Neither AR-4 nor BZ-3
specified a blueprint edit (both accepted as "no edit"), yet the
blueprint documents present cowork/cohort scope as fully live:

- `000-docs/blueprint/02-PRD.md` tagline (line 4): "cowork fork-starter
  — the full product surface for Guidewire MCP for Claude"
- `000-docs/blueprint/02-PRD.md` § 7 (lines 1276-1341): full "Cowork
  fork-starter contract" section with subsections 7.1-7.4, `pnpm
  guidewire init <domain>` script spec, rename table, and worked fork
  example
- `000-docs/blueprint/02-PRD.md` § 8.4 (lines 1450-1470): E4
  acceptance criteria referencing cohort-member verification
- `000-docs/blueprint/07-ROADMAP.md` E4 "Done when" (lines 351-355):
  "`templates/cowork-fork-starter/` exists with `pnpm guidewire init
  <domain>` script: copies + renames the canonical layout for a cohort
  member's domain"
- `000-docs/blueprint/07-ROADMAP.md` ROADMAP.md E2.5 prereq prose
  (line 269): "cowork-fork-template upgrade path"
- `000-docs/blueprint/08-COWORK-CURRICULUM.md`: entire document
  presents cohort build-along sessions, fork assignments, and cowork
  curriculum as the plan. Header says "10-epic roadmap" (also wrong —
  11 epics).

The project-owner directive is recorded in the register but is not
surfaced anywhere in the blueprint documents themselves. A reader of
the blueprint has no way to know the scope was dropped.
**Severity:** CHALLENGE — this is a direct contradiction between the
register's recorded project-owner directive and the blueprint documents.
Any carrier / SI reading the blueprint will treat the cowork surface as
a live product commitment.
**Fix (in a follow-up bead — not this PR):** Add `[deprecated per
project-owner directive 2026-05-04 — cowork-fork-starter scope dropped;
this repo is an internal Guidewire MCP product, not a cohort template.
See AR-4 + BZ-3 in audits/00-AUDIT-RESPONSES.md.]` at the top of PRD §
7, PRD § 8.4, ROADMAP E4 "Done when," and the entire
`08-COWORK-CURRICULUM.md`. The E4 "Done when" criteria should remove
the cowork-fork-starter bullet or mark it deferred. The PRD tagline at
line 4 should drop "cowork fork-starter."

### F-CON-009 — NOTE
**manifest.ts header comment: "GW-1.9 will codify" — stale forward
reference**
`servers/policycenter-mcp/src/manifest.ts` lines 7-9 read: "GW-1.9
will codify the canonical shape in the blueprint + Zod" and "GW-1.9 can
promote it without rework." Line 74 reads "Anticipates GW-1.9 promotion
to `02-PRD § 3.0` + a Zod schema in `05-TECHNICAL-SPEC § 3`." GW-1.9
has closed; PRD § 3.0 and TECH-SPEC § 3.0 both exist with the codified
schema. The file comment describes a future state that is now the
present state.
**Severity:** NOTE — code comment only; no runtime or contract impact.
**Fix:** Update header comment to read "GW-1.9 codified the canonical
shape in PRD § 3.0 + TECH-SPEC § 3.0. This file's interface matches
that canonical shape; when `packages/schemas/src/manifest/` ships in
E1, update the import and delete the inline interface."

### F-CON-010 — NOTE
**CLAUDE.md `Where to look` table: stale triage state pointer**
`CLAUDE.md` line 170 reads: "Audit response triage state |
`000-docs/blueprint/audits/00-AUDIT-RESPONSES.md` (Themes 2 + 3
closed; Themes 1 + 4 remain)". GW-1.9 closed all four themes. The
parenthetical is now incorrect and will mislead any session that reads
CLAUDE.md for triage state.
**Severity:** NOTE — CLAUDE.md context only; no blueprint contract
impact.
**Fix:** Update the parenthetical to "(all four themes closed — see GW-
1.9 closure section)".

---

## Verdict

PASS-WITH-NOTES. The post-triage blueprint is internally consistent on
every load-bearing contract (manifest schema, audit-DB role separation,
harness write gate, observability, D-021 terminology). One CHALLENGE
(F-CON-008, cowork scope contradiction) and four NOTEs require follow-
up beads; none block E1 unblock per the gate criteria.

jeremylongshore.com made me do it
  -claude
intentsolutions.io
