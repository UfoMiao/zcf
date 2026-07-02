import type { AiOutputLanguage, SupportedLang } from '../../../../src/constants'
import inquirer from 'inquirer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  configureCodebuddyApi,
  configureCodebuddyMcp,
  ensureCodebuddyMd,
  readCodebuddyConfig,
  runCodebuddyFullInit,
  runCodebuddyUninstall,
  runCodebuddyUpdate,
} from '../../../../src/utils/code-tools/codebuddy'

// Mock dependencies
vi.mock('../../../../src/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../src/constants')>()
  return {
    ...actual,
    CODEBUDDY_DIR: '/test/.codebuddy',
    CODEBUDDY_MD_FILE: '/test/.codebuddy/CODEBUDDY.md',
    CODEBUDDY_MCP_FILE: '/test/.codebuddy/.mcp.json',
    CODEBUDDY_SETTINGS_FILE: '/test/.codebuddy/settings.json',
  }
})

vi.mock('../../../../src/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../src/i18n')>()
  return {
    ...actual,
    ensureI18nInitialized: vi.fn(),
  }
})

vi.mock('../../../../src/utils/fs-operations', () => ({
  ensureDir: vi.fn(),
  exists: vi.fn(),
  writeFile: vi.fn(),
}))

vi.mock('../../../../src/utils/zcf-config', () => ({
  updateZcfConfig: vi.fn(),
}))

vi.mock('../../../../src/utils/prompt-helpers', () => ({
  addNumbersToChoices: vi.fn((choices: any[]) => choices),
}))

vi.mock('../../../../src/utils/toggle-prompt', () => ({
  promptBoolean: vi.fn(),
}))

vi.mock('inquirer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('inquirer')>()
  return {
    ...actual,
    default: {
      prompt: vi.fn(),
    },
  }
})

vi.mock('../../../../src/utils/code-tools/codebuddy-config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../src/utils/code-tools/codebuddy-config')>()
  return {
    ...actual,
    readSettings: vi.fn(),
  }
})

vi.mock('../../../../src/utils/code-tools/codebuddy-config-manager', () => ({
  CodeBuddyConfigManager: {
    applyProfileSettings: vi.fn(),
    applyCurrentProfile: vi.fn(),
  },
}))

vi.mock('../../../../src/utils/platform', () => ({
  getPlatform: vi.fn(() => 'macos'),
  isWindows: vi.fn(() => false),
  getSystemRoot: vi.fn(() => 'C:\\Windows'),
}))

vi.mock('../../../../src/config/mcp-services', () => ({
  getMcpServices: vi.fn(() => []),
  MCP_SERVICE_CONFIGS: {},
}))

vi.mock('../../../../src/utils/mcp-selector', () => ({
  selectMcpServices: vi.fn(() => []),
}))

vi.mock('../../../../src/utils/json-config', () => ({
  readJsonConfig: vi.fn(),
  writeJsonConfig: vi.fn(),
  backupJsonConfig: vi.fn(),
}))

const mockFs = vi.mocked(await import('../../../../src/utils/fs-operations'))
const mockInquirerPrompt = inquirer.prompt as any
const mockTogglePrompt = vi.mocked(await import('../../../../src/utils/toggle-prompt'))
const mockZcfConfig = vi.mocked(await import('../../../../src/utils/zcf-config'))
const mockConfigManager = vi.mocked(await import('../../../../src/utils/code-tools/codebuddy-config-manager'))
const mockReadSettings = vi.mocked((await import('../../../../src/utils/code-tools/codebuddy-config')).readSettings)

