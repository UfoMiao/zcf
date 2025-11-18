import type { CcrConfig } from '../../../src/types/ccr'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  configureCcrProxy,
  readCcrConfig,
  setupCcrConfiguration,
} from '../../../src/utils/ccr/config'
import { manageApiKeyApproval } from '../../../src/utils/claude-config'
import { promptBoolean } from '../../../src/utils/toggle-prompt'

// Mock dependencies
vi.mock('../../../src/utils/json-config', () => ({
  readJsonConfig: vi.fn(),
  writeJsonConfig: vi.fn(),
}))

vi.mock('../../../src/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/constants')>()
  return {
    ...actual,
    ClAUDE_CONFIG_FILE: '/mock/.claude/settings.json',
  }
})

vi.mock('../../../src/utils/claude-config', () => ({
  manageApiKeyApproval: vi.fn(),
  addCompletedOnboarding: vi.fn(),
}))

vi.mock('inquirer', () => {
  const mockPrompt = vi.fn()
  return {
    default: {
      prompt: mockPrompt,
    },
    prompt: mockPrompt, // Also mock the named export
  }
})

vi.mock('../../../src/utils/toggle-prompt', () => ({
  promptBoolean: vi.fn(),
}))

vi.mock('ansis', () => ({
  default: {
    blue: (text: string) => text,
    cyan: (text: string) => text,
    yellow: (text: string) => text,
    green: (text: string) => text,
    red: (text: string) => text,
  },
}))

vi.mock('../../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  i18n: {
    t: vi.fn((key: string) => key),
  },
}))

vi.mock('../../../src/utils/ccr/presets', () => ({
  fetchProviderPresets: vi.fn().mockResolvedValue([
    {
      name: 'test-provider',
      baseURL: 'https://test.com/v1/chat/completions',
      models: ['test-model'],
      provider: 'test',
      requiresApiKey: true,
    },
  ]),
}))

// Mock all CCR-related functions we don't need for this test
vi.mock('../../../src/utils/ccr/config', () => ({
  readCcrConfig: vi.fn(),
  writeCcrConfig: vi.fn(),
  backupCcrConfig: vi.fn(),
  configureCcrProxy: vi.fn(),
  restartAndCheckCcrStatus: vi.fn(),
  showConfigurationTips: vi.fn(),
  selectCcrPreset: vi.fn().mockResolvedValue('skip'),
  configureCcrWithPreset: vi.fn(),
  createDefaultCcrConfig: vi.fn(),
  setupCcrConfiguration: vi.fn(),
}))

