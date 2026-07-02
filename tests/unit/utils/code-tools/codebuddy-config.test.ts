import type { ClaudeConfiguration, McpServerConfig } from '../../../../src/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  backupMcpConfig,
  buildMcpServerConfig,
  fixWindowsMcpConfig,
  getMcpConfigPath,
  getSettingsPath,
  mergeMcpServers,
  readMcpConfig,
  readSettings,
  writeMcpConfig,
  writeSettings,
} from '../../../../src/utils/code-tools/codebuddy-config'

// Mock dependencies
vi.mock('../../../../src/constants', () => ({
  CODEBUDDY_DIR: '/test/.codebuddy',
  CODEBUDDY_MCP_FILE: '/test/.codebuddy/.mcp.json',
  CODEBUDDY_SETTINGS_FILE: '/test/.codebuddy/settings.json',
}))

vi.mock('../../../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  i18n: {
    t: vi.fn((key: string) => key),
  },
}))

vi.mock('../../../../src/utils/json-config', () => ({
  readJsonConfig: vi.fn(),
  writeJsonConfig: vi.fn(),
  backupJsonConfig: vi.fn(),
}))

vi.mock('../../../../src/utils/object-utils', () => ({
  deepClone: vi.fn(obj => JSON.parse(JSON.stringify(obj))),
}))

vi.mock('../../../../src/utils/platform', () => ({
  getMcpCommand: vi.fn(() => ['npx']),
  isWindows: vi.fn(() => false),
}))

const mockJsonConfig = vi.mocked(await import('../../../../src/utils/json-config'))
const mockPlatform = vi.mocked(await import('../../../../src/utils/platform'))

