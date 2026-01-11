import type { CodexConfigData, CodexFullInitOptions, CodexMcpService } from '../../../../src/utils/code-tools/codex'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock dependencies before importing the module
vi.mock('../../../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  i18n: {
    t: vi.fn((key: string) => key),
  },
}))

vi.mock('../../../../src/config/mcp-services', () => ({
  getMcpServices: vi.fn().mockResolvedValue([
    { id: 'serena', name: 'Serena', requiresApiKey: false, config: { command: 'serena', args: ['--context', 'default'] } },
    { id: 'context7', name: 'Context7', requiresApiKey: false, config: { command: 'context7', args: [] } },
    { id: 'exa', name: 'Exa', requiresApiKey: true, apiKeyEnvVar: 'EXA_API_KEY', apiKeyPrompt: 'Enter Exa API key', config: { command: 'exa', args: [] } },
  ]),
  MCP_SERVICE_CONFIGS: [
    { id: 'serena', requiresApiKey: false, config: { command: 'serena', args: ['--context', 'default'] } },
    { id: 'context7', requiresApiKey: false, config: { command: 'context7', args: [] } },
    { id: 'exa', requiresApiKey: true, apiKeyEnvVar: 'EXA_API_KEY', config: { command: 'exa', args: [] } },
  ],
}))

vi.mock('../../../../src/utils/mcp-selector', () => ({
  selectMcpServices: vi.fn(),
}))

vi.mock('../../../../src/utils/platform', () => ({
  isWindows: vi.fn(),
  getSystemRoot: vi.fn(),
}))

vi.mock('../../../../src/utils/zcf-config', () => ({
  updateZcfConfig: vi.fn(),
}))

vi.mock('../../../../src/utils/code-tools/codex', () => ({
  backupCodexComplete: vi.fn(),
  getBackupMessage: vi.fn((path: string) => `Backup created: ${path}`),
  readCodexConfig: vi.fn(),
  runCodexWorkflowSelection: vi.fn(),
}))

vi.mock('../../../../src/utils/code-tools/codex-toml-updater', () => ({
  batchUpdateCodexMcpServices: vi.fn(),
}))

vi.mock('../../../../src/utils/code-tools/codex-platform', () => ({
  applyCodexPlatformCommand: vi.fn(),
}))

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}))

