import { describe, expect, it } from 'vitest'

describe('custom Model i18n Translations', () => {
  const requiredTranslationKeys = [
    'configuration:customModelOption',
    'configuration:enterPrimaryModel',
    'configuration:enterFastModel',
    'configuration:customModelSkipped',
    'configuration:customModelConfigured',
  ]

  it('should have all required Chinese translations', async () => {
    // This test should fail initially (Red phase) - translations don't exist yet
    const zhCNTranslations = await import('../../../src/i18n/locales/zh-CN/configuration.json')

    for (const key of requiredTranslationKeys) {
      const translationKey = key.split(':')[1] // Remove namespace prefix
      expect(zhCNTranslations.default).toHaveProperty(translationKey)
      expect(zhCNTranslations.default[translationKey as keyof typeof zhCNTranslations.default]).toBeTruthy()
    }
  })

  it('should have all required English translations', async () => {
    // This test should fail initially (Red phase) - translations don't exist yet
    const enTranslations = await import('../../../src/i18n/locales/en/configuration.json')

    for (const key of requiredTranslationKeys) {
      const translationKey = key.split(':')[1] // Remove namespace prefix
      expect(enTranslations.default).toHaveProperty(translationKey)
      expect(enTranslations.default[translationKey as keyof typeof enTranslations.default]).toBeTruthy()
    }
  })

  it('should have matching translation counts between languages', async () => {
    const zhCNTranslations = await import('../../../src/i18n/locales/zh-CN/configuration.json')
    const enTranslations = await import('../../../src/i18n/locales/en/configuration.json')

    const zhKeys = Object.keys(zhCNTranslations.default)
    const enKeys = Object.keys(enTranslations.default)

    expect(zhKeys.length).toBe(enKeys.length)
  })
})
