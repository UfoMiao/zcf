---
title: zcf update
---

# zcf update

`zcf update`（缩写 `zcf u`）用于更新工作流模板、提示词和检查工具版本。这是一个轻量级的更新命令，不会修改 API 配置或已安装的 MCP 服务。

## 功能概述

`zcf update` 命令会执行以下操作：

1. 📝 **更新提示词**：同步最新的工作流模板和提示词内容
2. 🔄 **更新工作流**：更新或安装新的工作流模板
3. 📊 **检查版本**：检查 Claude Code 或 Codex 的版本并提示更新（如果可用）
4. 🌐 **语言同步**：更新模板语言和 AI 输出语言
5. 💾 **创建备份**：在更新前自动创建备份

## 基本用法

### 交互式模式（推荐）

```bash
# 使用保存的偏好更新
npx zcf update

# 或使用缩写
npx zcf u

# 或通过主菜单
npx zcf
# 然后选择 2 (导入工作流)
```

交互式模式下，ZCF 会：

1. 询问模板语言（如果未保存偏好）
2. 询问 AI 输出语言（如果未保存偏好）
3. 选择要更新/安装的工作流
4. 检查工具版本并提示更新

### 非交互式模式

```bash
# 使用默认语言设置更新
npx zcf u -s

# 指定模板语言
npx zcf u -s -c zh-CN

# 指定 AI 输出语言
npx zcf u -s -a zh-CN

# 同时指定模板和输出语言
npx zcf u -s -g zh-CN

# 指定代码工具类型
npx zcf u -s -T codex
```

## 常用参数

| 参数 | 缩写 | 说明 | 可选值 | 默认值 |
|------|------|------|--------|--------|
| `--skip-prompt, -s` | `-s` | 跳过所有交互提示 | - | - |
| `--config-lang, -c` | `-c` | 模板文件语言 | `zh-CN`, `en` | 用户保存的偏好或 `en` |
| `--ai-output-lang, -a` | `-a` | AI 输出语言 | `zh-CN`, `en`, 自定义字符串 | 用户保存的偏好或 `en` |
| `--all-lang, -g` | `-g` | 统一设置所有语言参数 | `zh-CN`, `en`, 自定义字符串 | - |
| `--code-type, -T` | `-T` | 目标代码工具类型 | `claude-code`, `codex`, `cc`, `cx` | ZCF 配置中的当前工具类型 |

> 💡 **提示**：使用 `--all-lang` 可以一次性设置模板语言和 AI 输出语言。

## 使用场景

### 场景 1：定期更新工作流

```bash
# 定期运行以获取最新工作流模板
npx zcf u

# 每周更新一次（建议）
# 可以添加到 cron 任务或 CI/CD 流程中
```

### 场景 2：更新特定代码工具

```bash
# 更新 Claude Code 工作流
npx zcf u -T claude-code -c zh-CN

# 更新 Codex 工作流
npx zcf u -T codex -c zh-CN
```

### 场景 3：同步语言设置

```bash
# 将所有语言设置切换为中文
npx zcf u -g zh-CN

# 模板中文，AI 输出英文
npx zcf u -c zh-CN -a en
```

### 场景 4：自动化更新

```bash
# 非交互式更新（适合脚本）
npx zcf u -s -g zh-CN -T claude-code
```

## 执行流程

`zcf update` 的执行流程如下：

### Claude Code 流程

1. **显示 Banner**：显示更新提示
2. **解析语言偏好**：从参数、配置或交互获取语言设置
3. **更新提示词**：同步最新的工作流模板和提示词
4. **选择工作流**：交互式选择要安装/更新的工作流
5. **检查版本**：检查 Claude Code 版本并提示更新
6. **保存偏好**：更新 ZCF 全局配置

### Codex 流程

1. **显示 Banner**：显示更新提示
2. **运行 Codex 更新**：执行 Codex 特定的更新流程
3. **更新工作流**：更新 Codex 工作流模板
4. **保存偏好**：更新 ZCF 全局配置

## 更新内容

`zcf update` 会更新以下内容：

### 工作流模板

- ✅ 六阶段工作流（`/zcf:workflow`）
- ✅ 功能开发工作流（`/zcf:feat`）
- ✅ Git 工作流（`/git-commit` 等）
- ✅ BMad 工作流（`/bmad-init`）
- ✅ 通用工具（`/init-project`）

> ⚠️ **注意**：Codex 目前仅支持六阶段工作流和 Git 工作流。

### 提示词内容

