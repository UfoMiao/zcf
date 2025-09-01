import type { WorkflowConfig } from '../types/workflow'
import { ensureI18nInitialized, i18n } from '../i18n'

// Pure business configuration without any i18n text
export interface WorkflowConfigBase {
  id: string
  defaultSelected: boolean
  order: number
  commands: string[]
  agents: Array<{ id: string, filename: string, required: boolean }>
  autoInstallAgents: boolean
  category: 'common' | 'plan' | 'sixStep' | 'bmad' | 'git'
  outputDir: string
}

export const WORKFLOW_CONFIG_BASE: WorkflowConfigBase[] = [
  {
    id: 'commonTools',
    defaultSelected: true,
    order: 1,
    commands: ['init-project.md'],
    agents: [
      { id: 'init-architect', filename: 'init-architect.md', required: true },
      { id: 'get-current-datetime', filename: 'get-current-datetime.md', required: true },
    ],
    autoInstallAgents: true,
    category: 'common',
    outputDir: 'common',
  },
  {
    id: 'sixStepsWorkflow',
    defaultSelected: true,
    order: 2,
    commands: ['workflow.md'],
    agents: [],
    autoInstallAgents: false,
    category: 'sixStep',
    outputDir: 'workflow',
  },
  {
    id: 'featPlanUx',
    defaultSelected: true,
    order: 3,
    commands: ['feat.md'],
    agents: [
      { id: 'planner', filename: 'planner.md', required: true },
      { id: 'ui-ux-designer', filename: 'ui-ux-designer.md', required: true },
    ],
    autoInstallAgents: true,
    category: 'plan',
    outputDir: 'feat',
  },
  {
    id: 'gitWorkflow',
    defaultSelected: true,
    order: 4,
    commands: ['git-commit.md', 'git-rollback.md', 'git-cleanBranches.md', 'git-worktree.md'],
    agents: [],
    autoInstallAgents: false,
    category: 'git',
    outputDir: 'git',
  },
  {
    id: 'bmadWorkflow',
    defaultSelected: true,
    order: 5,
    commands: ['bmad-init.md'],
    agents: [],
    autoInstallAgents: false,
    category: 'bmad',
    outputDir: 'bmad',
  },
]

export function getWorkflowConfigs(): WorkflowConfig[] {
  ensureI18nInitialized()

  // Create static workflow option list for i18n-ally compatibility
  const workflowTranslations = [
    {
      id: 'commonTools',
      name: i18n.t('workflow:workflowOption.commonTools'),
      description: i18n.t('workflow:workflowDescription.commonTools'),
    },
    {
      id: 'sixStepsWorkflow',
      name: i18n.t('workflow:workflowOption.sixStepsWorkflow'),
      description: i18n.t('workflow:workflowDescription.sixStepsWorkflow'),
    },
    {
      id: 'featPlanUx',
      name: i18n.t('workflow:workflowOption.featPlanUx'),
      description: i18n.t('workflow:workflowDescription.featPlanUx'),
    },
    {
      id: 'gitWorkflow',
      name: i18n.t('workflow:workflowOption.gitWorkflow'),
      description: i18n.t('workflow:workflowDescription.gitWorkflow'),
    },
    {
      id: 'bmadWorkflow',
      name: i18n.t('workflow:workflowOption.bmadWorkflow'),
      description: i18n.t('workflow:workflowDescription.bmadWorkflow'),
    },
  ]

  // Merge base config with translations
  return WORKFLOW_CONFIG_BASE.map((baseConfig) => {
    const translation = workflowTranslations.find(t => t.id === baseConfig.id)
    return {
      ...baseConfig,
      name: translation?.name || baseConfig.id,
      description: translation?.description,
    }
  })
}

export function getWorkflowConfig(workflowId: string): WorkflowConfig | undefined {
  return getWorkflowConfigs().find(config => config.id === workflowId)
}

export function getOrderedWorkflows(): WorkflowConfig[] {
  return getWorkflowConfigs().sort((a, b) => a.order - b.order)
}

// Note: WORKFLOW_CONFIGS should not be used directly in new code
// Use getWorkflowConfigs() instead for proper i18n initialization
