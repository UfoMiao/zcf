import type { ClaudeConfiguration, McpServerConfig } from '../../../src/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addCompletedOnboarding,
  backupMcpConfig,
  buildMcpServerConfig,
  ensureApiKeyApproved,
  fixWindowsMcpConfig,
  getMcpConfigPath,
  manageApiKeyApproval,
  mergeMcpServers,
  readMcpConfig,
  removeApiKeyFromRejected,
  setPrimaryApiKey,
  writeMcpConfig,
} from '../../../src/utils/claude-config'

// Mock dependencies
vi.mock('../../../src/constants', () => ({
  ClAUDE_CONFIG_FILE: '/test/.claude.json',
  CLAUDE_DIR: '/test/.claude',
  CLAUDE_VSC_CONFIG_FILE: '/test/.claude/config.json',
}))

vi.mock('../../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  i18n: {
    t: vi.fn((key: string) => key),
  },
}))

vi.mock('../../../src/utils/json-config', () => ({
  readJsonConfig: vi.fn(),
  writeJsonConfig: vi.fn(),
  backupJsonConfig: vi.fn(),
}))

vi.mock('../../../src/utils/object-utils', () => ({
  deepClone: vi.fn(obj => JSON.parse(JSON.stringify(obj))),
}))

vi.mock('../../../src/utils/platform', () => ({
  getMcpCommand: vi.fn(() => ['npx']),
  isWindows: vi.fn(() => false),
}))

const mockJsonConfig = vi.mocked(await import('../../../src/utils/json-config'))
const mockPlatform = vi.mocked(await import('../../../src/utils/platform'))

