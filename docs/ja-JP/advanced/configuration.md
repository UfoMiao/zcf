---
title: 設定管理
---

# 設定管理

ZCFは、増分管理、バックアップ戦略、柔軟な設定切り替えをサポートする包括的な設定管理システムを提供します。設定システムの構造とメカニズムを理解することで、開発環境をより適切に管理および維持できます。

## ディレクトリ構造の概要

ZCFの設定は以下のディレクトリに分散しています：

### 主要設定ディレクトリ

| ディレクトリ | 説明 | 主要ファイル |
|------|------|---------|
| `~/.claude/` | Claude Code メイン設定ディレクトリ | `settings.json`, `CLAUDE.md`, `prompts/`, `workflows/` |
| `~/.codex/` | Codex メイン設定ディレクトリ | `config.toml`, `auth.json`, `prompts/`, `AGENTS.md` |
| `~/.ufomiao/zcf/` | ZCF グローバル設定ディレクトリ | `config.toml` |
| `~/.claude-code-router/` | CCR 設定ディレクトリ | `config.json` |
| `~/.claude/backup/` | Claude Code バックアップディレクトリ | タイムスタンプ付きバックアップファイル |
| `~/.codex/backup/` | Codex バックアップディレクトリ | タイムスタンプ付きバックアップファイル |

### 設定ファイルの詳細

#### Claude Code 設定

```
~/.claude/
├── settings.json          # メイン設定ファイル（API、MCP、権限など）
├── CLAUDE.md              # プロジェクトメモリとシステムプロンプト
├── prompts/               # プロンプトディレクトリ
│   ├── output-style/      # 出力スタイルテンプレート
│   └── memory/            # メモリテンプレート
└── workflows/             # ワークフローディレクトリ
    ├── zcf-workflow/      # 6段階ワークフロー
    ├── feat/              # 機能開発ワークフロー
    ├── git/               # Git ワークフロー
    └── bmad/              # BMad ワークフロー
```

#### Codex 設定

```
~/.codex/
├── config.toml            # メイン設定ファイル（TOML形式）
├── auth.json              # API キー設定（暗号化ストレージ）
├── AGENTS.md              # システムプロンプトとエージェント設定
├── prompts/               # プロンプトディレクトリ
│   └── workflow/          # ワークフロープロンプト
└── system-prompt/         # システムプロンプトテンプレート
```

#### ZCF グローバル設定

```
~/.ufomiao/zcf/
├── config.toml            # ZCF グローバル設定（TOML形式）
│   ├── preferredLang      # CLI 言語設定
│   ├── templateLang       # テンプレート言語設定
│   ├── aiOutputLang       # AI 出力言語設定
│   └── codeToolType       # 現在アクティブなツールタイプ
└── backup/                # ZCF 設定バックアップ
```

## 増分管理モード

ZCFが既存の設定を検出すると、操作戦略を尋ねます。

### 設定処理戦略

| 戦略 | 説明 | 使用ケース | リスク |
|------|------|---------|------|
| `backup` | バックアップして上書き（デフォルト） | 推奨デフォルトオプション | 低（バックアップあり） |
| `merge` | 新しい設定をマージしようとする | カスタムコンテンツを保持する必要がある | 中（競合の可能性） |
| `new` | 既存のコンテンツを無視して再生成 | 新しい設定が必要 | 高（既存を上書き） |
| `docs-only` | ドキュメントとプロンプトのみ更新 | テンプレートのみ更新が必要 | 低 |
| `skip` | 現在のステップをスキップ | 変更する必要がない | なし |

### 自動戦略適用

非対話モード（`--skip-prompt`）では、ZCFは自動的にデフォルト戦略を適用します：

- デフォルト戦略：`backup`
- `--config-action` パラメータで戦略を指定可能

```bash
# 設定処理戦略を指定
npx zcf init -s --config-action merge

# ドキュメントのみ更新
npx zcf init -s --config-action docs-only
```

