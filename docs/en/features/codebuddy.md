---
title: CodeBuddy Support
---

# CodeBuddy Support

[CodeBuddy](https://codebuddy.ai) is an AI coding agent that works through a local configuration directory. ZCF adds CodeBuddy support using the same configuration patterns as Claude Code and Codex, so you can set up or switch to CodeBuddy with a single command.

## Core Features

- **Unified Tool Switching**: Switch between Claude Code, Codex, and CodeBuddy from the ZCF menu or CLI.
- **Profile-Based API Configuration**: Store multiple API profiles and switch between them.
- **MCP Service Integration**: Install and manage MCP servers in `~/.codebuddy/.mcp.json`.
- **Multi-Language Support**: Configure AI output language through `CODEBUDDY.md`.
- **Backup Safety**: MCP configuration changes create timestamped backups.

## Installation and Initialization

### Initialize CodeBuddy

```bash
# Interactive initialization
npx zcf
# Select S (Switch code tool) → CodeBuddy → Full initialization

# Non-interactive initialization
npx zcf i -s -T codebuddy --api-type api_key --api-key "sk-xxx" --api-url "https://api.example.com"
```

### Initialize with a Provider Preset

```bash
npx zcf i -s -T codebuddy -p 302ai -k "sk-xxx"
```

## Configuration Files

ZCF creates the following CodeBuddy configuration structure:

```
~/.codebuddy/
├── settings.json        # API keys, base URL, and model env variables
├── .mcp.json            # MCP server configurations
├── CODEBUDDY.md         # Global memory / language directive
└── backup/              # Timestamped MCP backups
```

### `settings.json` Environment Variables

ZCF writes API configuration to the `env` section of `settings.json`:

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | API key authentication |
| `ANTHROPIC_AUTH_TOKEN` | Auth token authentication |
| `ANTHROPIC_BASE_URL` | Custom API base URL |
| `ANTHROPIC_MODEL` | Primary model |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | Default Haiku model |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | Default Sonnet model |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | Default Opus model |

## MCP Service Integration

CodeBuddy uses the same MCP services as Claude Code and Codex:

```bash
# Install MCP services non-interactively
npx zcf i -s -T codebuddy --mcp-services all

# Selective installation
npx zcf i -s -T codebuddy --mcp-services context7,exa

# Configure through menu
npx zcf → CodeBuddy → Configure MCP
```

MCP servers are saved in `~/.codebuddy/.mcp.json`.

## Multi-Provider Configuration

You can define multiple API profiles for CodeBuddy:

```bash
npx zcf i -s -T codebuddy --api-configs '[
  {"provider":"302ai","key":"sk-xxx","default":true},
  {"name":"custom","type":"api_key","key":"sk-yyy","url":"https://custom.api.com"}
]'
```

Switch profiles interactively:

```bash
npx zcf config-switch -T codebuddy
```

## Common Operations

### Update CodeBuddy Configuration

```bash
npx zcf update -T codebuddy
```

### Check for Updates

```bash
npx zcf check-updates -T codebuddy
```

### Uninstall CodeBuddy

```bash
npx zcf uninstall -T codebuddy
```

This removes the MCP configuration and clears API keys from `settings.json`.

## Comparison with Claude Code and Codex

| Feature | Claude Code | Codex | CodeBuddy |
|---------|------------|-------|-----------|
| Configuration file | `~/.claude/settings.json` | `~/.codex/config.toml` | `~/.codebuddy/settings.json` |
| Memory file | `CLAUDE.md` | `AGENTS.md` | `CODEBUDDY.md` |
| MCP config | `.claude.json` / `settings.json` | `config.toml` | `.mcp.json` |
| API configuration | Auth token / API key / CCR proxy | Provider + API key | Auth token / API key |
| Multi-provider | ✅ | ✅ | ✅ |

## Notes

- CodeBuddy support is currently adapter-based: ZCF manages the configuration files, while CodeBuddy reads them at runtime.
- When switching away from CodeBuddy, ZCF sets the active code tool back to `claude-code` by default.
- The menu system currently routes CodeBuddy through a dedicated set of options; if you notice missing menu actions, please report them.
