---
title: 卸载与清理
---

# 卸载与清理

`zcf uninstall` 提供安全的卸载流程，支持选择性卸载、完整卸载和冲突解决。适合需要重置环境、迁移设备或清理配置的场景。

## 功能概述

`zcf uninstall` 命令支持：

1. 🗑️ **选择性卸载**：选择性地删除特定组件
2. 🔄 **完整卸载**：完全移除所有 ZCF 配置和工具
3. 💾 **备份保留**：支持保留备份以便恢复
4. 🔍 **冲突检测**：检测并解决文件冲突
5. 🗂️ **回收站支持**：使用系统回收站安全删除（支持 macOS、Windows、Linux）

## 基本用法

### 交互式模式（推荐）

```bash
# 打开交互式卸载菜单
npx zcf uninstall

# 或通过主菜单
npx zcf
# 然后选择相应的卸载选项
```

交互式模式下，ZCF 会引导你：

1. 选择卸载模式（完整卸载或自定义卸载）
2. 选择要卸载的组件（如果选择自定义）
3. 确认卸载操作
4. 选择是否保留备份

### 完整卸载

完全移除所有 ZCF 相关的配置和工具：

```bash
# 交互式完整卸载
npx zcf uninstall
# 然后选择 "完整卸载"

# 非交互式完整卸载
npx zcf uninstall --mode complete

# 指定语言
npx zcf uninstall --mode complete --lang zh-CN
```

### 自定义卸载

选择性卸载特定组件：

```bash
# 交互式自定义卸载
npx zcf uninstall
# 然后选择 "自定义卸载"，再选择要卸载的组件

# 非交互式自定义卸载（逗号分隔）
npx zcf uninstall --mode custom --items "ccr,backups,cometix"

# 使用数组格式（在代码中）
npx zcf uninstall --mode custom --items '["ccr","backups"]'
```

## 卸载模式

### 完整卸载模式

移除所有 ZCF 相关的配置和工具：

**会删除的内容**：
- ✅ Claude Code 配置（`~/.claude/`）
- ✅ Codex 配置（`~/.codex/`）
- ✅ CCR 配置（`~/.claude-code-router/`）
- ✅ CCometixLine 配置（`~/.cometix/`）
- ✅ ZCF 全局配置（`~/.ufomiao/zcf/`）
- ✅ 所有备份文件

**不会删除的内容**：
- ❌ Claude Code CLI 本身（需要通过其他方式卸载）
- ❌ Codex CLI 本身（需要通过其他方式卸载）
- ❌ 系统级工具和依赖

### 自定义卸载模式

可以选择性地卸载以下组件：

| 组件 | 说明 | 配置位置 |
|------|------|---------|
| `claude-code` | Claude Code 配置 | `~/.claude/` |
| `codex` | Codex 配置 | `~/.codex/` |
| `ccr` | Claude Code Router 配置 | `~/.claude-code-router/` |
| `cometix` | CCometixLine 配置 | `~/.cometix/` |
| `backups` | 所有备份文件 | `~/.claude/backup/`, `~/.codex/backup/` 等 |
| `zcf-config` | ZCF 全局配置 | `~/.ufomiao/zcf/` |

```bash
# 仅卸载 CCR
npx zcf uninstall --mode custom --items ccr

# 卸载多个组件
npx zcf uninstall --mode custom --items "ccr,cometix,backups"

# 卸载所有备份（清理空间）
npx zcf uninstall --mode custom --items backups
```

## 常用参数

| 参数 | 说明 | 可选值 | 默认值 |
|------|------|--------|--------|
| `--mode, -m` | 卸载模式 | `complete`, `custom`, `interactive` | `interactive` |
| `--items, -i` | 要卸载的组件（自定义模式） | 逗号分隔的组件名称或 JSON 数组 | - |
| `--lang, -l` | 界面语言 | `zh-CN`, `en` | `en` |

## 使用场景

### 场景 1：重置开发环境

```bash
# 完整卸载并重新初始化
npx zcf uninstall --mode complete
npx zcf init
```

### 场景 2：清理备份文件

```bash
# 仅清理备份以释放空间
npx zcf uninstall --mode custom --items backups
```

### 场景 3：迁移到新设备

```bash
# 在新设备上重新配置，旧设备清理
# 1. 在新设备上备份配置
cp -r ~/.claude ~/claude-backup
cp -r ~/.codex ~/codex-backup

# 2. 在新设备上初始化
npx zcf init

# 3. 在旧设备上清理
npx zcf uninstall --mode complete
```

### 场景 4：仅移除特定工具

