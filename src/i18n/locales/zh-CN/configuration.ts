export const configuration = {
  existingConfig: '检测到已有配置文件，如何处理？',
  backupAndOverwrite: '备份并覆盖全部',
  updateDocsOnly: '仅更新工作流相关md并备份旧配置',
  mergeConfig: '合并配置',
  backupSuccess: '已备份所有配置文件到',
  copying: '正在复制配置文件...',
  configSuccess: '配置文件已复制到',
  noExistingConfig: '未找到现有配置。请先运行 `zcf`。',
  updatingPrompts: '正在更新 Claude Code 记忆文档...',

  // Model configuration
  selectDefaultModel: '选择默认模型',
  modelConfigSuccess: '默认模型已配置',
  existingModelConfig: '检测到已有模型配置',
  currentModel: '当前模型',
  modifyModel: '是否修改模型配置？',
  keepModel: '保持当前模型配置',
  defaultModelOption: '默认 - 让 Claude Code 自动选择',
  opusModelOption: 'Opus - 只用opus，token消耗高，慎用',
  opusPlanModelOption: 'OpusPlan - Opus做计划，sonnet编写代码，推荐',
  modelConfigured: '默认模型已配置',

  // AI memory configuration
  selectMemoryOption: '选择配置选项',
  configureAiLanguage: '配置 AI 输出语言',
  configureAiPersonality: '配置 AI 个性风格',
  configureOutputStyle: '配置全局 AI 输出风格',
  aiLanguageConfigured: 'AI 输出语言已配置',
  existingLanguageConfig: '检测到已有 AI 输出语言配置',
  currentLanguage: '当前语言',
  modifyLanguage: '是否修改 AI 输出语言？',
  keepLanguage: '保持当前语言配置',

  // AI personality (deprecated - replaced by output styles)
  selectAiPersonality: '选择 AI 个性风格',
  customPersonalityHint: '定义你自己的个性',
  enterCustomPersonality: '请输入自定义个性描述',
  personalityConfigured: 'AI 个性已配置',
  existingPersonality: '检测到已有 AI 个性配置',
  currentPersonality: '当前个性',
  modifyPersonality: '是否修改 AI 个性配置？',
  keepPersonality: '保持当前个性配置',
  directiveCannotBeEmpty: '指令不能为空',
  languageRequired: '语言为必填项',

  // Output styles
  selectOutputStyles: '选择要安装的输出风格',
  selectDefaultOutputStyle: '选择全局默认输出风格',
  outputStyleInstalled: '输出风格安装成功',
  selectedStyles: '已选择风格',
  defaultStyle: '默认风格',
  selectAtLeastOne: '请至少选择一个输出风格',
  legacyFilesDetected: '检测到旧版个性配置文件',
  cleanupLegacyFiles: '是否清理旧版配置文件？',
  legacyFilesRemoved: '旧版配置文件已清理',

  // Output style names and descriptions
  outputStyles: {
    'engineer-professional': {
      name: '工程师专业版',
      description: '专业的软件工程师，严格遵循SOLID、KISS、DRY、YAGNI原则',
    },
    'nekomata-engineer': {
      name: '猫娘工程师',
      description: '专业的猫娘工程师幽浮喵，结合严谨工程师素养与可爱猫娘特质',
    },
    'laowang-engineer': {
      name: '老王暴躁技术流',
      description: '老王暴躁技术流，绝不容忍代码报错和不规范的代码',
    },
    'default': {
      name: '默认风格',
      description: '完成编码任务时高效且提供简洁响应 (Claude Code自带)',
    },
    'explanatory': {
      name: '解释风格',
      description: '解释其实现选择和代码库模式 (Claude Code自带)',
    },
    'learning': {
      name: '学习风格',
      description: '协作式的边做边学模式，暂停并要求您编写小段代码进行实践练习 (Claude Code自带)',
    },
  },

  // Cache
  confirmClearCache: '确认清除所有 ZCF 偏好缓存？',
  cacheCleared: 'ZCF 缓存已清除',
  noCacheFound: '未找到缓存文件',

  // Environment and permissions
  selectEnvPermissionOption: '请选择配置选项',
  importRecommendedEnv: '导入 ZCF 推荐环境变量',
  importRecommendedEnvDesc: '隐私保护变量等',
  importRecommendedPermissions: '导入 ZCF 推荐权限配置',
  importRecommendedPermissionsDesc: '几乎全部权限，减少频繁请求权限，危险操作由规则限制',
  openSettingsJson: '打开 settings.json 手动配置',
  openSettingsJsonDesc: '高级用户自定义',
  envImportSuccess: '环境变量已导入',
  permissionsImportSuccess: '权限配置已导入',
  openingSettingsJson: '正在打开 settings.json...',

  // Version check related
  claudeCodeVersionCheck: '正在检查 Claude Code 版本...',
  claudeCodeVersionCheckSkipped: '跳过 Claude Code 版本检查（刚安装完成）',
  claudeCodeAutoUpdating: '正在自动更新 Claude Code...',
  claudeCodeVersionCheckFailed: 'Claude Code 版本检查失败',
  claudeCodeVersionCheckSuccess: 'Claude Code 版本检查完成',
  claudeCodeNoUpdateNeeded: 'Claude Code 已是最新版本',

  // JSON config related
  invalidConfiguration: '配置无效',
  failedToParseJson: '解析 JSON 文件失败:',
  failedToBackupConfig: '备份配置失败',
  failedToReadTemplateSettings: '读取模板设置失败',
  failedToMergeSettings: '合并设置失败',
  preservingExistingSettings: '保留现有设置',
  memoryDirNotFound: '未找到记忆目录',
  failedToSetOnboarding: '设置引导标志失败',
  fixWindowsMcp: '修复 Windows MCP 配置？',
}
