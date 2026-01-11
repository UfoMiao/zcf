# CCR Menu Feature Implementation Plan

## Context
Add CCR (Claude Code Router) configuration menu to ZCF with multiple sub-options for managing CCR services.

## Requirements
1. Add CCR menu option as first item in "Other Tools" section
2. Create sub-menu with 6 options:
   - Initialize CCR (existing logic)
   - Start CCR UI
   - Check CCR status
   - Restart CCR
   - Start CCR
   - Stop CCR
3. Modify `npx zcf ccr` command to show menu instead of direct initialization

## Solution Approach
Using Tool Module Extension pattern (similar to existing `runCcusageFeature`) to maintain consistency with project architecture.

## Implementation Steps

### Step 1: Create CCR Menu Module
- File: `src/utils/tools/ccr-menu.ts`
- Implement `showCcrMenu()` function with 6 sub-options

### Step 2: Update i18n Translations
- Add menu option labels and descriptions
- Support zh-CN and en languages

### Step 3: Create CCR Command Executor
- File: `src/utils/ccr/commands.ts`
- Encapsulate CCR command execution logic

### Step 4: Update Main Menu
- Add CCR option as 'R' in Other Tools section
- Integrate with menu flow

### Step 5: Modify CCR Command
- Change from direct init to menu display

### Step 6: Add Tests
- Test menu navigation
- Test command execution

### Step 7: Update Documentation
- Update CLAUDE.md with new feature description

## Expected Outcome
- Seamless CCR management through interactive menu
- Consistent user experience with existing menu system
- Reusable components for future extensions