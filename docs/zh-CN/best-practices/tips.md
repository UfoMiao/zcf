---
title: 使用技巧
---

# 使用技巧

本文档收录了 ZCF 在日常使用中的实用技巧和最佳实践，帮助你在各种场景中更高效地使用 ZCF。

## 核心技巧

### 1. 善用交互式菜单

**技巧**：习惯从 `npx zcf` 开始，所有功能都有编号提示，避免记忆命令细节。

```bash
# 打开交互式菜单
npx zcf

# 菜单选项包括：
# 1 - 完整初始化
# 2 - 导入工作流
# 3 - 配置 API 或 CCR
# 4 - 配置 MCP
# 5 - 配置默认模型
# 6 - 配置 AI 记忆
# 7 - 配置环境权限
# R - CCR 管理
# U - ccusage 使用分析
# L - CCometixLine 管理
# + - 检查更新
# ... 等等
```

**优势**：
- ✅ 无需记忆复杂的命令参数
- ✅ 可以浏览所有可用功能
- ✅ 适合不熟悉命令的用户
- ✅ 减少输入错误

### 2. 定期运行更新

**技巧**：保持工作流与模板最新，并触发版本检查。

```bash
# 每周更新一次（推荐）
npx zcf update

# 或使用缩写
npx zcf u

# 非交互式更新
npx zcf u -s -g zh-CN
```

**最佳实践**：
- 📅 每周更新一次，获取最新工作流模板
- 🔔 关注版本更新提示，及时升级工具
- 💾 更新前自动创建备份，可放心更新

### 3. 多语言切换策略

**技巧**：灵活使用语言参数，适应不同场景需求。

```bash
# 统一设置所有语言为中文
npx zcf init -g zh-CN

# 模板中文，AI 输出英文（适合需要英文代码注释的场景）
npx zcf init -c zh-CN -a en

# 仅更新时切换语言
npx zcf update -c en
```

**使用场景**：
- 🌐 **国际化项目**：使用英文模板，便于团队协作
- 🇨🇳 **中文项目**：使用中文模板，提高可读性
- 🔀 **混合场景**：模板中文，AI 输出英文代码注释

### 4. 多设备配置同步

**技巧**：在多台设备间同步配置，保持开发环境一致。

#### 方法 1：使用 Git Worktree

```bash
# 在项目中创建工作树并迁移配置
/git-worktree migrate

# 或使用命令行
git worktree add ../project-config
cp -r ~/.claude/* ../project-config/.claude/
```

#### 方法 2：使用云存储同步

```bash
# 使用 Dropbox、iCloud、OneDrive 等
# 将配置目录链接到云存储

# macOS/iCloud
ln -s ~/Library/Mobile\ Documents/com~apple~CloudDocs/.zcf-configs ~/.zcf-sync

# 同步配置
rsync -av ~/.claude/ ~/.zcf-sync/claude/
rsync -av ~/.codex/ ~/.zcf-sync/codex/
```

#### 方法 3：使用版本控制

```bash
# 创建配置仓库
mkdir ~/zcf-configs && cd ~/zcf-configs
git init

# 添加配置文件（注意排除敏感信息）
echo "*.key" >> .gitignore
echo "auth.json" >> .gitignore
git add .claude/ .codex/
git commit -m "Initial ZCF configs"

# 在多设备间拉取
git pull origin main
```

### 5. 脚本化运维部署

**技巧**：结合 `--skip-prompt` 参数与 JSON 配置，实现自动化部署。

#### CI/CD 脚本示例

```bash
#!/bin/bash
# deploy-zcf.sh - 自动化部署 ZCF 配置

# 从环境变量读取配置
API_KEY=${ZCF_API_KEY}
PROVIDER=${ZCF_PROVIDER:-302ai}
LANG=${ZCF_LANG:-zh-CN}

# 非交互式初始化
npx zcf init -s \
  --provider "$PROVIDER" \
  --api-key "$API_KEY" \
  --all-lang "$LANG" \
  --mcp-services all \
  --workflows all \
  --output-styles all

echo "ZCF 配置部署完成"
```

#### 新员工入职脚本

