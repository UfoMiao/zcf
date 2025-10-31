# 工作流概览

ZCF 通过 MCP + 工作流模板帮助团队标准化开发流程。本章介绍每个工作流的定位与使用方式。

| 工作流 | 适用场景 | 关键特性 |
| --- | --- | --- |
| [ZCF 六阶段工作流](zcf-workflow.md) | 通用开发任务 | 六阶段闭环、自动质量把关、交互式确认 |
| [功能开发工作流](feat.md) | 新功能设计与实现 | 规划 + UI/UX 代理联动 |
| [BMad 敏捷流程](bmad.md) | 大型项目敏捷迭代 | 多阶段仪式管理 |
| [Spec 工作流集成](spec.md) | 需求文档与规范生成 | Spec MCP 联动 |
| [Git 智能命令](git-commands.md) | Git 操作自动化 | 提交、回滚、清理、worktree |

使用建议：

1. 在 Claude Code 中运行对应斜杠指令（例如 `/zcf:workflow`）。
2. 完成关键里程碑后请求 AI 生成进度总结，方便跨对话衔接。
3. 搭配 `best-practices/worktree.md` 提升多工作区协作效率。
