# Plan: Add CodeBuddy Agent Support

## Context

Issue: https://github.com/UfoMiao/zcf/issues/331

zcf 当前 `code-type` 只支持 `claude-code` 和 `codex`. 需新增 `codebuddy` 支持.

**关键发现 (探索阶段):**
- zcf 对 Claude Code 和 Codex 都是**纯文件 I/O**, 不用任何 agent SDK (node_modules 无 `@anthropic-ai/claude-code`, 无 `@tencent-ai/agent-sdk`). 因此 CodeBuddy 适配也采用纯文件 I/O, 与现有模式一致, 不引入 SDK 依赖.
- CodeBuddy 配置路径 (官方文档确认):
  - 全局 settings: `~/.codebuddy/settings.json`
  - 全局 MCP: `~/.codebuddy/.mcp.json` (推荐; legacy fallback `~/.codebuddy/mcp.json`, `~/.codebuddy.json`)
  - 全局 agents: `~/.codebuddy/agents/*.md`
  - 入口指令: `CODEBUDDY.md`
  - settings.json schema 与 Claude Code 高度相似 (`permissions.allow/ask/deny`, `env`, `hooks`, `statusLine`, `model`, `agent`)
- Claude Code 适配套件分散在 `src/utils/` 根 (多个 `claude-*.ts`); Codex 套件在 `src/utils/code-tools/` 子目录. CodeBuddy 套件放在 `src/utils/code-tools/` 子目录 (与 Codex 组织一致, 因为是新加的独立 tool).

## 用户决策 (已确认)
1. **完整适配**, 对标 Claude Code 套件
2. **全局 MCP 写 `~/.codebuddy/.mcp.json`** (官方推荐)
3. **入口文件 `CODEBUDDY.md`** (官方)

## 代码修改清单

### A. 路径常量与类型注册

**1. `src/constants.ts` (修改)**
- 新增 CodeBuddy 路径常量 (参照 Claude Code 区块 `constants.ts:5-10`):
  ```ts
  // CodeBuddy
  export const CODEBUDDY_DIR = join(homedir(), '.codebuddy')
  export const CODEBUDDY_SETTINGS_FILE = join(CODEBUDDY_DIR, 'settings.json')
  export const CODEBUDDY_MCP_FILE = join(CODEBUDDY_DIR, '.mcp.json')
  export const CODEBUDDY_MD_FILE = join(CODEBUDDY_DIR, 'CODEBUDDY.md')
  export const CODEBUDDY_AGENTS_DIR = join(CODEBUDDY_DIR, 'agents')
  ```
- `CODE_TOOL_TYPES` 数组追加 `'codebuddy'` (`constants.ts:27`)
- `CODE_TOOL_BANNERS` 追加 `'codebuddy': 'for CodeBuddy'` (`constants.ts:31`)
- `CODE_TOOL_ALIASES` 追加 `cb: 'codebuddy'` (`constants.ts:37`, 对标 `cc`/`cx`)

**2. `src/utils/code-type-resolver.ts` (修改)**
- `CODE_TYPE_ABBREVIATIONS` 追加 `cb: 'codebuddy'` (`code-type-resolver.ts:9`)
- `isValidCodeType` 的数组追加 `'codebuddy'` (`code-type-resolver.ts:78`)

### B. CodeBuddy 适配套件 (新建, 放 `src/utils/code-tools/`)

对标 Claude Code 的 `src/utils/claude-config.ts` + `src/utils/claude-code-config-manager.ts`, 但因 CodeBuddy MCP 文件独立 (`.mcp.json`), 比 Claude Code (用 `~/.claude.json`) 更简洁.

**3. `src/utils/code-tools/codebuddy-config.ts` (新建)**
对标 `src/utils/claude-config.ts`. 核心:
- `getMcpConfigPath()` → 返回 `CODEBUDDY_MCP_FILE`
- `readMcpConfig()` / `writeMcpConfig()` / `backupMcpConfig()` — 读写 `~/.codebuddy/.mcp.json`
- `getSettingsPath()` → 返回 `CODEBUDDY_SETTINGS_FILE`
- `readSettings()` / `writeSettings()` — 读写 `~/.codebuddy/settings.json`
- `fixWindowsMcpConfig()` — 复用 Claude Code 的 Windows 修复逻辑 (从 `claude-config.ts` 导入或共享)
- MCP schema 与 Claude Code 相同 (`mcpServers` 对象, stdio/sse/http 类型)