### マージ戦略の詳細

`merge` 戦略は、設定をインテリジェントにマージしようとします：

- ✅ **MCP サービス**: 新しいサービスは既存の設定にマージされます
- ✅ **ワークフロー**: 新しいワークフローは既存のワークフローに追加されます
- ⚠️ **API 設定**: 手動確認が必要な場合があります
- ⚠️ **出力スタイル**: 新しいスタイルは既存のスタイルに追加されます

## AI 出力言語指令

### 設定メカニズム

`applyAiLanguageDirective` 関数は、`--ai-output-lang` パラメータに基づいて、対応する言語指令をシステムプロンプトファイルに書き込みます。

### サポートされている言語オプション

- `zh-CN`: 中国語出力指令
- `en`: 英語出力指令
- `custom`: カスタム言語指令

### カスタム言語指令

`custom` オプションを使用すると、カスタム言語指令を入力できます：

```bash
npx zcf init --ai-output-lang custom
# 入力: 日本語で返信し、プロフェッショナルで丁寧なトーンを維持
```

カスタム指令は以下に書き込まれます：
- **Claude Code**: `~/.claude/CLAUDE.md`
- **Codex**: `~/.codex/AGENTS.md`

### 設定場所

言語指令の設定場所：

- **Claude Code**: `CLAUDE.md` ファイルの先頭
- **Codex**: `AGENTS.md` ファイルの先頭

## テンプレート言語の選択

### 言語解決メカニズム

`resolveTemplateLanguage` 関数は、以下の要因を考慮してテンプレート言語を決定します：

1. **コマンドラインパラメータ**: `--config-lang` または `--all-lang`
2. **設定ファイル**: `~/.ufomiao/zcf/config.toml` の `templateLang`
3. **対話入力**: 指定されていない場合、ユーザーに選択を促します
4. **システムデフォルト**: 最終的に `en` にフォールバック

### 言語の独立性

テンプレート言語とAI出力言語は互いに独立しており、柔軟に組み合わせることができます：

```bash
# 中国語テンプレート + 英語出力（英語コードコメントが必要なプロジェクトに適している）
npx zcf init --config-lang zh-CN --ai-output-lang en

# 英語テンプレート + 中国語出力（国際チームに適している）
npx zcf init --config-lang en --ai-output-lang zh-CN
```

### テンプレート言語の影響

テンプレート言語は以下に影響します：

- ワークフローテンプレートの言語バージョン
- プロンプトと指示の言語
- システムプロンプトテンプレートの言語
- 出力スタイルテンプレートの言語

## 変更追跡の推奨事項

### バージョン管理の使用

設定ディレクトリを管理するためにGitを使用することを推奨します：

```bash
# 設定リポジトリを作成
mkdir ~/zcf-configs
cd ~/zcf-configs
git init

# 設定ファイルを追加（注意：機密情報を除外）
cat > .gitignore << EOF
*.key
auth.json
settings.json
config.toml
EOF

# テンプレートとワークフローを追加（機密情報なし）
git add prompts/ workflows/ templates/
git commit -m "Add ZCF templates and workflows"
```

### 差分の比較

`zcf update` を実行する前後の差分を比較：

```bash
# 更新前
git add ~/.claude/
git commit -m "Before update"

# 更新を実行
npx zcf update

# 差分を表示
git diff ~/.claude/

# 変更を確認してからコミット
git add ~/.claude/
git commit -m "After update"
```

### バックアップの復元

カスタムコンテンツが誤って上書きされた場合、バックアップディレクトリから復元できます：

```bash
# バックアップを表示
ls -lt ~/.claude/backup/

# 特定のバックアップを復元
cp -r ~/.claude/backup/backup_2025-01-15_10-30-45/* ~/.claude/

# または特定のファイルを復元
cp ~/.claude/backup/backup_*/workflows/custom/my-workflow.md ~/.claude/workflows/custom/
```

