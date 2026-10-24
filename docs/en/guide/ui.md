---
title: Terminal and web UI
---

# Terminal and web UI

ZCF has two editors for the [config file](./config): one in the terminal (`zcf` or `zcf tui`) and one in the browser (`zcf ui`). They have the same pages and the same checks, so use whichever you prefer.

Both edit a draft. Nothing is written until you save, and saving only writes what you changed. If you edit the file in a text editor while ZCF is open, your edits survive as long as you didn't change the same keys in ZCF.

The first save in a session copies the config to `~/.ufomiao/zcf/backups/<time>/` before writing it.

## Pages

| Page | What you do there |
|------|-------------------|
| Tools | Tick the tools to configure. Each row shows whether the tool is installed and which version. |
| Provider | Start from a [preset](./providers), or fill in the name, API key, endpoints and models. *Remove the provider* takes it out of the config. |
| MCP servers | Add, edit, rename and remove servers. Changing the type between `stdio` and `http` resets the fields that only the other type has. |
| Skills | Add skill sources and, for each, the skills to install. |
| Settings | Settings for ZCF itself, which no tool's config receives: the interface language and the [download mirror](./mirrors). If `ZCF_MIRROR` is set, the page says so: the variable decides while it is set, and what you save applies once it is unset. |
| Apply | See the plan for the saved config, with a diff of each file, then apply it. |

Fields are checked as you type. A config with errors cannot be saved, and the page shows what is wrong next to the field.

Secrets stay hidden. The API key and the values of MCP environment variables and headers show as `*` while you edit them, in both editors.

## Language

The UI's language is the config's `language`, picked on the Settings page; `auto` follows the system locale. The terminal UI switches the moment you change the field, and the web UI picks it up when it next starts. `--lang` or `ZCF_LANG` overrides it for a single run.

## Terminal UI

| Keys | Action |
|------|--------|
| <kbd>↑</kbd> <kbd>↓</kbd> (or <kbd>k</kbd> <kbd>j</kbd>) | Move between rows or pages. |
| <kbd>Enter</kbd> | Open a page, edit a field, confirm an edit, or run an action. |
| <kbd>←</kbd> <kbd>→</kbd> or <kbd>Space</kbd> | Change a choice, such as an MCP server's type. |
| <kbd>x</kbd> | Remove the selected item. |
| <kbd>Esc</kbd> or <kbd>←</kbd> | Go back, or cancel an edit. |
| <kbd>Ctrl</kbd>+<kbd>S</kbd> | Save. Confirm the field you are typing in with <kbd>Enter</kbd> first. |
| <kbd>q</kbd> | Quit, from the page list. With unsaved changes, press it twice. |

On the Apply page, <kbd>Enter</kbd> applies, <kbd>r</kbd> plans again, and the arrow keys scroll. The plan is made from the saved file, so the page asks you to save first if you have unsaved changes.

Arguments of an MCP server are typed on one line, the way a shell takes them. Quote an argument that contains spaces: `--header "Authorization: Bearer x"`.

## Web UI

```bash
npx zcf ui              # opens the browser
npx zcf ui --no-open    # only prints the address
npx zcf ui --port 4567  # a fixed port
```

The server listens on `127.0.0.1` only and answers only requests for its own address. The printed address ends with `#token=...`. The page sends this token with every API request, so a page from another site cannot read or change your config through the server. Treat the address like a password while the server runs. Stop the server with <kbd>Ctrl</kbd>+<kbd>C</kbd>.

The browser receives the config, because the page edits it. Plans and apply results come back masked: you see the diff of each file ZCF edits, with secrets masked, and never the whole file. A long secret keeps its first 3 and last 2 characters, such as `sk-***Xy`, so you can tell which one it is.

<kbd>Ctrl</kbd>+<kbd>S</kbd> (<kbd>⌘</kbd>+<kbd>S</kbd> on macOS) saves, the same as the Save button. With two tabs open on the same server, each tab saves only its own changes.
