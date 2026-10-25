---
title: エージェントツール
---

# エージェントツール

このページでは、エージェントツールごとに ZCF がどのようにインストール・更新し、プロバイダー、MCP サーバー、スキルがどこに入るかを示します。実際に何かが起こる前に、`zcf plan` で自分の設定に対する正確なコマンドとファイルの変更を確認できます。

すべてのツールに共通する点:

- ツール自身のコマンドがあればそれを使い、どのコマンドでも扱えない設定に限りファイルを編集します。
- ファイルの編集では、ZCF が管理するキーだけを変更します。コメント、書式、その他の設定はそのまま残ります。
- すでに同じ内容で設定されている MCP サーバーはスキップされます。スキルを列挙したソースは、すべてインストール済みになるとスキップされます。列挙していないソースは、適用のたびに `npx skills add` を再実行します。
- スキルは `npx skills add <source> -g -a <agent>` でインストールされます。
- 更新では、ツール自身のアップデーターが npm 管理のパッケージで失敗したとき、`npm install -g <pkg>@latest` にフォールバックします。`zcf uninstall` はツールをそれぞれの経路でアンインストールし、ZCF が書き込んだ設定だけを取り除きます。MCP サーバーとスキルは残ります。[コマンド](./commands)を参照してください。

## Claude Code

