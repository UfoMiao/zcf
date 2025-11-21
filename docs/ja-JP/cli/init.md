---
title: zcf init
---

# zcf init

ZCF のフル初期化コマンドです。API 設定、ワークフロー/テンプレート導入、出力スタイル、MCP、バックアップを一括で実行します。

```bash
npx zcf init [options]
# 省略形: npx zcf i
```

## 主なオプション

- `-s, --skip-prompt`：非対話モード  
- `-T, --code-type <claude|codex>`：対象ツールを指定（既定は Claude Code）  
- `-t, --api-auth-type <api_key|ccr|official>`：認証方式  
- `-p, --provider <id>` / `-k, --api-key <key>`：API プロバイダー＆キー  
- `-u, --base-url <url>` / `-M, --model-id <model>` / `-F, --fallback-model-id <model>`：モデル設定  
- `-g, --all-lang <lang>` / `-c, --config-lang <lang>` / `-a, --ai-output-lang <lang>`：言語設定  
- `-o, --output-styles <list|all|skip>`：出力スタイル導入  
- `-m, --mcp-services <list|all|skip>`：MCP 導入  
- `-w, --workflows <list|all|skip>`：ワークフロー導入  
- `--config-action <backup|merge|docs|skip>`：既存設定への処理方法  
- `--config-switch <name>`：指定コンフィグに切替えて初期化

## 代表的な使い方

```bash
# 公式ログイン + 標準セット
npx zcf init

# API Key で非対話、302.ai プリセット、全ワークフロー/MCP 導入
npx zcf init -s -t api_key -p 302ai -k "sk-xxx" --workflows all --mcp-services all

# Codex 用に初期化
npx zcf init -s -T codex -p 302ai -k "sk-xxx"

# 中国語 UI ＋ 英語出力
npx zcf init -g zh-CN -a en
```

## 処理モード

既存設定がある場合は以下を選択：

- **backup**：バックアップを取って上書き  
- **merge**：新旧設定をマージ  
- **docs**：テンプレート/ワークフローのみ更新  
- **skip**：何もしない

## インタラクティブメニュー

メニュー (`npx zcf`) からも `1` で同等の初期化を実行できます。途中で API/モデル/MCP/ワークフロー/出力スタイル/バックアップ戦略を選択できます。

## ヒント

- 初回は対話モードで実行し、チーム用は `--skip-prompt` と設定ファイルを組み合わせて自動化するのがおすすめ。  
- 重要な設定変更前に `--config-action backup` を付けてバックアップを確実に残してください。
