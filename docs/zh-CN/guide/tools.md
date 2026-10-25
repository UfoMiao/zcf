---
title: Agent 工具
---

# Agent 工具

本页列出 ZCF 如何安装和更新每个 Agent 工具，以及你的供应商、MCP 服务和技能最终写到哪里。在做任何修改之前，`zcf plan` 会针对你的配置显示准确的命令和文件改动。

对所有工具都成立的规则：

- 工具有自带命令时，ZCF 使用该命令；只有没有命令可用的设置才直接修改文件。
- 修改文件时只改 ZCF 管理的键。你的注释、格式和其他设置都会保留。
- 已经以相同方式配置好的 MCP 服务会被跳过。列出了技能的来源在这些技能全部安装后会被跳过；没有列出技能的来源每次应用都会重新运行 `npx skills add`。
- 技能通过 `npx skills add <source> -g -a <agent>` 安装。
- 更新时，如果工具自带的更新命令在 npm 安装的包上失败，会回退用 `npm install -g <pkg>@latest`。`zcf uninstall` 按各工具自己的通道卸载，并且只移除 ZCF 拥有的设置；MCP 服务和技能保留。见[命令](./commands)。

## Claude Code

| | |
|---|---|
| 检测 | `claude --version`，其次 `~/.local/bin/claude` |
| 安装 | 官方原生安装器（`install.sh`，Windows 上为 `install.ps1`）。使用 [`china` 镜像](./mirrors)时为 `npm install -g @anthropic-ai/claude-code`，并允许该包用于链接程序的安装脚本，之后运行 `claude --version` 确认安装成功。 |
| 更新 | `claude update`；npm 安装的包在更新失败时回退 `npm install -g @anthropic-ai/claude-code@latest` |
| 卸载 | npm 安装时 `npm uninstall -g @anthropic-ai/claude-code`；原生安装删除 `~/.local/bin/claude` 和 `~/.local/share/claude`（删除前先备份）。存放会话和登录状态的 `~/.claude` 保留。 |
| 供应商 | `~/.claude/settings.json` 中的 `env`：`ANTHROPIC_BASE_URL`，密钥写为 `ANTHROPIC_AUTH_TOKEN`（`authType: "api_key"` 时为 `ANTHROPIC_API_KEY`），`ANTHROPIC_MODEL` 来自 `models.default`，以及 `ANTHROPIC_DEFAULT_HAIKU_MODEL`、`_SONNET_MODEL` 和 `_OPUS_MODEL`。配置中未设置的这些键会被 ZCF 删除。 |
| MCP | `claude mcp add-json --scope user`。有变化的服务会先删除再重新添加。Windows 上，`npx` 等命令会包装成 `cmd /c`。 |
| 技能 | `-a claude-code`，安装到 `~/.claude/skills` |
| 语言 | Claude Code 自己的 `language` 键，在 `~/.claude/settings.json` 中，对应 [`configLanguage`](./config#configlanguage)。它是唯一有此设置的工具；你在 Claude Code 里自己设置的语言不会被改动。 |

与 Claude Code 一样遵循 `CLAUDE_CONFIG_DIR`。

## Codex

| | |
|---|---|
| 检测 | `codex --version` |
| 安装 | `npm install -g @openai/codex` |
| 更新 | `codex update`；npm 安装的包在更新失败时回退 `npm install -g @openai/codex@latest` |
| 卸载 | `npm uninstall -g @openai/codex`；独立安装删除 `~/.local/bin/codex` 和 `~/.codex/packages/standalone` |
| 供应商 | `~/.codex/config.toml`：`model_provider = "zcf"`、`model`，以及包含 `base_url`、`wire_api = "responses"` 和密钥的 `[model_providers.zcf]` 表。`auth.json` 中的 ChatGPT 登录不会被改动。使用供应商的 `openai` 块。 |
| MCP | `codex mcp add`。HTTP 请求头随后写入 `config.toml`，因为该命令没有对应的选项。 |
| 技能 | `-a codex`，安装到 `~/.agents/skills` |

遵循 `CODEX_HOME`。

## Gemini CLI

| | |
|---|---|
| 检测 | `gemini --version` |
| 安装与更新 | `npm install -g @google/gemini-cli` |
| 卸载 | `npm uninstall -g @google/gemini-cli`；Homebrew 或 MacPorts 安装的会跳过并提示 |
| 供应商 | `~/.gemini/.env` 中的 `GEMINI_API_KEY` 和 `GOOGLE_GEMINI_BASE_URL`，以及 `~/.gemini/settings.json` 中的 `security.auth.selectedType = "gemini-api-key"` 和 `model.name`。使用供应商的 `gemini` 块。 |
| MCP | `gemini mcp add -s user`。环境变量和请求头随后写入 `settings.json`，因为该命令的 `-e` 选项会在值的第二个 `=` 处截断。 |
| 技能 | `-a gemini-cli`，安装到 `~/.agents/skills` |

`settings.json` 和 `.env` 遵循 `GEMINI_CLI_HOME`。技能仍在 `~/.agents/skills`，因为 skills CLI 安装到那里。

## OpenCode

| | |
|---|---|
| 检测 | `opencode --version`，其次 `~/.opencode/bin/opencode` |
| 安装 | `npm install -g opencode-ai`，并允许它的安装脚本运行，由该脚本放置二进制文件。之后 ZCF 会运行 `opencode --version` 确认安装成功。 |
| 更新 | `opencode upgrade`，按 OpenCode 的安装方式更新；npm 安装的包在更新失败时回退 `npm install -g opencode-ai@latest` |
| 卸载 | `npm uninstall -g opencode-ai`；其他安装方式运行 OpenCode 自带的 `opencode uninstall --keep-config --keep-data`，配置和数据保留 |
| 供应商 | `~/.config/opencode/opencode.json`（如果你用的是 `opencode.jsonc` 则写入它）中的 `zcf` 供应商，并把 `model` 设为 `zcf/<模型>`；使用 `anthropic` 块时，`small_model` 取自 `models.haiku`。通过 `@ai-sdk/anthropic` 使用 `anthropic` 块，或通过 `@ai-sdk/openai-compatible` 使用 `openai` 块，优先选择写明了模型的那个。你给模型加的设置（例如 `limit`）会保留。 |
| MCP | 以 `local` 或 `remote` 服务写入同一文件的 `mcp`。OpenCode 自带的命令只能交互式提问。ZCF 不管理的设置（例如 `oauth` 或 `timeout`）会保留。 |
| 技能 | `-a opencode`，安装到 `~/.agents/skills` |

遵循 `XDG_CONFIG_HOME`。

## Cursor CLI

| | |
|---|---|
| 检测 | `cursor-agent --version`，其次安装器的安装位置 |
| 安装 | 来自 `cursor.com/install` 的官方安装器 |
| 更新 | `cursor-agent update`；Cursor CLI 自行保持更新，没有可回退的 npm 包 |
| 卸载 | 删除 `~/.local/bin/cursor-agent` 和 `~/.local/share/cursor-agent`（Windows 上是整个 `%LOCALAPPDATA%\cursor-agent` 目录），删除前先备份 |
| 供应商 | 不应用。Cursor 只提供自家模型，计划中会给出提示。 |
| MCP | 写入 `~/.cursor/mcp.json`，该文件由 CLI 和 Cursor 编辑器共用。ZCF 不管理的设置（例如 `envFile`）会保留。 |
| 技能 | `-a cursor`，安装到 `~/.agents/skills` |

## Pi

| | |
|---|---|
| 检测 | `pi --version` |
| 安装 | `npm install -g @earendil-works/pi-coding-agent` |
| 更新 | `pi update --self`；npm 安装的包在更新失败时回退 `npm install -g @earendil-works/pi-coding-agent@latest` |
| 卸载 | `npm uninstall -g @earendil-works/pi-coding-agent`；经 Nix 等其他方式安装的会跳过并提示 |
| 供应商 | `~/.pi/agent/models.json` 中的 `zcf` 供应商，以及 `~/.pi/agent/settings.json` 中的 `defaultProvider` 和 `defaultModel`。使用第一个带有模型的块：依次为 `anthropic`、`openai`、`gemini`。密钥的写法保证 pi 按字面读取，即使其中含有 `$` 或以 `!` 开头。 |
| MCP | `pi mcp add` |
| 技能 | `-a pi`，安装到 `~/.agents/skills` |

遵循 `PI_CODING_AGENT_DIR`。

## DeepSeek Harness

| | |
|---|---|
| 检测 | `dsh --version` |
| 安装与更新 | `npm install -g @deepseek-ai/dsh`，并按名称允许 dsh 所需的安装脚本 |
| 卸载 | `npm uninstall -g @deepseek-ai/dsh` |
| 供应商 | 密钥以 `ZCF_API_KEY` 写入 `~/.dsh/.env`。`zcf` 路由和默认模型写入补丁文件 `~/.dsh/cordis.patch.yml`，对所有 dsh 配置档生效。依次使用 `anthropic`、`openai` 块。YAML 文件中不会写入密钥。 |
| MCP | 在同一补丁文件中为每个服务添加一个 `@deepseek-ai/dsh-mcp-client` 条目，命名为 `zcf-mcp-<名称>`。超过 dsh 32 个字符上限的名称会被跳过并给出提示。 |
| 技能 | `-a universal`，安装到 `~/.agents/skills` |

遵循 `DSH_HOME`。由于 `~/.dsh` 中的补丁文件优先于 dsh 网页“模型”页保存的内容，ZCF 管理的供应商和默认模型请通过 ZCF 修改。
