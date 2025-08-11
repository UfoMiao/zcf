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
  ccrRestartSuccess: 'CCR 服务已重启',
  ccrRestartFailed: 'CCR 服务重启失败',
  
  // Configuration tips
  configTips: '配置提示',
  useClaudeCommand: '请使用 claude 命令启动 Claude Code（而非 ccr code）',
  advancedConfigTip: '您可以使用 ccr ui 命令进行更高级的配置',
  manualConfigTip: '手动修改配置文件后，请执行 ccr restart 使配置生效',
  
  // CCR Menu
  ccrMenuTitle: 'CCR - Claude Code Router 管理',
  ccrMenuOptions: {
    initCcr: '初始化 CCR',
    startUi: '启动 CCR UI',
    checkStatus: '查询 CCR 状态',
    restart: '重启 CCR',
    start: '启动 CCR',
    stop: '停止 CCR',
    back: '返回主菜单',
  },
  ccrMenuDescriptions: {
    initCcr: '安装并配置 CCR',
    startUi: '打开 Web 界面管理 CCR',
    checkStatus: '查看 CCR 服务运行状态',
    restart: '重启 CCR 服务',
    start: '启动 CCR 服务',
    stop: '停止 CCR 服务',
  },
  
  // Command execution messages
  startingCcrUi: '正在启动 CCR UI...',
  ccrUiStarted: 'CCR UI 已启动',
  checkingCcrStatus: '正在查询 CCR 状态...',
  ccrStatusTitle: 'CCR 状态信息：',
  restartingCcr: '正在重启 CCR...',
  ccrRestarted: 'CCR 已重启',
  startingCcr: '正在启动 CCR...',
  ccrStarted: 'CCR 已启动',
  stoppingCcr: '正在停止 CCR...',
  ccrStopped: 'CCR 已停止',
  ccrCommandFailed: '执行 CCR 命令失败',
  
  // Configuration check messages
  ccrNotConfigured: 'CCR 尚未配置。请先初始化 CCR。',
  pleaseInitFirst: '请选择选项 1 来初始化 CCR。',
  
  // UI API Key messages
  ccrUiApiKey: 'CCR UI 登录密钥',
  ccrUiApiKeyHint: '使用此密钥登录 CCR UI 界面',
};