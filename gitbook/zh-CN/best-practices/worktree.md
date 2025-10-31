# Worktree 并行开发

ZCF 提供的 `/git-worktree` 指令可大幅降低多任务并行成本。

## 常见指令

```text
/git-worktree add <path> -b <branch>   # 从 main/master 创建新分支
/git-worktree add <path> -o           # 创建并在 IDE 中打开
/git-worktree list                    # 查看所有 worktree
/git-worktree remove <path>           # 删除指定 worktree
/git-worktree prune                   # 清理无效记录
/git-worktree migrate <target> --from <source>  # 迁移未提交内容
/git-worktree migrate <target> --stash         # 迁移 stash 内容
```

## 建议流程

1. 为每个需求创建独立 worktree，避免上下文干扰。
2. 与 `/zcf:workflow` 搭配：在每个 worktree 中独立运行工作流，最终对比结果选择最佳方案。
3. 完成后通过 `/git-worktree remove` 清理，保持目录整洁。
