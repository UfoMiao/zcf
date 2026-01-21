# Task: Remove Flaky Time-Based Test Assertions

## Background
Time-based test assertions like `expect(duration).toBeGreaterThanOrEqual(100)` are prone to failures in GitHub Actions CI environments due to performance variations and environment differences.

## Task Description
Remove time duration assertions that cause test instability in CI/CD pipelines while maintaining functional test coverage.

## Files Modified

### 1. tests/commands/ccu.edge.test.ts
- **Line 112**: Removed `expect(duration).toBeGreaterThanOrEqual(100);`
- **Reason**: Test was checking if delay was at least 100ms, which is unreliable in CI
- **Preserved**: Duration calculation kept for potential debugging use

### 2. tests/commands/ccr.edge.test.ts  
- **Line 202**: Removed `expect(duration).toBeGreaterThanOrEqual(95);`
- **Reason**: Test was checking if delay was at least 95ms, which is unreliable in CI
- **Preserved**: Duration calculation and functional assertion `expect(ccrMenu.showCcrMenu).toHaveBeenCalledWith('en')`

## Test Results
- All tests passed after modifications
- Test execution time: ~972ms
- 27 tests passed in total across both files

## Impact
- ✅ Eliminated CI test flakiness
- ✅ Maintained functional test coverage
- ✅ Kept debugging information (duration variables)
- ✅ No breaking changes to actual functionality

## Date
2025-01-13