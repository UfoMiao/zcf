import type { DefaultTheme } from 'vitepress'
import { defineConfig } from 'vitepress'

const githubRepo = 'UfoMiao/zcf'
const siteTitle = 'ZCF'
const siteDescription = 'Zero-Config Code Flow Documentation'

interface SidebarDefinitionItem {
  text: string
  link: string
}

interface SidebarDefinitionSection {
  text: string
  items: SidebarDefinitionItem[]
}

function createSidebar(definition: SidebarDefinitionSection[], base: string): DefaultTheme.SidebarItem[] {
  const normalizedBase = base.endsWith('/') ? base : `${base}/`

  return definition.map(section => ({
    text: section.text,
    collapsed: false,
    items: section.items.map((item) => {
      let link = item.link
      if (!link) {
        link = normalizedBase
      }
      else if (link === 'index') {
        link = normalizedBase
      }
      else if (!link.startsWith('/')) {
        link = `${normalizedBase}${link}`
      }
      return {
        text: item.text,
        link,
      }
    }),
  }))
}

const zhSidebar: DefaultTheme.SidebarItem[] = createSidebar([
  {
    text: '🚀 项目介绍',
    items: [
      { text: '项目介绍', link: 'index' },
    ],
  },
  {
    text: '开始使用',
    items: [
      { text: '⚡ 快速开始', link: 'getting-started/' },
      { text: '📖 使用指南', link: 'getting-started/installation' },
    ],
  },
  {
    text: '功能特性',
    items: [
      { text: '📋 功能总览', link: 'features/' },
      { text: '⚙️ Claude Code 配置能力', link: 'features/claude-code' },
      { text: '🔧 Codex 支持', link: 'features/codex' },
      { text: '🔄 工作流系统', link: 'features/workflows' },
      { text: '🔌 MCP 服务集成', link: 'features/mcp' },
      { text: '🌐 Claude Code Router', link: 'features/ccr' },
      { text: '📊 CCometixLine 状态栏', link: 'features/cometix' },
      { text: '💾 多配置与备份', link: 'features/multi-config' },
    ],
  },
  {
    text: '进阶指南',
    items: [
      { text: '📖 进阶指南', link: 'advanced/' },
      { text: '⚙️ 配置管理', link: 'advanced/configuration' },
      { text: '🔑 API 提供商预设', link: 'advanced/api-providers' },
      { text: '🎨 模板与输出风格', link: 'advanced/templates' },
      { text: '🌍 国际化与语言', link: 'advanced/i18n' },
      { text: '🔍 故障排除', link: 'advanced/troubleshooting' },
    ],
  },
  {
    text: 'CLI 命令',
    items: [
      { text: '📋 命令概览', link: 'cli/' },
      { text: '🎯 zcf init', link: 'cli/init' },
      { text: '🔄 zcf update', link: 'cli/update' },
      { text: '📱 主菜单', link: 'cli/menu' },
      { text: '🌐 CCR 代理管理', link: 'cli/ccr' },
      { text: '📊 使用分析 ccu', link: 'cli/ccu' },
      { text: '🗑️ 卸载与清理', link: 'cli/uninstall' },
      { text: '🔄 配置切换', link: 'cli/config-switch' },
      { text: '🔍 版本检查', link: 'cli/check-updates' },
    ],
  },
  {
    text: '工作流详解',
    items: [
      { text: '📋 工作流概览', link: 'workflows/' },
      { text: '🔄 ZCF 六阶段工作流', link: 'workflows/zcf-workflow' },
      { text: '✨ 功能开发工作流', link: 'workflows/feat' },
      { text: '🏃 BMad 敏捷流程', link: 'workflows/bmad' },
      { text: '📝 Spec 工作流集成', link: 'workflows/spec' },
      { text: '🌲 Git 智能命令', link: 'workflows/git-commands' },
    ],
  },
  {
    text: '最佳实践',
    items: [
      { text: '⭐ 最佳实践', link: 'best-practices/' },
      { text: '💡 使用技巧', link: 'best-practices/tips' },
      { text: '🌳 Worktree 并行开发', link: 'best-practices/worktree' },
      { text: '🎨 输出风格策略', link: 'best-practices/output-styles' },
    ],
  },
  {
    text: '开发文档',
    items: [
      { text: '👋 面向贡献者', link: 'development/' },
      { text: '📝 贡献指南', link: 'development/contributing' },
      { text: '🏗️ 架构说明', link: 'development/architecture' },
      { text: '🧪 测试指南', link: 'development/testing' },
    ],
  },
], '/zh-CN')

