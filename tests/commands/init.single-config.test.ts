import type { ClaudeCodeProfile } from '../../src/types/claude-code-config'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
// Import functions under test
import { init } from '../../src/commands/init'

// Mock external dependencies
vi.mock('../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  i18n: {
    t: vi.fn((key: string, params?: any) => {
      const translations: Record<string, string> = {
        'configuration:singleConfigSaved': `配置 ${params?.name || 'test'} 已保存`,
        'configuration:singleConfigSaveFailed': '配置保存失败',
        'common:cancelled': '已取消操作',
        'api:officialLoginConfigured': '官方登录配置成功',
        'installation:claudeCodeInstalled': 'Claude Code 安装成功',
      }
      return translations[key] || key
    }),
    language: 'zh-CN',
  },
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
    dim: vi.fn((str: string) => str),
  },
}))

vi.mock('../../src/utils/banner', () => ({
  displayBannerWithInfo: vi.fn(),
}))

vi.mock('../../src/utils/config', () => ({
  ensureClaudeDir: vi.fn(),
  configureApi: vi.fn((apiConfig: any) => apiConfig),
  copyConfigFiles: vi.fn(),
  applyAiLanguageDirective: vi.fn(),
  updateCustomModel: vi.fn(),
}))

vi.mock('../../src/utils/installer', () => ({
  getInstallationStatus: vi.fn(() => ({
    hasGlobal: true,
    hasLocal: false,
    globalPath: '/usr/local/bin/claude-code',
  })),
  installClaudeCode: vi.fn(),
}))

vi.mock('../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn(() => ({
    version: '1.0.0',
    preferredLang: 'zh-CN',
    codeToolType: 'claude-code',
    lastUpdated: new Date().toISOString(),
  })),
  updateZcfConfig: vi.fn(),
}))

vi.mock('../../src/utils/auto-updater', () => ({
  checkClaudeCodeVersionAndPrompt: vi.fn(),
  updateClaudeCode: vi.fn(),
}))

vi.mock('../../src/utils/output-style', () => ({
  configureOutputStyle: vi.fn(),
}))

vi.mock('../../src/utils/workflow-installer', () => ({
  selectAndInstallWorkflows: vi.fn(),
}))

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => false), // Simulate new installation
}))

// Mock ClaudeCodeConfigManager
const mockAddProfile = vi.fn()
const mockSwitchProfile = vi.fn()
const mockApplyProfileSettings = vi.fn()
const mockGetProfileByName = vi.fn()

vi.mock('../../src/utils/claude-code-config-manager', () => ({
  ClaudeCodeConfigManager: {
    addProfile: mockAddProfile,
    switchProfile: mockSwitchProfile,
    applyProfileSettings: mockApplyProfileSettings,
    getProfileByName: mockGetProfileByName,
    generateProfileId: vi.fn((name: string) => name.toLowerCase().replace(/\s+/g, '-')),
  },
}))

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