describe('claude-config', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getMcpConfigPath', () => {
    it('should return correct config path', () => {
      expect(getMcpConfigPath()).toBe('/test/.claude.json')
    })
  })

  describe('readMcpConfig', () => {
    it('should read config from json file', () => {
      const mockConfig: ClaudeConfiguration = { mcpServers: {} }
      mockJsonConfig.readJsonConfig.mockReturnValue(mockConfig)

      const result = readMcpConfig()

      expect(mockJsonConfig.readJsonConfig).toHaveBeenCalledWith('/test/.claude.json')
      expect(result).toBe(mockConfig)
    })

    it('should return null when config does not exist', () => {
      mockJsonConfig.readJsonConfig.mockReturnValue(null)

      const result = readMcpConfig()

      expect(result).toBeNull()
    })
  })

  describe('writeMcpConfig', () => {
    it('should write config to json file', () => {
      const config: ClaudeConfiguration = { mcpServers: {} }

      writeMcpConfig(config)

      expect(mockJsonConfig.writeJsonConfig).toHaveBeenCalledWith('/test/.claude.json', config)
    })
  })

  describe('backupMcpConfig', () => {
    it('should create backup and return backup path', () => {
      const backupPath = '/test/.claude/backup/claude-20241130.json'
      mockJsonConfig.backupJsonConfig.mockReturnValue(backupPath)

      const result = backupMcpConfig()

      expect(mockJsonConfig.backupJsonConfig).toHaveBeenCalledWith(
        '/test/.claude.json',
        '/test/.claude/backup',
      )
      expect(result).toBe(backupPath)
    })

    it('should return null when backup fails', () => {
      mockJsonConfig.backupJsonConfig.mockReturnValue(null)

      const result = backupMcpConfig()

      expect(result).toBeNull()
    })
  })

  describe('mergeMcpServers', () => {
    it('should merge new servers into existing config', () => {
      const existingConfig: ClaudeConfiguration = {
        mcpServers: {
          'existing-server': { type: 'stdio', command: 'existing' },
        },
      }
      const newServers = {
        'new-server': { type: 'stdio' as const, command: 'new' },
      }

      const result = mergeMcpServers(existingConfig, newServers)

      expect(result.mcpServers).toEqual({
        'existing-server': { type: 'stdio', command: 'existing' },
        'new-server': { type: 'stdio', command: 'new' },
      })
    })

    it('should create new config when existing is null', () => {
      const newServers = {
        'new-server': { type: 'stdio' as const, command: 'new' },
      }

      const result = mergeMcpServers(null, newServers)

      expect(result).toEqual({
        mcpServers: {
          'new-server': { type: 'stdio', command: 'new' },
        },
      })
    })

    it('should initialize mcpServers when not present', () => {
      const existingConfig: ClaudeConfiguration = {} as any
      const newServers = {
        'new-server': { type: 'stdio' as const, command: 'new' },
      }

      const result = mergeMcpServers(existingConfig, newServers)

      expect(result.mcpServers).toEqual({
        'new-server': { type: 'stdio', command: 'new' },
      })
    })

    it('should overwrite existing servers with same name', () => {
      const existingConfig: ClaudeConfiguration = {
        mcpServers: {
          'same-server': { type: 'stdio', command: 'old', args: ['old'] },
        },
      }
      const newServers = {
        'same-server': { type: 'stdio' as const, command: 'new', args: ['new'] },
      }

      const result = mergeMcpServers(existingConfig, newServers)

      expect(result.mcpServers['same-server']).toEqual({
        type: 'stdio',
        command: 'new',
        args: ['new'],
      })
    })
  })

  describe('buildMcpServerConfig', () => {
    const baseConfig: McpServerConfig = {
      type: 'stdio',
      command: 'npx',
      args: ['some-mcp-server', '--api-key=YOUR_EXA_API_KEY'],
      url: 'https://api.example.com/YOUR_EXA_API_KEY',
    }

    it('should return config without modification when no API key provided', () => {
      const result = buildMcpServerConfig(baseConfig)

      expect(result).toEqual(baseConfig)
    })

    it('should replace placeholders with API key in args and url', () => {
      const apiKey = 'test-api-key'

      const result = buildMcpServerConfig(baseConfig, apiKey)

      expect(result.args).toEqual(['some-mcp-server', '--api-key=test-api-key'])
      expect(result.url).toBe('https://api.example.com/test-api-key')
    })

    it('should use environment variable when envVarName is specified', () => {
      const configWithEnv: McpServerConfig = {
        type: 'stdio',
        command: 'npx',
        env: {
          OTHER_VAR: 'value',
        },
      }
      const apiKey = 'test-api-key'
      const envVarName = 'API_KEY'

      const result = buildMcpServerConfig(configWithEnv, apiKey, 'placeholder', envVarName)

      expect(result.env).toEqual({
        OTHER_VAR: 'value',
        API_KEY: 'test-api-key',
      })
    })

    it('should apply Windows platform command when on Windows', () => {
      mockPlatform.isWindows.mockReturnValue(true)
      mockPlatform.getMcpCommand.mockReturnValue(['cmd', '/c', 'npx'])

      const result = buildMcpServerConfig(baseConfig)

      expect(result.command).toBe('cmd')
      expect(result.args).toEqual(['/c', 'npx', 'some-mcp-server', '--api-key=YOUR_EXA_API_KEY'])
    })

    it('should apply Windows platform command for uvx', () => {
      mockPlatform.isWindows.mockReturnValue(true)
      mockPlatform.getMcpCommand.mockReturnValue(['cmd', '/c', 'uvx'])

      const uvxConfig: McpServerConfig = {
        type: 'stdio',
        command: 'uvx',
        args: ['--from', 'git+https://github.com/example/repo', 'tool'],
      }

      const result = buildMcpServerConfig(uvxConfig)

      expect(result.command).toBe('cmd')
      expect(result.args).toEqual(['/c', 'uvx', '--from', 'git+https://github.com/example/repo', 'tool'])
    })

    it('should use custom placeholder', () => {
      const customConfig: McpServerConfig = {
        type: 'stdio',
        command: 'test',
        args: ['--key=CUSTOM_PLACEHOLDER'],
      }
      const apiKey = 'test-key'

      const result = buildMcpServerConfig(customConfig, apiKey, 'CUSTOM_PLACEHOLDER')

      expect(result.args).toEqual(['--key=test-key'])
    })
  })

  describe('fixWindowsMcpConfig', () => {
    it('should return config unchanged when not on Windows', () => {
      mockPlatform.isWindows.mockReturnValue(false)
      const config: ClaudeConfiguration = {
        mcpServers: {
          'test-server': { type: 'stdio', command: 'npx' },
        },
      }

      const result = fixWindowsMcpConfig(config)

      expect(result).toEqual(config)
    })

    it('should return config unchanged when no mcpServers', () => {
      mockPlatform.isWindows.mockReturnValue(true)
      const config: ClaudeConfiguration = {} as any

      const result = fixWindowsMcpConfig(config)

      expect(result).toEqual(config)
    })

    it('should fix command for Windows', () => {
      mockPlatform.isWindows.mockReturnValue(true)
      mockPlatform.getMcpCommand.mockReturnValue(['cmd', '/c', 'npx'])
      const config: ClaudeConfiguration = {
        mcpServers: {
          'test-server': { type: 'stdio', command: 'npx', args: ['test'] },
        },
      }

      const result = fixWindowsMcpConfig(config)

      expect(result.mcpServers['test-server']).toEqual({
        type: 'stdio',
        command: 'cmd',
        args: ['/c', 'npx', 'test'],
      })
    })

    it('should fix uvx command for Windows', () => {
      mockPlatform.isWindows.mockReturnValue(true)
      mockPlatform.getMcpCommand.mockImplementation((cmd) => {
        if (cmd === 'uvx')
          return ['cmd', '/c', 'uvx']
        return ['cmd', '/c', 'npx']
      })

      const config: ClaudeConfiguration = {
        mcpServers: {
          serena: { type: 'stdio', command: 'uvx', args: ['--from', 'git+https://github.com/oraios/serena', 'serena'] },
        },
      }

      const result = fixWindowsMcpConfig(config)

      expect(result.mcpServers.serena).toEqual({
        type: 'stdio',
        command: 'cmd',
        args: ['/c', 'uvx', '--from', 'git+https://github.com/oraios/serena', 'serena'],
      })
    })
  })

  describe('addCompletedOnboarding', () => {
    it('should add onboarding flag to new config', () => {
      mockJsonConfig.readJsonConfig.mockReturnValue(null)

      addCompletedOnboarding()

      expect(mockJsonConfig.writeJsonConfig).toHaveBeenCalledWith('/test/.claude.json', {
        mcpServers: {},
        hasCompletedOnboarding: true,
      })
    })

    it('should add onboarding flag to existing config', () => {
      const existingConfig: ClaudeConfiguration = {
        mcpServers: { test: { type: 'stdio' as const, command: 'test' } },
      }
      mockJsonConfig.readJsonConfig.mockReturnValue(existingConfig)

      addCompletedOnboarding()

      expect(mockJsonConfig.writeJsonConfig).toHaveBeenCalledWith('/test/.claude.json', {
        mcpServers: { test: { type: 'stdio', command: 'test' } },
        hasCompletedOnboarding: true,
      })
    })

    it('should not update when onboarding already completed', () => {
      const existingConfig: ClaudeConfiguration = {
        mcpServers: {},
        hasCompletedOnboarding: true,
      }
      mockJsonConfig.readJsonConfig.mockReturnValue(existingConfig)

      addCompletedOnboarding()

      expect(mockJsonConfig.writeJsonConfig).not.toHaveBeenCalled()
    })

    it('should handle errors gracefully', () => {
      mockJsonConfig.readJsonConfig.mockImplementation(() => {
        throw new Error('Read failed')
      })

      expect(() => addCompletedOnboarding()).toThrow('Read failed')
    })
  })

  describe('ensureApiKeyApproved', () => {
    const baseConfig: ClaudeConfiguration = {
      mcpServers: {},
      customApiKeyResponses: {
        approved: ['existing-key'],
        rejected: ['rejected-key'],
      },
    }

    it('should return config unchanged for invalid API key', () => {
      expect(ensureApiKeyApproved(baseConfig, '')).toBe(baseConfig)
      expect(ensureApiKeyApproved(baseConfig, '   ')).toBe(baseConfig)
    })

    it('should add API key to approved list', () => {
      const apiKey = 'new-test-api-key-12345'

      const result = ensureApiKeyApproved(baseConfig, apiKey)

      expect(result.customApiKeyResponses?.approved).toContain('new-test-api-key-123')
    })

    it('should remove API key from rejected list when adding to approved', () => {
      const apiKey = 'rejected-key'

      const result = ensureApiKeyApproved(baseConfig, apiKey)

      expect(result.customApiKeyResponses?.rejected).not.toContain('rejected-key')
      expect(result.customApiKeyResponses?.approved).toContain('rejected-key')
    })

    it('should initialize customApiKeyResponses when not present', () => {
      const configWithoutResponses: ClaudeConfiguration = { mcpServers: {} }
      const apiKey = 'test-key'

      const result = ensureApiKeyApproved(configWithoutResponses, apiKey)

      expect(result.customApiKeyResponses).toEqual({
        approved: ['test-key'],
        rejected: [],
      })
    })

    it('should handle missing approved array', () => {
      const configPartial: ClaudeConfiguration = {
        mcpServers: {},
        customApiKeyResponses: {
          rejected: ['test'],
        } as any,
      }
      const apiKey = 'test-key'

      const result = ensureApiKeyApproved(configPartial, apiKey)

      expect(result.customApiKeyResponses?.approved).toEqual(['test-key'])
    })

    it('should not duplicate API keys in approved list', () => {
      const apiKey = 'existing-key'

      const result = ensureApiKeyApproved(baseConfig, apiKey)

      expect(result.customApiKeyResponses?.approved.filter(k => k === 'existing-key')).toHaveLength(1)
    })

    it('should truncate long API keys to 20 characters', () => {
      const longApiKey = 'very-long-api-key-that-exceeds-twenty-characters'

      const result = ensureApiKeyApproved(baseConfig, longApiKey)

      expect(result.customApiKeyResponses?.approved).toContain('very-long-api-key-th')
    })
  })

  describe('removeApiKeyFromRejected', () => {
    // Note: This function modifies the rejected array, so we need fresh config for each test
    const createBaseConfig = (): ClaudeConfiguration => ({
      mcpServers: {},
      customApiKeyResponses: {
        approved: ['approved-key'],
        rejected: ['rejected-key', 'another-rejected'],
      },
    })

    it('should return config unchanged when customApiKeyResponses missing', () => {
      const configWithoutResponses: ClaudeConfiguration = { mcpServers: {} }

      const result = removeApiKeyFromRejected(configWithoutResponses, 'any-key')

      expect(result).toBe(configWithoutResponses)
    })

    it('should remove API key from rejected list', () => {
      const baseConfig = createBaseConfig()
      const apiKey = 'rejected-key'

      const result = removeApiKeyFromRejected(baseConfig, apiKey)

      expect(result.customApiKeyResponses?.rejected).not.toContain('rejected-key')
      expect(result.customApiKeyResponses?.rejected).toContain('another-rejected')
    })

    it('should handle API key not in rejected list', () => {
      const baseConfig = createBaseConfig()
      const apiKey = 'not-in-list'

      const result = removeApiKeyFromRejected(baseConfig, apiKey)

      // Should return a copy with same rejected keys when API key not found
      expect(result.customApiKeyResponses?.rejected).toEqual(['rejected-key', 'another-rejected'])
      expect(result).not.toBe(baseConfig) // Should be a copy, not the same object
    })

    it('should truncate long API keys to 20 characters', () => {
      const longApiKey = 'very-long-rejected-key-that-exceeds-twenty-characters'
      const configWithLongKey: ClaudeConfiguration = {
        mcpServers: {},
        customApiKeyResponses: {
          approved: [],
          rejected: ['very-long-rejected-k'],
        },
      }

      const result = removeApiKeyFromRejected(configWithLongKey, longApiKey)

      expect(result.customApiKeyResponses?.rejected).toEqual([])
    })
  })

  describe('manageApiKeyApproval', () => {
    it('should manage API key approval for new config', () => {
      mockJsonConfig.readJsonConfig.mockReturnValue(null)
      const apiKey = 'test-api-key'

      manageApiKeyApproval(apiKey)

      expect(mockJsonConfig.writeJsonConfig).toHaveBeenCalledWith('/test/.claude.json', {
        mcpServers: {},
        customApiKeyResponses: {
          approved: ['test-api-key'],
          rejected: [],
        },
      })
    })

    it('should manage API key approval for existing config', () => {
      const existingConfig: ClaudeConfiguration = {
        mcpServers: { test: { type: 'stdio' as const, command: 'test' } },
        customApiKeyResponses: {
          approved: [],
          rejected: ['test-api-key'],
        },
      }
      mockJsonConfig.readJsonConfig.mockReturnValue(existingConfig)
      const apiKey = 'test-api-key'

      manageApiKeyApproval(apiKey)

      expect(mockJsonConfig.writeJsonConfig).toHaveBeenCalledWith('/test/.claude.json', {
        mcpServers: { test: { type: 'stdio', command: 'test' } },
        customApiKeyResponses: {
          approved: ['test-api-key'],
          rejected: [],
        },
      })
    })

    it('should handle errors gracefully without throwing', () => {
      mockJsonConfig.readJsonConfig.mockImplementation(() => {
        throw new Error('Read failed')
      })
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => manageApiKeyApproval('test-key')).not.toThrow()
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('setPrimaryApiKey', () => {
    it('should set primaryApiKey to "zcf" for new config', () => {
      mockJsonConfig.readJsonConfig.mockReturnValue(null)

      setPrimaryApiKey()

      expect(mockJsonConfig.writeJsonConfig).toHaveBeenCalledWith('/test/.claude/config.json', {
        primaryApiKey: 'zcf',
      })
    })

    it('should set primaryApiKey to "zcf" for existing config', () => {
      const existingConfig = {
        someOtherField: 'value',
      }
      mockJsonConfig.readJsonConfig.mockReturnValue(existingConfig)

      setPrimaryApiKey()

      expect(mockJsonConfig.writeJsonConfig).toHaveBeenCalledWith('/test/.claude/config.json', {
        someOtherField: 'value',
        primaryApiKey: 'zcf',
      })
    })

    it('should overwrite existing primaryApiKey value', () => {
      const existingConfig = {
        primaryApiKey: 'old-value',
      }
      mockJsonConfig.readJsonConfig.mockReturnValue(existingConfig)

      setPrimaryApiKey()

      expect(mockJsonConfig.writeJsonConfig).toHaveBeenCalledWith('/test/.claude/config.json', {
        primaryApiKey: 'zcf',
      })
    })

    it('should preserve other config fields when setting primaryApiKey', () => {
      const existingConfig = {
        customField1: 'test1',
        customField2: { nested: 'value' },
        customField3: ['array', 'values'],
      }
      mockJsonConfig.readJsonConfig.mockReturnValue(existingConfig)

      setPrimaryApiKey()

      expect(mockJsonConfig.writeJsonConfig).toHaveBeenCalledWith('/test/.claude/config.json', {
        customField1: 'test1',
        customField2: { nested: 'value' },
        customField3: ['array', 'values'],
        primaryApiKey: 'zcf',
      })
    })

    it('should handle errors gracefully without throwing', () => {
      mockJsonConfig.readJsonConfig.mockImplementation(() => {
        throw new Error('Read failed')
      })
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => setPrimaryApiKey()).not.toThrow()
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should continue execution even if writeJsonConfig fails', () => {
      mockJsonConfig.readJsonConfig.mockReturnValue({})
      mockJsonConfig.writeJsonConfig.mockImplementation(() => {
        throw new Error('Write failed')
      })
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => setPrimaryApiKey()).not.toThrow()
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })
})
