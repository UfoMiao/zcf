# Codex 支持

ZCF 在 `menu` 与 `init` 中原生支持 Codex，实现与 Claude Code 等价的自动化体验。

## 安装与升级

- 自动检测系统是否已安装 `@openai/codex` CLI，若缺失则执行 `npm install -g @openai/codex`。
- 支持一键升级，命令失败时提供错误输出并中断，避免错误状态。

## 配置文件管理

- 生成或管理 `~/.codex` 目录，包括 `config.toml`、`auth.json`、`AGENTS.md`、`prompts/`。
- 提供完整备份机制：所有配置、授权、工作流、提示词都会写入 `backup_YYYY-MM-DD_HH-mm-ss`。
- 支持仅备份单项（配置、授权、API、MCP、系统提示、工作流、CLI 包、备份目录）。

## API 提供商与模型

- 与 Claude Code 相同，可使用 `--provider` 预设或自定义 API。
- `codex-configure.ts` 会根据选择拉起 MCP 配置，确保模型与服务一致。
- 管理模式会自动判断配置是否由 ZCF 管理（`managed` 字段），避免覆盖手写配置。

## MCP 与工作流

- 提供 Codex 专属 MCP 导入流程，支持 Context7、Open Web Search 等常用服务。
- 同步导入 `zcf` 工作流、输出风格与代理设定，使 Codex 能使用 `/zcf:workflow` 等指令。

## 交互式菜单

- 在 `npx zcf` 菜单中输入 `S` 可切换到 Codex 模式。
- 菜单项会根据当前工具动态调整，例如 Codex 模式下 `3` 为 API 与 MCP 配置，`4` 为工作流导入。
