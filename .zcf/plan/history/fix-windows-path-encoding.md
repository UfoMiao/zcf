# 修复 Windows 路径空格编码问题

## 问题描述
用户报告在 Windows 系统上使用 zcf 工具时，在 API 跳过验证环节遇到错误：
```
Error: Template directory not found: D:/Program%20Files...
```

路径中的空格被错误地编码成了 `%20`，导致文件系统找不到对应的目录。

## 问题分析
1. 在 `src/utils/config.ts` 中，代码使用 `new URL(import.meta.url).pathname` 获取当前文件路径
2. 在 Windows 系统上，如果路径中含有空格，`URL.pathname` 会将空格编码成 `%20`
3. 这个编码后的路径被用来构建模板目录路径，导致文件系统找不到对应的目录

## 解决方案
使用 Node.js 内置的 `fileURLToPath` 函数来正确处理 URL 到文件路径的转换。这是 Node.js 官方推荐的标准方法，能够：
- 自动处理所有平台的路径差异
- 正确解码 URL 编码的字符（包括空格、中文等）
- 提供最可靠的跨平台兼容性

## 实施步骤
1. 在 `src/utils/config.ts` 文件顶部导入 `fileURLToPath`
2. 替换两处使用 `new URL(import.meta.url).pathname` 的代码
3. 验证修复效果

## 代码修改

### 修改前：
```typescript
const currentFileUrl = new URL(import.meta.url);
const currentFilePath = currentFileUrl.pathname;
```

### 修改后：
```typescript
import { fileURLToPath } from 'node:url';
// ...
const currentFilePath = fileURLToPath(import.meta.url);
```

## 测试结果
- ✅ 类型检查通过
- ✅ 项目构建成功
- ✅ 代码能正确处理包含空格的路径

## 影响范围
- 修复了 Windows 用户在路径包含空格时的错误
- 提升了代码的跨平台兼容性
- 预防了其他潜在的 URL 编码问题（如中文路径等）