---
title: 版本检查
---

# 版本检查

`zcf check-updates` 用于检测并更新 ZCF 工具链中的各个组件，包括 ZCF 本身、Claude Code、CCR、CCometixLine、Codex 等工具。

> **别名**：可使用同等效果的 `zcf check`（如 `npx zcf check -T cx`）。

## 命令格式

```bash
# 检查所有工具更新（Claude Code 模式）
npx zcf check

# 检查 Codex 相关工具更新
npx zcf check -T cx

# 非交互模式（自动更新，跳过确认）
npx zcf check -s

# 通过主菜单访问
npx zcf
# 然后选择 +. 检查更新
```

## 参数说明

| 参数 | 简写 | 说明 | 可选值 | 默认值 |
|------|------|------|--------|--------|
| `--code-type, -T` | `-T` | 指定工具类型 | `claude-code`, `codex`, `cc`, `cx` | 从 ZCF 配置读取 |
| `--skip-prompt, -s` | `-s` | 跳过交互确认（非交互模式） | 无 | 否（交互模式） |

## 检查的工具

### Claude Code 模式

当 `-T` 为 `cc`（或 `claude-code`）或未指定时，检查以下工具：

1. **CCR (Claude Code Router)**
   - 包名：`@musistudio/claude-code-router`
   - 检查方式：npm registry

2. **Claude Code CLI**
   - 包名：`@anthropic-ai/claude-code`
   - 检查方式：npm registry

3. **CCometixLine**
   - 包名：`@cometix/ccline`
   - 检查方式：npm registry

### Codex 模式

当 `-T` 为 `cx`（或 `codex`）时，检查：

1. **Codex CLI**
   - 检查方式：Codex 官方 API
   - 更新方式：自动下载并安装最新版本

## 工作流程

### 1. 版本检查

对每个工具执行以下检查：

1. 检测工具是否已安装
2. 获取当前安装的版本号
3. 从官方源获取最新版本号
4. 比较版本并判断是否需要更新

### 2. 更新提示

对于需要更新的工具，显示：

```
🔍 检查工具更新...

CCR
当前版本：1.2.3
最新版本：1.3.0
需要更新：是

Claude Code
当前版本：2.0.5
最新版本：2.0.5
需要更新：否

CCometixLine
当前版本：1.0.10
最新版本：1.0.12
需要更新：是
```

### 3. 更新确认

在交互模式下，会询问是否更新每个需要更新的工具：

```
? 是否更新 CCR？ (Y/n) 
```

在 `-s` 模式下，自动执行所有更新。

### 4. 执行更新

确认后会执行更新操作：

1. 显示更新进度
2. 执行安装/更新命令
3. 验证更新结果
4. 显示更新摘要

## 使用场景

### 定期更新

建议定期检查更新以获取最新功能和修复：

```bash
# 每周检查一次
npx zcf check
```

### 自动化更新

在 CI/CD 或自动化脚本中使用非交互模式：

```bash
# 自动更新所有工具
npx zcf check -s
```

### 针对性更新

只检查特定工具类型的更新：

```bash
# 只检查 Codex 相关工具
npx zcf check -T cx
```

## 更新策略

### 安全更新建议

1. **备份配置**：更新前先备份当前配置
   ```bash
   # 手动备份
   cp ~/.claude/settings.json ~/.claude/settings.json.backup
   ```

2. **查看变更日志**：了解新版本的变更内容
   - Claude Code：[官方文档](https://docs.claude.com)
   - CCR：[GitHub Releases](https://github.com/musistudio/claude-code-router/releases)

3. **测试环境验证**：如有测试环境，先在测试环境更新

### 更新失败处理

如果更新失败，ZCF 会：

1. 显示错误信息
2. 保留原有版本
3. 提供排查建议

常见失败原因：

- **网络问题**：npm registry 访问失败
  ```bash
  # 检查网络连接
  ping registry.npmjs.org
  ```

- **权限问题**：需要 sudo 权限（macOS/Linux）
  ```bash
  # 使用 sudo 执行
  sudo npx zcf check
  ```

- **端口占用**：服务正在运行无法更新
  ```bash
  # 先停止服务再更新
  ccr stop
  npx zcf check
  ```

## 版本兼容性

### ZCF 版本要求

- **Node.js**：>= 22
- **npm/pnpm**：最新版本

### 工具版本兼容

ZCF 会检查工具之间的版本兼容性，确保：

- CCR 与 Claude Code 版本匹配
- CCometixLine 与 Claude Code 兼容
- Codex CLI 为最新稳定版

## 使用建议

### 更新频率

- **日常使用**：每月检查一次
- **活跃开发**：每两周检查一次
- **生产环境**：更新前先在测试环境验证

### 更新时机

建议在以下时机检查更新：

1. 发现已知 bug 需要修复版本
2. 需要使用新功能
3. 定期维护时间
4. 配置迁移前（确保工具版本最新）

### 更新后验证

更新完成后验证工具是否正常工作：

```bash
# 验证 Claude Code
claude-code --version

# 验证 CCR
ccr status

# 验证 CCometixLine（如果安装）
ccline --version

# 验证 Codex
codex --version
```

## 与 zcf init 联动

`zcf init` 的备份功能可以在更新前自动备份配置：

```bash
# 更新前先初始化（会备份配置）
npx zcf init
# 或手动使用备份功能
npx zcf i -s -r backup
```

## 常见问题

### Q: 检查更新很慢？

A: 
1. 检查网络连接
2. npm registry 访问可能较慢，可使用国内镜像：
   ```bash
   npm config set registry https://registry.npmmirror.com
   ```

### Q: 更新后工具无法使用？

A: 
1. 检查工具是否正确安装：`which ccr`
2. 查看错误日志
3. 尝试重新安装：`npx zcf ccr`（对于 CCR）

### Q: 如何回退到旧版本？

A: 
1. 查看更新前的版本号
2. 手动安装指定版本：
   ```bash
   npm install -g @musistudio/claude-code-router@1.2.3
   ```

### Q: 不想更新某个工具？

A: 在交互模式下选择 "否"，或在配置文件中禁用自动更新（如果支持）。

## 相关文档

- [CCR 管理](ccr.md) - CCR 安装与配置
- [故障排除](../advanced/troubleshooting.md) - 更新相关问题排查
- [初始化指南](init.md) - 配置备份方法
