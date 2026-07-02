---
title: CodeBuddy 支持
---

# CodeBuddy 支持

[CodeBuddy](https://codebuddy.ai) 是一款通过本地配置目录运行的 AI 编程代理。ZCF 采用与 Claude Code、Codex 相同的配置模式，为 CodeBuddy 提供一键初始化与切换能力。

## 核心特性

- **统一工具切换**：在 ZCF 菜单或 CLI 中切换 Claude Code、Codex 与 CodeBuddy。
- **基于配置文件的 API 管理**：保存多组 API 配置并随时切换。
- **MCP 服务集成**：在 `~/.codebuddy/.mcp.json` 中安装和管理 MCP 服务器。
- **多语言支持**：通过 `CODEBUDDY.md` 设置 AI 输出语言。
- **备份安全**：MCP 配置变更会自动生成带时间戳的备份。

## 安装与初始化

### 初始化 CodeBuddy

```bash
# 交互式初始化
npx zcf
# 选择 S（切换代码工具）→ CodeBuddy → 完整初始化

# 非交互式初始化
npx zcf i -s -T codebuddy --api-type api_key --api-key "sk-xxx" --api-url "https://api.example.com"
```

### 使用提供商预设初始化

```bash
npx zcf i -s -T codebuddy -p 302ai -k "sk-xxx"
```

## 配置文件

ZCF 会创建如下 CodeBuddy 配置结构：

```
~/.codebuddy/
├── settings.json        # API 密钥、Base URL、模型环境变量
├── .mcp.json            # MCP 服务器配置
├── CODEBUDDY.md         # 全局记忆 / 语言指令
└── backup/              # 带时间戳的 MCP 备份
```

### `settings.json` 环境变量

ZCF 将 API 配置写入 `settings.json` 的 `env` 字段：

| 变量 | 说明 |
|------|------|
| `ANTHROPIC_API_KEY` | API 密钥认证 |
| `ANTHROPIC_AUTH_TOKEN` | 认证令牌 |
| `ANTHROPIC_BASE_URL` | 自定义 API 地址 |
| `ANTHROPIC_MODEL` | 主模型 |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | 默认 Haiku 模型 |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | 默认 Sonnet 模型 |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | 默认 Opus 模型 |

## MCP 服务集成

CodeBuddy 与 Claude Code、Codex 共用相同的 MCP 服务：

```bash
# 非交互式安装所有 MCP 服务
npx zcf i -s -T codebuddy --mcp-services all

# 选择性安装
npx zcf i -s -T codebuddy --mcp-services context7,exa

# 通过菜单配置
npx zcf → CodeBuddy → 配置 MCP
```

MCP 服务器保存在 `~/.codebuddy/.mcp.json` 中。

## 多提供商配置

可以为 CodeBuddy 定义多组 API 配置：

```bash
npx zcf i -s -T codebuddy --api-configs '[
  {"provider":"302ai","key":"sk-xxx","default":true},
  {"name":"custom","type":"api_key","key":"sk-yyy","url":"https://custom.api.com"}
]'
```

交互式切换配置：

```bash
npx zcf config-switch -T codebuddy
```

## 常用操作

### 更新 CodeBuddy 配置

```bash
npx zcf update -T codebuddy
```

### 检查更新

```bash
npx zcf check-updates -T codebuddy
```

### 卸载 CodeBuddy

```bash
npx zcf uninstall -T codebuddy
```

卸载会清除 MCP 配置并清空 `settings.json` 中的 API 密钥。

## 与 Claude Code、Codex 对比

| 特性 | Claude Code | Codex | CodeBuddy |
|------|------------|-------|-----------|
| 配置文件 | `~/.claude/settings.json` | `~/.codex/config.toml` | `~/.codebuddy/settings.json` |
| 记忆文件 | `CLAUDE.md` | `AGENTS.md` | `CODEBUDDY.md` |
| MCP 配置 | `.claude.json` / `settings.json` | `config.toml` | `.mcp.json` |
| API 配置 | 认证令牌 / API 密钥 / CCR 代理 | 提供商 + API 密钥 | 认证令牌 / API 密钥 |
| 多提供商 | ✅ | ✅ | ✅ |

## 说明

- CodeBuddy 支持当前基于适配器模式：ZCF 负责管理配置文件，CodeBuddy 在运行时读取。
- 切换离开 CodeBuddy 时，ZCF 默认将当前工具重置为 `claude-code`。
- 菜单系统已为 CodeBuddy 提供独立选项；如发现菜单操作缺失，请反馈。
