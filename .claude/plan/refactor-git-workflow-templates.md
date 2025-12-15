# Refactor Git Workflow Templates Plan

**Task**: Consolidate git workflow templates from claude-code and codex into a shared location

**Created**: 2025-12-15

---

## Background

Currently, git workflow templates are duplicated across 4 locations:
- `templates/claude-code/en/workflow/git/commands/` (4 files)
- `templates/claude-code/zh-CN/workflow/git/commands/` (4 files)
- `templates/codex/en/workflow/git/prompts/` (4 files)
- `templates/codex/zh-CN/workflow/git/prompts/` (4 files)

**Total: 16 files, but only 8 unique files (4 EN + 4 ZH-CN)**

The content between Claude Code and Codex is **100% identical**, only the directory names differ (`commands/` vs `prompts/`).

---

## Target Structure

```
templates/
├── common/
│   └── workflow/
│       └── git/
│           ├── en/
│           │   ├── git-commit.md
│           │   ├── git-worktree.md
│           │   ├── git-cleanBranches.md
│           │   └── git-rollback.md
│           └── zh-CN/
│               ├── git-commit.md
│               ├── git-worktree.md
│               ├── git-cleanBranches.md
│               └── git-rollback.md
├── claude-code/
│   ├── en/workflow/          # git/ directory removed
│   └── zh-CN/workflow/       # git/ directory removed
└── codex/
    ├── en/workflow/          # git/ directory removed
    └── zh-CN/workflow/       # git/ directory removed
```

---

## Execution Steps

### Step 1: Create shared directory structure
- Create `templates/common/workflow/git/en/`
- Create `templates/common/workflow/git/zh-CN/`

### Step 2: Move English git workflow files
- Move from `templates/claude-code/en/workflow/git/commands/*.md`
- To `templates/common/workflow/git/en/`
- Files: git-commit.md, git-worktree.md, git-cleanBranches.md, git-rollback.md

### Step 3: Move Chinese git workflow files
- Move from `templates/claude-code/zh-CN/workflow/git/commands/*.md`
- To `templates/common/workflow/git/zh-CN/`
- Files: git-commit.md, git-worktree.md, git-cleanBranches.md, git-rollback.md

### Step 4: Delete duplicate files
- Delete `templates/claude-code/en/workflow/git/` directory
- Delete `templates/claude-code/zh-CN/workflow/git/` directory
- Delete `templates/codex/en/workflow/git/` directory
- Delete `templates/codex/zh-CN/workflow/git/` directory

### Step 5: Update workflow-installer.ts
- Modify git workflow installation logic to read from `templates/common/workflow/git/`
- Ensure both Claude Code and Codex can use the shared templates
- Update path resolution for git workflow category

### Step 6: Update documentation
- Update `templates/CLAUDE.md` to reflect new structure
- Update `templates/claude-code/CLAUDE.md` if needed

---

## Files to Modify

1. **New files to create**:
   - `templates/common/workflow/git/en/git-commit.md`
   - `templates/common/workflow/git/en/git-worktree.md`
   - `templates/common/workflow/git/en/git-cleanBranches.md`
   - `templates/common/workflow/git/en/git-rollback.md`
   - `templates/common/workflow/git/zh-CN/git-commit.md`
   - `templates/common/workflow/git/zh-CN/git-worktree.md`
   - `templates/common/workflow/git/zh-CN/git-cleanBranches.md`
   - `templates/common/workflow/git/zh-CN/git-rollback.md`

2. **Files to delete** (12 duplicate files):
   - `templates/claude-code/en/workflow/git/commands/*` (4 files)
   - `templates/claude-code/zh-CN/workflow/git/commands/*` (4 files)
   - `templates/codex/en/workflow/git/prompts/*` (4 files)
   - `templates/codex/zh-CN/workflow/git/prompts/*` (4 files)

3. **Files to modify**:
   - `src/utils/workflow-installer.ts` - Update git workflow path resolution
   - `templates/CLAUDE.md` - Update documentation

---

## Expected Results

- **Before**: 16 files (12 duplicates)
- **After**: 8 files (0 duplicates)
- **Reduction**: 50% fewer files to maintain
- **Benefit**: Single source of truth for git workflows

---

## Rollback Plan

If issues occur, restore from git history:
```bash
git checkout HEAD~1 -- templates/
```
