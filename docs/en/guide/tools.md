---
title: Agent tools
---

# Agent tools

For each agent tool, this page lists how ZCF installs and updates it and where your provider, MCP servers and skills end up. `zcf plan` shows the exact commands and file changes for your config before anything happens.

Across all tools:

- ZCF uses the tool's own command when one exists, and edits a file only for settings no command covers.
- A file edit changes only the keys ZCF manages. Your comments, formatting and other settings stay.
- An MCP server that is already set up the same way is skipped. A skill source that lists its skills is skipped once all of them are installed; a source without a list runs `npx skills add` again on every apply.
- Skills are installed with `npx skills add <source> -g -a <agent>`.
- An update falls back to `npm install -g <pkg>@latest` when a tool's own updater fails on a package npm owns. `zcf uninstall` removes a tool through its own channel and takes out only the settings ZCF owns; MCP servers and skills stay. See [Commands](./commands).

## Claude Code

| | |
|---|---|
| Detect | `claude --version`, then `~/.local/bin/claude` |
| Install | The official native installer (`install.sh`, or `install.ps1` on Windows). With the [`china` mirror](./mirrors), `npm install -g @anthropic-ai/claude-code`, allowing the package's install script, which links the binary. ZCF then runs `claude --version` to check it worked. |
| Update | `claude update`, with `npm install -g @anthropic-ai/claude-code@latest` as a fallback when npm owns the install |
| Uninstall | `npm uninstall -g @anthropic-ai/claude-code` when npm owns it; a native install deletes `~/.local/bin/claude` and `~/.local/share/claude`, backed up first. `~/.claude`, with sessions and login, stays. |
| Provider | `env` in `~/.claude/settings.json`: `ANTHROPIC_BASE_URL`, the key as `ANTHROPIC_AUTH_TOKEN` (or `ANTHROPIC_API_KEY` with `authType: "api_key"`), `ANTHROPIC_MODEL` from `models.default`, and `ANTHROPIC_DEFAULT_HAIKU_MODEL`, `_SONNET_MODEL` and `_OPUS_MODEL`. ZCF removes those keys when the config leaves them unset. |
| MCP | `claude mcp add-json --scope user`. A server that changed is removed and added again. On Windows, commands such as `npx` are wrapped in `cmd /c`. |
| Skills | `-a claude-code`, into `~/.claude/skills` |
| Language | Claude Code's own `language` key in `~/.claude/settings.json`, for [`configLanguage`](./config#configlanguage). The only tool with a setting of its own; a value you set in Claude Code yourself is left alone. |

`CLAUDE_CONFIG_DIR` is followed, as Claude Code does.

## Codex

| | |
|---|---|
| Detect | `codex --version` |
| Install | `npm install -g @openai/codex` |
| Update | `codex update`, with `npm install -g @openai/codex@latest` as a fallback when npm owns the install |
| Uninstall | `npm uninstall -g @openai/codex`; a standalone install deletes `~/.local/bin/codex` and `~/.codex/packages/standalone` |
| Provider | `~/.codex/config.toml`: `model_provider = "zcf"`, `model`, and a `[model_providers.zcf]` table with `base_url`, `wire_api = "responses"` and the key. A ChatGPT login in `auth.json` is left alone. Uses the provider's `openai` block. |
| MCP | `codex mcp add`. HTTP headers are written to `config.toml` afterwards, because the command has no option for them. |
| Skills | `-a codex`, into `~/.agents/skills` |

`CODEX_HOME` is followed.

## Gemini CLI

| | |
|---|---|
| Detect | `gemini --version` |
| Install and update | `npm install -g @google/gemini-cli` |
| Uninstall | `npm uninstall -g @google/gemini-cli`; a Homebrew or MacPorts install is left with a notice |
| Provider | `GEMINI_API_KEY` and `GOOGLE_GEMINI_BASE_URL` in `~/.gemini/.env`, plus `security.auth.selectedType = "gemini-api-key"` and `model.name` in `~/.gemini/settings.json`. Uses the provider's `gemini` block. |
| MCP | `gemini mcp add -s user`. Environment variables and headers are written to `settings.json` afterwards, because the command's `-e` option cuts a value at its second `=`. |
| Skills | `-a gemini-cli`, into `~/.agents/skills` |

