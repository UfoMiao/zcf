# 新增 serena MCP 服务集成计划

任务：在 MCP 安装流程中新增 `serena` 服务，并根据代码工具类型动态调整 `--context` 参数（Codex 使用 `codex`，Claude Code 使用 `ide-assistant`）。

## 背景
- 现有 MCP 服务集中在 `src/config/mcp-services.ts` 统一管理，并通过 `getMcpServices()` 提供 i18n 名称与描述。
- Codex 与 Claude Code 的 MCP 配置路径不同：
  - Claude Code：在 `init` 流程中写入 `~/.claude.json` 的 `mcpServers`。
  - Codex：在 `configureCodexMcp` 中写入 `~/.codex/config.toml` 的 `[mcp_servers.*]`。

## 变更项
- 配置：`src/config/mcp-services.ts` 新增 serena（stdio, uvx, 默认 `--context ide-assistant`）。
- 运行时参数调整：
  - `src/commands/init.ts`：当服务为 serena 时，根据 `codeToolType` 将 `--context` 设置为 `codex` 或 `ide-assistant`。
  - `src/utils/code-tools/codex-configure.ts`：当服务为 serena 时，强制将 `--context` 设置为 `codex`。
- i18n：
  - `src/i18n/locales/en/mcp.json` 与 `src/i18n/locales/zh-CN/mcp.json` 增加 serena 名称与描述。
- 测试：`tests/config/mcp-services.test.ts` 的期望服务清单加入 `serena`。

## 验证
- 运行 `pnpm typecheck`：类型应通过。
- 运行 `pnpm test`：新增与回归测试均应通过；`open-websearch` 保持第二位断言。
- 手动验证：
  - `zcf i --skip-prompt --mcp-services=serena`（Claude Code）：写入 `--context = "ide-assistant"`。
  - `zcf i --skip-prompt -T cx --mcp-services=serena`（Codex）：写入 `--context = "codex"`。

## 回滚
- 删除 serena 相关配置与 i18n 文案；回退测试改动；不影响其它服务。

