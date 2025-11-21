---
title: zcf uninstall
---

# zcf uninstall

ZCF が導入したファイルやツールを選択的に削除するコマンドです。バックアップやワークフローを残したままクリーンアップできます。

```bash
npx zcf uninstall [options]
```

## 主なオプション

- `--mode <all|minimal|custom>`  
  - `all`：関連ファイルをすべて削除  
  - `minimal`：生成物のみ削除し CLI は保持  
  - `custom`：項目を選択して削除  
- `--items <list>`：`custom` 時に削除する項目（`configs,workflows,mcp,ccr,backups` など）  
- `-T, --code-type <claude|codex>`：対象ツールを指定

## 例

```bash
# すべて削除（バックアップ含む）
npx zcf uninstall --mode all

# バックアップだけ整理
npx zcf uninstall --mode custom --items backups

# Codex のみクリーンアップ
npx zcf uninstall --mode custom --items codex --code-type codex
```

## 注意

- 削除前に必要なバックアップを退避してください。  
- `all` モードは設定ディレクトリ全体を消去します。必要に応じて `minimal` または `custom` を推奨。  
- 手動削除よりも `uninstall` コマンドを使う方が依存関係の整合性を保てます。
