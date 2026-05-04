# 06 — Live Status

> *Status snapshot — auto-refreshable from beads. Manual edits
> here are NOT load-bearing; the source of truth is `bd stats` +
> `bd ready`.*

**Status:** SKELETON — wired to beads in **GW-1.7**.
**Last manual refresh:** 2026-05-04.

---

## Snapshot — 2026-05-04

```
Total epics:     12
Open:            12
Closed:           0
In progress:      1   (GW-1.1 master blueprint scaffold — this PR)
Ready (no blockers):  1   (Phase 0 sandbox provisioning)
Blocked:         11
```

## What's blocking what

```
[Phase 0] Sandbox (READY)
    └─→ [Blueprint] paperwork
            └─→ [E1] Foundation
                    ├─→ [E2] PolicyCenter
                    │       └─→ [E5] Drafting tools
                    ├─→ [E3] Harness
                    │       ├─→ [E5] Drafting tools (also)
                    │       ├─→ [E7] ClaimCenter
                    │       ├─→ [E8] BillingCenter
                    │       └─→ [E9] Producer
                    ├─→ [E4] Customer profile + cowork
                    │       └─→ [E10] Onboarding CLI
                    ├─→ [E6] Workflow + Events
                    ├─→ [E7] ClaimCenter (also)
                    ├─→ [E8] BillingCenter (also)
                    └─→ [E9] Producer (also)
```

## Live commands (instead of trusting this file)

```bash
bd ready                  # what can be worked right now
bd list --type=epic       # full epic list
bd stats                  # numerical summary
bd dep tree               # full dep tree
~/bin/bd-sync status      # per-bead GH/Plane mirror state
```

## Refresh protocol

1. Run the four commands above.
2. Replace the snapshot section.
3. Commit on a feature branch + PR (don't commit straight to main).
4. PR title: `chore: refresh blueprint status snapshot YYYY-MM-DD`.

(Auto-refresh via a GitHub Action lands as a sub-task of GW-1.7.)
