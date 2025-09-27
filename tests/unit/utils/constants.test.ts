import { homedir } from 'node:os'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AI_OUTPUT_LANGUAGES,
  ClAUDE_CONFIG_FILE,
  CLAUDE_DIR,
  CLAUDE_MD_FILE,
  CODE_TOOL_TYPES,
  DEFAULT_CODE_TOOL_TYPE,
  getAiOutputLanguageLabel,
  isCodeToolType,
  LANG_LABELS,
  LEGACY_ZCF_CONFIG_FILES,
  SETTINGS_FILE,
  SUPPORTED_LANGS,
  ZCF_CONFIG_DIR,
  ZCF_CONFIG_FILE,
} from '../../../src/constants'

// Mock i18n module
vi.mock('../../../src/i18n', () => ({
  i18n: {
    isInitialized: true,
    t: vi.fn((key: string) => {
      if (key === 'language:labels.custom') {
        return 'Custom Language'
      }
      return key
    }),
  },
}))

describe('constants', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('path constants', () => {
    it('should define correct Claude directory path', () => {
      expect(CLAUDE_DIR).toBe(join(homedir(), '.claude'))
    })

    it('should define correct settings file path', () => {
      expect(SETTINGS_FILE).toBe(join(CLAUDE_DIR, 'settings.json'))
    })

    it('should define correct Claude MD file path', () => {
      expect(CLAUDE_MD_FILE).toBe(join(CLAUDE_DIR, 'CLAUDE.md'))
    })

    it('should define correct Claude config file path', () => {
      expect(ClAUDE_CONFIG_FILE).toBe(join(homedir(), '.claude.json'))
    })

    it('should define correct ZCF config directory path', () => {
      expect(ZCF_CONFIG_DIR).toBe(join(homedir(), '.ufomiao', 'zcf'))
    })

    it('should define correct ZCF config file path', () => {
      expect(ZCF_CONFIG_FILE).toBe(join(ZCF_CONFIG_DIR, 'config.toml'))
    })

    it('should define legacy ZCF config file paths', () => {
      expect(LEGACY_ZCF_CONFIG_FILES).toEqual([
        join(CLAUDE_DIR, '.zcf-config.json'),
        join(homedir(), '.zcf.json'),
      ])
    })
  })

  describe('code tool constants', () => {
    it('should define supported code tool types', () => {
      expect(CODE_TOOL_TYPES).toEqual(['claude-code', 'codex'])
    })

    it('should define default code tool type', () => {
      expect(DEFAULT_CODE_TOOL_TYPE).toBe('claude-code')
    })
  })

  describe('language constants', () => {
    it('should define supported languages', () => {
      expect(SUPPORTED_LANGS).toEqual(['zh-CN', 'en'])
    })

    it('should define language labels', () => {
      expect(LANG_LABELS).toEqual({
        'zh-CN': '简体中文',
        'en': 'English',
      })
    })

    it('should define AI output languages with directives', () => {
      expect(AI_OUTPUT_LANGUAGES).toEqual({
        'zh-CN': { directive: 'Always respond in Chinese-simplified' },
        'en': { directive: 'Always respond in English' },
        'custom': { directive: '' },
      })
    })
  })

  describe('isCodeToolType function', () => {
    it('should return true for valid code tool types', () => {
      expect(isCodeToolType('claude-code')).toBe(true)
      expect(isCodeToolType('codex')).toBe(true)
    })

    it('should return false for invalid code tool types', () => {
      expect(isCodeToolType('invalid')).toBe(false)
      expect(isCodeToolType('')).toBe(false)
      expect(isCodeToolType(null)).toBe(false)
      expect(isCodeToolType(undefined)).toBe(false)
      expect(isCodeToolType(123)).toBe(false)
      expect(isCodeToolType({})).toBe(false)
      expect(isCodeToolType([])).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(isCodeToolType('CLAUDE-CODE')).toBe(false) // case sensitive
      expect(isCodeToolType(' claude-code ')).toBe(false) // whitespace
      expect(isCodeToolType('claude-code-extra')).toBe(false) // partial match
    })
  })

  describe('getAiOutputLanguageLabel function', () => {
    it('should return correct labels for built-in languages', () => {
      expect(getAiOutputLanguageLabel('zh-CN')).toBe('简体中文')
      expect(getAiOutputLanguageLabel('en')).toBe('English')
    })

    it('should return translated label for custom language when i18n is available', () => {
      expect(getAiOutputLanguageLabel('custom')).toBe('Custom Language')
    })

    it('should fallback to key when i18n is not initialized', async () => {
      const { i18n } = vi.mocked(await import('../../../src/i18n'))
      i18n.isInitialized = false

      expect(getAiOutputLanguageLabel('custom')).toBe('custom')
    })

    it('should fallback to key when translation fails', async () => {
      const { i18n } = vi.mocked(await import('../../../src/i18n'))
      i18n.isInitialized = true
      vi.mocked(i18n.t).mockImplementation(() => {
        throw new Error('Translation failed')
      })

      expect(getAiOutputLanguageLabel('custom')).toBe('custom')
    })

    it('should return the language key for unknown languages', () => {
      expect(getAiOutputLanguageLabel('unknown' as any)).toBe('unknown')
      expect(getAiOutputLanguageLabel('fr' as any)).toBe('fr')
    })

    it('should handle edge cases', () => {
      expect(getAiOutputLanguageLabel('' as any)).toBe('')
      // Test with undefined/null should be handled by TypeScript, but in runtime:
      expect(getAiOutputLanguageLabel(undefined as any)).toBe(undefined as any)
    })
  })

  describe('type definitions', () => {
    it('should have correct CodeToolType type from constants', () => {
      const codeToolType: typeof CODE_TOOL_TYPES[number] = 'claude-code'
      expect(codeToolType).toBe('claude-code')
    })

    it('should have correct SupportedLang type from constants', () => {
      const lang: typeof SUPPORTED_LANGS[number] = 'zh-CN'
      expect(lang).toBe('zh-CN')
    })

    it('should have correct AiOutputLanguage type keys', () => {
      const aiLangKeys = Object.keys(AI_OUTPUT_LANGUAGES)
      expect(aiLangKeys).toEqual(['zh-CN', 'en', 'custom'])
    })
  })

  describe('constants structure validation', () => {
    it('should have correct array lengths for constants', () => {
      expect(CODE_TOOL_TYPES).toHaveLength(2)
      expect(SUPPORTED_LANGS).toHaveLength(2)
    })

    it('should have consistent language support across objects', () => {
      // All supported languages should have labels
      SUPPORTED_LANGS.forEach((lang) => {
        expect(LANG_LABELS[lang]).toBeDefined()
        expect(typeof LANG_LABELS[lang]).toBe('string')
      })

      // All supported languages should have AI output configurations
      SUPPORTED_LANGS.forEach((lang) => {
        expect(AI_OUTPUT_LANGUAGES[lang]).toBeDefined()
        expect(typeof AI_OUTPUT_LANGUAGES[lang].directive).toBe('string')
      })
    })

    it('should have valid default code tool type', () => {
      expect(CODE_TOOL_TYPES).toContain(DEFAULT_CODE_TOOL_TYPE)
    })
  })
})
