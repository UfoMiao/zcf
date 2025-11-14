---
title: 配置管理
---

# 配置管理

ZCF 提供完善的配置管理系统，支持增量管理、备份策略和灵活的配置切换。了解配置系统的结构和机制，可以帮助您更好地管理和维护开发环境。

## 目录结构概览

ZCF 的配置分布在以下目录：

### 主要配置目录

| 目录 | 说明 | 主要文件 |
|------|------|---------|
| `~/.claude/` | Claude Code 主配置目录 | `settings.json`, `CLAUDE.md`, `prompts/`, `workflows/` |
| `~/.codex/` | Codex 主配置目录 | `config.toml`, `auth.json`, `prompts/`, `AGENTS.md` |
| `~/.ufomiao/zcf/` | ZCF 全局配置目录 | `config.toml` |
| `~/.claude-code-router/` | CCR 配置目录 | `config.json` |
| `~/.claude/backup/` | Claude Code 备份目录 | 时间戳备份文件 |
| `~/.codex/backup/` | Codex 备份目录 | 时间戳备份文件 |

### 配置文件详解

#### Claude Code 配置

```
~/.claude/
├── settings.json          # 主配置文件（API、MCP、权限等）
├── CLAUDE.md              # 项目记忆和系统提示
├── prompts/               # 提示词目录
│   ├── output-style/      # 输出风格模板
│   └── memory/            # 记忆模板
└── workflows/             # 工作流目录
    ├── zcf-workflow/      # 六阶段工作流
    ├── feat/              # 功能开发工作流
    ├── git/               # Git 工作流
    └── bmad/              # BMad 工作流
```

#### Codex 配置

```
~/.codex/
├── config.toml            # 主配置文件（TOML 格式）
├── auth.json              # API 密钥配置（加密存储）
├── AGENTS.md              # 系统提示和代理配置
├── prompts/               # 提示词目录
│   └── workflow/          # 工作流提示词
└── system-prompt/         # 系统提示模板
```

#### ZCF 全局配置

```
~/.ufomiao/zcf/
├── config.toml            # ZCF 全局配置（TOML 格式）
│   ├── preferredLang      # CLI 语言偏好
│   ├── templateLang       # 模板语言偏好
│   ├── aiOutputLang       # AI 输出语言偏好
│   └── codeToolType       # 当前活动工具类型
└── backup/                # ZCF 配置备份
```

## 增量管理模式

当 ZCF 检测到已有配置时，会询问操作策略。

### 配置处理策略

| 策略 | 说明 | 适用场景 | 风险 |
|------|------|---------|------|
| `backup` | 备份后覆盖（默认） | 推荐默认选项 | 低（有备份） |
| `merge` | 尝试合并新配置 | 需要保留自定义内容 | 中（可能冲突） |
| `new` | 忽略现有内容重新生成 | 需要全新配置 | 高（覆盖现有） |
| `docs-only` | 仅更新文档与提示词 | 仅需要更新模板 | 低 |
| `skip` | 跳过当前步骤 | 不需要修改 | 无 |

### 自动策略应用

在非交互模式下（`--skip-prompt`），ZCF 会自动应用默认策略：

- 默认策略：`backup`
- 可以通过 `--config-action` 参数指定策略

```bash
# 指定配置处理策略
npx zcf init -s --config-action merge

# 仅更新文档
npx zcf init -s --config-action docs-only
```

### 合并策略详解

`merge` 策略会尝试智能合并配置：

- ✅ **MCP 服务**：新增服务会合并到现有配置
- ✅ **工作流**：新工作流会添加到现有工作流
- ⚠️ **API 配置**：可能需要手动确认
- ⚠️ **输出风格**：新风格会添加到现有风格

## AI 输出语言指令

### 配置机制

`applyAiLanguageDirective` 函数会根据 `--ai-output-lang` 参数将对应的语言指令写入系统提示文件。

### 支持的语言选项

- `zh-CN`：中文输出指令
- `en`：英文输出指令
- `custom`：自定义语言指令

### 自定义语言指令

使用 `custom` 选项可以输入自定义语言指令：

```bash
npx zcf init --ai-output-lang custom
# 输入：使用日语回复，保持专业和礼貌的语调
```

自定义指令会写入：
- **Claude Code**：`~/.claude/CLAUDE.md`
- **Codex**：`~/.codex/AGENTS.md`

### 配置位置

语言指令的配置位置：

- **Claude Code**：`CLAUDE.md` 文件顶部
- **Codex**：`AGENTS.md` 文件顶部

## 模板语言选择

### 语言解析机制

`resolveTemplateLanguage` 函数会综合以下因素确定模板语言：

1. **命令行参数**：`--config-lang` 或 `--all-lang`
2. **配置文件**：`~/.ufomiao/zcf/config.toml` 中的 `templateLang`
3. **交互输入**：如果没有指定，会提示用户选择
4. **系统默认**：最后回退到 `en`

### 语言独立性

模板语言与 AI 输出语言相互独立，可以灵活组合：

