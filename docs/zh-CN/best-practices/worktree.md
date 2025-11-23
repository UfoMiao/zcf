---
title: Worktree 并行开发
---

# Worktree 并行开发

Git Worktree 是 Git 的一个强大功能，允许您在同一仓库中创建多个工作区（副本），每个工作区可以切换不同的分支，互不干扰，共享同一套 Git 历史。ZCF 提供的 `/git-worktree` 智能指令让 Worktree 管理变得简单直观。

## 什么是 Worktree

Worktree 可以很方便地创建一个项目的工作区（副本），并且切换不同的分支，两个工作区互不干扰，并且使用的是一套 Git 历史。

### Worktree 的优势

1. **并行开发**：可以在多个工作区同时进行不同的任务
2. **上下文隔离**：每个工作区有独立的文件系统，互不影响
3. **快速切换**：无需频繁切换分支，直接在不同工作区工作
4. **IDE 集成**：每个工作区可以在不同的 IDE 窗口中打开

### 适用场景

- **多任务并行**：同时开发多个功能或修复多个 bug
- **A/B 测试**：比较不同实现方案的效果
- **代码审查**：在独立工作区审查代码，不影响主分支
- **实验性开发**：安全地进行实验性改动

## 基本命令

ZCF 的 `/git-worktree` 指令提供了完整的 Worktree 管理功能：

### 创建 Worktree

```text
# 基本创建：从 main/master 创建名为 <path> 的新分支
/git-worktree add <path>

# 创建指定名称的分支
/git-worktree add <path> -b <branch>

# 创建并直接用 IDE 打开（推荐）
/git-worktree add <path> -o
```

**示例**：
```
/git-worktree add feat/add-i18n -o
/git-worktree add bugfix/login-error -b fix/login
```

### 查看和管理

```text
# 显示所有 worktree 状态
/git-worktree list

# 删除指定的 worktree
/git-worktree remove <path>

# 清理无效 worktree 记录
/git-worktree prune
```

**示例**：
```
/git-worktree list
/git-worktree remove feat/test
```

### 内容迁移

```text
# 迁移未提交内容
/git-worktree migrate <target> --from <source>

# 迁移 stash 内容
/git-worktree migrate <target> --stash
```

**示例**：
```
/git-worktree migrate feat/new-feature --from feat/old-feature
/git-worktree migrate main --stash
```

## 使用技巧

### 自然语言执行

ZCF 的 `/git-worktree` 指令支持自然语言，不需要记住命令细节：

✅ **推荐使用自然语言**：
```
/git-worktree test 并打开
/git-worktree 加一个feat/add-i18n，删掉test分支和工作树
/git-worktree 把test2暂存区内容迁移到当前分支
```

❌ **不需要这样**：
```bash
git worktree add ../.zcf/project-name/feat/test -b feat/test
```

### 工作区位置

ZCF 的 Worktree 默认创建在项目平级的 `../.zcf/项目名/` 目录下，避免混乱：

```
项目目录/
├── src/
└── ...

.zcf/
└── 项目名/
    ├── feat/add-i18n/
    ├── bugfix/login-error/
    └── ...
```

**优势**：
- 不在项目目录内创建，保持项目整洁
- 统一的命名规范，易于管理
- 支持 IDE 自动打开

## 与 ZCF 工作流配合

### 多线并行 + SL 回档大法

众所周知，现在的 AI 生成的代码具有一定的随机性，同样的提示词生成的代码质量也不一样。如何获取更高质量的代码？

**解决方案：多线并行 + SL 回档大法**

#### 多线并行

使用 `/git-worktree` 新建多个工作区，然后分别启动 Claude Code，同时执行相同或不同的工作流指令完成同一个任务；最后比较结果选择最优的一个。

**步骤**：
1. 创建多个 Worktree
   ```
   /git-worktree add solution1 -o
   /git-worktree add solution2 -o
   /git-worktree add solution3 -o
   ```

2. 在每个 Worktree 中运行工作流
   - 在 solution1 中：`/zcf:workflow 开发xxx功能`
   - 在 solution2 中：`/zcf:workflow 开发xxx功能，要求高性能`
   - 在 solution3 中：`/zcf:workflow 开发xxx功能，要求简洁代码`

3. 比较结果，选择最优方案

