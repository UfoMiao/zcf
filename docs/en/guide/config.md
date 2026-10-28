---
title: Config file
---

# Config file

ZCF reads one file, `~/.ufomiao/zcf/zcf.json`. Every command takes `--file <path>` to use another one. The file is JSON, and comments and trailing commas are allowed.

When you save from the editors, only the keys you changed are written, so your comments and layout stay.

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

Always `1`.

## `tools`

The tools that `zcf apply` and `zcf update` work on:

| Id | Tool |
|----|------|
| `claude-code` | Claude Code |
| `codex` | Codex |
| `gemini-cli` | Gemini CLI |
| `opencode` | OpenCode |
| `cursor` | Cursor CLI |
| `pi` | Pi |
| `dsh` | DeepSeek Harness |

`--tools claude-code,codex` on the command line overrides this list for one run.

## `provider`

One provider shared by every tool. It is optional; without it, ZCF leaves each tool's provider settings alone.

| Field | Meaning |
|-------|---------|
| `name` | A name for the provider, shown in plans and in tools that list providers. |
| `apiKey` | The key every tool sends. ZCF never prints it. |
| `anthropic.baseUrl` | An endpoint that speaks the Anthropic Messages API. |
| `anthropic.authType` | `auth_token` (the default) sends the key as `Authorization: Bearer`. `api_key` sends it as `x-api-key`. |
| `openai.baseUrl` | An OpenAI-compatible endpoint, such as `https://api.example.com/v1`. |
| `openai.model` | The model on that endpoint. Falls back to `models.default`. |
| `gemini.baseUrl` | A Gemini API endpoint or a gateway that speaks it. Leave it out for Google's own. |
| `gemini.model` | The Gemini model. Falls back to `models.default`. |
| `models.default` | The main model. |
| `models.haiku`, `models.sonnet`, `models.opus` | Models for Claude Code's three tiers. |

`name` and `apiKey` are required, and so is `baseUrl` inside `anthropic` and `openai`.

Each protocol block is optional. A tool uses the protocol it speaks: Claude Code uses `anthropic`, Codex uses `openai`, and Gemini CLI uses `gemini`. OpenCode uses `anthropic` or `openai`, Pi uses the first block that has a model, and DeepSeek Harness uses `anthropic`, then `openai`. When a tool's protocol is missing, the plan shows a notice and that tool keeps its current provider. Cursor CLI only uses Cursor's own models. See [Agent tools](./tools) for details.

To fill these fields from a known provider, see [Provider presets](./providers).

## `profiles`

Saved providers to switch between. Only the top-level `provider` is applied; `zcf switch <id|name>` copies a profile's provider there, so the active setup stays one block and every switch is one step back.

```jsonc
"profiles": [
  {
    "id": "work",
    "name": "Work relay",
    "provider": { "name": "Work", "apiKey": "sk-...", "anthropic": { "baseUrl": "https://work.example.com" } }
  },
  {
    "id": "home",
    "name": "Home",
    "provider": { "name": "House", "apiKey": "sk-...", "openai": { "baseUrl": "https://home.example.com/v1" } }
  }
]
```

| Field | Meaning |
|-------|---------|
| `id` | What `zcf switch` and the editors list the profile by. Letters, digits, `_` and `-`. |
| `name` | A display name; `zcf switch` accepts it too. |
| `provider` | A full provider block, shaped exactly like the top-level `provider`. |

## `mcpServers`

MCP servers, keyed by name. A name may use letters, digits, `_` and `-`.

A `stdio` server runs a command:

| Field | Meaning |
|-------|---------|
| `type` | `"stdio"` |
| `command` | The program, such as `npx` or `uvx`. |
| `args` | Its arguments. |
| `env` | Environment variables for it. Values are masked in output. |

An `http` server is reached by URL:

| Field | Meaning |
|-------|---------|
| `type` | `"http"` |
| `url` | The server's URL. |
| `headers` | HTTP headers, such as `Authorization`. Values are masked in output. |

ZCF adds each server with the tool's own command where there is one. A server that is already set up the same way is skipped. On Windows, ZCF wraps commands such as `npx` in `cmd /c` for the tools that need it.

## `skills`

