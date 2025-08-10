export const ccrMessages = {
  // Installation
  installingCcr: '正在安装 Claude Code Router...',
  ccrInstallSuccess: 'Claude Code Router 安装成功',
  ccrInstallFailed: '安装 Claude Code Router 失败',
  ccrAlreadyInstalled: 'Claude Code Router 已安装',
  
  // Configuration
  configureCcr: '配置模型代理 (CCR)',
  useCcrProxy: '使用 CCR 代理',
  ccrProxyDesc: '通过 Claude Code Router 连接多个 AI 模型',
  fetchingPresets: '正在获取提供商预设...',
  noPresetsAvailable: '没有可用的预设',
  selectCcrPreset: '选择一个提供商预设：',
  keyRequired: 'API 密钥不能为空',
  
  // Existing config
  existingCcrConfig: '发现现有的 CCR 配置',
  overwriteCcrConfig: '是否备份现有的 CCR 配置并重新配置？',
  keepingExistingConfig: '保留现有配置',
  backupCcrConfig: '正在备份现有的 CCR 配置...',
  ccrBackupSuccess: 'CCR 配置已备份到：{path}',
  ccrBackupFailed: '备份 CCR 配置失败',
  
  // Model selection
  selectDefaultModelForProvider: '选择 {provider} 的默认模型：',
  enterApiKeyForProvider: '请输入 {provider} 的 API 密钥：',
  
  // Skip option
  skipOption: '跳过，在 CCR 中自行配置',
  skipConfiguring: '跳过预设配置，将创建空配置框架',
  
  // Success/Error messages
  ccrConfigSuccess: 'CCR 配置已保存',
  proxyConfigSuccess: '代理设置已配置',
  ccrConfigFailed: '配置 CCR 失败',
  ccrSetupComplete: 'CCR 设置完成',
  fetchPresetsError: '获取提供商预设失败',
  failedToStartCcrService: '启动 CCR 服务失败',
  errorStartingCcrService: '启动 CCR 服务时出错',
  
  // CCR service status
  restartingCcr: '正在重启 CCR 服务...',
  checkingCcrStatus: '正在检查 CCR 服务状态...',
  ccrRestartSuccess: 'CCR 服务已重启',
  ccrRestartFailed: 'CCR 服务重启失败',
  
  // Configuration tips
  configTips: '配置提示',
  useClaudeCommand: '请使用 claude 命令启动 Claude Code（而非 ccr code）',
  advancedConfigTip: '您可以使用 ccr ui 命令进行更高级的配置',
  manualConfigTip: '手动修改配置文件后，请执行 ccr restart 使配置生效',
};