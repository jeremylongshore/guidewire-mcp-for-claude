# Staffed Audit Panel — 11 auditors, 1 gate

> *Before any code is written in `servers/` or `packages/`, the entire
> blueprint paperwork set is reviewed by an 11-auditor staffed panel.
> E1 (`guidewire-4rd` / GH #3) is **blocked** until all FAILs are
> resolved or accepted in [`./00-AUDIT-RESPONSES.md`](./00-AUDIT-RESPONSES.md).*

**Status:** FILED — staffed audit panel ran 2026-05-04 and the
11 memos landed at slots `03-AR..13-FC` (slots `00`/`01`/`02`
were pre-allocated to the librarian / consistency / red-team
gauntlet that ran before this panel). Panel-summary +
response-stub register lives at
[`./00-AUDIT-RESPONSES.md`](./00-AUDIT-RESPONSES.md). GW-1.9
fills the response stubs + drives the
`architect-reviewer` + `article-consistency-checker` re-pass.

---

## Numbering convention

Three audit passes ran sequentially:

| Slot | Pass | Type |
|---|---|---|
| 00 | `00-LIBRARIAN-CITATION-AUDIT.md` | pre-audit gauntlet (citation coverage) |
| 01 | `01-CONSISTENCY-AUDIT.md` | pre-audit gauntlet (`/validate-consistency`) |
| 02 | `02-RED-TEAM-PANEL.md` | pre-audit gauntlet (multi-persona red team) |
| 03–13 | staffed-panel memos (the 11 below) | **GW-1.8 staffed panel** |

The staffed-panel slots start at `03-AR` because the pre-audit
gauntlet had already taken slots 00–02 by the time GW-1.8 ran.
The `XX` suffix in each filename is the auditor's two-letter
identifier (AR, SA, BA, DA, BZ, MS, CV, GA, HR, CC, FC).

---

## The 11 auditors

| # | Auditor | Type | Coverage | Memo file |
|---|---|---|---|---|
| 1 | `architect-reviewer` | existing IS agent | Architectural soundness, SOLID, layering, system boundaries | [`03-AR-architecture-review.md`](./03-AR-architecture-review.md) |
| 2 | `security-auditor` | existing IS agent | Auth model, audit chain integrity, hash-chain, secrets posture, BAA / PII surface | [`04-SA-security-review.md`](./04-SA-security-review.md) |
| 3 | `backend-architect` | existing IS agent | API contracts, MCP tool schemas, package boundaries, scaling | [`05-BA-backend-review.md`](./05-BA-backend-review.md) |
| 4 | `docs-architect` | existing IS agent | Blueprint document set completeness, navigability, consistency, OSS-contributor fitness | [`06-DA-docs-review.md`](./06-DA-docs-review.md) |
| 5 | `business-analyst` | existing IS agent | 4-audience model, commercial framing, OSS distribution thesis, KPIs | [`07-BZ-business-review.md`](./07-BZ-business-review.md) |
| 6 | `mcp-safety-reviewer` | **NEW** via `/agent-creator` | Per-tool blast radius, three-mode design, refusal scenarios, harness gating | [`08-MS-mcp-safety-review.md`](./08-MS-mcp-safety-review.md) |
| 7 | `carrier-vocabulary-curator` | **NEW** via `/agent-creator` | Tool-name authenticity (do operators actually say this?), missing carrier-vocabulary surface | [`09-CV-vocabulary-review.md`](./09-CV-vocabulary-review.md) |
| 8 | `guidewire-api-archaeologist` | **NEW** via `/agent-creator` | Cloud API mapping correctness, LOB / typelist / custom-entity assumptions, App Events / Integration Gateway integration | [`10-GA-guidewire-api-review.md`](./10-GA-guidewire-api-review.md) |
| 9 | `harness-runtime-architect` | **NEW** via `/agent-creator` | Harness library/CLI surface, plan/approval/audit/rollback semantics, evidence bundle format | [`11-HR-harness-review.md`](./11-HR-harness-review.md) |
| 10 | `article-consistency-checker` | existing IS agent | Cross-document consistency: PRD vs architecture vs roadmap vs diagram tell the same story | [`12-CC-consistency-review.md`](./12-CC-consistency-review.md) |
| 11 | `fact-checker` | existing IS agent | All cited Guidewire facts (ProNavigator dates, Cloud API claims, Palisades release contents) verified against authoritative sources | [`13-FC-fact-check.md`](./13-FC-fact-check.md) |

The 4 "NEW" agents (#6-#9) are also the **Phase 0 Day 3 design
specialists** — they file design memos in `000-docs/00N-DR-MEMO-*.md`
that feed the blueprint authoring (GW-1.2-1.7), then re-run as
auditors in GW-1.8 against the finished blueprint. Two passes, one
agent definition each.

### Support specialist (NOT an auditor — supports the panel)

A 5th specialist exists in `.claude/agents/` —
[`guidewire-reference-librarian`](../../../.claude/agents/guidewire-reference-librarian.md)
— who maintains the canonical map of public Guidewire docs at
[`000-docs/005-DR-REF-guidewire-public-resources.md`](../../005-DR-REF-guidewire-public-resources.md).
The librarian does NOT file an audit memo. It serves the 11
auditors above (especially #6 `mcp-safety-reviewer`, #7
`carrier-vocabulary-curator`, #8 `guidewire-api-archaeologist`, #9
`harness-runtime-architect`) by providing release-versioned URL
citations on demand. Use it any time you need to verify a Guidewire
claim or ground a design decision in published docs without sandbox
access.

---

## Memo file format

Each memo follows the same shape so they can be triaged together.

```markdown
# 0N-XX-<scope>-review.md

**Auditor:** <agent-name>
**Date:** YYYY-MM-DD
**Target:** which blueprint sections this auditor reviewed
**Scope:** what's in scope / out of scope for this memo

---

## Verdict

One of: PASS / PASS-WITH-NOTES / CHALLENGE / FAIL

## Findings

### F-1 — <short title>
- **Severity:** PASS / NOTE / CHALLENGE / FAIL
- **Section:** which blueprint file / section
- **Finding:** what the auditor found
- **Recommendation:** what should change (if anything)
- **Cite:** sources / evidence

### F-2 — ...

## Summary

Recommended actions, priority order.
```

### Severity levels

- **PASS** — section is good as written.
- **NOTE** — section is acceptable, but auditor recommends an
  improvement that does not block merge.
- **CHALLENGE** — auditor disagrees with a design choice. Must be
  resolved by either editing the blueprint OR explicitly accepting in
  `00-AUDIT-RESPONSES.md` with rationale.
- **FAIL** — section blocks public release. E1 cannot start until
  every FAIL is resolved (re-edit, no rejection-via-rationale).

---

## Gate criteria — when E1 unblocks

E1 (`guidewire-4rd` / GH #3) cannot start until:

- [ ] All 11 audit memos filed.
- [ ] Every PASS / NOTE / CHALLENGE / FAIL flag triaged.
- [ ] CHALLENGEs either resolved with blueprint edits OR explicitly
      accepted in `00-AUDIT-RESPONSES.md` with rationale.
- [ ] No FAIL flags open. (FAIL = blocks public release.)
- [ ] Updated blueprint re-reviewed by `architect-reviewer` +
      `article-consistency-checker` after edits land (single re-pass,
      not a full second round).

---

## Bead structure

- **GW-1.8** epic — "Staffed audit panel" — has 11 sub-beads, one
  per auditor. Each sub-bead closes when the corresponding memo
  file lands.
- **GW-1.9** — "Audit response + blueprint v1.0 sign-off" — closes
  when responses are filed and re-pass clears.
- **E1 (`guidewire-4rd`)** — `bd dep add` blocked-by `guidewire-9XX`
  (GW-1.9 bead).

(Sub-beads created when GW-1.8 starts.)
