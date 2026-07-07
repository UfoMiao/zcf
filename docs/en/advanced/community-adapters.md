# Community Agent Adapters

ZCF uses an adapter-based architecture to support different coding agent CLIs. Built-in adapters are shipped with the package (`claude-code`, `codex`, `opencode`), but you can also write and load your own adapter without modifying ZCF.

## Adapter Interface

A community adapter must implement the `AgentAdapter` interface exported by `zcf`:

```ts
import type { AgentAdapter, AgentConfigFile, AgentContext, AgentSkillSpec, InstallOptions, UninstallOptions, UpdateOptions } from 'zcf'

export default {
  id: 'my-agent',
  displayName: 'My Agent',
  aliases: ['ma'],
  homeDir: '/home/user/.my-agent',
  templateDir: 'templates/my-agent',
  configFiles: [
    { id: 'settings', path: '/home/user/.my-agent/settings.json', format: 'json', mergeStrategy: 'merge' },
  ],
  skillSpec: {
    skillsDir: '/home/user/.my-agent/skills',
    manifestName: 'SKILL.md',
    scopes: ['global', 'project'],
  },

  async isInstalled() { /* ... */ },
  async install(options: InstallOptions, ctx: AgentContext) { /* ... */ },
  async update(options: UpdateOptions, ctx: AgentContext) { /* ... */ },
  async uninstall(options: UninstallOptions, ctx: AgentContext) { /* ... */ },
  async backup(file: AgentConfigFile) { /* ... */ },
} satisfies AgentAdapter
```

Key methods:

- `isInstalled` — detect whether the target CLI is available.
- `install` — render templates, write configuration, install skills.
- `update` — refresh templates and skills without a full reinstall.
- `uninstall` — remove ZCF-managed files and skills.
- `backup` — create a timestamped backup before overwriting a config file.

Use the `TemplateEngine` class from `zcf/core/template-engine` to render templates and skills consistently.

## Loading from a Local TOML Manifest

Place a TOML manifest in `~/.ufomiao/zcf/adapters/<id>.toml`:

```toml
id = "my-agent"
displayName = "My Agent"
aliases = ["ma"]
main = "my-agent/adapter.mjs"
```

The `main` path is relative to `~/.ufomiao/zcf/adapters/`. The referenced module must export a valid `AgentAdapter` as its default export. You can also use a factory export:

```toml
id = "my-agent"
displayName = "My Agent"
main = "my-agent/adapter.mjs"
export = "createAdapter"
```

```ts
// my-agent/adapter.mjs
export function createAdapter(manifest) {
  return {
    id: manifest.id,
    // ...
  }
}
```

ZCF loads external adapters on startup. A broken adapter is logged and skipped so it cannot break the CLI.

## Loading from an NPM Package

Reference an NPM package in the manifest:

```toml
id = "my-agent"
displayName = "My Agent"
package = "zcf-adapter-my-agent"
export = "adapter"
```

The package must be resolvable by Node (install it globally or in a parent project). The adapter is loaded via dynamic import.

## Best Practices

1. **Preserve user customizations** — use `mergeStrategy: 'merge'` for JSON/TOML files and back up before writing.
2. **Scope skills** — put user-facing skills under `templates/<agent>/skills/user/` and project-internal skills under `templates/<agent>/skills/zcf/`.
3. **Manual-only skills** — if a skill should only be triggered by the user, add `disable-model-invocation: true` to its `SKILL.md` frontmatter.
4. **Use the template engine** — `renderConfigFile`, `renderCommon`, and `renderSkill` handle merge strategies, backups, and i18n-friendly rendering.
5. **Test coverage** — adapters must have unit tests covering installation, update, uninstall, and edge cases. Maintain ≥80% coverage.

## Example `SKILL.md`

```markdown
---
name: my-skill
description: A custom skill for my agent
version: 1.0.0
namespace: user
disable-model-invocation: true
---

# My Skill

Instructions for the agent when this skill is invoked.
```

## Troubleshooting

- **Adapter not appearing in `zcf --help`**: check the manifest ID/aliases are unique and the module exports a valid adapter.
- **`isInstalled` always false**: ensure the executable is on the user's `PATH`.
- **Template not rendered**: verify `templateDir` points to a directory containing the expected files and `renderCommon` is called for shared resources.
