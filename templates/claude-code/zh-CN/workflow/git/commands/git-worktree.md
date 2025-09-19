---
description: 管理 Git worktree，在项目平级的 ../.zcf/项目名/ 目录下创建，支持智能默认、IDE 集成和内容迁移
allowed-tools: Read(**), Exec(git worktree add, git worktree list, git worktree remove, git worktree prune, git branch, git checkout, git rev-parse, git stash, git cp, detect-ide, open-ide, which, command, basename, dirname)
argument-hint: <add|list|remove|prune|migrate> [path] [-b <branch>] [-o|--open] [--track] [--guess-remote] [--detach] [--checkout] [--lock] [--migrate-from <source-path>] [--migrate-stash]
# examples:
#   - /git-worktree add feature-ui                     # 从 main/master 创建新分支 'feature-ui'
#   - /git-worktree add feature-ui -o                  # 创建 worktree 并直接用 IDE 打开
#   - /git-worktree add hotfix -b fix/login -o         # 创建新分支 'fix/login'，路径为 'hotfix'
#   - /git-worktree migrate feature-ui --from main     # 将主分支未提交内容迁移到 feature-ui
#   - /git-worktree migrate feature-ui --stash         # 将当前 stash 迁移到 feature-ui
---

# Claude Command: Git Worktree

管理 Git worktree，支持智能默认、IDE 集成和内容迁移，使用结构化的 `../.zcf/项目名/` 路径。

直接执行命令并提供简洁结果。

---

## Usage

```bash
# 基本操作
/git-worktree add <path>                           # 从 main/master 创建名为 <path> 的新分支
/git-worktree add <path> -b <branch>               # 创建指定名称的新分支
/git-worktree add <path> -o                        # 创建并直接用 IDE 打开
/git-worktree list                                 # 显示所有 worktree 状态
/git-worktree remove <path>                        # 删除指定的 worktree
/git-worktree prune                                # 清理无效 worktree 记录

# 内容迁移
/git-worktree migrate <target> --from <source>     # 迁移未提交内容
/git-worktree migrate <target> --stash             # 迁移 stash 内容
```

### Options

| 选项               | 说明                                         |
| ------------------ | -------------------------------------------- |
| `add [<path>]`     | 在 `../.zcf/项目名/<path>` 添加新的 worktree |
| `migrate <target>` | 迁移内容到指定 worktree                      |
| `list`             | 列出所有 worktree 及其状态                   |
| `remove <path>`    | 删除指定路径的 worktree                      |
| `prune`            | 清理无效的 worktree 引用                     |
| `-b <branch>`      | 创建新分支并检出到 worktree                  |
| `-o, --open`       | 创建成功后直接用 IDE 打开（跳过询问）        |
| `--from <source>`  | 指定迁移源路径（migrate 专用）               |
| `--stash`          | 迁移当前 stash 内容（migrate 专用）          |
| `--track`          | 设置新分支跟踪对应的远程分支                 |
| `--guess-remote`   | 自动猜测远程分支进行跟踪                     |
| `--detach`         | 创建分离 HEAD 的 worktree                    |
| `--checkout`       | 创建后立即检出（默认行为）                   |
| `--lock`           | 创建后锁定 worktree                          |

---

## What This Command Does

1. **环境检查**
   - 通过 `git rev-parse --is-inside-work-tree` 验证 Git 仓库
   - 检测是否在主仓库或现有 worktree 中，进行智能路径计算

2. **智能路径管理**
   - 使用 worktree 检测自动从主仓库路径计算项目名
   - 在结构化的 `../.zcf/项目名/<path>` 目录创建 worktree
   - 正确处理主仓库和 worktree 执行上下文

```bash
# worktree 检测的核心路径计算逻辑
get_main_repo_path() {
  local git_common_dir=$(git rev-parse --git-common-dir 2>/dev/null)
  local current_toplevel=$(git rev-parse --show-toplevel 2>/dev/null)

  # 检测是否在 worktree 中
  if [[ "$git_common_dir" != "$current_toplevel/.git" ]]; then
    # 在 worktree 中，从 git-common-dir 推导主仓库路径
    dirname "$git_common_dir"
  else
    # 在主仓库中
    echo "$current_toplevel"
  fi
}

MAIN_REPO_PATH=$(get_main_repo_path)
PROJECT_NAME=$(basename "$MAIN_REPO_PATH")
WORKTREE_BASE="$MAIN_REPO_PATH/../.zcf/$PROJECT_NAME"

# 始终使用绝对路径防止嵌套问题
ABSOLUTE_WORKTREE_PATH="$WORKTREE_BASE/<path>"
```

**关键修复**: 在现有 worktree 内创建新 worktree 时，始终使用绝对路径以防止出现类似 `../.zcf/project/.zcf/project/path` 的路径嵌套问题。

3. **Worktree 操作**
   - **add**: 使用智能分支/路径默认创建新 worktree
   - **list**: 显示所有 worktree 的分支和状态
   - **remove**: 安全删除 worktree 并清理引用
   - **prune**: 清理孤立的 worktree 记录

4. **智能默认**
   - **分支创建**: 未指定 `-b` 时，使用路径名创建新分支
   - **基础分支**: 新分支从 main/master 分支创建
   - **路径解析**: 未指定路径时使用分支名作为路径
   - **IDE 集成**: 自动检测并提示 IDE 打开

5. **内容迁移**
   - 在 worktree 之间迁移未提交改动
   - 将 stash 内容应用到目标 worktree
   - 安全检查防止冲突

