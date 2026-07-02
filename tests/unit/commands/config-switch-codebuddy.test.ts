import inquirer from 'inquirer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { configSwitchCommand } from '../../../src/commands/config-switch'

import { resolveCodeToolType } from '../../../src/constants'
import { CodeBuddyConfigManager } from '../../../src/utils/code-tools/codebuddy-config-manager'
import { readZcfConfig } from '../../../src/utils/zcf-config'

// Mock external dependencies
vi.mock('inquirer')
vi.mock('ansis', () => ({
  default: {
    bold: vi.fn((str: any) => str),
    cyan: Object.assign(vi.fn((str: any) => str), { bold: vi.fn((str: any) => str) }),
    green: vi.fn((str: any) => str),
    red: vi.fn((str: any) => str),
    yellow: vi.fn((str: any) => str),
    gray: vi.fn((str: any) => str),
    white: vi.fn((str: any) => str),
  },
}))

vi.mock('../../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  i18n: {
    t: vi.fn((key: string, params?: any) => {
      const translations: Record<string, string> = {
        'multi-config:codebuddySwitchTitle': 'CodeBuddy 配置切换',
        'multi-config:useOfficialLogin': '使用官方登录',
        'multi-config:selectConfig': '选择配置',
        'multi-config:switchedToOfficial': '已切换到官方登录',
        'multi-config:switchedToProfile': `已切换到 ${params?.name || 'profile'}`,
        'multi-config:cancelled': '已取消操作',
        'common:goodbye': '👋 感谢使用 ZCF！再见！',
      }
      return translations[key] || key
    }),
  },
}))

vi.mock('../../../src/utils/code-tools/codebuddy-config-manager', () => ({
  CodeBuddyConfigManager: {
    getCurrentProfile: vi.fn(),
    applyProfileSettings: vi.fn(),
  },
}))

const {
  mockListCodexProvidersFn,
  mockReadCodexConfigFn,
  mockSwitchCodexProviderFn,
  mockSwitchCodexOfficialLoginFn,
  mockSwitchToProviderFn,
} = vi.hoisted(() => ({
  mockListCodexProvidersFn: vi.fn(),
  mockReadCodexConfigFn: vi.fn(),
  mockSwitchCodexProviderFn: vi.fn(),
  mockSwitchCodexOfficialLoginFn: vi.fn(),
  mockSwitchToProviderFn: vi.fn(),
}))

vi.mock('../../../src/utils/code-tools/codex', () => ({
  listCodexProviders: mockListCodexProvidersFn,
  readCodexConfig: mockReadCodexConfigFn,
  switchCodexProvider: mockSwitchCodexProviderFn,
  switchToOfficialLogin: mockSwitchCodexOfficialLoginFn,
  switchToProvider: mockSwitchToProviderFn,
}))

vi.mock('../../../src/utils/prompt-helpers', () => ({
  addNumbersToChoices: vi.fn((choices: any[]) => choices.map((choice: any, index: number) => ({
    ...choice,
    name: `${index + 1}. ${choice.name}`,
  }))),
}))

vi.mock('../../../src/utils/error-handler', () => ({
  handleGeneralError: vi.fn(),
}))

vi.mock('../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn(() => ({
    version: '1.0.0',
    preferredLang: 'zh-CN',
    codeToolType: 'codebuddy',
    lastUpdated: new Date().toISOString(),
  })),
}))

vi.mock('../../../src/constants', () => ({
  DEFAULT_CODE_TOOL_TYPE: 'claude-code',
  ZCF_CONFIG_FILE: '/test/.ufomiao/zcf/config.toml',
  ZCF_CONFIG_DIR: '/test/.ufomiao/zcf',
  isCodeToolType: vi.fn(() => true),
  resolveCodeToolType: vi.fn(type => type || 'codebuddy'),
}))

const mockInquirer = vi.mocked(inquirer)
const mockCodeBuddyConfigManager = vi.mocked(CodeBuddyConfigManager)
const mockResolveCodeToolType = vi.mocked(resolveCodeToolType)

const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(vi.fn())

