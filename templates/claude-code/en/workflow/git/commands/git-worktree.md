---
description: Manage Git worktrees in project-level ../.zcf/project-name/ directory with smart defaults, IDE integration and content migration
allowed-tools: Read(**), Exec(git worktree add, git worktree list, git worktree remove, git worktree prune, git branch, git checkout, git rev-parse, git stash, git cp, detect-ide, open-ide, which, command, basename, dirname)
argument-hint: <add|list|remove|prune|migrate> [path] [-b <branch>] [-o|--open] [--track] [--guess-remote] [--detach] [--checkout] [--lock] [--migrate-from <source-path>] [--migrate-stash]
# examples:
#   - /git-worktree add feature-ui                     # create new branch 'feature-ui' from main/master
#   - /git-worktree add feature-ui -o                  # create worktree and open directly in IDE
#   - /git-worktree add hotfix -b fix/login -o         # create new branch 'fix/login' with path 'hotfix'
#   - /git-worktree migrate feature-ui --from main     # migrate uncommitted content from main to feature-ui
#   - /git-worktree migrate feature-ui --stash         # migrate current stash to feature-ui
---

# Claude Command: Git Worktree

Manage Git worktrees with smart defaults, IDE integration and content migration in structured `../.zcf/project-name/` paths.

Execute commands directly and provide concise results.

---

## Usage

```bash
# Basic operations
/git-worktree add <path>                           # create new branch named <path> from main/master
/git-worktree add <path> -b <branch>               # create new branch with specified name
/git-worktree add <path> -o                        # create and open directly in IDE
/git-worktree list                                 # show all worktree status
/git-worktree remove <path>                        # remove specified worktree
/git-worktree prune                                # clean invalid worktree references

# Content migration
/git-worktree migrate <target> --from <source>     # migrate uncommitted content
/git-worktree migrate <target> --stash             # migrate stash content
```

### Options

| Option             | Description                                            |
| ------------------ | ------------------------------------------------------ |
| `add [<path>]`     | Add new worktree in `../.zcf/project-name/<path>`      |
| `migrate <target>` | Migrate content to specified worktree                  |
| `list`             | List all worktrees and their status                    |
| `remove <path>`    | Remove worktree at specified path                      |
| `prune`            | Clean invalid worktree references                      |
| `-b <branch>`      | Create new branch and checkout to worktree             |
| `-o, --open`       | Open directly in IDE after creation (skip prompt)      |
| `--from <source>`  | Specify migration source path (migrate only)           |
| `--stash`          | Migrate current stash content (migrate only)           |
| `--track`          | Set new branch to track corresponding remote branch    |
| `--guess-remote`   | Auto guess remote branch for tracking                  |
| `--detach`         | Create detached HEAD worktree                          |
| `--checkout`       | Checkout immediately after creation (default behavior) |
| `--lock`           | Lock worktree after creation                           |

---

## What This Command Does

1. **Environment Check**
   - Verify Git repository using `git rev-parse --is-inside-work-tree`
   - Detect whether in main repo or existing worktree for smart path calculation

2. **Smart Path Management**
   - Auto-calculate project name from main repository path using worktree detection
   - Create worktrees in structured `../.zcf/project-name/<path>` directory
   - Handle both main repo and worktree execution contexts correctly

```bash
# Core path calculation logic for worktree detection
get_main_repo_path() {
  local git_common_dir=$(git rev-parse --git-common-dir 2>/dev/null)
  local current_toplevel=$(git rev-parse --show-toplevel 2>/dev/null)

  # Check if in worktree
  if [[ "$git_common_dir" != "$current_toplevel/.git" ]]; then
    # In worktree, derive main repo path from git-common-dir
    dirname "$git_common_dir"
  else
    # In main repository
    echo "$current_toplevel"
  fi
}

MAIN_REPO_PATH=$(get_main_repo_path)
PROJECT_NAME=$(basename "$MAIN_REPO_PATH")
WORKTREE_BASE="$MAIN_REPO_PATH/../.zcf/$PROJECT_NAME"

# Always use absolute path to prevent nesting issues
ABSOLUTE_WORKTREE_PATH="$WORKTREE_BASE/<path>"
```

**Critical Fix**: Always use absolute paths when creating worktrees from within existing worktrees to prevent path nesting issues like `../.zcf/project/.zcf/project/path`.

3. **Worktree Operations**
   - **add**: Create new worktree with smart branch/path defaults
   - **list**: Display all worktrees with branches and status
   - **remove**: Safely remove worktree and clean references
   - **prune**: Clean orphaned worktree records

4. **Smart Defaults**
   - **Branch creation**: When no `-b` specified, create new branch using path name
   - **Base branch**: New branches created from main/master branch
   - **Path resolution**: Use branch name as path when unspecified
   - **IDE integration**: Auto-detect and prompt for IDE opening

5. **Content Migration**
   - Migrate uncommitted changes between worktrees
   - Apply stash content to target worktree
   - Safety checks to prevent conflicts

