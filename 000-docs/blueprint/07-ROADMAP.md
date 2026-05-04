# 07 — Roadmap (10-Epic Public)

> *Source-of-truth public roadmap. Every bead's `Blueprint:` reference
> points back here. Each epic has exit criteria + cowork tie-ins.*

**Status:** SKELETON — full exit criteria + cowork tie-ins land in
**GW-1.6**.
**Bead:** `guidewire-7jt` → GW-1.6 sub-bead (TBD).

---

## The 10 public epics

| # | Title | Bead | GH | Type |
|---|---|---|---|---|
| E1 | Foundation — `mcp-runtime`, `schemas`, `auth`, `audit`, `client-sdk`, `observability` | `guidewire-4rd` | [#3](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/3) | MVP |
| E2 | PolicyCenter MCP (read-only) — 5-7 carrier-vocabulary tools | `guidewire-0qf` | [#4](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/4) | MVP |
| E3 | Harness library + CLI — plan / approve / execute / audit / rollback | `guidewire-jpu` | [#5](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/5) | MVP |
| E4 | Customer profile template + cowork fork starter | `guidewire-86h` | [#6](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/6) | MVP |
| E5 | Drafting tools — `draft-referral-note`, `propose-endorsement` | `guidewire-413` | [#7](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/7) | Buildout |
| E6 | Workflow + Events — webhook + queue + `events-mcp` | `guidewire-un8` | [#8](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/8) | Buildout |
| E7 | ClaimCenter MCP | `guidewire-4ps` | [#9](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/9) | Buildout |
| E8 | BillingCenter + Payments (separate `payments-mcp`) | `guidewire-zgu` | [#10](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/10) | Buildout |
| E9 | Producer-side MCP — MGA / broker scope | `guidewire-2ha` | [#11](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/11) | Buildout |
| E10 | Onboarding + certification CLI | `guidewire-dua` | [#12](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/12) | Buildout |
| E11+ | Publish to `claude-code-plugins-plus` marketplace (plugin manifest, schema validator, marketplace README) | `guidewire-qqx` | [#14](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/14) | Distribution |

Plus the Phase 0 prereqs:

| # | Title | Bead | GH | Type |
|---|---|---|---|---|
| Phase 0 | Sandbox provisioning | `guidewire-adj` | [#1](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/1) | Hard prereq |
| Blueprint | Master blueprint paperwork (this directory) | `guidewire-7jt` | [#2](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues/2) | Pre-code gate |

---

## Exit criteria — to author in GW-1.6

For each epic above, fill in:

- **Done when** — concrete, verifiable.
- **Demo path** — 30-second loop someone can run.
- **Cowork session** — what cohort members do this week
  (from-scratch vs follow-along vs fork-on-their-domain).
- **Out-of-scope spillover** — what does NOT ship in this epic
  (deliberately).

### Template (to fill per epic)

#### E_n_

- **Done when:** …
- **Demo path:** …
- **Cowork session:** …
- **Out of scope:** …
- **Blueprint sections governing:** §02 PRD § E_n_, §03 Architecture
  § layer X, §05 Technical Spec § Y.

---

## Distribution metrics worth tracking

(Not in repo — in head + status updates):

- Stars / week
- Forks / week (forks > stars × 0.1 is healthy contribution signal)
- Open issues from external contributors
- Inbound DMs / emails referencing the repo
- Cowork members who shipped a derived MCP via the fork-starter
- npm downloads of `@intentsolutions/guidewire-harness`

---

## Audit gate

Reviewed by:

- `business-analyst` (epic exit criteria realism + cowork tie-ins)
- `architect-reviewer` (epic dependency soundness)
- `article-consistency-checker` (PRD ↔ architecture ↔ roadmap
  consistency)
