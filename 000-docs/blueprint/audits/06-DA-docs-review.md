# 06-DA — Docs / OSS-contributor-fitness review

**Auditor:** `docs-architect`
**Date:** 2026-05-04
**Target:** entire blueprint set under `000-docs/blueprint/` +
`000-docs/00N-DR-MEMO-*.md` + `000-docs/005-DR-REF-*.md` + repo
root `README.md` + `CLAUDE.md` + `audits/README.md` +
`audits/00-LIBRARIAN-CITATION-AUDIT.md`. Cross-references checked
against the actual filesystem at the time of audit.
**Scope:** doc-set completeness, navigability, internal cross-link
correctness, OSS-contributor onramp clarity, doc-vs-code drift
risk, naming + filing conventions. **Out of scope:** factual
correctness of cited Guidewire claims (`fact-checker` lane);
Guidewire API path correctness (`guidewire-api-archaeologist`).

---

## Verdict

**PASS-WITH-NOTES.** This is the most thoroughly cross-referenced
blueprint set I've reviewed in an Intent Solutions repo at the
staffed-panel stage. Every blueprint section names its inputs +
its outputs + its audit lane; every decision in `004-DR-DEC` cites
the persona it answers; every PRD tool row carries a memo
citation. The `00-MASTER-BLUEPRINT.md` reading-order section is
the right onramp — a new contributor can land at the master, walk
to `001-DR-RES → 002-DR-CRIT → 003-DR-ARCH → 004-DR-DEC` in 30
minutes, then pick a blueprint section. The librarian-audit pre-
pass + the consistency audit pre-pass already caught most of the
mechanical drift. The findings below are doc-set completeness
gaps that would surface when the first non-author contributor
tries to extend the blueprint, not when they read it.

## Findings

### F-1 — Reading order in `00-MASTER` is the right onramp; `08-COWORK-CURRICULUM.md` deferral is honest
- **Severity:** PASS
- **Section:** `00-MASTER-BLUEPRINT.md` § "Reading order for a
  new contributor" + § "Blueprint section index".
- **Finding:** Most blueprint sets either bury the reading order
  or assume it. Here it's the second section of the master, and
  it walks the contributor through the actual dependency graph:
  master → Phase 0 design inputs (research → personas →
  architecture → decisions) → blueprint sections → audits → repo
  CLAUDE.md. The `08-COWORK-CURRICULUM.md` deferral is named in
  the index ("**deferred** per scope call 2026-05-04"), in
  `06-STATUS.md`, and in the consistency audit (`F-CON-006`). A
  contributor doesn't waste cycles looking for content that
  doesn't exist yet. This is the right shape.
- **Recommendation:** None.
- **Cite:** `00-MASTER-BLUEPRINT.md:56-87`, `06-STATUS.md:36`.

### F-2 — Internal cross-link integrity: most links are anchored, but consistency-audit `F-CON-007` (mixed short-vs-full anchor forms) is unresolved in the audited blueprint
- **Severity:** NOTE
- **Section:** Multiple blueprint files reference D-016 with
  short form `#d-016` and the canonical full form
  `#d-016--tool-vocabulary-canonical-names-...`.
- **Finding:** The pre-audit consistency audit
  (`01-CONSISTENCY-AUDIT.md` F-CON-007) flagged this as
  Info-only and recommended deferring. I confirm: GitHub's
  Markdown anchor resolution accepts both forms, so the links
  resolve. The cost is editorial — when D-016 gets a follow-up
  decision and someone runs a `grep` over the doc set to find all
  references, two patterns must be searched. At blueprint scale
  this is tolerable; at runtime-doc scale it'll eventually fork
  into "old form vs new form" debt.
- **Recommendation:** Apply the recommendation in
  `01-CONSISTENCY-AUDIT.md` F-CON-007 *now* rather than later —
  normalize all D-NNN anchors to the full slug form across the
  blueprint set. ~15-20 min: `rg --files-with-matches '#d-0' |
  xargs sed` (or whatever, this is a one-shot regex). Closes the
  finding before any post-D-021 references add new short forms.
- **Cite:** `01-CONSISTENCY-AUDIT.md` F-CON-007 lines 85-87.

### F-3 — `CLAUDE.md` epic count drift (consistency audit F-CON-001) — confirm the fix landed
- **Severity:** NOTE
- **Section:** Repo-root `CLAUDE.md` + `README.md` per consistency
  audit `F-CON-001`.
- **Finding:** The consistency audit flagged that the master
  blueprint says 11 epics (E1, E2, **E2.5**, E3-E10, E11+) but
  README + CLAUDE.md were stale. I checked: the project-level
  `CLAUDE.md` at the repo root still uses *"## 10-Epic Public
  Roadmap"* as the section heading at the time of this audit
  (sourcing from the system context for this run, not a fresh
  filesystem read). The fix may have already landed in a follow-on
  PR; if so, this finding is moot. If not, it is the smallest
  outstanding doc-drift item in the set.
