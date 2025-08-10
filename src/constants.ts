import { homedir } from 'node:os';
import { join } from 'pathe';
import type { McpService } from './types';

export const CLAUDE_DIR = join(homedir(), '.claude');
export const SETTINGS_FILE = join(CLAUDE_DIR, 'settings.json');
export const CLAUDE_MD_FILE = join(CLAUDE_DIR, 'CLAUDE.md');
export const ClAUDE_CONFIG_FILE = join(homedir(), '.claude.json');
// Legacy config path (for backward compatibility)
export const LEGACY_ZCF_CONFIG_FILE = join(homedir(), '.zcf.json');
// New config path (unified under .claude directory)
export const ZCF_CONFIG_FILE = join(CLAUDE_DIR, '.zcf-config.json');

export const SUPPORTED_LANGS = ['zh-CN', 'en'] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

export const LANG_LABELS = {
  'zh-CN': '简体中文',
  en: 'English',
} as const;

export const AI_OUTPUT_LANGUAGES = {
  'zh-CN': { label: '简体中文', directive: 'Always respond in Chinese-simplified' },
  en: { label: 'English', directive: 'Always respond in English' },
  custom: { label: 'Custom', directive: '' },
} as const;

export type AiOutputLanguage = keyof typeof AI_OUTPUT_LANGUAGES;

// Re-export I18N for backward compatibility
// This will be deprecated in future versions
import { translations } from './i18n';
export const I18N = translations;

export const MCP_SERVICES: McpService[] = [
  {
    id: 'context7',
    name: { 'zh-CN': 'Context7 文档查询', en: 'Context7 Docs' },
    description: {
      'zh-CN': '查询最新的库文档和代码示例',
      en: 'Query latest library documentation and code examples',
    },
    requiresApiKey: false,
    config: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@upstash/context7-mcp'],
      env: {},
    },
  },
  {
    id: 'mcp-deepwiki',
    name: { 'zh-CN': 'DeepWiki', en: 'DeepWiki' },
    description: {
      'zh-CN': '查询 GitHub 仓库文档和示例',
      en: 'Query GitHub repository documentation and examples',
    },
    requiresApiKey: false,
    config: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', 'mcp-deepwiki@latest'],
      env: {},
    },
  },
  {
    id: 'Playwright',
    name: { 'zh-CN': 'Playwright 浏览器控制', en: 'Playwright Browser Control' },
    description: {
      'zh-CN': '直接控制浏览器进行自动化操作',
      en: 'Direct browser control for automation',
    },
    requiresApiKey: false,
    config: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@playwright/mcp@latest'],
      env: {},
    },
  },
  {
    id: 'exa',
    name: { 'zh-CN': 'Exa AI 搜索', en: 'Exa AI Search' },
    description: {
      'zh-CN': '使用 Exa AI 进行网页搜索',
      en: 'Web search using Exa AI',
    },
    requiresApiKey: true,
    apiKeyPrompt: {
      'zh-CN': '请输入 Exa API Key',
      en: 'Enter Exa API Key',
    },
    apiKeyEnvVar: 'EXA_API_KEY',
    config: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', 'exa-mcp-server'],
      env: {
        EXA_API_KEY: 'YOUR_EXA_API_KEY',
      },
    },
  },
];