# MCP 服务集成

ZCF 内置常用 MCP 服务配置，支持交互式选择或非交互式参数输入。

## 默认服务列表

| 服务 ID | 类型 | 说明 | 是否需要 API Key |
| --- | --- | --- | --- |
| `context7` | stdio | 上下文检索与库文档查询 | 否 |
| `open-websearch` | stdio | DuckDuckGo/Bing/Brave 搜索 | 否 |
| `spec-workflow` | stdio | Spec 工作流 MCP 服务 | 否 |
| `mcp-deepwiki` | stdio | DeepWiki 文档检索 | 否 |
| `Playwright` | stdio | Playwright 浏览器操作 | 否 |
| `exa` | stdio | Exa 网络搜索，需要 `EXA_API_KEY` | 是 |
| `serena` | uvx | Serena IDE 助手 | 否 |

## 选择策略

- 交互式模式中，可勾选需要的服务，并在需要时输入 API Key。
- `--mcp-services all` 会安装所有无密钥服务；`skip` 则跳过。
- ZCF 会在 `mcpServers` 中去重并自动修正 Windows 特殊路径。

## 配置文件位置

- Claude Code：`~/.claude/settings.json` 中的 `mcpServers`。
- Codex：`~/.codex/config.toml` 中的 `[mcp_server]` 条目。

## 常见操作

- 运行 `npx zcf` 菜单选择 `4` 重新配置 MCP。
- 若手动修改配置，可再次执行 `zcf init` 的增量管理功能进行合并。
