# ADR 002: ZCF v5 architecture

- Status: Accepted
- Date: 2026-10-24
- Supersedes: ADR 001 for everything on `main` (ADR 001 still describes v3)

## Context

ZCF v3 configures Claude Code and Codex separately, through an inquirer menu that cannot show real forms. Each tool repeats the same questions, and config writing is spread across many modules. `zcf --version` takes about 265 ms.

The maintainer asked for a rewrite with these goals, in order: speed, development speed, and user experience. Backward compatibility is not required. Specifically:

- One ZCF config (provider, MCP servers, skills, and later more) is applied to every selected AI tool. ZCF installs missing tools and writes each tool's own native config. It is not a gateway.
- Use each tool's own commands and mainstream CLIs (`claude update`, `claude mcp`, `npx skills`) instead of reimplementing them.
- A form-based TUI, and a local web UI (like `ccr ui`) that reuses the same building blocks.
- The release is v5. There is no v4.

## Decision

### Packages

A pnpm workspace:

- `@zcf/core`: headless engine with no terminal or UI code.
- `zcf`: the CLI, bundled by tsdown into a dependency-free package.
- `@zcf/ui-kit`: what the terminal UI and the web UI share, with no rendering code. It has the draft model (edit the config as plain data, validate it with the core schema), the page and field definitions, the `useConfigEditor` React hook, and the `ZcfService` interface (load, save, detect, plan, apply).
- The terminal UI is an Ink app in `packages/cli/src/tui`, loaded with `import()` only by `zcf tui` (or a bare `zcf` in a terminal), so other commands never load Ink or React. It calls core through `createLocalService` in `packages/cli/src/service.ts`. The web UI (`packages/web`, React and Vite, shipped in the CLI's `dist/web`) reaches the same service through `zcf ui`, a local HTTP server in `packages/cli/src/server.ts`.
- The UI edits a draft. Ctrl+S saves it to the ZCF config key by key (`saveConfigDraft`), keeping comments. Only what the user changed in that editor since loading is written, so edits made to the file meanwhile, from another browser tab or by hand, survive. The Apply page plans and applies the saved config with the same output and secret masking as `zcf plan`.
- `zcf ui` listens on 127.0.0.1 only and refuses other `Host` headers (DNS rebinding). Every API call needs a random token that the printed URL carries in its fragment. Plan and apply output reaches the browser masked: the diff of each file, but not the whole file or the raw edit values. The config itself is sent unmasked, because the page is the editor for it: API keys show in password fields, as the TUI shows them as stars while editing.

### Plan, diff, apply

Every action is planned before anything changes:

1. Each tool adapter reads the current state (`detect`) and turns the config into a `ToolPlan`. A step either runs a command (the tool's own CLI first) or applies key edits to one native config file.
2. Front ends show the plan, with a unified diff for each file step, using `previewFileStep`.
3. `applyPlan` runs tools in parallel and each tool's steps in order. A failed step skips the rest of that tool, because later steps depend on earlier ones. Each file is backed up once per run, before its first change.

File edits are format-preserving: jsonc-parser for JSON/JSONC, toml-patch for TOML, and a small line editor for dotenv files (such as Gemini CLI's `~/.gemini/.env`). Writes go through a temporary file and a rename, and keep the file's mode. Comments, key order and unrelated keys stay as they are.

Adapters are pure apart from what goes through `AdapterContext` (home, platform, environment, command runner, file reader). Tests therefore never touch the real home directory or run real installers.

Core returns message keys and parameters, never display text. Each front end translates them (en and zh-CN).

### Config

The config is JSON with comments at `~/.ufomiao/zcf/zcf.json` (or `--file`), validated by a valibot schema with `version: 1`. The same schema will drive TUI and web forms.

### Claude Code adapter (first tool)

| Item | How |
|------|-----|
| Detect | `claude --version`, then `~/.local/bin/claude` |
| Install | The official native installer (`install.sh`, or `install.ps1` on Windows) |
| Update | `claude update`, with npm as a fallback when npm owns the install |
| Provider | `env` keys in `~/.claude/settings.json`. ZCF owns the `ANTHROPIC_*` keys it writes and removes the ones the config leaves unset |
| MCP | `claude mcp add-json --scope user`. Servers already in `~/.claude.json` with the same definition are skipped; changed ones are removed and added again. On Windows, `npx`-style commands are wrapped in `cmd /c` |
| Skills | `npx skills add <source> -g -a claude-code`, skipped when every named skill is already installed |

Paths follow `CLAUDE_CONFIG_DIR` when it is set, as Claude Code itself does: `settings.json`, `skills/` and `.claude.json` then live in that folder.

### Codex adapter

| Item | How |
|------|-----|
| Detect, install, update | `codex --version`; `npm install -g @openai/codex`; `codex update` |
| Provider | `config.toml` under `CODEX_HOME` (default `~/.codex`): `model_provider = "zcf"`, `model`, and a `[model_providers.zcf]` table ZCF owns with `base_url`, `wire_api = "responses"` and the key in `experimental_bearer_token`. `auth.json` and a ChatGPT login in it are left alone |
| MCP | `codex mcp add`, which replaces a server of the same name; servers already in `config.toml` with the same definition are skipped. It has no header flag, so `http_headers` is a file edit after the command. Codex resolves `.cmd` shims on Windows itself, so commands are not wrapped |
| Skills | `npx skills add -a codex`, which installs into `~/.agents/skills` |

### Gemini CLI adapter

| Item | How |
|------|-----|
| Detect, install, update | `gemini --version`; `npm install -g @google/gemini-cli`, also for updates since there is no update command |
| Provider | `GEMINI_API_KEY` and `GOOGLE_GEMINI_BASE_URL` in `~/.gemini/.env` (settings.json has no key setting), `security.auth.selectedType = "gemini-api-key"` and `model.name` in `settings.json`. The interactive CLI rejects a `gateway` selection, and `gemini-api-key` honours the base URL. `GEMINI_CLI_HOME` replaces the home folder |
| MCP | `gemini mcp add -s user`, with server arguments after `--` so options like `npx -y` reach the server. `-e` cuts values at a second `=`, so env and headers are a file edit after the command |
| Skills | `npx skills add -a gemini-cli`, which installs into `~/.gemini/skills` under the real home folder |

Codex, Gemini CLI, OpenCode, Cursor CLI, Pi and DeepSeek Harness follow the same pattern. Each adapter lives in its own file and reuses `adapters/shared.ts` for detection, npm installs and updates, skills and notices.

### Lifecycle

`zcf update` runs each tool's own updater (`claude update`, `codex update`, `opencode upgrade`, `cursor-agent update`, `pi update --self`; npm for Gemini CLI and dsh, which have none). When an updater fails and `npm ls -g` says npm owns the package, a fallback step — `npm install -g <pkg>@latest` with the flags the install uses — runs in its place (a plan step marked `fallback`: it runs only after the failed step, and stays silent when it never ran). A native install gets no fallback, so npm cannot leave a second copy next to it. magpie picks the channel from how the binary was installed; ZCF probes npm ownership instead, which is the same decision at plan time.

`zcf uninstall <tools>` is a command of its own rather than reverse cleanup on apply, because `planTools` only converges the tools the config selects: taking a tool out of `tools` stops managing it, and a later apply would reinstall anything an implicit uninstall had removed. Each tool uninstalls through its own channel — `npm uninstall -g` when npm owns it, OpenCode's `opencode uninstall --keep-config --keep-data`, or a `remove` plan step that deletes the files the native installer put in place (`claude`/`claude.exe`, `codex`/`codex.exe`, backing the file up first, counting a missing path as `unchanged`) — and a tool ZCF cannot attribute to any channel is left with a notice, in magpie's words: uninstall it the way you installed it. Uninstall removes only the settings ZCF owns — the provider route: the `zcf` entries, the picks that point at them, and dsh's route patches. Claude Code's `env` keys and Gemini CLI's `.env` keys go only when they still hold the values the config writes, since a same-named key with another value may be the user's own writing. MCP servers, skills and tool-owned folders such as `~/.claude` stay. Afterwards the tool ids come out of `tools` in the config file, and ZCF re-detects the tool to warn when a copy still answers.

The provider has one block per protocol (`anthropic`, `openai`, `gemini`). Each adapter uses the protocol its tool speaks, and reports a notice when the provider lacks it. A tool's model is the protocol block's `model`, or else `models.default`.

Provider presets are data, not code. They live in `presets/providers.json` on `main` and are checked by `PresetSchema` (https URLs only, no API key; plain HTTP is allowed for loopback only, so a local gateway such as magpie can be a preset). ZCF fetches the file from the URLs `githubFileUrls` gives for the mirror (jsDelivr, then raw GitHub), and keeps a copy in `~/.ufomiao/zcf/cache` for 24 hours and for offline use. `ZCF_PRESETS_URL` points it at another file. A provider can be added or fixed by a pull request to that file, with no release; jsDelivr can take up to about 12 hours to serve the new version. Picking a preset fills the provider's protocol blocks and models, and keeps the API key only when the preset uses the same hosts as the current provider.

### Mirrors

`mirror` in the config (`official` or `china`, overridden by `ZCF_MIRROR` (`cn` also means `china`) and by `--mirror` for one run, and set with `zcf mirror`) decides where downloads come from, after magpie's China mirror switch (「国内镜像」). Only mirrors that serve the very same files are used, never a proxy that could hand back anything. The one exception is the git clone inside `npx skills add`, which no same-files mirror can serve: there a prefix mirror in magpie's `--mirror` style is used. The guarantee is magpie's: the refs still come from the mirror, so it decides which history is fetched, while a change inside the bytes it hands back breaks git's object-hash chain and fails the clone.

| Download | `china` |
|----------|---------|
| npm (`npm install -g`, `npx skills`, a tool's own updater on an npm install) | `planTools` and `planUpdates` give every command step `npm_config_registry=https://registry.npmmirror.com`, unless the user already set `npm_config_registry`; it outranks a registry in `.npmrc`. The value is never printed |
| The git clone inside `npx skills add owner/repo` | `githubMirrorEnv` gives the step `GIT_CONFIG_COUNT` variables with a `url.https://gh-proxy.com/https://github.com.insteadOf=https://github.com` rule, for that one process only (no global git config). Unset when the user already passes `GIT_CONFIG_COUNT`, or has `url.<base>.insteadOf` rules of their own — found with a `git config --get-regexp '^url\.'` probe, because git prefers an env-injected rule over a file rule of the same match length and theirs must win |
| Claude Code install | `npm install -g @anthropic-ai/claude-code` (the same native binary) instead of `install.sh`, which downloads from Google Cloud Storage |
| Files in a GitHub repository, such as provider presets | `githubFileUrls` lists `fastly.jsdelivr.net` and `gcore.jsdelivr.net` before `cdn.jsdelivr.net` and `raw.githubusercontent.com` |

Not covered: native self-updates such as `claude update` on an `install.sh` install (`zcf update` says so), and the `npx` an MCP server runs inside a tool.

### Tooling

- TypeScript 7 (native `tsc`) for type checking.
- oxlint (type-aware, through tsgolint) and oxfmt for linting and formatting. typescript-eslint does not support TypeScript 7.
- tsdown bundles the CLI. Code that only some commands need, such as the TOML parser, is loaded with `import()` and lands in its own chunk.
- Vitest 5 with 80% coverage thresholds.
- A CI benchmark fails when the median `zcf --version` time goes over 60 ms. It measures about 30 ms, close to the cost of starting Node itself.

The oxc type checker `tsrs` was evaluated. It is not used for now because pnpm 12's supply-chain policy rejects its current release as a trust downgrade, and it gains little over native `tsc` at this repo's size.

## Consequences

- v3 code, tests and templates are removed from `main`. Users keep v3 from npm until v5 is published. The `zcf` package stays `"private": true` until then, because the release workflow publishes every public package.
- The docs site still describes v3 and is rewritten in a later phase.
- Every new tool or setting is an adapter change plus tests with the fake runner. No command or front-end changes are needed unless the schema grows.
