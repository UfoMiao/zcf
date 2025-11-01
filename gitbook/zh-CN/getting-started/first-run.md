# 首次运行

完成安装后建议按照以下步骤执行首次初始化，确保配置完整：

## 1. 启动主菜单

```bash
npx zcf
```

- ZCF 会读取 `~/.ufomiao/zcf/config.toml` 推断默认语言与目标工具。
- 首次运行时建议先保持默认的 Claude Code 模式，后续可通过 `S` 切换到 Codex。

## 2. 选择语言与代码工具

- 输入 `0` 调整脚本语言（`zh-CN` 或 `en`）。
- 输入 `S` 在 Claude Code 与 Codex 之间切换，ZCF 会自动保存选择。

## 3. 执行完整初始化

- 输入 `1` 触发 `zcf init`。
- 按提示选择：
  - API 配置模式：官方登录、API Key、CCR 代理或跳过。
  - 模板语言与 AI 输出语言（可分开设置）。
  - 需要安装的 MCP 服务与工作流。
  - 是否安装 CCometixLine 状态栏。

## 4. 校验工作流与 MCP

- 初始化结束后，ZCF 会提示成功信息与备份目录位置。
- 在 Claude Code 的命令面板中尝试 `/zcf:workflow`、`/git-commit` 等指令确认导入成功。
- 运行 `npx zcf ccu` 查看使用统计，验证 Claude Code Router 是否已经连接。

## 5. 保存默认偏好

- 所有选择会写入 `~/.ufomiao/zcf/config.toml`。
- 可随时运行 `npx zcf update` 复用现有偏好，只在需要时调整参数。
