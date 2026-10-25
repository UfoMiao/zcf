import type { DefaultTheme } from 'vitepress'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vitepress'

const githubRepo = 'UfoMiao/zcf'
const siteTitle = 'ZCF'
const siteDescription = 'One config for all your AI coding tools'

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
    text: '开始',
    items: [
      { text: '项目介绍', link: 'index' },
      { text: '快速开始', link: 'guide/' },
      { text: '从 v3 迁移', link: 'guide/v3' },
    ],
  },
  {
    text: '使用',
    items: [
      { text: '配置文件', link: 'guide/config' },
      { text: '命令', link: 'guide/commands' },
      { text: '终端与网页界面', link: 'guide/ui' },
      { text: '供应商预设', link: 'guide/providers' },
      { text: '镜像', link: 'guide/mirrors' },
    ],
  },
  {
    text: '参考',
    items: [
      { text: 'Agent 工具', link: 'guide/tools' },
      { text: '备份与故障排除', link: 'guide/troubleshooting' },
      { text: '参与贡献', link: 'guide/contributing' },
    ],
  },
], '/zh-CN')

const enSidebar: DefaultTheme.SidebarItem[] = createSidebar([
  {
    text: 'Start',
    items: [
      { text: 'Introduction', link: 'index' },
      { text: 'Getting started', link: 'guide/' },
      { text: 'Coming from v3', link: 'guide/v3' },
    ],
  },
  {
    text: 'Use',
    items: [
      { text: 'Config file', link: 'guide/config' },
      { text: 'Commands', link: 'guide/commands' },
      { text: 'Terminal and web UI', link: 'guide/ui' },
      { text: 'Provider presets', link: 'guide/providers' },
      { text: 'Mirrors', link: 'guide/mirrors' },
    ],
  },
  {
    text: 'Reference',
    items: [
      { text: 'Agent tools', link: 'guide/tools' },
      { text: 'Backups and troubleshooting', link: 'guide/troubleshooting' },
      { text: 'Contributing', link: 'guide/contributing' },
    ],
  },
], '/en')

const jaSidebar: DefaultTheme.SidebarItem[] = createSidebar([
  {
    text: '導入',
    items: [
      { text: 'プロジェクト紹介', link: 'index' },
      { text: 'はじめに', link: 'guide/' },
      { text: 'v3 からの移行', link: 'guide/v3' },
    ],
  },
  {
    text: '使う',
    items: [
      { text: '設定ファイル', link: 'guide/config' },
      { text: 'コマンド', link: 'guide/commands' },
      { text: 'ターミナル UI と Web UI', link: 'guide/ui' },
      { text: 'プロバイダープリセット', link: 'guide/providers' },
      { text: 'ミラー', link: 'guide/mirrors' },
    ],
  },
  {
    text: 'リファレンス',
    items: [
      { text: 'エージェントツール', link: 'guide/tools' },
      { text: 'バックアップとトラブルシューティング', link: 'guide/troubleshooting' },
      { text: '貢献ガイド', link: 'guide/contributing' },
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
      { text: 'Getting started', link: '/en/guide/' },
      { text: 'Config', link: '/en/guide/config' },
      { text: 'Commands', link: '/en/guide/commands' },
      { text: 'Agent tools', link: '/en/guide/tools' },
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
          { text: '快速开始', link: '/zh-CN/guide/' },
          { text: '配置', link: '/zh-CN/guide/config' },
          { text: '命令', link: '/zh-CN/guide/commands' },
          { text: 'Agent 工具', link: '/zh-CN/guide/tools' },
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
          { text: 'はじめに', link: '/ja-JP/guide/' },
          { text: '設定', link: '/ja-JP/guide/config' },
          { text: 'コマンド', link: '/ja-JP/guide/commands' },
          { text: 'エージェントツール', link: '/ja-JP/guide/tools' },
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
