# 故障排除

## 常见问题

### 1. 初始化失败或卡住

- 确认 Node.js 版本 ≥ 20，Terminal 具有足够权限。
- 查看终端日志，若提示权限错误，可手动创建 `~/.claude`、`~/.codex` 并赋权。
- 若卡在 MCP 安装，检查网络或尝试 `--mcp-services skip`。

### 2. API 配置不生效

- 运行 `npx zcf init` 选择 `modify-partial` 或 `new` 重新写入配置。
- 检查 `SETTINGS_FILE` 中 `apiKeys` 与 `apiConfig` 是否更新。
- 对 CCR 模式，确保 Router 正常运行并可访问。

### 3. 工作流未导入

- 运行 `npx zcf update` 再次导入。
- 检查 `~/.claude/workflows/` 是否存在对应文件。
- 若使用 Codex，确认 `config.toml` 中 `managed = true`，否则 ZCF 会跳过写入。

### 4. Codex CLI 安装失败

- 手动执行 `npm install -g @openai/codex` 观察报错。
- 确认有权限写入全局 npm 目录，必要时使用 `sudo` 或 nvm。

### 5. MCP 服务无法启动

- 运行 `npx zcf` 菜单选 `4` 重新配置 MCP。
- 若为 Exa，确保环境变量 `EXA_API_KEY` 已设置。
- Playwright 需要额外依赖，首次运行可能触发浏览器下载，请耐心等待。

## 获取更多帮助

- 查看 `~/.claude/backup/` 与 `~/.codex/backup/` 恢复历史。
- 阅读仓库 `CLAUDE.md` 与 `AGENTS.md` 了解系统提示要求。
- 在 GitHub Issues 提交问题时附带 `npx zcf --version` 与终端日志。
