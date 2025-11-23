---
title: zcf init
---

# zcf init

`zcf init`（省略形 `zcf i`）は ZCF のコアコマンドで、Claude Code または Codex 環境を完全に初期化するために使用されます。必要なツールのインストール、API の設定、MCP サービスの設定、ワークフローと出力スタイルのインポートなどを自動的に実行します。

## 機能概要

`zcf init` コマンドは以下の操作を実行します：

1. 📦 **コードツールのインストール**：Claude Code または Codex CLI を自動検出してインストール
2. 🔑 **API の設定**：API キー、認証方式、モデルなどを設定
3. 🔌 **MCP サービスの設定**：選択した MCP サービスのインストールと設定
4. 📋 **ワークフローのインポート**：構造化開発ワークフローテンプレートをインストール
5. 🎨 **出力スタイルの設定**：AI 出力スタイルとシステムプロンプトを設定
6. 🌐 **言語設定**：テンプレート言語と AI 出力言語を設定
7. 📊 **ステータスバーのインストール**：オプションで CCometixLine ステータスバーツールをインストール
8. 💾 **バックアップの作成**：設定を変更する前に自動的にバックアップを作成

## 基本的な使用方法

### 対話式モード（推奨）

```bash
# 対話式初期化ウィザードを開く
npx zcf init

# または省略形を使用
npx zcf i

# またはメインメニューから
npx zcf
# 次に 1 (完全初期化) を選択
```

対話式モードでは、ZCF が段階的に案内します：

1. コードツールタイプを選択（Claude Code または Codex）
2. 設定処理方法を選択（既存の設定がある場合）
3. API を設定（公式ログイン、カスタム API、CCR プロキシ、またはスキップ）
4. MCP サービスを選択
5. ワークフローを選択
6. 出力スタイルを選択
7. 言語オプションを設定

### 非対話式モード

自動化スクリプト、CI/CD、または一括展開に適しています：

```bash
# API プロバイダープリセットを使用（最も簡単）
npx zcf i -s -p 302ai -k "sk-xxx"

# 完全なパラメータ例
npx zcf i -s \
  --provider 302ai \
  --api-key "sk-xxx" \
  --code-type claude-code \
  --all-lang zh-CN \
  --mcp-services all \
  --workflows all \
  --output-styles all \
  --default-output-style engineer-professional
```

## よく使うパラメータ

### 言語パラメータ

| パラメータ | 省略形 | 説明 | オプション値 | デフォルト値 |
|------|------|------|--------|--------|
| `--all-lang, -g` | `-g` | すべての言語パラメータを統一設定 | `zh-CN`, `en`, カスタム文字列 | ユーザー設定または `en` |
| `--lang, -l` | `-l` | ZCF インターフェース表示言語 | `zh-CN`, `en` | ユーザー設定または `en` |
| `--config-lang, -c` | `-c` | テンプレートファイル言語 | `zh-CN`, `en` | `en` |
| `--ai-output-lang, -a` | `-a` | AI アシスタント出力言語 | `zh-CN`, `en`, カスタム文字列 | `en` |

> 💡 **ヒント**：`--all-lang` を使用すると、すべての言語パラメータを一度に設定でき、最も便利な方法です。

**言語パラメータの優先順位**（高から低）：
1. `--all-lang` 
2. `--lang` / `--config-lang` / `--ai-output-lang`
3. ユーザーが保存した設定
4. 対話プロンプト

### コードツールタイプ

| パラメータ | 省略形 | 説明 | オプション値 |
|------|------|------|--------|
| `--code-type, -T` | `-T` | 対象コードツールタイプ | `claude-code`, `codex`, `cc`, `cx` |

```bash
# Claude Code を初期化（デフォルト）
npx zcf i

# Codex を初期化
npx zcf i -T codex

# 省略形を使用
npx zcf i -T cx
```

### API 設定パラメータ

#### API プロバイダープリセット（推奨）

ZCF は API プロバイダープリセットをサポートし、設定を大幅に簡素化できます：

| パラメータ | 省略形 | 説明 | サポートされるプロバイダー |
|------|------|------|------------|
| `--provider, -p` | `-p` | API プロバイダープリセット | `302ai`, `glm`, `minimax`, `kimi`, `custom` |

```bash
# 302.AI プロバイダーを使用
npx zcf i -s -p 302ai -k "sk-xxx"

# GLM プロバイダーを使用
npx zcf i -s -p glm -k "sk-xxx"

# MiniMax プロバイダーを使用
npx zcf i -s -p minimax -k "sk-xxx"

# Kimi プロバイダーを使用
npx zcf i -s -p kimi -k "sk-xxx"

# カスタムプロバイダーを使用（URL が必要）
npx zcf i -s -p custom -k "sk-xxx" -u "https://api.example.com"
```

#### 従来の API 設定パラメータ

