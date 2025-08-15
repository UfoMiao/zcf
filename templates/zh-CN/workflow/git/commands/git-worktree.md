---
description: 管理 Git worktree，支持 add/list/remove/migrate 操作，默认在 .zcf/ 目录下创建，自动配置 git 忽略规则，支持 IDE 快速打开和内容迁移
allowed-tools: Read(**), Exec(git worktree add, git worktree list, git worktree remove, git worktree prune, git branch, git checkout, git rev-parse, git stash, git cp, code, cursor, webstorm), Write(.git/info/exclude)
argument-hint: <add|list|remove|prune|migrate> [path] [-b <branch>] [-o|--open] [--track] [--guess-remote] [--detach] [--checkout] [--lock] [--migrate-from <source-path>] [--migrate-stash]
# examples:
#   - /git-worktree add feature-ui                     # 创建 worktree，默认询问是否用 IDE 打开
#   - /git-worktree add feature-ui -o                  # 创建 worktree 并直接用 IDE 打开
#   - /git-worktree add hotfix -b fix/login -o         # 创建新分支、worktree 并直接打开 IDE
#   - /git-worktree migrate feature-ui --from main     # 将主分支的未提交内容迁移到 feature-ui worktree
#   - /git-worktree migrate feature-ui --stash         # 将当前 stash 内容迁移到 feature-ui worktree
---

# Claude Command: Git Worktree

**目的**：提供 Git worktree 的快捷操作，默认在 `.zcf/` 目录下管理多个工作树，自动处理 git 忽略配置，支持 IDE 快速打开和跨 worktree 内容迁移。

---

## Usage

```bash
# 添加 worktree（默认在 .zcf/ 下）
/git-worktree add <path>                           # 检出同名分支到 .zcf/<path>，询问是否打开 IDE
/git-worktree add <path> -b <branch>               # 创建新分支并添加 worktree
/git-worktree add <path> -o                        # 创建后直接用 IDE 打开
/git-worktree add <path> -b <branch> --open        # 创建新分支、worktree 并直接打开

# 内容迁移
/git-worktree migrate <target-path> --from <source-path>  # 迁移未提交内容
/git-worktree migrate <target-path> --stash               # 迁移 stash 内容

# 其他操作
/git-worktree list                                 # 显示所有 worktree 状态
/git-worktree remove <path>                        # 删除指定的 worktree
/git-worktree prune                                # 清理无效 worktree 记录
```

### Options

| 选项 | 说明 |
|------|------|
| `add <path>` | 在 `.zcf/<path>` 添加新的 worktree |
| `migrate <target>` | 迁移内容到指定 worktree |
| `list` | 列出所有 worktree 及其状态 |
| `remove <path>` | 删除指定路径的 worktree |
| `prune` | 清理无效的 worktree 引用 |
| `-b <branch>` | 创建新分支并检出到 worktree |
| `-o, --open` | 创建成功后直接用 IDE 打开（跳过询问）|
| `--from <source>` | 指定迁移源路径（migrate 专用）|
| `--stash` | 迁移当前 stash 内容（migrate 专用）|
| `--track` | 设置新分支跟踪对应的远程分支 |
| `--guess-remote` | 自动猜测远程分支进行跟踪 |
| `--detach` | 创建分离 HEAD 的 worktree |
| `--checkout` | 创建后立即检出（默认行为）|
| `--lock` | 创建后锁定 worktree |

---

## What This Command Does

### 1. **环境检查**
   - 通过 `git rev-parse --is-inside-work-tree` 确认在 Git 仓库中

### 2. **忽略规则配置**
   - 检查 `.git/info/exclude` 是否包含 `/.zcf/` 规则
   - 如果不存在，自动添加 `/.zcf/` 到 `.git/info/exclude`

### 3. **Worktree 操作**
   - **add**: 在 `.zcf/<path>` 创建新的 worktree
   - **list**: 显示所有 worktree 的路径、分支和状态
   - **remove**: 安全删除指定的 worktree
   - **prune**: 清理孤立的 worktree 记录

