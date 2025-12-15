# Refactor sixStep Workflow Templates to Common Directory

**Task**: 重构 templates 中 claude-code 和 codex 的 sixStep 到同一个文件，方便维护

**Created**: 2025-12-15

## Context

- sixStep workflow 模板在 claude-code 和 codex 目录下有重复的文件
- 两个版本内容几乎相同，只有配置目录路径不同（`.claude` vs `.codex`）
- 需要合并到 `templates/common/workflow/sixStep/` 目录，使用变量替换处理差异

## Solution

使用 `$CONFIG_DIR` 变量占位符，安装时由各自的安装器动态替换：
- Claude Code: `$CONFIG_DIR` → `.claude`
- Codex: `$CONFIG_DIR` → `.codex`

## Implementation Plan

### Step 1: Create common/workflow/sixStep template files ✅

**Target structure**:
```
templates/common/workflow/sixStep/
├── en/
│   └── workflow.md
└── zh-CN/
    └── workflow.md
```

**Actions**:
1. Copy Codex version templates (more complete description)
2. Replace `.codex` with `$CONFIG_DIR` variable

### Step 2: Modify workflow-installer.ts (Claude Code) ✅

**File**: `src/utils/workflow-installer.ts`

**Changes**:
1. Add `readFile` and `writeFile` imports
2. Add `COMMON_TEMPLATE_CATEGORIES` constant including `sixStep`
3. Add `processTemplateVariables()` function
4. Modify path logic to use common directory for sixStep
5. Apply variable replacement when copying sixStep files

### Step 3: Modify codex.ts (Codex) ✅

**File**: `src/utils/code-tools/codex.ts`

**Changes**:
1. Add `SIXSTEP_GROUP_SENTINEL` constant
2. Add `processTemplateVariables()` function
3. Modify `getAllWorkflowFiles()` to use common directory
4. Modify `expandSelectedWorkflowPaths()` to handle sixStep sentinel
5. Add `getSixStepPromptFile()` function
6. Apply variable replacement when copying files

### Step 4: Delete duplicate files ✅

**Deleted directories**:
- `templates/claude-code/en/workflow/sixStep/`
- `templates/claude-code/zh-CN/workflow/sixStep/`
- `templates/codex/en/workflow/sixStep/`
- `templates/codex/zh-CN/workflow/sixStep/`

### Step 5: Update documentation ✅

**File**: `templates/CLAUDE.md`

**Changes**:
1. Add sixStep to common/workflow/ structure
2. Remove sixStep from claude-code structure
3. Update Change Log

### Step 6: Run tests ✅

- All 122 test files passed
- 1475 tests total

## Files Modified

- `src/utils/workflow-installer.ts` - Added sixStep common template support
- `src/utils/code-tools/codex.ts` - Added sixStep common template support
- `templates/CLAUDE.md` - Updated documentation

## Files Created

- `templates/common/workflow/sixStep/en/workflow.md`
- `templates/common/workflow/sixStep/zh-CN/workflow.md`

## Files Deleted

- `templates/claude-code/en/workflow/sixStep/commands/workflow.md`
- `templates/claude-code/zh-CN/workflow/sixStep/commands/workflow.md`
- `templates/codex/en/workflow/sixStep/prompts/workflow.md`
- `templates/codex/zh-CN/workflow/sixStep/prompts/workflow.md`

## Result

Successfully consolidated sixStep workflow templates to common directory with `$CONFIG_DIR` variable support, reducing code duplication and improving maintainability.