```bash
# 中文模板 + 英文输出（适合需要英文代码注释）
npx zcf init --config-lang zh-CN --ai-output-lang en

# 英文模板 + 中文输出（适合国际化团队）
npx zcf init --config-lang en --ai-output-lang zh-CN
```

### 模板语言作用

模板语言影响：

- 工作流模板的语言版本
- 提示词和指令的语言
- 系统提示模板的语言
- 输出风格模板的语言

## 变更追踪建议

### 使用版本控制

建议使用 Git 管理配置目录：

```bash
# 创建配置仓库
mkdir ~/zcf-configs
cd ~/zcf-configs
git init

# 添加配置文件（注意排除敏感信息）
cat > .gitignore << EOF
*.key
auth.json
settings.json
config.toml
EOF

# 添加模板和工作流（不含敏感信息）
git add prompts/ workflows/ templates/
git commit -m "Add ZCF templates and workflows"
```

### 对比差异

在执行 `zcf update` 前后对比差异：

```bash
# 更新前
git add ~/.claude/
git commit -m "Before update"

# 执行更新
npx zcf update

# 查看差异
git diff ~/.claude/

# 审查变更后提交
git add ~/.claude/
git commit -m "After update"
```

### 备份恢复

如果意外覆盖了自定义内容，可以从备份目录恢复：

```bash
# 查看备份
ls -lt ~/.claude/backup/

# 恢复特定备份
cp -r ~/.claude/backup/backup_2025-01-15_10-30-45/* ~/.claude/

# 或恢复特定文件
cp ~/.claude/backup/backup_*/workflows/custom/my-workflow.md ~/.claude/workflows/custom/
```

## 配置管理最佳实践

### 1. 分层配置管理

- **全局配置**：团队共享的模板和工作流
- **个人配置**：个人的 API 密钥和偏好设置
- **项目配置**：项目特定的工作流和模板

### 2. 敏感信息处理

- ⚠️ **不要提交敏感信息到版本控制**
- ✅ **使用环境变量管理 API 密钥**
- ✅ **使用 `.gitignore` 排除敏感文件**
- ✅ **定期轮换密钥**

### 3. 配置同步

在多设备间同步配置：

```bash
# 方法 1：使用 Git
git clone ~/zcf-configs
cp -r zcf-configs/templates/* ~/.claude/workflows/

# 方法 2：使用云存储
rsync -av ~/.claude/workflows/ ~/Cloud/.claude/workflows/

# 方法 3：使用 Git Worktree
/git-worktree migrate
```

### 4. 定期审查

定期审查和清理配置：

```bash
# 清理旧备份（保留最近 30 天）
find ~/.claude/backup -name "*.bak" -mtime +30 -delete

# 审查未使用的配置
ls -la ~/.claude/workflows/
# 移除不再需要的自定义工作流
```

### 5. 团队协作

在团队环境中：

- 统一配置模板和标准
- 共享工作流和输出风格
- 维护配置变更日志
- 定期同步配置更新

## 配置迁移

### 从旧版本迁移

如果从旧版本 ZCF 升级：

```bash
# ZCF 会自动检测并迁移配置
npx zcf init

# 或手动检查迁移
cat ~/.ufomiao/zcf/config.toml
# 检查是否有迁移提示
```

### 跨工具迁移

从 Claude Code 迁移到 Codex：

```bash
# 1. 备份 Claude Code 配置
cp -r ~/.claude ~/.claude.backup

# 2. 初始化 Codex
npx zcf init -T codex

# 3. 手动迁移工作流和模板（如果需要）
# 注意：Claude Code 和 Codex 的模板格式可能不同
```

## 故障排除

### 配置冲突

如果遇到配置冲突：

```bash
# 1. 查看冲突详情
npx zcf init
# 选择 merge 策略时查看冲突提示

# 2. 手动合并配置
# 编辑配置文件，手动合并冲突项

# 3. 使用 backup 策略重新开始
npx zcf init --config-action backup
```

### 配置丢失

如果配置丢失：

```bash
# 1. 查找备份
ls -lt ~/.claude/backup/ | head -5

# 2. 恢复备份
cp -r ~/.claude/backup/backup_最新时间戳/* ~/.claude/

# 3. 重新初始化（如果备份不可用）
npx zcf init --config-action new
```

### 配置文件损坏

如果配置文件损坏：

```bash
# 1. 检查配置文件格式
cat ~/.claude/settings.json | jq .

# 2. 从备份恢复
cp ~/.claude/backup/backup_*/settings.json ~/.claude/

# 3. 或重新初始化
npx zcf init --config-action new
```

## 相关资源

- [多配置与备份](../features/multi-config.md) - 多配置系统和备份机制
- [国际化与语言](i18n.md) - 语言配置详细说明
- [模板系统](templates.md) - 模板管理和自定义

> 💡 **提示**：合理管理配置可以提高开发效率和团队协作质量。建议使用版本控制管理模板和工作流，同时妥善保管包含敏感信息的配置文件。定期备份和审查配置，确保开发环境的稳定性。