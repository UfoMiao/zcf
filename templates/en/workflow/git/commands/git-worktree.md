---
description: Manage Git worktrees, support add/list/remove/migrate operations, create in .zcf/ directory by default, auto-configure git ignore rules, support IDE quick open and content migration
allowed-tools: Read(**), Exec(git worktree add, git worktree list, git worktree remove, git worktree prune, git branch, git checkout, git rev-parse, git stash, git cp, code, cursor, webstorm), Write(.git/info/exclude)
argument-hint: <add|list|remove|prune|migrate> [path] [-b <branch>] [-o|--open] [--track] [--guess-remote] [--detach] [--checkout] [--lock] [--migrate-from <source-path>] [--migrate-stash]
# examples:
#   - /git-worktree add feature-ui                     # create worktree, ask whether to open in IDE by default
#   - /git-worktree add feature-ui -o                  # create worktree and open directly in IDE
#   - /git-worktree add hotfix -b fix/login -o         # create new branch, worktree and open in IDE directly
#   - /git-worktree migrate feature-ui --from main     # migrate uncommitted content from main branch to feature-ui worktree
#   - /git-worktree migrate feature-ui --stash         # migrate current stash content to feature-ui worktree
---

# Claude Command: Git Worktree

**Purpose**: Provide Git worktree quick operations, manage multiple working trees in `.zcf/` directory by default, auto-handle git ignore configuration, support IDE quick open and cross-worktree content migration.

---

## Usage

```bash
# Add worktree (default in .zcf/)
/git-worktree add <path>                           # checkout same-name branch to .zcf/<path>, ask whether to open IDE
/git-worktree add <path> -b <branch>               # create new branch and add worktree
/git-worktree add <path> -o                        # create and open directly in IDE
/git-worktree add <path> -b <branch> --open        # create new branch, worktree and open directly

# Content migration
/git-worktree migrate <target-path> --from <source-path>  # migrate uncommitted content
/git-worktree migrate <target-path> --stash               # migrate stash content

# Other operations
/git-worktree list                                 # show all worktree status
/git-worktree remove <path>                        # remove specified worktree
/git-worktree prune                                # clean invalid worktree records
```

### Options

| Option | Description |
|--------|-------------|
| `add <path>` | Add new worktree in `.zcf/<path>` |
| `migrate <target>` | Migrate content to specified worktree |
| `list` | List all worktrees and their status |
| `remove <path>` | Remove worktree at specified path |
| `prune` | Clean invalid worktree references |
| `-b <branch>` | Create new branch and checkout to worktree |
| `-o, --open` | Open directly in IDE after creation (skip prompt) |
| `--from <source>` | Specify migration source path (migrate only) |
| `--stash` | Migrate current stash content (migrate only) |
| `--track` | Set new branch to track corresponding remote branch |
| `--guess-remote` | Auto guess remote branch for tracking |
| `--detach` | Create detached HEAD worktree |
| `--checkout` | Checkout immediately after creation (default behavior) |
| `--lock` | Lock worktree after creation |

---

## What This Command Does

### 1. **Environment Check**
   - Confirm in Git repository via `git rev-parse --is-inside-work-tree`

### 2. **Ignore Rules Configuration**
   - Check if `.git/info/exclude` contains `/.zcf/` rule
   - Auto-add `/.zcf/` to `.git/info/exclude` if not exists

### 3. **Worktree Operations**
   - **add**: Create new worktree in `.zcf/<path>`
   - **list**: Show all worktree paths, branches and status
   - **remove**: Safely remove specified worktree
   - **prune**: Clean orphaned worktree records

### 4. **🆕 IDE Quick Open Feature**
   - **Default behavior**: Ask whether to open new worktree in IDE after `add` operation
   - **Direct open**: Use `-o/--open` parameter to skip prompt and open directly
   - **IDE detection**: Auto-detect common IDEs (VS Code, Cursor, WebStorm, etc.)
   - **Smart selection**: Recommend best choice based on project type and installed IDEs

### 5. **🆕 Content Migration Feature**
   - **Uncommitted content migration**: Migrate uncommitted changes from one worktree to another
   - **Stash migration**: Apply current stash content to target worktree
   - **Safety check**: Check target worktree status before migration to avoid conflicts

### 6. **Path Handling**
   - Auto-add `.zcf/` prefix to all relative paths
   - Keep absolute paths as-is
   - Auto-create `.zcf/` directory if not exists

### 7. **Branch Management**
   - Support checking out existing branches or creating new branches
   - Auto-handle remote branch tracking
   - Provide branch status and HEAD position info

---

## Enhanced Features

### 🖥️ **IDE Integration**

**Supported IDEs**
- **VS Code**: `code <path>`
- **Cursor**: `cursor <path>`  
- **WebStorm**: `webstorm <path>`
- **Others**: Configurable custom IDE commands

**Open Modes**
```bash
# Default: ask whether to open after creation
/git-worktree add feature-ui
# Output: 🖥️  Open .zcf/feature-ui in IDE? [y/n]:

# Direct open: skip prompt
/git-worktree add feature-ui -o
# Output: 🚀 Opening .zcf/feature-ui in VS Code...
```

**Smart Detection Flow**
1. Check installed IDEs in system
2. Recommend based on project type (e.g., recommend VS Code for Node.js projects)
3. Provide selection menu for user choice (default mode)
4. Remember user preference for next time

### 📦 **Content Migration System**

