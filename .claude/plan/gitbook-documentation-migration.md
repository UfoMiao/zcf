# GitBook 文档迁移执行计划

**任务**: 将 ZCF 项目文档迁移到 GitBook 格式
**创建时间**: 2025-01-XX
**状态**: 进行中

---

## 📋 任务概述

### 目标
1. 重构 GitBook 文档结构，替换当前的模板内容
2. 基于实际代码功能编写文档内容
3. 添加 Codex 专门介绍章节
4. 简化 README 文件，保留品牌元素和文档链接
5. 确保多语言文档的一致性

### 技术上下文
- **项目**: ZCF v3.3.0 - TypeScript CLI 工具
- **技术栈**: TypeScript, i18next, unbuild, Vitest
- **文档工具**: GitBook
- **支持语言**: 中文(zh-CN), 英文(en), 日文(ja-JP)

### 文档结构设计

```
gitbook/
├── zh-CN/                    # 中文文档
│   ├── README.md            # 首页 - 项目简介
│   ├── SUMMARY.md           # 目录结构
│   ├── getting-started/     # 快速开始
│   │   ├── README.md       # 概述
│   │   ├── installation.md # 安装指南
│   │   ├── first-run.md    # 首次运行
│   │   └── quick-start.md  # 快速上手
│   ├── features/            # 功能特性
│   │   ├── README.md       # 功能概览
│   │   ├── claude-code.md  # Claude Code 配置
│   │   ├── codex.md        # Codex 支持 (新增)
│   │   ├── workflows.md    # 工作流系统
│   │   ├── mcp.md          # MCP 服务
│   │   ├── ccr.md          # CCR 代理
│   │   ├── cometix.md      # CCometixLine
│   │   └── multi-config.md # 多配置管理
│   ├── advanced/            # 进阶指南
│   │   ├── README.md       # 进阶概述
│   │   ├── configuration.md # 高级配置
│   │   ├── api-providers.md # API 提供商预设
│   │   ├── templates.md    # 模板系统
│   │   ├── i18n.md         # 国际化
│   │   └── troubleshooting.md # 故障排除
│   ├── cli/                 # CLI 命令
│   │   ├── README.md       # CLI 概述
│   │   ├── init.md         # 初始化命令
│   │   ├── update.md       # 更新命令
│   │   ├── menu.md         # 交互菜单
│   │   ├── ccr.md          # CCR 命令
│   │   ├── uninstall.md    # 卸载命令
│   │   └── config-switch.md # 配置切换
│   ├── workflows/           # 工作流详解
│   │   ├── README.md       # 工作流概述
│   │   ├── zcf-workflow.md # ZCF 工作流
│   │   ├── feat.md         # 功能开发
│   │   ├── bmad.md         # BMad 工作流
│   │   ├── spec.md         # Spec 工作流
│   │   └── git-commands.md # Git 命令
│   ├── best-practices/      # 最佳实践
│   │   ├── README.md       # 实践概述
│   │   ├── tips.md         # 使用技巧
│   │   ├── worktree.md     # Worktree 并行开发
│   │   └── output-styles.md # 输出风格配置
│   └── development/         # 开发文档
│       ├── README.md       # 开发概述
│       ├── contributing.md # 贡献指南
│       ├── architecture.md # 架构说明
│       └── testing.md      # 测试指南
├── en/                      # 英文文档 (结构同中文)
└── ja-JP/                   # 日文文档 (结构同中文)
```

---

## 🎯 阶段 1: 准备工作 - 文件结构创建

### 步骤 1.1: 创建中文文档目录结构
- **状态**: ✅ 已完成
- **文件**: `/Users/miaoda/Documents/code/.zcf/zcf/gitbook/gitbook/zh-CN/`
- **操作**: 创建所有必要的目录和空文件
- **预期结果**: 完整的目录树结构
- **完成时间**: 2025-01-XX

### 步骤 1.2: 创建中文 SUMMARY.md
- **状态**: ✅ 已完成
- **文件**: `/Users/miaoda/Documents/code/.zcf/zcf/gitbook/gitbook/zh-CN/SUMMARY.md`
- **操作**: 编写完整的目录结构
- **预期结果**: 清晰的文档导航结构
- **完成时间**: 2025-01-XX

