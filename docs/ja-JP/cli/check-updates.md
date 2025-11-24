---
title: バージョン確認
---

# バージョン確認

`zcf check-updates` は、ZCF ツールチェーン内の各コンポーネント（ZCF 自体、Claude Code、CCR、CCometixLine、Codex など）を検出して更新するために使用されます。

> **別名**：同等の効果を持つ `zcf check` を使用できます（例：`npx zcf check -T cx`）。

## コマンド形式

```bash
# すべてのツール更新を確認（Claude Code モード）
npx zcf check

# Codex 関連ツール更新を確認
npx zcf check -T cx

# 非対話モード（自動更新、確認をスキップ）
npx zcf check -s

# メインメニューからアクセス
npx zcf
# 次に +. 更新確認 を選択
```

## パラメータ説明

| パラメータ | 略称 | 説明 | オプション値 | デフォルト値 |
|------|------|------|--------|--------|
| `--code-type, -T` | `-T` | ツールタイプを指定 | `claude-code`, `codex`, `cc`, `cx` | ZCF 設定から読み取り |
| `--skip-prompt, -s` | `-s` | 対話確認をスキップ（非対話モード） | なし | いいえ（対話モード） |

## 確認するツール

### Claude Code モード

`-T` が `cc`（または `claude-code`）または未指定の場合、以下のツールを確認します：

1. **CCR (Claude Code Router)**
   - パッケージ名：`@musistudio/claude-code-router`
   - 確認方法：npm registry

2. **Claude Code CLI**
   - パッケージ名：`@anthropic-ai/claude-code`
   - 確認方法：npm registry

3. **CCometixLine**
   - パッケージ名：`@cometix/ccline`
   - 確認方法：npm registry

### Codex モード

`-T` が `cx`（または `codex`）の場合、以下を確認します：

1. **Codex CLI**
   - 確認方法：Codex 公式 API
   - 更新方法：最新バージョンを自動ダウンロードしてインストール

## ワークフロー

### 1. バージョン確認

各ツールに対して以下の確認を実行します：

1. ツールがインストールされているか検出
2. 現在インストールされているバージョン番号を取得
3. 公式ソースから最新バージョン番号を取得
4. バージョンを比較し、更新が必要かどうかを判断

### 2. 更新プロンプト

更新が必要なツールに対して、以下を表示します：

```
🔍 ツール更新を確認中...

CCR
現在のバージョン：1.2.3
最新バージョン：1.3.0
更新が必要：はい

Claude Code
現在のバージョン：2.0.5
最新バージョン：2.0.5
更新が必要：いいえ

CCometixLine
現在のバージョン：1.0.10
最新バージョン：1.0.12
更新が必要：はい
```

### 3. 更新確認

対話モードでは、更新が必要な各ツールについて更新するかどうかを尋ねます：

```
? CCR を更新しますか？ (Y/n) 
```

`-s` モードでは、すべての更新を自動実行します。

### 4. 更新実行

確認後、更新操作を実行します：

1. 更新進捗を表示
2. インストール/更新コマンドを実行
3. 更新結果を検証
4. 更新サマリーを表示

## 使用シナリオ

### 定期的な更新

最新の機能と修正を取得するために、定期的に更新を確認することをお勧めします：

```bash
# 週に1回確認
npx zcf check
```

### 自動更新

CI/CD または自動化スクリプトで非対話モードを使用します：

```bash
# すべてのツールを自動更新
npx zcf check -s
```

### 対象を絞った更新

特定のツールタイプの更新のみを確認します：

```bash
# Codex 関連ツールのみを確認
npx zcf check -T cx
```

## 更新戦略

### 安全な更新の推奨事項

1. **設定をバックアップ**：更新前に現在の設定をバックアップ
   ```bash
   # 手動バックアップ
   cp ~/.claude/settings.json ~/.claude/settings.json.backup
   ```

2. **変更ログを確認**：新バージョンの変更内容を確認
   - Claude Code：[公式ドキュメント](https://docs.claude.com)
   - CCR：[GitHub Releases](https://github.com/musistudio/claude-code-router/releases)

3. **テスト環境で検証**：テスト環境がある場合、まずテスト環境で更新

### 更新失敗の処理

更新が失敗した場合、ZCF は：

1. エラー情報を表示
2. 元のバージョンを保持
3. トラブルシューティングの提案を提供

一般的な失敗の原因：

- **ネットワークの問題**：npm registry へのアクセス失敗
  ```bash
  # ネットワーク接続を確認
  ping registry.npmjs.org
  ```

- **権限の問題**：sudo 権限が必要（macOS/Linux）
  ```bash
  # sudo を使用して実行
  sudo npx zcf check
  ```

- **ポートの占有**：サービスが実行中で更新できない
  ```bash
  # まずサービスを停止してから更新
  ccr stop
  npx zcf check
  ```

## バージョン互換性

### ZCF バージョン要件

- **Node.js**：>= 22
- **npm/pnpm**：最新バージョン

### ツールバージョンの互換性

ZCF はツール間のバージョン互換性を確認し、以下を保証します：

- CCR と Claude Code のバージョンが一致
- CCometixLine が Claude Code と互換性がある
- Codex CLI が最新の安定版

## 使用の推奨事項

### 更新頻度

- **日常使用**：月に1回確認
- **アクティブな開発**：2週間に1回確認
- **本番環境**：更新前にテスト環境で検証

### 更新タイミング

以下のタイミングで更新を確認することをお勧めします：

1. 既知のバグを修正するバージョンが必要な場合
2. 新機能を使用する必要がある場合
3. 定期的なメンテナンス時間
4. 設定移行前（ツールバージョンが最新であることを確認）

### 更新後の検証

更新完了後、ツールが正常に動作することを確認します：

```bash
# Claude Code を検証
claude-code --version

# CCR を検証
ccr status

# CCometixLine を検証（インストールされている場合）
ccline --version

# Codex を検証
codex --version
```

## zcf init との連携

`zcf init` のバックアップ機能は、更新前に設定を自動バックアップできます：

```bash
# 更新前に初期化（設定をバックアップ）
npx zcf init
# または手動でバックアップ機能を使用
npx zcf i -s -r backup
```

## よくある質問

### Q: 更新確認が遅い？

A: 
1. ネットワーク接続を確認
2. npm registry へのアクセスが遅い可能性があります。国内ミラーを使用できます：
   ```bash
   npm config set registry https://registry.npmmirror.com
   ```

### Q: 更新後、ツールが使用できない？

A: 
1. ツールが正しくインストールされているか確認：`which ccr`
2. エラーログを確認
3. 再インストールを試行：`npx zcf ccr`（CCR の場合）

### Q: 旧バージョンに戻すには？

A: 
1. 更新前のバージョン番号を確認
2. 指定バージョンを手動インストール：
   ```bash
   npm install -g @musistudio/claude-code-router@1.2.3
   ```

### Q: 特定のツールを更新したくない？

A: 対話モードで「いいえ」を選択するか、設定ファイルで自動更新を無効化します（サポートされている場合）。

## 関連ドキュメント

- [CCR 管理](ccr.md) - CCR のインストールと設定
- [トラブルシューティング](../advanced/troubleshooting.md) - 更新関連の問題のトラブルシューティング
- [初期化ガイド](init.md) - 設定バックアップの方法
