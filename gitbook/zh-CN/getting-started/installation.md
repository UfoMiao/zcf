# 安装指南

## 环境要求

- Node.js 20 或更高版本（使用 CCR 时推荐 22+）。
- npm 或 pnpm（`npx` 需可用）。
- 支持运行全局 CLI 的操作系统（macOS、Linux、Windows PowerShell/WSL、Termux）。

## 交互式安装（推荐）

```bash
npx zcf
```

- 进入主菜单后选择 `1` 执行完整初始化。
- 根据提示选择目标语言（默认支持 `zh-CN` 与 `en`）。
- 按需启用 MCP 服务、工作流及输出风格。
- 可在同一流程中初始化 Claude Code 或 Codex（或两者皆有）。

## 无交互一键安装

适合 CI/CD 或批量部署，通过 `--skip-prompt` 与预设参数完成。

```bash
# 使用提供商预设（推荐）
npx zcf i -s -p 302ai -k "sk-xxx"

# 自定义 Claude Code API
default: API key 模式
npx zcf i -s -g zh-CN -t api_key -k "sk-xxx" -u "https://api.example.com"

# 同时配置主模型与快速模型
npx zcf i -s --api-model "claude-sonnet-4-5" --api-fast-model "claude-haiku-4-5"

# 多 API 配置（JSON 字符串）
npx zcf i -s --api-configs '[{"provider":"302ai","key":"sk-xxx"},{"name":"custom","type":"api_key","key":"sk-yyy","url":"https://custom.api.com","primaryModel":"claude-sonnet-4-5","fastModel":"claude-haiku-4-5","default":true}]'
```

### 参数速览

- `-p, --provider`：API 提供商预设，支持 `302ai`、`glm`、`minimax`、`kimi`、`custom`。
- `-t, --api-type`：`api_key`、`auth_token`、`ccr_proxy` 或 `skip`。
- `-M, --api-model` 与 `-F, --api-fast-model`：主模型与快速模型。
- `-g, --all-lang`：一次性设置配置语言与 AI 输出语言。
- `-m, --mcp-services`：选择 MCP 服务（`all`、`skip` 或逗号分隔列表）。
- `-w, --workflows`：选择要导入的工作流集合。
- `-o, --output-styles`：输出风格集合，默认包含 `engineer-professional`、`nekomata-engineer`、`laowang-engineer`。
- `-x, --install-cometix-line`：是否安装 CCometixLine。

## Codex 环境安装

当 `--code-type codex` 或在菜单中切换到 Codex 后执行初始化，ZCF 会：

1. 安装/升级 `@openai/codex` CLI。
2. 生成 `~/.codex` 下的 `config.toml`、`auth.json`、`prompts/`、`AGENTS.md`。
3. 支持备份现有配置并在需要时恢复。
4. 提供 Codex 专属 MCP 配置与 API 提供商预设。

## 验证安装

- 在终端执行 `npx zcf --help`，确认 CLI 可用。
- 打开 Claude Code/Codex，检查 `CLAUDE.md`、工作流、MCP 是否正确载入。
- 若启用了 CCR 或 CCometixLine，确认工具可在命令行或状态栏中使用。
