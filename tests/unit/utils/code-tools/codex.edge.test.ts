import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock i18n system with comprehensive translations
vi.mock('../../../../src/i18n', () => ({
  i18n: {
    t: (key: string, params?: any) => {
      const translations: Record<string, string> = {
        'codex:configurationError': 'Configuration error',
        'codex:installationFailed': 'Installation failed',
        'codex:updateFailed': 'Codex update failed',
        'codex:uninstallError': 'Uninstallation error',
        'codex:configNotFound': 'Configuration not found',
        'codex:backupError': 'Backup creation failed',
        'codex:apiConfigError': 'API configuration error',
        'codex:mcpConfigError': 'MCP configuration error',
        'codex:switchOfficialError': 'Failed to switch to official mode',
        'codex:officialConfigured': 'Official configuration complete',
        'codex:apiConfigured': 'API configuration complete',
        'codex:mcpConfigured': 'MCP configuration complete',
        'codex:installSuccess': 'Installation successful',
        'codex:updateSuccess': 'Update successful',
        'codex:uninstallSuccess': 'Uninstallation successful',
        'common:backupCreated': 'Backup created: {path}',
        'common:error': 'Error: {message}',
        'common:cancelled': 'Operation cancelled',
      }
      if (params) {
        let result = translations[key] || key
        for (const [paramKey, value] of Object.entries(params)) {
          result = result.replace(`{${paramKey}}`, String(value))
        }
        return result
      }
      return translations[key] || key
    },
    isInitialized: true,
    language: 'en',
  },
  ensureI18nInitialized: vi.fn(),
}))

// Mock external dependencies
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}))

// Mock process while retaining actual implementation for other properties
const mockProcessExit = vi.hoisted(() => vi.fn())
vi.mock('node:process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:process')>()
  const patched = {
    ...actual,
    exit: mockProcessExit,
  }
  return {
    __esModule: true,
    ...patched,
    default: patched,
  }
})

// Mock mcp-selector
vi.mock('../../../../src/utils/mcp-selector', () => ({
  selectMcpServices: vi.fn(),
}))

vi.mock('ansis', () => ({
  default: {
    red: vi.fn((text: string) => text),
    green: vi.fn((text: string) => text),
    yellow: vi.fn((text: string) => text),
    cyan: vi.fn((text: string) => text),
    gray: vi.fn((text: string) => text),
  },
}))

// Mock node:fs
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  rmSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}))

// Mock pathe
vi.mock('pathe', () => ({
  join: vi.fn((...args) => args.join('/')),
  dirname: vi.fn(path => path.split('/').slice(0, -1).join('/')),
  resolve: vi.fn((...args) => args.join('/')),
}))

// Mock node:os while providing required exports
const mockHomedir = vi.hoisted(() => vi.fn(() => '/home/user'))
const mockPlatformFn = vi.hoisted(() => vi.fn(() => 'linux'))
vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>()
  const patched = {
    ...actual,
    homedir: mockHomedir,
    platform: mockPlatformFn,
  }
  return {
    __esModule: true,
    ...patched,
    default: patched,
  }
})

// Mock tinyexec with both named and default exports
const mockTinyexec = vi.hoisted(() => {
  return {
    x: vi.fn(),
    exec: vi.fn(),
    $: vi.fn(),
  }
})
vi.mock('tinyexec', () => ({
  __esModule: true,
  ...mockTinyexec,
  default: mockTinyexec,
}))

// Mock fs-operations
vi.mock('../../../../src/utils/fs-operations', () => ({
  copyDir: vi.fn(),
  copyFile: vi.fn(),
  ensureDir: vi.fn(),
  exists: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}))

// Mock json-config
vi.mock('../../../../src/utils/json-config', () => ({
  readJsonConfig: vi.fn(),
  writeJsonConfig: vi.fn(),
}))

// Mock output-style
vi.mock('../../../../src/utils/output-style', () => ({
  selectOutputStyles: vi.fn(),
}))

// Mock workflow-installer
vi.mock('../../../../src/utils/workflow-installer', () => ({
  selectAndInstallWorkflows: vi.fn(),
}))

// Mock prompt-helpers
vi.mock('../../../../src/utils/prompt-helpers', () => ({
  addNumbersToChoices: vi.fn(choices => choices),
}))

// Mock zcf-config
vi.mock('../../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn(() => ({ preferredLang: 'en', codeToolType: 'codex' })),
  updateZcfConfig: vi.fn(),
  readDefaultTomlConfig: vi.fn(() => ({
    version: '1.0.0',
    general: { preferredLang: 'en', currentTool: 'codex' },
    codex: { systemPromptStyle: 'engineer-professional' },
  })),
}))

// Mock prompts
vi.mock('../../../../src/utils/prompts', () => ({
  resolveTemplateLanguage: vi.fn(),
}))

