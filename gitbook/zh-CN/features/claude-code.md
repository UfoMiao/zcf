# Claude Code 配置能力

`zcf init` 针对 Claude Code 提供完整的零配置体验，核心流程包含：

## 目录与备份

- 自动创建 `~/.claude`、`CLAUDE.md`、`settings.json` 等必要文件。
- 检测已有配置时支持备份（`backup`）、合并或跳过，备份文件位于时间戳命名的目录中。
- 兼容旧版 `~/.claude.json`、`.zcf-config.json` 等遗留文件。

## API 与模型管理

- 支持官方登录、API Key、CCR 代理三种模式，可通过增量配置器修改现有配置。
- 可同时设置主模型 `--api-model` 与快速模型 `--api-fast-model`。
- 通过 `--provider` 选择 302.AI、GLM、MiniMax、Kimi 等预设自动填充 baseUrl、认证方式与模型。

## 工作流与输出风格

- 默认安装 `WORKFLOW_CONFIG_BASE` 列表中的所有工作流，可使用 `--workflows skip` 自定义。
- 提供三套输出风格模板（工程师专业、猫又工程师、老王工程师），可在初始化或菜单中切换。
- 支持 `--default-output-style` 设置全局默认风格。

## MCP 与权限

- 集成 `MCP_SERVICE_CONFIGS` 定义的服务；需要 API Key 的服务会自动提示环境变量名称。
- 支持 Windows/Termux 特殊处理（例如 `fixWindowsMcpConfig`）。
- 可导入推荐的环境变量与权限模板，减轻手动配置负担。

## 其他能力

- 可选安装 CCometixLine 状态栏，提供实时 Git 信息与使用统计。
- 检测 CCR 状态并引导安装 Router 包与配置。
- 每次初始化都会更新 `~/.ufomiao/zcf/config.toml`，方便后续命令复用选择。
