# Fix addCompletedOnboarding Operation Position

## Problem
`addCompletedOnboarding()` is only called when creating new API configuration, missing scenarios like:
- User keeps existing API configuration
- User modifies API configuration partially
- User configures through menu
- User uses CCR proxy

## Solution
Ensure `addCompletedOnboarding()` is called in all API configuration success scenarios with idempotent checking.

## Implementation Steps

1. **Add idempotent check in mcp.ts**
   - Check if `hasCompletedOnboarding` is already true
   - Return early if already set

2. **Move call to configureApi in config.ts**
   - Call after successful API configuration
   - Covers all API config paths

3. **Add calls for existing config scenarios**
   - When user keeps existing API config
   - After partial modification
   - After CCR proxy setup

4. **Remove duplicate call from init.ts**
   - Already handled in configureApi

## Files Modified
- src/utils/mcp.ts
- src/utils/config.ts
- src/commands/init.ts
- src/utils/features.ts
- src/utils/config-operations.ts
- src/utils/ccr/config.ts