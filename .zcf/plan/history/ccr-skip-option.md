# CCR Skip Option Implementation Plan

## Task Context
Add a "Skip, configure in CCR manually" option to provider preset selection, allowing users to configure providers themselves in CCR.

## Requirements
1. Add "Skip" option at the end of provider preset list
2. Create empty configuration (empty Providers array, empty Router object) when skip is selected
3. Still configure proxy environment variables in settings.json
4. Execute `ccr restart` and `ccr status` after configuration
5. Show tips about using `ccr ui` for advanced configuration
6. Clarify that users should use `claude` command, not `ccr code`

## Implementation Steps

### Step 1: Add i18n translations
- Files: `src/i18n/locales/zh-CN/ccr.ts`, `src/i18n/locales/en/ccr.ts`
- Add skip option text and configuration tips

### Step 2: Modify preset selection logic
- File: `src/utils/ccr/config.ts`
- Function: `selectCcrPreset`
- Add skip option to the selection list

### Step 3: Handle skip logic
- File: `src/utils/ccr/config.ts`
- Function: `setupCcrConfiguration`
- Create empty configuration when skip is selected

### Step 4: Implement CCR restart and status check
- File: `src/utils/ccr/config.ts`
- New function: `restartAndCheckCcrStatus`
- Execute restart and show status

### Step 5: Add configuration completion tips
- Show advanced configuration methods
- Clarify command usage

### Step 6: Update tests
- Add test cases for skip option
- Verify empty configuration generation

## Expected Results
- User can select skip option to manually configure providers
- Empty configuration framework is created
- Proxy settings are still configured
- CCR service is restarted and status is shown
- Clear guidance is provided for advanced configuration