**Migration Types**
```bash
# Migrate uncommitted content from main branch
/git-worktree migrate feature-ui --from main

# Migrate from other worktree
/git-worktree migrate hotfix --from .zcf/feature-ui

# Migrate current stash
/git-worktree migrate feature-ui --stash

# Migrate specific stash
/git-worktree migrate feature-ui --stash stash@{2}
```

**Migration Flow**
1. **Source check**: Verify source path exists and has uncommitted content
2. **Target check**: Ensure target worktree working directory is clean
3. **Content analysis**: Show files and changes to be migrated
4. **Safe migration**: Use git native commands to ensure data safety
5. **Result confirmation**: Show migration results and follow-up suggestions

---

## Safety Features

- **Path check**: Prevent creating worktree in existing directory
- **Branch conflict check**: Avoid same branch being checked out by multiple worktrees
- **Auto cleanup**: Remove operation cleans both directory and git references
- **Status display**: Clearly show each worktree's branch, commit and status

### **Migration Safety Protection**
- **Conflict detection**: Check for potential file conflicts before migration
- **Backup mechanism**: Auto-create stash backup before migration
- **Rollback support**: Provide rollback solution when migration fails
- **Status validation**: Ensure source and target worktrees are in correct state

### **IDE Integration Safety**
- **Path validation**: Ensure IDE commands use correct paths
- **Permission check**: Verify IDE executable permissions
- **Error handling**: Friendly error messages when IDE startup fails

---

## Examples

### **Basic Usage + IDE Open**
```bash
# Create worktree and ask for IDE open (default behavior)
/git-worktree add feature-ui
# Output:
# ✅ Worktree created at .zcf/feature-ui
# 🖥️  Detected IDEs:
#    1. VS Code (recommended)
#    2. Cursor
# Open this worktree in IDE? [1/2/n]: 1
# 🚀 Opening .zcf/feature-ui in VS Code...

# Create worktree and open IDE directly
/git-worktree add feature-ui -o
# Output:
# ✅ Worktree created at .zcf/feature-ui
# 🚀 Opening .zcf/feature-ui in VS Code...

# Create new branch and open directly
/git-worktree add hotfix -b fix/login --open
# Output:
# ✅ Created branch 'fix/login' and worktree at .zcf/hotfix
# 🚀 Opening .zcf/hotfix in VS Code...
```

### **Content Migration Scenarios**
```bash
# Scenario: developed some features on main branch, want to move to new branch
# 1. Create new feature worktree
/git-worktree add feature-ui -b feature/new-ui

# 2. Migrate uncommitted content from main
/git-worktree migrate feature-ui --from main
# Output:
# 📦 Found uncommitted content:
#    M  src/components/Button.tsx
#    A  src/components/Modal.tsx
#    ??  src/styles/new-theme.css
# 🔄 Migrating to .zcf/feature-ui...
# ✅ Migration completed! Suggest committing these changes in new worktree.

# 3. Ask whether to open IDE (since -o wasn't used during creation)
# 🖥️  Open .zcf/feature-ui in IDE? [y/n]: y
```

### **Stash Migration**
```bash
# Have some stashes, want to apply to specific worktree
/git-worktree migrate hotfix --stash
# Output:
# 📋 Found stashes:
#    stash@{0}: WIP on main: fix user login
#    stash@{1}: WIP on main: update docs
# Select stash to migrate [0/1]: 0
# 🔄 Applying stash@{0} to .zcf/hotfix...
# ✅ Stash content applied successfully!
```

### **List and Manage Worktrees**
```bash
# View all worktrees
/git-worktree list
# Output:
# /path/to/project                    [main]     ← main working tree
# /path/to/project/.zcf/feature-ui    [feature/new-ui]
# /path/to/project/.zcf/hotfix        [fix/login]

# Remove unneeded worktree
/git-worktree remove feature-ui
# Output:
# ✅ Worktree .zcf/feature-ui removed successfully

# Clean invalid references
/git-worktree prune
# Output:
# 🧹 Pruned 0 worktree entries
```

---

## Directory Structure

After using this command, project structure will be:
```
your-project/
├── .git/
├── .zcf/                    # worktree directory (ignored by git)
│   ├── feature-ui/          # feature-ui branch working tree
│   ├── hotfix/              # hotfix branch working tree
│   ├── debug/               # debug working tree
│   └── .worktree-config     # worktree config file
├── src/                     # main working tree source
└── package.json             # main working tree files
```

---

## Configuration

### **IDE Preferences**
Command saves user preferences in `.zcf/.worktree-config`:
```json
{
  "preferredIDE": "code",
  "autoOpenIDE": false,
  "migrateBackup": true,
  "defaultWorktreeDir": ".zcf"
}
```

### **Custom IDE Commands**
```bash
# Set custom IDE
git config worktree.ide.custom "subl %s"  # Sublime Text
git config worktree.ide.preferred "custom"
```

---

## Notes

- **Performance optimization**: Worktrees share `.git` directory, saving disk space
- **IDE support**: Most modern IDEs support multi-worktree projects
- **Cleanup suggestion**: Regularly run `prune` to clean invalid references
- **Branch protection**: Avoid operations on protected branches (like main/master)
- **Migration limitation**: Can only migrate uncommitted changes, use `git cherry-pick` for committed content
- **IDE requirement**: IDE command-line tools must be installed and in PATH
- **Cross-platform support**: IDE detection and startup support Windows, macOS, Linux

---