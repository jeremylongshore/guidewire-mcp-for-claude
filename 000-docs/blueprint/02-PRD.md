# 02 — Product Requirements (PRD)

> *Full product specification — carrier-vocabulary tools, harness,
> profiles, three execution modes.*

**Status:** SKELETON — full content lands in **GW-1.2**.
**Bead:** `guidewire-7jt` → GW-1.2 sub-bead (TBD).
**Inputs:** [`../003-DR-ARCH-oss-cowork.md`](../003-DR-ARCH-oss-cowork.md),
[`../004-DR-DEC-architecture-decisions.md`](../004-DR-DEC-architecture-decisions.md).

---

## Sections to author in GW-1.2

### 1. Vision (one-liner)

The carrier-native MCP surface for Guidewire estates, with governance
strong enough to earn trust on writes.

### 2. Personas (cross-link to 002-DR-CRIT)

- Underwriter (P&C, commercial / specialty)
- Claims adjuster, claims VP
- Billing operator
- MGA / broker (producer-side)
- Carrier CIO, CISO
- SI partner consultant
- Cowork-fork developer

### 3. Tools — by Guidewire suite

For each suite, enumerate:

#### `policycenter-mcp` (E2 + E5)

| Tool | Mode | Description | Tool-name rationale |
|---|---|---|---|
| `find-submissions-waiting-on-me` | read_only | … | … |
| `whats-our-appetite-on-this-risk` | read_only | … | … |
| `show-policies-for-this-insured` | read_only | … | … |
| `summarize-this-submission` | read_only | … | … |
| `did-we-lose-this-account` | read_only | … | … |
| `explain-why-this-got-referred` | read_only | … | … |
| `draft-referral-note` | draft_only (E5) | … | … |
| `propose-endorsement` | draft_only (E5) | … | … |

#### `claimcenter-mcp` (E7)

| Tool | Mode | Description | Tool-name rationale |
|---|---|---|---|
| `find-claims-at-risk-of-leakage` | read_only | … | … |
| `summarize-this-loss` | read_only | … | … |
| `whats-the-reserve-picture` | read_only | … | … |
| `draft-denial-letter` | draft_only | … | … |

#### `billingcenter-mcp` (E8)

| Tool | Mode | Description | Tool-name rationale |
|---|---|---|---|
| `show-overdue-accounts` | read_only | … | … |
| `whats-the-payment-status` | read_only | … | … |
| `find-billing-issues-for-this-policy` | read_only | … | … |
| `reconcile-this-payment` | approved_execute | … | … |

#### `producer-mcp` (E9)

| Tool | Mode | Description |
|---|---|---|
| `show-my-book-of-business` | read_only | … |
| `whats-my-commission-status` | read_only | … |
| `find-my-pending-quotes` | read_only | … |

#### `events-mcp` (E6, query-only)

| Tool | Mode | Description |
|---|---|---|
| `replay-event` | read_only | … |
| `find-events-for-claim` | read_only | … |

### 4. Three execution modes — full contract

For each mode:

- **Inputs:** what the tool receives.
- **Side effects allowed.**
- **Refusal scenarios.**
- **Audit emitted.**
- **Telemetry emitted.**
- **Failure modes & recovery.**

### 5. Harness contract

`packages/harness/`:

- Plan generation API.
- Policy gate API (decision + reason + tier).
- Approval flow (CLI + library hooks).
- Execute (idempotency key required).
- Audit hash-chain entry format.
- Evidence bundle export shape (JSON).
- Rollback hint format.

### 6. Customer profile contract

`profiles/_template/` files:

- `auth.yaml` — OAuth client, token endpoints, scopes.
- `roles.yaml` — role → tool / mode permission matrix.
- `lob.yaml` — LOB code mappings.
- `typelists.yaml` — typelist value mappings.
- `custom-entities.yaml` — custom entity → tool input mappings.
- `field-aliases.yaml` — Guidewire field name → carrier-vocabulary term.
- `approval-matrix.yaml` — write actions → required approver tier.
- `pii-policy.yaml` — PII redaction rules.

### 7. Cowork fork-starter contract

`templates/cowork-fork-starter/`:

- `pnpm guidewire init <domain>` script.
- What gets renamed.
- What stays carrier-vocabulary-shaped (the lesson).

### 8. Acceptance criteria

For each MVP epic (E1-E4) — what "done" means.

---

## Audit gate

Reviewed by:

- `architect-reviewer` (system fit + boundaries)
- `backend-architect` (API contracts, package boundaries)
- `mcp-safety-reviewer` (per-tool blast radius, three-mode design,
  refusal scenarios)
- `carrier-vocabulary-curator` (tool-name authenticity)
- `guidewire-api-archaeologist` (Cloud API mapping correctness)
- `harness-runtime-architect` (harness contract semantics)
- `business-analyst` (commercial fit + KPI definitions)
- `article-consistency-checker`
