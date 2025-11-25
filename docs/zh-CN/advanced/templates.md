---
title: 模板与输出风格
---

# 模板与输出风格

ZCF 提供了完整的模板系统，包括工作流模板、输出风格模板和系统提示模板。这些模板支持多语言（中文和英文），可以自定义以满足团队特定需求。

## 模板系统概述

ZCF 的模板系统分为以下几个层次：

1. **工作流模板**：结构化的开发工作流程
2. **输出风格模板**：AI 助手的人格和输出风格
3. **系统提示模板**：项目级别的系统提示和规范
4. **MCP 服务模板**：MCP 服务的使用指南

## 模板目录结构

### Claude Code 模板

```
templates/claude-code/
├── common/                      # 通用配置模板
│   └── settings.json           # Claude 设置模板
├── zh-CN/                      # 中文模板集合
│   ├── output-styles/         # 输出风格模板
│   │   ├── engineer-professional.md
│   │   ├── nekomata-engineer.md
│   │   ├── laowang-engineer.md
│   │   └── ojousama-engineer.md
│   └── workflow/              # 工作流模板
│       ├── common/            # 通用工具工作流
│       ├── plan/              # 规划工作流
│       ├── sixStep/          # 六阶段工作流
│       ├── bmad/              # BMad 企业工作流
│       └── git/               # Git 工作流
└── en/                         # 英文模板集合
    ├── output-styles/         # 输出风格模板
    └── workflow/              # 工作流模板（结构同上）
```

### Codex 模板

```
templates/codex/
├── common/                     # 通用配置模板
│   └── config.toml            # Codex 配置模板
├── zh-CN/                      # 中文模板集合
│   ├── system-prompt/         # 系统提示模板
│   └── workflow/              # 工作流模板
│       ├── sixStep/          # 六阶段工作流
│       └── git/              # Git 工作流
└── en/                         # 英文模板集合
    ├── system-prompt/         # 系统提示模板
    └── workflow/              # 工作流模板（结构同上）
```

## 输出风格模板

输出风格定义了 AI 助手的个性和输出方式。这些模板存储在 `prompts/output-style/` 目录下。

### 预置输出风格

<div align="center">
  <a href="https://github.com/Haleclipse">
    <img src="/assets/Haleclipse.webp" alt="哈雷酱" width="200" style="border-radius: 10px;"/>
  </a>
  <p>傲娇的<a href="https://github.com/Haleclipse">哈雷酱</a>大小姐(￣▽￣)ゞ</p>
</div>

| 风格 ID | 名称 | 描述 | 适用场景 |
|---------|------|------|---------|
| `engineer-professional` | 专业工程师 | 专业、严谨的工程师风格 | 正式项目、企业环境 |
| `nekomata-engineer` | 猫娘工程师 | 轻松、友好的猫娘风格 | 个人项目、轻松氛围 |
| `laowang-engineer` | 老王工程师 | 幽默、接地气的中文风格 | 中文项目、国内团队 |
| `ojousama-engineer` | 大小姐工程师 | 优雅、精致的风格 | 特定场景、风格化项目 |

### 内置输出风格

除了预置风格，还支持内置风格：

- `default` - 默认输出风格
- `explanatory` - 解释性风格，注重说明
- `learning` - 学习型风格，注重教学

### 安装输出风格

```bash
# 安装所有输出风格
npx zcf init -o all

# 安装特定风格
npx zcf init -o engineer-professional,nekomata-engineer

# 设置默认输出风格
npx zcf init -o all -d engineer-professional

# 跳过输出风格安装
npx zcf init -o skip
```

### 切换输出风格

**Claude Code**：
```
/set-output-style engineer-professional
```

**Codex**：
通过系统提示配置或编辑 `config.toml` 中的 `systemPromptStyle`。

### 自定义输出风格

1. **编辑模板文件**：
```bash
# 找到模板文件
cd ~/.claude/prompts/output-style/

# 编辑或创建新风格
vim my-custom-style.md
```

2. **在初始化时使用**：
```bash
# 先初始化，然后手动复制自定义风格
cp my-custom-style.md ~/.claude/prompts/output-style/
```

3. **团队共享**：
```bash
# 将自定义风格纳入版本控制
git add prompts/output-style/my-custom-style.md
git commit -m "Add custom output style"
```

## 工作流模板

工作流模板定义了结构化的开发流程。每个工作流包含命令模板和可选的代理模板。

### 工作流类型

#### 1. 通用工具工作流 (`common/`)

**命令**：
- `init-project.md` - 项目初始化命令

**代理**：
- `init-architect.md` - 初始化架构师
- `get-current-datetime.md` - 时间工具

**用途**：提供项目初始化、常用工具和时间处理功能

#### 2. 规划工作流 (`plan/`)

**命令**：
- `feat.md` - 功能开发命令

**代理**：
- `planner.md` - 规划师
- `ui-ux-designer.md` - UI/UX 设计师

**用途**：新功能设计和规划

#### 3. 六阶段工作流 (`sixStep/`)

**命令**：
- `workflow.md` - 六阶段开发流程（研究→构思→计划→执行→优化→评审）

**用途**：结构化的开发流程

#### 4. BMad 工作流 (`bmad/`)

**命令**：
- `bmad-init.md` - BMad 初始化

**代理**：
- 完整的企业级开发团队模拟（PO、PM、架构师、开发、QA 等）

**用途**：企业级敏捷开发流程

#### 5. Git 工作流 (`git/`)

