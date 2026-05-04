# 003-DR-ARCH — v4 architecture (OSS-first + cowork)

**Filed:** 2026-05-04
**Author:** Jeremy Longshore (architecture v4)
**Bead:** `guidewire-wtq`
**Feeds:** Blueprint epic `guidewire-7jt` / GH #2
**Status:** Phase 0 input artifact (precedes blueprint scaffolding)

---

## TL;DR

The v4 architecture pivots away from the API-shaped model in
`001-DR-RES` (capability-organized servers + adapter packs) toward a
**carrier-native vocabulary + governance harness** model, distributed
as **public OSS from day 1**, with a **cowork-fork-starter template**
that lets non-Guidewire domains reuse the pattern.

## Confirmed direction (2026-05-04)

Demand is already here. Two unprompted inbounds reached out before
the project had any public footprint. The repo's job is to **convert
that inbound + future inbound into custom build engagements** — not
to be a complete product on its own.

Audiences (priority order):

1. The 2 confirmed inbound + future carrier / MGA / SI inbound —
   primary economic driver.
2. Anthropic Enterprise / SI partner credibility — depth-of-thinking
   artifact for partner conversations.
3. Cowork cohort (Claude Code & Cowork Accelerator) — template +
   curriculum + portfolio piece.
4. Broad OSS reach (stars, forks, npm) — same playbook as
   `claude-code-plugins`.

## What the architecture is built around

**Carrier-vocabulary tools.** Tool names are the question an operator
would ask a junior analyst, not a Postman call.

| Carrier verb (real language) | Underneath, this calls |
|---|---|
| Find submissions waiting on me | PolicyCenter activities + queue + assigned-to-me |
| What's our appetite on this risk | UnderwritingCenter rules + decline history + APD |
| Show overdue accounts for Acme Brokerage | BillingCenter accounts × producer × delinquency |
| Summarize this loss | ClaimCenter claim + reserves + activities + docs + notes |
| Draft a denial letter for this claim | ClaimCenter + Smart Comms template + reason codes |
| What policies does this insured have with us | PolicyCenter policies × account × cross-LOB |
| Explain why this got referred | UnderwritingCenter referral rule trace |
| Did we lose this account last year | PolicyCenter renewal/cancel × reason |

The agent doesn't translate. The tool name *is* the question.

## Six servers organized by Guidewire suite

| Server | Suite scope | Sample tools |
|---|---|---|
| `policycenter-mcp` | PolicyCenter, UnderwritingCenter | find-submissions-waiting-on-me, whats-our-appetite-on-this-risk, draft-referral-note |
| `claimcenter-mcp` | ClaimCenter | find-claims-at-risk-of-leakage, summarize-this-loss, whats-the-reserve-picture, draft-denial-letter |
| `billingcenter-mcp` | BillingCenter | show-overdue-accounts, whats-the-payment-status, reconcile-this-payment |
| `producer-mcp` | Producer hierarchy across suites | show-my-book-of-business, whats-my-commission-status |
| `events-mcp` | Query-only over events stream | (small surface; ingestion lives in infra) |
| `payments-mcp` | Money movement (separate; dual-control gated) | NEVER in OSS demo path |

Plus the **harness library + CLI** (NOT an MCP server — recursive +
breaks tool selection): `packages/harness/` ships plan / policy /
approval / execute / audit / rollback semantics.

Plus the **events-receiver infra**: webhook + BullMQ queue → events
land in queue → suite MCPs consume; query-only `events-mcp` for
inspection.

## Adapters reframed

| Layer | Old framing | New framing |
|---|---|---|
| API client | `packages/guidewire-client` | unchanged |
| Suite-specific Guidewire wrappers | `adapters/guidewire/policycenter/` | rename to `clients/policycenter/` |
| Vendor wrappers | `adapters/partners/one-inc/` | unchanged (vendor adapters survive) |
| **Tools** | API verbs | **Carrier-vocabulary verbs** |
| Customer-specific | `adapters/customers/<name>/` (full re-mapping) | shrink to `profiles/<name>/` (mappings only, not re-implementations) |

## Three execution modes per tool

Selected per-tool via customer profile.

| Mode | What it does | Default for |
|---|---|---|
| `read_only` | Query, lookup, summarize. Never proposes writes. | Public OSS demo, unauthenticated environments |
| `draft_only` | Generates a proposed action (referral note, denial letter, endorsement, reserve adjustment) as a draft artifact. Never commits. | Most carrier deployments — high value, low blast radius |
| `approved_execute` | Harness-mediated write. Plan → policy gate → human approval → execute → audit trail → rollback hint. | Mature deployments where the harness has earned trust |

