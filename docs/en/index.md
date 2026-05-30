---
title: ccs - Claude Code Switch
---

<div align="center">
  <h1>ccs - Claude Code Switch</h1>

  > Manage multiple Claude Code API endpoints and switch between them in one command — plus keep Claude Code and ccs up to date.
</div>

## Project Overview

`ccs` (Claude Code Switch) is a small CLI that does two things well:

1. **Manage & switch API endpoints** — Save multiple Claude Code API profiles (base URL + auth type + key) and switch the active one instantly, from an interactive menu or a single command.
2. **Check updates** — Update both Claude Code and `ccs` itself to the latest versions.

It also offers an interactive menu, zh-CN/en language switching, and clean uninstallation. Configuration lives in `~/.ccs`.

## Quick Start

```bash
# Install globally
npm i -g @xwm111/ccs

# Or run without installing
npx @xwm111/ccs

# Open the interactive menu
ccs
```

See [Getting Started](getting-started/) for details.

## Why ccs

- **Multiple endpoints, one switch** — Keep as many Claude Code API profiles as you need and switch instantly.
- **Always current** — One command updates both Claude Code and ccs.
- **Bilingual** — Interface available in English and Simplified Chinese.
- **Clean** — Configuration is isolated in `~/.ccs` and can be removed cleanly with `ccs uninstall`.

## Related Links

- **npm**: <https://www.npmjs.com/package/@xwm111/ccs>

## License

MIT Licensed. Forked from [UfoMiao/zcf](https://github.com/UfoMiao/zcf) (MIT).
