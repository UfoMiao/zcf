---
title: API 提供商预设
---

# API 提供商预设

ZCF 提供了 API 提供商预设系统，可以大大简化 API 配置。使用预设可以将配置从 5+ 个参数减少到仅需 2 个（提供商 + API 密钥）。

## 支持的提供商

ZCF 目前支持以下 API 提供商预设：

| 预设 ID | 提供商名称 | 描述 | Claude Code 支持 | Codex 支持 | 认证方式 |
|---------|-----------|------|----------------|-----------|---------|
| `302ai` | 302.AI | 企业级 AI API 服务 | ✅ | ✅ | `api_key` |
| `glm` | GLM (智谱AI) | 智谱 AI 服务 | ✅ | ✅ | `auth_token` |
| `minimax` | MiniMax | MiniMax API 服务 | ✅ | ✅ | `auth_token` |
| `kimi` | Kimi (月之暗面) | Moonshot AI 服务 | ✅ | ✅ | `auth_token` |
| `custom` | 自定义 | 自定义 API 端点 | ✅ | ✅ | 需指定 |

## 提供商详情

### 302.AI

**官方链接**：[302.AI](https://share.302.ai/gAT9VG)

**特点**：
- 🎯 企业级 AI 资源平台
- 📊 按用量付费
- 🔄 提供最新、最全面的 AI 模型和 API
- 🌐 支持多种在线 AI 应用

**配置信息**：
- **Claude Code Base URL**: `https://api.302.ai/cc`
- **Codex Base URL**: `https://api.302.ai/v1`
- **认证方式**: `api_key`
- **Codex Wire API**: `responses`

**使用示例**：
```bash
# Claude Code
npx zcf init -s -p 302ai -k "sk-xxx"

# Codex
npx zcf init -s -T codex -p 302ai -k "sk-xxx"
```

### GLM (智谱AI)

**提供商名称**：智谱 AI (GLM)

**特点**：
- 🇨🇳 国产 AI 服务
- 💰 性价比高
- 🚀 支持多种模型
- 📚 完善的文档支持

**配置信息**：
- **Claude Code Base URL**: `https://open.bigmodel.cn/api/anthropic`
- **Codex Base URL**: `https://open.bigmodel.cn/api/coding/paas/v4`
- **认证方式**: `auth_token`
- **Codex Wire API**: `chat`
- **Codex 默认模型**: `GLM-4.6`

**使用示例**：
```bash
# Claude Code
npx zcf init -s -p glm -k "your-auth-token"

# Codex
npx zcf init -s -T codex -p glm -k "your-auth-token"
```

### MiniMax

**提供商名称**：MiniMax

**特点**：
- 🎯 专注于 AI 模型服务
- 💡 支持多种应用场景
- 🔧 灵活的配置选项

**配置信息**：
- **Claude Code Base URL**: `https://api.minimaxi.com/anthropic`
- **Codex Base URL**: `https://api.minimaxi.com/v1`
- **认证方式**: `auth_token`
- **Codex Wire API**: `chat`
- **Claude Code 默认模型**: `MiniMax-M2`
- **Codex 默认模型**: `MiniMax-M2`

**使用示例**：
```bash
# Claude Code
npx zcf init -s -p minimax -k "your-auth-token"

# Codex
npx zcf init -s -T codex -p minimax -k "your-auth-token"
```

### Kimi (月之暗面)

**提供商名称**：Kimi / Moonshot AI

**特点**：
- 🌙 月之暗面 AI 服务
- 📝 擅长长文本处理
- 🚀 高性能模型

**配置信息**：
- **Claude Code Base URL**: `https://api.moonshot.cn/anthropic`
- **Codex Base URL**: `https://api.moonshot.cn/v1`
- **认证方式**: `auth_token`
- **Codex Wire API**: `chat`
- **Claude Code 默认模型**: `kimi-k2-0905-preview` (主), `kimi-k2-turbo-preview` (快速)
- **Codex 默认模型**: `kimi-k2-0905-preview`

**使用示例**：
```bash
# Claude Code
npx zcf init -s -p kimi -k "your-auth-token"

# Codex
npx zcf init -s -T codex -p kimi -k "your-auth-token"
```

### Custom (自定义)

**提供商名称**：自定义

**特点**：
- 🔧 完全自定义配置
- 🌐 支持任意 API 端点
- 📝 需要手动配置所有参数

**使用方式**：
```bash
# 使用自定义提供商（需要提供 URL）
npx zcf init -s -p custom -k "sk-xxx" -u "https://api.example.com/v1"

# 或使用传统方式（不使用预设）
npx zcf init -s -t api_key -k "sk-xxx" -u "https://api.example.com/v1"
```

## 使用方式

### 基本用法

使用提供商预设非常简单，只需两个参数：

```bash
# 使用提供商预设
npx zcf init -s -p <provider-id> -k <api-key>

# 示例：使用 302.AI
npx zcf init -s -p 302ai -k "sk-xxx"
```

### 自动配置

使用预设时，ZCF 会自动配置：

1. ✅ **Base URL**：自动填充正确的 API 端点
2. ✅ **认证方式**：自动设置认证类型（`api_key` 或 `auth_token`）
3. ✅ **默认模型**：如果提供商支持，自动设置默认模型
4. ✅ **Codex 配置**：如果使用 Codex，自动配置 `wireApi` 协议

### 覆盖默认配置

即使使用预设，你仍然可以覆盖默认配置：

```bash
# 使用预设但覆盖模型
npx zcf init -s -p 302ai -k "sk-xxx" \
  -M "claude-sonnet-4-5" \
  -F "claude-haiku-4-5"

# 使用预设但覆盖 URL（不推荐，除非测试）
npx zcf init -s -p 302ai -k "sk-xxx" \
  -u "https://custom.302.ai/api"
```

## 多配置场景

### 配置多个提供商

使用 `--api-configs` 或 `--api-configs-file` 可以同时配置多个提供商：

```bash
# 使用 JSON 字符串配置多个提供商
npx zcf init -s --api-configs '[
  {
    "provider": "302ai",
    "key": "sk-302ai-xxx",
    "default": true
  },
  {
    "provider": "glm",
    "key": "sk-glm-yyy"
  },
  {
    "provider": "minimax",
    "key": "sk-minimax-zzz"
  }
]'
```

### 混合预设与自定义配置

```bash
# 配置文件示例 (api-configs.json)
{
  "configs": [
    {
      "provider": "302ai",
      "key": "sk-302ai-xxx",
      "default": true
    },
    {
      "name": "custom-api",
      "type": "api_key",
      "key": "sk-custom-xxx",
      "url": "https://custom.api.com/v1",
      "primaryModel": "claude-sonnet-4-5",
      "fastModel": "claude-haiku-4-5"
    }
  ]
}

# 使用配置文件
npx zcf init -s --api-configs-file ./api-configs.json
```

## 提供商切换

配置多个提供商后，可以随时切换：

### Claude Code

```bash
# 列出所有配置
npx zcf config-switch --list

# 切换到指定提供商
npx zcf config-switch 302ai-config
```

### Codex

```bash
# 列出 Codex 提供商
npx zcf config-switch --code-type codex --list

# 切换到指定提供商
npx zcf config-switch glm-provider --code-type codex
```

## 最佳实践

### 1. 优先使用预设

尽可能使用提供商预设，可以：
- ✅ 减少配置错误
- ✅ 自动获取最新端点
- ✅ 简化配置过程

```bash
# 推荐：使用预设
npx zcf init -s -p 302ai -k "sk-xxx"

# 不推荐：手动配置所有参数
npx zcf init -s -t api_key -k "sk-xxx" -u "https://api.302.ai/cc" -M "claude-sonnet-4-5"
```

### 2. 测试配置

在正式使用前，建议先测试配置：

```bash
# 1. 使用预设初始化
npx zcf init -s -p 302ai -k "test-key"

# 2. 测试 API 连接
# 在 Claude Code 或 Codex 中测试对话

# 3. 如果正常，使用正式密钥重新配置
npx zcf init -s -p 302ai -k "production-key"
```

### 3. 多提供商策略

为不同项目配置不同提供商：

```bash
# 项目 A：使用 302.AI 提供商
npx zcf config-switch 302ai-provider

# 项目 B：使用 GLM 提供商
npx zcf config-switch glm-provider

# 项目 C：使用 MiniMax 提供商
npx zcf config-switch minimax-provider
```

### 4. 密钥安全

- ⚠️ **不要提交密钥到版本控制**
- ✅ **使用环境变量管理密钥**
- ✅ **定期轮换密钥**
- ✅ **使用最小权限原则**

```bash
# 使用环境变量
export ZCF_API_KEY="sk-xxx"
npx zcf init -s -p 302ai -k "$ZCF_API_KEY"

# 或从文件读取（确保文件权限正确）
npx zcf init -s -p 302ai -k "$(cat ~/.zcf/api-key)"
```

## 故障排除

### 提供商不支持

如果使用不支持的提供商 ID：

```bash
# 错误信息会显示所有有效值
npx zcf init -s -p invalid-provider -k "sk-xxx"
# 错误：Invalid provider 'invalid-provider'. Valid providers: 302ai, glm, minimax, kimi, custom
```

### 认证失败

如果认证失败：

1. **检查 API 密钥格式**：确认密钥格式正确
2. **检查认证方式**：确认使用正确的认证类型
3. **验证端点 URL**：确认端点 URL 正确

```bash
# 验证配置
cat ~/.claude/settings.json | jq .env.ANTHROPIC_API_KEY
cat ~/.codex/config.toml | grep apiKey
```

### 模型不可用

如果默认模型不可用：

```bash
# 覆盖默认模型
npx zcf init -s -p 302ai -k "sk-xxx" -M "claude-sonnet-4-5"

# 或手动编辑配置文件
vim ~/.claude/settings.json
```

## 相关资源

- [快速开始](../getting-started/installation.md) - 安装和初始化指南
- [配置管理](configuration.md) - 详细配置管理
- [配置切换](../cli/config-switch.md) - 多配置切换命令

> 💡 **提示**：使用 API 提供商预设可以大大简化配置过程。建议优先使用预设，仅在必要时使用自定义配置。定期检查提供商文档以获取最新配置信息。