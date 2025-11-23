---
title: 使用のヒント
---

# 使用のヒント

ZCF を日常的に活用するための実用的なコツとベストプラクティスをまとめました。さまざまなシーンで効率良く ZCF を使うためのリファレンスとして利用してください。

## 基本のヒント

### 1. まずはインタラクティブメニューに慣れる

**ポイント**：`npx zcf` から始める習慣を付けましょう。すべての機能に番号付きの案内があり、細かなパラメータを覚える必要がありません。

```bash
# インタラクティブメニューを開く
npx zcf

# 主なメニュー項目
# 1 - 完整な初期化
# 2 - ワークフローの導入
# 3 - API/CCR の設定
# 4 - MCP の設定
# 5 - デフォルトモデルの設定
# 6 - AI メモリの設定
# 7 - 環境権限の設定
# R - CCR 管理
# U - ccusage 利用状況
# L - CCometixLine 管理
# + - アップデート確認
# ... など
```

**メリット**：
- ✅ 複雑なパラメータを覚える必要がない
- ✅ 利用可能な機能を一覧できる
- ✅ コマンドに不慣れでも迷わない
- ✅ 入力ミスが減る

### 2. 定期的なアップデート

**ポイント**：ワークフローとテンプレートを最新化し、バージョンチェックを定期的に行う。

```bash
# 週1回のアップデート（推奨）
npx zcf update

# 省略形
npx zcf u

# 非対話での更新
npx zcf u -s -g zh-CN
```

**ベストプラクティス**：
- 📅 週1回アップデートして最新テンプレートを取得
- 🔔 バージョン通知を確認し、ツールをタイムリーにアップグレード
- 💾 更新前に自動バックアップが走るので安心

### 3. 多言語切り替えの使い分け

**ポイント**：シーンに合わせて言語パラメータを組み合わせる。

```bash
# すべて中国語に統一
npx zcf init -g zh-CN

# テンプレートは中国語、AI 出力は英語（英語コメントが必要な場合）
npx zcf init -c zh-CN -a en

# アップデート時だけテンプレート言語を変更
npx zcf update -c en
```

**活用シーン**：
- 🌐 **国際プロジェクト**：テンプレートを英語にして共同作業
- 🇨🇳 **中国語プロジェクト**：テンプレートを中国語にして可読性を重視
- 🔀 **混在シナリオ**：テンプレートは中国語、コードコメントは英語

### 4. 複数デバイスでの設定同期

**ポイント**：複数デバイスで設定を同期し、同じ開発体験を維持する。

#### 方法1: Git Worktree を使う

```bash
# プロジェクト内で worktree を作成し設定を移行
/git-worktree migrate

# または手動
git worktree add ../project-config
cp -r ~/.claude/* ../project-config/.claude/
```

#### 方法2: クラウドストレージ同期

```bash
# Dropbox / iCloud / OneDrive などを利用し設定ディレクトリを同期

# macOS + iCloud の例
ln -s ~/Library/Mobile\\ Documents/com~apple~CloudDocs/.zcf-configs ~/.zcf-sync

# 設定を同期
rsync -av ~/.claude/ ~/.zcf-sync/claude/
rsync -av ~/.codex/ ~/.zcf-sync/codex/
```

#### 方法3: バージョン管理を利用

```bash
# 設定用リポジトリを作成
mkdir ~/zcf-configs && cd ~/zcf-configs
git init

# 設定を追加（秘匿情報は除外）
echo \"*.key\" >> .gitignore
echo \"auth.json\" >> .gitignore
git add .claude/ .codex/
git commit -m \"Initial ZCF configs\"

# 複数デバイスで pull
git pull origin main
```

### 5. スクリプトによる配備

**ポイント**：`--skip-prompt` と JSON 設定を組み合わせ、自動配備を行う。

#### CI/CD スクリプト例

```bash
#!/bin/bash
# deploy-zcf.sh - ZCF 自動配備

API_KEY=${ZCF_API_KEY}
PROVIDER=${ZCF_PROVIDER:-302ai}
LANG=${ZCF_LANG:-zh-CN}

# 非対話で初期化
npx zcf init -s \
  --provider \"$PROVIDER\" \
  --api-key \"$API_KEY\" \
  --all-lang \"$LANG\" \
  --mcp-services all \
  --workflows all \
  --output-styles all

echo \"ZCF configuration deployment completed\"
```

