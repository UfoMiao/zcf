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

## 配置文件

CCR 配置文件位于 `~/.claude-code-router/config.json`，包含：

- **服务器配置**：端口（默认 3456）、主机、API 密钥
- **提供商列表**：多个 AI 模型提供商的配置
- **路由规则**：不同场景下的模型路由策略

配置文件格式示例：

```json
{
  "LOG": true,
  "HOST": "127.0.0.1",
  "PORT": 3456,
  "APIKEY": "sk-zcf-x-ccr",
  "Providers": [
    {
      "name": "gemini",
      "api_base_url": "https://generativelanguage.googleapis.com/v1beta",
      "api_key": "sk-free",
      "models": ["gemini-pro"]
    }
  ],
  "Router": {
    "default": "gemini,gemini-pro",
    "background": "gemini,gemini-pro"
  }
}
```

## 使用建议

### 首次使用

1. 运行 `npx zcf ccr` 选择"初始化 CCR"
2. 选择合适的提供商预设
3. 完成配置后启动 UI（选项 2）进行高级配置
4. 在 Web UI 中配置路由规则和添加更多模型

### 与初始化命令联动

在 `zcf init` 时可以直接启用 CCR：

```bash
# 交互式初始化时选择 CCR 代理
npx zcf init
# 选择 API 认证方式时选择"配置 CCR 代理"

# 非交互式初始化
npx zcf init -s -t ccr_proxy
```

### 配置完成后验证

```bash
# 检查 CCR 状态
npx zcf ccr
# 选择 3. 检查状态

# 如果状态正常，Claude Code 应能正常连接
```

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
3. 查看错误日志或使用 `ccr status` 命令

## 相关文档

- [CCR 功能详解](../features/ccr.md) - 了解 CCR 的完整功能
- [故障排除](../advanced/troubleshooting.md) - 解决常见问题