**4. `src/utils/code-tools/codebuddy-config-manager.ts` (新建)**
对标 `src/utils/claude-code-config-manager.ts`. 管理 CodeBuddy API profile (auth_token/api_key/ccr_proxy). 复用 `ZcfTomlConfig` 存储 profile, 写入 `~/.codebuddy/settings.json` 的 `env` 字段 (ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN / ANTHROPIC_BASE_URL). 因 CodeBuddy settings.json 的 env schema 与 Claude Code 一致, profile 应用逻辑基本相同.

**5. `src/utils/code-tools/codebuddy.ts` (新建)**
对标 `src/utils/code-tools/codex.ts` 的入口聚合模式. 导出:
- `runCodebuddyFullInit(options)` — 全量初始化 (对标 Claude Code `init.ts` 主流程, 但写入 `~/.codebuddy/`)
- `runCodebuddyUpdate(skipBanner, skipPrompt)` — 更新 workflows/prompts
- `runCodebuddyUninstall()` — 卸载
- `configureCodebuddyApi()` / `configureCodebuddyMcp()` — 增量配置
- `readCodebuddyConfig()` — 读取 settings.json

### C. 命令层分发 (修改)

**6. `src/commands/init.ts` (修改)**
- 在 codeType 分发处 (`init.ts:486` 附近, codex 分支后) 新增 `codebuddy` 分支, 调用 `runCodebuddyFullInit`

**7. `src/commands/update.ts` (修改)**
- `update.ts:52` 的 `if (codeToolType === 'codex')` 后新增 `else if (codeToolType === 'codebuddy')` 分支, 调用 `runCodebuddyUpdate`

**8. `src/commands/uninstall.ts` (修改)**
- `uninstall.ts:58` 的 codex 分支后新增 codebuddy 分支, 调用 `runCodebuddyUninstall`

**9. `src/commands/check-updates.ts` (修改)**
- `check-updates.ts:27` 的 fallback 注释 `Defaulting to "claude-code"` 逻辑不变, 但 `ToolUpdateScheduler` 需处理 codebuddy

**10. `src/utils/tool-update-scheduler.ts` (修改)**
- `updateByCodeType` switch (`tool-update-scheduler.ts:19`) 新增 `case 'codebuddy'`, 调用 `updateCodebuddyTools` (对标 `updateClaudeCodeTools`, 调用 `runCodebuddyUpdate`)

**11. `src/commands/menu.ts` (修改)**
- `CODE_TOOL_LABELS` (`menu.ts:31`) 追加 `'codebuddy': 'CodeBuddy'`
- 新增 `showCodebuddyMenu()` 函数 (对标 `showCodexMenu` `menu.ts:251`)
- `showMainMenu` 的菜单分发逻辑新增 codebuddy 分支

**12. `src/commands/config-switch.ts` (修改)**
- `config-switch.ts:78` 和 `:157`, `:253` 的 `if (targetCodeType === 'claude-code')` / `else if (codex)` 分支新增 `else if (codebuddy)`

**13. `src/utils/features.ts` (修改)**
- `handleCustomApiMode` (`features.ts:75`) 的 `if (codeToolType === 'claude-code')` 后新增 codebuddy 分支 (复用 CodeBuddy incremental manager)
- 新增 `configureCodebuddyDefaultModelFeature` / `configureCodebuddyAiMemoryFeature` (对标 `configureCodexDefaultModelFeature` / `configureCodexAiMemoryFeature`)

### D. CLI 选项描述 (修改)

**14. `src/cli-setup.ts` (修改)**
- `--code-type` 选项描述 (`cli-setup.ts:232`, `:260`, `:319`, `:332`) 从 `(claude-code, codex, cc, cx)` 改为 `(claude-code, codex, codebuddy, cc, cx, cb)`

### E. i18n (修改)

