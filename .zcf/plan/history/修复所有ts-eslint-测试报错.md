# ZCF 错误修复执行计划

## 任务概述
修复 ZCF 项目中的所有 TypeScript、ESLint 和测试错误

## 错误分析总结

### TypeScript 错误（1个）
- `src/utils/code-tools/codex.ts:702` - Property 'startup_timeout_ms' does not exist on type 'McpServerConfig'

### ESLint 错误
- ✅ 无错误

### 测试错误（39个）
主要问题：
1. MCP 服务配置缺失 Playwright
2. i18n 文件内容不一致
3. uninstaller 边缘测试失败
4. init 命令参数测试失败

## 修复策略
采用分层逐步修复法：类型层 → 配置层 → 测试层

## 执行步骤

### 步骤1：修复 TypeScript 类型定义
- [x] 检查 McpServerConfig 类型定义位置
- [x] 添加 startup_timeout_ms?: number 属性
- [x] 验证类型检查通过

### 步骤2：添加 Playwright MCP 服务配置
- [x] 查看现有 MCP 服务配置结构
- [x] 修复 ID 大小写不匹配问题 (playwright → Playwright)
- [x] 验证 MCP 服务测试通过

### 步骤3：同步 i18n 文件内容
- [x] 检查源文件和构建文件差异
- [x] 重新构建解决文件不一致问题
- [x] 验证 i18n 完整性测试通过

### 步骤4：修复 uninstaller 边缘测试
- [x] 发现缺少 constants 模块 mock
- [x] 添加 ZCF_CONFIG_FILE 等常量的 mock
- [x] 验证边缘测试通过

### 步骤5：修复 init 命令参数测试
- [x] 发现缺少 node:fs 和 constants 模块 mock
- [x] 添加完整的 mock 配置
- [x] 验证所有 init 测试通过 (28/28)

### 最终验证
- [x] pnpm typecheck 通过
- [x] pnpm lint 通过
- [x] 原始目标错误全部修复 (39个 → 0个)

## 预期结果
所有检查命令正常通过，无错误输出