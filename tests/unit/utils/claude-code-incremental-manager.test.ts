import inquirer from 'inquirer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { i18n } from '../../../src/i18n'
import { ClaudeCodeConfigManager } from '../../../src/utils/claude-code-config-manager'
import { configureIncrementalManagement } from '../../../src/utils/claude-code-incremental-manager'

// Mock dependencies
vi.mock('inquirer')
vi.mock('../../../src/utils/claude-code-config-manager')
vi.mock('../../../src/utils/json-config')
vi.mock('../../../src/utils/validator')
vi.mock('../../../src/utils/claude-config')
vi.mock('../../../src/constants', () => ({
  ZCF_CONFIG_DIR: '/test/.zcf',
  SETTINGS_FILE: '/test/settings.json',
}))

describe('claudeCode Incremental Configuration Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock i18n.t function using any type to avoid complex type issues
    vi.mocked(i18n).t = vi.fn((key: string, params?: any) => {
      if (params) {
        return key.replace(/\{(\w+)\}/g, (match: any, param: any) => params[param] || match)
      }
      return key
    }) as any
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('configureIncrementalManagement', () => {
    it('should directly enter add profile flow when no existing configurations', async () => {
      // Mock no configuration situation
      vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue(null)

      vi.mocked(ClaudeCodeConfigManager.generateProfileId).mockReturnValue('test-profile-id')

      // Mock user input for adding configuration
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        profileName: 'Test Profile',
        authType: 'api_key' as const,
        apiKey: 'sk-ant-test-key',
        baseUrl: 'https://api.anthropic.com',
        description: 'Test description',
        setAsDefault: true,
      } as any)

      // Mock successful configuration addition
      vi.mocked(ClaudeCodeConfigManager.addProfile).mockResolvedValue({
        success: true,
        backupPath: '/test/backup.json',
      })

      vi.mocked(ClaudeCodeConfigManager.switchProfile).mockResolvedValue({
        success: true,
      })

      await configureIncrementalManagement()

      expect(ClaudeCodeConfigManager.readConfig).toHaveBeenCalled()
      expect(inquirer.prompt).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'profileName' }),
          expect.objectContaining({ name: 'authType' }),
          expect.objectContaining({ name: 'apiKey' }),
          expect.objectContaining({ name: 'setAsDefault' }),
        ]),
      )
      expect(ClaudeCodeConfigManager.addProfile).toHaveBeenCalled()
    })

    it('should show management menu when existing configurations are present', async () => {
      // Mock configuration situation
      const mockConfig = {
        currentProfileId: 'profile-1',
        profiles: {
          'profile-1': {
            id: 'profile-1',
            name: 'Profile 1',
            authType: 'api_key' as const,
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
          },
          'profile-2': {
            id: 'profile-2',
            name: 'Profile 2',
            authType: 'auth_token' as const,
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
          },
        },
        version: '1.0.0',
      }

      vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue(mockConfig)

      // Mock user selection to add configuration
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'add' }) // Select add
        .mockResolvedValueOnce({
          profileName: 'Test Profile',
          authType: 'api_key' as const,
          apiKey: 'sk-ant-test-key',
          baseUrl: 'https://api.anthropic.com',
          description: 'Test description',
          setAsDefault: true,
        } as any) // Detailed information for adding configuration

      // Mock necessary functions
      vi.mocked(ClaudeCodeConfigManager.generateProfileId).mockReturnValue('test-profile-id')
      vi.mocked(ClaudeCodeConfigManager.addProfile).mockResolvedValue({
        success: true,
        backupPath: '/test/backup.json',
      })
      vi.mocked(ClaudeCodeConfigManager.switchProfile).mockResolvedValue({
        success: true,
      })

      await configureIncrementalManagement()

      expect(ClaudeCodeConfigManager.readConfig).toHaveBeenCalled()
      expect(inquirer.prompt).toHaveBeenCalledTimes(2) // First action selection, second add configuration details
      expect(ClaudeCodeConfigManager.addProfile).toHaveBeenCalled()
    })

    it('should handle user skip operation', async () => {
      const mockConfig = {
        currentProfileId: 'profile-1',
        profiles: {
          'profile-1': {
            id: 'profile-1',
            name: 'Profile 1',
            authType: 'api_key' as const,
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
          },
        },
        version: '1.0.0',
      }

      vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue(mockConfig)

      // Mock user selection to skip
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        action: 'skip',
      })

      await configureIncrementalManagement()

      expect(inquirer.prompt).toHaveBeenCalled()
      // Verify no other configuration management functions were called
      expect(ClaudeCodeConfigManager.addProfile).not.toHaveBeenCalled()
      expect(ClaudeCodeConfigManager.updateProfile).not.toHaveBeenCalled()
      expect(ClaudeCodeConfigManager.deleteProfiles).not.toHaveBeenCalled()
    })

    it('should handle edit configuration flow', async () => {
      const mockConfig = {
        currentProfileId: 'profile-1',
        profiles: {
          'profile-1': {
            id: 'profile-1',
            name: 'Profile 1',
            authType: 'api_key' as const,
            apiKey: 'sk-ant-old-key',
            baseUrl: 'https://api.anthropic.com',
            description: 'Old description',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
          },
        },
        version: '1.0.0',
      }

      vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue(mockConfig)

      // Mock user selection to edit
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'edit' }) // Select edit
        .mockResolvedValueOnce({ selectedProfileId: 'profile-1' }) // Select configuration to edit
        .mockResolvedValueOnce({
          profileName: 'Updated Profile',
          apiKey: 'sk-ant-new-key',
          baseUrl: 'https://api.anthropic.com',
          description: 'Updated description',
        })

      vi.mocked(ClaudeCodeConfigManager.updateProfile).mockResolvedValue({
        success: true,
        backupPath: '/test/backup.json',
      })

      vi.mocked(ClaudeCodeConfigManager.getProfileById).mockResolvedValue(mockConfig.profiles['profile-1'])

      await configureIncrementalManagement()

      expect(ClaudeCodeConfigManager.updateProfile).toHaveBeenCalledWith(
        'profile-1',
        expect.objectContaining({
          name: 'Updated Profile',
          description: 'Updated description',
          updatedAt: expect.any(String),
        }),
      )
    })

    it('should handle delete configuration flow', async () => {
      const mockConfig = {
        currentProfileId: 'profile-1',
        profiles: {
          'profile-1': {
            id: 'profile-1',
            name: 'Profile 1',
            authType: 'api_key' as const,
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
          },
          'profile-2': {
            id: 'profile-2',
            name: 'Profile 2',
            authType: 'auth_token' as const,
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
          },
        },
        version: '1.0.0',
      }

      vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue(mockConfig)

      // Mock user selection to delete
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'delete' }) // Select delete
        .mockResolvedValueOnce({ selectedProfileIds: ['profile-2'] }) // Select configurations to delete
        .mockResolvedValueOnce({ confirmed: true }) // Confirm deletion

      vi.mocked(ClaudeCodeConfigManager.deleteProfiles).mockResolvedValue({
        success: true,
        backupPath: '/test/backup.json',
        newCurrentProfileId: 'profile-1',
      })

      vi.mocked(ClaudeCodeConfigManager.getProfileById).mockResolvedValue(mockConfig.profiles['profile-1'])

      await configureIncrementalManagement()

      expect(ClaudeCodeConfigManager.deleteProfiles).toHaveBeenCalledWith(['profile-2'])
    })

    it('should prevent deletion of all configurations', async () => {
      const mockConfig = {
        currentProfileId: 'profile-1',
        profiles: {
          'profile-1': {
            id: 'profile-1',
            name: 'Profile 1',
            authType: 'api_key' as const,
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
          },
        },
        version: '1.0.0',
      }

      vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue(mockConfig)

      // Mock user attempting to delete the only configuration
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'delete' }) // Select delete

      await configureIncrementalManagement()

      // Should not show deletion selection interface because there's only one configuration
      expect(inquirer.prompt).toHaveBeenCalledTimes(1) // Only action selection, no deletion selection
      expect(ClaudeCodeConfigManager.deleteProfiles).not.toHaveBeenCalled()
    })

    it('should correctly handle CCR proxy configuration', async () => {
      const mockConfig = {
        currentProfileId: 'profile-1',
        profiles: {
          'profile-1': {
            id: 'profile-1',
            name: 'Profile 1',
            authType: 'api_key' as const,
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
          },
        },
        version: '1.0.0',
      }

      vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue(mockConfig)

      // Mock user adding CCR configuration
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'add' }) // Select add
        .mockResolvedValueOnce({
          profileName: 'CCR Profile',
          authType: 'ccr_proxy' as const,
          description: 'CCR Proxy Configuration',
          setAsDefault: false,
        })

      vi.mocked(ClaudeCodeConfigManager.addProfile).mockResolvedValue({
        success: true,
        backupPath: '/test/backup.json',
      })

      vi.mocked(ClaudeCodeConfigManager.generateProfileId).mockReturnValue('ccr-profile-id')

      await configureIncrementalManagement()

      expect(ClaudeCodeConfigManager.addProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'ccr-profile-id',
          name: 'CCR Profile',
          authType: 'ccr_proxy' as const,
          description: 'CCR Proxy Configuration',
          // Note: CCR configuration should not have apiKey and baseUrl
        }),
      )
    })
  })

  describe('configuration validation', () => {
    it('should validate configuration name format', async () => {
      vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue(null)

      // Mock user input with invalid name
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        profileName: 'Invalid@Name#', // Contains invalid characters
        authType: 'api_key' as const,
        apiKey: 'sk-ant-test-key',
        baseUrl: 'https://api.anthropic.com',
        description: 'Test description',
        setAsDefault: true,
      })

      // Validation function should return error message
      await expect(configureIncrementalManagement()).rejects.toThrow()
    })

    it('should validate API key format', async () => {
      vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue(null)

      // Mock validation failure
      const { validateApiKey } = await import('../../../src/utils/validator')
      vi.mocked(validateApiKey).mockReturnValue({
        isValid: false,
        error: 'Invalid API key format',
      })

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        profileName: 'Test Profile',
        authType: 'api_key' as const,
        apiKey: 'invalid-key', // Invalid API key
        baseUrl: 'https://api.anthropic.com',
        description: 'Test description',
        setAsDefault: true,
      })

      await expect(configureIncrementalManagement()).rejects.toThrow()
    })

    it('should validate URL format', async () => {
      vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue(null)

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({
        profileName: 'Test Profile',
        authType: 'api_key' as const,
        apiKey: 'sk-ant-test-key',
        baseUrl: 'invalid-url', // Invalid URL
        description: 'Test description',
        setAsDefault: true,
      })

      await expect(configureIncrementalManagement()).rejects.toThrow()
    })
  })
})
