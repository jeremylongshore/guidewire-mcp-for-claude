# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — Phase 0 polish + infra hardening (2026-05-04, post v0.0.1)
- README badges (CI, license, paperwork-first status, MCP-compatible,
  built-with-Claude, marketplace target)
- README **Building in public** section + cross-links to blueprint
  inputs (master blueprint index, architecture decision log, persona
  red-team memo, public Guidewire docs reference)
- E11+ marketplace epic visible in the public roadmap table
- 5th project-level specialist: [`guidewire-reference-librarian`](./.claude/agents/guidewire-reference-librarian.md)
  + canonical public-docs reference at
  [`000-docs/005-DR-REF-guidewire-public-resources.md`](./000-docs/005-DR-REF-guidewire-public-resources.md)
- Workflow phase guards — `ci.yml` no-ops without `package.json`,
  `release.yml` is `workflow_dispatch` only (no auto-cut on push)
- Sandbox application playbook expanded with the "planet"
  provisioning nuance (Guidewire Cloud customers get sandboxes via
  the provisioning team; non-customers go through PartnerConnect /
  Marketplace)

### Notes / pending customization
- CI/release workflows ship with default `npm`-based templates from
  `/repo-dress`. Stack-specific customization (pnpm + Biome + Vitest
  + `@intentsolutions/audit-harness` gates) lands in **GW-2.3** (E1
  sub-bead) when code arrives.

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

[Unreleased]: https://github.com/jeremylongshore/guidewire-mcp-for-claude/compare/v0.0.1...HEAD
[v0.0.1]: https://github.com/jeremylongshore/guidewire-mcp-for-claude/releases/tag/v0.0.1
