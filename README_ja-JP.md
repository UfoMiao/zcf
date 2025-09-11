# ZCF - Zero-Config Claude-Code Flow

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Claude Code][claude-code-src]][claude-code-href]
[![codecov][codecov-src]][codecov-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![Ask DeepWiki][deepwiki-src]][deepwiki-href]

[English](README.md) | [中文](README_zh-CN.md) | **日本語** | [更新履歴](CHANGELOG.md)

> ゼロ設定、ワンクリックでClaude Code環境セットアップ - 多言語設定、インテリジェントプロキシシステム、パーソナライズされたAIアシスタント対応

![スクリーンショット](./src/assets/screenshot.webp)

## 🚀 クイックスタート

### 🎯 推奨：インタラクティブメニューを使用（v2.0新機能）

```bash
npx zcf          # インタラクティブメニューを開き、必要に応じて操作を選択
```

メニューオプション：

- `1` 完全初期化（`zcf i`と同等）
- `2` ワークフローのインポート（`zcf u`と同等）
- `3` APIまたはCCRの設定 - API設定またはCCRプロキシセットアップ
- `4` MCPの設定 - MCPサービスの設定と管理
- `5` デフォルトモデルの設定 - デフォルトモデルの設定（opus/sonnet/opusplan/カスタム）
- `6` AIメモリの設定 - AI出力言語とグローバル出力スタイルの設定
- `7` 環境権限の設定 - 環境変数と権限設定のインポート
- `R` Claude Code Router管理（v2.8.1強化）
- `U` ccusage - Claude Code使用量分析
- `L` CCometixLine - Rustベースの高性能ステータスバーツール、Git情報とリアルタイム使用量追跡統合（v2.9.9+新機能）
- `+` アップデートチェック - Claude Code、CCR、CCometixLineのバージョン確認と更新（v2.9.9+強化）
- その他の機能オプション...

#### 🎯 コア設定機能

**モデル設定（オプション5）**：デフォルトのClaudeモデルを柔軟に設定：
- **デフォルト**：Claude Codeが各タスクに最適なモデルを自動選択
- **Opus**：Claude-3.5-Opusを専用使用（高トークン消費、慎重に使用してください）
- **OpusPlan**：計画時にOpus、実装時にSonnetを使用（推奨バランス選択）
- **カスタム**：メインタスクとクイックタスク用に独自のモデル名を指定（任意のカスタムモデル対応）

**AIメモリ設定（オプション6）**：AIアシスタントをパーソナライズ：
- **AI出力言語**：AIの返答言語を設定（中国語、英語、またはカスタム）
- **グローバル出力スタイル**：AIの個性と返答スタイルを設定

### または、コマンドを直接使用：

#### 🆕 Claude Code初回使用

```bash
npx zcf i        # 完全初期化を直接実行：Claude Codeインストール + ワークフローインポート + APIまたはCCRプロキシ設定 + MCPサービス設定
# または
npx zcf → 1を選択  # メニューから完全初期化を実行
```

#### 🔄 既存のClaude Code環境がある場合

```bash
npx zcf u        # ワークフローのみ更新：AIワークフローとコマンドシステムをすばやく追加
# または
npx zcf → 2を選択  # メニューからワークフロー更新を実行
```

> **ヒント**：
>
> - v2.0以降、`zcf`はデフォルトでインタラクティブメニューを開き、ビジュアル操作インターフェースを提供
> - メニューから操作を選択するか、コマンドを直接使用してクイック実行が可能
> - `zcf i` = 完全初期化、`zcf u` = ワークフローのみ更新

#### 🌐 多言語サポート

ZCFはバイリンガル操作をサポートし、すべてのコマンドで自動言語切り替え：

```bash
# 日本語ですべての操作を実行
npx zcf --lang ja          # 日本語インタラクティブメニュー
npx zcf init --lang ja      # 日本語インターフェース初期化
npx zcf ccr --allLang ja    # 日本語でCCR設定

# 言語パラメータの優先順位（高から低）：
# --all-lang > --lang > ユーザー保存の設定 > インタラクティブプロンプト
```