```bash
#!/bin/bash
# onboard-dev.sh - 新开发者入职配置脚本

echo "配置开发环境..."

# 1. 配置 ZCF（使用配置文件）
npx zcf init -s --api-configs-file ./team-api-configs.json

# 2. 更新工作流
npx zcf update -s -g zh-CN

# 3. 检查工具版本
npx zcf check-updates

echo "开发环境配置完成！"
```

#### 批量部署脚本

```bash
#!/bin/bash
# batch-deploy.sh - 批量服务器部署

SERVERS=("server1" "server2" "server3")

for server in "${SERVERS[@]}"; do
  echo "部署到 $server..."
  ssh "$server" "npx zcf init -s -p 302ai -k '${API_KEY}' -g zh-CN"
done
```

### 6. 监控使用量

**技巧**：使用 `ccu` 命令监控 API 使用量，防止超额调用。

```bash
# 查看使用统计
npx zcf ccu

# 输出 JSON 格式（用于集成到监控系统）
npx zcf ccu --json > usage.json

# 查看详细统计
npx zcf ccu --verbose
```

**集成示例**：

```bash
#!/bin/bash
# monitor-usage.sh - 使用量监控脚本

# 获取使用量
USAGE=$(npx zcf ccu --json)

# 解析 JSON（使用 jq）
TOKENS=$(echo "$USAGE" | jq '.tokens.total')
COST=$(echo "$USAGE" | jq '.cost.total')

# 发送告警（如果超过阈值）
if [ "$TOKENS" -gt 1000000 ]; then
  echo "警告：Token 使用量超过 100 万！" | mail -s "ZCF 使用量告警" admin@example.com
fi
```

## 高级技巧

### 7. 使用 API 提供商预设

**技巧**：利用提供商预设简化配置，从 5+ 个参数减少到 2 个。

```bash
# 传统方式（需要多个参数）
npx zcf init -s \
  -t api_key \
  -k "sk-xxx" \
  -u "https://api.302.ai/v1" \
  -M "claude-sonnet-4-5" \
  -F "claude-haiku-4-5"

# 使用预设（仅需 2 个参数）
npx zcf init -s -p 302ai -k "sk-xxx"
```

**支持的提供商**：`302ai`, `glm`, `minimax`, `kimi`, `custom`

### 8. 多配置管理

**技巧**：使用配置切换功能，在不同环境间快速切换。

```bash
# 列出所有配置
npx zcf config-switch --list

# 切换到工作配置
npx zcf config-switch work

# 切换到个人配置
npx zcf config-switch personal

# 在 Codex 中切换
npx zcf config-switch work --code-type codex
```

**命名建议**：
- `work` - 工作环境配置
- `personal` - 个人环境配置
- `test` - 测试环境配置
- `demo` - 演示环境配置

### 9. 工作流组合使用

**技巧**：将不同工作流组合使用，提高开发效率。

```bash
# 1. 使用功能开发工作流规划功能
/zcf:feat 添加用户评论功能

# 2. 使用六阶段工作流实现细节
/zcf:workflow 实现评论的 CRUD 操作

# 3. 使用 Git 工作流提交代码
/git-commit

# 4. 使用 BMad 工作流进行迭代
/zcf:bmad-init
```

### 10. 输出风格策略

**技巧**：根据不同场景选择合适的输出风格。

```bash
# 查看可用风格
npx zcf init -s -o all

# 在对话中切换风格
# Claude Code: /set-output-style engineer-professional
# Codex: 通过系统提示配置
```

**风格选择建议**：
- `engineer-professional` - 专业工程师风格，适合正式项目
- `nekomata-engineer` - 猫娘工程师风格，适合轻松氛围
- `laowang-engineer` - 老王工程师风格，适合中文环境
- `ojousama-engineer` - 大小姐工程师风格，适合特定场景

### 11. MCP 服务优化

**技巧**：根据项目需求选择 MCP 服务，避免安装不必要的服务。

```bash
# 仅安装必需的服务
npx zcf init -s -m context7,open-websearch

# 查看所有可用服务
npx zcf
# 选择 4 (配置 MCP)，查看列表
```

