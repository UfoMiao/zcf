---
title: Worktree 並列開発
---

# Worktree 並列開発

Git Worktree は同一リポジトリに複数の作業ツリーを作成できる機能です。各作業ツリーは独立したファイルシステムを持ち、異なるブランチを同時に扱えます。ZCF の `/git-worktree` スマートコマンドを使えば Worktree 管理を直感的に行えます。

## Worktree とは

プロジェクトのコピーを作り、別ブランチで作業できます。作業ツリー同士は干渉せず、Git の履歴を共有します。

### メリット

1. **並列開発**：複数タスクを同時進行
2. **コンテキスト分離**：作業領域ごとに独立
3. **高速切替**：ブランチ切替を繰り返す必要なし
4. **IDE 連携**：各作業ツリーを別ウィンドウで開ける

### 向いているシーン

- 複数機能/バグ修正の並行開発
- A/B 実装の比較
- レビュー用の隔離環境
- 実験的な変更の試行

## 基本コマンド

`/git-worktree` は Worktree の作成・一覧・削除・移行をカバーします。

### 作成

```text
# main/master から <path> というブランチを作り作業ツリーを作成
/git-worktree add <path>

# ブランチ名を指定
/git-worktree add <path> -b <branch>

# 作成後に IDE を自動オープン（推奨）
/git-worktree add <path> -o
```

**例**：
```
/git-worktree add feat/add-i18n -o
/git-worktree add bugfix/login-error -b fix/login
```

### 確認と管理

```text
/git-worktree list        # 一覧
/git-worktree remove <path> # 削除
/git-worktree prune         # 無効エントリの掃除
```

### コンテンツ移行

```text
/git-worktree migrate <target> --from <source>  # 未コミット変更の移行
/git-worktree migrate <target> --stash          # stash の移行
```

## 使い方のコツ

### 自然言語で操作

細かなコマンドを覚えずに済みます。

✅ 推奨:
```
/git-worktree test and open
/git-worktree add feat/add-i18n, delete test branch and worktree
/git-worktree migrate staging area content from test2 to current branch
```

❌ 非推奨:
```bash
git worktree add ../.zcf/project-name/feat/test -b feat/test
```

### 作業ツリーの配置

既定で `../.zcf/project-name/` 配下に作成し、プロジェクト直下を汚しません。

```
Project/
└── ...

.zcf/
└── project-name/
    ├── feat/add-i18n/
    ├── bugfix/login-error/
    └── ...
```

## ZCF ワークフローとの連携

### マルチライン並列 + SL ロールバック

生成結果にばらつきがある場合、複数作業ツリーで同じ/異なるワークフローを並列実行し、最良案を選ぶのが有効です。

1. 作業ツリーを複数作成  
   ```
   /git-worktree add solution1 -o
   /git-worktree add solution2 -o
   /git-worktree add solution3 -o
   ```
2. 各ツリーでワークフローを実行し比較
3. 最良案を採用し、不要なものは削除

結果が大きく逸れた場合は、元の状態に戻して新しい制約を追加したうえで再生成（SL ロールバック）するのが安全です。

## ベストプラクティス

### 1. 名前付け

✅ 推奨：`feat/add-i18n`、`bugfix/login-error`、`refactor/api-structure`  
❌ 非推奨：`test`、`work2` のような意味のない名前

### 2. 使い終わったら削除

```text
/git-worktree remove feat/add-i18n
```

### 3. 不正な記録を定期的に掃除

```text
/git-worktree prune
```

### 4. 設定切り替えと併用

```bash
# メインは GLM プロバイダー設定
npx zcf config-switch glm-provider

# Worktree では 302.AI プロバイダー設定
cd ../.zcf/project-name/feat/test
npx zcf config-switch 302ai-provider
```

### 5. 進捗ドキュメント

各作業ツリーで進捗を記録しておくと、別ツリーで続きやすくなります。

## 推奨フロー

1. 作業ツリーを作成し IDE を開く  
   `/git-worktree add feat/feature-name -o`
2. ワークフロー実行  
   `/zcf:workflow Develop xxx feature`
3. テスト/最適化（必要なら別ツリーで別案を試す）
4. マージして後片付け  
   ```bash
   git add . && git commit -m "feat: add feature"
   git merge feat/feature-name
   /git-worktree remove feat/feature-name
   ```

## VS Code エクステンション

**Git Worktree Manager**  
- GUI で管理・切替  
- 状態確認・作成・削除が簡単  
<https://marketplace.visualstudio.com/items?itemName=felipecaputo.git-worktree-manager>

## 注意

1. 作業ツリーのディレクトリを手動で削除しない。`/git-worktree remove` を使う。  
2. パスの衝突に注意。  
3. 不要な作業ツリーは定期的に削除。  
4. 削除前に重要な変更をコミットまたはバックアップ。

## 関連ドキュメント

- [Git スマートコマンド](../workflows/git-commands.md)
- [ZCF 6 段階ワークフロー](../workflows/zcf-workflow.md)
- [Config Switch](../cli/config-switch.md)
