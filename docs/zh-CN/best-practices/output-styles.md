---
title: 输出风格策略
---

# 输出风格策略

输出风格是高优先级的系统提示，适合定义团队规范、编码标准和 AI 行为准则。通过配置不同的输出风格，可以控制 AI 助手的个性和工作方式。

## 什么是输出风格

输出风格是存储在 `prompts/output-style/` 目录下的 Markdown 文件，定义了 AI 助手的：

- 🎭 **个性特征**：AI 的说话风格和行为方式
- 📝 **编码规范**：代码风格、注释要求、命名规范
- ✅ **质量标准**：代码审查标准、测试要求
- 🔍 **工作方式**：问题分析方法、决策流程

## 管理方式

### 安装输出风格

在初始化时通过 `--output-styles` 参数指定需要安装的风格：

```bash
# 安装所有输出风格
npx zcf init -o all

# 安装特定风格
npx zcf init -o engineer-professional,nekomata-engineer

# 跳过输出风格安装
npx zcf init -o skip
```

### 切换输出风格

#### 在主菜单中切换

```bash
npx zcf
# 选择 6 (配置 AI 记忆与输出风格)
# 然后选择输出风格管理
```

#### 在项目中切换

**Claude Code**：
```
/set-output-style engineer-professional
```

**Codex**：
通过编辑 `config.toml` 中的 `systemPromptStyle` 或使用系统提示配置。

### 编辑输出风格

输出风格文件位于 `prompts/output-style/` 目录：

```bash
# 查看已安装的风格
ls -la ~/.claude/prompts/output-style/

# 编辑特定风格
vim ~/.claude/prompts/output-style/engineer-professional.md

# 创建自定义风格
vim ~/.claude/prompts/output-style/my-custom-style.md
```

## 预置输出风格

<div align="center">
  <a href="https://github.com/Haleclipse">
    <img src="/assets/Haleclipse.webp" alt="哈雷酱" width="200" style="border-radius: 10px;"/>
  </a>
  <p>傲娇的<a href="https://github.com/Haleclipse">哈雷酱</a>大小姐(￣▽￣)ゞ</p>
</div>

ZCF 提供以下预置输出风格：

| 风格 ID | 名称 | 特点 | 适用场景 |
|---------|------|------|---------|
| `engineer-professional` | 专业工程师 | 严谨、专业、注重代码质量 | 正式项目、企业环境 |
| `nekomata-engineer` | 猫娘工程师 | 轻松友好、保持专业性 | 个人项目、轻松氛围 |
| `laowang-engineer` | 老王工程师 | 幽默接地气、直接有效 | 中文项目、国内团队 |
| `ojousama-engineer` | 大小姐工程师 | 优雅精致、注重细节 | 特定场景、风格化项目 |

### 内置输出风格

除了预置风格，还支持以下内置风格（始终可用）：

- `default`：默认输出风格
- `explanatory`：解释性风格，注重详细说明
- `learning`：学习型风格，注重教学和解释

## 实践建议

### 1. 将团队规范写入输出风格

输出风格是定义团队开发规范的理想位置：

```markdown
# ~/.claude/prompts/output-style/team-standards.md

## 编码规范

- 使用 TypeScript，严格模式
- 函数不超过 50 行
- 必须编写单元测试
- 使用 ESLint 和 Prettier
- 遵循 SOLID 原则

## 代码审查要求

- 所有 PR 必须经过代码审查
- 确保测试覆盖率 > 80%
- 检查性能影响
- 验证安全性
```

### 2. 创建多套风格按需切换

根据不同场景创建不同的输出风格：

```bash
# 开发时：使用专业工程师风格
/set-output-style engineer-professional

# 代码审查时：使用审查专用风格
/set-output-style code-review

# 文档编写时：使用文档编写风格
/set-output-style documentation
```

### 3. 项目特定风格

对于需要独立风格的项目，使用项目级别的输出风格：

```
# 在项目根目录创建
项目根目录/.claude/output-style/project-specific.md

# 在对话中使用
/set-output-style project-specific
```

项目特定风格会覆盖全局风格，但仅在该项目中生效。

### 4. 风格优先级

输出风格的优先级：

1. **项目特定风格**（`.claude/output-style/` 或 `.codex/output-style/`）
2. **全局默认风格**（`~/.claude/prompts/output-style/` 中的默认设置）
3. **内置风格**（`default`、`explanatory`、`learning`）

### 5. 版本控制

将团队输出风格纳入版本控制：

