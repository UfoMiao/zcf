---
title: CCR 代理管理
---

# CCR 代理管理

`zcf ccr` 提供 Claude Code Router（CCR）的完整管理菜单，包括安装、配置、服务控制和 Web UI 访问等功能。

## 命令格式

```bash
# 打开 CCR 管理菜单
npx zcf ccr

# 或通过主菜单访问
npx zcf
# 然后选择 R. CCR 管理
```

## 菜单选项

运行 `zcf ccr` 后会显示以下菜单：

```
═══════════════════════════════════════════════════
  CCR 管理菜单
═══════════════════════════════════════════════════

  1. 初始化 CCR - 安装并配置 CCR
  2. 启动 UI - 启动 CCR Web 界面
  3. 检查状态 - 查看当前 CCR 服务状态
  4. 重启服务 - 重启 CCR 服务
  5. 启动服务 - 启动 CCR 服务
  6. 停止服务 - 停止 CCR 服务
  0. 返回主菜单
```

## 功能详解

### 1. 初始化 CCR

**功能**：首次设置 CCR 或重新配置 CCR

**流程**：
1. 自动检测是否已安装 CCR CLI 工具
2. 如果未安装，自动安装 `@musistudio/claude-code-router`
3. 引导配置向导：
   - 选择提供商预设（302.AI、GLM、MiniMax、Kimi 等）
   - 配置 API 密钥（如需要）
   - 选择默认模型
   - 创建配置文件 `~/.claude-code-router/config.json`
4. 自动配置 Claude Code 使用 CCR 代理
5. 备份现有配置（如果存在）

**使用场景**：
- 首次使用 CCR
- 需要更换提供商或重新配置
- 配置丢失需要重新设置

**示例**：
```bash
npx zcf ccr
# 选择 1
# 按提示完成配置
```

### 2. 启动 UI

**功能**：启动 CCR Web 管理界面

**访问地址**：`http://localhost:3456/ui`（默认端口）

**Web UI 功能**：
- 📊 实时使用统计和成本分析
- ⚙️ 路由规则配置
- 🔧 模型管理（添加、编辑、删除）
- 📈 详细的使用量统计
- 🔄 服务控制（启动、停止、重启）

**前置条件**：
- 必须先完成 CCR 初始化（选项 1）
- 配置文件 `~/.claude-code-router/config.json` 必须存在

**API 密钥**：
- 启动 UI 时会显示 CCR API 密钥（默认：`sk-zcf-x-ccr`）
- 使用此密钥登录 Web UI

**示例**：
```bash
npx zcf ccr
# 选择 2
# 等待服务启动后，访问 http://localhost:3456/ui
```

### 3. 检查状态

**功能**：查看 CCR 服务当前运行状态

**显示信息**：
- 服务是否运行
- 运行端口
- 配置的提供商数量
- 路由规则摘要

**使用场景**：
- 验证服务是否正常启动
- 排查连接问题
- 查看当前配置状态

**示例**：
```bash
npx zcf ccr
# 选择 3
```

### 4. 重启服务

**功能**：重启 CCR 服务，重新加载配置

**使用场景**：
- 修改配置文件后需要重新加载
- 服务异常需要重启
- 端口冲突后需要重启

**示例**：
```bash
npx zcf ccr
# 选择 4
```

### 5. 启动服务

**功能**：启动 CCR 服务

**使用场景**：
- 服务停止后需要重新启动
- 系统重启后启动服务

**示例**：
```bash
npx zcf ccr
# 选择 5
```

### 6. 停止服务

**功能**：停止当前运行的 CCR 服务

**使用场景**：
- 需要暂停 CCR 代理
- 调试时需要停止服务
- 更换配置前先停止服务

**示例**：
```bash
npx zcf ccr
# 选择 6
```

## 路由规则配置

CCR 支持灵活的路由规则配置，可以通过 Web UI 或配置文件设置。配置文件位于 `~/.claude-code-router/config.json`，使用 JSON 格式。

### 完整配置示例

