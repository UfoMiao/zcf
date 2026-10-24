---
title: バックアップとトラブルシューティング
---

# バックアップとトラブルシューティング

## バックアップ

ZCF は、1 回の実行の中でファイルを初めて変更する前に、そのファイルを実行時刻の名前を持つフォルダーへコピーします。

```
~/.ufomiao/zcf/backups/2026-10-24T08-00-00-000Z/
  .claude/settings.json
  .codex/config.toml
  .ufomiao/zcf/zcf.json
```

フォルダー内のパスは、ホームフォルダーの下でのファイルの場所をそのまま反映します。以前に存在しなかったファイルにはバックアップがありません。`zcf apply` は最後にフォルダーを表示し、エディターは最初の保存の前に `zcf.json` をバックアップします。

変更を元に戻すには、ファイルをコピーして戻します。

```bash
cp ~/.ufomiao/zcf/backups/<time>/.claude/settings.json ~/.claude/settings.json
```

ZCF がバックアップを削除することはありません。不要になった古いフォルダーは自分で削除してください。

## プランの通知

ZCF の表示言語は英語と簡体字中国語です。以下は英語の文言です。

| 通知 | 意味 |
|------|------|
| The provider has no "…" settings, so … keeps its current provider. | ツールが話すプロトコルをプロバイダーが持っていません（`openai` ブロックの無い Codex など）。ブロックを追加するか、そのツールは独自のプロバイダーのままにしてください。 |
| No model is set for …. | プロバイダーの `models.default`、または `openai` か `gemini` ブロックの `model` を設定してください。 |
| … only uses its own models, so the provider is not applied to it. | Cursor CLI の場合です。MCP サーバーとスキルは適用されます。 |
| … is not installed. | `zcf update` からの通知です。`zcf apply` を実行してインストールしてください。 |
| … installed with npm updates through the mirror; a native install still downloads from its official servers. | `china` ミラーでの `zcf update` からの通知です。[ミラー](./mirrors#対象外) を参照してください。 |

## よくある問題

**"No ZCF config at …"**: 設定ファイルがまだありません。`npx zcf` を実行してエディターで作成するか、手で書いてください。[設定ファイル](./config) を参照してください。

**"The ZCF config at … is not valid"**: 誤っている各フィールドがメッセージに列挙されます。エディターでも同じエラーがフィールドの横に表示されます。有効な JSON でないファイルはエディターで壊れたものとして開かれるので、テキストエディターで修正してから再読み込みしてください。

**ステップが失敗した**: そのツールの残りのステップはスキップされ、他のツールは処理を続けます。まとめには失敗したコマンドとその出力が、シークレットをマスクした状態で表示されます。原因を直して、もう一度 `zcf apply` を実行してください。すでに適用された設定と MCP サーバーは 2 回目にはスキップされます。

**インストールしたツールが後で「見つからない」**: インストーラーによっては、自分のフォルダーを新しいシェルの `PATH` にしか追加しません。新しいターミナルを開いてください。ZCF は自分の `PATH` と、公式インストーラーが使うフォルダーからツールを探します。

**プリセットが読み込まれない**: [プロバイダープリセット](./providers#プリセットの提供元) を参照してください。HTTP プロキシの内側では、`HTTPS_PROXY` と一緒に `NODE_USE_ENV_PROXY=1` を設定してください。

**中国本土でダウンロードが遅い、または失敗する**: [`china` ミラー](./mirrors) に切り替えてください。

## バグの報告

[github.com/UfoMiao/zcf/issues](https://github.com/UfoMiao/zcf/issues) に、`npx zcf plan` の出力を添えて issue を作成してください。API キーと MCP の環境変数・ヘッダーの値は出力でマスクされますが、MCP サーバーの引数に入れたシークレットはマスクされません。貼り付ける前に確認してください。