describe('config-switch command - CodeBuddy Support', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCodeBuddyConfigManager.getCurrentProfile.mockReturnValue({
      id: 'profile-1',
      name: 'Test Profile',
      authType: 'api_key' as const,
      apiKey: 'sk-test',
    })
    mockCodeBuddyConfigManager.applyProfileSettings.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
    mockConsoleLog.mockClear()
  })

  describe('interactive mode', () => {
    it('should switch to official login when selected', async () => {
      mockInquirer.prompt.mockResolvedValue({ selection: 'official' })

      await configSwitchCommand({ codeType: 'codebuddy' })

      expect(mockCodeBuddyConfigManager.applyProfileSettings).toHaveBeenCalledWith(null)
      expect(mockConsoleLog).toHaveBeenCalledWith('已切换到官方登录')
    })

    it('should switch to current profile when selected', async () => {
      mockInquirer.prompt.mockResolvedValue({ selection: 'current' })

      await configSwitchCommand({ codeType: 'codebuddy' })

      expect(mockCodeBuddyConfigManager.applyProfileSettings).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'profile-1', name: 'Test Profile' }),
      )
      expect(mockConsoleLog).toHaveBeenCalledWith('已切换到 Test Profile')
    })

    it('should handle cancellation in interactive mode', async () => {
      mockInquirer.prompt.mockResolvedValue({ selection: undefined })

      await configSwitchCommand({ codeType: 'codebuddy' })

      expect(mockCodeBuddyConfigManager.applyProfileSettings).not.toHaveBeenCalled()
      expect(mockConsoleLog).toHaveBeenCalledWith('common:cancelled')
    })

    it('should only show official login when no current profile exists', async () => {
      mockCodeBuddyConfigManager.getCurrentProfile.mockReturnValue(null)
      mockInquirer.prompt.mockResolvedValue({ selection: 'official' })

      await configSwitchCommand({ codeType: 'codebuddy' })

      expect(mockInquirer.prompt).toHaveBeenCalledWith(expect.objectContaining({
        choices: expect.arrayContaining([
          expect.objectContaining({ value: 'official' }),
        ]),
      }))
      expect(mockCodeBuddyConfigManager.applyProfileSettings).toHaveBeenCalledWith(null)
    })

    it('should handle Ctrl+C exit gracefully', async () => {
      const exitError = new Error('User force closed the prompt with SIGINT')
      exitError.name = 'ExitPromptError'
      mockInquirer.prompt.mockRejectedValue(exitError)

      await configSwitchCommand({ codeType: 'codebuddy' })

      expect(mockCodeBuddyConfigManager.applyProfileSettings).not.toHaveBeenCalled()
      expect(mockConsoleLog).toHaveBeenCalledWith('\n👋 感谢使用 ZCF！再见！')
    })
  })

  describe('code type resolution', () => {
    it('should resolve codebuddy type from parameter', async () => {
      mockResolveCodeToolType.mockReturnValue('codebuddy')
      mockInquirer.prompt.mockResolvedValue({ selection: 'official' })

      await configSwitchCommand({ codeType: 'codebuddy' })

      expect(mockResolveCodeToolType).toHaveBeenCalledWith('codebuddy')
      expect(mockCodeBuddyConfigManager.applyProfileSettings).toHaveBeenCalled()
    })

    it('should fallback to ZCF config code type', async () => {
      const mockReadZcfConfig = vi.mocked(readZcfConfig)
      mockReadZcfConfig.mockReturnValue({
        codeToolType: 'codebuddy',
      } as any)
      mockInquirer.prompt.mockResolvedValue({ selection: 'official' })

      await configSwitchCommand({})

      expect(mockReadZcfConfig).toHaveBeenCalled()
      expect(mockCodeBuddyConfigManager.applyProfileSettings).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should re-throw unexpected interactive errors', async () => {
      const error = new Error('Prompt failed')
      mockInquirer.prompt.mockRejectedValue(error)

      await expect(configSwitchCommand({ codeType: 'codebuddy' })).rejects.toThrow('Prompt failed')
    })
  })
})
