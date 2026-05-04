# Testing Context — guidewire-mcp-for-claude
<!-- TESTING.md schema v1 (see ~/.claude/skills/audit-tests/references/testing-md-spec.md) -->
<!-- Managed by audit-tests + implement-tests. Policy sections engineer-owned. -->
<!-- Hash-pin via: pnpm exec audit-harness init  (after engineer policy edits). -->

## Classification (policy)

```
Repo type: monorepo (pnpm workspaces)
  Workspace pattern: packages/* + servers/* + clients/*

  Per-package classification:
    packages/harness          → library (criticality: load-bearing)
    packages/observability    → library
    packages/audit            → library (criticality: load-bearing)
    packages/auth             → library (criticality: load-bearing)
    packages/schemas          → library
    packages/guidewire-client → library
    servers/policycenter-mcp  → service / api (MCP)
    servers/claimcenter-mcp   → service / api (MCP)
    servers/billingcenter-mcp → service / api (MCP)
    servers/producer-mcp      → service / api (MCP)
    servers/events-mcp        → service / api (MCP, query-only)
    clients/*                 → library (HTTP wrappers)
    profiles/                 → config-only (validated, not tested)

Primary language(s): typescript (Node 22)

Applicable layers (workspace root + each service):
  L1 — git hooks (lint-staged + pre-commit gitleaks + commitlint)
  L2 — static (Biome, dep-cruise architecture rules, tsc strict)
  L3 — unit (Vitest with Zod-driven property tests on schemas)
  L4-integration   (testcontainers Postgres for hash-chain audit)
  L4-contract      (recordings-replay against tests/recordings/*.json)
  L4-migration     (audit-chain SQL migration smoke tests)
  L5-sec           (gitleaks secrets scan, OWASP coverage A, SOPS+age)
  L6-smoke         (harness CLI smoke; servers/* MCP smoke)
  L7-UAT           (E10 onboarding CLI runs against customer sandbox)

Waived layers:
  L5-a11y     — no UI surface in OSS scope
  L6-visual   — no UI
  L6-e2e      — no browser-driven path; smoke covers conversational MCP loop
  L5-perf     — recommended only; promoted to ✅ when E1 ships and we have a baseline

Compliance overlay: SOC 2 (audit hash-chain integrity, evidence
  bundle export, secret rotation, BAA path for health LOBs).
  Overlay promotes L2, L4-contract, L5-sec, L7-UAT to ✅.
```

---

## Thresholds (policy, hash-pinned)

```
coverage.line: 80
coverage.branch: 70

mutation.kill_rate: 70
mutation.per_module:
  packages/harness: 85          # load-bearing — see 009-DR-MEMO
  packages/audit: 85            # load-bearing — see 009-DR-MEMO § hash chain
  packages/auth: 85              # load-bearing — see 006-DR-MEMO § auth refusal
  packages/observability: 80
  servers/*: 75                  # tools must be tested but harness owns the hard core
  clients/*: 70

crap.prod_max: 30
crap.test_max: 15
crap.project_avg: 10

flaky.tolerance: 0/3runs
test.complexity_ceiling: 15
perf.p99_ms: 250                # L5 perf, applies once E1 ships

security.owasp_coverage: A      # regulated (SOC 2) overlay

# Vocabulary linter (per 007-DR-MEMO § 7 — 8-rule PR-time checklist)
vocab.api_verb_leak: 0          # zero tolerance: search_*, get_*, list_*, fetch_*,
                                #                 query_*, update_*, create_*, delete_*
vocab.engineering_speak: 0      # zero: serialize, mutate, fetch, payload, cursor, pagination
vocab.persona_density_min: 5    # each persona must have ≥5 tools speaking their language

# Recordings policy (per 008-DR-MEMO § sandbox-blocked items, tests/recordings/MANIFEST.md)
recordings.required_for_write_tools: true
recordings.required_for_read_tools: true
recordings.public_docs_grounding_required_when_no_sandbox: true
recordings.fixture_files_forbidden: true   # NO MOCKS rule — D-008

# Architecture rules (per 009-DR-MEMO § 11 + Hard Rule #5)
arch.servers_cannot_import_clients_directly: enforced
arch.servers_must_invoke_via_packages_harness: enforced
arch.profiles_cannot_contain_executable_code: enforced
arch.harness_cannot_be_imported_by_other_harness: enforced

# Bias / guard tests
bias.tautology_max: 0           # tests that re-assert the function's literal behavior
bias.over_mocked_modules_max: 0 # tests that mock the function under test

# Gherkin lint (L7-UAT acceptance, per E10)
gherkin.scenario_complexity_max: 7   # lines per scenario before manageability suffers
gherkin.duplicate_steps_per_feature_max: 3
```

