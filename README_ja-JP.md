[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Claude Code][claude-code-src]][claude-code-href]
[![codecov][codecov-src]][codecov-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![Ask DeepWiki][deepwiki-src]][deepwiki-href]

<div align="center">
  <img src="./src/assets/banner.webp" alt="Banner"/>

  <h1>
    ZCF - Zero-Config Code Flow
  </h1>

  <p align="center">
   <a href="README.md">English</a> | <a href="README_zh-CN.md">中文</a> | <b>日本語</b> | <a href="CHANGELOG.md">更新履歴</a>

**✨ クイックリンク**: [Codexサポート](#-codexサポートv300新機能) | [BMadワークフロー](#-bmadワークフローv27新機能) | [Specワークフロー](#-specワークフローv2124新機能) | [Open Web Search](#-open-web-searchv2129新機能) | [CCRルーター](#-ccr-claude-code-router-サポートv28強化版) | [CCometixLine](#-ccometixlineサポートステータスバーツールv299新機能) | [出力スタイル](#-ai出力スタイルv212新機能) | [多設定管理](#-多設定管理v320-新機能)

> ゼロ設定、ワンクリックで Claude Code & Codex 環境セットアップ - 多言語設定、インテリジェントプロキシシステム、パーソナライズされたAIアシスタント対応
  </p>
</div>

## ♥️ スポンサー AI API

[![スポンサー AI API](./src/assets/302.ai-jp.jpg)](https://share.302.ai/gAT9VG)
[302.AI](https://share.302.ai/gAT9VG) は、従量課金制のエンタープライズ向けAIリソースプラットフォームで、市場で最新かつ最も包括的なAIモデルとAPIに加え、すぐに使える多様なオンラインAIアプリを提供します。

---

<table>
<tr>
<td width="180"><a href="https://www.packyapi.com/register?aff=zcf"><img src="./src/assets/packycode.png" alt="PackyCode" width="150"></a></td>
<td>PackyCode がこのプロジェクトを支援してくれました！PackyCode は信頼性と効率性の高いAPI中継サービスプロバイダーで、Claude Code、Codex、Gemini などの中継サービスを提供します。PackyCode はこのソフトウェアのユーザーに特別な割引を提供します：<a href="https://www.packyapi.com/register?aff=zcf">このリンク</a> を使用して登録し、再課金時に "zcf" プロモーションコードを入力すると 10% 割引を享受できます。</td>
</tr>
</table>

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
- `5` デフォルトモデルの設定 - デフォルトモデルの設定（opus/sonnet/sonnet 1m/カスタム）
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
- **Opus**：Claude-4.1-Opusを専用使用（高トークン消費、慎重に使用してください）
- **Sonnet 1M**：1Mコンテキストウィンドウを持つSonnetモデルで大規模コンテキストタスクを処理
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
npx zcf ccr --all-lang ja    # 日本語でCCR設定

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
# APIプロバイダープリセットを使用（v3.3.0+新機能 - 簡略版）
npx zcf i -s -p 302ai -k "sk-xxx"

# 短縮版（従来の方法）
npx zcf i -s -g ja -t api_key -k "sk-xxx" -u "https://xxx.xxx"

# 完全版（従来の方法）
npx zcf i --skip-prompt --all-lang ja --api-type api_key --api-key "sk-xxx" --api-url "https://xxx.xxx"

# プロバイダープリセットでカスタムモデルを設定
npx zcf i -s -p 302ai -k "sk-xxx" -M "claude-sonnet-4-5" -F "claude-haiku-4-5"

# 完全版（カスタムモデル設定）
npx zcf i --skip-prompt \
  --api-type api_key \
  --api-key "sk-xxx" \
  --api-url "https://xxx.xxx" \
  --api-model "claude-sonnet-4-5" \
  --api-fast-model "claude-haiku-4-5"

# 複数のAPI設定（JSON文字列）
npx zcf i -s --api-configs '[
  {"provider":"302ai","key":"sk-xxx"},
  {"provider":"glm","key":"sk-yyy"},
  {"name":"custom","type":"api_key","key":"sk-zzz","url":"https://custom.api.com","primaryModel":"claude-sonnet-4-5","fastModel":"claude-haiku-4-5","default":true}
]'

# 複数のAPI設定（JSONファイル）
npx zcf i -s --api-configs-file ./api-configs.json

# Codex複数プロバイダー設定
npx zcf i -s -T cx --api-configs '[
  {"provider":"302ai","key":"sk-xxx"},
  {"name":"custom","type":"api_key","key":"sk-yyy","url":"https://custom.api.com","primaryModel":"gpt-5","default":true}
]'
```

#### 🎯 APIプロバイダープリセット（v3.3.0+新機能）

ZCFはAPIプロバイダープリセットをサポートし、baseUrlとモデルを自動設定することで、設定を5+パラメータからわずか2つに簡略化：

**サポートされているプロバイダー：**
- `302ai` - [302.AI](https://share.302.ai/gAT9VG) APIサービス
- `packycode` - [PackyCode](https://www.packyapi.com/register?aff=zcf) APIサービス
- `glm` - GLM（z.ai）
- `minimax` - MiniMax APIサービス
- `kimi` - Kimi（Moonshot AI）
- `custom` - カスタムAPIエンドポイント（手動URL設定が必要）

**使用例：**

```bash
# 302.AIプロバイダーを使用
npx zcf i --skip-prompt --provider 302ai --api-key "sk-xxx"
# または短縮形
npx zcf i -s -p 302ai -k "sk-xxx"

# PackyCodeプロバイダーを使用
npx zcf i -s -p packycode -k "sk-xxx"

# GLMプロバイダーを使用
npx zcf i -s -p glm -k "sk-xxx"

# MiniMaxプロバイダーを使用
npx zcf i -s -p minimax -k "sk-xxx"

# Kimiプロバイダーを使用
npx zcf i -s -p kimi -k "sk-xxx"

# カスタムプロバイダーを使用（URLが必要）
npx zcf i -s -p custom -k "sk-xxx" -u "https://api.example.com"

# Codex用
npx zcf i -s -T cx -p 302ai -k "sk-xxx"
```

**メリット：**
- ✅ baseUrlの自動設定
- ✅ authTypeの自動選択
- ✅ モデルの自動設定（利用可能な場合）
- ✅ 設定を5+パラメータから2つに削減
- ✅ Claude CodeとCodexの両方をサポート

#### 非インタラクティブモードパラメータ説明

`--skip-prompt`使用時の利用可能なパラメータ：

| パラメータ                    | 説明                                    | 可能な値                                                                                               | 必須                          | デフォルト値                                                                           |
| ---------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------- | -------------------------------------------------------------------------------------- |
| `--skip-prompt, -s`          | すべてのインタラクティブプロンプトをスキップ | -                                                                                                      | はい（非インタラクティブモード必須） | -                                                                                      |
| `--provider, -p`             | APIプロバイダープリセット（v3.3.0+新機能） | `302ai`, `packycode`, `glm`, `minimax`, `kimi`, `custom`                                               | いいえ                        | -（baseUrlとモデルの自動入力で設定を簡略化）                                          |
| `--lang, -l`                 | ZCF表示言語（すべてのコマンドに適用）       | `zh-CN`, `en`, `ja`                                                                                    | いいえ                        | `en`またはユーザー保存の設定                                                           |
| `--config-lang, -c`          | 設定ファイル言語（テンプレートファイル言語） | `zh-CN`, `en`                                                                                          | いいえ                        | `en`                                                                                   |
| `--ai-output-lang, -a`       | AI出力言語                               | `zh-CN`, `en`, `ja`, カスタム文字列                                                                     | いいえ                        | `en`                                                                                   |
| `--all-lang, -g`             | すべての言語パラメータを統一設定（すべてのコマンドに適用） | `zh-CN`, `en`, `ja`, カスタム文字列                                                     | いいえ                        | -（優先順位：`--all-lang` > `--lang` > ユーザー保存の設定 > インタラクティブプロンプト。カスタム文字列の場合、AI出力言語はカスタム、対話と設定言語は `en` のまま） |
| `--config-action, -r`        | 設定処理方法                              | `new`, `backup`, `merge`, `docs-only`, `skip`                                                          | いいえ                        | `backup`                                                                               |
| `--api-type, -t`             | API設定タイプ                            | `auth_token`, `api_key`, `ccr_proxy`, `skip`                                                           | いいえ                        | `skip`（`--provider`指定時は自動的に`api_key`に設定）                                 |
| `--api-key, -k`              | APIキー（APIキーと認証トークンタイプ用）    | 文字列                                                                                                 | `api-type`が`skip`でない場合必須 | -                                                                                      |
| `--api-url, -u`              | カスタムAPI URL                          | URL文字列                                                                                              | いいえ                        | 公式API（`--provider`使用時は自動入力）                                               |
| `--api-model, -M`            | プライマリAPIモデル                       | 文字列（例：`claude-sonnet-4-5`）                                                                      | いいえ                        | -（`--provider`使用時は自動入力、利用可能な場合）                                     |
| `--api-fast-model, -F`       | 高速APIモデル（Claude Codeのみ）          | 文字列（例：`claude-haiku-4-5`）                                                                       | いいえ                        | -（`--provider`使用時は自動入力、利用可能な場合）                                     |
| `--mcp-services, -m`         | インストールするMCPサービス（複数選択、カンマ区切り） | `context7`, `open-websearch`, `spec-workflow`, `mcp-deepwiki`, `Playwright`, `exa`, `serena`、または`skip`ですべてスキップ | いいえ                        | `all`                                                                                  |
| `--workflows, -w`            | インストールするワークフロー（複数選択、カンマ区切り） | `commonTools`, `sixStepsWorkflow`, `featPlanUx`, `gitWorkflow`, `bmadWorkflow`、または`skip`ですべてスキップ | いいえ                        | `all`                                                                                  |
| `--output-styles, -o`        | インストールする出力スタイル（複数選択、カンマ区切り） | `engineer-professional`, `nekomata-engineer`, `laowang-engineer`, `ojousama-engineer`、または`skip`でインストールしない      | いいえ                        | `all`                                                                                  |
| `--default-output-style, -d` | デフォルト出力スタイル                     | 出力スタイルオプションと同じ、さらに組み込みスタイル：`default`, `explanatory`, `learning`                | いいえ                        | `engineer-professional`                                                                |
| `--install-cometix-line, -x` | CCometixLineステータスバーツールのインストール | `true`, `false`                                                                                        | いいえ                        | `true`                                                                                 |
| `--code-type, -T`            | ターゲットコードツールタイプ               | `claude-code`, `codex`, `cc`, `cx`                                                                     | いいえ                        | ZCF設定の現在のアクティブツールタイプ                                                  |
| `--api-configs`              | 複数のAPI設定（JSON文字列）                | API設定オブジェクトのJSON配列文字列                                                                    | いいえ                        | -（`--api-configs-file`と相互排他的）                                                  |
| `--api-configs-file`         | 複数のAPI設定（JSONファイルパス）          | API設定配列を含むJSONファイルのパス                                                                    | いいえ                        | -（`--api-configs`と相互排他的）                                                       |

#### 🤖 Codexサポート（v3.0.0+新機能）

[Codex](https://www.npmjs.com/package/@openai/codex)はOpenAI公式のコード生成CLIツール。ZCFはClaude Codeと同じ設定の便利さでCodexの完全統合をサポートします。

**主要機能：**

- **統合ツール管理**：ZCFメニューを通じてClaude CodeとCodex間でシームレスに切り替え
- **インテリジェント設定**：自動Codex CLIインストール、APIプロバイダー設定、MCPサービス統合
- **包括的バックアップシステム**：すべての設定変更にタイムスタンプ付きバックアップとリカバリ機能を含む
- **マルチプロバイダーサポート**：複数のAPIプロバイダー（OpenAI、カスタムエンドポイント）を設定し、簡単に切り替え
- **システムプロンプト統合**：プロフェッショナルAIパーソナリティ（エンジニア、猫娘エンジニア、老王エンジニア）をインストール
- **ワークフローテンプレート**：コード生成タスクに最適化された構造化開発ワークフローをインポート
- **高度なアンインストーラー**：競合解決付きCodexコンポーネントの選択的削除

**Codexクイックスタート：**

ZCFメインメニューでCodexモードに切り替え：
```bash
npx zcf → Sを選択  # Claude CodeとCodex間で切り替え
```

またはCodex機能に直接アクセス：
```bash
# 完全Codex初期化
npx zcf → 1を選択（Codexモードに切り替え後）

# 個別Codex設定
npx zcf → 3を選択  # Codex APIプロバイダーを設定
npx zcf → 4を選択  # Codex MCPサービスを設定
```

**設定オプション：**

1. **APIプロバイダー設定**：
   - **公式ログイン**：OpenAI公式認証システムを使用
   - **カスタムプロバイダー**：複数のAPIエンドポイントを設定し、プロバイダー切り替え
   - **インクリメンタル管理**：既存設定に影響を与えずにプロバイダーを追加、編集、削除

2. **システムプロンプトスタイル**：
   - **プロフェッショナルエンジニア**：堅牢なコードのためのSOLID、KISS、DRY、YAGNI原則
   - **猫娘エンジニア**：厳格な技術基準を持つ可愛い猫娘エンジニア
   - **老王エンジニア**：低品質なコードを決して許さない短気な技術流

3. **ワークフロー統合**：
   - **6ステップワークフロー**：研究から最適化までの構造化開発プロセス
   - **カスタムワークフロー**：タスク固有の開発テンプレートをインポートして設定
   - **⚠️ 重要なお知らせ**：Codexプロンプトの制限により、`/workflow`コマンドは直接パラメータを渡すことができません。まず`/workflow`を使用し、その後のメッセージでタスクの説明を提供してください

4. **MCPサービス**：既存のMCPサービスと完全に互換性があり、以下を含む：
   - Context7、オープンWeb検索、Specワークフロー
   - DeepWiki、Playwright、EXA検索
   - Serenaアシスタントによるセマンティックコード検索・編集
   - APIキー管理付き自動サービス設定

**ファイルの場所：**

- 設定：`~/.codex/config.toml`
- 認証：`~/.codex/auth.json`
- システムプロンプト：`~/.codex/AGENTS.md`
- ワークフロー：`~/.codex/prompts/`
- バックアップ：`~/.codex/backup/`

**ツール間の移行：**

ZCFはClaude CodeとCodex間でのシームレスな切り替えを可能にし、設定とワークフロー設定を保持します。両方のツールは一貫した開発体験のために同じMCPサービスとワークフローテンプレートを共有します。

#### 🎨 AI出力スタイル（v2.12+新機能）

ZCFはカスタマイズ可能なAI出力スタイルをサポートし、Claude Code体験をパーソナライズ：

<p align="center">
<a href="https://github.com/Haleclipse">
<img src="./src/assets/Haleclipse.gif" alt="ハレクリプス" width="200"/>
</a>
<div align="center">ツンデレな<a href="https://github.com/Haleclipse">ハレクリプス</a>お嬢様(￣▽￣)ゞ</div>
</p>

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
- クロスプラットフォームサポート（Windows/macOS/Linux/WSL/Termux）
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

ZCFはClaude CodeとCodexの両方に柔軟なAPI設定オプションを提供します：

**APIプロバイダープリセットによる迅速な設定（v3.3.0+ 新機能）：**

事前設定された人気のAPIプロバイダーから選択：
- **302.AI** - 包括的なモデルサポートを備えた従量課金制AIサービス
- **PackyCode** - PackyCode APIサービス
- **GLM（智谱AI）** - Zhipu AIのGLMモデル
- **MiniMax** - MiniMax AIサービス
- **Kimi（Moonshot AI）** - MoonshotのKimiモデル
- **カスタム設定** - 任意のプロバイダーに対応する完全な手動設定

プリセットプロバイダーを使用する場合、必要なのは：
1. リストからプロバイダーを選択
2. APIキーを入力

システムが自動的に設定：
- APIベースURL
- 認証タイプ（API KeyまたはAuth Token）
- デフォルトモデル（該当する場合）
- Wire APIプロトコル（Codex用）

**従来の設定方法：**

- **公式ログイン**：公式認証システムを使用（API設定不要）
- **Auth Token**：OAuthまたはブラウザログインで取得したトークン
- **API Key**：Anthropic Consoleまたはカスタムプロバイダーから取得したAPIキー
- **CCRプロキシ**：Claude Code Routerプロキシの設定
- **カスタムAPI URL**：互換性のある任意のAPIエンドポイントをサポート
- **部分変更**：必要な設定項目のみを更新（v2.0+）

### 💾 設定管理

- 既存の設定をインテリジェントにバックアップ（すべてのバックアップは~/.claude/backup/に保存）
- 設定マージオプション（v2.0強化：ディープマージをサポート）
- 安全な上書きメカニズム
- MCP設定変更前の自動バックアップ
- デフォルトモデル設定（v2.0新機能）
- AIメモリ管理（v2.0新機能）
- ZCFキャッシュクリーニング（v2.0新機能）

### 🧩 多設定管理（v3.2.0 新機能）

Claude Code と Codex の両方に対して、統一された増分式・対話型の設定管理を提供します：

- Claude Code：APIプロファイルの管理（追加/編集/削除、デフォルト、重複検知）
- Codex：モデルプロバイダーの管理（一覧/切替、公式ログインは対話モード）
- 安全なバックアップ；最後の1件の削除防止（Claude Code）
- 適用時に `~/.claude/settings.json` を更新し、必要に応じて CCR を再起動
- 保存先：`~/.ufomiao/zcf/config.toml`（バックアップ `config.backup.YYYY-MM-DD_HH-mm-ss.toml`）

ツール種別の指定：

```bash
# -T は claude-code|codex または短縮 cc|cx を受け付け
npx zcf cs --list -T cc    # Claude Code プロファイルを一覧
npx zcf cs --list -T cx    # Codex プロバイダーを一覧
npx zcf cs -l -T cc        # --list の短縮オプション
npx zcf cs -l -T cx        # --list の短縮オプション
```

Claude Code の使い方：

```bash
# クイックスイッチ
npx zcf cs official -T cc  # 公式ログインへ切替
npx zcf cs ccr -T cc       # CCR プロキシへ切替
npx zcf cs my-profile -T cc
```

Codex の使い方：

```bash
# プロバイダーの一覧と切替
npx zcf cs --list -T cx
npx zcf cs my-provider -T cx

# 公式ログインへ切替（対話式）
npx zcf config-switch -T cx
```

補足：
- 環境変数（Claude Code）：API Key → `ANTHROPIC_API_KEY`、Auth Token → `ANTHROPIC_AUTH_TOKEN`、Base URL → `ANTHROPIC_BASE_URL`。
- 現在のツール種別は ZCF 設定に保存されます。通常は `-T cc/cx` を付ける必要はなく、別ツールを対象にする場合のみ指定してください。

 

## 📖 使用説明

### インタラクティブメニュー（v2.0）

```bash
$ npx zcf

 ZCF - Zero-Config Code Flow

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
  5. デフォルトモデルの設定 - デフォルトモデルの設定（opus/sonnet/sonnet 1m/カスタム）
  6. Claudeグローバルメモリの設定 - AI出力言語と出力スタイルの設定
  7. 推奨環境変数と権限設定のインポート - プライバシー保護環境変数とシステム権限設定のインポート

  --------- その他のツール ----------
  R. CCR - Claude Code Router管理
  U. ccusage - Claude Code使用量分析
  L. CCometixLine - Rustベースの高性能ステータスバーツール、Git情報とリアルタイム使用量追跡を統合

  ------------ ZCF ------------
  0. 表示言語の変更 / Select display language - ZCFインターフェース言語の変更
  -. アンインストール - システムからClaude Code設定とツールを削除
  +. アップデートチェック - Claude Code、CCR、CCometixLineのバージョンをチェックして更新
  Q. 終了

オプションを入力してEnterキーで確認（大文字小文字区別なし）: _
```

### 完全初期化フロー（1を選択または`zcf i`を使用）

```bash
? 設定言語を選択:
  ❯ English (en) - 英語版（トークン消費が少ない）
    简体中文 (zh-CN) - 中国語版（中国のユーザー向けカスタマイズ）
    日本語 (ja) - 日本語版（日本のユーザー向けカスタマイズ）

? AI出力言語を選択:
  AIはこの言語であなたの質問に答えます
  ❯ 日本語
    English
    简体中文
    Custom
    （フランス語、ドイツ語など多言語サポート）

? Claude Codeがインストールされていないことを検出しました。自動的にインストールしますか？(Y/n)

✔ Claude Codeのインストールに成功

? 既存の設定ファイルを検出しました。どのように処理しますか？
  ❯ バックアップして上書き - 既存の設定を~/.claude/backup/にバックアップ
    ドキュメントのみ更新 - ワークフローとドキュメントのみ更新、既存のAPI設定を保持
    設定をマージ - 既存の設定とマージ、ユーザーカスタマイズコンテンツを保持
    スキップ - 設定更新をスキップ

? API認証方法を選択
  ❯ 公式ログインを使用
    公式認証システムを使用、API設定不要
    Auth Tokenを使用（OAuth認証）
    OAuthまたはブラウザログインで取得したトークンに適用
    API Keyを使用（キー認証）
    Anthropic Consoleから取得したAPIキーに適用
    CCRプロキシの設定（Claude Code Router）
    プロキシルーティングで複数のAIモデルを使用、コスト削減と可能性の拡張
    スキップ（後で手動設定）

? API URLを入力してください: https://api.anthropic.com
? Auth TokenまたはAPI Keyを入力してください: xxx

✔ API設定完了

? インストールする出力スタイルを選択:
  ❯ エンジニアプロフェッショナル版 - プロフェッショナルソフトウェアエンジニア、SOLID、KISS、DRY、YAGNI原則を厳格に遵守
    猫娘エンジニア - プロの猫娘エンジニア幽浮喵、厳密なエンジニアの素養と可愛い猫娘の特質を組み合わせ
    老王暴躁技術フロー - 老王暴躁技術フロー、コードエラーと不規則なコードを絶対に許さない

? グローバルデフォルト出力スタイルを選択:
  ❯ エンジニアプロフェッショナル版

? インストールするワークフローを選択（スペースで選択、Enterで確定）:
❯ ◉ 汎用ツール (init-project + init-architect + get-current-datetime) - 基本的なプロジェクト初期化と実用コマンド
◉ 6ステップワークフロー (workflow) - 完全な6段階開発プロセス
◉ 機能計画とUX設計 (feat + planner + ui-ux-designer) - 構造化された新機能開発
◉ Git コマンド (commit + rollback + cleanBranches + worktree) - 簡略化されたGit操作
◉ BMAD-Method 拡張インストーラー - エンタープライズアジャイル開発ワークフロー

✔ ワークフローをインストール中...
✔ インストール済みコマンド: zcf/workflow.md
✔ インストール済みコマンド: zcf/feat.md
✔ インストール済みエージェント: zcf/plan/planner.md
✔ インストール済みエージェント: zcf/plan/ui-ux-designer.md
✔ インストール済みコマンド: zcf/git/git-commit.md
✔ インストール済みコマンド: zcf/git/git-rollback.md
✔ インストール済みコマンド: zcf/git/git-cleanBranches.md
✔ インストール済みコマンド: zcf/git/git-worktree.md
✔ インストール済みコマンド: zcf/bmad-init.md
✔ ワークフローのインストールが成功しました

? MCPサービスを設定しますか？(Y/n)

? インストールするMCPサービスを選択（スペースで選択、Enterで確定）:
❯ ◯ すべてインストール
◯ Context7 ドキュメント検索 - 最新のライブラリドキュメントとコード例を検索
◯ open-websearch - DuckDuckGo、Bing、Brave検索エンジンでウェブ検索
◯ Spec ワークフロー - 要件から実装までの体系的な機能開発ワークフロー
◯ DeepWiki - GitHubリポジトリドキュメントとサンプルを検索
◯ Playwright ブラウザ制御 - ブラウザを直接制御して自動操作
◯ Exa AI 検索 - Exa AIでウェブ検索
◯ Serena アシスタント - IDEのようなセマンティックコード検索・編集

? Exa API Keyを入力してください（https://dashboard.exa.ai/api-keys から取得）

✔ MCPサービスが設定されました

? CCometixLineステータスバーツールをインストールしますか？(Y/n)

✔ 設定完了！Claude Code環境の準備ができました

🎉 設定完了！'claude'コマンドで体験を開始してください。

```

## 🛠️ 開発

### コマンドラインオプション

#### コマンド早見表

| コマンド              | エイリアス | 説明                                                                                           |
| --------------------- | ---------- | ---------------------------------------------------------------------------------------------- |
| `zcf`                 | -          | インタラクティブメニューを表示（v2.0 デフォルトコマンド）                                      |
| `zcf init`            | `zcf i`    | Claude Code の設定を初期化                                                                      |
| `zcf update`          | `zcf u`    | ワークフロー関連の Markdown ドキュメントをバックアップ付きで更新                               |
| `zcf ccu`             | -          | Claude Code 使用量分析ツールを実行 - [ccusage](https://github.com/ryoppippi/ccusage)           |
| `zcf ccr`             | -          | CCR (Claude Code Router) 管理メニューを開く                                                    |
| `zcf config-switch`   | `zcf cs`   | Claude Code / Codex の API プロバイダー/設定切替（`-T cc` / `-T cx` を使用）                   |
| `zcf uninstall`       | -          | Claude Code の設定とツールをインタラクティブにアンインストール                                 |
| `zcf check-updates`   | -          | Claude Code、CCR、CCometixLine のバージョンを確認・更新                                         |

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

#### WSL サポート（v2.12.12+ 新機能）

ZCF は Windows Subsystem for Linux (WSL) の包括的なサポートを提供：

- **スマート検出**：環境変数、システムファイル、マウントポイントを使用した多層 WSL 環境検出
- **ディストリビューション認識**：WSL ディストリビューション（Ubuntu、Debian など）を自動識別し、最適化された設定を提供
- **シームレスインストール**：WSL 環境内でネイティブ Linux スタイルのインストール体験
- **パス管理**：WSL 固有の設定パスとファイル位置のインテリジェント処理

WSL で実行する場合、ZCF は環境を自動検出し、適切なインストールメッセージを表示します。

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

- [302.AI](https://share.302.ai/gAT9VG)（最初の企業スポンサー 🤠）
- [PackyCode](https://www.packyapi.com/register?aff=zcf)（最初のAPIプロキシサービススポンサー 🧝🏻‍♀️）
- Tc（最初のスポンサー）
- Argolinhas（最初のko-fiスポンサー ٩(•̤̀ᵕ•̤́๑)）
- r\*r（最初の匿名スポンサー 🤣）
- \*\*康（最初のKFCスポンサー 🍗）
- \*东（最初のコーヒースポンサー ☕️）
- 炼\*3（最初のTermuxユーザースポンサー 📱）
- [chamo101](https://github.com/chamo101)（最初のGitHub issue ユーザースポンサー 🎉）
- 初屿贤（最初のCodexユーザースポンサー 🙅🏻‍♂️）
- Protein（最初の1688スポンサー 😏）
- [musistudio](https://github.com/musistudio)（最初のオープンソースプロジェクト作者スポンサー、[CCR](https://github.com/musistudio/claude-code-router) の作者です 🤩）
- [BeatSeat](https://github.com/BeatSeat)（コミュニティエキスパート 😎、$1000 Claude クレジットを提供）
- [wenwen](https://github.com/wenwen12345)（コミュニティエキスパート 🤓、毎日 $100 Claude&GPT クレジットを提供）
- 16°C coffee（私の親友 🤪、ChatGPT Pro $200パッケージを提供）

### プロモーション感謝

このプロジェクトを宣伝してくださった以下の著者に感謝します：

- 逛逛 GitHub, ツイート: https://mp.weixin.qq.com/s/phqwSRb16MKCHHVozTFeiQ
- Geek, ツイート: https://x.com/geekbb/status/1955174718618866076

## 📄 ライセンス

[MITライセンス](LICENSE)

---

## 🚀 コントリビューター

<a href="https://github.com/UfoMiao/zcf/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=UfoMiao/zcf" />
</a>
<br /><br />

## ⭐️ スター履歴

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
