# 配置切换

`zcf config-switch` 用于在多套配置之间快速切换，适合需要区分工作/个人环境的用户。

## 功能

- 扫描 `~/.ufomiao/zcf` 目录下的配置条目。
- 以交互式列表方式选择目标配置。
- 支持针对 Claude Code 与 Codex 分别切换。

## 使用建议

- 将不同配置命名为具象描述（例如 `work`, `personal`, `demo`）。
- 切换前可结合 Worktree 功能备份当前配置。
