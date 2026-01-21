# CCR Test Enhancement Plan

## Objective
Ensure all new features in the feat/add-ccr-config branch have unit tests with 90% coverage and all tests pass.

## Context
- Branch: feat/add-ccr-config
- New Features: CCR (Claude Code Router) proxy configuration support
- Current Issues: 7 CCR command tests failing, 2 i18n tests failing
- Goal: 90% test coverage with edge tests

## Execution Plan

### Phase 1: Fix Existing Test Issues
1. Fix execAsync mock in commands.test.ts
2. Fix i18n translation mismatches
3. Fix CCR menu configuration mock

### Phase 2: Enhance Core Module Tests
1. CCR Installer tests (unit + edge)
2. CCR Config tests (unit + edge)
3. CCR Presets tests (unit + edge)

### Phase 3: Command Layer Tests
1. CCR command tests
2. CCU command tests (new)

### Phase 4: Verification
1. Run full test suite
2. Generate coverage report
3. Confirm 90% coverage achieved

## Progress Tracking
- [ ] Phase 1: Fix existing failures
- [ ] Phase 2: Core module tests
- [ ] Phase 3: Command tests
- [ ] Phase 4: Verification