import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getCurrentCodexProvider, listCodexProviders, switchCodexProvider } from '../../../../src/utils/code-tools/codex'
import * as fsOperations from '../../../../src/utils/fs-operations'

// Mock dependencies
vi.mock('../../../../src/utils/fs-operations')
vi.mock('../../../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  i18n: {
    t: vi.fn((key: string, params?: any) => {
      const translations: Record<string, string> = {
        'codex:backupSuccess': `✔ 已创建备份 ${params?.path || 'test-backup'}`,
        'codex:providerSwitchSuccess': `✔ 已切换到提供商：${params?.provider || 'test-provider'}`,
        'codex:providerNotFound': `❌ 提供商 '${params?.provider || 'unknown'}' 不存在`,
        'codex:configNotFound': '配置文件不存在',
      }
      return translations[key] || key
    }),
  },
}))

vi.mock('../../../../src/utils/code-tools/codex', async () => {
  const actual = await vi.importActual('../../../../src/utils/code-tools/codex')
  return {
    ...actual,
    backupCodexConfig: vi.fn(),
  }
})

const mockFs = vi.mocked(fsOperations)

describe('codex Provider Switch Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('getCurrentCodexProvider', () => {
    it('should return current provider from config', async () => {
      const mockConfig = `
model_provider = "custom-openai"

[model_providers.custom-openai]
name = "Custom OpenAI"
base_url = "https://api.openai.com/v1"
wire_api = "responses"
env_key = "CUSTOM_OPENAI_API_KEY"

[model_providers.claude-api]
name = "Claude API"
base_url = "https://api.anthropic.com"
wire_api = "responses"
env_key = "CLAUDE_API_API_KEY"
`

      mockFs.exists.mockReturnValue(true)
      mockFs.readFile.mockReturnValue(mockConfig)

      const result = await getCurrentCodexProvider()

      expect(result).toBe('custom-openai')
      expect(mockFs.exists).toHaveBeenCalledWith(expect.stringContaining('config.toml'))
      expect(mockFs.readFile).toHaveBeenCalledWith(expect.stringContaining('config.toml'))
    })

    it('should return null when config file does not exist', async () => {
      mockFs.exists.mockReturnValue(false)

      const result = await getCurrentCodexProvider()

      expect(result).toBeNull()
      expect(mockFs.exists).toHaveBeenCalledWith(expect.stringContaining('config.toml'))
      expect(mockFs.readFile).not.toHaveBeenCalled()
    })

    it('should return null when no model_provider is set', async () => {
      const mockConfig = `
[model_providers.custom-openai]
name = "Custom OpenAI"
base_url = "https://api.openai.com/v1"
`

      mockFs.exists.mockReturnValue(true)
      mockFs.readFile.mockReturnValue(mockConfig)

      const result = await getCurrentCodexProvider()

      expect(result).toBeNull()
    })
  })

  describe('listCodexProviders', () => {
    it('should return list of available providers', async () => {
      const mockConfig = `
model_provider = "custom-openai"

[model_providers.custom-openai]
name = "Custom OpenAI"
base_url = "https://api.openai.com/v1"
wire_api = "responses"
env_key = "CUSTOM_OPENAI_API_KEY"

[model_providers.claude-api]
name = "Claude API"
base_url = "https://api.anthropic.com"
wire_api = "responses"
env_key = "CLAUDE_API_API_KEY"
`

      mockFs.exists.mockReturnValue(true)
      mockFs.readFile.mockReturnValue(mockConfig)

      const result = await listCodexProviders()

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: 'custom-openai',
        name: 'Custom OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        wireApi: 'responses',
        envKey: 'CUSTOM_OPENAI_API_KEY',
        requiresOpenaiAuth: true,
      })
      expect(result[1]).toEqual({
        id: 'claude-api',
        name: 'Claude API',
        baseUrl: 'https://api.anthropic.com',
        wireApi: 'responses',
        envKey: 'CLAUDE_API_API_KEY',
        requiresOpenaiAuth: true,
      })
    })

    it('should return empty array when config file does not exist', async () => {
      mockFs.exists.mockReturnValue(false)

      const result = await listCodexProviders()

      expect(result).toEqual([])
    })

    it('should return empty array when no providers are configured', async () => {
      const mockConfig = 'model_provider = "openai"'

      mockFs.exists.mockReturnValue(true)
      mockFs.readFile.mockReturnValue(mockConfig)

      const result = await listCodexProviders()

      expect(result).toEqual([])
    })
  })

  describe('switchCodexProvider', () => {
    const mockConfig = `
model_provider = "custom-openai"

[model_providers.custom-openai]
name = "Custom OpenAI"
base_url = "https://api.openai.com/v1"
wire_api = "responses"
env_key = "CUSTOM_OPENAI_API_KEY"

[model_providers.claude-api]
name = "Claude API"
base_url = "https://api.anthropic.com"
wire_api = "responses"
env_key = "CLAUDE_API_API_KEY"
`

    beforeEach(() => {
      mockFs.exists.mockReturnValue(true)
      mockFs.readFile.mockReturnValue(mockConfig)
      mockFs.ensureDir.mockReturnValue(undefined)
      mockFs.writeFile.mockReturnValue(undefined)
    })

    it('should successfully switch to existing provider', async () => {
      const result = await switchCodexProvider('claude-api')

      expect(result).toBe(true)
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('config.toml'),
        expect.stringContaining('model_provider = "claude-api"'),
      )
    })

    it('should fail when switching to non-existent provider', async () => {
      const result = await switchCodexProvider('non-existent')

      expect(result).toBe(false)
      expect(mockFs.writeFile).not.toHaveBeenCalled()
    })

    it('should fail when config file does not exist', async () => {
      mockFs.exists.mockReturnValue(false)

      const result = await switchCodexProvider('claude-api')

      expect(result).toBe(false)
      expect(mockFs.writeFile).not.toHaveBeenCalled()
    })

    it('should fail when no providers are configured', async () => {
      mockFs.readFile.mockReturnValue('model_provider = "openai"')

      const result = await switchCodexProvider('claude-api')

      expect(result).toBe(false)
      expect(mockFs.writeFile).not.toHaveBeenCalled()
    })

    it('should handle provider names with special characters', async () => {
      const specialConfig = `
model_provider = "custom-openai"

[model_providers.test-provider_123]
name = "Test Provider 123"
base_url = "https://api.test.com/v1"
wire_api = "responses"
env_key = "TEST_PROVIDER_123_API_KEY"
`

      mockFs.readFile.mockReturnValue(specialConfig)

      const result = await switchCodexProvider('test-provider_123')

      expect(result).toBe(true)
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('config.toml'),
        expect.stringContaining('model_provider = "test-provider_123"'),
      )
    })
  })
})
