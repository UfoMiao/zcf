# 提取多选提示文字重构

## 任务背景
需要将多选提示文字"（空格选择，a全选，i反选，回车确认）"提取为独立的常量，以便在多处复用。

## 目标
1. 提取多选提示为可复用的i18n常量
2. 统一MCP服务选择、工作流类型选择、BMAD代理选择的提示显示
3. 支持中英文国际化

## 实施方案
采用方案3：在I18N对象中添加共享提示属性

### 修改内容

#### 1. constants.ts
- 添加 `multiSelectHint` 到中英文I18N对象
- 中文: "（空格选择，a全选，i反选，回车确认）"
- 英文: " (Space to select, a to select all, i to invert, Enter to confirm)"
- 更新 `selectMcpServices` 移除硬编码提示

#### 2. mcp-selector.ts
- 更新第24行message使用组合: `${i18n.selectMcpServices}${i18n.multiSelectHint}`

#### 3. workflow-installer.ts
- 更新第29行message使用组合: `${i18n.selectWorkflowType}${i18n.multiSelectHint}`
- 修复未使用的参数警告

#### 4. bmad-agents.ts
- 更新第36行message使用组合: `${i18n.selectBmadAgents}${i18n.multiSelectHint}`
- 使用i18n的验证消息

## 修改的文件
1. `src/constants.ts` - 添加multiSelectHint常量，更新相关提示文字
2. `src/utils/mcp-selector.ts` - 使用新的提示组合
3. `src/utils/workflow-installer.ts` - 使用新的提示组合，修复TS警告
4. `src/utils/bmad-agents.ts` - 使用新的提示组合和i18n验证消息

## 验证结果
- ✅ TypeScript类型检查通过
- ✅ 所有多选提示统一显示
- ✅ 支持中英文国际化
- ✅ 代码更易维护，避免重复