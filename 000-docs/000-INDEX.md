# 000-INDEX — Document index

> *Per IS doc-filing standard. The authoritative blueprint index lives at
> [`./blueprint/00-MASTER-BLUEPRINT.md`](./blueprint/00-MASTER-BLUEPRINT.md);
> this file is a flat enumerator for tooling that walks `000-docs/`.*

---

## Phase 0 inputs

| File | What |
|---|---|
| [`001-DR-RES-research-report.md`](./001-DR-RES-research-report.md) | Original research report — the `001-DR-RES-...` source |
| [`002-DR-CRIT-personas.md`](./002-DR-CRIT-personas.md) | 9-persona red-team critique that shaped v4 |
| [`003-DR-ARCH-oss-cowork.md`](./003-DR-ARCH-oss-cowork.md) | v4 architecture memo: OSS + cowork-fork model, 4 audiences, suite-cut MCP servers |
| [`004-DR-DEC-architecture-decisions.md`](./004-DR-DEC-architecture-decisions.md) | Decision log — D-001 through D-021 |

## Reference

| File | What |
|---|---|
| [`005-DR-REF-guidewire-public-resources.md`](./005-DR-REF-guidewire-public-resources.md) | Authoritative public Guidewire docs map (the `guidewire-reference-librarian` agent's KB) |

## Specialist memos (Phase 0 design panel)

| File | Lane |
|---|---|
| [`006-DR-MEMO-mcp-safety.md`](./006-DR-MEMO-mcp-safety.md) | Per-tool blast radius, three-mode design, refusal scenarios, harness gating |
| [`007-DR-MEMO-carrier-vocabulary.md`](./007-DR-MEMO-carrier-vocabulary.md) | Tool-name authenticity, missing carrier-vocabulary surface |
| [`008-DR-MEMO-guidewire-api.md`](./008-DR-MEMO-guidewire-api.md) | Cloud API mapping correctness, LOB/typelist/custom-entity assumptions, App Events vs polling |
| [`009-DR-MEMO-harness-runtime.md`](./009-DR-MEMO-harness-runtime.md) | Harness library/CLI surface, plan/policy/approval/execute/audit/rollback semantics |

## Master blueprint

| File | What |
|---|---|
| [`blueprint/00-MASTER-BLUEPRINT.md`](./blueprint/00-MASTER-BLUEPRINT.md) | Index + executive summary (canonical entry point) |
| [`blueprint/01-BUSINESS-CASE.md`](./blueprint/01-BUSINESS-CASE.md) | Lead-magnet thesis, 4 audiences, Persona-6 SI-partner answer |
| [`blueprint/02-PRD.md`](./blueprint/02-PRD.md) | Product spec — carrier-vocabulary tools, harness, profiles, three modes |
| [`blueprint/03-ARCHITECTURE.md`](./blueprint/03-ARCHITECTURE.md) | 5-layer system architecture + data planes + 3-mode flow |
| [`blueprint/04-USER-JOURNEY.md`](./blueprint/04-USER-JOURNEY.md) | 6 operator + cowork journeys |
| [`blueprint/05-TECHNICAL-SPEC.md`](./blueprint/05-TECHNICAL-SPEC.md) | Stack, contracts, observability, NO MOCKS, quality gates |
| [`blueprint/06-STATUS.md`](./blueprint/06-STATUS.md) | Live status snapshot |
| [`blueprint/07-ROADMAP.md`](./blueprint/07-ROADMAP.md) | 11 epics (E1–E10 + E11+) with E2.5 sub-epic |
| [`blueprint/08-COWORK-CURRICULUM.md`](./blueprint/08-COWORK-CURRICULUM.md) | Cowork curriculum *(deferred — scope call 2026-05-04)* |
| [`blueprint/09-DR-DIAG-architecture.md`](./blueprint/09-DR-DIAG-architecture.md) | Architecture diagram (mermaid + narrative) |
| [`blueprint/10-AAR/`](./blueprint/10-AAR/) | Per-epic after-action reports (filled as work lands) |
| [`blueprint/audits/`](./blueprint/audits/) | Audit memos: 3 pre-audit gauntlet passes (librarian citation, consistency, red-team) + 11-auditor staffed panel (`03-AR..13-FC`) + the GW-1.9 response register (`00-AUDIT-RESPONSES.md`) |

## Read order for a new contributor

1. [`README.md`](../README.md) (repo root)
2. [`CLAUDE.md`](../CLAUDE.md) (repo root)
3. [`blueprint/00-MASTER-BLUEPRINT.md`](./blueprint/00-MASTER-BLUEPRINT.md)
4. [`002-DR-CRIT-personas.md`](./002-DR-CRIT-personas.md)
5. [`004-DR-DEC-architecture-decisions.md`](./004-DR-DEC-architecture-decisions.md)
6. The blueprint sections in numeric order
7. The audits in [`blueprint/audits/`](./blueprint/audits/)
