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

## ♥️ スポンサー AI API

[![スポンサー AICodeMirror](https://raw.githubusercontent.com/UfoMiao/zcf/main/assets/AICodeMirror.png)](https://www.aicodemirror.ai/register?invitecode=ZCFZCF)
[AICodeMirror](https://www.aicodemirror.ai/register?invitecode=ZCFZCF) がこのプロジェクトをスポンサーしてくれたことに感謝します！AICodeMirror は Claude / Codex / Gemini の公式高安定中継サービスを提供し、エンタープライズ級の高並行処理、迅速な請求書発行、7×24 専用テクニカルサポートに対応しています。Codex 公式チャネルは標準価格の 7% から利用可能で、チャージでさらに割引があります！**AICodeMirror は ZCF プロジェクトのユーザー向けに特別特典を用意しています：<a href="https://www.aicodemirror.ai/register?invitecode=ZCFZCF">このリンク</a>から登録すると、初回チャージ 20% オフを受けられます。**

---

[![GLM](https://raw.githubusercontent.com/UfoMiao/zcf/main/assets/GLM-en.png)](https://z.ai/subscribe?ic=8JVLJQFSKB)
このプロジェクトは Z.ai のスポンサーを受けており、GLM CODING PLAN をサポートしています。
GLM CODING PLAN は AI コーディング向けに設計されたサブスクリプションサービスで、月額わずか 10 ドルから利用できます。Claude Code、Cline、Roo Code など 10 以上の人気 AI コーディングツールで、フラグシップの GLM-5.2 にアクセスでき、開発者に最高級で高速かつ安定したコーディング体験を提供します。
**GLM CODING PLAN を 10% オフで入手：https://z.ai/subscribe?ic=8JVLJQFSKB**

---

[![スポンサー code0](https://raw.githubusercontent.com/UfoMiao/zcf/main/assets/code0-en.jpg)](https://code0.ai/agent/register/nBQjR8p1WL0G982z?utm_source=zcf&utm_medium=partner&utm_campaign=zcf_2026&utm_content=default)
[code0.ai](https://code0.ai/agent/register/nBQjR8p1WL0G982z?utm_source=zcf&utm_medium=partner&utm_campaign=zcf_2026&utm_content=default) がこのプロジェクトをスポンサーしてくれたことに感謝します！[code0.ai](http://code0.ai) は、開発者と技術チーム向けの AI コーディングワークスペースで、Claude Code や Codex などの主流な Agent コーディング能力を集約しています。コード生成、プロジェクト理解、デバッグ、コードレビュー、ドキュメント生成などの一般的な開発シナリオをサポートしており、個人開発者、Agent エンジニア、オープンソースメンテナー、企業の研究開発チームに適しています。請求書発行とチーム導入もサポートしています。**[専用リンク](https://code0.ai/agent/register/nBQjR8p1WL0G982z?utm_source=zcf&utm_medium=partner&utm_campaign=zcf_2026&utm_content=default)から登録し、カスタマーサポートに連絡すると、無料のテストクレジットを受け取り、より効率的な AI コーディングワークフローを体験できます。**

---

[![スポンサー Claude API](https://raw.githubusercontent.com/UfoMiao/zcf/main/assets/claude-api-en.jpg)](https://console.apito.ai/agent/register/kTwXd83JyKRSZk6r)
[Claude API](https://console.apito.ai/agent/register/kTwXd83JyKRSZk6r) がこのプロジェクトをスポンサーしてくれたことに感謝します！Claude API は、Claude モデルに特化した公式チャネルの API プロバイダーです。Anthropic 公式キーと AWS Bedrock 公式チャネルを基盤とし、Claude Code や Agent アプリケーションへの安定した統合体験を提供し、Claude 全シリーズモデルをサポートし、Tool Use や長いコンテキストなどの公式機能を保持しています。サービスはリバースエンジニアリングされておらず、モデル能力を低下させることはありません。Claude Code のヘビーユーザー、Agent エンジニア、企業の技術チームに適しています。**[専用リンク](https://console.apito.ai/agent/register/kTwXd83JyKRSZk6r)から登録し、カスタマーサポートに連絡すると、無料のテストクレジットを受け取れます。請求書発行とチーム導入もサポートされています。**

---

[![スポンサー PatewayAI](https://raw.githubusercontent.com/UfoMiao/zcf/main/assets/pateway.ai-en.png)](https://pateway.ai/?ch=vnr0h5&aff=9AWWH87C)
PatewayAI はヘビーな AI 開発者向けに、公式直接接続に特化した高品質モデル API 中継サービスプロバイダーで、Claude 全系列と Codex 系列モデルを提供します。100% 公式ソース直供給で、不純物なし、検証可能。課金は透明で、トークンレベルの請求書を 1 件ずつ照合できます。エンタープライズレベルの高並行性に対応し、企業顧客向けに専用管理プラットフォームを提供、正式契約締結と請求書発行も可能です。**PatewayAI は ZCF ユーザー専用特典を提供：<a href="https://pateway.ai/?ch=vnr0h5&aff=9AWWH87C">このリンク</a>から登録すると $3 のトライアルクレジットを即時プレゼント、チャージは最大 60% オフ、招待は双方向ボーナスで報酬は最大 $150！**

---

[![スポンサー AI API](https://raw.githubusercontent.com/UfoMiao/zcf/main/assets/302.ai.jpg)](https://share.302.ai/gAT9VG)
[302.AI](https://share.302.ai/gAT9VG) は使用量ベースのエンタープライズ級 AI リソースプラットフォームで、市場で最新かつ最も包括的な AI モデルと API、および様々な即座に使用可能なオンライン AI アプリケーションを提供しています。

<table>
<tbody>
<tr>
<td width="180"><a href="https://www.packyapi.com/register?aff=zcf"><img src="https://raw.githubusercontent.com/UfoMiao/zcf/main/assets/packycode.png" alt="PackyCode" width="150"></a></td>
<td>PackyCode がこのプロジェクトをスポンサーしてくれたことに感謝します！PackyCode は信頼性が高く効率的な API リレーサービスプロバイダーで、Claude Code、Codex、Gemini などのリレーサービスを提供しています。PackyCode は当ソフトウェアのユーザーに特別割引を提供しています：<a href="https://www.packyapi.com/register?aff=zcf">このリンク</a>から登録し、チャージ時に「zcf」プロモーションコードを入力すると 10% オフになります。</td>
</tr>
<tr>
<td width="180"><a href="https://apikey.fun/register?aff=ZCFZCF"><img src="https://raw.githubusercontent.com/UfoMiao/zcf/main/assets/apikey-fun.png" alt="APIKEY.FUN" width="150"></a></td>
<td>APIKEY.FUN のご支援に感謝します！APIKEY.FUN は企業および個人開発者向けに、安定・高効率・低コストな AI モデル API 接続を提供する、プロフェッショナルなエンタープライズ向け AI 中継プラットフォームです。Claude、OpenAI、Gemini などの主要モデルに対応し、価格は公式の 7% まで低減可能です。<a href="https://apikey.fun/register?aff=ZCFZCF">この専用リンク</a>から登録すると、チャージ永久 95 折（5% オフ）の特典を受けられます。</td>
</tr>
<tr>
<td width="180"><a href="https://crazyrouter.com/?utm_source=github&utm_medium=sponsor&utm_campaign=zcf&aff=yJFo"><img src="https://raw.githubusercontent.com/UfoMiao/zcf/main/assets/crazyrouter.svg" alt="Crazyrouter" width="150"></a></td>
<td>Crazyrouter のスポンサーに感謝します！Crazyrouter は高性能 AI API 集約ゲートウェイです — 1つの API キーで 300+ モデル（GPT、Claude、Gemini、DeepSeek など）を利用可能。全モデル公式価格の 55% で提供、自動フェイルオーバー、スマートルーティング、無制限同時接続に対応。OpenAI 完全互換で、Claude Code、Codex、Gemini CLI とシームレスに連携。ZCF ユーザー限定特典：<a href="https://crazyrouter.com/?utm_source=github&utm_medium=sponsor&utm_campaign=zcf&aff=yJFo">こちらのリンク</a>から登録すると $2 の無料クレジットを即時プレゼント！</td>
</tr>
<tr>
<td width="180"><a href="https://aihub.top/register?aff=ZYD5VXBARHD8"><img src="https://raw.githubusercontent.com/UfoMiao/zcf/main/assets/aihub.jpg" alt="AIHub" width="150"></a></td>
<td>AIHub のスポンサーに感謝します！AIHub は、個人開発者と企業チーム向けの高可用性 AI モデル API 中継プラットフォームで、Codex および Claude Code を公式価格の約 1 割以下で提供します。<a href="https://aihub.top/register?aff=ZYD5VXBARHD8">このリンク</a>から登録し、プロモーションコード <strong>ZCF</strong> を入力すると、$3 のテストクレジットを受け取れます。</td>
</tr>
<tr>
<td width="180"><a href="https://api.sublyx.org/register?aff=S8FQQ8FPM5BP"><img src="https://raw.githubusercontent.com/UfoMiao/zcf/main/assets/Sublyx.png" alt="Sublyx" width="150"></a></td>
<td>Sublyx のスポンサーに感謝します！Sublyx は安定性と効率性に優れた AI API 集約ゲートウェイで、1つの API Key で GPT、Claude、Gemini、Grok などの主流大規模モデルに統一アクセスできます。Codex、Claude Code、OpenAI SDK などの一般的な AI 開発ツールと互換性があります。<strong>Sublyx は本プロジェクトのユーザー向けに専用特典を用意しています：<a href="https://api.sublyx.org/register?aff=S8FQQ8FPM5BP">このリンク</a>から登録し、プロモーションコード ZCF を使用すると、追加で $10 のクレジットを受け取れます。</strong></td>
</tr>

</tbody>
</table>

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
