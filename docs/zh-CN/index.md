---
title: ccs - Claude Code Switch
---

<div align="center">
  <h1>ccs - Claude Code Switch</h1>

  > 管理多个 Claude Code API 端点并一键切换 —— 同时让 Claude Code 和 ccs 保持最新。
</div>

## 项目简介

`ccs`（Claude Code Switch）是一个小巧的命令行工具，只专注做好两件事：

1. **管理并切换 API 端点** —— 保存多个 Claude Code API 配置（base URL + 鉴权方式 + 密钥），通过交互式菜单或一条命令即时切换当前生效的配置。
2. **检查更新** —— 将 Claude Code 和 `ccs` 本身更新到最新版本。

此外还提供交互式菜单、中英文（zh-CN/en）界面切换以及干净的卸载功能。配置保存在 `~/.ccs` 目录中。

## 快速开始

```bash
# 全局安装
npm i -g @xwm111/ccs

# 或免安装直接运行
npx @xwm111/ccs

# 打开交互式菜单
ccs
```

详情参见 [开始使用](getting-started/)。

## 为什么选择 ccs

- **多端点，一键切换** —— 保存任意数量的 Claude Code API 配置并即时切换。
- **始终最新** —— 一条命令同时更新 Claude Code 和 ccs。
- **双语界面** —— 支持英文与简体中文。
- **干净整洁** —— 配置独立存放于 `~/.ccs`，可通过 `ccs uninstall` 干净移除。

## 相关链接

- **npm**: <https://www.npmjs.com/package/@xwm111/ccs>

## 许可证

MIT 许可协议。Forked from [UfoMiao/zcf](https://github.com/UfoMiao/zcf) (MIT)。
