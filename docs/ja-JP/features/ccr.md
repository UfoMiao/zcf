---
title: Claude Code Router (CCR)
---

# Claude Code Router (CCR)

[CCR](https://github.com/musistudio/claude-code-router/blob/main/README_zh.md) (Claude Code Router) は、複数の AI モデルへのインテリジェントなルーティングとコスト最適化を実現する強力なプロキシルーターです。ZCF には完全な CCR 管理機能が組み込まれており、高可用性の Claude Code プロキシシステムを迅速に構築できます。

## CCR とは

CCR は、単一モデルの高コストや低可用性の問題を解決するために設計された強力なプロキシルーターです。中間層として機能し、Claude Code のリクエストを異なるモデルプロバイダーにインテリジェントに転送します。

## 主な利点

### 🎯 インテリジェントなモデルルーティング

タスクの種類に基づいて最適なモデルを自動選択：

- **単純なタスク** → 無料モデルを使用（Gemini、DeepSeek）
- **複雑なタスク** → 高性能モデルを使用（Claude Opus、GPT-4）
- **高速なタスク** → 高速モデルを使用（Claude Haiku、GPT-3.5）
- **思考タスク** → 推論モデルを使用（DeepSeek R1）

### 💰 コスト最適化

インテリジェントなルーティングにより、タスクごとに最も経済的なモデルを選択し、API コストを 50-80% 削減できる可能性があります。

### 🌐 マルチプロバイダーサポート

特定のベンダーへのロックインを避けるため、多様なモデルプロバイダーをサポート：

- **OpenRouter**：統一 AI モデルインターフェース
- **DeepSeek**：DeepSeek シリーズモデル
- **Ollama**：ローカルデプロイモデル
- **Gemini**：Google Gemini シリーズモデル
- **Volcengine**：Volcengine AI サービス
- **SiliconFlow**：SiliconFlow AI プラットフォーム

### 📊 ビジュアル管理

Web UI を内蔵し、直感的な設定インターフェースと詳細な使用統計を提供します。

- **リアルタイム監視**：リクエストトラフィックと応答時間を表示
- **コスト分析**：詳細なコスト統計レポート
- **グラフィカル設定**：JSON を手動編集せずにルーティングルールを調整

## 使用ガイド

CCR のインストール、設定、サービス管理、Web UI の使用はすべて CLI コマンドを通じて行います。

詳細な操作ガイドについては、CLI ドキュメントを参照してください：

👉 **[CCR プロキシ管理コマンド](../cli/ccr.md)**

## もっと詳しく

- [Claude Code 設定](claude-code.md) - Claude Code と CCR の統合について学ぶ
- [CCR 公式ドキュメント](https://github.com/musistudio/claude-code-router/blob/main/README_zh.md) - CCR の詳細ドキュメントを見る
