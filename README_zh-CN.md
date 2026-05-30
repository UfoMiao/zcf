<div align="center">
  <h1>ccs - Claude Code Switch</h1>

  <p align="center">
  <a href="README.md">English</a> | <b>中文</b> | <a href="README_ja-JP.md">日本語</a>

  > 管理多个 Claude Code API 端点并一键切换 —— 同时让 Claude Code 和 ccs 保持最新。
  </p>
</div>

## ccs 是什么？

`ccs`（Claude Code Switch）是一个小巧的命令行工具，只专注做好两件事：

1. **管理并切换 API 端点** —— 保存多个 Claude Code API 配置（base URL + 鉴权方式 + 密钥），通过交互式菜单或一条命令即时切换当前生效的配置。
2. **检查更新** —— 将 Claude Code 和 `ccs` 本身更新到最新版本。

此外还提供交互式菜单、中英文（zh-CN/en）界面切换以及干净的卸载功能。配置保存在 `~/.ccs` 目录中。

## 安装

```bash
# 全局安装
npm i -g @xwm111/ccs

# 或免安装直接运行
npx @xwm111/ccs
```

## 使用

```bash
ccs                  # 打开交互式菜单（默认）
ccs config-switch    # 管理 / 切换 API 端点
ccs cs               # config-switch 的别名
ccs cs --list        # 列出已保存的配置
ccs cs my-endpoint   # 直接切换到指定名称的配置
ccs check-updates    # 检查并更新 Claude Code 和 ccs
ccs check            # check-updates 的别名
ccs uninstall        # 移除 ccs 的配置和相关工具
```

常用选项：

```bash
ccs --lang zh-CN     # 切换界面语言（zh-CN, en）
ccs --help           # 显示帮助
ccs --version        # 显示版本
```

## 功能

### 1. 多 API 端点与快速切换

可保存任意数量的 Claude Code API 配置，每个配置都有独立的 base URL、鉴权方式（Auth Token / API Key）和密钥。通过交互式菜单或 `ccs cs <name>` 直接切换当前生效的端点；使用 `ccs cs --list` 查看所有已配置项。

### 2. 更新检查

`ccs check-updates` 会检查 Claude Code 和 `ccs` 的新版本并为你完成更新。

## 许可证

[MIT License](LICENSE)

Forked from [UfoMiao/zcf](https://github.com/UfoMiao/zcf) (MIT)。
