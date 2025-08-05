# ZCF - Zero-Config Claude-Code Flow

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Claude Code](https://img.shields.io/badge/Claude-Code-blue)](https://claude.ai/code)
[![Version](https://img.shields.io/npm/v/zcf)](https://www.npmjs.com/package/zcf)

**中文** | [English](README_EN.md)

> 零配置，一键搞定 Claude Code 环境设置 - 支持中英文双语配置、智能代理系统和个性化AI助手

![效果图](./src/assets/screenshot.webp)

## 🚀 快速开始

### 🎯 推荐：使用交互式菜单（v2.0新增）

```bash
npx zcf          # 打开交互式菜单，根据你的需求选择操作
```

菜单选项包括：
- `1` 完整初始化（等同于 `zcf i`）
- `2` 导入工作流（等同于 `zcf u`）
- `3-6` 配置管理（API、MCP、模型、AI个性等）
- 更多功能选项...

### 或者，直接使用命令：

#### 🆕 首次使用 Claude Code

```bash
npx zcf i        # 直接执行完整初始化：安装 Claude Code + 导入工作流 + 配置 API + 设置 MCP 服务
# 或
npx zcf → 选择 1  # 通过菜单执行完整初始化
```

#### 🔄 已有 Claude Code 环境

```bash
npx zcf u        # 仅更新工作流：快速添加 AI 工作流和命令系统
# 或
npx zcf → 选择 2  # 通过菜单执行工作流更新
```

> **提示**：
> - v2.0 起，`zcf` 默认打开交互式菜单，提供可视化操作界面
> - 你可以通过菜单选择操作，也可以直接使用命令快捷执行
> - `zcf i` = 完整初始化，`zcf u` = 仅更新工作流

### 初始化流程

完整初始化（`npx zcf`）会自动：

- ✅ 检测并安装 Claude Code
- ✅ 选择 AI 输出语言（新增）
- ✅ 配置 API 密钥
- ✅ 选择并配置 MCP 服务
- ✅ 设置所有必要的配置文件

### 使用方式

配置完成后：

- **项目第一次使用强烈建议先运行 `/init` 进行初始化，生成 CLAUDE.md 便于 AI 理解项目架构**
- `<任务描述>` - 不使用任何工作流直接执行，会遵循 SOLID、KISS、DRY 和 YAGNI 原则，适合修复 Bug 等小任务
- `/feat <任务描述>` - 开始新功能开发，分为 plan 和 ui 两个阶段
- `/workflow <任务描述>` - 执行完整开发工作流，不是自动化，开始会给出多套方案，每一步会询问用户意见，可随时修改方案，掌控力 MAX

> **PS**:
>
> - feat 和 workflow 这两套各有优势，可以都试试比较一下
> - 生成的文档位置默认都是项目根目录下的 `.claude/xxx.md`，可以把 `.claude/` 加入项目的 `.gitignore` 里

## ✨ ZCF 工具特性

### 🌏 多语言支持

- 脚本交互语言：控制安装过程的提示语言
- 配置文件语言：决定安装哪套配置文件（zh-CN/en）
- AI 输出语言：选择 AI 回复使用的语言（支持简体中文、English 及自定义语言）
- AI 个性化：支持多种预设人格（专业助手、猫娘助手、友好助手、导师模式）或自定义

### 🔧 智能安装

- 自动检测 Claude Code 安装状态
- 使用 npm 进行自动安装（确保兼容性）
- 跨平台支持（Windows/macOS/Linux）
- 自动配置 MCP 服务
- 智能配置合并和部分修改支持（v2.0新增）

### 📦 完整配置

- CLAUDE.md 系统指令
- settings.json 设置文件
- commands 自定义命令
- agents AI 代理配置

### 🔐 API 配置

- 支持两种认证方式：
  - **Auth Token**：适用于通过 OAuth 或浏览器登录获取的令牌
  - **API Key**：适用于从 Anthropic Console 获取的 API 密钥
- 自定义 API URL 支持
- 支持稍后在 claude 命令中配置
- 部分修改功能：仅更新需要的配置项（v2.0新增）

### 💾 配置管理

- 智能备份现有配置（所有备份保存在 ~/.claude/backup/）
- 配置合并选项（v2.0增强：支持深度合并）
- 安全的覆盖机制
- MCP 配置修改前自动备份
- 默认模型配置（v2.0新增）
- AI 记忆管理（v2.0新增）
- ZCF 缓存清理（v2.0新增）

## 📖 使用说明

### 交互式菜单（v2.0）

```bash
$ npx zcf

 ZCF - Zero-Config Claude-Code Flow v2.0.0

? Select ZCF display language / 选择ZCF显示语言:
  ❯ 简体中文
    English

请选择功能:
  -------- Claude Code --------
  1. 完整初始化配置 - 安装并配置所有内容
  2. 导入工作流 - 更新 AI 工作流和命令
  3. 配置 API - 管理 API 认证
  4. 配置 MCP 服务 - 管理 MCP 集成
  5. 配置默认模型 - 设置默认 AI 模型
  6. 配置 AI 个性 - 设置 AI 助手人格
  
  ------------ ZCF ------------
  0. 更改语言 - 切换界面语言
  -. 清理缓存 - 清理 ZCF 缓存文件
  q. 退出

请输入选择: _
```

### 完整初始化流程（选择1或使用 `zcf i`）

```bash
? 选择 Claude Code 配置语言:
  ❯ 简体中文 (zh-CN) - 中文版（便于中文用户自定义）
    English (en) - 英文版（推荐，token 消耗更低）

? 选择 AI 输出语言:
  AI 将使用此语言回复你的问题
  ❯ 简体中文
    English
    Custom
    （支持日语、法语、德语等多种语言）

? 选择 AI 个性化设置:
  ❯ 专业助手(默认)
    猫娘助手
    友好助手
    导师模式
    自定义

? 检测到 Claude Code 未安装，是否自动安装？(Y/n)

✔ Claude Code 安装成功

? 选择 API 认证方式
  ❯ 使用 Auth Token (OAuth 认证)
    适用于通过 OAuth 或浏览器登录获取的令牌
    使用 API Key (密钥认证)
    适用于从 Anthropic Console 获取的 API 密钥
    跳过（稍后手动配置）

? 请输入 API URL: https://api.anthropic.com
? 请输入 Auth Token 或 API Key: xxx

? 检测到已有配置文件，如何处理？
  ❯ 备份并覆盖全部
    仅更新工作流相关md并备份旧配置
    合并配置
    跳过

✔ 已备份所有配置文件到 ~/.claude/backup/xxx
✔ 配置文件已复制到 ~/.claude
✔ API 配置完成

? 是否配置 MCP 服务？(Y/n)

? 选择要安装的 MCP 服务（空格选择，回车确认）
  ❯ ◯ 全部安装
    ◯ Context7 文档查询 - 查询最新的库文档和代码示例
    ◯ DeepWiki - 查询 GitHub 仓库文档和示例
    ◯ Playwright 浏览器控制 - 直接控制浏览器进行自动化操作
    ◯ Exa AI 搜索 - 使用 Exa AI 进行网页搜索

? 请输入 Exa API Key（可从 https://dashboard.exa.ai/api-keys 获取）

✔ MCP 服务已配置

🎉 配置完成！使用 'claude' 命令开始体验。
```

### 命令行参数

#### 命令速查表

| 命令         | 缩写      | 说明                                    |
| ------------ | --------- | --------------------------------------- |
| `zcf`        | -         | 显示交互式菜单（v2.0默认命令）          |
| `zcf init`   | `zcf i`   | 初始化 Claude Code 配置                 |
| `zcf update` | `zcf u`   | 更新 Prompt 文档并备份旧配置            |

#### 常用选项

```bash
# 指定配置语言
npx zcf --config-lang zh-CN
npx zcf -c zh-CN            # 使用缩写

# 强制覆盖现有配置
npx zcf --force
npx zcf -f                 # 使用缩写

# 更新 Prompt 文档并备份旧配置（保留 API 和 MCP 配置）
npx zcf u                  # 使用 update 命令
npx zcf update             # 完整命令

# 查看帮助信息
npx zcf --help
npx zcf -h

# 查看版本
npx zcf --version
npx zcf -v
```

#### 使用示例

```bash
# 显示交互式菜单（默认）
npx zcf

# 首次安装，完整初始化
npx zcf i
npx zcf init              # 完整命令

# 更新 Prompt 文档并备份旧配置，保留 API 和 MCP 配置
npx zcf u
npx zcf update            # 完整命令

# 强制使用中文配置重新初始化
npx zcf i --config-lang zh-CN --force
npx zcf i -c zh-CN -f      # 使用缩写

# 更新到英文版 Prompt（降低 token 消耗）
npx zcf u --config-lang en
npx zcf u -c en            # 使用缩写
```

## 📁 项目结构

```
claude-code-config/
├── README.md              # 说明文档
├── package.json           # npm 包配置
├── bin/
│   └── zcf.mjs           # CLI 入口
├── src/                  # 源代码
│   ├── cli.ts           # CLI 主逻辑
│   ├── commands/        # 命令实现
│   ├── utils/           # 工具函数
│   └── constants.ts     # 常量定义
├── templates/            # 配置模板
│   ├── CLAUDE.md        # 项目级配置（v2.0新增）
│   ├── settings.json    # 基础配置（含隐私保护环境变量）
│   ├── en/              # 英文版
│   │   ├── rules.md     # 核心原则（原CLAUDE.md）
│   │   ├── personality.md # AI个性化（v2.0新增）
│   │   ├── mcp.md       # MCP服务说明（v2.0新增）
│   │   ├── agents/      # AI 代理
│   │   └── commands/    # 命令定义
│   └── zh-CN/           # 中文版
│       └── ... (相同结构)
└── dist/                # 构建输出
```

## ✨ 核心特性（v2.0增强）

### 🤖 专业代理

- **任务规划师**：将复杂任务拆解为可执行步骤
- **UI/UX 设计师**：提供专业界面设计指导
- **AI 个性化**：支持多种预设人格和自定义（v2.0新增）

### ⚡ 命令系统

- **功能开发** (`/feat`)：结构化新功能开发
- **工作流** (`/workflow`)：完整的六阶段开发流程

### 🔧 智能配置

- API 密钥管理（支持部分修改）
- 细粒度权限控制
- 多种 Claude 模型支持（可配置默认模型）
- 交互式菜单系统（v2.0新增）
- AI 记忆管理（v2.0新增）

## 🎯 开发工作流

### 六阶段工作流

1. **[模式：研究]** - 理解需求
2. **[模式：构思]** - 设计方案
3. **[模式：计划]** - 制定详细计划
4. **[模式：执行]** - 实施开发
5. **[模式：优化]** - 提升质量
6. **[模式：评审]** - 最终评估

## 🛠️ 开发

```bash
# 克隆项目
git clone https://github.com/UfoMiao/zcf.git
cd zcf

# 安装依赖（使用 pnpm）
pnpm install

# 构建项目
pnpm build

# 本地测试
node bin/zcf.mjs
```

## 💡 最佳实践

1. **任务分解**：保持任务独立可测试
2. **代码质量**：遵循 SOLID、KISS、DRY 和 YAGNI 原则
3. **文档管理**：计划存储在项目根目录的`.claude/plan/` 目录下

## 🔧 故障排除

如果遇到问题，可以：

1. 重新运行 `npx zcf` 重新配置
2. 检查 `~/.claude/` 目录下的配置文件
3. 确保 Claude Code 已正确安装

### Windows 平台支持

ZCF 已完全支持 Windows 平台：

- **自动检测**：在 Windows 系统上会自动使用兼容的 `cmd /c npx` 格式
- **配置修复**：现有的错误配置会在更新时自动修复
- **零配置**：Windows 用户无需任何额外操作，与 macOS/Linux 体验一致

如果在 Windows 上遇到 MCP 连接问题，运行 `npx zcf` 会自动修复配置格式。

## 🙏 鸣谢

本项目的部分 Prompt 参考了以下优秀作品：

- [Linux.do - 分享一个让 AI 只生成必要的代码的通用 Prompt，欢迎一起调优~](https://linux.do/t/topic/830802)
- [Linux.do - claude code 降智不怕，使用 agent 与 command 结合将任务做详细的拆分大概可以帮助到你](https://linux.do/t/topic/815230)
- [Linux.do - cursor 快速开发规则](https://linux.do/t/topic/697566)

感谢这些社区贡献者的分享！

## 📄 许可证

MIT 许可证

---

如果这个项目对你有帮助，请给我一个 ⭐️ Star！

[![Star History Chart](https://api.star-history.com/svg?repos=UfoMiao/claude-code-config&type=Date)](https://star-history.com/#UfoMiao/claude-code-config&Date)
