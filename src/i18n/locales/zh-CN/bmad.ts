export const bmad = {
  // BMad CLI command
  description: '安装 BMad Method 用于 AI 驱动的开发',
  directoryOption: '安装的目标目录',
  forceOption: '强制重新安装，即使已存在',
  versionOption: '要安装的特定 BMad 版本',
  
  // Installation messages
  checkingExisting: '正在检查现有 BMad 安装...',
  alreadyInstalled: 'BMad 已安装（版本：{version}）',
  existingAction: '选择操作：',
  actionUpdate: '更新到最新版本',
  actionReinstall: '重新安装',
  actionSkip: '跳过安装',
  installationSkipped: '已跳过 BMad 安装',
  installing: '正在安装 BMad Method...',
  installSuccess: '✅ BMad Method 安装成功！',
  installFailed: '❌ BMad Method 安装失败',
  installError: '❌ BMad 安装错误',
  nextSteps: '下一步：进入 {directory} 目录开始使用 BMad',
  
  // BMad workflow messages
  installingBmadWorkflow: '正在安装 BMAD 工作流...',
  bmadWorkflowInstalled: 'BMAD 工作流已安装',
  bmadWorkflowFailed: '安装 BMAD 工作流失败',
  
  // BMad agent messages
  installingAgent: '正在安装 {agent} 代理...',
  agentInstalled: '{agent} 代理已安装',
  agentFailed: '安装 {agent} 代理失败',
  
  // BMad user prompts
  selectBmadOption: '选择 BMAD 选项',
  confirmInstallBmad: '确认安装 BMAD 工作流？',
  bmadInstallComplete: 'BMAD 安装完成',
  
  // BMad log messages
  checkingBmadDependencies: '检查 BMAD 依赖...',
  bmadDependenciesMet: 'BMAD 依赖满足',
  bmadDependenciesMissing: '缺少 BMAD 依赖：{deps}',
  
  // BMad commands
  runningBmadCommand: '执行 BMAD 命令：{command}',
  bmadCommandSuccess: 'BMAD 命令执行成功',
  bmadCommandFailed: 'BMAD 命令执行失败：{error}',
  
  // BMad configuration
  configuringBmad: '配置 BMAD 设置...',
  bmadConfigured: 'BMAD 已配置',
  bmadConfigFailed: 'BMAD 配置失败',
};