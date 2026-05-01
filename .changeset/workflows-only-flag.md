---
"zcf": minor
---

feat(init): add `--workflows-only` flag for true workflow-only installs

Adds a new `--workflows-only` option to `zcf init` that installs workflow files
into `~/.claude/commands/zcf/` and `~/.claude/agents/zcf/` without performing
any of the other side effects of a full init: no Claude Code install/update
check, no API/MCP/output-style/CCometixLine setup, no AI language directive
written to `~/.claude/CLAUDE.md`, and no overwrite of stored language
preferences in the ZCF config.

Closes #290.
