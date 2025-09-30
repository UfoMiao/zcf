# ZCF项目概览

## 项目基本信息
- **项目名称**: ZCF (Zero-Config Code Flow)
- **版本**: 3.0.2
- **描述**: 一键配置Claude Code环境的CLI工具
- **技术栈**: TypeScript, Node.js, ESM, unbuild, Vitest
- **包管理器**: pnpm
- **代码规范**: @antfu/eslint-config

## 核心架构
- **模块化设计**: commands, utils, i18n, types, config, templates, tests
- **国际化支持**: 基于i18next的中英文双语支持
- **跨平台兼容**: Windows/macOS/Linux/Termux
- **测试覆盖**: 80%以上覆盖率要求

## 主要功能
- Claude Code环境初始化和配置
- MCP服务管理
- 工作流模板安装
- CCR代理集成
- Cometix状态栏工具
- CCusage使用分析

## 开发命令
- `pnpm dev` - 开发模式运行
- `pnpm build` - 构建生产版本
- `pnpm typecheck` - 类型检查
- `pnpm lint` - 代码检查
- `pnpm test` - 运行测试
- `pnpm test:coverage` - 生成覆盖率报告

## 当前任务
重构Claude Code初始化和API配置菜单逻辑，改为类似Codex的API配置模式：
1. 使用官方登录（不配置 API）
2. 自定义 API 配置
3. 使用CCR代理
4. 跳过

当前状态：初始化部分已改好，需要修复配置API或CCR代理里的旧逻辑。