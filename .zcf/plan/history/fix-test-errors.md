# 修复测试错误计划

## 任务目标
修复所有失败的测试，使测试通过率达到100%

## 当前状态
- 失败测试文件：5个
- 失败测试用例：26个
- 通过测试用例：436个
- 通过率：94.4%

## 失败的测试文件
1. test/unit/utils/config-operations.test.ts
2. test/unit/utils/i18n.test.ts
3. test/unit/utils/json-config.test.ts
4. test/unit/utils/tools.test.ts
5. test/unit/utils/workflow-installer.test.ts

## 执行步骤

### 步骤1：修复i18n.test.ts
**问题**：菜单选项文本不匹配 "Configure API or CCR Proxy" vs "Configure API / CCR proxy"
**解决**：更新测试断言中的文本
**文件**：test/unit/utils/i18n.test.ts
**预期**：修复约1个测试用例

### 步骤2：修复config-operations.test.ts  
**问题**：i18n mock结构不匹配新的模块化结构
**解决**：更新mock数据为模块化结构
**文件**：test/unit/utils/config-operations.test.ts
**预期**：修复约15个测试用例

### 步骤3：修复json-config.test.ts
**问题**：错误消息的i18n路径不正确
**解决**：更新mock和断言中的i18n路径
**文件**：test/unit/utils/json-config.test.ts
**预期**：修复约6个测试用例

### 步骤4：修复tools.test.ts
**问题**：继续提示的i18n路径变更
**解决**：更新mock数据结构
**文件**：test/unit/utils/tools.test.ts
**预期**：修复约2个测试用例

### 步骤5：修复workflow-installer.test.ts
**问题**：工作流选择的i18n路径变更
**解决**：更新mock数据结构
**文件**：test/unit/utils/workflow-installer.test.ts
**预期**：修复约2个测试用例

### 步骤6：运行完整测试验证
- 执行 pnpm test
- 确认所有测试通过
- 检查测试覆盖率

## 技术细节

### i18n结构变更映射
旧结构：
```javascript
i18n.property
i18n.menuOptions.fullInit
```

新结构：
```javascript
i18n.module.property
i18n.menu.menuOptions.fullInit
```

### 常见模块映射
- common: yes, no, cancelled, error, complete
- api: configureApi, useAuthToken, apiKeyValidation
- menu: menuOptions, menuDescriptions, selectFunction  
- workflow: workflowOption, workflowInstallSuccess
- configuration: backupSuccess, configSuccess
- mcp: configureMcp, mcpConfigSuccess
- installation: installSuccess, termuxDetected

### Mock数据更新策略
1. 只包含测试需要的属性
2. 使用部分mock而非完整结构
3. 保持最小化原则

## 预期结果
- 所有462个测试用例通过
- 测试覆盖率保持在90%以上
- 无新增的类型错误