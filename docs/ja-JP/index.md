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

 
> ゼロ設定、ワンクリックで Claude Code & Codex 環境セットアップ - 中日英多言語対応、インテリジェントプロキシシステム、パーソナライズされた AI アシスタント

</div>

## ♥️ スポンサー AI API

[![スポンサー AI API](https://raw.githubusercontent.com/UfoMiao/zcf/main/src/assets/302.ai.jpg)](https://share.302.ai/gAT9VG)
[302.AI](https://share.302.ai/gAT9VG) は使用量ベースのエンタープライズ級 AI リソースプラットフォームで、市場で最新かつ最も包括的な AI モデルと API、および様々な即座に使用可能なオンライン AI アプリケーションを提供しています。

---

[![GLM](https://raw.githubusercontent.com/UfoMiao/zcf/main/src/assets/GLM-en.png)](https://z.ai/subscribe?ic=8JVLJQFSKB)
このプロジェクトは Z.ai のスポンサーを受けており、GLM CODING PLAN をサポートしています。
GLM CODING PLAN は AI コーディング向けに設計されたサブスクリプションサービスで、月額わずか 3 ドルから利用できます。Claude Code、Cline、Roo Code など 10 以上の人気 AI コーディングツールで最先端の GLM-4.6 モデルにアクセスでき、開発者に最高級で高速かつ安定したコーディング体験を提供します。
GLM CODING PLAN を 10% オフで入手：https://z.ai/subscribe?ic=8JVLJQFSKB

---

<table>
<tbody>
<tr>
<td width="180"><a href="https://www.packyapi.com/register?aff=zcf"><img src="https://raw.githubusercontent.com/UfoMiao/zcf/main/src/assets/packycode.png" alt="PackyCode" width="150"></a></td>
<td>PackyCode がこのプロジェクトをスポンサーしてくれたことに感謝します！PackyCode は信頼性が高く効率的な API リレーサービスプロバイダーで、Claude Code、Codex、Gemini などのリレーサービスを提供しています。PackyCode は当ソフトウェアのユーザーに特別割引を提供しています：<a href="https://www.packyapi.com/register?aff=zcf">このリンク</a>から登録し、チャージ時に「zcf」プロモーションコードを入力すると 10% オフになります。</td>
</tr>
</tbody>
</table>

## プロジェクト概要

ZCF（Zero-Config Code Flow）は、専門開発者向けの CLI ツールで、Claude Code と Codex のエンドツーエンド環境初期化を数分で完了することを目指しています。`npx zcf` を通じて、設定ディレクトリの作成、API/プロキシ統合、MCP サービス統合、ワークフローインポート、出力スタイルとメモリ設定、および一般的なツールのインストールを一括で完了できます。

### ZCF を選ぶ理由

- **ゼロ設定体験**：オペレーティングシステム、言語設定、インストール状態を自動検出し、必要に応じて増分設定をトリガーし、重複作業を回避します。
- **マルチツール統一**：Claude Code と Codex を同時にサポートし、両方の環境が 1 つの CLI を共有し、いつでもターゲットプラットフォームを切り替えられます。
- **構造化ワークフロー**：6 段階構造化ワークフロー、Feat 計画フロー、BMad アジャイルフローなどを事前設定し、内蔵プロキシとコマンドテンプレートを提供します。
- **豊富な MCP 統合**：デフォルトで Context7、Open Web Search、Spec Workflow、DeepWiki、Playwright、Serena などのサービスを提供します。
- **視覚的な状態と運用**：CCR（Claude Code Router）設定アシスタントと CCometixLine ステータスバーのインストールとアップグレード機能を含みます。
- **拡張可能な設定システム**：複数の API 設定の並列実行、出力スタイルの切り替え、環境権限のインポート、テンプレートと言語の分離管理をサポートします。

## ZCF で得られるもの

1. **安全なプライバシーと権限設定**：環境変数、権限テンプレート、バックアップ戦略が自動的に実装され、最小限でありながら安全な実行環境を確保します。
2. **API とプロキシ管理**：公式ログイン、API Key、CCR プロキシの 3 つのモードをサポートし、302.AI、GLM、MiniMax、Kimi などの内蔵プリセットを提供します。
3. **グローバル出力スタイルと言語システム**：コマンドラインから AI 出力言語、プロジェクトレベル/グローバル出力スタイル、Codex メモリ命令を設定できます。
4. **ワークフローとコマンドテンプレートコレクション**：`/zcf:workflow`、`/zcf:feat`、`/git-commit` コマンドと対応するプロキシ設定を自動的にインポートします。
5. **MCP サービス基盤**：ワンクリックで主流の MCP サーバーを有効化し、API Key が必要かどうかに基づいて環境変数の要件をインテリジェントにプロンプトします。
6. **補助ツールチェーン**：CCometixLine ステータスバーの自動インストール、CCR 管理メニュー、Codex CLI インストール/アップグレード、使用統計。

## 対象者

- Claude Code/Codex 開発環境を迅速にセットアップする必要がある個人またはチーム。
- IDE で MCP サービス、ワークフロー、コマンドシステムを統一管理したい上級エンジニア。
- 複数のデバイスまたは複数の設定を維持し、バックアップ、テンプレート、複数の API 設定を通じて重複操作を減らしたいチーム。

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
