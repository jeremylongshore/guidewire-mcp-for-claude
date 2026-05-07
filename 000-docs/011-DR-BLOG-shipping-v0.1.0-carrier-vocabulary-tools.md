# Shipping v0.1.0 of Guidewire MCP for Claude — what carrier-vocabulary tools actually look like

**Status:** Draft — pending review + cross-post via `/blog-startaitools`
**Audience:** startaitools.com (technical primary), jeremylongshore.com (portfolio cross-post)
**Slot:** Reactive — captures the v0.1.0/v0.1.1/v0.1.2 ship moment within 7 days
**Plane CONTENT issue:** [CONTENT-17](https://projects.intentsolutions.io/internal/projects/b421236a-7a50-4e4b-b01f-6dd3a4cdfaf9/issues/9e3ffcaa-ee91-4291-b153-6f87ec63f3fc)

---

## The thesis (in one paragraph)

Insurance carriers run on Guidewire InsuranceSuite — PolicyCenter, ClaimCenter, BillingCenter. Underwriters and claims adjusters spend hours navigating the UI to answer questions like *"what submissions are waiting on me?"* or *"why isn't the Acme account active anymore?"*. The Cloud API exists, but it speaks REST verbs (`GET /job/v1/jobs?subtype=Submission&status=Quoted&assignedTo=alice`). LLMs route well on operator language and badly on REST verbs. So the tools are named like the question an operator would actually ask:

```
find-submissions-waiting-on-me
show-policies-for-this-insured
summarize-this-submission
did-we-lose-this-account
pull-this-submission
```

That's the v0.1.0 catalog — five read-only PolicyCenter tools, shipped this week as [`@intentsolutions/policycenter-mcp`](https://github.com/jeremylongshore/guidewire-mcp-for-claude). One-line install:

```
/plugin install jeremylongshore/guidewire-mcp-for-claude
```

Set four env vars, restart Claude Code, ask carrier questions in a session. The tool's *implementation* hits real Guidewire endpoints; the carrier's profile translates Guidewire's raw field names back to operator-speak before the response returns. Outside layer = operator speech; inside layer = Guidewire schema; **translation is the product.**

## Why "carrier vocabulary" instead of "API verbs"

This was the hardest design call to defend in front of the staffed audit panel. The lazy MCP wrapper would expose `search_policies`, `get_account`, `list_submissions` — direct passthroughs to the Cloud API. That's what 90% of the wrap-an-API MCP servers on GitHub do. It's also what Anthropic's MCP team explicitly warns against: tool names that ask the LLM to translate from natural language *into* the API's vocabulary force the model to do work it's bad at.

Operator language is what the LLM is good at. So the tool names are operator questions, never API verbs. PR review rejects `search_*`, `list_*`, `get_*` on sight.

The translation layer lives in the customer's profile — specifically `profiles/<tenant>/field-aliases.yaml`. Default install uses an in-memory profile that covers all 5 v0.1.0 tools with sensible defaults; carriers with custom LOB codes, typelists, or role mappings copy `profiles/_template/` into `profiles/<their-tenant>/` and edit. **Zero YAML editing required for the 80% case** — that was the bar for "plug-and-play."

## What didn't ship — and why I'm comfortable with that

Three execution modes are in the schema: `read_only`, `draft_only`, `approved_execute`. v0.1.0 ships only `read_only`. The other two are gated behind the harness — a library + CLI (not an MCP server, recursion + tool-selection problem) that wraps every write in `plan → policy → approval → execute → audit → rollback`.

Why the harness gets its own engineering quarter:

- **No write without audit, policy, idempotency.** Hash-chained Postgres rows; tamper-resistant via three-role separation (`audit_writer` INSERT-only, `audit_reader` SELECT-only, `audit_owner` for DDL only). The migration grants are tested with testcontainers — `audit_writer` literally cannot `UPDATE` or `DELETE`, caught at build time, not at audit time.
- **Approval flow is human, not Claude.** The harness's `approve()` waits for an external human to click "approve" via the CLI, web UI, or API. The harness side effect (the actual Cloud API write) only fires after an approver decision lands. Tested end-to-end with testcontainers Postgres in the e2e bead that closed E3 — see below.
- **Rollback is a forensic hint, not auto-revert.** The harness produces a `humanInstruction` string ("To roll back: open ClaimCenter → CLM-2026-001 → Reserves tab → set reserve back to prior value"). Carriers do not want their AI assistant auto-reverting writes; they want a paper trail of what happened and a clear instruction for a human to undo it.

That's why drafting tools (`draft-referral-note`, `draft-endorsement`) ship in E5, ClaimCenter MCP in E7, BillingCenter + Payments in E8 (separate dual-control `payments-mcp` because money). All blocked by E3 — and that's the right ordering. The harness moat exists or none of those ship safely.

## The hash-chained audit moat

Every harness call writes a row into `audit_entries` with `prev_hash` referencing the previous row's `entry_hash`. The hash is over the canonical serialization of the row (with `recordedAt` coerced through `toIsoString()` because `pg` returns `TIMESTAMPTZ` as `Date` by default and the canonical hash was computed over the ISO string — caught by the AR-7 testcontainers test).

Six event types per write:

```
plan.created         (idempotency key derived, plan content-addressed)
policy.decided       (rule set version stamped onto decision)
approval.requested   (human approver gets the row in their queue)
approval.decided     (approver vote captured + reason)
execute.started      (effect about to fire)
execute.completed    (effect returned a value)
```

`evidence(traceId)` reconstructs the bundle across all six entries and returns `chainVerification.valid: true` only if every `prev_hash` matches and every `entry_hash` recomputes correctly. A compromised harness can write a row with a wrong hash, but `evidence()` (binding via `audit_reader`, NOT the writer role) will catch it.

The strongest claim I'm willing to make: **tamper-resistant against an outsider; tamper-evident against an unprivileged operator; defense-in-depth via role separation against a privileged DBA — NOT cryptographic tamper-evidence against the schema-owner role.** KMS-signed external commitment is E3+ work.

## The architectural insight that surfaced this week

Writing the end-to-end harness pipeline test (the close criterion for E3) caught a real production-wiring gap: **the harness needs both Postgres pools — writer for `audit.append()`, reader for `evidence.build()`.** The in-memory tests never caught this because the memory store has no role separation; the unit tests passed cleanly. Only when wiring real `PgAuditStore` for both audit + evidence did Postgres throw `permission denied for table audit_entries` — because `audit_writer` is INSERT-only.

This is the kind of bug that's invisible in unit tests, invisible in mock-based integration tests, and only catchable when you wire **real infrastructure with real role separation against the actual production architecture**. CLAUDE.md's `NO MOCKS` hard rule is what surfaced it. The fix is two lines:

```diff
- const evidence = createEvidenceExporter({ audit: writerAudit, tenantId });
+ const evidence = createEvidenceExporter({ audit: readerAudit, tenantId });
```

The doc note is one comment block. But without the test, future server bootstrap that wires the harness into `approved_execute` mode would have hit this in production.

## What I learned releasing this in public

v0.0.1 was a paperwork milestone (Apr 2026 — 14 GH issues mirroring 14 beads, blueprint scaffold, no code). v0.1.0 was the first software release. v0.1.1 was a same-day install-path patch (the `prepare` hook had `|| true` masking build failures — silent install success but no `dist/cli.js`, MCP server fails to register with no error visible to user). v0.1.2 was a cleanup of CI lint that broke when `jq` rewrote 8 `package.json` files during the v0.1.1 version bump and expanded short string arrays into multi-line that biome's formatter wanted compact.

That's three patches in two days. From the outside it might look chaotic. But every patch surfaced a real defect that would have hit the next end-user, and every patch shipped with a CHANGELOG entry, an AAR, and a discipline note for the next release ceremony.

The maintainer rule I'd add to my own playbook from this week:

> **Always run `npx biome check --write .` as the LAST step of any release-prep diff and re-add the formatted files. Don't trust `jq` to preserve formatting biome cares about.**

That's now an auto-memory feedback rule that travels with me into every Intent Solutions release. The discipline is the product.

## What's next

- **E3 npm publish** — the harness has the test infra now; npm publish is the bundle for the marketplace push (E11+).
- **E2.5 aggregate-query tools** — UW manager tranche per [D-017](https://github.com/jeremylongshore/guidewire-mcp-for-claude/blob/main/000-docs/004-DR-DEC-architecture-decisions.md). Same vocabulary discipline; different access pattern.
- **Karate contract recordings** — gating risk for v0.2.0. The 5 v0.1.0 tools have been validated against a profile-mocked endpoint, not yet against a real Guidewire dev-tier sandbox. Sandbox application is in flight.
- **E5 drafting tools** — `draft-referral-note`, `draft-endorsement`. First writes, gated by harness in `draft_only` mode (no real write — produces a draft artifact for human review).

If you work in carrier IT, build agent tooling, or care about the API-verb-vs-operator-language MCP design question: the [GitHub repo](https://github.com/jeremylongshore/guidewire-mcp-for-claude) is the thing to read. The [live architecture diagram](https://guidewire-mcp.intentsolutions.io/) is the visual companion. Comments and issues welcome.

---

**Source material:**

- v0.1.0 release notes: [github.com/.../releases/tag/v0.1.0](https://github.com/jeremylongshore/guidewire-mcp-for-claude/releases/tag/v0.1.0)
- v0.1.1 release notes: [github.com/.../releases/tag/v0.1.1](https://github.com/jeremylongshore/guidewire-mcp-for-claude/releases/tag/v0.1.1)
- Public gist (one-pager + audit + changelog): [gist.github.com/.../7f27185...](https://gist.github.com/jeremylongshore/7f2718520f8a2a392866d99dfa4038bb)
- Architecture decisions D-001..D-022: `000-docs/004-DR-DEC-architecture-decisions.md`
- Public Guidewire docs reference: `000-docs/005-DR-REF-guidewire-public-resources.md`
- E3 close-criterion test (the one that surfaced the architectural insight): `packages/harness/tests/e2e.pg.test.ts`

**Word count:** ~1,400 words. Trim ~200 from "what didn't ship" section if cross-posting to a venue with stricter length limits.
