import type { InitOptions } from '../../../src/commands/init'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock modules
vi.mock('../../../src/i18n', () => ({
  i18n: {
    t: vi.fn((key: string, _params?: any) => {
      const translations: Record<string, string> = {
        'multi-config:configsAddedSuccessfully': 'API configurations added successfully',
        'multi-config:configsFailed': 'Failed to add API configurations: {error}',
        'multi-config:profileAdded': 'Profile added: {name}',
        'multi-config:defaultProfileSet': 'Default profile set: {name}',
        'multi-config:providerAdded': 'Provider added: {name}',
        'multi-config:defaultProviderSet': 'Default provider set: {name}',
      }
      return translations[key] || key
    }),
    language: 'en',
  },
  ensureI18nInitialized: vi.fn(),
}))

vi.mock('../../../src/utils/code-tools/codex-provider-manager', () => ({
  addProviderToExisting: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('../../../src/utils/code-tools/codex', () => ({
  switchCodexProvider: vi.fn().mockResolvedValue(undefined),
  runCodexFullInit: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../src/utils/claude-code-config-manager', () => ({
  ClaudeCodeConfigManager: {
    addProfile: vi.fn().mockResolvedValue({ success: true }),
    getProfileByName: vi.fn().mockReturnValue({ id: 'test-id', name: 'Test Profile', authType: 'api_key' }),
    switchProfile: vi.fn().mockResolvedValue({ success: true }),
    syncCcrProfile: vi.fn().mockResolvedValue(undefined),
    generateProfileId: vi.fn().mockReturnValue('test-profile-id'),
  },
}))

vi.mock('../../../src/utils/fs-operations', () => ({
  readFile: vi.fn(),
}))

describe('handleMultiConfigurations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('should handle Claude Code API configurations from JSON string', async () => {
    const { handleMultiConfigurations } = await import('../../../src/commands/init')

    const apiConfigs = JSON.stringify([
      {
        name: 'Test Config',
        type: 'api_key',
        key: 'sk-test-key',
        url: 'https://api.anthropic.com',
        default: true,
      },
    ])

    const options: InitOptions = {
      skipPrompt: true,
      apiConfigs,
    }

    await handleMultiConfigurations(options, 'claude-code')

    const { ClaudeCodeConfigManager } = await import('../../../src/utils/claude-code-config-manager')
    expect(ClaudeCodeConfigManager.addProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Config',
        authType: 'api_key',
        apiKey: 'sk-test-key',
        baseUrl: 'https://api.anthropic.com',
      }),
    )
  })

  it('should handle Codex provider configurations from JSON string', async () => {
    const { handleMultiConfigurations } = await import('../../../src/commands/init')

    const apiConfigs = JSON.stringify([
      {
        name: 'Codex Provider',
        type: 'api_key',
        key: 'sk-codex-key',
        url: 'https://api.anthropic.com',
      },
    ])

    const options: InitOptions = {
      skipPrompt: true,
      apiConfigs,
    }

    await handleMultiConfigurations(options, 'codex')

    const { addProviderToExisting } = await import('../../../src/utils/code-tools/codex-provider-manager')
    expect(addProviderToExisting).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Codex Provider',
        baseUrl: 'https://api.anthropic.com',
      }),
      'sk-codex-key',
    )
  })

  it('should handle API configurations from file', async () => {
    const { handleMultiConfigurations } = await import('../../../src/commands/init')

    const { readFile } = await import('../../../src/utils/fs-operations')
    vi.mocked(readFile).mockReturnValue(JSON.stringify([
      {
        name: 'File Config',
        type: 'auth_token',
        key: 'sk-auth-token',
        default: true,
      },
    ]))

    const options: InitOptions = {
      skipPrompt: true,
      apiConfigsFile: '/path/to/configs.json',
    }

    await handleMultiConfigurations(options, 'claude-code')

    expect(readFile).toHaveBeenCalledWith('/path/to/configs.json')
    const { ClaudeCodeConfigManager } = await import('../../../src/utils/claude-code-config-manager')
    expect(ClaudeCodeConfigManager.addProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'File Config',
        authType: 'auth_token',
        apiKey: 'sk-auth-token',
      }),
    )
  })

  it('should throw error for invalid JSON', async () => {
    const { handleMultiConfigurations } = await import('../../../src/commands/init')

    const options: InitOptions = {
      skipPrompt: true,
      apiConfigs: 'invalid-json',
    }

    await expect(handleMultiConfigurations(options, 'claude-code')).rejects.toThrow('Invalid API configs JSON')
    expect(console.error).toHaveBeenCalled()
  })

  it('should throw error for file read error', async () => {
    const { handleMultiConfigurations } = await import('../../../src/commands/init')

    const { readFile } = await import('../../../src/utils/fs-operations')
    vi.mocked(readFile).mockImplementation(() => {
      throw new Error('File read error')
    })

    const options: InitOptions = {
      skipPrompt: true,
      apiConfigsFile: '/path/to/configs.json',
    }

    await expect(handleMultiConfigurations(options, 'claude-code')).rejects.toThrow('Failed to read API configs file')
    expect(console.error).toHaveBeenCalled()
  })

  it('should validate API configuration fields', async () => {
    const { handleMultiConfigurations } = await import('../../../src/commands/init')

    const apiConfigs = JSON.stringify([
      {
        type: 'api_key',
        key: 'sk-test-key',
        // Missing name field
      },
    ])

    const options: InitOptions = {
      skipPrompt: true,
      apiConfigs,
    }

    await expect(handleMultiConfigurations(options, 'claude-code')).rejects.toThrow('Each config must have a valid name')
    expect(console.error).toHaveBeenCalled()
  })

  it('should validate API configuration name uniqueness', async () => {
    const { handleMultiConfigurations } = await import('../../../src/commands/init')

    const apiConfigs = JSON.stringify([
      { name: 'Duplicate', type: 'api_key', key: 'sk-key1' },
      { name: 'Duplicate', type: 'auth_token', key: 'sk-key2' },
    ])

    const options: InitOptions = {
      skipPrompt: true,
      apiConfigs,
    }

    await expect(handleMultiConfigurations(options, 'claude-code')).rejects.toThrow('Duplicate config name: Duplicate')
    expect(console.error).toHaveBeenCalled()
  })

  it('should validate API configuration type', async () => {
    const { handleMultiConfigurations } = await import('../../../src/commands/init')

    const apiConfigs = JSON.stringify([
      { name: 'Test', type: 'invalid-type', key: 'sk-test' },
    ])

    const options: InitOptions = {
      skipPrompt: true,
      apiConfigs,
    }

    await expect(handleMultiConfigurations(options, 'claude-code')).rejects.toThrow('Invalid auth type: invalid-type')
    expect(console.error).toHaveBeenCalled()
  })

  it('should require API key for non-CCR types', async () => {
    const { handleMultiConfigurations } = await import('../../../src/commands/init')

    const apiConfigs = JSON.stringify([
      { name: 'Test', type: 'api_key' },
      // Missing key field
    ])

    const options: InitOptions = {
      skipPrompt: true,
      apiConfigs,
    }

    await expect(handleMultiConfigurations(options, 'claude-code')).rejects.toThrow('Config "Test" requires API key')
    expect(console.error).toHaveBeenCalled()
  })

  it('should allow CCR proxy without API key', async () => {
    const { handleMultiConfigurations } = await import('../../../src/commands/init')

    const apiConfigs = JSON.stringify([
      { name: 'CCR Config', type: 'ccr_proxy' },
    ])

    const options: InitOptions = {
      skipPrompt: true,
      apiConfigs,
    }

    await expect(handleMultiConfigurations(options, 'claude-code')).resolves.not.toThrow()

    const { ClaudeCodeConfigManager } = await import('../../../src/utils/claude-code-config-manager')
    expect(ClaudeCodeConfigManager.addProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'CCR Config',
        authType: 'ccr_proxy',
      }),
    )
  })
})
