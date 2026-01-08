# API Key 配置增强

## 任务背景
用户需要在配置 API Key 时能够选择使用 `ANTHROPIC_AUTH_TOKEN` 还是 `ANTHROPIC_API_KEY`，并为每个选项提供清晰的描述说明。

## 实现方案
采用方案 3：将 API 配置类型选择整合到初始选择中，用户可以直接选择要使用的认证方式。

## 修改内容

### 1. 更新 I18N 常量 (`src/constants.ts`)
- 移除原有的 `customApi` 和 `skipApi` 
- 添加新选项：
  - `useAuthToken`: 使用 Auth Token (OAuth 认证)
  - `useApiKey`: 使用 API Key (密钥认证)  
  - `skipApi`: 跳过配置
- 添加描述文本：
  - `authTokenDesc`: 适用于通过 OAuth 或浏览器登录获取的令牌
  - `apiKeyDesc`: 适用于从 Anthropic Console 获取的 API 密钥
- 区分 `enterAuthToken` 和 `enterApiKey` 提示

### 2. 修改 API 配置逻辑 (`src/commands/init.ts`)
- Step 6 中提供 3 个选项供用户选择
- 每个选项都包含描述说明
- 根据选择的类型显示对应的输入提示
- 传递 `authType` 到配置函数

### 3. 更新配置函数 (`src/utils/config.ts`)
- `ApiConfig` 接口新增 `authType` 字段
- 根据 `authType` 设置对应的环境变量：
  - `auth_token` → `ANTHROPIC_AUTH_TOKEN`
  - `api_key` → `ANTHROPIC_API_KEY`
- 保持向后兼容（默认使用 AUTH_TOKEN）

## 实现效果
用户在配置 API 时会看到三个清晰的选项：
1. 使用 Auth Token (OAuth 认证) - 适用于通过 OAuth 或浏览器登录获取的令牌
2. 使用 API Key (密钥认证) - 适用于从 Anthropic Console 获取的 API 密钥  
3. 跳过（稍后手动配置）

选择后会根据认证类型设置正确的环境变量。