- ✅ 系统提示词（`CLAUDE.md`）
- ✅ 工作流命令模板
- ✅ AI 代理模板
- ✅ 输出风格模板

### 不会更新的内容

`zcf update` **不会**修改以下内容：

- ❌ API 配置（密钥、认证方式等）
- ❌ MCP 服务配置（已安装的服务）
- ❌ 自定义输出风格
- ❌ 项目特定的配置

如果需要更新这些内容，请使用 `zcf init` 或对应的配置菜单。

## 版本检查

`zcf update` 会自动检查工具版本：

### Claude Code 版本检查

- 检查当前安装的 Claude Code 版本
- 如果有新版本可用，会提示用户更新
- 更新提示仅在交互模式下显示

### Codex 版本检查

- 在 Codex 更新流程中自动执行
- 检查 Codex CLI 版本并更新（如果需要）

## 备份机制

在更新工作流和提示词前，ZCF 会自动创建备份：

### Claude Code 备份

- 备份位置：`~/.claude/backup/`
- 备份内容：工作流模板、提示词、配置文件
- 备份格式：时间戳目录（如 `backup_2025-01-15_10-30-45/`）

### Codex 备份

- 备份位置：`~/.codex/backup/`
- 备份内容：工作流模板、配置文件
- 备份格式：时间戳目录

## 最佳实践

### 1. 定期更新

建议定期运行 `zcf update` 以获取最新工作流和改进：

```bash
# 每周更新一次
npx zcf u -g zh-CN

# 或添加到 cron 任务
0 0 * * 0 /usr/local/bin/npx zcf u -s -g zh-CN
```

### 2. 更新前检查

更新前可以查看当前配置：

```bash
# 查看当前工作流
ls -la ~/.claude/workflows/

# 查看备份
ls -la ~/.claude/backup/
```

### 3. 保留自定义内容

如果你有自定义的工作流或提示词：

1. **备份自定义内容**：在更新前手动备份
2. **使用 `docs-only` 模式**：在 `zcf init` 中使用 `--config-action docs-only`
3. **查看差异**：更新后对比备份和当前文件

### 4. 团队同步

在团队环境中：

- 统一更新频率和语言设置
- 共享更新的工作流模板
- 使用 Git 管理自定义模板

```bash
# 团队统一的更新命令
npx zcf u -s -g zh-CN -T claude-code
```

## 故障排除

### 更新失败

如果更新失败：

1. **检查网络连接**：确保可以访问 npm registry
2. **检查权限**：确保对配置目录有写入权限
3. **查看错误信息**：检查终端输出的错误信息

```bash
# 检查权限
ls -la ~/.claude/ ~/.codex/

# 手动创建备份目录（如需要）
mkdir -p ~/.claude/backup ~/.codex/backup
```

### 工作流未更新

如果工作流没有更新：

```bash
# 强制重新安装工作流
npx zcf init --config-action new -w all

# 或手动检查工作流目录
ls -la ~/.claude/workflows/
```

### 版本检查不工作

如果版本检查没有提示：

1. **确认 Claude Code 已安装**：检查 `claude-code` 命令是否可用
2. **手动检查版本**：使用 `claude-code --version`
3. **使用 check-updates 命令**：运行 `npx zcf check-updates`

## 与 init 的区别

| 特性 | `zcf init` | `zcf update` |
|------|-----------|-------------|
| **主要用途** | 完整初始化环境 | 更新工作流和模板 |
| **API 配置** | ✅ 会配置 | ❌ 不会修改 |
| **MCP 服务** | ✅ 会安装配置 | ❌ 不会修改 |
| **工作流** | ✅ 会安装 | ✅ 会更新 |
| **输出风格** | ✅ 会配置 | ❌ 不会修改 |
| **版本检查** | ❌ 不检查 | ✅ 会检查 |
| **备份** | ✅ 创建备份 | ✅ 创建备份 |

> 💡 **建议**：
> - 首次使用或需要修改 API/MCP 配置时，使用 `zcf init`
> - 仅需要更新工作流和模板时，使用 `zcf update`

## 相关资源

- [zcf init](init.md) - 完整初始化命令
- [工作流系统](../features/workflows.md) - 工作流详细介绍
- [配置管理](../features/multi-config.md) - 备份和恢复
- [check-updates](check-updates.md) - 版本检查命令

> 💡 **提示**：建议定期运行 `zcf update` 以保持工作流模板和提示词的最新状态，特别是在有新功能发布或模板更新时。