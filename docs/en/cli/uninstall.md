---
title: Uninstall and Cleanup
---

# Uninstall and Cleanup

`zcf uninstall` provides a safe uninstallation process, supporting selective uninstall, complete uninstall, and conflict resolution. Suitable for scenarios requiring environment reset, device migration, or configuration cleanup.

## Feature Overview

The `zcf uninstall` command supports:

1. 🗑️ **Selective Uninstall**: Selectively delete specific components
2. 🔄 **Complete Uninstall**: Completely remove all ZCF configurations and tools
3. 💾 **Backup Preservation**: Support preserving backups for restoration
4. 🔍 **Conflict Detection**: Detect and resolve file conflicts
5. 🗂️ **Trash Support**: Use system trash for safe deletion (supports macOS, Windows, Linux)

## Basic Usage

### Interactive Mode (Recommended)

```bash
# Open interactive uninstall menu
npx zcf uninstall

# Or through main menu
npx zcf
# Then select corresponding uninstall option
```

In interactive mode, ZCF will guide you:

1. Select uninstall mode (complete uninstall or custom uninstall)
2. Select components to uninstall (if custom selected)
3. Confirm uninstall operation
4. Choose whether to preserve backups

### Complete Uninstall

Completely remove all ZCF-related configurations and tools:

```bash
# Interactive complete uninstall
npx zcf uninstall
# Then select "Complete Uninstall"

# Non-interactive complete uninstall
npx zcf uninstall --mode complete

# Specify language
npx zcf uninstall --mode complete --lang zh-CN
```

### Custom Uninstall

Selectively uninstall specific components:

```bash
# Interactive custom uninstall
npx zcf uninstall
# Then select "Custom Uninstall", then select components to uninstall

# Non-interactive custom uninstall (comma-separated)
npx zcf uninstall --mode custom --items "ccr,backups,cometix"

# Use array format (in code)
npx zcf uninstall --mode custom --items '["ccr","backups"]'
```

## Uninstall Modes

### Complete Uninstall Mode

Remove all ZCF-related configurations and tools:

**Will Delete**:
- ✅ Claude Code configuration (`~/.claude/`)
- ✅ Codex configuration (`~/.codex/`)
- ✅ CCR configuration (`~/.claude-code-router/`)
- ✅ CCometixLine configuration (`~/.cometix/`)
- ✅ ZCF global configuration (`~/.ufomiao/zcf/`)
- ✅ All backup files

**Will Not Delete**:
- ❌ Claude Code CLI itself (needs to be uninstalled through other methods)
- ❌ Codex CLI itself (needs to be uninstalled through other methods)
- ❌ System-level tools and dependencies

### Custom Uninstall Mode

You can selectively uninstall the following components:

| Component | Description | Configuration Location |
|------|------|---------|
| `claude-code` | Claude Code configuration | `~/.claude/` |
| `codex` | Codex configuration | `~/.codex/` |
| `ccr` | Claude Code Router configuration | `~/.claude-code-router/` |
| `cometix` | CCometixLine configuration | `~/.cometix/` |
| `backups` | All backup files | `~/.claude/backup/`, `~/.codex/backup/` etc. |
| `zcf-config` | ZCF global configuration | `~/.ufomiao/zcf/` |

```bash
# Only uninstall CCR
npx zcf uninstall --mode custom --items ccr

# Uninstall multiple components
npx zcf uninstall --mode custom --items "ccr,cometix,backups"

# Uninstall all backups (free space)
npx zcf uninstall --mode custom --items backups
```

## Common Parameters

| Parameter | Description | Optional Values | Default |
|------|------|--------|--------|
| `--mode, -m` | Uninstall mode | `complete`, `custom`, `interactive` | `interactive` |
| `--items, -i` | Components to uninstall (custom mode) | Comma-separated component names or JSON array | - |
| `--lang, -l` | Interface language | `zh-CN`, `en` | `en` |

## Usage Scenarios

### Scenario 1: Reset Development Environment

```bash
# Complete uninstall and reinitialize
npx zcf uninstall --mode complete
npx zcf init
```

### Scenario 2: Clean Backup Files

```bash
# Only clean backups to free space
npx zcf uninstall --mode custom --items backups
```

### Scenario 3: Migrate to New Device

```bash
# Reconfigure on new device, clean old device
# 1. Backup configuration on new device
cp -r ~/.claude ~/claude-backup
cp -r ~/.codex ~/codex-backup

# 2. Initialize on new device
npx zcf init

# 3. Clean on old device
npx zcf uninstall --mode complete
```

### Scenario 4: Only Remove Specific Tool

