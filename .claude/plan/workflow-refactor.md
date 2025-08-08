# Workflow Refactor Plan

## Context
Refactoring the workflow installation system in the ZCF project to support configurable workflows with automatic dependency management.

## Task Requirements
1. Reorder workflow selection - put Six Steps Workflow first and default select all
2. BMAD workflow should auto-install all agents without user selection
3. feat workflow should auto-install planner and ui-ux-designer agents

## Solution Approach
Implemented a configuration-driven workflow management system for better extensibility.

## Implementation Steps

### 1. Created Workflow Type Definitions
- File: `src/types/workflow.ts`
- Defined WorkflowType, AgentType, WorkflowConfig interfaces
- Created structure for workflow metadata and dependencies

### 2. Established Workflow Configuration Mapping
- File: `src/config/workflows.ts`
- Created WORKFLOW_CONFIGS constant with complete workflow definitions
- Set Six Steps Workflow as first (order: 1) with default selected
- Configured feat workflow with planner and ui-ux-designer dependencies
- Configured BMAD workflow with all 7 agents as dependencies

### 3. Refactored Workflow Selector Logic
- Modified `selectAndInstallWorkflows` function
- Now reads workflow options from configuration
- Displays in configured order with default selections

### 4. Unified Installation Logic
- Created `installWorkflowWithDependencies` function
- Automatically installs dependent agents based on configuration
- Handles both regular and BMAD-specific agent paths

### 5. Simplified BMAD Agents Installation
- Removed user selection prompt
- Auto-installs all BMAD agents when workflow is selected
- Cleaned up unused imports

### 6. Updated Internationalization
- Workflow descriptions already exist in constants.ts
- Support for both zh-CN and en languages

## Benefits of This Approach
1. **Extensibility**: Easy to add new workflows by updating configuration
2. **Maintainability**: Centralized workflow definitions
3. **User Experience**: Simplified selection with automatic dependencies
4. **Code Quality**: Follows KISS and DRY principles

## Testing Checklist
- [ ] Six Steps Workflow appears first in selection
- [ ] All workflows are default selected
- [ ] BMAD workflow installs all 7 agents automatically
- [ ] feat workflow installs planner and ui-ux-designer automatically
- [ ] Installation progress is displayed correctly
- [ ] Error handling works properly

## Next Steps for Future Workflows
To add a new workflow:
1. Add workflow definition to `WORKFLOW_CONFIGS` in `src/config/workflows.ts`
2. Add i18n strings to `src/constants.ts`
3. Place template files in appropriate directories
4. No code changes needed in installation logic