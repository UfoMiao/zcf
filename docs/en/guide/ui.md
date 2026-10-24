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
| Apply | See the plan for the saved config, with a diff of each file, then apply it. |

Fields are checked as you type. A config with errors cannot be saved, and the page shows what is wrong next to the field.

Secrets stay hidden. The API key and the values of MCP environment variables and headers show as `*` while you edit them, in both editors.

## Terminal UI

| Keys | Action |
|------|--------|
| <kbd>↑</kbd> <kbd>↓</kbd> (or <kbd>k</kbd> <kbd>j</kbd>) | Move between rows or pages. |
| <kbd>Enter</kbd> | Open a page, edit a field, or run an action. |
| <kbd>←</kbd> <kbd>→</kbd> | Change a choice, such as an MCP server's type. |
| <kbd>x</kbd> | Remove the selected item. |
| <kbd>Esc</kbd> | Go back, or cancel an edit. |
| <kbd>Ctrl</kbd>+<kbd>S</kbd> | Save. |
| <kbd>q</kbd> | Quit. With unsaved changes, press it twice. |

On the Apply page, <kbd>Enter</kbd> applies, <kbd>r</kbd> plans again, and the arrow keys scroll. The plan is made from the saved file, so the page asks you to save first if you have unsaved changes.

Arguments of an MCP server are typed on one line, the way a shell takes them. Quote an argument that contains spaces: `--header "Authorization: Bearer x"`.

## Web UI

```bash
npx zcf ui              # opens the browser
npx zcf ui --no-open    # only prints the address
npx zcf ui --port 4567  # a fixed port
```

The server listens on `127.0.0.1` only and answers only requests for its own address. The printed address ends with `#token=...`. The browser needs this token for every request, so a page from another site cannot use the server. Treat the address like a password while the server runs. Stop the server with <kbd>Ctrl</kbd>+<kbd>C</kbd>.

The browser receives the config, because the page edits it. Plans and apply results come back masked: you see the diff of each file, with secrets replaced by `***`, and never the whole file.

<kbd>Ctrl</kbd>+<kbd>S</kbd> (<kbd>⌘</kbd>+<kbd>S</kbd> on macOS) saves, the same as the Save button. With two tabs open on the same server, each tab saves only its own changes.
