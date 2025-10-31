# 多配置与备份

ZCF 在 API、输出风格与配置文件层面提供多维度的备份与多配置支持。

## 多 API 配置

- 使用 `--api-configs` 传入 JSON 字符串，或 `--api-configs-file` 指定文件。
- 每个配置支持 `provider`、`type`、`key`、`url`、`primaryModel`、`fastModel`、`default` 等字段。
- 初始化时会调用 `setPrimaryApiKey` 与 `mergeMcpServers`，确保默认配置正确写入。

## 配置备份

- Claude Code：配置、MCP、工作流、输出风格等均会备份到时间戳目录。
- Codex：`backupCodexComplete`、`backupCodexConfig`、`backupCodexAgents`、`backupCodexPrompts` 提供不同粒度。
- CCR、CCometixLine 同样提供备份函数保证安全回滚。

## 增量管理

- 若检测到已有配置，ZCF 会提示 `backup`、`merge`、`new`、`skip` 等策略。
- 支持仅更新提示词（`docs-only`）或跳过所有操作，避免覆盖自定义内容。

## 建议的版本控制策略

- 在团队环境中，建议将 `~/.claude`、`~/.codex`、`~/.ufomiao/zcf` 纳入 Git Worktree 的专用仓库。
- 使用 `/git-worktree` 指令在不同工作区间同步配置变更。