| | |
|---|---|
| 検出 | `claude --version`、次に `~/.local/bin/claude` |
| インストール | 公式のネイティブインストーラー（`install.sh`、Windows では `install.ps1`）。[`china` ミラー](./mirrors) では `npm install -g @anthropic-ai/claude-code` を使い、バイナリをリンクするパッケージのインストールスクリプトを許可します。その後 `claude --version` を実行して動作を確認します。 |
| 更新 | `claude update`。npm 管理のインストールは失敗時に `npm install -g @anthropic-ai/claude-code@latest` へフォールバックします |
| アンインストール | npm 管理なら `npm uninstall -g @anthropic-ai/claude-code`。ネイティブインストールは `~/.local/bin/claude` と `~/.local/share/claude` を、削除前にバックアップしてから削除します。セッションやログインのある `~/.claude` は残ります。 |
| プロバイダー | `~/.claude/settings.json` の `env`: `ANTHROPIC_BASE_URL`、キーとして `ANTHROPIC_AUTH_TOKEN`（`authType: "api_key"` の場合は `ANTHROPIC_API_KEY`）、`models.default` からの `ANTHROPIC_MODEL`、そして `ANTHROPIC_DEFAULT_HAIKU_MODEL`、`_SONNET_MODEL`、`_OPUS_MODEL`。これらのキーのうち、設定で指定していないものは ZCF が削除します。 |
| MCP | `claude mcp add-json --scope user`。変更されたサーバーは削除してから再追加します。Windows では `npx` などのコマンドを `cmd /c` で包みます。 |
| スキル | `-a claude-code`、`~/.claude/skills` へ |
| 言語 | `~/.claude/settings.json` の独自 `language` キー。[`configLanguage`](./config#configlanguage) 用です。独自の言語設定を持つのはこのツールだけで、ユーザーが Claude Code 側で設定した言語はそのまま残ります。 |

Claude Code と同じく `CLAUDE_CONFIG_DIR` に従います。

## Codex

| | |
|---|---|
| 検出 | `codex --version` |
| インストール | `npm install -g @openai/codex` |
| 更新 | `codex update`。npm 管理のインストールは失敗時に `npm install -g @openai/codex@latest` へフォールバックします |
| アンインストール | `npm uninstall -g @openai/codex`。スタンドアロンインストールは `~/.local/bin/codex` と `~/.codex/packages/standalone` を削除します |
| プロバイダー | `~/.codex/config.toml`: `model_provider = "zcf"`、`model`、そして `base_url`、`wire_api = "responses"`、キーを持つ `[model_providers.zcf]` テーブル。`auth.json` の ChatGPT ログインには手を付けません。プロバイダーの `openai` ブロックを使います。 |
| MCP | `codex mcp add`。コマンドに HTTP ヘッダーのオプションが無いため、ヘッダーは後から `config.toml` に書き込みます。 |
| スキル | `-a codex`、`~/.agents/skills` へ |

`CODEX_HOME` に従います。

## Gemini CLI

| | |
|---|---|
| 検出 | `gemini --version` |
| インストールと更新 | `npm install -g @google/gemini-cli` |
| アンインストール | `npm uninstall -g @google/gemini-cli`。Homebrew や MacPorts でインストールされたものは通知とともにスキップします |
| プロバイダー | `~/.gemini/.env` の `GEMINI_API_KEY` と `GOOGLE_GEMINI_BASE_URL`、および `~/.gemini/settings.json` の `security.auth.selectedType = "gemini-api-key"` と `model.name`。プロバイダーの `gemini` ブロックを使います。 |
| MCP | `gemini mcp add -s user`。コマンドの `-e` オプションは値を 2 つ目の `=` で切ってしまうため、環境変数とヘッダーは後から `settings.json` に書き込みます。 |
| スキル | `-a gemini-cli`、`~/.agents/skills` へ |

`settings.json` と `.env` については `GEMINI_CLI_HOME` に従います。スキルは skills CLI がインストールする `~/.agents/skills` のままです。

## OpenCode

| | |
|---|---|
| 検出 | `opencode --version`、次に `~/.opencode/bin/opencode` |
| インストール | `npm install -g opencode-ai`。バイナリを配置するインストールスクリプトを許可します。その後 `opencode --version` を実行して動作を確認します。 |
| 更新 | `opencode upgrade`。OpenCode をインストールした方法で更新します。npm 管理のインストールは失敗時に `npm install -g opencode-ai@latest` へフォールバックします |
| アンインストール | `npm uninstall -g opencode-ai`。それ以外のインストールは OpenCode 独自の `opencode uninstall --keep-config --keep-data` を実行するため、設定とデータは残ります |
| プロバイダー | `~/.config/opencode/opencode.json`（既存のファイルが `opencode.jsonc` ならそちら）の `zcf` プロバイダー。`model` は `zcf/<model>` に設定し、`anthropic` ブロックを使う場合は `small_model` を `models.haiku` から設定します。`anthropic` ブロックは `@ai-sdk/anthropic` 経由、`openai` ブロックは `@ai-sdk/openai-compatible` 経由で使い、モデルを指定している方を優先します。`limit` などモデルに追加した設定は残ります。 |
| MCP | 同じファイルの `mcp` に `local` または `remote` サーバーとして書き込みます。OpenCode 自身のコマンドは対話形式でしか尋ねないためです。`oauth` や `timeout` など ZCF が管理しない設定は残ります。 |
| スキル | `-a opencode`、`~/.agents/skills` へ |

`XDG_CONFIG_HOME` に従います。

## Cursor CLI

| | |
|---|---|
| 検出 | `cursor-agent --version`、次にインストーラーの配置場所 |
| インストール | `cursor.com/install` の公式インストーラー |
| 更新 | `cursor-agent update`。Cursor CLI は自分自身を更新し、フォールバック先の npm パッケージはありません |
| アンインストール | `~/.local/bin/cursor-agent` と `~/.local/share/cursor-agent` を削除します（Windows では `%LOCALAPPDATA%\cursor-agent` フォルダー全体）。削除前にバックアップします |
| プロバイダー | 適用しません。Cursor は自社のモデルしか提供しないため、プランに通知が表示されます。 |
| MCP | CLI と Cursor エディターが共有する `~/.cursor/mcp.json` に書き込みます。`envFile` など ZCF が管理しない設定は残ります。 |
| スキル | `-a cursor`、`~/.agents/skills` へ |

## Pi

| | |
|---|---|
| 検出 | `pi --version` |
| インストール | `npm install -g @earendil-works/pi-coding-agent` |
| 更新 | `pi update --self`。npm 管理のインストールは失敗時に `npm install -g @earendil-works/pi-coding-agent@latest` へフォールバックします |
| アンインストール | `npm uninstall -g @earendil-works/pi-coding-agent`。Nix など他の方法でインストールされたものは通知とともにスキップします |
| プロバイダー | `~/.pi/agent/models.json` の `zcf` プロバイダーと、`~/.pi/agent/settings.json` の `defaultProvider` と `defaultModel`。モデルを持つ最初のブロック（`anthropic`、`openai`、`gemini` の順）を使います。キーは `$` を含んでいても `!` で始まっていても pi が文字どおりに受け取るように書き込みます。 |
| MCP | `pi mcp add` |
| スキル | `-a pi`、`~/.agents/skills` へ |

`PI_CODING_AGENT_DIR` に従います。

## DeepSeek Harness

| | |
|---|---|
| 検出 | `dsh --version` |
| インストールと更新 | `npm install -g @deepseek-ai/dsh`。dsh に必要なインストールスクリプトを名前で指定して許可します。 |
| アンインストール | `npm uninstall -g @deepseek-ai/dsh` |
| プロバイダー | キーは `ZCF_API_KEY` として `~/.dsh/.env` に入ります。`zcf` ルートとデフォルトモデルは、すべての dsh プロファイルに適用されるパッチファイル `~/.dsh/cordis.patch.yml` に入ります。`anthropic` ブロック、次に `openai` を使います。YAML ファイルにキーは書き込みません。 |
| MCP | 同じパッチファイルに、サーバーごとに `zcf-mcp-<name>` という名前の `@deepseek-ai/dsh-mcp-client` エントリーを 1 つずつ書き込みます。dsh の 32 文字制限を超える名前は通知を出してスキップします。 |
| スキル | `-a universal`、`~/.agents/skills` へ |

`DSH_HOME` に従います。`~/.dsh` のパッチファイルは dsh の Web の Models ページで保存した内容より優先されるため、ZCF が管理するプロバイダーとデフォルトモデルは ZCF から変更してください。
