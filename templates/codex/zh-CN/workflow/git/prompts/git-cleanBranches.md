---
description: 安全查找并清理已合并或过期的 Git 分支，支持 dry-run 模式与自定义基准/保护分支
allowed-tools: Read(**), Exec(git fetch, git config, git branch, git remote, git push, git for-each-ref, git log), Write()
argument-hint: [--base <branch>] [--stale <days>] [--remote] [--force] [--dry-run] [--yes]
# examples:
#   - /git-cleanBranches --dry-run
#   - /git-cleanBranches --base release/v2.1 --stale 90
#   - /git-cleanBranches --remote --yes
---

# Claude Command: Clean Branches

该命令**安全地**识别并清理**已合并**或**长期未更新 (stale)** 的 Git 分支。
默认以**只读预览 (`--dry-run`)** 模式运行，需明确指令才会执行删除操作。

---

## Usage

```bash
# [最安全] 预览将要清理的分支，不执行任何删除
/git-cleanBranches --dry-run

# 清理已合并到 main 且超过 90 天未动的本地分支 (需逐一确认)
/git-cleanBranches --stale 90

# 清理已合并到 release/v2.1 的本地与远程分支 (自动确认)
/git-cleanBranches --base release/v2.1 --remote --yes

# [危险] 强制删除一个未合并的本地分支
/git-cleanBranches --force outdated-feature
```

### Options

- `--base <branch>`：指定清理的基准分支（默认为仓库的 `main`/`master`）。
- `--stale <days>`：清理超过指定天数未提交的分支（默认不启用）。
- `--remote`：同时清理远程已合并/过期的分支。
- `--dry-run`：**默认行为**。仅列出将要删除的分支，不执行任何操作。
- `--yes`：跳过逐一确认的步骤，直接删除所有已识别的分支（适合 CI/CD）。
- `--force`：使用 `-D` 强制删除本地分支（即使未合并）。

---

## What This Command Does

1. **配置与安全预检**
   - **更新信息**：自动执行 `git fetch --all --prune`，确保分支状态最新。
   - **读取保护分支**：从 Git 配置读取不应被清理的分支列表（见下文“Configuration”）。
   - **确定基准**：使用 `--base` 参数或自动识别的 `main`/`master` 作为比较基准。

2. **分析识别（Find）**
   - **已合并分支**：找出已完全合并到 `--base` 的本地（及远程，如加 `--remote`）分支。
   - **过期分支**：如指定 `--stale <days>`，找出最后一次提交在 N 天前的分支。
   - **排除保护分支**：从待清理列表中移除所有已配置的保护分支。

3. **报告预览（Report）**
   - 清晰列出“将要删除的已合并分支”与“将要删除的过期分支”。
   - 若无 `--yes` 参数，**命令到此结束**，等待用户确认后再次执行（不带 `--dry-run`）。

4. **执行清理（Execute）**
   - **仅在不带 `--dry-run` 且用户确认后**（或带 `--yes`）执行。
   - 逐一删除已识别的分支，除非用户在交互式确认中选择跳过。
   - 本地用 `git branch -d <branch>`；远程用 `git push origin --delete <branch>`。
   - 若指定 `--force`，本地删除会改用 `git branch -D <branch>`。

---

## Configuration (一次配置，永久生效)

为防止误删重要分支（如 `develop`, `release/*`），请在仓库的 Git 配置中添加保护规则。命令会自动读取。

```bash
# 保护 develop 分支
git config --add branch.cleanup.protected develop

# 保护所有 release/ 开头的分支 (通配符)
git config --add branch.cleanup.protected 'release/*'

# 查看所有已配置的保护分支
git config --get-all branch.cleanup.protected
```

---

## Best Practices for Embedded Devs

- **优先 `--dry-run`**：养成先预览再执行的习惯。
- **活用 `--base`**：维护长期 `release` 分支时，用它来清理已合并到该 release 的 `feature` 或 `hotfix` 分支。
- **谨慎 `--force`**：除非你百分百确定某个未合并分支是无用功，否则不要强制删除。
- **团队协作**：在清理共享的远程分支前，先在团队频道通知一声。
- **定期运行**：每月或每季度运行一次，保持仓库清爽。

---

## Why This Version Is Better

- ✅ **更安全**：默认只读预览，且有可配置的保护分支列表。
- ✅ **更灵活**：支持自定义基准分支，完美适配 `release` / `develop` 工作流。
- ✅ **更兼容**：避免了在不同系统上行为不一的 `date -d` 等命令。
- ✅ **更直观**：将复杂的 16 步清单，浓缩成一个带安全选项的、可直接执行的命令。
- ✅ **风格一致**：与 `/commit` 命令共享相似的参数设计与文档结构。
