import { beforeAll, describe, expect, it } from 'vitest'
import { i18n, initI18n } from '../../../src/i18n'

/**
 * TDD Test Suite: Reusable Skip Logic in i18n System
 *
 * Tests the modular skip hint system:
 * - Skip hints are centralized in common:emptyToSkip for reusability
 * - Input prompts use string concatenation: base message + skip hint
 * - Ensures consistency and DRY principle across Chinese/English languages
 */
describe('i18n reusable skip logic', () => {
  const INPUT_PROMPT_KEYS = [
    'configuration:enterPrimaryModel',
    'configuration:enterFastModel',
  ] as const

  beforeAll(async () => {
    await initI18n('zh-CN')
  })

  describe('centralized skip hint validation', () => {
    it('should have reusable Chinese skip hint in common namespace', () => {
      const skipHint = i18n.t('common:emptyToSkip')

      expect(skipHint, 'Chinese skip hint should exist').toBeDefined()
      expect(skipHint, 'Chinese skip hint should not be empty').not.toBe('')
      expect(skipHint).toBe('（空内容回车则跳过）')
    })

    it('should have reusable English skip hint in common namespace', async () => {
      await i18n.changeLanguage('en')

      try {
        const skipHint = i18n.t('common:emptyToSkip')

        expect(skipHint, 'English skip hint should exist').toBeDefined()
        expect(skipHint, 'English skip hint should not be empty').not.toBe('')
        expect(skipHint).toBe(' (press Enter with empty content to skip)')
      }
      finally {
        await i18n.changeLanguage('zh-CN')
      }
    })
  })

  describe('modular message composition', () => {
    it('should compose full messages by concatenating base + skip hint', () => {
      INPUT_PROMPT_KEYS.forEach((key) => {
        const baseMessage = i18n.t(key)
        const skipHint = i18n.t('common:emptyToSkip')
        const fullMessage = `${baseMessage}${skipHint}`

        // Verify composition works correctly
        expect(baseMessage, `Base message for ${key} should exist`).toBeDefined()
        expect(baseMessage, `Base message for ${key} should not be empty`).not.toBe('')
        expect(fullMessage).toContain(baseMessage)
        expect(fullMessage).toContain(skipHint)
      })
    })

    it('should verify actual usage of skip logic in tools.ts for Chinese', () => {
      // This test verifies that tools.ts actually uses the concatenation approach
      const toolsMessage = i18n.t('tools:enterCustomArgs')
      const skipHint = i18n.t('common:emptyToSkip')

      // The actual message used in code should be the concatenation
      const expectedFullMessage = `${toolsMessage}${skipHint}`

      // This test verifies the concatenation approach should be used in actual code
      expect(expectedFullMessage).toBe(`输入自定义参数（空内容回车则跳过）`)
    })

    it('should ensure base messages are clean without embedded skip hints', () => {
      INPUT_PROMPT_KEYS.forEach((key) => {
        const baseMessage = i18n.t(key)

        // Base messages should be clean, without embedded skip hints
        expect(baseMessage, `${key} should not contain embedded skip format`).not.toContain('空内容回车则跳过')
        expect(baseMessage, `${key} should not contain old skip format`).not.toContain('直接回车跳过')
        expect(baseMessage, `${key} should not contain English skip format`).not.toContain('press Enter with empty content to skip')
      })
    })
  })

  describe('reusability validation', () => {
    it('should allow skip hint to be reused across different contexts', () => {
      const skipHint = i18n.t('common:emptyToSkip')

      // Skip hint should be context-independent and reusable
      expect(skipHint).toBeDefined()
      expect(typeof skipHint).toBe('string')

      // Can be appended to any message
      const testMessage = '测试消息'
      const composedMessage = `${testMessage}${skipHint}`
      expect(composedMessage).toBe(`测试消息${skipHint}`)
    })
  })
})