### 4. **🆕 IDE 快速打开功能**
   - **默认行为**：`add` 操作成功后询问是否用 IDE 打开新 worktree
   - **直接打开**：使用 `-o/--open` 参数跳过询问，直接打开
   - **IDE 检测**：自动检测常用 IDE（VS Code、Cursor、WebStorm 等）
   - **智能选择**：基于项目类型和已安装的 IDE 推荐最佳选择

### 5. **🆕 内容迁移功能**
   - **未提交内容迁移**：将一个 worktree 的未提交改动迁移到另一个
   - **Stash 迁移**：将当前 stash 内容应用到目标 worktree
   - **安全检查**：迁移前检查目标 worktree 状态，避免冲突

### 6. **路径处理**
   - 所有相对路径自动添加 `.zcf/` 前缀
   - 绝对路径保持原样
   - 自动创建 `.zcf/` 目录（如果不存在）

### 7. **分支管理**
   - 支持检出现有分支或创建新分支
   - 自动处理远程分支跟踪
   - 提供分支状态和 HEAD 位置信息

---

## Enhanced Features

### 🖥️ **IDE 集成**

**支持的 IDE**
- **VS Code**: `code <path>`
- **Cursor**: `cursor <path>`  
- **WebStorm**: `webstorm <path>`
- **其他**: 可配置自定义 IDE 命令

**打开模式**
```bash
# 默认：创建后询问是否打开
/git-worktree add feature-ui
# 输出：🖥️  是否在 IDE 中打开 .zcf/feature-ui？[y/n]:

# 直接打开：跳过询问
/git-worktree add feature-ui -o
# 输出：🚀 正在用 VS Code 打开 .zcf/feature-ui...
```

**智能检测流程**
1. 检查系统中已安装的 IDE
2. 基于项目类型推荐（如 Node.js 项目推荐 VS Code）
3. 提供选择菜单让用户选择（默认模式）
4. 记住用户偏好供下次使用

### 📦 **内容迁移系统**

**迁移类型**
```bash
# 从主分支迁移未提交内容
/git-worktree migrate feature-ui --from main

# 从其他 worktree 迁移
/git-worktree migrate hotfix --from .zcf/feature-ui

# 迁移当前 stash
/git-worktree migrate feature-ui --stash

# 迁移指定 stash
/git-worktree migrate feature-ui --stash stash@{2}
```

**迁移流程**
1. **源检查**：验证源路径存在且有未提交内容
2. **目标检查**：确保目标 worktree 工作区干净
3. **内容分析**：显示即将迁移的文件和改动
4. **安全迁移**：使用 git 原生命令确保数据安全
5. **结果确认**：显示迁移结果和后续建议

---

## Safety Features

- **路径检查**：防止在已存在的目录创建 worktree
- **分支冲突检查**：避免同一分支被多个 worktree 检出
- **自动清理**：remove 操作会同时清理目录和 git 引用
- **状态显示**：清晰显示每个 worktree 的分支、提交和状态

### **迁移安全保护**
- **冲突检测**：迁移前检查是否会产生文件冲突
- **备份机制**：迁移前自动创建 stash 备份
- **回滚支持**：提供迁移失败时的回滚方案
- **状态验证**：确保源和目标 worktree 处于正确状态

### **IDE 集成安全**
- **路径验证**：确保 IDE 命令使用正确的路径
- **权限检查**：验证 IDE 可执行文件的权限
- **错误处理**：IDE 启动失败时的友好错误提示

---

## Examples

