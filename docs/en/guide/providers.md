---
title: Provider presets
---

# Provider presets

A preset fills in the [provider](./config#provider) for a known service: its endpoints for each protocol, how it takes the key, and its models. You only add your API key.

## Using a preset

In either editor, open **Provider** and choose **Start from a preset**. Each preset is listed with the hosts it sends requests to, so you can see where your key would go before you pick one. On the command line, `zcf init --preset <id> --api-key <key>` fills the same fields into the config in one run.

Picking a preset:

- replaces the provider's name, endpoints and models with the preset's;
- keeps your API key only when the preset uses the same hosts as your current provider. On a different host the key is cleared, and you enter the key for the new service. Hosts are compared, not paths, so check the endpoints when two services share a host;
- changes only the draft. Check the fields, then save.

The [Apply page](./ui) and `zcf plan` show exactly what each tool will get before anything is written.

## Where presets come from

Presets are data, not code. They live in [`presets/providers.json`](https://github.com/UfoMiao/zcf/blob/main/presets/providers.json) in the ZCF repository, and ZCF downloads the list when you open the picker. A new or corrected preset therefore reaches you without a new ZCF release.

- ZCF asks jsDelivr and raw GitHub at once and takes the first valid answer. With the [`china` mirror](./mirrors), it adds jsDelivr's China-friendly hosts.
- The list is saved to `~/.ufomiao/zcf/cache/providers.json` and reused for 24 hours. If no source answers, the saved copy is shown, with a note that it may be old.
- jsDelivr can take up to about 12 hours to serve a changed file.
- Every entry is checked before use: endpoints must be `https://` URLs, and a preset never carries an API key. A broken entry is left out without affecting the rest.

To use your own list, such as a file in a gist, set `ZCF_PRESETS_URL`:

```bash
ZCF_PRESETS_URL=https://gist.githubusercontent.com/me/.../raw/providers.json npx zcf ui
```

The file has the same shape as `presets/providers.json`. A list saved from one source is never shown for another.

## Adding a preset

Open a pull request that edits `presets/providers.json`. Each entry looks like this:

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

`id` uses lowercase letters, digits and `-`. The other fields are the same as the provider's in the [config file](./config#provider), without `apiKey`. The test suite checks every entry in the file.
