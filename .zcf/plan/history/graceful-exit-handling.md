# Graceful Exit Handling 实现记录

## 任务背景
参考 Inquirer.js 官方文档，实现全局 ExitPromptError 处理，让用户按 Ctrl+C 时优雅退出。

## 问题分析
- Inquirer 在用户按 Ctrl+C 时会抛出 ExitPromptError
- 该错误如果未处理，会在终端显示完整的错误堆栈
- 需要捕获此错误并显示友好的退出消息

## 最终技术方案
在应用层（各命令文件）的 catch 块中统一处理 ExitPromptError。

## 实施步骤
1. ✅ 创建公共错误处理模块 `src/utils/error-handler.ts`
2. ✅ 实现 `handleExitPromptError()` 函数处理 Ctrl+C
3. ✅ 实现 `handleGeneralError()` 函数处理其他错误
4. ✅ 更新所有命令文件使用公共错误处理
5. ✅ 测试所有 prompt 场景

## 实现细节

### 错误处理模块 (src/utils/error-handler.ts)
```typescript
export function handleExitPromptError(error: unknown): boolean {
  if (error instanceof Error && error.name === 'ExitPromptError') {
    // 显示友好的退出消息
    console.log(ansis.cyan(`\n${i18n.goodbye}\n`));
    process.exit(0);
  }
  return false;
}
```

### 命令文件更新
所有命令文件（menu.ts, init.ts, update.ts）的 catch 块统一改为：
```typescript
} catch (error) {
  if (!handleExitPromptError(error)) {
    handleGeneralError(error);
  }
}
```

## 关键文件修改
- `src/utils/error-handler.ts` - 新增错误处理模块
- `src/commands/menu.ts:154-157` - 使用公共错误处理
- `src/commands/init.ts:404-407` - 使用公共错误处理
- `src/commands/update.ts:79-82` - 使用公共错误处理

## 最终效果
- ✅ 用户按 Ctrl+C 时显示友好的 "👋 感谢使用 ZCF！再见！" 消息
- ✅ 不显示 ExitPromptError 错误堆栈
- ✅ 进程以代码 0 正常退出
- ✅ 代码遵循 DRY 原则，无重复
- ✅ 易于维护和扩展