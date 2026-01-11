# AI 个性配置功能实施计划

## 任务描述
在 init 和 update 流程中增加 AI 个性角色配置相关功能，并且记住用户配置，下次再执行时候先判断是否存在，询问用户是否需要修改角色。

## 实施方案
采用方案三（智能检测配置）：
- 自动检测用户是否已配置过 AI 个性
- 对新用户引导配置
- 对老用户提供修改选项
- 持久化保存用户的个性选择

## 文件结构改造
使用 "@xxx" 语法拆分 CLAUDE.md：
- `rules.md` - 包含现有的上半部分规则内容
- `mcp.md` - 包含 MCP 服务优先使用说明
- `role.md` - 包含 AI 角色/个性配置

## 已完成的任务

### 1. 重构 CLAUDE.md 文件结构
- ✅ 创建 `templates/zh-CN/rules.md` - 包含编程原则和工作流程
- ✅ 创建 `templates/zh-CN/mcp.md` - MCP 服务配置
- ✅ 创建 `templates/zh-CN/role.md` - AI 角色定义
- ✅ 创建对应的英文版本文件
- ✅ 更新 CLAUDE.md 使用 @include 语法

### 2. 扩展 ZcfConfig 接口
- ✅ 在 `ZcfConfig` 接口中添加 `aiPersonality?: string` 字段
- ✅ 更新 `updateZcfConfig` 函数以支持个性配置持久化

### 3. 创建个性配置检测函数
- ✅ 添加 `hasExistingPersonality()` - 检测是否已有配置
- ✅ 添加 `getExistingPersonality()` - 获取当前配置
- ✅ 添加 `getPersonalityInfo()` - 获取个性详细信息
- ✅ 更新 `configureAiPersonality()` - 支持显示当前配置和智能检测

### 4. 修改文件复制逻辑
- ✅ 添加 `processClaudeMdWithIncludes()` 函数
- ✅ 更新 `copyDirectory()` 和 `copyMdFiles()` 支持 @include 语法
- ✅ 更新 `applyAiLanguageDirective()` 使用标记方式

### 5. 更新 I18N 常量
- ✅ 添加中文提示文本：
  - `existingPersonality`: "检测到已有 AI 个性配置"
  - `currentPersonality`: "当前个性"
  - `modifyPersonality`: "是否修改 AI 个性配置？"
  - `keepPersonality`: "保持当前个性配置"
- ✅ 添加对应的英文版本

### 6. 更新命令流程
- ✅ 在 init 命令中添加个性配置步骤（步骤 8.5）
- ✅ 更新 `updatePromptOnly` 函数包含个性配置
- ✅ update 命令通过调用 `updatePromptOnly` 自动支持个性配置

## 技术实现细节

### @include 语法处理
- 在复制文件时检测 CLAUDE.md
- 解析 @filename 语法
- 读取并替换为实际文件内容
- 支持相对路径引用

### 个性配置智能检测
1. 检查 zcf-config 中是否有 aiPersonality 字段
2. 如果有，显示当前配置并询问是否修改
3. 如果用户选择保持，跳过配置
4. 如果用户选择修改或新用户，显示个性选择列表
5. 保存选择到 zcf-config

### 文件写入逻辑
- AI 语言指令写入 CLAUDE.md（带标记）
- AI 个性配置写入 role.md（覆盖整个文件）
- 配置持久化到 ~/.zcfrc.json

## 测试要点
1. 新用户首次运行 init - 应该提示配置个性
2. 已配置用户再次运行 init - 应该显示当前配置并询问是否修改
3. 运行 update 命令 - 应该有相同的个性配置流程
4. 验证 @include 语法正确展开文件内容
5. 验证 role.md 正确更新为选择的个性

## 后续优化建议
1. 可以考虑添加更多预设的 AI 个性选项
2. 支持导入/导出个性配置
3. 支持多个性切换功能
4. 在菜单中单独提供个性配置选项