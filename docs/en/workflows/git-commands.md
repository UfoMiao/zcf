---
title: Git Smart Commands
---

# Git Smart Commands

Git workflow provides a series of smart Git operation commands to simplify version control processes.

## Command List

| Command | Claude Code | Codex | Description |
|------|------------|-------|------|
| **Smart Commit** | `/git-commit` | `/prompts:git-commit` | Intelligently generate commit messages and split commits |
| **Safe Rollback** | `/git-rollback` | `/prompts:git-rollback` | Safely rollback to specified commit |
| **Clean Branches** | `/git-clean-branches` | `/prompts:git-clean-branches` | Clean merged branches |
| **Worktree Management** | `/git-worktree` | `/prompts:git-worktree` | Manage Git Worktree, support create, migrate, delete |

> 💡 **Tip**: Codex uses `/prompts:` prefix, while Claude Code directly uses `/` prefix.

## Command Details

### `/git-commit` / `/prompts:git-commit`

Smart Git commit command with features including:

- 🔍 **Automatic Change Analysis**: Use Git to analyze code changes
- ✍️ **Generate Commit Messages**: Automatically generate commit messages conforming to Conventional Commits specification
- 🎨 **Optional Emoji**: Support adding emoji to commit messages
- 📦 **Smart Split**: Suggest splitting commits when necessary to maintain commit atomicity
- ✅ **Git Hooks**: Run local Git hooks by default (can skip with `--no-verify`)

**Usage Example**:
```
/git-commit
# Or in Codex:
/prompts:git-commit
```

### `/git-rollback` / `/prompts:git-rollback`

Safe rollback command with features including:

- 📋 **List Branches**: Display all available branches
- 🔍 **List Versions**: Display commit history for specified branch
- ⚠️ **Double Confirmation**: Require user confirmation before execution
- 🔄 **Execute Rollback**: Support both `reset` and `revert` methods
- 💾 **Backup Mechanism**: Automatically backup before rollback

**Usage Example**:
```
/git-rollback
# Or in Codex:
/prompts:git-rollback
```

### `/git-clean-branches` / `/prompts:git-clean-branches`

Safely clean merged branches with features including:

- 🔍 **Find Branches**: Automatically find merged or expired Git branches
- 🧪 **Dry-run Mode**: Support preview mode to view branches to be deleted first
- ⚙️ **Custom Configuration**: Support custom base branch and protected branches
- 🛡️ **Safety Mechanism**: Prevent accidental deletion of important branches

**Usage Example**:
```
/git-clean-branches
# Or in Codex:
/prompts:git-clean-branches
```

### `/git-worktree` / `/prompts:git-worktree`

Git worktree management with features including:

- 📁 **Smart Defaults**: Create worktree in `../.zcf/project-name/` directory at project level
- 🔧 **IDE Integration**: Automatically configure IDE to open new worktree
- 📦 **Content Migration**: Support migrating existing content to worktree
- 🔄 **Complete Management**: Support complete operations like create, migrate, delete

**Usage Example**:
```
/git-worktree Create new feat/add-i18n and open
# Or in Codex:
/prompts:git-worktree Create new feat/add-i18n and open
```

## Usage Tips

- Use natural language descriptions to let AI execute multiple Git operations
- Combined with `best-practices/worktree.md` can greatly improve multi-task parallel efficiency
- After project initialization, it's recommended to run `/init-project` (Claude Code) first to generate project configuration

> ⚠️ **Note**: Project initialization tool (init-project) is only available in Claude Code. Codex does not support it yet.


