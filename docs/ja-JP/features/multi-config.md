---
title: 複数設定とバックアップ
---

# 複数設定とバックアップ

ZCF は、複数の設定プロファイルを並行管理し、バックアップ/復元を自動化する包括的なメカニズムを提供します。仕事用と個人用、検証用などを素早く切り替えられます。

## 複数設定システム

### 設定の階層

ZCF の設定システムは以下の階層に分かれています：

1. **グローバル設定**（`~/.ufomiao/zcf/config.toml`）- ZCF 自体の設定
2. **Claude Code 設定**（`~/.claude/settings.json`）- Claude Code 実行設定
3. **Codex 設定**（`~/.codex/config.toml`）- Codex 実行設定
4. **CCR 設定**（`~/.claude-code-router/config.json`）- CCR プロキシ設定

### 設定管理と切替

ZCF はこれらの設定を作成、管理、切り替えるための強力な CLI ツールを提供します。

- **設定作成**：`zcf init` コマンドを使用して初期化時に複数の API プロバイダーを設定できます。
- **設定切替**：`zcf config-switch` コマンドを使用して、異なる環境、プロジェクト、プロバイダー間を素早く切り替えます。

👉 **詳細なコマンドの使用方法については、以下を参照してください：**
- **[設定切替コマンド (config-switch)](../cli/config-switch.md)**
- **[初期化コマンド (init)](../cli/init.md)**

## バックアップシステム

ZCF は設定変更のたびにタイムスタンプ付きバックアップを自動作成し、設定の安全性と回復可能性を確保します。

### バックアップ保存場所

設定タイプごとに異なる場所にバックアップされます：

| 設定タイプ | バックアップディレクトリ | ファイル形式 |
|---------|---------|------------|
| **Claude Code** | `~/.claude/backup/` | `settings.json.{timestamp}.bak` |
| **Codex 完全** | `~/.codex/backup/` | `config.toml.{timestamp}.bak` |
| **Codex 設定** | `~/.codex/backup/` | `config.toml.{timestamp}.bak` |
| **Codex Agents** | `~/.codex/backup/` | `agents.{timestamp}.tar.gz` |
| **Codex Prompts** | `~/.codex/backup/` | `prompts.{timestamp}.tar.gz` |
| **CCR** | `~/.claude-code-router/` | `config.json.{timestamp}.bak` |
| **CCometixLine** | `~/.cometix/backup/` | `config.{timestamp}.bak` |
| **ZCF グローバル** | `~/.ufomiao/zcf/backup/` | `config.toml.{timestamp}.bak` |

### 自動バックアップのトリガー

以下の操作時に自動的にバックアップが作成されます：

1. **初期化**：初回設定または再初期化
2. **設定更新**：`zcf update` によるワークフローまたはテンプレートの更新
3. **設定切替**：`config-switch` による設定切替
4. **API 変更**：API キーまたはプロバイダーの更新
5. **ワークフロー**：ワークフローテンプレートのインポートまたは更新
6. **MCP 設定**：MCP サービス設定の変更

### バックアップの復元

以前の設定に戻す必要がある場合：

1. **バックアップを探す**：対応するバックアップディレクトリでタイムスタンプ付きファイルを見つける
2. **復元する**：手動でバックアップファイルを元の場所にコピーするか、`zcf init` のマージ機能を使用する

## 増分管理

既存の設定が検出された場合、ZCF は管理戦略の選択を求めます：

- **backup**：既存設定をバックアップしてから新しい設定をマージ（推奨）
- **merge**：新しい設定を既存設定に直接マージ
- **new**：新しい設定を作成し、古い設定を保持
- **skip**：この操作をスキップし、既存設定を保持

## ベストプラクティス

### バージョン管理戦略

チームコラボレーションの場合、設定をバージョン管理（Git）に含めることをお勧めしますが、**API キーを含む設定ファイルは必ず除外してください**。

### Git Worktree 統合

Git Worktree を使用して、異なるワークスペース間で設定を同期します。`config-switch` コマンドと組み合わせることで、機能ブランチごとに異なる API 設定（例：テスト環境 vs 本番環境）を使用できます。

### 設定のクリーンアップ

ディスク容量を節約するために、古いバックアップを定期的にクリーンアップすることをお勧めします。最近 7〜30 日間のバックアップを保持すれば通常は十分です。

## もっと詳しく

- [設定管理](../advanced/configuration.md) - 詳細な設定管理ガイド
- [API プロバイダープリセット](../advanced/api-providers.md) - 事前設定された API プロバイダー
