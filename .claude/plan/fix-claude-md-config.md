# 修复 CLAUDE.md 配置问题执行计划

## 问题概述
1. CLAUDE.md 使用 @include 语法但处理后没有正确更新内容
2. AI 输出语言配置应该单独放在一个 MD 文件中
3. init 流程中没有正确触发 AI 角色配置

## 解决方案
采用方案 1：保持 @include 语法，增强处理逻辑

## 执行步骤

### 1. 修复 @include 处理逻辑
- 文件: `src/utils/config.ts`
- 函数: `processClaudeMdWithIncludes`
- 确保递归处理所有 @include 引用

### 2. 创建独立的语言配置
- 新增: `language.md` 文件
- 修改: `applyAiLanguageDirective` 函数
- 更新 CLAUDE.md 模板添加 @language.md

### 3. 修复 AI 角色配置触发
- 文件: `src/commands/init.ts`
- 确保在主流程中调用 `configureAiPersonality`

### 4. 更新模板结构
- 更新 CLAUDE.md 添加 @language.md 引用
- 确保 role.md 正确生成

## 预期结果
- CLAUDE.md 正确包含所有内容
- 语言配置独立管理
- AI 角色配置正常工作