import inquirer from 'inquirer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as commands from '../../../src/utils/cometix/commands'
import * as installer from '../../../src/utils/cometix/installer'
import * as menuModule from '../../../src/utils/cometix/menu'

// Don't destructure to allow proper mocking
const { showCometixMenu } = menuModule

vi.mock('inquirer')
vi.mock('ansis', () => ({
  default: {
    cyan: vi.fn((text: string) => text),
    bold: { cyan: vi.fn((text: string) => text) },
    gray: vi.fn((text: string) => text),
    yellow: vi.fn((text: string) => text),
    dim: vi.fn((text: string) => text),
  },
}))
// Use real i18n system for better integration testing
vi.mock('../../../src/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/i18n')>()
  return {
    ...actual,
    // Only mock ensureI18nInitialized to avoid initialization issues
    ensureI18nInitialized: vi.fn(),
  }
})
vi.mock('../../../src/utils/cometix/commands')
vi.mock('../../../src/utils/cometix/installer')
vi.mock('../../../src/utils/error-handler', () => ({
  handleGeneralError: vi.fn(),
  handleExitPromptError: vi.fn(() => false),
}))
vi.mock('../../../src/utils/toggle-prompt', () => ({
  promptBoolean: vi.fn(),
}))

describe('cCometixLine menu', () => {
  let consoleLogSpy: any
  let mockedPromptBoolean: any

  beforeEach(async () => {
    vi.clearAllMocks()
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    // Get mocked promptBoolean
    const togglePromptModule = await import('../../../src/utils/toggle-prompt')
    mockedPromptBoolean = vi.mocked(togglePromptModule.promptBoolean)
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
  })

  describe('showCometixMenu', () => {
    it('should display CCometixLine menu options', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ choice: '0' })

      await showCometixMenu()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('CCometixLine - High-performance Claude Code statusline tool'),
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('1.'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Install/update'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('2.'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Print config'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('3.'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Custom config'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('0.'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Back to main menu'))
    })

    it('should handle install or update option (choice 1)', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ choice: '1' })
      mockedPromptBoolean.mockResolvedValueOnce(false) // continueInCometix

      vi.mocked(installer.installCometixLine).mockResolvedValue()

      const result = await showCometixMenu()

      expect(installer.installCometixLine).toHaveBeenCalledWith()
      expect(result).toBe(false)
    })

    it('should handle print config option (choice 2)', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ choice: '2' })
      mockedPromptBoolean.mockResolvedValueOnce(false) // continueInCometix

      vi.mocked(commands.runCometixPrintConfig).mockResolvedValue()

      const result = await showCometixMenu()

      expect(commands.runCometixPrintConfig).toHaveBeenCalledWith()
      expect(result).toBe(false)
    })

    it('should handle custom config TUI option (choice 3)', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ choice: '3' })
      mockedPromptBoolean.mockResolvedValueOnce(false) // continueInCometix

      vi.mocked(commands.runCometixTuiConfig).mockResolvedValue()

      const result = await showCometixMenu()

      expect(commands.runCometixTuiConfig).toHaveBeenCalledWith()
      expect(result).toBe(false)
    })

    it('should handle back to main menu (choice 0)', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ choice: '0' })

      const result = await showCometixMenu()

      expect(result).toBe(false)
    })

    it('should handle invalid choice validation', async () => {
      const mockPrompt = vi.mocked(inquirer.prompt)
      mockPrompt.mockResolvedValue({ choice: '0' })

      await showCometixMenu()

      expect(mockPrompt).toHaveBeenCalledWith({
        type: 'input',
        name: 'choice',
        message: 'Enter your choice and press enter (case-insensitive)',
        validate: expect.any(Function),
      })

      // Test the validate function
      const promptCall = mockPrompt.mock.calls[0][0] as any
      const validateFn = promptCall.validate

      expect(await validateFn('1')).toBe(true)
      expect(await validateFn('2')).toBe(true)
      expect(await validateFn('3')).toBe(true)
      expect(await validateFn('0')).toBe(true)
      expect(await validateFn('4')).toBe('Invalid choice. Please enter a valid option.')
      expect(await validateFn('invalid')).toBe('Invalid choice. Please enter a valid option.')
    })

    it('should handle continue in menu flow', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ choice: '1' })
        .mockResolvedValueOnce({ choice: '0' })
      mockedPromptBoolean.mockResolvedValueOnce(true) // continueInCometix

      vi.mocked(installer.installCometixLine).mockResolvedValue()

      await showCometixMenu()

      expect(inquirer.prompt).toHaveBeenCalledTimes(2)
      expect(mockedPromptBoolean).toHaveBeenCalledTimes(1)
      expect(installer.installCometixLine).toHaveBeenCalledTimes(1)
    })

    it('should handle errors gracefully', async () => {
      const error = new Error('Test error')
      vi.mocked(inquirer.prompt).mockRejectedValue(error)

      const result = await showCometixMenu()

      expect(result).toBe(false)
    })
  })
})
