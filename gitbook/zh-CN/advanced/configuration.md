# 配置管理

## 目录结构概览

- `~/.claude/`：Claude Code 主目录，包含 `settings.json`、`CLAUDE.md`、`prompts/`、`workflows/`。
- `~/.codex/`：Codex 主目录，包含 `config.toml`、`auth.json`、`prompts/`、`AGENTS.md`。
- `~/.ufomiao/zcf/config.toml`：ZCF 自身的偏好记录，保存语言、默认工具、最近安装选项。
- `~/.claude/backup/`、`~/.codex/backup/`：ZCF 生成的时间戳备份。

## 增量管理模式

- 当检测到既有配置时，`zcf init` 会询问操作策略：
  - `backup`：备份后覆盖（默认）。
  - `merge`：尝试合并（主要用于 MCP 与工作流）。
  - `new`：忽略现有内容重新生成。
  - `docs-only`：仅更新文档与提示词。
  - `skip`：跳过当前步骤。
- 若启用 `skipPrompt`，ZCF 将自动套用默认策略。

## AI 输出语言指令

- `applyAiLanguageDirective` 会根据 `--ai-output-lang` 将对应的提示词写入 `CLAUDE.md`。
- 支持自定义语言（`custom`），可在 CLI 中输入自定义指令文本。

## 模板语言选择

- `resolveTemplateLanguage` 会综合 CLI 参数、配置文件与交互输入确定模板语言。
- 模板语言与 AI 输出语言可独立设置，适合中文界面 + 英文输出的混合场景。

## 变更追踪建议

- 建议使用 Git 管理 `~/.claude` 与 `~/.codex`，在执行 `zcf update` 前后对比差异。
- 若意外覆盖自定义内容，可从备份目录中恢复相应文件。
