---
title: CCometixLine 状态栏
---

# CCometixLine 状态栏

CCometixLine 是基于 Rust 的高性能终端/IDE 状态栏插件，ZCF 支持全自动安装、配置和更新。它可以实时显示 Git 分支信息、文件变更状态、Claude Code / Codex 使用统计等关键信息。

## 什么是 CCometixLine

CCometixLine 是基于 Rust 的高性能状态栏工具，为 Claude Code 提供实时状态信息显示。它可以：

- 📊 **Git 集成**：显示分支、状态和跟踪信息
- 🎯 **模型显示**：显示简化的 Claude 模型名称
- 📈 **使用跟踪**：基于 transcript 分析的使用量跟踪
- 📁 **目录显示**：显示当前工作区
- 🎨 **交互式 TUI**：提供交互式配置界面，支持实时预览
- 🌈 **主题系统**：多个内置预设主题
- ⚡ **高性能**：基于 Rust 开发，资源占用低，响应速度快
- 🔧 **Claude Code 增强**：提供 context warning disabler 和 verbose mode enabler 等增强工具

## 安装流程

### 自动安装

ZCF 在初始化时会自动安装 CCometixLine：

```bash
# 完整初始化（默认包含 CCometixLine 安装）
npx zcf init

# 或者在交互式菜单中选择初始化
npx zcf
```

> 💡 **提示**：`zcf init` 默认启用 `--install-cometix-line true`，若无需安装可显式传入 `false`。

### 手动管理

在主菜单中输入 `L` 进入 CCometixLine 管理界面：

```bash
npx zcf
# 然后输入 L
```

管理功能包括：

- 🔄 **升级**：检查并更新到最新版本
- 🗑️ **卸载**：完全移除 CCometixLine
- ⚙️ **配置**：修改状态栏显示格式和选项
- 📊 **状态查看**：查看当前安装状态和版本信息

## 功能亮点

### Git 信息显示

CCometixLine 可以实时显示以下 Git 相关信息：

- **分支名称**：当前 Git 分支
- **变更统计**：已修改、已暂存、未跟踪的文件数量
- **同步状态**：与远端分支的同步情况（领先/落后/同步）
- **提交信息**：最近一次提交的简要信息（可选）

### 使用统计集成

与 `ccusage` 工具数据保持一致，显示：

- 📊 当前会话的 Token 使用量
- 💰 累计使用成本（如果配置了成本计算）
- 📈 使用趋势和统计信息

### 工作流状态提示

根据不同工作流阶段显示相应的状态信息：

- **六阶段工作流**：显示当前阶段（研究→构思→计划→执行→优化→评审）
- **Git 工作流**：显示当前 Git 操作状态
- **功能开发工作流**：显示开发进度和任务状态

## 配置管理

### 配置文件位置

CCometixLine 的配置保存在：

- **配置文件**：`~/.claude/ccline/config.toml`
- **主题文件**：`~/.claude/ccline/themes/*.toml`
- **Claude Code 集成**：配置会写入 Claude Code 的 `settings.json` 中的 `statusLine` 字段

### 配置管理

```bash
# 初始化配置文件
ccline --init

# 检查配置有效性
ccline --check

# 打印当前配置
ccline --print

# 进入 TUI 配置模式（交互式配置界面）
ccline --config
```

### 主题配置

CCometixLine 支持多个内置主题：

```bash
# 临时使用特定主题（覆盖配置文件）
ccline --theme cometix
ccline --theme minimal
ccline --theme gruvbox
ccline --theme nord
ccline --theme powerline-dark

# 或使用自定义主题文件
ccline --theme my-custom-theme
```

### Claude Code 增强工具

CCometixLine 提供 Claude Code 增强功能：

```bash
# 禁用 context warnings 并启用 verbose mode
ccline --patch /path/to/claude-code/cli.js

# 常见安装路径示例
ccline --patch ~/.local/share/fnm/node-versions/v24.4.1/installation/lib/node_modules/@anthropic-ai/claude-code/cli.js
```

### 可配置的段

所有段都可以配置，包括：

- **Directory**：目录显示
- **Git**：Git 信息显示
- **Model**：模型显示
- **Usage**：使用统计
- **Time**：时间显示
- **Cost**：成本显示
- **OutputStyle**：输出风格显示

每个段都支持启用/禁用、自定义分隔符和图标、颜色自定义、格式选项等配置。

## 平台支持

CCometixLine 支持跨平台安装：

- ✅ **macOS**：通过 npm 全局安装
- ✅ **Linux**：通过 npm 全局安装
- ✅ **Windows**：通过 npm 全局安装（需要 Node.js 环境）
- ✅ **WSL**：在 WSL 环境中运行

安装过程中会自动检测平台，选择合适的构建方式。

## 版本管理

### 检查版本

```bash
# 通过 ZCF 菜单检查
npx zcf → 选择 L → 查看版本信息

# 或者直接运行
ccline --version
```

