# Windows MCP 支持实施计划

## 任务背景

发现 MCP 在 Windows 上的配置与其他平台不同，需要使用 `cmd /c npx` 而不是直接 `npx`。通过分析提供的 Windows 修复脚本，决定实施平台自适应配置生成方案。

## 实施方案

### 方案 1：平台自适应配置生成（已选择）

在现有代码基础上，检测运行平台并生成相应的配置格式。

## 实施步骤

### ✅ 1. 添加平台检测工具函数
- 文件：`src/utils/platform.ts`
- 添加 `isWindows()` 函数
- 添加 `getMcpCommand()` 函数返回平台相应的命令格式

### ✅ 2. 修改 MCP 配置生成逻辑
- 文件：`src/utils/mcp.ts`
- 修改 `buildMcpServerConfig()` 支持 Windows 命令格式
- 添加 `fixWindowsMcpConfig()` 修复现有配置

### ✅ 3. 更新初始化流程
- 文件：`src/commands/init.ts`
- 在生成配置时应用 Windows 修复
- 确保新配置和现有配置都能正确处理

### ⏳ 4. 测试跨平台兼容性
- 在 Windows、macOS、Linux 上测试
- 验证生成的配置文件格式
- 确保 MCP 服务能正常启动

### ⏳ 5. 更新文档
- 添加 Windows 支持说明
- 更新 README 或 CHANGELOG

## 关键实现细节

1. Windows 平台检测：使用 `process.platform === 'win32'`
2. 命令格式：
   - Windows: `["cmd", "/c", "npx", ...args]`
   - 其他平台: `["npx", ...args]`
3. 配置修复：自动检测并修复现有配置中的 Windows 兼容性问题

## 预期结果

- Windows 用户运行 `zcf` 后，生成的 `.claude.json` 将自动使用正确的命令格式
- 现有的错误配置会被自动修复
- 无需用户手动干预，实现零配置体验