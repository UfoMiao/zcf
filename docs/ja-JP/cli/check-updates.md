---
title: zcf check-updates
---

# zcf check-updates

Claude Code/Codex/ccusage/CCometixLine/ワークフロー等のアップデートをまとめて確認するコマンドです。

```bash
npx zcf check-updates [options]
```

## 主なオプション

- `-T, --code-type <claude|codex>`：対象ツールを指定  
- `--json`：結果を JSON で出力  
- `--skip-prompt`：非対話で実行  
- `--check-only`：確認のみ（自動アップデートを行わない）

## 例

```bash
# Claude Code 関連の更新を確認
npx zcf check-updates

# Codex 用
npx zcf check-updates --code-type codex

# JSON で取得し CI で利用
npx zcf check-updates --json > updates.json
```

## メニューからの利用

`npx zcf` → `+` を選択すると同等のチェックを実行できます。必要に応じて次の処理（更新 or スキップ）を選択します。

## 失敗時

- ネットワークを確認し、再度実行  
- 権限エラーが出る場合は管理者権限を付与、またはグローバルインストール先を書き込み可能にする  
- 詳細ログが必要な場合は `--verbose` を併用
