<div align="center">
  <h1>ccs - Claude Code Switch</h1>

  <p align="center">
  <b>English</b> | <a href="README_zh-CN.md">中文</a> | <a href="README_ja-JP.md">日本語</a>

  > Manage multiple Claude Code API endpoints and switch between them in one command — plus keep Claude Code and ccs up to date.
  </p>
</div>

## What is ccs?

`ccs` (Claude Code Switch) is a small CLI that does two things well:

1. **Manage & switch API endpoints** — Save multiple Claude Code API profiles (base URL + auth type + key) and switch the active one instantly, from an interactive menu or a single command.
2. **Check updates** — Update both Claude Code and `ccs` itself to the latest versions.

It also offers an interactive menu, zh-CN/en language switching, and clean uninstallation. Configuration lives in `~/.ccs`.

## Install

```bash
# Install globally
npm i -g @xwm111/ccs

# Or run without installing
npx @xwm111/ccs
```

## Usage

```bash
ccs                  # Open the interactive menu (default)
ccs config-switch    # Manage / switch API endpoints
ccs cs               # Alias for config-switch
ccs cs --list        # List saved configurations
ccs cs my-endpoint   # Switch directly to a named configuration
ccs check-updates    # Check & update Claude Code and ccs
ccs check            # Alias for check-updates
ccs uninstall        # Remove ccs configurations and tools
```

Common options:

```bash
ccs --lang zh-CN     # Switch interface language (zh-CN, en)
ccs --help           # Show help
ccs --version        # Show version
```

## Features

### 1. Multiple API endpoints with quick switching

Store as many Claude Code API profiles as you like — each with its own base URL, authentication type (Auth Token / API Key), and key. Switch the active endpoint from the interactive menu or directly with `ccs cs <name>`. Use `ccs cs --list` to see everything you have configured.

### 2. Update checking

`ccs check-updates` checks for new versions of Claude Code and `ccs`, and updates them for you.

## License

[MIT License](LICENSE)

Forked from [UfoMiao/zcf](https://github.com/UfoMiao/zcf) (MIT).
