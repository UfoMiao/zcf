---
title: 複数設定とバックアップ
---

# 複数設定とバックアップ

ZCF は複数の設定プロファイルを並行管理し、バックアップ/復元を自動化します。仕事用と個人用、検証用などを素早く切り替えられます。

## 機能概要

- **config-switch**：設定プロファイルの作成・一覧・切替  
- **バックアップ**：設定変更のたびにタイムスタンプ付きバックアップを作成  
- **部分的な上書き/マージ**：既存設定を検出すると処理モードを選択可能  
- **Claude Code / Codex 両対応**：`-T codex` で Codex 側を切替

## 基本操作

```bash
# プロファイル一覧
npx zcf config-switch --list

# work プロファイルに切替
npx zcf config-switch work

# Codex 側を切替
npx zcf config-switch personal --code-type codex

# 新規作成し切替
npx zcf config-switch new-profile --create
```

## バックアップ

- 保存先：`~/.claude/backup/<timestamp>/`、Codex は `~/.codex/backup/`  
- 復元：バックアップを上書きコピーするか、`npx zcf init --config-action merge` で再適用  
- クリーンアップ：`npx zcf uninstall --mode custom --items backups`

## 推奨ワークフロー

1. プロジェクト/環境ごとにプロファイルを作成 (`work`, `personal`, `test` など)  
2. `zcf init` で言語・API・ワークフローを投入  
3. 別作業では `/git-worktree` と組み合わせてプロファイルを切替  
4. 定期的に `--config-action backup` でバックアップを取得

## 注意

- プロファイル名には用途が分かる名前を付ける  
- 共有リポジトリにコミットする場合は API Key や `auth.json` を除外する  
- 大きな変更前にバックアップを作成してからマージ/上書きを実行
