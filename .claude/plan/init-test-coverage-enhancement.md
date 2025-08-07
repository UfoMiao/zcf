# Init Command Test Coverage Enhancement Plan

## Context
The init command is a core feature of ZCF tool that needs comprehensive test coverage. Current coverage is around 77.99% and needs to reach 90%+.

## Task Description
Enhance test coverage for init command by adding missing test cases for uncovered functionality.

## Implementation Plan

### Phase 1: MCP Service Configuration Tests (Highest Priority) ✅
- [x] MCP configuration basic flow
- [x] MCP configuration skip flow  
- [x] MCP service requiring API key
- [x] MCP configuration cancellation
- [x] MCP configuration error handling

### Phase 2: API Configuration Enhanced Tests ✅
- [x] API partial modification - URL only
- [x] API partial modification - Key only
- [x] New installation API key configuration
- [x] API action cancellation
- [x] Keep existing API config

### Phase 3: Config Merge Functionality Tests ✅
- [x] Merge configuration option

### Phase 4: Platform-specific and Other Features ✅
- [x] Windows platform MCP configuration
- [x] Force override option
- [x] ZCF config save verification
- [x] MCP service API key cancellation
- [x] Onboarding flag error handling

## Test Strategy
- Add tests incrementally to `init.extended.test.ts`
- Reuse existing mock setup
- Focus on behavior verification, not implementation details
- Ensure test isolation

## Results
- ✅ Coverage increased from 77.99% to 99.22%
- ✅ All critical paths tested
- ✅ Improved code reliability
- Added 21 new test cases covering all major functionality paths