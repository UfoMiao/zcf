---
title: MCP サービス統合
---

# MCP サービス統合

ZCF には代表的な MCP (Model Context Protocol) サービスの設定が同梱されており、メニューまたは `--mcp-services` で一括インストールできます。

## MCP とは

AI アシスタントが外部ツール・サービスへアクセスするためのプロトコル。ドキュメント検索、Web 検索、ブラウザ操作、コード検索などを拡張できます。

## 同梱サービス

| ID | 種別 | 説明 | API Key |
|----|-----|------|---------|
| `context7` | stdio | ライブラリドキュメント/コードサンプル検索 | 不要 |
| `open-websearch` | stdio | DuckDuckGo/Bing/Brave 検索 | 不要 |
| `spec-workflow` | stdio | 要件～設計の構造化支援 | 不要 |
| `mcp-deepwiki` | stdio | GitHub ドキュメント取得 | 不要 |
| `Playwright` | stdio | ブラウザ自動操作 | 不要 |
| `exa` | stdio | Exa AI Web 検索 | 要 `EXA_API_KEY` |
| `serena` | uvx | IDE 風コード検索/編集支援 | 不要 |

## インストール方法

- **インタラクティブ**：`npx zcf` → 4 (Configure MCP) で選択  
- **CLI**：

```bash
npx zcf i -s --mcp-services all
npx zcf i -s --mcp-services context7,open-websearch,spec-workflow
npx zcf i -s --mcp-services skip   # 導入しない
```

## 環境変数

API Key が必要なサービスは環境変数を設定：

```bash
export EXA_API_KEY="your-api-key"
```

## 設定ファイル

- **Claude Code**：`~/.claude/settings.json` の `mcpServers`  
- **Codex**：`~/.codex/config.toml` の `mcp_server.*`

Windows ではパス形式を自動修正します。

## 接続確認

1. IDE の MCP パネルでステータスが Connected か確認  
2. テストプロンプト例：
   - Context7: 「React hooks の最新ドキュメントを調べて」  
   - Open Web Search: 「TypeScript 5.0 の新機能を検索して」  
   - DeepWiki: 「vuejs/core リポジトリの Composition API ドキュメントを取得」  

## トラブルシュート

- 未接続：`npx zcf` → 4 で再設定、設定ファイルを確認  
- API Key エラー：環境変数を確認しターミナルを再起動  
- Windows パス問題：`npx zcf` → 4 を再実行して修正

## ベストプラクティス

1. 必要なサービスだけ導入しリソース消費を抑える  
2. `npx zcf update` で設定を定期更新  
3. 環境変数は `.env` などで管理し、導入後に動作テストを行う  
4. 新規サービスを手動追加した場合でも、`npx zcf i` でマージ戦略を選べます。
