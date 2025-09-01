export type WorkflowType = 'commonTools' | 'sixStepsWorkflow' | 'featPlanUx' | 'bmadWorkflow' | 'gitWorkflow'

export type AgentType
  = | 'init-architect'
    | 'get-current-datetime'
    | 'planner'
    | 'ui-ux-designer'

export interface WorkflowAgent {
  id: string
  filename: string
  required: boolean
}

export interface WorkflowConfig {
  id: string
  name: string
  description?: string
  defaultSelected: boolean
  order: number
  commands: string[]
  agents: WorkflowAgent[]
  autoInstallAgents: boolean
  category: 'common' | 'plan' | 'sixStep' | 'bmad' | 'git'
  outputDir: string
}

export interface WorkflowInstallResult {
  workflow: string
  success: boolean
  installedCommands: string[]
  installedAgents: string[]
  errors?: string[]
}
