import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMcpService } from '../../../src/config/mcp-services'
import { ClAUDE_CONFIG_FILE } from '../../../src/constants'
import {
  backupMcpConfig,
  buildMcpServerConfig,
  fixWindowsMcpConfig,
  getMcpConfigPath,
  mergeMcpServers,
  readMcpConfig,
  writeMcpConfig,
} from '../../../src/utils/claude-config'
import * as jsonConfig from '../../../src/utils/json-config'
import * as objectUtils from '../../../src/utils/object-utils'
import * as platform from '../../../src/utils/platform'

vi.mock('../../../src/utils/json-config')
vi.mock('../../../src/utils/platform')
vi.mock('../../../src/utils/object-utils')
vi.mock('../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn().mockReturnValue({ preferredLang: 'en' }),
}))

// Mock i18n system
vi.mock('../../../src/i18n', () => ({
  initI18n: vi.fn().mockResolvedValue(undefined),
  i18n: {
    t: vi.fn((key: string) => key),
    isInitialized: true,
    language: 'en',
  },
  ensureI18nInitialized: vi.fn(),
}))

// Mock MCP services config
vi.mock('../../../src/config/mcp-services', () => ({
  getMcpServices: vi.fn().mockReturnValue([]),
  getMcpService: vi.fn().mockReturnValue(undefined),
}))

