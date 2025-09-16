import type { Mock } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Import after mocking
import { withLanguageResolution } from '../../src/cli-setup'

// Mock all dependencies with factory functions to avoid hoisting issues
vi.mock('../../src/i18n', () => ({
  i18n: {
    isInitialized: true,
    language: 'en',
  },
  changeLanguage: vi.fn(),
  initI18n: vi.fn(),
}))

vi.mock('../../src/utils/zcf-config', () => ({
  readZcfConfigAsync: vi.fn(),
}))

vi.mock('../../src/utils/prompts', () => ({
  selectScriptLanguage: vi.fn(),
}))

describe('withLanguageResolution', () => {
  let mockAction: Mock
  let mockReadZcfConfigAsync: Mock
  let mockSelectScriptLanguage: Mock
  let mockChangeLanguage: Mock

  beforeEach(async () => {
    mockAction = vi.fn()

    // Get references to the mocked functions
    const zcfConfigModule = await import('../../src/utils/zcf-config')
    const promptsModule = await import('../../src/utils/prompts')
    const i18nModule = await import('../../src/i18n')

    mockReadZcfConfigAsync = vi.mocked(zcfConfigModule.readZcfConfigAsync)
    mockSelectScriptLanguage = vi.mocked(promptsModule.selectScriptLanguage)
    mockChangeLanguage = vi.mocked(i18nModule.changeLanguage)

    vi.clearAllMocks()
  })

  describe('language parameter extraction', () => {
    it('should extract lang and allLang from options', async () => {
      // Arrange
      mockReadZcfConfigAsync.mockResolvedValue({ preferredLang: 'en', codeToolType: 'claude-code' } as any)
      const wrappedAction = await withLanguageResolution(mockAction)
      const options = { lang: 'zh-CN', allLang: 'zh-CN', skipPrompt: true }

      // Act
      await wrappedAction(options)

      // Assert
      expect(mockAction).toHaveBeenCalledWith(options)
      expect(mockChangeLanguage).toHaveBeenCalledWith('zh-CN')
    })

    it('should handle empty options gracefully', async () => {
      // Arrange
      mockReadZcfConfigAsync.mockResolvedValue({ preferredLang: 'en', codeToolType: 'claude-code' } as any)
      const wrappedAction = await withLanguageResolution(mockAction, true)

      // Act
      await wrappedAction(null)

      // Assert
      expect(mockAction).toHaveBeenCalledWith(null)
      expect(mockChangeLanguage).not.toHaveBeenCalled()
    })

    it('should handle undefined options', async () => {
      // Arrange
      mockReadZcfConfigAsync.mockResolvedValue({ preferredLang: 'en', codeToolType: 'claude-code' } as any)
      const wrappedAction = await withLanguageResolution(mockAction, true)

      // Act
      await wrappedAction(undefined)

      // Assert
      expect(mockAction).toHaveBeenCalledWith(undefined)
      expect(mockChangeLanguage).not.toHaveBeenCalled()
    })
  })

  describe('language priority logic', () => {
    it('should prioritize allLang over lang', async () => {
      // Arrange
      mockReadZcfConfigAsync.mockResolvedValue({ preferredLang: 'en', codeToolType: 'claude-code' } as any)
      const wrappedAction = await withLanguageResolution(mockAction)
      const options = { lang: 'en', allLang: 'zh-CN', skipPrompt: true }

      // Act
      await wrappedAction(options)

      // Assert
      expect(mockChangeLanguage).toHaveBeenCalledWith('zh-CN')
    })

    it('should prioritize lang over preferredLang', async () => {
      // Arrange
      mockReadZcfConfigAsync.mockResolvedValue({ preferredLang: 'en', codeToolType: 'claude-code' } as any)
      const wrappedAction = await withLanguageResolution(mockAction)
      const options = { lang: 'zh-CN', skipPrompt: true }

      // Act
      await wrappedAction(options)

      // Assert
      expect(mockChangeLanguage).toHaveBeenCalledWith('zh-CN')
    })

    it('should use preferredLang when no command line params provided', async () => {
      // Arrange
      mockReadZcfConfigAsync.mockResolvedValue({ preferredLang: 'zh-CN', codeToolType: 'claude-code' } as any)
      const wrappedAction = await withLanguageResolution(mockAction)
      const options = { skipPrompt: true }

      // Act
      await wrappedAction(options)

      // Assert
      expect(mockChangeLanguage).toHaveBeenCalledWith('zh-CN')
    })
  })

  describe('skipPrompt handling', () => {
    it('should respect skipPrompt from wrapper parameter', async () => {
      // Arrange
      mockReadZcfConfigAsync.mockResolvedValue({})
      const wrappedAction = await withLanguageResolution(mockAction, true) // skipPrompt = true

      // Act
      await wrappedAction({})

      // Assert
      expect(mockSelectScriptLanguage).not.toHaveBeenCalled()
      expect(mockChangeLanguage).not.toHaveBeenCalled() // Should use 'en' default
    })

    it('should respect skipPrompt from options', async () => {
      // Arrange
      mockReadZcfConfigAsync.mockResolvedValue({})
      const wrappedAction = await withLanguageResolution(mockAction)
      const options = { skipPrompt: true }

      // Act
      await wrappedAction(options)

      // Assert
      expect(mockSelectScriptLanguage).not.toHaveBeenCalled()
      expect(mockChangeLanguage).not.toHaveBeenCalled() // Should use 'en' default
    })

    it('should prompt when skipPrompt is false', async () => {
      // Arrange
      mockReadZcfConfigAsync.mockResolvedValue({})
      mockSelectScriptLanguage.mockResolvedValue('zh-CN')
      const wrappedAction = await withLanguageResolution(mockAction, false)
      const options = { skipPrompt: false }

      // Act
      await wrappedAction(options)

      // Assert
      expect(mockSelectScriptLanguage).toHaveBeenCalled()
      expect(mockChangeLanguage).toHaveBeenCalledWith('zh-CN')
    })
  })

  describe('action execution', () => {
    it('should call the original action with correct arguments', async () => {
      // Arrange
      mockReadZcfConfigAsync.mockResolvedValue({ preferredLang: 'en', codeToolType: 'claude-code' } as any)
      const wrappedAction = await withLanguageResolution(mockAction)
      const arg1 = { lang: 'zh-CN' }
      const arg2 = 'test'
      const arg3 = 123

      // Act
      await wrappedAction(arg1, arg2, arg3)

      // Assert
      expect(mockAction).toHaveBeenCalledWith(arg1, arg2, arg3)
    })

    it('should preserve action return value', async () => {
      // Arrange
      mockReadZcfConfigAsync.mockResolvedValue({ preferredLang: 'en', codeToolType: 'claude-code' } as any)
      const wrappedAction = await withLanguageResolution(mockAction)

      // Act & Assert
      const result = await wrappedAction({})
      expect(result).toBeUndefined() // mockAction returns undefined
    })

    it('should handle action errors properly', async () => {
      // Arrange
      mockReadZcfConfigAsync.mockResolvedValue({ preferredLang: 'en', codeToolType: 'claude-code' } as any)
      const error = new Error('Action failed')
      mockAction.mockRejectedValue(error)
      const wrappedAction = await withLanguageResolution(mockAction)

      // Act & Assert
      await expect(wrappedAction({})).rejects.toThrow('Action failed')
    })
  })

  describe('edge cases', () => {
    it('should handle config read errors', async () => {
      // Arrange
      mockReadZcfConfigAsync.mockRejectedValue(new Error('Config read failed'))
      const wrappedAction = await withLanguageResolution(mockAction, true)

      // Act & Assert
      await expect(wrappedAction({})).rejects.toThrow('Config read failed')
    })

    it('should handle language change errors', async () => {
      // Arrange
      mockReadZcfConfigAsync.mockResolvedValue({ preferredLang: 'zh-CN', codeToolType: 'claude-code' } as any)
      mockChangeLanguage.mockRejectedValue(new Error('Language change failed'))
      const wrappedAction = await withLanguageResolution(mockAction)

      // Act & Assert
      await expect(wrappedAction({ skipPrompt: true })).rejects.toThrow('Language change failed')
    })
  })
})
