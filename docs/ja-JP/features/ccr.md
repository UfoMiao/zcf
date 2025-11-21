---
title: Claude Code Router (CCR)
---

# Claude Code Router (CCR)

CCR は Claude Code 用の軽量プロキシ/スイッチャーです。複数の API プロバイダーをまとめて管理し、モデル切替、ログ取得、ヘルスチェックを提供します。`npx zcf ccr` で操作できます。

## できること

- 複数キー/エンドポイントの統合管理（302.ai / GLM / MiniMax / Kimi / カスタムなど）
- メニューまたは CLI からプロキシ起動/停止/状態確認
- デフォルトモデルの指定とフォールバック設定
- ログ/統計/ヘルスチェックの確認
- Claude Code 設定への自動注入（`settings.json` を上書き/マージ）

## よく使うコマンド

```bash
npx zcf ccr start        # CCR を起動
npx zcf ccr stop         # 停止
npx zcf ccr status       # 状態表示
npx zcf ccr logs         # ログ確認
npx zcf ccr reset        # 設定リセット

# プロキシ経由で初期化
npx zcf init -s -t ccr
```

## 設定のポイント

- `~/.ufomiao/ccr/config.toml` に CCR 設定が保存されます。  
- `preferredProvider` / `fallbackModel` / `port` を必要に応じて編集。  
- デフォルトモデルは `--model-id`、フォールバックは `--fallback-model-id` で指定可。

## 典型的な使い方

1. `npx zcf init -s -t ccr -p 302ai -k "sk-xxx"` でプロバイダーを設定  
2. `npx zcf ccr start` で CCR を起動  
3. Claude Code 側の `settings.json` を自動更新（`zcf init` が実施）  
4. 必要に応じて `npx zcf ccr status` で稼働確認

## トラブルシュート

- ポート競合：`config.toml` の `port` を別ポートに変更  
- 401/403：API Key の有効性を確認し、プロバイダーのレート制限をチェック  
- 接続不可：`npx zcf ccr reset` でリセット後、再度プロバイダーを設定

## 関連機能

- [API プリセット](../advanced/api-providers.md) で主要プロバイダーのパラメータを簡略化  
- [ccusage](../cli/ccu.md) で利用量を可視化  
- [マルチ設定切替](../features/multi-config.md) と併用して環境別に CCR を使い分け
