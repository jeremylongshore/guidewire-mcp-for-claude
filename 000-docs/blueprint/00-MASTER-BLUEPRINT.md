# 00 — Master Blueprint

> Index + executive summary for the Guidewire MCP for Claude project.
> This is the single page that answers "what is this thing, where is
> it going, and where does each design decision live?"

**Project:** Guidewire MCP for Claude
**Repo:** [`jeremylongshore/guidewire-mcp-for-claude`](https://github.com/jeremylongshore/guidewire-mcp-for-claude)
**Works with:** Guidewire InsuranceSuite — PolicyCenter,
ClaimCenter, BillingCenter, plus the producer / events / payments
surfaces around them.
**Owner:** Jeremy Longshore — Intent Solutions IO
**Status:** Blueprint authoring in flight (GW-1.x)
**Marketplace target:** [`claude-code-plugins-plus-skills`](https://github.com/jeremylongshore/claude-code-plugins-plus-skills)
**Last updated:** 2026-05-04

---

## Executive summary

**What it is.** A set of carrier-native Model Context Protocol (MCP)
servers + a governance harness for Guidewire estates. **Works with
the Guidewire InsuranceSuite** (PolicyCenter, ClaimCenter,
BillingCenter, plus producer / events / payments surfaces). Built
Claude/Anthropic-first. Targets the
[`claude-code-plugins-plus-skills`](https://github.com/jeremylongshore/claude-code-plugins-plus-skills)
marketplace for distribution.

**Why it exists.** Underwriters, claims operators, and billing teams
already speak a language — *"find submissions waiting on me", "what's
our appetite on this risk", "summarize this loss"*. Existing
Guidewire integrations expose API verbs (`search_policies`,
`get_account`) that don't match how operators think. This project's
thesis is that **carrier-native tool vocabulary + a governance
harness is the right MCP surface** for Guidewire estates — not
API-verb wrappers. The harness (plans, approvals, hash-chained audit,
rollback) is the durable moat; the tools are the language operators
already speak.

**Why it's OSS.** Demand was already confirmed before the project had
a public footprint (2 unprompted inbounds 2026-05-04). The repo is a
**lead magnet for custom carrier / MGA / SI build engagements**, not
a complete product on its own. Same playbook as
`claude-code-plugins` (2,000+ stars, 300+ forks, 45,000+ npm
downloads).

**Audiences (priority order):**

1. Confirmed inbound + future carrier/MGA/SI inbound — primary
   economic driver.
2. Anthropic Enterprise + SI partner credibility.
3. Cowork cohort (Claude Code & Cowork Accelerator) using as
   template + curriculum.
4. Broad OSS reach (stars, forks, npm).

---

## Reading order for a new contributor

1. This file (`00-MASTER-BLUEPRINT.md`).
2. Phase 0 design inputs at [`../001-DR-RES-research-report.md`](../001-DR-RES-research-report.md)
   → [`../002-DR-CRIT-personas.md`](../002-DR-CRIT-personas.md)
   → [`../003-DR-ARCH-oss-cowork.md`](../003-DR-ARCH-oss-cowork.md)
   → [`../004-DR-DEC-architecture-decisions.md`](../004-DR-DEC-architecture-decisions.md).
3. The blueprint sections in this directory in numeric order.
4. The audits in [`./audits/`](./audits/) — the staffed 11-auditor
   review of this entire blueprint.
5. The `CLAUDE.md` at the repo root — the one-page rules-of-engagement
   for any contributor or AI agent working in the repo.

---

## Blueprint section index

| File | Section | Status | Bead | PR |
|---|---|---|---|---|
| [`00-MASTER-BLUEPRINT.md`](./00-MASTER-BLUEPRINT.md) | Index + executive summary | this file | GW-1.1 (`guidewire-53w`) | — |
| [`01-BUSINESS-CASE.md`](./01-BUSINESS-CASE.md) | Why this exists, who it serves (4 audiences), commercial framing | skeleton | GW-1.2 | — |
| [`02-PRD.md`](./02-PRD.md) | Full product spec — carrier-vocabulary tools, harness, profiles, three modes | skeleton | GW-1.2 | — |
| [`03-ARCHITECTURE.md`](./03-ARCHITECTURE.md) | System architecture narrative — layered model | skeleton | GW-1.3 | — |
| [`04-USER-JOURNEY.md`](./04-USER-JOURNEY.md) | Underwriter / claims / cowork-forker journeys | skeleton | GW-1.5 | — |
| [`05-TECHNICAL-SPEC.md`](./05-TECHNICAL-SPEC.md) | Stack, contracts, package layout, observability, NO MOCKS, quality gates | skeleton | GW-1.3 | — |
| [`06-STATUS.md`](./06-STATUS.md) | Live status (auto-updates from beads) | skeleton | GW-1.7 | — |
| [`07-ROADMAP.md`](./07-ROADMAP.md) | 10 epics with exit criteria + cowork tie-ins (source of truth) | skeleton | GW-1.6 | — |
| [`08-COWORK-CURRICULUM.md`](./08-COWORK-CURRICULUM.md) | How epics map to cowork sessions / fork-starter docs | skeleton | GW-1.6 | — |
| [`09-DR-DIAG-architecture.{svg,mmd}`](./09-DR-DIAG-architecture.md) | Architectural diagram (placeholder; final via `/engineer-design-diagram`) | placeholder | GW-1.4 | — |
| [`10-AAR/`](./10-AAR/) | Per-epic after-action reports | scaffolded | each Ex closure | — |
| [`audits/`](./audits/) | Staffed 11-auditor review memos + responses | scaffolded | GW-1.8, GW-1.9 | — |

---

## Beads ↔ blueprint linkage

Every bead's notes carry a `Blueprint:` reference to the relevant
section of this directory. Example for E2:

```
bd show guidewire-0qf
  → "Blueprint: 000-docs/blueprint/02-PRD.md § Epic 2 +
                 000-docs/blueprint/07-ROADMAP.md § E2"
```

This means a contributor running `bd show <id>` always knows which
blueprint section governs the work. The blueprint cannot drift from
the work; the work cannot proceed without the blueprint section
existing first.

The bead-to-section map is enumerated in
[`07-ROADMAP.md`](./07-ROADMAP.md) (lands in GW-1.6).

---

## Three-layer mirror — bead ↔ GH issue ↔ Plane

Every tracked unit of work has correlated records across three
layers, kept in sync via [`~/bin/bd-sync`](../../README.md):

| Layer | Source of truth | Tool |
|---|---|---|
| Beads (local) | Yes (canonical) | `bd ready`, `bd show`, etc. |
| GitHub Issues | Mirror | `bd-sync link --gh OWNER/REPO#N` |
| Plane (when configured) | Mirror | `bd-sync link --plane PROJECT-N` |

Initial mirror (2026-05-04):

| Bead | GH | Title |
|---|---|---|
| `guidewire-adj` | [#1](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/1) | [Phase 0] Sandbox provisioning |
| `guidewire-7jt` | [#2](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/2) | [Blueprint] Master blueprint paperwork |
| `guidewire-4rd` | [#3](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/3) | [E1] Foundation |
| `guidewire-0qf` | [#4](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/4) | [E2] PolicyCenter MCP (read-only) |
| `guidewire-jpu` | [#5](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/5) | [E3] Harness library + CLI |
| `guidewire-86h` | [#6](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/6) | [E4] Customer profile + cowork starter |
| `guidewire-413` | [#7](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/7) | [E5] Drafting tools |
| `guidewire-un8` | [#8](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/8) | [E6] Workflow + Events |
| `guidewire-4ps` | [#9](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/9) | [E7] ClaimCenter MCP |
| `guidewire-zgu` | [#10](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/10) | [E8] BillingCenter + Payments |
| `guidewire-2ha` | [#11](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/11) | [E9] Producer-side MCP |
| `guidewire-dua` | [#12](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/12) | [E10] Onboarding + certification |
| `guidewire-qqx` | [#14](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/14) | [E11+] Publish to `claude-code-plugins-plus-skills` marketplace |

Operating discipline: every `bd note` / `bd close` uses `bd-sync` so
updates fan out across all layers. PRs use `Refs #N` while children
remain; `Closes #N` only on the PR that retires the last child bead.

---

## Hard non-negotiables (the rules everything else hangs on)

1. **Blueprint-first** — no code in `servers/` / `packages/` until the
   staffed 11-auditor panel passes.
2. **Carrier-vocabulary tools** — not API verbs. Reject API-shaped
   names at PR review.
3. **NO MOCKS** — real Guidewire Cloud sandbox from day 1.
4. **Three execution modes per tool** — `read_only`, `draft_only`,
   `approved_execute`.
5. **Harness governs writes** — plan, policy, approval, audit
   (hash-chain), rollback. No audit = no write.
6. **Observability from day 1** — OpenTelemetry + pino + Sentry.
7. **Enforcement travels with the code** — `@intentsolutions/audit-harness`
   in-repo; CI never references `~/.claude/` paths.
8. **Beads for ALL task tracking** — never TodoWrite / TaskCreate /
   markdown TODO.

Full list with rationale: [`../../CLAUDE.md`](../../CLAUDE.md).

---

## Status snapshot (fill from beads)

> Auto-updated section. Source: `bd stats` + `bd ready`. Last manual
> refresh: 2026-05-04.

- **Open beads:** 13
- **Closed beads:** 0
- **Ready to work:** 1 (Phase 0 Sandbox)
- **In progress:** 1 (GW-1.1 Master blueprint scaffold — this PR)
- **Blocked:** rest (correctly gated on Phase 0 → Blueprint → E1)

For live numbers: `cd repo && bd stats`.

---

## Audit panel gate

Before any code is written in `servers/` or `packages/`, the entire
paperwork set is reviewed by an 11-auditor staffed panel. See
[`./audits/README.md`](./audits/README.md) for the auditor list,
target files, and gate criteria. E1 (`guidewire-4rd` / GH #3) is
**blocked** until all FAILs are resolved or accepted in
[`./audits/00-AUDIT-RESPONSES.md`](./audits/00-AUDIT-RESPONSES.md)
(this file lands when GW-1.9 closes; until then see
[`./audits/README.md`](./audits/README.md) for the gate criteria).
