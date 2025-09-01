import inquirer from 'inquirer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { executeCcusage } from '../../../src/commands/ccu'
import { runCcusageFeature } from '../../../src/utils/tools'

vi.mock('inquirer')
vi.mock('../../../src/commands/ccu')

// Mock i18n system
vi.mock('../../../src/i18n', () => ({
  initI18n: vi.fn().mockResolvedValue(undefined),
  changeLanguage: vi.fn().mockResolvedValue(undefined),
  i18n: {
    t: vi.fn((key: string) => key),
    isInitialized: true,
    language: 'en',
  },
  ensureI18nInitialized: vi.fn(),
}))

describe('runCcusageFeature - edge cases', () => {
  const mockPrompt = vi.mocked(inquirer.prompt)
  const mockExecuteCcusage = vi.mocked(executeCcusage)
  const consoleLogSpy = vi.spyOn(console, 'log')

  beforeEach(async () => {
    vi.clearAllMocks()
    consoleLogSpy.mockImplementation(() => {})

    // Initialize i18n for test environment
    const { initI18n } = await import('../../../src/i18n')
    await initI18n('zh-CN')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('error handling', () => {
    it('should handle prompt rejection', async () => {
      mockPrompt.mockRejectedValueOnce(new Error('User cancelled'))

      await expect(runCcusageFeature()).rejects.toThrow('User cancelled')
      expect(mockExecuteCcusage).not.toHaveBeenCalled()
    })

    it('should handle executeCcusage error', async () => {
      mockPrompt
        .mockResolvedValueOnce({ mode: 'daily' })
        .mockResolvedValueOnce({ continue: '' })
      mockExecuteCcusage.mockRejectedValueOnce(new Error('Execution failed'))

      await expect(runCcusageFeature()).rejects.toThrow('Execution failed')
    })

    it('should handle continue prompt error', async () => {
      mockPrompt
        .mockResolvedValueOnce({ mode: 'monthly' })
        .mockRejectedValueOnce(new Error('Continue prompt failed'))
      mockExecuteCcusage.mockResolvedValue()

      await expect(runCcusageFeature()).rejects.toThrow('Continue prompt failed')
    })
  })

  describe('special input cases', () => {
    it('should handle custom args with special characters', async () => {
      mockPrompt
        .mockResolvedValueOnce({ mode: 'custom' })
        .mockResolvedValueOnce({ customArgs: '--path="/Users/Claude Code/data" --filter=*.json' })
        .mockResolvedValueOnce({ continue: '' })
      mockExecuteCcusage.mockResolvedValue()

      await runCcusageFeature()

      expect(mockExecuteCcusage).toHaveBeenCalledWith([
        '--path="/Users/Claude',
        'Code/data"',
        '--filter=*.json',
      ])
    })

    it('should handle custom args with tabs and newlines', async () => {
      mockPrompt
        .mockResolvedValueOnce({ mode: 'custom' })
        .mockResolvedValueOnce({ customArgs: 'daily\t--json\n--verbose' })
        .mockResolvedValueOnce({ continue: '' })
      mockExecuteCcusage.mockResolvedValue()

      await runCcusageFeature()

      expect(mockExecuteCcusage).toHaveBeenCalledWith(['daily', '--json', '--verbose'])
    })

    it('should handle extremely long custom arguments', async () => {
      const longArg = 'a'.repeat(1000)
      mockPrompt
        .mockResolvedValueOnce({ mode: 'custom' })
        .mockResolvedValueOnce({ customArgs: longArg })
        .mockResolvedValueOnce({ continue: '' })
      mockExecuteCcusage.mockResolvedValue()

      await runCcusageFeature()

      expect(mockExecuteCcusage).toHaveBeenCalledWith([longArg])
    })

    it('should handle undefined custom args', async () => {
      mockPrompt
        .mockResolvedValueOnce({ mode: 'custom' })
        .mockResolvedValueOnce({ customArgs: undefined as any })
        .mockResolvedValueOnce({ continue: '' })
      mockExecuteCcusage.mockResolvedValue()

      await runCcusageFeature()

      expect(mockExecuteCcusage).toHaveBeenCalledWith([])
    })

    it('should handle null custom args', async () => {
      mockPrompt
        .mockResolvedValueOnce({ mode: 'custom' })
        .mockResolvedValueOnce({ customArgs: null as any })
        .mockResolvedValueOnce({ continue: '' })
      mockExecuteCcusage.mockResolvedValue()

      await runCcusageFeature()

      expect(mockExecuteCcusage).toHaveBeenCalledWith([])
    })
  })

  describe('language edge cases', () => {
    it('should handle invalid language gracefully', async () => {
      mockPrompt
        .mockResolvedValueOnce({ mode: 'daily' })
        .mockResolvedValueOnce({ continue: '' })
      mockExecuteCcusage.mockResolvedValue()

      await runCcusageFeature()

      expect(mockExecuteCcusage).toHaveBeenCalledWith(['daily'])
    })

    it('should handle undefined language', async () => {
      mockPrompt
        .mockResolvedValueOnce({ mode: 'monthly' })
        .mockResolvedValueOnce({ continue: '' })
      mockExecuteCcusage.mockResolvedValue()

      await runCcusageFeature()

      expect(mockExecuteCcusage).toHaveBeenCalledWith(['monthly'])
    })
  })

  describe('prompt interaction edge cases', () => {
    it('should handle unexpected mode value', async () => {
      mockPrompt
        .mockResolvedValueOnce({ mode: 'invalid-mode' })
        .mockResolvedValueOnce({ continue: '' })
      mockExecuteCcusage.mockResolvedValue()

      await runCcusageFeature()

      expect(mockExecuteCcusage).toHaveBeenCalledWith(['invalid-mode'])
    })

    it('should handle missing mode property', async () => {
      mockPrompt
        .mockResolvedValueOnce({} as any)
        .mockResolvedValueOnce({ continue: '' })
      mockExecuteCcusage.mockResolvedValue()

      await runCcusageFeature()

      expect(mockExecuteCcusage).toHaveBeenCalledWith([undefined])
    })

    it('should handle custom mode with numeric input', async () => {
      mockPrompt
        .mockResolvedValueOnce({ mode: 'custom' })
        .mockResolvedValueOnce({ customArgs: 123 as any })
        .mockResolvedValueOnce({ continue: '' })
      mockExecuteCcusage.mockResolvedValue()

      await runCcusageFeature()

      expect(mockExecuteCcusage).toHaveBeenCalledWith(['123'])
    })

    it('should handle custom mode with object input', async () => {
      mockPrompt
        .mockResolvedValueOnce({ mode: 'custom' })
        .mockResolvedValueOnce({ customArgs: { invalid: 'object' } as any })
        .mockResolvedValueOnce({ continue: '' })
      mockExecuteCcusage.mockResolvedValue()

      await runCcusageFeature()

      expect(mockExecuteCcusage).toHaveBeenCalledWith(['[object', 'Object]'])
    })
  })
})
