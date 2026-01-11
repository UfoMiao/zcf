# Codex 增量配置管理实施计划

## 任务概述

改进 ZCF 中 codex 自定义 API 配置的用户体验，从覆盖式操作改为增量式管理，提供增加、修改、删除提供商配置的选项，同时保持自动备份机制。

## 技术方案

### 核心问题分析

**现有问题：**
1. `configureCodexApi()` 在自定义模式下总是覆盖现有配置
2. 即使已有提供商，也会强制重新配置所有提供商
3. 缺少增量式管理选项（增加、修改、删除）

**解决思路：**
- 检测到已有配置时，提供管理选项菜单
- 实现增加、修改、删除提供商的独立功能
- 保持现有备份机制和向后兼容性

### 文件结构规划

```
src/utils/code-tools/
├── codex.ts (重构现有函数)
├── codex-provider-manager.ts (新增：提供商管理核心逻辑)
└── codex-config-detector.ts (新增：配置检测逻辑)

tests/unit/utils/code-tools/
├── codex-provider-manager.test.ts (新增)
├── codex-config-detector.test.ts (新增)
└── codex-incremental-config.test.ts (新增：集成测试)
```

## TDD 开发计划

### 阶段 1：Red - 失败测试驱动 🔴

#### 步骤 1.1：配置检测逻辑测试
- **文件**：`tests/unit/utils/code-tools/codex-config-detector.test.ts`
- **测试用例**：
  - `detectConfigManagementMode()` 应识别无现有配置情况
  - `detectConfigManagementMode()` 应识别有现有配置情况
  - `detectConfigManagementMode()` 应返回正确的管理选项

#### 步骤 1.2：提供商增加功能测试
- **文件**：`tests/unit/utils/code-tools/codex-provider-manager.test.ts`
- **测试用例**：
  - `addProviderToExisting()` 应正确添加新提供商
  - `addProviderToExisting()` 应处理重复名称冲突
  - `addProviderToExisting()` 应创建备份

#### 步骤 1.3：提供商修改功能测试
- **测试用例**：
  - `editExistingProvider()` 应正确修改提供商配置
  - `editExistingProvider()` 应验证提供商存在性
  - `editExistingProvider()` 应保持其他提供商不变

#### 步骤 1.4：提供商删除功能测试
- **测试用例**：
  - `deleteProviders()` 应正确删除选中提供商
  - `deleteProviders()` 应处理默认提供商删除
  - `deleteProviders()` 应更新默认提供商

### 阶段 2：Green - 最小实现 🟢

#### 步骤 2.1：实现配置检测逻辑
- 创建 `src/utils/code-tools/codex-config-detector.ts`
- 实现基础检测函数使测试通过

#### 步骤 2.2：实现提供商管理器
- 创建 `src/utils/code-tools/codex-provider-manager.ts`
- 实现核心增删改功能

#### 步骤 2.3：重构主配置函数
- 修改 `configureCodexApi()` 集成新逻辑
- 确保向后兼容性

### 阶段 3：Refactor - 重构优化 🔵

#### 步骤 3.1：代码优化
- 提取公共逻辑
- 优化函数命名和结构
- 添加适当的错误处理

#### 步骤 3.2：翻译支持
- 扩展 `codex.json` 翻译文件
- 添加新功能相关的用户提示

### 阶段 4：Integration - 集成测试 🟡

#### 步骤 4.1：端到端测试
- 创建完整流程测试
- 验证用户交互体验
- 确保备份机制正常工作

## 成功标准

### 功能要求
1. **增量配置管理**：支持增加、修改、删除提供商配置
2. **数据安全性**：所有操作都有自动备份
3. **用户体验**：界面友好，操作流程清晰
4. **向后兼容**：不破坏现有功能

### 质量要求
1. **测试覆盖率**：≥ 90%
2. **代码规范**：符合项目 ESLint 规范
3. **TypeScript**：严格类型检查
4. **i18n 支持**：中英双语完整支持

### 性能要求
1. **响应时间**：配置操作 < 3秒
2. **内存使用**：合理的内存占用
3. **错误处理**：优雅的异常处理机制

## 验收测试场景

```typescript
// 场景 1：新用户首次配置
expect(configureCodexApi()).toDisplayCoverageMode()

// 场景 2：有配置用户选择增量管理
expect(configureCodexApi()).toDisplayManagementOptions()

// 场景 3：增加提供商成功
expect(addProvider(newProvider)).toBackupAndAdd()

// 场景 4：修改提供商成功
expect(editProvider(existingId, updates)).toBackupAndUpdate()

// 场景 5：删除提供商成功
expect(deleteProviders([id1, id2])).toBackupAndRemove()
```

## 实施约束

1. **TDD 严格执行**：先写测试，再写实现，最后重构
2. **代码质量**：TypeScript 严格模式，ESLint 规范
3. **i18n 支持**：所有用户交互文本必须支持中英双语
4. **错误处理**：优雅处理各种异常情况
5. **性能要求**：配置操作应在合理时间内完成

## 开发时间线

- **阶段 1（Red）**：预计 2-3 小时
- **阶段 2（Green）**：预计 3-4 小时
- **阶段 3（Refactor）**：预计 1-2 小时
- **阶段 4（Integration）**：预计 1-2 小时
- **总计**：预计 7-11 小时

## 风险控制

1. **技术风险**：现有代码复杂度较高，需仔细重构
2. **兼容性风险**：确保不破坏现有用户工作流
3. **测试风险**：模拟用户交互的复杂性
4. **时间风险**：TDD 开发可能需要更多时间投入

---

*计划创建时间：2025-09-19*
*负责开发：AI助手 - 猫娘工程师 幽浮喵*