### **基础使用 + IDE 打开**
```bash
# 创建 worktree 并询问 IDE 打开（默认行为）
/git-worktree add feature-ui
# 输出：
# ✅ Worktree created at .zcf/feature-ui
# 🖥️  检测到以下 IDE：
#    1. VS Code (推荐)
#    2. Cursor
# 是否在 IDE 中打开此 worktree？[1/2/n]: 1
# 🚀 正在用 VS Code 打开 .zcf/feature-ui...

# 创建 worktree 并直接打开 IDE
/git-worktree add feature-ui -o
# 输出：
# ✅ Worktree created at .zcf/feature-ui
# 🚀 正在用 VS Code 打开 .zcf/feature-ui...

# 创建新分支并直接打开
/git-worktree add hotfix -b fix/login --open
# 输出：
# ✅ Created branch 'fix/login' and worktree at .zcf/hotfix
# 🚀 正在用 VS Code 打开 .zcf/hotfix...
```

### **内容迁移场景**
```bash
# 场景：在 main 分支开发了一些功能，想移到新分支
# 1. 创建新的 feature worktree
/git-worktree add feature-ui -b feature/new-ui

# 2. 将 main 的未提交内容迁移过去
/git-worktree migrate feature-ui --from main
# 输出：
# 📦 发现以下未提交内容：
#    M  src/components/Button.tsx
#    A  src/components/Modal.tsx
#    ??  src/styles/new-theme.css
# 🔄 迁移到 .zcf/feature-ui...
# ✅ 迁移完成！建议在新 worktree 中提交这些改动。

# 3. 询问是否打开 IDE（因为创建时没有使用 -o）
# 🖥️  是否在 IDE 中打开 .zcf/feature-ui？[y/n]: y
```

### **Stash 迁移**
```bash
# 当前有一些 stash，想应用到特定 worktree
/git-worktree migrate hotfix --stash
# 输出：
# 📋 发现以下 stash：
#    stash@{0}: WIP on main: fix user login
#    stash@{1}: WIP on main: update docs
# 选择要迁移的 stash [0/1]: 0
# 🔄 正在将 stash@{0} 应用到 .zcf/hotfix...
# ✅ Stash 内容已成功应用！
```

### **列出和管理 worktree**
```bash
# 查看所有 worktree
/git-worktree list
# 输出：
# /path/to/project                    [main]     ← 主工作树
# /path/to/project/.zcf/feature-ui    [feature/new-ui]
# /path/to/project/.zcf/hotfix        [fix/login]

# 删除不需要的 worktree
/git-worktree remove feature-ui
# 输出：
# ✅ Worktree .zcf/feature-ui removed successfully

# 清理无效引用
/git-worktree prune
# 输出：
# 🧹 Pruned 0 worktree entries
```

---

## Directory Structure

使用此命令后，项目结构会是：
```
your-project/
├── .git/
├── .zcf/                    # worktree 目录（被 git 忽略）
│   ├── feature-ui/          # feature-ui 分支的工作树
│   ├── hotfix/              # hotfix 分支的工作树
│   ├── debug/               # debug 用的工作树
│   └── .worktree-config     # worktree 配置文件
├── src/                     # 主工作树的源码
└── package.json             # 主工作树的文件
```

---

## Configuration

### **IDE 偏好设置**
命令会在 `.zcf/.worktree-config` 中保存用户偏好：
```json
{
  "preferredIDE": "code",
  "autoOpenIDE": false,
  "migrateBackup": true,
  "defaultWorktreeDir": ".zcf"
}
```

### **自定义 IDE 命令**
```bash
# 设置自定义 IDE
git config worktree.ide.custom "subl %s"  # Sublime Text
git config worktree.ide.preferred "custom"
```

---

## Notes

- **性能优化**：worktree 共享 `.git` 目录，节省磁盘空间
- **IDE 支持**：大多数现代 IDE 都支持多 worktree 项目
- **清理建议**：定期运行 `prune` 清理无效引用
- **分支保护**：避免在受保护分支（如 main/master）上操作
- **迁移限制**：只能迁移未提交的改动，已提交的内容需要使用 `git cherry-pick`
- **IDE 要求**：需要 IDE 的命令行工具已安装并在 PATH 中
- **跨平台支持**：IDE 检测和启动支持 Windows、macOS、Linux

---