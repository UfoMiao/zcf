---
title: テンプレートと出力スタイル
---

# テンプレートと出力スタイル

ZCFは、ワークフローテンプレート、出力スタイルテンプレート、システムプロンプトテンプレートを含む完全なテンプレートシステムを提供します。これらのテンプレートは複数の言語（中国語と英語）をサポートし、チーム固有のニーズに合わせてカスタマイズできます。

## テンプレートシステムの概要

ZCFのテンプレートシステムは、以下のレベルに分かれています：

1. **ワークフローテンプレート**: 構造化された開発ワークフロー
2. **出力スタイルテンプレート**: AIアシスタントの個性と出力スタイル
3. **システムプロンプトテンプレート**: プロジェクトレベルのシステムプロンプトと標準
4. **MCPサービステンプレート**: MCPサービスの使用ガイド

## テンプレートディレクトリ構造

### Claude Code テンプレート

```
templates/claude-code/
├── common/                      # 共通設定テンプレート
│   └── settings.json           # Claude設定テンプレート
├── zh-CN/                      # 中国語テンプレートコレクション
│   ├── output-styles/         # 出力スタイルテンプレート
│   │   ├── engineer-professional.md
│   │   ├── nekomata-engineer.md
│   │   ├── laowang-engineer.md
│   │   └── ojousama-engineer.md
│   └── workflow/              # ワークフローテンプレート
│       ├── common/            # 共通ツールワークフロー
│       ├── plan/              # 計画ワークフロー
│       ├── sixStep/          # 6段階ワークフロー
│       ├── bmad/              # BMadエンタープライズワークフロー
│       └── git/               # Gitワークフロー
└── en/                         # 英語テンプレートコレクション
    ├── output-styles/         # 出力スタイルテンプレート
    └── workflow/              # ワークフローテンプレート（同じ構造）
```

### Codex テンプレート

```
templates/codex/
├── common/                     # 共通設定テンプレート
│   └── config.toml            # Codex設定テンプレート
├── zh-CN/                      # 中国語テンプレートコレクション
│   ├── system-prompt/         # システムプロンプトテンプレート
│   └── workflow/              # ワークフローテンプレート
│       ├── sixStep/          # 6段階ワークフロー
│       └── git/              # Gitワークフロー
└── en/                         # 英語テンプレートコレクション
    ├── system-prompt/         # システムプロンプトテンプレート
    └── workflow/              # ワークフローテンプレート（同じ構造）
```

## 出力スタイルテンプレート

出力スタイルは、AIアシスタントの個性と出力方法を定義します。これらのテンプレートは`prompts/output-style/`ディレクトリに保存されます。

### 事前設定された出力スタイル

<div align="center">
  <a href="https://github.com/Haleclipse">
    <img src="/assets/Haleclipse.webp" alt="ハレーちゃん" width="200" style="border-radius: 10px;"/>
  </a>
  <p>ツンデレ<a href="https://github.com/Haleclipse">ハレーちゃん</a>お嬢様 (￣▽￣)ゞ</p>
</div>

| スタイルID | 名前 | 説明 | 使用ケース |
|---------|------|------|---------|
| `engineer-professional` | プロフェッショナルエンジニア | プロフェッショナルで厳格なエンジニアスタイル | 正式なプロジェクト、エンタープライズ環境 |
| `nekomata-engineer` | 猫又エンジニア | 軽快で親しみやすい猫又スタイル | 個人プロジェクト、リラックスした雰囲気 |
| `laowang-engineer` | 老王エンジニア | ユーモラスで親しみやすい中国語スタイル | 中国語プロジェクト、国内チーム |
| `ojousama-engineer` | お嬢様エンジニア | 優雅で洗練されたスタイル | 特定のシナリオ、スタイル化されたプロジェクト |

### 組み込み出力スタイル

事前設定されたスタイルに加えて、組み込みスタイルもサポートされています：

- `default` - デフォルト出力スタイル
- `explanatory` - 説明スタイル、説明に焦点を当てる
- `learning` - 学習スタイル、教育に焦点を当てる

### 出力スタイルのインストール

```bash
# すべての出力スタイルをインストール
npx zcf init -o all

# 特定のスタイルをインストール
npx zcf init -o engineer-professional,nekomata-engineer

# デフォルト出力スタイルを設定
npx zcf init -o all -d engineer-professional

# 出力スタイルのインストールをスキップ
npx zcf init -o skip
```

