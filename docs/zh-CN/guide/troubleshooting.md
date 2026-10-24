---
title: 备份与故障排除
---

# 备份与故障排除

## 备份

ZCF 在一次运行中第一次修改某个文件之前，会把它复制到以运行时间命名的目录：

```
~/.ufomiao/zcf/backups/2026-10-24T08-00-00-000Z/
  .claude/settings.json
  .codex/config.toml
  .ufomiao/zcf/zcf.json
```

目录中的路径与文件在你主目录下的位置一一对应。之前不存在的文件没有备份。`zcf apply` 结束时会打印该目录，编辑器在第一次保存前也会备份 `zcf.json`。

要撤销某个修改，把文件复制回去即可：

```bash
cp ~/.ufomiao/zcf/backups/<时间>/.claude/settings.json ~/.claude/settings.json
```

ZCF 从不删除备份。不再需要时请自行删除旧目录。

## 计划中的提示

| 提示 | 含义 |
|------|------|
| 供应商没有 "…" 配置，… 将保留当前的供应商。 | 工具使用的协议你的供应商没有，例如 Codex 缺少 `openai` 块。补上该块，或让该工具保留它自己的供应商。 |
| 没有为 … 设置模型。 | 在供应商里设置 `models.default`，或在其 `openai`、`gemini` 块里设置 `model`。 |
| … 只使用自家模型，不会应用供应商配置。 | Cursor CLI。MCP 服务和技能仍会应用。 |
| … 尚未安装。 | 来自 `zcf update`。运行 `zcf apply` 安装它。 |
| 通过 npm 安装的 … 会经镜像更新；原生安装版仍从官方服务器下载。 | 来自使用 `china` 镜像的 `zcf update`。见[镜像](./mirrors#不覆盖的范围)。 |

## 常见问题

**“在 … 找不到 ZCF 配置”**：还没有配置文件。运行 `npx zcf` 在编辑器中创建，或手动编写。见[配置文件](./config)。

**“… 的 ZCF 配置有误”**：消息会列出每个有问题的字段，编辑器也会在字段旁显示同样的错误。不是合法 JSON 的文件会在编辑器中显示为损坏；请在文本编辑器中修复后重新加载。

**某一步失败**：该工具剩余的步骤会被跳过，其他工具继续进行。汇总中会显示失败的命令及其输出，敏感信息已遮盖。修复原因后再次运行 `zcf apply`。已经应用的设置和 MCP 服务在第二次运行时会被跳过。

**工具已安装，但之后提示“找不到”**：有些安装器只会为新开的 shell 把目录加入 `PATH`。请打开新的终端。ZCF 会在你的 `PATH` 以及官方安装器使用的目录中查找工具。

**预设加载不出来**：见[供应商预设](./providers#预设从哪里来)。在 HTTP 代理之后时，除了 `HTTPS_PROXY` 还需设置 `NODE_USE_ENV_PROXY=1`。

**在中国大陆下载慢或失败**：切换到 [`china` 镜像](./mirrors)。

## 报告问题

在 [github.com/UfoMiao/zcf/issues](https://github.com/UfoMiao/zcf/issues) 提交 issue，并附上 `npx zcf plan` 的输出。其中的 API 密钥以及 MCP 环境变量和请求头的值已被遮盖，但写在 MCP 服务参数里的密钥不会被遮盖。粘贴前请再检查一遍。
