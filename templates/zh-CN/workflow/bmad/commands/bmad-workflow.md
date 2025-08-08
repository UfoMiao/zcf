---
description: 'BMAD-METHOD 敏捷开发工作流 - 使用7个专业AI代理进行完整的软件开发生命周期管理'
---

# BMAD-METHOD 敏捷开发工作流

使用 BMAD-METHOD 的 7 个专业 AI 代理来管理完整的软件开发生命周期。

## 使用方法

```bash
/bmad-workflow <代理名称> [命令参数]
```

## 可用代理

1. **analyst** (Mary) - 商业分析师
   - 市场研究、头脑风暴、竞争分析、项目简报

2. **pm** (John) - 产品经理
   - 创建PRD、产品策略、功能优先级、路线图规划

3. **architect** (Winston) - 架构师
   - 系统设计、架构文档、技术选型、API设计

4. **sm** (Bob) - Scrum Master
   - 故事创建、史诗管理、敏捷流程指导

5. **dev** (James) - 全栈开发者
   - 代码实现、调试、重构、开发最佳实践

6. **qa** (Quinn) - 高级开发者兼QA架构师
   - 代码审查、重构、测试规划、质量保证

7. **po** (Sarah) - 产品负责人
   - 待办事项管理、故事优化、验收标准、冲刺规划

## 工作流程示例

### 1. 新项目启动
```bash
/bmad-workflow analyst *create-project-brief
/bmad-workflow pm *create-prd
/bmad-workflow architect *create-full-stack-architecture
```

### 2. 故事开发流程
```bash
/bmad-workflow sm *draft
/bmad-workflow dev *develop-story
/bmad-workflow qa *review
```

### 3. 产品规划
```bash
/bmad-workflow analyst *brainstorm "新功能构思"
/bmad-workflow pm *create-epic
/bmad-workflow po *execute-checklist-po
```

## 激活代理

你正在加载 BMAD-METHOD 的 $AGENT_NAME 代理...

@bmad-agents/zh-CN/$AGENT_NAME.md

## 注意事项

- 每个代理都有其专门的职责和命令集
- 使用 `*help` 命令查看每个代理的可用命令
- 代理之间可以协作完成复杂的开发任务
- 遵循 BMAD-METHOD 的敏捷开发最佳实践