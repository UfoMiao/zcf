# 补全CCU功能测试和文档更新计划

## 任务背景
为未提交的CCU命令功能补全测试文件，并更新相关文档。

## 涉及功能
1. **CCU命令** (`src/commands/ccu.ts`) - Claude Code用量分析命令
2. **工具集** (`src/utils/tools.ts`) - 交互式CCU功能菜单
3. **菜单更新** (`src/commands/menu.ts`) - 新增"其他工具"分类

## 执行步骤

### 测试文件创建
1. ✅ `test/unit/commands/ccu.test.ts` - CCU命令基础测试
2. ✅ `test/unit/commands/ccu.edge.test.ts` - CCU命令边缘测试  
3. ✅ `test/unit/utils/tools.test.ts` - 工具集基础测试
4. ✅ `test/unit/utils/tools.edge.test.ts` - 工具集边缘测试
5. ✅ `test/unit/commands/menu.test.ts` - 更新菜单测试

### 文档更新
6. ✅ `README.md` - 添加ccu命令说明
7. ✅ `README_zh-CN.md` - 同步中文文档
8. ✅ `CHANGELOG.md` - 记录新功能

### 验证
9. ✅ 运行类型检查和构建验证
10. ⚠️ 测试有部分失败，需要修复i18n相关问题

## 测试策略
- 使用Vitest框架
- Mock外部依赖（tinyexec, inquirer）
- 分层测试（基础测试 + 边缘测试）
- 目标覆盖率：90%+

## 文档更新原则
- 保持中英文同步
- 遵循项目现有格式
- 提供清晰的使用示例