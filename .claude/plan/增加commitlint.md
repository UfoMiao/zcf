# commitlint 集成执行计划

## 项目上下文
- **项目**: ZCF (Zero-Config Code Flow) v2.12.7
- **技术栈**: TypeScript + ESM + pnpm + Husky + Vitest
- **目标**: 集成 commitlint 进行标准 Conventional Commits 验证

## 需求规格
- ✅ 使用标准 Conventional Commits 规范
- ✅ 不合规的 commit 阻止提交
- ✅ Scope 可选，不强制
- ✅ 使用 TypeScript 配置文件

## 执行方案
**方案1**: 标准集成方案（已选定）
- 官方 `@commitlint/config-conventional`
- `commit-msg` hook 验证
- TypeScript 配置文件

## 详细执行步骤

### 1. 安装 commitlint 依赖包
```bash
pnpm add -D @commitlint/cli @commitlint/config-conventional @commitlint/types
```

### 2. 创建 TypeScript 配置文件
- 文件: `commitlint.config.ts`
- 使用 `UserConfig` 和 `RuleConfigSeverity` 类型
- 配置 scope 可选规则

### 3. 配置 Husky commit-msg hook
- 文件: `.husky/commit-msg` 
- 验证 commit 消息格式
- 友好的错误提示

### 4. 更新 package.json 脚本
- 新增 `commitlint` 和 `commitlint:check` 脚本
- 提供手动验证能力

### 5. 测试 commitlint 配置
- 正面测试: 符合规范的 commit
- 负面测试: 不符合规范的 commit
- 验证错误提示友好性

### 6. 优化配置
- 根据测试结果调整规则
- 确保与项目风格匹配
- 性能优化

### 7. 质量评审
- 功能完整性验证
- 性能影响评估  
- 开发者体验评估

## 成功标准
- [x] 所有依赖包成功安装
- [x] TypeScript 配置文件生效
- [x] commit-msg hook 工作正常
- [x] 正负面测试用例通过
- [x] 与现有工作流无冲突
- [x] 开发者体验良好

## 预期文件变更
```
zcf/
├── .husky/
│   └── commit-msg (新增)
├── commitlint.config.ts (新增)
├── package.json (scripts更新)
└── .claude/plan/增加commitlint.md (本文件)
```

---
执行时间: 2025-09-02  
执行者: 浮浮酱  
状态: 执行中