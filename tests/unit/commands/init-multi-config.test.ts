import { beforeEach, describe, expect, it, vi } from 'vitest'

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

      expect(switchCodexProvider).toHaveBeenCalledWith('Config1')
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
