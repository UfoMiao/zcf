---
title: 設定ファイル
---

# 設定ファイル

ZCF が読むのは 1 つのファイル `~/.ufomiao/zcf/zcf.json` だけです。どのコマンドも `--file <path>` で別のファイルを指定できます。形式は JSON で、コメントと末尾のカンマも使えます。

エディターから保存すると、変更したキーだけが書き込まれるため、コメントやレイアウトはそのまま残ります。

```jsonc
{
  "version": 1,
  "tools": ["claude-code", "codex", "opencode"],
  "provider": {
    "name": "My relay",
    "apiKey": "sk-...",
    "anthropic": { "baseUrl": "https://relay.example.com", "authType": "auth_token" },
    "openai": { "baseUrl": "https://relay.example.com/v1", "model": "gpt-5.5" },
    "gemini": { "baseUrl": "https://relay.example.com/gemini", "model": "gemini-3-pro" },
    "models": { "default": "claude-opus-4-8", "haiku": "claude-haiku-4-5" }
  },
  "mcpServers": {
    "context7": { "type": "stdio", "command": "npx", "args": ["-y", "@upstash/context7-mcp"] },
    "docs": { "type": "http", "url": "https://mcp.example.com/mcp", "headers": { "Authorization": "Bearer ..." } }
  },
  "skills": [{ "source": "anthropics/skills", "skills": ["pdf"] }],
  "mirror": "official",
  "language": "auto",
  "configLanguage": "en"
}
```

## `version`

常に `1` です。

## `tools`

`zcf apply` と `zcf update` の対象となるツールです。

| ID | ツール |
|----|--------|
| `claude-code` | Claude Code |
| `codex` | Codex |
| `gemini-cli` | Gemini CLI |
| `opencode` | OpenCode |
| `cursor` | Cursor CLI |
| `pi` | Pi |
| `dsh` | DeepSeek Harness |

コマンドラインの `--tools claude-code,codex` は、1 回の実行に限りこのリストを上書きします。

## `provider`

すべてのツールで共有する 1 つのプロバイダーです。省略可能で、省略した場合 ZCF は各ツールのプロバイダー設定に手を付けません。

| フィールド | 意味 |
|------------|------|
| `name` | プロバイダーの名前。プランや、プロバイダーを一覧表示するツールに表示されます。 |
| `apiKey` | すべてのツールが送信するキー。ZCF はこれを出力しません。 |
| `anthropic.baseUrl` | Anthropic Messages API を話すエンドポイント。 |
| `anthropic.authType` | `auth_token`（デフォルト）はキーを `Authorization: Bearer` として送信します。`api_key` は `x-api-key` として送信します。 |
| `openai.baseUrl` | `https://api.example.com/v1` のような OpenAI 互換エンドポイント。 |
| `openai.model` | そのエンドポイントのモデル。省略時は `models.default` を使います。 |
| `gemini.baseUrl` | Gemini API のエンドポイント、またはそれを話すゲートウェイ。Google 公式を使う場合は省略します。 |
| `gemini.model` | Gemini のモデル。省略時は `models.default` を使います。 |
| `models.default` | メインのモデル。 |
| `models.haiku`、`models.sonnet`、`models.opus` | Claude Code の 3 つのティアに使うモデル。 |

`name` と `apiKey` は必須で、`anthropic` と `openai` の中では `baseUrl` も必須です。

各プロトコルのブロックは省略可能です。ツールは自分が話すプロトコルを使います。Claude Code は `anthropic`、Codex は `openai`、Gemini CLI は `gemini` を使います。OpenCode は `anthropic` または `openai`、Pi はモデルを持つ最初のブロック、DeepSeek Harness は `anthropic`、次に `openai` を使います。ツールのプロトコルが無い場合、プランに通知が表示され、そのツールは現在のプロバイダーを維持します。Cursor CLI は Cursor 自身のモデルだけを使います。詳しくは [エージェントツール](./tools) を参照してください。

既知のプロバイダーからこれらのフィールドを埋めるには、[プロバイダープリセット](./providers) を参照してください。

## `profiles`

切り替えて使うための保存済みプロバイダーです。適用されるのは最上位の `provider` だけです。`zcf switch <id|名前>` がプロファイルのプロバイダーをそこへコピーするため、適用中の構成は常に 1 つのブロックのままです。

```jsonc
"profiles": [
  {
    "id": "work",
    "name": "仕事回線",
    "provider": { "name": "Work", "apiKey": "sk-...", "anthropic": { "baseUrl": "https://work.example.com" } }
  },
  {
    "id": "home",
    "name": "自宅",
    "provider": { "name": "House", "apiKey": "sk-...", "openai": { "baseUrl": "https://home.example.com/v1" } }
  }
]
```