```bash
# 仅卸载 CCR（保留其他配置）
npx zcf uninstall --mode custom --items ccr

# 仅卸载 CCometixLine
npx zcf uninstall --mode custom --items cometix
```

## 备份机制

### 卸载前备份

在执行卸载前，ZCF 会：

1. **创建卸载备份**：将配置备份到临时目录
2. **记录备份位置**：显示备份位置以便恢复
3. **提供恢复选项**：询问是否保留备份

### 恢复备份

如果需要恢复：

```bash
# 查找备份位置
ls -la ~/.claude/backup/
ls -la ~/.codex/backup/

# 手动恢复（示例）
cp -r ~/.claude/backup/backup_2025-01-15_10-30-45/* ~/.claude/
```

## 安全机制

### 交互式确认

所有卸载操作都需要确认：

```
⚠️  警告：此操作将删除以下内容：
   - Claude Code 配置
   - 所有备份文件

   是否继续？ (y/N)
```

### 冲突检测

如果检测到文件冲突：

1. **显示冲突列表**：列出所有冲突的文件
2. **询问处理方式**：选择跳过、覆盖或合并
3. **创建冲突备份**：备份冲突文件以便恢复

### 回收站支持

支持使用系统回收站安全删除：

- ✅ **macOS**：使用系统垃圾桶
- ✅ **Windows**：使用回收站
- ✅ **Linux**：使用 trash-cli（如果安装）

如果系统回收站不可用，会直接删除文件。

## 最佳实践

### 1. 卸载前备份

卸载前建议手动备份重要配置：

```bash
# 备份 Claude Code 配置
tar -czf claude-backup.tar.gz ~/.claude/

# 备份 Codex 配置
tar -czf codex-backup.tar.gz ~/.codex/

# 备份 ZCF 配置
tar -czf zcf-backup.tar.gz ~/.ufomiao/zcf/
```

### 2. 选择性卸载

如果只需要清理部分配置：

```bash
# 清理备份文件（释放空间）
npx zcf uninstall --mode custom --items backups

# 清理特定工具的配置
npx zcf uninstall --mode custom --items ccr
```

### 3. 团队环境

在团队环境中：

- **统一卸载策略**：团队内部统一卸载流程
- **保留关键配置**：保留团队共享的配置模板
- **文档记录**：记录卸载的配置和原因

### 4. 测试环境

在测试或开发环境中：

```bash
# 快速重置测试环境
npx zcf uninstall --mode complete
npx zcf init -s -p 302ai -k "test-key" -g zh-CN
```

## 故障排除

### 卸载失败

如果卸载失败：

1. **检查权限**：确保对配置目录有删除权限
2. **检查文件占用**：确保文件没有被其他进程占用
3. **查看错误信息**：检查终端输出的详细错误

```bash
# 检查权限
ls -la ~/.claude/ ~/.codex/

# 检查进程占用
lsof ~/.claude/  # macOS/Linux
```

### 部分文件未删除

如果部分文件未被删除：

1. **手动删除**：使用系统命令手动删除
2. **检查隐藏文件**：确保删除所有隐藏文件
3. **清理空目录**：删除空目录

```bash
# 手动清理（谨慎使用）
rm -rf ~/.claude/
rm -rf ~/.codex/
rm -rf ~/.ufomiao/zcf/
```

### 恢复备份失败

如果恢复备份失败：

1. **检查备份完整性**：确认备份文件完整
2. **检查权限**：确保有恢复权限
3. **逐步恢复**：逐个文件恢复而非批量恢复

## 与其他操作的区别

| 操作 | `zcf uninstall` | `zcf init --config-action new` |
|------|----------------|-------------------------------|
| **目的** | 完全移除配置 | 重新创建配置 |
| **删除内容** | 删除所有配置和工具 | 仅重置配置，保留工具 |
| **备份** | 可选保留备份 | 自动创建备份 |
| **恢复** | 手动恢复备份 | 自动保留旧配置 |

> 💡 **建议**：
> - 需要完全清理环境时，使用 `zcf uninstall`
> - 需要重置配置但保留工具时，使用 `zcf init --config-action new`

## 相关资源

- [zcf init](init.md) - 重新初始化环境
- [配置管理](../features/multi-config.md) - 备份和恢复机制
- [故障排除](../advanced/troubleshooting.md) - 常见问题解决

> ⚠️ **警告**：卸载操作不可逆，请在执行前确保已备份重要配置。如果只是需要重置部分配置，建议使用 `zcf init` 的 `--config-action` 选项而非完全卸载。