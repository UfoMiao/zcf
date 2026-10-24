# Contributing to ZCF

Thanks for helping out. Please read the [Code of Conduct](CODE_OF_CONDUCT.md) first.

ZCF v5 is being rebuilt from scratch on `main`; v3 lives on at the `zcf@3.7.3` tag. Open an issue before starting a large change so we can agree on the direction.

## Setup

You need Node.js 22 or newer and pnpm 12 (Corepack picks the version from `packageManager`).

```bash
git clone https://github.com/UfoMiao/zcf.git
cd zcf
pnpm install
pnpm dev --help
```

## Workflow

[`AGENTS.md`](AGENTS.md) is the single guide for people and AI agents alike. It covers the layout, the commands and their timings, the rules every change follows, and which checks to run for which kind of change. In short:

```bash
pnpm lint        # oxlint + oxfmt
pnpm typecheck   # TypeScript 7
pnpm test:run    # Vitest
pnpm build && pnpm bench
```

Commits follow [Conventional Commits](https://www.conventionalcommits.org/). Pull requests use the template in `.github/PULL_REQUEST_TEMPLATE`.

## Bugs and ideas

Report bugs and request features in [GitHub issues](https://github.com/UfoMiao/zcf/issues). For bugs, include your OS, Node.js version, the `zcf` command you ran and its output (remove API keys first).