### 步骤 1.3: 复制结构到英文和日文目录
- **状态**: ✅ 已完成
- **文件**: `en/` 和 `ja-JP/` 目录
- **操作**: 复制相同的目录结构
- **预期结果**: 三个语言版本的目录结构一致
- **完成时间**: 2025-01-XX

---

## 🎯 阶段 2: 中文文档编写

### 2.1 首页和快速开始

#### 步骤 2.1.1: 编写 zh-CN/README.md
- **状态**: ⏳ 待执行
- **内容来源**: CLAUDE.md Project Overview + zcf-intr.md
- **包含**: 项目简介、核心特性、设计理念
- **预期结果**: 吸引人的首页内容

#### 步骤 2.1.2: 编写 getting-started/README.md
- **状态**: ⏳ 待执行
- **内容**: 快速开始概述
- **预期结果**: 清晰的入门指引

#### 步骤 2.1.3: 编写 getting-started/installation.md
- **状态**: ⏳ 待执行
- **内容来源**: 旧版 installation.md + README.md 安装部分
- **包含**: 系统要求、安装方式、特殊环境
- **预期结果**: 完整的安装指南

#### 步骤 2.1.4: 编写 getting-started/first-run.md
- **状态**: ⏳ 待执行
- **内容来源**: zcf-intr.md 安装部分
- **包含**: 首次运行、交互式菜单、非交互模式
- **预期结果**: 首次使用指南

#### 步骤 2.1.5: 编写 getting-started/quick-start.md
- **状态**: ⏳ 待执行
- **内容**: 快速上手示例、常见场景
- **预期结果**: 5分钟快速上手指南

### 2.2 功能特性

#### 步骤 2.2.1: 编写 features/README.md
- **状态**: ⏳ 待执行
- **内容**: 功能概览、特性列表
- **预期结果**: 功能全景图

#### 步骤 2.2.2: 编写 features/claude-code.md
- **状态**: ⏳ 待执行
- **内容来源**: CLAUDE.md + README.md Claude Code 部分
- **包含**: Claude Code 配置、API 设置、模型配置
- **预期结果**: Claude Code 完整配置指南

#### 步骤 2.2.3: 编写 features/codex.md (重点新增)
- **状态**: ⏳ 待执行
- **内容来源**: CLAUDE.md Codex 部分 + src/utils/code-tools/
- **包含**: Codex 简介、配置方法、与 Claude Code 的区别
- **预期结果**: Codex 独立完整介绍

#### 步骤 2.2.4: 编写 features/workflows.md
- **状态**: ⏳ 待执行
- **内容来源**: CLAUDE.md + zcf-intr.md 工作流部分
- **包含**: 工作流系统、配置类型、使用方法
- **预期结果**: 工作流系统完整说明

#### 步骤 2.2.5: 编写 features/mcp.md
- **状态**: ⏳ 待执行
- **内容来源**: CLAUDE.md MCP 部分
- **包含**: MCP 服务配置、可用服务列表
- **预期结果**: MCP 集成指南

#### 步骤 2.2.6: 编写 features/ccr.md
- **状态**: ⏳ 待执行
- **内容来源**: CLAUDE.md CCR 部分
- **包含**: CCR 代理配置、使用方法
- **预期结果**: CCR 完整指南

#### 步骤 2.2.7: 编写 features/cometix.md
- **状态**: ⏳ 待执行
- **内容来源**: CLAUDE.md Cometix 部分
- **包含**: CCometixLine 配置、功能说明
- **预期结果**: Cometix 使用指南

#### 步骤 2.2.8: 编写 features/multi-config.md
- **状态**: ⏳ 待执行
- **内容来源**: CLAUDE.md + README.md 多配置部分
- **包含**: 多配置管理、切换方法
- **预期结果**: 多配置管理指南

### 2.3 进阶指南

#### 步骤 2.3.1: 编写 advanced/README.md
- **状态**: ⏳ 待执行
- **内容**: 进阶概述
- **预期结果**: 进阶学习路径

#### 步骤 2.3.2: 编写 advanced/configuration.md
- **状态**: ⏳ 待执行
- **内容来源**: CLAUDE.md 配置部分
- **包含**: 高级配置选项、配置文件详解
- **预期结果**: 高级配置指南

#### 步骤 2.3.3: 编写 advanced/api-providers.md
- **状态**: ⏳ 待执行
- **内容来源**: README.md API Provider Presets 部分
- **包含**: API 提供商预设、自定义配置
- **预期结果**: API 提供商配置指南

