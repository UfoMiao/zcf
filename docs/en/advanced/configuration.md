---
title: Configuration Management
---

# Configuration Management

ZCF provides a comprehensive configuration management system, supporting incremental management, backup strategies, and flexible configuration switching. Understanding the structure and mechanisms of the configuration system can help you better manage and maintain your development environment.

## Directory Structure Overview

ZCF's configurations are distributed across the following directories:

### Main Configuration Directories

| Directory | Description | Main Files |
|------|------|---------|
| `~/.claude/` | Claude Code main configuration directory | `settings.json`, `CLAUDE.md`, `prompts/`, `workflows/` |
| `~/.codex/` | Codex main configuration directory | `config.toml`, `auth.json`, `prompts/`, `AGENTS.md` |
| `~/.ufomiao/zcf/` | ZCF global configuration directory | `config.toml` |
| `~/.claude-code-router/` | CCR configuration directory | `config.json` |
| `~/.claude/backup/` | Claude Code backup directory | Timestamp backup files |
| `~/.codex/backup/` | Codex backup directory | Timestamp backup files |

### Configuration File Details

#### Claude Code Configuration

```
~/.claude/
├── settings.json          # Main configuration file (API, MCP, permissions, etc.)
├── CLAUDE.md              # Project memory and system prompts
├── prompts/               # Prompts directory
│   ├── output-style/      # Output style templates
│   └── memory/            # Memory templates
└── workflows/             # Workflows directory
    ├── zcf-workflow/      # Six-stage workflow
    ├── feat/              # Feature development workflow
    ├── git/               # Git workflow
    └── bmad/              # BMad workflow
```

#### Codex Configuration

```
~/.codex/
├── config.toml            # Main configuration file (TOML format)
├── auth.json              # API key configuration (encrypted storage)
├── AGENTS.md              # System prompts and agent configuration
├── prompts/               # Prompts directory
│   └── workflow/          # Workflow prompts
└── system-prompt/         # System prompt templates
```

#### ZCF Global Configuration

```
~/.ufomiao/zcf/
├── config.toml            # ZCF global configuration (TOML format)
│   ├── preferredLang      # CLI language preference
│   ├── templateLang       # Template language preference
│   ├── aiOutputLang       # AI output language preference
│   └── codeToolType       # Current active tool type
└── backup/                # ZCF configuration backup
```

## Incremental Management Mode

When ZCF detects existing configuration, it will ask for operation strategy.

### Configuration Handling Strategies

| Strategy | Description | Use Case | Risk |
|------|------|---------|------|
| `backup` | Backup then overwrite (default) | Recommended default option | Low (has backup) |
| `merge` | Try to merge new configuration | Need to preserve custom content | Medium (may conflict) |
| `new` | Ignore existing content and regenerate | Need brand new configuration | High (overwrites existing) |
| `docs-only` | Only update documents and prompts | Only need to update templates | Low |
| `skip` | Skip current step | Don't need to modify | None |

### Automatic Strategy Application

In non-interactive mode (`--skip-prompt`), ZCF will automatically apply default strategy:

- Default strategy: `backup`
- Can specify strategy via `--config-action` parameter

```bash
# Specify configuration handling strategy
npx zcf init -s --config-action merge

# Only update documents
npx zcf init -s --config-action docs-only
```

### Merge Strategy Details

`merge` strategy will try to intelligently merge configurations:

- ✅ **MCP Services**: New services will be merged into existing configuration
- ✅ **Workflows**: New workflows will be added to existing workflows
- ⚠️ **API Configuration**: May require manual confirmation
- ⚠️ **Output Styles**: New styles will be added to existing styles

## AI Output Language Directives

### Configuration Mechanism

The `applyAiLanguageDirective` function will write corresponding language directives to system prompt files based on `--ai-output-lang` parameter.

### Supported Language Options

- `zh-CN`: Chinese output directive
- `en`: English output directive
- `custom`: Custom language directive

### Custom Language Directives

Using `custom` option allows input of custom language directives:

```bash
npx zcf init --ai-output-lang custom
# Enter: Reply in Japanese, maintain professional and polite tone
```

Custom directives will be written to:
- **Claude Code**: `~/.claude/CLAUDE.md`
- **Codex**: `~/.codex/AGENTS.md`

### Configuration Location

Language directive configuration locations:

- **Claude Code**: Top of `CLAUDE.md` file
- **Codex**: Top of `AGENTS.md` file

## Template Language Selection

### Language Resolution Mechanism

The `resolveTemplateLanguage` function determines template language by considering the following factors:

1. **Command Line Parameters**: `--config-lang` or `--all-lang`
2. **Configuration File**: `templateLang` in `~/.ufomiao/zcf/config.toml`
3. **Interactive Input**: If not specified, will prompt user to select
4. **System Default**: Finally fallback to `en`

### Language Independence

Template language and AI output language are independent of each other and can be flexibly combined:

```bash
# Chinese templates + English output (suitable for projects requiring English code comments)
npx zcf init --config-lang zh-CN --ai-output-lang en

# English templates + Chinese output (suitable for international teams)
npx zcf init --config-lang en --ai-output-lang zh-CN
```

### Template Language Effects

Template language affects:

- Language version of workflow templates
- Language of prompts and instructions
- Language of system prompt templates
- Language of output style templates

## Change Tracking Recommendations

### Use Version Control

It's recommended to use Git to manage configuration directories:

```bash
# Create configuration repository
mkdir ~/zcf-configs
cd ~/zcf-configs
git init

# Add configuration files (note: exclude sensitive information)
cat > .gitignore << EOF
*.key
auth.json
settings.json
config.toml
EOF

# Add templates and workflows (without sensitive information)
git add prompts/ workflows/ templates/
git commit -m "Add ZCF templates and workflows"
```

### Compare Differences

Compare differences before and after executing `zcf update`:

```bash
# Before update
git add ~/.claude/
git commit -m "Before update"

# Execute update
npx zcf update

# View differences
git diff ~/.claude/

# Review changes then commit
git add ~/.claude/
git commit -m "After update"
```

### Backup Restoration

If custom content is accidentally overwritten, you can restore from backup directory:

```bash
# View backups
ls -lt ~/.claude/backup/

# Restore specific backup
cp -r ~/.claude/backup/backup_2025-01-15_10-30-45/* ~/.claude/

# Or restore specific file
cp ~/.claude/backup/backup_*/workflows/custom/my-workflow.md ~/.claude/workflows/custom/
```

## Configuration Management Best Practices

### 1. Layered Configuration Management

- **Global Configuration**: Team-shared templates and workflows
- **Personal Configuration**: Personal API keys and preferences
- **Project Configuration**: Project-specific workflows and templates

### 2. Sensitive Information Handling

- ⚠️ **Do not commit sensitive information to version control**
- ✅ **Use environment variables to manage API keys**
- ✅ **Use `.gitignore` to exclude sensitive files**
- ✅ **Regularly rotate keys**

### 3. Configuration Synchronization

Synchronize configurations across multiple devices:

```bash
# Method 1: Use Git
git clone ~/zcf-configs
cp -r zcf-configs/templates/* ~/.claude/workflows/

# Method 2: Use cloud storage
rsync -av ~/.claude/workflows/ ~/Cloud/.claude/workflows/

# Method 3: Use Git Worktree
/git-worktree migrate
```

### 4. Regular Review

Regularly review and clean configurations:

```bash
# Clean old backups (keep last 30 days)
find ~/.claude/backup -name "*.bak" -mtime +30 -delete

# Review unused configurations
ls -la ~/.claude/workflows/
# Remove custom workflows that are no longer needed
```

### 5. Team Collaboration

In team environments:

- Unify configuration templates and standards
- Share workflows and output styles
- Maintain configuration change logs
- Regularly sync configuration updates

## Configuration Migration

### Migrate from Old Version

If upgrading from old version of ZCF:

```bash
# ZCF will automatically detect and migrate configuration
npx zcf init

# Or manually check migration
cat ~/.ufomiao/zcf/config.toml
# Check if there are migration prompts
```

### Cross-Tool Migration

Migrate from Claude Code to Codex:

```bash
# 1. Backup Claude Code configuration
cp -r ~/.claude ~/.claude.backup

# 2. Initialize Codex
npx zcf init -T codex

# 3. Manually migrate workflows and templates (if needed)
# Note: Template formats for Claude Code and Codex may differ
```

## Troubleshooting

### Configuration Conflicts

If you encounter configuration conflicts:

```bash
# 1. View conflict details
npx zcf init
# View conflict prompts when selecting merge strategy

# 2. Manually merge configuration
# Edit configuration file, manually merge conflicting items

# 3. Use backup strategy to start over
npx zcf init --config-action backup
```

### Configuration Lost

If configuration is lost:

```bash
# 1. Find backup
ls -lt ~/.claude/backup/ | head -5

# 2. Restore backup
cp -r ~/.claude/backup/backup_latest_timestamp/* ~/.claude/

# 3. Reinitialize (if backup unavailable)
npx zcf init --config-action new
```

### Configuration File Corrupted

If configuration file is corrupted:

```bash
# 1. Check configuration file format
cat ~/.claude/settings.json | jq .

# 2. Restore from backup
cp ~/.claude/backup/backup_*/settings.json ~/.claude/

# 3. Or reinitialize
npx zcf init --config-action new
```

## Related Resources

- [Multi-Config and Backup](../features/multi-config.md) - Multi-configuration system and backup mechanisms
- [Internationalization and Languages](i18n.md) - Detailed language configuration
- [Template System](templates.md) - Template management and customization

> 💡 **Tip**: Proper configuration management can improve development efficiency and team collaboration quality. It's recommended to use version control to manage templates and workflows, while properly storing configuration files containing sensitive information. Regularly backup and review configurations to ensure development environment stability.


