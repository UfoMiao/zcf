---
title: プロバイダープリセット
---

# プロバイダープリセット

プリセットは、既知のサービスの [プロバイダー](./config#provider) を埋めます。プロトコルごとのエンドポイント、キーの受け取り方、モデルが入るので、追加するのは API キーだけです。

## プリセットを使う

どちらのエディターでも **Provider**（プロバイダー）ページを開き、**Start from a preset**（プリセットから始める）を選びます。各プリセットにはリクエストの送信先ホストが併記されるので、選ぶ前にキーがどこへ送られるかを確認できます。コマンドラインでは、`zcf init --preset <id> --api-key <key>` が同じフィールドを 1 回の実行で設定に書き込みます。

プリセットを選ぶと:

- プロバイダーの名前、エンドポイント、モデルがプリセットの内容に置き換わります。
- API キーは、プリセットが現在のプロバイダーと同じホストを使う場合にだけ残ります。ホストが異なる場合はキーが消去されるので、新しいサービスのキーを入力します。比較するのはホストでありパスではないため、2 つのサービスが同じホストを共有している場合はエンドポイントを確認してください。
- 変わるのは下書きだけです。フィールドを確認してから保存してください。

何かが書き込まれる前に、[**Apply** ページ](./ui) と `zcf plan` で各ツールに渡る内容を正確に確認できます。

## プリセットの提供元

プリセットはコードではなくデータです。ZCF リポジトリの [`presets/providers.json`](https://github.com/UfoMiao/zcf/blob/main/presets/providers.json) にあり、ZCF は選択画面を開いたときにこのリストをダウンロードします。そのため、新しいプリセットや修正されたプリセットは、ZCF の新しいリリースを待たずに届きます。

- ZCF は jsDelivr と raw GitHub に同時に問い合わせ、最初に返った有効な応答を使います。[`china` ミラー](./mirrors) では、中国から接続しやすい jsDelivr のホストも加えます。
- リストは `~/.ufomiao/zcf/cache/providers.json` に保存され、24 時間再利用されます。どのソースも応答しない場合は、古い可能性がある旨の注記とともに保存済みのコピーを表示します。
- jsDelivr が変更後のファイルを配信するまで、最大で 12 時間ほどかかることがあります。
- 各エントリーは使用前にチェックされます。エンドポイントは `https://` の URL でなければならず、プリセットに API キーが含まれることはありません。壊れたエントリーは他に影響を与えずに除外されます。

gist のファイルなど独自のリストを使うには、`ZCF_PRESETS_URL` を設定します。

```bash
ZCF_PRESETS_URL=https://gist.githubusercontent.com/me/.../raw/providers.json npx zcf ui
```

ファイルの形は `presets/providers.json` と同じです。あるソースから保存したリストが、別のソースのものとして表示されることはありません。

## プリセットを追加する

`presets/providers.json` を編集するプルリクエストを作成してください。各エントリーは次のような形です。

```json
{
  "id": "example",
  "name": "Example",
  "description": { "en": "Example API", "zh-CN": "Example API 服务" },
  "website": "https://example.com",
  "anthropic": { "baseUrl": "https://api.example.com/anthropic", "authType": "auth_token" },
  "openai": { "baseUrl": "https://api.example.com/v1", "model": "example-large" },
  "models": { "default": "example-large", "haiku": "example-small" }
}
```

`id` には英小文字、数字、`-` を使います。その他のフィールドは [設定ファイル](./config#provider) のプロバイダーと同じで、`apiKey` は含めません。テストスイートがファイル内のすべてのエントリーをチェックします。