Skill sources, each installed with [`npx skills add`](https://github.com/vercel-labs/skills) for every selected tool.

| Field | Meaning |
|-------|---------|
| `source` | Anything `npx skills add` accepts: `owner/repo`, a git URL, a local path, or `zcf` for the skills ZCF ships. |
| `skills` | Only install these skills from the source. Leave it out or empty to install all of them. |

A source that lists its skills is skipped once all of them are installed. A source without a list is installed again on every apply, because ZCF can't tell which skills it holds.

The reserved source `zcf` picks the skills ZCF itself ships, in the folder of the [`configLanguage`](#configlanguage), the language the tools work in. They are the workflow skills ZCF v3 installed, offered as a checklist in the Skills page:

| Skill | What it does |
|-------|--------------|
| `init-project` | Generate CLAUDE.md context indexes for a project. |
| `workflow` | Run a six-phase development workflow with quality gates. |
| `feat` | Plan and build a new feature through a structured flow. |
| `git-commit` | Analyze changes and write conventional commit messages. |
| `git-rollback` | Roll a branch back to an earlier version interactively. |
| `git-clean-branches` | Preview and clean up merged or stale branches. |
| `git-worktree` | Manage git worktrees under a project-local folder. |
| `bmad-init` | Initialize or update BMad-Method V6 in a project. |

## `agents`

Built-in agent templates to install, for the tools that take agents (Claude Code subagents). The templates ship with ZCF, one folder per agent under `templates/agents/<language>`, installed in the [`configLanguage`](#configlanguage).

```jsonc
"agents": ["planner", "ui-ux-designer"]
```

| Id | Agent |
|----|-------|
| `init-architect` | Walks a project and writes module-level CLAUDE.md context files. |
| `get-current-datetime` | Runs `date` and returns only its output. |
| `planner` | Breaks a complex task into manageable, reviewable steps. |
| `ui-ux-designer` | Advises on UI/UX design and the project's UI framework. |

## `workflows`

Custom workflow bundles: one name that installs the skills, agents and MCP servers it lists. Skills are full sources; agents and servers are referenced by id or name and must exist in their own sections, so a bundle never repeats a definition.

```jsonc
"workflows": [
  {
    "name": "Git work",
    "skills": [{ "source": "zcf", "skills": ["git-commit", "git-rollback"] }],
    "agents": ["planner"],
    "mcp": ["context7"]
  }
]
```

| Field | Meaning |
|-------|---------|
| `name` | The bundle's display name. |
| `skills` | Skill sources the bundle installs, as under `skills`. |
| `agents` | Ids from `agents`, the built-in list above. |
| `mcp` | Names of servers from `mcpServers`. |

## `styles`

Output styles to install, and the one the tools use by default. ZCF ships six templates under `templates/output-styles/<language>`, installed in the [`configLanguage`](#configlanguage); `defaultOutputStyle` becomes Claude Code's `outputStyle` setting.

```jsonc
"styles": { "outputStyles": ["engineer-professional"], "defaultOutputStyle": "engineer-professional" }
```

| Id | Style |
|----|-------|
| `engineer-professional` | A professional engineer voice: SOLID, KISS, DRY, YAGNI. |
| `nekomata-engineer` | Rigorous engineering with a catgirl persona. |
| `laowang-engineer` | The grumpy veteran who tolerates no sloppy code. |
| `ojousama-engineer` | Engineering excellence with a tsundere persona. |
| `rem-engineer` | A devoted maid persona; the codebase is the mansion. |
| `leibus-engineer` | Product-thinking presentation style. |

## `extras`

Optional companion tools. They take no per-tool config; only their install differs.

```jsonc
"extras": { "magpie": "client", "ccline": true }
```

| Field | Meaning |
|-------|---------|
| `magpie` | The [magpie](https://usemagpie.ai) model gateway's local companion: `client` for the desktop app, `cli` for terminal use. Both install from magpie's own script; magpie writes its keys itself. |
| `ccline` | The [CCometixLine](https://github.com/Haleclipse/CCometixLine) status bar, installed under `~/.claude/ccline` and wired into Claude Code's `statusLine`. Select Claude Code under Agent tools to finish the wiring. |

## `mirror`

`official` (the default) or `china`. It decides where ZCF downloads tools and packages from. See [Mirrors](./mirrors).

## `language`

`auto` (the default), `en` or `zh-CN`. The language ZCF's editors show their **interface** in. It is not a Settings field: both editors switch it from their header — the terminal UI with `L`, the web UI with the selector next to the path — and save it at once. With `auto`, the web UI follows the browser's language and the terminal UI the system locale. `--lang` or `ZCF_LANG` outranks it for a run, and the switch is then disabled. Command output (`zcf plan`, `apply`, `update`) does not read this setting: it follows `--lang` or `ZCF_LANG`, then the system locale.

## `configLanguage`

`en` (the default) or `zh-CN`. The language the tools themselves work in once ZCF applies, written into the settings each tool owns. This is separate from `language`: you can browse ZCF in English while the tools respond in Chinese, or the other way round.

There is no `auto`: no tool offers one, and a tool such as Claude Code passes the value it finds straight to the model, so an unresolved word would end up in its settings.

| Tool | What applying writes |
|------|----------------------|
| Claude Code | Its own `language` key in `~/.claude/settings.json`: `Simplified Chinese` for `zh-CN`. `en` removes a value ZCF wrote earlier; a language you set in Claude Code yourself (such as `japanese`) is left alone. |
| Codex, Gemini CLI, OpenCode, Cursor CLI, Pi, DeepSeek Harness | No language setting of their own. With `zh-CN`, the plan says so for each of them and their config is untouched. |

## Environment variables

| Variable | Effect |
|----------|--------|
| `ZCF_LANG` | Command-output language, `en` or `zh-CN`. `--lang` wins over it; without either, commands follow the system locale. The editors follow `language` in the config file instead. |
| `ZCF_MIRROR` | `official` or `china` (`cn` works too). Overrides `mirror` in the file. |
| `ZCF_PRESETS_URL` | Load [provider presets](./providers) from this URL instead. |
| `ZCF_SKILLS_SEARCH_URL` | Search this skills index instead of claude-plugins.dev on the Skills page. It must answer the same `?q=&limit=` shape. |

Tools that move their own config folder are followed: `CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `GEMINI_CLI_HOME`, `XDG_CONFIG_HOME` (OpenCode), `PI_CODING_AGENT_DIR` and `DSH_HOME`.
