# AGENTS.md

Working guide for AI agents (and humans) changing this repository. Claude Code loads it through `CLAUDE.md`; Codex and other agents read it directly.

Read the sections your task needs. You do not have to read every doc in the repo before starting: look up the code you are about to change, and use the trigger table below to find what else applies.

## Project facts

ZCF is a TypeScript ESM CLI (npm package `zcf`) that installs and configures Claude Code and Codex on the user's machine. Entry point `src/cli.ts`; `bin/zcf.mjs` loads the `dist/` bundle built by unbuild. The published package contains `bin/`, `dist/` and `templates/`. Never edit `dist/`.

| Path | What lives there |
|------|------------------|
| `src/commands/` | One file per CLI command (`init`, `menu`, `update`, `ccr`, `ccu`, `check-updates`, `config-switch`, `uninstall`) |
| `src/code-tools/` | Code tool adapter registry (Claude Code, Codex): definitions, backup, multi-config, provider profiles, template installer |
| `src/utils/` | Core logic: config read/write and merging, installer, platform, MCP, workflows/skills installer, uninstaller; `code-tools/` (Codex), `ccr/`, `cometix/`, `tools/` |
| `src/config/` | Static data: `workflows.ts`, `mcp-services.ts`, `api-providers.ts` (provider presets) |
| `src/i18n/locales/{en,zh-CN}/*.json` | i18next namespaces; use `i18n.t('namespace:key')` |
| `templates/` | Files written to users' machines: `common/output-styles/`, `claude-code/`, `codex/`, `skills/{en,zh-CN}/` |
| `tests/` | Vitest suites (`unit/`, `integration/`, `i18n/`, `templates/`, plus per-area folders). Find a module's tests with `rg -l "<module-name>" tests` |
| `docs/` | VitePress site in `en`, `zh-CN`, `ja-JP` |

## Commands

Timings are from a clean checkout and help you pick the right check.

| Command | Purpose | Time |
|---------|---------|------|
| `pnpm install` | Install dependencies | ~10 s |
| `pnpm vitest run <test files>` | Run specific test files | ~3 s |
| `pnpm typecheck` | `tsc --noEmit` | ~10 s |
| `pnpm lint` / `pnpm lint:fix` | ESLint (@antfu/eslint-config) over the repo | ~25 s |
| `pnpm test:run` | Full Vitest suite (~2.5k tests) | ~50 s |
| `pnpm test:coverage` | Full suite with the 80% coverage thresholds that CI enforces | ~60 s |
| `pnpm build` | unbuild into `dist/` | |
| `pnpm docs:build` | Build the docs site; fails on dead links | ~30 s |
| `pnpm dev` | Run the CLI from source via tsx | |

`pnpm vitest related <src files>` pulls in about 1,000 tests because most modules share imports, so prefer naming test files directly.

## Rules for every change

- Tests never touch the real home directory. `tests/setup.ts` points `HOME`, `CLAUDE_CONFIG_DIR`, `CODEX_HOME` and friends at a temp dir; keep it that way and derive paths from those, not from hard-coded locations.
- Every user-facing string goes through i18n, with the key present in both `en` and `zh-CN`.
- Use `pathe` for paths and `tinyexec` for spawning commands. Windows, macOS and Linux all run in CI, and Termux is supported.
- Code that writes a user's config must keep the user's existing content and back it up first. Reuse the existing helpers (`src/utils/config*.ts`, `json-config.ts`, `toml-edit.ts`, `src/code-tools/backup.ts`) instead of rewriting whole files.
- Code comments, commit messages and developer docs are in English. User docs and templates are localized (`zh-CN`, `ja-JP`).

## Task-triggered rules

Apply a row only when your change touches its area.

