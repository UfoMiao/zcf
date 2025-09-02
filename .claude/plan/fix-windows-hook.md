# Fix Windows Hook - 跨平台 ESLint Hook 修复计划

## 背景
Windows 系统上 PostToolUse:Edit hook 执行失败，原因是使用了 Unix/Linux 特有的命令（jq）和 shell 语法。

## 问题分析
1. Windows 没有原生 jq 命令
2. Shell 管道语法不兼容
3. read 命令在 Windows CMD/PowerShell 中不可用

## 解决方案
采用 TypeScript 脚本替代 shell 命令，实现跨平台兼容。

## 最终实施方案

### 1. 创建 TypeScript Hook 脚本
**文件**: `.claude/hooks/eslint-hook.ts`

**核心特性**:
- 使用 TypeScript 提供类型安全
- 从标准输入读取 JSON 数据
- 解析 file_path 字段
- 对所有文件执行 ESLint（由 eslint.hook.config.ts 控制忽略规则）
- 100ms 超时机制，快速响应
- 支持调试模式（DEBUG_ESLINT_HOOK=1）

### 2. 更新 Hook 配置
**文件**: `.claude/settings.json`

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|MultiEdit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "pnpm tsx .claude/hooks/eslint-hook.ts"
          }
        ]
      }
    ]
  }
}
```

### 3. 技术实现要点
- 使用 TypeScript 接口定义数据结构
- 使用 `node:` 前缀导入 Node.js 模块
- 通过 `pnpm tsx` 执行 TypeScript 文件
- 错误静默处理，避免影响编辑器体验
- ESLint 配置文件负责文件过滤逻辑

## 测试验证
- ✅ Windows 环境：成功执行，自动格式化生效
- ✅ TypeScript 文件：ESLint 自动修复正常工作
- ✅ 类型检查：TypeScript 编译无错误
- ✅ 性能优化：100ms 超时，响应迅速

## 成果总结
1. **完全解决** Windows 兼容性问题
2. **TypeScript 实现** 提供更好的类型安全和维护性
3. **跨平台兼容** 同一套代码适用于所有操作系统
4. **零依赖** 仅使用 Node.js 内置模块和项目已有的 tsx

## 使用说明
- 修改配置后需要重启 Claude Code 生效
- 可设置 `DEBUG_ESLINT_HOOK=1` 环境变量启用调试日志
- ESLint 忽略规则在 `.claude/eslint.hook.config.ts` 中配置