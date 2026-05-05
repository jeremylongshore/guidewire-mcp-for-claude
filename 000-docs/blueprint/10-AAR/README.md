# 10-AAR — Per-Epic After-Action Reports

> *Each epic closes with an AAR memo here. AARs capture what landed,
> what didn't work, and what to do differently. They are the audit
> trail of "this is how we know the architecture is real, not
> aspirational."*

**Status:** SCAFFOLDED — directory + format established. AARs land
as each epic closes (GW-1.x for blueprint sections, then E1, E2, etc).

---

## When to file an AAR

- When an epic bead closes (`bd close <epic-id>`).
- When a sub-bead closes that produced something material enough to
  merit its own retrospective (judgment call).
- After any production incident touching this repo (post-mortem
  format, tagged separately).

## File naming

```
NN-AAR-<epic-id>-<short-slug>.md
```

Examples:

- `01-AAR-GW-1.1-master-blueprint-scaffold.md`
- `02-AAR-GW-1.2-business-case-and-prd.md`
- `12-AAR-E1-foundation.md`
- `13-AAR-E2-policycenter-mcp-readonly.md`

The leading `NN` is a chronological sequence, not the epic number.
Two AARs in the same week get adjacent numbers regardless of which
epic they retrospect.

## Format

```markdown
# AAR — <epic title>

**Bead:** `<bead-id>`
**Closed:** YYYY-MM-DD
**Author:** Jeremy Longshore
**PR(s) that closed it:** #N, #M

---

## What we shipped

Concrete list. Code, docs, tests, infra, all of it. Be specific.

## What didn't work / had to be replanned

The actual hard parts. Don't sanitize.

## What we learned

Architectural / process / tooling insights worth keeping.

## What to do differently next time

If you were starting the next epic now, what would you change?

## Status of acceptance criteria

Checklist from the epic's blueprint section, with each item marked
✓ done / ⚠ partial / ✗ deferred + reason.

## Open follow-ups

Beads filed for spillover work. Each followup-bead links here.
```

## Why this matters

The blueprint paperwork is intent. The AARs are reality. The two
together (intent + receipts) are what makes the OSS repo credible
to inbound carriers — they can audit not just "what's planned" but
"what's actually delivered, and what was hard about it."

AARs also serve as teaching artifacts — readers learn from "here's
what went sideways and how it got recovered" more than from "here's
the perfect plan."
