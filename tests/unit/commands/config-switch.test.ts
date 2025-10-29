import inquirer from 'inquirer'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
// Import the module under test
import { configSwitchCommand } from '../../../src/commands/config-switch'
import {
  getCurrentCodexProvider,
  listCodexProviders,
  readCodexConfig,
  switchCodexProvider,
  switchToOfficialLogin,
  switchToProvider,
} from '../../../src/utils/code-tools/codex'

// Mock external dependencies
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
        'codex:providerSwitchPrompt': '选择要切换的提供商',
        'codex:providerSwitchSuccess': `✔ 已切换到提供商：${params?.provider || 'test-provider'}`,
        'codex:providerNotFound': `❌ 提供商 '${params?.provider || 'unknown'}' 不存在`,
        'codex:listProvidersTitle': '可用的提供商列表：',
        'codex:currentProvider': `当前提供商：${params?.provider || 'test-provider'}`,
        'codex:noProvidersAvailable': '⚠️ 没有可用的提供商',
        'codex:useOfficialLogin': '使用官方登录',
        'codex:apiConfigSwitchPrompt': '选择要切换的API配置',
        'codex:officialConfigured': '✔ 已切换为官方登录模式',
        'common:cancelled': '已取消操作',
        'common:operationFailed': '操作失败',
        'common:goodbye': '👋 感谢使用 ZCF！再见！',
      }
      return translations[key] || key
    }),
  },
}))

vi.mock('../../../src/utils/code-tools/codex', () => ({
  switchCodexProvider: vi.fn(),
  listCodexProviders: vi.fn(),
  getCurrentCodexProvider: vi.fn(),
  readCodexConfig: vi.fn(),
  switchToOfficialLogin: vi.fn(),
  switchToProvider: vi.fn(),
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
    codeToolType: 'codex',
    lastUpdated: new Date().toISOString(),
  })),
}))

const mockInquirer = vi.mocked(inquirer)
const mockSwitchCodexProvider = vi.mocked(switchCodexProvider)
const mockListCodexProviders = vi.mocked(listCodexProviders)
const mockGetCurrentCodexProvider = vi.mocked(getCurrentCodexProvider)
const mockReadCodexConfig = vi.mocked(readCodexConfig)
const mockSwitchToOfficialLogin = vi.mocked(switchToOfficialLogin)
const mockSwitchToProvider = vi.mocked(switchToProvider)

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

