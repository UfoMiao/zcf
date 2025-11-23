---
title: Claude Code Router (CCR)
---

# Claude Code Router (CCR)

[CCR](https://github.com/musistudio/claude-code-router/blob/main/README_zh.md)（Claude Code Router）是一个强大的代理路由器，可以实现多个 AI 模型的智能路由和成本优化。ZCF 内置完整的 CCR 管理能力，帮助您快速搭建高可用的 Claude Code 代理系统。

## 什么是 CCR

CCR 是一个强大的代理路由器，旨在解决单一模型成本高、可用性低的问题。它可以作为中间层，智能地将 Claude Code 的请求转发到不同的模型提供商。

## 核心优势

### 🎯 智能模型路由

根据任务类型自动选择最合适的模型：

- **简单任务** → 使用免费模型（Gemini、DeepSeek）
- **复杂任务** → 使用高性能模型（Claude Opus、GPT-4）
- **快速任务** → 使用快速模型（Claude Haiku、GPT-3.5）
- **思考任务** → 使用推理模型（DeepSeek R1）

### 💰 成本优化

通过智能路由，为不同任务选择最经济的模型，最高可将 API 成本降低 50-80%。

### 🌐 多提供商支持

支持多种模型提供商，避免单一供应商锁定：

- **OpenRouter**：统一的 AI 模型接口
- **DeepSeek**：DeepSeek 系列模型
- **Ollama**：本地部署的模型
- **Gemini**：Google Gemini 系列模型
- **Volcengine**：火山引擎 AI 服务
- **SiliconFlow**：SiliconFlow AI 平台

### 📊 可视化管理

内置 Web UI，提供直观的配置界面和详细的使用统计。

- **实时监控**：查看请求流量和响应时间
- **成本分析**：详细的成本统计报表
- **图形化配置**：无需手动编辑 JSON 即可调整路由规则

## 使用指南

CCR 的安装、配置、服务管理和 Web UI 使用均通过 CLI 命令完成。

详细的操作指南请参考 CLI 文档：

👉 **[CCR 代理管理命令](../cli/ccr.md)**

## 了解更多

- [Claude Code 配置](claude-code.md) - 了解 Claude Code 与 CCR 的集成
- [CCR 官方文档](https://github.com/musistudio/claude-code-router/blob/main/README_zh.md) - 查看 CCR 详细文档
