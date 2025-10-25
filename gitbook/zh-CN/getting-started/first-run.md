# 首次运行

恭喜您成功安装了 ZCF！本指南将带您完成首次运行和基础配置。

## 🎬 启动 ZCF

### 交互式菜单模式

运行以下命令启动主菜单：

```bash
npx zcf
```

您将看到类似这样的界面：

```
 ________  ______  ________
|        \/      \/        |
| ZCF - 零配置 Claude-Code 流程工具 |
|__________________________________|

请选择操作:
 1. 🚀 完整初始化 (推荐新用户)
 2. 🔄 仅更新工作流
 3. 🌐 Claude Code Router 管理 
 4. 📊 使用情况分析
 5. 🔍 检查工具更新
 6. ❌ 退出

请输入选项编号:
```

### 直接命令模式

如果您已经熟悉 ZCF，也可以直接使用命令：

```bash
# 完整初始化
npx zcf i

# 更新工作流
npx zcf u

# CCR 管理
npx zcf ccr

# 使用分析
npx zcf ccu

# 检查更新
npx zcf check-updates
```

## 🚀 完整初始化流程

选择 `完整初始化` 后，ZCF 将引导您完成以下配置：

### 第 1 步：语言偏好设置

```
请选择您的语言偏好:
 1. 中文 (zh-CN) 
 2. English (en)

请输入选项编号 [1]:
```

**建议**：选择您最熟悉的语言，这将影响：
- 界面显示语言
- 配置文件模板语言  
- 工作流命令语言

### 第 2 步：Claude Code 检测与安装

ZCF 会自动检测您的系统中是否已安装 Claude Code：

#### 如果已安装
```
✅ 检测到 Claude Code v1.2.3
🔍 正在检查配置文件...
```

#### 如果未安装
```
⚠️  未检测到 Claude Code
是否需要自动安装? (y/N): y

📦 正在安装 Claude Code...
  - 检测包管理器: npm
  - 执行安装命令: npm install -g @anthropic/claude-cli
  - 安装完成 ✅
```

### 第 3 步：API 配置

配置您的 Anthropic API 访问：

```
请选择 API 配置方式:
 1. 🔐 Auth Token (OAuth 认证) [推荐]
 2. 🔑 API Key (手动配置)

请输入选项编号 [1]:
```

#### 选择 Auth Token (推荐)
```
将为您打开浏览器进行 OAuth 认证...
🌐 https://claude.ai/oauth/authorize?...

请在浏览器中完成认证，然后返回终端
认证完成后按 Enter 继续...

✅ Auth Token 配置成功
```

#### 选择 API Key
```
请输入您的 Anthropic API Key:
> sk-ant-api03-xxxxxxxxxxxx

✅ API Key 验证成功
💾 配置已保存到 ~/.claude/config.json
```

### 第 4 步：MCP 服务配置

ZCF 提供多个预配置的 MCP 服务：

```
请选择要安装的 MCP 服务:
 □ Context7 - 获取最新库文档和代码示例
 □ DeepWiki - GitHub 仓库文档查询
 □ Exa - AI 搜索和网页内容抓取  
 □ Playwright - 浏览器自动化测试

使用空格选择，Enter 确认: 全选
```

**推荐配置**：
- **Context7**: 编程时快速查询库文档
- **DeepWiki**: 研究开源项目时很有用
- **Exa**: 需要搜索最新信息时使用

### 第 5 步：工作流模板安装

```
请选择要安装的工作流模板:
 □ Memory 配置 - AI 人格和规则设定
 □ 通用命令 - 项目初始化、架构分析
 □ Git 工具 - 提交、分支管理、回滚
 □ 规划工具 - 任务规划、UI/UX 设计  
 □ 六步工作流 - 专业开发流程

使用空格选择，Enter 确认: 全选
```

**模板说明**：
- **Memory 配置**: 设定 Claude 的工作方式和规则
- **通用命令**: 包含常用的项目管理命令
- **Git 工具**: 智能化的 Git 操作工具
- **规划工具**: 帮助规划和设计功能
- **六步工作流**: 结构化的开发流程

### 第 6 步：配置完成

```
🎉 配置完成！

✅ Claude Code 已安装并配置
✅ API 认证设置完成  
✅ MCP 服务配置完成 (3 个服务)
✅ 工作流模板安装完成 (5 个模板)

📁 配置文件位置:
  - Claude 配置: ~/.claude/config.json
  - MCP 配置: ~/.claude/mcp.json
  - 工作流: ~/.claude/workflows/

💡 接下来您可以:
  1. 运行 'claude --help' 查看可用命令
  2. 使用 '/init-project' 命令初始化新项目
  3. 查看完整文档获取更多使用技巧
```

## 🔍 配置验证

### 验证 Claude Code 安装
```bash
claude --version
# 输出: claude-cli version 1.2.3
```

### 验证 MCP 服务
```bash
claude mcp list
# 输出已配置的 MCP 服务列表
```

### 测试基础功能
```bash
claude "你好，请介绍一下你的能力"
```

### 查看工作流命令
```bash
claude help
# 查看所有可用的工作流命令
```

## ⚙️ 配置文件说明

ZCF 会在您的系统中创建以下配置文件：

### 主配置文件 `~/.claude/config.json`
```json
{
  "apiKey": "your-api-key-or-token",
  "baseUrl": "https://api.anthropic.com",
  "model": "claude-3-5-sonnet-20241022",
  "maxTokens": 4096
}
```

### MCP 配置文件 `~/.claude/mcp.json`
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["context7"],
      "env": {}
    }
  }
}
```

### 工作流目录 `~/.claude/workflows/`
- `memory/` - AI 人格配置
- `commands/` - 自定义命令
- `agents/` - 智能代理配置

## 🛠️ 首次运行问题排查

### 问题 1：无法连接到 API
```bash
# 检查网络连接
ping api.anthropic.com

# 检查 API Key/Token 是否正确
claude config show
```

### 问题 2：MCP 服务启动失败
```bash
# 手动测试 MCP 服务
npx context7 --version

# 重新配置 MCP
npx zcf u
```

### 问题 3：工作流命令不可用
```bash
# 检查工作流安装
ls ~/.claude/workflows/

# 重新安装工作流
npx zcf u
```

## 🎯 下一步建议

完成首次配置后，建议您：

1. **熟悉基础命令** - 尝试使用 `/init-project` 初始化一个测试项目
2. **阅读进阶指南** - 了解高级配置和自定义选项
3. **学习使用技巧** - 掌握 Claude Code 的最佳实践
4. **加入社区** - 关注 [项目 GitHub](https://github.com/UfoMiao/zcf) 获取更新

---

遇到问题？查看 [故障排除指南](../advanced-guide/troubleshooting.md) 或在 GitHub 上 [提交 Issue](https://github.com/UfoMiao/zcf/issues)。