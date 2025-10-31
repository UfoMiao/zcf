# 快速上手示例

以下流程展示如何在新设备上完成一次完整配置并验证环境。

## 步骤 1：全自动初始化

```bash
npx zcf i -s -p 302ai -k "sk-xxx"
```

- 省略交互，一次性完成 Claude Code 初始化、工作流导入、API 与 MCP 配置。
- 若需 Codex 支持，可追加 `-T cx` 或 `--code-type codex`。

## 步骤 2：导入/更新工作流

```bash
npx zcf update -g zh-CN
```

- 复用保存的配置语言与输出语言。
- 默认执行模板更新 + 工作流导入，可随时重复执行以获取最新版本。

## 步骤 3：配置 CCR 与 MCP

```bash
npx zcf ccr      # 进入 CCR 管理菜单
npx zcf ccu      # 查看使用分析
```

- `ccr` 菜单负责安装 Claude Code Router、生成配置与备份文件。
- `ccu` 提供每日/月度用量统计，并支持 `--json` 输出供脚本解析。

## 步骤 4：验证 IDE 配置

1. 打开 Claude Code，运行 `/zcf:workflow`，确认六阶段流程可用。
2. 执行 `/git-worktree` 检查 Git 指令是否导入。
3. 通过 MCP 面板确认默认服务（Context7、Open Web Search、DeepWiki、Spec、Playwright、Serena）均已启用。

## 步骤 5：启用 Codex（可选）

```bash
npx zcf --code-type codex
# 菜单 -> 1. 完整初始化
```

- ZCF 会自动检测 `~/.codex` 配置，必要时创建备份。
- 支持在 Codex 中导入与 Claude Code 等价的工作流与提示词。