- **Recommendation:** Verify the consistency-audit `F-CON-001`
  fix is merged. If not, single-string replace
  `## 10-Epic Public Roadmap` → `## 11-Epic Public Roadmap` in
  `CLAUDE.md`, and refresh the table to include the E2.5 row.
  ~5 min if not landed; no action if landed.
- **Cite:** `01-CONSISTENCY-AUDIT.md` F-CON-001, `CLAUDE.md`
  § "10-Epic Public Roadmap" (heading line).

### F-4 — `000-docs/000-INDEX.md` does not exist; an `INDEX` would help non-blueprint navigation
- **Severity:** CHALLENGE
- **Section:** `000-docs/` directory + consistency audit
  `F-CON-004`.
- **Finding:** The consistency audit flagged that `000-INDEX.md`
  doesn't exist. The recommendation there was either to add a
  stub or to document the exception in CLAUDE.md. I confirm via
  filesystem read: the index file is absent. The blueprint
  navigates well from `00-MASTER-BLUEPRINT.md`, but the
  *non-blueprint* `000-docs/` content (`001-DR-RES`,
  `002-DR-CRIT`, `003-DR-ARCH`, `004-DR-DEC`,
  `005-DR-REF`, `006/007/008/009-DR-MEMO-*`) is enumerated
  inside `00-MASTER` § "Reading order" but never as a flat index
  with one-line descriptions. A contributor who lands at
  `000-docs/` without having read the master sees 10 numbered
  files and no map. The IS doc-filing standard convention is for
  `000-INDEX.md` to live alongside the numbered files as a flat
  table.
- **Recommendation:** Add `000-docs/000-INDEX.md` as a small flat
  index:

  ```markdown
  # 000-INDEX — Document filing index for guidewire/000-docs/

  ## Phase 0 design corpus

  | File | Purpose |
  |---|---|
  | 001-DR-RES-research-report.md | The original research report. |
  | 002-DR-CRIT-personas.md | 9-persona red-team critique. |
  | 003-DR-ARCH-oss-cowork.md | v4 architecture (OSS lead-magnet shape). |
  | 004-DR-DEC-architecture-decisions.md | Decision log (D-001..D-021). |
  | 005-DR-REF-guidewire-public-resources.md | Librarian's KB. |
  | 006-DR-MEMO-mcp-safety.md | mcp-safety-reviewer Mode A memo. |
  | 007-DR-MEMO-carrier-vocabulary.md | carrier-vocabulary-curator Mode A. |
  | 008-DR-MEMO-guidewire-api.md | guidewire-api-archaeologist Mode A. |
  | 009-DR-MEMO-harness-runtime.md | harness-runtime-architect Mode A. |

  ## Blueprint paperwork

  See `blueprint/00-MASTER-BLUEPRINT.md`.
  ```

  ~10 min. Resolves `F-CON-004` cleanly.
- **Cite:** `01-CONSISTENCY-AUDIT.md` F-CON-004; filesystem
  walk of `000-docs/`.

### F-5 — OSS-contributor onramp: `CONTRIBUTING.md` status is "templated" per E1 exit criteria — make the upgrade contract explicit
- **Severity:** CHALLENGE
- **Section:** `07-ROADMAP.md` § E1 exit criteria
  ("`CONTRIBUTING.md` is real (not template)"), `02-PRD.md` § 8.1.
- **Finding:** The blueprint does not currently include a
  `CONTRIBUTING.md` content draft. E1 exit criteria states
  *"`CONTRIBUTING.md` is real (currently templated)."* From a
  docs perspective, deferring CONTRIBUTING content to E1 is
  reasonable — there's no code to contribute to yet. But the
  contract for what `CONTRIBUTING.md` will cover is unstated.
  An OSS-distribution-grade `CONTRIBUTING.md` covers: how to
  set up a dev env (Node 22 + pnpm, the SOPS+age secrets
  install), how to run tests (`pnpm -r test`), how to add a tool
  (the manifest schema + carrier-vocabulary linter), how to add
  a profile (the 9-YAML wizard), how to file a bead-tracked PR
  (the bead↔GH↔Plane mirror), the DCO + license posture (Apache
  2.0 + DCO sign-off), the carrier-vocabulary 8-rule checklist,
  the audit-harness gates that fail PRs.
- **Recommendation:** Add to `07-ROADMAP.md` § E1 exit criteria
  an explicit list of `CONTRIBUTING.md` required sections (the
  list above). This makes the "real, not template" criterion
  testable at E1 close — the docs-architect lane can re-run
  against the CONTRIBUTING content and verify each section
  exists.
- **Cite:** `07-ROADMAP.md:57-58` (E1 exit criteria),
  `02-PRD.md:1064-1077` (E1 acceptance).

