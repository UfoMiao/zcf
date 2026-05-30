---
title: 使用指南
---

# 安装指南

本指南介绍如何安装并运行 `ccs`（Claude Code Switch）。

## 环境要求

| 要求 | 最低版本 | 说明 |
|------|----------|------|
| **Node.js** | 18.x 或更高 | 运行 CLI 所需 |
| **npm** | 随 Node.js 安装 | 需支持 `npx` |
| **操作系统** | - | macOS、Linux、Windows（PowerShell/WSL） |

检查环境：

```bash
node --version
npm --version
npx --version
```

## 安装

### 方式一：全局安装（推荐）

```bash
npm i -g @xwm111/ccs
```

随后即可在任意位置运行 `ccs`。

### 方式二：使用 npx 运行（免安装）

```bash
npx @xwm111/ccs
```

## 首次运行

```bash
ccs
```

首次运行时，ccs 会询问你想使用的界面语言：

```
? 选择显示语言：
  ❯ 简体中文
    English
```

选择语言后会打开交互式菜单。在菜单中你可以添加 Claude Code API 端点、切换当前生效的端点、检查更新、切换语言或卸载。

## 验证安装

```bash
# 显示帮助
ccs --help

# 显示版本
ccs --version
```

## 配置位置

ccs 的配置保存在 `~/.ccs` 目录中。

## 下一步

1. 了解两大[功能特性](../features/)。
2. 参考 [CLI 命令](../cli/)，掌握每条命令与选项。
