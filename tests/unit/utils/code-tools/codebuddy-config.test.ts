import type { ClaudeConfiguration, McpServerConfig } from '../../../../src/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildMcpServerConfig,
  ensureApiKeyApproved,
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
  })

  describe('buildMcpServerConfig', () => {
    it('should deep clone and apply platform command', () => {
      const base: McpServerConfig = { type: 'stdio', command: 'npx', args: ['-y', 'server'] }
      const result = buildMcpServerConfig(base)
      expect(result).toEqual(base)
    })
  })

  describe('fixWindowsMcpConfig', () => {
    it('should not modify config on non-Windows', () => {
      mockPlatform.isWindows.mockReturnValue(false)
      const config: ClaudeConfiguration = { mcpServers: { test: { type: 'stdio', command: 'echo' } } }
      expect(fixWindowsMcpConfig(config)).toEqual(config)
    })
  })

  describe('ensureApiKeyApproved', () => {
    it('should add truncated API key to approved list', () => {
      const config: ClaudeConfiguration = { mcpServers: {} }
      const result = ensureApiKeyApproved(config, 'sk-test-key-12345678901234567890')
      expect(result.customApiKeyResponses?.approved).toContain('sk-test-key-12345678')
    })

    it('should remove from rejected if present', () => {
      const config: ClaudeConfiguration = {
        mcpServers: {},
        customApiKeyResponses: { approved: [], rejected: ['sk-test-key-12345678'] },
      }
      const result = ensureApiKeyApproved(config, 'sk-test-key-12345678901234567890')
      expect(result.customApiKeyResponses?.rejected).not.toContain('sk-test-key-12345678')
    })
  })
})
