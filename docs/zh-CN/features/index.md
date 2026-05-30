---
title: 功能总览
---

# 功能总览

`ccs`（Claude Code Switch）专注于两大功能，外加若干便捷特性。

## 1. 管理并切换 API 端点

保存多个 Claude Code API 配置，每个配置都有独立的：

- **Base URL** —— API 端点地址
- **鉴权方式** —— Auth Token 或 API Key
- **密钥** —— Token 或 API Key

通过交互式菜单或 `ccs cs <name>` 直接即时切换当前生效的端点，使用 `ccs cs --list` 查看全部配置。

完整用法见[配置切换](../cli/config-switch.md)。

## 2. 检查更新

`ccs check-updates`（别名 `ccs check`）会检查 Claude Code 和 `ccs` 的新版本并完成更新。

完整用法见[版本检查](../cli/check-updates.md)。

## 便捷特性

- **交互式菜单** —— 运行不带参数的 `ccs`。见[主菜单](../cli/menu.md)。
- **语言切换** —— 使用 `ccs --lang <zh-CN|en>` 在英文与简体中文之间切换界面。
- **干净卸载** —— 使用 `ccs uninstall` 移除 ccs 的配置和工具。见[卸载与清理](../cli/uninstall.md)。

所有配置均保存在 `~/.ccs` 目录中。
