---
title: 工作流概览
---

# 工作流概览

ZCF 通过 MCP + 工作流模板帮助团队标准化开发流程。本章介绍每个工作流的定位与使用方式。

| 工作流 | 适用场景 | 关键特性 |
| --- | --- | --- |
| [ZCF 六阶段工作流](zcf-workflow.md) | 通用开发任务 | 六阶段闭环、自动质量把关、交互式确认 |
| [功能开发工作流](feat.md) | 新功能设计与实现 | 规划 + UI/UX 代理联动 |
| [BMad 敏捷流程](bmad.md) | 大型项目敏捷迭代 | 多阶段仪式管理 |
| [Spec 工作流集成](spec.md) | 需求文档与规范生成 | Spec MCP 联动 |
| [Git 智能命令](git-commands.md) | Git 操作自动化 | 提交、回滚、清理、worktree |

## 使用方法

根据使用的工具，使用不同的命令前缀：

### Claude Code

在 Claude Code 中使用以下命令：
- `/zcf:workflow` - 六阶段工作流
- `/zcf:feat` - 功能开发工作流
- `/git-commit` - Git 提交命令
- `/init-project` - 项目初始化

### Codex

在 Codex 中使用以下命令（注意 `/prompts:` 前缀）：
- `/prompts:workflow` - 六阶段工作流
- `/prompts:git-commit` - Git 提交命令
- `/prompts:git-rollback` - Git 回滚命令
- `/prompts:git-cleanBranches` - 清理已合并分支
- `/prompts:git-worktree` - Git 工作树管理

> ⚠️ **注意**：Codex 目前仅支持六阶段工作流和 Git 工作流。功能开发工作流（feat）、项目初始化（init-project）和 BMad 工作流暂未在 Codex 中提供。

> 💡 **提示**：Codex 使用 `/prompts:` 前缀访问所有工作流命令，这是 Codex 的命令格式规范。

## 使用建议

1. 首次使用工作流时，可让 AI 输出任务进度文档，方便后续在新对话继续。
2. 完成关键里程碑后请求 AI 生成进度总结，方便跨对话衔接。
3. 搭配 `best-practices/worktree.md` 提升多工作区协作效率。
4. 与 Git 工作流搭配使用，可快速完成需求拆解→编码→提交的闭环。
