---
title: Contributing
---

# Contributing

ZCF is a pnpm workspace that needs Node.js 22 or newer.

```bash
git clone https://github.com/UfoMiao/zcf.git
cd zcf
pnpm install
pnpm dev plan --file ./my-zcf.json   # run the CLI from source
```

`pnpm dev ui` serves the web UI from `packages/web/dist`, so run `pnpm build` once first.

| Package | What it is |
|---------|------------|
| `packages/core` | The engine: the config schema, one adapter per tool, plan and apply, and the editors for JSON, TOML, YAML and `.env` files. It has no terminal or UI code. |
| `packages/ui-kit` | What the terminal and web UIs share: the draft model, the pages and fields, and the `ZcfService` interface. |
| `packages/cli` | The `zcf` command, the terminal UI and the local server for `zcf ui`. |
| `packages/web` | The browser UI. |
| `presets/providers.json` | [Provider presets](./providers), loaded at runtime. |

## Checks

| Command | Purpose |
|---------|---------|
| `pnpm test:run` | All tests |
| `pnpm typecheck` | TypeScript |
| `pnpm lint` | oxlint and oxfmt (`pnpm lint:fix` to fix) |
| `pnpm build` | Bundle the CLI |
| `pnpm bench` | Check that `zcf --version` starts within its 60 ms budget |
| `pnpm docs:dev` | This site |

Tests never touch your real home folder or run real installers. Adapters receive the home folder, platform, environment and a command runner, and the tests pass fakes.

## Where to read next

- [`AGENTS.md`](https://github.com/UfoMiao/zcf/blob/main/AGENTS.md): the rules for every change, for people and AI agents alike.
- [ADR 002](https://github.com/UfoMiao/zcf/blob/main/docs/adr/002-v5-architecture.md): the v5 architecture and the reasons behind it.

## Adding a tool

A tool is one adapter in `packages/core/src/adapters`. It detects the tool, plans its install, provider, MCP servers and skills, and plans its update. Add the tool's id and name in `packages/core/src/schema/config.ts` and register the adapter in `packages/core/src/adapters/index.ts`; the CLI and both UIs pick it up from there. Use the tool's own commands where they exist. Cover a fresh install, an existing config and Windows paths with the fake runner.

Pull requests use Conventional Commits, and their description follows the repository's template.
