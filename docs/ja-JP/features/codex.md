---
title: Codex サポート
---

# Codex サポート

ZCF は OpenAI 提供の CLI ツール Codex を Claude Code と同じ操作感で管理できます。メニューからワンクリックで切り替え、インストール、設定、バックアップを自動化します。

## コア機能

- ツール統合：メニューで Claude Code / Codex をシームレスに切替
- スマート設定：Codex CLI の自動インストール、API プロバイダー設定、MCP 連携
- バックアップ：設定変更ごとにタイムスタンプ付きバックアップ
- マルチプロバイダー：OpenAI / カスタムエンドポイントを複数登録して切替
- システムプロンプト：プロ向け出力スタイルをインストール
- ワークフロー：コード生成向けに最適化されたテンプレートを導入
- アンインストーラー：不要構成を選択的に削除

## インストール/アップグレード

```bash
# Codex を自動検出し、未インストールなら導入
npx zcf i -s -T codex -p 302ai -k "sk-xxx"

# アップデートチェックから更新
npx zcf check-updates --code-type codex
# またはメニューの (+) から Codex を選択
```

## ディレクトリとバックアップ

```
~/.codex/
├─ config.toml      # メイン設定
├─ auth.json        # 認証情報
├─ AGENTS.md        # システムプロンプト
├─ prompts/         # ワークフロー/テンプレート
└─ backup/YYYY-MM-DD_HH-mm-ss/
```

- 変更時に自動バックアップ  
- 必要に応じて特定項目のみバックアップ/復元可能

## API/プロバイダー設定

```bash
# 302.ai プリセット + API Key
npx zcf init -s -T codex -p 302ai -k "sk-xxx"

# カスタムエンドポイント
npx zcf init -s -T codex -t api_key -k "sk-xxx" -u "https://api.example.com/v1" -M "gpt-4.1"
```

複数設定を `config-switch` で切り替え可能。`AGENTS.md` で出力言語やスタイルも管理します。

## ワークフローと MCP

- `~/.codex/prompts/zcf/` に 6 段階ワークフローや Git スマートコマンドを導入  
- MCP も Claude Code と同じ一覧をインストール可能（Context7 / Open Web Search / Spec Workflow など）

## クリーンアップ

```bash
# Codex 関連を選択削除
npx zcf uninstall --mode custom --items codex
```

## ヒント

- Codex 用でも `--all-lang` / `--config-lang` / `--ai-output-lang` を同様に利用可能  
- 出力スタイルは `~/.codex/prompts/output-style/` （サポートされる場合）で管理  
- 問題が起きたらバックアップから復元し、`npx zcf init -T codex --config-action merge` で再適用してください。
