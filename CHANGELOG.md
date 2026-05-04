# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — Phase 0 (paperwork-first, 2026-05-04)
- Repo scaffold + beads + Claude integration + git hooks
- 14 GH issues mirroring 14 beads via `bd-sync` (12 epics + Phase 0
  sub-beads + E11+ marketplace epic)
- Phase 0 design inputs filed in `000-docs/`:
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
- Standard governance set (this PR): LICENSE (Apache-2.0),
  CHANGELOG, CODE_OF_CONDUCT, CONTRIBUTING, SECURITY, SUPPORT,
  .editorconfig, .gitattributes, GitHub issue/PR templates,
  CODEOWNERS, FUNDING, dependabot, default CI/release workflows.
- `/validate-consistency` post-GW-1.1 audit ran clean after fix PR
  #17.

### Notes / pending customization
- CI/release workflows ship with default `npm`-based templates from
  `/repo-dress`. Stack-specific customization (pnpm + Biome +
  Vitest + `@intentsolutions/audit-harness` gates) lands in **GW-2.3**
  (E1 sub-bead) when code arrives.

[Unreleased]: https://github.com/jeremylongshore/guidewire-mcp-for-claude/compare/main...HEAD
