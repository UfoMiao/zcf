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

 
> Zero configuration, one-click setup for Claude Code & Codex environment - supports bilingual configuration (Chinese/English), intelligent proxy system, and personalized AI assistant

</div>

## ♥️ Sponsor AI API

[![Sponsor AI API](https://raw.githubusercontent.com/UfoMiao/zcf/main/src/assets/302.ai.jpg)](https://share.302.ai/gAT9VG)
[302.AI](https://share.302.ai/gAT9VG) is a usage-based enterprise AI resource platform providing the latest and most comprehensive AI models and APIs in the market, along with various ready-to-use online AI applications.

---

[![GLM](https://raw.githubusercontent.com/UfoMiao/zcf/main/src/assets/GLM-en.png)](https://z.ai/subscribe?ic=8JVLJQFSKB)
This project is sponsored by Z.ai, supporting us with their GLM CODING PLAN.
GLM CODING PLAN is a subscription service designed for AI coding, starting at just $3/month. It provides access to their flagship GLM-4.6 model across 10+ popular AI coding tools (Claude Code, Cline, Roo Code, etc.), offering developers top-tier, fast, and stable coding experiences.
Get 10% OFF GLM CODING PLAN：https://z.ai/subscribe?ic=8JVLJQFSKB

---

<table>
<tbody>
<tr>
<td width="180"><a href="https://www.packyapi.com/register?aff=zcf"><img src="https://raw.githubusercontent.com/UfoMiao/zcf/main/src/assets/packycode.png" alt="PackyCode" width="150"></a></td>
<td>Thanks to PackyCode for sponsoring this project! PackyCode is a reliable and efficient API relay service provider, offering relay services for Claude Code, Codex, Gemini, and more. PackyCode provides special discounts for our software users: register using <a href="https://www.packyapi.com/register?aff=zcf">this link</a> and enter the "zcf" promo code during recharge to get 10% off.</td>
</tr>
</tbody>
</table>

## Project Overview

ZCF (Zero-Config Code Flow) is a CLI tool designed for professional developers, aiming to complete end-to-end environment initialization for Claude Code and Codex within minutes. Through `npx zcf`, you can complete configuration directory creation, API/proxy integration, MCP service integration, workflow import, output style and memory configuration, and common tool installation in one go.

### Why Choose ZCF

- **Zero-configuration experience**: Automatically detects operating system, language preferences, and installation status, triggers incremental configuration when necessary, avoiding duplicate work.
- **Multi-tool unified**: Simultaneously supports Claude Code and Codex, with both environments sharing one CLI, allowing you to switch target platforms anytime.
- **Structured workflows**: Pre-configured six-stage structured workflow, Feat planning flow, BMad agile flow, etc., with built-in proxy and command templates.
- **Rich MCP integration**: Provides Context7, Open Web Search, Spec Workflow, DeepWiki, Playwright, Serena, and other services by default.
- **Visual status and operations**: Includes CCR (Claude Code Router) configuration assistant and CCometixLine status bar installation and upgrade capabilities.
- **Extensible configuration system**: Supports multiple API configurations in parallel, output style switching, environment permission import, template and language separation management.

## What You Get with ZCF

1. **Secure privacy and permission configuration**: Environment variables, permission templates, and backup strategies are automatically implemented, ensuring a minimal yet secure runtime environment.
2. **API and proxy management**: Supports official login, API Key, and CCR proxy three modes, with built-in presets for 302.AI, GLM, MiniMax, Kimi, etc.
3. **Global output style and language system**: Set AI output language, project-level/global output styles, and Codex memory instructions from the command line.
4. **Workflow and command template collection**: Automatically imports `/zcf:workflow`, `/zcf:feat`, `/git-commit` commands and corresponding proxy configurations.
5. **MCP service foundation**: One-click enable mainstream MCP servers, and intelligently prompts environment variable requirements based on whether API Key is needed.
6. **Auxiliary toolchain**: CCometixLine status bar automatic installation, CCR management menu, Codex CLI installation/upgrade, usage statistics.

## Target Audience

- Individuals or teams who need to quickly set up Claude Code/Codex development environments.
- Senior engineers who want to manage MCP services, workflows, and command systems uniformly in the IDE.
- Teams maintaining multiple devices or multiple configurations, hoping to reduce repetitive operations through backup, templates, and multiple API configurations.

## Related Links

- **GitHub**: <https://github.com/UfoMiao/zcf>
- **npm**: <https://www.npmjs.com/package/zcf>
- **Changelog**: [CHANGELOG.md](https://github.com/UfoMiao/zcf/blob/main/CHANGELOG.md)

## 💬 Community

Join our Telegram group for support, discussions, and updates:

[![Telegram](https://img.shields.io/badge/Telegram-Join%20Chat-blue?style=flat&logo=telegram)](https://t.me/ufomiao_zcf)

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
