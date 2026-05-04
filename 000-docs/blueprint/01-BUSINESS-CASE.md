# 01 — Business Case

> *Why this exists, who it serves, and what makes the OSS-as-lead-magnet
> commercial framing work.*

**Status:** SKELETON — full content lands in **GW-1.2** (next PR).
**Bead:** `guidewire-7jt` (Blueprint epic) → GW-1.2 sub-bead (TBD).
**Inputs:** [`../003-DR-ARCH-oss-cowork.md`](../003-DR-ARCH-oss-cowork.md),
[`../004-DR-DEC-architecture-decisions.md`](../004-DR-DEC-architecture-decisions.md).

---

## Sections to author in GW-1.2

### 1. Problem statement

- Underwriters / claims / billing operators don't speak API verbs.
- Existing Guidewire integrations expose API surface, not work surface.
- Cost of the gap — quote integration project AUVs, training time,
  rejected automation.

### 2. The four audiences

Detail each audience, including:

- **Confirmed inbound (carrier / MGA / SI)** — primary economic driver.
  Anonymized profile of the 2 inbound. What they asked for. What
  shape of engagement converts.
- **Anthropic Enterprise + SI partner credibility** — what partner
  conversations need from this repo to clear "is this a real
  practice?" framing.
- **Cowork cohort** — Claude Code & Cowork Accelerator audience.
  How they use the repo (template / curriculum / portfolio).
- **Broad OSS reach** — same playbook as `claude-code-plugins`
  (2,000+ stars). Distribution metrics worth tracking.

### 3. Commercial framing — OSS as lead magnet, NOT product

- Why "complete enough to be the product" kills the funnel.
- Where customization revenue lives (`profiles/`, vendor adapters,
  approved-execute deployment).
- SI partner relationship — why we don't compete on Guidewire
  knowledge depth (Deloitte / PwC / Capgemini win that fight).
- Defensible position — agent governance + carrier vocabulary +
  audit layer.

### 4. Competitive landscape

- ProNavigator (April 2026 release inside InsuranceSuite +
  InsuranceNow) — Guidewire's own AI. Why we don't compete on "AI
  for Guidewire."
- Underwriting Assistant (Palisades release).
- Agent Studio.
- Where we win — what Guidewire-internal AI doesn't ship: external
  agent governance + carrier-native vocabulary + audit layer.

### 5. KPIs / definition of "is this working"

- Distribution metrics: stars, forks, npm downloads.
- Inbound velocity: DMs / emails / sandbox-access requests
  referencing the repo.
- Conversion: inbound → discovery → custom build engagement.
- Cowork: members shipping derived MCPs from the fork-starter.

### 6. Out-of-scope (and when each unlocks)

The "stays out of OSS until X" table from the v4 architecture —
SOAP / InsuranceNow / payment rails / SaaS control plane / etc.

---

## Audit gate

This document is reviewed by:

- `business-analyst` → [`./audits/05-BZ-business-review.md`](./audits/05-BZ-business-review.md)
- `architect-reviewer` → [`./audits/01-AR-architecture-review.md`](./audits/01-AR-architecture-review.md)
- `article-consistency-checker` → [`./audits/10-CC-consistency-review.md`](./audits/10-CC-consistency-review.md)

(Filed in **GW-1.8** staffed audit panel.)
