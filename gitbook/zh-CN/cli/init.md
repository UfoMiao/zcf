# zcf init

`zcf init`（缩写 `zcf i`）是最核心命令，用于安装或更新 Claude Code/Codex 环境。

## 常用参数

- `--skip-prompt, -s`：无交互模式，所有参数需在命令行提供。
- `--code-type, -T`：`claude-code`（默认）或 `codex`。
- `--provider, -p`：API 提供商预设。
- `--api-type, -t`：`auth_token`、`api_key`、`ccr_proxy`、`skip`。
- `--api-key, -k`：API Key 或 Token。
- `--api-url, -u`：自定义端点。
- `--api-model, -M` / `--api-fast-model, -F`：主模型与快速模型。
- `--config-lang, -c`：模板语言（`zh-CN` 或 `en`）。
- `--ai-output-lang, -a`：AI 输出语言，可与模板语言不同。
- `--all-lang, -g`：同时设置配置与输出语言。
- `--mcp-services, -m`：选择 MCP 服务。
- `--workflows, -w`：选择工作流集合。
- `--output-styles, -o`：输出风格集合。
- `--default-output-style, -d`：默认输出风格。
- `--install-cometix-line, -x`：是否安装 CCometixLine。
- `--api-configs` / `--api-configs-file`：多 API 配置。

## 执行流程

1. 显示 Banner 与版本信息。
2. 解析语言偏好并切换 i18n。
3. 验证参数有效性（包括提供商预设、API 类型、多配置互斥等）。
4. 根据 `code-type` 选择 Claude Code 或 Codex 流程：
   - Claude Code：创建目录、备份、配置 API/MCP/工作流/输出风格、安装 CCometixLine。
   - Codex：安装 CLI、备份配置、写入 `config.toml`、导入 MCP 与工作流。
5. 更新 `~/.ufomiao/zcf/config.toml` 保存偏好。

## 示例

```bash
# 中文模板 + 英文输出 + CCR 代理
npx zcf i -s -g zh-CN -a en -t ccr_proxy

# Codex 初始化，安装全部工作流与 MCP
npx zcf i -s -T codex -m all -w all
```
