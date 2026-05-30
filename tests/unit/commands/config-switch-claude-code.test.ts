import inquirer from 'inquirer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { configSwitchCommand } from '../../../src/commands/config-switch'

import { resolveCodeToolType } from '../../../src/constants'
// Import the mocked module correctly
import { ClaudeCodeConfigManager } from '../../../src/utils/claude-code-config-manager'
import { readZcfConfig } from '../../../src/utils/zcf-config'

// Mock external dependencies
vi.mock('inquirer')
vi.mock('ansis', () => ({
  default: {
    bold: vi.fn((str: any) => str),
    cyan: vi.fn((str: any) => str),
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
        'multi-config:noClaudeCodeProfilesAvailable': '没有可用的 Claude Code 配置文件',
        'multi-config:availableClaudeCodeProfiles': '可用的 Claude Code 配置文件',
        'multi-config:selectClaudeCodeConfiguration': '选择 Claude Code 配置：',
        'multi-config:cancelled': '已取消操作',
        'multi-config:successfullySwitchedToOfficial': '成功切换到官方登录',
        'multi-config:failedToSwitchToOfficial': '切换到官方登录失败：{error}',
        'multi-config:successfullySwitchedToCcr': '成功切换到 CCR 代理',
        'multi-config:failedToSwitchToCcr': '切换到 CCR 代理失败：{error}',
        'multi-config:successfullySwitchedToProfile': '成功切换到配置文件：{name}',
        'multi-config:failedToSwitchToProfile': '切换到配置文件失败：{error}',
        'multi-config:profileNameNotFound': '未找到配置：{name}',
        'common:current': '当前',
        'common:cancelled': '已取消操作',
        'common:operationFailed': '操作失败',
        'common:goodbye': '👋 感谢使用 ZCF！再见！',
      }

      let result = translations[key] || key

      // Handle parameter substitution
      if (params) {
        for (const [param, value] of Object.entries(params)) {
          result = result.replace(`{${param}}`, String(value))
        }
      }

      return result
    }),
  },
}))

vi.mock('../../../src/utils/claude-code-config-manager', () => ({
  ClaudeCodeConfigManager: {
    readConfig: vi.fn(),
    switchProfile: vi.fn(),
    switchToOfficial: vi.fn(),
    applyProfileSettings: vi.fn(),
    getProfileById: vi.fn(),
  },
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
    codeToolType: 'claude-code',
    lastUpdated: new Date().toISOString(),
  })),
}))

vi.mock('../../../src/constants', () => ({
  DEFAULT_CODE_TOOL_TYPE: 'claude-code',
  isCodeToolType: vi.fn(() => true),
  resolveCodeToolType: vi.fn(type => type || 'claude-code'),
}))

const mockInquirer = vi.mocked(inquirer)
const mockClaudeCodeConfigManager = vi.mocked(ClaudeCodeConfigManager)

const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(vi.fn())