```bash
# Only uninstall CCR (preserve other configurations)
npx zcf uninstall --mode custom --items ccr

# Only uninstall CCometixLine
npx zcf uninstall --mode custom --items cometix
```

## Backup Mechanism

### Pre-Uninstall Backup

Before executing uninstall, ZCF will:

1. **Create Uninstall Backup**: Backup configuration to temporary directory
2. **Record Backup Location**: Display backup location for restoration
3. **Provide Restore Option**: Ask whether to preserve backup

### Restore Backup

If you need to restore:

```bash
# Find backup location
ls -la ~/.claude/backup/
ls -la ~/.codex/backup/

# Manually restore (example)
cp -r ~/.claude/backup/backup_2025-01-15_10-30-45/* ~/.claude/
```

## Safety Mechanisms

### Interactive Confirmation

All uninstall operations require confirmation:

```
⚠️  Warning: This operation will delete the following:
   - Claude Code configuration
   - All backup files

   Continue? (y/N)
```

### Conflict Detection

If file conflicts are detected:

1. **Display Conflict List**: List all conflicting files
2. **Ask Handling Method**: Choose skip, overwrite, or merge
3. **Create Conflict Backup**: Backup conflicting files for restoration

### Trash Support

Supports using system trash for safe deletion:

- ✅ **macOS**: Use system Trash
- ✅ **Windows**: Use Recycle Bin
- ✅ **Linux**: Use trash-cli (if installed)

If system trash is unavailable, files will be deleted directly.

## Best Practices

### 1. Backup Before Uninstall

It's recommended to manually backup important configurations before uninstalling:

```bash
# Backup Claude Code configuration
tar -czf claude-backup.tar.gz ~/.claude/

# Backup Codex configuration
tar -czf codex-backup.tar.gz ~/.codex/

# Backup ZCF configuration
tar -czf zcf-backup.tar.gz ~/.ufomiao/zcf/
```

### 2. Selective Uninstall

If you only need to clean part of the configuration:

```bash
# Clean backup files (free space)
npx zcf uninstall --mode custom --items backups

# Clean specific tool configuration
npx zcf uninstall --mode custom --items ccr
```

### 3. Team Environment

In team environments:

- **Unified Uninstall Strategy**: Unify uninstall process within team
- **Preserve Key Configurations**: Preserve team-shared configuration templates
- **Document Records**: Record uninstalled configurations and reasons

### 4. Test Environment

In test or development environments:

```bash
# Quick reset test environment
npx zcf uninstall --mode complete
npx zcf init -s -p 302ai -k "test-key" -g zh-CN
```

## Troubleshooting

### Uninstall Failure

If uninstall fails:

1. **Check Permissions**: Ensure delete permissions for configuration directories
2. **Check File Occupancy**: Ensure files are not occupied by other processes
3. **View Error Messages**: Check detailed errors in terminal output

```bash
# Check permissions
ls -la ~/.claude/ ~/.codex/

# Check process occupancy
lsof ~/.claude/  # macOS/Linux
```

### Partial Files Not Deleted

If some files are not deleted:

1. **Manual Delete**: Use system commands to manually delete
2. **Check Hidden Files**: Ensure all hidden files are deleted
3. **Clean Empty Directories**: Delete empty directories

```bash
# Manual cleanup (use with caution)
rm -rf ~/.claude/
rm -rf ~/.codex/
rm -rf ~/.ufomiao/zcf/
```

### Restore Backup Failed

If restore backup fails:

1. **Check Backup Integrity**: Confirm backup files are complete
2. **Check Permissions**: Ensure restore permissions
3. **Restore Gradually**: Restore file by file rather than batch restore

## Differences from Other Operations

| Operation | `zcf uninstall` | `zcf init --config-action new` |
|------|----------------|-------------------------------|
| **Purpose** | Completely remove configuration | Recreate configuration |
| **Delete Content** | Delete all configurations and tools | Only reset configuration, preserve tools |
| **Backup** | Optional preserve backup | Automatically create backup |
| **Restore** | Manually restore backup | Automatically preserve old configuration |

> 💡 **Recommendations**:
> - Use `zcf uninstall` when you need to completely clean environment
> - Use `zcf init --config-action new` when you need to reset configuration but preserve tools

## Related Resources

- [zcf init](init.md) - Reinitialize environment
- [Configuration Management](../features/multi-config.md) - Backup and restore mechanisms
- [Troubleshooting](../advanced/troubleshooting.md) - Common problem solutions

> ⚠️ **Warning**: Uninstall operations are irreversible. Please ensure important configurations are backed up before execution. If you only need to reset part of the configuration, it's recommended to use `zcf init`'s `--config-action` option rather than complete uninstall.


