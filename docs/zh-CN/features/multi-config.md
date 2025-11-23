---
title: 多配置与备份
---

# 多配置与备份

ZCF 提供了完善的配置管理和备份机制，支持多套配置的切换、版本管理和安全回滚。无论是 Claude Code 还是 Codex，都可以轻松管理多个 API 配置、输出风格和系统设置。

## 多配置系统

### 配置层级

ZCF 的配置系统分为以下几个层级：

1. **全局配置**（`~/.ufomiao/zcf/config.toml`）- ZCF 本身的配置
2. **Claude Code 配置**（`~/.claude/settings.json`）- Claude Code 运行配置
3. **Codex 配置**（`~/.codex/config.toml`）- Codex 运行配置
4. **CCR 配置**（`~/.claude-code-router/config.json`）- Claude Code Router 代理配置

### 配置管理与切换

ZCF 提供了强大的 CLI 工具来创建、管理和切换这些配置。

- **创建配置**：在初始化时可以通过 `zcf init` 命令配置多个 API 提供商。
- **切换配置**：使用 `zcf config-switch` 命令在不同环境、项目或提供商之间快速切换。

👉 **详细命令使用请参考：**
- **[配置切换命令 (config-switch)](../cli/config-switch.md)**
- **[初始化命令 (init)](../cli/init.md)**

## 备份系统

ZCF 在每次修改配置前都会自动创建备份，确保配置安全和可恢复性。

### 备份位置

不同类型的配置备份到不同位置：

| 配置类型 | 备份目录 | 备份文件格式 |
|---------|---------|------------|
| **Claude Code** | `~/.claude/backup/` | `settings.json.{timestamp}.bak` |
| **Codex 完整** | `~/.codex/backup/` | `config.toml.{timestamp}.bak` |
| **Codex 配置** | `~/.codex/backup/` | `config.toml.{timestamp}.bak` |
| **Codex Agents** | `~/.codex/backup/` | `agents.{timestamp}.tar.gz` |
| **Codex Prompts** | `~/.codex/backup/` | `prompts.{timestamp}.tar.gz` |
| **CCR** | `~/.claude-code-router/` | `config.json.{timestamp}.bak` |
| **CCometixLine** | `~/.cometix/backup/` | `config.{timestamp}.bak` |
| **ZCF 全局配置** | `~/.ufomiao/zcf/backup/` | `config.toml.{timestamp}.bak` |

### 自动备份触发时机

ZCF 在以下操作时会自动创建备份：

1. **初始化配置**：首次配置或重新初始化
2. **更新配置**：通过 `zcf update` 更新工作流或模板
3. **切换配置**：使用 `config-switch` 切换配置
4. **修改 API**：更新 API 密钥或提供商
5. **安装工作流**：导入或更新工作流模板
6. **MCP 配置**：修改 MCP 服务配置

### 备份恢复

如果需要恢复到之前的配置：

1. **查找备份文件**：在对应的备份目录中找到时间戳备份文件
2. **恢复配置**：手动复制备份文件到原始位置

## 增量管理

当检测到已有配置时，ZCF 会提示选择管理策略：

### 策略选项

- **backup**：备份现有配置后合并新配置（推荐）
- **merge**：直接合并新配置到现有配置
- **new**：创建新配置，保留旧配置
- **skip**：跳过本次操作，保留现有配置

## 最佳实践

### 版本控制策略

对于团队协作，建议将配置纳入版本控制（Git），但**务必排除包含 API 密钥的配置文件**。

### Git Worktree 集成

使用 Git Worktree 在不同工作区间同步配置。结合 `config-switch` 命令，可以为不同的 Feature 分支使用不同的 API 配置（例如测试环境 vs 生产环境）。

### 配置清理

建议定期清理旧备份以节省磁盘空间。保留最近 7-30 天的备份通常已经足够。

## 了解更多

- [配置管理](../advanced/configuration.md) - 详细的配置管理指南
- [API 提供商预设](../advanced/api-providers.md) - 预配置的 API 提供商
