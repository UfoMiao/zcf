# 模板与输出风格

## 输出风格模板

- `--output-styles` 默认安装三套专业输出风格，存储在 `prompts/output-style/`。
- 可通过 `--default-output-style` 设置默认风格，或在主菜单选择 `6` 切换。
- 输出风格适合放置高优先级的系统提示，例如编码规范、审查要求。

## 项目记忆与 CLAUDE.md

- 建议先运行 `/zcf:init-project` 生成层级化的 `CLAUDE.md`，避免上下文过大。
- 全局 `CLAUDE.md` 仅保留必要设定（如语言指令），复杂规范请放入输出风格或项目记忆。

## 工作流模板

- 工作流与代理模板位于 `templates/workflow/` 和 `templates/agents/`，在安装时会自动复制。
- 可在此基础上自定义模板，并在 `zcf init` 时选择 `docs-only` 仅同步文档。

## 自定义流程建议

1. Fork 当前仓库并修改 `templates/` 下模板。
2. 运行 `pnpm build` 打包，再通过 `npm link` 或本地 `npx` 测试。
3. 团队内部可发布包含自定义模板的 npm 包，维持一致性。