**言語パラメータの説明：**
- `--lang, -l`：ZCFインターフェース言語（すべてのコマンドに適用）
- `--all-lang, -g`：すべての言語パラメータを一度に設定（最も便利）
- `--config-lang, -c`：テンプレートファイル言語（init/updateコマンドのみ）
- `--ai-output-lang, -a`：AIアシスタント出力言語（initコマンドのみ）

#### 🤖 非インタラクティブモード

CI/CDおよび自動化シナリオ用、`--skip-prompt`とパラメータを使用：

```bash
# 短縮版
npx zcf i -s -g ja -t api_key -k "sk-xxx" -u "https://xxx.xxx"

# 完全版
npx zcf i --skip-prompt --all-lang ja --api-type api_key --api-key "sk-xxx" --api-url "https://xxx.xxx"
```

#### 非インタラクティブモードパラメータ説明

`--skip-prompt`使用時の利用可能なパラメータ：

| パラメータ                    | 説明                                    | 可能な値                                                                                               | 必須                          | デフォルト値                                                                           |
| ---------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------- | -------------------------------------------------------------------------------------- |
| `--skip-prompt, -s`          | すべてのインタラクティブプロンプトをスキップ | -                                                                                                      | はい（非インタラクティブモード必須） | -                                                                                      |
| `--lang, -l`                 | ZCF表示言語（すべてのコマンドに適用）       | `zh-CN`, `en`, `ja`                                                                                    | いいえ                        | `en`またはユーザー保存の設定                                                           |
| `--config-lang, -c`          | 設定ファイル言語（テンプレートファイル言語） | `zh-CN`, `en`                                                                                          | いいえ                        | `en`                                                                                   |
| `--ai-output-lang, -a`       | AI出力言語                               | `zh-CN`, `en`, `ja`, カスタム文字列                                                                     | いいえ                        | `en`                                                                                   |
| `--all-lang, -g`             | すべての言語パラメータを統一設定（すべてのコマンドに適用） | `zh-CN`, `en`, `ja`, カスタム文字列                                                     | いいえ                        | -（優先順位：allLang > lang > ユーザー設定 > プロンプト。カスタム文字列の場合、AI出力言語はカスタム、インタラクションと設定言語はen） |
| `--config-action, -r`        | 設定処理方法                              | `new`, `backup`, `merge`, `docs-only`, `skip`                                                          | いいえ                        | `backup`                                                                               |
| `--api-type, -t`             | API設定タイプ                            | `auth_token`, `api_key`, `ccr_proxy`, `skip`                                                           | いいえ                        | `skip`                                                                                 |
| `--api-key, -k`              | APIキー（APIキーと認証トークンタイプ用）    | 文字列                                                                                                 | `api-type`が`skip`でない場合必須 | -                                                                                      |
| `--api-url, -u`              | カスタムAPI URL                          | URL文字列                                                                                              | いいえ                        | 公式API                                                                                |
| `--mcp-services, -m`         | インストールするMCPサービス（複数選択、カンマ区切り） | `context7`, `open-websearch`, `spec-workflow`, `mcp-deepwiki`, `Playwright`, `exa`、または`skip`ですべてスキップ | いいえ                        | `all`                                                                                  |
| `--workflows, -w`            | インストールするワークフロー（複数選択、カンマ区切り） | `commonTools`, `sixStepsWorkflow`, `featPlanUx`, `gitWorkflow`, `bmadWorkflow`、または`skip`ですべてスキップ | いいえ                        | `all`                                                                                  |
| `--output-styles, -o`        | インストールする出力スタイル（複数選択、カンマ区切り） | `engineer-professional`, `nekomata-engineer`, `laowang-engineer`、または`skip`でインストールしない      | いいえ                        | `all`                                                                                  |
| `--default-output-style, -d` | デフォルト出力スタイル                     | 出力スタイルオプションと同じ、さらに組み込みスタイル：`default`, `explanatory`, `learning`                | いいえ                        | `engineer-professional`                                                                |
| `--install-cometix-line, -x` | CCometixLineステータスバーツールのインストール | `true`, `false`                                                                                        | いいえ                        | `true`                                                                                 |

#### 🎨 AI出力スタイル（v2.12+新機能）

ZCFはカスタマイズ可能なAI出力スタイルをサポートし、Claude Code体験をパーソナライズ：

