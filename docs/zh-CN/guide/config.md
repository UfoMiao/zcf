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
  "language": "auto",
  "configLanguage": "en"
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

每个协议块都是可选的。工具使用自己支持的协议：Claude Code 用 `anthropic`，Codex 用 `openai`，Gemini CLI 用 `gemini`。OpenCode 使用 `anthropic` 或 `openai`，Pi 使用第一个带有模型的块，DeepSeek Harness 依次使用 `anthropic`、`openai`。工具所需的协议缺失时，计划中会给出提示，该工具保留当前的供应商。Cursor CLI 只使用 Cursor 自家的模型。详见 [Agent 工具](./tools)。

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
| `source` | `npx skills add` 能识别的任何来源：`owner/repo`、git URL、本地路径，或表示 ZCF 自带技能的 `zcf`。 |
| `skills` | 只安装该来源中的这些技能。不填或留空则全部安装。 |

列出了技能的来源，在这些技能全部安装后会被跳过。没有列出技能的来源每次应用都会重新安装，因为 ZCF 无法得知它包含哪些技能。

保留来源 `zcf` 表示 ZCF 自带的技能，安装 [`configLanguage`](#configlanguage)（工具工作语言）对应文件夹下的版本。它们是 ZCF v3 会安装的工作流技能，在技能页面以勾选清单提供：

| 技能 | 作用 |
|------|------|
| `init-project` | 生成项目级 CLAUDE.md 上下文索引。 |
| `workflow` | 运行带质量关卡的六阶段开发工作流。 |
| `feat` | 以结构化流程规划并实现新功能。 |
| `git-commit` | 分析改动并生成规范提交信息。 |
| `git-rollback` | 交互式回滚分支到历史版本。 |
| `git-clean-branches` | 预览并清理已合并或过期的分支。 |
| `git-worktree` | 在项目旁目录中管理 git worktree。 |
| `bmad-init` | 在项目中初始化或更新 BMad-Method V6。 |

## `mirror`

`official`（默认）或 `china`，决定 ZCF 从哪里下载工具和软件包。见[镜像](./mirrors)。

## `language`

`auto`（默认）、`en` 或 `zh-CN`，两个编辑器**界面**的显示语言。它不在「设置」页里：两个编辑器都从顶部切换——终端界面按 <kbd>L</kbd>，网页界面用路径旁的选择框——并立即单独保存。`auto` 时网页界面跟随浏览器语言，终端界面跟随系统语言。`--lang` 或 `ZCF_LANG` 在单次运行中优先，此时切换被禁用。命令输出（`zcf plan`、`apply`、`update`）不读取此设置：它跟随 `--lang` 或 `ZCF_LANG`，其次系统语言。

## `configLanguage`

`en`（默认）或 `zh-CN`，应用后各工具自身使用的工作语言，写入各工具自己的设置。它与 `language` 相互独立：界面用英文浏览、工具用中文回复（或反过来）都可以。

没有 `auto`：没有工具提供这一选项，而 Claude Code 这类工具会把读到的值原样传给模型，未解析的词会直接写进它的设置。

| 工具 | 应用时写入什么 |
|------|----------------|
| Claude Code | 它自己的 `language` 键，在 `~/.claude/settings.json` 中：`zh-CN` 写 `Simplified Chinese`。`en` 会移除 ZCF 之前写入的值；你在 Claude Code 里自己设置的语言（如 `japanese`）不会被改动。 |
| Codex、Gemini CLI、OpenCode、Cursor CLI、Pi、DeepSeek Harness | 没有自己的语言设置。选 `zh-CN` 时计划会对每个工具说明这一点，且不改动它们的配置。 |

## 环境变量

| 变量 | 作用 |
|------|------|
| `ZCF_LANG` | 命令输出的显示语言，`en` 或 `zh-CN`。`--lang` 优先于它；两者都没有时跟随系统语言。编辑器界面则跟随配置文件里的 `language`。 |
| `ZCF_MIRROR` | `official` 或 `china`（也可写 `cn`）。优先于文件中的 `mirror`。 |
| `ZCF_PRESETS_URL` | 改从这个 URL 加载[供应商预设](./providers)。 |
| `ZCF_SKILLS_SEARCH_URL` | 技能页改用这个技能索引搜索，而不使用 claude-plugins.dev；需支持相同的 `?q=&limit=` 参数。 |

各工具用来移动自身配置目录的变量都会被遵循：`CLAUDE_CONFIG_DIR`、`CODEX_HOME`、`GEMINI_CLI_HOME`、`XDG_CONFIG_HOME`（OpenCode）、`PI_CODING_AGENT_DIR` 和 `DSH_HOME`。
