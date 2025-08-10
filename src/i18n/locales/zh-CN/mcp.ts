export const mcp = {
  configureMcp: '是否配置 MCP 服务？',
  selectMcpServices: '选择要安装的 MCP 服务',
  allServices: '全部安装',
  mcpServiceInstalled: '已选择的 MCP 服务',
  enterExaApiKey: '请输入 Exa API Key（可从 https://dashboard.exa.ai/api-keys 获取）',
  skipMcp: '跳过 MCP 配置',
  mcpConfigSuccess: 'MCP 服务已配置',
  mcpBackupSuccess: '已备份原有 MCP 配置',
  fixWindowsMcp: '修复 Windows MCP 配置',
  fixWindowsMcpDesc: '修复 Windows 平台 MCP 命令配置问题',
  windowsMcpFixed: 'Windows MCP 配置已修复',
  configureMcpServices: '配置 MCP 服务',
  selectMcpOption: '选择 MCP 配置选项',
};

export const mcpServices = {
  context7: {
    name: 'Context7 文档查询',
    description: '查询最新的库文档和代码示例',
  },
  'mcp-deepwiki': {
    name: 'DeepWiki',
    description: '查询 GitHub 仓库文档和示例',
  },
  Playwright: {
    name: 'Playwright 浏览器控制',
    description: '直接控制浏览器进行自动化操作',
  },
  exa: {
    name: 'Exa AI 搜索',
    description: '使用 Exa AI 进行网页搜索',
    apiKeyPrompt: '请输入 Exa API Key',
  },
};