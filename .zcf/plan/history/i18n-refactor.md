# I18N重构计划

## 任务描述
将所有i18n调用方式从当前的兼容方案重构为 `i18n.module.property` 的模块化结构

## 重构目标
- 完全移除兼容层（Proxy和扁平化结构）
- 采用严格的模块化访问模式
- 同时重构源代码和测试文件

## 影响范围

### 源代码文件
- **命令文件** (5个)：init.ts, menu.ts, update.ts, ccu.ts, ccr.ts
- **工具文件** (6个)：features.ts, ai-personality.ts, mcp-selector.ts, prompts.ts, validator.ts, i18n-helper.ts
- **常量文件** (1个)：constants.ts
- **i18n核心** (1个)：i18n/index.ts

### 测试文件
- 约37个测试文件需要同步更新

## 重构模式

### 模式1：变量赋值
```typescript
// 旧：const i18n = I18N[lang]
// 新：const i18n = getTranslation(lang)
```

### 模式2：属性访问
```typescript
// 旧：i18n.installSuccess
// 新：i18n.installation.installSuccess
```

### 模式3：直接访问
```typescript
// 旧：I18N[lang].cancelled
// 新：getTranslation(lang).common.cancelled
```

## 属性到模块的映射

基于类型定义文件分析，属性归属如下：

### common模块
- multiSelectHint, yes, no, skip, cancelled, error, complete
- none, notConfigured, spaceToSelectReturn, enterChoice
- invalidChoice, goodbye, returnToMenu, back

### language模块  
- selectScriptLang, selectConfigLang, selectAiOutputLang
- aiOutputLangHint, enterCustomLanguage, languageChanged
- configLangHint

### installation模块
- installPrompt, installing, installSuccess, installFailed
- npmNotFound, termuxDetected, termuxInstallHint
- termuxPathInfo, termuxEnvironmentInfo, windowsDetected

### api模块
- configureApi, useAuthToken, authTokenDesc, useApiKey
- apiKeyDesc, useCcrProxy, ccrProxyDesc, skipApi
- enterApiUrl, enterAuthToken, enterApiKey, apiConfigSuccess
- 以及所有api相关配置项

### workflow模块
- selectWorkflow, selectedWorkflows, installingWorkflow
- workflowInstalled, workflowFailed, cleaningOldFiles
- 所有workflow相关项

### bmad模块
- description, directoryOption, forceOption
- 所有bmad相关项

### menu模块
- 所有菜单相关项

### configuration模块
- 所有配置相关项

### mcp模块
- 所有MCP服务相关项

### errors模块
- 所有错误消息

### tools模块
- 所有工具相关项

### ccr模块
- 所有CCR代理相关项

## 执行步骤

1. ✅ 分析并记录所有i18n使用位置和模式
2. ⏳ 移除i18n兼容层代码（proxy和flat结构）
3. ⏳ 更新i18n/index.ts导出结构
4. ⏳ 重构src/commands目录下的i18n调用
5. ⏳ 重构src/utils目录下的i18n调用
6. ⏳ 更新constants.ts中的I18N导出
7. ⏳ 重构所有测试文件中的i18n调用
8. ⏳ 运行类型检查和测试验证

## 进度跟踪
- [x] 研究分析阶段
- [x] 方案设计阶段
- [x] 详细规划阶段
- [ ] 执行实施阶段
- [ ] 优化调整阶段
- [ ] 质量审查阶段