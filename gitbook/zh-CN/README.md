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

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Claude Code][claude-code-src]][claude-code-href]
[![codecov][codecov-src]][codecov-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![Ask DeepWiki][deepwiki-src]][deepwiki-href]

<div data-full-width="true" style="text-align: center;">
  <figure>
    <img src="https://raw.githubusercontent.com/UfoMiao/zcf/main/src/assets/banner.webp" alt="ZCF Banner" style="width: 80%; margin: 0 auto; display: block;"/>
    <figcaption></figcaption>
  </figure>
</div>

<div align="center">
  <h1>
    ZCF - Zero-Config Code Flow
  </h1>

  <p align="center">
    > 零配置，一键完成 Claude Code 与 Codex 全栈工作环境搭建 - 涵盖多语言配置、智能工作流、MCP 服务集成、状态栏与 CLI 命令体系
  </p>
</div>

## ♥️ 赞助商 AI API

  <div data-full-width="true" style="text-align: center;">
    <a href="https://share.302.ai/gAT9VG">
      <figure>
        <img src="https://raw.githubusercontent.com/UfoMiao/zcf/main/src/assets/302.ai.jpg" alt="赞助商 AI API" style="width: 100%; margin: 0 auto; display: block;"/>
        <figcaption></figcaption>
      </figure>
    </a>
  </div>

[302.AI](https://share.302.ai/gAT9VG) 是一个按用量付费的企业级AI资源平台，提供市场上最新、最全面的AI模型和API，以及多种开箱即用的在线AI应用。

## 项目概述

ZCF（Zero-Config Code Flow）是一个面向专业开发者的 CLI 工具，目标是在几分钟内完成 Claude Code 与 Codex 的端到端环境初始化。通过 `npx zcf` 可以一站式完成配置目录创建、API/代理接入、MCP 服务接入、工作流导入、输出风格与记忆配置，以及常用工具安装。

### 为什么选择 ZCF

- **零配置体验**：自动检测操作系统、语言偏好与安装状态，必要时触发增量配置，避免重复劳动。
- **多工具统一**：同时支持 Claude Code 与 Codex，两套环境共享一套 CLI，随时切换目标平台。
- **结构化工作流**：预置六阶段结构化工作流、Feat 规划流、BMad 敏捷流等，内置代理与指令模板。
- **丰富的 MCP 集成**：默认提供 Context7、Open Web Search、Spec Workflow、DeepWiki、Playwright、Serena 等服务。
- **可视化状态与运维**：包含 CCR（Claude Code Router）配置助手以及 CCometixLine 状态栏安装与升级能力。
- **可扩展配置体系**：支持多 API 配置并行、输出风格切换、环境权限导入、模板与语言分离管理。

## 使用 ZCF 你将获得什么

> 完整内容来自 `zcf-intr.md` 并结合最新特性补充。

1. **安全的隐私与权限配置**：环境变量、权限模板与备份策略自动落地，确保极简但安全的运行环境。
2. **API 与代理管理**：支持官方登录、API Key、CCR 代理三种模式，内置 302.AI、GLM、MiniMax、Kimi 等预设。
3. **全局输出风格与语言体系**：命令行即可设置 AI 输出语言、项目级/全局输出风格与 Codex 记忆指令。
4. **工作流与指令模板集**：自动导入 `/zcf:workflow`、`/zcf:feat`、`/git-commit` 等命令以及对应的代理配置。
5. **MCP 服务基座**：一键启用主流 MCP Server，并根据是否需要 API Key 智能提示环境变量要求。
6. **辅助工具链**：CCometixLine 状态栏自动安装、CCR 管理菜单、Codex CLI 安装/升级、使用数据统计。


## 适用人群

- 需要快速搭建 Claude Code/Codex 开发环境的个人或团队。
- 希望在 IDE 中统一管理 MCP 服务、工作流与命令体系的资深工程师。
- 维护多台设备或多套配置，希望通过备份、模板与多 API 配置减少重复操作的团队。

## 相关链接

- **官方文档站**：<https://zcf.ufomiao.top>
- **中文文档入口**：<https://zcf.ufomiao.top/docs/zh-cn>
- **GitHub**：<https://github.com/UfoMiao/zcf>
- **npm**：<https://www.npmjs.com/package/zcf>
- **更新日志**：[CHANGELOG.md](https://github.com/UfoMiao/zcf/blob/main/CHANGELOG.md)

> 若需英文或日文文档，请在中文文档确认后提交翻译需求。

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/zcf?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/zcf
[npm-downloads-src]: https://img.shields.io/npm/dm/zcf?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/zcf
[license-src]: https://img.shields.io/github/license/ufomiao/zcf.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/UfoMiao/zcf/blob/main/LICENSE
[claude-code-src]: https://img.shields.io/badge/Claude-Code-1fa669?style=flat&colorA=080f12&colorB=1fa669
[claude-code-href]: https://claude.ai/code
[codecov-src]: https://codecov.io/gh/UfoMiao/zcf/graph/badge.svg?token=HZI6K4Y7D7&style=flat&colorA=080f12&colorB=1fa669
[codecov-href]: https://codecov.io/gh/UfoMiao/zcf
[jsdocs-src]: https://img.shields.io/badge/jsdocs-reference-1fa669?style=flat&colorA=080f12&colorB=1fa669
[jsdocs-href]: https://www.jsdocs.io/package/zcf
[deepwiki-src]: https://img.shields.io/badge/Ask-DeepWiki-1fa669?style=flat&colorA=080f12&colorB=1fa669
[deepwiki-href]: https://deepwiki.com/UfoMiao/zcf
