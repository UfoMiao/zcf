# Technical Guides Implementation Plan

## 背景

用户反馈了两个具体问题：
1. Windows环境下Claude Code经常忘记用双引号包裹路径，导致反斜杠被吞掉
2. 在大型代码库中使用grep搜索容易超时，建议优先使用rg (ripgrep)

## 解决方案

创建独立的 `technical-guides.md` 文件，包含命令执行和工具使用的技术指导。

### 方案选择理由
- 保持模块化设计，与现有的 personality.md、mcp.md 等文件结构一致
- 遵循单一职责原则，rules.md 专注于高层编程原则
- 便于未来扩展更多技术指导

## 实施步骤

1. 创建中英文版本的 technical-guides.md
2. 更新 CLAUDE.md 模板引用新文件
3. 记录实施计划
4. 验证实施效果

## 文件结构

```
templates/
├── CLAUDE.md (更新引用)
├── zh-CN/
│   └── technical-guides.md (新建)
└── en/
    └── technical-guides.md (新建)
```