---
title: ミラー
---

# ミラー

中国本土では、npm レジストリや一部のインストーラーが遅いか、ブロックされています。`china` ミラーを使うと、ZCF は代わりに中国国内のミラーからダウンロードします。

```bash
npx zcf mirror china      # 設定に保存する
npx zcf mirror            # 使用中のミラーとその理由を表示する
npx zcf mirror official   # 元に戻す
```

## ミラーの決まり方

優先度の高い順に:

1. `zcf plan`、`zcf apply`、`zcf update` の `--mirror official|china`。その実行に限ります。
2. 環境変数 `ZCF_MIRROR`（`cn` も `china` の意味）。
3. [設定ファイル](./config) の `mirror`。`zcf mirror <name>` または [エディター](./ui) の **Settings** ページで設定します。
4. `official`。

`china` ミラーを使っているとき、`zcf plan`、`zcf apply`、`zcf update` は冒頭でその旨と使用するレジストリを表示します。

## `china` で変わること

| ダウンロード | `china` の場合 |
|--------------|----------------|
| npm のインストール（`npm install -g`、`npx skills add`、npm でインストールしたツール自身のアップデーター） | `https://registry.npmmirror.com` を使います。`npm_config_registry` で設定済みのレジストリはそのまま使います。 |
| Claude Code のインストール | Google Cloud Storage からダウンロードする公式スクリプトの代わりに、同じネイティブバイナリをインストールする `npm install -g @anthropic-ai/claude-code` を使います。 |
| [プロバイダープリセット](./providers) など ZCF リポジトリのファイル | `fastly.jsdelivr.net` と `gcore.jsdelivr.net` にも問い合わせ、最初に応答したものを使います。 |

ZCF が使うのは、まったく同じファイルを配信するミラーだけです。異なる内容を返す可能性のあるプロキシは使いません。

## 対象外

- `npx skills add owner/repo` が行う git clone。
- 公式スクリプトでインストールした Claude Code の `claude update` のような、ネイティブの自己更新。該当する場合は `zcf update` がその旨を表示します。
- ツール内で MCP サーバーが実行する `npx`。
- プロバイダー自身のエンドポイント。

HTTP プロキシの内側にいる場合、ZCF がプリセットの取得に使う Node 組み込みの `fetch` は、`NODE_USE_ENV_PROXY=1` が設定されているときにだけ `HTTPS_PROXY` に従います。
