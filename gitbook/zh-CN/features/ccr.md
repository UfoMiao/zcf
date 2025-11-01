# Claude Code Router（CCR）

ZCF 内置 CCR 管理能力，帮助快速搭建高可用的 Claude Code 代理。

## 主要功能

- **安装检测**：`isCcrInstalled` 自动检测 CCR CLI 是否存在，缺失时调用 `installCcr`。
- **配置向导**：`setupCcrConfiguration` 引导创建 `ccr.json`、配置端口、密钥与备份策略。
- **备份与恢复**：`backupCcrConfig`、`createDefaultCcrConfig` 用于保留历史配置。
- **一键切换 API**：在 `menu` 选项 `3` 中，可从 API Key 模式切换到 CCR 代理模式。

## 使用方式

```bash
npx zcf ccr
```

- 进入交互式菜单，可执行安装、配置、备份、查看状态等操作。
- 若使用非交互模式，可在 `zcf init` 中通过 `--api-type ccr_proxy` 直接启用。

## 最佳实践

1. 先完成常规 API 配置，再切换到 CCR 代理，确保回退路径可用。
2. 与 `npx zcf ccu` 配合使用，监控使用量并及时扩容。
3. 若部署多台 CCR，可使用多配置功能记录各代理信息。
