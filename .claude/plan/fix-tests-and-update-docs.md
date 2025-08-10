# 修复测试和更新文档计划

## 任务描述
需要修复所有测试报错；以及补全新功能的测试和相关文档更新，如根目录的 README 和 CLAUDE.md 等

## 执行计划

### 阶段 1: 修复阻塞性错误 ✅
1. 删除不存在的测试文件 `tests/config-migrator.test.ts` ✅
2. 修复模板路径问题 - 更新 `src/utils/config.ts` 中的路径 ✅

### 阶段 2: 修复菜单测试 ✅
3. 修复 `menu.test.ts` 的 5 个测试失败 ✅
   - 更新 mock 配置添加 `readZcfConfigAsync`
   - 修复所有测试用例

### 阶段 3: 修复更新命令测试 ✅
4. 修复 `update.test.ts` 的选项处理测试 ✅
   - 更新测试期望以匹配新的工作流选择逻辑

### 阶段 4: 添加新功能测试 🚧
5. 创建 i18n 系统测试 ✅
   - 测试文件: `test/unit/utils/i18n.test.ts`
   - 覆盖: t(), format(), setLanguage(), getLanguage()
   - 20 个测试全部通过

6. 创建 Workflow 系统测试 🔄
   - 测试文件: `test/unit/utils/workflow-installer.test.ts`
   - 测试 WorkflowInstaller 类

7. 创建 Workflow 配置测试
   - 测试文件: `test/unit/config/workflows.test.ts`
   - 测试配置获取和排序逻辑

### 阶段 5: 更新文档
8. 更新 README.md
   - 添加 i18n 功能说明
   - 添加 Workflow 系统介绍

9. 更新 README_zh-CN.md
   - 同步英文内容

10. 更新 CLAUDE.md
    - 添加 i18n 架构说明
    - 添加 Workflow 系统架构
    - 更新测试命令示例

## 执行结果

### 已完成
- ✅ 删除 config-migrator.test.ts
- ✅ 修复 config.ts 路径问题 (从 console.warn 改为 throw Error)
- ✅ 修复 config.test.ts 测试 (更新测试期望)
- ✅ 修复 menu.test.ts (添加 readZcfConfigAsync mock)
- ✅ 修复 update.test.ts (更新工作流选择期望)
- ✅ 创建并通过 i18n.test.ts (20 个测试)

### 进行中
- 🔄 创建 workflow-installer.test.ts
- 🔄 创建 workflows.test.ts

### 待完成
- 📝 更新 README.md
- 📝 更新 README_zh-CN.md
- 📝 更新 CLAUDE.md

## 测试状态
当前所有现有测试已通过：
- Test Files: 29 passed
- Tests: 386 passed (366 原有 + 20 新增 i18n)