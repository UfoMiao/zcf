---
title: 配置文件
---

# 配置文件

ZCF 只读取一个文件：`~/.ufomiao/zcf/zcf.json`。每个命令都可以用 `--file <path>` 指定其他文件。文件格式为 JSON，允许注释和尾随逗号。

从编辑器保存时，只会写入你改动过的键，因此注释和排版都会保留。

```jsonc
{
  "version": 1,
  "tools": ["claude-code", "codex", "opencode"],
  "provider": {
    "name": "My relay",
    "apiKey": "sk-...",
    "anthropic": { "baseUrl": "https://relay.example.com", "authType": "auth_token" },
    "openai": { "baseUrl": "https://relay.example.com/v1", "model": "gpt-5.5" },
    "gemini": { "baseUrl": "https://relay.example.com/gemini", "model": "gemini-3-pro" },
    "models": { "default": "claude-opus-4-8", "haiku": "claude-haiku-4-5" }
  },
  "mcpServers": {
    "context7": { "type": "stdio", "command": "npx", "args": ["-y", "@upstash/context7-mcp"] },
    "docs": { "type": "http", "url": "https://mcp.example.com/mcp", "headers": { "Authorization": "Bearer ..." } }
  },
  "skills": [{ "source": "anthropics/skills", "skills": ["pdf"] }],
  "mirror": "official",
  "language": "auto"
}
```

## `version`

固定为 `1`。

## `tools`

`zcf apply` 和 `zcf update` 处理的工具：

| ID | 工具 |
|----|------|
| `claude-code` | Claude Code |
| `codex` | Codex |
| `gemini-cli` | Gemini CLI |
| `opencode` | OpenCode |
| `cursor` | Cursor CLI |
| `pi` | Pi |
| `dsh` | DeepSeek Harness |

命令行上的 `--tools claude-code,codex` 会在本次运行中替换这个列表。

## `provider`

所有工具共用的一个供应商。可以不填；不填时，ZCF 不会改动各工具的供应商设置。

| 字段 | 含义 |
|------|------|
| `name` | 供应商名称，显示在计划中，以及会列出供应商的工具里。 |
| `apiKey` | 所有工具发送的密钥。ZCF 从不显示它。 |
| `anthropic.baseUrl` | 兼容 Anthropic Messages API 的接口地址。 |
| `anthropic.authType` | `auth_token`（默认）以 `Authorization: Bearer` 发送密钥；`api_key` 以 `x-api-key` 发送。 |
| `openai.baseUrl` | OpenAI 兼容接口地址，例如 `https://api.example.com/v1`。 |
| `openai.model` | 该接口上的模型。未填时使用 `models.default`。 |
| `gemini.baseUrl` | Gemini API 接口地址，或兼容它的网关。使用 Google 官方接口时不填。 |
| `gemini.model` | Gemini 模型。未填时使用 `models.default`。 |
| `models.default` | 主模型。 |
| `models.haiku`、`models.sonnet`、`models.opus` | Claude Code 三个档位使用的模型。 |

`name` 和 `apiKey` 必填，`anthropic` 和 `openai` 块中的 `baseUrl` 也必填。

每个协议块都是可选的。工具使用自己支持的协议：Claude Code 用 `anthropic`，Codex 用 `openai`，Gemini CLI 用 `gemini`。OpenCode 使用 `anthropic` 或 `openai`，Pi 使用第一个带有模型的块，DeepSeek Harness 依次使用 `anthropic`、`openai`。工具所需的协议缺失时，计划中会给出提示，该工具保留当前的供应商。Cursor CLI 只使用 Cursor 自家的模型。详见[工具](./tools)。

想从已知供应商填入这些字段，见[供应商预设](./providers)。

## `mcpServers`

MCP 服务，以名称为键。名称可使用字母、数字、`_` 和 `-`。

`stdio` 服务运行一条命令：

| 字段 | 含义 |
|------|------|
| `type` | `"stdio"` |
| `command` | 要运行的程序，例如 `npx` 或 `uvx`。 |
| `args` | 它的参数。 |
| `env` | 它的环境变量。输出中会遮盖其值。 |

`http` 服务通过 URL 访问：

| 字段 | 含义 |
|------|------|
| `type` | `"http"` |
| `url` | 服务的 URL。 |
| `headers` | HTTP 请求头，例如 `Authorization`。输出中会遮盖其值。 |

有自带命令的工具，ZCF 用该命令添加服务。已经以相同方式配置好的服务会被跳过。在 Windows 上，ZCF 会为需要的工具把 `npx` 等命令包装成 `cmd /c`。

## `skills`

技能来源，每个来源都会通过 [`npx skills add`](https://github.com/vercel-labs/skills) 安装到每个已选工具。

| 字段 | 含义 |
|------|------|
| `source` | `npx skills add` 能识别的任何来源：`owner/repo`、git URL 或本地路径。 |
| `skills` | 只安装该来源中的这些技能。不填或留空则全部安装。 |

列出了技能的来源，在这些技能全部安装后会被跳过。没有列出技能的来源每次应用都会重新安装，因为 ZCF 无法得知它包含哪些技能。

## `mirror`

`official`（默认）或 `china`，决定 ZCF 从哪里下载工具和软件包。见[镜像](./mirrors)。

## `language`

`auto`（默认）、`en` 或 `zh-CN`，两个编辑器界面的显示语言。终端界面在「设置」页改动后立即切换；`--lang` 或 `ZCF_LANG` 在单次运行中优先。命令输出（`zcf plan`、`apply`、`update`）不读取此设置：它跟随 `--lang` 或 `ZCF_LANG`，其次系统语言。

## 环境变量

| 变量 | 作用 |
|------|------|
| `ZCF_LANG` | 命令输出的显示语言，`en` 或 `zh-CN`。`--lang` 优先于它；两者都没有时跟随系统语言。编辑器界面则跟随配置文件里的 `language`。 |
| `ZCF_MIRROR` | `official` 或 `china`（也可写 `cn`）。优先于文件中的 `mirror`。 |
| `ZCF_PRESETS_URL` | 改从这个 URL 加载[供应商预设](./providers)。 |

各工具用来移动自身配置目录的变量都会被遵循：`CLAUDE_CONFIG_DIR`、`CODEX_HOME`、`GEMINI_CLI_HOME`、`XDG_CONFIG_HOME`（OpenCode）、`PI_CODING_AGENT_DIR` 和 `DSH_HOME`。
