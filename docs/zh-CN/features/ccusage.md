---
title: ccusage 使用分析
---

# ccusage 使用分析

[ccusage](https://github.com/ryoppippi/ccusage) 是一个用于分析 Claude Code/Codex CLI 使用情况的 CLI 工具，可以从本地 JSONL 文件中快速分析 token 使用量和成本。

## 什么是 ccusage

ccusage 是一个强大的使用分析工具，旨在帮助开发者了解和优化 AI 辅助开发的成本。它通过解析本地日志文件，提供详细的统计报告。

## 核心功能

- **📊 多维度报告**：提供日度、周度、月度使用报告
- **💰 成本分析**：精确计算 Token 消耗和对应的美元成本
- **🤖 模型细分**：详细展示不同模型（Claude Opus/Sonnet/Haiku）的使用比例
- **📈 趋势分析**：可视化展示使用量的变化趋势
- **🔌 易于集成**：支持 JSON/CSV 导出，方便与其他工具集成
- **🚀 状态栏支持**：与 CCometixLine 集成，提供实时状态栏显示

## 使用指南

ccusage 已完全集成到 ZCF 中，您可以直接通过 CLI 命令使用。

详细的使用命令、参数说明和导出格式请参考 CLI 文档：

👉 **[使用分析命令详解](../cli/ccu.md)**

## 了解更多

- [CCometixLine 状态栏](cometix.md) - 实时查看使用情况
- [ccusage 官方文档](https://ccusage.com/) - 查看完整文档