| パラメータ | 省略形 | 説明 | 例 |
|------|------|------|------|
| `--api-type, -t` | `-t` | API 設定タイプ | `auth_token`, `api_key`, `ccr_proxy`, `skip` |
| `--api-key, -k` | `-k` | API キーまたは認証トークン | `sk-ant-xxx` |
| `--api-url, -u` | `-u` | カスタム API URL | `https://api.example.com/v1` |
| `--api-model, -M` | `-M` | メイン API モデル | `claude-sonnet-4-5` |
| `--api-fast-model, -F` | `-F` | 高速 API モデル（Claude Code のみ） | `claude-haiku-4-5` |

```bash
# API Key を使用
npx zcf i -s -t api_key -k "sk-ant-xxx"

# Auth Token を使用（公式ログイン）
npx zcf i -s -t auth_token -k "your-auth-token"

# CCR プロキシを使用
npx zcf i -s -t ccr_proxy

# API 設定をスキップ
npx zcf i -s -t skip

# カスタムモデルを設定
npx zcf i -s -t api_key -k "sk-xxx" -M "claude-sonnet-4-5" -F "claude-haiku-4-5"
```

#### 複数 API 設定

複数の API を同時に設定でき、切替が容易です：

```bash
# JSON 文字列を使用
npx zcf i -s --api-configs '[
  {
    "provider": "302ai",
    "key": "sk-xxx",
    "default": true
  },
  {
    "provider": "glm",
    "key": "sk-yyy"
  },
  {
    "name": "custom",
    "type": "api_key",
    "key": "sk-zzz",
    "url": "https://custom.api.com",
    "primaryModel": "claude-sonnet-4-5",
    "fastModel": "claude-haiku-4-5"
  }
]'

# JSON ファイルを使用
npx zcf i -s --api-configs-file ./api-configs.json
```

### MCP サービス設定

| パラメータ | 省略形 | 説明 | オプション値 |
|------|------|------|--------|
| `--mcp-services, -m` | `-m` | インストールする MCP サービス | `context7`, `open-websearch`, `spec-workflow`, `mcp-deepwiki`, `Playwright`, `exa`, `serena`, `all`, `skip` |

```bash
# すべての MCP サービスをインストール
npx zcf i -s -m all

# 特定のサービスをインストール（カンマ区切り）
npx zcf i -s -m context7,open-websearch,spec-workflow

# MCP サービスインストールをスキップ
npx zcf i -s -m skip
```

### ワークフロー設定

| パラメータ | 省略形 | 説明 | オプション値 |
|------|------|------|--------|
| `--workflows, -w` | `-w` | インストールするワークフロー | `commonTools`, `sixStepsWorkflow`, `featPlanUx`, `gitWorkflow`, `bmadWorkflow`, `all`, `skip` |

```bash
# すべてのワークフローをインストール
npx zcf i -s -w all

# 特定のワークフローをインストール
npx zcf i -s -w sixStepsWorkflow,gitWorkflow

# ワークフローインストールをスキップ
npx zcf i -s -w skip
```

> ⚠️ **注意**：Codex は現在 `sixStepsWorkflow` と `gitWorkflow` のみをサポートしており、他のワークフローは Codex ではまだ提供されていません。

### 出力スタイル設定

| パラメータ | 省略形 | 説明 | オプション値 |
|------|------|------|--------|
| `--output-styles, -o` | `-o` | インストールする出力スタイル | `engineer-professional`, `nekomata-engineer`, `laowang-engineer`, `ojousama-engineer`, `all`, `skip` |
| `--default-output-style, -d` | `-d` | デフォルト出力スタイル | 出力スタイルオプションと同じ、さらに組み込みスタイル：`default`, `explanatory`, `learning` |

```bash
# すべての出力スタイルをインストール
npx zcf i -s -o all

# 特定のスタイルをインストール
npx zcf i -s -o engineer-professional,nekomata-engineer

# デフォルト出力スタイルを設定
npx zcf i -s -o all -d engineer-professional

# 出力スタイルインストールをスキップ
npx zcf i -s -o skip
```

### その他の設定オプション

| パラメータ | 省略形 | 説明 | オプション値 |
|------|------|------|--------|
| `--skip-prompt, -s` | `-s` | すべての対話プロンプトをスキップ（非対話モード） | - |
| `--config-action, -r` | `-r` | 設定処理方法 | `new`, `backup`, `merge`, `docs-only`, `skip` |
| `--install-cometix-line, -x` | `-x` | CCometixLine をインストールするか | `true`, `false` |

```bash
# 非対話モード
npx zcf i -s -p 302ai -k "sk-xxx"

# 設定処理方法
npx zcf i -s --config-action backup  # バックアップ後に上書き（デフォルト）
npx zcf i -s --config-action merge   # 設定をマージ
npx zcf i -s --config-action new     # 新しい設定を作成
npx zcf i -s --config-action docs-only  # ドキュメントのみ更新
npx zcf i -s --config-action skip    # 設定をスキップ

# CCometixLine インストールを制御
npx zcf i -s -x true   # インストール（デフォルト）
npx zcf i -s -x false  # インストールしない
```

