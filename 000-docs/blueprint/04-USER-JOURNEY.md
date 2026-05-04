# 04 — User Journeys

> *End-to-end journeys for the underwriter, claims adjuster, billing
> operator, MGA broker, and the cowork-fork developer.*

**Status:** SKELETON — full content lands in **GW-1.5**.
**Bead:** `guidewire-7jt` → GW-1.5 sub-bead (TBD).

---

## Journeys to author in GW-1.5

### J-1 — Underwriter triage (E2 demo)

> *"Find submissions waiting on me, then walk me through them."*

Flow: agent ↔ `policycenter-mcp.find-submissions-waiting-on-me` →
top-N results → drill down with `whats-our-appetite-on-this-risk` per
submission → optional `draft-referral-note` (E5) → harness `draft_only`
audit → human reviews + applies via existing UI.

Acceptance: every step has a corresponding audit entry; evidence
bundle exports the conversation as JSON.

### J-2 — Claims summary + reserve check (E7)

> *"Summarize this loss and tell me if our reserves look right."*

Flow: `claimcenter-mcp.summarize-this-loss` → `whats-the-reserve-picture`
→ flag mismatch → optional `draft-denial-letter` if facts support →
human reviews.

### J-3 — Billing reconciliation (E8)

> *"Show overdue accounts for Acme Brokerage."*

Flow: `billingcenter-mcp.show-overdue-accounts` filtered by producer →
drill into `whats-the-payment-status` → if approved-execute mode:
`reconcile-this-payment` with harness approval flow.

### J-4 — Producer book review (E9)

> *"Show my book of business for Q2."*

Flow: `producer-mcp.show-my-book-of-business` → cross-LOB rollup →
`whats-my-commission-status` → optional drill into pending quotes.

### J-5 — Cowork-fork developer onboarding (E4 + E10)

> *"I want an MCP for trucking dispatchers / real estate brokers /
> restaurant ops."*

Flow:

1. `git clone guidewire-mcp-for-claude && cd guidewire-mcp-for-claude`
2. `pnpm guidewire init flatbed-mcp` (or any `<domain>`)
3. Scaffolds renamed copy with empty tool stubs + a starter
   `profiles/_template/`.
4. Developer fills in carrier-vocabulary tools for their domain.
5. Tests run via the same audit-harness gates.

Acceptance: Jeremy's own `flatbed-mcp` example ships in E4 as the
canonical fork demo.

### J-6 — Carrier integration onboarding (E10)

> *"My company is Acme Insurance. Generate a profile starter."*

Flow: `pnpm gw onboard acme-insurance` → CLI walks through:

1. Auth: client ID, client secret (loaded from SOPS), OAuth token URL.
2. Roles: enumerate Acme's role hierarchy.
3. LOB mappings: per-LOB code dictionaries.
4. Typelists, custom entities, field aliases.
5. Approval matrix.
6. PII policy.

Output: `profiles/acme-insurance/` populated; contract tests run
against Acme's sandbox; security-review checklist generated.

---

## Audit gate

Reviewed by:

- `business-analyst` (journey realism)
- `carrier-vocabulary-curator` (operator-language fidelity)
- `mcp-safety-reviewer` (per-step blast radius)
- `article-consistency-checker`