## 設定管理のベストプラクティス

### 1. 階層化設定管理

- **グローバル設定**: チーム共有のテンプレートとワークフロー
- **個人設定**: 個人のAPIキーと設定
- **プロジェクト設定**: プロジェクト固有のワークフローとテンプレート

### 2. 機密情報の処理

- ⚠️ **機密情報をバージョン管理にコミットしない**
- ✅ **環境変数を使用してAPIキーを管理**
- ✅ **`.gitignore` を使用して機密ファイルを除外**
- ✅ **定期的にキーをローテーション**

### 3. 設定の同期

複数のデバイス間で設定を同期：

```bash
# 方法1: Gitを使用
git clone ~/zcf-configs
cp -r zcf-configs/templates/* ~/.claude/workflows/

# 方法2: クラウドストレージを使用
rsync -av ~/.claude/workflows/ ~/Cloud/.claude/workflows/

# 方法3: Git Worktreeを使用
/git-worktree migrate
```

### 4. 定期的なレビュー

定期的に設定をレビューおよびクリーンアップ：

```bash
# 古いバックアップをクリーンアップ（最後の30日間を保持）
find ~/.claude/backup -name "*.bak" -mtime +30 -delete

# 未使用の設定をレビュー
ls -la ~/.claude/workflows/
# 不要になったカスタムワークフローを削除
```

### 5. チーム協力

チーム環境では：

- 設定テンプレートと標準を統一
- ワークフローと出力スタイルを共有
- 設定変更ログを維持
- 定期的に設定更新を同期

## 設定の移行

### 旧バージョンからの移行

ZCFの旧バージョンからアップグレードする場合：

```bash
# ZCFは自動的に設定を検出して移行します
npx zcf init

# または手動で移行を確認
cat ~/.ufomiao/zcf/config.toml
# 移行プロンプトがあるか確認
```

### ツール間の移行

Claude CodeからCodexに移行：

```bash
# 1. Claude Code設定をバックアップ
cp -r ~/.claude ~/.claude.backup

# 2. Codexを初期化
npx zcf init -T codex

# 3. ワークフローとテンプレートを手動で移行（必要に応じて）
# 注意: Claude CodeとCodexのテンプレート形式は異なる場合があります
```

## トラブルシューティング

### 設定の競合

設定の競合が発生した場合：

```bash
# 1. 競合の詳細を表示
npx zcf init
# マージ戦略を選択する際に競合プロンプトを表示

# 2. 設定を手動でマージ
# 設定ファイルを編集し、競合する項目を手動でマージ

# 3. バックアップ戦略を使用して最初からやり直す
npx zcf init --config-action backup
```

### 設定の紛失

設定が失われた場合：

```bash
# 1. バックアップを検索
ls -lt ~/.claude/backup/ | head -5

# 2. バックアップを復元
cp -r ~/.claude/backup/backup_latest_timestamp/* ~/.claude/

# 3. 再初期化（バックアップが利用できない場合）
npx zcf init --config-action new
```

### 設定ファイルの破損

設定ファイルが破損した場合：

```bash
# 1. 設定ファイルの形式を確認
cat ~/.claude/settings.json | jq .

# 2. バックアップから復元
cp ~/.claude/backup/backup_*/settings.json ~/.claude/

# 3. または再初期化
npx zcf init --config-action new
```

## 関連リソース

- [マルチ設定とバックアップ](../features/multi-config.md) - マルチ設定システムとバックアップメカニズム
- [国際化と言語](i18n.md) - 詳細な言語設定
- [テンプレートシステム](templates.md) - テンプレート管理とカスタマイズ

> 💡 **ヒント**: 適切な設定管理は、開発効率とチーム協力の質を向上させることができます。テンプレートとワークフローを管理するためにバージョン管理を使用し、機密情報を含む設定ファイルを適切に保存することを推奨します。定期的にバックアップと設定をレビューして、開発環境の安定性を確保してください。





