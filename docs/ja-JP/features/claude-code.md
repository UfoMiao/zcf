---
title: Claude Code 設定
---

# Claude Code 設定

`npx zcf init` だけで Claude Code の環境構築・ワークフロー導入・出力スタイル設定まで一括で完了します。

## コア機能

| 機能 | 説明 | 設定ファイル |
|---|---|---|
| API 設定 | 公式ログイン / API Key / CCR プロキシに対応 | `~/.claude/settings.json` |
| ワークフローコマンド | 6 段階 / Feat / Git / BMAD コマンド | `~/.claude/commands/zcf/` |
| ワークフローエージェント | プランナー / UX など | `~/.claude/agents/zcf/` |
| 出力スタイル | 複数のスタイルを同梱 | `~/.claude/output-styles/` |
| MCP | Context7, Open Web Search など | `~/.claude/settings.json` |
| システムプロンプト | AI メモリ設定 | `~/.claude/CLAUDE.md` |

## ディレクトリとバックアップ

`zcf init` 実行後は以下が自動作成されます。

```
~/.claude/
├─ settings.json                  # API・MCP・権限などの設定
├─ CLAUDE.md                      # システムプロンプト / メモリ
├─ commands/
│  └─ zcf/
│      ├─ init-project.md
│      ├─ workflow.md             # 6 段階ワークフローコマンド
│      ├─ feat.md                 # 機能開発ワークフローコマンド
│      ├─ git-commit.md
│      ├─ git-rollback.md
│      ├─ git-cleanBranches.md
│      ├─ git-worktree.md
│      └─ bmad-init.md
├─ agents/
│  └─ zcf/
│      ├─ common/
│      │   ├─ init-architect.md
│      │   └─ get-current-datetime.md
│      └─ plan/
│          ├─ planner.md
│          └─ ui-ux-designer.md
├─ output-styles/
└─ backup/
    └─ backup_YYYY-MM-DD_HH-mm-ss/
```

- 変更時に自動バックアップを作成  
- 既存設定を検出したら「バックアップして上書き / マージ / ドキュメントのみ更新 / スキップ」から選択可能

## API・モデル

- **公式ログイン**：最小手順で利用開始  
- **API Key**：`-t api_key -k <key> -u <baseUrl> -M <model>` 形式  
- **CCR プロキシ**：`npx zcf ccr start` でルーターを起動し、`settings.json` に自動設定
- モデルデフォルト：`npx zcf init --model-id claude-sonnet-4-5 --fallback-model-id claude-haiku-4-5`

## ワークフロー・テンプレート

- `/zcf:workflow` などのコマンドは `~/.claude/commands/zcf/` に配置
- エージェントは `~/.claude/agents/zcf/` 配下に配置
- `--workflows all/skip` で導入を制御

## 出力スタイルと AI メモリ

- `~/.claude/prompts/output-style/` に複数スタイルを同梱。`/set-output-style engineer-professional` などで切替。
- AI メモリ（グローバル指示）は `~/.claude/CLAUDE.md` に保存。`npx zcf` → 6 で編集可能。

## MCP サービス

Context7 / Open Web Search / Spec Workflow / DeepWiki / Playwright / Exa / Serena をプリセット。`npx zcf` → 4 で選択導入。API Key が必要なサービスは環境変数を案内します。

## ツール連携

- **CCometixLine**：ステータスバーを `npx zcf` → L でインストール/更新  
- **ccusage (ccu)**：利用状況を `npx zcf ccu` で確認  
- **config-switch**：`npx zcf config-switch work` で複数設定を切替

## よくある操作

```bash
# 公式ログイン + 全ワークフロー/スタイル導入
npx zcf init

# API Key + MCP 全部導入
npx zcf init -s -t api_key -k "sk-xxx" -u "https://api.302.ai/v1" --mcp-services all

# プロキシ CCR で利用
npx zcf init -s -t ccr && npx zcf ccr start
```
