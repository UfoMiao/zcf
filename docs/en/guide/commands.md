---
title: Commands
---

# Commands

```bash
npx zcf [command] [options]
```

Run `zcf <command> --help` for the options of one command. Every command takes:

| Option | Meaning |
|--------|---------|
| `-l, --lang <lang>` | Display language, `en` or `zh-CN`. It overrides `ZCF_LANG` and the system locale. |
| `-h, --help` | Show help. |
| `-v, --version` | Show the version. |

## `zcf`

Run in a terminal with no command, ZCF opens the [terminal editor](./ui), the same as `zcf tui`. When the output is not a terminal, it prints the help instead.

## `zcf tui`

Edit the config in the terminal editor.

| Option | Meaning |
|--------|---------|
| `--file <path>` | The config file. Default: `~/.ufomiao/zcf/zcf.json`. |

## `zcf ui`

Edit the config in your browser. ZCF starts a small server on `127.0.0.1`, opens the page, and runs until you press <kbd>Ctrl</kbd>+<kbd>C</kbd>.

| Option | Meaning |
|--------|---------|
| `--file <path>` | The config file. |
| `--port <port>` | The port to listen on. Default: any free port. |
| `--no-open` | Only print the address; don't open a browser. |

The server can only be reached from this machine. The printed address carries a random token for this run of the server, and API requests without it are refused. See [Terminal and web UI](./ui#web-ui).

## `zcf init`

Set up a config in one run, without the editor: fill the provider from a preset, pick tools and what installs with them, save the file, then run the same plan and apply `zcf apply` runs.

```bash
zcf init --preset 302ai --api-key sk-... --tools claude-code,codex --skills git-commit --yes
```

With no flags at all, ZCF points you at the editor instead of writing an empty config.

| Option | Meaning |
|--------|---------|
| `-p, --preset <id>` | A [provider preset](./providers) id. Fills the whole provider; pass its key with `--api-key`. |
| `-k, --api-key <key>` | The provider's API key. Needs `--preset`, or a provider already in the config. |
| `-t, --tools <tools>` | The tools to select, comma-separated, as in `zcf plan`. |
| `--skills <skills>` | Built-in skills to install, comma-separated. |
| `--agents <agents>` | Built-in agents to install, comma-separated. |
| `--styles <styles>` | Output styles to install, comma-separated. |
| `--default-style <style>` | The output style the tools use by default. |
| `--extras <extras>` | Companion tools: `magpie` (same as `magpie:client`), `magpie:cli`, `ccline`. |
| `-m, --mirror <mirror>` | Save this as `mirror` in the config and download through it in this run. |
| `-l, --lang <lang>` | Save this as `language` in the config, and speak it in this run. |
| `-y, --yes` | Apply after saving. Without it, ZCF saves the file, shows the plan and changes nothing else. |
| `--file <path>` | The config file. Created when missing; an existing one is merged key by key, keeping comments and layout. |

Every id is checked before the file is touched: an unknown preset, tool, skill, agent, style or extra stops the command with the known ids, and nothing is written. Picks such as `--skills` and `--agents` merge with what the config already holds; lists such as `--tools` replace theirs. The saved file is applied through the same steps as `zcf apply`, so `-y, --yes` decides there too, and a config that selects no tools stops with the same error.

## `zcf plan`

Show what `zcf apply` would do, without changing anything: the steps for each tool, a diff of every file ZCF edits itself, and notices such as a provider protocol that a tool cannot use.

| Option | Meaning |
|--------|---------|
| `--file <path>` | The config file. |
| `--tools <tools>` | Comma-separated tool ids to work on instead of `tools` in the config, such as `--tools claude-code,codex`. |
| `--mirror <mirror>` | `official` or `china` for this run. See [Mirrors](./mirrors). |

A step that runs a tool's own command, such as `claude mcp add-json`, is shown as the command; the tool decides what it writes.

## `zcf apply`

Install the selected tools that are missing and write their settings. It takes the same options as `zcf plan`, plus:

| Option | Meaning |
|--------|---------|
| `-y, --yes` | Apply. Without it, ZCF shows the plan and changes nothing. |

Tools are applied in parallel. If a step fails, the rest of that tool's steps are skipped, because they depend on it, and the other tools carry on. The summary lists what failed and where the backups are. The exit code is `1` when any step failed.

## `zcf update`

Update the selected tools with their own updaters, such as `claude update`, `codex update`, `opencode upgrade` or `pi update --self`. A tool without its own updater is updated with `npm install -g`, unless npm's latest version is the one already installed. When an updater fails and npm owns the package (ZCF checks with `npm ls -g`), the update falls back to `npm install -g <pkg>@latest`; a native install gets no npm fallback, so npm cannot leave a second copy next to it. A tool that is not installed is skipped with a notice. Afterwards ZCF checks each updated tool's version and says whether it moved to a newer one or was already up to date.

| Option | Meaning |
|--------|---------|
| `--file <path>` | The config file. Only its `tools` and `mirror` are read. |
| `--tools <tools>` | The tools to update instead of `tools` in the config. With it, the config file is optional. |
| `--mirror <mirror>` | `official` or `china` for this run. |

## `zcf uninstall`

Uninstall tools and take the settings ZCF wrote for them out. Like `zcf apply`, it shows the plan first and changes nothing without `-y, --yes`.

```bash
zcf uninstall claude-code codex --yes
```

Each tool goes through its own channel: `npm uninstall -g` when npm owns the package, OpenCode's own `opencode uninstall --keep-config --keep-data` when it does not, and for installs without an npm package (Claude Code and Codex native installs, Cursor CLI) the files their installer put in place, copied to the backup folder before they are deleted. On Windows those files are `claude.exe` and `codex.exe`, and Cursor CLI goes as the whole `%LOCALAPPDATA%\cursor-agent` folder. A tool ZCF cannot attribute to npm or its official installer is left alone with a notice: uninstall it the way you installed it.

ZCF removes only the settings it owns — the provider route, such as the `zcf` entries, the picks that point at them, and dsh's route patches. Claude Code's `ANTHROPIC_*` env keys and Gemini CLI's `.env` keys go only when they still hold the values the config writes; same-named settings with other values may be the user's own and stay, with a notice. MCP servers, skills, and settings ZCF cannot tell apart from the tool's own stay, and no file is deleted whole. Afterwards the tool ids come out of `tools` in the config file, so a later `zcf apply` does not install them again, and ZCF checks that the tool's command really stopped answering.

| Option | Meaning |
|--------|---------|
| `--file <path>` | The config file whose `tools` list is cleaned up. |
| `-y, --yes` | Uninstall. Without it, ZCF shows the plan and changes nothing. |

## `zcf mirror [mirror]`

With no argument, show the mirror in use and where the setting comes from: `ZCF_MIRROR`, the config file, or the default. With `official` or `china`, save it as `mirror` in the config file. See [Mirrors](./mirrors).

| Option | Meaning |
|--------|---------|
| `--file <path>` | The config file. |

## `zcf switch <profile>`

Switch the active [provider profile](./config#profiles): copy the provider of the profile you name — by id, or by its display name — over the top-level `provider`, backing the file up first. Nothing is written to the tools; run `zcf apply --yes` to hand the switched provider to them.

| Option | Meaning |
|--------|---------|
| `--file <path>` | The config file. |

## `zcf backup [command]`

Work with the backups in `~/.ufomiao/zcf/backups/`. Before ZCF changes or deletes a file, it copies the previous version there, one folder per run named by the run's time.

| Command | Meaning |
|---------|---------|
| `list` (the default) | List the runs, newest first: id, what made them, how many files they hold. |
| `restore <id>` | Put one run's files back. Without `-y, --yes`, show what it holds and change nothing. The files as they are now are copied into a run of their own first, so a restore can be undone by restoring that run. |
| `prune` | Remove the oldest runs beyond the newest `--keep <n>` (default 20); the newest run always stays. Without `-y, --yes`, show what would go. |

| Option | Meaning |
|--------|---------|
| `-y, --yes` | Restore or prune without asking. |
| `--keep <n>` | How many runs pruning keeps. |

## `zcf ccu`

Show Claude Code usage and cost with [ccusage](https://ccusage.com), by running it directly: ZCF starts `npx -y ccusage@latest` with your terminal attached and passes its exit code through. ccusage keeps its own CLI and its own updates — ZCF only forwards to it, and it needs `npx` (Node.js) on the PATH. ccusage downloads itself from npm as usual; ZCF's mirror setting does not apply to it.

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Done, or nothing to do. |
| `1` | A step failed, no tools were selected, or the command line was wrong, such as an unknown tool id. |
| `2` | The config file is missing or invalid. |

`zcf update --tools` runs without a config file, and `zcf mirror <mirror>` creates one when it is missing.
