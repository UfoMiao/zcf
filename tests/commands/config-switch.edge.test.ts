import inquirer from 'inquirer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Import the module under test
import { configSwitchCommand } from '../../src/commands/config-switch'
import {
  listCodexProviders,
  switchCodexProvider,
} from '../../src/utils/code-tools/codex'

// Mock external dependencies
vi.mock('inquirer')
vi.mock('../../src/i18n', () => ({
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
        'common:cancelled': '已取消操作',
        'codex:configNotFound': '配置文件不存在',
      }
      return translations[key] || key
    }),
  },
}))

vi.mock('../../src/utils/code-tools/codex', () => ({
  switchCodexProvider: vi.fn(),
  listCodexProviders: vi.fn(),
  readCodexConfig: vi.fn(),
  switchToOfficialLogin: vi.fn(),
  switchToProvider: vi.fn(),
}))

vi.mock('../../src/utils/prompt-helpers', () => ({
  addNumbersToChoices: vi.fn(choices => choices),
}))

vi.mock('../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn(() => ({
    version: '1.0.0',
    preferredLang: 'zh-CN',
    codeToolType: 'codex',
    lastUpdated: new Date().toISOString(),
  })),
}))

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

const mockInquirer = vi.mocked(inquirer)
const mockSwitchCodexProvider = vi.mocked(switchCodexProvider)
const mockListCodexProviders = vi.mocked(listCodexProviders)
// const mockHandleGeneralError = vi.mocked(handleGeneralError) // Not used in tests

// Import and mock new functions
const { readCodexConfig, switchToOfficialLogin, switchToProvider } = await import('../../src/utils/code-tools/codex')
const mockReadCodexConfig = vi.mocked(readCodexConfig)
const mockSwitchToOfficialLogin = vi.mocked(switchToOfficialLogin)
const mockSwitchToProvider = vi.mocked(switchToProvider)

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