describe('config-switch command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Setup default mocks
    mockListCodexProviders.mockResolvedValue([
      {
        id: 'openai-custom',
        name: 'OpenAI Custom',
        baseUrl: 'https://api.openai.com/v1',
        wireApi: 'responses',
        envKey: 'OPENAI_CUSTOM_API_KEY',
        requiresOpenaiAuth: true,
      },
      {
        id: 'claude-api',
        name: 'Claude API',
        baseUrl: 'https://api.anthropic.com',
        wireApi: 'responses',
        envKey: 'CLAUDE_API_API_KEY',
        requiresOpenaiAuth: true,
      },
    ])
    mockGetCurrentCodexProvider.mockResolvedValue('openai-custom')
    mockReadCodexConfig.mockReturnValue({
      model: null,
      modelProvider: 'openai-custom',
      providers: [
        {
          id: 'openai-custom',
          name: 'OpenAI Custom',
          baseUrl: 'https://api.openai.com/v1',
          wireApi: 'responses',
          envKey: 'OPENAI_CUSTOM_API_KEY',
          requiresOpenaiAuth: true,
        },
        {
          id: 'claude-api',
          name: 'Claude API',
          baseUrl: 'https://api.anthropic.com',
          wireApi: 'responses',
          envKey: 'CLAUDE_API_API_KEY',
          requiresOpenaiAuth: true,
        },
      ],
      mcpServices: [],
      managed: true,
      otherConfig: [],
      modelProviderCommented: false,
    })
    mockSwitchToOfficialLogin.mockResolvedValue(true)
    mockSwitchToProvider.mockResolvedValue(true)
  })

  afterEach(() => {
    vi.resetAllMocks()
    mockConsoleLog.mockRestore()
  })

  describe('with --list flag', () => {
    it('should list all available providers', async () => {
      await configSwitchCommand({ list: true })

      expect(mockListCodexProviders).toHaveBeenCalled()
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('可用的提供商列表'))
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('当前提供商：openai-custom'))
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('OpenAI Custom'))
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Claude API'))
    })

    it('should handle case when no providers are available', async () => {
      mockListCodexProviders.mockResolvedValue([])

      await configSwitchCommand({ list: true })

      expect(mockListCodexProviders).toHaveBeenCalled()
      // Function should complete without errors when no providers available
    })
  })

  describe('with provider argument', () => {
    it('should switch to specified provider directly', async () => {
      mockSwitchCodexProvider.mockResolvedValue(true)

      await configSwitchCommand({ target: 'claude-api' })

      expect(mockSwitchCodexProvider).toHaveBeenCalledWith('claude-api')
      // switchCodexProvider handles its own success/failure messages
    })

    it('should handle switching to non-existent provider', async () => {
      mockSwitchCodexProvider.mockResolvedValue(false)

      await configSwitchCommand({ target: 'non-existent' })

      expect(mockSwitchCodexProvider).toHaveBeenCalledWith('non-existent')
      // switchCodexProvider handles its own success/failure messages
    })
  })

  describe('interactive mode (no arguments)', () => {
    it('should show API config selection menu and switch successfully', async () => {
      mockInquirer.prompt.mockResolvedValue({ selectedConfig: 'claude-api' })

      await configSwitchCommand({})

      expect(mockListCodexProviders).toHaveBeenCalled()
      expect(mockInquirer.prompt).toHaveBeenCalledWith([{
        type: 'list',
        name: 'selectedConfig',
        message: '选择要切换的API配置',
        choices: expect.arrayContaining([
          expect.objectContaining({ value: 'official' }), // Official login option
          expect.objectContaining({ value: 'openai-custom' }),
          expect.objectContaining({ value: 'claude-api' }),
        ]),
      }])
      expect(mockSwitchToProvider).toHaveBeenCalledWith('claude-api')
      // switchToProvider handles its own success/failure messages
    })

    it('should handle user cancellation in interactive mode', async () => {
      mockInquirer.prompt.mockResolvedValue({ selectedConfig: undefined })

      await configSwitchCommand({})

      expect(mockSwitchToProvider).not.toHaveBeenCalled()
      expect(mockSwitchToOfficialLogin).not.toHaveBeenCalled()
      // The cancellation message is handled by the command itself
    })

    it('should handle case when no providers are available in interactive mode', async () => {
      mockListCodexProviders.mockResolvedValue([])

      await configSwitchCommand({})

      expect(mockInquirer.prompt).not.toHaveBeenCalled()
      // The "no providers available" message is handled by the command itself
    })

    it('should handle switch failure in interactive mode', async () => {
      mockInquirer.prompt.mockResolvedValue({ selectedConfig: 'claude-api' })
      mockSwitchToProvider.mockResolvedValue(false)

      await configSwitchCommand({})

      expect(mockSwitchToProvider).toHaveBeenCalledWith('claude-api')
      // Switch failure message is handled by the command itself
    })

    it('should handle official login selection', async () => {
      mockInquirer.prompt.mockResolvedValue({ selectedConfig: 'official' })

      await configSwitchCommand({})

      expect(mockListCodexProviders).toHaveBeenCalled()
      expect(mockSwitchToOfficialLogin).toHaveBeenCalled()
      expect(mockSwitchToProvider).not.toHaveBeenCalled()
    })

    it('should handle Ctrl+C exit properly', async () => {
      const exitError = new Error('User force closed the prompt with SIGINT')
      exitError.name = 'ExitPromptError'
      mockInquirer.prompt.mockRejectedValue(exitError)

      await configSwitchCommand({})

      expect(mockListCodexProviders).toHaveBeenCalled()
      expect(mockSwitchToProvider).not.toHaveBeenCalled()
      expect(mockSwitchToOfficialLogin).not.toHaveBeenCalled()
      // Should not throw error, should handle gracefully
    })

    it('should handle official login selection with failure', async () => {
      mockInquirer.prompt.mockResolvedValue({ selectedConfig: 'official' })
      mockSwitchToOfficialLogin.mockResolvedValue(false)

      await configSwitchCommand({})

      expect(mockSwitchToOfficialLogin).toHaveBeenCalled()
      expect(mockSwitchToProvider).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should handle errors when listing providers', async () => {
      const error = new Error('Failed to read config')
      mockListCodexProviders.mockRejectedValue(error)

      await expect(configSwitchCommand({ list: true })).rejects.toThrow('Failed to read config')
    })

    it('should handle errors when switching providers', async () => {
      const error = new Error('Failed to write config')
      mockSwitchCodexProvider.mockRejectedValue(error)

      await expect(configSwitchCommand({ target: 'claude-api' })).rejects.toThrow('Failed to write config')
    })

    it('should handle errors in interactive mode', async () => {
      const error = new Error('Unexpected error')
      mockListCodexProviders.mockRejectedValue(error)

      await expect(configSwitchCommand({})).rejects.toThrow('Unexpected error')
    })
  })
})
