---
title: zcf ccu
---

# zcf ccu

`ccusage` のラッパーとして API 利用状況を表示するコマンドです。トークン消費や費用を確認し、超過を防止します。

```bash
npx zcf ccu [options]
```

## 主なオプション

- `--json`：JSON 形式で出力（監視ツール連携向け）
- `--verbose`：詳細統計を表示
- `--provider <id>`：特定プロバイダーを指定
- `--days <n>`：集計対象日数を指定（デフォルト 7 日）

## 例

```bash
# 標準表示
npx zcf ccu

# JSON をファイルに保存
npx zcf ccu --json > usage.json

# 詳細表示
npx zcf ccu --verbose
```

## 典型的な活用

- CI で定期実行し、閾値超過時に通知  
- チーム共有用ダッシュボードに JSON を流し込む  
- プロバイダー単位で利用配分をチェック

## 関連

- [check-updates](check-updates.md) - バージョン確認  
- [multi-config](../features/multi-config.md) - プロファイルごとに利用状況を分けたい場合
