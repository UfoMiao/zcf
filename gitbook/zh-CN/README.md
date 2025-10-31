---
icon: rocket
layout:
  width: default
  title:
    visible: true
  description:
    visible: false
  tableOfContents:
    visible: true
  outline:
    visible: true
  pagination:
    visible: true
  metadata:
    visible: true
---

# ZCF - Zero-Config Code Flow

<div align="center">

**零配置，一键完成 Claude Code 与 Codex 全栈工作环境搭建**

涵盖多语言配置、智能工作流、MCP 服务集成、状态栏与 CLI 命令体系

</div>

## 项目概述

ZCF（Zero-Config Code Flow）是一个面向专业开发者的 CLI 工具，目标是在几分钟内完成 Claude Code 与 Codex 的端到端环境初始化。通过 `npx zcf` 可以一站式完成配置目录创建、API/代理接入、MCP 服务接入、工作流导入、输出风格与记忆配置，以及常用工具安装。

### 为什么选择 ZCF

- **零配置体验**：自动检测操作系统、语言偏好与安装状态，必要时触发增量配置，避免重复劳动。
- **多工具统一**：同时支持 Claude Code 与 Codex，两套环境共享一套 CLI，随时切换目标平台。
- **结构化工作流**：预置六阶段结构化工作流、Feat 规划流、BMad 敏捷流等，内置代理与指令模板。
- **丰富的 MCP 集成**：默认提供 Context7、Open Web Search、Spec Workflow、DeepWiki、Playwright、Serena 等服务。
- **可视化状态与运维**：包含 CCR（Claude Code Router）配置助手以及 CCometixLine 状态栏安装与升级能力。
- **可扩展配置体系**：支持多 API 配置并行、输出风格切换、环境权限导入、模板与语言分离管理。

## 安装后你将获得什么

> 完整内容来自 `zcf-intr.md` 并结合最新特性补充。

1. **安全的隐私与权限配置**：环境变量、权限模板与备份策略自动落地，确保极简但安全的运行环境。
2. **API 与代理管理**：支持官方登录、API Key、CCR 代理三种模式，内置 302.AI、GLM、MiniMax、Kimi 等预设。
3. **全局输出风格与语言体系**：命令行即可设置 AI 输出语言、项目级/全局输出风格与 Codex 记忆指令。
4. **工作流与指令模板集**：自动导入 `/zcf:workflow`、`/zcf:feat`、`/git-commit` 等命令以及对应的代理配置。
5. **MCP 服务基座**：一键启用主流 MCP Server，并根据是否需要 API Key 智能提示环境变量要求。
6. **辅助工具链**：CCometixLine 状态栏自动安装、CCR 管理菜单、Codex CLI 安装/升级、使用数据统计。

## 快速导航

<table data-view="cards"><thead><tr><th></th><th></th><th></th><th data-hidden data-card-target data-type="content-ref"></th></tr></thead><tbody>
<tr><td><strong>快速开始</strong></td><td>安装与首次运行</td><td></td><td><a href="getting-started/README.md">README.md</a></td></tr>
<tr><td><strong>核心特性</strong></td><td>环境、工作流、MCP、Codex</td><td></td><td><a href="features/README.md">README.md</a></td></tr>
<tr><td><strong>CLI 命令</strong></td><td>zcf 指令详解</td><td></td><td><a href="cli/README.md">README.md</a></td></tr>
<tr><td><strong>工作流体系</strong></td><td>六阶段 / Feat / BMad</td><td></td><td><a href="workflows/README.md">README.md</a></td></tr>
<tr><td><strong>最佳实践</strong></td><td>输出风格、Worktree</td><td></td><td><a href="best-practices/README.md">README.md</a></td></tr>
<tr><td><strong>深入开发</strong></td><td>架构、贡献、测试</td><td></td><td><a href="development/README.md">README.md</a></td></tr>
</tbody></table>

## 适用人群

- 需要快速搭建 Claude Code/Codex 开发环境的个人或团队。
- 希望在 IDE 中统一管理 MCP 服务、工作流与命令体系的资深工程师。
- 维护多台设备或多套配置，希望通过备份、模板与多 API 配置减少重复操作的团队。

## 相关链接

- **官方文档站**：<https://zcf.ufomiao.top>
- **中文文档入口**：<https://zcf.ufomiao.top/docs/zh-cn>
- **GitHub**：<https://github.com/ufomiao/zcf>
- **npm**：<https://www.npmjs.com/package/zcf>
- **更新日志**：`CHANGELOG.md`

> 若需英文或日文文档，请在中文文档确认后提交翻译需求。
