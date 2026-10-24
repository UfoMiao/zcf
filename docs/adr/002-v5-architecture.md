# ADR 002: ZCF v5 architecture

- Status: Accepted
- Date: 2026-10-24
- Supersedes: ADR 001 for everything on `main` (ADR 001 still describes v3)

## Context

ZCF v3 configures Claude Code and Codex separately, through an inquirer menu that cannot show real forms. Each tool repeats the same questions, and config writing is spread across many modules. `zcf --version` takes about 265 ms.

The maintainer asked for a rewrite with these goals, in order: speed, development speed, and user experience. Backward compatibility is not required. Specifically:

- One ZCF config (provider, MCP servers, skills, and later more) is applied to every selected AI tool. ZCF installs missing tools and writes each tool's own native config. It is not a gateway.
- Use each tool's own commands and mainstream CLIs (`claude update`, `claude mcp`, `npx skills`) instead of reimplementing them.
- A form-based TUI, and a local web UI (like `ccr ui`) that reuses the same building blocks.
- The release is v5. There is no v4.

## Decision

### Packages

A pnpm workspace:

- `@zcf/core`: headless engine with no terminal or UI code.
- `zcf`: the CLI, bundled by tsdown into a dependency-free package.
- Later phases add a UI kit shared by an Ink TUI and a React web UI. Both are driven by the same valibot schema and core API.

### Plan, diff, apply

Every action is planned before anything changes:

1. Each tool adapter reads the current state (`detect`) and turns the config into a `ToolPlan`. A step either runs a command (the tool's own CLI first) or applies key edits to one native config file.
2. Front ends show the plan, with a unified diff for each file step, using `previewFileStep`.
3. `applyPlan` runs tools in parallel and each tool's steps in order. A failed step skips the rest of that tool, because later steps depend on earlier ones. Each file is backed up once per run, before its first change.

File edits are format-preserving: jsonc-parser for JSON/JSONC and toml-patch for TOML. Writes go through a temporary file and a rename, and keep the file's mode. Comments, key order and unrelated keys stay as they are.

Adapters are pure apart from what goes through `AdapterContext` (home, platform, command runner, file reader). Tests therefore never touch the real home directory or run real installers.

Core returns message keys and parameters, never display text. Each front end translates them (en and zh-CN).

### Config

The config is JSON with comments at `~/.ufomiao/zcf/zcf.json` (or `--file`), validated by a valibot schema with `version: 1`. The same schema will drive TUI and web forms.

### Claude Code adapter (first tool)

| Item | How |
|------|-----|
| Detect | `claude --version`, then `~/.local/bin/claude` |
| Install | The official native installer (`install.sh`, or `install.ps1` on Windows) |
| Update | `claude update` |
| Provider | `env` keys in `~/.claude/settings.json`. ZCF owns the `ANTHROPIC_*` keys it writes and removes the ones the config leaves unset |
| MCP | `claude mcp add-json --scope user`. Servers already in `~/.claude.json` with the same definition are skipped; changed ones are removed and added again. On Windows, `npx`-style commands are wrapped in `cmd /c` |
| Skills | `npx skills add <source> -g -a claude-code`, skipped when every named skill is already installed |

Codex, Gemini CLI and OpenCode follow the same pattern in later phases.

### Tooling

- TypeScript 7 (native `tsc`) for type checking.
- oxlint (type-aware, through tsgolint) and oxfmt for linting and formatting. typescript-eslint does not support TypeScript 7.
- tsdown bundles the CLI. Code that only some commands need, such as the TOML parser, is loaded with `import()` and lands in its own chunk.
- Vitest 5 with 80% coverage thresholds.
- A CI benchmark fails when the median `zcf --version` time goes over 60 ms. It measures about 30 ms, close to the cost of starting Node itself.

The oxc type checker `tsrs` was evaluated. It is not used for now because pnpm 12's supply-chain policy rejects its current release as a trust downgrade, and it gains little over native `tsc` at this repo's size.

## Consequences

- v3 code, tests and templates are removed from `main`. Users keep v3 from npm until v5 is published. The `zcf` package stays `"private": true` until then, because the release workflow publishes every public package.
- The docs site still describes v3 and is rewritten in a later phase.
- Every new tool or setting is an adapter change plus tests with the fake runner. No command or front-end changes are needed unless the schema grows.
