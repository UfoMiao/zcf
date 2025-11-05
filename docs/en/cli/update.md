---
title: zcf update
---

# zcf update

`zcf update` (abbreviation `zcf u`) is used to update workflow templates, prompts, and check tool versions. This is a lightweight update command that does not modify API configuration or installed MCP services.

## Feature Overview

The `zcf update` command performs the following operations:

1. 📝 **Update Prompts**: Synchronize latest workflow templates and prompt content
2. 🔄 **Update Workflows**: Update or install new workflow templates
3. 📊 **Check Versions**: Check Claude Code or Codex versions and prompt updates (if available)
4. 🌐 **Language Sync**: Update template language and AI output language
5. 💾 **Create Backup**: Automatically create backup before updating

## Basic Usage

### Interactive Mode (Recommended)

```bash
# Update using saved preferences
npx zcf update

# Or use abbreviation
npx zcf u

# Or through main menu
npx zcf
# Then select 2 (Import/Update Workflows)
```

In interactive mode, ZCF will:

1. Ask for template language (if preference not saved)
2. Ask for AI output language (if preference not saved)
3. Select workflows to update/install
4. Check tool versions and prompt updates

### Non-Interactive Mode

```bash
# Update using default language settings
npx zcf u -s

# Specify template language
npx zcf u -s -c zh-CN

# Specify AI output language
npx zcf u -s -a zh-CN

# Specify both template and output language
npx zcf u -s -g zh-CN

# Specify code tool type
npx zcf u -s -T codex
```

## Common Parameters

| Parameter | Abbreviation | Description | Optional Values | Default |
|------|------|------|--------|--------|
| `--skip-prompt, -s` | `-s` | Skip all interactive prompts | - | - |
| `--config-lang, -c` | `-c` | Template file language | `zh-CN`, `en` | User saved preference or `en` |
| `--ai-output-lang, -a` | `-a` | AI output language | `zh-CN`, `en`, custom string | User saved preference or `en` |
| `--all-lang, -g` | `-g` | Set all language parameters uniformly | `zh-CN`, `en`, custom string | - |
| `--code-type, -T` | `-T` | Target code tool type | `claude-code`, `codex`, `cc`, `cx` | Current tool type in ZCF configuration |

> 💡 **Tip**: Using `--all-lang` can set template language and AI output language at once.

## Usage Scenarios

### Scenario 1: Regular Workflow Updates

```bash
# Regularly run to get latest workflow templates
npx zcf u

# Update once per week (recommended)
# Can be added to cron tasks or CI/CD processes
```

### Scenario 2: Update Specific Code Tool

```bash
# Update Claude Code workflows
npx zcf u -T claude-code -c zh-CN

# Update Codex workflows
npx zcf u -T codex -c zh-CN
```

### Scenario 3: Sync Language Settings

```bash
# Switch all language settings to Chinese
npx zcf u -g zh-CN

# Template Chinese, AI output English
npx zcf u -c zh-CN -a en
```

### Scenario 4: Automated Updates

```bash
# Non-interactive update (suitable for scripts)
npx zcf u -s -g zh-CN -T claude-code
```

## Execution Flow

The execution flow of `zcf update` is as follows:

### Claude Code Flow

1. **Display Banner**: Display update prompt
2. **Parse Language Preferences**: Get language settings from parameters, configuration, or interaction
3. **Update Prompts**: Synchronize latest workflow templates and prompts
4. **Select Workflows**: Interactively select workflows to install/update
5. **Check Version**: Check Claude Code version and prompt updates
6. **Save Preferences**: Update ZCF global configuration

### Codex Flow

1. **Display Banner**: Display update prompt
2. **Run Codex Update**: Execute Codex-specific update flow
3. **Update Workflows**: Update Codex workflow templates
4. **Save Preferences**: Update ZCF global configuration

## Update Content

`zcf update` will update the following content:

### Workflow Templates

- ✅ Six-stage workflow (`/zcf:workflow`)
- ✅ Feature development workflow (`/zcf:feat`)
- ✅ Git workflow (`/git-commit` etc.)
- ✅ BMad workflow (`/bmad-init`)
- ✅ Common tools (`/init-project`)

> ⚠️ **Note**: Codex currently only supports six-stage workflow and Git workflows.

