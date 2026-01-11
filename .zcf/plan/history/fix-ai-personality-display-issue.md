# 修复 AI 个性风格选择界面重复显示问题

## 任务背景
用户报告在选择 AI 个性风格时，每次按上下箭头键，提示信息 "? 选择 AI 个性风格 › - Use arrow-keys. Return to submit." 会重复显示，导致界面文字越来越多。

## 问题分析
1. **根本原因**：@posva/prompts 库在处理 select 类型的 prompt 时存在渲染问题
2. **影响范围**：所有使用 select/multiselect 类型的交互界面
3. **解决方案**：将 @posva/prompts 替换为更成熟的 inquirer 库

## 实施步骤

### 1. 安装 inquirer 库
```bash
pnpm add inquirer@latest
pnpm add -D @types/inquirer@latest
```

### 2. 替换所有 @posva/prompts 引用
需要修改的文件：
- src/commands/init.ts
- src/commands/update.ts 
- src/commands/menu.ts
- src/utils/ai-personality.ts
- src/utils/config-operations.ts
- src/utils/prompts.ts
- src/utils/features.ts

### 3. API 迁移要点
- `prompts` → `inquirer.prompt`
- `type: 'select'` → `type: 'list'`
- `type: 'multiselect'` → `type: 'checkbox'`
- `type: 'text'` → `type: 'input'`
- `choices` 中的 `title` → `name`
- `initial` → `default`
- 响应结构从 `response.fieldName` 改为解构 `{ fieldName }`

### 4. 测试验证
- 运行类型检查：`pnpm typecheck`
- 构建项目：`pnpm build`
- 测试各个功能模块

### 5. 清理工作
- 移除 @posva/prompts 依赖：`pnpm remove @posva/prompts`

## 执行结果
✅ 成功将所有 prompts 调用迁移到 inquirer
✅ 类型检查通过
✅ 项目构建成功
✅ 解决了选择界面文字重复显示的问题
✅ 保持了所有原有功能正常工作

## 技术决策
选择直接使用 inquirer 而非创建适配器层，原因：
1. 遵循 KISS 原则，避免不必要的抽象
2. inquirer 是更成熟的库，功能更稳定
3. 减少代码复杂度和维护成本