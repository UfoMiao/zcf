---
title: API プロバイダープリセット
---

# API プロバイダープリセット

ZCFは、API設定を大幅に簡素化できるAPIプロバイダープリセットシステムを提供します。プリセットを使用すると、5つ以上のパラメータから2つ（プロバイダー + APIキー）に設定を減らすことができます。

## サポートされているプロバイダー

ZCFは現在、以下のAPIプロバイダープリセットをサポートしています：

| プリセットID | プロバイダー名 | 説明 | Claude Code サポート | Codex サポート | 認証方式 |
|---------|-----------|------|----------------|-----------|---------|
| `302ai` | 302.AI | エンタープライズレベルのAI APIサービス | ✅ | ✅ | `api_key` |
| `glm` | GLM (智譜AI) | 智譜AIサービス | ✅ | ✅ | `auth_token` |
| `minimax` | MiniMax | MiniMax APIサービス | ✅ | ✅ | `auth_token` |
| `kimi` | Kimi (月の暗面) | Moonshot AIサービス | ✅ | ✅ | `auth_token` |
| `custom` | カスタム | カスタムAPIエンドポイント | ✅ | ✅ | 指定必須 |

## プロバイダーの詳細

### 302.AI

**公式リンク**: [302.AI](https://share.302.ai/gAT9VG)

**特徴**:
- 🎯 エンタープライズレベルのAIリソースプラットフォーム
- 📊 従量課金
- 🔄 最新で最も包括的なAIモデルとAPIを提供
- 🌐 複数のオンラインAIアプリケーションをサポート

**設定情報**:
- **Claude Code Base URL**: `https://api.302.ai/cc`
- **Codex Base URL**: `https://api.302.ai/v1`
- **認証方式**: `api_key`
- **Codex Wire API**: `responses`

**使用例**:
```bash
# Claude Code
npx zcf init -s -p 302ai -k "sk-xxx"

# Codex
npx zcf init -s -T codex -p 302ai -k "sk-xxx"
```

### GLM (智譜AI)

**プロバイダー名**: 智譜AI (GLM)

**特徴**:
- 🇨🇳 国内AIサービス
- 💰 コストパフォーマンスが高い
- 🚀 複数のモデルをサポート
- 📚 包括的なドキュメントサポート

**設定情報**:
- **Claude Code Base URL**: `https://open.bigmodel.cn/api/anthropic`
- **Codex Base URL**: `https://open.bigmodel.cn/api/coding/paas/v4`
- **認証方式**: `auth_token`
- **Codex Wire API**: `chat`
- **Codex デフォルトモデル**: `GLM-4.6`

**使用例**:
```bash
# Claude Code
npx zcf init -s -p glm -k "your-auth-token"

# Codex
npx zcf init -s -T codex -p glm -k "your-auth-token"
```

### MiniMax

**プロバイダー名**: MiniMax

**特徴**:
- 🎯 AIモデルサービスに焦点
- 💡 複数のアプリケーションシナリオをサポート
- 🔧 柔軟な設定オプション

**設定情報**:
- **Claude Code Base URL**: `https://api.minimaxi.com/anthropic`
- **Codex Base URL**: `https://api.minimaxi.com/v1`
- **認証方式**: `auth_token`
- **Codex Wire API**: `chat`
- **Claude Code デフォルトモデル**: `MiniMax-M2`
- **Codex デフォルトモデル**: `MiniMax-M2`

**使用例**:
```bash
# Claude Code
npx zcf init -s -p minimax -k "your-auth-token"

# Codex
npx zcf init -s -T codex -p minimax -k "your-auth-token"
```

### Kimi (月の暗面)

**プロバイダー名**: Kimi / Moonshot AI

**特徴**:
- 🌙 月の暗面AIサービス
- 📝 長文処理に優れている
- 🚀 高性能モデル

**設定情報**:
- **Claude Code Base URL**: `https://api.moonshot.cn/anthropic`
- **Codex Base URL**: `https://api.moonshot.cn/v1`
- **認証方式**: `auth_token`
- **Codex Wire API**: `chat`
- **Claude Code デフォルトモデル**: `kimi-k2-0905-preview` (主), `kimi-k2-turbo-preview` (高速)
- **Codex デフォルトモデル**: `kimi-k2-0905-preview`

**使用例**:
```bash
# Claude Code
npx zcf init -s -p kimi -k "your-auth-token"

# Codex
npx zcf init -s -T codex -p kimi -k "your-auth-token"
```

### カスタム

**プロバイダー名**: カスタム

**特徴**:
- 🔧 完全にカスタマイズ可能な設定
- 🌐 任意のAPIエンドポイントをサポート
- 📝 すべてのパラメータを手動で設定する必要がある

**使用方法**:
```bash
# カスタムプロバイダーを使用（URLが必要）
npx zcf init -s -p custom -k "sk-xxx" -u "https://api.example.com/v1"

# または従来の方法を使用（プリセットなし）
npx zcf init -s -t api_key -k "sk-xxx" -u "https://api.example.com/v1"
```

## 使用方法

### 基本的な使用方法

プロバイダープリセットの使用は非常に簡単で、2つのパラメータのみが必要です：

```bash
# プロバイダープリセットを使用
npx zcf init -s -p <provider-id> -k <api-key>

# 例: 302.AIを使用
npx zcf init -s -p 302ai -k "sk-xxx"
```

### 自動設定

プリセットを使用すると、ZCFは自動的に以下を設定します：

1. ✅ **Base URL**: 正しいAPIエンドポイントを自動入力
2. ✅ **認証方式**: 認証タイプ（`api_key`または`auth_token`）を自動設定
3. ✅ **デフォルトモデル**: プロバイダーがサポートしている場合、デフォルトモデルを自動設定
4. ✅ **Codex設定**: Codexを使用している場合、`wireApi`プロトコルを自動設定

### デフォルト設定の上書き

プリセットを使用している場合でも、デフォルト設定を上書きできます：

```bash
# プリセットを使用するが、モデルを上書き
npx zcf init -s -p 302ai -k "sk-xxx" \
  -M "claude-sonnet-4-5" \
  -F "claude-haiku-4-5"

# プリセットを使用するが、URLを上書き（推奨されない、テスト時を除く）
npx zcf init -s -p 302ai -k "sk-xxx" \
  -u "https://custom.302.ai/api"
```

## マルチ設定シナリオ

### 複数のプロバイダーを設定

`--api-configs`または`--api-configs-file`を使用すると、複数のプロバイダーを同時に設定できます：

```bash
# JSON文字列を使用して複数のプロバイダーを設定
npx zcf init -s --api-configs '[
  {
    "provider": "302ai",
    "key": "sk-302ai-xxx",
    "default": true
  },
  {
    "provider": "glm",
    "key": "sk-glm-yyy"
  },
  {
    "provider": "minimax",
    "key": "sk-minimax-zzz"
  }
]'
```

### プリセットとカスタム設定の混合

```bash
# 設定ファイルの例 (api-configs.json)
{
  "configs": [
    {
      "provider": "302ai",
      "key": "sk-302ai-xxx",
      "default": true
    },
    {
      "name": "custom-api",
      "type": "api_key",
      "key": "sk-custom-xxx",
      "url": "https://custom.api.com/v1",
      "primaryModel": "claude-sonnet-4-5",
      "fastModel": "claude-haiku-4-5"
    }
  ]
}

# 設定ファイルを使用
npx zcf init -s --api-configs-file ./api-configs.json
```

## プロバイダーの切り替え

複数のプロバイダーを設定した後、いつでも切り替えることができます：

### Claude Code

```bash
# すべての設定を一覧表示
npx zcf config-switch --list

# 指定されたプロバイダーに切り替え
npx zcf config-switch 302ai-config
```

### Codex

```bash
# Codexプロバイダーを一覧表示
npx zcf config-switch --code-type codex --list

# 指定されたプロバイダーに切り替え
npx zcf config-switch glm-provider --code-type codex
```

## ベストプラクティス

### 1. プリセットを優先

可能な限りプロバイダープリセットを使用することで：
- ✅ 設定エラーを減らす
- ✅ 最新のエンドポイントを自動取得
- ✅ 設定プロセスを簡素化

```bash
# 推奨: プリセットを使用
npx zcf init -s -p 302ai -k "sk-xxx"

# 推奨されない: すべてのパラメータを手動で設定
npx zcf init -s -t api_key -k "sk-xxx" -u "https://api.302.ai/cc" -M "claude-sonnet-4-5"
```

### 2. 設定のテスト

正式に使用する前に、まず設定をテストすることを推奨します：

```bash
# 1. プリセットを使用して初期化
npx zcf init -s -p 302ai -k "test-key"

# 2. API接続をテスト
# Claude CodeまたはCodexで会話をテスト

# 3. 正常な場合、本番キーで再設定
npx zcf init -s -p 302ai -k "production-key"
```

### 3. マルチプロバイダー戦略

異なるプロジェクトに異なるプロバイダーを設定：

```bash
# プロジェクト A: 302.AI プロバイダーを使用
npx zcf config-switch 302ai-provider

# プロジェクト B: GLM プロバイダーを使用
npx zcf config-switch glm-provider

# プロジェクト C: MiniMax プロバイダーを使用
npx zcf config-switch minimax-provider
```

### 4. キーのセキュリティ

- ⚠️ **キーをバージョン管理にコミットしない**
- ✅ **環境変数を使用してキーを管理**
- ✅ **定期的にキーをローテーション**
- ✅ **最小権限の原則を使用**

```bash
# 環境変数を使用
export ZCF_API_KEY="sk-xxx"
npx zcf init -s -p 302ai -k "$ZCF_API_KEY"

# またはファイルから読み取る（ファイルの権限が正しいことを確認）
npx zcf init -s -p 302ai -k "$(cat ~/.zcf/api-key)"
```

## トラブルシューティング

### プロバイダーがサポートされていない

サポートされていないプロバイダーIDを使用している場合：

```bash
# エラーメッセージにすべての有効な値が表示されます
npx zcf init -s -p invalid-provider -k "sk-xxx"
# エラー: Invalid provider 'invalid-provider'. Valid providers: 302ai, glm, minimax, kimi, custom
```

### 認証失敗

認証が失敗した場合：

1. **APIキーの形式を確認**: キーの形式が正しいことを確認
2. **認証方式を確認**: 正しい認証タイプを使用していることを確認
3. **エンドポイントURLを確認**: エンドポイントURLが正しいことを確認

```bash
# 設定を確認
cat ~/.claude/settings.json | jq .env.ANTHROPIC_API_KEY
cat ~/.codex/config.toml | grep apiKey
```

### モデルが利用できない

デフォルトモデルが利用できない場合：

```bash
# デフォルトモデルを上書き
npx zcf init -s -p 302ai -k "sk-xxx" -M "claude-sonnet-4-5"

# または設定ファイルを手動で編集
vim ~/.claude/settings.json
```

## 関連リソース

- [クイックスタート](../getting-started/installation.md) - インストールと初期化ガイド
- [設定管理](configuration.md) - 詳細な設定管理
- [設定切り替え](../cli/config-switch.md) - マルチ設定切り替えコマンド

> 💡 **ヒント**: APIプロバイダープリセットを使用すると、設定プロセスを大幅に簡素化できます。可能な限りプリセットを優先し、必要な場合にのみカスタム設定を使用することを推奨します。最新の設定情報を取得するために、定期的にプロバイダーのドキュメントを確認してください。





