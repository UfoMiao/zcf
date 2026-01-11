# Codex Constants Refactoring Plan

## 任务概述

将 Codex 相关的文件路径常量统一迁移到 `src/constants.ts` 进行集中管理，与 Claude Code 路径管理方式保持一致。

## 上下文

- **任务来源**: 代码审查发现 Codex 路径常量分散在多个文件中定义
- **目标**: 统一路径常量管理，提高代码可维护性
- **影响范围**: `src/utils/code-tools/` 目录下的 Codex 相关文件

## 执行计划

### 阶段 1: 验证 constants.ts ✅
- 确认 `CODEX_DIR`, `CODEX_CONFIG_FILE`, `CODEX_AUTH_FILE`, `CODEX_AGENTS_FILE`, `CODEX_PROMPTS_DIR` 已定义

### 阶段 2: 更新 codex.ts
- 添加导入: `import { CODEX_DIR, CODEX_CONFIG_FILE, CODEX_AUTH_FILE, CODEX_AGENTS_FILE, CODEX_PROMPTS_DIR } from '../../constants'`
- 删除本地定义 (第 30-34 行)
- 保留 `CODEX_DIR` 导出

### 阶段 3: 更新 codex-uninstaller.ts
- 添加导入语句
- 删除 class 内部的 `private readonly` 定义 (第 34-38 行)
- 替换所有 `this.CODEX_*` 为直接引用

### 阶段 4: 更新 codex-config-switch.ts
- 添加导入语句
- 删除函数内部的重复定义 (第 241 行和第 356 行)

### 阶段 5: 清理和验证
- 运行 `pnpm typecheck`
- 运行 `pnpm lint`

### 阶段 6: 测试验证
- 运行 `pnpm vitest codex`
- 运行 `pnpm vitest uninstaller`
- 运行 `pnpm vitest config-switch`
- 运行 `pnpm test:run`

## 预期结果

- 所有 Codex 路径常量统一在 `constants.ts` 中管理
- 代码更简洁，减少重复定义
- 所有测试通过，功能正常
