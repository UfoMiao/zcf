---
title: 配置切换
---

# 配置切换

`zcf config-switch` 用于在多套 API 配置之间快速切换，适合在不同项目使用不同 API 提供商的用户。

> **别名**：可以使用 `zcf cs` 这一简写，所有示例都可改写为 `npx zcf cs --list` 等形式。

## 命令格式

```bash
# 交互式切换（推荐）
npx zcf cs

# 列出所有可用配置
npx zcf cs --list

# 直接切换到指定配置（Claude Code）
npx zcf cs provider1

# 指定工具类型（支持简写 -T cc/cx）
npx zcf cs --list -T cc      # 列出 Claude Code 配置
npx zcf cs --list -T cx      # 列出 Codex 配置
npx zcf cs provider1 -T cx   # 切换 Codex 配置
```

## 参数说明

| 参数 | 说明 | 可选值 | 默认值 |
|------|------|--------|--------|
| `--code-type`, `-T` | 指定工具类型 | `claude-code` (cc), `codex` (cx) | 从 ZCF 配置读取 |
| `--list`, `-l` | 仅列出配置，不切换 | 无 | 否 |
| `目标配置` | 直接指定要切换的配置名称 | 配置名称或 ID | 无 |

## 功能特性

### Claude Code 配置切换

支持切换以下类型的配置：

1. **官方登录**：使用 Claude 官方 OAuth 登录
2. **CCR 代理**：使用 Claude Code Router 代理
3. **自定义配置**：通过 `zcf init` 创建的多 API 配置

**配置来源**：
- 配置文件：`~/.claude/settings.json`
- Profile 管理：每个配置作为独立的 Profile 存储
- 当前配置标识：`currentProfileId` 字段

### Codex 配置切换

支持切换 Codex 的模型提供商：

1. **官方登录**：使用 Codex 官方 OAuth 登录
2. **自定义提供商**：通过 `zcf init` 配置的提供商（如 302.AI、GLM 等）

**配置来源**：
- 配置文件：`~/.codex/config.toml`
- Provider 列表：从配置文件中读取已配置的提供商

## 使用方式

### 交互式切换

最常用的方式，通过交互式菜单选择配置：

```bash
npx zcf cs
```

**Claude Code 交互界面**：
```
? 选择 Claude Code 配置：
  ❯ ● 使用官方登录 (current)
    CCR 代理
    GLM Provider (glm-provider)
    302.AI Provider (302ai-provider)
    MiniMax Provider (minimax-provider)
```

**Codex 交互界面**：
```
? 选择 Codex 提供商：
  ❯ ● 使用官方登录 (current)
    302.AI 提供商
    GLM 提供商
    MiniMax 提供商
```

### 列出所有配置

查看当前可用的所有配置：

```bash
# Claude Code 配置
npx zcf cs --list -T cc

# Codex 配置
npx zcf cs --list -T cx
```

**输出示例**：
```
可用的 Claude Code 配置：

1. 官方登录 (current)
2. CCR 代理
3. GLM Provider - glm-provider
4. 302.AI Provider - 302ai-provider
```

### 直接切换

如果知道配置名称，可以直接切换：

```bash
# 切换到指定 Profile（使用渠道英文名）
npx zcf cs glm-provider

# Codex 切换提供商
npx zcf cs glm-provider -T cx
```

**支持匹配方式**：
- 配置 ID（如 `glm-provider`）
- 配置名称（如 `GLM Provider`）

## 配置管理

### 创建多配置

在初始化时创建多个 API 配置：

```bash
# 使用多配置参数
npx zcf init --api-configs '[
  {
    "name": "GLM Provider",
    "provider": "glm",
    "type": "api_key",
    "key": "sk-glm-xxx",
    "primaryModel": "glm-4"
  },
  {
    "name": "302.AI Provider",
    "provider": "302ai",
    "type": "api_key",
    "key": "sk-302ai-xxx",
    "primaryModel": "claude-sonnet-4-5"
  }
]'
```

### 配置命名建议

推荐使用渠道（Provider）的英文名称，便于识别和管理：

✅ **推荐**：
- `glm-provider` - GLM 提供商
- `302ai-provider` - 302.AI 提供商
- `minimax-provider` - MiniMax 提供商
- `kimi-provider` - Kimi 提供商
- `packycode-provider` - PackyCode 提供商

❌ **不推荐**：
- `工作环境`、`个人开发` 等非英文名称
- `config1`, `config2` 等无意义名称
- `default`, `new` 等通用名称
- 无意义的随机字符串

### 切换后的效果

切换配置后会：

1. **更新主配置**：修改 `settings.json` 或 `config.toml` 中的 API 设置
2. **应用配置项**：包括 API URL、密钥、模型选择等
3. **显示切换结果**：成功或失败提示

**注意**：
- 切换不会删除原配置，只是改变当前使用的配置
- 所有配置都保存在同一个配置文件中
- 可以随时切换回之前的配置

## 使用场景

### 1. 不同项目使用不同 API 提供商

```bash
# 项目 A 使用 GLM
npx zcf cs glm-provider

# 项目 B 使用 302.AI
npx zcf cs 302ai-provider

# 项目 C 使用 MiniMax
npx zcf cs minimax-provider
```

### 2. 测试新配置

```bash
# 切换到测试配置
npx zcf cs kimi-provider

# 测试完成后切换回去
npx zcf cs glm-provider
```

### 3. 切换 Codex 提供商

```bash
# 列出 Codex 提供商
npx zcf cs -T cx --list

# 切换到指定提供商
npx zcf cs glm-provider -T cx
```

## 最佳实践

### 配置组织

1. **按提供商分类**：GLM、302.AI、MiniMax、Kimi、PackyCode
2. **使用标准命名**：`{provider}-provider` 格式（如 `glm-provider`）
3. **保持一致性**：同一提供商在不同项目中保持相同的配置名称

### 切换前准备

1. **保存当前工作**：确保没有未保存的更改
2. **验证配置**：切换后测试 API 是否正常
3. **记录切换**：在团队中记录配置切换情况

### 与 Worktree 配合

在不同 Worktree 中使用不同配置：

```bash
# 主分支使用 GLM 配置
npx zcf cs glm-provider

# 创建功能分支 Worktree
/git-worktree add feat/new-feature -o

# 在功能分支中切换配置
cd ../.zcf/project-name/feat/new-feature
npx zcf cs 302ai-provider
```

## 常见问题

### Q: 切换后配置不生效？

A: 
1. 重启 Claude Code 或 Codex
2. 检查配置文件是否正确更新
3. 验证 API 密钥是否有效

### Q: 如何添加、编辑或删除配置？

A: 您可以通过 ZCF 主菜单进行全面管理：

1. 运行 `npx zcf` 进入主菜单
2. 选择 **"3. API 配置"**
3. 选择 **"自定义 API 配置"**

在此菜单中，您可以直观地进行**添加**、**编辑**、**删除**和**复制**配置操作。

### Q: 切换配置会丢失数据吗？

A: 不会。切换只是改变当前使用的 API 配置，不会删除任何数据或配置。

### Q: Codex 和 Claude Code 的配置是独立的吗？

A: 是的。两者使用不同的配置文件（`~/.codex/config.toml` 和 `~/.claude/settings.json`），可以分别管理。

## 相关文档

- [多配置与备份](../features/multi-config.md) - 多配置系统详解
- [初始化指南](init.md) - 创建多配置的方法
- [Worktree 并行开发](../best-practices/worktree.md) - 配合 Worktree 使用
