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
| `npx skills add owner/repo` 内部の git clone | [magpie](https://github.com/yetone/magpie) の `--mirror` と同じく、`https://gh-proxy.com/https://github.com/...` 経由にします。書き換わるのはダウンロード先だけです。git は `github.com` のリポジトリが名付けたオブジェクトハッシュで受け取ったすべてを検証するため、別の内容を返すミラーでは clone が失敗します。設定済みの `GIT_CONFIG_COUNT` はそのまま使います。 |
| Claude Code のインストール | Google Cloud Storage からダウンロードする公式スクリプトの代わりに、同じネイティブバイナリをインストールする `npm install -g @anthropic-ai/claude-code` を使います。 |
| [プロバイダープリセット](./providers) など ZCF リポジトリのファイル | `fastly.jsdelivr.net` と `gcore.jsdelivr.net` にも問い合わせ、最初に応答したものを使います。 |

ZCF が使うのは、まったく同じファイルを配信するミラーだけです。唯一の例外は上の git clone で、そこでは git 自身のオブジェクトハッシュ検証が、リポジトリ自身のバイト以外を返すミラーを検出します。

## 対象外

- 公式スクリプトでインストールした Claude Code の `claude update` のような、ネイティブの自己更新。該当する場合は `zcf update` がその旨を表示します。
- ツール内で MCP サーバーが実行する `npx`。
- プロバイダー自身のエンドポイント。

HTTP プロキシの内側にいる場合、ZCF がプリセットの取得に使う Node 組み込みの `fetch` は、`NODE_USE_ENV_PROXY=1` が設定されているときにだけ `HTTPS_PROXY` に従います。