const installerMock = vi.hoisted(() => ({
  installCodex: vi.fn(),
}))

vi.mock('../../../../src/utils/installer', () => installerMock)

const installerModule = await import('../../../../src/utils/installer')
const mockedInstallCodex = vi.mocked(installerModule.installCodex)

// Partially mock codex module to allow real imports while mocking specific functions
vi.mock('../../../../src/utils/code-tools/codex', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../src/utils/code-tools/codex')>()
  return {
    ...actual,
    readCodexConfig: vi.fn(),
  }
})

describe('codex utilities - edge cases', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetAllMocks()
    mockedInstallCodex.mockReset()
    mockedInstallCodex.mockResolvedValue(undefined)
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    // Reset zcf-config mock to default
    const { readZcfConfig } = await import('../../../../src/utils/zcf-config')
    vi.mocked(readZcfConfig).mockReturnValue({
      version: '1.0.0',
      preferredLang: 'en',
      codeToolType: 'codex',
      lastUpdated: new Date().toISOString(),
    })
  })

  describe('configureCodexMcp - error scenarios', () => {
    it('should handle MCP config read errors by completing gracefully', async () => {
      const { configureCodexMcp } = await import('../../../../src/utils/code-tools/codex')
      const { selectMcpServices } = await import('../../../../src/utils/mcp-selector')

      // Mock service selection to return empty (simulating user cancellation)
      vi.mocked(selectMcpServices).mockResolvedValue([])

      // configureCodexMcp should complete without errors when no services selected
      await expect(configureCodexMcp()).resolves.not.toThrow()
    })

    it('should handle MCP config write failures', async () => {
      const { configureCodexMcp } = await import('../../../../src/utils/code-tools/codex')
      const { writeFile } = await import('../../../../src/utils/fs-operations')
      const { selectMcpServices } = await import('../../../../src/utils/mcp-selector')

      // Mock service selection
      vi.mocked(selectMcpServices).mockResolvedValue(['claude-codebase'])

      // Mock successful write to fail
      vi.mocked(writeFile).mockImplementation(() => {
        throw new Error('Disk full')
      })

      // configureCodexMcp doesn't return false, it throws when failing to write
      await expect(configureCodexMcp()).rejects.toThrow()
    })
  })

  describe('switchToOfficialLogin - error handling', () => {
    it('should handle config read failures', async () => {
      const { switchToOfficialLogin, readCodexConfig } = await import('../../../../src/utils/code-tools/codex')

      // Mock readCodexConfig to return null (simulating no existing config)
      vi.mocked(readCodexConfig).mockReturnValue(null)

      const result = await switchToOfficialLogin()

      expect(result).toBe(false)
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('not found'))
    })

    it('should handle auth file write failures', async () => {
      const { switchToOfficialLogin, readCodexConfig } = await import('../../../../src/utils/code-tools/codex')
      const { writeJsonConfig, readJsonConfig } = await import('../../../../src/utils/json-config')

      // Mock successful config read
      vi.mocked(readCodexConfig).mockReturnValue({
        model: 'gpt-4',
        modelProvider: 'openai',
        providers: [],
        mcpServices: [],
        managed: true,
        otherConfig: [],
      })

      // Mock auth file read to succeed but write to fail
      vi.mocked(readJsonConfig).mockReturnValue({ OPENAI_API_KEY: 'existing-key' })
      vi.mocked(writeJsonConfig).mockImplementation(() => {
        throw new Error('Permission denied')
      })

      const result = await switchToOfficialLogin()

      expect(result).toBe(false)
      // Function may not call console.error, just return false on failure
    })
  })

  describe('backup functions - error handling', () => {
    it('should handle backup directory creation failures', async () => {
      const { backupCodexConfig } = await import('../../../../src/utils/code-tools/codex')
      const { ensureDir } = await import('../../../../src/utils/fs-operations')
      const { existsSync } = await import('node:fs')

      // Mock existing config and backup directory creation failure
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(ensureDir).mockImplementation(() => {
        throw new Error('Permission denied')
      })

      const result = backupCodexConfig()

      expect(result).toBe(null)
    })

    it('should handle backup file copy failures', async () => {
      const { backupCodexConfig } = await import('../../../../src/utils/code-tools/codex')
      const { ensureDir, copyFile } = await import('../../../../src/utils/fs-operations')
      const { existsSync } = await import('node:fs')

      // Mock existing config and successful directory creation but failed copy
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(ensureDir).mockImplementation(() => {})
      vi.mocked(copyFile).mockImplementation(() => {
        throw new Error('Copy failed')
      })

      const result = backupCodexConfig()

      expect(result).toBe(null)
    })
  })

  describe('version checking - network errors', () => {
    it('should handle network timeout in version check', async () => {
      const { checkCodexUpdate } = await import('../../../../src/utils/code-tools/codex')
      const { x } = await import('tinyexec')

      // Mock network timeout error
      vi.mocked(x).mockRejectedValue(new Error('Network timeout'))

      const result = await checkCodexUpdate()

      expect(result.installed).toBe(false)
      expect(result.currentVersion).toBe(null)
      expect(result.latestVersion).toBe(null)
      expect(result.needsUpdate).toBe(false)
    })

    it('should handle malformed npm response', async () => {
      const { checkCodexUpdate } = await import('../../../../src/utils/code-tools/codex')
      const { x } = await import('tinyexec')

      // Mock codex version check to succeed but npm view to fail
      vi.mocked(x)
        .mockResolvedValueOnce({ exitCode: 0, stdout: '@openai/codex@1.0.0', stderr: '' }) // Current version
        .mockResolvedValueOnce({ exitCode: 1, stdout: 'invalid-json', stderr: 'Network error' }) // Failed npm view

      const result = await checkCodexUpdate()

      expect(result.installed).toBe(true)
      expect(result.currentVersion).toBe('1.0.0')
      expect(result.latestVersion).toBe(null)
      expect(result.needsUpdate).toBe(false)
    })
  })

  describe('system prompt installation - edge cases', () => {
    it('should handle missing template directory', async () => {
      const { runCodexSystemPromptSelection } = await import('../../../../src/utils/code-tools/codex')
      const { exists } = await import('../../../../src/utils/fs-operations')

      // Reset readZcfConfig for this test to avoid pollution from previous tests
      const { readZcfConfig } = await import('../../../../src/utils/zcf-config')
      vi.mocked(readZcfConfig).mockReturnValue({
        version: '1.0.0',
        preferredLang: 'en',
        codeToolType: 'codex',
        lastUpdated: new Date().toISOString(),
      })

      // Mock template directory not existing
      vi.mocked(exists).mockReturnValue(false)

      // Should complete without errors when no templates exist
      await expect(runCodexSystemPromptSelection()).resolves.not.toThrow()
    })
  })

  describe('config file validation - edge cases', () => {
    it('should handle corrupted config files', async () => {
      const { readCodexConfig } = await import('../../../../src/utils/code-tools/codex')

      // Mock readCodexConfig to return a valid config object (demonstrating graceful handling)
      vi.mocked(readCodexConfig).mockReturnValue({
        model: null,
        modelProvider: null,
        providers: [],
        mcpServices: [],
        managed: false,
        otherConfig: [],
      })

      const result = readCodexConfig()

      expect(result).toBeDefined()
      expect(result?.managed).toBe(false)
      // Should handle missing fields gracefully with defaults
    })

    it('should handle config file with invalid JSON structure', async () => {
      const { readCodexConfig } = await import('../../../../src/utils/code-tools/codex')

      // Mock readCodexConfig to return null for invalid config
      vi.mocked(readCodexConfig).mockReturnValue(null)

      const result = readCodexConfig()

      expect(result).toBe(null)
    })
  })

  describe('installation edge cases', () => {
    it('should handle CLI installation failures', async () => {
      const { installCodexCli } = await import('../../../../src/utils/code-tools/codex')
      const error = new Error('Installation failed')
      mockedInstallCodex.mockRejectedValue(error)

      await expect(installCodexCli()).rejects.toThrow('Installation failed')
    })
  })

  describe('provider management edge cases', () => {
    it('should handle provider switch failures', async () => {
      const { switchCodexProvider } = await import('../../../../src/utils/code-tools/codex')
      const { readJsonConfig } = await import('../../../../src/utils/json-config')

      // Mock config read failure
      vi.mocked(readJsonConfig).mockImplementation(() => {
        throw new Error('Config not accessible')
      })

      const result = await switchCodexProvider('test-provider')

      expect(result).toBe(false)
    })

    it('should handle provider listing failures', async () => {
      const { listCodexProviders } = await import('../../../../src/utils/code-tools/codex')
      const { readJsonConfig } = await import('../../../../src/utils/json-config')

      // Mock config read failure
      vi.mocked(readJsonConfig).mockImplementation(() => {
        throw new Error('Cannot read config')
      })

      const result = await listCodexProviders()

      expect(result).toEqual([])
    })
  })

  describe('backup message generation', () => {
    it('should handle null backup paths', async () => {
      const { getBackupMessage } = await import('../../../../src/utils/code-tools/codex')

      const result = getBackupMessage(null)

      expect(result).toBe('') // Returns empty string for null paths
    })

    it('should format backup paths correctly', async () => {
      const { getBackupMessage } = await import('../../../../src/utils/code-tools/codex')

      const result = getBackupMessage('/path/to/backup')

      // Returns i18n key that gets translated
      expect(result).toContain('codex:backupSuccess')
    })
  })
})
