---
title: CodeBuddy サポート
---

# CodeBuddy サポート

[CodeBuddy](https://codebuddy.ai) は、ローカルの設定ディレクトリを通じて動作する AI コーディングエージェントです。ZCF は Claude Code や Codex と同じ設定パターンを使用して CodeBuddy サポートを追加し、1 つのコマンドで CodeBuddy のセットアップや切り替えを行えます。

## 主な機能

- **統合ツール切り替え**: ZCF メニューまたは CLI から Claude Code、Codex、CodeBuddy を切り替え
- **プロファイルベースの API 設定**: 複数の API プロファイルを保存して切り替え
- **MCP サービス統合**: `~/.codebuddy/.mcp.json` で MCP サーバーのインストールと管理
- **多言語対応**: `CODEBUDDY.md` で AI 出力言語を設定
- **バックアップ安全性**: MCP 設定変更時にタイムスタンプ付きバックアップを作成

## インストールと初期化

### CodeBuddy を初期化

```bash
# 対話式初期化
npx zcf
# S（コードツールを切り替え）→ CodeBuddy → 完全初期化 を選択

# 非対話式初期化
npx zcf i -s -T codebuddy --api-type api_key --api-key "sk-xxx" --api-url "https://api.example.com"
```

### プロバイダープリセットを使用して初期化

```bash
npx zcf i -s -T codebuddy -p 302ai -k "sk-xxx"
```

## 設定ファイル

ZCF は以下の CodeBuddy 設定構造を作成します：

```
~/.codebuddy/
├── settings.json        # API キー、ベース URL、モデル環境変数
├── .mcp.json            # MCP サーバー設定
├── CODEBUDDY.md         # グローバルメモリ / 言語指令
└── backup/              # タイムスタンプ付き MCP バックアップ
```

### `settings.json` 環境変数

ZCF は API 設定を `settings.json` の `env` セクションに書き込みます：

| 変数 | 説明 |
|------|------|
| `ANTHROPIC_API_KEY` | API キー認証 |
| `ANTHROPIC_AUTH_TOKEN` | 認証トークン |
| `ANTHROPIC_BASE_URL` | カスタム API ベース URL |
| `ANTHROPIC_MODEL` | プライマリモデル |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | デフォルト Haiku モデル |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | デフォルト Sonnet モデル |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | デフォルト Opus モデル |

## MCP サービス統合

CodeBuddy は Claude Code および Codex と同じ MCP サービスを使用します：

```bash
# すべての MCP サービスを非対話式でインストール
npx zcf i -s -T codebuddy --mcp-services all

# 選択的インストール
npx zcf i -s -T codebuddy --mcp-services context7,exa

# メニューから設定
npx zcf → CodeBuddy → MCP の設定
```

MCP サーバーは `~/.codebuddy/.mcp.json` に保存されます。

## マルチプロバイダー設定

CodeBuddy 用に複数の API プロファイルを定義できます：

```bash
npx zcf i -s -T codebuddy --api-configs '[
  {"provider":"302ai","key":"sk-xxx","default":true},
  {"name":"custom","type":"api_key","key":"sk-yyy","url":"https://custom.api.com"}
]'
```

対話式にプロファイルを切り替え：

```bash
npx zcf config-switch -T codebuddy
```

## よく使う操作

### CodeBuddy 設定を更新

```bash
npx zcf update -T codebuddy
```

### 更新を確認

```bash
npx zcf check-updates -T codebuddy
```

### CodeBuddy をアンインストール

```bash
npx zcf uninstall -T codebuddy
```

アンインストールは MCP 設定を削除し、`settings.json` から API キーをクリアします。

## Claude Code および Codex との比較

| 機能 | Claude Code | Codex | CodeBuddy |
|------|------------|-------|-----------|
| 設定ファイル | `~/.claude/settings.json` | `~/.codex/config.toml` | `~/.codebuddy/settings.json` |
| メモリファイル | `CLAUDE.md` | `AGENTS.md` | `CODEBUDDY.md` |
| MCP 設定 | `.claude.json` / `settings.json` | `config.toml` | `.mcp.json` |
| API 設定 | 認証トークン / API キー / CCR プロキシ | プロバイダー + API キー | 認証トークン / API キー |
| マルチプロバイダー | ✅ | ✅ | ✅ |

## 備考

- CodeBuddy サポートは現在アダプターベースです：ZCF が設定ファイルを管理し、CodeBuddy が実行時に読み取ります。
- CodeBuddy から切り替える際、ZCF はデフォルトで現在のツールを `claude-code` に戻します。
- メニューシステムには CodeBuddy 専用のオプションが用意されています。不足しているメニュー操作があればフィードバックしてください。