### 出力スタイルの切り替え

**Claude Code**:
```
/set-output-style engineer-professional
```

**Codex**:
システムプロンプトを介して設定するか、`config.toml`の`systemPromptStyle`を編集します。

### カスタム出力スタイル

1. **テンプレートファイルを編集**:
```bash
# テンプレートファイルを見つける
cd ~/.claude/prompts/output-style/

# 新しいスタイルを編集または作成
vim my-custom-style.md
```

2. **初期化時に使用**:
```bash
# まず初期化し、次にカスタムスタイルを手動でコピー
cp my-custom-style.md ~/.claude/prompts/output-style/
```

3. **チーム共有**:
```bash
# カスタムスタイルをバージョン管理に含める
git add prompts/output-style/my-custom-style.md
git commit -m "Add custom output style"
```

## ワークフローテンプレート

ワークフローテンプレートは、構造化された開発プロセスを定義します。各ワークフローには、コマンドテンプレートとオプションのエージェントテンプレートが含まれます。

### ワークフロータイプ

#### 1. 共通ツールワークフロー (`common/`)

**コマンド**:
- `init-project.md` - プロジェクト初期化コマンド

**エージェント**:
- `init-architect.md` - 初期化アーキテクト
- `get-current-datetime.md` - 時間ツール

**目的**: プロジェクト初期化、共通ツール、時間処理機能を提供

#### 2. 計画ワークフロー (`plan/`)

**コマンド**:
- `feat.md` - 機能開発コマンド

**エージェント**:
- `planner.md` - プランナー
- `ui-ux-designer.md` - UI/UXデザイナー

**目的**: 新機能の設計と計画

#### 3. 6段階ワークフロー (`sixStep/`)

**コマンド**:
- `workflow.md` - 6段階開発プロセス（研究→構想→計画→実行→最適化→レビュー）

**目的**: 構造化された開発プロセス

#### 4. BMadワークフロー (`bmad/`)

**コマンド**:
- `bmad-init.md` - BMad初期化

**エージェント**:
- 完全なエンタープライズレベルの開発チームシミュレーション（PO、PM、アーキテクト、開発者、QAなど）

**目的**: エンタープライズレベルのアジャイル開発プロセス

#### 5. Gitワークフロー (`git/`)

**コマンド**:
- `git-commit.md` - スマートGitコミット
- `git-rollback.md` - 安全なロールバック
- `git-cleanBranches.md` - マージ済みブランチのクリーンアップ
- `git-worktree.md` - Git worktree管理

**目的**: Git操作の自動化

### ワークフローのインストール

```bash
# すべてのワークフローをインストール
npx zcf init -w all

# 特定のワークフローをインストール
npx zcf init -w sixStepsWorkflow,gitWorkflow

# ワークフローのインストールをスキップ
npx zcf init -w skip
```

### カスタムワークフロー

1. **リポジトリをフォークしてテンプレートを変更**:
```bash
# 1. ZCFリポジトリをフォーク
git clone https://github.com/your-org/zcf.git
cd zcf

# 2. テンプレートを変更
vim templates/claude-code/zh-CN/workflow/custom/my-workflow.md

# 3. ビルドとテスト
pnpm build
npm link
```

2. **初期化時に使用**:
```bash
# カスタムテンプレートディレクトリを使用して初期化
npx zcf init -w custom
```

3. **チームがカスタムテンプレートを公開**:
```bash
# カスタムテンプレートを含むnpmパッケージを公開
npm publish @your-org/zcf-templates
```

## システムプロンプトテンプレート

システムプロンプトテンプレートは、プロジェクトレベルのAI動作標準とガイドラインを定義します。

### CLAUDE.md

`CLAUDE.md`はClaude Codeのプロジェクトメモリファイルで、推奨構造は次のとおりです：

```markdown
# プロジェクト設定

## 言語指令
中国語で返信する

## コーディング標準
- TypeScriptを使用
- ESLintルールに従う
- 2スペースのインデントを使用

## ワークフロー標準
開発には6段階ワークフローを使用
```

### プロジェクトメモリのベストプラクティス

1. **階層的組織**:
```
プロジェクトルート/
├── CLAUDE.md              # グローバル設定（簡潔）
└── .claude/
    ├── plan/              # 計画ドキュメント
    ├── memory/            # プロジェクトメモリ
    │   ├── architecture.md
    │   ├── api-design.md
    │   └── coding-standards.md
    └── workflows/         # ワークフローテンプレート
```

