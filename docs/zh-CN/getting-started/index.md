---
title: 快速开始
---

# 快速开始

本章介绍如何在几分钟内安装 `ccs` 并开始管理你的 Claude Code API 端点。

## 快速导航

1. **阅读[安装指南](installation.md)** —— 系统要求与安装方式。
2. **了解两大功能** —— 查看[功能特性](../features/)，了解端点切换与更新检查。
3. **掌握命令** —— 参考 [CLI 命令](../cli/)，了解每条命令与选项。

## 推荐流程

### 首次使用

1. 运行 `npx @xwm111/ccs`（或使用 `npm i -g @xwm111/ccs` 全局安装）。
2. 运行 `ccs` 打开交互式菜单。
3. 添加一个 Claude Code API 端点（base URL + 鉴权方式 + 密钥）并设为当前生效。

### 日常使用

- 使用 `ccs config-switch`（或 `ccs cs`）切换当前生效的端点。
- 使用 `ccs cs --list` 查看所有已保存的配置。
- 使用 `ccs check-updates`（或 `ccs check`）更新 Claude Code 和 ccs。

> 提示：随时运行不带参数的 `ccs` 即可打开交互式菜单。
