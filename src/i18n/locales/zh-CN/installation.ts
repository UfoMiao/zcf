export const installation = {
  installPrompt: '检测到 Claude Code 未安装，是否自动安装？',
  installing: '正在安装 Claude Code...',
  installSuccess: 'Claude Code 安装成功',
  alreadyInstalled: 'Claude Code 已安装',
  installFailed: 'Claude Code 安装失败',
  npmNotFound: 'npm 未安装。请先安装 Node.js 和 npm。',
  
  // Termux specific
  termuxDetected: '检测到 Termux 环境',
  termuxInstallHint: '在 Termux 中，请先运行: pkg install nodejs 或 pkg install nodejs-lts',
  termuxPathInfo: '使用 Termux 路径: {path}',
  termuxEnvironmentInfo: 'Termux 环境通过 pkg 管理器提供 Node.js 和 npm',
  
  // Windows specific  
  windowsDetected: '检测到 Windows 系统，将自动配置兼容格式',
};