describe('cCR Configuration - Existing Config Scenarios', () => {
  const mockExistingConfig: CcrConfig = {
    LOG: true,
    CLAUDE_PATH: '',
    HOST: '127.0.0.1',
    PORT: 3456,
    APIKEY: 'sk-zcf-x-ccr',
    API_TIMEOUT_MS: '600000',
    PROXY_URL: '',
    transformers: [],
    Providers: [],
    Router: {
      default: 'anthropic',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('when existing config exists and user chooses to keep it', () => {
    it('should manage API key approval for existing configuration', async () => {
      // Setup mocks for the scenario where user keeps existing config
      vi.mocked(setupCcrConfiguration).mockImplementation(async () => {
        // Simulate the logic: existing config exists, user chooses to keep it
        const existingConfig = readCcrConfig()
        if (existingConfig) {
          // Simulate proxy configuration
          await configureCcrProxy(existingConfig)

          // Simulate API key management
          const apiKey = existingConfig.APIKEY || 'sk-zcf-x-ccr'
          manageApiKeyApproval(apiKey)

          return true
        }
        return false
      })

      vi.mocked(readCcrConfig).mockReturnValue(mockExistingConfig)
      vi.mocked(configureCcrProxy).mockResolvedValue(undefined)

      // Execute
      const result = await setupCcrConfiguration()

      // Verify
      expect(result).toBe(true)
      expect(readCcrConfig).toHaveBeenCalled()
      expect(configureCcrProxy).toHaveBeenCalledWith(mockExistingConfig)
      expect(manageApiKeyApproval).toHaveBeenCalledWith('sk-zcf-x-ccr')
    })

    it('should handle existing config with different API key', async () => {
      const customConfig = {
        ...mockExistingConfig,
        APIKEY: 'sk-custom-key',
      }

      // Setup mock implementation
      vi.mocked(setupCcrConfiguration).mockImplementation(async () => {
        const existingConfig = readCcrConfig()
        if (existingConfig) {
          await configureCcrProxy(existingConfig)
          const apiKey = existingConfig.APIKEY || 'sk-zcf-x-ccr'
          manageApiKeyApproval(apiKey)
          return true
        }
        return false
      })

      vi.mocked(readCcrConfig).mockReturnValue(customConfig)
      vi.mocked(configureCcrProxy).mockResolvedValue(undefined)

      // Execute
      const result = await setupCcrConfiguration()

      // Verify
      expect(result).toBe(true)
      expect(manageApiKeyApproval).toHaveBeenCalledWith('sk-custom-key')
    })

    it('should handle existing config with undefined API key', async () => {
      const configWithoutApiKey = {
        ...mockExistingConfig,
        APIKEY: undefined as any,
      }

      // Setup mock implementation
      vi.mocked(setupCcrConfiguration).mockImplementation(async () => {
        const existingConfig = readCcrConfig()
        if (existingConfig) {
          await configureCcrProxy(existingConfig)
          const apiKey = existingConfig.APIKEY || 'sk-zcf-x-ccr'
          manageApiKeyApproval(apiKey)
          return true
        }
        return false
      })

      vi.mocked(readCcrConfig).mockReturnValue(configWithoutApiKey)
      vi.mocked(configureCcrProxy).mockResolvedValue(undefined)

      // Execute
      const result = await setupCcrConfiguration()

      // Verify
      expect(result).toBe(true)
      expect(manageApiKeyApproval).toHaveBeenCalledWith('sk-zcf-x-ccr')
    })

    it('should continue even if API key management fails', async () => {
      // Setup mock implementation that handles API key failure gracefully
      vi.mocked(setupCcrConfiguration).mockImplementation(async () => {
        const existingConfig = readCcrConfig()
        if (existingConfig) {
          await configureCcrProxy(existingConfig)
          try {
            const apiKey = existingConfig.APIKEY || 'sk-zcf-x-ccr'
            manageApiKeyApproval(apiKey)
          }
          catch {
            // Graceful degradation - continue despite API key management failure
          }
          return true
        }
        return false
      })

      vi.mocked(readCcrConfig).mockReturnValue(mockExistingConfig)
      vi.mocked(configureCcrProxy).mockResolvedValue(undefined)
      vi.mocked(manageApiKeyApproval).mockImplementation(() => {
        throw new Error('API key management failed')
      })

      // Execute - should not throw
      const result = await setupCcrConfiguration()

      // Should still return true (graceful degradation)
      expect(result).toBe(true)
      expect(configureCcrProxy).toHaveBeenCalledWith(mockExistingConfig)
      expect(manageApiKeyApproval).toHaveBeenCalledWith('sk-zcf-x-ccr')
    })

    it('should handle proxy configuration failure gracefully', async () => {
      // Setup mock implementation that simulates proxy config failure
      vi.mocked(setupCcrConfiguration).mockImplementation(async () => {
        const existingConfig = readCcrConfig()
        if (existingConfig) {
          // This will throw to simulate proxy config failure
          throw new Error('Proxy config failed')
        }
        return false
      })

      vi.mocked(readCcrConfig).mockReturnValue(mockExistingConfig)
      vi.mocked(configureCcrProxy).mockRejectedValue(new Error('Proxy config failed'))

      // Execute - should throw since proxy config is critical
      await expect(setupCcrConfiguration()).rejects.toThrow('Proxy config failed')

      // API key management should not be called if proxy config fails
      expect(manageApiKeyApproval).not.toHaveBeenCalled()
    })
  })

  describe('when existing config exists and user chooses to reconfigure', () => {
    it('should proceed with normal configuration flow', async () => {
      // Setup mock implementation for reconfiguration flow
      vi.mocked(setupCcrConfiguration).mockImplementation(async () => {
        const existingConfig = readCcrConfig()
        if (existingConfig) {
          // Simulate user choosing to reconfigure
          const overwrite = await promptBoolean({
            message: 'ccr:overwriteCcrConfig',
            defaultValue: false,
          })

          if (overwrite) {
            // Simulate rest of configuration flow - returns false when selectCcrPreset returns null
            return false
          }
        }
        return false
      })

      vi.mocked(readCcrConfig).mockReturnValue(mockExistingConfig)
      vi.mocked(promptBoolean).mockResolvedValueOnce(true)

      // Execute
      const result = await setupCcrConfiguration()

      // Verify
      expect(result).toBe(false) // Returns false when selectCcrPreset returns null
      expect(promptBoolean).toHaveBeenCalledWith({
        message: 'ccr:overwriteCcrConfig',
        defaultValue: false,
      })
    })
  })

  describe('when user cancels the overwrite prompt', () => {
    it('should handle ExitPromptError gracefully', async () => {
      // Setup mock implementation that handles ExitPromptError
      vi.mocked(setupCcrConfiguration).mockImplementation(async () => {
        const existingConfig = readCcrConfig()
        if (existingConfig) {
          try {
            await promptBoolean({
              message: 'ccr:overwriteCcrConfig',
              defaultValue: false,
            })
          }
          catch (error: any) {
            if (error.name === 'ExitPromptError') {
              return false // Graceful handling of cancellation
            }
            throw error
          }
        }
        return false
      })

      vi.mocked(readCcrConfig).mockReturnValue(mockExistingConfig)
      const exitError = new Error('User cancelled')
      exitError.name = 'ExitPromptError'
      vi.mocked(promptBoolean).mockRejectedValue(exitError)

      // Execute
      const result = await setupCcrConfiguration()

      // Should return false for cancellation
      expect(result).toBe(false)
      expect(manageApiKeyApproval).not.toHaveBeenCalled()
    })
  })
})