### 自动更新

ZCF 在初始化或更新时会自动检查 CCometixLine 版本：

```bash
# 使用 check-updates 命令检查并更新
npx zcf check-updates

# 或者在菜单中选择
npx zcf → 选择 + 检查更新
```

### 手动更新

```bash
# 通过 npm 更新
npm update -g @cometix/ccline

# 或者通过 ZCF 菜单
npx zcf → 选择 L → 升级
```

## 故障排除

### 安装失败

如果安装过程中遇到问题：

1. **检查 Node.js 版本**：确保 Node.js 版本 >= 18
2. **检查网络连接**：确保可以访问 npm registry
3. **权限问题**：可能需要使用 `sudo`（macOS/Linux）或以管理员身份运行（Windows）

```bash
# macOS/Linux 使用 sudo
sudo npm install -g @cometix/ccline

# 或使用 npx（推荐）
npx @cometix/ccline
```

### 状态栏不显示

如果状态栏没有正常显示：

1. **检查配置**：确认 Claude Code `settings.json` 中包含 `statusLine` 配置
2. **重启 Claude Code**：重启应用以加载新配置
3. **检查命令路径**：确认 `ccline` 命令在系统 PATH 中

```bash
# 检查命令是否可用
which ccline

# 查看配置
ccline --print
```

### 性能问题

如果状态栏响应缓慢：

1. **调整更新间隔**：增加更新间隔时间，减少刷新频率
2. **禁用部分功能**：关闭不需要的功能（如时间戳、详细统计）
3. **检查系统资源**：确认系统资源充足

## 最佳实践

### 推荐配置

对于大多数用户，推荐使用默认配置：

```json
{
  "statusLine": {
    "command": "ccline",
    "args": ["--format", "default"]
  }
}
```

### 团队协作

在团队环境中：

1. **统一配置**：在团队内部统一 CCometixLine 配置格式
2. **版本同步**：定期更新到最新版本，保持功能一致
3. **文档共享**：将配置写入项目文档，方便新成员快速上手

### 性能优化

- 如果项目很大（数千个文件），可以关闭 Git 文件统计功能
- 对于频繁切换分支的场景，可以增加更新间隔
- 在 CI/CD 环境中，建议禁用状态栏以减少资源消耗

## 安装方式

### 快速安装（推荐）

通过 npm 安装（适用于所有平台）：

```bash
# 全局安装
npm install -g @cometix/ccline

# 或使用 yarn
yarn global add @cometix/ccline

# 或使用 pnpm
pnpm add -g @cometix/ccline
```

使用 npm 镜像加速下载：

```bash
npm install -g @cometix/ccline --registry https://registry.npmmirror.com
```

### Claude Code 配置

添加到 Claude Code 的 `settings.json`：

**Linux/macOS：**

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/ccline/ccline",
    "padding": 0
  }
}
```

**Windows：**

```json
{
  "statusLine": {
    "type": "command",
    "command": "%USERPROFILE%\\.claude\\ccline\\ccline.exe",
    "padding": 0
  }
}
```

**回退方案（npm 安装）：**

```json
{
  "statusLine": {
    "type": "command",
    "command": "ccline",
    "padding": 0
  }
}
```

### 更新

```bash
npm update -g @cometix/ccline
```

## 默认段显示

显示格式：`Directory | Git Branch Status | Model | Context Window`

### Git 状态指示器

- 分支名称（带 Nerd Font 图标）
- 状态：`✓` 干净、`●` 脏、`⚠` 冲突
- 远程跟踪：`↑n` 领先、`↓n` 落后

### 模型显示

显示简化的 Claude 模型名称：

- `claude-3-5-sonnet` → `Sonnet 3.5`
- `claude-4-sonnet` → `Sonnet 4`

### 上下文窗口显示

基于 transcript 分析的 token 使用百分比，带上下文限制跟踪。

## 系统要求

- **Git**：版本 1.5+（推荐 Git 2.22+ 以获得更好的分支检测）
- **终端**：必须支持 Nerd Fonts 以正确显示图标
  - 安装 [Nerd Font](https://www.nerdfonts.com/)（如 FiraCode Nerd Font、JetBrains Mono Nerd Font）
  - 配置终端使用 Nerd Font
- **Claude Code**：用于状态栏集成

## 相关资源

- **GitHub 仓库**：[Haleclipse/CCometixLine](https://github.com/Haleclipse/CCometixLine)
- **文档**：查看 CCometixLine 官方文档获取更多信息
- **问题反馈**：如遇到问题，可在 GitHub Issues 中反馈

## 与其他工具的集成

CCometixLine 可以与以下 ZCF 工具无缝集成：

- **ccusage**：共享使用统计数据
- **CCR**：显示代理路由状态（如果配置）
- **工作流**：根据工作流状态显示相应信息

> 💡 **提示**：CCometixLine 是 ZCF 生态的重要组成部分，建议在初始化时一起安装，以获得完整的状态监控体验。