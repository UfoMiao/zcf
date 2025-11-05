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

### Multiple API Configuration

During initialization or configuration, you can configure multiple APIs in the following ways:

#### Command Line Method

```bash
# Pass JSON string via --api-configs
npx zcf init --api-configs '[
  {
    "provider": "anthropic",
    "type": "api_key",
    "key": "sk-ant-xxx",
    "primaryModel": "claude-4-5-sonnet",
    "default": true
  },
  {
    "provider": "glm",
    "type": "api_key",
    "key": "sk-glm-xxx",
    "primaryModel": "glm-4",
    "default": false
  }
]'

# Or specify file via --api-configs-file
npx zcf init --api-configs-file ./api-configs.json
```

#### Configuration File Format

```json
[
  {
    "provider": "anthropic",
    "type": "api_key",
    "key": "sk-ant-xxx",
    "url": "https://api.anthropic.com/v1",
    "primaryModel": "claude-4-5-sonnet",
    "fastModel": "claude-3-5-haiku",
    "default": true
  },
  {
    "provider": "glm",
    "type": "api_key",
    "key": "sk-glm-xxx",
    "url": "https://open.bigmodel.cn/api/paas/v4",
    "primaryModel": "glm-4",
    "default": false
  }
]
```

### Claude Code Configuration Switch

Claude Code supports multi-configuration Profile management:

```bash
# List all configurations
npx zcf config-switch --list

# Switch to specified configuration
npx zcf config-switch provider1

# Switch in Codex
npx zcf config-switch provider1 --code-type codex
```

### Codex Configuration Switch

Codex also supports multi-provider configuration:

```bash
# List Codex providers
npx zcf config-switch --code-type codex --list

# Switch to specified provider
npx zcf config-switch glm-provider --code-type codex

# Switch back to official login
npx zcf config-switch official --code-type codex
```

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

### Automatic Backup

ZCF automatically creates backups during the following operations:

1. **Initialize Configuration**: First-time configuration or re-initialization
2. **Update Configuration**: Update workflows or templates via `zcf update`
3. **Switch Configuration**: Use `config-switch` to switch configurations
4. **Modify API**: Update API keys or providers
5. **Install Workflows**: Import or update workflow templates
6. **MCP Configuration**: Modify MCP service configuration

### Manual Backup

You can also manually trigger backups:

```bash
# Claude Code configuration backup (automatically executed during updates)
npx zcf update

# Codex configuration backup
npx zcf init -T codex --backup-only

# CCR configuration backup (automatically executed in CCR command)
npx zcf ccr
```

### Backup Restoration

If you need to restore to previous configuration:

1. **Find Backup Files**: Find timestamped backup files in the corresponding backup directory
2. **Restore Configuration**: Manually copy backup files to original location

```bash
# View Claude Code backups
ls ~/.claude/backup/

# Restore specific backup (example)
cp ~/.claude/backup/settings.json.2025-01-15_10-30-45.bak ~/.claude/settings.json

# View Codex backups
ls ~/.codex/backup/

# Restore Codex configuration (example)
cp ~/.codex/backup/config.toml.2025-01-15_10-30-45.bak ~/.codex/config.toml
```

## Incremental Management

When existing configuration is detected, ZCF will prompt you to choose a management strategy:

### Strategy Options

- **backup**: Backup existing configuration then merge new configuration (recommended)
- **merge**: Directly merge new configuration into existing configuration
- **new**: Create new configuration, preserve old configuration
- **skip**: Skip this operation, preserve existing configuration

### Incremental Update Options

When updating workflows or templates, you can choose:

- **docs-only**: Only update prompts and documents, don't overwrite custom content
- **full**: Complete update, overwrite all content
- **skip**: Skip all operations

```bash
# Only update documents
npx zcf update --docs-only

# Complete update
npx zcf update --full
```

## Configuration Management Best Practices

### Version Control Strategy

For team collaboration, it's recommended to include configurations in version control:

```bash
# Create configuration repository
mkdir ~/zcf-configs
cd ~/zcf-configs
git init

# Add configuration files
cp ~/.claude/settings.json ./claude-settings.json
cp ~/.codex/config.toml ./codex-config.toml
cp ~/.ufomiao/zcf/config.toml ./zcf-config.toml

# Commit configuration (Note: Don't commit sensitive information)
git add .claude-ignore .codex-ignore
git commit -m "Add ZCF configurations"
```

> ⚠️ **Security Warning**: Do not commit configuration files containing API keys to public repositories. Use `.gitignore` to exclude sensitive files, or use environment variables to manage keys.

### Git Worktree Integration

Use Git Worktree to sync configurations across different workspaces:

```bash
# Use /git-worktree command in project
/git-worktree create feat/new-feature and open

# Configuration will automatically sync to new worktree
```

### Configuration Separation

It's recommended to separate configurations into the following categories:

1. **Shared Configuration**: Workflow templates, output styles, MCP service configuration
2. **Personal Configuration**: API keys, personal preference settings
3. **Project Configuration**: Project-specific workflows and templates

```bash
# Use configuration switch to switch between different environments
npx zcf config-switch dev-env    # Development environment configuration
npx zcf config-switch prod-env   # Production environment configuration
```

## Configuration Backup Cleanup

Regularly clean up old backups to save space:

```bash
# Manual cleanup (example: keep backups from last 30 days)
find ~/.claude/backup/ -name "*.bak" -mtime +30 -delete
find ~/.codex/backup/ -name "*.bak" -mtime +30 -delete

# Or use system tools
# macOS
tmutil deletelocalsnapshots $(date +%Y-%m-%d)
```

> 💡 **Tip**: It's recommended to keep at least the last 7 days of backups for restoration when needed.

## Troubleshooting

### Configuration Conflicts

If you encounter configuration conflicts:

```bash
# View current configuration status
npx zcf config-switch --list

# Force reset configuration (will create backup)
npx zcf init --force-reset

# Restore to recent backup
# Manually copy backup file to original location
```

### Backup Failure

If backup fails:

1. **Check Disk Space**: Ensure sufficient disk space
2. **Check Permissions**: Ensure write permissions for backup directory
3. **Manual Backup**: Use `cp` command to manually backup

```bash
# Check disk space
df -h ~

# Check permissions
ls -la ~/.claude/

# Manual backup
cp ~/.claude/settings.json ~/.claude/settings.json.manual-backup
```

### Configuration Loss

If configuration is lost:

1. **Find Backup**: Find recent backup in backup directory
2. **Restore Backup**: Copy backup file to original location
3. **Re-initialize**: If backup is unavailable, you can re-run initialization

```bash
# Find recent backup
ls -lt ~/.claude/backup/ | head -5

# Restore latest backup
cp ~/.claude/backup/settings.json.$(ls -t ~/.claude/backup/ | head -1) ~/.claude/settings.json
```

## Related Resources

- [Configuration Management](../advanced/configuration.md) - Detailed configuration management guide
- [API Provider Presets](../advanced/api-providers.md) - Pre-configured API providers
- [CLI Commands](../cli/config-switch.md) - Detailed configuration switch command documentation

> 💡 **Tip**: Proper use of multi-configuration and backup systems can make your development environment more stable and reliable. It's recommended to regularly backup important configurations and unify configuration management strategies within teams.


