---
title: 機能概要
---

# 機能概要

`ccs`（Claude Code Switch）は 2 つの機能と、いくつかの便利機能に特化しています。

## 1. API エンドポイントの管理と切り替え

複数の Claude Code API プロファイルを保存できます。各プロファイルには独自の：

- **Base URL** —— API エンドポイント
- **認証方式** —— Auth Token または API Key
- **キー** —— トークンまたは API キー

インタラクティブメニューまたは `ccs cs <name>` で有効なエンドポイントを即座に切り替え、`ccs cs --list` ですべてを一覧表示できます。

詳しい使い方は[設定切り替え](../cli/config-switch.md)を参照してください。

## 2. アップデート確認

`ccs check-updates`（エイリアス `ccs check`）は Claude Code と `ccs` の新しいバージョンを確認し、更新します。

詳しい使い方は[バージョンチェック](../cli/check-updates.md)を参照してください。

## 便利機能

- **インタラクティブメニュー** —— 引数なしで `ccs` を実行。[メインメニュー](../cli/menu.md)を参照。
- **言語切り替え** —— `ccs --lang <zh-CN|en>` で英語と簡体字中国語を切り替え。
- **クリーンなアンインストール** —— `ccs uninstall` で ccs の設定とツールを削除。[アンインストール](../cli/uninstall.md)を参照。

すべての設定は `~/.ccs` に保存されます。