**利用可能な出力スタイル：**

- `engineer-professional`：プロフェッショナルソフトウェアエンジニア、SOLID、KISS、DRY、YAGNI原則に従う
- `nekomata-engineer`：プロの猫娘エンジニア「幽浮喵」、厳密なエンジニアリング技術と可愛い猫娘の特質を組み合わせ
- `laowang-engineer`：老王の短気な技術フロー、コードエラーと不規則なコードを絶対に許さない
- 組み込みスタイル：`default`、`explanatory`、`learning`（常に利用可能）

**機能特性：**

- 複数のスタイルをインストールして切り替え可能
- すべてのプロジェクトにグローバルデフォルトスタイルを設定
- 古いパーソナライズ設定ファイルを自動クリーンアップ
- テンプレートベースのカスタムシステム

**使用のヒント：**

- `/output-style`コマンドを使用してプロジェクトレベルの出力スタイルをいつでも切り替え可能
- またはZCFメニューの6番目の項目でグローバル出力スタイルを変更

**重要な注意事項：**

- Claude Codeバージョンは1.0.81以上でoutput-styleをサポート、`npx zcf check`で更新可能
- 古いグローバルメモリルールは`プロフェッショナルソフトウェアエンジニア`出力スタイルに移行され、過剰なトークン使用とAIがグローバルメモリを忘れやすい問題を解決

#### 🎯 BMadワークフロー（v2.7新機能）

