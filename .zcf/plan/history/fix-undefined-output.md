# 修复配置文件路径显示 undefined 问题

## 问题描述

在执行 ZCF 配置更新时，输出消息显示：
```
✔ 配置文件已复制到 undefined
```

## 问题分析

- **位置**：`src/utils/config-operations.ts:269`
- **原因**：代码使用 `ensureClaudeDir()` 函数的返回值，但该函数没有返回值（返回 `undefined`）
- **影响**：用户无法看到配置文件实际复制到的目录路径

## 解决方案

采用方案 2：直接使用 `CLAUDE_DIR` 常量替代 `ensureClaudeDir()` 函数调用

### 理由

1. 最简单直接，符合 KISS 原则
2. 不改变现有函数行为和语义
3. 代码意图更清晰
4. 与 `init.ts:112` 中的正确用法保持一致

## 实施步骤

1. ✅ 在 `config-operations.ts` 中导入 `CLAUDE_DIR` 常量
2. ✅ 替换第 269 行的 `ensureClaudeDir()` 为 `CLAUDE_DIR`
3. ✅ 移除未使用的 `ensureClaudeDir` 导入
4. ✅ 运行类型检查确保修改正确

## 修改内容

### 1. 添加导入
```typescript
import { CLAUDE_DIR, I18N } from '../constants';
```

### 2. 替换函数调用
```typescript
// 原代码
console.log(ansis.green(`✔ ${i18n.configSuccess} ${ensureClaudeDir()}`));

// 修改后
console.log(ansis.green(`✔ ${i18n.configSuccess} ${CLAUDE_DIR}`));
```

### 3. 移除未使用导入
从 `./config` 的导入列表中移除 `ensureClaudeDir`

## 验证结果

- 类型检查通过 ✅
- 代码修改完成 ✅
- 等待功能测试验证
