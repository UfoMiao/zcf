---
title: CCR プロキシ管理
---

# CCR プロキシ管理

`zcf ccr` は Claude Code Router（CCR）の完全な管理メニューを提供し、インストール、設定、サービス制御、Web UI アクセスなどの機能を含みます。

## コマンド形式

```bash
# CCR 管理メニューを開く
npx zcf ccr

# またはメインメニューからアクセス
npx zcf
# 次に R. CCR 管理 を選択
```

## メニューオプション

`zcf ccr` を実行すると、以下のメニューが表示されます：

```
═══════════════════════════════════════════════════
  CCR 管理メニュー
═══════════════════════════════════════════════════

  1. CCR を初期化 - CCR をインストールして設定
  2. UI を起動 - CCR Web インターフェースを起動
  3. 状態を確認 - 現在の CCR サービス状態を表示
  4. サービスを再起動 - CCR サービスを再起動
  5. サービスを起動 - CCR サービスを起動
  6. サービスを停止 - CCR サービスを停止
  0. メインメニューに戻る
```

## 機能の詳細

### 1. CCR を初期化

**機能**：CCR を初回設定または再設定

**プロセス**：
1. CCR CLI ツールがインストールされているか自動検出
2. 未インストールの場合、`@musistudio/claude-code-router` を自動インストール
3. 設定ウィザードを案内：
   - プロバイダープリセットを選択（302.AI、GLM、MiniMax、Kimi など）
   - API キーを設定（必要に応じて）
   - デフォルトモデルを選択
   - 設定ファイル `~/.claude-code-router/config.json` を作成
4. Claude Code が CCR プロキシを使用するように自動設定
5. 既存の設定をバックアップ（存在する場合）

**使用シナリオ**：
- CCR を初めて使用する場合
- プロバイダーを変更または再設定する必要がある場合
- 設定が失われて再設定が必要な場合

**例**：
```bash
npx zcf ccr
# 1 を選択
# プロンプトに従って設定を完了
```

### 2. UI を起動

**機能**：CCR Web 管理インターフェースを起動

**アクセスアドレス**：`http://localhost:3456/ui`（デフォルトポート）

**Web UI 機能**：
- 📊 リアルタイム使用統計とコスト分析
- ⚙️ ルーティングルール設定
- 🔧 モデル管理（追加、編集、削除）
- 📈 詳細な使用量統計
- 🔄 サービス制御（起動、停止、再起動）

**前提条件**：
- まず CCR 初期化（オプション 1）を完了する必要がある
- 設定ファイル `~/.claude-code-router/config.json` が存在する必要がある

**API キー**：
- UI 起動時に CCR API キーが表示される（デフォルト：`sk-zcf-x-ccr`）
- このキーを使用して Web UI にログイン

**例**：
```bash
npx zcf ccr
# 2 を選択
# サービス起動後、http://localhost:3456/ui にアクセス
```

### 3. 状態を確認

**機能**：CCR サービスの現在の実行状態を表示

**表示情報**：
- サービスが実行されているか
- 実行ポート
- 設定されたプロバイダー数
- ルーティングルールのサマリー

**使用シナリオ**：
- サービスが正常に起動したか検証
- 接続問題のトラブルシューティング
- 現在の設定状態を確認

**例**：
```bash
npx zcf ccr
# 3 を選択
```

### 4. サービスを再起動

**機能**：CCR サービスを再起動し、設定を再読み込み

**使用シナリオ**：
- 設定ファイルを変更した後、再読み込みが必要
- サービス異常で再起動が必要
- ポート競合後に再起動が必要

**例**：
```bash
npx zcf ccr
# 4 を選択
```

### 5. サービスを起動

**機能**：CCR サービスを起動

**使用シナリオ**：
- サービス停止後に再起動が必要
- システム再起動後にサービスを起動

**例**：
```bash
npx zcf ccr
# 5 を選択
```

### 6. サービスを停止

**機能**：現在実行中の CCR サービスを停止

**使用シナリオ**：
- CCR プロキシを一時停止する必要がある場合
- デバッグ時にサービスを停止する必要がある場合
- 設定を変更する前にサービスを停止

**例**：
```bash
npx zcf ccr
# 6 を選択
```

## ルーティング設定

CCR は Web UI または設定ファイルを通じて柔軟なルーティング設定をサポートします。設定ファイルは `~/.claude-code-router/config.json` にあり、JSON 形式を使用します。

### 完全な設定例

