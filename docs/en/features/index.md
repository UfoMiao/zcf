---
title: Features Overview
---

# Features Overview

`ccs` (Claude Code Switch) focuses on two features, plus a few conveniences.

## 1. Manage & switch API endpoints

Save multiple Claude Code API profiles, each with its own:

- **Base URL** — the API endpoint
- **Auth type** — Auth Token or API Key
- **Key** — the token or API key

Switch the active endpoint instantly from the interactive menu or directly with `ccs cs <name>`. List everything with `ccs cs --list`.

See [Config Switch](../cli/config-switch.md) for full usage.

## 2. Check updates

`ccs check-updates` (alias `ccs check`) checks for new versions of Claude Code and `ccs`, and updates them.

See [Version Check](../cli/check-updates.md) for full usage.

## Conveniences

- **Interactive menu** — Run `ccs` with no arguments. See [Main Menu](../cli/menu.md).
- **Language switching** — Switch the interface between English and Simplified Chinese with `ccs --lang <zh-CN|en>`.
- **Clean uninstall** — Remove ccs configuration and tools with `ccs uninstall`. See [Uninstall](../cli/uninstall.md).

All configuration is stored in `~/.ccs`.