#### SL 回档大法

生成结果偏差太大，不建议继续让 AI 继续在其之上修改，可以：

1. **分析遗漏或跑偏的内容**
2. **直接回滚到最初状态**
3. **补充新的限制和上下文到最初的提示词中**
   - 提示词可以是文档和图片
   - 可以参考其他工作区的实现

**示例流程**：
```
# 工作区1的实现有问题
/git-worktree remove solution1

# 创建新的工作区，改进提示词
/git-worktree add solution1-v2 -o

# 在新工作区中，引用工作区2的经验
/zcf:workflow 开发xxx功能，参考solution2的实现，但要避免xxx问题
```

### 与 ZCF 工作流搭配

在每个 Worktree 中独立运行工作流：

1. **研究阶段**：在不同 Worktree 中尝试不同的研究方法
2. **实现阶段**：比较不同实现方案的代码质量
3. **优化阶段**：选择最优方案进行优化

```text
# Worktree 1：基础实现
/zcf:workflow 实现用户登录功能

# Worktree 2：优化实现
/zcf:workflow 实现用户登录功能，使用JWT，支持刷新token

# Worktree 3：测试实现
/zcf:workflow 实现用户登录功能，重点考虑安全性
```

## 最佳实践

### 1. 命名规范

使用清晰的命名便于识别：

✅ **推荐**：
- `feat/add-i18n`
- `bugfix/login-error`
- `refactor/api-structure`

❌ **不推荐**：
- `test`, `test2`, `test3`
- `work`, `work2`
- 无意义的随机名称

### 2. 及时清理

完成功能后及时删除不需要的 Worktree：

```text
# 功能合并后删除 Worktree
/git-worktree remove feat/add-i18n
```

### 3. 定期清理无效记录

```text
# 清理已删除但记录还在的 Worktree
/git-worktree prune
```

### 4. 配合配置切换

在不同 Worktree 中使用不同的 API 配置：

```bash
# 主分支使用 GLM 提供商配置
npx zcf config-switch glm-provider

# Worktree 中使用 302.AI 提供商配置
cd ../.zcf/project-name/feat/test
npx zcf config-switch 302ai-provider
```

### 5. 项目进度文档

在每个 Worktree 中让 AI 输出任务进度文档，方便后续在新对话继续：

```text
# 在新 Worktree 中继续任务
/zcf:workflow 继续开发xxx功能，参考之前的进度文档：progress.md
```

## 工作流建议

### 标准开发流程

1. **创建 Worktree**
   ```text
   /git-worktree add feat/feature-name -o
   ```

2. **运行工作流**
   ```text
   /zcf:workflow 开发xxx功能
   ```

3. **测试和优化**
   - 在 Worktree 中测试
   - 如需要，创建新的 Worktree 尝试不同方案

4. **合并代码**
   ```bash
   # 在 Worktree 中提交
   cd ../.zcf/project-name/feat/feature-name
   git add .
   git commit -m "feat: add feature"

   # 回到主分支合并
   cd ../../project-name
   git merge feat/feature-name
   ```

5. **清理 Worktree**
   ```text
   /git-worktree remove feat/feature-name
   ```

### 对比选择流程

1. 创建多个 Worktree 尝试不同方案
2. 在每个 Worktree 中运行工作流
3. 对比结果选择最优方案
4. 合并最优方案的代码
5. 删除其他 Worktree

## VS Code 插件推荐

推一个好用的 Worktree VS Code 插件：

**Git Worktree Manager** - [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=felipecaputo.git-worktree-manager)

功能：
- 图形化管理 Worktree
- 快速创建和切换
- 查看 Worktree 状态

## 注意事项

1. **不要手动删除 Worktree 目录**：应该使用 `/git-worktree remove` 命令
2. **注意路径冲突**：确保 Worktree 路径不与其他目录冲突
3. **定期清理**：删除不需要的 Worktree 释放空间
4. **备份重要更改**：在删除 Worktree 前确保重要更改已提交或备份

## 相关文档

- [Git 智能命令](../workflows/git-commands.md) - 其他 Git 操作命令
- [ZCF 六阶段工作流](../workflows/zcf-workflow.md) - 配合工作流使用
- [配置切换](../cli/config-switch.md) - 在不同 Worktree 中使用不同配置