describe('config-switch command - Claude Code Support', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    const defaultConfig = {
      profiles: {
        profile1: {
          id: 'profile1',
          name: 'Test Profile 1',
          authType: 'api_key' as const,
        },
        profile2: {
          id: 'profile2',
          name: 'Test Profile 2',
          authType: 'auth_token' as const,
        },
      },
      currentProfileId: 'profile1' as string,
    }

    mockClaudeCodeConfigManager.readConfig.mockReturnValue(defaultConfig)
    mockClaudeCodeConfigManager.getProfileById.mockImplementation((id: string) => (defaultConfig.profiles as Record<string, any>)[id] || null)
    mockClaudeCodeConfigManager.switchProfile.mockResolvedValue({ success: true })
    mockClaudeCodeConfigManager.switchToOfficial.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    vi.clearAllMocks()
    mockConsoleLog.mockClear()
  })

  describe('claude Code --list functionality', () => {
    it('should list Claude Code profiles', async () => {
      await configSwitchCommand({ list: true, codeType: 'claude-code' })

      expect(mockClaudeCodeConfigManager.readConfig).toHaveBeenCalled()
      // Debug: check the actual calls
      expect(mockConsoleLog.mock.calls.length).toBeGreaterThan(0)
    })

    it('should show current profile indicator', async () => {
      await configSwitchCommand({ list: true, codeType: 'claude-code' })

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Test Profile 1'))
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('当前'))
    })

    it('should handle empty Claude Code profiles', async () => {
      mockClaudeCodeConfigManager.readConfig.mockReturnValue(null)

      await configSwitchCommand({ list: true, codeType: 'claude-code' })

      expect(mockConsoleLog).toHaveBeenCalledWith('没有可用的 Claude Code 配置文件')
    })

    it('should handle profiles object with no profiles', async () => {
      mockClaudeCodeConfigManager.readConfig.mockReturnValue({
        profiles: {},
        currentProfileId: '',
      })

      await configSwitchCommand({ list: true, codeType: 'claude-code' })

      expect(mockConsoleLog).toHaveBeenCalledWith('没有可用的 Claude Code 配置文件')
    })
  })

  describe('claude Code direct switch', () => {
    it('should switch to official login', async () => {
      await configSwitchCommand({ target: 'official', codeType: 'claude-code' })

      expect(mockClaudeCodeConfigManager.switchToOfficial).toHaveBeenCalled()
      expect(mockClaudeCodeConfigManager.applyProfileSettings).toHaveBeenCalledWith(null)
      expect(mockConsoleLog).toHaveBeenCalledWith('成功切换到官方登录')
    })

    it('should handle official login failure', async () => {
      mockClaudeCodeConfigManager.switchToOfficial.mockResolvedValue({
        success: false,
        error: 'Network error',
      })

      await configSwitchCommand({ target: 'official', codeType: 'claude-code' })

      expect(mockConsoleLog).toHaveBeenCalledWith('切换到官方登录失败：Network error')
    })

    it('should switch to profile by ID', async () => {
      await configSwitchCommand({ target: 'profile2', codeType: 'claude-code' })

      expect(mockClaudeCodeConfigManager.switchProfile).toHaveBeenCalledWith('profile2')
      expect(mockClaudeCodeConfigManager.applyProfileSettings).toHaveBeenCalledWith(expect.objectContaining({ id: 'profile2', name: 'Test Profile 2' }))
      expect(mockConsoleLog).toHaveBeenCalledWith('成功切换到配置文件：Test Profile 2')
    })

    it('should handle profile switch failure when manager returns error', async () => {
      mockClaudeCodeConfigManager.switchProfile.mockResolvedValue({
        success: false,
        error: 'Profile not found',
      })

      await configSwitchCommand({ target: 'profile1', codeType: 'claude-code' })

      expect(mockClaudeCodeConfigManager.switchProfile).toHaveBeenCalledWith('profile1')
      expect(mockConsoleLog).toHaveBeenCalledWith('切换到配置文件失败：Profile not found')
    })

    it('should warn when specified profile does not exist', async () => {
      mockClaudeCodeConfigManager.switchProfile.mockResolvedValue({ success: true })

      await configSwitchCommand({ target: 'nonexistent', codeType: 'claude-code' })

      expect(mockClaudeCodeConfigManager.switchProfile).not.toHaveBeenCalled()
      expect(mockClaudeCodeConfigManager.applyProfileSettings).not.toHaveBeenCalled()
      expect(mockConsoleLog).toHaveBeenCalledWith('未找到配置：nonexistent')
    })
  })

  describe('claude Code interactive switch', () => {
    it('should show interactive selection menu', async () => {
      mockInquirer.prompt.mockResolvedValue({ selectedConfig: 'profile2' })

      await configSwitchCommand({ codeType: 'claude-code' })

      expect(mockInquirer.prompt).toHaveBeenCalledWith([{
        type: 'list',
        name: 'selectedConfig',
        message: '选择 Claude Code 配置：',
        choices: expect.arrayContaining([
          expect.objectContaining({ value: 'official' }),
          expect.objectContaining({ value: 'profile1' }),
          expect.objectContaining({ value: 'profile2' }),
        ]),
      }])
      expect(mockClaudeCodeConfigManager.switchProfile).toHaveBeenCalledWith('profile2')
    })

    it('should handle official login selection in interactive mode', async () => {
      mockInquirer.prompt.mockResolvedValue({ selectedConfig: 'official' })

      await configSwitchCommand({ codeType: 'claude-code' })

      expect(mockClaudeCodeConfigManager.switchToOfficial).toHaveBeenCalled()
    })

    it('should handle cancellation in interactive mode', async () => {
      mockInquirer.prompt.mockResolvedValue({ selectedConfig: undefined })

      await configSwitchCommand({ codeType: 'claude-code' })

      expect(mockConsoleLog).toHaveBeenCalledWith('已取消操作')
      expect(mockClaudeCodeConfigManager.switchProfile).not.toHaveBeenCalled()
    })

    it('should handle no available profiles', async () => {
      mockClaudeCodeConfigManager.readConfig.mockReturnValue(null)

      await configSwitchCommand({ codeType: 'claude-code' })

      expect(mockInquirer.prompt).not.toHaveBeenCalled()
      expect(mockConsoleLog).toHaveBeenCalledWith('没有可用的 Claude Code 配置文件')
    })

    it('should handle Ctrl+C exit gracefully', async () => {
      const exitError = new Error('User force closed the prompt with SIGINT')
      exitError.name = 'ExitPromptError'
      mockInquirer.prompt.mockRejectedValue(exitError)

      await configSwitchCommand({ codeType: 'claude-code' })

      expect(mockConsoleLog).toHaveBeenCalledWith('\n👋 感谢使用 ZCF！再见！')
    })

    it('should show current profile indicator in interactive choices', async () => {
      mockInquirer.prompt.mockResolvedValue({ selectedConfig: 'profile1' })

      await configSwitchCommand({ codeType: 'claude-code' })

      const promptCall = mockInquirer.prompt.mock.calls[0][0] as any

      // inquirer.prompt expects an array of prompts
      const promptArray = Array.isArray(promptCall) ? promptCall : [promptCall]
      const firstPrompt = promptArray[0]
      const choices = firstPrompt.choices

      expect(choices).toEqual(expect.arrayContaining([
        expect.objectContaining({
          name: expect.stringContaining('Test Profile 1'),
          value: 'profile1',
        }),
      ]))
    })
  })

  describe('code type resolution', () => {
    it('should use provided code type', async () => {
      const mockResolveCodeToolType = vi.mocked(resolveCodeToolType)
      mockResolveCodeToolType.mockReturnValue('claude-code')

      await configSwitchCommand({ list: true, codeType: 'claude-code' })

      expect(mockResolveCodeToolType).toHaveBeenCalledWith('claude-code')
    })

    it('should fallback to ZCF config code type', async () => {
      const mockReadZcfConfig = vi.mocked(readZcfConfig)
      mockReadZcfConfig.mockReturnValue({
        version: '1.0.0',
        preferredLang: 'zh-CN',
        codeToolType: 'claude-code',
        lastUpdated: new Date().toISOString(),
      })

      await configSwitchCommand({ list: true })

      expect(mockReadZcfConfig).toHaveBeenCalled()
    })

    it('should fallback to default code type', async () => {
      const mockReadZcfConfig = vi.mocked(readZcfConfig)
      mockReadZcfConfig.mockReturnValue({
        version: '1.0.0',
        preferredLang: 'zh-CN',
        codeToolType: 'claude-code',
        lastUpdated: new Date().toISOString(),
      })

      await configSwitchCommand({ list: true })

      // Should use DEFAULT_CODE_TOOL_TYPE ('claude-code')
      expect(mockClaudeCodeConfigManager.readConfig).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should handle read config errors', async () => {
      const error = new Error('Failed to read config')
      mockClaudeCodeConfigManager.readConfig.mockImplementation(() => {
        throw error
      })

      await expect(configSwitchCommand({ list: true, codeType: 'claude-code' })).rejects.toThrow('Failed to read config')
    })

    it('should handle switch operation errors', async () => {
      const error = new Error('Failed to switch profile')
      mockClaudeCodeConfigManager.switchProfile.mockRejectedValue(error)

      await expect(configSwitchCommand({ target: 'profile1', codeType: 'claude-code' })).rejects.toThrow('Failed to switch profile')
    })

    it('should handle interactive prompt errors', async () => {
      const error = new Error('Prompt failed')
      mockInquirer.prompt.mockRejectedValue(error)

      await expect(configSwitchCommand({ codeType: 'claude-code' })).rejects.toThrow('Prompt failed')
    })
  })
})
