# Refactor Output Styles to Common Directory

## Task Summary
Consolidate `claude-code/output-styles` and `codex/system-prompt` templates into `templates/common/output-styles/` to maintain a single source of truth (DRY principle).

## Context
- **Current State**: 16 duplicate files (4 styles × 2 languages × 2 tools)
- **Target State**: 8 files in common directory, shared by both Claude Code and Codex
- **Reference Pattern**: `templates/common/workflow/git/` (already implemented)

## Execution Plan

### Step 1: Create Common Output Styles Directory Structure
**Files to create:**
```
templates/common/output-styles/
├── en/
│   ├── engineer-professional.md
│   ├── laowang-engineer.md
│   ├── nekomata-engineer.md
│   └── ojousama-engineer.md
└── zh-CN/
    ├── engineer-professional.md
    ├── laowang-engineer.md
    ├── nekomata-engineer.md
    └── ojousama-engineer.md
```

**Action**: Move files from `templates/claude-code/{lang}/output-styles/` to `templates/common/output-styles/{lang}/`

### Step 2: Update Claude Code Output Style Reference
**File**: `src/utils/output-style.ts`
**Location**: Line 72
**Change**:
```typescript
// Before:
const templateDir = join(rootDir, 'templates', 'claude-code', lang, 'output-styles')

// After:
const templateDir = join(rootDir, 'templates', 'common', 'output-styles', lang)
```

### Step 3: Update Codex System Prompt Reference
**File**: `src/utils/code-tools/codex.ts`
**Location**: Line 1165 (runCodexSystemPromptSelection function)
**Change**:
```typescript
// Before:
const systemPromptSrc = join(langDir, 'system-prompt')
// Where langDir = join(templateRoot, preferredLang) and templateRoot = join(rootDir, 'templates', 'codex')

// After:
const systemPromptSrc = join(rootDir, 'templates', 'common', 'output-styles', preferredLang)
```

### Step 4: Delete Duplicate Template Files
**Files to delete:**
- `templates/claude-code/en/output-styles/` (entire directory)
- `templates/claude-code/zh-CN/output-styles/` (entire directory)
- `templates/codex/en/system-prompt/` (entire directory)
- `templates/codex/zh-CN/system-prompt/` (entire directory)

### Step 5: Update Documentation
**File**: `templates/CLAUDE.md`
**Changes**:
- Update template structure diagram
- Add `common/output-styles/` documentation
- Remove references to `claude-code/output-styles` and `codex/system-prompt`

### Step 6: Run Tests
**Commands**:
```bash
pnpm test:run
pnpm typecheck
```

## Expected Outcomes
1. Single source of truth for AI personality styles
2. Reduced maintenance overhead (8 files instead of 16)
3. Consistent behavior between Claude Code and Codex
4. All existing tests pass

## Risk Assessment
- **Low Risk**: File structure change only, no logic changes
- **Mitigation**: Git can easily revert if issues arise

## Files Modified Summary
| File | Action |
|------|--------|
| `templates/common/output-styles/en/*.md` | Create (move from claude-code) |
| `templates/common/output-styles/zh-CN/*.md` | Create (move from claude-code) |
| `src/utils/output-style.ts` | Update path reference |
| `src/utils/code-tools/codex.ts` | Update path reference |
| `templates/claude-code/*/output-styles/` | Delete |
| `templates/codex/*/system-prompt/` | Delete |
| `templates/CLAUDE.md` | Update documentation |
