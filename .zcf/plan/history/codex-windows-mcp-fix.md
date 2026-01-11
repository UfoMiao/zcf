# 执行计划：为 Codex MCP 安装添加 Windows 修复功能

## 任务背景
ZCF 项目中 Codex 的 MCP 安装功能缺少像 Claude Code 那样的完整 Windows 修复功能，需要补充相应的修复逻辑。

## 问题分析
- Claude Code 使用完整的 `['cmd', '/c', 'npx']` 命令数组处理 Windows 环境
- Codex 仅简单地将 `npx` 改为 `npx.cmd`，不够完善
- 可能导致 Windows 上的命令执行问题

## 执行步骤

### 步骤 1：添加 Codex 平台命令处理函数
- **文件**：`src/utils/code-tools/codex.ts`
- **函数名**：`applyCodexPlatformCommand(config: CodexMcpService): void`
- **逻辑**：
  - 检查 Windows 环境
  - 将 `npx` 命令转换为 `['cmd', '/c', 'npx']` 格式
  - 正确处理参数合并

### 步骤 2：修改 MCP 配置构建逻辑
- **文件**：`src/utils/code-tools/codex.ts`
- **函数**：`configureCodexMcp()`
- **位置**：第 1155-1156 行
- **修改**：移除简单逻辑，调用新的平台命令处理函数

### 步骤 3：更新 Codex 配置渲染逻辑
- **文件**：`src/utils/code-tools/codex.ts`
- **函数**：`renderCodexConfig()`
- **位置**：第 461-462 行
- **修改**：确保命令数组正确渲染为 TOML 格式

### 步骤 4：添加相关测试用例
- **文件**：`tests/unit/utils/code-tools/codex-windows-mcp-config.test.ts`
- **测试**：Windows 环境下的命令转换和配置渲染

### 步骤 5：验证集成测试
- 运行现有测试，确保向后兼容性

## 技术实现要点

### 命令转换逻辑
```typescript
// 当前（不完善）
if (isWindows() && command === 'npx')
  command = 'npx.cmd'

// 新实现（完善）
function applyCodexPlatformCommand(config: CodexMcpService): void {
  if (config.command === 'npx' && isWindows()) {
    const mcpCmd = getMcpCommand() // ['cmd', '/c', 'npx']
    config.command = mcpCmd[0]     // 'cmd'
    config.args = [...mcpCmd.slice(1), ...(config.args || [])]
  }
}
```

## 风险评估
- **低风险**：主要添加新功能，不破坏现有逻辑
- **测试覆盖**：需要充分的单元测试和集成测试
- **向后兼容**：确保非 Windows 环境不受影响

## 执行时间
2025-10-01

## 预期结果
Codex MCP 服务在 Windows 上能够正确执行，与 Claude Code 保持一致的命令处理逻辑。