```json
{
  "LOG": true,
  "HOST": "127.0.0.1",
  "PORT": 3456,
  "APIKEY": "sk-zcf-x-ccr",
  "API_TIMEOUT_MS": "600000",
  "PROXY_URL": "",
  "Providers": [
    {
      "name": "openrouter",
      "api_base_url": "https://openrouter.ai/api/v1/chat/completions",
      "api_key": "sk-xxx",
      "models": [
        "google/gemini-2.5-pro-preview",
        "anthropic/claude-sonnet-4",
        "anthropic/claude-3.5-sonnet"
      ],
      "transformer": {
        "use": ["openrouter"]
      }
    },
    {
      "name": "deepseek",
      "api_base_url": "https://api.deepseek.com/v1/chat/completions",
      "api_key": "sk-xxx",
      "models": ["deepseek-chat", "deepseek-reasoner"],
      "transformer": {
        "use": ["deepseek"],
        "deepseek-chat": {
          "use": ["tooluse"]
        }
      }
    },
    {
      "name": "ollama",
      "api_base_url": "http://localhost:11434/v1/chat/completions",
      "api_key": "ollama",
      "models": ["qwen2.5-coder:latest"],
      "transformer": {
        "use": ["ollama"]
      }
    },
    {
      "name": "gemini",
      "api_base_url": "https://generativelanguage.googleapis.com/v1beta/models/",
      "api_key": "sk-xxx",
      "models": ["gemini-2.5-flash", "gemini-2.5-pro"],
      "transformer": {
        "use": ["gemini"]
      }
    }
  ],
  "Router": {
    "default": "openrouter,google/gemini-2.5-pro-preview",
    "background": "deepseek,deepseek-chat",
    "think": "deepseek,deepseek-reasoner",
    "longContext": "openrouter,anthropic/claude-sonnet-4",
    "longContextThreshold": 60000,
    "webSearch": "gemini,gemini-2.5-flash"
  }
}
```

### 配置字段说明

#### 基础配置

| 字段 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `LOG` | boolean | 是否启用日志 | `true` |
| `HOST` | string | 服务监听地址 | `127.0.0.1` |
| `PORT` | number | 服务端口 | `3456` |
| `APIKEY` | string | CCR API 密钥 | `sk-zcf-x-ccr` |
| `API_TIMEOUT_MS` | string | API 超时时间（毫秒） | `600000` |
| `PROXY_URL` | string | 代理 URL（可选） | `""` |

#### Providers 配置

`Providers` 是一个数组，每个 Provider 包含：

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 提供商名称（用于路由规则） |
| `api_base_url` | string | API 基础 URL |
| `api_key` | string | API 密钥（免费模型可使用 `sk-free`） |
| `models` | string[] | 该提供商支持的模型列表 |
| `transformer` | object | 可选的请求转换器（用于 API 兼容性） |

#### Router 配置

`Router` 定义了不同场景下的模型路由规则，格式为：`${providerName},${modelName}`

| 字段 | 类型 | 说明 |
|------|------|------|
| `default` | string | 默认路由（格式：`provider,model`） |
| `background` | string | 后台任务路由（可选） |
| `think` | string | 思考任务路由（可选） |
| `longContext` | string | 长上下文任务路由（可选） |
| `longContextThreshold` | number | 长上下文的 token 阈值（可选） |
| `webSearch` | string | 网页搜索任务路由（可选） |

## 提供商预设

ZCF 支持多个 CCR 提供商预设，简化配置流程：

```bash
npx zcf ccr
# 选择 1. 初始化 CCR
# 选择提供商预设
```

支持的预设包括：
- **302.AI**：企业级 AI 服务
- **GLM**：智谱 AI
- **MiniMax**：MiniMax AI 服务
- **自定义**：配置自定义提供商

## 常见问题

### Q: 提示"CCR 未配置"怎么办？

A: 需要先运行选项 1（初始化 CCR）完成配置。

### Q: Web UI 无法访问？

A: 
1. 确保已启动 UI（选项 2）
2. 检查端口 3456 是否被占用
3. 使用 API 密钥 `sk-zcf-x-ccr` 登录（或查看配置中的 `APIKEY`）

### Q: 如何修改路由规则？

A: 可以通过 Web UI 或直接编辑 `~/.claude-code-router/config.json` 文件，修改后重启服务。

### Q: 服务启动失败？

A: 
1. 检查配置文件格式是否正确
2. 检查端口是否被占用：`lsof -i :3456`（macOS/Linux）或 `netstat -ano | findstr :3456`（Windows）
3. 确认 `@musistudio/claude-code-router` 已正确安装
4. 查看错误日志或使用 `ccr status` 命令

### Q: 如何配置多个模型？

A: 在 `Providers` 数组中添加多个提供商配置，然后在 `Router` 中指定不同场景使用的模型。

## 相关文档

- [CCR 功能介绍](../features/ccr.md) - CCR 的核心优势
- [故障排除](../advanced/troubleshooting.md) - 解决常见问题
