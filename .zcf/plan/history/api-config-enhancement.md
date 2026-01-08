# API 配置增强任务计划

## 任务背景
用户需求：在配置 API 流程中判断原来配置文件里是否已经有了 ANTHROPIC_API_KEY、ANTHROPIC_AUTH_TOKEN 或 ANTHROPIC_BASE_URL，然后提示用户是否需要修改原来的配置。

## 解决方案
采用增强型 API 配置流程，提供更好的用户体验和灵活性。

## 实施步骤

### 1. ✅ 创建 API 配置读取工具函数
- 文件：`src/utils/config.ts`
- 添加 `getExistingApiConfig()` 函数
- 读取并返回现有的 API 配置信息

### 2. ✅ 增强验证器功能
- 文件：`src/utils/validator.ts`
- 添加 `detectAuthType()` 函数
- 改进 API Key 显示格式

### 3. ✅ 更新国际化配置
- 文件：`src/constants.ts`
- 添加所有新的提示文本（中英文）
- 支持配置显示、修改选项等

### 4. ✅ 重构 API 配置流程
- 文件：`src/commands/init.ts`
- 检测并显示现有配置
- 提供修改选项（保留/全部修改/部分修改）

### 5. ✅ 实现部分修改逻辑
- 添加 `configureApiCompletely()` 函数
- 添加 `modifyApiConfigPartially()` 函数
- 支持单独修改 URL、Key 或认证类型

### 6. ✅ 更新配置写入逻辑
- 文件：`src/utils/config.ts`
- 改进 `configureApi()` 函数
- 正确处理认证类型切换

## 核心功能特性

1. **配置检测**：自动检测现有 API 配置
2. **友好显示**：脱敏显示现有配置信息
3. **灵活修改**：支持部分或全部修改
4. **类型切换**：自动处理 auth_token 和 api_key 之间的切换
5. **向后兼容**：保持与现有配置的兼容性

## 预期效果

用户在配置 API 时将看到：
- 现有配置的详细信息（如果存在）
- 多种修改选项供选择
- 部分修改时的逐项编辑界面
- 清晰的操作反馈