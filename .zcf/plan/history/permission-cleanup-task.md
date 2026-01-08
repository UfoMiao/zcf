# Permission Cleanup Task Plan

## Context
ZCF v2.0 之前的版本中，用户配置可能包含无效的权限项 `"mcp__.*"`（已被官方确认无法生效），以及冗余的权限项（如同时存在 `Bash` 和 `Bash(*)`）。需要在配置合并时自动清理这些无效和冗余的权限。

## Implementation Plan

### 1. Create Permission Cleanup Utility
- **File**: `src/utils/permission-cleaner.ts`
- **Functions**:
  - `cleanupPermissions()`: Core cleanup logic
  - `mergeAndCleanPermissions()`: Wrapper for merge operations
- **Cleanup Rules**:
  - Remove literal `"mcp__.*"` (invalid from v2.0 and earlier)
  - Remove permissions that start with template permissions (e.g., remove `Bash(*)` if template has `Bash`)

### 2. Update Config Merge Logic
- **File**: `src/utils/config.ts`
- **Function**: `mergeSettingsFile()`
- **Change**: Replace `mergeArraysUnique()` with `mergeAndCleanPermissions()`

### 3. Update Simple Config Import
- **File**: `src/utils/simple-config.ts`  
- **Function**: `importRecommendedPermissions()`
- **Change**: Apply cleanup when importing permissions

### 4. Test Coverage
- Verify cleanup of `"mcp__.*"` literal
- Verify removal of redundant permissions
- Ensure valid permissions are preserved

## Expected Results
- Automatic cleanup of invalid `"mcp__.*"` permissions during config updates
- Prevention of permission redundancy (e.g., both `Bash` and `Bash(*)`)
- Clean and effective permission lists

## Files Modified
1. `/Users/miaoda/Documents/code/zcf/src/utils/permission-cleaner.ts` (created)
2. `/Users/miaoda/Documents/code/zcf/src/utils/config.ts` (modified)
3. `/Users/miaoda/Documents/code/zcf/src/utils/simple-config.ts` (modified)