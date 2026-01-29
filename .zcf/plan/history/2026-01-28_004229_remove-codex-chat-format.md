# Remove Codex Chat Format Support

## Task Description
Codex 新版不再支持 chat 格式，需要删除相关选项和功能，默认 responses；对于 Codex 自定义 API 的预设中转配置里只有 chat 格式的需要删除

## Approach
方案 2：保留 wireApi 字段但隐藏 UI 选项，默认使用 responses

## Implementation Steps

### Step 1: Modify api-providers.ts
- Change `wireApi: 'responses' | 'chat'` to `wireApi: 'responses'`
- Remove codex config from GLM, MiniMax, Kimi presets (chat-only)

### Step 2: Modify codex-provider-manager.ts
- Change `wireApi?: 'responses' | 'chat'` to `wireApi?: 'responses'`
- Simplify validation logic

### Step 3: Modify codex.ts
- Remove protocol selection UI
- Default to 'responses'

### Step 4: Modify codex-config-switch.ts
- Remove protocol selection UI from add/edit/copy flows
- Default to 'responses'

### Step 5: Modify init.ts
- Change wireApi type to only 'responses'

### Step 6: Update i18n files
- Remove protocolChat translation
- Update wireApiInvalid message

### Step 7: Run tests

## Files to Modify
1. src/config/api-providers.ts
2. src/utils/code-tools/codex-provider-manager.ts
3. src/utils/code-tools/codex.ts
4. src/utils/code-tools/codex-config-switch.ts
5. src/commands/init.ts
6. src/i18n/locales/zh-CN/codex.json
7. src/i18n/locales/en/codex.json

## Status: In Progress
