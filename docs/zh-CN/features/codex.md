---
title: Codex 支持
---

# Codex 支持

[Codex](https://www.npmjs.com/package/@openai/codex) 是 OpenAI 官方的代码生成 CLI 工具。ZCF 现在支持完整的 Codex 集成，具备与 Claude Code 相同的配置便利性。

## 核心特性

ZCF 为 Codex 提供完整的自动化配置体验，核心特性包括：

- **统一工具管理**：通过 ZCF 菜单在 Claude Code 和 Codex 之间无缝切换
- **智能配置系统**：自动 Codex CLI 安装、API 提供商设置和 MCP 服务集成
- **完善备份机制**：所有配置更改都包含时间戳备份，支持恢复功能
- **多提供商支持**：配置多个 API 提供商（OpenAI、自定义端点），支持轻松切换
- **系统提示集成**：安装专业 AI 个性（工程师、猫娘工程师、老王工程师）
- **工作流模板**：导入为代码生成任务优化的结构化开发工作流
- **高级卸载器**：选择性移除 Codex 组件，支持冲突解决

## 安装与升级

### 自动检测与安装

ZCF 会自动检测系统是否已安装 `@openai/codex` CLI：

```bash
# 初始化 Codex（自动检测并安装）
npx zcf i -s -T codex -p 302ai -k "sk-xxx"
```

如果检测到 Codex 未安装，ZCF 会自动执行：
```bash
npm install -g @openai/codex
```

### 升级 Codex

ZCF 支持一键升级 Codex CLI：

```bash
# 通过更新检查升级
npx zcf check-updates --code-type codex

# 或通过菜单
npx zcf → 选择 +（检查更新）→ 选择 Codex
```

> ✅ **自动处理**：如果升级失败，ZCF 会提供详细的错误信息，帮助诊断问题。

## 配置文件管理

### 目录结构

ZCF 为 Codex 创建以下目录结构：

```
~/.codex/
├── config.toml          # Codex 主配置文件（TOML 格式）
├── auth.json            # 认证信息
├── AGENTS.md            # AI 代理配置和系统提示
├── prompts/             # 工作流提示词目录
│   ├── zcf/
│   │   ├── workflow.md  # 六阶段工作流
│   │   └── ...
│   └── ...
└── backup/              # 配置备份目录
    └── YYYY-MM-DD_HH-mm-ss/
```

### 备份机制

ZCF 提供完整的备份机制：

- **自动备份**：每次配置修改时自动创建时间戳备份
- **备份位置**：`~/.codex/backup/YYYY-MM-DD_HH-mm-ss/`
- **备份内容**：包含所有配置文件、授权、工作流、提示词
- **选择性备份**：支持仅备份特定项目（配置、授权、API、MCP 等）

> 💡 **恢复配置**：如果需要恢复之前的配置，可以从备份目录中恢复相应文件。

### 管理模式标识

ZCF 在配置文件中添加 `managed = true` 标识，确保：

- 自动判断配置是否由 ZCF 管理
- 避免覆盖手写配置
- 智能合并 ZCF 管理的配置和用户自定义配置

## API 提供商与模型

### API 配置方式

Codex 支持与 Claude Code 相同的 API 配置方式：

#### 1. 提供商预设（推荐）

```bash
# 使用 302.AI 提供商
npx zcf i -s -T codex -p 302ai -k "sk-xxx"

# 使用其他提供商
npx zcf i -s -T codex -p glm -k "sk-xxx"
npx zcf i -s -T codex -p minimax -k "sk-xxx"
```

#### 2. 官方登录

```bash
npx zcf
# 选择 S（切换到 Codex）
# 选择 3（配置 API）
# 选择"使用官方登录"
```

#### 3. 自定义 API

```bash
npx zcf i -s -T codex \
  --api-type api_key \
  --api-key "sk-xxx" \
  --api-url "https://api.example.com" \
  --api-model "gpt-5"
```

### 多提供商配置

Codex 支持配置多个 API 提供商：

```bash
npx zcf i -s -T codex --api-configs '[
  {"provider":"302ai","key":"sk-xxx","default":true},
  {"name":"custom","type":"api_key","key":"sk-yyy","url":"https://custom.api.com","primaryModel":"gpt-5"}
]'
```

> 📖 **切换提供商**：使用 `npx zcf config-switch -T codex` 在多个提供商之间切换。

### 模型配置

Codex 支持配置主要模型和快速模型：

```bash
npx zcf i -s -T codex -p 302ai -k "sk-xxx" \
  --api-model "gpt-5" \
  --api-fast-model "gpt-4"
```

## MCP 服务集成

### 支持的 MCP 服务

Codex 支持与 Claude Code 相同的 MCP 服务：

| 服务 | 说明 | 是否需要 API Key |
|------|------|-----------------|
| Context7 | 文档查询 | ❌ |
| Open Web Search | 网页搜索 | ❌ |
| Spec Workflow | 工作流管理 | ❌ |
| DeepWiki | GitHub 文档 | ❌ |
| Playwright | 浏览器控制 | ❌ |
| Exa | Exa 搜索 | ✅ |
| Serena | 语义代码检索 | ❌ |

### 配置 MCP 服务

```bash
# 安装所有 MCP 服务
npx zcf i -s -T codex --mcp-services all

# 选择性安装
npx zcf i -s -T codex --mcp-services context7,open-websearch

# 通过菜单配置
npx zcf → 选择 S（切换到 Codex）→ 选择 4（配置 MCP）
```

### 配置文件位置

MCP 服务配置保存在 `~/.codex/config.toml` 的 `[mcp_server]` 条目中。

## 工作流系统

Codex 目前支持以下工作流模板（使用 `/prompts:` 前缀）：

| 工作流 | Codex 命令 | Claude Code 命令 | 说明 |
|--------|-----------|-----------------|------|
| **六阶段工作流** | `/prompts:workflow` | `/zcf:workflow` | 完整的六阶段开发流程（研究→构思→计划→执行→优化→评审） |
| **Git 工作流** | `/prompts:git-commit` | `/git-commit` | 智能 Git 提交 |
| | `/prompts:git-rollback` | `/git-rollback` | 安全回滚 |
| | `/prompts:git-cleanBranches` | `/git-cleanBranches` | 清理已合并分支 |
| | `/prompts:git-worktree` | `/git-worktree` | Git 工作树管理 |

> 💡 **提示**：
> - Codex 使用 `/prompts:` 前缀来访问工作流命令，这是 Codex 的命令格式规范
> - Codex 目前仅支持六阶段工作流和 Git 工作流，功能开发工作流（feat）、项目初始化（init-project）和 BMad 工作流暂未在 Codex 中提供

### 与 Claude Code 的差异

虽然 Codex 和 Claude Code 共享相同的 MCP 服务，但在工作流支持上存在差异：

| 工作流类型 | Claude Code | Codex |
|-----------|------------|-------|
| 六阶段工作流 | ✅ `/zcf:workflow` | ✅ `/prompts:workflow` |
| 功能开发工作流 | ✅ `/zcf:feat` | ❌ 暂不支持 |
| 项目初始化 | ✅ `/init-project` | ❌ 暂不支持 |
| Git 工作流 | ✅ `/git-commit` 等 | ✅ `/prompts:git-commit` 等 |
| BMad 工作流 | ✅ `/bmad-init` | ❌ 暂不支持 |

### 导入工作流

```bash
# 安装所有工作流
npx zcf i -s -T codex --workflows all

# 选择性安装
npx zcf i -s -T codex --workflows commonTools,sixStepsWorkflow

# 通过菜单导入
npx zcf → 选择 S（切换到 Codex）→ 选择 4（导入工作流）
```

工作流文件保存在 `~/.codex/prompts/` 目录中。

## 系统提示与输出风格

### 系统提示配置

Codex 的系统提示保存在 `~/.codex/AGENTS.md` 中，包括：

- AI 输出语言设置
- 全局输出风格配置
- 自定义指令和规则

### 输出风格

Codex 支持与 Claude Code 相同的输出风格：

- `engineer-professional` - 工程师专业版
- `nekomata-engineer` - 猫娘工程师
- `laowang-engineer` - 老王暴躁技术流
- `ojousama-engineer` - 大小姐工程师

```bash
# 安装输出风格
npx zcf i -s -T codex --output-styles engineer-professional

# 设置默认输出风格
npx zcf i -s -T codex --default-output-style engineer-professional
```

## 工具间切换

### 通过菜单切换

```bash
npx zcf
# 输入 S 在 Claude Code 和 Codex 之间切换
```

切换后，菜单选项会根据当前工具动态调整：

- **Codex 模式下**：
  - `3` 为 API 与 MCP 配置
  - `4` 为工作流导入

### 工具间迁移

ZCF 允许在 Claude Code 和 Codex 之间无缝切换，同时保留您的偏好设置和工作流配置：

- **共享配置**：两个工具共享相同的 MCP 服务和工作流模板
- **独立配置**：API 配置和系统提示独立管理
- **一致体验**：确保两个工具的开发体验一致

> 💡 **最佳实践**：
> - 首次使用时，建议先在 Claude Code 中完成配置
> - 然后切换到 Codex，配置会自动同步 MCP 和工作流
> - 两个工具可以同时使用，互不干扰

## 常见操作

### 初始化 Codex

```bash
# 命令行方式
npx zcf i -s -T codex -p 302ai -k "sk-xxx"

# 交互式方式
npx zcf → 选择 S（切换到 Codex）→ 选择 1（完整初始化）
```

### 更新工作流

```bash
npx zcf update -T codex -g zh-CN
```

### 配置切换

```bash
# 列出所有提供商
npx zcf config-switch -T codex --list

# 切换到指定提供商
npx zcf config-switch -T codex provider-name
```

### 卸载 Codex

```bash
npx zcf uninstall -T codex
```

## 与 Claude Code 的对比

| 特性 | Claude Code | Codex |
|------|------------|-------|
| **配置文件格式** | JSON (`settings.json`) | TOML (`config.toml`) |
| **系统提示文件** | `CLAUDE.md` | `AGENTS.md` |
| **工作流目录** | `workflows/` | `prompts/` |
| **API 配置** | 支持三种模式 | 支持三种模式 |
| **MCP 服务** | ✅ 完全支持 | ✅ 完全支持 |
| **输出风格** | ✅ 支持 | ✅ 支持 |
| **工作流模板** | ✅ 支持 | ✅ 支持 |

> 💡 **说明**：虽然配置文件格式不同，但 ZCF 提供了统一的配置接口，确保两个工具的使用体验一致。

## 下一步

了解更多 Codex 相关功能：

- 📚 [工作流详解](../workflows/) - 了解 Codex 中可用的工作流
- 🔧 [配置管理](../advanced/configuration.md) - 深入学习 Codex 配置管理
- 🎯 [MCP 服务集成](mcp.md) - 详细了解 MCP 服务在 Codex 中的使用