#### 步骤 2.3.4: 编写 advanced/templates.md
- **状态**: ⏳ 待执行
- **内容来源**: CLAUDE.md Templates 部分
- **包含**: 模板系统、自定义模板
- **预期结果**: 模板系统指南

#### 步骤 2.3.5: 编写 advanced/i18n.md
- **状态**: ⏳ 待执行
- **内容来源**: CLAUDE.md i18n 部分
- **包含**: 国际化支持、语言切换
- **预期结果**: 国际化指南

#### 步骤 2.3.6: 编写 advanced/troubleshooting.md
- **状态**: ⏳ 待执行
- **内容来源**: 旧版 troubleshooting.md + 实际问题
- **包含**: 常见问题、解决方案
- **预期结果**: 故障排除指南

### 2.4 CLI 命令

#### 步骤 2.4.1: 编写 cli/README.md
- **状态**: ⏳ 待执行
- **内容**: CLI 概述、命令列表
- **预期结果**: CLI 命令索引

#### 步骤 2.4.2: 编写 cli/init.md
- **状态**: ⏳ 待执行
- **内容来源**: CLAUDE.md CLI Usage 部分
- **包含**: 命令语法、参数说明、使用示例
- **预期结果**: init 命令完整文档

#### 步骤 2.4.3: 编写 cli/update.md
- **状态**: ⏳ 待执行
- **内容来源**: CLAUDE.md CLI Usage 部分
- **包含**: 命令语法、参数说明、使用示例
- **预期结果**: update 命令完整文档

#### 步骤 2.4.4: 编写 cli/menu.md
- **状态**: ⏳ 待执行
- **内容来源**: README.md 交互菜单部分
- **包含**: 菜单选项、使用方法
- **预期结果**: 交互菜单完整文档

#### 步骤 2.4.5: 编写 cli/ccr.md
- **状态**: ⏳ 待执行
- **内容来源**: CLAUDE.md CLI Usage 部分
- **包含**: CCR 命令语法、使用示例
- **预期结果**: CCR 命令完整文档

#### 步骤 2.4.6: 编写 cli/uninstall.md
- **状态**: ⏳ 待执行
- **内容来源**: CLAUDE.md CLI Usage 部分
- **包含**: 卸载命令语法、使用示例
- **预期结果**: uninstall 命令完整文档

#### 步骤 2.4.7: 编写 cli/config-switch.md
- **状态**: ⏳ 待执行
- **内容来源**: CLAUDE.md CLI Usage 部分
- **包含**: 配置切换命令语法、使用示例
- **预期结果**: config-switch 命令完整文档

### 2.5 工作流详解

#### 步骤 2.5.1: 编写 workflows/README.md
- **状态**: ⏳ 待执行
- **内容**: 工作流概述
- **预期结果**: 工作流系统介绍

#### 步骤 2.5.2: 编写 workflows/zcf-workflow.md
- **状态**: ⏳ 待执行
- **内容来源**: zcf-intr.md 工作流部分
- **包含**: ZCF 工作流说明、使用方法
- **预期结果**: ZCF 工作流详细文档

#### 步骤 2.5.3: 编写 workflows/feat.md
- **状态**: ⏳ 待执行
- **内容来源**: zcf-intr.md 工作流部分
- **包含**: feat 工作流说明、使用方法
- **预期结果**: feat 工作流详细文档

#### 步骤 2.5.4: 编写 workflows/bmad.md
- **状态**: ⏳ 待执行
- **内容来源**: zcf-intr.md 工作流部分
- **包含**: BMad 工作流说明、使用方法
- **预期结果**: BMad 工作流详细文档

#### 步骤 2.5.5: 编写 workflows/spec.md
- **状态**: ⏳ 待执行
- **内容来源**: zcf-intr.md 工作流部分
- **包含**: Spec 工作流说明、使用方法
- **预期结果**: Spec 工作流详细文档

#### 步骤 2.5.6: 编写 workflows/git-commands.md
- **状态**: ⏳ 待执行
- **内容来源**: zcf-intr.md Git 操作部分
- **包含**: Git 命令说明、使用方法
- **预期结果**: Git 命令详细文档

### 2.6 最佳实践

#### 步骤 2.6.1: 编写 best-practices/README.md
- **状态**: ⏳ 待执行
- **内容**: 最佳实践概述
- **预期结果**: 实践指南索引

