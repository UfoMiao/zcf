---
title: 命令
---

# 命令

```bash
npx zcf [command] [options]
```

运行 `zcf <command> --help` 查看某个命令的选项。所有命令都支持：

| 选项 | 含义 |
|------|------|
| `--lang <lang>` | 显示语言，`en` 或 `zh-CN`。优先于 `ZCF_LANG` 和系统语言。 |
| `-h, --help` | 显示帮助。 |
| `-v, --version` | 显示版本。 |

## `zcf`

在终端里不带命令运行时，ZCF 会打开[终端编辑器](./ui)，等同于 `zcf tui`。输出不是终端时，改为打印帮助。

## `zcf tui`

在终端编辑器中编辑配置。

| 选项 | 含义 |
|------|------|
| `--file <path>` | 配置文件。默认：`~/.ufomiao/zcf/zcf.json`。 |

## `zcf ui`

在浏览器中编辑配置。ZCF 会在 `127.0.0.1` 上启动一个小型服务器并打开页面，直到你按下 <kbd>Ctrl</kbd>+<kbd>C</kbd>。

| 选项 | 含义 |
|------|------|
| `--file <path>` | 配置文件。 |
| `--port <port>` | 监听的端口。默认：任意空闲端口。 |
| `--no-open` | 只打印地址，不打开浏览器。 |

服务器只能从本机访问。打印出的地址带有本次运行生成的随机令牌，不带令牌的 API 请求会被拒绝。见[终端与网页界面](./ui#网页界面)。

## `zcf plan`

显示 `zcf apply` 将要做什么，但不做任何修改：每个工具的步骤、ZCF 自己修改的每个文件的 diff，以及提示信息（例如某个工具无法使用供应商的协议）。

| 选项 | 含义 |
|------|------|
| `--file <path>` | 配置文件。 |
| `--tools <tools>` | 用逗号分隔的工具 ID，替代配置中的 `tools`，例如 `--tools claude-code,codex`。 |
| `--mirror <mirror>` | 本次运行使用 `official` 或 `china`。见[镜像](./mirrors)。 |

运行工具自带命令的步骤（例如 `claude mcp add-json`）只显示命令本身，具体写入什么由该工具决定。

## `zcf apply`

安装缺少的已选工具，并写入它们的配置。选项与 `zcf plan` 相同，另外还有：

| 选项 | 含义 |
|------|------|
| `-y, --yes` | 执行应用。不加时，ZCF 只显示计划，不做任何修改。 |

各工具并行应用。某一步失败时，该工具剩余的步骤会被跳过（因为它们依赖这一步），其他工具继续进行。最后的汇总会列出失败的内容和备份位置。只要有任何一步失败，退出码就是 `1`。

## `zcf update`

用各工具自带的更新命令更新已选工具，例如 `claude update`、`codex update`、`opencode upgrade` 或 `pi update --self`。没有自带更新命令的工具用 `npm install -g` 更新；如果已安装的就是 npm 上的最新版本，则跳过。自带更新命令失败时，如果该包由 npm 安装（ZCF 用 `npm ls -g` 判断），会回退用 `npm install -g <pkg>@latest` 更新；原生安装不做 npm 回退，避免在它旁边留下第二份副本。未安装的工具会被跳过并给出提示。更新后 ZCF 会检查每个工具的版本，说明它是更新到了新版本，还是本来就是最新。

| 选项 | 含义 |
|------|------|
| `--file <path>` | 配置文件。只读取其中的 `tools` 和 `mirror`。 |
| `--tools <tools>` | 要更新的工具，替代配置中的 `tools`。指定后可以没有配置文件。 |
| `--mirror <mirror>` | 本次运行使用 `official` 或 `china`。 |

## `zcf uninstall`

卸载工具，并移除 ZCF 为它们写入的设置。与 `zcf apply` 一样，先显示计划，不加 `-y, --yes` 不做任何改动。

```bash
zcf uninstall claude-code codex --yes
```

每个工具走它自己的卸载通道：npm 安装的用 `npm uninstall -g`；OpenCode 在非 npm 安装时用它自带的 `opencode uninstall --keep-config --keep-data`；没有 npm 包的安装（Claude Code 与 Codex 的原生安装、Cursor CLI）则删除安装器落盘的文件，删除前先复制到备份目录——Windows 下这些文件是 `claude.exe` 和 `codex.exe`，Cursor CLI 则删除整个 `%LOCALAPPDATA%\cursor-agent` 目录。无法判断安装来源的工具会被跳过并提示：请用当初安装它的方式卸载。

ZCF 只移除自己写入的设置——供应商路由，例如 `zcf` 条目、指向它的模型选择和 dsh 的路由补丁。Claude Code 的 `ANTHROPIC_*` 环境变量和 Gemini CLI 的 `.env` 键只在仍与配置所写值一致时才移除；同名但值不同的设置可能是用户自己写的，会保留并给出提示。MCP 服务、技能，以及无法与工具自身设置区分开的内容都保持原样，也不会整文件删除。卸载后，这些工具会从配置文件的 `tools` 中移除，之后的 `zcf apply` 不会再安装它们；ZCF 还会确认工具的命令确实不再响应。

| 选项 | 含义 |
|------|------|
| `--file <path>` | 要清理 `tools` 列表的配置文件。 |
| `-y, --yes` | 执行卸载。不加时 ZCF 只显示计划，不做改动。 |

## `zcf mirror [mirror]`

不带参数时，显示当前使用的镜像以及该设置的来源：`ZCF_MIRROR`、配置文件或默认值。带 `official` 或 `china` 时，将其保存为配置文件中的 `mirror`。见[镜像](./mirrors)。

| 选项 | 含义 |
|------|------|
| `--file <path>` | 配置文件。 |

## `zcf backup [command]`

管理 `~/.ufomiao/zcf/backups/` 中的备份。ZCF 在修改或删除文件之前，会把原版本复制到那里，每次运行一个以时间命名的文件夹。

| 命令 | 含义 |
|------|------|
| `list`（默认） | 列出各次备份，新的在前：id、产生原因、文件数。 |
| `restore <id>` | 恢复某次备份的文件。不带 `-y, --yes` 时只显示其中内容，不做改动。恢复前会先把当前文件复制到一个新备份中，再恢复那个备份即可撤销本次恢复。 |
| `prune` | 删除超出最新 `--keep <n>`（默认 20）的旧备份；最新的一个总会保留。不带 `-y, --yes` 时只显示将删除哪些。 |

| 选项 | 含义 |
|------|------|
| `-y, --yes` | 不再确认，直接恢复或清理。 |
| `--keep <n>` | 清理时保留的备份数。 |

## 退出码

| 代码 | 含义 |
|------|------|
| `0` | 完成，或没有需要做的事。 |
| `1` | 某一步失败、没有选择工具，或命令行有误（例如未知的工具 ID）。 |
| `2` | 配置文件不存在或无效。 |

`zcf update --tools` 不需要配置文件；`zcf mirror <mirror>` 在配置文件不存在时会创建它。
