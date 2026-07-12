# ADR 001: CodeTool 插件化架构

## 状态

已接受（Phase 1 落地）

## 背景

ZCF 当前通过 `CODE_TOOL_TYPES` 硬编码与 `if (codex)` 分支支持 Claude Code / Codex 两种 CLI。新增第三种 CLI（如 Gemini CLI）需改动 constants、commands、templates、tests 多处，边际成本高。

[UFO-175](https://github.com/UfoMiao/zcf/issues) 调研结论：参考 vercel-labs/skills 的注册表模式与 cc-switch-cli 的 AppType 路由，引入 **CodeTool 插件注册表 + 统一适配器接口**。

## 决策

### 1. 模块位置

```
src/code-tools/
  types.ts              # CodeToolAdapter 接口
  registry.ts           # 注册、解析、检测
  register-builtins.ts  # 内置适配器注册
  backup.ts             # 共享配置备份
  claude-code/adapter.ts
  codex/adapter.ts
```

现有 `src/utils/code-tools/codex*.ts` 实现**暂不搬迁**（Phase 2），由 `codex/adapter.ts` 作为 facade 委托。

### 2. 核心接口

每个 CLI 实现 `CodeToolAdapter`：

- **元数据**：`id`、`displayName`、`aliases`、`banner`、`paths`、`skillsAgents`
- **生命周期**：`detectInstalled`、`init?`、`update`、`uninstall`
- **可选能力**：`listConfigurations`、`switchConfiguration`、`checkUpdates`、`backup`

命令层（`init` / `update` / `uninstall`）通过 `getCodeTool(id)` 分发，禁止新增 `if (tool === 'xxx')` 硬编码分支。

### 3. Phase 1 范围（本 PR）

- 定义接口 + 注册表
- Claude Code / Codex 各一个 adapter facade
- `update`、`uninstall`、Codex `init` 改走 registry
- `code-type-resolver`、`skills-installer` 从 registry 读取别名与 skills 映射
- Claude Code 完整 init/uninstall 仍留在 `commands/`（避免大规模搬迁导致行为回归）

### 4. 后续阶段

| 阶段 | 内容 |
|------|------|
| Phase 2 | 将 Claude 专用逻辑从 `installer/`、`claude-config` 迁入 `claude-code/` |
| Phase 3 | 统一 `ProviderProfile` 序列化模型 |
| Phase 4 | `zcf skills` 委托 `npx skills` |
| Phase 5 | 新增 Gemini/Cursor 等适配器验证「只加目录 + 注册一行」 |

### 5. 与已回滚 agent-adapter 的区别

2026-07 的 `src/adapters/` 方案因 Claude adapter 反向调用 `init()` 产生循环依赖而回滚。本方案要求 adapter **只委托底层 utils**，禁止 adapter → command → adapter 回路。

## 后果

- **正面**：新增 CLI 只需实现 adapter + 注册；命令层保持稳定
- **负面**：短期内存在 `utils/code-tools/` 与 `code-tools/codex/` 双路径，文档需说明
- **兼容**：`~/.ufomiao/zcf/config.toml` 的 `codeToolType` 字段不变