describe('codebuddy-config', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getMcpConfigPath', () => {
    it('should return CodeBuddy MCP config path', () => {
      expect(getMcpConfigPath()).toBe('/test/.codebuddy/.mcp.json')
    })
  })

  describe('getSettingsPath', () => {
    it('should return CodeBuddy settings path', () => {
      expect(getSettingsPath()).toBe('/test/.codebuddy/settings.json')
    })
  })

  describe('readMcpConfig / writeMcpConfig', () => {
    it('should read and write MCP config', () => {
      const config: ClaudeConfiguration = { mcpServers: { test: { type: 'stdio', command: 'echo' } } }
      mockJsonConfig.readJsonConfig.mockReturnValue(null)
      expect(readMcpConfig()).toBeNull()

      writeMcpConfig(config)
      expect(mockJsonConfig.writeJsonConfig).toHaveBeenCalledWith('/test/.codebuddy/.mcp.json', config)
    })
  })

  describe('readSettings / writeSettings', () => {
    it('should read and write settings', () => {
      const settings = { env: { NODE_ENV: 'test' } }
      mockJsonConfig.readJsonConfig.mockReturnValue(null)
      expect(readSettings()).toBeNull()

      writeSettings(settings)
      expect(mockJsonConfig.writeJsonConfig).toHaveBeenCalledWith('/test/.codebuddy/settings.json', settings)
    })
  })

  describe('mergeMcpServers', () => {
    it('should merge new servers into existing config', () => {
      const existing: ClaudeConfiguration = { mcpServers: { server1: { type: 'stdio', command: 'cmd1' } } }
      const newServers: Record<string, McpServerConfig> = {
        server2: { type: 'stdio', command: 'cmd2' },
      }

      const merged = mergeMcpServers(existing, newServers)
      expect(merged.mcpServers.server1).toBeDefined()
      expect(merged.mcpServers.server2).toBeDefined()
    })

    it('should create new config if existing is null', () => {
      const newServers: Record<string, McpServerConfig> = {
        server1: { type: 'stdio', command: 'cmd1' },
      }

      const merged = mergeMcpServers(null, newServers)
      expect(merged.mcpServers.server1).toBeDefined()
    })

    it('should initialize mcpServers when existing config lacks it', () => {
      const existing = {} as ClaudeConfiguration
      const newServers: Record<string, McpServerConfig> = {
        server1: { type: 'stdio', command: 'cmd1' },
      }

      const merged = mergeMcpServers(existing, newServers)
      expect(merged.mcpServers).toBeDefined()
      expect(merged.mcpServers.server1).toBeDefined()
    })
  })

  describe('buildMcpServerConfig', () => {
    it('should deep clone and apply platform command', () => {
      const base: McpServerConfig = { type: 'stdio', command: 'npx', args: ['-y', 'server'] }
      const result = buildMcpServerConfig(base)
      expect(result).toEqual(base)
    })

    it('should replace placeholder in args with provided apiKey', () => {
      const base: McpServerConfig = {
        type: 'stdio',
        command: 'npx',
        args: ['-y', 'server', '--key', 'YOUR_EXA_API_KEY'],
      }
      const result = buildMcpServerConfig(base, 'sk-test')
      expect(result.args).toContain('sk-test')
      expect(result.args).not.toContain('YOUR_EXA_API_KEY')
    })

    it('should replace custom placeholder in url', () => {
      const base: McpServerConfig = {
        type: 'sse',
        url: 'https://api.example.com?key=YOUR_CUSTOM_KEY',
      }
      const result = buildMcpServerConfig(base, 'sk-test', 'YOUR_CUSTOM_KEY')
      expect(result.url).toBe('https://api.example.com?key=sk-test')
    })

    it('should set env variable when envVarName is provided', () => {
      const base: McpServerConfig = {
        type: 'stdio',
        command: 'npx',
        env: { EXA_API_KEY: 'placeholder' },
      }
      const result = buildMcpServerConfig(base, 'sk-test', 'YOUR_EXA_API_KEY', 'EXA_API_KEY')
      expect(result.env?.EXA_API_KEY).toBe('sk-test')
    })

    it('should return config unchanged when apiKey is empty', () => {
      const base: McpServerConfig = {
        type: 'stdio',
        command: 'npx',
        args: ['--key', 'YOUR_EXA_API_KEY'],
      }
      const result = buildMcpServerConfig(base, '')
      expect(result.args).toContain('YOUR_EXA_API_KEY')
    })

    it('should apply Windows command wrapping on Windows', () => {
      mockPlatform.isWindows.mockReturnValue(true)
      mockPlatform.getMcpCommand.mockReturnValue(['cmd', '/c', 'npx'])
      const base: McpServerConfig = {
        type: 'stdio',
        command: 'npx',
        args: ['-y', 'server'],
      }
      const result = buildMcpServerConfig(base)
      expect(result.command).toBe('cmd')
      expect(result.args).toEqual(['/c', 'npx', '-y', 'server'])
    })
  })

  describe('fixWindowsMcpConfig', () => {
    it('should not modify config on non-Windows', () => {
      mockPlatform.isWindows.mockReturnValue(false)
      const config: ClaudeConfiguration = { mcpServers: { test: { type: 'stdio', command: 'echo' } } }
      expect(fixWindowsMcpConfig(config)).toEqual(config)
    })

    it('should wrap commands on Windows', () => {
      mockPlatform.isWindows.mockReturnValue(true)
      mockPlatform.getMcpCommand.mockReturnValue(['cmd', '/c', 'npx'])
      const config: ClaudeConfiguration = {
        mcpServers: {
          test: { type: 'stdio', command: 'npx', args: ['-y', 'server'] },
        },
      }
      const result = fixWindowsMcpConfig(config)
      expect(result.mcpServers.test.command).toBe('cmd')
      expect(result.mcpServers.test.args).toEqual(['/c', 'npx', '-y', 'server'])
    })
  })

  describe('backupMcpConfig', () => {
    it('should call backupJsonConfig with correct paths', () => {
      mockJsonConfig.backupJsonConfig.mockReturnValue('/test/.codebuddy/backup/.mcp.json.123')
      const result = backupMcpConfig()
      expect(mockJsonConfig.backupJsonConfig).toHaveBeenCalledWith(
        '/test/.codebuddy/.mcp.json',
        '/test/.codebuddy/backup',
      )
      expect(result).toBe('/test/.codebuddy/backup/.mcp.json.123')
    })
  })

  describe('writeSettings', () => {
    it('should write settings to settings.json', () => {
      const settings = { env: { ANTHROPIC_API_KEY: 'sk-test' } }
      writeSettings(settings)
      expect(mockJsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        '/test/.codebuddy/settings.json',
        settings,
      )
    })
  })
})
