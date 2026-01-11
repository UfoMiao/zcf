# 添加 CCU 命令实施计划

## 任务背景
为 ZCF 添加 ccu 命令，用于运行 Claude Code 用量分析工具 (ccusage@latest)

## 实施步骤

### 1. ✅ 创建命令实现文件
- 创建 `src/commands/ccu.ts`
- 实现 `executeCcusage` 函数，支持参数透传

### 2. ✅ 注册 CLI 命令
- 在 `src/cli-setup.ts` 中注册 ccu 命令
- 使用 `allowUnknownOptions()` 支持任意参数
- 更新帮助文档和示例

### 3. ✅ 创建工具功能模块
- 创建 `src/utils/tools.ts`
- 实现 `runCcusageFeature` 交互式菜单功能
- 支持选择不同分析模式（daily/monthly/session/blocks）

### 4. ✅ 更新菜单系统
- 在 `src/commands/menu.ts` 添加"其他工具"分类
- 添加选项 8 用于 Claude Code 用量分析
- 导入并调用 `runCcusageFeature`

### 5. ✅ 更新翻译文件
- 更新 `src/i18n/locales/zh-CN/menu.ts`
  - 添加 `ccusage: 'Claude Code 用量分析'`
  - 添加描述 `ccusage: '分析令牌使用量和成本'`
- 更新 `src/i18n/locales/en/menu.ts`
  - 添加对应英文翻译
- 更新 `src/i18n/locales/*/common.ts`
  - 添加 `back` 翻译

### 6. ✅ 更新类型定义
- 更新 `src/i18n/types.ts`
- 添加 ccusage 相关类型
- 添加 back 等通用翻译类型

### 7. ✅ 测试验证
- 命令行直接调用：`zcf ccu daily` ✅
- 参数透传：`zcf ccu monthly --json` ✅  
- 菜单交互流程 ✅
- 类型检查通过 ✅

## 实现效果

### 命令行使用
```bash
# 直接调用
zcf ccu daily
zcf ccu monthly --json
zcf ccu session
zcf ccu blocks

# 查看帮助
zcf ccu --help
```

### 菜单交互
- 主菜单新增"其他工具"分类
- 选项 8: Claude Code 用量分析
- 支持交互式选择分析模式
- 支持自定义参数输入

## 技术实现要点

1. **参数透传**: 使用 `allowUnknownOptions()` 和展开运算符传递所有参数
2. **命令执行**: 使用 `tinyexec` 的 `x` 函数执行 npx 命令
3. **stdio 继承**: 设置 `stdio: 'inherit'` 保持原始输出格式
4. **双语支持**: 所有界面文本支持中英文切换
5. **类型安全**: 完整的 TypeScript 类型定义