### Prompt Content

- ✅ System prompts (`CLAUDE.md`)
- ✅ Workflow command templates
- ✅ AI agent templates
- ✅ Output style templates

### Content That Won't Be Updated

`zcf update` **will not** modify the following content:

- ❌ API configuration (keys, authentication methods, etc.)
- ❌ MCP service configuration (installed services)
- ❌ Custom output styles
- ❌ Project-specific configuration

If you need to update these, please use `zcf init` or corresponding configuration menu.

## Version Checking

`zcf update` automatically checks tool versions:

### Claude Code Version Check

- Check currently installed Claude Code version
- If new version is available, prompt user to update
- Update prompts only shown in interactive mode

### Codex Version Check

- Automatically executed in Codex update flow
- Check Codex CLI version and update (if needed)

## Backup Mechanism

Before updating workflows and prompts, ZCF automatically creates backups:

### Claude Code Backup

- Backup location: `~/.claude/backup/`
- Backup content: Workflow templates, prompts, configuration files
- Backup format: Timestamp directory (e.g., `backup_2025-01-15_10-30-45/`)

### Codex Backup

- Backup location: `~/.codex/backup/`
- Backup content: Workflow templates, configuration files
- Backup format: Timestamp directory

## Best Practices

### 1. Regular Updates

It's recommended to regularly run `zcf update` to get latest workflows and improvements:

```bash
# Update once per week
npx zcf u -g zh-CN

# Or add to cron task
0 0 * * 0 /usr/local/bin/npx zcf u -s -g zh-CN
```

### 2. Check Before Update

Before updating, you can view current configuration:

```bash
# View current workflows
ls -la ~/.claude/workflows/

# View backups
ls -la ~/.claude/backup/
```

### 3. Preserve Custom Content

If you have custom workflows or prompts:

1. **Backup Custom Content**: Manually backup before updating
2. **Use `docs-only` Mode**: Use `--config-action docs-only` in `zcf init`
3. **View Differences**: Compare backup and current files after updating

### 4. Team Sync

In team environments:

- Unify update frequency and language settings
- Share updated workflow templates
- Use Git to manage custom templates

```bash
# Team unified update command
npx zcf u -s -g zh-CN -T claude-code
```

## Troubleshooting

### Update Failure

If update fails:

1. **Check Network Connection**: Ensure access to npm registry
2. **Check Permissions**: Ensure write permissions for configuration directories
3. **View Error Messages**: Check error messages in terminal output

```bash
# Check permissions
ls -la ~/.claude/ ~/.codex/

# Manually create backup directories (if needed)
mkdir -p ~/.claude/backup ~/.codex/backup
```

### Workflows Not Updated

If workflows are not updated:

```bash
# Force reinstall workflows
npx zcf init --config-action new -w all

# Or manually check workflow directory
ls -la ~/.claude/workflows/
```

### Version Check Not Working

If version check doesn't prompt:

1. **Confirm Claude Code is Installed**: Check if `claude-code` command is available
2. **Manually Check Version**: Use `claude-code --version`
3. **Use check-updates Command**: Run `npx zcf check-updates`

## Differences from init

| Feature | `zcf init` | `zcf update` |
|------|-----------|-------------|
| **Main Purpose** | Complete environment initialization | Update workflows and templates |
| **API Configuration** | ✅ Will configure | ❌ Won't modify |
| **MCP Services** | ✅ Will install and configure | ❌ Won't modify |
| **Workflows** | ✅ Will install | ✅ Will update |
| **Output Styles** | ✅ Will configure | ❌ Won't modify |
| **Version Check** | ❌ Doesn't check | ✅ Will check |
| **Backup** | ✅ Creates backup | ✅ Creates backup |

> 💡 **Recommendations**:
> - Use `zcf init` for first-time use or when you need to modify API/MCP configuration
> - Use `zcf update` when you only need to update workflows and templates

## Related Resources

- [zcf init](init.md) - Complete initialization command
- [Workflow System](../features/workflows.md) - Detailed workflow information
- [Configuration Management](../features/multi-config.md) - Backup and restore
- [check-updates](check-updates.md) - Version check command

> 💡 **Tip**: It's recommended to regularly run `zcf update` to keep workflow templates and prompts up to date, especially when new features are released or templates are updated.


