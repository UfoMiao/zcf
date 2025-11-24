---
title: インストールガイド
---

# インストールガイド

このガイドは、環境チェックから検証までの完全なプロセスをカバーし、ZCFを迅速に開始するのに役立ちます。初めて使用する場合でも、新しいデバイスに迅速にデプロイしたい場合でも、このガイドに従ってセットアップを完了できます。

> 💡 **ヒント**: ZCFはインストール不要で、`npx zcf`を直接実行できます。このガイドは主に環境設定と使用フローについて説明しています。

## 環境要件

開始する前に、システムが以下の要件を満たしていることを確認してください：

| 要件項目 | 最低バージョン | 推奨バージョン | 説明 |
|--------|---------|---------|------|
| **Node.js** | 22.x | 22.x 以上 | Node.js 22+ が必要 |
| **npm** | Node.jsと一緒にインストール | 最新版 | `npx`コマンドのサポートが必要 |
| **オペレーティングシステム** | - | - | macOS、Linux、Windows PowerShell/WSL、Termux |

> 💡 **ヒント**: WSL（Windows Subsystem for Linux）を使用している場合、ZCFは自動的に環境を検出し、対応するインストールプロンプトを提供します。

### 環境の確認

インストールを開始する前に、以下のコマンドを実行して環境を確認できます：

```bash
# Node.jsのバージョンを確認
node --version

# npmが利用可能か確認
npm --version

# npxが利用可能か確認
npx --version
```