```bash
# 创建团队风格仓库
mkdir team-output-styles
cp ~/.claude/prompts/output-style/team-standards.md team-output-styles/

# 纳入 Git
git add team-output-styles/
git commit -m "Add team output style standards"

# 团队成员同步
git pull
cp team-output-styles/team-standards.md ~/.claude/prompts/output-style/
```

## 输出风格结构

典型的输出风格文件结构：

```markdown
# 输出风格名称

## 个性特征
描述 AI 的说话风格和行为方式

## 编码规范
- 代码风格要求
- 命名规范
- 注释要求

## 质量标准
- 代码审查标准
- 测试要求
- 性能标准

## 工作方式
- 问题分析方法
- 决策流程
- 协作方式
```

## 自定义输出风格

### 创建自定义风格

1. **创建风格文件**：
```bash
vim ~/.claude/prompts/output-style/my-style.md
```

2. **编写风格内容**：
```markdown
# 我的自定义风格

你是一个专业的全栈工程师，专注于：
- 代码质量和可维护性
- 性能优化
- 安全性考虑
- 用户体验

## 编码规范
- 使用 TypeScript
- 遵循 Airbnb 代码规范
- 编写完整的类型定义
- 必须包含错误处理

## 工作方式
- 先理解需求再编码
- 编写测试驱动开发
- 注重代码复用
- 持续重构优化
```

3. **使用自定义风格**：
```bash
# 设置默认风格
npx zcf
# 选择 6，然后选择 my-style

# 或在项目中使用
/set-output-style my-style
```

### 团队共享风格

将自定义风格分享给团队：

```bash
# 1. 导出风格文件
cp ~/.claude/prompts/output-style/team-style.md ./team-styles/

# 2. 纳入版本控制
git add team-styles/
git commit -m "Add team output style"

# 3. 团队成员导入
git pull
cp team-styles/team-style.md ~/.claude/prompts/output-style/
```

## 最佳实践

### 1. 分层定义规范

- **全局风格**：团队通用的编码规范和标准
- **项目风格**：项目特定的要求和约束
- **角色风格**：不同角色（开发者、审查者、文档编写者）的风格

### 2. 保持风格简洁

输出风格应该简洁明了，避免过于冗长：

- ✅ **推荐**：核心规范和关键要求
- ❌ **不推荐**：过于详细的细节（应放在项目文档中）

### 3. 定期更新风格

随着项目发展和团队成长，定期更新输出风格：

```bash
# 定期审查和更新
vim ~/.claude/prompts/output-style/engineer-professional.md

# 团队讨论后更新
git add prompts/output-style/
git commit -m "Update output style standards"
```

### 4. 测试风格效果

创建新风格后，测试其效果：

```bash
# 1. 设置新风格
/set-output-style my-new-style

# 2. 进行测试对话
请帮我实现一个简单的 Todo 功能

# 3. 评估输出是否符合预期

# 4. 根据反馈调整风格
```

### 5. 文档化风格

为自定义风格编写文档说明：

```markdown
# team-standards.md

## 风格说明

本风格定义了我们团队的开发规范和质量标准。

## 使用场景

- 正式项目开发
- 代码审查
- 技术评审

## 更新历史

- 2025-01-15: 初始版本
- 2025-02-01: 添加性能要求
```

## 注意事项

### Claude Code 版本要求

- ⚠️ **版本要求**：Claude Code 版本必须 > 1.0.81 才支持输出风格
- ✅ **检查版本**：使用 `npx zcf check-updates` 检查并更新
- 📝 **迁移说明**：旧版本的全局记忆规则已迁移到 `engineer-professional` 风格

### 风格文件位置

- **Claude Code**：`~/.claude/prompts/output-style/`
- **Codex**：`~/.codex/prompts/output-style/`（如果支持）
- **项目级别**：`.claude/output-style/` 或 `.codex/output-style/`

### 风格冲突处理

如果同时存在多个风格：

1. 项目级别风格优先
2. 全局默认风格次之
3. 内置风格作为后备

## 相关资源

- [模板系统](../advanced/templates.md) - 模板和输出风格详细介绍
- [配置管理](../features/multi-config.md) - 多配置和备份
- [使用技巧](tips.md) - 更多实用技巧

> 💡 **提示**：合理使用输出风格可以大大提高代码质量和开发效率。建议团队统一输出风格标准，并根据项目特点进行适当定制。输出风格应该简洁明了，重点关注核心规范和关键要求。