---
title: Backups and troubleshooting
---

# Backups and troubleshooting

## Backups

Before ZCF changes a file for the first time in a run, it copies the file to a folder named after the time of the run:

```
~/.ufomiao/zcf/backups/2026-10-24T08-00-00-000Z/
  .claude/settings.json
  .codex/config.toml
  .ufomiao/zcf/zcf.json
```

Paths inside the folder mirror where the files live under your home folder. A file that did not exist before has no backup. `zcf apply` prints the folder at the end, and the editors back up `zcf.json` before their first save.

To undo a change, copy the file back:

```bash
cp ~/.ufomiao/zcf/backups/<time>/.claude/settings.json ~/.claude/settings.json
```

ZCF never deletes backups. Remove old folders yourself when you no longer need them.

## Notices in the plan

| Notice | What it means |
|--------|---------------|
| The provider has no "…" settings, so … keeps its current provider. | The tool speaks a protocol your provider doesn't have, such as Codex without an `openai` block. Add the block, or leave that tool on its own provider. |
| No model is set for …. | Set `models.default` in the provider, or `model` in its `openai` or `gemini` block. |
| … only uses its own models, so the provider is not applied to it. | Cursor CLI. MCP servers and skills are still applied. |
| … is not installed. | From `zcf update`. Run `zcf apply` to install it. |
| … installed with npm updates through the mirror; a native install still downloads from its official servers. | From `zcf update` with the `china` mirror. See [Mirrors](./mirrors#not-covered). |

## Common problems

**"No ZCF config at …"**: there is no config file yet. Run `npx zcf` to create one in the editor, or write it by hand. See [Config file](./config).

**"The ZCF config at … is not valid"**: the message lists each field that is wrong. The editors show the same errors next to the fields. A file that isn't valid JSON opens as broken in the editors; fix it in a text editor, then reload.

**A step failed**: the rest of that tool's steps are skipped, and the other tools carry on. The summary shows the failed command and its output, with secrets masked. Fix the cause and run `zcf apply` again. Settings and MCP servers that were already applied are skipped the second time.

**A tool was installed but is "not found" afterwards**: some installers add their folder to `PATH` only for new shells. Open a new terminal. ZCF looks tools up on your own `PATH`, plus the folder the official installer uses.

**Presets don't load**: see [Provider presets](./providers#where-presets-come-from). Behind an HTTP proxy, set `NODE_USE_ENV_PROXY=1` along with `HTTPS_PROXY`.

**Slow or failing downloads in mainland China**: switch to the [`china` mirror](./mirrors).

## Reporting a bug

Open an issue at [github.com/UfoMiao/zcf/issues](https://github.com/UfoMiao/zcf/issues) with the output of `npx zcf plan`. The API key and MCP environment and header values are masked in it, but a secret you put in an MCP server's arguments is not. Check before you paste.
