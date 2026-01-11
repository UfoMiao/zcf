# 修复 commandExists 函数逻辑错误

## 问题背景
用户发现 1.0.2 版本的修改是不必要的，真正的问题在于 `commandExists` 函数的实现逻辑错误。

### 问题分析
`commandExists` 函数总是返回 `true`，无论命令是否真正存在。根据用户提供的日志：
- 命令存在时：`exitCode: 0`
- 命令不存在时：`exitCode: 1`

但原始代码忽略了 `exitCode`，直接返回 `true`。

## 解决方案
修复 `commandExists` 函数的返回逻辑，并撤销 1.0.2 版本中所有不必要的 Windows 特殊处理。

## 执行步骤

### 1. 修复 commandExists 函数
- 文件：`src/utils/platform.ts`
- 修改：检查 `res.exitCode === 0` 而不是直接返回 `true`

### 2. 撤销 src/commands/init.ts 修改
- 移除 `wasAlreadyInstalled` 变量跟踪
- 移除 Windows 特殊提示逻辑
- 移除 `getPlatform` 导入

### 3. 撤销 src/utils/installer.ts 修改
- 移除安装后的延迟验证
- 移除 Windows 平台特殊处理
- 简化成功消息输出
- 移除 `getPlatform` 导入

### 4. 撤销 src/constants.ts 修改
- 移除 `windowsRestartHint` 中英文提示

### 5. 删除 changeset 文件
- 删除 `.changeset/fix-windows-path-refresh.md`

## 执行结果
✅ 所有修改已完成
✅ 构建和类型检查通过
✅ 功能测试验证正确

## 代码改进效果
- 代码量减少约 30 行
- 消除了误导性的"修复"
- 回归简单通用的逻辑
- 提升代码可维护性