#### 新規メンバー向けスクリプト

```bash
#!/bin/bash
# onboard-dev.sh - 新任開発者の初期設定

echo \"Configuring development environment...\"

# 1. 設定ファイルで ZCF を構成
npx zcf init -s --api-configs-file ./team-api-configs.json

# 2. ワークフロー更新
npx zcf update -s -g zh-CN

# 3. ツールバージョン確認
npx zcf check-updates

echo \"Development environment configuration completed!\"
```

#### バッチ配備スクリプト

```bash
#!/bin/bash
# batch-deploy.sh - 複数サーバーへの一括配備

SERVERS=(\"server1\" \"server2\" \"server3\")

for server in \"${SERVERS[@]}\"; do
  echo \"Deploying to $server...\"
  ssh \"$server\" \"npx zcf init -s -p 302ai -k '${API_KEY}' -g zh-CN\"
done
```

### 6. 利用状況のモニタリング

**ポイント**：`ccu` で API 利用を監視し、コスト超過を防ぐ。

```bash
# 利用統計を表示
npx zcf ccu

# JSON 出力（監視システム連携用）
npx zcf ccu --json > usage.json

# 詳細表示
npx zcf ccu --verbose
```

**連携例**：

```bash
#!/bin/bash
# monitor-usage.sh - 利用監視スクリプト

USAGE=$(npx zcf ccu --json)

TOKENS=$(echo \"$USAGE\" | jq '.tokens.total')
COST=$(echo \"$USAGE\" | jq '.cost.total')

if [ \"$TOKENS\" -gt 1000000 ]; then
  echo \"Warning: Token usage exceeds 1 million!\" | mail -s \"ZCF Usage Alert\" admin@example.com
fi
```

## 応用のヒント

### 7. API プロバイダープリセットを活用

**ポイント**：プリセットを使えば 5 つ以上のパラメータ指定を 2 つに削減できる。

```bash
# 従来の指定（パラメータが多い）
npx zcf init -s \\
  -t api_key \\
  -k \"sk-xxx\" \\
  -u \"https://api.302.ai/v1\" \\
  -M \"claude-sonnet-4-5\" \\
  -F \"claude-haiku-4-5\"

# プリセットを利用（2 つだけ）
npx zcf init -s -p 302ai -k \"sk-xxx\"
```

**対応プロバイダー**：`302ai`, `glm`, `minimax`, `kimi`, `custom`

### 8. 複数設定の切り替え

**ポイント**：設定スイッチを使って環境を素早く切り替える。

```bash
# 設定一覧
npx zcf config-switch --list

# GLM プロバイダーに切替
npx zcf config-switch glm-provider

# 302.AI プロバイダーに切替
npx zcf config-switch 302ai-provider

# Codex での切り替え
npx zcf config-switch glm-provider --code-type codex
```

**命名例**（プロバイダーの英語名を使用）：
- `glm-provider` - GLM プロバイダー
- `302ai-provider` - 302.AI プロバイダー
- `minimax-provider` - MiniMax プロバイダー
- `kimi-provider` - Kimi プロバイダー

### 9. ワークフローの組み合わせ

**ポイント**：ワークフローを組み合わせて開発効率を高める。

```bash
# 1. 機能開発の計画
/zcf:feat Add user comment functionality

# 2. 6 段階ワークフローで実装詳細を書く
/zcf:workflow Implement comment CRUD operations

# 3. Git ワークフローでコミット
/git-commit

# 4. BMad ワークフローでイテレーション
/zcf:bmad-init
```

### 10. 出力スタイル戦略

**ポイント**：シーンに応じて出力スタイルを選択する。

```bash
# 利用可能なスタイルを表示
npx zcf init -s -o all

# 会話中に切り替え
# Claude Code: /set-output-style engineer-professional
# Codex: システムプロンプトで設定
```

**推奨スタイル**：
- `engineer-professional` - フォーマルな開発案件向け
- `nekomata-engineer` - カジュアルに進めたい場合
- `laowang-engineer` - 中国語環境向け
- `ojousama-engineer` - 特定の語り口が必要な場合

### 11. MCP サービスの最適化

**ポイント**：プロジェクトに必要な MCP のみ導入し、不要なサービスを避ける。

```bash
# 必要最小限だけ導入
npx zcf init -s -m context7,open-websearch

# すべてのサービスを確認
npx zcf
# 4 (Configure MCP) を選択して一覧表示
```

