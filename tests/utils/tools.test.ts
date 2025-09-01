import inquirer from 'inquirer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { executeCcusage } from '../../src/commands/ccu'
import { getValidLanguage, runCcrMenuFeature, runCcusageFeature, runCometixMenuFeature } from '../../src/utils/tools'

// Mock external dependencies
vi.mock('inquirer')
vi.mock('ansis', () => ({
  default: {
    cyan: vi.fn((text: string) => text),
    gray: vi.fn((text: string) => text),
  },
}))
vi.mock('../../src/commands/ccu')
vi.mock('../../src/utils/cometix/menu')
vi.mock('../../src/utils/tools/ccr-menu')
vi.mock('../../src/utils/prompt-helpers', () => ({
  addNumbersToChoices: vi.fn(choices => choices),
}))
// Use real i18n system for better integration testing
vi.mock('../../src/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/i18n')>()
  return {
    ...actual,
    // Only mock initialization functions to avoid setup issues in tests
    ensureI18nInitialized: vi.fn(),
  }
})
vi.mock('../../src/constants', () => ({
  I18N: {
    'zh-CN': {},
    'en': {},
  },
}))

const mockInquirer = vi.mocked(inquirer)
const mockExecuteCcusage = vi.mocked(executeCcusage)

describe('tools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getValidLanguage', () => {
    it('should return valid language when provided', () => {
      expect(getValidLanguage('zh-CN')).toBe('zh-CN')
      expect(getValidLanguage('en')).toBe('en')
    })

    it('should return "en" as default for invalid language', () => {
      expect(getValidLanguage('fr')).toBe('en')
      expect(getValidLanguage(null)).toBe('en')
      expect(getValidLanguage(undefined)).toBe('en')
      expect(getValidLanguage('')).toBe('en')
    })
  })

  describe('runCcusageFeature', () => {
    it('should handle daily mode selection', async () => {
      // Arrange
      mockInquirer.prompt
        .mockResolvedValueOnce({ mode: 'daily' })
        .mockResolvedValueOnce({ continue: '' })

      // Act
      await runCcusageFeature()

      // Assert
      expect(mockExecuteCcusage).toHaveBeenCalledWith(['daily'])
      expect(mockInquirer.prompt).toHaveBeenCalledTimes(2)
    })

    it('should handle back selection', async () => {
      // Arrange
      mockInquirer.prompt.mockResolvedValueOnce({ mode: 'back' })

      // Act
      await runCcusageFeature()

      // Assert
      expect(mockExecuteCcusage).not.toHaveBeenCalled()
      expect(mockInquirer.prompt).toHaveBeenCalledTimes(1)
    })

    it('should handle custom mode with arguments', async () => {
      // Arrange
      mockInquirer.prompt
        .mockResolvedValueOnce({ mode: 'custom' })
        .mockResolvedValueOnce({ customArgs: '--verbose --limit 10' })
        .mockResolvedValueOnce({ continue: '' })

      // Act
      await runCcusageFeature()

      // Assert
      expect(mockExecuteCcusage).toHaveBeenCalledWith(['--verbose', '--limit', '10'])
      expect(mockInquirer.prompt).toHaveBeenCalledTimes(3)
    })

    it('should handle custom mode with quoted arguments', async () => {
      // Arrange
      mockInquirer.prompt
        .mockResolvedValueOnce({ mode: 'custom' })
        .mockResolvedValueOnce({ customArgs: '--name "John Doe" --age 25' })
        .mockResolvedValueOnce({ continue: '' })

      // Act
      await runCcusageFeature()

      // Assert
      expect(mockExecuteCcusage).toHaveBeenCalledWith(['--name', 'John Doe', '--age', '25'])
    })

    it('should handle custom mode with empty arguments', async () => {
      // Arrange
      mockInquirer.prompt
        .mockResolvedValueOnce({ mode: 'custom' })
        .mockResolvedValueOnce({ customArgs: '' })
        .mockResolvedValueOnce({ continue: '' })

      // Act
      await runCcusageFeature()

      // Assert
      expect(mockExecuteCcusage).toHaveBeenCalledWith([])
    })

    it('should validate and use fallback language', async () => {
      // Arrange
      mockInquirer.prompt
        .mockResolvedValueOnce({ mode: 'daily' })
        .mockResolvedValueOnce({ continue: '' })

      // Act - using invalid language should fallback to 'en'
      await runCcusageFeature()

      // Assert
      expect(mockExecuteCcusage).toHaveBeenCalledWith(['daily'])
    })
  })

  describe('runCcrMenuFeature', () => {
    it('should call showCcrMenu with valid language', async () => {
      // Mock the showCcrMenu function
      const { showCcrMenu } = await import('../../src/utils/tools/ccr-menu')
      const mockShowCcrMenu = vi.mocked(showCcrMenu)

      await runCcrMenuFeature()

      expect(mockShowCcrMenu).toHaveBeenCalledWith()
    })

    it('should handle invalid language with fallback', async () => {
      // Mock the showCcrMenu function
      const { showCcrMenu } = await import('../../src/utils/tools/ccr-menu')
      const mockShowCcrMenu = vi.mocked(showCcrMenu)

      await runCcrMenuFeature()

      expect(mockShowCcrMenu).toHaveBeenCalledWith()
    })
  })

  describe('runCometixMenuFeature', () => {
    it('should call showCometixMenu with valid language', async () => {
      // Mock the showCometixMenu function
      const { showCometixMenu } = await import('../../src/utils/cometix/menu')
      const mockShowCometixMenu = vi.mocked(showCometixMenu)

      await runCometixMenuFeature()

      expect(mockShowCometixMenu).toHaveBeenCalledWith()
    })

    it('should handle invalid language with fallback', async () => {
      // Mock the showCometixMenu function
      const { showCometixMenu } = await import('../../src/utils/cometix/menu')
      const mockShowCometixMenu = vi.mocked(showCometixMenu)

      await runCometixMenuFeature()

      expect(mockShowCometixMenu).toHaveBeenCalledWith()
    })
  })
})
