---
title: Terminal and web UI
---

# Terminal and web UI

ZCF has two editors for the [config file](./config): one in the terminal (`zcf` or `zcf tui`) and one in the browser (`zcf ui`). They check the same things as you edit and carry the same pages — the web sidebar groups them into the same sections (init config / workflows / more tools / backup) — so pick whichever fits.

Both edit a draft. Nothing is written until you save, and saving only writes what you changed. If you edit the file in a text editor while ZCF is open, your edits survive as long as you didn't change the same keys in ZCF.

The first save in a session copies the config to `~/.ufomiao/zcf/backups/<time>/` before writing it.

## Pages

| Page | What you do there |
|------|-------------------|
| Agent tools | Tick the agent tools to configure. Each row shows whether the tool is installed and which version. |
| Provider | Start from a [preset](./providers), or fill in the name, API key, endpoints and models. *Remove the provider* takes it out of the config. Save providers as [profiles](./config#profiles) on this page to switch between them. |
| MCP servers | Add, edit, rename and remove servers. Changing the type between `stdio` and `http` resets the fields that only the other type has. |
| Skills | Pick from the ZCF built-in skills, search the community index for more, and add your own sources with, for each, the skills to install. |
| Settings | Settings for ZCF itself, which no tool's config receives: the [config language](./config#configlanguage) and the [download mirror](./mirrors). If `ZCF_MIRROR` is set, the page says so: the variable decides while it is set, and what you save applies once it is unset. |
| Apply | See the plan for the saved config, with a diff of each file, then apply it. |
| Workflows | Toggle the ready-made workflow bundles of skills and agents, and build your own bundles referencing agents, built-in or community skills, and your MCP servers. The output styles live here too: pick the ones to install and the default one. |
| Agents | Pick the built-in agents installed for the tools that take them. |
| Extras | Add companion tools beside the coding ones: the magpie local gateway (`client` or `cli`) and the CCometixLine status bar. |
| Backup | Put files back from a backup run ZCF made before changing them, and prune the old runs. The page works on the saved files, not the draft. |

In the terminal UI the page list is grouped into sections — Init config, Workflows, More tools and Backup — each with its own heading, and pages carry a number across the whole list: press it to jump there from anywhere in the nav. The web UI lists the same pages in a flat sidebar.

Fields are checked as you type. A config with errors cannot be saved, and the page shows what is wrong next to the field.

Secrets stay hidden. The API key and the values of MCP environment variables and headers show as `*` while you edit them, in both editors.

## Language

Two settings sound alike and do different things:

- The **interface language** is what ZCF itself shows. Both editors switch it from their header — the terminal UI with <kbd>L</kbd>, the web UI with the selector next to the path — and save it at once, on its own, without touching the rest of your unsaved draft. It is the config's [`language`](./config#language); `auto` follows the browser's language in the web UI and the system locale in the terminal. `--lang` or `ZCF_LANG` pins it for one run, and the switch is then disabled.
- The **config language** is what the tools themselves work in once ZCF applies. It is a field on the Settings page, and only the tools with a setting of their own receive it. See [`configLanguage`](./config#configlanguage).

Command output such as `zcf plan` follows `--lang` or `ZCF_LANG`, not either setting.

## Terminal UI

| Keys | Action |
|------|--------|
| <kbd>↑</kbd> <kbd>↓</kbd> (or <kbd>k</kbd> <kbd>j</kbd>) | Move between rows or pages. |
| <kbd>0</kbd>–<kbd>9</kbd> | Jump to the page the digit names, or pick that row without running it. |
| <kbd>Enter</kbd> | Open a page, edit a field, confirm an edit, or run an action. |
| <kbd>←</kbd> <kbd>→</kbd> or <kbd>Space</kbd> | Change a choice, such as an MCP server's type. |
| <kbd>x</kbd> | Remove the selected item. |
| <kbd>Esc</kbd> or <kbd>←</kbd> | Go back, or cancel an edit. |
| <kbd>Ctrl</kbd>+<kbd>S</kbd> | Save. Confirm the field you are typing in with <kbd>Enter</kbd> first. |
| <kbd>L</kbd> | Switch the interface language, from any page, and save it at once. |
| <kbd>q</kbd> | Quit, from the page list. With unsaved changes, press it twice. |

Rows in a list are numbered by what is on screen: `› 3 Label` means <kbd>3</kbd> picks that row, wherever the window has scrolled to.

The terminal UI covers the whole window (the shell gets its screen back on exit) and takes the mouse: click a row to select it and run what <kbd>Enter</kbd> runs, click the page list on the left to switch pages, and turn the wheel to move the selection — on the Apply page it scrolls the plan. Shift-click selects text the terminal's own way. In a window shorter than 23 rows the banner folds to one line, so the app still covers the screen whole; the page list scrolls within its section when the window is short.

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
