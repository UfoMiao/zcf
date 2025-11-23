---
title: 使用分析 ccu
---

# 使用分析 ccu

`zcf ccu`（Claude Code Usage）は、Claude Code の使用統計情報を表示および分析するために使用され、AI アシスタントの使用状況とコストを理解するのに役立ちます。

## コマンド形式

```bash
# 基本使用（デフォルト統計を表示）
npx zcf ccu

# 統計期間を指定
npx zcf ccu --period daily
npx zcf ccu --period weekly
npx zcf ccu --period monthly

# JSON 形式で出力（スクリプト処理用）
npx zcf ccu --json

# CSV 形式で出力（Excel 分析用）
npx zcf ccu --csv

# メインメニューからアクセス
npx zcf
# 次に U. 使用分析 を選択
```

## パラメータ説明

| パラメータ | 説明 | オプション値 | デフォルト値 |
|------|------|--------|--------|
| `--period` | 統計期間 | `daily`, `weekly`, `monthly` | `daily` |
| `--json` | JSON 形式で出力 | なし | いいえ |
| `--csv` | CSV 形式で出力 | なし | いいえ |

## 機能詳細

ccusage は強力な使用分析ツールで、主な機能には以下が含まれます：

- 📊 **多次元レポート**：日次、週次、月次のトークン使用量とコストレポート
- 📅 **柔軟な期間**：`daily`, `weekly`, `monthly` の統計期間をサポート
- 📈 **ライブ監視**：アクティブセッションの進行状況、トークン消費率、コスト予測を表示するリアルタイムダッシュボード
- 💬 **セッション分析**：会話セッション別にグループ化された使用状況
- 🤖 **モデル内訳**：各モデル（Opus、Sonnet など）のコスト内訳を表示
- 💰 **コスト追跡**：各日/月の USD コストを表示
- 🔄 **キャッシュ統計**：キャッシュ作成とキャッシュ読み取りトークンを個別に追跡
- 📱 **スマート表示**：ターミナル幅に合わせてテーブルレイアウトを自動調整（コンパクトモード対応）
- 🔌 **マルチフォーマット出力**：二次分析用の JSON および CSV 出力をサポート
- 🚀 **ステータスライン統合**：CCometixLine ステータスバーでのサマリー表示をサポート

### 統計データのソース

CCusage ツールは Claude Code の公式使用データベース `usage.db` を読み取り、以下を含みます：

- **呼び出し回数**：AI リクエストの総回数
- **使用時間**：累積の AI 使用時間
- **時間範囲**：指定された期間で統計されたデータ
- **トークン詳細**：入力/出力/キャッシュトークン数

### 統計期間

#### 日次統計（`daily`）

毎日の使用状況を表示し、日常の監視に適しています。

```
📊 Claude Code Usage Statistics
Period: Daily

Date       | Requests | Duration
-----------|----------|----------
2025-01-15 | 45       | 2h 30m
2025-01-14 | 38       | 2h 15m
```

#### 週次統計（`weekly`）

毎週の使用状況を表示し、周期的な分析に適しています。

```
📊 Claude Code Usage Statistics
Period: Weekly

Week       | Requests | Duration
-----------|----------|----------
Week 3     | 315      | 18h 20m
Week 2     | 298      | 17h 45m
```

#### 月次統計（`monthly`）

毎月の使用状況を表示し、長期的な傾向分析とコスト予算計画に適しています。

```
📊 Claude Code Usage Statistics
Period: Monthly

Month      | Requests | Duration
-----------|----------|----------
2025-01    | 1250     | 72h 15m
2024-12    | 1180     | 68h 30m
```

## 出力形式

### デフォルト形式（テーブル）

ターミナル表示に適し、形式が明確で読みやすい。ターミナル幅に自動的に適応します。

### JSON 形式

スクリプト処理と自動化に適しています：

```bash
npx zcf ccu --json --period weekly
```

**出力例**：
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

### CSV 形式

Excel またはその他の分析ツールにインポートするのに適しています：

```bash
npx zcf ccu --csv --period monthly > usage.csv
```

**出力例**：
```csv
Date,Requests,Duration
2025-01-15,45,2h 30m
2025-01-14,38,2h 15m
```

## 使用シナリオ

### 1. 日常使用の監視

当日の使用状況をすばやく確認：

```bash
npx zcf ccu --period daily
```

### 2. チーム使用統計

チームメンバーの使用量を定期的に統計：

```bash
# 週次統計レポートを生成
npx zcf ccu --period weekly --json > weekly-usage.json
```

### 3. コスト分析

API 価格と組み合わせてコストを推定：

```bash
# 月次使用レポートを生成
npx zcf ccu --period monthly --csv > monthly-usage.csv
# 次に Excel で API 価格と組み合わせてコストを計算
```

### 4. 自動化監視

`cron` と組み合わせて使用データを定期的に収集：

```bash
# crontab に追加（毎日実行）
0 23 * * * cd /path/to/project && npx zcf ccu --json --period daily >> usage.log
```

## CCometixLine との統合

CCometixLine ステータスバーも使用統計のサマリーを表示できます：

1. CCometixLine をインストール：`npx zcf` → 対応するオプションを選択
2. ステータスバーでリアルタイムの使用状況を確認
3. ステータスバーをクリックして詳細統計を表示

## よくある質問

### Q: 統計データがない？

A: 
1. Claude Code がインストールされ、正常に使用されていることを確認
2. `usage.db` ファイルが存在するか確認（通常は Claude Code 設定ディレクトリ）
3. 実際の使用記録があることを確認

### Q: 統計データが正確でない？

A: CCusage は Claude Code の公式使用データベースを読み取ります。データの正確性は Claude Code の記録に依存します。

### Q: 統計データをクリアするには？

A: 統計データは Claude Code によって管理されます。手動削除は推奨されません。リセットする必要がある場合は、Claude Code の `usage.db` ファイルを削除する必要があります（すべての履歴が失われます）。

## 関連ドキュメント

- [CCometixLine ステータスバー](../features/cometix.md) - リアルタイムで使用状況を確認
- [使用分析機能の概要](../features/ccusage.md) - 機能概要
