---
title: Installation Guide
---

# Installation Guide

This guide covers how to install and run `ccs` (Claude Code Switch).

## Environment Requirements

| Requirement | Minimum Version | Description |
|-------------|-----------------|-------------|
| **Node.js** | 18.x or higher | Required to run the CLI |
| **npm** | Installed with Node.js | Required for `npx` support |
| **Operating System** | - | macOS, Linux, Windows (PowerShell/WSL) |

Check your environment:

```bash
node --version
npm --version
npx --version
```

## Install

### Option 1: Global Install (recommended)

```bash
npm i -g @xwm111/ccs
```

Then run `ccs` from anywhere.

### Option 2: Run with npx (no install)

```bash
npx @xwm111/ccs
```

## First Run

```bash
ccs
```

On first run, ccs asks which interface language you want to use:

```
? Select display language:
  ❯ 简体中文
    English
```

After choosing a language, the interactive menu opens. From there you can add a Claude Code API endpoint, switch the active one, check for updates, change the language, or uninstall.

## Verify Installation

```bash
# Show help
ccs --help

# Show version
ccs --version
```

## Configuration Location

ccs stores its configuration in `~/.ccs`.

## Next Steps

1. Explore the two [Features](../features/).
2. Refer to [CLI Commands](../cli/) for every command and option.