---

## Installed gates (observational)

> Filled by `implement-tests` when E1 lands the testing pipeline
> (GW-2.x sub-beads). Currently empty — paperwork phase.

```
L1: (pending GW-2.2)
L2: (pending GW-2.2)
L3: (pending GW-2.2)
L4-integration: (pending GW-2.x)
L4-contract: (pending GW-2.x)
L4-migration: (pending GW-2.x — when audit-chain Postgres lands in E3)
L5-sec: gitleaks (already enforced via .github/workflows/secrets-scan.yml — PR #25)
L6-smoke: (pending GW-2.x)
L7-UAT: (pending E10)
```

---

## Frameworks (observational)

> Filled by `implement-tests`. Currently planned per `CLAUDE.md` § Stack:

```
unit:        Vitest 1.x
property:    fast-check 3.x  (paired with Zod schemas)
mutation:    Stryker 8.x      # JS/TS mutation testing
e2e/smoke:   Vitest + child_process for MCP servers; bash-based for CLI
contract:    Pact-equivalent on top of recordings-replay
migration:   pgTAP equivalent in TS via testcontainers
arch-rules:  dependency-cruiser (depcruise) 16.x
gherkin:     @cucumber/gherkin (lint only — no execution at L7 yet)
secrets:     gitleaks-action @ v2 (pinned in workflow)
links:       lychee-action @ v2 (weekly cron)
crap:        radon equivalent for TS (custom script via tsmorph)
```

---

## Last audit (observational)

```
date: never (paperwork phase; first audit fires at start of GW-2.x)
grade: pending first audit
auditor: audit-tests v?.?.?
p0_gaps: pending
p1_gaps: pending
```

---

## Traceability (observational, updated by `audit-tests`)

> RTM (Requirements Traceability Matrix), Personas, Journeys all
> live as separate docs once GW-2.x runs `rtm-scaffolder-agent`:
>
>   tests/RTM.md
>   tests/PERSONAS.md   (auto-generated from 002-DR-CRIT-personas.md)
>   tests/JOURNEYS.md   (auto-generated from 04-USER-JOURNEY.md)

```
rtm.total_requirements: pending
rtm.by_moscow: pending

personas.declared: 9             # 002-DR-CRIT-personas.md
personas.under_threshold: pending

journeys.declared: 6             # 04-USER-JOURNEY.md J-1..J-6
journeys.fully_covered: pending
journeys.partial: pending
```

---

## Hash manifest

```
version: 1
last_init: 2026-05-04 by jeremy@intentsolutions.io
protected_files:
  - tests/TESTING.md#policy            # sections above "## Installed gates"
  - .dependency-cruiser.cjs             # arch rule definitions
  - .gitleaks.toml                      # secrets scanner rules (when added)
  - tsconfig.json#compilerOptions.strict
  - tests/recordings/MANIFEST.md#schema  # recording provenance contract
  - 000-docs/blueprint/audits/*.md       # staffed audit panel memos
  - 000-docs/004-DR-DEC-architecture-decisions.md  # decision log is policy-grade
```

---

## Cross-references

- IS Testing SOP: `~/000-projects/CLAUDE.md` § Intent Solutions Testing SOP
- 7-layer taxonomy: `~/.claude/skills/audit-tests/references/taxonomy.md`
- Schema spec: `~/.claude/skills/audit-tests/references/testing-md-spec.md`
- Layer applicability matrix: `~/.claude/skills/audit-tests/references/layer-applicability.md`
- Recordings provenance contract: `tests/recordings/MANIFEST.md`
- Vocabulary 8-rule checklist: `000-docs/007-DR-MEMO-carrier-vocabulary.md` § 7
- Harness contract (drives mutation per-module floors):
  `000-docs/009-DR-MEMO-harness-runtime.md` § 1 + § 2

## Operating discipline

1. **AI never edits policy sections.** `escape-scan.sh` REFUSES any
   diff that touches policy lines unless preceded by engineer-
   initiated `pnpm exec audit-harness init`.
2. After any policy edit, hash-pin: `pnpm exec audit-harness init`.
   Commit the updated `.harness-hash` alongside the policy change in
   one commit.
3. AI fills observational sections via `Edit` tool, not `Write`
   (avoids overwrites of engineer edits).
4. CI calls `pnpm exec audit-harness <command>` — **never**
   `~/.claude/` paths. Enforcement travels with the code.
