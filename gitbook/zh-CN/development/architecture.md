# 架构说明

## 目录结构

- `src/cli.ts`：CLI 入口，通过 `cac` 注册命令。
- `src/commands/`：每个命令的实现（init、update、menu、ccr、ccu、uninstall、config-switch 等）。
- `src/config/`：工作流、MCP、API 提供商等配置常量。
- `src/utils/`：文件操作、提示词处理、平台判断、Codex 支持等工具函数。
- `templates/`：工作流、代理、输出风格模板资源。
- `tests/`：Vitest 单元测试与集成测试，结构与 `src/` 对应。

## 关键流程

1. **命令注册**：`setupCommands` 将命令注册到 `cac`，并注入 i18n、语言解析逻辑。
2. **初始化流程**：`init` 根据 `code-type` 分流到 Claude Code 或 Codex，实现安装、配置、备份。
3. **工作流导入**：`selectAndInstallWorkflows` 根据配置复制模板并写入目标目录。
4. **MCP 配置**：`buildMcpServerConfig` 与 `mergeMcpServers` 管理 `settings.json` 中的 `mcpServers`。
5. **输出风格**：`configureOutputStyle` 负责复制与切换输出风格文件。

## 扩展建议

- 新增命令时在 `src/commands` 创建文件，并在 `setupCommands` 中注册。
- 若引入新的工作流或 MCP 服务，请更新 `templates/` 与 `src/config` 对应常量。
- 通过 Vitest 添加测试覆盖核心逻辑。
