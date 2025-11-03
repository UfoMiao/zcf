---
icon: save
layout:
  width: default
  title:
    visible: true
  description:
    visible: true
  tableOfContents:
    visible: true
  outline:
    visible: true
  pagination:
    visible: true
  metadata:
    visible: true
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

### 多 API 配置

在初始化或配置时，可以通过以下方式配置多个 API：

#### 命令行方式

```bash
# 通过 --api-configs 传入 JSON 字符串
npx zcf init --api-configs '[
  {
    "provider": "anthropic",
    "type": "api_key",
    "key": "sk-ant-xxx",
    "primaryModel": "claude-4-5-sonnet",
    "default": true
  },
  {
    "provider": "glm",
    "type": "api_key",
    "key": "sk-glm-xxx",
    "primaryModel": "glm-4",
    "default": false
  }
]'

# 或通过 --api-configs-file 指定文件
npx zcf init --api-configs-file ./api-configs.json
```

#### 配置文件格式

```json
[
  {
    "provider": "anthropic",
    "type": "api_key",
    "key": "sk-ant-xxx",
    "url": "https://api.anthropic.com/v1",
    "primaryModel": "claude-4-5-sonnet",
    "fastModel": "claude-3-5-haiku",
    "default": true
  },
  {
    "provider": "glm",
    "type": "api_key",
    "key": "sk-glm-xxx",
    "url": "https://open.bigmodel.cn/api/paas/v4",
    "primaryModel": "glm-4",
    "default": false
  }
]
```

### Claude Code 配置切换

Claude Code 支持多配置 Profile 管理：

```bash
# 列出所有配置
npx zcf config-switch --list

# 切换到指定配置
npx zcf config-switch provider1

# 在 Codex 中切换
npx zcf config-switch provider1 --code-type codex
```

### Codex 配置切换

Codex 同样支持多提供商配置：

```bash
# 列出 Codex 提供商
npx zcf config-switch --code-type codex --list

# 切换到指定提供商
npx zcf config-switch glm-provider --code-type codex

# 切换回官方登录
npx zcf config-switch official --code-type codex
```

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

### 自动备份

ZCF 在以下操作时会自动创建备份：

1. **初始化配置**：首次配置或重新初始化
2. **更新配置**：通过 `zcf update` 更新工作流或模板
3. **切换配置**：使用 `config-switch` 切换配置
4. **修改 API**：更新 API 密钥或提供商
5. **安装工作流**：导入或更新工作流模板
6. **MCP 配置**：修改 MCP 服务配置

### 手动备份

你也可以手动触发备份：

```bash
# Claude Code 配置备份（自动在更新时执行）
npx zcf update

# Codex 配置备份
npx zcf init -T codex --backup-only

# CCR 配置备份（在 CCR 命令中自动执行）
npx zcf ccr
```

### 备份恢复

如果需要恢复到之前的配置：

1. **查找备份文件**：在对应的备份目录中找到时间戳备份文件
2. **恢复配置**：手动复制备份文件到原始位置

```bash
# 查看 Claude Code 备份
ls ~/.claude/backup/

# 恢复特定备份（示例）
cp ~/.claude/backup/settings.json.2025-01-15_10-30-45.bak ~/.claude/settings.json

# 查看 Codex 备份
ls ~/.codex/backup/

# 恢复 Codex 配置（示例）
cp ~/.codex/backup/config.toml.2025-01-15_10-30-45.bak ~/.codex/config.toml
```

## 增量管理

当检测到已有配置时，ZCF 会提示选择管理策略：

### 策略选项

- **backup**：备份现有配置后合并新配置（推荐）
- **merge**：直接合并新配置到现有配置
- **new**：创建新配置，保留旧配置
- **skip**：跳过本次操作，保留现有配置

### 增量更新选项

在更新工作流或模板时，可以选择：

- **docs-only**：仅更新提示词和文档，不覆盖自定义内容
- **full**：完整更新，覆盖所有内容
- **skip**：跳过所有操作

```bash
# 仅更新文档
npx zcf update --docs-only

# 完整更新
npx zcf update --full
```

## 配置管理最佳实践

### 版本控制策略

对于团队协作，建议将配置纳入版本控制：

```bash
# 创建配置仓库
mkdir ~/zcf-configs
cd ~/zcf-configs
git init

# 添加配置文件
cp ~/.claude/settings.json ./claude-settings.json
cp ~/.codex/config.toml ./codex-config.toml
cp ~/.ufomiao/zcf/config.toml ./zcf-config.toml

# 提交配置（注意：不要提交敏感信息）
git add .claude-ignore .codex-ignore
git commit -m "Add ZCF configurations"
```

> ⚠️ **安全提示**：不要将包含 API 密钥的配置文件提交到公共仓库。使用 `.gitignore` 排除敏感文件，或使用环境变量管理密钥。

### Git Worktree 集成

使用 Git Worktree 在不同工作区间同步配置：

```bash
# 在项目中使用 /git-worktree 指令
/git-worktree 新建 feat/new-feature 并打开

# 配置会自动同步到新工作树
```

### 配置分离

建议将配置分为以下几类：

1. **共享配置**：工作流模板、输出风格、MCP 服务配置
2. **个人配置**：API 密钥、个人偏好设置
3. **项目配置**：项目特定的工作流和模板

```bash
# 使用配置切换在不同环境间切换
npx zcf config-switch dev-env    # 开发环境配置
npx zcf config-switch prod-env   # 生产环境配置
```

## 配置备份清理

定期清理旧备份以节省空间：

```bash
# 手动清理（示例：保留最近 30 天的备份）
find ~/.claude/backup/ -name "*.bak" -mtime +30 -delete
find ~/.codex/backup/ -name "*.bak" -mtime +30 -delete

# 或使用系统工具
# macOS
tmutil deletelocalsnapshots $(date +%Y-%m-%d)
```

> 💡 **提示**：建议保留至少最近 7 天的备份，以便在需要时恢复。

## 故障排除

### 配置冲突

如果遇到配置冲突：

```bash
# 查看当前配置状态
npx zcf config-switch --list

# 强制重置配置（会创建备份）
npx zcf init --force-reset

# 恢复到最近备份
# 手动复制备份文件到原始位置
```

### 备份失败

如果备份失败：

1. **检查磁盘空间**：确保有足够的磁盘空间
2. **检查权限**：确保对备份目录有写入权限
3. **手动创建备份**：使用 `cp` 命令手动备份

```bash
# 检查磁盘空间
df -h ~

# 检查权限
ls -la ~/.claude/

# 手动备份
cp ~/.claude/settings.json ~/.claude/settings.json.manual-backup
```

### 配置丢失

如果配置丢失：

1. **查找备份**：在备份目录中查找最近的备份
2. **恢复备份**：复制备份文件到原始位置
3. **重新初始化**：如果备份不可用，可以重新运行初始化

```bash
# 查找最近的备份
ls -lt ~/.claude/backup/ | head -5

# 恢复最新备份
cp ~/.claude/backup/settings.json.$(ls -t ~/.claude/backup/ | head -1) ~/.claude/settings.json
```

## 相关资源

- [配置管理](../advanced/configuration.md) - 详细的配置管理指南
- [API 提供商预设](../advanced/api-providers.md) - 预配置的 API 提供商
- [CLI 命令](../cli/config-switch.md) - 配置切换命令详解

> 💡 **提示**：合理使用多配置和备份系统，可以让你的开发环境更加稳定和可靠。建议定期备份重要配置，并在团队中统一配置管理策略。