**命令**：
- `git-commit.md` - 智能 Git 提交
- `git-rollback.md` - 安全回滚
- `git-cleanBranches.md` - 清理已合并分支
- `git-worktree.md` - Git 工作树管理

**用途**：Git 操作自动化

### 工作流安装

```bash
# 安装所有工作流
npx zcf init -w all

# 安装特定工作流
npx zcf init -w sixStepsWorkflow,gitWorkflow

# 跳过工作流安装
npx zcf init -w skip
```

### 自定义工作流

1. **Fork 仓库并修改模板**：
```bash
# 1. Fork ZCF 仓库
git clone https://github.com/your-org/zcf.git
cd zcf

# 2. 修改模板
vim templates/claude-code/zh-CN/workflow/custom/my-workflow.md

# 3. 构建和测试
pnpm build
npm link
```

2. **在初始化时使用**：
```bash
# 使用自定义模板目录初始化
npx zcf init -w custom
```

3. **团队发布自定义模板**：
```bash
# 发布包含自定义模板的 npm 包
npm publish @your-org/zcf-templates
```

## 系统提示模板

系统提示模板定义了项目级别的 AI 行为规范和指导。

### CLAUDE.md

`CLAUDE.md` 是 Claude Code 的项目记忆文件，建议结构如下：

```markdown
# 项目配置

## 语言指令
使用中文回复

## 编码规范
- 使用 TypeScript
- 遵循 ESLint 规则
- 使用 2 空格缩进

## 工作流规范
使用六阶段工作流进行开发
```

### 项目记忆最佳实践

1. **层级化组织**：
```
项目根目录/
├── CLAUDE.md              # 全局配置（精简）
└── .claude/
    ├── plan/              # 计划文档
    ├── memory/            # 项目记忆
    │   ├── architecture.md
    │   ├── api-design.md
    │   └── coding-standards.md
    └── workflows/         # 工作流模板
```

2. **避免上下文过大**：
- 全局 `CLAUDE.md` 仅保留必要设定
- 复杂规范放入输出风格或项目记忆
- 使用 `/zcf:init-project` 生成层级化结构

3. **定期更新**：
```bash
# 更新模板和提示词
npx zcf update -g zh-CN
```

## 模板语言支持

ZCF 支持两种语言的模板：

### 中文模板 (`zh-CN`)

- 完整的中文本地化
- 中文 AI 交互模式
- 中文技术文档标准
- 中文工作流描述

### 英文模板 (`en`)

- 完整的英文本地化
- 英文 AI 交互模式
- 英文技术文档标准
- 英文工作流描述

### 语言切换

```bash
# 使用中文模板初始化
npx zcf init -c zh-CN

# 使用英文模板初始化
npx zcf init -c en

# 更新时切换语言
npx zcf update -c en
```

## 模板更新策略

### 更新方式

| 方式 | 命令 | 说明 |
|------|------|------|
| **完整更新** | `npx zcf update` | 更新所有模板 |
| **仅更新文档** | `npx zcf init --config-action docs-only` | 仅更新提示词和文档 |
| **合并更新** | `npx zcf init --config-action merge` | 合并新模板到现有配置 |

### 保留自定义内容

如果修改了模板，建议：

1. **备份自定义模板**：
```bash
# 备份自定义模板
tar -czf my-custom-templates.tar.gz ~/.claude/workflows/custom/
```

2. **使用版本控制**：
```bash
# 将自定义模板纳入 Git
git add ~/.claude/workflows/custom/
git commit -m "Add custom workflow templates"
```

3. **更新时检查**：
```bash
# 更新前对比差异
diff -r ~/.claude/workflows/ ~/.claude/backup/latest/workflows/
```

## 团队协作

### 统一模板

在团队中统一模板标准：

1. **创建团队模板仓库**：
```bash
# 创建模板仓库
mkdir team-zcf-templates
cd team-zcf-templates
git init

# 添加模板文件
cp -r ~/.claude/workflows/team-* ./
git add .
git commit -m "Initial team templates"
```

2. **团队成员同步**：
```bash
# 拉取团队模板
git pull origin main
cp -r team-* ~/.claude/workflows/
```

### 模板版本管理

- 使用语义化版本管理模板变更
- 为重大变更提供迁移指南
- 尽可能保持向后兼容
- 在现有配置上测试模板更新

## 故障排除

### 模板未安装

如果模板没有正确安装：

```bash
# 重新安装模板
npx zcf init --config-action new

# 检查模板目录
ls -la ~/.claude/workflows/
ls -la ~/.claude/prompts/output-style/
```

### 自定义模板丢失

如果自定义模板在更新后丢失：

```bash
# 从备份恢复
cp -r ~/.claude/backup/backup_*/workflows/custom/ ~/.claude/workflows/

# 或从版本控制恢复
git checkout HEAD -- ~/.claude/workflows/custom/
```

### 语言不匹配

如果模板语言与配置不匹配：

```bash
# 重新初始化并指定语言
npx zcf init --config-action backup -c zh-CN

# 或仅更新模板语言
npx zcf update -c zh-CN
```

## 相关资源

- [工作流系统](../features/workflows.md) - 工作流详细介绍
- [输出风格策略](../best-practices/output-styles.md) - 输出风格管理
- [配置管理](configuration.md) - 配置管理指南

> 💡 **提示**：合理使用模板系统可以大大提高开发效率。建议团队内部统一模板标准，并定期更新模板以获取最新功能。