2. **過度なコンテキストを避ける**:
- グローバル`CLAUDE.md`は必要な設定のみを保持
- 複雑な標準は出力スタイルまたはプロジェクトメモリに入れる
- `/zcf:init-project`を使用して階層構造を生成

3. **定期的な更新**:
```bash
# テンプレートとプロンプトを更新
npx zcf update -g zh-CN
```

## テンプレート言語サポート

ZCFは2つの言語のテンプレートをサポートしています：

### 中国語テンプレート (`zh-CN`)

- 完全な中国語ローカライゼーション
- 中国語AI対話モード
- 中国語技術ドキュメント標準
- 中国語ワークフロー記述

### 英語テンプレート (`en`)

- 完全な英語ローカライゼーション
- 英語AI対話モード
- 英語技術ドキュメント標準
- 英語ワークフロー記述

### 言語の切り替え

```bash
# 中国語テンプレートを使用して初期化
npx zcf init -c zh-CN

# 英語テンプレートを使用して初期化
npx zcf init -c en

# 更新時に言語を切り替え
npx zcf update -c en
```

## テンプレート更新戦略

### 更新方法

| 方法 | コマンド | 説明 |
|------|------|------|
| **完全更新** | `npx zcf update` | すべてのテンプレートを更新 |
| **ドキュメントのみ** | `npx zcf init --config-action docs-only` | プロンプトとドキュメントのみを更新 |
| **マージ更新** | `npx zcf init --config-action merge` | 新しいテンプレートを既存の設定にマージ |

### カスタムコンテンツの保持

テンプレートを変更した場合、以下を推奨します：

1. **カスタムテンプレートをバックアップ**:
```bash
# カスタムテンプレートをバックアップ
tar -czf my-custom-templates.tar.gz ~/.claude/workflows/custom/
```

2. **バージョン管理を使用**:
```bash
# カスタムテンプレートをGitに含める
git add ~/.claude/workflows/custom/
git commit -m "Add custom workflow templates"
```

3. **更新時に確認**:
```bash
# 更新前に差分を比較
diff -r ~/.claude/workflows/ ~/.claude/backup/latest/workflows/
```

## チーム協力

### 統一テンプレート

チーム内でテンプレート標準を統一：

1. **チームテンプレートリポジトリを作成**:
```bash
# テンプレートリポジトリを作成
mkdir team-zcf-templates
cd team-zcf-templates
git init

# テンプレートファイルを追加
cp -r ~/.claude/workflows/team-* ./
git add .
git commit -m "Initial team templates"
```

2. **チームメンバーの同期**:
```bash
# チームテンプレートをプル
git pull origin main
cp -r team-* ~/.claude/workflows/
```

### テンプレートバージョン管理

- テンプレート変更にセマンティックバージョニングを使用
- 重大な変更の移行ガイドを提供
- 可能な限り後方互換性を維持
- 既存の設定でテンプレート更新をテスト

## トラブルシューティング

### テンプレートがインストールされていない

テンプレートが正しくインストールされていない場合：

```bash
# テンプレートを再インストール
npx zcf init --config-action new

# テンプレートディレクトリを確認
ls -la ~/.claude/workflows/
ls -la ~/.claude/prompts/output-style/
```

### カスタムテンプレートが失われた

更新後にカスタムテンプレートが失われた場合：

```bash
# バックアップから復元
cp -r ~/.claude/backup/backup_*/workflows/custom/ ~/.claude/workflows/

# またはバージョン管理から復元
git checkout HEAD -- ~/.claude/workflows/custom/
```

### 言語の不一致

テンプレート言語が設定と一致しない場合：

```bash
# 再初期化して言語を指定
npx zcf init --config-action backup -c zh-CN

# またはテンプレート言語のみを更新
npx zcf update -c zh-CN
```

## 関連リソース

- [ワークフローシステム](../features/workflows.md) - 詳細なワークフロー情報
- [出力スタイル戦略](../best-practices/output-styles.md) - 出力スタイル管理
- [設定管理](configuration.md) - 設定管理ガイド

> 💡 **ヒント**: テンプレートシステムを適切に使用すると、開発効率を大幅に向上させることができます。チーム内でテンプレート標準を統一し、最新の機能を取得するために定期的にテンプレートを更新することを推奨します。





