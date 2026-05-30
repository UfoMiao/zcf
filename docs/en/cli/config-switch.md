---
title: Config Switch
---

# Config Switch

`ccs config-switch` manages and switches between multiple Claude Code API endpoints (profiles). Each profile stores a base URL, an authentication type (Auth Token or API Key), and a key.

> **Alias**: `ccs cs` is the same command, so every example can be shortened (e.g. `ccs cs --list`).

## Command Format

```bash
# Interactive switch (recommended)
ccs cs

# List all saved configurations
ccs cs --list

# Switch directly to a named configuration
ccs cs work-api

# Switch back to official login
ccs cs official
```

## Options

| Option | Description |
|--------|-------------|
| `--list`, `-l` | List configurations without switching |
| `[target]` | Profile name/ID to switch to, or `official` for official login |

## How it works

Profiles are stored in `~/.claude/settings.json`. The currently active profile is tracked by the `currentProfileId` field. Switching only updates which profile is active — it never deletes other profiles.

When you switch, ccs applies that profile's settings (base URL, auth type, key) to Claude Code.

## Usage

### Interactive switch

The most common way — pick a configuration from a menu:

```bash
ccs cs
```

```
? Select Claude Code configuration:
  ❯ ● Use Official Login (current)
    Work API (work-api)
    Personal API (personal-api)
```

### List all configurations

```bash
ccs cs --list
```

```
Available Claude Code configurations:

● Official Login (current)
  Work API
    ID: work-api (api_key)
  Personal API
    ID: personal-api (auth_token)
```

### Direct switch

If you know the name or ID, switch directly:

```bash
ccs cs work-api
```

You can match by profile ID (e.g. `work-api`) or profile name (e.g. `Work API`). Use `official` to return to official login.

## Adding, editing, and deleting profiles

Manage profiles from the interactive menu — run `ccs` and choose the configuration option. There you can add a new endpoint (name + base URL + auth type + key), edit, or delete existing ones.

## Naming recommendations

Use short, meaningful names so configurations are easy to identify:

- Good: `work-api`, `personal-api`, `backup-api`
- Avoid: `config1`, `default`, or meaningless random strings

## FAQ

**Q: My switch didn't take effect?**

1. Restart Claude Code.
2. Confirm the profile's key and base URL are valid.

**Q: Will switching lose data?**

No. Switching only changes the active profile; all other profiles remain saved.
