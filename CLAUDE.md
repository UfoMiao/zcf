# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 开发命令

```bash
# 开发模式运行
pnpm dev

# 构建项目
pnpm build

# 类型检查
pnpm typecheck

# 本地测试构建结果
pnpm test
```

## 项目架构

这是一个 Claude Code 零配置工具 (ZCF - Zero-Config Claude-Code Flow)，用于自动化配置 Claude Code 的工作环境。

### 核心组件

1. **CLI 入口** (`src/cli.ts`)：使用 cac 构建的命令行界面，处理用户交互和命令解析

2. **初始化流程** (`src/commands/init.ts`)：多步配置流程

   - 选择 ZCF 显示语言（中文/英文）
   - 选择配置语言（决定复制哪套模板）
   - 选择 AI 输出语言和个性（v2.0新增）
   - 检测并安装 Claude Code
   - 处理现有配置（备份/合并/跳过）
   - 配置 API（支持部分修改）
   - 复制配置文件
   - 配置 MCP 服务（自动配置，支持多选）
   - 处理需要 API Key 的服务
   - 生成并保存 ~/.claude.json

3. **命令系统** (`src/commands/`)

   - `init.ts`：完整初始化流程
   - `update.ts`：更新工作流文件
   - `menu.ts`：交互式菜单系统（v2.0新增）

4. **工具函数**

   - `utils/installer.ts`：Claude Code 安装检测和自动安装
   - `utils/config.ts`：配置文件管理（备份、复制、合并）
   - `utils/config-operations.ts`：配置部分修改（v2.0新增）
   - `utils/config-validator.ts`：配置验证（v2.0新增）
   - `utils/platform.ts`：跨平台路径处理
   - `utils/mcp.ts`：MCP 配置管理（读取、写入、合并、备份）
   - `utils/ai-personality.ts`：AI 个性化配置（v2.0新增）
   - `utils/features.ts`：功能模块管理（v2.0新增）
   - `utils/zcf-config.ts`：ZCF 配置持久化（v2.0新增）

5. **模板系统** (`templates/`)：优化的配置结构
   - `CLAUDE.md`：项目级配置模板（v2.0新增）
   - `settings.json`：基础配置（含隐私保护环境变量）
   - `en/` 和 `zh-CN/`：语言特定配置
     - `rules.md`：系统指令和原则（原CLAUDE.md）
     - `personality.md`：AI 个性化指令（v2.0新增）
     - `mcp.md`：MCP 服务使用说明（v2.0新增）
     - `agents/`：AI 代理定义（planner、ui-ux-designer）
     - `commands/`：自定义命令（feat、workflow）

### 构建配置

使用 unbuild 构建工具，配置在 `build.config.ts`：

- 入口：src/index 和 src/cli
- 输出：ESM 格式到 dist/
- 内联所有依赖

### 发布流程

作为 npm 包 `zcf`，支持 npx 直接执行：

- bin 入口：`bin/zcf.mjs`
- 发布文件：dist、bin、templates

## 代码规范

- TypeScript 严格模式
- ESM 模块系统
- 使用 @posva/prompts 处理交互
- 使用 ansis 处理终端颜色
- 路径处理使用 pathe 确保跨平台兼容
- 使用 dayjs 处理时间格式化
- 代码注释用英文
- 使用 changeset 进行版本管理
- CHANGELOG 用双语,不要在同一行,整体一个语言,中文在上,英文在下

## v2.0 新增特性

- **交互式菜单**：`zcf menu` 命令提供可视化配置管理
- **AI 个性化**：支持多种预设人格和自定义人格
- **配置增强**：
  - API 配置部分修改
  - 默认模型配置
  - AI 记忆管理
  - 智能配置合并
- **模板重构**：
  - 将 CLAUDE.md 拆分为 rules.md、personality.md 和 mcp.md
  - 新增项目级 CLAUDE.md 模板
- **ZCF 缓存管理**：支持清理 ZCF 配置缓存