describe('config-switch command - Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Set up default mock behaviors
    mockReadCodexConfig.mockReturnValue({
      model: null,
      modelProvider: 'test-provider',
      providers: [
        {
          id: 'test-provider',
          name: 'Test Provider',
          baseUrl: 'https://api.test.com',
          wireApi: 'responses',
          envKey: 'TEST_API_KEY',
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
    mockConsoleError.mockRestore()
  })

  describe('file system errors', () => {
    it('should handle permission denied errors', async () => {
      const permissionError = new Error('EACCES: permission denied')
      permissionError.name = 'PermissionError'
      mockListCodexProviders.mockRejectedValue(permissionError)

      await expect(configSwitchCommand({ list: true })).rejects.toThrow('EACCES: permission denied')
    })

    it('should handle file not found errors gracefully', async () => {
      const fileNotFoundError = new Error('ENOENT: no such file or directory')
      fileNotFoundError.name = 'FileNotFoundError'
      mockListCodexProviders.mockRejectedValue(fileNotFoundError)

      await expect(configSwitchCommand({ list: true })).rejects.toThrow('ENOENT: no such file or directory')
    })

    it('should handle corrupted config file', async () => {
      const parseError = new Error('Invalid TOML syntax')
      parseError.name = 'ParseError'
      mockListCodexProviders.mockRejectedValue(parseError)

      await expect(configSwitchCommand({ list: true })).rejects.toThrow('Invalid TOML syntax')
    })
  })

  describe('network and system errors', () => {
    it('should handle timeout errors during provider validation', async () => {
      const timeoutError = new Error('Request timeout')
      timeoutError.name = 'TimeoutError'
      mockSwitchCodexProvider.mockRejectedValue(timeoutError)

      await expect(configSwitchCommand({ target: 'claude-api' })).rejects.toThrow('Request timeout')
    })

    it('should handle system interruption (SIGINT)', async () => {
      const interruptError = new Error('User interrupted operation')
      interruptError.name = 'InterruptError'

      // Setup providers first to avoid null access error
      mockListCodexProviders.mockResolvedValue([
        {
          id: 'test-provider',
          name: 'Test Provider',
          baseUrl: 'https://api.test.com',
          wireApi: 'responses',
          envKey: 'TEST_API_KEY',
          requiresOpenaiAuth: true,
        },
      ])

      mockInquirer.prompt.mockRejectedValue(interruptError)

      await expect(configSwitchCommand({})).rejects.toThrow('User interrupted operation')
    })
  })

  describe('invalid input scenarios', () => {
    it('should handle empty provider name', async () => {
      // Empty provider should fall back to interactive mode
      mockListCodexProviders.mockResolvedValue([])

      await configSwitchCommand({ target: '' })

      expect(mockListCodexProviders).toHaveBeenCalled()
      expect(mockSwitchCodexProvider).not.toHaveBeenCalled()
      // Empty provider falls back to interactive mode (no providers available)
    })

    it('should handle provider name with special characters', async () => {
      mockSwitchCodexProvider.mockResolvedValue(false)

      await configSwitchCommand({ target: 'provider@#$%^&*()' })

      expect(mockSwitchCodexProvider).toHaveBeenCalledWith('provider@#$%^&*()')
      // switchCodexProvider handles its own error messages
    })

    it('should handle extremely long provider names', async () => {
      const longName = 'a'.repeat(1000)
      mockSwitchCodexProvider.mockResolvedValue(false)

      await configSwitchCommand({ target: longName })

      expect(mockSwitchCodexProvider).toHaveBeenCalledWith(longName)
      // switchCodexProvider handles its own error messages
    })
  })

  describe('concurrent access scenarios', () => {
    it('should handle config file being modified during operation', async () => {
      // Simulate config being changed during provider listing
      mockListCodexProviders.mockResolvedValueOnce([
        {
          id: 'provider1',
          name: 'Provider 1',
          baseUrl: 'https://api1.com',
          wireApi: 'responses',
          envKey: 'PROVIDER1_API_KEY',
          requiresOpenaiAuth: true,
        },
      ])

      // Then simulate it failing when trying to switch
      mockSwitchToProvider.mockResolvedValue(false)
      mockInquirer.prompt.mockResolvedValue({ selectedConfig: 'provider1' })

      await configSwitchCommand({})

      // switchCodexProvider handles its own error messages
    })
  })

  describe('resource exhaustion scenarios', () => {
    it('should handle out of memory errors', async () => {
      const memoryError = new Error('JavaScript heap out of memory')
      memoryError.name = 'RangeError'
      mockListCodexProviders.mockRejectedValue(memoryError)

      await expect(configSwitchCommand({ list: true })).rejects.toThrow('JavaScript heap out of memory')
    })

    it('should handle disk space exhaustion during backup', async () => {
      const diskError = new Error('ENOSPC: no space left on device')
      diskError.name = 'DiskSpaceError'
      mockSwitchCodexProvider.mockRejectedValue(diskError)

      await expect(configSwitchCommand({ target: 'claude-api' })).rejects.toThrow('ENOSPC: no space left on device')
    })
  })

  describe('unicode and encoding edge cases', () => {
    it('should handle unicode provider names', async () => {
      const unicodeName = '测试提供商🔥'
      mockSwitchCodexProvider.mockResolvedValue(true)

      await configSwitchCommand({ target: unicodeName })

      expect(mockSwitchCodexProvider).toHaveBeenCalledWith(unicodeName)
      // switchCodexProvider handles its own success messages
    })

    it('should handle providers with null bytes', async () => {
      const nameWithNull = 'provider\0name'
      mockSwitchCodexProvider.mockResolvedValue(false)

      await configSwitchCommand({ target: nameWithNull })

      expect(mockSwitchCodexProvider).toHaveBeenCalledWith(nameWithNull)
    })
  })

  describe('state consistency edge cases', () => {
    it('should handle providers list changing during selection', async () => {
      // Initial list has providers
      mockListCodexProviders.mockResolvedValueOnce([
        {
          id: 'provider1',
          name: 'Provider 1',
          baseUrl: 'https://api1.com',
          wireApi: 'responses',
          envKey: 'PROVIDER1_API_KEY',
          requiresOpenaiAuth: true,
        },
      ])

      // User selects a provider
      mockInquirer.prompt.mockResolvedValue({ selectedConfig: 'provider1' })

      // But when trying to switch, the provider is no longer available
      mockSwitchToProvider.mockResolvedValue(false)

      await configSwitchCommand({})

      expect(mockSwitchToProvider).toHaveBeenCalledWith('provider1')
      // switchToProvider handles its own error messages
    })

    it('should handle getCurrentCodexProvider returning null', async () => {
      mockListCodexProviders.mockResolvedValue([
        {
          id: 'provider1',
          name: 'Provider 1',
          baseUrl: 'https://api1.com',
          wireApi: 'responses',
          envKey: 'PROVIDER1_API_KEY',
          requiresOpenaiAuth: true,
        },
      ])
      mockReadCodexConfig.mockReturnValue({
        model: null,
        modelProvider: null,
        modelProviderCommented: false,
        providers: [],
        mcpServices: [],
        managed: false,
      })

      await configSwitchCommand({ list: true })

      expect(mockListCodexProviders).toHaveBeenCalled()
      // Should handle the case where current provider is null
    })
  })
})
