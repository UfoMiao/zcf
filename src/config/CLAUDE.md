# Configuration Module

**Last Updated**: Mon Oct 27 19:39:26 CST 2025
[Root](../../CLAUDE.md) > [src](../) > **config**

## Module Responsibilities

Configuration definition module providing centralized workflow configurations, system presets, and template mappings for the ZCF project.

## Entry Points and Startup

- **Main Entry Points**:
  - `workflows.ts` - Workflow configuration definitions and metadata

## External Interfaces

### Workflow Configuration Interface

```typescript
// Workflow configuration system
export const WORKFLOW_CONFIGS: WorkflowConfig[]

// Workflow categories
export type WorkflowCategory = 'common' | 'plan' | 'sixStep' | 'bmad' | 'git'

// Workflow configuration interface
export interface WorkflowConfig {
  id: string
  nameKey: string
  descriptionKey?: string
  defaultSelected: boolean
  order: number
  commands: string[]
  agents: WorkflowAgent[]
  autoInstallAgents: boolean
  category: WorkflowCategory
  outputDir: string
}
```

### Configuration Functions

```typescript
// Get workflow configurations by category
export function getWorkflowsByCategory(category: WorkflowCategory): WorkflowConfig[]

// Get workflow by ID
export function getWorkflowById(id: string): WorkflowConfig | undefined

// Get all available workflow IDs
export function getAllWorkflowIds(): string[]
```

## Key Dependencies and Configuration

### Core Dependencies

- **Type System**: Imports from `../types/workflow.ts`
- **I18n Integration**: Workflow names and descriptions use i18n keys
- **Template System**: Maps to corresponding template directories

### Configuration Structure

- **Common Tools**: `init-project`, `init-architect`, `get-current-datetime`
- **Feature Planning**: `feat`, `planner`, `ui-ux-designer`
- **Six-Step Workflow**: Comprehensive development workflow
- **BMad Workflow**: Enterprise-grade business analysis workflow
- **Git Workflow**: Git operations and branch management

## Data Models

### Workflow Categories

```typescript
interface WorkflowCategories {
  common: {
    id: 'commonTools'
    commands: ['init-project']
    agents: ['init-architect', 'get-current-datetime']
  }
  plan: {
    id: 'featPlanUx'
    commands: ['feat']
    agents: ['planner', 'ui-ux-designer']
  }
  sixStep: {
    id: 'sixStepsWorkflow'
    commands: ['workflow']
    agents: []
  }
  bmad: {
    id: 'bmadWorkflow'
    commands: ['bmad-init']
    agents: []
  }
  git: {
    id: 'gitWorkflow'
    commands: ['git-commit', 'git-rollback', 'git-cleanBranches', 'git-worktree']
    agents: []
  }
}
```

## Testing and Quality

### Test Coverage

- Configuration validation tests
- Workflow ID uniqueness tests
- Template mapping verification
- Category structure validation

### Common Issues

- **Missing Templates**: Ensure all configured workflows have corresponding template files
- **Invalid Categories**: Verify category strings match template directory structure
- **I18n Keys**: Ensure all nameKey and descriptionKey values have translations

## Related Files

- `../types/workflow.ts` - Workflow type definitions
- `../utils/workflow-installer.ts` - Workflow installation logic
- `../../templates/` - Template files referenced by configurations
- `../i18n/locales/*/workflow.ts` - Workflow name and description translations

## Change Log (Module-Specific)

### Recent Updates

- Enhanced workflow categorization system
- Added common tools workflow for project initialization
- Expanded git workflow with worktree support
- Improved template mapping consistency
