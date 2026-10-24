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
  "mirror": "official"
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

各プロトコルのブロックは省略可能です。ツールは自分が話すプロトコルを使います。Claude Code は `anthropic`、Codex は `openai`、Gemini CLI は `gemini` を使います。OpenCode は `anthropic` または `openai`、Pi はモデルを持つ最初のブロック、DeepSeek Harness は `anthropic`、次に `openai` を使います。ツールのプロトコルが無い場合、プランに通知が表示され、そのツールは現在のプロバイダーを維持します。Cursor CLI は Cursor 自身のモデルだけを使います。詳しくは [ツール](./tools) を参照してください。

既知のプロバイダーからこれらのフィールドを埋めるには、[プロバイダープリセット](./providers) を参照してください。

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
| `source` | `npx skills add` が受け付けるもの: `owner/repo`、git の URL、ローカルパス。 |
| `skills` | このソースのうち、これらのスキルだけをインストールします。省略するか空にするとすべてをインストールします。 |

スキルを列挙したソースは、すべてインストール済みになるとスキップされます。列挙していないソースは、どのスキルを含むか ZCF には分からないため、適用のたびに再インストールされます。

## `mirror`

`official`（デフォルト）または `china`。ZCF がツールやパッケージをどこからダウンロードするかを決めます。[ミラー](./mirrors) を参照してください。

## 環境変数

| 変数 | 効果 |
|------|------|
| `ZCF_LANG` | 表示言語。`en` または `zh-CN`。`--lang` が優先されます。どちらも無い場合はシステムのロケールに従います。 |
| `ZCF_MIRROR` | `official` または `china`（`cn` も可）。ファイルの `mirror` より優先されます。 |
| `ZCF_PRESETS_URL` | [プロバイダープリセット](./providers) をこの URL から読み込みます。 |

独自の設定フォルダーの場所を変更するツールにも追従します: `CLAUDE_CONFIG_DIR`、`CODEX_HOME`、`GEMINI_CLI_HOME`、`XDG_CONFIG_HOME`（OpenCode）、`PI_CODING_AGENT_DIR`、`DSH_HOME`。
