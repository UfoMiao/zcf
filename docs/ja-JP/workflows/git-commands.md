---
title: Git スマートコマンド
---

# Git スマートコマンド

ZCF にはよく使う Git 操作を支援するプロンプトが含まれます。コミットメッセージ作成や Worktree 操作を簡素化します。

## 主なコマンド

- `/git-commit`：変更内容を要約し、Conventional Commit 形式でコミットメッセージを提案  
- `/git-pr`：PR 説明文の下書きを生成  
- `/git-worktree ...`：Worktree の作成/一覧/削除/移行（詳細は [Worktree 並列開発](../best-practices/worktree.md)）

## 使い方の例

```
/git-commit
# または
/git-commit 请为此次改动生成 commit message
```

```
/git-pr Generate PR description in English
```

```
/git-worktree add feat/add-search -o
```

## ヒント

- `/git-commit` 実行前に `git status` の出力を貼ると精度が向上  
- PR テンプレートがある場合は併せて渡す  
- Worktree 系は自然言語で指定しても解釈されます
