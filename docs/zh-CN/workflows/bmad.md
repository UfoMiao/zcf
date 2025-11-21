---
title: BMad 敏捷流程
---

# BMad 敏捷流程

> **官方资源**：[BMad Method - GitHub](https://github.com/bmad-code-org/BMAD-METHOD)

BMad（Build-Measure-Analyze-Decision）工作流适合大型项目的结构化迭代。BMad Method 是一个企业级的 AI 驱动敏捷开发框架，提供完整的团队协作工作流和文档模板。

## 什么是 BMad

BMad Method 是一个通用的 AI 代理框架，专为企业级敏捷开发而设计。它通过结构化的 Build-Measure-Analyze-Decision 循环，将复杂的开发任务分解为可管理的迭代周期。

### 核心特点

- 🏢 **企业级框架**：完整的敏捷开发流程和团队协作机制
- 🤖 **专业 AI 代理团队**：包含产品经理（PO）、项目经理（PM）、架构师、开发工程师、QA 测试等角色
- 📋 **完整文档模板**：自动生成 PRD、架构文档、用户故事等专业文档
- 🔄 **迭代管理**：支持持续迭代、验收和复盘
- 🌱 **项目类型支持**：支持全新项目（greenfield）和现有项目（brownfield）

## 使用方法

### Claude Code

在 Claude Code 中使用以下命令初始化 BMad 工作流：

```
/zcf:bmad-init
```

### Codex

> ⚠️ **注意**：BMad 工作流目前仅在 Claude Code 中提供，Codex 暂不支持此工作流。

如果需要类似的企业级敏捷开发流程，可以在 Codex 中使用 `/prompts:workflow` 六阶段工作流来实现类似功能。

## 核心功能

### 1. 一次性导入完整工作流

执行 `/zcf:bmad-init` 后，ZCF 会：

- ✅ 导入所有 BMad 指令集和文档模板
- ✅ 创建完整的项目结构
- ✅ 生成初始配置文件
- ✅ 设置 AI 代理团队

### 2. 迭代生命周期管理

BMad 工作流覆盖完整的迭代周期：

- **迭代计划**：基于 PRD 和架构文档制定迭代计划
- **执行开发**：按照计划执行开发任务
- **验收测试**：QA 团队进行验收测试
- **复盘总结**：团队复盘迭代成果和改进点

### 3. 专业 AI 代理团队

BMad 提供完整的专业 AI 代理团队，包括：

- **PO (Product Owner)**：产品负责人，负责产品规划和需求管理
- **PM (Project Manager)**：项目经理，负责项目进度和资源协调
- **架构师 (Architect)**：系统架构师，负责架构设计和技术方案
- **开发工程师 (Developer)**：开发人员，负责功能实现
- **QA (Quality Assurance)**：测试工程师，负责质量保证和测试

### 4. 项目类型支持

#### Greenfield（全新项目）

适合从零开始的新项目：

```bash
# 在项目根目录执行
/zcf:bmad-init

# BMad 会引导你：
# 1. 创建 PRD（产品需求文档）
# 2. 设计系统架构
# 3. 生成用户故事
# 4. 创建项目结构
```

#### Brownfield（现有项目）

适合已有代码库的项目现代化和功能增强：

```bash
# 在现有项目根目录执行
/zcf:bmad-init

# BMad 会：
# 1. 分析现有代码结构
# 2. 生成架构文档
# 3. 创建功能增强计划
# 4. 保持与现有代码的兼容性
```

### 5. 文档模板系统

BMad 初始化后会生成完整的文档模板：

- **PRD (Product Requirements Document)**：产品需求文档
- **架构文档**：系统架构设计文档
- **用户故事**：用户故事和验收标准
- **技术规范**：技术实现规范
- **测试计划**：测试计划和测试用例

## 工作流阶段

BMad 工作流遵循以下阶段：

### Build（构建）

- 根据 PRD 和架构文档进行开发
- 遵循编码规范和最佳实践
- 实现功能模块

### Measure（度量）

- 收集开发数据和指标
- 监控代码质量和性能
- 跟踪进度和风险

### Analyze（分析）

- 分析迭代成果
- 识别问题和改进点
- 评估技术债务

### Decision（决策）

- 评审迭代结果
- 决定下一步行动
- 调整开发计划

## 最佳实践

### 1. 团队统一使用

在团队环境中，建议统一使用 BMad 工作流：

```bash
# 团队成员统一执行
/zcf:bmad-init

# 这样可以确保：
# - 工作流规范一致
# - 文档格式统一
# - 协作效率提升
```

### 2. 结合 MCP 服务

结合 MCP 服务可以提升分析质量：

```bash
# 配置 MCP 服务
npx zcf
# 选择 4 (配置 MCP)

# 推荐服务：
# - Context7：查询技术文档
# - DeepWiki：获取项目背景信息
# - Spec Workflow：结构化需求分析
```

### 3. 迭代计划管理

- **制定明确的目标**：每个迭代应该有清晰的目标和范围
- **保持迭代长度适中**：建议 1-2 周的迭代周期
- **及时复盘**：每次迭代结束后进行复盘，持续改进

### 4. 文档维护

- **保持文档更新**：随着项目发展及时更新文档
- **版本控制**：将文档纳入 Git 版本控制
- **团队共享**：确保团队成员能够访问最新文档

### 5. 与 ZCF 其他工作流结合

BMad 可以与其他 ZCF 工作流结合使用：

```bash
# 1. 使用 BMad 进行项目规划
/zcf:bmad-init

# 2. 使用六阶段工作流实现具体功能
/zcf:workflow 实现用户登录功能

# 3. 使用功能开发工作流处理新需求
/zcf:feat 添加评论功能

# 4. 使用 Git 工作流管理代码
/git-commit
```

## 项目结构

BMad 初始化后会在项目根目录创建以下结构：

```
项目根目录/
├── .bmad-core/              # BMad 核心文件
│   ├── workflows/          # 工作流定义
│   ├── templates/          # 文档模板
│   └── agents/             # AI 代理定义
├── PRD.md                   # 产品需求文档
├── ARCHITECTURE.md          # 架构文档
├── USER_STORIES.md          # 用户故事
└── .claude/                 # Claude Code 配置
    └── plan/                # 迭代计划
```

## 故障排除

### 初始化失败

如果 `/zcf:bmad-init` 执行失败：

```bash
# 1. 检查是否在项目根目录
pwd

# 2. 检查 BMad 工作流是否已安装
ls -la ~/.claude/workflows/bmad/

# 3. 重新安装工作流
npx zcf update -w bmadWorkflow

# 4. 检查 Claude Code 版本
npx zcf check-updates
```

### 文档生成问题

如果文档没有正确生成：

```bash
# 1. 检查项目权限
ls -la .

# 2. 手动查看生成的文档
cat PRD.md
cat ARCHITECTURE.md

# 3. 重新初始化（会合并更新，不会覆盖已有内容）
/zcf:bmad-init
```

### 代理团队配置问题

如果 AI 代理团队无法正常工作：

```bash
# 1. 检查工作流文件
cat ~/.claude/workflows/bmad/bmad-init.md

# 2. 检查 Claude Code 配置
cat ~/.claude/settings.json | jq .mcpServers

# 3. 重新配置 MCP 服务（如果需要）
npx zcf
# 选择 4 (配置 MCP)
```

## 相关资源

- **官方文档**：[BMad Method - GitHub](https://github.com/bmad-code-org/BMAD-METHOD)
- **ZCF 工作流**：[工作流系统](../features/workflows.md)
- **项目初始化**：[init-project 命令](../workflows/git-commands.md#init-project)
- **MCP 服务**：[MCP 服务集成](../features/mcp.md)

## 使用建议

### 适用场景

BMad 工作流特别适合：

- ✅ **大型项目**：需要完整规划和文档化的企业级项目
- ✅ **团队协作**：需要多角色协作的团队项目
- ✅ **长期维护**：需要持续迭代和演进的项目
- ✅ **规范化开发**：需要标准化开发流程的项目

### 不适用场景

可能不太适合：

- ⚠️ **快速原型**：快速验证想法的原型开发
- ⚠️ **小型项目**：简单的个人项目或小工具
- ⚠️ **一次性脚本**：不需要持续维护的脚本

> 💡 **提示**：BMad 工作流是 ZCF 工作流生态的重要组成部分，特别适合企业级项目的规范化开发。建议在项目早期就引入 BMad 工作流，以获得最大的收益。结合 ZCF 的其他工作流和工具，可以构建完整的 AI 驱动开发流程。