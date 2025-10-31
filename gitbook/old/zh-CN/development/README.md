# 开发文档

欢迎参与 ZCF 项目的开发！本文档将帮助您了解项目架构、开发流程和贡献方式。

## 🎯 开发概览

ZCF (Zero-Config Claude-Code Flow) 是一个基于 TypeScript 的 CLI 工具，采用模块化架构设计，专注于为开发者提供零配置的 Claude Code 环境。

### 技术栈
- **语言**: TypeScript (ESM-only)
- **构建工具**: unbuild
- **测试框架**: Vitest
- **代码规范**: @antfu/eslint-config
- **包管理器**: pnpm
- **版本管理**: Changesets

### 核心特性
- 🔧 零配置 Claude Code 环境设置
- 🌍 完整的国际化支持 (zh-CN/en)
- 🔗 MCP 服务自动配置和管理
- 📝 智能工作流模板系统
- 🛠️ 跨平台兼容性 (Windows/macOS/Linux/Termux)

## 🏗️ 项目架构

### 目录结构
```
src/
├── commands/          # CLI 命令实现
│   ├── init.ts       # 完整初始化
│   ├── menu.ts       # 交互式菜单
│   ├── update.ts     # 工作流更新
│   ├── ccr.ts        # CCR 管理
│   └── ccu.ts        # 使用分析
├── utils/            # 核心工具函数
│   ├── config.ts     # 配置管理
│   ├── installer.ts  # Claude Code 安装
│   ├── mcp.ts        # MCP 服务管理
│   ├── platform.ts   # 跨平台支持
│   └── workflow-installer.ts # 工作流安装
├── i18n/             # 国际化支持
│   ├── locales/      # 语言文件
│   └── types.ts      # 类型定义
├── types/            # TypeScript 类型
├── constants.ts      # 常量定义
└── cli.ts           # CLI 入口
```

### 模块职责

#### Commands 模块
负责处理用户命令和交互：
- **init.ts**: 完整环境初始化流程
- **menu.ts**: 交互式菜单系统
- **update.ts**: 工作流和配置更新
- **ccr.ts**: Claude Code Router 管理
- **ccu.ts**: 使用情况分析和统计

#### Utils 模块
提供核心功能支持：
- **config.ts**: 配置文件读写和合并
- **installer.ts**: Claude Code 自动安装
- **mcp.ts**: MCP 服务配置和管理
- **platform.ts**: 跨平台兼容性处理
- **workflow-installer.ts**: 工作流模板管理

#### I18N 模块
实现完整的国际化支持：
- 支持 zh-CN 和 en 两种语言
- 动态语言切换
- 模板和配置文件的本地化

## 🔧 开发环境设置

### 环境要求
- Node.js 16.0+
- pnpm 8.0+
- Git

### 快速开始
```bash
# 克隆项目
git clone https://github.com/UfoMiao/zcf.git
cd zcf

# 安装依赖
pnpm install

# 开发模式运行
pnpm dev

# 构建项目
pnpm build

# 运行测试
pnpm test

# 代码检查
pnpm lint
```

### 开发工作流
1. **Fork** 项目到您的 GitHub 账户
2. **Clone** 您的 fork 到本地
3. **创建功能分支**: `git checkout -b feature/your-feature`
4. **编写代码**并添加测试
5. **运行测试**确保通过: `pnpm test`
6. **提交变更**: `git commit -m "feat: your feature"`
7. **推送分支**: `git push origin feature/your-feature`
8. **创建 Pull Request**

## 📝 贡献指南

### 代码规范
- 遵循 TypeScript 严格模式
- 使用 ESM 模块系统
- 遵循 @antfu/eslint-config 代码风格
- 所有代码必须有对应的测试
- 公共 API 必须有 JSDoc 注释

### 提交规范
使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```bash
# 功能添加
git commit -m "feat: add new MCP service support"

# 错误修复
git commit -m "fix: resolve Windows path handling issue"

# 文档更新
git commit -m "docs: update installation guide"

# 重构代码
git commit -m "refactor: improve config merging logic"

# 测试添加
git commit -m "test: add unit tests for installer module"
```

