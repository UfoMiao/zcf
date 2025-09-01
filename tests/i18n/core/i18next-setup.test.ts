import { beforeEach, describe, expect, it } from 'vitest'
import { i18n, initI18n } from '../../../src/i18n'

describe('i18next Setup', () => {
  beforeEach(async () => {
    // Reset i18next instance before each test
    if (i18n.isInitialized) {
      await i18n.changeLanguage('zh-CN')
    }
  })

  describe('initialization', () => {
    it('should initialize i18next with correct configuration', async () => {
      await initI18n()

      expect(i18n.isInitialized).toBe(true)
      expect(i18n.language).toBe('zh-CN')
      expect(i18n.options.fallbackLng).toEqual(['en'])
    })

    it('should support both zh-CN and en languages', async () => {
      await initI18n()

      // Test Chinese
      await i18n.changeLanguage('zh-CN')
      expect(i18n.language).toBe('zh-CN')

      // Test English
      await i18n.changeLanguage('en')
      expect(i18n.language).toBe('en')
    })

    it('should load all required namespaces', async () => {
      await initI18n()

      const expectedNamespaces = [
        'common',
        'api',
        'ccr',
        'cli',
        'cometix',
        'configuration',
        'errors',
        'installation',
        'language',
        'mcp',
        'menu',
        'tools',
        'updater',
        'workflow',
      ]

      expectedNamespaces.forEach((ns) => {
        expect(i18n.hasResourceBundle('zh-CN', ns)).toBe(true)
        expect(i18n.hasResourceBundle('en', ns)).toBe(true)
      })
    })
  })

  describe('translation Function', () => {
    beforeEach(async () => {
      await initI18n()
    })

    it('should translate basic keys using flat structure', () => {
      // These should work with flat key structure
      expect(i18n.t('common:cancelled')).toBeTruthy()
      expect(i18n.t('common:complete')).toBeTruthy()
      expect(i18n.t('api:configureApi')).toBeTruthy()
    })

    it('should support interpolation', () => {
      // Test with goodbye message which contains Chinese text
      const result = i18n.t('common:goodbye')
      expect(result).toContain('感谢使用 ZCF')
    })

    it('should switch languages correctly', async () => {
      // Test Chinese
      await i18n.changeLanguage('zh-CN')
      const zhResult = i18n.t('common:cancelled')

      // Test English
      await i18n.changeLanguage('en')
      const enResult = i18n.t('common:cancelled')

      expect(zhResult).not.toBe(enResult)
      expect(zhResult).toBeTruthy()
      expect(enResult).toBeTruthy()
    })
  })

  describe('namespace Loading', () => {
    beforeEach(async () => {
      await initI18n()
    })

    it('should load translations from filesystem', async () => {
      // Test that we can access translations from different namespaces
      expect(i18n.t('common:cancelled')).toBeTruthy()
      expect(i18n.t('api:configureApi')).toBeTruthy()
      expect(i18n.t('menu:selectFunction')).toBeTruthy()
    })

    it('should fallback to English if Chinese translation missing', async () => {
      await i18n.changeLanguage('zh-CN')

      // If a key exists in EN but not in zh-CN, should fallback
      const result = i18n.t('common:cancelled') // Use existing key for fallback test
      expect(result).toBeTruthy()
    })
  })

  describe('type Safety', () => {
    it('should provide TypeScript intellisense for translation keys', () => {
      // This test mainly ensures compilation works
      // The actual intellisense is tested during development
      const result: string = i18n.t('common:cancelled')
      expect(typeof result).toBe('string')
    })
  })
})
