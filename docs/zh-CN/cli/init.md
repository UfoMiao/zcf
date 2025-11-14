---
title: zcf init
---

# zcf init

`zcf init`（缩写 `zcf i`）是 ZCF 的核心命令，用于完整初始化 Claude Code 或 Codex 环境。它会自动安装必要的工具、配置 API、设置 MCP 服务、导入工作流和输出风格等。

## 功能概述

`zcf init` 命令会执行以下操作：

1. 📦 **安装代码工具**：自动检测并安装 Claude Code 或 Codex CLI
2. 🔑 **配置 API**：设置 API 密钥、认证方式、模型等
3. 🔌 **配置 MCP 服务**：安装和配置选定的 MCP 服务
4. 📋 **导入工作流**：安装结构化开发工作流模板
5. 🎨 **配置输出风格**：设置 AI 输出风格和系统提示
6. 🌐 **语言配置**：设置模板语言和 AI 输出语言
7. 📊 **安装状态栏**：可选安装 CCometixLine 状态栏工具
8. 💾 **创建备份**：在修改配置前自动创建备份

## 基本用法

### 交互式模式（推荐）

```bash
# 打开交互式初始化向导
npx zcf init

# 或使用缩写
npx zcf i

# 或通过主菜单
npx zcf
# 然后选择 1 (完整初始化)
```

交互式模式下，ZCF 会逐步引导你：

1. 选择代码工具类型（Claude Code 或 Codex）
2. 选择配置处理方式（如果已有配置）
3. 配置 API（官方登录、自定义 API、CCR 代理或跳过）
4. 选择 MCP 服务
5. 选择工作流
6. 选择输出风格
7. 配置语言选项

### 非交互式模式

适用于自动化脚本、CI/CD 或批量部署：

```bash
# 使用 API 提供商预设（最简单）
npx zcf i -s -p 302ai -k "sk-xxx"

# 完整参数示例
npx zcf i -s \
  --provider 302ai \
  --api-key "sk-xxx" \
  --code-type claude-code \
  --all-lang zh-CN \
  --mcp-services all \
  --workflows all \
  --output-styles all \
  --default-output-style engineer-professional
```

## 常用参数

### 语言参数

| 参数 | 缩写 | 说明 | 可选值 | 默认值 |
|------|------|------|--------|--------|
| `--all-lang, -g` | `-g` | 统一设置所有语言参数 | `zh-CN`, `en`, 自定义字符串 | 用户偏好或 `en` |
| `--lang, -l` | `-l` | ZCF 界面显示语言 | `zh-CN`, `en` | 用户偏好或 `en` |
| `--config-lang, -c` | `-c` | 模板文件语言 | `zh-CN`, `en` | `en` |
| `--ai-output-lang, -a` | `-a` | AI 助手输出语言 | `zh-CN`, `en`, 自定义字符串 | `en` |

> 💡 **提示**：使用 `--all-lang` 可以一次性设置所有语言参数，是最便捷的方式。

**语言参数优先级**（从高到低）：
1. `--all-lang` 
2. `--lang` / `--config-lang` / `--ai-output-lang`
3. 用户保存的偏好
4. 交互提示

### 代码工具类型

| 参数 | 缩写 | 说明 | 可选值 |
|------|------|------|--------|
| `--code-type, -T` | `-T` | 目标代码工具类型 | `claude-code`, `codex`, `cc`, `cx` |

```bash
# 初始化 Claude Code（默认）
npx zcf i

# 初始化 Codex
npx zcf i -T codex

# 使用缩写
npx zcf i -T cx
```

### API 配置参数

#### API 提供商预设（推荐）

ZCF 支持 API 提供商预设，可以大大简化配置：

| 参数 | 缩写 | 说明 | 支持的提供商 |
|------|------|------|------------|
| `--provider, -p` | `-p` | API 提供商预设 | `302ai`, `glm`, `minimax`, `kimi`, `custom` |

```bash
# 使用 302.AI 提供商
npx zcf i -s -p 302ai -k "sk-xxx"

# 使用 GLM 提供商
npx zcf i -s -p glm -k "sk-xxx"

# 使用 MiniMax 提供商
npx zcf i -s -p minimax -k "sk-xxx"

# 使用 Kimi 提供商
npx zcf i -s -p kimi -k "sk-xxx"

# 使用自定义提供商（需要 URL）
npx zcf i -s -p custom -k "sk-xxx" -u "https://api.example.com"
```

#### 传统 API 配置参数

