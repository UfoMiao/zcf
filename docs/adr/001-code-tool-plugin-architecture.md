# ADR 001: Built-in code-tool plugin architecture

- Status: Accepted
- Date: 2026-07-28

## Context

ZCF originally selected Claude Code or Codex with conditionals spread across command
handlers, installation utilities, configuration switching, skills installation, and
tool update scheduling. Adding a third CLI therefore required edits in unrelated
modules and encouraged tool-specific domain data to leak into command orchestration.

An earlier Phase 1 pull request introduced an adapter registry, but it diverged from
the current `main` command implementation and could not be merged without conflicts.
A later, broader implementation added an external adapter loader, a generic template
engine, and an incomplete OpenCode adapter. That implementation was reverted because
its boundary was too large and its behavior was incomplete.

## Decision

ZCF uses a conservative, in-process plugin boundary:

1. `CodeToolDefinition` is the single source of truth for canonical ids, aliases,
   user-facing name keys, paths, template roots, skills CLI agent ids, and package
   installation metadata.
2. `CodeToolAdapter` owns lifecycle operations and optional capabilities. Core
   commands resolve an adapter and dispatch through its contract; they do not select
   behavior with code-tool conditionals.
3. `CodeToolRegistry` validates all ids and aliases before mutation. Registration is
   atomic and rejects alias-to-alias, id-to-alias, and duplicate-key collisions.
4. Built-in adapters are registered explicitly in one module. There is no external
   plugin loader, runtime discovery, or import-time registration side effect.
5. Tool-specific orchestration lives below the adapter. Adapters may call reusable
   utilities, but adapters must not call command handlers, preventing
   adapter-to-command-to-adapter cycles.
6. Provider input is normalized to `ProviderProfile`; Claude Code JSON and Codex TOML
   representations are produced only at adapter serialization boundaries.
7. Existing workflow installation continues to delegate skills to `npx skills`.
   Template roots and skills agent ids come from adapter metadata.
8. Built-in tools remain Claude Code and Codex only. The registry and adapter
   contract are the extension point for a future CLI; this change does not add a
   third product.

## Capability model

Every built-in adapter implements `init`, `update`, and `uninstall`. Optional
capabilities are detected from the adapter contract:

| Capability | Claude Code | Codex |
| --- | --- | --- |
| backup | yes | yes |
| configurations | yes | yes |
| providers | yes | yes |
| tool update | yes | yes |

Unsupported optional capabilities fail with a localized, explicit error rather than
falling through to another tool.

## Compatibility constraints

- Claude Code and Codex initialization, update, uninstall, configuration switching,
  provider import, installation, and update behavior remain intact versus `main`.
- Existing public compatibility helpers remain available where tests or callers
  already import them.
- `~/.ufomiao/zcf/config.toml` continues to store the canonical `codeToolType`.
- Existing user configuration files are never overwritten by the minimal shared
  template installer; it copies only missing files.
- Backups use cross-platform path helpers and remain under each tool's home directory.
- All new user-visible messages use i18n keys.
- Vitest runs with an isolated temporary `HOME`, code-tool configuration roots,
  npm prefix/cache, and Homebrew cache/temp directories. Test subprocesses inherit
  that environment, so tests cannot resolve ZCF-managed paths into the real user home.

## Consequences

Adding another built-in CLI requires one definition, one adapter, optional templates,
and focused tests. Core command handlers, aliases, platform installation metadata,
skills mappings, and update scheduling do not need new conditionals.

This decision intentionally does not support third-party runtime plugins, external
adapter packages, additional product CLIs, or a general-purpose template engine. Those
features would require a separate change backed by a complete compatibility design.
