---
title: ZCF - Zero-Config Code Flow
---

<p style="margin: 0; line-height: 1.5;">
<a href="https://npmjs.com/package/zcf" target="_blank" rel="noreferrer"><img src="https://img.shields.io/npm/v/zcf?style=flat&colorA=080f12&colorB=1fa669" alt="npm version" style="display: inline-block; margin-right: 8px; vertical-align: middle;"></a>
<a href="https://npmjs.com/package/zcf" target="_blank" rel="noreferrer"><img src="https://img.shields.io/npm/dm/zcf?style=flat&colorA=080f12&colorB=1fa669" alt="npm downloads" style="display: inline-block; margin-right: 8px; vertical-align: middle;"></a>
<a href="https://github.com/UfoMiao/zcf/blob/main/LICENSE" target="_blank" rel="noreferrer"><img src="https://img.shields.io/github/license/ufomiao/zcf.svg?style=flat&colorA=080f12&colorB=1fa669" alt="License" style="display: inline-block; margin-right: 8px; vertical-align: middle;"></a>
<a href="https://claude.ai/code" target="_blank" rel="noreferrer"><img src="https://img.shields.io/badge/Claude-Code-1fa669?style=flat&colorA=080f12&colorB=1fa669" alt="Claude Code" style="display: inline-block; margin-right: 8px; vertical-align: middle;"></a>
<a href="https://codecov.io/gh/UfoMiao/zcf" target="_blank" rel="noreferrer"><img src="https://codecov.io/gh/UfoMiao/zcf/graph/badge.svg?token=HZI6K4Y7D7&style=flat&colorA=080f12&colorB=1fa669" alt="codecov" style="display: inline-block; margin-right: 8px; vertical-align: middle;"></a>
<a href="https://www.jsdocs.io/package/zcf" target="_blank" rel="noreferrer"><img src="https://img.shields.io/badge/jsdocs-reference-1fa669?style=flat&colorA=080f12&colorB=1fa669" alt="JSDocs" style="display: inline-block; margin-right: 8px; vertical-align: middle;"></a>
<a href="https://deepwiki.com/UfoMiao/zcf" target="_blank" rel="noreferrer"><img src="https://img.shields.io/badge/Ask-DeepWiki-1fa669?style=flat&colorA=080f12&colorB=1fa669" alt="Ask DeepWiki" style="display: inline-block; vertical-align: middle;"></a>
</p>

<div align="center">
  <img src="https://raw.githubusercontent.com/UfoMiao/zcf/main/src/assets/banner.webp" alt="Banner"/>

  <h1>
    ZCF - Zero-Config Code Flow
  </h1>

 
> 零配置,一键搞定 Claude Code & Codex 环境设置 - 支持中英文双语配置、智能代理系统和个性化 AI 助手

</div>

## ♥️ 赞助商 AI API

[![赞助商 AI API](https://raw.githubusercontent.com/UfoMiao/zcf/main/src/assets/302.ai.jpg)](https://share.302.ai/gAT9VG)
[302.AI](https://share.302.ai/gAT9VG) 是一个按用量付费的企业级AI资源平台，提供市场上最新、最全面的AI模型和API，以及多种开箱即用的在线AI应用。

---

[![GLM](https://raw.githubusercontent.com/UfoMiao/zcf/main/src/assets/GLM.png)](https://www.bigmodel.cn/claude-code?ic=RRVJPB5SII)
GLM CODING PLAN 是专为AI编码打造的订阅套餐，每月最低仅需20元，即可在十余款主流AI编码工具如Claude Code、Cline, Roo Code等中畅享智谱旗舰模型GLM-4.6，为开发者提供顶尖的编码体验。
智谱AI为本软件提供了特别优惠，使用以下链接购买可以享受九折优惠：https://www.bigmodel.cn/claude-code?ic=RRVJPB5SII

---

<table>
<tbody>
<tr>
<td width="180"><a href="https://www.packyapi.com/register?aff=zcf"><img src="https://raw.githubusercontent.com/UfoMiao/zcf/main/src/assets/packycode.png" alt="PackyCode" width="150"></a></td>
<td>感谢 PackyCode 赞助了本项目！PackyCode 是一家稳定、高效的API中转服务商，提供 Claude Code、Codex、Gemini 等多种中转服务。PackyCode 为本软件的用户提供了特别优惠，使用<a href="https://www.packyapi.com/register?aff=zcf">此链接</a>注册并在充值时填写"zcf"优惠码，可以享受9折优惠。</td>
</tr>
</tbody>
</table>

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

- **GitHub**：<https://github.com/UfoMiao/zcf>
- **npm**：<https://www.npmjs.com/package/zcf>
- **更新日志**：[CHANGELOG.md](https://github.com/UfoMiao/zcf/blob/main/CHANGELOG.md)

## 💬 社区

加入我们的 Telegram 群组，获取支持、参与讨论和接收更新：

[![Telegram](https://img.shields.io/badge/Telegram-加入群组-blue?style=flat&logo=telegram)](https://t.me/ufomiao_zcf)

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
