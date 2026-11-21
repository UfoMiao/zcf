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
   <a href="README.md">English</a> | <a href="README_zh-CN.md">中文</a> | <b>日本語</b> | <a href="CHANGELOG.md">更新履歴</a>

**✨ 完全ドキュメント**: [ドキュメント入口](https://zcf.ufomiao.com/ja-JP/)

> すべての AI コーディングツールの設定を 1 つに。ZCF は選んだツールをインストールし、各ツール固有の設定を書き込みます。
  </p>
</div>

> [!IMPORTANT]
> これは未公開の書き直し版 **ZCF v5** です。公開されるまで、`npx zcf` で入るのは引き続き v3 です（ソースは [`zcf@3.7.3`](https://github.com/UfoMiao/zcf/tree/zcf@3.7.3) タグ）。[zcf.ufomiao.com](https://zcf.ufomiao.com/ja-JP/) も v3 の内容です。ソースから v5 を試すには [貢献ガイド](docs/ja-JP/guide/contributing.md) を参照してください。

## 🚀 クイックスタート

ZCF の設定は 1 つだけです。プロバイダー、MCP サーバー、スキルをそこにまとめます。ZCF は選んだツールをインストールし、`claude mcp add-json` や `npx skills add` などツール自身のコマンドで各ツールの設定を書き込みます。

対応ツール: Claude Code、Codex、Antigravity CLI、OpenCode、Cursor CLI、Pi、DeepSeek Harness。

v5 の公開後:

```bash
npx zcf            # ターミナルで設定を編集する
npx zcf ui         # またはブラウザーで編集する
npx zcf plan       # ZCF が実行するすべてのコマンドと、編集する各ファイルの diff を確認する
npx zcf apply -y   # 足りないツールをインストールし、設定を書き込む
npx zcf update     # 各ツール自身のアップデーターでツールを更新する
```

適用するまで何も変わりません。ZCF は自分が管理するキーだけを編集し、コメントや書式を残し、変更前に各ファイルをバックアップし、キーを出力することはありません。v3 から移行する場合は [v3 からの移行](docs/ja-JP/guide/v3.md) を参照してください。

## 📖 完全ドキュメント

- [はじめに](docs/ja-JP/guide/index.md)、[設定ファイル](docs/ja-JP/guide/config.md)、[コマンド](docs/ja-JP/guide/commands.md)、[ツール](docs/ja-JP/guide/tools.md)
- アーキテクチャ: [ADR 002](docs/adr/002-v5-architecture.md)

## 💬 コミュニティ

Telegramグループに参加して、サポートやディスカッション、アップデート情報を入手しましょう：

[![Telegram](https://img.shields.io/badge/Telegram-参加-blue?style=flat&logo=telegram)](https://t.me/ufomiao_zcf)

## 📄 ライセンス

[MITライセンス](LICENSE)

---

## 🚀 コントリビューター

<a href="https://github.com/UfoMiao/zcf/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=UfoMiao/zcf" />
</a>
<br /><br />

## ⭐️ スター履歴

このプロジェクトが役立った場合は、⭐️ Starをお願いします！

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