| When the change touches… | Also do | Check with |
|---|---|---|
| `src/i18n/locales/**` | Add or change the key in both `en` and `zh-CN` | `pnpm vitest run tests/i18n` |
| `templates/**` | Keep `en` and `zh-CN` in step. A new workflow skill also needs an entry in `src/config/workflows.ts` and names in `workflow.json` | `pnpm vitest run tests/templates tests/unit/config/workflows.test.ts` |
| `src/config/api-providers.ts` | Keep provider ids unique and kebab-case | `pnpm vitest run tests/unit/config/api-providers.test.ts` |
| Config writing or merging (`src/utils/config*.ts`, `claude-config.ts`, `json-config.ts`, `toml-edit.ts`, `src/utils/code-tools/codex*.ts`, `src/code-tools/`) | Cover the case where the user already has config, not only an empty home | Module tests, then `pnpm test:run` |
| Command spawning or paths (`platform.ts`, installers, `src/commands/`) | Think through Windows (quoting, `.cmd` shims, backslashes). CI covers Windows; do not claim Windows was verified unless it was | Module tests, then `pnpm test:run` |
| User-visible behavior (new or changed command, flag, menu entry, workflow, provider preset) | Update the matching pages in `docs/{en,zh-CN,ja-JP}` (the code→page map is in `.claude/skills/zcf-update-docs/SKILL.md`), and the READMEs if they list it | `pnpm docs:build` |
| `package.json` dependencies, `build.config.ts`, or which files ship | Confirm the package still builds and runs | `pnpm build` and `pnpm vitest run tests/integration/npm-package.test.ts` |
| Docs, READMEs, `AGENTS.md`, `CLAUDE.md`, `.claude/` only | Nothing else | `pnpm docs:build` only if `docs/` changed |

## Tests and verification

Match the check to the risk of the change:

1. **Docs or comments only**: no tests.
2. **A change inside one module**: `pnpm typecheck` plus that module's test files (and its `*.edge.test.ts`).
3. **Shared code** (`src/utils/config*.ts`, `platform.ts`, `src/i18n/index.ts`, `src/constants.ts`, `src/code-tools/registry.ts`, CLI setup) **or changes across modules**: also run `pnpm test:run`.
4. **Before pushing a branch with source changes**: run `pnpm test:run` once. CI then runs lint and typecheck on Ubuntu, and build plus the coverage suite on Ubuntu, Windows and macOS, so you do not need to reproduce that locally.

Run `pnpm test:coverage` locally only when CI reports a coverage failure. Lint fixes run automatically on edit (Claude Code hook) and on commit (lint-staged), so a separate full lint is rarely needed.

Writing tests:

- **Bug fix**: start with a test that reproduces the bug and fails, then fix it.
- **New behavior**: add tests in the same change, next to the module's existing tests. Extend an existing test file before creating a new one.
- **Refactor**: existing tests stay green; new tests are optional.
- **Templates and translations**: the integrity tests above cover them; no new tests needed.
- Mock the file system, prompts (`inquirer`) and external commands the way neighboring tests do. Do not write tests whose only purpose is raising the coverage number.

## When a task is done

A task is done when all of these hold:

- The requested change is made, and nothing outside it. Mention unrelated problems you noticed once in your summary instead of fixing them.
- The checks for its tier pass, and the triggered rows above are handled.
- No stray files remain: scratch scripts, logs and notes are deleted or kept outside the repo, and nothing new lands in the repo root unless the task needs it.
- Your summary says which commands you ran and what you did not verify (for example Windows behavior, or a real install).

Then stop. Do not keep polishing, and do not end with a list of optional extras to confirm.

## When to ask first

Go ahead without asking for anything local and reversible: reading, editing, running tests and builds, creating a branch, committing on a feature branch, and opening a PR when the task calls for one. When a request can be read more than one way, choose the most likely reading, say which one you chose, and continue.

Ask first before:

- pushing to `main`, merging, publishing to npm, or creating git tags (the release workflow creates tags);
- an incompatible change to the CLI's flags or defaults, or to what zcf writes into users' config;
- adding a runtime dependency;
- deleting tracked files the task did not mention.

## Commits and pull requests

- Conventional Commits with a header of at most 100 characters (enforced by commitlint). Scopes are optional.
- The pre-commit hook runs lint-staged (ESLint on staged files) and `pnpm typecheck`. Fix what it reports instead of bypassing it with `--no-verify`.
- Stage files by name and review `git diff --cached` before committing; avoid `git add .` and `git add -A`. Agent runtimes can inject local-only blocks into `CLAUDE.md` or `AGENTS.md`, and the hook rejects the known Multica block.
- PR descriptions follow `.github/PULL_REQUEST_TEMPLATE`. Tick a box only for what actually happened.
- Versions and the changelog go through changesets; see the `/zcf-release` skill.
