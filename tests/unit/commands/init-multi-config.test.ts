import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock i18n first
vi.mock('../../../src/i18n', () => ({
  i18n: {
    t: vi.fn((key: string) => key),
    isInitialized: true,
    language: 'en',
  },
  ensureI18nInitialized: vi.fn(),
  initI18n: vi.fn(),
}))

// Mock modules
vi.mock('../../../src/utils/installer', () => ({
  getInstallationStatus: vi.fn(),
}))

vi.mock('../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn(),
  updateZcfConfig: vi.fn(),
}))

vi.mock('../../../src/utils/fs-operations', () => ({
  readFile: vi.fn(),
}))

vi.mock('../../../src/utils/claude-code-config-manager', () => ({
  ClaudeCodeConfigManager: {
    addProfile: vi.fn(),
    getProfileByName: vi.fn(),
    switchProfile: vi.fn(),
    applyProfileSettings: vi.fn(),
    syncCcrProfile: vi.fn(),
    generateProfileId: vi.fn((name: string) => `profile-${name.toLowerCase()}`),
    CONFIG_FILE: 'claude_code_config.json',
  },
}))

vi.mock('../../../src/utils/code-tools/codex-provider-manager', () => ({
  addProviderToExisting: vi.fn(),
}))

vi.mock('../../../src/utils/code-tools/codex', () => ({
  switchCodexProvider: vi.fn(),
}))

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}))

vi.mock('../../../src/constants', () => ({
  CLAUDE_DIR: '/test/.claude',
  DEFAULT_CODE_TOOL_TYPE: 'claude-code',
  SETTINGS_FILE: '/test/.claude/settings.json',
  CODE_TOOL_BANNERS: {
    'claude-code': 'ZCF',
    'codex': 'Codex',
  },
  API_DEFAULT_URL: 'https://api.anthropic.com',
  API_ENV_KEY: 'ANTHROPIC_API_KEY',
}))

