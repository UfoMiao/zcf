---
title: はじめに
---

# はじめに

ZCF は、すべての AI コーディングツールの設定を 1 つにまとめます。ツール、プロバイダー、MCP サーバー、スキルを一度選ぶだけで、ZCF が足りないツールをインストールし、各ツール固有のネイティブ設定を書き込みます。

ZCF はツールを設定するだけで、ゲートウェイやプロキシではありません。ZCF の実行後は、手動で設定した場合と同じように、各ツールがプロバイダーに直接接続します。

対応ツール:

- Claude Code
- Codex
- Gemini CLI
- OpenCode
- Cursor CLI
- Pi
- DeepSeek Harness

各ツールに ZCF が書き込む内容は [エージェントツール](./tools) を参照してください。

## 必要な環境

- Node.js 22 以降。
- Windows では、公式インストーラーが PowerShell スクリプトであるツールのために PowerShell が必要です。

## エディターを開く

```bash
npx zcf
```

ターミナルでコマンドを付けずに `zcf` を実行すると、ターミナルエディターが開きます。ブラウザーを使う場合は次を実行します。

```bash
npx zcf ui
```

どちらのエディターも同じファイル `~/.ufomiao/zcf/zcf.json` を編集し、ページ構成も同じです。エディターの表示は英語か簡体字中国語なので、ページ名は英語で示します。

1. **Agent tools**（エージェントツール）: 使うエージェントツールにチェックを入れます。各ツールのインストール状況とバージョンが表示されます。
2. **Provider**（プロバイダー）: [プリセット](./providers) から始めるか、エンドポイントと API キーを自分で入力します。
3. **MCP servers**（MCP サーバー）: `stdio` サーバー（コマンド）または `http` サーバー（URL）を追加します。
4. **Skills**（スキル）: `npx skills add` が受け付けるスキルのソースを追加します。
5. **Settings**（設定）: ZCF 自身の設定です。UI の言語とダウンロードミラー。
6. **Apply**（適用）: 変更内容を確認してから適用します。

<kbd>Ctrl</kbd>+<kbd>S</kbd> で保存します。すべてのキー操作は [ターミナル UI と Web UI](./ui) を参照してください。

## 設定ファイルを直接書く

エディターは必須ではありません。同じ結果をファイルで書くと次のようになります。

```jsonc
// ~/.ufomiao/zcf/zcf.json
{
  "version": 1,
  "tools": ["claude-code", "codex"],
  "provider": {
    "name": "My relay",
    "apiKey": "sk-...",
    "anthropic": { "baseUrl": "https://relay.example.com" },
    "openai": { "baseUrl": "https://relay.example.com/v1", "model": "gpt-5.5" }
  },
  "mcpServers": {
    "context7": { "type": "stdio", "command": "npx", "args": ["-y", "@upstash/context7-mcp"] }
  }
}
```

次にプレビューしてから適用します。

```bash
npx zcf plan          # 実行するコマンドと、編集する各ファイルの diff を表示
npx zcf apply --yes   # 足りないツールをインストールし、設定を書き込む
```

`--yes` を付けない `zcf apply` は同じプランを表示するだけで、何も変更しません。すべてのフィールドは [設定ファイル](./config) を参照してください。

## 適用時の動作

- すべての変更は先に計画されます。各ステップは、コマンドを 1 つ実行するか、1 つのファイルのキーを編集するかのどちらかです。ツールは並列に処理され、各ツールのステップは順番に実行されます。
- `claude mcp add-json`、`codex mcp add`、`npx skills add` など、ツール自身のコマンドがあればそれを使います。どのコマンドでも扱えない設定に限り、ファイルを直接編集します。
- ファイルはキー単位で編集されます。コメント、キーの順序、その他の設定はそのまま残ります。
- 各ファイルは最初に変更される前に `~/.ufomiao/zcf/backups/<時刻>/` へコピーされます。[バックアップとトラブルシューティング](./troubleshooting) を参照してください。
- API キー、MCP の環境変数とヘッダーの値、ツールのファイルで見つかった認証情報は、ZCF が出力するすべての内容でマスクされます。シークレットは MCP サーバーの引数に入れず、`env` または `headers` を使ってください。

## ツールを最新に保つ

```bash
npx zcf update
```

選択した各ツール自身のアップデーター（`claude update` や `opencode upgrade` など）を実行します。中国本土からの利用は [ミラー](./mirrors) を参照してください。
