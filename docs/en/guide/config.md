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
  "language": "auto"
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

Each protocol block is optional. A tool uses the protocol it speaks: Claude Code uses `anthropic`, Codex uses `openai`, and Gemini CLI uses `gemini`. OpenCode uses `anthropic` or `openai`, Pi uses the first block that has a model, and DeepSeek Harness uses `anthropic`, then `openai`. When a tool's protocol is missing, the plan shows a notice and that tool keeps its current provider. Cursor CLI only uses Cursor's own models. See [Tools](./tools) for details.

To fill these fields from a known provider, see [Provider presets](./providers).

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

The reserved source `zcf` picks the skills ZCF itself ships, in the folder of the language the interface uses. They are the workflow skills ZCF v3 installed, offered as a checklist in the Skills page:

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

## `mirror`

`official` (the default) or `china`. It decides where ZCF downloads tools and packages from. See [Mirrors](./mirrors).

## `language`

`auto` (the default), `en` or `zh-CN`. The language ZCF's editors show their interface in. Both editors follow it and switch as soon as the Settings page changes it, before the change is saved; with `auto`, the web UI follows the browser's language and the terminal UI the system locale. `--lang` or `ZCF_LANG` outranks it for a run, and the editors then stop following the setting. Command output (`zcf plan`, `apply`, `update`) does not read this setting: it follows `--lang` or `ZCF_LANG`, then the system locale.

## Environment variables

| Variable | Effect |
|----------|--------|
| `ZCF_LANG` | Command-output language, `en` or `zh-CN`. `--lang` wins over it; without either, commands follow the system locale. The editors follow `language` in the config file instead. |
| `ZCF_MIRROR` | `official` or `china` (`cn` works too). Overrides `mirror` in the file. |
| `ZCF_PRESETS_URL` | Load [provider presets](./providers) from this URL instead. |

Tools that move their own config folder are followed: `CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `GEMINI_CLI_HOME`, `XDG_CONFIG_HOME` (OpenCode), `PI_CODING_AGENT_DIR` and `DSH_HOME`.