describe('init command - Single Config Save', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: successful profile addition
    mockAddProfile.mockResolvedValue({
      success: true,
      addedProfile: {
        id: '302ai',
        name: '302ai',
        authType: 'api_key',
        apiKey: 'test-key',
        baseUrl: 'https://test.com/v1',
      } as ClaudeCodeProfile,
    })
    mockGetProfileByName.mockReturnValue(null)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('provider-based Configuration', () => {
    it('should save provider configuration to TOML config', async () => {
      await init({
        skipPrompt: true,
        skipBanner: true,
        provider: '302ai',
        apiKey: 'sk-test-key',
        configAction: 'new',
        workflows: false,
        mcpServices: false,
        installCometixLine: false,
      })

      // Verify addProfile was called with correct profile
      expect(mockAddProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '302ai',
          authType: 'api_key',
          apiKey: 'sk-test-key',
        }),
      )

      // Verify profile was set as default
      expect(mockSwitchProfile).toHaveBeenCalledWith('302ai')
      expect(mockApplyProfileSettings).toHaveBeenCalled()

      // Verify success message
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('配置 302ai 已保存'),
      )
    })

    it('should save custom provider configuration', async () => {
      await init({
        skipPrompt: true,
        skipBanner: true,
        provider: 'custom',
        apiKey: 'custom-key',
        apiUrl: 'https://custom.com/v1',
        configAction: 'new',
        workflows: false,
        mcpServices: false,
        installCometixLine: false,
      })

      // Verify custom config name
      expect(mockAddProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'custom-config',
          authType: 'api_key',
          apiKey: 'custom-key',
          baseUrl: 'https://custom.com/v1',
        }),
      )
    })

    it('should include model configuration in profile', async () => {
      await init({
        skipPrompt: true,
        skipBanner: true,
        provider: '302ai',
        apiKey: 'sk-test-key',
        apiModel: 'claude-sonnet-4-5',
        apiFastModel: 'claude-haiku-4-5',
        configAction: 'new',
        workflows: false,
        mcpServices: false,
        installCometixLine: false,
      })

      // Verify models are included
      expect(mockAddProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          primaryModel: 'claude-sonnet-4-5',
          fastModel: 'claude-haiku-4-5',
        }),
      )
    })
  })

  describe('aPI Type Configuration', () => {
    it('should save auth_token configuration', async () => {
      await init({
        skipPrompt: true,
        skipBanner: true,
        apiType: 'auth_token',
        apiKey: 'token-12345',
        configAction: 'new',
        workflows: false,
        mcpServices: false,
        installCometixLine: false,
      })

      // Verify auth_token config
      expect(mockAddProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'custom-config',
          authType: 'auth_token',
          apiKey: 'token-12345',
        }),
      )
    })

    it('should save api_key configuration', async () => {
      await init({
        skipPrompt: true,
        skipBanner: true,
        apiType: 'api_key',
        apiKey: 'sk-api-key',
        apiUrl: 'https://api.example.com/v1',
        configAction: 'new',
        workflows: false,
        mcpServices: false,
        installCometixLine: false,
      })

      // Verify api_key config
      expect(mockAddProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'custom-config',
          authType: 'api_key',
          apiKey: 'sk-api-key',
          baseUrl: 'https://api.example.com/v1',
        }),
      )
    })
  })

  describe('error Handling', () => {
    it('should handle profile addition failure gracefully', async () => {
      mockAddProfile.mockResolvedValue({
        success: false,
        error: 'Profile already exists',
      })

      await init({
        skipPrompt: true,
        skipBanner: true,
        provider: '302ai',
        apiKey: 'sk-test-key',
        configAction: 'new',
        workflows: false,
        mcpServices: false,
        installCometixLine: false,
      })

      // Verify warning message
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('配置保存失败'),
      )

      // Verify profile switching was not attempted
      expect(mockSwitchProfile).not.toHaveBeenCalled()
    })

    it('should handle unexpected errors during save', async () => {
      mockAddProfile.mockRejectedValue(new Error('Unexpected error'))

      await init({
        skipPrompt: true,
        skipBanner: true,
        provider: '302ai',
        apiKey: 'sk-test-key',
        configAction: 'new',
        workflows: false,
        mcpServices: false,
        installCometixLine: false,
      })

      // Verify error warning
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Unexpected error'),
      )
    })

    it('should continue with settings.json update even if TOML save fails', async () => {
      const { configureApi } = await import('../../src/utils/config')
      const mockConfigureApi = vi.mocked(configureApi)

      mockAddProfile.mockRejectedValue(new Error('TOML write failed'))

      await init({
        skipPrompt: true,
        skipBanner: true,
        provider: '302ai',
        apiKey: 'sk-test-key',
        configAction: 'new',
        workflows: false,
        mcpServices: false,
        installCometixLine: false,
      })

      // Verify configureApi was still called
      expect(mockConfigureApi).toHaveBeenCalled()
    })
  })

  describe('profile Switching', () => {
    it('should switch to newly added profile', async () => {
      const testProfile: ClaudeCodeProfile = {
        id: '302ai',
        name: '302ai',
        authType: 'api_key',
        apiKey: 'sk-test-key',
        baseUrl: 'https://api.302.ai/v1',
      }

      mockAddProfile.mockResolvedValue({
        success: true,
        addedProfile: testProfile,
      })

      await init({
        skipPrompt: true,
        skipBanner: true,
        provider: '302ai',
        apiKey: 'sk-test-key',
        configAction: 'new',
        workflows: false,
        mcpServices: false,
        installCometixLine: false,
      })

      // Verify profile switching
      expect(mockSwitchProfile).toHaveBeenCalledWith('302ai')
      expect(mockApplyProfileSettings).toHaveBeenCalledWith(testProfile)
    })

    it('should fallback to getProfileByName if addedProfile is not returned', async () => {
      const testProfile: ClaudeCodeProfile = {
        id: 'glm',
        name: 'glm',
        authType: 'api_key',
        apiKey: 'sk-glm-key',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4/',
      }

      mockAddProfile.mockResolvedValue({
        success: true,
        addedProfile: undefined,
      })

      mockGetProfileByName.mockReturnValue(testProfile)

      await init({
        skipPrompt: true,
        skipBanner: true,
        provider: 'glm',
        apiKey: 'sk-glm-key',
        configAction: 'new',
        workflows: false,
        mcpServices: false,
        installCometixLine: false,
      })

      // Verify getProfileByName was called
      expect(mockGetProfileByName).toHaveBeenCalledWith('glm')
      expect(mockSwitchProfile).toHaveBeenCalledWith('glm')
      expect(mockApplyProfileSettings).toHaveBeenCalledWith(testProfile)
    })

    it('should not switch profile if id is missing', async () => {
      mockAddProfile.mockResolvedValue({
        success: true,
        addedProfile: {
          name: 'test',
          authType: 'api_key',
          apiKey: 'key',
        } as ClaudeCodeProfile,
      })

      mockGetProfileByName.mockReturnValue({
        name: 'test',
        authType: 'api_key',
        apiKey: 'key',
      } as ClaudeCodeProfile)

      await init({
        skipPrompt: true,
        skipBanner: true,
        provider: 'custom',
        apiKey: 'key',
        configAction: 'new',
        workflows: false,
        mcpServices: false,
        installCometixLine: false,
      })

      // Verify switching was not attempted
      expect(mockSwitchProfile).not.toHaveBeenCalled()
      expect(mockApplyProfileSettings).not.toHaveBeenCalled()
    })
  })
})