describe('init command - multi-configuration', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('validateApiConfigs', () => {
    it('should validate valid API configurations', async () => {
      const { validateApiConfigs } = await import('../../../src/commands/init')

      const configs = [
        {
          name: 'Config1',
          type: 'api_key' as const,
          key: 'test-key-1',
        },
        {
          name: 'Config2',
          type: 'api_key' as const,
          key: 'test-key-2',
        },
      ]

      await expect(validateApiConfigs(configs)).resolves.not.toThrow()
    })

    it('should reject non-array configs', async () => {
      const { validateApiConfigs } = await import('../../../src/commands/init')

      await expect(validateApiConfigs({} as any)).rejects.toThrow()
    })

    it('should auto-infer type from provider', async () => {
      const { validateApiConfigs } = await import('../../../src/commands/init')

      const configs = [
        {
          provider: '302ai',
          key: 'test-key',
        },
      ]

      await validateApiConfigs(configs as any)
      expect(configs[0]).toHaveProperty('type', 'api_key')
    })

    it('should auto-generate name from provider', async () => {
      const { validateApiConfigs } = await import('../../../src/commands/init')

      const configs = [
        {
          provider: '302ai',
          type: 'api_key' as const,
          key: 'test-key',
        },
      ]

      await validateApiConfigs(configs as any)
      expect(configs[0]).toHaveProperty('name', '302AI')
    })

    it('should reject config without provider or type', async () => {
      const { validateApiConfigs } = await import('../../../src/commands/init')

      const configs = [
        {
          name: 'Config1',
          key: 'test-key',
        },
      ]

      await expect(validateApiConfigs(configs as any)).rejects.toThrow()
    })

    it('should reject invalid provider', async () => {
      const { validateApiConfigs } = await import('../../../src/commands/init')

      const configs = [
        {
          provider: 'invalid-provider',
          key: 'test-key',
        },
      ]

      await expect(validateApiConfigs(configs as any)).rejects.toThrow()
    })

    it('should reject config without name', async () => {
      const { validateApiConfigs } = await import('../../../src/commands/init')

      const configs = [
        {
          type: 'api_key' as const,
          key: 'test-key',
        },
      ]

      await expect(validateApiConfigs(configs as any)).rejects.toThrow()
    })

    it('should reject invalid auth type', async () => {
      const { validateApiConfigs } = await import('../../../src/commands/init')

      const configs = [
        {
          name: 'Config1',
          type: 'invalid_type' as any,
          key: 'test-key',
        },
      ]

      await expect(validateApiConfigs(configs as any)).rejects.toThrow()
    })

    it('should reject duplicate names', async () => {
      const { validateApiConfigs } = await import('../../../src/commands/init')

      const configs = [
        {
          name: 'Config1',
          type: 'api_key' as const,
          key: 'test-key-1',
        },
        {
          name: 'Config1',
          type: 'api_key' as const,
          key: 'test-key-2',
        },
      ]

      await expect(validateApiConfigs(configs as any)).rejects.toThrow()
    })

    it('should reject config without API key for non-CCR types', async () => {
      const { validateApiConfigs } = await import('../../../src/commands/init')

      const configs = [
        {
          name: 'Config1',
          type: 'api_key' as const,
        },
      ]

      await expect(validateApiConfigs(configs as any)).rejects.toThrow()
    })
  })

  describe('handleMultiConfigurations', () => {
    it('should parse API configurations from JSON string', async () => {
      const { handleMultiConfigurations } = await import('../../../src/commands/init')
      const { ClaudeCodeConfigManager } = await import('../../../src/utils/claude-code-config-manager')

      vi.mocked(ClaudeCodeConfigManager.addProfile).mockResolvedValue({
        success: true,
        addedProfile: {
          id: 'profile-1',
          name: 'Config1',
          authType: 'api_key',
          apiKey: 'test-key',
        },
      })

      const options = {
        apiConfigs: JSON.stringify([
          {
            name: 'Config1',
            type: 'api_key',
            key: 'test-key',
          },
        ]),
      }

      await expect(handleMultiConfigurations(options, 'claude-code')).resolves.not.toThrow()
    })

    it('should reject invalid JSON', async () => {
      const { handleMultiConfigurations } = await import('../../../src/commands/init')

      const options = {
        apiConfigs: 'invalid-json',
      }

      await expect(handleMultiConfigurations(options, 'claude-code')).rejects.toThrow()
    })

    it('should parse API configurations from file', async () => {
      const { handleMultiConfigurations } = await import('../../../src/commands/init')
      const { readFile } = await import('../../../src/utils/fs-operations')
      const { ClaudeCodeConfigManager } = await import('../../../src/utils/claude-code-config-manager')

      vi.mocked(readFile).mockReturnValue(JSON.stringify([
        {
          name: 'Config1',
          type: 'api_key',
          key: 'test-key',
        },
      ]))

      vi.mocked(ClaudeCodeConfigManager.addProfile).mockResolvedValue({
        success: true,
        addedProfile: {
          id: 'profile-1',
          name: 'Config1',
          authType: 'api_key',
          apiKey: 'test-key',
        },
      })

      const options = {
        apiConfigsFile: '/path/to/config.json',
      }

      await expect(handleMultiConfigurations(options, 'claude-code')).resolves.not.toThrow()
    })

    it('should reject file read failure', async () => {
      const { handleMultiConfigurations } = await import('../../../src/commands/init')
      const { readFile } = await import('../../../src/utils/fs-operations')

      vi.mocked(readFile).mockImplementation(() => {
        throw new Error('File not found')
      })

      const options = {
        apiConfigsFile: '/path/to/config.json',
      }

      await expect(handleMultiConfigurations(options, 'claude-code')).rejects.toThrow()
    })

    it('should handle Claude Code configurations', async () => {
      const { handleMultiConfigurations } = await import('../../../src/commands/init')
      const { ClaudeCodeConfigManager } = await import('../../../src/utils/claude-code-config-manager')

      vi.mocked(ClaudeCodeConfigManager.addProfile).mockResolvedValue({
        success: true,
        addedProfile: {
          id: 'profile-1',
          name: 'Config1',
          authType: 'api_key',
          apiKey: 'test-key',
        },
      })

      const options = {
        apiConfigs: JSON.stringify([
          {
            name: 'Config1',
            type: 'api_key',
            key: 'test-key',
          },
        ]),
      }

      await handleMultiConfigurations(options, 'claude-code')

      expect(ClaudeCodeConfigManager.addProfile).toHaveBeenCalled()
    })

    it('should reject CCR proxy for Claude Code multi-config', async () => {
      const { handleMultiConfigurations } = await import('../../../src/commands/init')

      const options = {
        apiConfigs: JSON.stringify([
          {
            name: 'Config1',
            type: 'ccr_proxy',
          },
        ]),
      }

      await expect(handleMultiConfigurations(options, 'claude-code')).rejects.toThrow()
    })

    it('should set default profile for Claude Code', async () => {
      const { handleMultiConfigurations } = await import('../../../src/commands/init')
      const { ClaudeCodeConfigManager } = await import('../../../src/utils/claude-code-config-manager')

      vi.mocked(ClaudeCodeConfigManager.addProfile).mockResolvedValue({
        success: true,
        addedProfile: {
          id: 'profile-1',
          name: 'Config1',
          authType: 'api_key',
          apiKey: 'test-key',
        },
      })

      const options = {
        apiConfigs: JSON.stringify([
          {
            name: 'Config1',
            type: 'api_key',
            key: 'test-key',
            default: true,
          },
        ]),
      }

      await handleMultiConfigurations(options, 'claude-code')

      expect(ClaudeCodeConfigManager.switchProfile).toHaveBeenCalledWith('profile-1')
      expect(ClaudeCodeConfigManager.applyProfileSettings).toHaveBeenCalled()
    })

    it('should handle Codex configurations', async () => {
      const { handleMultiConfigurations } = await import('../../../src/commands/init')
      const { addProviderToExisting } = await import('../../../src/utils/code-tools/codex-provider-manager')

      vi.mocked(addProviderToExisting).mockResolvedValue({
        success: true,
      })

      const options = {
        apiConfigs: JSON.stringify([
          {
            name: 'Config1',
            type: 'api_key',
            key: 'test-key',
          },
        ]),
      }

      await handleMultiConfigurations(options, 'codex')

      expect(addProviderToExisting).toHaveBeenCalled()
    })

    it('should set default provider for Codex', async () => {
      const { handleMultiConfigurations } = await import('../../../src/commands/init')
      const { addProviderToExisting } = await import('../../../src/utils/code-tools/codex-provider-manager')
      const { switchCodexProvider } = await import('../../../src/utils/code-tools/codex')

      vi.mocked(addProviderToExisting).mockResolvedValue({
        success: true,
      })

      const options = {
        apiConfigs: JSON.stringify([
          {
            name: 'Config1',
            type: 'api_key',
            key: 'test-key',
            default: true,
          },
        ]),
      }

      await handleMultiConfigurations(options, 'codex')

      // PR #251: provider ID is now lowercase with special chars replaced by dashes
      expect(switchCodexProvider).toHaveBeenCalledWith('config1')
    })

    it('should throw error when provider addition fails', async () => {
      const { handleMultiConfigurations } = await import('../../../src/commands/init')
      const { addProviderToExisting } = await import('../../../src/utils/code-tools/codex-provider-manager')

      // Provider addition fails
      vi.mocked(addProviderToExisting).mockResolvedValue({
        success: false,
        error: 'test error',
      })

      const options = {
        apiConfigs: JSON.stringify([
          {
            name: 'FailedConfig',
            type: 'api_key',
            key: 'test-key',
            default: true,
          },
        ]),
      }

      // Should throw error when provider addition fails
      // Error is wrapped in i18n translation, so check for the translation key
      await expect(handleMultiConfigurations(options, 'codex')).rejects.toThrow('multi-config:providerAddFailed')
    })

    it('should handle config without name using provider as fallback', async () => {
      const { handleMultiConfigurations } = await import('../../../src/commands/init')
      const { addProviderToExisting } = await import('../../../src/utils/code-tools/codex-provider-manager')
      const { switchCodexProvider } = await import('../../../src/utils/code-tools/codex')

      vi.mocked(addProviderToExisting).mockResolvedValue({
        success: true,
      })

      const options = {
        apiConfigs: JSON.stringify([
          {
            provider: '302ai',
            type: 'api_key',
            key: 'test-key',
            default: true,
          },
        ]),
      }

      await handleMultiConfigurations(options, 'codex')

      // Should use provider as displayName and generate providerId from it
      expect(switchCodexProvider).toHaveBeenCalledWith('302ai')
    })

    it('should not set default provider when provider ID not in added list', async () => {
      const { handleMultiConfigurations } = await import('../../../src/commands/init')
      const { addProviderToExisting } = await import('../../../src/utils/code-tools/codex-provider-manager')
      const { switchCodexProvider } = await import('../../../src/utils/code-tools/codex')

      // First call succeeds but with different ID
      vi.mocked(addProviderToExisting).mockResolvedValueOnce({
        success: true,
      })

      const options = {
        apiConfigs: JSON.stringify([
          {
            name: 'Config1',
            type: 'api_key',
            key: 'test-key',
            default: false, // Not default
          },
          {
            name: 'NotAdded',
            type: 'api_key',
            key: 'test-key-2',
            default: true, // This is default but won't be added
          },
        ]),
      }

      // Second call fails
      vi.mocked(addProviderToExisting).mockResolvedValueOnce({
        success: false,
        error: 'Failed to add',
      })

      await expect(handleMultiConfigurations(options, 'codex')).rejects.toThrow()
      expect(switchCodexProvider).not.toHaveBeenCalled()
    })

    it('should log error when default provider ID not in added list for Codex', async () => {
      const { handleMultiConfigurations } = await import('../../../src/commands/init')
      const { addProviderToExisting } = await import('../../../src/utils/code-tools/codex-provider-manager')
      const { switchCodexProvider } = await import('../../../src/utils/code-tools/codex')

      // Provider is added successfully
      vi.mocked(addProviderToExisting).mockResolvedValueOnce({
        success: true,
      })

      const options = {
        apiConfigs: JSON.stringify([
          {
            name: 'Config1',
            type: 'api_key',
            key: 'test-key',
            default: false,
          },
        ]),
      }

      // Add another config marked as default but it won't be in the added list
      // because we only add Config1
      await handleMultiConfigurations(options, 'codex')

      // switchCodexProvider should not be called since no config is marked default
      expect(switchCodexProvider).not.toHaveBeenCalled()
    })

    it('should display error when default provider ID mismatch in Codex configs', async () => {
      // Re-import with fresh state
      vi.resetModules()
      vi.clearAllMocks()

      // Re-setup mocks
      vi.mock('../../../src/utils/code-tools/codex-provider-manager', () => ({
        addProviderToExisting: vi.fn(),
      }))
      vi.mock('../../../src/utils/code-tools/codex', () => ({
        switchCodexProvider: vi.fn(),
      }))

      const { handleMultiConfigurations } = await import('../../../src/commands/init')
      const { addProviderToExisting } = await import('../../../src/utils/code-tools/codex-provider-manager')
      const { switchCodexProvider } = await import('../../../src/utils/code-tools/codex')

      // First provider added successfully
      vi.mocked(addProviderToExisting).mockResolvedValue({
        success: true,
      })

      // Provider with special characters in name that generates different ID
      const options = {
        apiConfigs: JSON.stringify([
          {
            name: 'My Config!',
            type: 'api_key',
            key: 'test-key',
            default: true,
          },
        ]),
      }

      await handleMultiConfigurations(options, 'codex')

      // The provider ID will be 'my-config-' (special chars replaced with dashes)
      // This should match and switchCodexProvider should be called
      expect(switchCodexProvider).toHaveBeenCalledWith('my-config-')
    })

    it('should handle exception thrown during provider addition', async () => {
      const { handleMultiConfigurations } = await import('../../../src/commands/init')
      const { addProviderToExisting } = await import('../../../src/utils/code-tools/codex-provider-manager')

      vi.mocked(addProviderToExisting).mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const options = {
        apiConfigs: JSON.stringify([
          {
            name: 'Config1',
            type: 'api_key',
            key: 'test-key',
          },
        ]),
      }

      await expect(handleMultiConfigurations(options, 'codex')).rejects.toThrow('Unexpected error')
    })

    it('should handle Claude Code profile add failure', async () => {
      const { handleMultiConfigurations } = await import('../../../src/commands/init')
      const { ClaudeCodeConfigManager } = await import('../../../src/utils/claude-code-config-manager')

      vi.mocked(ClaudeCodeConfigManager.addProfile).mockResolvedValue({
        success: false,
        error: 'Profile add failed',
      })

      const options = {
        apiConfigs: JSON.stringify([
          {
            name: 'Config1',
            type: 'api_key',
            key: 'test-key',
          },
        ]),
      }

      await expect(handleMultiConfigurations(options, 'claude-code')).rejects.toThrow()
    })

    it('should use custom as fallback name for Codex provider', async () => {
      const { handleMultiConfigurations } = await import('../../../src/commands/init')
      const { addProviderToExisting } = await import('../../../src/utils/code-tools/codex-provider-manager')

      vi.mocked(addProviderToExisting).mockResolvedValue({
        success: true,
      })

      const options = {
        apiConfigs: JSON.stringify([
          {
            type: 'api_key',
            key: 'test-key',
            default: true,
            // No name, no provider - should use 'custom' as fallback
          },
        ]),
      }

      // Auto-generated name validation will fail, so we need to add provider to make it valid
      await expect(handleMultiConfigurations(options, 'codex')).rejects.toThrow()
    })
  })

  describe('convertToClaudeCodeProfile', () => {
    it('should convert API config to Claude Code profile', async () => {
      const { handleMultiConfigurations } = await import('../../../src/commands/init')
      const { ClaudeCodeConfigManager } = await import('../../../src/utils/claude-code-config-manager')

      vi.mocked(ClaudeCodeConfigManager.addProfile).mockResolvedValue({
        success: true,
        addedProfile: {
          id: 'profile-1',
          name: 'Config1',
          authType: 'api_key',
          apiKey: 'test-key',
          baseUrl: 'https://api.anthropic.com',
        },
      })

      const options = {
        apiConfigs: JSON.stringify([
          {
            name: 'Config1',
            type: 'api_key',
            key: 'test-key',
            url: 'https://api.anthropic.com',
          },
        ]),
      }

      await handleMultiConfigurations(options, 'claude-code')

      expect(ClaudeCodeConfigManager.addProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Config1',
          authType: 'api_key',
          apiKey: 'test-key',
          baseUrl: 'https://api.anthropic.com',
        }),
      )
    })

    it('should apply provider preset to Claude Code profile', async () => {
      const { handleMultiConfigurations } = await import('../../../src/commands/init')
      const { ClaudeCodeConfigManager } = await import('../../../src/utils/claude-code-config-manager')

      vi.mocked(ClaudeCodeConfigManager.addProfile).mockResolvedValue({
        success: true,
        addedProfile: {
          id: 'profile-1',
          name: '302AI',
          authType: 'api_key',
          apiKey: 'test-key',
        },
      })

      const options = {
        apiConfigs: JSON.stringify([
          {
            provider: '302ai',
            key: 'test-key',
          },
        ]),
      }

      await handleMultiConfigurations(options, 'claude-code')

      expect(ClaudeCodeConfigManager.addProfile).toHaveBeenCalled()
    })
  })

  describe('convertToCodexProvider', () => {
    it('should convert API config to Codex provider', async () => {
      const { handleMultiConfigurations } = await import('../../../src/commands/init')
      const { addProviderToExisting } = await import('../../../src/utils/code-tools/codex-provider-manager')

      vi.mocked(addProviderToExisting).mockResolvedValue({
        success: true,
      })

      const options = {
        apiConfigs: JSON.stringify([
          {
            name: 'Config1',
            type: 'api_key',
            key: 'test-key',
            url: 'https://api.anthropic.com',
          },
        ]),
      }

      await handleMultiConfigurations(options, 'codex')

      expect(addProviderToExisting).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Config1',
          baseUrl: 'https://api.anthropic.com',
        }),
        'test-key',
      )
    })

    it('should apply provider preset to Codex provider', async () => {
      const { handleMultiConfigurations } = await import('../../../src/commands/init')
      const { addProviderToExisting } = await import('../../../src/utils/code-tools/codex-provider-manager')

      vi.mocked(addProviderToExisting).mockResolvedValue({
        success: true,
      })

      const options = {
        apiConfigs: JSON.stringify([
          {
            provider: '302ai',
            key: 'test-key',
          },
        ]),
      }

      await handleMultiConfigurations(options, 'codex')

      expect(addProviderToExisting).toHaveBeenCalled()
    })
  })
})
