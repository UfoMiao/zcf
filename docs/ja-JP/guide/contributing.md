---
title: 貢献ガイド
---

# 貢献ガイド

ZCF は Node.js 22 以降が必要な pnpm ワークスペースです。

```bash
git clone https://github.com/UfoMiao/zcf.git
cd zcf
pnpm install
pnpm dev plan --file ./my-zcf.json   # ソースから CLI を実行する
```

`pnpm dev ui` は `packages/web/dist` から Web UI を配信するので、先に一度 `pnpm build` を実行してください。

| パッケージ | 内容 |
|------------|------|
| `packages/core` | エンジン: 設定スキーマ、ツールごとのアダプター、プランと適用、JSON・TOML・YAML・`.env` ファイルのエディター。ターミナルや UI のコードは含みません。 |
| `packages/ui-kit` | ターミナル UI と Web UI が共有するもの: 下書きモデル、ページとフィールド、`ZcfService` インターフェース。 |
| `packages/cli` | `zcf` コマンド、ターミナル UI、`zcf ui` のローカルサーバー。 |
| `packages/web` | ブラウザー UI。 |
| `presets/providers.json` | 実行時に読み込まれる [プロバイダープリセット](./providers)。 |

## チェック

| コマンド | 目的 |
|----------|------|
| `pnpm test:run` | すべてのテスト |
| `pnpm typecheck` | TypeScript |
| `pnpm lint` | oxlint と oxfmt（修正は `pnpm lint:fix`） |
| `pnpm build` | CLI のバンドル |
| `pnpm bench` | `zcf --version` が 60 ms の予算内に起動するかを確認 |
| `pnpm docs:dev` | このサイト |

テストが実際のホームフォルダーに触れたり、実際のインストーラーを実行したりすることはありません。アダプターはホームフォルダー、プラットフォーム、環境変数、コマンドランナーを受け取り、テストはそれらの偽物を渡します。

## 次に読むもの

- [`AGENTS.md`](https://github.com/UfoMiao/zcf/blob/main/AGENTS.md): 人にも AI エージェントにも共通する、すべての変更に適用されるルール。
- [ADR 002](https://github.com/UfoMiao/zcf/blob/main/docs/adr/002-v5-architecture.md): v5 のアーキテクチャとその理由。

## ツールを追加する

ツールは `packages/core/src/adapters` の 1 つのアダプターです。ツールを検出し、インストール、プロバイダー、MCP サーバー、スキル、更新を計画します。`packages/core/src/schema/config.ts` にツールの ID と名前を追加し、`packages/core/src/adapters/index.ts` にアダプターを登録すれば、CLI と両方の UI がそこから取り込みます。ツール自身のコマンドがあればそれを使ってください。偽のランナーで、新規インストール、既存の設定、Windows のパスをテストしてください。

プルリクエストは Conventional Commits を使い、説明はリポジトリのテンプレートに従います。
