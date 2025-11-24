---
title: 使用指南
---

# 使用指南

本指南将帮助您快速开始使用 ZCF，从环境检查到验证使用的完整流程。无论您是首次使用还是希望在新设备上快速部署，都可以按照本指南完成设置。

> 💡 **提示**：ZCF 无需安装，直接使用 `npx zcf` 即可运行。本指南主要介绍环境配置和使用流程。

## 环境要求

在开始之前，请确保您的系统满足以下要求：

| 要求项 | 最低版本 | 推荐版本 | 说明 |
|--------|---------|---------|------|
| **Node.js** | 22.x | 22.x 或更高 | 需要 Node.js 22+ |
| **npm** | 随 Node.js 安装 | 最新版 | 需要支持 `npx` 命令 |
| **操作系统** | - | - | macOS、Linux、Windows PowerShell/WSL、Termux |

> 💡 **提示**：如果您使用 WSL（Windows Subsystem for Linux），ZCF 会自动检测环境并提供相应的安装提示。
>
> 🔐 **Linux 用户**：在 Linux 系统上，ZCF 会自动检测您是否以非 root 用户运行，并在需要时使用 `sudo` 进行全局 npm 安装。在安装 Claude Code、Codex、CCR 或 CCometixLine 时，您可能需要输入密码。

### 检查环境

在开始安装前，可以运行以下命令检查您的环境：

```bash
# 检查 Node.js 版本
node --version

# 检查 npm 是否可用
npm --version

# 检查 npx 是否可用
npx --version
```

