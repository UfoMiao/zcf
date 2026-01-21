# 使用 gitbook 中文文档改造

## 背景
- 现有 gitbook 目录仅包含模板内容，需要根据项目真实功能重写。
- 旧版结构位于 `gitbook/old`，需参考并在此基础上扩展 Codex 说明。
- README 暂不改动，仅在后续任务中精简保留展示信息。

## 执行摘要
1. 梳理 CLI、工作流、MCP、Codex 等核心能力，明确文档要点。
2. 以旧版目录为蓝本规划新结构，新增 Codex、MCP、CLI 等专题章节。
3. 在 `gitbook/zh-CN/` 下重写全部文档，覆盖快速开始、功能特性、进阶、命令、工作流、最佳实践与开发文档。
4. 更新 `SUMMARY.md`，确保目录与实际文件一致并完成交叉验证。
5. 将执行计划记录到 `.codex/plan/gitbook-zh-doc-update.md`，便于后续翻译与 README 调整。

## 关键文件
- `gitbook/zh-CN/README.md`
- `gitbook/zh-CN/SUMMARY.md`
- `gitbook/zh-CN/**/*.md`（按章节划分的全部新内容）

## 后续建议
- 在中文文档确认后，按同样结构翻译为 `en` 与 `ja-JP`。
- 任务完成后返回处理 README 精简与文档链接更新。
