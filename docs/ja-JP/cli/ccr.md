---
title: zcf ccr
---

# zcf ccr

Claude Code Router (CCR) を CLI から管理するコマンド群です。起動/停止、状態確認、設定リセット、ログ閲覧を行えます。

```bash
npx zcf ccr <subcommand> [options]
```

## よく使うサブコマンド

- `start`：CCR を起動  
  ```bash
  npx zcf ccr start
  ```
- `stop`：停止  
- `status`：稼働状態、ポート、プロバイダーを表示  
- `logs`：ログ表示  
- `reset`：設定を初期状態に戻す  
- `show`：現在の設定を表示  

## 初期設定の流れ

```bash
# プロバイダーを指定して初期化（初回）
npx zcf init -s -t ccr -p 302ai -k "sk-xxx"

# CCR を起動し状態確認
npx zcf ccr start
npx zcf ccr status
```

設定ファイルは `~/.ufomiao/ccr/config.toml`。`preferredProvider` や `fallbackModel` を編集可能です。

## トラブルシュート

- ポート競合：`config.toml` の `port` を変更し、再起動  
- 401/403：API Key とプロバイダー上限を確認  
- 設定が壊れた：`npx zcf ccr reset` で再生成し、`zcf init -t ccr` を再実行

## 関連

- [CCR 概要](../features/ccr.md)  
- [check-updates](check-updates.md) で CCR やステータスバーの更新を確認