[BMad](https://github.com/bmad-code-org/BMAD-METHOD)（BMad-Method：ユニバーサルAIエージェントフレームワーク）はエンタープライズグレードのワークフローシステムで、以下を提供：

- 完全なプロフェッショナルAIエージェントチーム（PO、PM、アーキテクト、開発、QAなど）
- 構造化された開発プロセスと品質ゲート
- 自動ドキュメント生成
- 新規プロジェクト（グリーンフィールド）と既存プロジェクト（ブラウンフィールド）をサポート

インストール後、`/bmad-init`を使用してプロジェクトでBMadワークフローを初期化。

#### 📋 Specワークフロー（v2.12.4+新機能）

[Specワークフロー](https://github.com/Pimzino/spec-workflow-mcp)は、要件から実装までの構造化された機能開発ワークフローを提供する包括的なMCPサービス：

- **要件分析**：構造化された要件収集とドキュメント作成
- **設計フェーズ**：詳細な技術設計とアーキテクチャ計画
- **タスク管理**：自動タスク分解と進捗追跡
- **実装ワークフロー**：要件から実装への体系的な方法
- **インタラクティブダッシュボード**：組み込みのワークフロー視覚化と管理ダッシュボード
- **承認システム**：各開発段階のレビューと承認プロセス

SpecワークフローMCPはオプションのワークフロー視覚化ダッシュボードを提供。ユーザーは手動でダッシュボードを起動可能：
```bash
npx -y @pimzino/spec-workflow-mcp@latest --dashboard
```

または統合ワークフロー管理機能のために[VS Code拡張機能](https://marketplace.visualstudio.com/items?itemName=Pimzino.spec-workflow-mcp)をインストール。

**使用ガイド**：詳細な使用方法とベストプラクティスは、[Specワークフロー公式ドキュメント](https://github.com/Pimzino/spec-workflow-mcp/blob/main/README.md#quick-start)を参照。

#### 🔍 Open Web Search（v2.12.9+新機能）

[Open Web Search](https://github.com/Aas-ee/open-webSearch)は、複数の検索エンジンアクセスを提供する多機能Webサーチ MCPサービス：

- **マルチエンジンサポート**：DuckDuckGo、Bing、Brave検索エンジンをサポート
- **プライバシー保護**：デフォルトでプライバシー重視の検索エンジンを使用
- **柔軟な設定**：検索エンジンの優先設定をカスタマイズ可能
- **APIキー不要**：追加認証なしで即座に使用可能
- **検索集約**：複数のエンジンからの検索結果をマージサポート

#### 🚀 CCR (Claude Code Router)サポート（v2.8+強化版）

[CCR](https://github.com/musistudio/claude-code-router/blob/main/README_zh.md)は強力なプロキシルーターで、以下を実現：

- **無料モデルアクセス**：Claude Codeインターフェースで無料AIモデル（Gemini、DeepSeekなど）を使用
- **カスタムルーティング**：ルールに基づいて異なるタイプのリクエストを異なるモデルにルーティング
- **コスト最適化**：異なるタスクに適切なモデルを使用することで、APIコストを大幅に削減
- **便利な管理**：CCR設定とサービス制御のためのインタラクティブメニューを提供
- **自動更新**：CCRとClaude Codeの自動バージョンチェックと更新（v2.8.1+）

CCR機能にアクセス：

```bash
npx zcf ccr      # CCR管理メニューを開く
# または
npx zcf → Rを選択
```

CCRメニューオプション：

- CCRの初期化 - CCRのインストールと設定、プリセットプロバイダーをサポート
- UIの起動 - 高度な設定のためのCCR Webインターフェースを起動
- サービス制御 - CCRサービスの開始/停止/再起動
- ステータスチェック - 現在のCCRサービスステータスを表示

CCRセットアップ完了後、ZCFは自動的にClaude CodeがCCRをAPIプロキシとして使用するよう設定。

> **v2.9.1バージョンユーザーへの重要な注意**：以前にZCF v2.9.1バージョンでCCRを初期化した場合は、CCR初期化プロセスを再実行して、正しい`@musistudio/claude-code-router`パッケージがインストールされていることを確認してください。v2.9.1バージョンにはパッケージ名エラーの問題があり、後続バージョンで修正されています。

#### 📊 CCometixLineサポート（ステータスバーツール）（v2.9.9+新機能）

[CCometixLine](https://github.com/Haleclipse/CCometixLine)はRustベースの高性能ステータスバーツールで、以下を提供：

- **リアルタイム使用量追跡**：Claude Code API使用状況をリアルタイムで監視
- **Git統合**：Gitステータスとブランチ情報を表示
- **ステータスバー表示**：ターミナルステータスバーとのネイティブ統合
- **パフォーマンス最適化**：Rustで構築、リソース消費が極めて低い
- **TUI設定インターフェース**：テーマ、セグメント表示、表示オプションをカスタマイズ可能なインタラクティブターミナルインターフェース
- **自動更新**：ZCFの更新チェックシステムに統合済み

CCometixLineメニューオプション（`npx zcf` → `L`でアクセス）：

- `1` インストールまたは更新 - npmを使用してCCometixLineをインストールまたは更新
- `2` デフォルト設定を表示 - 現在のCCometixLine設定を表示
- `3` カスタム設定 - TUI設定モード - カスタム設定用のインタラクティブターミナルインターフェース

> **v2.9.9バージョンユーザーへの重要な注意**：以前にZCF v2.9.9バージョンでCCometixLineをインストールした場合は、インストールプロセスを再実行して、CCometixLine設定が正しく追加されていることを確認してください。`npx zcf`->`Lを選択`->`1を選択`を実行して、CCometixLine設定を追加。

#### 🚀 アップデートチェック（v2.8.1+、CCometixLineサポートv2.9.9+）：

```bash
npx zcf check-updates  # Claude Code、CCR、CCometixLineを最新バージョンにチェックして更新
# または
npx zcf → +を選択
```

### 初期化フロー

完全初期化（`npx zcf`）は自動的に：

- ✅ Claude Codeを検出してインストール
- ✅ AI出力言語を選択（新機能）
- ✅ APIキーまたはCCRプロキシを設定
- ✅ MCPサービスを選択して設定
- ✅ すべての必要な設定ファイルをセットアップ

### 使用方法

設定完了後：

- **プロジェクトの初回使用時は、まず`/init-project`を実行して階層初期化を行い、CLAUDE.mdを生成してAIがプロジェクトアーキテクチャを理解できるようにすることを強く推奨**
- `<タスクの説明>` - ワークフローを使用せずに直接実行、SOLID、KISS、DRY、YAGNI原則に従い、バグ修正などの小さなタスクに適している
- `/feat <タスクの説明>` - 新機能開発を開始、planとuiの2つのフェーズに分かれる
- `/workflow <タスクの説明>` - 完全な開発ワークフローを実行、自動化ではなく、最初に複数のソリューションを提供し、各ステップでユーザーの意見を求め、いつでもソリューションを変更可能、コントロール性MAX

> **PS**:
>
> - featとworkflowはそれぞれ利点があり、両方試して比較することをお勧め
> - 生成されるドキュメントの場所は、デフォルトでプロジェクトルートディレクトリの`.claude/xxx.md`、プロジェクトの`.gitignore`に`.claude/`を追加可能

## ✨ ZCFツールの特徴

### 🌏 多言語サポート

- スクリプトインタラクション言語：インストールプロセスのプロンプト言語を制御
- 設定ファイル言語：どの設定ファイルセットをインストールするか決定（zh-CN/en）
- AI出力言語：AIの返答言語を選択（簡体字中国語、英語、日本語、カスタム言語をサポート）
- AI出力スタイル：複数のプリセットスタイル（プロフェッショナルエンジニア、猫娘エンジニア、老王エンジニア）パーソナライズされた体験をサポート

### 🔧 インテリジェントインストール

- Claude Codeのインストール状態を自動検出
- npmを使用した自動インストール（互換性を確保）
- クロスプラットフォームサポート（Windows/macOS/Linux/Termux）
- MCPサービスの自動設定
- インテリジェントな設定マージと部分変更サポート（v2.0新機能）
- 強化されたコマンド検出メカニズム（v2.1新機能）
- 危険な操作の確認メカニズム（v2.3新機能）

### 📦 完全な設定

- CLAUDE.mdシステム指示
- settings.json設定ファイル
- commandsカスタムコマンド
- agents AI エージェント設定

### 🔐 API設定

- 2つの認証方法をサポート：
  - **Auth Token**：OAuthまたはブラウザログインで取得したトークンに適用
  - **API Key**：Anthropic Consoleから取得したAPIキーに適用
- カスタムAPI URLサポート
- claudeコマンドで後から設定することをサポート
- 部分変更機能：必要な設定項目のみを更新（v2.0新機能）

### 💾 設定管理

- 既存の設定をインテリジェントにバックアップ（すべてのバックアップは~/.claude/backup/に保存）
- 設定マージオプション（v2.0強化：ディープマージをサポート）
- 安全な上書きメカニズム
- MCP設定変更前の自動バックアップ
- デフォルトモデル設定（v2.0新機能）
- AIメモリ管理（v2.0新機能）
- ZCFキャッシュクリーニング（v2.0新機能）

## 📖 使用説明

### インタラクティブメニュー（v2.0）

```bash
$ npx zcf

 ZCF - Zero-Config Claude-Code Flow

? Select ZCF display language / 选择ZCF显示语言 / ZCF表示言語を選択:
  ❯ 日本語
    English
    简体中文

機能を選択してください:
  -------- Claude Code --------
  1. 完全初期化 - Claude Codeのインストール + ワークフローのインポート + APIまたはCCRプロキシの設定 + MCPサービスの設定
  2. ワークフローのインポート - ワークフロー関連ファイルのインポート/更新のみ
  3. APIの設定 - API URLと認証情報の設定（CCRプロキシサポート）
  4. MCPの設定 - MCPサービスの設定（Windows修正を含む）
  5. デフォルトモデルの設定 - デフォルトモデルの設定（opus/sonnet/opusplan/カスタム）
  6. Claudeグローバルメモリの設定 - AI出力言語と出力スタイルの設定
  7. 推奨環境変数と権限設定のインポート - プライバシー保護環境変数とシステム権限設定のインポート

  --------- その他のツール ----------
  R. CCR - Claude Code Router管理
  U. ccusage - Claude Code使用量分析
  L. CCometixLine - Rustベースの高性能ステータスバーツール、Git情報とリアルタイム使用量追跡を統合

  ------------ ZCF ------------
  0. 表示言語の変更 / Select display language - ZCFインターフェース言語の変更
  -. 設定キャッシュのクリア - 優先言語などのキャッシュをクリア
  +. アップデートチェック - Claude Code、CCR、CCometixLineのバージョンをチェックして更新
  Q. 終了

オプションを入力してEnterキーで確認（大文字小文字区別なし）: _
```

### 完全初期化フロー（1を選択または`zcf i`を使用）

```bash
? Claude Code設定言語を選択:
  ❯ 日本語 (ja) - 日本語版（日本のユーザー向け）
    简体中文 (zh-CN) - 中国語版（中国のユーザー向け）
    English (en) - 英語版（トークン消費が少ない）

? AI出力言語を選択:
  AIはこの言語であなたの質問に答えます
  ❯ 日本語
    简体中文
    English
    Custom
    （日本語、フランス語、ドイツ語など多言語サポート）

? Claude Codeがインストールされていないことを検出しました。自動的にインストールしますか？(Y/n)

✔ Claude Codeのインストールに成功

? 既存の設定ファイルを検出しました。どのように処理しますか？
  ❯ バックアップして上書き - 既存の設定を~/.claude/backup/にバックアップ
    ドキュメントのみ更新 - ワークフローとドキュメントのみ更新、既存のAPI設定を保持
    設定をマージ - 既存の設定とマージ、ユーザーカスタマイズコンテンツを保持
    スキップ - 設定更新をスキップ

? API認証方法を選択
  ❯ Auth Tokenを使用（OAuth認証）
    OAuthまたはブラウザログインで取得したトークンに適用
    API Keyを使用（キー認証）
    Anthropic Consoleから取得したAPIキーに適用
    CCRプロキシの設定（Claude Code Router）
    無料モデルとカスタムルーティングを使用、コスト削減、Claude Codeの可能性を探る
    スキップ（後で手動設定）

? API URLを入力してください: https://api.anthropic.com
? Auth TokenまたはAPI Keyを入力してください: xxx

? インストールする出力スタイルを選択:
  ❯ エンジニアプロフェッショナル版 - プロフェッショナルソフトウェアエンジニア、SOLID、KISS、DRY、YAGNI原則を厳格に遵守
    猫娘エンジニア - プロの猫娘エンジニア幽浮喵、厳密なエンジニアの素養と可愛い猫娘の特質を組み合わせ
    老王暴躁技術フロー - 老王暴躁技術フロー、コードエラーと不規則なコードを絶対に許さない

? グローバルデフォルト出力スタイルを選択:
  ❯ エンジニアプロフェッショナル版

? MCPサービスを設定しますか？(Y/n)

? インストールするMCPサービスを選択:
  ❯ context7 - 最新のライブラリとフレームワークのドキュメントを取得
    mcp-deepwiki - deepwiki.comのナレッジベースにアクセス
    Playwright - ブラウザ自動化とWebテスト
    exa - 高度な検索とエンタープライズグレードの研究ツール

? インストールするワークフローを選択:
  ❯ 汎用ツールワークフロー - init-projectと関連エージェント
    6ステップワークフロー - 完全な6段階開発プロセス
    機能計画UX - 完全な機能開発ライフサイクル
    Gitワークフロー - Git操作とブランチ管理
    BMadワークフロー - AI駆動のアジャイル開発方法論

? CCometixLineステータスバーツールをインストールしますか？(Y/n)

✔ 設定完了！Claude Code環境の準備ができました
```

## 🛠️ 開発

```bash
# プロジェクトをクローン
git clone https://github.com/UfoMiao/zcf.git
cd zcf

# 依存関係をインストール（pnpmを使用）
pnpm install

# プロジェクトをビルド
pnpm build

# ローカルテスト
node bin/zcf.mjs
```

## 💡 ベストプラクティス

1. **タスク分解**：タスクを独立してテスト可能な状態に保つ
2. **コード品質**：SOLID、KISS、DRY、YAGNI原則に従う
3. **ドキュメント管理**：計画はプロジェクトルートディレクトリの`.claude/plan/`ディレクトリに保存

## 🔧 トラブルシューティング

問題が発生した場合：

1. `npx zcf`を再実行して再設定
2. `~/.claude/`ディレクトリの設定ファイルを確認
3. Claude Codeが正しくインストールされていることを確認
4. パスにスペースが含まれている場合、ZCFは自動的にクォートで囲みます
5. より良いパフォーマンスのためにファイル検索にはripgrep (`rg`)を優先使用

### クロスプラットフォームサポート

#### Windowsプラットフォーム

ZCFはWindowsプラットフォームを完全にサポート：

- **自動検出**：Windowsシステムでは自動的に互換性のある`cmd /c npx`フォーマットを使用
- **設定修正**：既存の誤った設定は更新時に自動的に修正
- **ゼロ設定**：WindowsユーザーはmacOS/Linuxと同じ体験で追加操作不要

WindowsでMCP接続の問題が発生した場合、`npx zcf`を実行すると設定フォーマットが自動的に修正されます。

#### Termuxサポート（v2.1新機能）

ZCFはAndroid Termux環境での実行をサポート：

- **自動適応**：Termux環境を自動検出し、互換性のある設定を使用
- **拡張検出**：利用可能なコマンドをインテリジェントに識別し、制限された環境での正常動作を確保
- **完全機能**：Termuxでデスクトップシステムと同じ完全機能を享受

### セキュリティ機能（v2.3新機能）

#### 危険な操作の確認メカニズム

ユーザーデータの安全を保護するため、以下の操作には明確な確認が必要：

- **ファイルシステム**：ファイル/ディレクトリの削除、一括変更、システムファイルの移動
- **コードコミット**：`git commit`、`git push`、`git reset --hard`
- **システム設定**：環境変数の変更、システム設定、権限変更
- **データ操作**：データベース削除、スキーマ変更、一括更新
- **ネットワークリクエスト**：機密データの送信、本番環境APIの呼び出し
- **パッケージ管理**：グローバルインストール/アンインストール、コア依存関係の更新

## 🙏 謝辞

このプロジェクトのインスピレーションとオープンソースプロジェクト：

- [LINUX DO - 新しい理想的なコミュニティ](https://linux.do)
- [CCR](https://github.com/musistudio/claude-code-router)
- [CCometixLine](https://github.com/Haleclipse/CCometixLine)
- [ccusage](https://github.com/ryoppippi/ccusage)
- [BMad Method](https://github.com/bmad-code-org/BMAD-METHOD)

  これらのコミュニティ貢献者の共有に感謝します！

## ❤️ サポートとスポンサー

このプロジェクトが役立つと思われる場合は、開発をスポンサーすることを検討してください。あなたのサポートに非常に感謝します！

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/UfoMiao)

<table>
  <tr>
    <td><img src="/src/assets/alipay.webp" width="200" alt="Alipay" /></td>
    <td><img src="/src/assets/wechat.webp" width="200" alt="WeChat Pay" /></td>
  </tr>
</table>

### スポンサー

すべてのスポンサーの寛大なサポートに感謝します！

- Tc（最初のスポンサー）
- Argolinhas（最初のko-fiスポンサー ٩(•̤̀ᵕ•̤́๑)）
- r\*r（最初の匿名スポンサー🤣）
- 16°C咖啡（私の親友 🤪、Claude Code max $200プランを提供）

## 📄 ライセンス

MITライセンス

---

このプロジェクトが役立った場合は、⭐️ Starをお願いします！

[![Star History Chart](https://api.star-history.com/svg?repos=UfoMiao/zcf&type=Date)](https://star-history.com/#UfoMiao/zcf&Date)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/zcf?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/zcf
[npm-downloads-src]: https://img.shields.io/npm/dm/zcf?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/zcf
[license-src]: https://img.shields.io/github/license/ufomiao/zcf.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/ufomiao/zcf/blob/main/LICENSE
[claude-code-src]: https://img.shields.io/badge/Claude-Code-1fa669?style=flat&colorA=080f12&colorB=1fa669
[claude-code-href]: https://claude.ai/code
[codecov-src]: https://codecov.io/gh/UfoMiao/zcf/graph/badge.svg?token=HZI6K4Y7D7&style=flat&colorA=080f12&colorB=1fa669
[codecov-href]: https://codecov.io/gh/UfoMiao/zcf
[jsdocs-src]: https://img.shields.io/badge/jsdocs-reference-1fa669?style=flat&colorA=080f12&colorB=1fa669
[jsdocs-href]: https://www.jsdocs.io/package/zcf
[deepwiki-src]: https://img.shields.io/badge/Ask-DeepWiki-1fa669?style=flat&colorA=080f12&colorB=1fa669
[deepwiki-href]: https://deepwiki.com/UfoMiao/zcf