> ⚠️ **注意**：如果您的 Node.js 版本低于 22，请先升级 Node.js。可以使用 [nvm](https://github.com/nvm-sh/nvm) 或 [fnm](https://github.com/Schniz/fnm) 管理多个 Node.js 版本。

## 使用方式

ZCF 提供两种使用方式：**交互式使用**（适合新手）和**命令行直接使用**（适合自动化和 CI/CD）。

> 💡 **提示**：ZCF 无需安装，直接使用 `npx zcf` 命令即可运行。

### 方式一：交互式使用（推荐新手）

ZCF 提供了友好的交互式菜单，让您可以通过图形化界面完成所有配置。

#### 启动 ZCF

```bash
npx zcf
```

首次运行时，ZCF 会显示欢迎界面并询问您希望使用的界面语言：

```
ZCF - Zero-Config Code Flow

? Select ZCF display language / 选择ZCF显示语言:
  ❯ 简体中文
    English
```

#### 主菜单选项

进入主菜单后，您会看到以下选项：

```
请选择功能:
  -------- Claude Code --------
  1. 完整初始化 - 安装 Claude Code + 导入工作流 + 配置 API 或 CCR 代理 + 配置 MCP 服务
  2. 导入工作流 - 仅导入/更新工作流相关文件
  3. 配置 API - 配置 API URL 和认证信息（支持 CCR 代理）
  4. 配置 MCP - 配置 MCP 服务（含 Windows 修复）
  5. 配置默认模型 - 设置默认模型（opus/sonnet/sonnet 1m/自定义）
  6. 配置 Claude 全局记忆 - 配置 AI 输出语言和输出风格
  7. 导入推荐环境变量和权限配置 - 导入隐私保护环境变量和系统权限配置

  --------- 其他工具 ----------
  R. CCR - Claude Code Router 管理
  U. ccusage - Claude Code 用量分析
  L. CCometixLine - 基于 Rust 的高性能状态栏工具，集成 Git 信息和实时使用量跟踪

  ------------ ZCF ------------
  0. 更改显示语言 / Select display language - 更改 ZCF 界面语言
  -. 卸载 - 从系统中删除 Claude Code 配置和工具
  +. 检查更新 - 检查并更新 Claude Code、CCR 和 CCometixLine 的版本
  Q. 退出
```

#### 交互式初始化流程

选择 `1` 执行完整初始化时，ZCF 会引导您完成以下步骤：

**步骤 1：选择配置语言**
```
? 选择配置语言:
  ❯ English (en) - 英文版（token 消耗更低）
    简体中文 (zh-CN) - 中文版（便于中文用户自定义）
    日本語 (ja) - 日本語版
```

> 💡 **选择建议**：
> - **English**：适合追求低 token 消耗的场景
> - **简体中文**：适合中文团队，便于自定义和维护
> - **日本語**：适合日语用户

**步骤 2：选择 AI 输出语言**
```
? 选择 AI 输出语言:
  AI 将使用此语言回复你的问题
  ❯ 简体中文
    English
    日本語
    Custom
```

> 📝 **说明**：AI 输出语言可以与配置语言不同。选择 `Custom` 可以输入自定义语言指令。

**步骤 3：检测并安装 Claude Code**
```
? 检测到 Claude Code 未安装，是否自动安装？(Y/n)
```

如果选择安装，ZCF 会提示您选择安装方法：

```
? 选择 Claude Code 的安装方法：
  ❯ npm [推荐] - 通过 npm 安装（适用于所有平台）
    homebrew [推荐] - 通过 Homebrew 安装（macOS/Linux）
    curl - 通过 curl 脚本安装（Linux/macOS/WSL）
    powershell - 通过 PowerShell 脚本安装（Windows）
    cmd - 通过 CMD 脚本安装（Windows）
```

> ✅ **自动处理**：
> - ZCF 会自动检测您的平台并推荐最佳的安装方法
> - 如果 Claude Code 已安装，ZCF 会检测版本并可以自动升级到最新版本
> - 安装方法会被保存以供将来参考

**步骤 4：处理现有配置**

如果检测到已有配置文件：
```
? 检测到已有配置文件，如何处理？
  ❯ 备份并覆盖 - 将现有配置备份到 ~/.claude/backup/
    仅更新文档 - 只更新工作流和文档，保留现有API配置
    合并配置 - 与现有配置合并，保留用户自定义内容
    跳过 - 跳过配置更新
```

> ⚠️ **重要**：
> - **备份并覆盖**：安全选项，会创建时间戳备份
> - **仅更新文档**：适合只想更新工作流模板的场景
> - **合并配置**：保留您的自定义配置，智能合并新增内容

**步骤 5：配置 API**
```
? 选择 API 认证方式
  ❯ 使用官方登录
    使用 Auth Token (OAuth 认证)
    使用 API Key (密钥认证)
    配置 CCR 代理（Claude Code Router）
    跳过（稍后手动配置）
```

> 💡 **推荐**：
> - **官方登录**：最简单，无需配置 API Key
> - **API Key**：适合使用第三方 API 提供商（如 302.AI、GLM）
> - **CCR 代理**：适合需要路由多个模型的场景

**步骤 6-9**：依次选择输出风格、工作流、MCP 服务和 CCometixLine（可选）

初始化完成后，您会看到：
```
✔ 配置完成！Claude Code 环境已就绪
🎉 配置完成！使用 'claude' 命令开始体验。
```

### 方式二：命令行直接使用（推荐自动化）

适合 CI/CD 和自动化场景，使用 `--skip-prompt`（或 `-s`）配合参数完成配置。

> 🚀 **适用场景**：
> - CI/CD 流水线中的自动配置
> - 批量部署多台机器
> - 脚本自动化初始化
> - Docker 容器初始化

#### 使用 API 提供商预设（最简单）

ZCF 支持 API 提供商预设，可将配置从 5+ 个参数简化为仅需 2 个：

```bash
# 使用 302.AI 提供商（推荐）
npx zcf i -s -p 302ai -k "sk-xxx"

# 其他提供商
npx zcf i -s -p glm -k "sk-xxx"        # GLM
npx zcf i -s -p minimax -k "sk-xxx"    # MiniMax
npx zcf i -s -p kimi -k "sk-xxx"       # Kimi
```

> ✅ **优势**：预设会自动配置 baseUrl、认证方式和默认模型，大大简化了配置流程。

#### 自定义配置

如果需要使用自定义 API 端点：

```bash
# 手动指定所有参数
npx zcf i -s -g zh-CN -t api_key -k "sk-xxx" -u "https://api.example.com"

# 同时配置主模型与快速模型
npx zcf i -s -p 302ai -k "sk-xxx" \
  --api-model "claude-sonnet-4-5" \
  --api-fast-model "claude-haiku-4-5"

# 指定输出风格和工作流
npx zcf i -s -p 302ai -k "sk-xxx" \
  --output-styles engineer-professional,nekomata-engineer \
  --workflows commonTools,sixStepsWorkflow \
  --default-output-style engineer-professional
```

#### 多 API 配置

ZCF 支持配置多个 API，方便在不同场景下切换：

```bash
# 使用 JSON 字符串配置多个 API
npx zcf i -s --api-configs '[
  {"provider":"302ai","key":"sk-xxx"},
  {"provider":"glm","key":"sk-yyy"},
  {"name":"custom","type":"api_key","key":"sk-zzz","url":"https://custom.api.com","primaryModel":"claude-sonnet-4-5","fastModel":"claude-haiku-4-5","default":true}
]'

# 使用 JSON 文件配置（适合复杂的多配置场景）
npx zcf i -s --api-configs-file ./api-configs.json
```

`api-configs.json` 文件示例：

```json
[
  {
    "provider": "302ai",
    "key": "sk-xxx"
  },
  {
    "name": "custom",
    "type": "api_key",
    "key": "sk-yyy",
    "url": "https://custom.api.com",
    "primaryModel": "claude-sonnet-4-5",
    "fastModel": "claude-haiku-4-5",
    "default": true
  }
]
```

#### 常用参数速览

| 参数 | 缩写 | 说明 | 常用值 |
|------|------|------|--------|
| `--skip-prompt` | `-s` | 跳过所有交互提示 | - |
| `--provider` | `-p` | API 提供商预设 | `302ai`, `glm`, `minimax`, `kimi` |
| `--api-key` | `-k` | API 密钥 | 您的 API Key |
| `--all-lang` | `-g` | 统一设置所有语言参数 | `zh-CN`, `en` |
| `--workflows` | `-w` | 要安装的工作流 | `all`, `skip` 或逗号分隔列表 |
| `--mcp-services` | `-m` | 要安装的 MCP 服务 | `all`, `skip` 或逗号分隔列表 |
| `--code-type` | `-T` | 目标代码工具类型 | `claude-code`, `codex`, `cc`, `cx` |

> 📖 **完整参数列表**：详细参数说明请参考 [CLI 命令 - zcf init](../cli/init.md) 章节。

## Codex 支持

ZCF 提供完整的 Codex 支持，让您可以在同一个工具中管理 Claude Code 和 Codex 两种环境。

### 切换到 Codex 模式

```bash
# 方式 1：命令行直接初始化
npx zcf i -s -T codex -p 302ai -k "sk-xxx"

# 方式 2：通过交互式菜单
npx zcf → 选择 S（切换工具）→ 选择 1（完整初始化）
```

### Codex 配置特点

- **配置文件**：`~/.codex/config.toml`（TOML 格式）
- **工作流位置**：`~/.codex/prompts/`
- **系统提示**：`~/.codex/AGENTS.md`
- **共享 MCP**：与 Claude Code 使用相同的 MCP 服务配置

> 💡 **提示**：Codex 和 Claude Code 共享相同的工作流模板和 MCP 服务，确保一致的开发体验。

## 跨平台支持

ZCF 全面支持跨平台运行，包括 Windows、macOS、Linux、WSL 和 Termux。

### Windows 平台

- **自动检测**：在 Windows 系统上会自动使用兼容的 `cmd /c npx` 格式
- **配置修复**：现有的错误配置会在更新时自动修复
- **零配置**：Windows 用户无需任何额外操作，与 macOS/Linux 体验一致

> ⚠️ **注意**：如果在 Windows 上遇到 MCP 连接问题，运行 `npx zcf` 会自动修复配置格式。

### WSL 支持（v2.12.12+）

- **智能检测**：通过环境变量、系统文件和挂载点进行多层次 WSL 环境检测
- **发行版识别**：自动识别 WSL 发行版（Ubuntu、Debian 等）以优化配置
- **无缝安装**：在 WSL 环境中提供原生 Linux 风格的安装体验

### Termux 支持（v2.1+）

- **自动适配**：自动检测 Termux 环境并使用兼容配置
- **增强检测**：智能识别可用命令，确保在受限环境中正常工作
- **完整功能**：在 Termux 中享受与桌面系统相同的完整功能

> 📱 **提示**：在 Termux 中，ZCF 会自动识别特殊的路径结构并正确安装依赖。

## 验证安装

安装完成后，请按照以下步骤验证环境是否配置正确：

### 1. 验证 CLI 可用性

```bash
# 检查 ZCF 命令是否可用
npx zcf --help

# 检查版本信息
npx zcf --version
```

### 2. 验证工作流

根据使用的工具，在命令面板中尝试以下命令：

**Claude Code：**
```
/zcf:workflow  # 六阶段开发工作流
/zcf:feat      # 功能开发工作流
/git-commit    # Git 提交命令
/init-project  # 项目初始化
```

**Codex：**
```
/prompts:workflow  # 六阶段开发工作流
/prompts:git-commit    # Git 提交命令
/prompts:git-rollback  # Git 回滚命令
/prompts:git-cleanBranches  # 清理已合并分支
/prompts:git-worktree  # Git 工作树管理
```

> ⚠️ **注意**：Codex 目前仅支持六阶段工作流和 Git 工作流，功能开发工作流（feat）、项目初始化（init-project）和 BMad 工作流暂未在 Codex 中提供。

> ✅ **成功标志**：如果命令能够正常执行并显示工作流界面，说明工作流导入成功。
> 
> 💡 **提示**：Codex 使用 `/prompts:` 前缀，而 Claude Code 使用 `/zcf:` 或直接 `/` 前缀。

### 3. 验证 MCP 服务

在 Claude Code/Codex 的 MCP 面板中，确认以下服务是否已启用：

- ✅ Context7 - 文档查询服务
- ✅ open-websearch - 网页搜索
- ✅ spec-workflow - Spec 工作流
- ✅ mcp-deepwiki - GitHub 文档
- ✅ Playwright - 浏览器控制
- ✅ serena - 语义代码检索

测试服务功能：
```
请查询 React useState hook 的最新文档
```
如果 Context7 正常工作，AI 会使用最新文档回答。

> 🔧 **故障排除**：如果服务未连接，运行 `npx zcf` → `4` 重新配置 MCP 服务。

### 4. 验证 API 连接

```bash
# 查看使用统计（如果使用官方 API）
npx zcf ccu

# 检查 CCR 状态（如果使用 CCR 代理）
npx zcf ccr
```

### 5. 验证输出风格

测试 AI 输出风格是否生效：
```
请解释一下 SOLID 原则
```

切换输出风格（在项目中）：
```
/output-style engineer-professional  # 切换到专业工程师
/output-style nekomata-engineer      # 切换到猫娘工程师
```

## 实际场景示例

### 场景：新设备快速部署

以下是一个完整的部署脚本示例：

```bash
#!/bin/bash

# 1. 初始化 Claude Code
npx zcf i -s -p 302ai -k "$API_KEY" \
  --output-styles engineer-professional \
  --workflows all \
  --mcp-services all

# 2. 验证安装
npx zcf --version

# 3. 查看配置位置
echo "Claude Code 配置: ~/.claude/"
echo "备份位置: ~/.claude/backup/"
```

### 场景：更新工作流

如果已初始化，只需要更新工作流和模板：

```bash
npx zcf update -g zh-CN
```

> 📖 **说明**：`zcf update` 默认会保留您现有的 API 配置和 MCP 设置，只更新工作流模板和文档。

### 场景：配置 CCR 代理

如果需要使用 CCR（Claude Code Router）代理：

```bash
npx zcf ccr
```

进入 CCR 管理菜单后，可以选择：
- `1` 初始化 CCR - 安装并配置 CCR
- `2` 启动 UI - 启动 CCR Web 界面
- `3` 服务控制 - 启动/停止/重启 CCR 服务
- `4` 检查状态 - 查看当前 CCR 服务状态

> 💡 **CCR 优势**：
> - 支持多个 AI 模型路由
> - 成本优化（为不同任务选择合适模型）
> - 免费模型接入（Gemini、DeepSeek 等）

## 常见问题

### Q: 初始化后找不到工作流？

**A**: 检查以下位置：
- Claude Code：`~/.claude/workflows/`
- Codex：`~/.codex/prompts/`

如果文件不存在，运行 `npx zcf update` 重新导入。

### Q: MCP 服务连接失败？

**A**: 
1. 检查 MCP 服务配置：`npx zcf` → `4`
2. 确认服务已安装（大部分通过 npm 自动安装）
3. 对于 Exa，确保设置了 `EXA_API_KEY` 环境变量

### Q: 如何切换 API 配置？

**A**: 使用配置切换命令：
```bash
npx zcf config-switch --list  # 列出所有配置
npx zcf cs provider-name      # 切换到指定配置
```

### Q: 配置文件保存在哪里？

**A**: 
- **ZCF 配置**：`~/.ufomiao/zcf/config.toml`
- **Claude Code 配置**：`~/.claude/settings.json` 和 `~/.claude/CLAUDE.md`
- **Codex 配置**：`~/.codex/config.toml` 和 `~/.codex/AGENTS.md`
- **备份位置**：`~/.claude/backup/` 和 `~/.codex/backup/`

## 下一步

完成快速开始后，建议您：

1. 🎯 探索 [功能特性](../features/) 了解 ZCF 的完整能力
2. 📚 深入学习 [工作流详解](../workflows/) 掌握各种工作流
3. ⚙️ 参考 [配置管理](../advanced/configuration.md) 进行个性化设置
4. 🔧 查看 [CLI 命令](../cli/) 掌握所有可用命令