**服务选择建议**：
- **文档查询**：`context7` - 查询库文档
- **网页搜索**：`open-websearch` - 多引擎搜索
- **需求分析**：`spec-workflow` - 结构化需求
- **代码检索**：`serena` - 语义代码搜索
- **浏览器操作**：`Playwright` - 自动化测试

### 12. 备份策略

**技巧**：合理使用备份功能，确保配置安全。

```bash
# 自动备份（init 和 update 时自动执行）
npx zcf init  # 自动备份

# 手动备份特定配置
cp -r ~/.claude ~/.claude.backup.$(date +%Y%m%d)

# 定期清理旧备份（保留最近 7 天）
find ~/.claude/backup -name "*.bak" -mtime +7 -delete
```

### 13. 故障快速恢复

**技巧**：遇到问题时快速恢复配置。

```bash
# 1. 查找最近备份
ls -lt ~/.claude/backup/ | head -5

# 2. 恢复备份
cp -r ~/.claude/backup/backup_2025-01-15_10-30-45/* ~/.claude/

# 3. 或重新初始化（会创建新备份）
npx zcf init --config-action backup
```

### 14. 版本管理集成

**技巧**：将配置纳入版本控制，但排除敏感信息。

```bash
# 创建 .gitignore
cat > ~/.zcf-configs/.gitignore << EOF
# 排除敏感信息
*.key
auth.json
settings.json
config.toml

# 包含模板和工作流
!templates/
!workflows/
!prompts/
EOF

# 提交配置
git add .gitignore templates/ workflows/
git commit -m "Add ZCF templates and workflows"
```

### 15. 性能优化

**技巧**：优化配置以提高响应速度。

```bash
# 1. 仅安装需要的 MCP 服务
npx zcf init -s -m context7,open-websearch  # 仅安装必需服务

# 2. 使用本地缓存（如果支持）
# 某些 MCP 服务支持本地缓存，可以加快响应

# 3. 定期清理备份
npx zcf uninstall --mode custom --items backups
```

## 团队协作技巧

### 16. 统一团队配置

**技巧**：在团队中统一配置标准。

```bash
# 创建团队配置模板
cat > team-config.json << EOF
{
  "provider": "302ai",
  "lang": "zh-CN",
  "mcpServices": ["context7", "open-websearch", "spec-workflow"],
  "workflows": ["sixStepsWorkflow", "gitWorkflow", "featPlanUx"],
  "outputStyle": "engineer-professional"
}
EOF

# 团队成员使用相同配置
npx zcf init -s --api-configs-file team-config.json -k "个人API密钥"
```

### 17. 文档共享

**技巧**：共享工作流模板和配置模板。

```bash
# 导出工作流模板
tar -czf team-workflows.tar.gz ~/.claude/workflows/

# 团队成员导入
tar -xzf team-workflows.tar.gz -C ~/.claude/
```

### 18. 代码审查集成

**技巧**：将 ZCF 工作流集成到代码审查流程。

```bash
# 在 PR 描述中使用工作流生成的内容
/zcf:feat 新功能名称

# 生成的文档可以直接用于 PR 描述
```

## 故障排查技巧

### 19. 快速诊断

**技巧**：使用内置命令快速诊断问题。

```bash
# 检查配置
cat ~/.claude/settings.json | jq .

# 检查 MCP 服务
cat ~/.claude/settings.json | jq .mcpServers

# 检查工作流
ls -la ~/.claude/workflows/

# 检查版本
npx zcf check-updates
```

### 20. 日志分析

**技巧**：查看 ZCF 执行日志定位问题。

```bash
# 启用详细输出
npx zcf init --verbose 2>&1 | tee zcf.log

# 查看日志
cat zcf.log | grep -i error
```

## 相关资源

- [CLI 命令](../cli/) - 所有命令的详细说明
- [配置管理](../features/multi-config.md) - 多配置和备份系统
- [故障排除](../advanced/troubleshooting.md) - 常见问题解决
- [Worktree 并行开发](worktree.md) - Git Worktree 使用技巧

> 💡 **提示**：这些技巧可以根据实际需求灵活组合使用。建议从基础技巧开始，逐步掌握高级技巧。