describe('mcp utilities', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    // Initialize i18n for test environment
    const { initI18n } = await import('../../../src/i18n')
    await initI18n('en')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getMcpConfigPath', () => {
    it('should return Claude config file path', () => {
      const result = getMcpConfigPath()
      expect(result).toBe(ClAUDE_CONFIG_FILE)
    })
  })

  describe('readMcpConfig', () => {
    it('should read MCP configuration', () => {
      const mockConfig = { mcpServers: { test: {} } }
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(mockConfig)

      const result = readMcpConfig()

      expect(result).toEqual(mockConfig)
      expect(jsonConfig.readJsonConfig).toHaveBeenCalledWith(ClAUDE_CONFIG_FILE)
    })

    it('should return null when no config exists', () => {
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(null)

      const result = readMcpConfig()

      expect(result).toBeNull()
    })
  })

  describe('writeMcpConfig', () => {
    it('should write MCP configuration', () => {
      const config = { mcpServers: { test: { type: 'stdio' } } }

      writeMcpConfig(config as any)

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(ClAUDE_CONFIG_FILE, config)
    })
  })

  describe('backupMcpConfig', () => {
    it('should backup MCP configuration', () => {
      vi.mocked(jsonConfig.backupJsonConfig).mockReturnValue('/backup/path')

      const result = backupMcpConfig()

      expect(result).toBe('/backup/path')
      expect(jsonConfig.backupJsonConfig).toHaveBeenCalledWith(
        ClAUDE_CONFIG_FILE,
        expect.stringContaining('backup'),
      )
    })
  })

  describe('mergeMcpServers', () => {
    it('should merge new servers into existing config', () => {
      const existing = {
        mcpServers: {
          server1: { type: 'stdio' as const, command: 'npx', args: ['server1'] },
        },
      }
      const newServers = {
        server2: { type: 'stdio' as const, command: 'npx', args: ['server2'] },
      }

      const result = mergeMcpServers(existing, newServers)

      expect(result.mcpServers).toEqual({
        server1: { type: 'stdio', command: 'npx', args: ['server1'] },
        server2: { type: 'stdio', command: 'npx', args: ['server2'] },
      })
    })

    it('should create mcpServers if not exists', () => {
      const existing = {}
      const newServers = {
        server1: { type: 'stdio' as const, command: 'npx', args: ['server1'] },
      }

      const result = mergeMcpServers(existing as any, newServers)

      expect(result.mcpServers).toEqual(newServers)
    })

    it('should handle null existing config', () => {
      const newServers = {
        server1: { type: 'stdio' as const, command: 'npx', args: ['server1'] },
      }

      const result = mergeMcpServers(null, newServers)

      expect(result.mcpServers).toEqual(newServers)
    })
  })

  describe('buildMcpServerConfig', () => {
    it('should build config without API key', () => {
      const baseConfig = { type: 'stdio' as const, command: 'npx', args: ['test'] }
      vi.mocked(objectUtils.deepClone).mockReturnValue({ ...baseConfig })
      vi.mocked(platform.isWindows).mockReturnValue(false)

      const result = buildMcpServerConfig(baseConfig)

      expect(result).toEqual(baseConfig)
    })

    it('should replace API key in args', () => {
      const baseConfig = {
        type: 'stdio' as const,
        command: 'npx',
        args: ['--api-key', 'YOUR_EXA_API_KEY'],
      }
      vi.mocked(objectUtils.deepClone).mockReturnValue({ ...baseConfig })
      vi.mocked(platform.isWindows).mockReturnValue(false)

      const result = buildMcpServerConfig(baseConfig, 'real-api-key')

      expect(result.args).toEqual(['--api-key', 'real-api-key'])
    })

    it('should replace API key in URL', () => {
      const baseConfig = {
        type: 'stdio' as const,
        command: 'npx',
        url: 'https://api.example.com?key=YOUR_EXA_API_KEY',
      }
      vi.mocked(objectUtils.deepClone).mockReturnValue({ ...baseConfig })
      vi.mocked(platform.isWindows).mockReturnValue(false)

      const result = buildMcpServerConfig(baseConfig, 'real-api-key')

      expect(result.url).toBe('https://api.example.com?key=real-api-key')
    })

    it('should apply Windows command transformation', () => {
      const baseConfig = { type: 'stdio' as const, command: 'npx', args: ['test'] }
      vi.mocked(objectUtils.deepClone).mockReturnValue({ ...baseConfig })
      vi.mocked(platform.isWindows).mockReturnValue(true)
      vi.mocked(platform.getMcpCommand).mockReturnValue(['cmd', '/c', 'npx'])

      const result = buildMcpServerConfig(baseConfig)

      expect(result.command).toBe('cmd')
      expect(result.args).toEqual(['/c', 'npx', 'test'])
    })

    it('should use custom placeholder', () => {
      const baseConfig = {
        type: 'stdio' as const,
        command: 'npx',
        args: ['--key', 'CUSTOM_PLACEHOLDER'],
      }
      vi.mocked(objectUtils.deepClone).mockReturnValue({ ...baseConfig })
      vi.mocked(platform.isWindows).mockReturnValue(false)

      const result = buildMcpServerConfig(baseConfig, 'api-key', 'CUSTOM_PLACEHOLDER')

      expect(result.args).toEqual(['--key', 'api-key'])
    })

    it('should set environment variable when envVarName is provided', () => {
      const baseConfig = {
        type: 'stdio' as const,
        command: 'npx',
        args: ['-y', 'exa-mcp-server'],
        env: { EXA_API_KEY: 'placeholder' },
      }
      vi.mocked(objectUtils.deepClone).mockReturnValue({ ...baseConfig })
      vi.mocked(platform.isWindows).mockReturnValue(false)

      const result = buildMcpServerConfig(baseConfig, 'test-api-key', 'placeholder', 'EXA_API_KEY')

      expect(result.env).toEqual({ EXA_API_KEY: 'test-api-key' })
    })

    it('should handle environment variable config on Windows', () => {
      const baseConfig = {
        type: 'stdio' as const,
        command: 'npx',
        args: ['-y', 'exa-mcp-server'],
        env: { EXA_API_KEY: 'placeholder' },
      }
      vi.mocked(objectUtils.deepClone).mockReturnValue({ ...baseConfig })
      vi.mocked(platform.isWindows).mockReturnValue(true)
      vi.mocked(platform.getMcpCommand).mockReturnValue(['cmd', '/c', 'npx'])

      const result = buildMcpServerConfig(baseConfig, 'test-api-key', 'placeholder', 'EXA_API_KEY')

      expect(result.command).toBe('cmd')
      expect(result.args).toEqual(['/c', 'npx', '-y', 'exa-mcp-server'])
      expect(result.env).toEqual({ EXA_API_KEY: 'test-api-key' })
    })
  })

  describe('fixWindowsMcpConfig', () => {
    it('should not modify config on non-Windows', () => {
      vi.mocked(platform.isWindows).mockReturnValue(false)
      const config = { mcpServers: { test: { type: 'stdio' as const, command: 'npx' } } }

      const result = fixWindowsMcpConfig(config as any)

      expect(result).toEqual(config)
    })

    it('should fix Windows npx commands', () => {
      vi.mocked(platform.isWindows).mockReturnValue(true)
      vi.mocked(platform.getMcpCommand).mockReturnValue(['cmd', '/c', 'npx'])
      vi.mocked(objectUtils.deepClone).mockImplementation(obj => JSON.parse(JSON.stringify(obj)))

      const config = {
        mcpServers: {
          test: { type: 'stdio' as const, command: 'npx', args: ['arg1'] },
        },
      }

      const result = fixWindowsMcpConfig(config as any)

      expect(result.mcpServers.test.command).toBe('cmd')
      expect(result.mcpServers.test.args).toEqual(['/c', 'npx', 'arg1'])
    })

    it('should return config without mcpServers unchanged', () => {
      vi.mocked(platform.isWindows).mockReturnValue(true)
      const config = {}

      const result = fixWindowsMcpConfig(config as any)

      expect(result).toEqual(config)
    })
  })

  describe('exa MCP Service Integration', () => {
    beforeEach(() => {
      // Mock deepClone to return a proper copy
      vi.mocked(objectUtils.deepClone).mockImplementation(obj => JSON.parse(JSON.stringify(obj)))

      // Mock getMcpService to return exa service configuration
      const mockExaService = {
        id: 'exa',
        name: 'Exa Search',
        description: 'Web search and content crawling',
        config: {
          type: 'stdio' as const,
          command: 'npx',
          args: ['-y', 'exa-mcp-server'],
          env: {
            EXA_API_KEY: 'YOUR_EXA_API_KEY',
          },
        },
        requiresApiKey: true,
        apiKeyEnvVar: 'EXA_API_KEY',
      }
      vi.mocked(getMcpService).mockResolvedValue(mockExaService)
    })

    it('should have exa service configured with environment variable', async () => {
      const exaService = await getMcpService('exa')

      expect(exaService).toBeDefined()
      expect(exaService!.config.command).toBe('npx')
      expect(exaService!.config.args).toContain('exa-mcp-server')
      expect(exaService!.config.env).toHaveProperty('EXA_API_KEY')
      expect(exaService!.apiKeyEnvVar).toBe('EXA_API_KEY')
    })

    it('should build exa service config with API key in environment', async () => {
      const exaService = await getMcpService('exa')
      vi.mocked(platform.isWindows).mockReturnValue(false)

      const config = buildMcpServerConfig(
        exaService!.config,
        'test-exa-key-123',
        undefined,
        exaService!.apiKeyEnvVar,
      )

      expect(config.env).toEqual({ EXA_API_KEY: 'test-exa-key-123' })
      expect(config.args).toEqual(['-y', 'exa-mcp-server'])
    })

    it('should handle exa service on Windows platform', async () => {
      const exaService = await getMcpService('exa')
      vi.mocked(platform.isWindows).mockReturnValue(true)
      vi.mocked(platform.getMcpCommand).mockReturnValue(['cmd', '/c', 'npx'])

      const config = buildMcpServerConfig(
        exaService!.config,
        'test-key',
        undefined,
        exaService!.apiKeyEnvVar,
      )

      expect(config.command).toBe('cmd')
      expect(config.args).toEqual(['/c', 'npx', '-y', 'exa-mcp-server'])
      expect(config.env).toEqual({ EXA_API_KEY: 'test-key' })
    })
  })
})
