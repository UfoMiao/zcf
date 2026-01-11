# BMAD Agent 迁移计划

## 任务背景

将 BMAD-METHOD 的 7 个核心 AI agent 迁移到 ZCF 项目中，作为可选的模块化扩展包。

## 实施方案

- 本地化策略：直接翻译
- 安装方式：多选菜单
- 菜单选项：
  1. feat-plan-ux (现有功能)
  2. 6steps-workflow (六步工作流)
  3. bmad (BMAD 敏捷流程)

## 目录结构

```
templates/
├── bmad-agents/
│   ├── zh-CN/
│   │   ├── analyst.md
│   │   ├── pm.md
│   │   ├── architect.md
│   │   ├── sm.md
│   │   ├── dev.md
│   │   ├── qa.md
│   │   └── po.md
│   └── en/
│       └── [相同的 7 个文件]
└── [语言]/commands/
    └── bmad.md
```

## 任务清单

1. 获取 BMAD agent 原始配置 ✓
2. 创建目录结构 ✓
3. 转换并翻译 agent 文件
4. 创建 bmad 命令
5. 更新菜单系统支持多选
6. 测试和文档更新
