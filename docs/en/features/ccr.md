---
title: Claude Code Router (CCR)
---

# Claude Code Router (CCR)

[CCR](https://github.com/musistudio/claude-code-router/blob/main/README_zh.md) (Claude Code Router) is a powerful proxy router that enables intelligent routing and cost optimization for multiple AI models. ZCF has built-in complete CCR management capabilities to help you quickly set up a highly available Claude Code proxy system.

## What is CCR

CCR is a powerful proxy router designed to address high costs and low availability of single models. It acts as a middleware layer, intelligently forwarding Claude Code requests to different model providers.

## Core Advantages

### 🎯 Intelligent Model Routing

Automatically select the most suitable model based on task type:

- **Simple Tasks** → Use free models (Gemini, DeepSeek)
- **Complex Tasks** → Use high-performance models (Claude Opus, GPT-4)
- **Quick Tasks** → Use fast models (Claude Haiku, GPT-3.5)
- **Thinking Tasks** → Use reasoning models (DeepSeek R1)

### 💰 Cost Optimization

Through intelligent routing, select the most economical model for different tasks, potentially reducing API costs by 50-80%.

### 🌐 Multi-Provider Support

Supports various model providers to avoid vendor lock-in:

- **OpenRouter**: Unified AI model interface
- **DeepSeek**: DeepSeek series models
- **Ollama**: Locally deployed models
- **Gemini**: Google Gemini series models
- **Volcengine**: Volcengine AI service
- **SiliconFlow**: SiliconFlow AI platform

### 📊 Visual Management

Built-in Web UI provides an intuitive configuration interface and detailed usage statistics.

- **Real-time Monitoring**: View request traffic and response times
- **Cost Analysis**: Detailed cost statistics reports
- **Graphical Configuration**: Adjust routing rules without manually editing JSON

## Usage Guide

Installation, configuration, service management, and Web UI usage of CCR are all done via CLI commands.

For detailed operation guides, please refer to the CLI documentation:

👉 **[CCR Proxy Management Commands](../cli/ccr.md)**

## Learn More

- [Claude Code Configuration](claude-code.md) - Learn about Claude Code integration with CCR
- [CCR Official Documentation](https://github.com/musistudio/claude-code-router/blob/main/README_zh.md) - View CCR detailed documentation