`GEMINI_CLI_HOME` is followed for `settings.json` and `.env`. Skills stay in `~/.agents/skills`, where the skills CLI installs them.

## OpenCode

| | |
|---|---|
| Detect | `opencode --version`, then `~/.opencode/bin/opencode` |
| Install | `npm install -g opencode-ai`, allowing its install script, which puts the binary in place. ZCF then runs `opencode --version` to check it worked. |
| Update | `opencode upgrade`, which updates the way OpenCode was installed, with `npm install -g opencode-ai@latest` as a fallback when npm owns the install |
| Uninstall | `npm uninstall -g opencode-ai`; any other install runs OpenCode's own `opencode uninstall --keep-config --keep-data`, so config and data stay |
| Provider | A `zcf` provider in `~/.config/opencode/opencode.json` (or `opencode.jsonc` if that is the file you have), with `model` set to `zcf/<model>`, and `small_model` set from `models.haiku` when the `anthropic` block is used. Uses the `anthropic` block through `@ai-sdk/anthropic`, or the `openai` block through `@ai-sdk/openai-compatible`, preferring the one that names a model. Settings you added to a model, such as `limit`, stay. |
| MCP | Written to `mcp` in the same file, as `local` or `remote` servers. OpenCode's own command only asks interactively. Settings ZCF does not manage, such as `oauth` or `timeout`, stay. |
| Skills | `-a opencode`, into `~/.agents/skills` |

`XDG_CONFIG_HOME` is followed.

## Cursor CLI

| | |
|---|---|
| Detect | `cursor-agent --version`, then the installer's location |
| Install | The official installer from `cursor.com/install` |
| Update | `cursor-agent update`; Cursor CLI keeps itself updated and has no npm package to fall back to |
| Uninstall | Deletes `~/.local/bin/cursor-agent` and `~/.local/share/cursor-agent` (the whole `%LOCALAPPDATA%\cursor-agent` folder on Windows), backed up first |
| Provider | Not applied. Cursor only serves its own models, so the plan shows a notice. |
| MCP | Written to `~/.cursor/mcp.json`, which the CLI shares with the Cursor editor. Settings ZCF does not manage, such as `envFile`, stay. |
| Skills | `-a cursor`, into `~/.agents/skills` |

## Pi

| | |
|---|---|
| Detect | `pi --version` |
| Install | `npm install -g @earendil-works/pi-coding-agent` |
| Update | `pi update --self`, with `npm install -g @earendil-works/pi-coding-agent@latest` as a fallback when npm owns the install |
| Uninstall | `npm uninstall -g @earendil-works/pi-coding-agent`; an install from another manager, such as Nix, is left with a notice |
| Provider | A `zcf` provider in `~/.pi/agent/models.json`, and `defaultProvider` and `defaultModel` in `~/.pi/agent/settings.json`. Uses the first block that has a model: `anthropic`, then `openai`, then `gemini`. The key is written so that pi takes it literally, even if it contains `$` or starts with `!`. |
| MCP | `pi mcp add` |
| Skills | `-a pi`, into `~/.agents/skills` |

`PI_CODING_AGENT_DIR` is followed.

## DeepSeek Harness

| | |
|---|---|
| Detect | `dsh --version` |
| Install and update | `npm install -g @deepseek-ai/dsh`, allowing the install scripts dsh needs by name |
| Uninstall | `npm uninstall -g @deepseek-ai/dsh` |
| Provider | The key goes to `~/.dsh/.env` as `ZCF_API_KEY`. A `zcf` route and the default model go to the patch file `~/.dsh/cordis.patch.yml`, which applies to every dsh profile. Uses the `anthropic` block, then `openai`. No key is written to the YAML file. |
| MCP | One `@deepseek-ai/dsh-mcp-client` entry per server in the same patch file, named `zcf-mcp-<name>`. Names longer than dsh's 32-character limit are skipped with a notice. |
| Skills | `-a universal`, into `~/.agents/skills` |

`DSH_HOME` is followed. Because the patch file in `~/.dsh` outranks what dsh's web Models page saves, change the provider and default model that ZCF manages through ZCF.