| 参数 | 缩写 | 说明 | 示例 |
|------|------|------|------|
| `--api-type, -t` | `-t` | API 配置类型 | `auth_token`, `api_key`, `ccr_proxy`, `skip` |
| `--api-key, -k` | `-k` | API 密钥或认证令牌 | `sk-ant-xxx` |
| `--api-url, -u` | `-u` | 自定义 API URL | `https://api.example.com/v1` |
| `--api-model, -M` | `-M` | 主 API 模型 | `claude-sonnet-4-5` |
| `--api-fast-model, -F` | `-F` | 快速 API 模型（仅 Claude Code） | `claude-haiku-4-5` |

```bash
# 使用 API Key
npx zcf i -s -t api_key -k "sk-ant-xxx"

# 使用 Auth Token（官方登录）
npx zcf i -s -t auth_token -k "your-auth-token"

# 使用 CCR 代理
npx zcf i -s -t ccr_proxy

# 跳过 API 配置
npx zcf i -s -t skip

# 配置自定义模型
npx zcf i -s -t api_key -k "sk-xxx" -M "claude-sonnet-4-5" -F "claude-haiku-4-5"
```

#### 多 API 配置

支持同时配置多个 API，便于切换：

```bash
# 使用 JSON 字符串
npx zcf i -s --api-configs '[
  {
    "provider": "302ai",
    "key": "sk-xxx",
    "default": true
  },
  {
    "provider": "glm",
    "key": "sk-yyy"
  },
  {
    "name": "custom",
    "type": "api_key",
    "key": "sk-zzz",
    "url": "https://custom.api.com",
    "primaryModel": "claude-sonnet-4-5",
    "fastModel": "claude-haiku-4-5"
  }
]'

# 使用 JSON 文件
npx zcf i -s --api-configs-file ./api-configs.json
```

### MCP 服务配置

| 参数 | 缩写 | 说明 | 可选值 |
|------|------|------|--------|
| `--mcp-services, -m` | `-m` | 要安装的 MCP 服务 | `context7`, `open-websearch`, `spec-workflow`, `mcp-deepwiki`, `Playwright`, `exa`, `serena`, `all`, `skip` |

```bash
# 安装所有 MCP 服务
npx zcf i -s -m all

# 安装特定服务（逗号分隔）
npx zcf i -s -m context7,open-websearch,spec-workflow

# 跳过 MCP 服务安装
npx zcf i -s -m skip
```

### 工作流配置

| 参数 | 缩写 | 说明 | 可选值 |
|------|------|------|--------|
| `--workflows, -w` | `-w` | 要安装的工作流 | `commonTools`, `sixStepsWorkflow`, `featPlanUx`, `gitWorkflow`, `bmadWorkflow`, `all`, `skip` |

```bash
# 安装所有工作流
npx zcf i -s -w all

# 安装特定工作流
npx zcf i -s -w sixStepsWorkflow,gitWorkflow

# 跳过工作流安装
npx zcf i -s -w skip
```

> ⚠️ **注意**：Codex 目前仅支持 `sixStepsWorkflow` 和 `gitWorkflow`，其他工作流暂未在 Codex 中提供。

### 输出风格配置

| 参数 | 缩写 | 说明 | 可选值 |
|------|------|------|--------|
| `--output-styles, -o` | `-o` | 要安装的输出风格 | `engineer-professional`, `nekomata-engineer`, `laowang-engineer`, `ojousama-engineer`, `all`, `skip` |
| `--default-output-style, -d` | `-d` | 默认输出风格 | 同输出风格选项，还包括内置风格：`default`, `explanatory`, `learning` |

```bash
# 安装所有输出风格
npx zcf i -s -o all

# 安装特定风格
npx zcf i -s -o engineer-professional,nekomata-engineer

# 设置默认输出风格
npx zcf i -s -o all -d engineer-professional

# 跳过输出风格安装
npx zcf i -s -o skip
```

### 其他配置选项

| 参数 | 缩写 | 说明 | 可选值 |
|------|------|------|--------|
| `--skip-prompt, -s` | `-s` | 跳过所有交互提示（非交互模式） | - |
| `--config-action, -r` | `-r` | 配置处理方式 | `new`, `backup`, `merge`, `docs-only`, `skip` |
| `--install-cometix-line, -x` | `-x` | 是否安装 CCometixLine | `true`, `false` |

