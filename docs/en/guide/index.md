---
title: Getting started
---

# Getting started

ZCF keeps one config for all your AI coding tools. You pick the tools, a provider, MCP servers and skills once. ZCF installs any tool that is missing and writes each tool's own native settings.

ZCF only configures the tools. It is not a gateway or a proxy: once ZCF has run, each tool talks to your provider directly, as if you had set it up by hand.

Supported tools:

- Claude Code
- Codex
- Gemini CLI
- OpenCode
- Cursor CLI
- Pi
- DeepSeek Harness

See [Agent tools](./tools) for what ZCF writes for each one.

## Requirements

- Node.js 22 or newer.
- On Windows, PowerShell for the tools whose official installer is a PowerShell script.

## Open the editor

```bash
npx zcf
```

In a terminal, `zcf` with no command opens the terminal editor. To use your browser instead, run:

```bash
npx zcf ui
```

Both editors work on the same file, `~/.ufomiao/zcf/zcf.json`, and have the same pages:

1. **Agent tools**: tick the agent tools you use. Each one shows whether it is installed and its version.
2. **Provider**: start from a [preset](./providers) or fill in the endpoint and API key yourself.
3. **MCP servers**: add `stdio` servers (a command) or `http` servers (a URL).
4. **Skills**: add skill sources that `npx skills add` accepts.
5. **Settings**: settings for ZCF itself: the interface language and the download mirror.
6. **Apply**: see what will change, then apply it.

Press <kbd>Ctrl</kbd>+<kbd>S</kbd> to save. See [Terminal and web UI](./ui) for all the keys.

## Or write the config yourself

The editors are optional. The same result from a file:

```jsonc
// ~/.ufomiao/zcf/zcf.json
{
  "version": 1,
  "tools": ["claude-code", "codex"],
  "provider": {
    "name": "My relay",
    "apiKey": "sk-...",
    "anthropic": { "baseUrl": "https://relay.example.com" },
    "openai": { "baseUrl": "https://relay.example.com/v1", "model": "gpt-5.5" }
  },
  "mcpServers": {
    "context7": { "type": "stdio", "command": "npx", "args": ["-y", "@upstash/context7-mcp"] }
  }
}
```

Then preview and apply it:

```bash
npx zcf plan          # show the commands it would run and a diff of each file it would edit
npx zcf apply --yes   # install missing tools and write their settings
```

`zcf apply` without `--yes` shows the same plan and changes nothing. See [Config file](./config) for every field.

## What happens on apply

- Every change is planned first. A step either runs a command or edits keys in one file. Tools are handled in parallel, and each tool's steps run in order.
- ZCF uses the tools' own commands where they exist, such as `claude mcp add-json`, `codex mcp add` and `npx skills add`. It only edits a file directly for settings that no command covers.
- Files are edited key by key. Your comments, key order and other settings stay as they are.
- Each file is copied to `~/.ufomiao/zcf/backups/<time>/` before its first change. See [Backups and troubleshooting](./troubleshooting).
- The API key, MCP environment and header values, and credentials found in tools' files are masked in everything ZCF prints. Keep secrets out of MCP server arguments; use `env` or `headers` instead.

## Keep tools up to date

```bash
npx zcf update
```

This runs each selected tool's own updater, such as `claude update` or `opencode upgrade`. In mainland China, see [Mirrors](./mirrors).
