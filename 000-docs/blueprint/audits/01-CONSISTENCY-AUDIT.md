# 01 — Cross-document consistency audit (pre-staffed-panel gate)

**Filed:** 2026-05-04
**Scope:** all blueprint + supporting docs in `000-docs/` + `README.md` + `CLAUDE.md` + `.github/workflows/`
**Tool:** `/validate-consistency` skill (engineering project type, "code is truth" hierarchy applied)
**Why this audit exists:** per project memory `project_guidewire_post_blueprint_validation.md`, full `/validate-consistency` runs after blueprint authoring completes and before the GW-1.8 staffed audit panel opens — to surface drift cheaply via deterministic checks before specialist auditors burn cycles on it.

---

## Project type detection

**Engineering repo (paperwork-first phase).** Markers found: `package.json` (template scaffold), `tests/` directory, `.github/workflows/` (5 workflows), `Makefile`-style behavior via pnpm scripts. No `lib/` / `src/` / `app/` yet — paperwork-first per [hard rule 1](../../CLAUDE.md). Source-of-truth hierarchy applied: **code is truth** (with the caveat that there's no production code yet, so "decision log + blueprint" stand in for code as the higher-authority artifact).

---

## Executive summary

| Severity | Count | Notes |
|---|---|---|
| 🔴 Critical | 0 | Nothing fully blocks the staffed audit panel |
| 🟡 Warning | 4 | Drift items to clean before staffed panel opens |
| 🔵 Info | 3 | Style / under-documented items |
| **Total** | **7** | |

Verdict: **proceed to multi-persona red-team panel and GW-1.8 staffed panel after fixing the 4 warnings.** None of the warnings is structural or load-bearing — they are vestigial pre-D-016 tool names + epic-count drift that should be cleaned for hygiene before specialist auditors review.

---

## Findings by category

### Category 1 — Status drift

**F-CON-001 — 🟡 Warning — Epic count drifts across README / CLAUDE.md / 00-MASTER**

- **What main blueprint says:** 11 epics (E1, E2, **E2.5**, E3-E10, E11+) per `000-docs/blueprint/00-MASTER-BLUEPRINT.md:82` and `000-docs/blueprint/07-ROADMAP.md` table.
- **What `README.md:40` says:** `## Roadmap (11 public epics)` — header agrees with master, but the table below it lists only E1-E10 + E11+ (no E2.5).
- **What `CLAUDE.md:157` says:** `## 10-Epic Public Roadmap` — title disagrees with reality post-D-017.
- **Auto-fixable:** Yes. Sync README + CLAUDE.md headers + tables to reflect E2.5 addition.

### Category 2 — API/Interface drift

**No issues found** — all TS contracts in 02-PRD § 5 / 05-TECHNICAL-SPEC § 3 / 03-ARCHITECTURE § 5.3 / 009-DR-MEMO § 4 are mutually consistent post-librarian-audit fixes (PR #44).

### Category 3 — Capability/Behavior drift

**F-CON-002 — 🟡 Warning — README lists pre-D-016 tool name `propose-endorsement` in roadmap table**

- **Canonical:** `draft-endorsement` per [D-016](../../004-DR-DEC-architecture-decisions.md#d-016).
- **README `:55`:** `| E5 | Drafting tools (`draft-referral-note`, `propose-endorsement`) | planned |`
- **Auto-fixable:** Yes (single-string replace).

### Category 4 — CI/Validation drift

**No issues found** — README install commands (`pnpm install && pnpm test`) match `.github/workflows/ci.yml`. Five workflows present (ci, deploy-pages, link-check, release, secrets-scan) — all referenced from CLAUDE.md or README. CI gates for the in-repo `@intentsolutions/audit-harness` are out-of-scope for paperwork phase (lands in E1 per 05-TECHNICAL-SPEC § 6.7).

### Category 5 — Planning-vs-implementation confusion

**No issues found** — there is no `planning/` directory; all planning lives in `000-docs/blueprint/` and is correctly labeled as paperwork pending E1 implementation.

### Category 6 — Cross-doc contradiction

**F-CON-003 — 🟡 Warning — Pre-D-016 tool names in 07-ROADMAP narrative (lines 321, 371, 453, 454, 475)**

- 07-ROADMAP table at the top correctly lists epics; but per-epic narrative bodies still mention `propose-endorsement`, `whats-the-payment-status`, `find-billing-issues-for-this-policy`, `replay-event` (pre-D-016 forms) outside of clearly-marked "deprecated names" contexts.
- **Canonical:** D-016 forms.
- **Auto-fixable:** Yes (5 occurrences to update with parenthetical "(formerly `<old>`)" pointers per the established pattern in 006/008 memos).

### Category 7 — Index/reference drift

**F-CON-004 — 🟡 Warning — `000-docs/000-INDEX.md` does not exist**

- **What docs reference it:** nothing critical (the project navigates via 00-MASTER-BLUEPRINT instead).
- **Severity:** Warning only — for IS doc-filing-standard compliance, an `000-INDEX.md` is conventional but not load-bearing here because 00-MASTER serves the same purpose. Either add a stub `000-INDEX.md` pointing at 00-MASTER, or document the exception in CLAUDE.md.
- **Auto-fixable:** Yes (small index file).

**F-CON-005 — 🔵 Info — Some inline anchor links in 06-STATUS use full PR URLs vs relative anchor links**

- 06-STATUS uses absolute GitHub URLs for PR references; other blueprint docs use relative paths for in-repo cross-refs and absolute URLs only for external resources. Style-only.
- **Auto-fixable:** Yes, but low priority.

**F-CON-006 — 🔵 Info — `08-COWORK-CURRICULUM.md` is a skeleton**

- Per scope call 2026-05-04, cowork curriculum is deferred. The skeleton remains in place. 00-MASTER and 06-STATUS both note the deferral. Not drift; flagging for awareness.

**F-CON-007 — 🔵 Info — Some D-016 rename pointers in 008/006 memos use shortened anchor `#d-016` vs the full anchor**

- 02-PRD uses `[D-016](../004-DR-DEC-architecture-decisions.md#d-016--tool-vocabulary-canonical-names-carrier-vocabulary-curator-renames--adjuster-split)` (full slug); some memo edits use `[D-016](../004-DR-DEC-architecture-decisions.md#d-016)` (short form). Both work in GitHub's anchor resolution but full slug is preferred for explicitness.

---

## Priority actions (in order)

1. **F-CON-001** — Sync README + CLAUDE.md epic counts/tables to reflect E2.5. ~10 min.
2. **F-CON-002** — Single-string replace `propose-endorsement` → `draft-endorsement` in README:55. ~30 sec.
3. **F-CON-003** — Update 5 pre-D-016 mentions in 07-ROADMAP narrative with `(formerly ...)` pointers. ~5 min.
4. **F-CON-004** — Decide: stub `000-INDEX.md` or document the exception. ~5 min.
5. **F-CON-005, F-CON-006, F-CON-007** — Info-only; defer.

After F-CON-001 through F-CON-004 are merged, the blueprint is ready for the multi-persona red-team panel + GW-1.8 staffed audit.

---

## Cross-references

- Skill: `/validate-consistency` at `~/.claude/skills/validate-consistency/`
- Project memory: `project_guidewire_post_blueprint_validation.md` (the gate that triggered this audit)
- Librarian audit (sibling): [`./00-LIBRARIAN-CITATION-AUDIT.md`](./00-LIBRARIAN-CITATION-AUDIT.md)
- Decision log: [`../../004-DR-DEC-architecture-decisions.md`](../../004-DR-DEC-architecture-decisions.md) (D-016 is the canonical-name decision)
- Master blueprint: [`../00-MASTER-BLUEPRINT.md`](../00-MASTER-BLUEPRINT.md)
