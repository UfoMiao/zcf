# 快速开始

欢迎使用 ZCF！本指南将帮助您在几分钟内完成 Claude Code 环境的配置和使用。

## 🎯 开始之前

### 系统要求

- **Node.js**: 16.0 或更高版本
- **npm/pnpm/yarn**: 任意包管理器
- **操作系统**: Windows、macOS、Linux (包括 Termux)
- **Claude Code**: 需要有 Anthropic API Key 或 Auth Token

### 获取 API 访问权限

在开始使用之前，您需要：

1. **Anthropic API Key** - 访问 [Anthropic Console](https://console.anthropic.com/) 获取
2. **Claude Code Auth Token** (推荐) - 通过 OAuth 方式认证

## 🚀 安装与初始化

### 方式一：交互式安装 (推荐)

```bash
npx zcf
```

运行后会显示主菜单，选择 `完整初始化` 即可自动完成所有配置。

### 方式二：直接初始化

```bash
npx zcf i
```

### 方式三：全局安装

```bash
npm install -g zcf
zcf
```

## 📋 初始化流程

ZCF 的初始化包含以下步骤：

### 1. 语言选择
- 支持中文 (`zh-CN`) 和英文 (`en`)
- 影响界面显示和配置模板语言

### 2. Claude Code 安装检测
- 自动检测是否已安装 Claude Code
- 未安装时提供自动安装选项
- 支持各平台的包管理器安装

### 3. API 配置
选择您的认证方式：
- **Auth Token** (OAuth) - 推荐，更安全便捷
- **API Key** - 传统方式，需手动管理

### 4. MCP 服务配置
自动配置常用的 MCP 服务：
- **Context7** - 获取库文档和代码示例  
- **DeepWiki** - GitHub 仓库文档查询
- **Exa** - AI 搜索和网页抓取
- **Figma** - 设计稿代码生成
- **Playwright** - 浏览器自动化

### 5. 工作流模板安装
根据语言偏好安装相应模板：
- **Memory 配置** - AI 人格和规则设定
- **通用命令** - 项目初始化、架构分析
- **Git 工具** - 提交、分支管理、回滚
- **规划工具** - 任务规划、UI/UX 设计
- **六步工作流** - 专业开发流程

## ✅ 验证安装

完成安装后，您可以通过以下方式验证：

### 检查 Claude Code 状态
```bash
claude --version
```

### 验证 MCP 服务
```bash
claude mcp list
```

### 测试基础功能
```bash
claude "你好，Claude！请介绍一下你的能力。"
```

如果以上命令正常运行，说明您的环境配置成功！

## 🎉 下一步

环境配置完成后，建议您：

1. **阅读进阶指南** - 了解更多高级配置选项
2. **学习使用技巧** - 掌握 Claude Code 的最佳实践
3. **探索工作流** - 使用预设模板提升开发效率
4. **加入社区** - 在 GitHub 上关注项目更新

---

遇到问题？查看我们的 [故障排除指南](../advanced-guide/troubleshooting.md) 或 [提交 Issue](https://github.com/UfoMiao/zcf/issues)。