[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Claude Code][claude-code-src]][claude-code-href]
[![codecov][codecov-src]][codecov-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![Ask DeepWiki][deepwiki-src]][deepwiki-href]

<div align="center">
  <img src="./assets/banner.webp" alt="Banner"/>

  <h1>
    ZCF - Zero-Config Code Flow
  </h1>

  <p align="center">
  <b>English</b> | <a href="README_zh-CN.md">中文</a> | <a href="README_ja-JP.md">日本語</a> | <a href="CHANGELOG.md">Changelog</a>

**✨ Full Documentation**: [ZCF Docs](https://zcf.ufomiao.com/)

> One config for all your AI coding tools. ZCF installs the tools you pick and writes each one's own settings.
</p>
</div>

> [!IMPORTANT]
> This is **ZCF v5**, a rewrite that is not published yet. Until it is, `npx zcf` still installs v3 (source at the [`zcf@3.7.3`](https://github.com/UfoMiao/zcf/tree/zcf@3.7.3) tag), and [zcf.ufomiao.com](https://zcf.ufomiao.com/) describes v3. To try v5 from source, see [Contributing](docs/en/guide/contributing.md).

## 🚀 Quick Start

You keep one ZCF config: your provider, your MCP servers and your skills. ZCF installs the tools you pick and writes each tool's own settings with the tool's own commands, such as `claude mcp add-json` and `npx skills add`.

Supported tools: Claude Code, Codex, Gemini CLI, OpenCode, Cursor CLI, Pi and DeepSeek Harness.

Once v5 is published:

```bash
npx zcf            # edit the config in the terminal
npx zcf ui         # or in the browser
npx zcf plan       # see every command and a diff of each file ZCF would edit
npx zcf apply -y   # install missing tools and write their settings
npx zcf update     # update the tools with their own updaters
```

Nothing changes before you apply. ZCF edits only the keys it manages, keeps your comments and formatting, backs up each file before changing it, and never prints your keys. Coming from v3? See [Coming from v3](docs/en/guide/v3.md).

## 📖 Full Documentation

- [Getting started](docs/en/guide/index.md), [Config file](docs/en/guide/config.md), [Commands](docs/en/guide/commands.md) and [Agent tools](docs/en/guide/tools.md)
- Architecture: [ADR 002](docs/adr/002-v5-architecture.md)

## 💬 Community

Join our Telegram group for support, discussions, and updates:

[![Telegram](https://img.shields.io/badge/Telegram-Join%20Chat-blue?style=flat&logo=telegram)](https://t.me/ufomiao_zcf)

## 📄 License

[MIT License](LICENSE)

---

## 🚀 Contributors

<a href="https://github.com/UfoMiao/zcf/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=UfoMiao/zcf" />
</a>
<br /><br />

## ⭐️ Star History

If this project helps you, please give me a ⭐️ Star!

[![Star History Chart](https://star-history.dera.page/svg?repos=UfoMiao/zcf&type=Date)](https://star-history.dera.page/#UfoMiao/zcf&type=date)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/zcf?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/zcf
[npm-downloads-src]: https://img.shields.io/npm/dm/zcf?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/zcf
[license-src]: https://img.shields.io/github/license/ufomiao/zcf.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/ufomiao/zcf/blob/main/LICENSE
[claude-code-src]: https://img.shields.io/badge/Claude-Code-1fa669?style=flat&colorA=080f12&colorB=1fa669
[claude-code-href]: https://claude.ai/code
[codecov-src]: https://codecov.io/gh/UfoMiao/zcf/graph/badge.svg?token=HZI6K4Y7D7&style=flat&colorA=080f12&colorB=1fa669
[codecov-href]: https://codecov.io/gh/UfoMiao/zcf
[jsdocs-src]: https://img.shields.io/badge/jsdocs-reference-1fa669?style=flat&colorA=080f12&colorB=1fa669
[jsdocs-href]: https://www.jsdocs.io/package/zcf
[deepwiki-src]: https://img.shields.io/badge/Ask-DeepWiki-1fa669?style=flat&colorA=080f12&colorB=1fa669
[deepwiki-href]: https://deepwiki.com/UfoMiao/zcf
