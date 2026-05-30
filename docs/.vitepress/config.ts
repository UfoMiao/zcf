import type { DefaultTheme } from 'vitepress'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vitepress'

const githubRepo = 'xwm111/ccs'
const siteTitle = 'ccs'
const siteDescription = 'Claude Code Switch Documentation'

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
    text: '项目介绍',
    items: [
      { text: '项目介绍', link: 'index' },
    ],
  },
  {
    text: '开始使用',
    items: [
      { text: '快速开始', link: 'getting-started/' },
      { text: '使用指南', link: 'getting-started/installation' },
    ],
  },
  {
    text: '功能特性',
    items: [
      { text: '功能总览', link: 'features/' },
    ],
  },
  {
    text: 'CLI 命令',
    items: [
      { text: '命令概览', link: 'cli/' },
      { text: '主菜单', link: 'cli/menu' },
      { text: '配置切换', link: 'cli/config-switch' },
      { text: '版本检查', link: 'cli/check-updates' },
      { text: '卸载与清理', link: 'cli/uninstall' },
    ],
  },
], '/zh-CN')

const enSidebar: DefaultTheme.SidebarItem[] = createSidebar([
  {
    text: 'Project Introduction',
    items: [
      { text: 'Project Introduction', link: 'index' },
    ],
  },
  {
    text: 'Getting Started',
    items: [
      { text: 'Quick Start', link: 'getting-started/' },
      { text: 'Installation Guide', link: 'getting-started/installation' },
    ],
  },
  {
    text: 'Features',
    items: [
      { text: 'Features Overview', link: 'features/' },
    ],
  },
  {
    text: 'CLI Commands',
    items: [
      { text: 'Commands Overview', link: 'cli/' },
      { text: 'Main Menu', link: 'cli/menu' },
      { text: 'Config Switch', link: 'cli/config-switch' },
      { text: 'Version Check', link: 'cli/check-updates' },
      { text: 'Uninstall and Cleanup', link: 'cli/uninstall' },
    ],
  },
], '/en')

const jaSidebar: DefaultTheme.SidebarItem[] = createSidebar([
  {
    text: 'プロジェクト紹介',
    items: [
      { text: 'プロジェクト紹介', link: 'index' },
    ],
  },
  {
    text: 'はじめに',
    items: [
      { text: 'クイックスタート', link: 'getting-started/' },
      { text: '使用ガイド', link: 'getting-started/installation' },
    ],
  },
  {
    text: '機能特性',
    items: [
      { text: '機能概要', link: 'features/' },
    ],
  },
  {
    text: 'CLI コマンド',
    items: [
      { text: 'コマンド概要', link: 'cli/' },
      { text: 'メインメニュー', link: 'cli/menu' },
      { text: '設定切り替え', link: 'cli/config-switch' },
      { text: 'バージョンチェック', link: 'cli/check-updates' },
      { text: 'アンインストールとクリーンアップ', link: 'cli/uninstall' },
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
  head: [
    ['link', { rel: 'icon', type: 'image/x-icon', href: '/assets/favicon.ico' }],
  ],

  vite: {
    plugins: [
      UnoCSS(),
    ],
  },

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
    ],
    sidebar: {
      '/en/': enSidebar,
    },
    footer: {
      message: 'MIT Licensed',
      copyright: 'Copyright © 2023-PRESENT ccs',
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
        ],
        sidebar: {
          '/zh-CN/': zhSidebar,
        },
        footer: {
          message: 'MIT 许可协议',
          copyright: 'Copyright © 2023-PRESENT ccs',
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
        ],
        sidebar: {
          '/ja-JP/': jaSidebar,
        },
        footer: {
          message: 'MIT ライセンス',
          copyright: 'Copyright © 2023-PRESENT ccs',
        },
      },
    },
  },
})
