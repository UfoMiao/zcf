# zcf update

`zcf update`（缩写 `zcf u`）用于同步最新的提示词、工作流与工具版本。

## 功能

- 更新 Claude Code/Codex 提示词与工作流。
- 选择模板语言与 AI 输出语言。
- 检查 Claude Code 版本（通过 `checkClaudeCodeVersionAndPrompt`）。
- 在 Codex 模式下触发 `runCodexUpdate`。

## 常用参数

- `--config-lang, -c`：模板语言。
- `--ai-output-lang, -a`：AI 输出语言。
- `--code-type, -T`：指定目标工具。
- `--skip-prompt, -s`：无交互模式。

## 示例

```bash
# 使用保存的偏好更新提示词
npx zcf u

# 指定为 Codex 并切换到英文模板
npx zcf update -T codex -c en
```
