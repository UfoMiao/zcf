export const workflow = {
  selectWorkflowType: 'Select workflow type to install',
  workflowOption: {
    commonTools: 'Common Tools (Hierarchical Directory Initialization + General-purpose agents)',
    featPlanUx: 'Feature Planning and UX Design (feat + planner + ui-ux-designer)',
    sixStepsWorkflow: 'Six Steps Workflow (workflow)',
    bmadWorkflow: 'BMAD-Method Extension Installer (Agile Development Workflow)',
    gitWorkflow: 'Git Commands (commit + rollback + cleanBranches + worktree)',
  },

  workflowDescription: {
    commonTools: 'Provides project initialization and architecture analysis tools, including hierarchical directory initialization commands and intelligent architecture analysis agents',
    featPlanUx: 'Feature planning and user experience design workflow with planning and UX design agents',
    sixStepsWorkflow: 'Professional development assistant structured six-step workflow',
    bmadWorkflow: 'BMAD-Method enterprise-grade agile development workflow extension',
    gitWorkflow: 'Git version control related commands collection',
  },

  // BMAD workflow
  bmadInitPrompt: '✨ Please run /bmad-init command in your project to initialize or update BMAD-Method extension',
  bmadInstallSuccess: 'Successfully installed BMAD-Method installer',

  // General workflow installation
  installingWorkflow: 'Installing workflow',
  installedCommand: 'Installed command',
  installedAgent: 'Installed agent',
  failedToInstallCommand: 'Failed to install command',
  failedToInstallAgent: 'Failed to install agent',
  workflowInstallSuccess: 'workflow installed successfully',
  workflowInstallError: 'workflow installation had errors',
  cleaningOldFiles: 'Cleaning up old version files',
  removedOldFile: 'Removed old file',
}
