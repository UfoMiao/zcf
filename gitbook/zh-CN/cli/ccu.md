# 使用分析 ccu

`zcf ccu`（Claude Code Usage）用于查看 Claude Code 的使用统计。

## 可选参数

- `--period <daily|weekly|monthly>`：统计周期，默认 `daily`。
- `--json`：以 JSON 格式输出，便于脚本解析。
- `--csv`：输出 CSV。

## 功能

- 聚合 Claude Code 官方 `usage.db` 信息。
- 支持按天/周/月统计总调用次数与时长。
- 在交互式菜单中选择 `U` 也可进入该功能。

## 自动化建议

- 搭配 `cron` 定时执行 `npx zcf ccu --json`，将数据写入日志系统。
- 在 CCometixLine 状态栏中同样可查看摘要信息。