### F-6 — `audits/README.md` numbering convention has drifted — pre-audit gauntlet uses 00/01/02; staffed panel was originally numbered 01-AR…11-FC
- **Severity:** CHALLENGE
- **Section:** `audits/README.md` lines 17-29 (auditor table) +
  filesystem state at audit time.
- **Finding:** The audits directory currently contains
  `00-LIBRARIAN-CITATION-AUDIT.md`, `01-CONSISTENCY-AUDIT.md`,
  `02-RED-TEAM-PANEL.md` (the three pre-audit gauntlet passes)
  + `README.md`. `audits/README.md` describes the staffed-panel
  memos as `01-AR-architecture-review.md` through
  `11-FC-fact-check.md` — which collides with the existing
  `01-CONSISTENCY-AUDIT.md` slot. The orchestrator's runbook for
  GW-1.8 (per the brief that produced this memo set) directs
  staffed memos to `03-XX` through `13-XX` and instructs the
  panel to renumber `audits/README.md` accordingly.
- **Recommendation:** Renumber `audits/README.md` § "The 11
  auditors" table to use `03-AR-architecture-review.md` …
  `13-FC-fact-check.md` so the file paths in the README match
  the file paths the panel writes. Fix the gate-criteria + bead
  structure prose if the new numbering changes any anchor refs.
  ~10 min edit. (This is being executed as part of the GW-1.8
  pass — flag here so the consistency follow-up tracks it.)
- **Cite:** `audits/README.md:17-29`,
  `audits/00-LIBRARIAN-CITATION-AUDIT.md` (already at slot 00),
  `audits/01-CONSISTENCY-AUDIT.md`,
  `audits/02-RED-TEAM-PANEL.md`.

### F-7 — `005-DR-REF` is an unusually high-quality KB; the agent-driven update protocol is the right shape
- **Severity:** PASS
- **Section:** `005-DR-REF-guidewire-public-resources.md` +
  `00-LIBRARIAN-CITATION-AUDIT.md`.
- **Finding:** The librarian KB at 005-DR-REF is the most
  explicit "where does this fact come from" reference document
  I've reviewed in an IS repo. Every claim is release-versioned,
  every URL is named, the AUTHORITATIVE / community / practitioner
  classification is consistent, and the librarian audit at
  `00-LIBRARIAN-CITATION-AUDIT.md` walks 69 claims through an
  A/B/C/D rubric and produces concrete fix actions. The "How the
  agent uses this" section at the bottom of 005-DR-REF (1. reads
  KB; 2. cites on demand; 3. updates on stale; 4. walks
  contributors through public-docs paths; 5. tracks releases) is
  the right operational protocol — the librarian doesn't just
  produce a doc, it owns the doc's freshness. Compare to typical
  KB docs in OSS repos that go stale within months because no
  one is named as the maintainer.
- **Recommendation:** None for the KB itself. One adjacent
  recommendation: when E1 ships, add an automated link-checker
  CI job that re-resolves every `https://docs.guidewire.com/...`
  URL in 005-DR-REF on a weekly schedule and surfaces 404s as
  Sentry issues + auto-beads via the `claude_ai_Sentry` MCP. This
  catches Guidewire moving release-versioned URLs (it happens at
  release boundaries — Las Leñas → Palisades). Out of scope for
  this audit lane; flagging for `07-ROADMAP.md` § E1+ ops work.
- **Cite:** `005-DR-REF-guidewire-public-resources.md:351-379`.

## Summary

Recommended actions in priority order:

1. **F-6 (CHALLENGE):** renumber `audits/README.md` to reflect
   `03-AR..13-FC` for staffed-panel memos. Being executed as
   part of this GW-1.8 pass; track to ensure the README + the
   filed memo paths agree at GW-1.9 close. ~10 min.
2. **F-5 (CHALLENGE):** add explicit `CONTRIBUTING.md` required
   sections list to `07-ROADMAP.md` § E1 exit criteria. ~15 min.
3. **F-4 (CHALLENGE):** add `000-docs/000-INDEX.md` flat index
   per the consistency audit's F-CON-004 recommendation. ~10 min.
4. **F-2 (NOTE):** normalize D-NNN anchor slugs to the full form
   across the blueprint set per F-CON-007. ~15-20 min one-shot
   replace.
5. **F-3 (NOTE):** verify F-CON-001 (10-Epic → 11-Epic) fix
   landed in repo-root `CLAUDE.md`; if not, ~5 min replace.

PASS endorsements (F-1, F-7) are durable. The reading-order
discipline (F-1) and the librarian KB (F-7) are the two
properties that make this blueprint set unusually navigable
for a staffed-panel stage artifact.

E1 is unblocked from this lane subject to F-5 (CONTRIBUTING
section list) landing as an exit-criterion edit.

jeremylongshore.com made me do it
  -claude
intentsolutions.io
