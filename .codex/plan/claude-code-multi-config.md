# Claude Code 多配置存储迁移计划

## 上下文
- 目标：将 Claude Code 多配置持久化从 `claude-code-configs.json` 迁移到 `~/.ufomiao/zcf/config.toml`，与原始规划保持一致。
- 基线：已有 `smol-toml` 工具链用于 ZCF 配置；`.claude/plan/Claude-Code-Multi-Config-TDD-Plan.md` 定义的 TOML 结构为真源。
- 约束：遵循既有 CLI 架构、类型定义与 i18n 风格；计划内不新增 JSON 备份，仅对 TOML 进行安全复制备份。

## 执行步骤
1. **数据结构同步**  
   - 更新 `src/types/claude-code-config.ts`、`src/types/toml-config.ts`：使用配置名作为 key，移除 `id/createdAt/updatedAt/version` 等冗余字段。
2. **配置管理器改造**  
   - 调整 `src/utils/claude-code-config-manager.ts`：以 profile name 为 key 管理数据，写入 `config.toml`；对齐 Codex 的重复校验、确认提示等行为（新增后询问继续、冲突提示等）。
3. **交互逻辑更新**  
   - 在 `src/utils/claude-code-incremental-manager.ts`、`src/commands/init.ts` 中同步新增确认流程与重复提示，移除对 ID/时间戳的依赖。
4. **命令与输出同步**  
   - 更新 `src/commands/config-switch.ts` 列表展示逻辑，仅使用必要字段展示，同时复用 Codex 提示风格。
5. **国际化与提示**  
   - 调整 `src/i18n/locales/*/multi-config.json` 文案，新增“继续添加”提示与重复警告文案。
6. **测试适配**  
   - 重写 `tests/unit/**/claude-code*` 等相关单测，确保模拟流程与 Codex 行为一致。
7. **验证**  
   - 运行或说明测试策略，确保迁移与新交互验证充分。

## 风险/提醒
- 注意与其他模块（例如 `readZcfConfig`）的并发写入，避免覆盖用户配置。
- 测试需隔离用户真实 `config.toml` 文件，使用临时目录避免污染。