## 完全な例

### シナリオ 1：Claude Code を初めて使用

```bash
# 対話式初期化（初回使用に推奨）
npx zcf init

# またはメインメニューを使用
npx zcf
# 1 (完全初期化) を選択
```

### シナリオ 2：302.AI プロバイダーで高速初期化

```bash
npx zcf i -s -p 302ai -k "sk-xxx" -g zh-CN
```

### シナリオ 3：Codex 完全初期化

```bash
npx zcf i -s \
  -T codex \
  -p 302ai \
  -k "sk-xxx" \
  -g zh-CN \
  -m all \
  -w all
```

### シナリオ 4：複数の API プロバイダーを設定

```bash
# api-configs.json ファイルを作成
cat > api-configs.json << EOF
[
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
    "name": "custom",
    "type": "api_key",
    "key": "sk-custom-zzz",
    "url": "https://custom.api.com",
    "primaryModel": "claude-sonnet-4-5"
  }
]
EOF

# 設定ファイルを使用して初期化
npx zcf i -s --api-configs-file ./api-configs.json -g zh-CN
```

### シナリオ 5：ドキュメントとテンプレートのみ更新

```bash
npx zcf i -s --config-action docs-only -g zh-CN
```

### シナリオ 6：CCR プロキシを使用

```bash
npx zcf i -s -t ccr_proxy -g zh-CN -m all -w all
```

## 設定処理戦略

既存の設定が検出された場合、ZCF は処理戦略を尋ねます：

| 戦略 | 説明 | 適用シナリオ |
|------|------|---------|
| `backup` | 既存設定をバックアップしてから上書き | 推奨デフォルトオプション、安全で信頼性が高い |
| `merge` | 新しい設定を既存設定にマージ | カスタム内容を保持する必要がある場合 |
| `new` | 新しい設定を作成し、古い設定を保持 | 複数の設定を同時に保持する必要がある場合 |
| `docs-only` | ドキュメントとプロンプトのみ更新 | テンプレートのみ更新する必要がある場合 |
| `skip` | 現在のステップをスキップ | その設定を変更する必要がない場合 |

## 実行フロー

`zcf init` の実行フローは以下のとおりです：

1. **Banner を表示**：ZCF バージョン情報とツールタイプを表示
2. **言語設定を解析**：パラメータに基づいて i18n 言語を設定
3. **パラメータを検証**：パラメータの有効性と相互排他性を確認
4. **コードツールを選択**：Claude Code または Codex を決定
5. **既存設定を処理**：戦略に基づいて既存設定を処理
6. **API を設定**：API キー、認証方式などを設定
7. **MCP を設定**：MCP サービスのインストールと設定
8. **ワークフローをインポート**：ワークフローテンプレートをインストール
9. **出力スタイルを設定**：AI 出力スタイルを設定
10. **ステータスバーをインストール**：オプションで CCometixLine をインストール
11. **設定を保存**：ZCF グローバル設定を更新

## トラブルシューティング

### 初期化の失敗

初期化が失敗した場合：

1. **Node.js バージョンを確認**：Node.js >= 18 であることを確認
2. **権限を確認**：設定ディレクトリへの書き込み権限があることを確認
3. **ネットワークを確認**：npm registry と API サービスにアクセスできることを確認

```bash
# Node.js バージョンを確認
node --version

# 権限を確認
ls -la ~/.claude ~/.codex

# 必要に応じてディレクトリを手動で作成し、権限を設定
mkdir -p ~/.claude ~/.codex
```

### API 設定が有効にならない

API 設定後に使用できない場合：

1. **設定ファイルを確認**：設定が正しく書き込まれていることを確認
2. **API キーを検証**：API キーが有効であることを確認
3. **アプリケーションを再起動**：Claude Code または Codex を再起動して設定を読み込む

```bash
# Claude Code 設定を確認
cat ~/.claude/settings.json | grep -A 5 apiKeys

# Codex 設定を確認
cat ~/.codex/config.toml | grep -A 5 modelProvider
```

### ワークフローがインポートされない

ワークフローがインポートされない場合：

```bash
# ワークフローを再インポート
npx zcf update

# ワークフローディレクトリを確認
ls -la ~/.claude/workflows/
ls -la ~/.codex/prompts/
```

## 関連リソース

- [クイックスタート](../getting-started/installation.md) - 完全なインストールガイド
- [API プロバイダープリセット](../advanced/api-providers.md) - プロバイダーの詳細情報
- [設定管理](../features/multi-config.md) - 複数設定とバックアップシステム
- [MCP サービス](../features/mcp.md) - MCP サービスの詳細な紹介

> 💡 **ヒント**：初回使用時は対話式モード（`-s` パラメータなし）を使用することをお勧めします。これにより、各オプションの意味をよりよく理解できます。慣れたら、非対話式モードを使用して効率を向上させることができます。
