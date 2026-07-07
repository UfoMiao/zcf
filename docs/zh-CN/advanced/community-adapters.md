# 社区 Agent Adapter

ZCF 采用 adapter 架构来支持不同的 coding agent CLI。内置 adapter（`claude-code`、`codex`、`opencode`）随包发布，但你也可以编写并加载自定义 adapter，无需修改 ZCF 源码。

## Adapter 接口

社区 adapter 必须实现 `zcf` 导出的 `AgentAdapter` 接口：

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

核心方法：

- `isInstalled` — 检测目标 CLI 是否已安装。
- `install` — 渲染模板、写入配置、安装 skill。
- `update` — 刷新模板与 skill，不执行完整重装。
- `uninstall` — 移除 ZCF 管理的文件与 skill。
- `backup` — 在覆盖配置文件前创建带时间戳的备份。

使用 `zcf/core/template-engine` 中的 `TemplateEngine` 类可保持一致地渲染模板与 skill。

## 通过本地 TOML Manifest 加载

在 `~/.ufomiao/zcf/adapters/<id>.toml` 放置 TOML 清单：

```toml
id = "my-agent"
displayName = "My Agent"
aliases = ["ma"]
main = "my-agent/adapter.mjs"
```

`main` 路径相对于 `~/.ufomiao/zcf/adapters/`。被引用的模块必须以默认导出形式提供有效的 `AgentAdapter`。也支持工厂导出：

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

ZCF 在启动时加载外部 adapter。加载失败的 adapter 会被记录并跳过，不会影响整个 CLI。

## 通过 NPM 包加载

在清单中引用 NPM 包：

```toml
id = "my-agent"
displayName = "My Agent"
package = "zcf-adapter-my-agent"
export = "adapter"
```

该包需要能被 Node 解析（全局安装或安装在父项目中）。adapter 通过动态导入加载。

## 最佳实践

1. **保留用户自定义内容** — JSON/TOML 文件使用 `mergeStrategy: 'merge'`，写入前进行备份。
2. **划分 skill 作用域** — 面向用户的 skill 放在 `templates/<agent>/skills/user/`，项目内部 skill 放在 `templates/<agent>/skills/zcf/`。
3. **手动触发 skill** — 仅希望用户手动触发的 skill，在 `SKILL.md` frontmatter 中加上 `disable-model-invocation: true`。
4. **复用模板引擎** — `renderConfigFile`、`renderCommon`、`renderSkill` 已处理合并策略、备份与 i18n 友好渲染。
5. **测试覆盖** — adapter 必须包含安装、更新、卸载及边界用例的单元测试，保持 ≥80% 覆盖率。

## `SKILL.md` 示例

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

## 故障排查

- **adapter 未出现在 `zcf --help` 中**：检查 manifest 的 ID/aliases 是否唯一，模块是否导出有效 adapter。
- **`isInstalled` 始终返回 false**：确保可执行文件在用户 `PATH` 中。
- **模板未渲染**：确认 `templateDir` 指向包含预期文件的目录，并调用 `renderCommon` 渲染共享资源。
