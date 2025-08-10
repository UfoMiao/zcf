export const errors = {
  // General errors
  failedToSetOnboarding: '设置入门完成标志失败：',
  failedToWriteMcpConfig: '写入 MCP 配置失败：',
  templateDirNotFound: '模板目录未找到：',
  failedToReadTemplateSettings: '读取模板 settings.json 失败：',
  failedToMergeSettings: '合并 settings.json 失败：',
  preservingExistingSettings: '由于合并错误，保留现有的 settings.json',
  
  // File system errors
  failedToReadFile: '读取文件失败：',
  failedToWriteFile: '写入文件失败：',
  failedToCopyFile: '复制文件失败：',
  failedToRemoveFile: '删除文件失败：',
  failedToReadDirectory: '读取目录失败：',
  failedToGetStats: '获取文件状态失败：',
  sourceDirNotExist: '源目录不存在：',
  memoryDirNotFound: '记忆目录未找到：',
  
  // JSON config errors
  invalidConfiguration: '配置无效，使用默认值',
  failedToParseJson: '解析 JSON 文件失败：',
  failedToBackupConfig: '备份配置文件失败：',
  invalidEnvConfig: '无效的 env 配置：期望对象',
  invalidApiUrl: '无效的 ANTHROPIC_BASE_URL：期望字符串',
  invalidApiKey: '无效的 ANTHROPIC_API_KEY：期望字符串',
  invalidAuthToken: '无效的 ANTHROPIC_AUTH_TOKEN：期望字符串',
  invalidPermissionsConfig: '无效的权限配置：期望对象',
  invalidPermissionsAllow: '无效的 permissions.allow：期望数组',
  
  // MCP errors
  failedToAddOnboardingFlag: '添加 hasCompletedOnboarding 标志失败：',
  
  // AI personality errors
  failedToApplyPersonality: '应用个性指令失败：',
};