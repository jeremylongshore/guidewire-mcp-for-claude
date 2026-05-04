# 08 — Cowork Curriculum

> *How the 10-epic roadmap doubles as 10 weeks of Claude Code & Cowork
> Accelerator content + a fork-starter template for cohort members'
> own domains.*

**Status:** SKELETON — full week-by-week curriculum lands in
**GW-1.6**.
**Bead:** `guidewire-7jt` → GW-1.6 sub-bead (TBD).

---

## Premise — "how do non-engineers actually use this?"

Three answers (all three run simultaneously):

### A. Template fork

`templates/cowork-fork-starter/` (lands in **E4**) ships a
`pnpm guidewire init <domain>` script. Cohort member runs it →
scaffolded copy of the architecture renamed to their domain → they
fill in carrier-vocabulary tools for their work.

| Cohort member's domain | Fork name | Sample tools |
|---|---|---|
| Trucking (Jeremy's own) | `flatbed-mcp` | `find-loads-near-me`, `whats-the-rate-on-this-lane`, `show-my-ifta-by-state` |
| Real estate | `mls-mcp` | `find-comps-for-this-listing`, `whats-the-cap-rate-on-this`, `show-distressed-sellers` |
| Restaurant ops | `floor-mcp` | `whats-the-prime-cost-this-week`, `show-comps-by-server`, `find-shifts-needing-coverage` |
| E-commerce | `shopify-mcp` | `whats-our-margin-on-this-sku`, `find-orders-stuck-in-fulfillment` |

The pattern (carrier-vocabulary tools + harness library + fixture-backed
profile) is the lesson. Guidewire is the canonical example. Forking
it is the assignment.

### B. Live build-along sessions

Each of the 10 epics ≈ 1 week of cowork content.

| Day | Format |
|---|---|
| Mon / Tue | Jeremy builds the epic (livestream OR recorded — TBD per cadence) |
| Wed | Cohort opens small PRs against the public repo (add a tool, fix a fixture, write a test, write a fixture-MANIFEST entry, improve a tool description) |
| Thu / Fri | Office hours — cohort works on their forked-domain version using the same pattern |

### C. Portfolio + content engine

Every contributing cowork member becomes a co-author. The repo's
`CONTRIBUTORS.md`, the GitHub commit log, and the per-epic AAR docs
in `10-AAR/` are the receipts.

For non-engineer cowork members, the contribution surface is
intentionally low-engineering:

- Writing carrier-vocabulary tool descriptions (good descriptions are
  the differentiator — non-engineers who've worked the domain are
  *better* at this than engineers).
- Fixture / sandbox-recording authorship (real-world sample data with
  documented provenance is valuable).
- README / examples / `templates/` content.
- Issue triage / community moderation.

---

## Week-by-week (to author in GW-1.6)

For each epic, fill in:

- **Theme of the week:** …
- **Jeremy's build:** what lands in the public repo this week.
- **Cohort PR opportunities:** small, well-scoped contribution surfaces.
- **Cohort fork-on-domain assignment:** what they do with their own
  forked MCP this week.
- **Office-hours topics:** likely questions / blockers.
- **Shipped artifact:** what each cohort member has at end of week
  (e.g. one tool added to their fork, one PR merged on the canonical
  repo).

### Template

#### Week N — E_n_

- **Theme:** …
- **Jeremy's build:** …
- **Cohort PR opportunities:** …
- **Cohort fork assignment:** …
- **Office hours likely topics:** …
- **End-of-week shipped artifact (per cohort member):** …

---

## Audit gate

Reviewed by:

- `business-analyst` (curriculum coherence + completeness across 10
  weeks)
- `docs-architect` (cohort-facing materials clarity)
- `article-consistency-checker`
