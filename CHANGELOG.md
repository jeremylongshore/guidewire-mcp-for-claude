# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] — 2026-05-06 — E1 foundation + E2 read-only tools + E3 harness skeleton

First software release. E1 foundation packages, E2 PolicyCenter MCP
with 5 read-only tools, and E3 harness skeleton are built and tested.
133 tests pass across 8 workspaces. Live architecture diagram at
[guidewire-mcp.intentsolutions.io](https://guidewire-mcp.intentsolutions.io/).

### Added

**E1 Foundation (7 packages):**
- `@intentsolutions/guidewire-schemas` — Zod schemas + TS contracts
- `@intentsolutions/guidewire-observability` — OTel + pino + Sentry factory
- `@intentsolutions/guidewire-auth` — Hub OAuth + JWT propagation
- `@intentsolutions/guidewire-audit` — Postgres + hash-chain audit store
- `@intentsolutions/guidewire-client` — undici Cloud API client with two-key idempotency
- `@intentsolutions/guidewire-mcp-runtime` — MCP SDK wrapper (stdio + HTTP transports)
- `@intentsolutions/guidewire-harness` — plan/policy/approval/execute/audit/rollback pipeline (#80)

**E2 PolicyCenter MCP (5 read-only tools):**
- `find-submissions-waiting-on-me` — assigned-to-me queue
- `show-policies-for-this-insured` — cross-LOB policy lookup
- `summarize-this-submission` — full submission narrative
- `did-we-lose-this-account` — non-renewal / cancellation history
- `pull-this-submission` — single submission detail

**E3 Harness skeleton:**
- Harness library + CLI skeleton — plan/policy/approval/execute/audit/rollback pipeline (#80)
- Postgres-backed ApprovalSink for approval workflow (#92)
- Boot-path error translator + CLI wiring (#93)
- BAA carve enforcement at boot when `lob_class:health` (#87)
- `oauthScope` + `idempotency.pruned` plumbed through audit chain (#85)
- Approvals table + grants in 0001_init.sql (#86)

**E4 Profile loader scaffold:**
- On-disk profile loader — `--profile <path>` boots policycenter-mcp against a real tenant (#75)
- 9-YAML schema: auth, roles, lob, typelists, custom-entities, field-aliases, approval-matrix, pii-policy, events

**Infrastructure + tooling:**
- Ship as Claude Code plugin — `/plugin install jeremylongshore/guidewire-mcp-for-claude` (#76)
- Karate contract testing for Cloud API layer (D-022) (#79)
- Testcontainers role-separation enforcement + pg-store TIMESTAMPTZ fix (#94)
- Live architecture diagram at guidewire-mcp.intentsolutions.io (#53)
- 5th project-level specialist: `guidewire-reference-librarian` (#23)
- 11-auditor staffed panel — security, MCP safety, harness contract, etc. (#52)
- README badges (CI, license, MCP-compatible, built-with-Claude) (#24)
- Workflow phase guards — CI no-ops without package.json, release is workflow_dispatch only

**Documentation:**
- 05-TECHNICAL-SPEC.md content (7.4k words) (#41)
- 04-USER-JOURNEY.md content (5.4k words) (#42)
- 01-BUSINESS-CASE.md content (3.0k words) (#39)
- 07-ROADMAP with E2.5 aggregate-query sub-epic (#43)
- Comprehensive CLAUDE.md rewrite reflecting current state (#77, #84)
- Public Guidewire docs reference (librarian KB) with PartnerConnect sandbox + Swagger UI (#54)

### Changed
- Moved site from demo.intentsolutions.io to guidewire-mcp.intentsolutions.io (#53)
- CI/release workflows customized to pnpm + Biome + Vitest + audit-harness gates
- Main branch ruleset now enforced with 6 required status checks + 1 review (#90)

### Fixed
- CI workflow startup — dropped secrets ref from job-level if: condition (#88)
- Lint baseline from 43 → 0 — Biome ignore for Karate JS, auto-fix harness package (#89)
- Mobile-responsive architecture page — removed 1024px floor, added breakpoints (#71)
- Diagram layout — clean lane layout, separate desktop + mobile views (#72)
- Diagram mermaid syntax — frontmatter + escape primaryObject.id (#50, #55, #70)

### Security
- OWNER-bypass claim corrected — explicit bypass_actors required in ruleset (#91)
- Audit DB role separation enforced via testcontainers — `audit_writer` cannot UPDATE/DELETE (#94)

## [v0.0.1] — 2026-05-04 — paperwork foundation

Auto-cut by the `release.yml` workflow on initial push to `main`.
Marker for the paperwork-foundation milestone, NOT a software
release. Subsequent releases will be manual via `workflow_dispatch`
once code begins shipping in E1+.

### Added
- Repo scaffold + beads + Claude integration + git hooks
- 14 GH issues mirroring 14 beads via `bd-sync` (12 epics + Phase 0
  sub-beads + E11+ marketplace epic)
- Phase 0 design inputs in `000-docs/`:
  `001-DR-RES-research-report.md`,
  `002-DR-CRIT-personas.md`,
  `003-DR-ARCH-oss-cowork.md`,
  `004-DR-DEC-architecture-decisions.md`
- `000-docs/blueprint/` — 12-section master blueprint scaffold
  (00 master index, 01-08 skeletons, 09 diagram placeholder, 10-AAR/
  conventions, audits/ panel scaffold for 11 auditors)
- `.claude/agents/` — 4 dual-mode specialist agent definitions
  (`mcp-safety-reviewer`, `carrier-vocabulary-curator`,
  `guidewire-api-archaeologist`, `harness-runtime-architect`)
- Standard governance set: LICENSE (Apache-2.0), CHANGELOG,
  CODE_OF_CONDUCT, CONTRIBUTING, SECURITY, SUPPORT, .editorconfig,
  .gitattributes, GitHub issue/PR templates, CODEOWNERS, FUNDING,
  dependabot, default CI/release workflows
- `/validate-consistency` post-GW-1.1 audit ran clean after fix PR
  #17

[Unreleased]: https://github.com/jeremylongshore/guidewire-mcp-for-claude/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/jeremylongshore/guidewire-mcp-for-claude/compare/v0.0.1...v0.1.0
[v0.0.1]: https://github.com/jeremylongshore/guidewire-mcp-for-claude/releases/tag/v0.0.1
