# AI 输出语言选择功能实施计划

## 任务背景
当前模板文件中硬编码了 `Always respond in Chinese-simplified`，需要让用户能够自由选择 AI 的输出语言。

## 需求分析
1. 在初始化和更新流程中添加 AI 输出语言选择
2. 默认使用用户选择的脚本语言
3. 支持用户输入自定义语言
4. 动态生成语言指令并插入到 CLAUDE.md 开头

## 实施方案

### 1. 扩展常量定义
- 创建 `AI_OUTPUT_LANGUAGES` 映射表，包含常用语言和对应指令
- 扩展 I18N 对象，添加语言选择相关的提示文本

### 2. 创建公共方法
- 文件：`src/utils/prompts.ts`
- 函数：`selectAiOutputLanguage()` - 提取重复的语言选择逻辑
- 功能：处理语言选择交互，支持自定义语言输入

### 3. 语言指令处理
- 文件：`src/utils/config.ts`
- 函数：`applyAiLanguageDirective()`
- 功能：动态插入/替换 CLAUDE.md 文件开头的语言指令

### 4. 初始化流程集成
- 在步骤 3 添加 AI 输出语言选择
- 在步骤 8 应用语言指令到 CLAUDE.md

### 5. 更新流程集成
- 添加 AI 输出语言选择步骤
- 调用公共方法避免代码重复

### 6. 模板文件清理
- 移除所有模板中的硬编码语言指令
- 保持模板内容的纯净性

## 已完成的改动

### 文件变更清单
1. **src/constants.ts**
   - 添加 `AI_OUTPUT_LANGUAGES` 常量
   - 添加 `AiOutputLanguage` 类型
   - 扩展 I18N 对象

2. **src/utils/config.ts**
   - 添加 `applyAiLanguageDirective()` 函数
   - 处理语言指令的动态插入

3. **src/utils/prompts.ts** (新文件)
   - 提取公共的语言选择逻辑
   - 避免代码重复

4. **src/commands/init.ts**
   - 集成 AI 语言选择步骤
   - 调用语言指令应用函数

5. **src/commands/update.ts**
   - 集成 AI 语言选择
   - 使用公共方法

6. **templates/zh-CN/CLAUDE.md**
   - 移除硬编码的语言指令

7. **templates/en/CLAUDE.md**
   - 移除硬编码的语言指令

## 技术亮点
1. **DRY 原则**：提取公共方法，避免代码重复
2. **KISS 原则**：简化语言选择逻辑
3. **SRP 原则**：每个函数职责单一明确
4. **扩展性**：易于添加新的语言支持

## 测试验证
- ✅ 构建成功
- ✅ 初始化流程测试通过
- ✅ 更新流程测试通过

## 后续优化建议
1. 可以考虑将语言配置保存到 zcf 配置中，避免每次都询问
2. 可以支持更多小语种
3. 可以添加语言预览功能