import type { WorkflowConfig } from '../types/workflow';

export const WORKFLOW_CONFIGS: WorkflowConfig[] = [
  {
    id: 'sixStepsWorkflow',
    nameKey: 'workflowOption.sixStepsWorkflow',
    descriptionKey: 'workflowDescription.sixStepsWorkflow',
    defaultSelected: true,
    order: 1,
    commands: ['workflow.md'],
    agents: [],
    autoInstallAgents: false,
    category: 'sixStep',
    outputDir: 'workflow',
  },
  {
    id: 'featPlanUx',
    nameKey: 'workflowOption.featPlanUx',
    descriptionKey: 'workflowDescription.featPlanUx',
    defaultSelected: true,
    order: 2,
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
    nameKey: 'workflowOption.gitWorkflow',
    descriptionKey: 'workflowDescription.gitWorkflow',
    defaultSelected: true,
    order: 3,
    commands: ['git-commit.md', 'git-rollback.md', 'git-cleanBranches.md', 'git-worktree.md'],
    agents: [],
    autoInstallAgents: false,
    category: 'git',
    outputDir: 'git',
  },
  {
    id: 'bmadWorkflow',
    nameKey: 'workflowOption.bmadWorkflow',
    descriptionKey: 'workflowDescription.bmadWorkflow',
    defaultSelected: true,
    order: 4,
    commands: ['bmad-init.md'],
    agents: [],
    autoInstallAgents: false,
    category: 'bmad',
    outputDir: 'bmad',
  },
];

export function getWorkflowConfig(workflowId: string): WorkflowConfig | undefined {
  return WORKFLOW_CONFIGS.find((config) => config.id === workflowId);
}

export function getOrderedWorkflows(): WorkflowConfig[] {
  return [...WORKFLOW_CONFIGS].sort((a, b) => a.order - b.order);
}
