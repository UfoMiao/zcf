# MCP服务重构计划

## 任务描述
重构MCP_SERVICES，让它和其他功能一样业务代码和i18n分开，而不是现在直接放在constants.ts里

## 上下文
- 当前MCP_SERVICES在constants.ts中包含业务配置和多语言文本
- 项目已有完善的i18n分离模式（如workflows.ts）
- 需要遵循TDD开发模式

## 选定方案
方案 1：完全分离式
- 创建 `src/config/mcp-services.ts` 存放纯业务配置
- 完善现有 `src/i18n/locales/*/mcp.ts` 翻译文件
- 创建配置合并函数提供统一接口

## 实施步骤（TDD模式）

### 阶段1：测试驱动的配置模块创建
1. 编写MCP服务配置测试用例
2. 创建新的MCP服务配置模块
3. 实现配置合并函数直到测试通过

### 阶段2：测试驱动的i18n完善
4. 编写i18n翻译完整性测试
5. 完善翻译文件
6. 更新类型定义

### 阶段3：测试驱动的代码迁移
7. 编写集成测试验证新旧兼容性
8. 更新所有使用MCP_SERVICES的代码
9. 清理constants.ts

## 预期结果
- 业务配置与i18n完全分离
- 保持现有功能完全兼容
- 代码更清晰易维护
- 100%测试覆盖率

## 文件清单
- 新建：`src/config/mcp-services.ts`
- 新建：`tests/config/mcp-services.test.ts`
- 修改：`src/i18n/locales/zh-CN/mcp.ts`
- 修改：`src/i18n/locales/en/mcp.ts`
- 修改：`src/constants.ts`
- 修改：相关引用文件