### Pull Request 指南
1. **清晰的标题**描述变更内容
2. **详细的描述**说明变更原因和影响
3. **链接相关 Issue**（如果存在）
4. **确保测试通过**和代码规范检查
5. **更新相关文档**（如需要）

### 测试要求
- **单元测试覆盖率**: 最低 80%
- **集成测试**: 关键流程必须有集成测试
- **边界测试**: 异常情况和边界条件测试
- **跨平台测试**: 确保 Windows/macOS/Linux 兼容

## 🧪 测试指南

### 测试架构
```
tests/
├── unit/             # 单元测试
│   ├── commands/     # 命令测试
│   └── utils/        # 工具函数测试
├── integration/      # 集成测试
└── fixtures/         # 测试数据和模拟
```

### 测试命令
```bash
# 运行所有测试
pnpm test

# 监听模式
pnpm test:watch

# 覆盖率报告
pnpm test:coverage

# 运行特定测试
pnpm vitest utils/config.test.ts
```

### 测试最佳实践
1. **测试驱动开发**: 先写测试，再写实现
2. **Mock 外部依赖**: 文件系统、网络请求等
3. **清晰的测试命名**: 描述测试场景和预期结果
4. **独立的测试用例**: 每个测试应该能够独立运行
5. **覆盖边界情况**: 测试各种输入和异常情况

## 🔄 发版流程

### 版本管理
使用 [Changesets](https://github.com/changesets/changesets) 管理版本：

```bash
# 创建变更记录
pnpm changeset

# 版本升级
pnpm version

# 发布到 npm
pnpm release
```

### 版本策略
- **Patch** (1.0.x): 错误修复和小改进
- **Minor** (1.x.0): 新功能添加，向后兼容
- **Major** (x.0.0): 破坏性变更

### 发版检查清单
- [ ] 所有测试通过
- [ ] 代码覆盖率达标
- [ ] 文档更新完成
- [ ] CHANGELOG 更新
- [ ] 版本号符合语义化规范
- [ ] 构建产物正常

## 🐛 问题排查

### 常见开发问题

#### 构建失败
```bash
# 清理依赖重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install

# 清理构建缓存
rm -rf dist
pnpm build
```

#### 测试失败
```bash
# 更新测试快照
pnpm test -u

# 运行特定测试文件
pnpm vitest specific.test.ts --reporter=verbose
```

#### 代码风格检查失败
```bash
# 自动修复可修复的问题
pnpm lint:fix

# 手动检查具体问题
pnpm lint
```

## 📖 API 文档

### 核心 API

#### Configuration API
```typescript
interface ZCFConfig {
  language: 'zh-CN' | 'en'
  apiKey?: string
  baseUrl?: string
  mcpServices: string[]
  workflows: string[]
}

// 加载配置
function loadConfig(path?: string): ZCFConfig

// 保存配置  
function saveConfig(config: ZCFConfig, path?: string): void
```

#### Installer API
```typescript
// 安装 Claude Code
function installClaudeCode(): Promise<boolean>

// 检查安装状态
function checkInstallation(): Promise<InstallStatus>

// 配置 MCP 服务
function configureMCP(services: string[]): Promise<void>
```

#### Workflow API
```typescript
// 安装工作流
function installWorkflows(categories: string[]): Promise<void>

// 列出可用工作流
function listAvailableWorkflows(): Promise<WorkflowInfo[]>

// 更新工作流
function updateWorkflows(): Promise<void>
```

## 🤝 社区参与

### 获取帮助
- **GitHub Issues**: 报告 bug 和功能请求
- **GitHub Discussions**: 技术讨论和问题解答
- **README**: 基础使用说明
- **GitBook 文档**: 完整使用指南

### 贡献类型
- **代码贡献**: 功能实现和 bug 修复
- **文档改进**: 文档完善和翻译
- **测试补充**: 测试用例和覆盖率提升
- **问题反馈**: bug 报告和使用建议
- **社区支持**: 帮助其他用户解决问题

### 行为准则
- 尊重所有贡献者和用户
- 提供建设性的反馈
- 保持专业和友善的沟通
- 遵循开源协作最佳实践

---

感谢您对 ZCF 项目的关注和贡献！让我们一起建设更好的 AI 辅助开发工具。