6. **Safety Features**
   - **Path conflict prevention**: Check for existing directories before creation
   - **Branch checkout validation**: Ensure branches aren't already in use
   - **Absolute path enforcement**: Prevent nested `.zcf` directories when in worktree
   - **Auto-cleanup on removal**: Clean both directory and git references
   - **Clear status reporting**: Display worktree locations and branch status

7. **Environment File Handling**
   - **Auto-detection**: Scan `.gitignore` for environment variable file patterns
   - **Smart copying**: Copy `.env` and `.env.*` files that are listed in `.gitignore`
   - **Exclusion logic**: Skip `.env.example` and other template files
   - **Permission preservation**: Maintain original file permissions and timestamps
   - **User feedback**: Provide clear status on copied environment files

```bash
# Environment file copying implementation
copy_environment_files() {
    local main_repo="$MAIN_REPO_PATH"
    local target_worktree="$ABSOLUTE_WORKTREE_PATH"
    local gitignore_file="$main_repo/.gitignore"
    
    # Check if .gitignore exists
    if [[ ! -f "$gitignore_file" ]]; then
        return 0
    fi
    
    local copied_count=0
    
    # Detect .env file
    if [[ -f "$main_repo/.env" ]] && grep -q "^\.env$" "$gitignore_file"; then
        cp "$main_repo/.env" "$target_worktree/.env"
        echo "✅ Copied .env"
        ((copied_count++))
    fi
    
    # Detect .env.* pattern files (excluding .env.example)
    for env_file in "$main_repo"/.env.*; do
        if [[ -f "$env_file" ]] && [[ "$(basename "$env_file")" != ".env.example" ]]; then
            local filename=$(basename "$env_file")
            if grep -q "^\.env\.\*$" "$gitignore_file"; then
                cp "$env_file" "$target_worktree/$filename"
                echo "✅ Copied $filename"
                ((copied_count++))
            fi
        fi
    done
    
    if [[ $copied_count -gt 0 ]]; then
        echo "📋 Copied $copied_count environment file(s) from .gitignore"
    fi
}
```

---

## Enhanced Features

### IDE Integration

- **Auto-detection**: VS Code → Cursor → WebStorm → Sublime Text → Vim
- **Smart prompting**: Ask to open in IDE after worktree creation
- **Direct open**: Use `-o` flag to skip prompt and open immediately
- **Custom configuration**: Configurable via git config

### Content Migration System

```bash
# Migrate uncommitted changes
/git-worktree migrate feature-ui --from main
/git-worktree migrate hotfix --from ../other-worktree

# Migrate stash content
/git-worktree migrate feature-ui --stash
```

**Migration Flow**:

1. Verify source has uncommitted content
2. Ensure target worktree is clean
3. Show changes to be migrated
4. Execute safe migration using git commands
5. Confirm results and suggest next steps

---

## Examples

```bash
# Basic usage
/git-worktree add feature-ui                       # create new branch 'feature-ui' from main/master
/git-worktree add feature-ui -b my-feature         # create new branch 'my-feature' with path 'feature-ui'
/git-worktree add feature-ui -o                    # create and open in IDE directly

# Content migration scenarios
/git-worktree add feature-ui -b feature/new-ui     # create new feature worktree
/git-worktree migrate feature-ui --from main       # migrate uncommitted changes
/git-worktree migrate hotfix --stash               # migrate stash content

# Management operations
/git-worktree list                                 # view all worktrees
/git-worktree remove feature-ui                    # remove unneeded worktree
/git-worktree prune                                # clean invalid references
```

**Example Output**:

```
✅ Worktree created at ../.zcf/project-name/feature-ui
✅ Copied .env
✅ Copied .env.local
📋 Copied 2 environment file(s) from .gitignore
🖥️ Open ../.zcf/project-name/feature-ui in IDE? [y/n]: y
🚀 Opening ../.zcf/project-name/feature-ui in VS Code...
```

---

## Directory Structure

```
parent-directory/
├── your-project/            # main project
│   ├── .git/
│   └── src/
└── .zcf/                    # worktree management
    └── your-project/        # project worktrees
        ├── feature-ui/      # feature branch
        ├── hotfix/          # hotfix branch
        └── debug/           # debug worktree
```

---

## Configuration

### IDE Configuration

- Supports VS Code, Cursor, WebStorm, Sublime Text, Vim
- Configurable via git config for custom IDEs
- Auto-detection with priority-based selection

### Custom IDE Setup

```bash
# Configure custom IDE
git config worktree.ide.custom.sublime "subl %s"
git config worktree.ide.preferred "sublime"

# Control auto-detection
git config worktree.ide.autodetect true  # default
```

---

## Notes

- **Performance**: Worktrees share `.git` directory, saving disk space
- **Safety**: Path conflict prevention and branch checkout validation
- **Migration**: Only uncommitted changes; use `git cherry-pick` for commits
- **IDE requirement**: Command-line tools must be in PATH
- **Cross-platform**: Supports Windows, macOS, Linux
- **Environment files**: Automatically copies environment files listed in `.gitignore` to new worktrees
- **File exclusions**: Template files like `.env.example` are preserved in main repo only

---
