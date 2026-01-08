# Termux 环境支持实施计划

## 任务背景
用户反馈在 Android Termux 环境下，ZCF 工具无法正确识别 Node.js、npm 和 Claude Code。

## 问题分析
1. Termux 使用特殊的文件系统路径（`/data/data/com.termux/files/usr/`）
2. 当前的 `commandExists` 函数仅使用标准的 `which` 命令
3. 缺少对 Termux 环境的检测和特殊处理

## 解决方案
采用环境检测优先、多路径回退的组合策略。

## 实施步骤

### 1. 增强 platform.ts
- 添加 `isTermux()` 函数检测 Termux 环境
- 添加 `getTermuxPrefix()` 获取 Termux 前缀路径
- 增强 `commandExists()` 支持 Termux 路径

### 2. 优化 installer.ts
- 添加 Termux 特殊安装说明
- 改进错误提示信息

### 3. 更新国际化文本
- 添加 Termux 相关的提示和说明

## 技术要点
- Termux 环境变量：`$PREFIX`、`$TERMUX_VERSION`
- Termux 标准路径：`/data/data/com.termux/files/usr/bin/`
- Node.js 安装命令：`pkg install nodejs` 或 `pkg install nodejs-lts`

## 预期成果
- ZCF 能够在 Termux 环境中正确运行
- 提供友好的 Termux 用户体验
- 保持与其他平台的兼容性