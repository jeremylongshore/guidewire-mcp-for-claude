# Contributing to Guidewire MCP for Claude

Carrier-native MCP servers + governance harness for Guidewire estates,
designed Claude/Anthropic-first. The repo's credibility hinges on the
technical content being grounded in real published Guidewire surfaces — so
contribution discipline lives at the same bar as the code.

## Getting started

### Prerequisites

- **Node.js 22 LTS** (`>=22.0.0`)
- **pnpm 10+** (workspace topology — npm/yarn won't resolve the
  `workspace:*` ranges)
- A GitHub account
- For tasks that touch the Guidewire Cloud API: a developer-tier OAuth
  credential pair from the [Guidewire developer
  program](https://www.guidewire.com/developers). Per
  [D-021](000-docs/004-DR-DEC-architecture-decisions.md#d-021),
  the OSS does NOT ship a Jeremy-controlled sandbox; the first integration
  engagement brings their own tenant. For local dev, your own dev-tier
  creds are sufficient for `pnpm smoke-reach`.

### One-time setup

```bash
git clone https://github.com/jeremylongshore/guidewire-mcp-for-claude.git
cd guidewire-mcp-for-claude
pnpm install
pnpm -r build
pnpm -r test
```

A clean clone with `pnpm install && pnpm -r test` passing is the E1
foundation contract — see
[`07-ROADMAP § E1`](000-docs/blueprint/07-ROADMAP.md).

## Branch naming

Beads-driven naming per [CLAUDE.md](CLAUDE.md):

| Prefix | When |
|---|---|
| `feat/` | New feature — typically `feat/eN-<area>-<bz-id>` for blueprint-tied work |
| `fix/` | Bug fix |
| `docs/` | Documentation-only change |
| `chore/` | Tooling, deps, infra-only |

Every PR maps back to a bead (`bd show <id>`); the bead's notes carry a
`Blueprint:` reference to the relevant `000-docs/blueprint/` section.

## Pull request workflow

1. Fork the repository (or create a branch on the upstream if you have
   write access).
2. Run `bd ready` to find available work, or `bd create` to file a new
   bead before starting.
3. Implement on a feature branch; run the local gates:
   ```bash
   pnpm install
   pnpm -r typecheck
   pnpm -r test
   pnpm lint
   pnpm -r build
   ```
4. If your change touches `tests/TESTING.md` or any other protected file,
   re-pin the harness:
   ```bash
   pnpm exec audit-harness init
   ```
   Commit the updated `.harness-hash` alongside the policy change in the
   same commit.
5. Open the PR. **Gemini Code Assist must complete before merge** per the
   [CLAUDE.md hard rule on Gemini PR review](CLAUDE.md). Branch
   protection on `main` enforces Gemini pass + 1 human approval.

## Required gates (CI)

Every PR runs:

| Gate | What it does |
|---|---|
| `lint` | Biome — single tool, no ESLint+Prettier |
| `typecheck` | `tsc --noEmit` across all workspaces |
| `test` | Vitest across all packages |
| `build` | tsup — every package compiles to `dist/` |
| `smoke-reach` | Endpoint reachability against the librarian KB (gated by `GUIDEWIRE_OAUTH_CLIENT_ID`) |
| `audit-harness` | escape-scan, harness-hash --verify, coverage --min, arch rules |

The audit-harness gates reference the in-repo `@intentsolutions/audit-harness`
package — never `~/.claude/` paths. Enforcement travels with the code per
[CLAUDE.md hard rule #7](CLAUDE.md).

## Source-doc citation discipline

**Mandatory** for every authoring change that touches Cloud API endpoints,
typelist values, LOB codes, custom-entity shape, App Events, Hub OAuth,
or any other Guidewire technical surface (per
[CLAUDE.md § Source-doc citation discipline](CLAUDE.md)):

1. Consult the [`guidewire-reference-librarian`](.claude/agents/guidewire-reference-librarian.md)
   agent OR read [`000-docs/005-DR-REF-guidewire-public-resources.md`](000-docs/005-DR-REF-guidewire-public-resources.md)
   directly to find the authoritative public source.
2. Cite the release-versioned URL inline (e.g. *"Palisades Cloud API
   reference § /policy/v1/policies"*).
3. If no public source exists, mark the claim
   `(unverified — practitioner knowledge from public docs; first
   integration engagement validates)`.
4. **Never invent** endpoint shapes, typelist names, or syntax.

## NO MOCKS

[D-008](000-docs/004-DR-DEC-architecture-decisions.md#d-008--no-mocks--real-guidewire-cloud-sandbox-from-day-1):

- No hand-written `fixtures/*.json`. The escape-scan REFUSEs them at boot.
- `tests/recordings/` holds HTTP recordings captured from a real Cloud
  tenant with provenance in filenames + `MANIFEST.md`.
- Tests mock at the boundary (`undici` for client-sdk; replayer for
  contract tests) — never the function under test.

## Code style

- **TypeScript strict mode** (no exceptions). `tsconfig.base.json` sets
  `strict: true`, `noUncheckedIndexedAccess: true`, `verbatimModuleSyntax: true`.
- **Biome** is the lint+format tool. Run `pnpm format` before committing.
- **No `console.log` / `console.error` in production paths.** Use the
  `pino` logger from `@intentsolutions/guidewire-observability`. The
  architecture rule fails CI per
  [03-ARCHITECTURE § 4](000-docs/blueprint/03-ARCHITECTURE.md).
- **All thrown errors in `servers/*` and `packages/harness/` derive from
  `AppError`** (in `packages/observability`). Use the typed refusal
  helpers (`refuseDbTxnDuplicate`, etc.) where possible.

## Commit signing

Commits and PR descriptions are auto-signed by the global
`attribution.commit` / `attribution.pr` settings — do not restate the
footer in commit bodies.

Issue and PR-comment authorship by Claude follows the manual-footer
convention documented in [CLAUDE.md § Git Commit Signature](CLAUDE.md).

## Reporting bugs / requesting features

- **Bug**: open an issue with reproduction steps + expected vs. actual
  + environment (`pnpm --version`, `node --version`, OS).
- **Feature**: open an issue tagged `enhancement` with the operator-voice
  framing — *"as a [persona], I want to ask the agent [question] so that
  [outcome]."* Tool requests are evaluated against the
  [carrier-vocabulary 8-rule checklist](000-docs/007-DR-MEMO-carrier-vocabulary.md).

## Community

- **Bugs / features**: [GitHub Issues](https://github.com/jeremylongshore/guidewire-mcp-for-claude/issues)
- **Questions**: [GitHub Discussions](https://github.com/jeremylongshore/guidewire-mcp-for-claude/discussions)
- **Email**: jeremy@intentsolutions.io

## License

By contributing, you agree that your contributions will be licensed under
the project's [Apache-2.0 License](LICENSE).
