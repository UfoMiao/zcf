---
title: 設定切替
---

# 設定切替

`zcf config-switch` は複数の Claude Code API 設定間を素早く切り替えるために使用されます。異なるプロジェクトで異なる API を使用するユーザーに適しています。

> **別名**：`zcf cs` という短縮形を使用できます。すべての例は `npx zcf cs --list` などの形式に書き換えることができます。

## コマンド形式

```bash
# インタラクティブ切替（推奨）
npx zcf cs

# 利用可能なすべての設定を一覧表示
npx zcf cs --list

# 指定された設定に直接切替
npx zcf cs work-api
```

## パラメータ説明

| パラメータ | 説明 | オプション値 | デフォルト値 |
|------|------|--------|--------|
| `--list`, `-l` | 設定のみを一覧表示し、切替しない | なし | いいえ |
| `目標設定` | 切替先の設定名を直接指定 | 設定名または ID | なし |

## 機能特性

### Claude Code 設定切替

以下のタイプの設定の切替をサポートします：

1. **公式ログイン**：Claude 公式 OAuth ログインを使用
2. **CCR プロキシ**：Claude Code Router プロキシを使用
3. **カスタム設定**：`zcf init` で作成された複数の API 設定

**設定ソース**：
- 設定ファイル：`~/.claude/settings.json`
- プロファイル管理：各設定は独立したプロファイルとして保存
- 現在の設定識別子：`currentProfileId` フィールド

## 使用方法

### インタラクティブ切替

最も一般的な方法で、インタラクティブメニューから設定を選択します：

```bash
npx zcf cs
```

**インタラクティブインターフェース**：
```
? Claude Code 設定を選択：
  ❯ ● 公式ログインを使用 (current)
    CCR プロキシ
    作業 API (work-api)
    個人 API (personal-api)
    予備 API (backup-api)
```

### すべての設定を一覧表示

現在利用可能なすべての設定を表示します：

```bash
npx zcf cs --list
```

**出力例**：
```
利用可能な Claude Code 設定：

1. 公式ログイン (current)
2. CCR プロキシ
3. 作業 API - work-api
4. 個人 API - personal-api
```

### 直接切替

設定名がわかっている場合、直接切替できます：

```bash
# 指定されたプロファイルに切替（設定名を使用）
npx zcf cs work-api
```

**サポートされるマッチング方法**：
- 設定 ID（`work-api` など）
- 設定名（`作業 API` など）

## 設定管理

### 複数設定の作成

初期化時に複数の API 設定を作成します：

```bash
# 複数設定パラメータを使用
npx zcf init --api-configs '[
  {
    "name": "作業 API",
    "type": "api_key",
    "key": "sk-work-xxx",
    "url": "https://api.example.com",
    "primaryModel": "claude-sonnet-4-5"
  },
  {
    "name": "個人 API",
    "type": "api_key",
    "key": "sk-personal-xxx",
    "url": "https://personal.api.com",
    "primaryModel": "claude-sonnet-4-5"
  }
]'
```

### 設定命名の推奨事項

識別と管理を容易にするため、意味のある英語名を使用することを推奨します：

✅ **推奨**：
- `work-api` - 作業 API
- `personal-api` - 個人 API
- `backup-api` - 予備 API

❌ **非推奨**：
- `作業環境`、`個人開発` などの非英語名
- `config1`、`config2` などの意味のない名前
- `default`、`new` などの汎用名
- 意味のないランダム文字列

### 切替後の効果

設定を切替えると：

1. **メイン設定を更新**：`settings.json` の API 設定を変更
2. **設定項目を適用**：API URL、キー、モデル選択などを含む
3. **切替結果を表示**：成功または失敗のプロンプト

**注意**：
- 切替は元の設定を削除せず、現在使用されている設定のみを変更します
- すべての設定は同じ設定ファイルに保存されます
- いつでも以前の設定に戻すことができます

## 使用シナリオ

### 1. 異なるプロジェクトで異なる API を使用

```bash
# プロジェクト A は作業 API を使用
npx zcf cs work-api

# プロジェクト B は個人 API を使用
npx zcf cs personal-api

# プロジェクト C は予備 API を使用
npx zcf cs backup-api
```

### 2. 新しい設定をテスト

```bash
# テスト設定に切替
npx zcf cs backup-api

# テスト完了後に戻す
npx zcf cs work-api
```

## ベストプラクティス

### 設定の整理

1. **用途別に分類**：work、personal、backup
2. **標準命名を使用**：`{用途}-api` 形式（例：`work-api`）
3. **一貫性を維持**：同じ API を異なるプロジェクトで同じ設定名を維持

### 切替前の準備

1. **現在の作業を保存**：未保存の変更がないことを確認
2. **設定を検証**：切替後に API が正常に動作するかテスト
3. **切替を記録**：チームで設定切替の状況を記録

### Worktree との連携

異なる Worktree で異なる設定を使用します：

```bash
# メインブランチは作業設定を使用
npx zcf cs work-api

# 機能ブランチ Worktree を作成
/git-worktree add feat/new-feature -o

# 機能ブランチで設定を切替
cd ../.zcf/project-name/feat/new-feature
npx zcf cs personal-api
```

## よくある質問

### Q: 切替後に設定が有効にならない？

A: 
1. Claude Code を再起動
2. 設定ファイルが正しく更新されているか確認
3. API キーが有効か検証

### Q: 設定を追加、編集、または削除するには？

A: ZCF メインメニューから設定を管理できます：

1. `npx zcf` を実行してメインメニューに入る
2. **"3. API 設定"** を選択
3. **"カスタム API 設定"** を選択

このメニューでは、対話的に設定の**追加**、**編集**、**削除**、および**コピー**を行うことができます。

### Q: 設定を切替えるとデータが失われますか？

A: いいえ。切替は現在使用されている API 設定のみを変更し、データや設定を削除することはありません。

## 関連ドキュメント

- [複数設定とバックアップ](../features/multi-config.md) - 複数設定システムの詳細
- [初期化ガイド](init.md) - 複数設定を作成する方法
- [Worktree 並列開発](../best-practices/worktree.md) - Worktree との連携使用
