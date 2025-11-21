---
title: 貢献ガイド
---

# 貢献ガイド

ZCF にコントリビュートする際の手順と基準です。

## 開発環境

```bash
pnpm install
pnpm dev          # ウォッチ実行
pnpm lint
pnpm typecheck
pnpm test
```

Node.js 22+ を推奨。IDE の ESLint/TS 設定を有効にしてください。

## コーディング規約

- TypeScript ESM、2 スペース、シングルクォート  
- 変数/関数は camelCase、型/クラスは PascalCase  
- 副作用はエントリポイントのみに集約  
- できるだけ DRY/KISS/SOLID を守る

## 変更フロー

1. Issue またはディスカッションで方向性を共有  
2. ブランチを切り、作業内容に応じてテストを追加  
3. `pnpm lint && pnpm typecheck && pnpm test` を通す  
4. Conventional Commits でコミット（例：`feat(config): add provider preset`）  
5. PR では概要・検証手順を簡潔に記載し、関連 Issue をリンク

## テストとカバレッジ

- Vitest を使用。ユニットは `tests/unit/`、統合は `tests/integration/`。  
- 既存しきい値を下回らないこと。必要に応じ `:coverage` で確認。  
- テストヘルパー/フィクスチャは再利用し、重複を避ける。

## ドキュメント

- コマンドやテンプレートに変更があれば `docs/`（必要なら各言語）を更新  
- `src/i18n/` や `templates/` を触った場合は README/ドキュメントも同期  
- 追加した出力スタイルやワークフローは説明ページを挿入

## レビューのポイント

- 破壊的変更時は明示し、移行手順またはフォールバックを提示  
- エラーハンドリングとログ出力を入れる  
- 既存のバックアップ/設定マージロジックを壊していないか確認
