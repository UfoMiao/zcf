---
title: zcf update
---

# zcf update

ワークフロー、テンプレート、出力スタイル、MCP 設定などを更新するコマンドです。インストール済み構成を検出し、増分で適用します。

```bash
npx zcf update [options]
# 省略形: npx zcf u
```

## 主なオプション

- `-s, --skip-prompt`：非対話で実行  
- `-T, --code-type <claude|codex>`：対象ツール  
- `-g, --all-lang <lang>`：テンプレート/出力/CLI 言語をまとめて変更  
- `-c, --config-lang <lang>`：テンプレート言語のみ変更  
- `-o, --output-styles <list|all|skip>`：出力スタイルの更新/スキップ  
- `-m, --mcp-services <list|all|skip>`：MCP 設定の更新/スキップ  
- `-w, --workflows <list|all|skip>`：ワークフローの更新/スキップ  
- `--config-action <backup|merge|docs|skip>`：既存設定の扱い  
- `--config-switch <name>`：指定プロファイルで更新

## 例

```bash
# 週次アップデート（推奨）
npx zcf update

# 非対話で中国語テンプレートに更新
npx zcf update -s -g zh-CN

# Codex 用のみ更新
npx zcf update -s -T codex
```

## ベストプラクティス

- 定期的に実行して最新のワークフロー/テンプレートを取り込む  
- 重要な変更がある場合は `--config-action backup` で上書き前にバックアップ  
- MCP や出力スタイルを変更しない場合は `--mcp-services skip` などで時間短縮