| フィールド | 意味 |
|-------|---------|
| `id` | `zcf switch` とエディターがプロファイルを示す識別子。英数字、`_`、`-` が使えます。 |
| `name` | 表示名。`zcf switch` はこれも受け付けます。 |
| `provider` | 完全なプロバイダーのブロック。最上位の `provider` とまったく同じ形です。 |

## `mcpServers`

名前をキーとする MCP サーバーです。名前には英数字、`_`、`-` を使えます。

`stdio` サーバーはコマンドを実行します。

| フィールド | 意味 |
|------------|------|
| `type` | `"stdio"` |
| `command` | `npx` や `uvx` などのプログラム。 |
| `args` | その引数。 |
| `env` | そのための環境変数。値は出力でマスクされます。 |

`http` サーバーは URL で接続します。

| フィールド | 意味 |
|------------|------|
| `type` | `"http"` |
| `url` | サーバーの URL。 |
| `headers` | `Authorization` などの HTTP ヘッダー。値は出力でマスクされます。 |

ZCF は、ツール自身のコマンドがあればそれで各サーバーを追加します。すでに同じ内容で設定されているサーバーはスキップされます。Windows では、必要なツールに対して `npx` などのコマンドを `cmd /c` で包みます。

## `skills`

スキルのソースです。選択した各ツールに [`npx skills add`](https://github.com/vercel-labs/skills) でインストールされます。

| フィールド | 意味 |
|------------|------|
| `source` | `npx skills add` が受け付けるもの: `owner/repo`、git の URL、ローカルパス、ZCF 同梱スキルを指す `zcf`。 |
| `skills` | このソースのうち、これらのスキルだけをインストールします。省略するか空にするとすべてをインストールします。 |

スキルを列挙したソースは、すべてインストール済みになるとスキップされます。列挙していないソースは、どのスキルを含むか ZCF には分からないため、適用のたびに再インストールされます。

予約されたソース `zcf` は ZCF 本体に同梱されるスキルを指し、[`configLanguage`](#configlanguage)（ツールが使う言語）のフォルダからインストールされます。ZCF v3 がインストールしていたワークフロースキルで、スキルページでチェックリストとして選べます:

| スキル | 内容 |
|--------|------|
| `init-project` | プロジェクトの CLAUDE.md コンテキスト索引を生成します。 |
| `workflow` | 品質ゲート付きの 6 フェーズ開発ワークフローを実行します。 |
| `feat` | 構造化されたフローで新機能を計画して実装します。 |
| `git-commit` | 変更を分析し Conventional Commits のメッセージを書きます。 |
| `git-rollback` | ブランチを過去のバージョンへ対話的にロールバックします。 |
| `git-clean-branches` | マージ済みや古いブランチをプレビューして整理します。 |
| `git-worktree` | プロジェクト横のフォルダで git worktree を管理します。 |
| `bmad-init` | プロジェクトに BMad-Method V6 を初期化・更新します。 |

## `agents`

導入する内蔵エージェントテンプレートです。エージェントを受け付けるツール（Claude Code のサブエージェント）向けです。テンプレートは ZCF に同梱され、`templates/agents/<言語>/<id>/` にあり、[`configLanguage`](#configlanguage) でインストールされます。

```jsonc
"agents": ["planner", "ui-ux-designer"]
```

| ID | エージェント |
|----|-------|
| `init-architect` | プロジェクトを巡回し、モジュール単位の CLAUDE.md コンテキストを書きます。 |
| `get-current-datetime` | `date` を実行し、その出力だけを返します。 |
| `planner` | 複雑なタスクを見直し可能なステップに分解します。 |
| `ui-ux-designer` | UI/UX デザインとプロジェクトの UI フレームワークについて助言します。 |

## `workflows`

カスタムのワークフローバンドルです。1 つの名前で、リストしたスキル、エージェント、MCP サーバーをインストールします。スキルは完全なソースで、エージェントとサーバーは id または名前で参照され、それぞれのセクションに存在しなければならないため、バンドルが定義を繰り返すことはありません。

```jsonc
"workflows": [
  {
    "name": "Git 作業",
    "skills": [{ "source": "zcf", "skills": ["git-commit", "git-rollback"] }],
    "agents": ["planner"],
    "mcp": ["context7"]
  }
]
```

| フィールド | 意味 |
|-------|---------|
| `name` | バンドルの表示名。 |
| `skills` | バンドルがインストールするスキルのソース。`skills` セクションと同じ形です。 |
| `agents` | `agents` の id。上の内蔵リストから選びます。 |
| `mcp` | `mcpServers` のサーバー名。 |

## `styles`

導入する出力スタイルと、ツールがデフォルトで使うものです。ZCF は 6 つのテンプレートを `templates/output-styles/<言語>/` に同梱し、[`configLanguage`](#configlanguage) でインストールします。`defaultOutputStyle` は Claude Code の `outputStyle` 設定になります。

```jsonc
"styles": { "outputStyles": ["engineer-professional"], "defaultOutputStyle": "engineer-professional" }
```

| ID | スタイル |
|----|-------|
| `engineer-professional` | SOLID・KISS・DRY・YAGNI を守る職業エンジニアの口調。 |
| `nekomata-engineer` | 厳密なエンジニアリングと猫娘の人格の組み合わせ。 |
| `laowang-engineer` | 甘いコードを許さない気難しい職人。 |
| `ojousama-engineer` | エンジニアリングの実力にツンデレお嬢様の人格を組み合わせたもの。 |
| `rem-engineer` | 献身的なメイドの人格。コードベースは屋敷です。 |
| `leibus-engineer` | プロダクト思考で伝えるスタイル。 |

## `extras`

省略可能な周辺ツールです。ツールごとの設定はなく、異なるのはインストール方法だけです。

```jsonc
"extras": { "magpie": "client", "ccline": true }
```

| フィールド | 意味 |
|-------|---------|
| `magpie` | [magpie](https://usemagpie.ai) モデルゲートウェイのローカルコンパニオン。`client` はデスクトップアプリ、`cli` はターミナル用です。どちらも magpie 自身のスクリプトからインストールされ、キーは magpie が自分で書き込みます。 |
| `ccline` | [CCometixLine](https://github.com/Haleclipse/CCometixLine) ステータスバー。`~/.claude/ccline` にインストールされ、Claude Code の `statusLine` に組み込まれます。組み込みを完了するには、Agent tools で Claude Code を選んでください。 |

## `mirror`

`official`（デフォルト）または `china`。ZCF がツールやパッケージをどこからダウンロードするかを決めます。[ミラー](./mirrors) を参照してください。

## `language`

`auto`（デフォルト）、`en` または `zh-CN`。両エディターの **UI** 言語です。設定ページにはありません。どちらもヘッダーから切り替えます。ターミナル UI は <kbd>L</kbd>、Web UI はパスの横のセレクターで、即座に単独で保存されます。`auto` の場合 Web UI はブラウザーの言語に、ターミナル UI はシステムのロケールに従います。`--lang` と `ZCF_LANG` が 1 回の実行で優先されているときは切り替えできません。コマンド出力（`zcf plan`、`apply`、`update`）はこの設定を読みません。`--lang` か `ZCF_LANG`、次にシステムのロケールに従います。

## `configLanguage`

`en`（デフォルト）または `zh-CN`。適用後にツール自身が使う言語で、各ツールが持つ設定に書き込まれます。`language` とは別物です。UI を英語で使いながらツールには中国語で応答させる（その逆も）ことができます。

`auto` はありません。対応するツールが一つもなく、Claude Code のようなツールは読み込んだ値をそのままモデルへ渡すため、解決できない語がそのまま設定に入ってしまいます。

| ツール | 適用時に書き込むもの |
|---------|----------------------|
| Claude Code | `~/.claude/settings.json` の独自 `language` キー。`zh-CN` では `Simplified Chinese`。`en` は ZCF が以前書き込んだ値だけを削除し、ユーザーが Claude Code 側で設定した言語（`japanese` など）はそのまま残します。 |
| Codex、Gemini CLI、OpenCode、Cursor CLI、Pi、DeepSeek Harness | 独自の言語設定がありません。`zh-CN` のときは計画にその旨が表示され、設定は変更されません。 |

## 環境変数

| 変数 | 効果 |
|------|------|
| `ZCF_LANG` | コマンド出力の表示言語。`en` または `zh-CN`。`--lang` が優先され、どちらも無い場合はシステムのロケールに従います。エディターの UI は設定ファイルの `language` に従います。 |
| `ZCF_MIRROR` | `official` または `china`（`cn` も可）。ファイルの `mirror` より優先されます。 |
| `ZCF_PRESETS_URL` | [プロバイダープリセット](./providers) をこの URL から読み込みます。 |
| `ZCF_SKILLS_SEARCH_URL` | スキルページの検索を claude-plugins.dev の代わりにこのインデックスで行います。同じ `?q=&limit=` 形式に応答する必要があります。 |

独自の設定フォルダーの場所を変更するツールにも追従します: `CLAUDE_CONFIG_DIR`、`CODEX_HOME`、`GEMINI_CLI_HOME`、`XDG_CONFIG_HOME`（OpenCode）、`PI_CODING_AGENT_DIR`、`DSH_HOME`。
