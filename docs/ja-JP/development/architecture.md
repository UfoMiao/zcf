---
title: アーキテクチャ
---

# アーキテクチャ

ZCF は TypeScript で書かれた CLI ツールで、`src/cli.ts` をエントリに、`commands/`・`config/`・`utils/`・`types/` に役割単位で分割されています。

## ディレクトリ構成（概要）

- `src/cli.ts`：エントリポイント、コマンドの登録  
- `src/commands/`：サブコマンド実装（init/update/ccr/ccu/config-switch 等）  
- `src/config/`：設定読み書き、プリセット、バックアップロジック  
- `src/utils/`：プロンプト生成・ファイル操作・ログ出力  
- `src/types/`：型定義  
- `src/assets/`：バナー、テンプレート  
- `docs/`：VitePress ドキュメント（本ページ）

## コアフロー

1. CLI が引数を解析し、対応コマンドを発火  
2. 設定/バックアップを読み込み、処理モード（上書き/マージ等）を決定  
3. API/ワークフロー/MCP/スタイルの適用を実行  
4. ログと結果を出力し、必要ならバックアップを保存

## 依存

- Node.js 22+  
- `unbuild` でビルド、`pnpm` ベース  
- テストは Vitest、ESLint は antfu 設定

## 拡張ポイント

- 新コマンド：`src/commands/<name>.ts` を追加し CLI に登録  
- プリセット追加：`config/providers` に追記  
- ワークフロー/テンプレート：`templates/` と `docs/` を同期更新

## 開発の流れ

```bash
pnpm install
pnpm dev        # tsx でウォッチ
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Pull Request 時は lint/typecheck/test の通過を必須とし、変更内容に応じてドキュメントを更新してください。
