---
title: CCometixLine ステータスバー
---

# CCometixLine ステータスバー

[CCometixLine](https://github.com/Haleclipse/CCometixLine) は Rust で書かれた高性能な Claude Code ステータスラインツールです。ZCF は完全自動インストール、設定、更新をサポートしています。Git ブランチ情報、ファイル変更状態、Claude Code / Codex 使用統計などの重要な情報をリアルタイムで表示できます。

## 主な機能

- 📊 **Git 統合**：ブランチ、ステータス、追跡情報を表示
- 🎯 **モデル表示**：簡略化された Claude モデル名を表示
- 📈 **使用追跡**：transcript 分析に基づく使用量追跡
- 📁 **ディレクトリ表示**：現在のワークスペースを表示
- 🎨 **インタラクティブ TUI**：リアルタイムプレビュー付きのインタラクティブ設定インターフェース
- 🌈 **テーマシステム**：複数の組み込みプリセットテーマ
- ⚡ **高性能**：Rust で開発、リソース使用量が低く、応答が高速
- 🔧 **Claude Code 強化**：context warning disabler や verbose mode enabler などの強化ツールを提供

## インストール/更新

```bash
# メニューから
npx zcf          # → L を選択

# 直接更新を確認
npx zcf check-updates --code-type claude
```

## インストール

### クイックインストール（推奨）

npm 経由でインストール（すべてのプラットフォームで動作）：

```bash
# グローバルインストール
npm install -g @cometix/ccline

# または yarn を使用
yarn global add @cometix/ccline

# または pnpm を使用
pnpm add -g @cometix/ccline
```

npm ミラーを使用してダウンロードを高速化：

```bash
npm install -g @cometix/ccline --registry https://registry.npmmirror.com
```

### Claude Code 設定

Claude Code の `settings.json` に追加：

**Linux/macOS：**

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/ccline/ccline",
    "padding": 0
  }
}
```

**Windows：**

```json
{
  "statusLine": {
    "type": "command",
    "command": "%USERPROFILE%\\.claude\\ccline\\ccline.exe",
    "padding": 0
  }
}
```

**フォールバック（npm インストール）：**

```json
{
  "statusLine": {
    "type": "command",
    "command": "ccline",
    "padding": 0
  }
}
```

### 更新

```bash
npm update -g @cometix/ccline
```

## 設定管理

### 設定ファイルの場所

CCometixLine の設定は以下に保存されます：

- **設定ファイル**：`~/.claude/ccline/config.toml`
- **テーマファイル**：`~/.claude/ccline/themes/*.toml`
- **Claude Code 統合**：設定は Claude Code の `settings.json` の `statusLine` フィールドに書き込まれます

### 設定コマンド

```bash
# 設定ファイルを初期化
ccline --init

# 設定の有効性を確認
ccline --check

# 現在の設定を表示
ccline --print

# TUI 設定モードに入る（インタラクティブ設定インターフェース）
ccline --config
```

### テーマ設定

CCometixLine は複数の組み込みテーマをサポート：

```bash
# 特定のテーマを一時的に使用（設定ファイルを上書き）
ccline --theme cometix
ccline --theme minimal
ccline --theme gruvbox
ccline --theme nord
ccline --theme powerline-dark

# またはカスタムテーマファイルを使用
ccline --theme my-custom-theme
```

### Claude Code 強化ツール

CCometixLine は Claude Code 強化機能を提供：

```bash
# context warnings を無効化し、verbose mode を有効化
ccline --patch /path/to/claude-code/cli.js

# 一般的なインストールパスの例
ccline --patch ~/.local/share/fnm/node-versions/v24.4.1/installation/lib/node_modules/@anthropic-ai/claude-code/cli.js
```

## デフォルトセグメント表示

表示形式：`Directory | Git Branch Status | Model | Context Window`

### Git ステータスインジケーター

- Nerd Font アイコン付きのブランチ名
- ステータス：`✓` クリーン、`●` ダーティ、`⚠` 競合
- リモート追跡：`↑n` 先行、`↓n` 後続

### モデル表示

簡略化された Claude モデル名を表示：

- `claude-3-5-sonnet` → `Sonnet 3.5`
- `claude-4-sonnet` → `Sonnet 4`

### コンテキストウィンドウ表示

transcript 分析に基づくトークン使用率、コンテキスト制限追跡付き。

## システム要件

- **Git**：バージョン 1.5+（より良いブランチ検出のために Git 2.22+ を推奨）
- **ターミナル**：アイコンを正しく表示するために Nerd Fonts をサポートする必要があります
  - [Nerd Font](https://www.nerdfonts.com/) をインストール（例：FiraCode Nerd Font、JetBrains Mono Nerd Font）
  - ターミナルで Nerd Font を使用するように設定
- **Claude Code**：ステータスライン統合用

## よくある質問

- **表示が更新されない**：`npx zcf ccr status` で CCR が動作しているか確認し、VS Code を再起動。  
- **アイコンが消えた**：拡張機能が無効化されていないか確認し、`npx zcf` → L で再インストール。  
- **別環境で使いたい**：`config-switch` で設定を切替えた後に VS Code 側で再読み込み。

## 関連

- [CCR](ccr.md) - プロキシ管理  
- [アップデート確認](../cli/check-updates.md) - CLI から一括更新  
- [出力スタイル](../best-practices/output-styles.md) - ステータスバーから切替する際の参考基準
