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

## 功能详解

ccusage 是一个强大的使用分析工具，主要功能包括：

- 📊 **多维度报告**：支持日度、周度、月度 token 使用量和成本报告
- 📅 **灵活周期**：支持 `daily`, `weekly`, `monthly` 等多种统计周期
- 📈 **实时监控**：实时仪表板显示活动会话进度、token 消耗率和成本预测
- 💬 **会话分析**：按对话会话分组的使用情况分析
- 🤖 **模型细分**：查看每个模型（Opus, Sonnet 等）的具体使用成本
- 💰 **成本跟踪**：显示每天/每月的美元成本
- 🔄 **缓存统计**：分别跟踪缓存创建和缓存读取的 token
- 📱 **智能显示**：根据终端宽度自动调整表格布局（支持紧凑模式）
- 🔌 **多格式导出**：支持 JSON 和 CSV 格式导出，方便二次分析
- 🚀 **状态栏集成**：支持与 CCometixLine 状态栏集成显示摘要

### 统计数据来源

CCusage 工具会读取 Claude Code 的官方使用数据库 `usage.db`，包含：

- **调用次数**：AI 请求的总次数
- **使用时长**：累计的 AI 使用时间
- **时间范围**：按指定周期统计的数据
- **Token 详情**：输入/输出/缓存 Token 数量

### 统计周期示例

#### 日统计（`daily`）

显示每天的使用情况，适合日常监控。

```
📊 Claude Code Usage Statistics
Period: Daily

Date       | Requests | Duration
-----------|----------|----------
2025-01-15 | 45       | 2h 30m
2025-01-14 | 38       | 2h 15m
```

#### 周统计（`weekly`）

显示每周的使用情况，适合周期性分析。

```
📊 Claude Code Usage Statistics
Period: Weekly

Week       | Requests | Duration
-----------|----------|----------
Week 3     | 315      | 18h 20m
Week 2     | 298      | 17h 45m
```

#### 月统计（`monthly`）

显示每月的使用情况，适合长期趋势分析和成本预算。

```
📊 Claude Code Usage Statistics
Period: Monthly

Month      | Requests | Duration
-----------|----------|----------
2025-01    | 1250     | 72h 15m
2024-12    | 1180     | 68h 30m
```

## 输出格式

### 默认格式（表格）

适合终端查看，格式清晰易读。会自动适配终端宽度。

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
- [使用分析功能介绍](../features/ccusage.md) - 功能概览