```json
{
  "LOG": true,
  "HOST": "127.0.0.1",
  "PORT": 3456,
  "APIKEY": "sk-zcf-x-ccr",
  "API_TIMEOUT_MS": "600000",
  "PROXY_URL": "",
  "Providers": [
    {
      "name": "openrouter",
      "api_base_url": "https://openrouter.ai/api/v1/chat/completions",
      "api_key": "sk-xxx",
      "models": [
        "google/gemini-2.5-pro-preview",
        "anthropic/claude-sonnet-4",
        "anthropic/claude-3.5-sonnet"
      ],
      "transformer": {
        "use": ["openrouter"]
      }
    },
    {
      "name": "deepseek",
      "api_base_url": "https://api.deepseek.com/v1/chat/completions",
      "api_key": "sk-xxx",
      "models": ["deepseek-chat", "deepseek-reasoner"],
      "transformer": {
        "use": ["deepseek"],
        "deepseek-chat": {
          "use": ["tooluse"]
        }
      }
    },
    {
      "name": "ollama",
      "api_base_url": "http://localhost:11434/v1/chat/completions",
      "api_key": "ollama",
      "models": ["qwen2.5-coder:latest"],
      "transformer": {
        "use": ["ollama"]
      }
    },
    {
      "name": "gemini",
      "api_base_url": "https://generativelanguage.googleapis.com/v1beta/models/",
      "api_key": "sk-xxx",
      "models": ["gemini-2.5-flash", "gemini-2.5-pro"],
      "transformer": {
        "use": ["gemini"]
      }
    }
  ],
  "Router": {
    "default": "openrouter,google/gemini-2.5-pro-preview",
    "background": "deepseek,deepseek-chat",
    "think": "deepseek,deepseek-reasoner",
    "longContext": "openrouter,anthropic/claude-sonnet-4",
    "longContextThreshold": 60000,
    "webSearch": "gemini,gemini-2.5-flash"
  }
}
```

### 設定フィールドの説明

#### 基本設定

| フィールド | 型 | 説明 | デフォルト |
|------|------|------|--------|
| `LOG` | boolean | ログを有効にするか | `true` |
| `HOST` | string | サービスリッスンアドレス | `127.0.0.1` |
| `PORT` | number | サービスポート | `3456` |
| `APIKEY` | string | CCR API キー | `sk-zcf-x-ccr` |
| `API_TIMEOUT_MS` | string | API タイムアウト（ミリ秒） | `600000` |
| `PROXY_URL` | string | プロキシ URL（オプション） | `""` |

#### プロバイダー設定（Providers）

`Providers` は配列で、各プロバイダーは以下を含みます：

| フィールド | 型 | 説明 |
|------|------|------|
| `name` | string | プロバイダー名（ルーティングルールで使用） |
| `api_base_url` | string | API ベース URL |
| `api_key` | string | API キー（無料モデルは `sk-free` を使用可） |
| `models` | string[] | このプロバイダーがサポートするモデルリスト |
| `transformer` | object | オプションのリクエスト変換器（API 互換性用） |

#### ルーター設定（Router）

`Router` は異なるシナリオでのモデルルーティングルールを定義します。形式：`${providerName},${modelName}`

| フィールド | 型 | 説明 |
|------|------|------|
| `default` | string | デフォルトルート（形式：`provider,model`） |
| `background` | string | バックグラウンドタスクルート（オプション） |
| `think` | string | 思考タスクルート（オプション） |
| `longContext` | string | 長いコンテキストタスクルート（オプション） |
| `longContextThreshold` | number | 長いコンテキストのトークン閾値（オプション） |
| `webSearch` | string | Web 検索タスクルート（オプション） |

## プロバイダープリセット

ZCF は複数の CCR プロバイダープリセットをサポートし、設定プロセスを簡素化します：

```bash
npx zcf ccr
# 1. CCR を初期化 を選択
# プロバイダープリセットを選択
```

サポートされているプリセット：
- **302.AI**：エンタープライズグレードの AI サービス
- **GLM**：Zhipu AI
- **MiniMax**：MiniMax AI サービス
- **カスタム**：カスタムプロバイダーを設定

## よくある質問

### Q: 「CCR が設定されていません」と表示される場合は？

A: まずオプション 1（CCR を初期化）を実行して設定を完了する必要があります。

### Q: Web UI にアクセスできない？

A: 
1. UI が起動されていることを確認（オプション 2）
2. ポート 3456 が使用されていないか確認
3. API キー `sk-zcf-x-ccr` でログイン（または設定の `APIKEY` を確認）

### Q: ルーティングルールを変更するには？

A: Web UI または `~/.claude-code-router/config.json` ファイルを直接編集して変更できます。変更後、サービスを再起動します。

### Q: サービス起動に失敗する？

A: 
1. 設定ファイルの形式が正しいか確認
2. ポートが使用されていないか確認：`lsof -i :3456`（macOS/Linux）または `netstat -ano | findstr :3456`（Windows）
3. `@musistudio/claude-code-router` が正しくインストールされているか確認
4. エラーログを確認するか、`ccr status` コマンドを使用

### Q: 複数のモデルを設定するには？

A: `Providers` 配列に複数のプロバイダー設定を追加し、`Router` で異なるシナリオに使用するモデルを指定します。

## 関連ドキュメント

- [CCR 機能の詳細](../features/ccr.md) - CCR の主な利点
- [トラブルシューティング](../advanced/troubleshooting.md) - 一般的な問題を解決
