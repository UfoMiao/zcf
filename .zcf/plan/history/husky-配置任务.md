# Husky Git Hooks 配置任务

## 任务概述
为 ZCF 项目添加 husky 进行 git 提交检查，确保提交前执行：
- pnpm typecheck (TypeScript 类型检查)  
- pnpm lint (ESLint 代码风格检查)
- pnpm build (项目构建验证)
- pnpm test:coverage (测试覆盖率检查)

要求：所有检查都必须无错误和警告才能提交。

## 技术方案
- **方案**：Husky + lint-staged 标准组合
- **优势**：行业标准、性能优化、团队友好
- **配置**：pre-commit hook 执行完整检查流程

## 实施步骤
1. 安装 husky 和 lint-staged 依赖
2. 初始化 husky 配置
3. 配置 package.json 的 lint-staged 规则
4. 创建 pre-commit hook 脚本
5. 测试 git 提交流程
6. 验证所有检查都通过

## 项目上下文
- **项目**：ZCF v2.12.7 - TypeScript CLI 工具
- **包管理**：pnpm 9.15.9
- **当前状态**：所有检查命令都能正常运行
- **覆盖率**：85.4% (符合标准)