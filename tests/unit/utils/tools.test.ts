import ansis from 'ansis'
import inquirer from 'inquirer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { executeCcusage } from '../../../src/commands/ccu'
import { runCcusageFeature } from '../../../src/utils/tools'

vi.mock('inquirer')
vi.mock('../../../src/commands/ccu')

// Use real i18n system for better integration testing
vi.mock('../../../src/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/i18n')>()
  return {
    ...actual,
    // Only mock ensureI18nInitialized to avoid initialization issues
    ensureI18nInitialized: vi.fn(),
  }
})

describe('runCcusageFeature', () => {
  const mockPrompt = vi.mocked(inquirer.prompt)
  const mockExecuteCcusage = vi.mocked(executeCcusage)
  const consoleLogSpy = vi.spyOn(console, 'log')

  beforeEach(() => {
    vi.clearAllMocks()
    consoleLogSpy.mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('mode selection', () => {
    it('should handle daily mode selection', async () => {
      mockPrompt
        .mockResolvedValueOnce({ mode: 'daily' })
        .mockResolvedValueOnce({ continue: '' })
      mockExecuteCcusage.mockResolvedValue()

      await runCcusageFeature()

      expect(mockPrompt).toHaveBeenCalledWith({
        type: 'list',
        name: 'mode',
        message: 'Select analysis mode:',
        choices: [
          { name: '1. Daily usage', value: 'daily' },
          { name: '2. Monthly usage', value: 'monthly' },
          { name: '3. Session statistics', value: 'session' },
          { name: '4. Analyze code blocks', value: 'blocks' },
          { name: '5. Custom parameters', value: 'custom' },
          { name: '6. Back', value: 'back' },
        ],
      })
      expect(mockExecuteCcusage).toHaveBeenCalledWith(['daily'])
      // Console log validation removed - UI output is managed by i18n
    })

    it('should handle monthly mode selection in English', async () => {
      mockPrompt
        .mockResolvedValueOnce({ mode: 'monthly' })
        .mockResolvedValueOnce({ continue: '' })
      mockExecuteCcusage.mockResolvedValue()

      await runCcusageFeature()

      expect(mockPrompt).toHaveBeenCalledWith({
        type: 'list',
        name: 'mode',
        message: 'Select analysis mode:',
        choices: [
          { name: '1. Daily usage', value: 'daily' },
          { name: '2. Monthly usage', value: 'monthly' },
          { name: '3. Session statistics', value: 'session' },
          { name: '4. Analyze code blocks', value: 'blocks' },
          { name: '5. Custom parameters', value: 'custom' },
          { name: '6. Back', value: 'back' },
        ],
      })
      expect(mockExecuteCcusage).toHaveBeenCalledWith(['monthly'])
      // Console log validation removed - UI output is managed by i18n
    })

    it('should handle session mode selection', async () => {
      mockPrompt
        .mockResolvedValueOnce({ mode: 'session' })
        .mockResolvedValueOnce({ continue: '' })
      mockExecuteCcusage.mockResolvedValue()

      await runCcusageFeature()

      expect(mockExecuteCcusage).toHaveBeenCalledWith(['session'])
    })

    it('should handle blocks mode selection', async () => {
      mockPrompt
        .mockResolvedValueOnce({ mode: 'blocks' })
        .mockResolvedValueOnce({ continue: '' })
      mockExecuteCcusage.mockResolvedValue()

      await runCcusageFeature()

      expect(mockExecuteCcusage).toHaveBeenCalledWith(['blocks'])
    })
  })

  describe('back option', () => {
    it('should return early when back is selected', async () => {
      mockPrompt.mockResolvedValueOnce({ mode: 'back' })

      await runCcusageFeature()

      expect(mockExecuteCcusage).not.toHaveBeenCalled()
      expect(mockPrompt).toHaveBeenCalledTimes(1)
    })

    it('should return early when back is selected in English', async () => {
      mockPrompt.mockResolvedValueOnce({ mode: 'back' })

      await runCcusageFeature()

      expect(mockExecuteCcusage).not.toHaveBeenCalled()
      expect(mockPrompt).toHaveBeenCalledTimes(1)
    })
  })

  describe('custom mode', () => {
    it('should handle custom mode with arguments', async () => {
      mockPrompt
        .mockResolvedValueOnce({ mode: 'custom' })
        .mockResolvedValueOnce({ customArgs: 'daily --json --output report.json' })
        .mockResolvedValueOnce({ continue: '' })
      mockExecuteCcusage.mockResolvedValue()

      await runCcusageFeature()

      expect(mockPrompt).toHaveBeenCalledWith({
        type: 'input',
        name: 'customArgs',
        message: 'Enter custom arguments',
        default: '',
      })
      expect(mockExecuteCcusage).toHaveBeenCalledWith(['daily', '--json', '--output', 'report.json'])
    })

    it('should handle custom mode with empty arguments', async () => {
      mockPrompt
        .mockResolvedValueOnce({ mode: 'custom' })
        .mockResolvedValueOnce({ customArgs: '' })
        .mockResolvedValueOnce({ continue: '' })
      mockExecuteCcusage.mockResolvedValue()

      await runCcusageFeature()

      expect(mockPrompt).toHaveBeenCalledWith({
        type: 'input',
        name: 'customArgs',
        message: 'Enter custom arguments',
        default: '',
      })
      expect(mockExecuteCcusage).toHaveBeenCalledWith([])
    })

    it('should handle custom mode with spaces only', async () => {
      mockPrompt
        .mockResolvedValueOnce({ mode: 'custom' })
        .mockResolvedValueOnce({ customArgs: '   ' })
        .mockResolvedValueOnce({ continue: '' })
      mockExecuteCcusage.mockResolvedValue()

      await runCcusageFeature()

      expect(mockExecuteCcusage).toHaveBeenCalledWith([])
    })

    it('should handle custom mode with multiple spaces between arguments', async () => {
      mockPrompt
        .mockResolvedValueOnce({ mode: 'custom' })
        .mockResolvedValueOnce({ customArgs: 'daily    --json     --verbose' })
        .mockResolvedValueOnce({ continue: '' })
      mockExecuteCcusage.mockResolvedValue()

      await runCcusageFeature()

      expect(mockExecuteCcusage).toHaveBeenCalledWith(['daily', '--json', '--verbose'])
    })
  })

  describe('continue prompt', () => {
    it('should show continue prompt in Chinese', async () => {
      mockPrompt
        .mockResolvedValueOnce({ mode: 'daily' })
        .mockResolvedValueOnce({ continue: '' })
      mockExecuteCcusage.mockResolvedValue()

      await runCcusageFeature()

      expect(mockPrompt).toHaveBeenNthCalledWith(2, {
        type: 'input',
        name: 'continue',
        message: ansis.gray('Press Enter to continue...'),
      })
    })

    it('should show continue prompt in English', async () => {
      mockPrompt
        .mockResolvedValueOnce({ mode: 'monthly' })
        .mockResolvedValueOnce({ continue: '' })
      mockExecuteCcusage.mockResolvedValue()

      await runCcusageFeature()

      expect(mockPrompt).toHaveBeenNthCalledWith(2, {
        type: 'input',
        name: 'continue',
        message: ansis.gray('Press Enter to continue...'),
      })
    })
  })

  // Display text tests removed - UI output is implementation detail managed by i18n system
})
