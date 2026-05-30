---
title: Quick Start
---

# Quick Start

This chapter shows how to install `ccs` and start managing your Claude Code API endpoints in minutes.

## Quick Navigation

1. **Read the [Installation Guide](installation.md)** — System requirements and install methods.
2. **Learn the two features** — See [Features](../features/) to understand endpoint switching and update checking.
3. **Master the commands** — Refer to [CLI Commands](../cli/) for every command and option.

## Recommended Workflow

### First-Time Use

1. Run `npx @xwm111/ccs` (or install globally with `npm i -g @xwm111/ccs`).
2. Run `ccs` to open the interactive menu.
3. Add a Claude Code API endpoint (base URL + auth type + key) and set it active.

### Day-to-Day Use

- Use `ccs config-switch` (or `ccs cs`) to switch the active endpoint.
- Use `ccs cs --list` to see all saved configurations.
- Use `ccs check-updates` (or `ccs check`) to update Claude Code and ccs.

> Tip: Run `ccs` with no arguments any time to open the interactive menu.
