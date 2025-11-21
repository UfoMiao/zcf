---
title: トラブルシューティング
---

# トラブルシューティング

ZCF 利用時によく遭遇する問題と解決策を簡潔にまとめました。詳細な手順は各セクションのコマンドを順に実行してください。

## 主なカテゴリ

- [初期化](#初期化)
- [API 設定](#api-設定)
- [ワークフロー](#ワークフロー)
- [MCP サービス](#mcp-サービス)
- [Codex 関連](#codex-関連)
- [CCR 関連](#ccr-関連)
- [設定/バックアップ](#設定バックアップ)
- [プラットフォーム別](#プラットフォーム別)

## 初期化

### 初期化が失敗・停止する

原因：Node.js 22 未満、権限不足、ネットワーク不安定、MCP インストールで停止。  
対処：

```bash
node --version                # 22 以上を確認
mkdir -p ~/.claude ~/.codex ~/.ufomiao/zcf && chmod 755 ~/.claude ~/.codex ~/.ufomiao/zcf
npx zcf init -s -m skip       # MCP をスキップして確認
ping npmjs.com                # ネットワーク確認
```

### 初期化が途中で中断した

```bash
rm -rf ~/.claude/backup/latest
ls -la ~/.claude/backup/       # 直近バックアップがあれば復元
npx zcf init --config-action backup
```

## API 設定

### API が効かない

```bash
cat ~/.claude/settings.json | jq .env
cat ~/.codex/config.toml | grep -A5 apiKey
npx zcf init -s -t api_key -k "YOUR_KEY"
npx zcf ccr status && npx zcf ccr start   # CCR 利用時
```

### API Key フォーマットエラー

プロバイダーの要求を確認（例：302.ai は `sk-` で始まる）。Proxy を使う場合は `baseUrl` と `model` の対応を確認。

## ワークフロー

### コマンドが見つからない

ワークフロー未導入の可能性。`npx zcf` → 2 で再インポート、または `npx zcf init -s --workflows all`。

### ワークフロー結果が不完全

- 仕様を明文化し、必要な入力ファイルやサンプルを添付
- 必要に応じ `/git-worktree` で複数案を並列生成し比較

## MCP サービス

### 接続できない / 未接続表示

```bash
npx zcf                        # 4 を選び MCP を再設定
cat ~/.claude/settings.json | jq .mcpServers
npx zcf init -s -m skip        # ネットワーク問題が疑われる場合に切り分け
```

### API Key 必須サービスのエラー

`EXA_API_KEY` など環境変数を設定し、新しいターミナルで再読み込み：

```bash
echo $EXA_API_KEY
export EXA_API_KEY="your-key"
```

### Windows で起動しない

`npx zcf` → 4 を再実行するとパス表記を自動修正。必要に応じて `cmd /c npx ...` 形式で設定されます。

## Codex 関連

- Codex モードでメニューが出ない：`npx zcf init -T codex` を再実行  
- MCP/ワークフローが効かない：`~/.codex/config.toml` に設定があるか確認し、`npx zcf init -T codex -s` を再適用

## CCR 関連

```bash
npx zcf ccr status   # 状態確認
npx zcf ccr start    # 起動
npx zcf ccr stop     # 停止
```

ポート競合時は `config.toml` の `proxy.port` を変更。

## 設定/バックアップ

- 設定が壊れたら `~/.claude/backup/` または `~/.codex/backup/` から復元  
- マルチ設定を使っている場合：`npx zcf config-switch --list` で対象を確認
- バックアップが肥大化したら `npx zcf uninstall --mode custom --items backups` でクリーンアップ

## プラットフォーム別

- **Windows**：PowerShell で `New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\\.claude"` を実行して権限を修正。  
- **WSL**：`/mnt` 経由のパスでの権限に注意。  
- **Termux/サーバー**：`--skip-prompt` と設定ファイルを組み合わせて非対話初期化を使う。  
- **プロキシ環境**：`HTTPS_PROXY`/`HTTP_PROXY` を設定後、`npx zcf init -s -m skip` でまず本体のみ検証。

## それでも解決しない場合

1. `npx zcf init --verbose 2>&1 | tee zcf.log` でログを取得  
2. `cat zcf.log | grep -i error` でエラーを抽出  
3. 使用したコマンド・OS・Node.js バージョン・ログを添えて issue を起票してください。
