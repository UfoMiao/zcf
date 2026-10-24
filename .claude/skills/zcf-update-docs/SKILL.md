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
2. **Map code to pages.** For each user-visible change, open the matching page in `docs/en/guide/` and compare it with the code (commands, options, defaults, file paths, and strings from `packages/cli/src/i18n.ts`). For a changed string, find where its key is used (`rg "'<key>'" packages`) and check the page for that command or feature. Only pages touched by the changes need checking.
3. **Report or update.** With `--check-only`, list each mismatch as file, what the doc says, and what the code does, then stop. Otherwise fix `docs/en/` first, then make the same change in `docs/zh-CN/` and `docs/ja-JP/` so the three stay structurally parallel. Quote notices and errors with the wording in `i18n.ts` for each locale; the CLI has no Japanese strings, so `ja-JP` pages quote the English wording. Add new pages to each language's `SUMMARY.md` and the VitePress sidebar. Update `AGENTS.md` only if commands, layout or development rules changed.
4. **Verify.** Run `pnpm docs:build`; it fails on dead links and broken markdown. Fix any errors.
5. **Summarize** the pages changed and any mismatches you left alone and why.

Do not delete documented features unless the code shows they were removed. Keep brand names, URLs and command names identical across languages.

## Code → documentation map

Paths are relative to `docs/<lang>/guide/`.

| Code | Page |
|------|------|
| `packages/core/src/schema/` | `config.md` |
| `packages/cli/src/main.ts` (commands, options, exit codes) | `commands.md` |
| `packages/core/src/adapters/<tool>.ts` | That tool's section of `tools.md` |
| `packages/core/src/mirror.ts`, mirror handling in adapters | `mirrors.md` |
| `packages/core/src/presets.ts`, `presets/providers.json` (format, not entries) | `providers.md` |
| `packages/ui-kit/`, `packages/cli/src/tui/`, `packages/web/`, `packages/cli/src/server.ts` | `ui.md` |
| `packages/core/src/io/` (backups), `notice.*` strings in `i18n.ts` | `troubleshooting.md` |
| Supported tools, install or apply behavior | `index.md`, and the tools table in `docs/<lang>/index.md` |
| `package.json` scripts, package layout | `contributing.md` |