const enSidebar: DefaultTheme.SidebarItem[] = createSidebar([
  {
    text: '🚀 Project Introduction',
    items: [
      { text: 'Project Introduction', link: 'index' },
    ],
  },
  {
    text: 'Getting Started',
    items: [
      { text: '⚡ Quick Start', link: 'getting-started/' },
      { text: '📖 Installation Guide', link: 'getting-started/installation' },
    ],
  },
  {
    text: 'Features',
    items: [
      { text: '📋 Features Overview', link: 'features/' },
      { text: '⚙️ Claude Code Configuration', link: 'features/claude-code' },
      { text: '🔧 Codex Support', link: 'features/codex' },
      { text: '🔄 Workflow System', link: 'features/workflows' },
      { text: '🔌 MCP Service Integration', link: 'features/mcp' },
      { text: '🌐 Claude Code Router', link: 'features/ccr' },
      { text: '📊 CCometixLine Status Bar', link: 'features/cometix' },
      { text: '💾 Multi-Config and Backup', link: 'features/multi-config' },
    ],
  },
  {
    text: 'Advanced Guides',
    items: [
      { text: '📖 Advanced Guides', link: 'advanced/' },
      { text: '⚙️ Configuration Management', link: 'advanced/configuration' },
      { text: '🔑 API Provider Presets', link: 'advanced/api-providers' },
      { text: '🎨 Templates and Output Styles', link: 'advanced/templates' },
      { text: '🌍 Internationalization and Language', link: 'advanced/i18n' },
      { text: '🔍 Troubleshooting', link: 'advanced/troubleshooting' },
    ],
  },
  {
    text: 'CLI Commands',
    items: [
      { text: '📋 Commands Overview', link: 'cli/' },
      { text: '🎯 zcf init', link: 'cli/init' },
      { text: '🔄 zcf update', link: 'cli/update' },
      { text: '📱 Main Menu', link: 'cli/menu' },
      { text: '🌐 CCR Proxy Management', link: 'cli/ccr' },
      { text: '📊 Usage Analysis ccu', link: 'cli/ccu' },
      { text: '🗑️ Uninstall and Cleanup', link: 'cli/uninstall' },
      { text: '🔄 Config Switch', link: 'cli/config-switch' },
      { text: '🔍 Version Check', link: 'cli/check-updates' },
    ],
  },
  {
    text: 'Workflow Details',
    items: [
      { text: '📋 Workflow Overview', link: 'workflows/' },
      { text: '🔄 ZCF Six-Stage Workflow', link: 'workflows/zcf-workflow' },
      { text: '✨ Feature Development Workflow', link: 'workflows/feat' },
      { text: '🏃 BMad Agile Process', link: 'workflows/bmad' },
      { text: '📝 Spec Workflow Integration', link: 'workflows/spec' },
      { text: '🌲 Git Smart Commands', link: 'workflows/git-commands' },
    ],
  },
  {
    text: 'Best Practices',
    items: [
      { text: '⭐ Best Practices', link: 'best-practices/' },
      { text: '💡 Usage Tips', link: 'best-practices/tips' },
      { text: '🌳 Worktree Parallel Development', link: 'best-practices/worktree' },
      { text: '🎨 Output Style Strategy', link: 'best-practices/output-styles' },
    ],
  },
  {
    text: 'Development Documentation',
    items: [
      { text: '👋 For Contributors', link: 'development/' },
      { text: '📝 Contributing Guide', link: 'development/contributing' },
      { text: '🏗️ Architecture Documentation', link: 'development/architecture' },
      { text: '🧪 Testing Guide', link: 'development/testing' },
    ],
  },
], '/en')

