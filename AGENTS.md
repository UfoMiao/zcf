# AGENTS.md

Working guide for AI agents and people changing this repository. Claude Code loads it through `CLAUDE.md`; Codex and other agents read it directly. Read the sections your task needs, then use the trigger table to find what else applies.

## What ZCF is

ZCF v5 is a ground-up rewrite (v3 is frozen at the `zcf@3.7.3` tag; there was no v4). The user keeps one ZCF config, picks AI coding tools, and ZCF installs the tools that are missing and writes each tool's own native config. It configures the tools; it is not a gateway or proxy.

Priorities, in order: speed (startup and apply), development speed, and user experience. No backward compatibility with v3 config or commands.

Prefer each tool's own commands and mainstream CLIs over reimplementing them: `claude update`, `claude mcp add-json`, `npx skills add`, and so on. Edit config files only for settings no command covers.

## Layout

| Path | What lives there |
|------|------------------|
| `packages/core` (`@zcf/core`, private) | Headless engine: `schema/` (valibot config schema), `adapters/` (one per tool), `plan/` (plan types, diff preview, apply), `io/` (format-preserving JSON/TOML edits, atomic writes, backups), `exec/` (command runner) |
| `packages/ui-kit` (`@zcf/ui-kit`, private) | Shared by the terminal and web UIs, no rendering: draft model and validation, page and field definitions, `useConfigEditor`, the `ZcfService` interface |
| `packages/cli` (`zcf`, private until v5 ships) | `cli.ts` (entry with the fast `--version` path), `main.ts` (cac commands), `render.ts` (terminal output, secret masking), `i18n.ts` (en and zh-CN strings), `service.ts` (`ZcfService` backed by core), `tui/` (Ink app, loaded lazily) |
| `packages/*/test` | Vitest suites for that package |
| `presets/providers.json` | Provider presets, fetched at runtime so they change without a release; validated by `packages/core/test/presets.test.ts` |
| `scripts/bench-startup.mjs` | Startup benchmark that CI enforces |
| `docs/` | VitePress site. Pages are `docs/{en,zh-CN,ja-JP}/` (home page and `guide/`); v3's docs live at the `zcf@3.7.3` tag. Deployed by hand (`docs-deploy.yml`) |
| `docs/adr/` | Architecture decisions; read `002-v5-architecture.md` before changing the engine |

How it fits together: an adapter turns the config into a `ToolPlan` of steps. A step either runs a command or applies key edits to one native config file. `applyPlan` runs tools in parallel and each tool's steps in order, skipping the rest of a tool after a failure. Core returns message keys, never display text; front ends translate them.

## Commands

Timings are from this repo on a warm machine.

| Command | Purpose | Time |
|---------|---------|------|
| `pnpm install` | Install (pnpm 12, Node 22+) | <1 s warm |
| `pnpm vitest run <files>` | Run specific test files | <1 s |
| `pnpm test:run` | Full suite | ~1.5 s |
| `pnpm test:coverage` | Full suite with the 80% thresholds CI enforces | ~2 s |
| `pnpm typecheck` | TypeScript 7 native `tsc --noEmit` | ~0.7 s |
| `pnpm lint` / `pnpm lint:fix` | oxlint (type-aware) and oxfmt | ~1 s |
| `pnpm build` | tsdown bundle into `packages/cli/dist` | ~0.4 s |
| `pnpm bench` | `zcf --version` startup, fails over 60 ms | ~3 s |
| `pnpm dev <args>` | Run the CLI from source with tsx | |

## Rules for every change

- Tests never touch the real home directory or run real installers. Pass `home`, `platform`, `env`, `runner` and `readFile` through `AdapterContext`, and use the fake runner and temp folders in `packages/core/test/helpers.ts`.
- User config is edited key by key, never rewritten: `editJson`/`editToml` keep comments and layout, writes are atomic, and files are backed up before their first change in a run.
- Never print secrets. Anything shown to the user goes through `Renderer`, which masks the API key, MCP env/header values and credentials found in native files.
- Every user-facing string has a key in both `en` and `zh-CN` (`packages/cli/src/i18n.ts`).
- Use `pathe` for paths and `tinyexec` (through `CommandRunner`) for processes. CI runs Windows, macOS and Linux; think through `.cmd` shims and quoting on Windows.
- Keep startup fast: nothing heavy at module top level, and load rarely used code (such as the TOML parser) with `import()`.
- Code comments, commit messages and developer docs are in English.

## Task-triggered rules

| When the change touches… | Also do | Check with |
|---|---|---|
| `packages/core/src/schema` | Keep `parseZcfConfig` errors pointing at the right path | `pnpm vitest run packages/core/test/schema.test.ts` |
| An adapter, or a new tool | Use the tool's own commands where they exist. Cover a fresh install, an existing config and Windows paths with the fake runner | That adapter's tests, then `pnpm test:run` |
| `packages/core/src/io` or `plan` | Cover files that already have content, comments or wrong syntax | `pnpm test:run` |
| CLI output or i18n | Both locales, and secrets stay masked | `pnpm vitest run packages/cli/test` |
| `packages/ui-kit` or `packages/cli/src/tui` | Test through `App` with `ink-testing-library` and a fake `ZcfService`; secrets stay masked | `pnpm vitest run packages/cli/test/tui.test.tsx packages/ui-kit` |
| Dependencies, `tsdown.config.ts`, or `cli.ts` | Keep the published CLI dependency-free and fast | `pnpm build && pnpm bench` |
| Docs, `AGENTS.md`, `CLAUDE.md`, `.claude/` only | Nothing else | `pnpm docs:build` only if `docs/` changed |

## Testing

- Bug fix: write the failing test first. New behavior: tests in the same change. Refactor: stay green.
- Test behavior through public functions (`planTools`, `applyPlan`, `main`), not internals. Extend an existing test file before creating a new one, and don't add tests only to raise coverage.
- Before pushing, run `pnpm lint`, `pnpm typecheck` and `pnpm test:run` once. CI owns the OS matrix, coverage and the startup budget.

## Done and autonomy

A change is done when the checks above pass, the triggered rows are handled, and the user-visible behavior is described in the PR. Leave no stray files (scratch scripts, logs, notes) in the repo. Say which commands you ran and what you did not verify (for example Windows behavior or a real install). Mention unrelated problems you noticed once instead of fixing them, then stop.

Go ahead with local, reversible work. When a request can be read more than one way, choose the most likely reading, say which one you chose, and continue. Ask first before pushing to `main`, merging, publishing, tagging, removing `"private": true` from a package (the release workflow publishes every public package), breaking the config schema, adding a runtime dependency, or deleting tracked files the task did not mention.

## Commits and pull requests

- Conventional Commits with a header of at most 100 characters (enforced by commitlint).
- The pre-commit hook runs lint-staged and `pnpm typecheck`. Fix what it reports instead of bypassing it with `--no-verify`.
- Stage files by name and review `git diff --cached` before committing. Agent runtimes can inject local-only blocks into `CLAUDE.md` or `AGENTS.md`; the hook rejects the known Multica block.
- PR descriptions follow `.github/PULL_REQUEST_TEMPLATE`. Tick a box only for what actually happened.
- Versions and the changelog go through changesets; see the `/zcf-release` skill.
