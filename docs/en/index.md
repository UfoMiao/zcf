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

 
> One config for all your AI coding tools. ZCF installs the tools you pick and writes each one's own settings.

</div>

## ♥️ Sponsor AI API

[![Sponsor AICodeMirror](https://raw.githubusercontent.com/UfoMiao/zcf/main/assets/AICodeMirror.png)](https://www.aicodemirror.ai/register?invitecode=ZCFZCF)
Thanks to [AICodeMirror](https://www.aicodemirror.ai/register?invitecode=ZCFZCF) for sponsoring this project! AICodeMirror provides highly reliable official relay services for Claude, Codex, and Gemini, supporting enterprise-grade concurrency, fast invoice issuance, and dedicated 24/7 technical support. Official Codex access is available for as little as 7% of the standard price, with additional discounts on account top-ups! **AICodeMirror also offers an exclusive benefit to users of the ZCF project: register through <a href="https://www.aicodemirror.ai/register?invitecode=ZCFZCF">this link</a> to receive 20% off your first top-up.**

---

[![GLM](https://raw.githubusercontent.com/UfoMiao/zcf/main/assets/GLM-en.png)](https://z.ai/subscribe?ic=8JVLJQFSKB)
This project is sponsored by Z.ai, supporting us with their GLM CODING PLAN.
GLM CODING PLAN is a subscription service designed for AI coding, starting at just $10/month. It provides access to their flagship GLM-5.2 model across 10+ popular AI coding tools (Claude Code, Cline, Roo Code, etc.), offering developers top-tier, fast, and stable coding experiences.
**Get 10% OFF GLM CODING PLAN：https://z.ai/subscribe?ic=8JVLJQFSKB**

---

[![Sponsor code0](https://raw.githubusercontent.com/UfoMiao/zcf/main/assets/code0-en.jpg)](https://code0.ai/agent/register/nBQjR8p1WL0G982z?utm_source=zcf&utm_medium=partner&utm_campaign=zcf_2026&utm_content=default)
Thanks to [code0.ai](https://code0.ai/agent/register/nBQjR8p1WL0G982z?utm_source=zcf&utm_medium=partner&utm_campaign=zcf_2026&utm_content=default) for sponsoring this project! [code0.ai](http://code0.ai) is an AI coding workspace for developers and technical teams, bringing together mainstream Agent coding capabilities such as Claude Code and Codex. It supports common development scenarios including code generation, project understanding, debugging, code review, and documentation. It is suitable for independent developers, Agent engineers, open-source maintainers, and enterprise R&D teams, with invoicing and team onboarding supported. **Register through the [exclusive link](https://code0.ai/agent/register/nBQjR8p1WL0G982z?utm_source=zcf&utm_medium=partner&utm_campaign=zcf_2026&utm_content=default) and contact customer support to claim free test credits and experience a more efficient AI coding workflow.**

---

[![Sponsor Claude API](https://raw.githubusercontent.com/UfoMiao/zcf/main/assets/claude-api-en.jpg)](https://console.apito.ai/agent/register/kTwXd83JyKRSZk6r)
Thanks to [Claude API](https://console.apito.ai/agent/register/kTwXd83JyKRSZk6r) for sponsoring this project! Claude API is an official-channel API provider focused on Claude models. Built on Anthropic official keys and AWS Bedrock official channels, it provides a stable integration experience for Claude Code and Agent applications, supports the full Claude model family, and preserves official capabilities such as Tool Use and long context. The service is not reverse-engineered and does not downgrade model capabilities, making it suitable for heavy Claude Code users, Agent engineers, and enterprise technical teams. **Register through the [exclusive link](https://console.apito.ai/agent/register/kTwXd83JyKRSZk6r) and contact customer support to claim free test credits. Invoicing and team onboarding are also supported.**

---

[![Sponsor PatewayAI](https://raw.githubusercontent.com/UfoMiao/zcf/main/assets/pateway.ai-en.png)](https://pateway.ai/?ch=vnr0h5&aff=9AWWH87C)
PatewayAI is a high-quality model API relay service provider focused on official direct connections for serious AI developers, offering the full range of Claude and Codex series models. 100% official source supply with no adulteration — open to inspection. Transparent billing with token-level invoices auditable line by line. Enterprise-grade concurrency support with a dedicated management platform for enterprise customers, including formal contracts and invoicing. **PatewayAI offers an exclusive benefit for ZCF users: register via <a href="https://pateway.ai/?ch=vnr0h5&aff=9AWWH87C">this link</a> to get $3 free trial credit, recharges as low as 60% off, with bilateral invite rewards up to $150!**

---

[![Sponsor AI API](https://raw.githubusercontent.com/UfoMiao/zcf/main/assets/302.ai.jpg)](https://share.302.ai/gAT9VG)
[302.AI](https://share.302.ai/gAT9VG) is a usage-based enterprise AI resource platform providing the latest and most comprehensive AI models and APIs in the market, along with various ready-to-use online AI applications.

<table>
<tbody>
<tr>
<td width="180"><a href="https://www.packyapi.com/register?aff=zcf"><img src="https://raw.githubusercontent.com/UfoMiao/zcf/main/assets/packycode.png" alt="PackyCode" width="150"></a></td>
<td>Thanks to PackyCode for sponsoring this project! PackyCode is a reliable and efficient API relay service provider, offering relay services for Claude Code, Codex, Gemini, and more. <strong>PackyCode provides special discounts for our software users: register using <a href="https://www.packyapi.com/register?aff=zcf">this link</a> and enter the "zcf" promo code during recharge to get 10% off.</strong></td>
</tr>
<tr>
<td width="180"><a href="https://apikey.fun/register?aff=ZCFZCF"><img src="https://raw.githubusercontent.com/UfoMiao/zcf/main/assets/apikey-fun.png" alt="APIKEY.FUN" width="150"></a></td>
<td>Thanks to APIKEY.FUN for sponsoring this project! APIKEY.FUN is a professional enterprise-grade AI relay platform dedicated to providing stable, efficient, and low-cost API access for both companies and individual developers. The platform supports popular models including Claude, OpenAI, and Gemini, with pricing as low as 7% of official rates. <strong>Register via <a href="https://apikey.fun/register?aff=ZCFZCF">this link</a> to enjoy an exclusive offer of up to permanent 95% recharge pricing (5% off).</strong></td>
</tr>
<tr>
<td width="180"><a href="https://crazyrouter.com/?utm_source=github&utm_medium=sponsor&utm_campaign=zcf&aff=yJFo"><img src="https://raw.githubusercontent.com/UfoMiao/zcf/main/assets/crazyrouter.svg" alt="Crazyrouter" width="150"></a></td>
<td>Thanks to Crazyrouter for sponsoring this project! Crazyrouter is a high-performance AI API aggregation gateway — one API key for 300+ models (GPT, Claude, Gemini, DeepSeek, and more). All models at 55% of official pricing with auto-failover, smart routing, and unlimited concurrency. Fully OpenAI-compatible, works seamlessly with Claude Code, Codex, and Gemini CLI. <strong>Crazyrouter offers an exclusive deal for ZCF users: register via <a href="https://crazyrouter.com/?utm_source=github&utm_medium=sponsor&utm_campaign=zcf&aff=yJFo">this link</a> to get $2 free credit instantly!</strong></td>
</tr>
<tr>
<td width="180"><a href="https://aihub.top/register?aff=ZYD5VXBARHD8"><img src="https://raw.githubusercontent.com/UfoMiao/zcf/main/assets/aihub.jpg" alt="AIHub" width="150"></a></td>
<td>Thanks to AIHub for sponsoring this project! AIHub is a high-availability AI model API relay platform for individual developers and enterprise teams, supporting Codex and Claude Code at prices below ~10% of official rates. <strong>Register via <a href="https://aihub.top/register?aff=ZYD5VXBARHD8">this link</a> and enter the promo code ZCF to claim $3 trial credit.</strong></td>
</tr>
<tr>
<td width="180"><a href="https://api.sublyx.org/register?aff=S8FQQ8FPM5BP"><img src="https://raw.githubusercontent.com/UfoMiao/zcf/main/assets/Sublyx.png" alt="Sublyx" width="150"></a></td>
<td>Thanks to Sublyx for sponsoring this project! Sublyx is a reliable AI API aggregation gateway, providing unified access to popular models including GPT, Claude, Gemini, Grok, and more through a single API key. It is compatible with Codex, Claude Code, OpenAI SDK, and other common AI development tools. <strong>Sublyx offers an exclusive benefit for our users: register via <a href="https://api.sublyx.org/register?aff=S8FQQ8FPM5BP">this link</a> and use the promo code ZCF to receive an additional $10 in credit.</strong></td>
</tr>

</tbody>
</table>

## Project Overview

::: warning ZCF v5 is not released yet
These pages describe ZCF v5. Until it is released, `npx zcf` still installs v3. See [Coming from v3](./guide/v3).
:::

You keep one ZCF config: your provider, your MCP servers and your skills. Pick the AI coding tools you use, and ZCF installs the ones that are missing and writes each tool's own settings with the tool's own commands.

```bash
npx zcf       # edit the config in the terminal
npx zcf ui    # or in the browser
```

| Tool | Provider | MCP servers | Skills |
|------|:--------:|:-----------:|:------:|
| Claude Code | ✓ | ✓ | ✓ |
| Codex | ✓ | ✓ | ✓ |
| Gemini CLI | ✓ | ✓ | ✓ |
| OpenCode | ✓ | ✓ | ✓ |
| Cursor CLI | | ✓ | ✓ |
| Pi | ✓ | ✓ | ✓ |
| DeepSeek Harness | ✓ | ✓ | ✓ |

### Why ZCF

- **See before you change**: `zcf plan` shows every command ZCF would run and a diff of every file it would edit, with secrets masked. Nothing changes until you apply.
- **Your files stay yours**: ZCF edits only the keys it manages, keeps your comments and formatting, and backs up each file before its first change.
- **The tools' own commands**: `claude mcp add-json`, `codex mcp add`, `npx skills add`, `claude update` and so on. ZCF is not a gateway or a proxy.
- **Fast**: `zcf --version` starts in under 60 ms, and tools are configured in parallel.
- **Provider presets** that update without a ZCF release, and a [`china` mirror](./guide/mirrors) for slow networks.

Start with [Getting started](./guide/).

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
