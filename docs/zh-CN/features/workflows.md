---
title: 工作流系统
---

# 工作流系统

ZCF 通过 `WORKFLOW_CONFIG_BASE` 预置多套工作流，并在初始化或更新时自动导入：

## 预置工作流一览

| ID | 分类 | 默认 | 指令文件 | 描述 | Claude Code | Codex |
| --- | --- | --- | --- | --- | ----------- | ----- |
| `commonTools` | common | 是 | `init-project.md` | 提供项目初始化与常用工具指令 | ✅ | ❌ |
| `sixStepsWorkflow` | sixStep | 是 | `workflow.md` | 六阶段结构化开发工作流（研究→构思→计划→执行→优化→评审） | ✅ | ✅ |
| `featPlanUx` | plan | 是 | `feat.md` | 功能开发工作流，包含规划与 UI/UX 代理 | ✅ | ❌ |
| `gitWorkflow` | git | 是 | `git-commit.md` 等 | Git 提交、回滚、清理、worktree 管理 | ✅ | ✅ |
| `bmadWorkflow` | bmad | 是 | `bmad-init.md` | BMad 敏捷流程入口 | ✅ | ❌ |

> ⚠️ **注意**：Codex 目前仅支持 `sixStepsWorkflow`（六阶段工作流）和 `gitWorkflow`（Git 工作流），其他工作流暂未在 Codex 中提供。

## 安装与更新

- `zcf init` 默认导入全部工作流，用户可通过 `--workflows` 选择性安装。
- `zcf update` 在模板更新后会再次执行工作流导入，确保内容同步。
- 工作流文件会自动安装到 Claude Code/Codex 的 `prompts/workflows/` 目录。

## 代理自动安装

- 对于要求代理的工作流（如 `featPlanUx`），ZCF 会同步复制 `agents/planner.md`、`agents/ui-ux-designer.md`。
- 支持根据 `autoInstallAgents` 字段自动处理。

## 命令格式

ZCF 工作流在不同工具中使用不同的命令前缀：

| 工具 | 命令前缀 | 示例 |
|------|---------|------|
| **Claude Code** | `/zcf:` 或 `/` | `/zcf:workflow`, `/git-commit` |
| **Codex** | `/prompts:` | `/prompts:workflow`, `/prompts:git-commit` |

> 💡 **提示**：Codex 使用 `/prompts:` 前缀访问所有工作流命令，而 Claude Code 使用 `/zcf:` 前缀或直接 `/` 前缀。

## 使用建议

- 首次使用工作流时，可让 AI 输出任务进度文档，方便后续在新对话继续
  - Claude Code：`/zcf:workflow <任务描述>`
  - Codex：`/prompts:workflow <任务描述>`
- 与 Git 工作流搭配使用，可快速完成需求拆解→编码→提交的闭环
- 完成关键里程碑后请求 AI 生成进度总结，方便跨对话衔接
