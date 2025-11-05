---
title: 使用分析 ccu
---

# 使用分析 ccu

`zcf ccu`（Claude Code Usage）用于查看和分析 Claude Code 的使用统计信息，帮助您了解 AI 助手的使用情况和成本。

## 命令格式

```bash
# 基本使用（显示默认统计）
npx zcf ccu

# 指定统计周期
npx zcf ccu --period daily
npx zcf ccu --period weekly
npx zcf ccu --period monthly

# JSON 格式输出（用于脚本处理）
npx zcf ccu --json

# CSV 格式输出（用于 Excel 分析）
npx zcf ccu --csv

# 通过主菜单访问
npx zcf
# 然后选择 U. 使用分析
```

## 参数说明

| 参数 | 说明 | 可选值 | 默认值 |
|------|------|--------|--------|
| `--period` | 统计周期 | `daily`, `weekly`, `monthly` | `daily` |
| `--json` | JSON 格式输出 | 无 | 否 |
| `--csv` | CSV 格式输出 | 无 | 否 |

## 功能特性

### 统计数据来源

CCusage 工具会读取 Claude Code 的官方使用数据库 `usage.db`，包含：

- **调用次数**：AI 请求的总次数
- **使用时长**：累计的 AI 使用时间
- **时间范围**：按指定周期统计的数据

### 统计周期

#### 日统计（`daily`）

显示每天的使用情况，适合：
- 日常使用监控
- 快速查看最近使用量

**示例输出**：
```
📊 Claude Code Usage Statistics
Period: Daily

Date       | Requests | Duration
-----------|----------|----------
2025-01-15 | 45       | 2h 30m
2025-01-14 | 38       | 2h 15m
2025-01-13 | 52       | 3h 10m
```

#### 周统计（`weekly`）

显示每周的使用情况，适合：
- 周期性使用分析
- 团队使用量对比

**示例输出**：
```
📊 Claude Code Usage Statistics
Period: Weekly

Week       | Requests | Duration
-----------|----------|----------
Week 3     | 315      | 18h 20m
Week 2     | 298      | 17h 45m
Week 1     | 342      | 19h 30m
```

#### 月统计（`monthly`）

显示每月的使用情况，适合：
- 长期趋势分析
- 成本预算规划

**示例输出**：
```
📊 Claude Code Usage Statistics
Period: Monthly

Month      | Requests | Duration
-----------|----------|----------
2025-01    | 1250     | 72h 15m
2024-12    | 1180     | 68h 30m
2024-11    | 1320     | 76h 45m
```

## 输出格式

### 默认格式（表格）

适合终端查看，格式清晰易读。

```bash
npx zcf ccu --period daily
```

### JSON 格式

适合脚本处理和自动化：

```bash
npx zcf ccu --json --period weekly
```

**输出示例**：
```json
{
  "period": "weekly",
  "data": [
    {
      "date": "2025-01-15",
      "requests": 45,
      "duration": "2h 30m"
    }
  ],
  "total": {
    "requests": 315,
    "duration": "18h 20m"
  }
}
```

### CSV 格式

适合导入 Excel 或其他分析工具：

```bash
npx zcf ccu --csv --period monthly > usage.csv
```

**输出示例**：
```csv
Date,Requests,Duration
2025-01-15,45,2h 30m
2025-01-14,38,2h 15m
```

## 使用场景

### 1. 日常使用监控

快速查看当天的使用情况：

```bash
npx zcf ccu --period daily
```

### 2. 团队使用统计

定期统计团队成员的使用量：

```bash
# 每周生成统计报告
npx zcf ccu --period weekly --json > weekly-usage.json
```

### 3. 成本分析

结合 API 价格进行成本估算：

```bash
# 生成月度使用报告
npx zcf ccu --period monthly --csv > monthly-usage.csv
# 然后在 Excel 中结合 API 价格计算成本
```

### 4. 自动化监控

搭配 `cron` 定时收集使用数据：

```bash
# 添加到 crontab（每天执行）
0 23 * * * cd /path/to/project && npx zcf ccu --json --period daily >> usage.log
```

## 与 CCometixLine 集成

CCometixLine 状态栏同样可以显示使用统计摘要：

1. 安装 CCometixLine：`npx zcf` → 选择相应选项
2. 在状态栏中查看实时使用情况
3. 点击状态栏可查看详细统计

## 使用建议

### 定期检查

建议每周或每月检查一次使用情况：

```bash
# 每周检查
npx zcf ccu --period weekly

# 每月检查
npx zcf ccu --period monthly
```

### 数据存档

定期导出数据以便长期分析：

```bash
# 每月导出 CSV
npx zcf ccu --csv --period monthly > $(date +%Y-%m)-usage.csv
```

### 异常监控

设置自动化脚本监控异常使用：

```bash
#!/bin/bash
# 检查当日使用量
DAILY_USAGE=$(npx zcf ccu --json --period daily | jq '.total.requests')

if [ "$DAILY_USAGE" -gt 100 ]; then
  echo "警告：当日使用量超过 100 次！"
  # 发送通知...
fi
```

## 常见问题

### Q: 没有统计数据？

A: 
1. 确保已安装并正常使用 Claude Code
2. 检查 `usage.db` 文件是否存在（通常在 Claude Code 配置目录）
3. 确保有实际使用记录

### Q: 统计数据不准确？

A: CCusage 读取的是 Claude Code 官方的使用数据库，数据准确性取决于 Claude Code 的记录。

### Q: 如何清空统计数据？

A: 统计数据由 Claude Code 管理，不建议手动删除。如需重置，需要删除 Claude Code 的 `usage.db` 文件（会丢失所有历史记录）。

## 相关文档

- [CCometixLine 状态栏](../features/cometix.md) - 实时查看使用情况
- [最佳实践](../best-practices/tips.md) - 更多使用技巧
