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

  // AI memory configuration
  selectMemoryOption: '选择配置选项',
  configureAiLanguage: '配置 AI 输出语言',
  configureAiPersonality: '配置 AI 个性风格',
  aiLanguageConfigured: 'AI 输出语言已配置',

  // AI personality
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
};
