---
title: zcf config-switch
---

# zcf config-switch

複数の設定プロファイルを一覧・切替・作成するコマンドです。仕事用/個人用/検証用などを安全に切り替えられます。

```bash
npx zcf config-switch [name] [options]
```

## 主なオプション

- `--list`：プロファイル一覧を表示  
- `--create`：指定名で新規プロファイルを作成して切替  
- `-T, --code-type <claude|codex>`：対象ツールを指定  

## 例

```bash
# 一覧表示
npx zcf config-switch --list

# work プロファイルに切替
npx zcf config-switch work

# Codex 側を personal に切替
npx zcf config-switch personal --code-type codex

# 新規作成して切替
npx zcf config-switch demo --create
```

## ヒント

- プロファイル名は用途が分かるものにする (`work`, `personal`, `test` など)  
- 切替前に必要なら `npx zcf init --config-action backup` でバックアップ  
- `/git-worktree` と併用すると、作業ツリーごとに異なる設定を持たせやすい
