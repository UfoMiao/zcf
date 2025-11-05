---
title: Git 智能命令
---

# Git 智能命令

Git 工作流提供了一系列智能 Git 操作命令，简化版本控制流程。

## 命令列表

| 命令 | Claude Code | Codex | 说明 |
|------|------------|-------|------|
| **智能提交** | `/git-commit` | `/prompts:git-commit` | 智能生成提交信息并拆分提交 |
| **安全回滚** | `/git-rollback` | `/prompts:git-rollback` | 安全回滚到指定提交 |
| **清理分支** | `/git-cleanBranches` | `/prompts:git-cleanBranches` | 清理已合并分支 |
| **工作树管理** | `/git-worktree` | `/prompts:git-worktree` | 管理 Git Worktree，支持创建、迁移、删除 |

> 💡 **提示**：Codex 使用 `/prompts:` 前缀，而 Claude Code 直接使用 `/` 前缀。

## 命令详解

### `/git-commit` / `/prompts:git-commit`

智能 Git 提交命令，功能包括：

- 🔍 **自动分析改动**：使用 Git 分析代码变更
- ✍️ **生成提交信息**：自动生成符合 Conventional Commits 规范的提交信息
- 🎨 **可选 Emoji**：支持在提交信息中添加 emoji
- 📦 **智能拆分**：必要时建议拆分提交，保持提交原子性
- ✅ **Git 钩子**：默认运行本地 Git 钩子（可用 `--no-verify` 跳过）

**使用示例**：
```
/git-commit
# 或 Codex 中：
/prompts:git-commit
```

### `/git-rollback` / `/prompts:git-rollback`

安全回滚命令，功能包括：

- 📋 **列出分支**：显示所有可用的分支
- 🔍 **列出版本**：显示指定分支的提交历史
- ⚠️ **二次确认**：执行前要求用户确认
- 🔄 **执行回滚**：支持 `reset` 和 `revert` 两种方式
- 💾 **备份机制**：回滚前自动备份

**使用示例**：
```
/git-rollback
# 或 Codex 中：
/prompts:git-rollback
```

### `/git-cleanBranches` / `/prompts:git-cleanBranches`

安全清理已合并分支，功能包括：

- 🔍 **查找分支**：自动查找已合并或过期的 Git 分支
- 🧪 **Dry-run 模式**：支持预览模式，先查看将要删除的分支
- ⚙️ **自定义配置**：支持自定义基准分支和保护分支
- 🛡️ **安全机制**：防止误删重要分支

**使用示例**：
```
/git-cleanBranches
# 或 Codex 中：
/prompts:git-cleanBranches
```

### `/git-worktree` / `/prompts:git-worktree`

Git 工作树管理，功能包括：

- 📁 **智能默认**：在项目平级的 `../.zcf/项目名/` 目录下创建工作树
- 🔧 **IDE 集成**：自动配置 IDE 打开新工作树
- 📦 **内容迁移**：支持将现有内容迁移到工作树
- 🔄 **完整管理**：支持创建、迁移、删除等完整操作

**使用示例**：
```
/git-worktree 新建 feat/add-i18n 并打开
# 或 Codex 中：
/prompts:git-worktree 新建 feat/add-i18n 并打开
```

## 使用技巧

- 通过自然语言描述即可让 AI 执行多个 Git 操作
- 搭配 `best-practices/worktree.md` 可大幅提升多任务并行效率
- 在项目初始化后，建议先运行 `/init-project`（Claude Code）生成项目配置

> ⚠️ **注意**：项目初始化工具（init-project）仅在 Claude Code 中提供，Codex 暂不支持
