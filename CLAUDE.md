# CLAUDE.md

@AGENTS.md

## Claude Code specifics

- A PostToolUse hook (`.claude/hooks/format-hook.mjs`) runs `oxlint --fix` and `oxfmt` on every file you edit, so you do not need to run lint after edits.
- Project skills are invoked by the user: `/zcf-pr`, `/zcf-release`, `/zcf-update-docs`, `/zcf-add-sponsor`.
- Agent runtimes such as Multica may append an auto-managed block to this file in a local checkout. It is local-only; never commit it (the pre-commit hook blocks it).
