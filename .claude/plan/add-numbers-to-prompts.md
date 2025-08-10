# 执行计划：为所有单选菜单添加序号

## 任务概述
为所有 inquirer prompt 的 list 类型选择项添加序号，统一序号格式（如：1. 选项名）

## 实施方案
方案 2：创建工具函数自动添加序号

## 执行步骤

### 1. 创建序号添加工具函数 ✅
- 文件：`src/utils/prompt-helpers.ts`
- 创建 `addNumbersToChoices` 函数
- 支持自定义序号格式

### 2. 更新所有使用 list prompt 的文件 ✅
已更新文件：
- `src/commands/init.ts` - 语言选择、配置操作选择、API操作选择
- `src/utils/config-operations.ts` - API认证类型、修改项选择
- `src/utils/prompts.ts` - AI输出语言、脚本语言选择
- `src/utils/ai-personality.ts` - AI人格选择
- `src/utils/features.ts` - 各种功能配置选择
- `src/utils/tools.ts` - CCUsage模式选择
- `src/commands/update.ts` - 配置语言选择

### 3. 排除项目
- `src/commands/menu.ts` - 主菜单已有编号，不修改
- `src/utils/mcp-selector.ts` - 使用checkbox多选，不需要序号
- `src/utils/workflow-installer.ts` - 使用checkbox多选，不需要序号
- `src/utils/ccr/config.ts` - 已手动添加序号

## 实现细节

### 工具函数设计
```typescript
export function addNumbersToChoices<T = any>(
  choices: Array<{ name: string; value: T; short?: string; disabled?: boolean | string }>,
  startFrom = 1,
  format: (index: number) => string = (n) => `${n}. `
): Array<{ name: string; value: T; short?: string; disabled?: boolean | string }>
```

### 使用示例
```typescript
// Before
choices: [
  { name: i18n.api.keepExistingConfig, value: 'keep' },
  { name: i18n.api.modifyAllConfig, value: 'modify-all' },
]

// After
choices: addNumbersToChoices([
  { name: i18n.api.keepExistingConfig, value: 'keep' },
  { name: i18n.api.modifyAllConfig, value: 'modify-all' },
])
```

## 测试验证
- 运行各个命令验证序号显示
- 检查功能正常工作
- 确保选择操作不受影响

## 完成状态
✅ 所有任务已完成