#### 步骤 2.6.2: 编写 best-practices/tips.md
- **状态**: ⏳ 待执行
- **内容来源**: zcf-intr.md 使用技巧部分
- **包含**: 使用技巧、多线并行、回档大法
- **预期结果**: 使用技巧详细文档

#### 步骤 2.6.3: 编写 best-practices/worktree.md
- **状态**: ⏳ 待执行
- **内容来源**: zcf-intr.md worktree 部分
- **包含**: Worktree 使用方法、并行开发
- **预期结果**: Worktree 详细文档

#### 步骤 2.6.4: 编写 best-practices/output-styles.md
- **状态**: ⏳ 待执行
- **内容来源**: zcf-intr.md 输出风格部分
- **包含**: 输出风格配置、切换方法
- **预期结果**: 输出风格详细文档

### 2.7 开发文档

#### 步骤 2.7.1: 编写 development/README.md
- **状态**: ⏳ 待执行
- **内容**: 开发概述
- **预期结果**: 开发者指南索引

#### 步骤 2.7.2: 编写 development/contributing.md
- **状态**: ⏳ 待执行
- **内容来源**: CONTRIBUTING.md
- **包含**: 贡献流程、代码规范
- **预期结果**: 贡献指南

#### 步骤 2.7.3: 编写 development/architecture.md
- **状态**: ⏳ 待执行
- **内容来源**: CLAUDE.md 架构部分
- **包含**: 架构说明、模块结构
- **预期结果**: 架构文档

#### 步骤 2.7.4: 编写 development/testing.md
- **状态**: ⏳ 待执行
- **内容来源**: CLAUDE.md 测试部分
- **包含**: 测试指南、测试策略
- **预期结果**: 测试文档

---

## 🎯 阶段 3: 英文文档编写

### 步骤 3.1: 翻译所有文档
- **状态**: ⏳ 待执行
- **方法**: 基于中文文档逐个翻译
- **注意**: 保持技术术语准确性
- **预期结果**: 完整的英文文档

---

## 🎯 阶段 4: 日文文档编写

### 步骤 4.1: 翻译所有文档
- **状态**: ⏳ 待执行
- **方法**: 基于中文文档逐个翻译
- **注意**: 保持技术术语准确性
- **预期结果**: 完整的日文文档

---

## 🎯 阶段 5: README 简化

### 步骤 5.1: 简化 README.md (英文)
- **状态**: ⏳ 待执行
- **文件**: `/Users/miaoda/Documents/code/zcf/README.md`
- **保留**: Banner、徽章、赞助商、Star 图
- **添加**: 文档链接 (https://zcf.ufomiao.com)
- **添加**: 项目简述
- **添加**: "安装后获得什么" 章节
- **移除**: 详细功能介绍、命令说明
- **预期结果**: 简洁的 README

### 步骤 5.2: 简化 README_zh-CN.md (中文)
- **状态**: ⏳ 待执行
- **文件**: `/Users/miaoda/Documents/code/zcf/README_zh-CN.md`
- **操作**: 同步骤 5.1
- **文档链接**: https://zcf.ufomiao.com/docs/zh-cn
- **预期结果**: 简洁的中文 README

### 步骤 5.3: 简化 README_ja-JP.md (日文)
- **状态**: ⏳ 待执行
- **文件**: `/Users/miaoda/Documents/code/zcf/README_ja-JP.md`
- **操作**: 同步骤 5.1
- **文档链接**: https://zcf.ufomiao.com/docs/ja-jp
- **预期结果**: 简洁的日文 README

---

## 🎯 阶段 6: 验证和优化

### 步骤 6.1: 验证文档完整性
- **状态**: ⏳ 待执行
- **检查**: 所有链接有效、目录结构正确
- **预期结果**: 无死链、结构完整

### 步骤 6.2: 验证内容准确性
- **状态**: ⏳ 待执行
- **检查**: 内容与实际代码功能一致
- **预期结果**: 内容准确无误

### 步骤 6.3: 验证多语言一致性
- **状态**: ⏳ 待执行
- **检查**: 三个语言版本内容对应
- **预期结果**: 多语言内容一致

---

## 📊 执行统计

- **总步骤数**: 60+
- **已完成**: 0
- **进行中**: 0
- **待执行**: 60+
- **预计时间**: 3-4 小时

---

## 📝 更新日志

### 2025-01-XX
- ✅ 创建执行计划文档
- ⏳ 开始执行阶段 1
