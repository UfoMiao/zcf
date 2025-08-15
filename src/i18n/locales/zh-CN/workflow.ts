export const workflow = {
  selectWorkflowType: '选择要安装的工作流类型',
  workflowOption: {
    featPlanUx: '功能规划和 UX 设计 (feat + planner + ui-ux-designer)',
    sixStepsWorkflow: '六步工作流 (workflow)',
    bmadWorkflow: 'BMAD-Method 扩展安装器 (支持敏捷开发工作流)',
    gitWorkflow: 'Git 指令 (commit + rollback + cleanBranches + worktree)',
  },

  // BMAD workflow
  bmadInitPrompt: '✨ 请在项目中运行 /bmad-init 命令来初始化或更新 BMAD-Method 扩展',
  bmadInstallSuccess: '成功安装 BMAD-Method 安装器',

  // General workflow installation
  installingWorkflow: '正在安装工作流',
  installedCommand: '已安装命令',
  installedAgent: '已安装代理',
  failedToInstallCommand: '安装命令失败',
  failedToInstallAgent: '安装代理失败',
  workflowInstallSuccess: '工作流安装成功',
  workflowInstallError: '工作流安装出错',
  cleaningOldFiles: '清理旧版本文件',
  removedOldFile: '已删除旧文件',
};
