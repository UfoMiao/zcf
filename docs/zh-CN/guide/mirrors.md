---
title: 镜像
---

# 镜像

在中国大陆，npm 仓库和部分安装器速度慢或无法访问。`china` 镜像会让 ZCF 改从国内镜像下载。

```bash
npx zcf mirror china      # 保存到配置中
npx zcf mirror            # 显示正在使用的镜像及原因
npx zcf mirror official   # 切换回官方源
```

## 选择镜像

优先级从高到低：

1. `zcf plan`、`zcf apply` 或 `zcf update` 上的 `--mirror official|china`，只对本次运行生效。
2. 环境变量 `ZCF_MIRROR`（`cn` 也表示 `china`）。
3. [配置文件](./config)中的 `mirror`，由 `zcf mirror <name>` 或[编辑器](./ui)的设置页设置。
4. `official`。

使用 `china` 镜像时，`zcf plan`、`zcf apply` 和 `zcf update` 会在开头说明，并显示所用的仓库地址。

## `china` 会改变什么

| 下载内容 | 使用 `china` 时 |
|----------|-----------------|
| npm 安装（`npm install -g`、`npx skills add`，以及用 npm 安装的工具自带的更新命令） | 使用 `https://registry.npmmirror.com`。你已在 `npm_config_registry` 中设置的仓库会保留。 |
| `npx skills add owner/repo` 内部的 git 克隆 | 经由 `https://gh-proxy.com/https://github.com/...`，与 [magpie](https://github.com/yetone/magpie) 的 `--mirror` 做法相同。只替换下载地址：git 仍按 `github.com` 上仓库命名的对象哈希校验每个对象，镜像返回别的文件会导致克隆失败。你已设置的 `GIT_CONFIG_COUNT` 会保留。 |
| 安装 Claude Code | 使用 `npm install -g @anthropic-ai/claude-code`（安装的是同一个原生程序），而不是从 Google Cloud Storage 下载的官方脚本。 |
| 来自 ZCF 仓库的文件，例如[供应商预设](./providers) | 同时请求 `fastly.jsdelivr.net` 和 `gcore.jsdelivr.net`，采用最先返回的结果。 |

ZCF 只使用提供完全相同文件的镜像；唯一的例外是上面的 git 克隆——git 自身的对象哈希校验会拦下返回了仓库自身字节之外内容的镜像。

## 不覆盖的范围

- 原生自更新，例如通过官方脚本安装的 Claude Code 执行 `claude update`。遇到这种情况时 `zcf update` 会给出说明。
- 工具内部的 MCP 服务运行的 `npx`。
- 你的供应商自己的接口。

如果你在 HTTP 代理之后，请注意：ZCF 下载预设所用的 Node 内置 `fetch`，只有在设置了 `NODE_USE_ENV_PROXY=1` 时才会使用 `HTTPS_PROXY`。
