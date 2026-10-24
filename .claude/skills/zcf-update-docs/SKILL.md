---
name: zcf-update-docs
description: Bring docs/ (en, zh-CN, ja-JP) and AGENTS.md in line with code changes since the last release tag
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(git:*), Bash(pnpm:*)
---

# ZCF Update Docs

Find user-visible changes since the last tag and update the documentation that describes them.

Usage: `/zcf-update-docs [--check-only]`. With `--check-only`, report what is out of date and change nothing. Arguments: $ARGUMENTS

## Steps

1. **Scope.** Last tag: `git describe --tags --abbrev=0`. List changed files with `git diff --name-only <tag>..HEAD` and read the diffs of the source files that the map below covers. Ignore test-only and internal refactor changes that do not alter behavior.
2. **Map code to pages.** For each user-visible change, open the matching page in `docs/en/` and compare it with the code (commands, flags, menu entries, defaults, prompts from `src/i18n/locales/*/*.json`). Only pages touched by the changes need checking.
3. **Report or update.** With `--check-only`, list each mismatch as file, what the doc says, and what the code does, then stop. Otherwise fix `docs/en/` first, then make the same change in `docs/zh-CN/` and `docs/ja-JP/` so the three stay structurally parallel. Add new pages to each language's `SUMMARY.md` and the VitePress sidebar. Update `AGENTS.md` only if commands, layout or development rules changed.
4. **Verify.** Run `pnpm docs:build`; it fails on dead links and broken markdown. Fix any errors.
5. **Summarize** the pages changed and any mismatches you left alone and why.

Do not delete documented features unless the code shows they were removed. Keep brand names, URLs and command names identical across languages.

## Code → documentation map

Paths are relative to `docs/<lang>/`.

| Code | Page |
|------|------|
| `src/commands/init.ts`, `src/i18n/locales/*/cli.json` | `cli/init.md`, `getting-started/installation.md` |
| `src/commands/menu.ts`, `src/i18n/locales/*/menu.json` | `cli/menu.md` |
| `src/commands/update.ts` | `cli/update.md` |
| `src/commands/ccr.ts`, `src/utils/ccr/` | `cli/ccr.md`, `features/ccr.md` |
| `src/commands/ccu.ts` | `cli/ccu.md`, `features/ccusage.md` |
| `src/commands/check-updates.ts` | `cli/check-updates.md` |
| `src/commands/config-switch.ts` | `cli/config-switch.md` |
| `src/commands/uninstall.ts`, `src/utils/uninstaller.ts` | `cli/uninstall.md` |
| `src/utils/installer.ts`, `src/utils/claude-config.ts`, `src/code-tools/claude-code/` | `features/claude-code.md` |
| `src/utils/code-tools/codex*.ts`, `src/code-tools/codex/`, `templates/codex/` | `features/codex.md` |
| `src/config/workflows.ts`, `templates/skills/` | `features/workflows.md`, `workflows/*.md` |
| `src/config/mcp-services.ts` | `features/mcp.md` |
| `src/utils/cometix/` | `features/cometix.md` |
| `src/utils/config.ts`, `src/code-tools/multi-config.ts`, `src/code-tools/provider-profiles.ts` | `features/multi-config.md`, `advanced/configuration.md` |
| `src/config/api-providers.ts` | `advanced/api-providers.md` |
| `templates/common/output-styles/` | `best-practices/output-styles.md`, `advanced/templates.md` |
| `src/i18n/` (new language or namespace) | `advanced/i18n.md` |
| `package.json` scripts, `tests/` structure | `development/*.md` |
