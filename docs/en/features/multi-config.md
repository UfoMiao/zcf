---
title: Multi-Config and Backup
---

# Multi-Config and Backup

ZCF provides comprehensive configuration management and backup mechanisms, supporting switching between multiple configurations, version management, and safe rollback. Whether for Claude Code or Codex, you can easily manage multiple API configurations, output styles, and system settings.

## Multi-Configuration System

### Configuration Hierarchy

ZCF's configuration system is divided into the following levels:

1. **Global Configuration** (`~/.ufomiao/zcf/config.toml`) - ZCF's own configuration
2. **Claude Code Configuration** (`~/.claude/settings.json`) - Claude Code runtime configuration
3. **Codex Configuration** (`~/.codex/config.toml`) - Codex runtime configuration
4. **CCR Configuration** (`~/.claude-code-router/config.json`) - Claude Code Router proxy configuration

### Configuration Management and Switching

ZCF provides powerful CLI tools to create, manage, and switch these configurations.

- **Create Configuration**: You can configure multiple API providers during initialization using `zcf init`.
- **Switch Configuration**: Use `zcf config-switch` command to quickly switch between different environments, projects, or providers.

👉 **For detailed command usage, please refer to:**
- **[Configuration Switch Command (config-switch)](../cli/config-switch.md)**
- **[Initialization Command (init)](../cli/init.md)**

## Backup System

ZCF automatically creates backups before each configuration modification to ensure configuration security and recoverability.

### Backup Locations

Different types of configurations are backed up to different locations:

| Configuration Type | Backup Directory | Backup File Format |
|---------|---------|------------|
| **Claude Code** | `~/.claude/backup/` | `settings.json.{timestamp}.bak` |
| **Codex Complete** | `~/.codex/backup/` | `config.toml.{timestamp}.bak` |
| **Codex Configuration** | `~/.codex/backup/` | `config.toml.{timestamp}.bak` |
| **Codex Agents** | `~/.codex/backup/` | `agents.{timestamp}.tar.gz` |
| **Codex Prompts** | `~/.codex/backup/` | `prompts.{timestamp}.tar.gz` |
| **CCR** | `~/.claude-code-router/` | `config.json.{timestamp}.bak` |
| **CCometixLine** | `~/.cometix/backup/` | `config.{timestamp}.bak` |
| **ZCF Global Configuration** | `~/.ufomiao/zcf/backup/` | `config.toml.{timestamp}.bak` |

### Automatic Backup Triggers

ZCF automatically creates backups during the following operations:

1. **Initialize Configuration**: First-time configuration or re-initialization
2. **Update Configuration**: Update workflows or templates via `zcf update`
3. **Switch Configuration**: Use `config-switch` to switch configurations
4. **Modify API**: Update API keys or providers
5. **Install Workflows**: Import or update workflow templates
6. **MCP Configuration**: Modify MCP service configuration

### Backup Restoration

If you need to restore to previous configuration:

1. **Find Backup Files**: Find timestamped backup files in the corresponding backup directory
2. **Restore Configuration**: Manually copy backup files to original location

## Incremental Management

When existing configuration is detected, ZCF will prompt you to choose a management strategy:

### Strategy Options

- **backup**: Backup existing configuration then merge new configuration (recommended)
- **merge**: Directly merge new configuration into existing configuration
- **new**: Create new configuration, preserve old configuration
- **skip**: Skip this operation, preserve existing configuration

## Best Practices

### Version Control Strategy

For team collaboration, it's recommended to include configurations in version control (Git), but **ensure to exclude configuration files containing API keys**.

### Git Worktree Integration

Use Git Worktree to sync configurations across different workspaces. Combined with `config-switch` command, you can use different API configurations for different Feature branches (e.g., test environment vs production environment).

### Configuration Cleanup

It's recommended to regularly clean up old backups to save disk space. Keeping backups for the last 7-30 days is usually sufficient.

## Learn More

- [Configuration Management](../advanced/configuration.md) - Detailed configuration management guide
- [API Provider Presets](../advanced/api-providers.md) - Pre-configured API providers
