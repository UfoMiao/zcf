---
title: CCometixLine ステータスバー
---

# CCometixLine ステータスバー

CCometixLine は VS Code ステータスバーに ZCF/CCR/Claude Code の状態を表示し、ワンクリックで更新や切替を行えるプラグインです。`npx zcf` から導入と更新を行います。

## 主な機能

- CCR 稼働状況・モデル名・プロバイダーをステータスバーに表示
- アップデートチェックと自動更新
- クリックでメニューを開き、設定/ログ/リセットにアクセス
- インストール済み MCP やワークフローの簡易確認

## インストール/更新

```bash
# メニューから
npx zcf          # → L を選択

# 直接更新を確認
npx zcf check-updates --code-type claude
```

## 設定

- `~/.ufomiao/zcf/config.toml` に表示言語やポーリング間隔を保持
- CCR を利用していない場合は API モードの情報のみを表示

## よくある質問

- **表示が更新されない**：`npx zcf ccr status` で CCR が動作しているか確認し、VS Code を再起動。  
- **アイコンが消えた**：拡張機能が無効化されていないか確認し、`npx zcf` → L で再インストール。  
- **別環境で使いたい**：`config-switch` で設定を切替えた後に VS Code 側で再読み込み。

## 関連

- [CCR](ccr.md) - プロキシ管理  
- [アップデート確認](../cli/check-updates.md) - CLI から一括更新  
- [出力スタイル](../best-practices/output-styles.md) - ステータスバーから切替する際の参考基準
