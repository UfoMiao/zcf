import inquirer from 'inquirer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { configSwitchCommand } from '../../../src/commands/config-switch'

vi.mock('inquirer')
vi.mock('ansis', () => ({
  default: {
    bold: vi.fn((str: string) => str),
    cyan: vi.fn((str: string) => str),
    green: vi.fn((str: string) => str),
    red: vi.fn((str: string) => str),
    yellow: vi.fn((str: string) => str),
    gray: vi.fn((str: string) => str),
    white: vi.fn((str: string) => str),
  },
}))
vi.mock('../../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  i18n: {
    t: vi.fn((key: string, params?: any) => {
      const translations: Record<string, string> = {
        'opencode:listModelsTitle': 'Available OpenCode models:',
        'opencode:currentModel': `Current model: ${params?.model || 'none'}`,
        'opencode:noModelConfigured': 'No OpenCode model configured',
        'opencode:modelSwitchPrompt': 'Enter OpenCode model',
        'opencode:modelRequired': 'Model is required',
        'opencode:switchSuccess': `✔ Switched to ${params?.model || 'model'}`,
        'opencode:switchFailed': '❌ Failed to switch model',
        'opencode:invalidModelFormat': `Invalid model format: ${params?.model || ''}`,
        'opencode:backupSuccess': `Backup: ${params?.path || ''}`,
        'common:cancelled': 'Cancelled',
        'common:goodbye': 'Goodbye',
      }
      return translations[key] || key
    }),
  },
}))
vi.mock('../../../src/utils/code-tools/opencode', () => ({
  getOpenCodeStatus: vi.fn(),
  switchOpenCodeModel: vi.fn(),
}))
vi.mock('../../../src/utils/code-tools/codex', () => ({
  listCodexProviders: vi.fn(),
  readCodexConfig: vi.fn(),
  switchCodexProvider: vi.fn(),
  switchToOfficialLogin: vi.fn(),
  switchToProvider: vi.fn(),
}))
vi.mock('../../../src/utils/claude-code-config-manager', () => ({
  ClaudeCodeConfigManager: {
    readConfig: vi.fn(),
  },
}))
vi.mock('../../../src/utils/prompt-helpers', () => ({
  addNumbersToChoices: vi.fn(choices => choices),
}))
vi.mock('../../../src/utils/error-handler', () => ({
  handleGeneralError: vi.fn(),
}))
vi.mock('../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn(() => ({
    version: '1.0.0',
    preferredLang: 'zh-CN',
    codeToolType: 'opencode',
    lastUpdated: new Date().toISOString(),
  })),
}))

const mockInquirer = vi.mocked(inquirer)

describe('config-switch command for opencode', () => {
  let mockGetOpenCodeStatus: ReturnType<typeof vi.fn>
  let mockSwitchOpenCodeModel: ReturnType<typeof vi.fn>
  let mockConsoleLog: ReturnType<typeof vi.spyOn>

  beforeEach(async () => {
    vi.clearAllMocks()

    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

    const opencodeModule = await import('../../../src/utils/code-tools/opencode')
    mockGetOpenCodeStatus = vi.mocked(opencodeModule.getOpenCodeStatus)
    mockSwitchOpenCodeModel = vi.mocked(opencodeModule.switchOpenCodeModel)

    mockGetOpenCodeStatus.mockReturnValue({
      installed: true,
      configured: true,
      model: 'anthropic/claude-sonnet-4',
    })
    mockSwitchOpenCodeModel.mockReturnValue({
      success: true,
      model: 'openai/gpt-5',
      backupPath: '/home/test/.config/opencode/backup/opencode.json.backup',
    })
  })

  afterEach(() => {
    mockConsoleLog.mockRestore()
    vi.resetAllMocks()
  })

  describe('with --list flag', () => {
    it('should display current OpenCode model', async () => {
      await configSwitchCommand({ codeType: 'opencode', list: true })

      expect(mockGetOpenCodeStatus).toHaveBeenCalled()
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Available OpenCode models'))
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Current model: anthropic/claude-sonnet-4'))
    })

    it('should handle no configured model', async () => {
      mockGetOpenCodeStatus.mockReturnValue({ installed: true, configured: false })

      await configSwitchCommand({ codeType: 'opencode', list: true })

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('No OpenCode model configured'))
    })
  })

  describe('with model argument', () => {
    it('should switch to specified model directly', async () => {
      await configSwitchCommand({ codeType: 'opencode', target: 'openai/gpt-5' })

      expect(mockSwitchOpenCodeModel).toHaveBeenCalledWith('openai/gpt-5')
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Switched to openai/gpt-5'))
    })

    it('should display error when switch fails', async () => {
      mockSwitchOpenCodeModel.mockReturnValue({
        success: false,
        error: 'Invalid model format',
      })

      await configSwitchCommand({ codeType: 'opencode', target: 'invalid' })

      expect(mockSwitchOpenCodeModel).toHaveBeenCalledWith('invalid')
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Failed to switch model'))
    })
  })

  describe('interactive mode', () => {
    it('should prompt for model and switch', async () => {
      mockInquirer.prompt.mockResolvedValue({ model: 'openai/gpt-5' })

      await configSwitchCommand({ codeType: 'opencode' })

      expect(mockInquirer.prompt).toHaveBeenCalledWith([expect.objectContaining({
        type: 'input',
        name: 'model',
        message: 'Enter OpenCode model',
      })])
      expect(mockSwitchOpenCodeModel).toHaveBeenCalledWith('openai/gpt-5')
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Switched to openai/gpt-5'))
    })

    it('should handle empty input as cancelled', async () => {
      mockInquirer.prompt.mockResolvedValue({ model: '' })

      await configSwitchCommand({ codeType: 'opencode' })

      expect(mockSwitchOpenCodeModel).not.toHaveBeenCalled()
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Cancelled'))
    })
  })
})
