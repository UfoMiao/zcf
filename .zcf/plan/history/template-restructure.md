# 模板文件结构重构计划 (v2)

## 任务概述

重构 ZCF 项目的模板文件结构和输出文件结构，以更好地组织工作流相关文件。

## 执行内容

### 1. 模板文件结构调整

**原结构：**

```
templates/
├── en/
│   ├── commands/
│   └── agents/
├── zh-CN/
│   ├── commands/
│   └── agents/
└── bmad-agents/
```

**新结构：**

```
templates/
├── en/
│   ├── plan/
│   │   ├── commands/
│   │   └── agents/
│   ├── sixStep/
│   │   ├── commands/
│   │   └── agents/
│   └── bmad/
│       ├── commands/
│       └── agents/
└── zh-CN/
    ├── plan/
    │   ├── commands/
    │   └── agents/
    ├── sixStep/
    │   ├── commands/
    │   └── agents/
    └── bmad/
        ├── commands/
        └── agents/
```

### 2. 输出文件结构调整

**新的输出路径：**

- Commands: `~/.claude/commands/zcf/{workflow-name}/`

  - workflow → `~/.claude/commands/zcf/workflow/`
  - feat → `~/.claude/commands/zcf/feat/`
  - bmad → `~/.claude/commands/zcf/bmad/`

- Agents: `~/.claude/agents/zcf/{category}/{agent-name}/`
  - planner → `~/.claude/agents/zcf/plan/planner/`
  - ui-ux-designer → `~/.claude/agents/zcf/plan/ui-ux-designer/`
  - analyst → `~/.claude/agents/zcf/bmad/analyst/`
  - pm → `~/.claude/agents/zcf/bmad/pm/`
  - 等等...

### 3. 代码更改

1. **类型定义更新** (`src/types/workflow.ts`)

   - 添加 `category` 字段
   - 添加 `outputDir` 字段

2. **工作流配置更新** (`src/config/workflows.ts`)

   - 为每个工作流添加 category 和 outputDir
   - 移除 bmad agents 的 "bmad-" 前缀

3. **安装器逻辑更新** (`src/utils/workflow-installer.ts`)

   - 更新文件源路径逻辑
   - 更新输出目录创建逻辑
   - 添加旧版文件自动清理功能

4. **国际化更新** (`src/constants.ts`)
   - 添加清理相关的 i18n 字符串

### 4. 旧版文件清理

自动删除以下旧版文件（如果存在）：

- `~/.claude/commands/workflow.md`
- `~/.claude/commands/feat.md`
- `~/.claude/agents/planner.md`
- `~/.claude/agents/ui-ux-designer.md`

注：bmad 相关文件为新增，不需要清理。

## 优势

1. **更清晰的组织结构**：按工作流类型分组，便于管理和维护
2. **避免文件冲突**：每个工作流的文件都在独立目录中
3. **向后兼容**：自动清理旧版文件，平滑升级
4. **扩展性好**：方便添加新的工作流类型

## 测试结果

- ✅ 构建成功
- ✅ 类型检查通过
- ✅ 文件结构正确创建
- ✅ 旧文件清理逻辑实现

## 第二次重构 - 分离记忆文件和工作流

## 第三次重构 - 优化目录层级结构

### 问题

初始重构后发现 `copyConfigFiles` 函数逻辑过于复杂，使用了多个过滤条件，不便于维护。

### 解决方案

将 Claude 记忆相关文件独立到 `claude-memory/` 目录，与工作流文件完全分离。

### 最终文件结构

```
templates/
├── en/
│   ├── claude-memory/      # Claude 记忆文件
│   │   ├── mcp.md
│   │   ├── personality.md
│   │   ├── rules.md
│   │   └── technical-guides.md
│   ├── plan/              # Plan 工作流
│   │   ├── commands/
│   │   └── agents/
│   ├── sixStep/           # Six Step 工作流
│   │   └── commands/
│   └── bmad/              # BMAD 工作流
│       ├── commands/
│       └── agents/
├── zh-CN/                 # 中文版本相同结构
│   ├── claude-memory/
│   ├── plan/
│   ├── sixStep/
│   └── bmad/
├── CLAUDE.md              # 基础配置文件
└── settings.json          # 设置文件
```

### 代码改进

1. **简化 copyConfigFiles**：只负责复制 claude-memory 文件
2. **独立 copyClaudeMemoryFiles**：专门处理记忆文件复制
3. **工作流安装器独立处理**：工作流文件由 workflow-installer.ts 负责

## 优势总结

1. **代码更清晰**：每个函数职责单一
2. **易于维护**：添加新的记忆文件或工作流都很简单
3. **结构分明**：记忆文件和工作流文件完全分离
4. **扩展性好**：便于未来添加新的文件类型

## 第三次重构 - 优化目录层级结构

### 改进点

1. 将 `claude-memory` 重命名为 `memory`，更加简洁
2. 将所有工作流目录移入 `workflow` 文件夹，建立清晰的功能层级

### 最终目录结构

```
templates/
├── en/
│   ├── memory/            # Claude 记忆配置
│   │   ├── mcp.md
│   │   ├── personality.md
│   │   ├── rules.md
│   │   └── technical-guides.md
│   └── workflow/          # 所有工作流
│       ├── plan/
│       │   ├── commands/
│       │   └── agents/
│       ├── sixStep/
│       │   └── commands/
│       └── bmad/
│           ├── commands/
│           └── agents/
├── zh-CN/                 # 中文版本相同结构
│   ├── memory/
│   └── workflow/
│       ├── plan/
│       ├── sixStep/
│       └── bmad/
├── CLAUDE.md
└── settings.json
```

### 优势

1. **层级更清晰**：memory（记忆配置）和 workflow（工作流）是两个独立的功能模块
2. **扩展性更好**：未来可以轻松添加新的顶级功能模块
3. **路径更规范**：所有工作流都在 workflow 目录下，便于统一管理

## 后续建议

1. 为新的文件结构编写单元测试
2. 更新用户文档说明新的文件位置
3. 考虑添加迁移提示，告知用户文件位置变更