6. **安全特性**
   - **路径冲突防护**: 创建前检查目录是否已存在
   - **分支检出验证**: 确保分支未被其他地方使用
   - **绝对路径强制**: 防止在 worktree 内创建嵌套的 `.zcf` 目录
   - **删除时自动清理**: 同时清理目录和 git 引用
   - **清晰的状态报告**: 显示 worktree 位置和分支状态

7. **环境文件处理**
   - **自动检测**: 扫描 `.gitignore` 文件中的环境变量文件模式
   - **智能复制**: 复制 `.gitignore` 中列出的 `.env` 和 `.env.*` 文件
   - **排除逻辑**: 跳过 `.env.example` 等模板文件
   - **权限保护**: 保持原始文件权限和时间戳
   - **用户反馈**: 提供已复制环境文件的清晰状态信息

```bash
# 环境文件复制实现
copy_environment_files() {
    local main_repo="$MAIN_REPO_PATH"
    local target_worktree="$ABSOLUTE_WORKTREE_PATH"
    local gitignore_file="$main_repo/.gitignore"
    
    # 检查 .gitignore 是否存在
    if [[ ! -f "$gitignore_file" ]]; then
        return 0
    fi
    
    local copied_count=0
    
    # 检测 .env 文件
    if [[ -f "$main_repo/.env" ]] && grep -q "^\.env$" "$gitignore_file"; then
        cp "$main_repo/.env" "$target_worktree/.env"
        echo "✅ 已复制 .env"
        ((copied_count++))
    fi
    
    # 检测 .env.* 模式文件（排除 .env.example）
    for env_file in "$main_repo"/.env.*; do
        if [[ -f "$env_file" ]] && [[ "$(basename "$env_file")" != ".env.example" ]]; then
            local filename=$(basename "$env_file")
            if grep -q "^\.env\.\*$" "$gitignore_file"; then
                cp "$env_file" "$target_worktree/$filename"
                echo "✅ 已复制 $filename"
                ((copied_count++))
            fi
        fi
    done
    
    if [[ $copied_count -gt 0 ]]; then
        echo "📋 已从 .gitignore 复制 $copied_count 个环境文件"
    fi
}
```

---

## Enhanced Features

### IDE 集成

- **自动检测**: VS Code → Cursor → WebStorm → Sublime Text → Vim
- **智能提示**: 创建 worktree 后询问是否在 IDE 中打开
- **直接打开**: 使用 `-o` 标志跳过提示直接打开
- **自定义配置**: 通过 git config 配置

### 内容迁移系统

```bash
# 迁移未提交改动
/git-worktree migrate feature-ui --from main
/git-worktree migrate hotfix --from ../other-worktree

# 迁移 stash 内容
/git-worktree migrate feature-ui --stash
```

**迁移流程**:

1. 验证源有未提交内容
2. 确保目标 worktree 干净
3. 显示即将迁移的改动
4. 使用 git 命令安全迁移
5. 确认结果并建议后续步骤

---

## Examples

```bash
# 基本用法
/git-worktree add feature-ui                       # 从 main/master 创建新分支 'feature-ui'
/git-worktree add feature-ui -b my-feature         # 创建新分支 'my-feature'，路径为 'feature-ui'
/git-worktree add feature-ui -o                    # 创建并直接用 IDE 打开

# 内容迁移场景
/git-worktree add feature-ui -b feature/new-ui     # 创建新功能 worktree
/git-worktree migrate feature-ui --from main       # 迁移未提交改动
/git-worktree migrate hotfix --stash               # 迁移 stash 内容

# 管理操作
/git-worktree list                                 # 查看所有 worktree
/git-worktree remove feature-ui                    # 删除不需要的 worktree
/git-worktree prune                                # 清理无效引用
```

**示例输出**:

```
✅ Worktree created at ../.zcf/项目名/feature-ui
✅ 已复制 .env
✅ 已复制 .env.local
📋 已从 .gitignore 复制 2 个环境文件
🖥️ 是否在 IDE 中打开 ../.zcf/项目名/feature-ui？[y/n]: y
🚀 正在用 VS Code 打开 ../.zcf/项目名/feature-ui...
```

---

## Directory Structure

```
parent-directory/
├── your-project/            # 主项目
│   ├── .git/
│   └── src/
└── .zcf/                    # worktree 管理
    └── your-project/        # 项目 worktree
        ├── feature-ui/      # 功能分支
        ├── hotfix/          # 修复分支
        └── debug/           # 调试 worktree
```

---

## Configuration

### IDE 配置

- 支持 VS Code、Cursor、WebStorm、Sublime Text、Vim
- 通过 git config 配置自定义 IDE
- 基于优先级的自动检测选择

### 自定义 IDE 设置

```bash
# 配置自定义 IDE
git config worktree.ide.custom.sublime "subl %s"
git config worktree.ide.preferred "sublime"

# 控制自动检测
git config worktree.ide.autodetect true  # 默认
```

---

## Notes

- **性能**: worktree 共享 `.git` 目录，节省磁盘空间
- **安全**: 路径冲突防护和分支检出验证
- **迁移**: 仅限未提交改动；已提交内容需使用 `git cherry-pick`
- **IDE 要求**: 命令行工具必须在 PATH 中
- **跨平台**: 支持 Windows、macOS、Linux
- **环境文件**: 自动复制 `.gitignore` 中列出的环境文件到新 worktree
- **文件排除**: 模板文件如 `.env.example` 仅保留在主仓库中

---
