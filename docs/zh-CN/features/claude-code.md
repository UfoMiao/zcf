---
title: Claude Code 配置能力
---

# Claude Code 配置能力

ZCF 为 Claude Code 提供完整的零配置体验，通过 `zcf init` 命令可以一键完成从环境初始化到工作流导入的全部配置。

## 核心特性

ZCF 针对 Claude Code 的配置包括以下核心能力：

| 功能模块 | 说明 | 配置文件位置 |
|---------|------|------------|
| **API 配置** | 支持官方登录、API Key、CCR 代理三种模式 | `~/.claude/settings.json` |
| **工作流系统** | 预置六阶段工作流、Feat 工作流、BMad 等 | `~/.claude/workflows/` |
| **输出风格** | 多种 AI 个性化输出风格 | `~/.claude/prompts/output-style/` |
| **MCP 服务** | 集成 Context7、Open Web Search 等 | `~/.claude/settings.json` |
| **系统提示** | 全局 AI 记忆和指令配置 | `~/.claude/CLAUDE.md` |

## 目录结构与备份

### 自动创建的目录结构

执行 `zcf init` 后，ZCF 会自动创建以下目录结构：

```
~/.claude/
├── CLAUDE.md              # 系统提示和 AI 记忆配置
├── settings.json          # Claude Code 主配置文件
├── workflows/            # 工作流目录
│   ├── zcf/
│   │   ├── workflow.md    # 六阶段工作流
│   │   ├── feat.md        # 功能开发工作流
│   │   └── ...
│   └── ...
├── prompts/              # 提示词目录
│   └── output-style/     # 输出风格模板
└── backup/               # 配置备份目录
    └── YYYY-MM-DD_HH-mm-ss/
```

### 备份机制

ZCF 提供完善的备份机制，确保您的配置安全：

- **自动备份**：每次修改配置时自动创建时间戳备份
- **备份位置**：`~/.claude/backup/YYYY-MM-DD_HH-mm-ss/`
- **备份内容**：包含所有配置文件、工作流和自定义设置
- **兼容性**：兼容旧版 `~/.claude.json`、`.zcf-config.json` 等遗留文件

> 💡 **恢复配置**：如果需要恢复之前的配置，可以从备份目录中复制相应文件。

### 配置处理策略

当检测到已有配置时，ZCF 提供多种处理策略：

| 策略 | 说明 | 适用场景 |
|------|------|---------|
| **备份并覆盖** | 创建备份后覆盖现有配置 | 想要全新配置时 |
| **合并配置** | 智能合并新旧配置 | 保留自定义内容时 |
| **仅更新文档** | 只更新工作流和文档 | 只想更新模板时 |
| **跳过** | 不进行任何更新 | 临时跳过某次更新 |

## API 与模型管理

### API 配置模式

ZCF 支持三种 API 配置模式：

#### 1. 官方登录

最简单的方式，无需配置 API Key：

```
? 选择 API 认证方式
  ❯ 使用官方登录
```

> ✅ **优点**：无需管理 API Key，使用官方认证系统

#### 2. API Key 模式

适合使用第三方 API 提供商：

```bash
# 使用提供商预设（推荐）
npx zcf i -s -p 302ai -k "sk-xxx"

# 自定义 API 端点
npx zcf i -s -t api_key -k "sk-xxx" -u "https://api.example.com"
```

