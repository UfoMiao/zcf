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
  <img src="https://raw.githubusercontent.com/UfoMiao/zcf/main/assets/banner.webp" alt="Banner"/>

  <h1>
    ZCF - Zero-Config Code Flow
  </h1>

 
> 一份配置，管好你所有的 AI 编程工具。ZCF 安装你选择的工具，并写入每个工具自己的设置。

</div>

## 项目概述

::: warning ZCF v5 尚未发布
这些页面介绍的是 ZCF v5。正式发布前，`npx zcf` 安装的仍是 v3。见[从 v3 迁移](./guide/v3)。
:::

你只需维护一份 ZCF 配置：供应商、MCP 服务和技能。选好你使用的 AI 编程工具，ZCF 会安装缺少的工具，并用各工具自带的命令写入它们自己的设置。

```bash
npx zcf       # 在终端中编辑配置
npx zcf ui    # 或在浏览器中编辑
```

| 工具 | 供应商 | MCP 服务 | 技能 |
|------|:------:|:--------:|:----:|
| Claude Code | ✓ | ✓ | ✓ |
| Codex | ✓ | ✓ | ✓ |
| Antigravity CLI | | ✓ | ✓ |
| OpenCode | ✓ | ✓ | ✓ |
| Cursor CLI | | ✓ | ✓ |
| Pi | ✓ | ✓ | ✓ |
| DeepSeek Harness | ✓ | ✓ | ✓ |

### 为什么选择 ZCF

- **先看再改**：`zcf plan` 列出 ZCF 将运行的每条命令，并以 diff 显示它将修改的每个文件，敏感信息已遮盖。应用之前不会有任何改动。
- **你的文件仍然是你的**：ZCF 只修改它管理的键，保留你的注释和格式，并在第一次修改前备份每个文件。
- **使用工具自带的命令**：`claude mcp add-json`、`codex mcp add`、`npx skills add`、`claude update` 等。ZCF 不是网关，也不是代理。
- **快**：`zcf --version` 在 60 ms 内启动，各工具并行配置。
- **供应商预设**无需发布新版本即可更新，网络慢时还有 [`china` 镜像](./guide/mirrors)。

从[快速开始](./guide/)入手。

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
