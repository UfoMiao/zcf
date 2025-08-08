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
    id: 'bmadWorkflow',
    nameKey: 'workflowOption.bmadWorkflow',
    descriptionKey: 'workflowDescription.bmadWorkflow',
    defaultSelected: true,
    order: 3,
    commands: ['bmad.md'],
    agents: [
      { id: 'analyst', filename: 'analyst.md', required: true },
      { id: 'pm', filename: 'pm.md', required: true },
      { id: 'architect', filename: 'architect.md', required: true },
      { id: 'sm', filename: 'sm.md', required: true },
      { id: 'dev', filename: 'dev.md', required: true },
      { id: 'qa', filename: 'qa.md', required: true },
      { id: 'po', filename: 'po.md', required: true },
    ],
    autoInstallAgents: true,
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
