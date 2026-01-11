# 添加单元测试功能 - 执行计划

## 任务背景
为zcf项目添加完整的单元测试功能，参考taze项目的测试架构，达到90%以上的测试覆盖率。

## 技术选型
- 测试框架：Vitest 3.2.4
- 覆盖率工具：@vitest/coverage-v8
- UI工具：@vitest/ui

## 执行计划

### 阶段1：框架搭建 ✅
- [x] 安装Vitest及相关依赖
- [x] 创建vitest.config.ts配置文件
- [x] 更新package.json测试脚本
- [x] 创建测试目录结构

### 阶段2：工具函数测试
需要创建以下测试文件：
- [ ] test/unit/utils/platform.test.ts - 跨平台路径处理
- [ ] test/unit/utils/installer.test.ts - Claude Code安装检测
- [ ] test/unit/utils/config.test.ts - 配置文件管理
- [ ] test/unit/utils/config-operations.test.ts - 配置操作
- [ ] test/unit/utils/config-validator.test.ts - 配置验证
- [ ] test/unit/utils/mcp.test.ts - MCP配置管理
- [ ] test/unit/utils/ai-personality.test.ts - AI个性化配置
- [ ] test/unit/utils/features.test.ts - 功能模块管理
- [ ] test/unit/utils/zcf-config.test.ts - ZCF配置持久化
- [ ] test/unit/utils/prompts.test.ts - 交互提示工具

### 阶段3：命令测试
- [ ] test/unit/commands/init.test.ts - 初始化流程
- [ ] test/unit/commands/update.test.ts - 更新流程
- [ ] test/unit/commands/menu.test.ts - 菜单系统

### 阶段4：CLI测试
- [ ] test/unit/cli.test.ts - 命令行接口

### 阶段5：集成测试
- [ ] test/integration/workflows.test.ts - 工作流集成测试

### 阶段6：E2E测试
- [ ] test/e2e/cli.test.ts - 端到端CLI测试

## 测试覆盖率目标
- 分支覆盖率：90%+
- 函数覆盖率：90%+
- 行覆盖率：90%+
- 语句覆盖率：90%+

## 测试原则
1. 每个测试独立运行，不依赖其他测试
2. 使用mock模拟文件系统和外部依赖
3. 测试覆盖正常路径和异常路径
4. 为交互式命令模拟用户输入
5. 确保测试的可维护性和可读性