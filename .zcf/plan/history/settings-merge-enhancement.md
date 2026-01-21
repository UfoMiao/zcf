# Settings.json 智能合并任务计划

## 任务背景
用户需求：导入工作流配置时不应该先复制 settings.json，会导致之前的环境变量被删除，从而导致 API 一直是不存在的；需要改成只增加或覆盖 settings 里相关内容，原来的变量等参数保留。

## 解决方案
采用智能合并 settings.json 方案，保留用户配置的同时更新模板内容。

## 实施细节

### 1. ✅ 创建数组合并策略函数
- 函数：`mergeArraysUnique()`
- 功能：合并数组并去除重复项
- 用于处理 permissions.allow 等数组配置

### 2. ✅ 优化 deepMerge 函数
- 增加 options 参数支持数组合并
- 当 `mergeArrays: true` 时，使用 `mergeArraysUnique` 合并数组
- 默认行为保持不变，确保向后兼容

### 3. ✅ 创建智能合并函数
- 函数：`mergeSettingsFile(templatePath, targetPath)`
- 核心逻辑：
  1. 如果目标文件不存在，直接写入模板内容
  2. 如果存在，读取并解析两个文件
  3. 特殊处理 env 对象，确保用户的环境变量完全保留
  4. 使用 deepMerge 合并其他配置
  5. 特殊处理 permissions.allow 数组去重
  6. 错误处理：合并失败时保留原文件

### 4. ✅ 修改 copyConfigFiles 函数
- 将 `copyFileSync` 替换为 `mergeSettingsFile`
- 只对 settings.json 使用智能合并
- 其他文件保持原有复制逻辑

## 合并策略

### 环境变量（env）
- **策略**：用户配置优先
- **实现**：`{...templateSettings.env, ...existingSettings.env}`
- **效果**：保留所有用户的 API keys 和自定义变量

### 权限数组（permissions.allow）
- **策略**：合并去重
- **实现**：使用 Set 去除重复项
- **效果**：添加新权限，保留用户自定义权限

### 其他配置
- **策略**：深度合并
- **实现**：递归合并对象
- **效果**：更新模板新增项，保留用户修改

## 测试场景

1. **新安装**：无 settings.json，应创建完整配置
2. **更新工作流**：保留 API 配置和自定义环境变量
3. **权限更新**：合并新权限，去除重复项
4. **错误恢复**：JSON 解析失败时保留原文件

## 预期效果

用户在导入工作流或更新配置时：
- API 配置完全保留
- 自定义环境变量不丢失
- 新功能配置自动添加
- 无需重新配置 API