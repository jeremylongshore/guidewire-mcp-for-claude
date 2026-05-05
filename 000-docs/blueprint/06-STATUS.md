# 06 — Live Status

> *Status snapshot. The authoritative source is `bd stats` + `bd ready`
> from the repo root; this file is a human-readable mirror updated
> per-PR-merge during the paperwork phase, and via auto-refresh once
> GW-1.7 lands a GitHub Action.*

**Last manual refresh:** 2026-05-04 (post blueprint-authoring + librarian-audit-fixes)

---

## Phase status

**Blueprint authoring: COMPLETE.**

Eight authored blueprint sections live in `main` (not skeletons):

| File | Words | PR |
|---|---|---|
| [`00-MASTER-BLUEPRINT.md`](./00-MASTER-BLUEPRINT.md) | ~1.4k (refresh) | this PR |
| [`01-BUSINESS-CASE.md`](./01-BUSINESS-CASE.md) | 3.0k | [#39](https://github.com/jeremylongshore/guidewire-mcp-for-claude/pull/39) |
| [`02-PRD.md`](./02-PRD.md) | 8.2k | [#35](https://github.com/jeremylongshore/guidewire-mcp-for-claude/pull/35) |
| [`03-ARCHITECTURE.md`](./03-ARCHITECTURE.md) | 5.3k | [#38](https://github.com/jeremylongshore/guidewire-mcp-for-claude/pull/38) |
| [`04-USER-JOURNEY.md`](./04-USER-JOURNEY.md) | 5.4k | [#42](https://github.com/jeremylongshore/guidewire-mcp-for-claude/pull/42) |
| [`05-TECHNICAL-SPEC.md`](./05-TECHNICAL-SPEC.md) | 7.4k | [#41](https://github.com/jeremylongshore/guidewire-mcp-for-claude/pull/41) |
| [`07-ROADMAP.md`](./07-ROADMAP.md) | 2.8k+ (E2.5 inserted) | [#43](https://github.com/jeremylongshore/guidewire-mcp-for-claude/pull/43) |
| [`09-DR-DIAG-architecture.{md,mmd}`](./09-DR-DIAG-architecture.md) | diagram | merged earlier |

Plus the inputs in `000-docs/`: `001-DR-RES`, `002-DR-CRIT-personas`,
`003-DR-ARCH-oss-cowork`, [`004-DR-DEC-architecture-decisions`](../004-DR-DEC-architecture-decisions.md)
(D-001 through D-018), `005-DR-REF-guidewire-public-resources`
(librarian KB, expanded 2026-05-04 by librarian audit), and the
4 specialist memos (006/007/008/009 — patched for librarian P1-P5
corrections).

`08-COWORK-CURRICULUM.md` is **deprecated** (cohort scope dropped
per project-owner directive 2026-05-04 — see audit register
F-CON-008). `10-AAR/` will fill epic-by-epic as work lands.

---

## Audit gate state

The librarian citation audit landed at
[`./audits/00-LIBRARIAN-CITATION-AUDIT.md`](./audits/00-LIBRARIAN-CITATION-AUDIT.md)
(6.2k words, classifying 69 technical claims A/B/C/D). All 4 D-class
findings + 1 B-reclass have been patched in PRs
[#38](https://github.com/jeremylongshore/guidewire-mcp-for-claude/pull/38)
/ [#41](https://github.com/jeremylongshore/guidewire-mcp-for-claude/pull/41)
/ [#44](https://github.com/jeremylongshore/guidewire-mcp-for-claude/pull/44).
KB-side fixes shipped in
[#40](https://github.com/jeremylongshore/guidewire-mcp-for-claude/pull/40)
(5 additions to `005-DR-REF`).

**Outstanding gates before E1 implementation:**

1. **Pre-audit `/validate-consistency` + multi-persona red-team** —
   informal-but-rigorous check, run after this status PR merges.
2. **GW-1.8 staffed audit panel** — 11 auditors file written memos
   to `audits/`. E1 blocked until all FAILs resolved.
3. **GW-1.9 audit response + blueprint v1.0 sign-off** — file
   responses to CHALLENGEs in `audits/00-AUDIT-RESPONSES.md`.

(Per [D-021](../004-DR-DEC-architecture-decisions.md#d-021--terminology-fix-sandbox-meant-guidewire-isolated-tenant-what-we-actually-need-is-dev-tier-credentials--real-endpoints),
the prior "sandbox provisioning" bead `guidewire-adj` is **superseded** —
that entry conflated "Guidewire-provisioned isolated tenant" with
"place to develop the MCP." What's actually needed is dev-tier OAuth
credentials + the documented Cloud API endpoints already in the
librarian KB. E1 picks up a smoke-test job for endpoint reachability.
Items previously tagged `(unverified — sandbox-confirm at
guidewire-adj)` are now `(unverified — practitioner knowledge from
public docs; smoke-test reachability with dev-tier creds; first
integration engagement validates production)`.)

---

## Bead snapshot

```
Total epics + tasks:  >40 (post blueprint authoring)
Closed:               GW-1.1, 1.2, 1.2.b, 1.3, 1.3.b, 1.5, 1.6.b
                       + 4 D-finding bugs (P1-P4)
Ready (no blockers):  Phase 0 sandbox (guidewire-adj, GH #1)
                       + librarian-audit B-finding citation backfills
                         (low urgency)
In progress:          GW-1.6.c master blueprint refresh (this PR)
Blocked:              E1 → ... → E11+ (correctly gated on Phase 0
                       sandbox + GW-1.8 staffed audit gate)
```

For exact numbers: `bd stats` from the repo root.

---

## Dependency graph (the gates)

```
[Phase 0] Sandbox (guidewire-adj — GH #1, READY but pending Jeremy
                                              partner-program apply)
    │
    ├─→ [Pre-audit gates] (ready-to-run, this session)
    │       ├─→ /validate-consistency across blueprint
    │       └─→ Multi-persona red-team panel (9 personas attack the
    │                                          authored blueprint)
    │
    └─→ [GW-1.8] Staffed audit panel (11 auditors — formal)
            └─→ [GW-1.9] Audit response + blueprint v1.0
                    │
                    └─→ [E1] Foundation — `mcp-runtime`, `schemas`,
                            `auth`, `audit`, `client-sdk`, `observability`
                            │
                            ├─→ [E2] PolicyCenter MCP (read-only)
                            │       └─→ [E2.5] Aggregate-query tools
                            │       └─→ [E5] Drafting tools
                            ├─→ [E3] Harness library + CLI
                            │       └─→ [E5/E7/E8/E9 — multi-dep]
                            ├─→ [E4] Per-tenant profile loader
                            │       └─→ [E10] Onboarding CLI
                            ├─→ [E6] Workflow + Events
                            ├─→ [E7] ClaimCenter MCP
                            ├─→ [E8] BillingCenter MCP
                            ├─→ [E9] Producer-side MCP
                            └─→ [E11+] Marketplace publish
```

---

## Live commands (instead of trusting this file)

```bash
bd ready                  # what can be worked right now
bd list --type=epic       # full epic list
bd stats                  # numerical summary
bd dep tree               # full dep tree
~/bin/bd-sync status      # per-bead GH/Plane mirror state
```

---

## Refresh protocol

1. Run the four commands above.
2. Replace the **Bead snapshot** section.
3. Commit on a feature branch + PR (don't commit straight to main).
4. PR title: `chore: refresh blueprint status snapshot YYYY-MM-DD`.

Auto-refresh via a GitHub Action lands as a sub-task of GW-1.7.
