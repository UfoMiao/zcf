# 任务：去掉 noExistingConfig 判断

## 背景
用户报告某些电脑可能无法写入或读取 zcf 配置，但这不应该影响程序流程，只是没有偏好记忆而已。

## 需求
- 去掉 update 命令中的 noExistingConfig 强制退出判断
- 当配置不存在时，让用户正常选择语言
- 当配置存在时，保留现有的跳过逻辑
- 添加错误处理，使配置读写失败时静默处理

## 实施方案

### 1. 修改 update 命令 (src/commands/update.ts)
- 移除第 33-37 行的配置存在性检查
- 移除 existsSync 的导入
- 移除 SETTINGS_FILE 的导入

### 2. 增强配置错误处理 (src/utils/zcf-config.ts)
- 为 writeZcfConfig 添加 try-catch 静默处理写入错误
- 为 updateZcfConfig 添加 try-catch 静默处理更新错误

### 3. 更新测试文件 (test/unit/commands/update.test.ts)
- 移除 node:fs 的 mock
- 移除所有 existsSync 相关的测试代码
- 更新"无配置"测试用例的逻辑

## 执行结果
✅ 所有测试通过 (366 个测试)
✅ 类型检查通过
✅ 代码改动最小化，只影响必要的部分

## 关键改动
1. **src/commands/update.ts**: 删除了配置存在性检查，让程序继续执行
2. **src/utils/zcf-config.ts**: 添加了 try-catch 错误处理，静默处理权限问题
3. **test/unit/commands/update.test.ts**: 更新测试以匹配新逻辑

## 预期行为
- 当用户系统无法读写配置时，程序正常运行，每次需要手动选择语言
- 当配置可以正常读写时，保存用户偏好，下次自动跳过选择
- 不会因为权限问题导致程序退出