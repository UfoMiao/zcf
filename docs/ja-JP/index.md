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

 
> すべての AI コーディングツールの設定を 1 つに。ZCF は選んだツールをインストールし、各ツール固有の設定を書き込みます。

</div>

## プロジェクト概要

::: warning ZCF v5 はまだリリースされていません
これらのページは ZCF v5 について説明しています。リリースされるまで、`npx zcf` で入るのは引き続き v3 です。[v3 からの移行](./guide/v3) を参照してください。
:::

ZCF の設定は 1 つだけです。プロバイダー、MCP サーバー、スキルをそこにまとめます。使っている AI コーディングツールを選ぶと、ZCF は足りないツールをインストールし、ツール自身のコマンドで各ツールの設定を書き込みます。

```bash
npx zcf       # ターミナルで設定を編集する
npx zcf ui    # またはブラウザーで編集する
```

| ツール | プロバイダー | MCP サーバー | スキル |
|--------|:------------:|:------------:|:------:|
| Claude Code | ✓ | ✓ | ✓ |
| Codex | ✓ | ✓ | ✓ |
| Gemini CLI | ✓ | ✓ | ✓ |
| OpenCode | ✓ | ✓ | ✓ |
| Cursor CLI | | ✓ | ✓ |
| Pi | ✓ | ✓ | ✓ |
| DeepSeek Harness | ✓ | ✓ | ✓ |

### ZCF を選ぶ理由

- **変更の前に確認できる**: `zcf plan` は、ZCF が実行するすべてのコマンドと、編集するすべてのファイルの diff をシークレットをマスクして表示します。適用するまで何も変わりません。
- **ファイルはあなたのもの**: ZCF は自分が管理するキーだけを編集し、コメントや書式を残し、各ファイルを最初に変更する前にバックアップします。
- **ツール自身のコマンド**: `claude mcp add-json`、`codex mcp add`、`npx skills add`、`claude update` など。ZCF はゲートウェイでもプロキシでもありません。
- **高速**: `zcf --version` は 60 ms 未満で起動し、ツールは並列に設定されます。
- ZCF のリリースなしで更新される **プロバイダープリセット** と、遅いネットワーク向けの [`china` ミラー](./guide/mirrors)。

[はじめに](./guide/) から始めてください。

## 関連リンク

- **GitHub**：<https://github.com/UfoMiao/zcf>
- **npm**：<https://www.npmjs.com/package/zcf>
- **更新ログ**：[CHANGELOG.md](https://github.com/UfoMiao/zcf/blob/main/CHANGELOG.md)

## 💬 コミュニティ

Telegram グループに参加して、サポート、ディスカッション、アップデート情報を入手しましょう：

[![Telegram](https://img.shields.io/badge/Telegram-参加-blue?style=flat&logo=telegram)](https://t.me/ufomiao_zcf)

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