支持的提供商预设：
- `302ai` - [302.AI](https://share.302.ai/gAT9VG) API 服务
- `glm` - GLM（智谱AI）
- `minimax` - MiniMax API 服务
- `kimi` - Kimi（月之暗面）

#### 3. CCR 代理模式

通过 Claude Code Router 代理使用多个模型：

```bash
npx zcf i -s -t ccr_proxy
# 或先配置 CCR
npx zcf ccr
```

> 💡 **CCR 优势**：
> - 支持免费模型接入（Gemini、DeepSeek）
> - 成本优化（为不同任务选择合适模型）
> - 灵活的路由规则配置

### 模型配置

ZCF 支持配置多个模型：

```bash
# 配置主模型和快速模型
npx zcf i -s -p 302ai -k "sk-xxx" \
  --api-model "claude-sonnet-4-5" \
  --api-fast-model "claude-haiku-4-5"
```

- **主模型**：用于主要任务（如代码生成、复杂分析）
- **快速模型**：用于快速任务（如代码补全、简单查询）

### 多 API 配置

ZCF 支持配置多个 API，方便在不同场景下切换：

```bash
npx zcf i -s --api-configs '[
  {"provider":"302ai","key":"sk-xxx","default":true},
  {"provider":"glm","key":"sk-yyy"},
  {"name":"custom","type":"api_key","key":"sk-zzz","url":"https://custom.api.com"}
]'
```

> 📖 **切换配置**：使用 `npx zcf config-switch` 在多个配置之间切换。

## 工作流系统

ZCF 提供丰富的工作流模板，帮助标准化开发流程。

### 默认工作流

| 工作流 | 命令 | 说明 |
|--------|------|------|
| **六阶段工作流** | `/zcf:workflow` | 完整的六阶段开发流程（研究→构思→计划→执行→优化→评审） |
| **功能开发工作流** | `/zcf:feat` | 新功能设计与实现，包含规划和 UI/UX 设计 |
| **通用工具** | `/init-project` | 项目初始化工具 |
| **Git 工作流** | `/git-commit` 等 | Git 操作自动化命令 |
| **BMad 工作流** | `/bmad-init` | 企业级敏捷开发流程 |

### 工作流安装

```bash
# 安装所有工作流（默认）
npx zcf i -s --workflows all

# 选择性安装
npx zcf i -s --workflows commonTools,sixStepsWorkflow,featPlanUx

# 跳过工作流安装
npx zcf i -s --workflows skip
```

> 📚 **工作流详解**：详细使用说明请参考 [工作流详解](../workflows/) 章节。

## 输出风格系统

ZCF 支持多种 AI 输出风格，个性化您的 AI 助手体验。

### 可用的输出风格

| 风格 ID | 名称 | 特点 |
|---------|------|------|
| `engineer-professional` | 工程师专业版 | 严格遵循 SOLID、KISS、DRY、YAGNI 原则 |
| `nekomata-engineer` | 猫娘工程师 | 专业猫娘工程师幽浮喵，结合严谨工程技术与可爱猫娘特质 |
| `laowang-engineer` | 老王暴躁技术流 | 暴脾气技术流，绝不容忍代码错误和不规范代码 |
| `ojousama-engineer` | 大小姐工程师 | 傲娇蓝发双马尾大小姐程序员哈雷酱 |

### 安装与使用

```bash
# 安装多个输出风格
npx zcf i -s --output-styles engineer-professional,nekomata-engineer

# 设置默认输出风格
npx zcf i -s --default-output-style engineer-professional
```

### 项目级切换

在 Claude Code 中，可以通过命令切换项目级的输出风格：

```
/output-style engineer-professional  # 切换到专业工程师
/output-style nekomata-engineer      # 切换到猫娘工程师
```

> ⚠️ **版本要求**：Claude Code 版本需要大于 1.0.81 才支持 output-style，可使用 `npx zcf check-updates` 进行更新。

## MCP 服务集成

ZCF 内置常用 MCP 服务配置，支持一键安装和管理。

### 默认 MCP 服务列表

| 服务 ID | 类型 | 说明 | 是否需要 API Key |
|---------|------|------|-----------------|
| `context7` | stdio | 上下文检索与库文档查询 | ❌ |
| `open-websearch` | stdio | DuckDuckGo/Bing/Brave 搜索 | ❌ |
| `spec-workflow` | stdio | Spec 工作流 MCP 服务 | ❌ |
| `mcp-deepwiki` | stdio | DeepWiki 文档检索 | ❌ |
| `Playwright` | stdio | Playwright 浏览器操作 | ❌ |
| `exa` | stdio | Exa 网络搜索 | ✅ 需要 `EXA_API_KEY` |
| `serena` | uvx | Serena IDE 助手 | ❌ |

### MCP 服务配置

```bash
# 安装所有 MCP 服务（推荐）
npx zcf i -s --mcp-services all

# 选择性安装
npx zcf i -s --mcp-services context7,open-websearch,spec-workflow

# 跳过 MCP 服务安装
npx zcf i -s --mcp-services skip
```

### 配置位置

- **Claude Code**：`~/.claude/settings.json` 中的 `mcpServers`
- **Windows 特殊处理**：ZCF 会自动修正 Windows 路径格式

### 重新配置

如果需要重新配置 MCP 服务：

```bash
npx zcf
# 选择 4. 配置 MCP
```

## 其他能力

### CCometixLine 状态栏

CCometixLine 是一个基于 Rust 的高性能状态栏工具：

- **实时用量追踪**：实时监控 Claude Code API 使用情况
- **Git 集成**：显示 Git 状态和分支信息
- **性能优化**：资源消耗极低

```bash
# 安装 CCometixLine（默认启用）
npx zcf i -s --install-cometix-line true

# 通过菜单安装
npx zcf → 选择 L
```

### 环境变量与权限

ZCF 可以导入推荐的环境变量和权限配置：

```bash
npx zcf
# 选择 7. 导入推荐环境变量和权限配置
```

这包括：
- 隐私保护环境变量
- 系统权限配置模板
- 安全相关设置

## 配置复用与更新

### 保存配置偏好

所有配置选择会写入 `~/.ufomiao/zcf/config.toml`，包括：
- 语言偏好
- 默认工具类型
- 最近安装选项

### 增量更新

使用 `zcf update` 可以更新工作流和模板，同时保留现有配置：

```bash
# 更新工作流和模板，保留 API 和 MCP 配置
npx zcf update

# 指定语言更新
npx zcf update -g zh-CN
```

> 💡 **最佳实践**：
> - 首次使用 `zcf init` 完成完整初始化
> - 后续使用 `zcf update` 更新工作流和模板
> - 通过菜单选项单独更新特定配置

## 下一步

了解更多 Claude Code 相关功能：

- 📚 [工作流详解](../workflows/) - 了解各种工作流的使用
- 🔧 [配置管理](../advanced/configuration.md) - 深入学习配置管理
- 🎯 [MCP 服务集成](mcp.md) - 详细了解 MCP 服务
- 🚀 [CCR 代理](ccr.md) - 了解 CCR 代理配置