const jaSidebar: DefaultTheme.SidebarItem[] = createSidebar([
  {
    text: '🚀 プロジェクト紹介',
    items: [
      { text: 'プロジェクト紹介', link: 'index' },
    ],
  },
  {
    text: 'はじめに',
    items: [
      { text: '⚡ クイックスタート', link: 'getting-started/' },
      { text: '📖 使用ガイド', link: 'getting-started/installation' },
    ],
  },
  {
    text: '機能特性',
    items: [
      { text: '📋 機能概要', link: 'features/' },
      { text: '⚙️ Claude Code 設定機能', link: 'features/claude-code' },
      { text: '🔧 Codex サポート', link: 'features/codex' },
      { text: '🔄 ワークフローシステム', link: 'features/workflows' },
      { text: '🔌 MCP サービス統合', link: 'features/mcp' },
      { text: '🌐 Claude Code Router', link: 'features/ccr' },
      { text: '📊 CCometixLine ステータスバー', link: 'features/cometix' },
      { text: '💾 マルチ設定とバックアップ', link: 'features/multi-config' },
    ],
  },
  {
    text: '上級ガイド',
    items: [
      { text: '📖 上級ガイド', link: 'advanced/' },
      { text: '⚙️ 設定管理', link: 'advanced/configuration' },
      { text: '🔑 API プロバイダープリセット', link: 'advanced/api-providers' },
      { text: '🎨 テンプレートと出力スタイル', link: 'advanced/templates' },
      { text: '🌍 国際化と言語', link: 'advanced/i18n' },
      { text: '🔍 トラブルシューティング', link: 'advanced/troubleshooting' },
    ],
  },
  {
    text: 'CLI コマンド',
    items: [
      { text: '📋 コマンド概要', link: 'cli/' },
      { text: '🎯 zcf init', link: 'cli/init' },
      { text: '🔄 zcf update', link: 'cli/update' },
      { text: '📱 メインメニュー', link: 'cli/menu' },
      { text: '🌐 CCR プロキシ管理', link: 'cli/ccr' },
      { text: '📊 使用分析 ccu', link: 'cli/ccu' },
      { text: '🗑️ アンインストールとクリーンアップ', link: 'cli/uninstall' },
      { text: '🔄 設定切り替え', link: 'cli/config-switch' },
      { text: '🔍 バージョンチェック', link: 'cli/check-updates' },
    ],
  },
  {
    text: 'ワークフロー詳細',
    items: [
      { text: '📋 ワークフロー概要', link: 'workflows/' },
      { text: '🔄 ZCF 6段階ワークフロー', link: 'workflows/zcf-workflow' },
      { text: '✨ 機能開発ワークフロー', link: 'workflows/feat' },
      { text: '🏃 BMad アジャイルプロセス', link: 'workflows/bmad' },
      { text: '📝 Spec ワークフロー統合', link: 'workflows/spec' },
      { text: '🌲 Git スマートコマンド', link: 'workflows/git-commands' },
    ],
  },
  {
    text: 'ベストプラクティス',
    items: [
      { text: '⭐ ベストプラクティス', link: 'best-practices/' },
      { text: '💡 使用のヒント', link: 'best-practices/tips' },
      { text: '🌳 Worktree 並列開発', link: 'best-practices/worktree' },
      { text: '🎨 出力スタイル戦略', link: 'best-practices/output-styles' },
    ],
  },
  {
    text: '開発ドキュメント',
    items: [
      { text: '👋 貢献者向け', link: 'development/' },
      { text: '📝 貢献ガイド', link: 'development/contributing' },
      { text: '🏗️ アーキテクチャドキュメント', link: 'development/architecture' },
      { text: '🧪 テストガイド', link: 'development/testing' },
    ],
  },
], '/ja-JP')

export default defineConfig({
  title: siteTitle,
  description: siteDescription,
  srcDir: '.',
  lang: 'en-US',
  lastUpdated: true,
  cleanUrls: true,

  themeConfig: {
    search: {
      provider: 'local',
    },
    socialLinks: [
      { icon: 'github', link: `https://github.com/${githubRepo}` },
    ],
    editLink: {
      pattern: `https://github.com/${githubRepo}/edit/main/docs/:path`,
      text: 'Edit this page on GitHub',
    },
    nav: [
      { text: 'Home', link: '/en/' },
      { text: 'Getting Started', link: '/en/getting-started/' },
      { text: 'Features', link: '/en/features/' },
      { text: 'CLI', link: '/en/cli/' },
      { text: 'Workflows', link: '/en/workflows/' },
      { text: 'Best Practices', link: '/en/best-practices/' },
    ],
    sidebar: {
      '/en/': enSidebar,
    },
    footer: {
      message: 'MIT Licensed',
      copyright: 'Copyright © 2023-PRESENT ZCF',
    },
  },
  locales: {
    'root': {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
    },
    'zh-CN': {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh-CN/',
      themeConfig: {
        editLink: {
          pattern: `https://github.com/${githubRepo}/edit/main/docs/:path`,
          text: '在 GitHub 上编辑此页',
        },
        nav: [
          { text: '首页', link: '/zh-CN/' },
          { text: '快速开始', link: '/zh-CN/getting-started/' },
          { text: '功能特性', link: '/zh-CN/features/' },
          { text: 'CLI 命令', link: '/zh-CN/cli/' },
          { text: '工作流', link: '/zh-CN/workflows/' },
          { text: '最佳实践', link: '/zh-CN/best-practices/' },
        ],
        sidebar: {
          '/zh-CN/': zhSidebar,
        },
        footer: {
          message: 'MIT 许可协议',
          copyright: 'Copyright © 2023-PRESENT ZCF',
        },
      },
    },
    'ja-JP': {
      label: '日本語',
      lang: 'ja-JP',
      link: '/ja-JP/',
      themeConfig: {
        editLink: {
          pattern: `https://github.com/${githubRepo}/edit/main/docs/:path`,
          text: 'GitHubでこのページを編集',
        },
        nav: [
          { text: 'ホーム', link: '/ja-JP/' },
          { text: 'はじめに', link: '/ja-JP/getting-started/' },
          { text: '機能特性', link: '/ja-JP/features/' },
          { text: 'CLI', link: '/ja-JP/cli/' },
          { text: 'ワークフロー', link: '/ja-JP/workflows/' },
          { text: 'ベストプラクティス', link: '/ja-JP/best-practices/' },
        ],
        sidebar: {
          '/ja-JP/': jaSidebar,
        },
        footer: {
          message: 'MIT ライセンス',
          copyright: 'Copyright © 2023-PRESENT ZCF',
        },
      },
    },
  },
})
