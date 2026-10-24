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
| `--lang <lang>` | Display language, `en` or `zh-CN`. It overrides `ZCF_LANG` and the system locale. |
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

Update the selected tools with their own updaters, such as `claude update`, `codex update`, `opencode upgrade` or `pi update --self`. A tool without its own updater is updated with `npm install -g`. A tool that is not installed is skipped with a notice.

| Option | Meaning |
|--------|---------|
| `--file <path>` | The config file. Only its `tools` and `mirror` are read. |
| `--tools <tools>` | The tools to update instead of `tools` in the config. With it, the config file is optional. |
| `--mirror <mirror>` | `official` or `china` for this run. |

## `zcf mirror [mirror]`

With no argument, show the mirror in use and where the setting comes from: `ZCF_MIRROR`, the config file, or the default. With `official` or `china`, save it as `mirror` in the config file. See [Mirrors](./mirrors).

| Option | Meaning |
|--------|---------|
| `--file <path>` | The config file. |

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Done, or nothing to do. |
| `1` | A step failed, no tools were selected, or the command line was wrong, such as an unknown tool id. |
| `2` | The config file is missing or invalid. |

`zcf update --tools` runs without a config file, and `zcf mirror <mirror>` creates one when it is missing.
