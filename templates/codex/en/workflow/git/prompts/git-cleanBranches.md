---
description: Safely find and clean up merged or stale Git branches with dry-run mode and custom base/protected branches support
allowed-tools: Read(**), Exec(git fetch, git config, git branch, git remote, git push, git for-each-ref, git log), Write()
argument-hint: [--base <branch>] [--stale <days>] [--remote] [--force] [--dry-run] [--yes]
# examples:
#   - /git-cleanBranches --dry-run
#   - /git-cleanBranches --base release/v2.1 --stale 90
#   - /git-cleanBranches --remote --yes
---

# Claude Command: Clean Branches

This command **safely** identifies and cleans up **merged** or **stale** Git branches.
Runs in **read-only preview (`--dry-run`)** mode by default, requiring explicit instructions to perform deletions.

---

## Usage

```bash
# [Safest] Preview branches to be cleaned without executing any deletions
/git-cleanBranches --dry-run

# Clean local branches merged to main and inactive for over 90 days (requires individual confirmation)
/git-cleanBranches --stale 90

# Clean local and remote branches merged to release/v2.1 (auto-confirm)
/git-cleanBranches --base release/v2.1 --remote --yes

# [Dangerous] Force delete an unmerged local branch
/git-cleanBranches --force outdated-feature
```

### Options

- `--base <branch>`: Specify the base branch for cleanup (defaults to repository's `main`/`master`).
- `--stale <days>`: Clean branches with no commits for specified days (disabled by default).
- `--remote`: Also clean remote merged/stale branches.
- `--dry-run`: **Default behavior**. Only list branches to be deleted without executing any operations.
- `--yes`: Skip individual confirmations and delete all identified branches directly (suitable for CI/CD).
- `--force`: Use `-D` to force delete local branches (even if unmerged).

---

## What This Command Does

1. **Configuration and Safety Checks**
   - **Update Information**: Automatically executes `git fetch --all --prune` to ensure branch status is current.
   - **Read Protected Branches**: Reads the list of branches that should not be cleaned from Git config (see "Configuration" below).
   - **Determine Base**: Uses `--base` parameter or auto-detected `main`/`master` as comparison baseline.

2. **Analysis and Identification (Find)**
   - **Merged Branches**: Find local (and remote if `--remote` is added) branches fully merged to `--base`.
   - **Stale Branches**: If `--stale <days>` is specified, find branches with last commit N days ago.
   - **Exclude Protected Branches**: Remove all configured protected branches from cleanup list.

3. **Report and Preview (Report)**
   - Clearly list "merged branches to be deleted" and "stale branches to be deleted".
   - Without `--yes` parameter, **command ends here**, waiting for user confirmation to re-execute (without `--dry-run`).

4. **Execute Cleanup (Execute)**
   - **Only executed without `--dry-run` and after user confirmation** (or with `--yes`).
   - Delete identified branches one by one, unless user chooses to skip in interactive confirmation.
   - Local: `git branch -d <branch>`; Remote: `git push origin --delete <branch>`.
   - If `--force` is specified, local deletion uses `git branch -D <branch>`.

---

## Configuration (Configure Once, Use Forever)

To prevent accidental deletion of important branches (e.g., `develop`, `release/*`), add protection rules to the repository's Git config. The command reads them automatically.

```bash
# Protect develop branch
git config --add branch.cleanup.protected develop

# Protect all branches starting with release/ (wildcard)
git config --add branch.cleanup.protected 'release/*'

# View all configured protected branches
git config --get-all branch.cleanup.protected
```

---

## Best Practices for Embedded Devs

- **Prioritize `--dry-run`**: Develop the habit of previewing before executing.
- **Leverage `--base`**: When maintaining long-term `release` branches, use it to clean `feature` or `hotfix` branches merged to that release.
- **Careful with `--force`**: Don't force delete unless you're 100% certain an unmerged branch is useless.
- **Team Collaboration**: Notify the team channel before cleaning shared remote branches.
- **Regular Runs**: Run monthly or quarterly to keep the repository clean.

---

## Why This Version Is Better

- ✅ **Safer**: Default read-only preview with configurable protected branch list.
- ✅ **More Flexible**: Supports custom base branches, perfectly fits `release` / `develop` workflows.
- ✅ **More Compatible**: Avoids commands with inconsistent behavior across systems like `date -d`.
- ✅ **More Intuitive**: Condenses complex 16-step checklist into a single command with safety options.
- ✅ **Consistent Style**: Shares similar parameter design and documentation structure with `/commit` command.