**Hard rule:** no audit = no write. No policy decision = no write.
No idempotency key = no write. No known final state = no second
attempt without reconciliation.

## NO MOCKS

Real Guidewire Cloud sandbox from day 1. Hand-written `fixtures/`
JSON is rejected. `tests/recordings/` holds HTTP recordings captured
from a real sandbox tenant, with provenance in filenames + a
`MANIFEST.md` describing each recording's source. CI fails loudly if
sandbox is unreachable — never silently degrades to mocks.

The OSS quickstart path requires the user to bring their own
Guidewire Cloud sandbox credentials. An optional `samples/` dir
contains real-API recordings clearly labeled with provenance, used as
read-only replay material — never as test ground truth.

## Stack

| Layer | Choice |
|---|---|
| Language | TypeScript 5.5+ on Node 22 LTS |
| Package manager | pnpm + workspaces |
| MCP SDK | `@modelcontextprotocol/sdk` (official TS) |
| Schemas | Zod |
| HTTP client | undici (native) |
| Test runner | Vitest |
| Lint / format | Biome (single tool) |
| Build | tsup (lib), tsx (dev) |
| Auth | openid-client (Guidewire Hub OAuth) |
| Queue | BullMQ on Redis (dev) → Cloud Tasks / SQS (prod) |
| Audit store | Postgres + hash-chain |
| Secrets | SOPS + age (per IS standard) |
| Observability | OpenTelemetry + pino + Sentry |
| Container | Docker |
| Deploy | Cloud Run |
| IaC | OpenTofu |

**Not** Express / Fastify for MCP servers — use the SDK's stdio + HTTP
transports directly. Adding a web framework adds attack surface and
obscures the protocol.

## Observability from day 1

OpenTelemetry tracing + pino structured logs + Sentry error capture,
all on by default. Standard span shape on every MCP tool call:

```
mcp.tool.invoke (root)
├── harness.plan.create
├── harness.policy.evaluate (mode: read_only|draft_only|approved_execute, tier)
├── harness.approval.wait (if applicable)
├── client.guidewire.cloud.<endpoint> (tenant_id, lob, http.status)
├── harness.audit.write
└── harness.evidence.bundle
```

Every span carries `trace_id`, `tenant_id`, `tool_name`, `mode`,
`actor_id`. Architecture rules in CI enforce span coverage; raw
`console.log` in production paths fails CI.

## Cowork integration

Three concrete answers to "how do non-engineer cowork members use
this?":

**A. Template fork.** `templates/cowork-fork-starter/` + `pnpm
guidewire init <domain>` script. Forking it is the assignment.
Examples — flatbed-mcp (Jeremy's own trucking), mls-mcp (real
estate), floor-mcp (restaurant ops), shopify-mcp (e-com).

**B. Live curriculum.** Each of the 10 epics ≈ 1 week of cowork
content. Mon/Tue: Jeremy builds. Wed: members open small PRs. Thu/Fri:
office hours on their forks.

**C. Portfolio + content engine.** Non-engineering contribution
surfaces — carrier-vocabulary tool descriptions, fixture authorship,
README / examples, issue triage.

## Hard "do not build" guardrails

Stays out of OSS MVP until specific signal:

| Stays out | Until |
|---|---|
| Live `approved_execute` against real Guidewire | A real customer with sandbox access opts in |
| SOAP / legacy InsuranceSuite | A self-managed customer pays for it |
| InsuranceNow client | Inbound from an InsuranceNow customer |
| Payment rails / money movement | Dual-control reviewed by security; never in OSS demo |
| SaaS control plane | A second customer asks for it |
| `document-comms-mcp` | After ClaimCenter + BillingCenter MCPs ship |

The OSS repo defaults to `read_only` / `draft_only` for the public
demo path — removes compliance surface that would block a public
release. **But** the harness ships `approved_execute` mode in E3 —
the code path is real, customers flip it on with config + sandbox
creds. The OSS demo is the floor, not the ceiling.

## Reference

- Original research report: `001-DR-RES-research-report.md`
- Adversarial red team: `002-DR-CRIT-personas.md`
- Decision log: `004-DR-DEC-architecture-decisions.md`
- Master blueprint (lands as GW-1.x): `000-docs/blueprint/`
