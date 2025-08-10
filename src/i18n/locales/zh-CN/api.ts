export const api = {
  // Basic API configuration
  configureApi: '选择 API 认证方式',
  useAuthToken: '使用 Auth Token (OAuth 认证)',
  authTokenDesc: '适用于通过 OAuth 或浏览器登录获取的令牌',
  useApiKey: '使用 API Key (密钥认证)',
  apiKeyDesc: '适用于从 Anthropic Console 获取的 API 密钥',
  useCcrProxy: '使用 CCR 代理',
  ccrProxyDesc: '通过 Claude Code Router 使用多个 AI 模型',
  skipApi: '跳过（稍后手动配置）',
  enterApiUrl: '请输入 API URL',
  enterAuthToken: '请输入 Auth Token',
  enterApiKey: '请输入 API Key',
  apiConfigSuccess: 'API 配置完成',
  
  // API modification
  existingApiConfig: '检测到已有 API 配置：',
  apiConfigUrl: 'URL',
  apiConfigKey: 'Key',
  apiConfigAuthType: '认证类型',
  selectApiAction: '请选择API处理操作',
  keepExistingConfig: '保留现有配置',
  modifyAllConfig: '修改全部配置',
  modifyPartialConfig: '修改部分配置',
  selectModifyItems: '请选择要修改的项',
  modifyApiUrl: '修改 API URL',
  modifyApiKey: '修改 API Key',
  modifyAuthType: '修改认证类型',
  continueModification: '是否继续修改其他配置？',
  modificationSaved: '配置已保存',
  enterNewApiUrl: '请输入新的 API URL（当前：{url}）',
  enterNewApiKey: '请输入新的 API Key（当前：{key}）',
  selectNewAuthType: '选择新的认证类型（当前：{type}）',
  
  // API validation
  apiKeyValidation: {
    empty: 'API Key 不能为空',
    example: '示例格式: sk-abcdef123456_789xyz',
  },
  urlRequired: 'URL 为必填项',
  invalidUrl: '无效的 URL',
  keyRequired: '密钥为必填项',
  invalidKeyFormat: '无效的密钥格式',
};