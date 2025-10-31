# 测试指南

## 可用命令

- `pnpm test`：运行全部 Vitest 测试。
- `pnpm test:run`：持续运行测试（watch 模式）。
- `pnpm test:coverage`：生成覆盖率报告。
- `pnpm lint`：ESLint 检查。
- `pnpm typecheck`：TypeScript 类型检查。

## 编写测试建议

- 将快照输出保存为稳定的字符串，避免受语言影响。
- 在编写涉及文件系统的测试时，使用 Vitest 提供的临时目录或模拟 FS。
- 对 CLI 行为可使用 `tinyexec` 或 `execa` 模拟命令执行。
