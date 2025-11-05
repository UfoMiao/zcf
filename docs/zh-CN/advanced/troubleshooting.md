---
title: 故障排除
---

# 故障排除

本文档收录了 ZCF 使用过程中的常见问题和解决方案，帮助您快速定位和解决问题。

## 常见问题分类

- [初始化问题](#初始化问题)
- [API 配置问题](#api-配置问题)
- [工作流问题](#工作流问题)
- [MCP 服务问题](#mcp-服务问题)
- [Codex 相关问题](#codex-相关问题)
- [CCR 相关问题](#ccr-相关问题)
- [配置和备份问题](#配置和备份问题)
- [平台特定问题](#平台特定问题)

## 初始化问题

### 1. 初始化失败或卡住

**症状**：运行 `npx zcf init` 后无响应或报错

**可能原因**：
- Node.js 版本过低
- 权限不足
- 网络连接问题
- MCP 安装卡住

**解决方案**：

```bash
# 1. 检查 Node.js 版本（需要 >= 22）
node --version

# 如果版本过低，升级 Node.js
# macOS/Linux
nvm install 22
nvm use 22

# 2. 检查权限
ls -la ~/.claude ~/.codex

# 如果目录不存在或权限不足，手动创建
mkdir -p ~/.claude ~/.codex ~/.ufomiao/zcf
chmod 755 ~/.claude ~/.codex ~/.ufomiao/zcf

# 3. 跳过 MCP 安装（如果网络问题）
npx zcf init -s -m skip

# 4. 检查网络连接
ping npmjs.com
```

### 2. 初始化过程中断

**症状**：初始化过程中意外中断

**解决方案**：

```bash
# 1. 清理未完成的配置
rm -rf ~/.claude/backup/latest

# 2. 从备份恢复（如果有）
ls -la ~/.claude/backup/
cp -r ~/.claude/backup/backup_最新时间戳/* ~/.claude/

# 3. 重新初始化
npx zcf init --config-action backup
```

### 3. 配置目录创建失败

**症状**：无法创建配置目录

**解决方案**：

```bash
# macOS/Linux
mkdir -p ~/.claude ~/.codex ~/.ufomiao/zcf
chmod 755 ~/.claude ~/.codex ~/.ufomiao/zcf

# Windows (PowerShell)
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude"
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.codex"
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.ufomiao\zcf"

# 检查磁盘空间
df -h ~  # macOS/Linux
```

## API 配置问题

### 1. API 配置不生效

**症状**：配置了 API 密钥但无法使用

**解决方案**：

```bash
# 1. 检查配置文件
cat ~/.claude/settings.json | jq .env
cat ~/.codex/config.toml | grep -A 5 apiKey

# 2. 重新配置 API
npx zcf init
# 选择 3 (配置 API 或 CCR)
# 或使用命令行
npx zcf init -s -t api_key -k "your-api-key"

# 3. 对于 CCR 模式，确保 Router 运行
npx zcf ccr status
npx zcf ccr start
```

### 2. API 密钥格式错误

**症状**：提示 API 密钥格式不正确

**解决方案**：

```bash
# 检查密钥格式
# Claude Code: sk-ant-xxx 或 auth-token
# 302.AI: sk-xxx
# GLM: 通常是长字符串

# 验证密钥（使用提供商提供的测试工具）
# 或尝试在提供商控制台验证

# 重新输入正确的密钥
npx zcf init -s -p 302ai -k "正确的密钥"
```

### 3. API 端点无法访问

**症状**：连接 API 端点失败

**解决方案**：

```bash
# 1. 检查网络连接
curl https://api.302.ai/cc
ping api.302.ai

# 2. 检查代理设置（如果需要）
export http_proxy=http://127.0.0.1:7890
export https_proxy=http://127.0.0.1:7890
export HTTP_PROXY=http://127.0.0.1:7890
export HTTPS_PROXY=http://127.0.0.1:7890

# 3. 验证端点 URL
# 302.AI: https://api.302.ai/cc
# GLM: https://open.bigmodel.cn/api/anthropic
# MiniMax: https://api.minimaxi.com/anthropic

# 4. 使用提供商预设（推荐）
npx zcf init -s -p 302ai -k "sk-xxx"
```

### 4. 多 API 配置冲突

**症状**：配置多个 API 后无法切换

**解决方案**：

```bash
# 1. 列出所有配置
npx zcf config-switch --list

# 2. 切换到正确的配置
npx zcf config-switch provider-name

# 3. 检查配置文件中的默认配置
cat ~/.claude/settings.json | jq .apiKeys
cat ~/.codex/config.toml | grep modelProvider
```

## 工作流问题

### 1. 工作流未导入

**症状**：工作流命令无法使用

**解决方案**：

```bash
# 1. 检查工作流目录
ls -la ~/.claude/workflows/
ls -la ~/.codex/prompts/

# 2. 重新导入工作流
npx zcf update -w all

# 3. 检查 Codex 配置（Codex 需要 managed = true）
cat ~/.codex/config.toml | grep managed
# 如果 managed = false，设置为 true 后重新导入

# 4. 手动检查工作流文件
cat ~/.claude/workflows/zcf-workflow/workflow.md
```

### 2. 工作流命令不识别

**症状**：输入 `/zcf:workflow` 无响应

**解决方案**：

```bash
# 1. 检查工作流文件位置
# Claude Code: ~/.claude/workflows/
# Codex: ~/.codex/prompts/

# 2. 验证工作流文件格式
head -20 ~/.claude/workflows/zcf-workflow/workflow.md

# 3. 重启 Claude Code 或 Codex 应用

# 4. 检查命令前缀
# Claude Code: /zcf:workflow 或 /workflow
# Codex: /prompts:workflow
```

### 3. 工作流模板过时

**症状**：工作流功能与文档不一致

**解决方案**：

```bash
# 更新工作流模板
npx zcf update -g zh-CN

# 或强制更新
npx zcf init --config-action docs-only -w all
```

## MCP 服务问题

### 1. MCP 服务无法启动

**症状**：MCP 服务配置后无法使用

**解决方案**：

```bash
# 1. 检查 MCP 配置
cat ~/.claude/settings.json | jq .mcpServers
cat ~/.codex/config.toml | grep -A 10 mcp_server

# 2. 重新配置 MCP
npx zcf
# 选择 4 (配置 MCP)

# 3. 检查服务依赖
# Context7: 需要 npx 可用
# Playwright: 需要浏览器环境
# Exa: 需要 EXA_API_KEY 环境变量

# 4. 测试单个服务
npx @context7/mcp-server
```

### 2. Exa MCP 服务失败

**症状**：Exa 服务报错

**解决方案**：

```bash
# 1. 设置环境变量
export EXA_API_KEY="your-exa-api-key"

# 2. 验证环境变量
echo $EXA_API_KEY

# 3. 在配置文件中添加环境变量
# ~/.claude/settings.json 或 ~/.codex/config.toml
# 添加 env.EXA_API_KEY

# 4. 重启应用
```

### 3. Playwright 浏览器下载失败

**症状**：Playwright 首次运行卡在浏览器下载

**解决方案**：

```bash
# 1. 手动安装浏览器
npx playwright install

# 2. 设置环境变量（如果需要代理）
export PLAYWRIGHT_DOWNLOAD_HOST=https://npm.taobao.org/mirrors

# 3. 等待下载完成（可能需要几分钟）

# 4. 检查浏览器安装
npx playwright --version
```

### 4. Context7 查询失败

**症状**：Context7 无法查询文档

**解决方案**：

```bash
# 1. 检查网络连接
ping context7.com

# 2. 测试 Context7 服务
npx @context7/mcp-server --help

# 3. 检查配置格式
cat ~/.claude/settings.json | jq .mcpServers.context7
```

### 5. MCP 客户端连接超时

**症状**：提示 "MCP client for xxx failed to start: request timed out"

**原因**：通常是网络延迟过高或超时设置过短导致的连接超时

**解决方案**：

#### 方法 1：增加超时时间（推荐）

**Claude Code**：

编辑 `~/.claude/settings.json`，在 `env` 字段中添加超时配置：

```json
{
  "env": {
    "MCP_TIMEOUT": "60000"
  }
}
```

完整示例：
```json
{
  "env": {
    "ANTHROPIC_API_KEY": "sk-xxx",
    "MCP_TIMEOUT": "60000"
  },
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"]
    }
  }
}
```

**Codex**：

编辑 `~/.codex/config.toml`，在对应的 MCP 服务配置下添加 `startup_timeout_sec`：

```toml
[mcp_server.context7]
command = "npx"
args = ["-y", "@context7/mcp-server"]
startup_timeout_sec = 60
```

#### 方法 2：更换网络节点

如果网络延迟较高，可以尝试：

```bash
# 1. 检查网络延迟
ping context7.com

# 2. 使用网络代理（如果需要）
export http_proxy=http://127.0.0.1:7890
export https_proxy=http://127.0.0.1:7890
export HTTP_PROXY=http://127.0.0.1:7890
export HTTPS_PROXY=http://127.0.0.1:7890

# 3. 或使用 VPN 切换到延迟更低的节点
```

#### 方法 3：验证配置

配置后需要重启 Claude Code 或 Codex 应用：

```bash
# 验证 Claude Code 配置
cat ~/.claude/settings.json | jq .env.MCP_TIMEOUT

# 验证 Codex 配置
cat ~/.codex/config.toml | grep -A 5 "mcp_server.context7"

# 重启应用后测试 MCP 服务
```

**注意事项**：

- `MCP_TIMEOUT` 单位为毫秒（60000 = 60 秒）
- `startup_timeout_sec` 单位为秒（60 = 60 秒）
- 如果超时时间设置过长，可能影响启动速度
- 建议根据实际网络环境调整超时时间（30-120 秒）

## Codex 相关问题

### 1. Codex CLI 安装失败

**症状**：Codex CLI 无法安装

**解决方案**：

```bash
# 1. 检查 Node.js 版本
node --version  # 需要 >= 18

# 2. 手动安装 Codex CLI
npm install -g @openai/codex

# 3. 检查权限（macOS/Linux）
sudo npm install -g @openai/codex

# 4. 使用 nvm 管理 Node.js（推荐）
nvm install 20
nvm use 20
npm install -g @openai/codex

# 5. 验证安装
codex --version
```

### 2. Codex 配置不生效

**症状**：Codex 配置后无法使用

**解决方案**：

```bash
# 1. 检查 Codex 配置文件
cat ~/.codex/config.toml

# 2. 确保 managed = true（ZCF 管理的配置）
# 如果 managed = false，ZCF 不会修改配置

# 3. 检查 API 配置
cat ~/.codex/config.toml | grep -A 10 modelProvider

# 4. 检查 auth.json
cat ~/.codex/auth.json

# 5. 重新配置
npx zcf init -T codex -s -p 302ai -k "sk-xxx"
```

### 3. Codex 工作流命令格式

**症状**：Codex 中工作流命令无法使用

**解决方案**：

```bash
# Codex 使用不同的命令前缀
# 正确格式：/prompts:workflow
# 错误格式：/zcf:workflow

# 检查工作流文件
ls -la ~/.codex/prompts/

# 重新导入工作流
npx zcf update -T codex -g zh-CN
```

## CCR 相关问题

### 1. CCR 无法启动

**症状**：CCR 服务启动失败或卡住

**解决方案**：

```bash
# 1. 检查 CCR 安装
npx zcf ccr status

# 2. 检查端口占用
lsof -i :3456  # macOS/Linux
netstat -ano | findstr :3456  # Windows

# 3. 重新安装 CCR
npx zcf ccr install

# 4. 检查配置文件
cat ~/.claude-code-router/config.json

# 5. 手动启动 CCR
cd ~/.claude-code-router
ccr start
```

### 1.1. CCR 启动卡在 "Loaded JSON config"

**症状**：执行 `ccr start` 时卡在 "Loaded JSON config from xxx" 提示，无法继续

**原因**：通常是端口 3456 被占用，导致新实例无法启动

**解决方案**：

#### Windows 平台

```bash
# 1. 查找占用 3456 端口的进程 PID
netstat -ano | findstr :3456

# 输出示例：
# TCP    127.0.0.1:3456         0.0.0.0:0              LISTENING       1208
# TCP    127.0.0.1:59047        127.0.0.1:3456         TIME_WAIT       0

# 2. 终止占用端口的进程（1208 是示例 PID，请替换为实际 PID）
taskkill /PID 1208 /F

# 3. 重启 CCR
npx zcf ccr restart

# 4. 检查状态
npx zcf ccr status
```

#### macOS/Linux 平台

```bash
# 1. 终止占用 3456 端口的进程
lsof -t -i:3456 | xargs kill

# 或使用更安全的方式（如果进程不存在不会报错）
lsof -t -i:3456 | xargs -r kill

# 2. 重启 CCR
npx zcf ccr restart

# 3. 检查状态
npx zcf ccr status
```

**验证步骤**：

```bash
# 确认端口已释放
lsof -i :3456  # macOS/Linux（应无输出）
netstat -ano | findstr :3456  # Windows（应无输出）

# 如果端口已释放，重新启动
npx zcf ccr start

# 验证 CCR 正常运行
npx zcf ccr status

# 如果状态正常，Claude Code 应能正常连接
```

### 2. CCR 代理连接失败

**症状**：使用 CCR 代理时连接失败

**解决方案**：

```bash
# 1. 检查 CCR 配置
cat ~/.claude-code-router/config.json | jq .

# 2. 验证 CCR 运行状态
curl http://127.0.0.1:3456/health

# 3. 检查 Claude Code 配置
cat ~/.claude/settings.json | jq .env.ANTHROPIC_BASE_URL

# 4. 重新配置 CCR 代理
npx zcf ccr
# 或
npx zcf init -s -t ccr_proxy
```

### 3. CCR Web UI 无法访问

**症状**：无法打开 CCR Web UI

**解决方案**：

```bash
# 1. 确认 CCR 正在运行
npx zcf ccr status

# 2. 检查端口
lsof -i :3456

# 3. 访问 Web UI
open http://localhost:3456/ui  # macOS
# 或浏览器访问 http://localhost:3456/ui

# 4. 检查防火墙设置
```

## 配置和备份问题

### 1. 配置丢失

**症状**：配置文件丢失或损坏

**解决方案**：

```bash
# 1. 查找备份
ls -lt ~/.claude/backup/ | head -5
ls -lt ~/.codex/backup/ | head -5

# 2. 恢复备份
cp -r ~/.claude/backup/backup_最新时间戳/* ~/.claude/
cp -r ~/.codex/backup/backup_最新时间戳/* ~/.codex/

# 3. 重新初始化（如果备份不可用）
npx zcf init --config-action backup
```

### 2. 备份失败

**症状**：无法创建备份

**解决方案**：

```bash
# 1. 检查磁盘空间
df -h ~

# 2. 检查备份目录权限
ls -la ~/.claude/backup/

# 3. 手动创建备份目录
mkdir -p ~/.claude/backup ~/.codex/backup
chmod 755 ~/.claude/backup ~/.codex/backup

# 4. 手动备份
cp -r ~/.claude ~/.claude.backup.$(date +%Y%m%d)
```

### 3. 配置冲突

**症状**：多个配置冲突或覆盖

**解决方案**：

```bash
# 1. 查看所有配置
npx zcf config-switch --list

# 2. 备份当前配置
cp -r ~/.claude ~/.claude.conflict.backup

# 3. 使用合并策略重新初始化
npx zcf init --config-action merge

# 4. 手动合并配置（如果需要）
# 编辑配置文件，合并冲突的配置项
```

## 平台特定问题

### Windows 平台

#### 路径问题

**症状**：路径包含空格或特殊字符

**解决方案**：

```bash
# ZCF 会自动处理路径中的空格
# 如果遇到问题，检查配置中的路径是否被正确引号包裹

# 查看配置
cat "$env:USERPROFILE\.claude\settings.json"
```

#### MCP 配置格式

**症状**：MCP 服务在 Windows 上无法启动

**解决方案**：

```bash
# ZCF 会自动修复 Windows MCP 配置格式
# 运行更新命令会自动修复
npx zcf update

# 或手动检查配置格式
cat "$env:USERPROFILE\.claude\settings.json" | jq .mcpServers
```

### macOS 平台

#### 权限问题

**症状**：无法创建配置目录

**解决方案**：

```bash
# 检查 macOS 隐私设置
# 系统设置 > 隐私与安全性 > 完全磁盘访问权限

# 手动创建目录
mkdir -p ~/.claude ~/.codex
chmod 755 ~/.claude ~/.codex
```

### Linux/WSL 平台

#### WSL 环境检测

**症状**：ZCF 未正确检测 WSL 环境

**解决方案**：

```bash
# ZCF 会自动检测 WSL 环境
# 如果检测失败，手动指定路径

# 检查 WSL 环境变量
echo $WSL_DISTRO_NAME
```

#### Termux 环境

**症状**：在 Termux 中运行失败

**解决方案**：

```bash
# ZCF 支持 Termux 环境
# 确保使用最新的 Node.js 版本

# 使用 nvm（推荐）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
```

## 获取更多帮助

### 日志和调试

```bash
# 启用详细输出
npx zcf init --verbose 2>&1 | tee zcf-debug.log

# 查看错误信息
cat zcf-debug.log | grep -i error

# 检查版本信息
npx zcf --version
```

### 恢复历史

```bash
# 查看备份历史
ls -lt ~/.claude/backup/
ls -lt ~/.codex/backup/

# 恢复特定备份
cp -r ~/.claude/backup/backup_YYYY-MM-DD_HH-mm-ss/* ~/.claude/
```

### 文档资源

- 阅读仓库 `CLAUDE.md` 和 `AGENTS.md` 了解系统提示要求
- 查看 [GitHub Issues](https://github.com/UfoMiao/zcf/issues) 搜索类似问题
- 在 GitHub Issues 提交问题时附带：
  - `npx zcf --version` 输出
  - 完整的终端日志
  - 操作系统和 Node.js 版本
  - 重现步骤

### 社区支持

- **GitHub Issues**：报告 Bug 和功能请求
- **Discussions**：讨论使用问题
- **文档**：查看完整文档获取更多信息

> 💡 **提示**：遇到问题时，首先检查本文档中的常见问题。如果问题仍然存在，请收集相关信息后在 GitHub Issues 中报告。