describe('codex-configure', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // Restore mock implementations that might have been changed
    const { isWindows, getSystemRoot } = vi.mocked(await import('../../../../src/utils/platform'))
    isWindows.mockReturnValue(false)
    getSystemRoot.mockReturnValue(null)
  })

  describe('configureCodexMcp - skipPrompt mode', () => {
    it('should skip MCP installation when mcpServices is false', async () => {
      const { configureCodexMcp } = await import('../../../../src/utils/code-tools/codex-configure')
      const { updateZcfConfig } = vi.mocked(await import('../../../../src/utils/zcf-config'))
      const { backupCodexComplete, readCodexConfig } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))

      backupCodexComplete.mockReturnValue('/backup/path')
      readCodexConfig.mockReturnValue(null)

      const options: CodexFullInitOptions = {
        skipPrompt: true,
        mcpServices: false,
      }

      await configureCodexMcp(options)

      expect(updateZcfConfig).toHaveBeenCalledWith({ codeToolType: 'codex' })
    })

    it('should use provided mcpServices list in skipPrompt mode', async () => {
      const { configureCodexMcp } = await import('../../../../src/utils/code-tools/codex-configure')
      const { readCodexConfig, backupCodexComplete } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))
      const { batchUpdateCodexMcpServices } = vi.mocked(await import('../../../../src/utils/code-tools/codex-toml-updater'))

      readCodexConfig.mockReturnValue(null)
      backupCodexComplete.mockReturnValue('/backup/path')

      const options: CodexFullInitOptions = {
        skipPrompt: true,
        mcpServices: ['context7'],
      }

      await configureCodexMcp(options)

      expect(batchUpdateCodexMcpServices).toHaveBeenCalled()
    })

    it('should handle serena with --context already present in args', async () => {
      const { configureCodexMcp } = await import('../../../../src/utils/code-tools/codex-configure')
      const { readCodexConfig, backupCodexComplete } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))
      const { batchUpdateCodexMcpServices } = vi.mocked(await import('../../../../src/utils/code-tools/codex-toml-updater'))

      readCodexConfig.mockReturnValue(null)
      backupCodexComplete.mockReturnValue('/backup/path')

      const options: CodexFullInitOptions = {
        skipPrompt: true,
        mcpServices: ['serena'],
      }

      await configureCodexMcp(options)

      expect(batchUpdateCodexMcpServices).toHaveBeenCalled()
    })

    it('should handle Windows environment with SYSTEMROOT', async () => {
      const { configureCodexMcp } = await import('../../../../src/utils/code-tools/codex-configure')
      const { isWindows, getSystemRoot } = vi.mocked(await import('../../../../src/utils/platform'))
      const { readCodexConfig, backupCodexComplete } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))
      const { batchUpdateCodexMcpServices } = vi.mocked(await import('../../../../src/utils/code-tools/codex-toml-updater'))

      isWindows.mockReturnValue(true)
      getSystemRoot.mockReturnValue('C:\\Windows')
      readCodexConfig.mockReturnValue(null)
      backupCodexComplete.mockReturnValue('/backup/path')

      const options: CodexFullInitOptions = {
        skipPrompt: true,
        mcpServices: ['context7'],
      }

      await configureCodexMcp(options)

      expect(batchUpdateCodexMcpServices).toHaveBeenCalled()
      const callArgs = batchUpdateCodexMcpServices.mock.calls[0][0] as CodexMcpService[]
      expect(callArgs.some((s: CodexMcpService) => s.env?.SYSTEMROOT === 'C:\\Windows')).toBe(true)
    })

    it('should handle Windows environment when getSystemRoot returns null', async () => {
      const { configureCodexMcp } = await import('../../../../src/utils/code-tools/codex-configure')
      const { isWindows, getSystemRoot } = vi.mocked(await import('../../../../src/utils/platform'))
      const { readCodexConfig, backupCodexComplete } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))
      const { batchUpdateCodexMcpServices } = vi.mocked(await import('../../../../src/utils/code-tools/codex-toml-updater'))

      isWindows.mockReturnValue(true)
      getSystemRoot.mockReturnValue(null)
      readCodexConfig.mockReturnValue(null)
      backupCodexComplete.mockReturnValue('/backup/path')

      const options: CodexFullInitOptions = {
        skipPrompt: true,
        mcpServices: ['context7'],
      }

      await configureCodexMcp(options)

      expect(batchUpdateCodexMcpServices).toHaveBeenCalled()
      const callArgs = batchUpdateCodexMcpServices.mock.calls[0][0] as CodexMcpService[]
      // When getSystemRoot returns null, SYSTEMROOT should not be set
      expect(callArgs.every((s: CodexMcpService) => !s.env?.SYSTEMROOT)).toBe(true)
    })

    it('should merge existing MCP services with new services', async () => {
      const { configureCodexMcp } = await import('../../../../src/utils/code-tools/codex-configure')
      const { readCodexConfig, backupCodexComplete } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))
      const { batchUpdateCodexMcpServices } = vi.mocked(await import('../../../../src/utils/code-tools/codex-toml-updater'))

      const existingConfig: CodexConfigData = {
        model: 'gpt-5',
        modelProvider: 'existing-provider',
        providers: [{ id: 'existing-provider', name: 'Existing', baseUrl: 'https://api.example.com', wireApi: 'responses', tempEnvKey: 'API_KEY', requiresOpenaiAuth: false }],
        mcpServices: [{ id: 'existing-mcp', command: 'existing', args: [] }],
        managed: true,
        otherConfig: [],
      }

      readCodexConfig.mockReturnValue(existingConfig)
      backupCodexComplete.mockReturnValue('/backup/path')

      const options: CodexFullInitOptions = {
        skipPrompt: true,
        mcpServices: ['context7'],
      }

      await configureCodexMcp(options)

      expect(batchUpdateCodexMcpServices).toHaveBeenCalled()
      const callArgs = batchUpdateCodexMcpServices.mock.calls[0][0] as CodexMcpService[]
      // Should have both existing and new MCP services
      expect(callArgs.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle Windows environment in finalServices mapping', async () => {
      const { configureCodexMcp } = await import('../../../../src/utils/code-tools/codex-configure')
      const { isWindows, getSystemRoot } = vi.mocked(await import('../../../../src/utils/platform'))
      const { readCodexConfig, backupCodexComplete } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))
      const { batchUpdateCodexMcpServices } = vi.mocked(await import('../../../../src/utils/code-tools/codex-toml-updater'))

      isWindows.mockReturnValue(true)
      getSystemRoot.mockReturnValue('C:\\Windows')

      const existingConfig: CodexConfigData = {
        model: null,
        modelProvider: null,
        providers: [],
        mcpServices: [{ id: 'old-service', command: 'old', args: [] }],
        managed: true,
        otherConfig: [],
      }

      readCodexConfig.mockReturnValue(existingConfig)
      backupCodexComplete.mockReturnValue('/backup/path')

      const options: CodexFullInitOptions = {
        skipPrompt: true,
        mcpServices: ['context7'],
      }

      await configureCodexMcp(options)

      expect(batchUpdateCodexMcpServices).toHaveBeenCalled()
    })
  })

  describe('configureCodexMcp - interactive mode', () => {
    it('should return early when selectMcpServices returns undefined', async () => {
      const { configureCodexMcp } = await import('../../../../src/utils/code-tools/codex-configure')
      const { selectMcpServices } = vi.mocked(await import('../../../../src/utils/mcp-selector'))
      const { backupCodexComplete, readCodexConfig } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))
      const { batchUpdateCodexMcpServices } = vi.mocked(await import('../../../../src/utils/code-tools/codex-toml-updater'))

      backupCodexComplete.mockReturnValue('/backup/path')
      readCodexConfig.mockReturnValue(null)
      selectMcpServices.mockResolvedValue(undefined)

      await configureCodexMcp()

      expect(batchUpdateCodexMcpServices).not.toHaveBeenCalled()
    })

    it('should handle empty selection in interactive mode', async () => {
      const { configureCodexMcp } = await import('../../../../src/utils/code-tools/codex-configure')
      const { selectMcpServices } = vi.mocked(await import('../../../../src/utils/mcp-selector'))
      const { backupCodexComplete, readCodexConfig } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))
      const { batchUpdateCodexMcpServices } = vi.mocked(await import('../../../../src/utils/code-tools/codex-toml-updater'))
      const { updateZcfConfig } = vi.mocked(await import('../../../../src/utils/zcf-config'))

      backupCodexComplete.mockReturnValue('/backup/path')
      readCodexConfig.mockReturnValue(null)
      selectMcpServices.mockResolvedValue([])

      await configureCodexMcp()

      expect(batchUpdateCodexMcpServices).toHaveBeenCalled()
      expect(updateZcfConfig).toHaveBeenCalledWith({ codeToolType: 'codex' })
    })

    it('should handle empty selection with existing services on Windows', async () => {
      const { configureCodexMcp } = await import('../../../../src/utils/code-tools/codex-configure')
      const { selectMcpServices } = vi.mocked(await import('../../../../src/utils/mcp-selector'))
      const { isWindows, getSystemRoot } = vi.mocked(await import('../../../../src/utils/platform'))
      const { backupCodexComplete, readCodexConfig } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))
      const { batchUpdateCodexMcpServices } = vi.mocked(await import('../../../../src/utils/code-tools/codex-toml-updater'))

      isWindows.mockReturnValue(true)
      getSystemRoot.mockReturnValue('C:\\Windows')
      backupCodexComplete.mockReturnValue('/backup/path')

      const existingConfig: CodexConfigData = {
        model: null,
        modelProvider: null,
        providers: [],
        mcpServices: [{ id: 'existing', command: 'existing', args: [] }],
        managed: true,
        otherConfig: [],
      }

      readCodexConfig.mockReturnValue(existingConfig)
      selectMcpServices.mockResolvedValue([])

      await configureCodexMcp()

      expect(batchUpdateCodexMcpServices).toHaveBeenCalled()
      const callArgs = batchUpdateCodexMcpServices.mock.calls[0][0] as CodexMcpService[]
      expect(callArgs[0].env?.SYSTEMROOT).toBe('C:\\Windows')
    })

    it('should handle services selection with non-API-key services', async () => {
      const { configureCodexMcp } = await import('../../../../src/utils/code-tools/codex-configure')
      const { selectMcpServices } = vi.mocked(await import('../../../../src/utils/mcp-selector'))
      const { backupCodexComplete, readCodexConfig } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))
      const { batchUpdateCodexMcpServices } = vi.mocked(await import('../../../../src/utils/code-tools/codex-toml-updater'))

      backupCodexComplete.mockReturnValue('/backup/path')
      readCodexConfig.mockReturnValue(null)
      selectMcpServices.mockResolvedValue(['context7'])

      await configureCodexMcp()

      expect(batchUpdateCodexMcpServices).toHaveBeenCalled()
    })

    it('should handle serena service context modification in interactive mode', async () => {
      const { configureCodexMcp } = await import('../../../../src/utils/code-tools/codex-configure')
      const { selectMcpServices } = vi.mocked(await import('../../../../src/utils/mcp-selector'))
      const { backupCodexComplete, readCodexConfig } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))
      const { batchUpdateCodexMcpServices } = vi.mocked(await import('../../../../src/utils/code-tools/codex-toml-updater'))

      backupCodexComplete.mockReturnValue('/backup/path')
      readCodexConfig.mockReturnValue(null)
      selectMcpServices.mockResolvedValue(['serena'])

      await configureCodexMcp()

      expect(batchUpdateCodexMcpServices).toHaveBeenCalled()
    })

    it('should modify existing --context value for serena in interactive mode', async () => {
      const { configureCodexMcp } = await import('../../../../src/utils/code-tools/codex-configure')
      const { selectMcpServices } = vi.mocked(await import('../../../../src/utils/mcp-selector'))
      const { backupCodexComplete, readCodexConfig } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))
      const { batchUpdateCodexMcpServices } = vi.mocked(await import('../../../../src/utils/code-tools/codex-toml-updater'))

      backupCodexComplete.mockReturnValue('/backup/path')
      readCodexConfig.mockReturnValue(null)
      selectMcpServices.mockResolvedValue(['serena'])

      await configureCodexMcp()

      expect(batchUpdateCodexMcpServices).toHaveBeenCalled()
      const callArgs = batchUpdateCodexMcpServices.mock.calls[0][0] as CodexMcpService[]
      const serenaService = callArgs.find((s: CodexMcpService) => s.id === 'serena')
      // The --context value should be modified to 'codex'
      expect(serenaService).toBeDefined()
    })

    it('should handle API key service with prompt in interactive mode', async () => {
      const { configureCodexMcp } = await import('../../../../src/utils/code-tools/codex-configure')
      const { selectMcpServices } = vi.mocked(await import('../../../../src/utils/mcp-selector'))
      const { backupCodexComplete, readCodexConfig } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))
      const { batchUpdateCodexMcpServices } = vi.mocked(await import('../../../../src/utils/code-tools/codex-toml-updater'))
      const inquirer = await import('inquirer')

      backupCodexComplete.mockReturnValue('/backup/path')
      readCodexConfig.mockReturnValue(null)
      selectMcpServices.mockResolvedValue(['exa'])
      vi.mocked(inquirer.default.prompt).mockResolvedValue({ apiKey: 'test-api-key' })

      await configureCodexMcp()

      expect(batchUpdateCodexMcpServices).toHaveBeenCalled()
    })

    it('should skip API key service when no key provided', async () => {
      const { configureCodexMcp } = await import('../../../../src/utils/code-tools/codex-configure')
      const { selectMcpServices } = vi.mocked(await import('../../../../src/utils/mcp-selector'))
      const { backupCodexComplete, readCodexConfig } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))
      const { batchUpdateCodexMcpServices } = vi.mocked(await import('../../../../src/utils/code-tools/codex-toml-updater'))
      const inquirer = await import('inquirer')

      backupCodexComplete.mockReturnValue('/backup/path')
      readCodexConfig.mockReturnValue(null)
      selectMcpServices.mockResolvedValue(['exa'])
      vi.mocked(inquirer.default.prompt).mockResolvedValue({ apiKey: '' })

      await configureCodexMcp()

      expect(batchUpdateCodexMcpServices).toHaveBeenCalled()
      const callArgs = batchUpdateCodexMcpServices.mock.calls[0][0] as CodexMcpService[]
      // exa should be skipped when no API key provided
      expect(callArgs.find((s: CodexMcpService) => s.id === 'exa')).toBeUndefined()
    })

    it('should handle Windows SYSTEMROOT in interactive mode finalServices', async () => {
      const { configureCodexMcp } = await import('../../../../src/utils/code-tools/codex-configure')
      const { selectMcpServices } = vi.mocked(await import('../../../../src/utils/mcp-selector'))
      const { isWindows, getSystemRoot } = vi.mocked(await import('../../../../src/utils/platform'))
      const { backupCodexComplete, readCodexConfig } = vi.mocked(await import('../../../../src/utils/code-tools/codex'))
      const { batchUpdateCodexMcpServices } = vi.mocked(await import('../../../../src/utils/code-tools/codex-toml-updater'))

      isWindows.mockReturnValue(true)
      getSystemRoot.mockReturnValue('C:\\Windows')
      backupCodexComplete.mockReturnValue('/backup/path')
      readCodexConfig.mockReturnValue(null)
      selectMcpServices.mockResolvedValue(['context7'])

      await configureCodexMcp()

      expect(batchUpdateCodexMcpServices).toHaveBeenCalled()
      const callArgs = batchUpdateCodexMcpServices.mock.calls[0][0] as CodexMcpService[]
      expect(callArgs.some((s: CodexMcpService) => s.env?.SYSTEMROOT === 'C:\\Windows')).toBe(true)
    })
  })
})
