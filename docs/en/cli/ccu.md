---
title: Usage Analysis ccu
---

# Usage Analysis ccu

`zcf ccu` (Claude Code Usage) is used to view and analyze Claude Code usage statistics, helping you understand AI assistant usage and costs.

## Command Format

```bash
# Basic usage (display default statistics)
npx zcf ccu

# Specify statistics period
npx zcf ccu --period daily
npx zcf ccu --period weekly
npx zcf ccu --period monthly

# JSON format output (for script processing)
npx zcf ccu --json

# CSV format output (for Excel analysis)
npx zcf ccu --csv

# Access through main menu
npx zcf
# Then select U. Usage Analysis
```

## Parameter Descriptions

| Parameter | Description | Optional Values | Default |
|------|------|--------|--------|
| `--period` | Statistics period | `daily`, `weekly`, `monthly` | `daily` |
| `--json` | JSON format output | None | No |
| `--csv` | CSV format output | None | No |

## Function Details

ccusage is a powerful usage analysis tool with main features including:

- 📊 **Multi-dimensional Reports**: Daily, weekly, monthly token usage and cost reports
- 📅 **Flexible Periods**: Supports `daily`, `weekly`, `monthly` statistics periods
- 📈 **Live Monitoring**: Real-time dashboard showing active session progress, token burn rate, and cost projections
- 💬 **Session Analysis**: View usage grouped by conversation sessions
- 🤖 **Model Breakdown**: View cost breakdown for each model (Opus, Sonnet, etc.)
- 💰 **Cost Tracking**: Shows costs in USD for each day/month
- 🔄 **Cache Statistics**: Tracks cache creation and cache read tokens separately
- 📱 **Smart Display**: Automatically adapts table layout to terminal width (supports compact mode)
- 🔌 **Multi-format Export**: Supports JSON and CSV export for secondary analysis
- 🚀 **Statusline Integration**: Supports displaying summary in CCometixLine status bar

### Statistics Data Source

CCusage tool reads Claude Code's official usage database `usage.db`, containing:

- **Call Count**: Total number of AI requests
- **Usage Duration**: Cumulative AI usage time
- **Time Range**: Data statistics for specified period
- **Token Details**: Input/Output/Cache Token counts

### Statistics Periods

#### Daily Statistics (`daily`)

Display daily usage, suitable for daily monitoring.

```
📊 Claude Code Usage Statistics
Period: Daily

Date       | Requests | Duration
-----------|----------|----------
2025-01-15 | 45       | 2h 30m
2025-01-14 | 38       | 2h 15m
```

#### Weekly Statistics (`weekly`)

Display weekly usage, suitable for periodic analysis.

```
📊 Claude Code Usage Statistics
Period: Weekly

Week       | Requests | Duration
-----------|----------|----------
Week 3     | 315      | 18h 20m
Week 2     | 298      | 17h 45m
```

#### Monthly Statistics (`monthly`)

Display monthly usage, suitable for long-term trend analysis and cost budgeting.

```
📊 Claude Code Usage Statistics
Period: Monthly

Month      | Requests | Duration
-----------|----------|----------
2025-01    | 1250     | 72h 15m
2024-12    | 1180     | 68h 30m
```

## Output Formats

### Default Format (Table)

Suitable for terminal viewing, clear and readable format. Automatically adapts to terminal width.

### JSON Format

Suitable for script processing and automation:

```bash
npx zcf ccu --json --period weekly
```

**Output Example**:
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

### CSV Format

Suitable for importing into Excel or other analysis tools:

```bash
npx zcf ccu --csv --period monthly > usage.csv
```

**Output Example**:
```csv
Date,Requests,Duration
2025-01-15,45,2h 30m
2025-01-14,38,2h 15m
```

## Usage Scenarios

### 1. Daily Usage Monitoring

Quickly view today's usage:

```bash
npx zcf ccu --period daily
```

### 2. Team Usage Statistics

Regularly statistics team member usage:

```bash
# Generate weekly statistics report
npx zcf ccu --period weekly --json > weekly-usage.json
```

### 3. Cost Analysis

Combine with API pricing for cost estimation:

```bash
# Generate monthly usage report
npx zcf ccu --period monthly --csv > monthly-usage.csv
# Then calculate costs in Excel combined with API pricing
```

### 4. Automated Monitoring

Combine with `cron` to regularly collect usage data:

```bash
# Add to crontab (execute daily)
0 23 * * * cd /path/to/project && npx zcf ccu --json --period daily >> usage.log
```

## Integration with CCometixLine

CCometixLine status bar can also display usage statistics summary:

1. Install CCometixLine: `npx zcf` → Select corresponding option
2. View real-time usage in status bar
3. Click status bar to view detailed statistics

## Common Questions

### Q: No statistics data?

A: 
1. Ensure Claude Code is installed and used normally
2. Check if `usage.db` file exists (usually in Claude Code configuration directory)
3. Ensure there are actual usage records

### Q: Statistics data inaccurate?

A: CCusage reads Claude Code's official usage database. Data accuracy depends on Claude Code's records.

### Q: How to clear statistics data?

A: Statistics data is managed by Claude Code. Manual deletion is not recommended. If you need to reset, you need to delete Claude Code's `usage.db` file (will lose all historical records).

## Related Documentation

- [CCometixLine Status Bar](../features/cometix.md) - View usage in real-time
- [Usage Analysis Feature Overview](../features/ccusage.md) - Feature overview
