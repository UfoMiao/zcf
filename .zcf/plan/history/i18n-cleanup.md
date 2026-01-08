# i18n Cleanup Task Plan

## Task Context
Clean up unused i18n keys detected by i18n-ally (146 keys) and fix broken imports after i18n system refactoring.

## Plan Overview
1. Fix broken imports in test files
2. Create analysis script to identify truly unused keys
3. Batch cleanup confirmed unused translation keys
4. Validate results with build and tests

## Execution Details

### Phase 1: Fix Broken Imports
- **File**: `tests/config/mcp-services.test.ts:1`
- **Issue**: Import from deleted `src/i18n/types` 
- **Fix**: Change to import from `src/constants`

### Phase 2: Smart Analysis
- Create temporary analysis script
- Scan all `i18n.t('namespace:key')` calls in source code
- Compare with actual keys in JSON translation files
- Generate precise unused keys list

### Phase 3: Batch Cleanup
- Remove unused keys from both zh-CN and en locale files
- Maintain JSON formatting
- Handle redundant keys like `ccrProxyDesc`

### Phase 4: Validation
- Run typecheck, tests, and linting
- Ensure no regressions

## Expected Results
- Clean translation files with only used keys
- No compilation errors
- All tests passing
- Reduced i18n-ally warnings from 146 to 0 (or minimal)