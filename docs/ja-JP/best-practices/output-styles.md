---
title: 出力スタイル戦略
---

# 出力スタイル戦略

出力スタイルは優先度の高いシステムプロンプトで、チーム規約・コーディング規約・AI の振る舞い指針を定義するのに適しています。スタイルを切り替えることで AI アシスタントの人格や作業方法を柔軟にコントロールできます。

## 出力スタイルとは

`prompts/output-style/` に置かれた Markdown ファイルで、AI の以下を定義します：
- 🎭 **人格/口調**：話し方や態度
- 📝 **コーディング規約**：コードスタイル、コメント方針、命名規則
- ✅ **品質基準**：レビュー基準、テスト要件
- 🔍 **作業方法**：問題分析手順、意思決定の流れ

## 管理方法

### インストール

初期化時に `--output-styles` で指定します。

```bash
# 全スタイルを導入
npx zcf init -o all

# 特定スタイルのみ
npx zcf init -o engineer-professional,nekomata-engineer

# スタイル導入をスキップ
npx zcf init -o skip
```

### 切り替え

- **メインメニュー**：`npx zcf` → 6 を選択しスタイル管理へ。
- **プロジェクト内**：  
  - Claude Code: `/set-output-style engineer-professional`  
  - Codex: `config.toml` の `systemPromptStyle` を編集。

### 編集

```bash
# インストール済みスタイルを確認
ls -la ~/.claude/prompts/output-style/

# 既存スタイルを編集
vim ~/.claude/prompts/output-style/engineer-professional.md

# 独自スタイルを作成
vim ~/.claude/prompts/output-style/my-custom-style.md
```

## 事前定義スタイル

<div align="center">
  <a href="https://github.com/Haleclipse">
    <img src="/assets/Haleclipse.webp" alt="ハレーちゃん" width="200" style="border-radius: 10px;"/>
  </a>
  <p>ツンデレ<a href="https://github.com/Haleclipse">ハレーちゃん</a>お嬢様 (￣▽￣)ゞ</p>
</div>

| ID | 名前 | 特徴 | 想定シーン |
|----|------|------|------------|
| `engineer-professional` | プロフェッショナルエンジニア | 厳密・プロ志向 | 企業/正式案件 |
| `nekomata-engineer` | ネコマタエンジニア | フレンドリーだが専門的 | 個人/カジュアル |
| `laowang-engineer` | ラオワンエンジニア | ユーモラスで実務的 | 中国語環境 |
| `ojousama-engineer` | お嬢様エンジニア | 丁寧で上品、細部重視 | 特定のトーンが必要な時 |

内蔵スタイルとして `default` / `explanatory` / `learning` も常に利用できます。

## 活用例

### 1. チーム規約をスタイル化

```markdown
# ~/.claude/prompts/output-style/team-standards.md
## コーディング規約
- TypeScript + strict
- 関数は 50 行以内
- 単体テスト必須
- ESLint + Prettier を使用
- SOLID を徹底

## レビュー要求
- すべての PR がコードレビュー必須
- カバレッジ > 80%
- パフォーマンス影響を確認
- セキュリティ検証
```

### 2. シーン別に複数スタイルを持つ

```bash
# 実装フェーズ
/set-output-style engineer-professional
# レビュー時
/set-output-style code-review
# ドキュメント作成時
/set-output-style documentation
```

### 3. プロジェクト専用スタイル

```
# プロジェクト直下に置く
Project/.claude/output-style/project-specific.md

# 会話で指定
/set-output-style project-specific
```

優先度は「プロジェクト > グローバル > 内蔵」の順です。

### 4. 共有とバージョン管理

```bash
# チームリポジトリを作成しスタイルを追加
mkdir team-output-styles
cp ~/.claude/prompts/output-style/team-standards.md team-output-styles/
git add team-output-styles/
git commit -m "Add team output style standards"

# メンバーが同期
git pull
cp team-output-styles/team-standards.md ~/.claude/prompts/output-style/
```

## カスタムスタイルの作成手順

1. ファイルを作成：`vim ~/.claude/prompts/output-style/my-style.md`
2. 内容を書く（人格/コーディング規約/作業方法など）
3. メニューまたは `/set-output-style my-style` で適用

## 注意点

- ⚠️ **Claude Code 1.0.81 以上**で出力スタイルが利用可能。`npx zcf check-updates` で確認。
- スタイルファイルの場所  
  - Claude Code: `~/.claude/prompts/output-style/`  
  - Codex: `~/.codex/prompts/output-style/`  
  - プロジェクト: `.claude/output-style/` or `.codex/output-style/`
- 複数スタイルがある場合、プロジェクトレベルが最優先、次にグローバル、最後に内蔵スタイル。

## 関連リソース

- [テンプレートシステム](../advanced/templates.md)
- [設定管理](../features/multi-config.md)
- [使用のヒント](tips.md)

> 💡 出力スタイルを適切に運用するとコード品質と開発効率が大きく向上します。チームで方針を統一し、プロジェクト特性に合わせて調整するのがおすすめです。
