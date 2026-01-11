# 任务计划：补全测试和更新文档

## 任务概述
- **任务**：补全 workflow-installer 和 config-operations 的测试，更新 README 和 CLAUDE.md
- **分支**：feat/bmad-workflow
- **目标**：测试覆盖率 90%+，文档适配分支更新

## 执行步骤

### 1. workflow-installer.test.ts 测试补全
- [x] 测试基础架构设置
- [x] getRootDir 函数测试
- [x] selectAndInstallWorkflows 完整测试
- [x] installWorkflowWithDependencies 完整测试  
- [x] cleanupOldVersionFiles 测试

### 2. config-operations.test.ts 测试补全
- [ ] configureApiCompletely 增强测试
- [ ] modifyApiConfigPartially 完整测试
- [ ] updatePromptOnly 增强测试

### 3. 文档更新
- [ ] README.md - 添加 BMad workflow 说明
- [ ] CLAUDE.md - 更新架构和测试说明

## 技术细节
- 测试框架：Vitest
- Mock 策略：文件系统、用户输入、外部命令
- 覆盖目标：90% lines, functions, statements