---
title: 快速开始
---

# 快速开始

ZCF 为你所有的 AI 编程工具维护同一份配置。工具、供应商、MCP 服务和技能只需选一次，ZCF 会安装缺少的工具，并写入每个工具自己的原生配置。

ZCF 只负责配置工具，它不是网关，也不是代理：运行之后，每个工具都直接连接你的供应商，和手动配置的效果一样。

支持的工具：

- Claude Code
- Codex
- Gemini CLI
- OpenCode
- Cursor CLI
- Pi
- DeepSeek Harness

每个工具会被写入哪些内容，见 [Agent 工具](./tools)。

## 环境要求

- Node.js 22 或更高版本。
- Windows 上，官方安装器为 PowerShell 脚本的工具需要 PowerShell。

## 打开编辑器

```bash
npx zcf
```

在终端里不带命令运行 `zcf` 会打开终端编辑器。想在浏览器里编辑，运行：

```bash
npx zcf ui
```

两个编辑器编辑的是同一个文件 `~/.ufomiao/zcf/zcf.json`，页面也相同：

1. **Agent 工具**：勾选你使用的 Agent 工具。每一行会显示工具是否已安装以及版本。
2. **供应商**：从[预设](./providers)开始，或自己填写接口地址和 API 密钥。
3. **MCP 服务**：添加 `stdio` 服务（一条命令）或 `http` 服务（一个 URL）。
4. **技能**：添加 `npx skills add` 能识别的技能来源。
5. **设置**：ZCF 自身的设置：界面语言和下载镜像。
6. **应用**：查看将要发生的修改，然后应用。

按 <kbd>Ctrl</kbd>+<kbd>S</kbd> 保存。全部按键见[终端与网页界面](./ui)。

## 或者手写配置

编辑器不是必需的。用文件达到同样的效果：

```jsonc
// ~/.ufomiao/zcf/zcf.json
{
  "version": 1,
  "tools": ["claude-code", "codex"],
  "provider": {
    "name": "My relay",
    "apiKey": "sk-...",
    "anthropic": { "baseUrl": "https://relay.example.com" },
    "openai": { "baseUrl": "https://relay.example.com/v1", "model": "gpt-5.5" }
  },
  "mcpServers": {
    "context7": { "type": "stdio", "command": "npx", "args": ["-y", "@upstash/context7-mcp"] }
  }
}
```

然后预览并应用：

```bash
npx zcf plan          # 显示将要运行的命令，以及将被修改的每个文件的 diff
npx zcf apply --yes   # 安装缺少的工具并写入配置
```

不带 `--yes` 的 `zcf apply` 只显示同样的计划，不做任何修改。全部字段见[配置文件](./config)。

## 应用时会发生什么

- 所有修改都先做计划。每一步要么运行一条命令，要么修改一个文件中的若干键。不同工具并行处理，同一工具的步骤按顺序执行。
- 能用工具自带命令的地方就用命令，例如 `claude mcp add-json`、`codex mcp add` 和 `npx skills add`。只有没有命令可用的设置才直接修改文件。
- 文件按键修改。你的注释、键的顺序和其他设置都保持原样。
- 每个文件在第一次修改前会复制到 `~/.ufomiao/zcf/backups/<时间>/`。见[备份与故障排除](./troubleshooting)。
- API 密钥、MCP 环境变量和请求头的值，以及在工具文件中找到的凭据，在 ZCF 的所有输出中都会被遮盖。不要把密钥写在 MCP 服务参数里，请改用 `env` 或 `headers`。

## 保持工具最新

```bash
npx zcf update
```

它会运行每个已选工具自带的更新命令，例如 `claude update` 或 `opencode upgrade`。在中国大陆，请参阅[镜像](./mirrors)。
