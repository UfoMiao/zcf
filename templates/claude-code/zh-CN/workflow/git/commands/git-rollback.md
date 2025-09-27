---
description: 交互式回滚 Git 分支到历史版本；列分支、列版本、二次确认后执行 reset / revert
allowed-tools: Read(**), Exec(git fetch, git branch, git tag, git log, git reflog, git checkout, git reset, git revert, git switch), Write()
argument-hint: [--branch <branch>] [--target <rev>] [--mode reset|revert] [--depth <n>] [--dry-run] [--yes]
# examples:
#   - /git-rollback                # 全交互模式，dry‑run
#   - /git-rollback --branch dev   # 直接选 dev，其他交互
#   - /git-rollback --branch dev --target v1.2.0 --mode reset --yes
---

# Claude Command: Git Rollback

**目的**：安全、可视地将指定分支回滚到旧版本。
默认处于 **只读预览 (`--dry-run`)**；真正执行需加 `--yes` 或在交互中确认。

---

## Usage

```bash
# 纯交互：列出分支 → 选分支 → 列最近 20 个版本 → 选目标 → 选择 reset 或 revert → 二次确认
/git-rollback

# 指定分支，其他交互
/git-rollback --branch feature/calculator

# 指定分支与目标 commit，并用 hard‑reset 一键执行（危险）
/git-rollback --branch main --target 1a2b3c4d --mode reset --yes

# 只想生成 revert 提交（非破坏式回滚），预览即可
/git-rollback --branch release/v2.1 --target v2.0.5 --mode revert --dry-run
```

### Options

| 选项                   | 说明                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `--branch <branch>`    | 要回滚的分支；缺省时交互选择。                                                     |
| `--target <rev>`       | 目标版本（commit Hash、Tag、reflog 引用都行）；缺省时交互选择近 `--depth` 条记录。 |
| `--mode reset\|revert` | `reset`：硬回滚历史；`revert`：生成反向提交保持历史完整。默认询问。                |
| `--depth <n>`          | 在交互模式下列出最近 n 个版本（默认 20）。                                         |
| `--dry-run`            | **默认开启**，只预览即将执行的命令。                                               |
| `--yes`                | 跳过所有确认直接执行，适合 CI/CD 脚本。                                            |

---

## 交互流程

1. **同步远端** → `git fetch --all --prune`
2. **列分支** → `git branch -a`（本地＋远端，过滤受保护分支）
3. **选分支** → 用户输入或传参
4. **列版本** → `git log --oneline -n <depth>` + `git tag --merged` + `git reflog -n <depth>`
5. **选目标** → 用户输入 commit hash / tag
6. **选模式** → `reset` 或 `revert`
7. **最终确认** （除非 `--yes`）
8. **执行回滚**
   - `reset`：`git switch <branch> && git reset --hard <target>`
   - `revert`：`git switch <branch> && git revert --no-edit <target>..HEAD`
9. **推送建议** → 提示是否 `git push --force-with-lease`（reset）或普通 `git push`（revert）

---

## 安全护栏

- **备份**：执行前自动在 reflog 中记录当前 HEAD，可用 `git switch -c backup/<timestamp>` 恢复。
- **保护分支**：如检测到 `main` / `master` / `production` 等受保护分支且开启 `reset` 模式，将要求额外确认。
- **--dry-run 默认开启**：防止误操作。
- **--force 禁止**：不提供 `--force`；如需强推，请手动输入 `git push --force-with-lease`。

---

## 适用场景示例

| 场景                                            | 调用示例                                                         |
| ----------------------------------------------- | ---------------------------------------------------------------- |
| 热修补丁上线后发现 bug，需要回到 Tag `v1.2.0`   | `/git-rollback --branch release/v1 --target v1.2.0 --mode reset` |
| 运维同事误推了 debug 日志提交，需要生成反向提交 | `/git-rollback --branch main --target 3f2e7c9 --mode revert`     |
| 调研历史 bug，引导新人浏览分支历史              | `/git-rollback` （全交互，dry‑run）                              |

---

## 注意

1. **reset vs revert**
   - **reset** 会改变历史，需要强推并可能影响其他协作者，谨慎使用。
   - **revert** 更安全，生成新提交保留历史，但会增加一次记录。
2. **嵌入式仓库** 常有大体积二进制文件；回滚前请确保 LFS/子模块状态一致。
3. 若仓库启用了 CI 强制校验，回滚后可能自动触发流水线；确认管控策略以免误部署旧版本。

---