**選定の目安**：
- **ドキュメント検索**：`context7`
- **Web 検索**：`open-websearch`
- **要件整理**：`spec-workflow`
- **コード検索**：`serena`
- **ブラウザ操作**：`Playwright`

### 12. バックアップ戦略

**ポイント**：バックアップを適切に使い、設定の安全性を確保する。

```bash
# 自動バックアップ（init/update で自動実行）
npx zcf init

# 特定設定を手動バックアップ
cp -r ~/.claude ~/.claude.backup.$(date +%Y%m%d)

# 古いバックアップを定期削除（7日より古いものを削除）
find ~/.claude/backup -name \"*.bak\" -mtime +7 -delete
```

### 13. 障害からの素早い復旧

**ポイント**：問題が起きたときに迅速に設定を戻す。

```bash
# 1. 直近のバックアップを確認
ls -lt ~/.claude/backup/ | head -5

# 2. バックアップを復元
cp -r ~/.claude/backup/backup_2025-01-15_10-30-45/* ~/.claude/

# 3. または再初期化（新しいバックアップを作成）
npx zcf init --config-action backup
```

### 14. バージョン管理との統合

**ポイント**：設定をバージョン管理に入れつつ、秘匿情報は除外する。

```bash
# .gitignore を用意
cat > ~/.zcf-configs/.gitignore << EOF
# 機密情報を除外
*.key
auth.json
settings.json
config.toml

# テンプレートとワークフローは含める
!templates/
!workflows/
!prompts/
EOF

# 設定をコミット
git add .gitignore templates/ workflows/
git commit -m \"Add ZCF templates and workflows\"
```

### 15. パフォーマンス最適化

**ポイント**：設定を整理して応答速度を高める。

```bash
# 1. 必要な MCP のみ導入
npx zcf init -s -m context7,open-websearch

# 2. （対応していれば）ローカルキャッシュを活用

# 3. 定期的にバックアップを整理
npx zcf uninstall --mode custom --items backups
```

## チームでの活用

### 16. チーム設定の統一

**ポイント**：チーム内で設定基準を統一する。

```bash
# チーム用設定テンプレート
cat > team-config.json << EOF
{
  \"provider\": \"302ai\",
  \"lang\": \"zh-CN\",
  \"mcpServices\": [\"context7\", \"open-websearch\", \"spec-workflow\"],
  \"workflows\": [\"sixStepsWorkflow\", \"gitWorkflow\", \"featPlanUx\"],
  \"outputStyle\": \"engineer-professional\"
}
EOF

# メンバーが同じ設定を利用
npx zcf init -s --api-configs-file team-config.json -k \"Personal API Key\"
```

### 17. ドキュメント共有

**ポイント**：ワークフローや設定テンプレートを共有する。

```bash
# ワークフローをエクスポート
tar -czf team-workflows.tar.gz ~/.claude/workflows/

# メンバー側でインポート
tar -xzf team-workflows.tar.gz -C ~/.claude/
```

### 18. コードレビュー連携

**ポイント**：ZCF ワークフローを PR 説明などに活用する。

```bash
# 生成された資料を PR 説明に利用
/zcf:feat New feature name
```

## トラブルシューティングのヒント

### 19. 迅速な診断

**ポイント**：組み込みコマンドで問題を素早く切り分ける。

```bash
# 設定を確認
cat ~/.claude/settings.json | jq .

# MCP サービスを確認
cat ~/.claude/settings.json | jq .mcpServers

# ワークフローを確認
ls -la ~/.claude/workflows/

# バージョンを確認
npx zcf check-updates
```

### 20. ログ解析

**ポイント**：実行ログを確認して原因を特定する。

```bash
# 詳細ログを有効化
npx zcf init --verbose 2>&1 | tee zcf.log

# ログを検索
cat zcf.log | grep -i error
```

## 関連リソース

- [CLI コマンド](../cli/) - すべてのコマンド詳細
- [設定管理](../features/multi-config.md) - 複数設定とバックアップ
- [トラブルシューティング](../advanced/troubleshooting.md) - よくある問題の解決
- [Worktree 並列開発](worktree.md) - Git Worktree の使い方

> 💡 **Tip**: ここで紹介したヒントは必要に応じて組み合わせて使えます。まずは基本的なものから試し、徐々に応用編に広げていくことをおすすめします。
