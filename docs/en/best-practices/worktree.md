---
title: Worktree Parallel Development
---

# Worktree Parallel Development

Git Worktree is a powerful Git feature that allows you to create multiple work areas (copies) in the same repository, each work area can switch to different branches without interference, sharing the same Git history. ZCF's `/git-worktree` smart command makes Worktree management simple and intuitive.

## What is Worktree

Worktree can conveniently create a work area (copy) of a project and switch to different branches. Two work areas do not interfere with each other and use the same Git history.

### Worktree Advantages

1. **Parallel Development**: Can work on different tasks simultaneously in multiple work areas
2. **Context Isolation**: Each work area has independent file system without mutual interference
3. **Quick Switching**: No need to frequently switch branches, directly work in different work areas
4. **IDE Integration**: Each work area can be opened in different IDE windows

### Suitable Scenarios

- **Multi-Task Parallel**: Simultaneously develop multiple features or fix multiple bugs
- **A/B Testing**: Compare effects of different implementation solutions
- **Code Review**: Review code in independent work area without affecting main branch
- **Experimental Development**: Safely make experimental changes

## Basic Commands

ZCF's `/git-worktree` command provides complete Worktree management functionality:

### Create Worktree

```text
# Basic creation: Create new branch named <path> from main/master
/git-worktree add <path>

# Create branch with specified name
/git-worktree add <path> -b <branch>

# Create and directly open with IDE (recommended)
/git-worktree add <path> -o
```

**Examples**:
```
/git-worktree add feat/add-i18n -o
/git-worktree add bugfix/login-error -b fix/login
```

### View and Manage

```text
# Display all worktree status
/git-worktree list

# Delete specified worktree
/git-worktree remove <path>

# Clean invalid worktree records
/git-worktree prune
```

**Examples**:
```
/git-worktree list
/git-worktree remove feat/test
```

### Content Migration

```text
# Migrate uncommitted content
/git-worktree migrate <target> --from <source>

# Migrate stash content
/git-worktree migrate <target> --stash
```

**Examples**:
```
/git-worktree migrate feat/new-feature --from feat/old-feature
/git-worktree migrate main --stash
```

## Usage Tips

### Natural Language Execution

ZCF's `/git-worktree` command supports natural language, no need to remember command details:

✅ **Recommended to use natural language**:
```
/git-worktree test and open
/git-worktree add feat/add-i18n, delete test branch and worktree
/git-worktree migrate staging area content from test2 to current branch
```

❌ **No need to do this**:
```bash
git worktree add ../.zcf/project-name/feat/test -b feat/test
```

### Work Area Location

ZCF's Worktree is created by default in the project-level `../.zcf/project-name/` directory to avoid confusion:

```
Project Directory/
├── src/
└── ...

.zcf/
└── project-name/
    ├── feat/add-i18n/
    ├── bugfix/login-error/
    └── ...
```

**Advantages**:
- Not created inside project directory, keeps project clean
- Unified naming convention, easy to manage
- Supports IDE auto-open

## Integration with ZCF Workflows

### Multi-Line Parallel + SL Rollback Method

As we all know, current AI-generated code has certain randomness. The same prompt may generate code with different quality. How to get higher quality code?

**Solution: Multi-Line Parallel + SL Rollback Method**

#### Multi-Line Parallel

Use `/git-worktree` to create multiple work areas, then start Claude Code separately, simultaneously execute same or different workflow commands to complete the same task; finally compare results and choose the best one.

**Steps**:
1. Create multiple Worktrees
   ```
   /git-worktree add solution1 -o
   /git-worktree add solution2 -o
   /git-worktree add solution3 -o
   ```

2. Run workflows in each Worktree
   - In solution1: `/zcf:workflow Develop xxx feature`
   - In solution2: `/zcf:workflow Develop xxx feature, require high performance`
   - In solution3: `/zcf:workflow Develop xxx feature, require concise code`

3. Compare results, choose best solution

#### SL Rollback Method

If generated results deviate too much, it's not recommended to continue letting AI modify on top of it. You can:

