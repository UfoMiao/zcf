---
title: Spec 工作流集成
---

# Spec 工作流集成

Spec 工作流是一个综合性的 MCP 服务，提供从需求到实现的结构化特性开发工作流程。它通过标准化的需求分析、设计阶段、任务管理和实施工作流，帮助团队系统化地进行功能开发。

## 什么是 Spec 工作流

Spec Workflow MCP 是一个基于 Model Context Protocol (MCP) 的服务，专门为需求规格说明和设计文档生成而设计。它提供：

- 📋 **需求分析**：结构化需求收集和文档编写
- 🎨 **设计阶段**：详细的技术设计和架构规划
- 📊 **任务管理**：自动任务拆解和进度跟踪
- 🔄 **实施工作流**：从需求到实现的系统化方法
- 📈 **交互式仪表板**：内置的工作流可视化和管理仪表板
- ✅ **审批系统**：每个开发阶段的评审和审批流程

## 安装与配置

### 通过 ZCF 安装

Spec 工作流作为 MCP 服务的一部分，可以在 ZCF 初始化时选择安装：

```bash
# 完整初始化时选择 Spec Workflow
npx zcf init

# 或在已有环境中添加 MCP 服务
npx zcf → 选择 4 (配置 MCP)
```

在 MCP 服务选择界面中，选择 `spec-workflow` 即可安装。

### 手动安装（可选）

如果需要手动安装或更新 Spec Workflow MCP：

```bash
# 安装最新版本
npm install -g @pimzino/spec-workflow-mcp@latest

# 或使用 npx 运行
npx -y @pimzino/spec-workflow-mcp@latest
```

### 配置文件位置

Spec Workflow MCP 配置会添加到 Claude Code 或 Codex 的 MCP 服务配置中：

**Claude Code：**
```json
// ~/.claude/settings.json
{
  "mcpServers": {
    "spec-workflow": {
      "command": "npx",
      "args": ["-y", "@pimzino/spec-workflow-mcp@latest"]
    }
  }
}
```

**Codex：**
```toml
# ~/.codex/config.toml
[mcp_server."spec-workflow"]
command = "npx"
args = ["-y", "@pimzino/spec-workflow-mcp@latest"]
```

## 核心功能

### 需求分析

Spec 工作流提供结构化的需求收集和分析能力：

- **需求收集**：系统化地收集功能需求、非功能需求和约束条件
- **需求文档化**：自动生成标准化的需求规格说明文档
- **需求验证**：检查需求的完整性、一致性和可测试性

**使用示例**：
```
请帮我分析一个用户登录功能的需求
```

### 设计阶段

提供详细的技术设计和架构规划：

- **技术方案设计**：生成多个可行的技术方案
- **架构设计**：设计系统架构和模块划分
- **接口设计**：定义 API 接口和数据模型
- **数据库设计**：设计数据库表结构（如需要）

**使用示例**：
```
基于刚才的需求，请设计用户登录功能的技术方案
```

### 任务管理

自动任务拆解和进度跟踪：

- **任务拆解**：将大型需求拆解为可执行的小任务
- **任务优先级**：自动评估和分配任务优先级
- **进度跟踪**：实时跟踪任务完成情况
- **依赖管理**：识别和管理任务之间的依赖关系

**使用示例**：
```
请将登录功能拆解为具体的开发任务，并列出任务优先级
```

### 实施工作流

系统化的实施方法：

- **代码生成**：基于设计文档生成初始代码
- **测试用例**：自动生成测试用例
- **文档同步**：保持代码与文档的一致性
- **质量检查**：集成代码质量检查

## 仪表板功能

### 启动仪表板

Spec Workflow MCP 提供可选的工作流可视化仪表板：

```bash
# 使用命令行启动仪表板
npx -y @pimzino/spec-workflow-mcp@latest --dashboard
```

仪表板会在默认浏览器中打开，提供：

- 📊 **工作流可视化**：图形化展示工作流状态
- 📋 **任务列表**：查看和管理所有任务
- 📈 **进度统计**：查看整体进度和统计数据
- 🔍 **搜索和筛选**：快速查找特定任务或需求

### VS Code 扩展

也可以安装 VS Code 扩展获得更好的集成体验：

