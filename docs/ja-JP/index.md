---
title: ccs - Claude Code Switch
---

<div align="center">
  <h1>ccs - Claude Code Switch</h1>

  > 複数の Claude Code API エンドポイントを管理し、コマンド一つで切り替え —— さらに Claude Code と ccs を最新に保ちます。
</div>

## プロジェクト概要

`ccs`（Claude Code Switch）は、2 つのことだけに特化した小さな CLI ツールです。

1. **API エンドポイントの管理と切り替え** —— 複数の Claude Code API プロファイル（base URL + 認証方式 + キー）を保存し、インタラクティブメニューまたは単一コマンドで有効なエンドポイントを即座に切り替えます。
2. **アップデート確認** —— Claude Code と `ccs` 本体を最新バージョンに更新します。

さらに、インタラクティブメニュー、zh-CN/en の言語切り替え、クリーンなアンインストール機能も提供します。設定は `~/.ccs` に保存されます。

## クイックスタート

```bash
# グローバルインストール
npm i -g @xwm111/ccs

# またはインストールせずに実行
npx @xwm111/ccs

# インタラクティブメニューを開く
ccs
```

詳細は [はじめに](getting-started/) を参照してください。

## なぜ ccs か

- **複数のエンドポイントをワンクリックで切り替え** —— 必要なだけ Claude Code API プロファイルを保存し、即座に切り替え。
- **常に最新** —— 一つのコマンドで Claude Code と ccs の両方を更新。
- **バイリンガル** —— 英語と簡体字中国語に対応。
- **クリーン** —— 設定は `~/.ccs` に隔離され、`ccs uninstall` できれいに削除できます。

## 関連リンク

- **npm**: <https://www.npmjs.com/package/@xwm111/ccs>

## ライセンス

MIT ライセンス。Forked from [UfoMiao/zcf](https://github.com/UfoMiao/zcf) (MIT)。