> ⚠️ **注意**: Node.jsのバージョンが22より低い場合は、先にNode.jsをアップグレードしてください。[nvm](https://github.com/nvm-sh/nvm)または[fnm](https://github.com/Schniz/fnm)を使用して複数のNode.jsバージョンを管理できます。

## 使用方法

ZCFは2つの使用方法を提供します：**対話式使用**（初心者向け）と**コマンドライン直接使用**（自動化とCI/CD向け）。

> 💡 **ヒント**: ZCFはインストール不要で、`npx zcf`コマンドを直接実行できます。

### 方法1: 対話式使用（初心者におすすめ）

ZCFは、グラフィカルインターフェースですべての設定を完了できる、使いやすい対話式メニューを提供します。

#### ZCFの起動

```bash
npx zcf
```

初回実行時、ZCFはウェルカム画面を表示し、使用したいインターフェース言語を尋ねます：

```
ZCF - Zero-Config Code Flow

? Select ZCF display language / 选择ZCF显示语言:
  ❯ 简体中文
    English
```

#### メインメニューオプション

メインメニューに入ると、以下のオプションが表示されます：

```
機能を選択してください:
  -------- Claude Code --------
  1. 完全初期化 - Claude Codeのインストール + ワークフローのインポート + APIまたはCCRプロキシの設定 + MCPサービスの設定
  2. ワークフローのインポート - ワークフロー関連ファイルのみインポート/更新
  3. APIの設定 - API URLと認証情報の設定（CCRプロキシをサポート）
  4. MCPの設定 - MCPサービスの設定（Windows修正を含む）
  5. デフォルトモデルの設定 - デフォルトモデルの設定（opus/sonnet/sonnet 1m/カスタム）
  6. Claudeグローバルメモリの設定 - AI出力言語と出力スタイルの設定
  7. 推奨環境変数と権限設定のインポート - プライバシー保護環境変数とシステム権限設定のインポート

  --------- その他のツール ----------
  R. CCR - Claude Code Router管理
  U. ccusage - Claude Code使用量分析
  L. CCometixLine - Git情報とリアルタイム使用量追跡を統合した、Rustベースの高性能ステータスバーツール

  ------------ ZCF ------------
  0. 表示言語の変更 / Select display language - ZCFインターフェース言語の変更
  -. アンインストール - システムからClaude Code設定とツールを削除
  +. 更新チェック - Claude Code、CCR、CCometixLineのバージョンをチェックして更新
  Q. 終了
```

#### 対話式初期化フロー

`1`を選択して完全初期化を実行すると、ZCFは以下のステップでガイドします：

**ステップ1: 設定言語の選択**
```
? 設定言語を選択:
  ❯ English (en) - 英語版（トークン消費が低い）
    简体中文 (zh-CN) - 中国語版（中国語ユーザーがカスタマイズしやすい）
    日本語 (ja) - 日本語版
```

> 💡 **選択の推奨**：
> - **English**: 低トークン消費を追求するシナリオに適しています
> - **简体中文**: 中国語チームに適しており、カスタマイズとメンテナンスが簡単です
> - **日本語**: 日本語ユーザーに適しています

**ステップ2: AI出力言語の選択**
```
? AI出力言語を選択:
  AIはこの言語で質問に答えます
  ❯ 简体中文
    English
    日本語
    Custom
```

> 📝 **説明**: AI出力言語は設定言語と異なる場合があります。`Custom`を選択すると、カスタム言語指示を入力できます。

**ステップ3: Claude Codeの検出とインストール**
```
? Claude Codeが検出されませんでした。自動的にインストールしますか？(Y/n)
```

インストールを選択すると、ZCFはインストール方法の選択を促します：

```
? Claude Codeのインストール方法を選択してください：
  ❯ npm [推奨] - npm経由でインストール（すべてのプラットフォームで動作）
    homebrew [推奨] - Homebrew経由でインストール（macOS/Linux）
    curl - curlスクリプト経由でインストール（Linux/macOS/WSL）
    powershell - PowerShellスクリプト経由でインストール（Windows）
    cmd - CMDスクリプト経由でインストール（Windows）
```

> ✅ **自動処理**：
> - ZCFは自動的にプラットフォームを検出し、最適なインストール方法を推奨します
> - Claude Codeが既にインストールされている場合、ZCFはバージョンを検出し、最新バージョンに自動アップグレードできます
> - インストール方法は将来の参照のために保存されます

**ステップ4: 既存設定の処理**

既存の設定ファイルが検出された場合：
```
? 既存の設定ファイルが検出されました。どのように処理しますか？
  ❯ バックアップして上書き - 既存の設定を ~/.claude/backup/ にバックアップ
    ドキュメントのみ更新 - ワークフローとドキュメントのみを更新し、既存のAPI設定を保持
    設定のマージ - 既存の設定とマージし、ユーザーカスタマイズを保持
    スキップ - 設定更新をスキップ
```

> ⚠️ **重要**：
> - **バックアップして上書き**: 安全なオプションで、タイムスタンプ付きバックアップを作成します
> - **ドキュメントのみ更新**: ワークフローテンプレートのみを更新したいシナリオに適しています
> - **設定のマージ**: カスタム設定を保持し、新しいコンテンツをインテリジェントにマージします

**ステップ5: APIの設定**
```
? API認証方法を選択
  ❯ 公式ログインを使用
    Auth Token (OAuth認証) を使用
    API Key (キー認証) を使用
    CCRプロキシ（Claude Code Router）を設定
    スキップ（後で手動設定）
```

> 💡 **推奨**：
> - **公式ログイン**: 最もシンプルで、API Keyの設定は不要です
> - **API Key**: サードパーティのAPIプロバイダー（302.AI、GLMなど）を使用する場合に適しています
> - **CCRプロキシ**: 複数のモデルをルーティングする必要があるシナリオに適しています

**ステップ6-9**: 出力スタイル、ワークフロー、MCPサービス、CCometixLine（オプション）を順番に選択

初期化が完了すると、以下が表示されます：
```
✔ 設定完了！Claude Code環境の準備が整いました
🎉 設定完了！'claude'コマンドを使用して開始してください。
```

### 方法2: コマンドライン直接使用（自動化におすすめ）

CI/CDと自動化シナリオに適しており、`--skip-prompt`（または`-s`）とパラメータを使用して設定を完了します。

> 🚀 **適用シナリオ**：
> - CI/CDパイプラインでの自動設定
> - 複数マシンへの一括デプロイ
> - スクリプト自動化初期化
> - Dockerコンテナ初期化

#### APIプロバイダープリセットの使用（最も簡単）

ZCFはAPIプロバイダープリセットをサポートしており、設定を5+パラメータから2つに簡素化できます：

```bash
# 302.AIプロバイダーを使用（推奨）
npx zcf i -s -p 302ai -k "sk-xxx"

# その他のプロバイダー
npx zcf i -s -p glm -k "sk-xxx"        # GLM
npx zcf i -s -p minimax -k "sk-xxx"    # MiniMax
npx zcf i -s -p kimi -k "sk-xxx"       # Kimi
```

> ✅ **利点**: プリセットはbaseUrl、認証方法、デフォルトモデルを自動設定し、設定プロセスを大幅に簡素化します。

#### カスタム設定

カスタムAPIエンドポイントを使用する必要がある場合：

```bash
# すべてのパラメータを手動で指定
npx zcf i -s -g zh-CN -t api_key -k "sk-xxx" -u "https://api.example.com"

# プライマリモデルと高速モデルの両方を設定
npx zcf i -s -p 302ai -k "sk-xxx" \
  --api-model "claude-sonnet-4-5" \
  --api-fast-model "claude-haiku-4-5"

# 出力スタイルとワークフローを指定
npx zcf i -s -p 302ai -k "sk-xxx" \
  --output-styles engineer-professional,nekomata-engineer \
  --workflows commonTools,sixStepsWorkflow \
  --default-output-style engineer-professional
```

#### 複数API設定

ZCFは複数のAPIを設定することをサポートしており、異なるシナリオで簡単に切り替えできます：

```bash
# JSON文字列を使用して複数のAPIを設定
npx zcf i -s --api-configs '[
  {"provider":"302ai","key":"sk-xxx"},
  {"provider":"glm","key":"sk-yyy"},
  {"name":"custom","type":"api_key","key":"sk-zzz","url":"https://custom.api.com","primaryModel":"claude-sonnet-4-5","fastModel":"claude-haiku-4-5","default":true}
]'

# JSONファイル設定を使用（複雑なマルチ設定シナリオに適している）
npx zcf i -s --api-configs-file ./api-configs.json
```

`api-configs.json`ファイルの例：

```json
[
  {
    "provider": "302ai",
    "key": "sk-xxx"
  },
  {
    "name": "custom",
    "type": "api_key",
    "key": "sk-yyy",
    "url": "https://custom.api.com",
    "primaryModel": "claude-sonnet-4-5",
    "fastModel": "claude-haiku-4-5",
    "default": true
  }
]
```

#### 一般的なパラメータのクイックリファレンス

| パラメータ | 省略形 | 説明 | 一般的な値 |
|------|------|------|--------|
| `--skip-prompt` | `-s` | すべての対話プロンプトをスキップ | - |
| `--provider` | `-p` | APIプロバイダープリセット | `302ai`, `glm`, `minimax`, `kimi` |
| `--api-key` | `-k` | APIキー | あなたのAPI Key |
| `--all-lang` | `-g` | すべての言語パラメータを統一設定 | `zh-CN`, `en` |
| `--workflows` | `-w` | インストールするワークフロー | `all`, `skip` またはカンマ区切りリスト |
| `--mcp-services` | `-m` | インストールするMCPサービス | `all`, `skip` またはカンマ区切りリスト |
| `--code-type` | `-T` | ターゲットコードツールタイプ | `claude-code`, `codex`, `cc`, `cx` |

> 📖 **完全なパラメータリスト**: 詳細なパラメータ説明については、[CLIコマンド - zcf init](../cli/init.md)の章を参照してください。

## Codexサポート

ZCFは完全なCodexサポートを提供し、同じツールでClaude CodeとCodexの両方の環境を管理できます。

### Codexモードに切り替え

```bash
# 方法1: コマンドライン直接初期化
npx zcf i -s -T codex -p 302ai -k "sk-xxx"

# 方法2: 対話式メニュー経由
npx zcf → S（ツール切り替え）を選択 → 1（完全初期化）を選択
```

### Codex設定の特徴

- **設定ファイル**: `~/.codex/config.toml`（TOML形式）
- **ワークフロー場所**: `~/.codex/prompts/`
- **システムプロンプト**: `~/.codex/AGENTS.md`
- **共有MCP**: Claude Codeと同じMCPサービス設定を使用

> 💡 **ヒント**: CodexとClaude Codeは同じワークフローテンプレートとMCPサービスを共有し、一貫した開発体験を保証します。

## クロスプラットフォームサポート

ZCFは、Windows、macOS、Linux、WSL、Termuxを含むクロスプラットフォーム操作を完全にサポートしています。

### Windowsプラットフォーム

- **自動検出**: Windowsシステムで自動的に互換性のある`cmd /c npx`形式を使用
- **設定修正**: 既存の誤った設定は更新時に自動的に修正されます
- **ゼロ設定**: Windowsユーザーは追加の操作は不要で、macOS/Linuxと同じ体験

> ⚠️ **注意**: WindowsでMCP接続の問題が発生した場合、`npx zcf`を実行すると設定形式が自動的に修正されます。

### WSLサポート（v2.12.12+）

- **スマート検出**: 環境変数、システムファイル、マウントポイントを通じた多段階WSL環境検出
- **ディストリビューション認識**: WSLディストリビューション（Ubuntu、Debianなど）を自動認識して設定を最適化
- **シームレスなインストール**: WSL環境でネイティブLinuxスタイルのインストール体験を提供

### Termuxサポート（v2.1+）

- **自動適応**: Termux環境を自動検出し、互換性のある設定を使用
- **強化された検出**: 利用可能なコマンドをインテリジェントに認識し、制限された環境での正常な動作を保証
- **完全な機能**: デスクトップシステムと同じ完全な機能をTermuxで楽しめます

> 📱 **ヒント**: Termuxでは、ZCFは特別なパス構造を自動認識し、依存関係を正しくインストールします。

## インストールの確認

インストールが完了したら、以下の手順に従って環境が正しく設定されていることを確認します：

### 1. CLIの可用性を確認

```bash
# ZCFコマンドが利用可能か確認
npx zcf --help

# バージョン情報を確認
npx zcf --version
```

### 2. ワークフローの確認

使用するツールに応じて、コマンドパレットで以下のコマンドを試してください：

**Claude Code:**
```
/zcf:workflow  # 6段階開発ワークフロー
/zcf:feat      # 機能開発ワークフロー
/git-commit    # Gitコミットコマンド
/init-project  # プロジェクト初期化
```

**Codex:**
```
/prompts:workflow  # 6段階開発ワークフロー
/prompts:git-commit    # Gitコミットコマンド
/prompts:git-rollback  # Gitロールバックコマンド
/prompts:git-cleanBranches  # マージ済みブランチのクリーンアップ
/prompts:git-worktree  # Git worktree管理
```

> ⚠️ **注意**: Codexは現在、6段階ワークフローとGitワークフローのみをサポートしています。機能開発ワークフロー（feat）、プロジェクト初期化（init-project）、BMadワークフローはCodexではまだ利用できません。

> ✅ **成功の指標**: コマンドが正常に実行され、ワークフローインターフェースが表示される場合、ワークフローのインポートは成功しました。
> 
> 💡 **ヒント**: Codexは`/prompts:`プレフィックスを使用し、Claude Codeは`/zcf:`または直接`/`プレフィックスを使用します。

### 3. MCPサービスの確認

Claude Code/CodexのMCPパネルで、以下のサービスが有効になっていることを確認してください：

- ✅ Context7 - ドキュメントクエリサービス
- ✅ open-websearch - Web検索
- ✅ spec-workflow - Specワークフロー
- ✅ mcp-deepwiki - GitHubドキュメント
- ✅ Playwright - ブラウザ制御
- ✅ serena - セマンティックコード検索

サービス機能をテスト：
```
ReactのuseStateフックの最新ドキュメントをクエリしてください
```
Context7が正常に動作している場合、AIは最新のドキュメントを使用して回答します。

> 🔧 **トラブルシューティング**: サービスが接続されていない場合、`npx zcf` → `4`を実行してMCPサービスを再設定してください。

### 4. API接続の確認

```bash
# 使用統計を表示（公式APIを使用している場合）
npx zcf ccu

# CCRステータスを確認（CCRプロキシを使用している場合）
npx zcf ccr
```

### 5. 出力スタイルの確認

AI出力スタイルが有効かテスト：
```
SOLID原則について説明してください
```

出力スタイルを切り替え（プロジェクト内）：
```
/output-style engineer-professional  # プロフェッショナルエンジニアに切り替え
/output-style nekomata-engineer      # 猫娘エンジニアに切り替え
```

## 実世界のシナリオ例

### シナリオ: 新しいデバイスへの迅速なデプロイ

完全なデプロイスクリプトの例：

```bash
#!/bin/bash

# 1. Claude Codeを初期化
npx zcf i -s -p 302ai -k "$API_KEY" \
  --output-styles engineer-professional \
  --workflows all \
  --mcp-services all

# 2. インストールを確認
npx zcf --version

# 3. 設定場所を表示
echo "Claude Code設定: ~/.claude/"
echo "バックアップ場所: ~/.claude/backup/"
```

### シナリオ: ワークフローの更新

既に初期化されている場合、ワークフローとテンプレートのみを更新：

```bash
npx zcf update -g zh-CN
```

> 📖 **注意**: `zcf update`は、デフォルトで既存のAPI設定とMCP設定を保持し、ワークフローテンプレートとドキュメントのみを更新します。

### シナリオ: CCRプロキシの設定

CCR（Claude Code Router）プロキシを使用する必要がある場合：

```bash
npx zcf ccr
```

CCR管理メニューに入ると、以下を選択できます：
- `1` CCRを初期化 - CCRをインストールして設定
- `2` UIを起動 - CCR Webインターフェースを起動
- `3` サービス制御 - CCRサービスの開始/停止/再起動
- `4` ステータスを確認 - 現在のCCRサービスステータスを表示

> 💡 **CCRの利点**：
> - 複数のAIモデルルーティングをサポート
> - コスト最適化（異なるタスクに適切なモデルを選択）
> - 無料モデルアクセス（Gemini、DeepSeekなど）

## よくある質問

### Q: 初期化後にワークフローが見つかりませんか？

**A**: 以下の場所を確認してください：
- Claude Code: `~/.claude/workflows/`
- Codex: `~/.codex/prompts/`

ファイルが存在しない場合、`npx zcf update`を実行して再インポートしてください。

### Q: MCPサービスの接続に失敗しましたか？

**A**: 
1. MCPサービス設定を確認: `npx zcf` → `4`
2. サービスがインストールされていることを確認（ほとんどのサービスはnpm経由で自動インストールされます）
3. Exaの場合、`EXA_API_KEY`環境変数が設定されていることを確認

### Q: API設定を切り替えるにはどうすればよいですか？

**A**: 設定切り替えコマンドを使用：
```bash
npx zcf config-switch --list  # すべての設定を一覧表示
npx zcf cs provider-name      # 指定された設定に切り替え
```

### Q: 設定ファイルはどこに保存されますか？

**A**: 
- **ZCF設定**: `~/.ufomiao/zcf/config.toml`
- **Claude Code設定**: `~/.claude/settings.json` および `~/.claude/CLAUDE.md`
- **Codex設定**: `~/.codex/config.toml` および `~/.codex/AGENTS.md`
- **バックアップ場所**: `~/.claude/backup/` および `~/.codex/backup/`

## 次のステップ

クイックスタートを完了したら、以下をお勧めします：

1. 🎯 [機能](../features/)を探索して、ZCFの完全な機能を理解する
2. 📚 [ワークフローの詳細](../workflows/)を深く掘り下げて、さまざまなワークフローをマスターする
3. ⚙️ [設定管理](../advanced/configuration.md)を参照して、パーソナライズされた設定を行う
4. 🔧 [CLIコマンド](../cli/)を確認して、利用可能なすべてのコマンドをマスターする