```bash
# 非交互模式
npx zcf i -s -p 302ai -k "sk-xxx"

# 配置处理方式
npx zcf i -s --config-action backup  # 备份后覆盖（默认）
npx zcf i -s --config-action merge   # 合并配置
npx zcf i -s --config-action new     # 创建新配置
npx zcf i -s --config-action docs-only  # 仅更新文档
npx zcf i -s --config-action skip    # 跳过配置

# 控制 CCometixLine 安装
npx zcf i -s -x true   # 安装（默认）
npx zcf i -s -x false  # 不安装
```

## 完整示例

### 场景 1：首次使用 Claude Code

```bash
# 交互式初始化（推荐首次使用）
npx zcf init

# 或使用主菜单
npx zcf
# 选择 1 (完整初始化)
```

### 场景 2：使用 302.AI 提供商快速初始化

```bash
npx zcf i -s -p 302ai -k "sk-xxx" -g zh-CN
```

### 场景 3：Codex 完整初始化

```bash
npx zcf i -s \
  -T codex \
  -p 302ai \
  -k "sk-xxx" \
  -g zh-CN \
  -m all \
  -w all
```

### 场景 4：配置多个 API 提供商

```bash
# 创建 api-configs.json 文件
cat > api-configs.json << EOF
[
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
    "name": "custom",
    "type": "api_key",
    "key": "sk-custom-zzz",
    "url": "https://custom.api.com",
    "primaryModel": "claude-sonnet-4-5"
  }
]
EOF

# 使用配置文件初始化
npx zcf i -s --api-configs-file ./api-configs.json -g zh-CN
```

### 场景 5：仅更新文档和模板

```bash
npx zcf i -s --config-action docs-only -g zh-CN
```

### 场景 6：使用 CCR 代理

```bash
npx zcf i -s -t ccr_proxy -g zh-CN -m all -w all
```

## 配置处理策略

当检测到已有配置时，ZCF 会询问处理策略：

| 策略 | 说明 | 适用场景 |
|------|------|---------|
| `backup` | 备份现有配置后覆盖 | 推荐默认选项，安全可靠 |
| `merge` | 合并新配置到现有配置 | 需要保留自定义内容 |
| `new` | 创建新配置，保留旧配置 | 需要同时保留多套配置 |
| `docs-only` | 仅更新文档和提示词 | 仅需要更新模板 |
| `skip` | 跳过当前步骤 | 不需要修改该配置 |

## 执行流程

`zcf init` 的执行流程如下：

1. **显示 Banner**：显示 ZCF 版本信息和工具类型
2. **解析语言偏好**：根据参数设置 i18n 语言
3. **验证参数**：检查参数有效性和互斥性
4. **选择代码工具**：确定是 Claude Code 还是 Codex
5. **处理现有配置**：根据策略处理已有配置
6. **配置 API**：设置 API 密钥、认证方式等
7. **配置 MCP**：安装和配置 MCP 服务
8. **导入工作流**：安装工作流模板
9. **配置输出风格**：设置 AI 输出风格
10. **安装状态栏**：可选安装 CCometixLine
11. **保存偏好**：更新 ZCF 全局配置

## 故障排除

### 初始化失败

如果初始化失败：

1. **检查 Node.js 版本**：确保 Node.js >= 18
2. **检查权限**：确保对配置目录有写入权限
3. **检查网络**：确保可以访问 npm registry 和 API 服务

```bash
# 检查 Node.js 版本
node --version

# 检查权限
ls -la ~/.claude ~/.codex

# 手动创建目录并设置权限（如需要）
mkdir -p ~/.claude ~/.codex
```

### API 配置不生效

如果 API 配置后无法使用：

1. **检查配置文件**：确认配置已正确写入
2. **验证 API 密钥**：确认 API 密钥有效
3. **重启应用**：重启 Claude Code 或 Codex 以加载配置

```bash
# 检查 Claude Code 配置
cat ~/.claude/settings.json | grep -A 5 apiKeys

# 检查 Codex 配置
cat ~/.codex/config.toml | grep -A 5 modelProvider
```

### 工作流未导入

如果工作流没有导入：

```bash
# 重新导入工作流
npx zcf update

# 检查工作流目录
ls -la ~/.claude/workflows/
ls -la ~/.codex/prompts/
```

## 相关资源

- [快速开始](../getting-started/installation.md) - 完整的安装指南
- [API 提供商预设](../advanced/api-providers.md) - 提供商详细信息
- [配置管理](../features/multi-config.md) - 多配置和备份系统
- [MCP 服务](../features/mcp.md) - MCP 服务详细介绍

> 💡 **提示**：首次使用建议使用交互式模式（不带 `-s` 参数），这样可以更好地理解各个选项的含义。熟悉后可以使用非交互式模式提高效率。