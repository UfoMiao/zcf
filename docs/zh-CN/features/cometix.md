---
title: CCometixLine 状态栏
---

# CCometixLine 状态栏

CCometixLine 是基于 Rust 的高性能终端/IDE 状态栏插件，ZCF 支持全自动安装、配置和更新。它可以实时显示 Git 分支信息、文件变更状态、Claude Code / Codex 使用统计等关键信息。

## 什么是 CCometixLine

CCometixLine 是一个轻量级的状态栏工具，为 Claude Code 和 Codex 提供实时状态信息显示。它可以：

- 📊 **Git 信息显示**：实时显示当前 Git 分支、变更文件数量、远端同步状态
- 📈 **使用统计**：展示 Claude Code / Codex 使用情况，与 `ccusage` 数据保持一致
- 🔄 **工作流状态**：根据工作流阶段显示相应的状态提示
- ⚡ **高性能**：基于 Rust 开发，资源占用低，响应速度快

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

CCometixLine 的配置会写入 Claude Code 的 `settings.json` 中的 `statusLine` 字段：

```json
{
  "statusLine": {
    "command": "ccline",
    "args": ["--format", "default"]
  }
}
```

### 自定义配置

可以通过交互式配置界面或直接编辑配置文件来自定义状态栏：

```bash
# 使用交互式配置
ccline -c

# 或者直接编辑 Claude Code settings.json
# ~/.claude/settings.json
```

### 配置选项

可配置的选项包括：

- **显示格式**：选择预设格式或自定义格式字符串
- **更新间隔**：状态栏刷新频率（默认 3 秒）
- **Git 信息**：是否显示 Git 分支和变更信息
- **时间戳**：是否显示时间戳
- **使用统计**：是否显示使用统计信息

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

## 相关资源

- **GitHub 仓库**：[@cometix/ccline](https://github.com/cometix/ccline)
- **文档**：查看 CCometixLine 官方文档获取更多信息
- **问题反馈**：如遇到问题，可在 GitHub Issues 中反馈

## 与其他工具的集成

CCometixLine 可以与以下 ZCF 工具无缝集成：

- **ccusage**：共享使用统计数据
- **CCR**：显示代理路由状态（如果配置）
- **工作流**：根据工作流状态显示相应信息

> 💡 **提示**：CCometixLine 是 ZCF 生态的重要组成部分，建议在初始化时一起安装，以获得完整的状态监控体验。