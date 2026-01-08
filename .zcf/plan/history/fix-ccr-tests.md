# Fix CCR Tests Plan

## Context
修复CCR模块所有失败的测试用例

## Current Status
- Total Tests: 133
- Failed: 39
- Passed: 94
- Success Rate: ~71%

## Root Causes
1. Mock implementation issues with `exec` function
2. Async callback handling problems
3. i18n mock return values mismatch
4. Console.log assertion issues with ansis color wrapping

## Execution Steps

### Step 1: Fix installer.test.ts
- Fix exec mock to handle callbacks properly
- Fix promisify mock for execAsync
- Handle async timing issues

### Step 2: Fix installer.edge.test.ts
- Adjust edge case mocks
- Fix exception handling tests

### Step 3: Fix ccr.test.ts
- Correct i18n mock structure
- Fix console.log assertions
- Handle ansis color string matching

### Step 4: Fix ccr.edge.test.ts
- Fix concurrent test logic
- Adjust error handling tests

### Step 5: Verify config and presets tests
- Run and confirm these tests pass
- Fix any discovered issues

### Step 6: Final validation
- Run complete test suite
- Generate coverage report
- Ensure all tests pass

## Expected Outcome
- All 133 tests passing
- Coverage ≥ 90%
- Stable test execution