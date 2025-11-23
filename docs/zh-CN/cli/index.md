---
title: 命令概览
---

# 命令概览

ZCF CLI 基于 `cac` 实现，所有命令均可通过 `npx zcf <command>` 调用。常用命令如下：

| 命令 | 说明 |
| --- | --- |
| `zcf` | 打开交互式菜单，聚合所有功能 |
| `zcf init` / `zcf i` | 完整初始化，覆盖 Claude Code 或 Codex |
| `zcf update` / `zcf u` | 更新工作流与模板，可选择语言与输出样式 |
| `zcf ccr` | 管理 Claude Code Router 代理 |
| `zcf ccu` | Claude Code 使用分析与统计 |
| `zcf uninstall` | 卸载配置并可选择保留备份 |
| `zcf config-switch` / `zcf cs` | 在多套配置之间切换 |
| `zcf check-updates` / `zcf check` | 检查并升级工具链 |

每个命令均支持 `--help` 查看详细参数。以下章节将逐一说明。