**15. `src/i18n/locales/en/menu.json` + `src/i18n/locales/zh-CN/menu.json` (修改)**
- 新增 `codebuddyFullInit` / `codebuddyImportWorkflow` / `codebuddyConfigureApi` / `codebuddyConfigureMcp` / `codebuddyConfigureModel` / `codebuddyConfigureAiMemory` / `codebuddyUninstall` / `codebuddyCheckUpdates` 等 key (对标现有 `codex*` key)
- 更新 `switchCodeTool` 描述提及 CodeBuddy

**16. `src/i18n/locales/en/cli.json` + `src/i18n/locales/zh-CN/cli.json` (修改)**
- `--code-type` 选项描述同步更新

**17. (可选) `src/i18n/locales/en/codebuddy.json` + `zh-CN/codebuddy.json` (新建)**
- 对标 `codex.json`, 存放 CodeBuddy 专属文案 (setupComplete, currentProvider 等)

### F. 文档修改

**18. `README.md` (修改)**
- `README.md:21` 描述 "Claude Code & Codex" 改为 "Claude Code, Codex & CodeBuddy"
- keywords (`package.json:19-34`) 追加 `codebuddy`

**19. `README_zh-CN.md` + `README_ja-JP.md` (修改)**
- 同步更新支持列表描述

**20. `package.json` (修改)**
- `keywords` 追加 `codebuddy`

### G. 测试 (新建/修改, 遵循 vitest 规范)

**21. `tests/unit/utils/constants.test.ts` (修改)**
- `CODE_TOOL_TYPES` 断言追加 `'codebuddy'` (`constants.test.ts:78`)
- `isCodeToolType` 测试追加 `'codebuddy'` 用例 (`constants.test.ts:109`)
- 新增 CodeBuddy 路径常量断言 (对标 Claude Code 路径断言 `constants.test.ts:44-58`)

**22. `tests/unit/utils/code-type-resolver.test.ts` (修改)**
- 新��� `cb` 缩写解析测试 (对标 `cc`/`cx` 测试 `code-type-resolver.test.ts:25-49`)
- 更新 invalid code type 错误消息断言 (`code-type-resolver.test.ts:53`, `:69`, `:82`, `:95`) 加入 `cb, codebuddy`

**23. `tests/unit/utils/code-tools/codebuddy-config.test.ts` (新建)**
- 覆盖 `readMcpConfig` / `writeMcpConfig` / `readSettings` / `writeSettings` / `getMcpConfigPath` / `getSettingsPath`, 用 mock fs (对标 `tests/unit/utils/claude-config.test.ts` 模式)

**24. `tests/unit/utils/code-tools/codebuddy-config-manager.test.ts` (新建)**
- 覆盖 profile CRUD, 对标 `tests/unit/utils/claude-code-config-manager.test.ts`

**25. `tests/unit/commands/menu.test.ts` (修改)**
- `CODE_TOOL_LABELS` 断言追加 codebuddy

## CI 本地验证步骤

从 `.github/workflows/ci.yml` 提取, 按顺序执行:

```bash
pnpm lint          # CI: nr lint
pnpm typecheck     # CI: nr typecheck
pnpm build         # CI: nr build
pnpm test:coverage # CI: nr test:coverage
```

通过标准: 所有命令 exit code = 0.

## PR 发起步骤 (最后)

1. 询问用户是否发起 PR (AskUserQuestion: 是 / 否)
2. 若是, 请求用户提供官方 GitHub 仓库地址 (用户已引用 https://github.com/UfoMiao/zcf/issues/331, 仓库即 `https://github.com/UfoMiao/zcf`)
3. commit message: `feat: add CodeBuddy agent support`
4. PR 标题和正文用英文, Conventional Commits + Description/Motivation/Changes/Testing/Checklist 结构
5. 推送和创建 PR 前向用户确认 (不可逆对外操作)

## 关键约束
- **不引入 SDK 依赖**: 与 Claude Code/Codex 适配一致, 纯文件 I/O
- **surgical changes**: 每行改动可追溯到本 Plan 条目
- **复用 Claude Code 模式**: profile 管理, Windows MCP fix, backup 逻辑等尽量复用或镜像
- **测试遵循 vitest 规范**: mock fs, 对标现有 claude-* 测试
