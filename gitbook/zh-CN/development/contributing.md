# 贡献指南

## 基本流程

1. Fork 仓库并创建特性分支。
2. 运行 `pnpm install` 安装依赖。
3. 完成修改后执行 `pnpm lint`、`pnpm typecheck`、`pnpm test`。
4. 提交符合 Conventional Commits 规范的提交信息。
5. 发起 Pull Request，附带变更说明与验证步骤。

## 代码规范

- 使用 TypeScript + ESM，2 空格缩进，单引号。
- 优先使用命名导出，避免在模块中引入副作用。
- 避免硬编码字符串，优先通过 i18n 翻译或常量维护。

## 文档贡献

- 更新 GitBook 文档时，请同步修改中文与对应语言目录。
- 如果新增模板或工作流，记得更新 `templates/` 与 `src/config` 中的配置。
