---
title: MCP 服务集成
---

# MCP 服务集成

ZCF 内置常用 MCP（Model Context Protocol）服务配置，支持一键安装和管理多个 MCP 服务，扩展 AI 助手的能力边界。

## 什么是 MCP

MCP（Model Context Protocol）是一个开放协议，允许 AI 助手访问外部工具和服务。通过 MCP，Claude Code 和 Codex 可以：

- 🔍 查询最新的库文档和代码示例
- 🌐 进行网页搜索
- 📚 访问 GitHub 仓库文档
- 🎭 控制浏览器进行自动化操作
- 🔎 进行语义代码检索与编辑

## 默认服务列表

ZCF 内置以下 MCP 服务配置：

| 服务 ID | 类型 | 说明 | 是否需要 API Key | 官方文档 |
|---------|------|------|-----------------|---------|
| `context7` | stdio | 上下文检索与库文档查询 | ❌ | [Context7](https://context7.com) |
| `open-websearch` | stdio | DuckDuckGo/Bing/Brave 搜索引擎 | ❌ | [open-webSearch](https://github.com/Aas-ee/open-webSearch) |
| `spec-workflow` | stdio | Spec 工作流 MCP 服务 | ❌ | [spec-workflow-mcp](https://github.com/Pimzino/spec-workflow-mcp) |
| `mcp-deepwiki` | stdio | DeepWiki 文档检索 | ❌ | [mcp-deepwiki](https://github.com/context-labs/deepwiki) |
| `Playwright` | stdio | Playwright 浏览器自动化操作 | ❌ | [mcp-playwright](https://github.com/modelcontextprotocol/server-playwright) |
| `exa` | stdio | Exa AI 网络搜索 | ✅ 需要 `EXA_API_KEY` | [mcp-exa](https://github.com/modelcontextprotocol/server-exa) |
| `serena` | uvx | Serena IDE 助手，语义代码检索 | ❌ | [Serena](https://github.com/modelcontextprotocol/server-serena) |

## 服务详细介绍

### Context7 - 文档查询

Context7 提供最新的库文档和代码示例查询能力：

**功能特性**：
- 📚 查询库的最新文档
- 💡 获取代码示例和使用方法
- 🔄 自动保持文档最新

**使用示例**：
```
请查询 React useState hook 的最新文档和示例
```

### Open Web Search - 网页搜索

Open Web Search 提供多引擎网页搜索能力：

**功能特性**：
- 🔍 支持 DuckDuckGo、Bing 和 Brave 搜索引擎
- 🔒 默认使用注重隐私的搜索引擎
- ⚙️ 可自定义搜索引擎偏好设置
- 🚫 无需 API 密钥，开箱即用
- 📊 支持合并多个引擎的搜索结果

**使用示例**：
```
搜索最新的 TypeScript 5.0 新特性
```

### Spec Workflow - 工作流管理

Spec Workflow 提供从需求到实现的结构化特性开发工作流程：

**功能特性**：
- 📋 需求分析：结构化需求收集和文档编写
- 🎨 设计阶段：详细的技术设计和架构规划
- ✅ 任务管理：自动任务拆解和进度跟踪
- 🔄 实施工作流：从需求到实现的系统化方法
- 📊 交互式仪表板：内置的工作流可视化和管理仪表板
- ✍️ 审批系统：每个开发阶段的评审和审批流程

**使用方式**：

手动启动仪表板：
```bash
npx -y @pimzino/spec-workflow-mcp@latest --dashboard
```

或安装 [VS Code 扩展](https://marketplace.visualstudio.com/items?itemName=Pimzino.spec-workflow-mcp) 以获得集成的工作流管理功能。

> 📖 **详细文档**：请参阅 [Spec 工作流官方文档](https://github.com/Pimzino/spec-workflow-mcp/blob/main/README.md#quick-start)。

### DeepWiki - GitHub 文档

DeepWiki 提供 GitHub 仓库文档查询能力：

**功能特性**：
- 📚 查询 GitHub 仓库文档
- 🔍 搜索代码示例和用法
- 🌐 访问公开仓库的文档

**使用示例**：
```
查询 vuejs/core 仓库的 Composition API 文档
```

### Playwright - 浏览器控制

Playwright 提供浏览器自动化操作能力：

**功能特性**：
- 🌐 控制浏览器进行自动化操作
- 📸 截图和页面内容提取
- 🔄 模拟用户交互
- 📊 表单填写和提交

> ⚠️ **注意**：首次运行可能需要下载浏览器，请耐心等待。

### Exa - AI 网络搜索

Exa 提供基于 AI 的网络搜索能力：

**功能特性**：
- 🤖 使用 AI 进行智能网络搜索
- 🎯 更精准的搜索结果
- 📊 结果摘要和分析

**配置要求**：
需要设置 `EXA_API_KEY` 环境变量：
```bash
export EXA_API_KEY="your-api-key"
```

获取 API Key：访问 [Exa Dashboard](https://dashboard.exa.ai/api-keys)

### Serena - 语义代码检索

Serena 提供类似 IDE 的语义代码检索与编辑能力：

**功能特性**：
- 🔍 语义代码检索
- ✏️ 智能代码编辑建议
- 📊 代码上下文理解

## 安装与配置

### 交互式安装

通过 ZCF 菜单选择要安装的 MCP 服务：

```bash
npx zcf
# 选择 4. 配置 MCP
```

在交互界面中，可以：
- ✅ 勾选需要安装的服务
- 🔑 为需要 API Key 的服务输入密钥
- 📋 查看每个服务的详细说明

### 命令行安装

```bash
# 安装所有 MCP 服务（推荐）
npx zcf i -s --mcp-services all

# 选择性安装
npx zcf i -s --mcp-services context7,open-websearch,spec-workflow

# 跳过 MCP 服务安装
npx zcf i -s --mcp-services skip
```

### 环境变量配置

对于需要 API Key 的服务（如 Exa），需要设置环境变量：

```bash
# 设置 Exa API Key
export EXA_API_KEY="your-exa-api-key"

# 持久化配置（添加到 ~/.bashrc 或 ~/.zshrc）
echo 'export EXA_API_KEY="your-exa-api-key"' >> ~/.bashrc
```

> 💡 **提示**：环境变量可以通过 ZCF 菜单选项 `7` 导入推荐的环境变量配置。

## 配置文件位置

MCP 服务配置保存在不同的配置文件中：

### Claude Code

配置文件：`~/.claude/settings.json`

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@context-labs/context7"]
    },
    "open-websearch": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-open-websearch"]
    }
  }
}
```

### Codex

配置文件：`~/.codex/config.toml`

```toml
[mcp_server.context7]
command = "npx"
args = ["-y", "@context-labs/context7"]

[mcp_server.open-websearch]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-open-websearch"]
```

## 跨平台支持

### Windows 特殊处理

ZCF 会自动修正 Windows 路径格式，确保 MCP 服务在 Windows 上正常运行：

- 自动检测 Windows 环境
- 修正路径分隔符和转义字符
- 使用 `cmd /c npx` 格式确保命令执行

> 💡 **提示**：如果在 Windows 上遇到 MCP 连接问题，运行 `npx zcf` 会自动修复配置格式。

### WSL 和 Termux

ZCF 完全支持 WSL 和 Termux 环境，MCP 服务在这些环境中同样可以正常工作。

## 服务管理

### 重新配置 MCP 服务

如果需要重新配置 MCP 服务：

```bash
npx zcf
# 选择 4. 配置 MCP
```

### 添加新服务

如果手动添加了新的 MCP 服务，ZCF 会智能合并配置：

```bash
# 执行增量更新
npx zcf i
# 选择"合并配置"策略
```

### 移除服务

手动从配置文件中移除服务，或通过 ZCF 菜单重新配置：

```bash
npx zcf
# 选择 4. 配置 MCP
# 取消勾选不需要的服务
```

## 验证服务连接

### 检查服务状态

在 Claude Code/Codex 的 MCP 面板中：

1. 打开设置 → MCP 服务
2. 查看服务列表
3. 确认服务显示为"已连接"状态

### 测试服务功能

尝试使用 MCP 服务功能：

```
# Context7 测试
请查询 React hooks 的最新文档

# Open Web Search 测试
搜索最新的 Vue 3.5 更新内容

# DeepWiki 测试
查询 TypeScript 官方仓库的文档
```

> ✅ **成功标志**：如果 AI 能够正常使用服务并返回结果，说明服务连接成功。

## 故障排除

### 服务未连接

**问题**：MCP 服务显示为未连接状态

**解决方案**：
1. 检查服务是否正确安装：`npm list -g | grep <service-name>`
2. 重新配置服务：`npx zcf` → `4`
3. 检查配置文件格式是否正确

### API Key 错误

**问题**：Exa 等服务提示 API Key 错误

**解决方案**：
1. 确认环境变量已设置：`echo $EXA_API_KEY`
2. 重新加载环境变量或重启终端
3. 检查 API Key 是否有效

### Windows 路径问题

**问题**：Windows 上 MCP 服务无法启动

**解决方案**：
```bash
npx zcf
# 选择 4. 配置 MCP
# ZCF 会自动修复 Windows 路径格式
```

## 最佳实践

1. **按需安装**：只安装实际需要的 MCP 服务，减少资源消耗
2. **定期更新**：通过 `npx zcf update` 更新 MCP 服务配置
3. **环境变量管理**：使用 `.env` 文件或系统环境变量管理 API Key
4. **测试验证**：安装后测试每个服务的功能，确保正常工作

## 下一步

了解更多 MCP 相关内容：

- 📚 [工作流详解](../workflows/) - 了解如何在工作流中使用 MCP 服务
- 🔧 [配置管理](../advanced/configuration.md) - 深入学习 MCP 配置管理
- 🎯 [Claude Code 配置](claude-code.md) - 了解 Claude Code 中的 MCP 集成
- 🚀 [Codex 支持](codex.md) - 了解 Codex 中的 MCP 集成
