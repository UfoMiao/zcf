import { homedir } from 'node:os'
import { join } from 'pathe'

export const CLAUDE_DIR = join(homedir(), '.claude')
export const SETTINGS_FILE = join(CLAUDE_DIR, 'settings.json')
export const CLAUDE_MD_FILE = join(CLAUDE_DIR, 'CLAUDE.md')
export const ClAUDE_CONFIG_FILE = join(homedir(), '.claude.json')
// Legacy config path (for backward compatibility)
export const LEGACY_ZCF_CONFIG_FILE = join(homedir(), '.zcf.json')
// New config path (unified under .claude directory)
export const ZCF_CONFIG_FILE = join(CLAUDE_DIR, '.zcf-config.json')

export const SUPPORTED_LANGS = ['zh-CN', 'en'] as const
export type SupportedLang = (typeof SUPPORTED_LANGS)[number]

// Dynamic language labels using i18n
// This will be replaced with a function that uses i18n to get labels
export const LANG_LABELS = {
  'zh-CN': '简体中文',
  'en': 'English',
} as const

// AI output languages - labels are now retrieved via helper function
export const AI_OUTPUT_LANGUAGES = {
  'zh-CN': { directive: 'Always respond in Chinese-simplified' },
  'en': { directive: 'Always respond in English' },
  'custom': { directive: '' },
} as const

export type AiOutputLanguage = keyof typeof AI_OUTPUT_LANGUAGES

// Helper functions to get dynamic language labels using i18n
// Import will be resolved at runtime when i18n is available
let _i18n: any = null

function getI18nInstance() {
  if (!_i18n) {
    try {
      // Dynamic import to avoid circular dependency
      // eslint-disable-next-line no-eval
      const i18nModule = eval('require("./i18n")')
      _i18n = i18nModule.i18n
    }
    catch {
      // Fallback when i18n is not available
    }
  }
  return _i18n
}

export function getAiOutputLanguageLabel(lang: AiOutputLanguage): string {
  // For built-in languages, use LANG_LABELS
  if (lang in LANG_LABELS) {
    return LANG_LABELS[lang as SupportedLang]
  }

  // For 'custom', use i18n if available
  const i18n = getI18nInstance()
  if (lang === 'custom' && i18n?.isInitialized) {
    try {
      return i18n.t('language:labels.custom')
    }
    catch {
      // Fallback if translation fails
    }
  }

  return lang
}
