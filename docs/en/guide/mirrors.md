---
title: Mirrors
---

# Mirrors

In mainland China, the npm registry and some installers are slow or blocked. The `china` mirror makes ZCF download from mirrors there instead.

```bash
npx zcf mirror china      # save it in the config
npx zcf mirror            # show which mirror is in use, and why
npx zcf mirror official   # switch back
```

## Choosing the mirror

From highest to lowest priority:

1. `--mirror official|china` on `zcf plan`, `zcf apply` or `zcf update`, for that run only.
2. The `ZCF_MIRROR` environment variable (`cn` also means `china`).
3. `mirror` in the [config file](./config), which `zcf mirror <name>` and the Settings page of the [editors](./ui) set.
4. `official`.

When the `china` mirror is in use, `zcf plan`, `zcf apply` and `zcf update` say so at the top, with the registry they use.

## What `china` changes

| Download | With `china` |
|----------|--------------|
| npm installs (`npm install -g`, `npx skills add`, and a tool's own updater when the tool was installed with npm) | Use `https://registry.npmmirror.com`. A registry you already set in `npm_config_registry` is kept. |
| The git clone inside `npx skills add owner/repo` | Through `https://gh-proxy.com/https://github.com/...`, as [magpie](https://github.com/yetone/magpie)'s `--mirror` does. The mirror is still the one that decides which commits are fetched (the refs come from it), but a change inside the bytes it hands back breaks git's object-hash chain and fails the clone — the same guarantee magpie gives. Your own `url.<base>.insteadOf` rules and a `GIT_CONFIG_COUNT` you already set are kept. |
| Installing Claude Code | `npm install -g @anthropic-ai/claude-code`, which installs the same native binary, instead of the official script that downloads from Google Cloud Storage. |
| Files from the ZCF repository, such as [provider presets](./providers) | Also asks `fastly.jsdelivr.net` and `gcore.jsdelivr.net`, and uses whichever answers first. |

ZCF only uses mirrors that serve the very same files. The one exception is the git clone above: no such mirror can serve a git clone, and there git's object-hash chain catches a mirror that changes the bytes in transit — though not one that serves a different, self-consistent history; the refs themselves still come from the mirror, as with magpie.

## Not covered

- Native self-updates, such as `claude update` on a Claude Code installed with the official script. `zcf update` says so when this applies.
- An `npx` that an MCP server runs inside a tool.
- Your provider's own endpoint.

If you are behind an HTTP proxy, note that Node's built-in `fetch`, which ZCF uses for presets, only honours `HTTPS_PROXY` when `NODE_USE_ENV_PROXY=1` is set.
