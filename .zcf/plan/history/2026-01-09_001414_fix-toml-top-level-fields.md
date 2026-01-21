# Fix TOML Top-Level Fields Bug

**Task**: Fix bugs in `updateTopLevelTomlFields()` function identified by Cursor Bugbot in PR #277

**Created**: 2026-01-08

## Context

Cursor Bugbot identified 3 bugs in `src/utils/zcf-config.ts`:

1. **Bug 2 (High)**: `lastUpdated` concatenated on same line as `version` field
2. **Bug 3 (High)**: New `version` field incorrectly inserted inside TOML section
3. **Bug 4 (Medium)**: Regex may corrupt section-level version instead of top-level

## Solution

Use Section-based precise positioning approach:
- Find first `[section]` position to determine top-level boundary
- Only operate on `version` and `lastUpdated` within top-level area
- Properly handle newline characters

## Execution Steps

### Step 1: Refactor `updateTopLevelTomlFields()` function
- File: `src/utils/zcf-config.ts`
- Location: Lines 75-136
- Changes:
  - Find first section boundary
  - Split content into top-level and rest
  - Update/add version only in top-level area
  - Update/add lastUpdated after version
  - Properly handle newlines

### Step 2: Add helper functions
- `insertAtTopLevel()`: Insert content at top-level start (skip comments)
- `insertAfterVersion()`: Insert content after version field

### Step 3: Write/update test cases
- File: `tests/utils/zcf-config.test.ts` or new file
- Test scenarios:
  1. Update existing top-level version and lastUpdated
  2. Add missing top-level version (file starts with section)
  3. Don't modify version under [claudeCode] section
  4. lastUpdated properly on new line
  5. Preserve top-level comments
  6. Handle empty file

### Step 4: Run tests to verify
```bash
pnpm test:run -- zcf-config
```

## Expected Outcome

- All 3 bugs fixed
- No regression in existing functionality
- Test coverage for edge cases