describe('codebuddy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('runCodebuddyFullInit', () => {
    it('should run full initialization with default options', async () => {
      mockFs.exists.mockReturnValue(false)
      mockInquirerPrompt.mockResolvedValue({ apiChoice: 'skip' } as any)

      await runCodebuddyFullInit()

      expect(mockFs.ensureDir).toHaveBeenCalledWith('/test/.codebuddy')
      expect(mockFs.writeFile).toHaveBeenCalledWith('/test/.codebuddy/CODEBUDDY.md', '# CodeBuddy Instructions\n')
      expect(mockConfigManager.CodeBuddyConfigManager.applyProfileSettings).not.toHaveBeenCalled()
      expect(mockZcfConfig.updateZcfConfig).toHaveBeenCalledWith(expect.objectContaining({
        codeToolType: 'codebuddy',
      }))
    })

    it('should create Chinese language directive when aiOutputLang is zh-CN', async () => {
      mockFs.exists.mockReturnValue(false)
      mockInquirerPrompt.mockResolvedValue({ apiChoice: 'skip' } as any)

      await runCodebuddyFullInit({ configLang: 'zh-CN' as SupportedLang, aiOutputLang: 'zh-CN' as AiOutputLanguage })

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/.codebuddy/CODEBUDDY.md',
        '**Most Important: Always respond in Chinese-simplified**\n',
      )
      expect(mockZcfConfig.updateZcfConfig).toHaveBeenCalledWith(expect.objectContaining({
        templateLang: 'zh-CN',
        codeToolType: 'codebuddy',
      }))
    })

    it('should create English language directive when aiOutputLang is en', async () => {
      mockFs.exists.mockReturnValue(false)
      mockInquirerPrompt.mockResolvedValue({ apiChoice: 'skip' } as any)

      await runCodebuddyFullInit({ aiOutputLang: 'en' as AiOutputLanguage })

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/.codebuddy/CODEBUDDY.md',
        '**Most Important: Always respond in English**\n',
      )
    })

    it('should use English fallback for unsupported configLang', async () => {
      mockFs.exists.mockReturnValue(false)
      mockInquirerPrompt.mockResolvedValue({ apiChoice: 'skip' } as any)

      await runCodebuddyFullInit({ configLang: 'ja' as SupportedLang })

      expect(mockZcfConfig.updateZcfConfig).toHaveBeenCalledWith(expect.objectContaining({
        templateLang: 'en',
      }))
    })

    it('should apply API settings in non-interactive mode', async () => {
      mockFs.exists.mockReturnValue(true)

      await runCodebuddyFullInit({
        skipPrompt: true,
        apiType: 'api_key',
        apiKey: 'sk-test',
        apiUrl: 'https://api.example.com',
        apiModel: 'claude-sonnet-4',
      })

      expect(mockConfigManager.CodeBuddyConfigManager.applyProfileSettings).toHaveBeenCalledWith(expect.objectContaining({
        name: 'default',
        authType: 'api_key',
        apiKey: 'sk-test',
        baseUrl: 'https://api.example.com',
        primaryModel: 'claude-sonnet-4',
      }))
    })

    it('should fall back to interactive API setup when apiType is not provided even in skip-prompt mode', async () => {
      mockFs.exists.mockReturnValue(true)
      mockInquirerPrompt.mockResolvedValue({ apiChoice: 'skip' } as any)

      await runCodebuddyFullInit({ skipPrompt: true })

      expect(mockInquirerPrompt).toHaveBeenCalled()
      expect(mockConfigManager.CodeBuddyConfigManager.applyProfileSettings).not.toHaveBeenCalled()
    })

    it('should skip MCP when mcpServices is skip', async () => {
      mockFs.exists.mockReturnValue(true)
      mockInquirerPrompt.mockResolvedValue({ apiChoice: 'skip' } as any)

      await runCodebuddyFullInit({ mcpServices: 'skip' })

      // MCP import should not happen, but API prompts still run
      expect(mockInquirerPrompt).toHaveBeenCalled()
    })
  })

  describe('runCodebuddyUpdate', () => {
    it('should update CodeBuddy when CODEBUDDY.md exists', async () => {
      mockFs.exists.mockReturnValue(true)

      const result = await runCodebuddyUpdate(false, false)

      expect(result).toBe(true)
      expect(mockConfigManager.CodeBuddyConfigManager.applyCurrentProfile).toHaveBeenCalled()
    })

    it('should create CODEBUDDY.md when missing and skipPrompt is false', async () => {
      mockFs.exists.mockReturnValue(false)

      const result = await runCodebuddyUpdate(false, false)

      expect(result).toBe(true)
      expect(mockFs.writeFile).toHaveBeenCalledWith('/test/.codebuddy/CODEBUDDY.md', '# CodeBuddy Instructions\n')
      expect(mockConfigManager.CodeBuddyConfigManager.applyCurrentProfile).toHaveBeenCalled()
    })

    it('should not display banner when skipBanner is true', async () => {
      mockFs.exists.mockReturnValue(true)
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await runCodebuddyUpdate(true, false)

      expect(mockConfigManager.CodeBuddyConfigManager.applyCurrentProfile).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('runCodebuddyUninstall', () => {
    it('should uninstall when confirmed', async () => {
      mockTogglePrompt.promptBoolean.mockResolvedValue(true)

      await runCodebuddyUninstall()

      expect(mockConfigManager.CodeBuddyConfigManager.applyProfileSettings).toHaveBeenCalledWith(null)
      expect(mockZcfConfig.updateZcfConfig).toHaveBeenCalledWith({ codeToolType: 'claude-code' })
    })

    it('should cancel uninstall when not confirmed', async () => {
      mockTogglePrompt.promptBoolean.mockResolvedValue(false)

      await runCodebuddyUninstall()

      expect(mockConfigManager.CodeBuddyConfigManager.applyProfileSettings).not.toHaveBeenCalled()
      expect(mockZcfConfig.updateZcfConfig).not.toHaveBeenCalled()
    })
  })

  describe('configureCodebuddyApi', () => {
    it('should apply profile in non-interactive mode with api_key', async () => {
      await configureCodebuddyApi({
        skipPrompt: true,
        apiType: 'api_key',
        apiKey: 'sk-test',
        apiUrl: 'https://api.example.com',
      })

      expect(mockConfigManager.CodeBuddyConfigManager.applyProfileSettings).toHaveBeenCalledWith({
        name: 'default',
        authType: 'api_key',
        apiKey: 'sk-test',
        baseUrl: 'https://api.example.com',
        primaryModel: undefined,
        defaultHaikuModel: undefined,
        defaultSonnetModel: undefined,
        defaultOpusModel: undefined,
      })
    })

    it('should apply profile in non-interactive mode with auth_token', async () => {
      await configureCodebuddyApi({
        skipPrompt: true,
        apiType: 'auth_token',
        apiKey: 'token-123',
      })

      expect(mockConfigManager.CodeBuddyConfigManager.applyProfileSettings).toHaveBeenCalledWith(expect.objectContaining({
        name: 'default',
        authType: 'auth_token',
        apiKey: 'token-123',
      }))
    })

    it('should skip when user selects skip in interactive mode', async () => {
      mockInquirerPrompt.mockResolvedValue({ apiChoice: 'skip' } as any)

      await configureCodebuddyApi({})

      expect(mockConfigManager.CodeBuddyConfigManager.applyProfileSettings).not.toHaveBeenCalled()
    })

    it('should apply API key and URL from interactive prompts', async () => {
      mockInquirerPrompt
        .mockResolvedValueOnce({ apiChoice: 'api_key' } as any)
        .mockResolvedValueOnce({ apiKey: 'sk-interactive' } as any)
        .mockResolvedValueOnce({ apiUrl: 'https://interactive.example.com' } as any)
        .mockResolvedValueOnce({ primaryModel: '' } as any)
        .mockResolvedValueOnce({ haikuModel: '' } as any)
        .mockResolvedValueOnce({ sonnetModel: '' } as any)
        .mockResolvedValueOnce({ opusModel: '' } as any)

      await configureCodebuddyApi({})

      expect(mockConfigManager.CodeBuddyConfigManager.applyProfileSettings).toHaveBeenCalledWith({
        name: 'default',
        authType: 'api_key',
        apiKey: 'sk-interactive',
        baseUrl: 'https://interactive.example.com',
        primaryModel: undefined,
        defaultHaikuModel: undefined,
        defaultSonnetModel: undefined,
        defaultOpusModel: undefined,
      })
    })

    it('should handle empty API key and URL', async () => {
      mockInquirerPrompt
        .mockResolvedValueOnce({ apiChoice: 'api_key' } as any)
        .mockResolvedValueOnce({ apiKey: '' } as any)
        .mockResolvedValueOnce({ apiUrl: '' } as any)
        .mockResolvedValueOnce({ primaryModel: '' } as any)
        .mockResolvedValueOnce({ haikuModel: '' } as any)
        .mockResolvedValueOnce({ sonnetModel: '' } as any)
        .mockResolvedValueOnce({ opusModel: '' } as any)

      await configureCodebuddyApi({})

      expect(mockConfigManager.CodeBuddyConfigManager.applyProfileSettings).toHaveBeenCalledWith({
        name: 'default',
        authType: 'api_key',
        apiKey: undefined,
        baseUrl: undefined,
        primaryModel: undefined,
        defaultHaikuModel: undefined,
        defaultSonnetModel: undefined,
        defaultOpusModel: undefined,
      })
    })
  })

  describe('configureCodebuddyMcp', () => {
    it('should skip when mcpServices is skip', async () => {
      await configureCodebuddyMcp({ mcpServices: 'skip' })

      // No imports should happen
      expect(mockFs.writeFile).not.toHaveBeenCalled()
    })

    it('should skip in non-interactive mode', async () => {
      await configureCodebuddyMcp({ _skipPrompt: true })

      expect(mockFs.writeFile).not.toHaveBeenCalled()
    })

    it('should skip when selected services array is empty', async () => {
      const { getMcpServices } = await import('../../../../src/config/mcp-services')
      const { selectMcpServices } = await import('../../../../src/utils/mcp-selector')
      vi.mocked(getMcpServices as any).mockResolvedValue([])
      vi.mocked(selectMcpServices as any).mockResolvedValue([])

      await configureCodebuddyMcp({})

      expect(selectMcpServices).toHaveBeenCalled()
    })

    it('should skip unknown selected service ids', async () => {
      const { getMcpServices } = await import('../../../../src/config/mcp-services')
      const { selectMcpServices } = await import('../../../../src/utils/mcp-selector')
      const mockJsonConfig = vi.mocked(await import('../../../../src/utils/json-config'))

      vi.mocked(getMcpServices as any).mockResolvedValue([])
      vi.mocked(selectMcpServices as any).mockResolvedValue(['unknown-server'])
      mockJsonConfig.readJsonConfig.mockReturnValue(null)

      await configureCodebuddyMcp({})

      expect(mockJsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        '/test/.codebuddy/.mcp.json',
        { mcpServers: {} },
      )
    })

    it('should skip service config update when apiKey prompt is cancelled', async () => {
      const { getMcpServices } = await import('../../../../src/config/mcp-services')
      const { selectMcpServices } = await import('../../../../src/utils/mcp-selector')
      const mockJsonConfig = vi.mocked(await import('../../../../src/utils/json-config'))

      vi.mocked(getMcpServices as any).mockResolvedValue([
        {
          id: 'key-server',
          name: { 'en': 'Key Server', 'zh-CN': 'Key 服务' },
          description: { 'en': 'Key', 'zh-CN': 'Key' },
          requiresApiKey: true,
          apiKeyPrompt: 'Enter key',
          apiKeyPlaceholder: 'YOUR_KEY',
          config: { type: 'stdio', command: 'npx', args: ['-y', 'key-server'] },
        },
      ])
      vi.mocked(selectMcpServices as any).mockResolvedValue(['key-server'])
      mockInquirerPrompt.mockResolvedValue({ apiKey: '' } as any)
      mockJsonConfig.readJsonConfig.mockReturnValue(null)

      await configureCodebuddyMcp({})

      expect(mockJsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        '/test/.codebuddy/.mcp.json',
        expect.objectContaining({
          mcpServers: expect.objectContaining({
            'key-server': expect.objectContaining({ args: ['-y', 'key-server'] }),
          }),
        }),
      )
    })

    it('should configure selected MCP services', async () => {
      const { getMcpServices } = await import('../../../../src/config/mcp-services')
      const { selectMcpServices } = await import('../../../../src/utils/mcp-selector')
      const mockJsonConfig = vi.mocked(await import('../../../../src/utils/json-config'))

      vi.mocked(getMcpServices as any).mockResolvedValue([
        {
          id: 'test-server',
          name: { 'en': 'Test Server', 'zh-CN': '测试服务' },
          description: { 'en': 'Test', 'zh-CN': '测试' },
          requiresApiKey: false,
          config: { type: 'stdio', command: 'npx', args: ['-y', 'test-server'] },
        },
      ])
      vi.mocked(selectMcpServices as any).mockResolvedValue(['test-server'])
      mockJsonConfig.readJsonConfig.mockReturnValue(null)
      mockJsonConfig.backupJsonConfig.mockReturnValue('/test/.codebuddy/backup/.mcp.json.123')

      await configureCodebuddyMcp({})

      expect(mockJsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        '/test/.codebuddy/.mcp.json',
        expect.objectContaining({
          mcpServers: expect.objectContaining({
            'test-server': expect.objectContaining({ command: 'npx' }),
          }),
        }),
      )
    })

    it('should prompt for API key when service requires it', async () => {
      const { getMcpServices } = await import('../../../../src/config/mcp-services')
      const { selectMcpServices } = await import('../../../../src/utils/mcp-selector')
      const mockJsonConfig = vi.mocked(await import('../../../../src/utils/json-config'))

      vi.mocked(getMcpServices as any).mockResolvedValue([
        {
          id: 'exa-server',
          name: { 'en': 'Exa Server', 'zh-CN': 'Exa 服务' },
          description: { 'en': 'Exa', 'zh-CN': 'Exa' },
          requiresApiKey: true,
          apiKeyPrompt: 'Enter Exa API key',
          apiKeyPlaceholder: 'YOUR_EXA_API_KEY',
          apiKeyEnvVar: 'EXA_API_KEY',
          config: { type: 'stdio', command: 'npx', args: ['-y', 'exa-server'], env: { EXA_API_KEY: 'YOUR_EXA_API_KEY' } },
        },
      ])
      vi.mocked(selectMcpServices as any).mockResolvedValue(['exa-server'])
      mockInquirerPrompt.mockResolvedValue({ apiKey: 'sk-exa' } as any)
      mockJsonConfig.readJsonConfig.mockReturnValue(null)
      mockJsonConfig.backupJsonConfig.mockReturnValue('/test/.codebuddy/backup/.mcp.json.123')

      await configureCodebuddyMcp({})

      expect(mockInquirerPrompt).toHaveBeenCalledWith(expect.objectContaining({
        name: 'apiKey',
        message: 'Enter Exa API key',
      }))
      expect(mockJsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        '/test/.codebuddy/.mcp.json',
        expect.objectContaining({
          mcpServers: expect.objectContaining({
            'exa-server': expect.objectContaining({
              env: { EXA_API_KEY: 'sk-exa' },
            }),
          }),
        }),
      )
    })

    it('should handle MCP configuration errors', async () => {
      const { getMcpServices } = await import('../../../../src/config/mcp-services')
      vi.mocked(getMcpServices as any).mockImplementation(() => {
        throw new Error('service load failed')
      })
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await configureCodebuddyMcp({})

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('configureCodebuddyMcp branch coverage', () => {
    it('should handle null selected services', async () => {
      const { getMcpServices } = await import('../../../../src/config/mcp-services')
      const { selectMcpServices } = await import('../../../../src/utils/mcp-selector')
      vi.mocked(getMcpServices as any).mockResolvedValue([])
      vi.mocked(selectMcpServices as any).mockResolvedValue(null)

      await configureCodebuddyMcp({})

      expect(selectMcpServices).toHaveBeenCalled()
    })

    it('should handle missing backup path gracefully', async () => {
      const { getMcpServices } = await import('../../../../src/config/mcp-services')
      const { selectMcpServices } = await import('../../../../src/utils/mcp-selector')
      const mockJsonConfig = vi.mocked(await import('../../../../src/utils/json-config'))

      vi.mocked(getMcpServices as any).mockResolvedValue([
        {
          id: 'test-server',
          name: { 'en': 'Test Server', 'zh-CN': '测试服务' },
          description: { 'en': 'Test', 'zh-CN': '测试' },
          requiresApiKey: false,
          config: { type: 'stdio', command: 'npx', args: ['-y', 'test-server'] },
        },
      ])
      vi.mocked(selectMcpServices as any).mockResolvedValue(['test-server'])
      mockJsonConfig.readJsonConfig.mockReturnValue(null)
      mockJsonConfig.backupJsonConfig.mockReturnValue(null)

      await configureCodebuddyMcp({})

      expect(mockJsonConfig.writeJsonConfig).toHaveBeenCalled()
    })

    it('should use fallback strings when i18n keys are missing', async () => {
      const { getMcpServices } = await import('../../../../src/config/mcp-services')
      const { selectMcpServices } = await import('../../../../src/utils/mcp-selector')
      const { i18n } = await import('../../../../src/i18n')
      const originalT = i18n.t
      i18n.t = vi.fn(() => undefined as any) as any

      vi.mocked(getMcpServices as any).mockResolvedValue([])
      vi.mocked(selectMcpServices as any).mockResolvedValue(null)

      await configureCodebuddyMcp({ mcpServices: 'skip' })

      i18n.t = originalT
      expect(getMcpServices).not.toHaveBeenCalled()
    })
  })

  describe('i18n fallback strings', () => {
    it('should use fallback strings when translations are missing', async () => {
      const { i18n } = await import('../../../../src/i18n')
      const originalT = i18n.t
      i18n.t = vi.fn(() => undefined as any) as any
      mockFs.exists.mockReturnValue(true)
      mockInquirerPrompt.mockResolvedValue({ apiChoice: 'skip' } as any)
      mockTogglePrompt.promptBoolean.mockResolvedValue(false)

      await runCodebuddyFullInit()
      await runCodebuddyUpdate(false, false)
      await runCodebuddyUninstall()

      i18n.t = originalT
      expect(mockZcfConfig.updateZcfConfig).toHaveBeenCalled()
    })
  })

  describe('readCodebuddyConfig', () => {
    it('should delegate to readSettings', () => {
      const settings = { env: { ANTHROPIC_API_KEY: 'sk-test' } }
      mockReadSettings.mockReturnValue(settings)

      const result = readCodebuddyConfig()

      expect(mockReadSettings).toHaveBeenCalled()
      expect(result).toBe(settings)
    })
  })

  describe('ensureCodebuddyMd', () => {
    it('should create file when it does not exist', async () => {
      mockFs.exists.mockReturnValue(false)

      await ensureCodebuddyMd('en')

      expect(mockFs.writeFile).toHaveBeenCalledWith('/test/.codebuddy/CODEBUDDY.md', '# CodeBuddy Instructions\n')
    })

    it('should not create file when it already exists', async () => {
      mockFs.exists.mockReturnValue(true)

      await ensureCodebuddyMd('en')

      expect(mockFs.writeFile).not.toHaveBeenCalled()
    })

    it('should create Chinese directive for zh-CN aiOutputLang', async () => {
      mockFs.exists.mockReturnValue(false)

      await ensureCodebuddyMd('en', 'zh-CN')

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/.codebuddy/CODEBUDDY.md',
        '**Most Important: Always respond in Chinese-simplified**\n',
      )
    })
  })
})