1. **Analyze missing or off-track content**
2. **Directly rollback to initial state**
3. **Add new constraints and context to initial prompt**
   - Prompts can be documents and images
   - Can reference implementations from other work areas

**Example Flow**:
```
# Work area 1 implementation has issues
/git-worktree remove solution1

# Create new work area, improve prompt
/git-worktree add solution1-v2 -o

# In new work area, reference work area 2 experience
/zcf:workflow Develop xxx feature, reference solution2 implementation, but avoid xxx problem
```

### Combine with ZCF Workflows

Run workflows independently in each Worktree:

1. **Research Phase**: Try different research methods in different Worktrees
2. **Implementation Phase**: Compare code quality of different implementation solutions
3. **Optimization Phase**: Select best solution for optimization

```text
# Worktree 1: Basic implementation
/zcf:workflow Implement user login functionality

# Worktree 2: Optimized implementation
/zcf:workflow Implement user login functionality, use JWT, support refresh token

# Worktree 3: Test implementation
/zcf:workflow Implement user login functionality, focus on security
```

## Best Practices

### 1. Naming Conventions

Use clear naming for easy identification:

✅ **Recommended**:
- `feat/add-i18n`
- `bugfix/login-error`
- `refactor/api-structure`

❌ **Not Recommended**:
- `test`, `test2`, `test3`
- `work`, `work2`
- Meaningless random names

### 2. Timely Cleanup

Delete unneeded Worktrees promptly after completing features:

```text
# Delete Worktree after feature merge
/git-worktree remove feat/add-i18n
```

### 3. Regular Cleanup of Invalid Records

```text
# Clean Worktrees that are deleted but records still exist
/git-worktree prune
```

### 4. Combine with Configuration Switching

Use different API configurations in different Worktrees:

```bash
# Main branch uses GLM provider configuration
npx zcf config-switch glm-provider

# Worktree uses 302.AI provider configuration
cd ../.zcf/project-name/feat/test
npx zcf config-switch 302ai-provider
```

### 5. Project Progress Documents

Have AI output task progress documents in each Worktree for easy continuation in new conversations:

```text
# Continue task in new Worktree
/zcf:workflow Continue developing xxx feature, reference previous progress document: progress.md
```

## Workflow Recommendations

### Standard Development Flow

1. **Create Worktree**
   ```text
   /git-worktree add feat/feature-name -o
   ```

2. **Run Workflow**
   ```text
   /zcf:workflow Develop xxx feature
   ```

3. **Test and Optimize**
   - Test in Worktree
   - If needed, create new Worktree to try different solutions

4. **Merge Code**
   ```bash
   # Commit in Worktree
   cd ../.zcf/project-name/feat/feature-name
   git add .
   git commit -m "feat: add feature"

   # Return to main branch and merge
   cd ../../project-name
   git merge feat/feature-name
   ```

5. **Clean Worktree**
   ```text
   /git-worktree remove feat/feature-name
   ```

### Comparison Selection Flow

1. Create multiple Worktrees to try different solutions
2. Run workflows in each Worktree
3. Compare results and select best solution
4. Merge code from best solution
5. Delete other Worktrees

## VS Code Extension Recommendation

Recommend a useful Worktree VS Code extension:

**Git Worktree Manager** - [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=felipecaputo.git-worktree-manager)

Features:
- Graphical Worktree management
- Quick creation and switching
- View Worktree status

## Notes

1. **Don't manually delete Worktree directories**: Should use `/git-worktree remove` command
2. **Watch for path conflicts**: Ensure Worktree paths don't conflict with other directories
3. **Regular cleanup**: Delete unneeded Worktrees to free space
4. **Backup important changes**: Ensure important changes are committed or backed up before deleting Worktree

## Related Documentation

- [Git Smart Commands](../workflows/git-commands.md) - Other Git operation commands
- [ZCF Six-Stage Workflow](../workflows/zcf-workflow.md) - Use with workflows
- [Config Switch](../cli/config-switch.md) - Use different configurations in different Worktrees


