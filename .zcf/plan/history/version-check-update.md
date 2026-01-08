# Version Check and Auto-Update Plan

## Context
用户报告 ccr ui 命令执行失败，经分析发现是本地 ccr 版本过旧（1.0.26）不支持 ui 子命令。需要为 ccr 和 Claude Code 添加版本检查和自动更新功能。

## Solution
实现智能版本管理系统，包括：
- 自动检查工具版本
- 比较本地版本与最新版本
- 提示用户并自动更新
- 缓存版本信息避免频繁查询

## Implementation Steps

### 1. 创建版本检查工具模块
- 文件：`src/utils/version-checker.ts`
- 实现版本获取、比较、缓存功能

### 2. 创建自动更新模块  
- 文件：`src/utils/auto-updater.ts`
- 实现自动更新逻辑，支持用户确认

### 3. 修改 ccr 安装器
- 文件：`src/utils/ccr/installer.ts`
- 集成版本检查和自动更新

### 4. 修改 Claude Code 安装器
- 文件：`src/utils/installer.ts`
- 集成版本检查和自动更新

### 5. 更新 i18n 翻译
- 添加版本检查相关文本

### 6. 添加测试用例
- 测试版本比较和更新流程

## Expected Results
- 工具自动检测版本并提示更新
- 用户可选择自动更新或跳过
- 缓存机制避免频繁版本检查
- 提升用户体验，避免版本兼容问题