1. 打开 VS Code 扩展市场
2. 搜索 "Spec Workflow MCP"
3. 安装 [Pimzino.spec-workflow-mcp](https://marketplace.visualstudio.com/items?itemName=Pimzino.spec-workflow-mcp) 扩展

扩展提供：

- 🎯 **侧边栏集成**：在 VS Code 侧边栏直接访问工作流
- 🔔 **通知提醒**：任务状态变更时自动提醒
- 📝 **快速操作**：直接在编辑器中执行工作流操作

## 工作流阶段

Spec 工作流通常包含以下阶段：

1. **需求收集** → 收集和分析功能需求
2. **需求验证** → 验证需求的完整性和可行性
3. **方案设计** → 设计技术方案和架构
4. **任务拆解** → 将需求拆解为可执行任务
5. **实施开发** → 按照任务进行开发
6. **测试验证** → 编写和执行测试用例
7. **文档更新** → 更新相关文档
8. **评审验收** → 进行代码评审和功能验收

## 使用示例

### 完整工作流示例

假设要开发一个"用户评论"功能：

**步骤 1：需求分析**
```
请使用 Spec 工作流分析用户评论功能的需求
```

**步骤 2：设计阶段**
```
基于刚才的需求，请设计评论功能的技术方案，包括数据模型和 API 接口
```

**步骤 3：任务拆解**
```
将评论功能拆解为具体的开发任务，并列出任务依赖关系
```

**步骤 4：实施开发**
```
请按照任务列表，开始实现评论功能的第一个任务
```

### 与 ZCF 工作流结合

Spec 工作流可以与 ZCF 的其他工作流结合使用：

```bash
# 在 Claude Code 中
/zcf:workflow 开发用户评论功能，使用 Spec 工作流进行需求分析

# 或使用功能开发工作流
/zcf:feat 用户评论功能
```

在 Codex 中，虽然 Spec 工作流可以作为 MCP 服务使用，但没有对应的 `/prompts:` 命令，需要直接在对话中使用。

## 最佳实践

### 项目早期使用

在项目早期使用 Spec 工作流锁定需求范围：

- ✅ **减少返工**：通过结构化需求分析，避免后期需求变更
- ✅ **明确目标**：清晰的需求文档帮助团队理解项目目标
- ✅ **风险识别**：早期识别技术风险和实现难点

### 团队协作

在团队环境中：

- **统一模板**：使用统一的需求和设计模板
- **定期评审**：定期进行需求评审和设计评审
- **文档同步**：保持代码、文档和需求的一致性

### 自定义模板

结合 `advanced/templates.md` 自定义 Spec 模板以适配团队规范：

```bash
# 查看模板配置
cat ~/.claude/templates/spec-requirements.md

# 自定义模板
# 编辑模板文件以符合团队规范
```

### 版本控制

建议将 Spec 工作流生成的文档纳入版本控制：

```bash
# 创建工作流文档目录
mkdir -p .spec-workflow/{requirements,design,tasks}

# 将生成的文档保存到对应目录
# 纳入 Git 版本控制
git add .spec-workflow/
git commit -m "docs: add spec workflow documents"
```

## 与其他工具的集成

### Context7 集成

结合 Context7 MCP 服务获取库文档：

```
请查询 React Hook Form 的最新文档，用于评论功能的表单验证
```

### DeepWiki 集成

使用 DeepWiki 获取项目背景信息：

```
请查询项目的架构文档，了解评论功能需要集成的模块
```

### Git 工作流集成

与 ZCF Git 工作流结合，自动生成提交信息：

```bash
# 完成需求分析后
/git-commit -m "docs: add comment feature requirements spec"
```

## 故障排除

### MCP 服务未启动

如果 Spec 工作流无法使用：

1. **检查 MCP 配置**：确认 `settings.json` 或 `config.toml` 中包含 Spec Workflow 配置
2. **检查服务状态**：确认 MCP 服务正常运行
3. **重启应用**：重启 Claude Code 或 Codex 以加载新配置

### 仪表板无法访问

如果仪表板无法启动：

```bash
# 检查端口占用
lsof -i :3000  # 或其他端口

# 手动指定端口
npx -y @pimzino/spec-workflow-mcp@latest --dashboard --port 3001
```

### 文档生成失败

如果文档生成失败：

1. **检查权限**：确保对工作目录有写入权限
2. **检查磁盘空间**：确保有足够的磁盘空间
3. **查看日志**：检查 MCP 服务日志以获取详细错误信息

## 相关资源

- **GitHub 仓库**：[spec-workflow-mcp](https://github.com/Pimzino/spec-workflow-mcp)
- **官方文档**：[Spec Workflow 文档](https://github.com/Pimzino/spec-workflow-mcp/blob/main/README.md#quick-start)
- **VS Code 扩展**：[Spec Workflow MCP Extension](https://marketplace.visualstudio.com/items?itemName=Pimzino.spec-workflow-mcp)
- **MCP 服务**：查看 [MCP 服务集成](../features/mcp.md) 了解更多 MCP 服务

## 使用建议

### 适用场景

Spec 工作流特别适合：

- ✅ **大型功能开发**：需要详细规划和文档化的功能
- ✅ **团队协作**：需要明确需求和设计的团队项目
- ✅ **长期维护**：需要完整文档的项目
- ✅ **合规要求**：需要规范化文档的项目

### 不适用场景

可能不太适合：

- ⚠️ **快速原型**：快速验证想法的原型开发
- ⚠️ **小型修复**：简单的 bug 修复或小功能改进
- ⚠️ **个人项目**：个人项目可能不需要如此详细的需求文档

> 💡 **提示**：Spec 工作流是 ZCF 工作流生态的重要组成部分，建议在项目早期就引入，以获得最大的收益。结合 ZCF 的其他工作流和工具，可以构建完整的开发流程。