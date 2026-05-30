<div align="center">
  <h1>ccs - Claude Code Switch</h1>

  <p align="center">
  <a href="README.md">English</a> | <a href="README_zh-CN.md">中文</a> | <b>日本語</b>

  > 複数の Claude Code API エンドポイントを管理し、コマンド一つで切り替え —— さらに Claude Code と ccs を最新に保ちます。
  </p>
</div>

## ccs とは？

`ccs`（Claude Code Switch）は、2 つのことだけに特化した小さな CLI ツールです。

1. **API エンドポイントの管理と切り替え** —— 複数の Claude Code API プロファイル（base URL + 認証方式 + キー）を保存し、インタラクティブメニューまたは単一コマンドで有効なエンドポイントを即座に切り替えます。
2. **アップデート確認** —— Claude Code と `ccs` 本体を最新バージョンに更新します。

さらに、インタラクティブメニュー、zh-CN/en の言語切り替え、クリーンなアンインストール機能も提供します。設定は `~/.ccs` に保存されます。

## インストール

```bash
# グローバルインストール
npm i -g @xwm111/ccs

# またはインストールせずに実行
npx @xwm111/ccs
```

## 使い方

```bash
ccs                  # インタラクティブメニューを開く（デフォルト）
ccs config-switch    # API エンドポイントの管理 / 切り替え
ccs cs               # config-switch のエイリアス
ccs cs --list        # 保存済みの設定を一覧表示
ccs cs my-endpoint   # 指定した名前の設定に直接切り替え
ccs check-updates    # Claude Code と ccs を確認・更新
ccs check            # check-updates のエイリアス
ccs uninstall        # ccs の設定とツールを削除
```

主なオプション：

```bash
ccs --lang zh-CN     # 表示言語を切り替え（zh-CN, en）
ccs --help           # ヘルプを表示
ccs --version        # バージョンを表示
```

## 機能

### 1. 複数の API エンドポイントとクイック切り替え

任意の数の Claude Code API プロファイルを保存できます。各プロファイルには独自の base URL、認証方式（Auth Token / API Key）、キーがあります。インタラクティブメニューまたは `ccs cs <name>` で有効なエンドポイントを切り替え、`ccs cs --list` で設定済みのすべてを確認できます。

### 2. アップデート確認

`ccs check-updates` は Claude Code と `ccs` の新しいバージョンを確認し、更新します。

## ライセンス

[MIT License](LICENSE)

Forked from [UfoMiao/zcf](https://github.com/UfoMiao/zcf) (MIT)。
