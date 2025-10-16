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
  ZCF_CONFIG_FILE: '/test/.zcf/config.toml',
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
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({
          profileName: 'Test Profile',
          authType: 'api_key' as const,
          apiKey: 'sk-ant-test-key',
          baseUrl: 'https://api.anthropic.com',
          setAsDefault: true,
        } as any)
        .mockResolvedValueOnce({ continueAdding: false })

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
          setAsDefault: true,
        } as any) // Detailed information for adding configuration
        .mockResolvedValueOnce({ continueAdding: false })

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
      expect(inquirer.prompt).toHaveBeenCalledTimes(3)
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
        })

      vi.mocked(ClaudeCodeConfigManager.updateProfile).mockResolvedValue({
        success: true,
        backupPath: '/test/backup.json',
        updatedProfile: {
          id: 'profile-1',
          name: 'Updated Profile',
          authType: 'api_key',
          apiKey: 'sk-ant-new-key',
          baseUrl: 'https://api.anthropic.com',
        },
      })

      vi.mocked(ClaudeCodeConfigManager.getProfileById).mockResolvedValue(mockConfig.profiles['profile-1'])

      await configureIncrementalManagement()

      expect(ClaudeCodeConfigManager.updateProfile).toHaveBeenCalledWith(
        'profile-1',
        expect.objectContaining({
          name: 'Updated Profile',
          apiKey: 'sk-ant-new-key',
          baseUrl: 'https://api.anthropic.com',
        }),
      )
      const updatePayload = vi.mocked(ClaudeCodeConfigManager.updateProfile).mock.calls.at(-1)?.[1] as Record<string, any>
      expect(updatePayload).not.toHaveProperty('description')
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

    it('should set new API profile as default and apply settings', async () => {
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

      // Mock user adding new API profile and setting as default
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'add' }) // Select add
        .mockResolvedValueOnce({
          profileName: 'API Profile',
          authType: 'api_key' as const,
          apiKey: 'sk-ant-test-key',
          baseUrl: 'https://api.anthropic.com',
          setAsDefault: true,
        })
        .mockResolvedValueOnce({ continueAdding: false })

      vi.mocked(ClaudeCodeConfigManager.addProfile).mockResolvedValue({
        success: true,
        backupPath: '/test/backup.json',
        addedProfile: {
          id: 'api-profile-id',
          name: 'API Profile',
          authType: 'api_key',
          apiKey: 'sk-ant-test-key',
          baseUrl: 'https://api.anthropic.com',
        },
      })

      vi.mocked(ClaudeCodeConfigManager.generateProfileId).mockReturnValue('api-profile-id')
      vi.mocked(ClaudeCodeConfigManager.switchProfile).mockResolvedValue({ success: true })
      vi.mocked(ClaudeCodeConfigManager.applyProfileSettings).mockResolvedValue()

      await configureIncrementalManagement()

      expect(ClaudeCodeConfigManager.addProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'api-profile-id',
          name: 'API Profile',
          authType: 'api_key',
          apiKey: 'sk-ant-test-key',
          baseUrl: 'https://api.anthropic.com',
        }),
      )
      expect(ClaudeCodeConfigManager.switchProfile).toHaveBeenCalledWith('api-profile-id')
      expect(ClaudeCodeConfigManager.applyProfileSettings).toHaveBeenCalledWith(expect.objectContaining({
        id: 'api-profile-id',
        name: 'API Profile',
      }))
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

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({
          profileName: 'Test Profile',
          authType: 'api_key' as const,
          apiKey: 'invalid-key', // Invalid API key
          baseUrl: 'https://api.anthropic.com',
          setAsDefault: true,
        })
        .mockResolvedValueOnce({ continueAdding: false })

      await expect(configureIncrementalManagement()).rejects.toThrow()
    })

    it('should validate URL format', async () => {
      vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue(null)

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({
          profileName: 'Test Profile',
          authType: 'api_key' as const,
          apiKey: 'sk-ant-test-key',
          baseUrl: 'invalid-url', // Invalid URL
          setAsDefault: true,
        })
        .mockResolvedValueOnce({ continueAdding: false })

      await expect(configureIncrementalManagement()).rejects.toThrow()
    })
  })

  describe('error handling and edge cases', () => {
    it('should handle profile addition failure', async () => {
      vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue(null)

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({
          profileName: 'Test Profile',
          authType: 'api_key' as const,
          apiKey: 'sk-ant-test-key',
          baseUrl: 'https://api.anthropic.com',
          setAsDefault: true,
        } as any)
        .mockResolvedValueOnce({ continueAdding: false })

      // Mock profile addition failure
      vi.mocked(ClaudeCodeConfigManager.addProfile).mockResolvedValue({
        success: false,
        error: 'Profile already exists',
      })

      await configureIncrementalManagement()

      expect(ClaudeCodeConfigManager.addProfile).toHaveBeenCalled()
      // Should not call switchProfile when addition fails
      expect(ClaudeCodeConfigManager.switchProfile).not.toHaveBeenCalled()
    })

    it('should handle profile update failure', async () => {
      const mockConfig = {
        currentProfileId: 'profile-1',
        profiles: {
          'profile-1': {
            id: 'profile-1',
            name: 'Profile 1',
            authType: 'api_key' as const,
            apiKey: 'sk-ant-old-key',
            baseUrl: 'https://api.anthropic.com',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
          },
        },
        version: '1.0.0',
      }

      vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue(mockConfig)

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'edit' })
        .mockResolvedValueOnce({ selectedProfileId: 'profile-1' })
        .mockResolvedValueOnce({
          profileName: 'Updated Profile',
          apiKey: 'sk-ant-new-key',
          baseUrl: 'https://api.anthropic.com',
        })

      // Mock update failure
      vi.mocked(ClaudeCodeConfigManager.updateProfile).mockResolvedValue({
        success: false,
        error: 'Profile not found',
      })

      await configureIncrementalManagement()

      expect(ClaudeCodeConfigManager.updateProfile).toHaveBeenCalled()
      // Should not call getProfileById when update fails
      expect(ClaudeCodeConfigManager.getProfileById).not.toHaveBeenCalled()
    })

    it('should handle profile deletion failure', async () => {
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

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'delete' })
        .mockResolvedValueOnce({ selectedProfileIds: ['profile-2'] })
        .mockResolvedValueOnce({ confirmed: true })

      // Mock deletion failure
      vi.mocked(ClaudeCodeConfigManager.deleteProfiles).mockResolvedValue({
        success: false,
        error: 'Failed to delete profiles',
      })

      await configureIncrementalManagement()

      expect(ClaudeCodeConfigManager.deleteProfiles).toHaveBeenCalledWith(['profile-2'])
      // Should not call getProfileById when deletion fails
      expect(ClaudeCodeConfigManager.getProfileById).not.toHaveBeenCalled()
    })

    it('should handle user cancellation during profile selection', async () => {
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

      // Mock user cancellation (no selected profile)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'edit' })
        .mockResolvedValueOnce({ selectedProfileId: null })

      await configureIncrementalManagement()

      expect(ClaudeCodeConfigManager.updateProfile).not.toHaveBeenCalled()
    })

    it('should handle profile not found during edit', async () => {
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

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'edit' })
        .mockResolvedValueOnce({ selectedProfileId: 'non-existent-profile' })

      await configureIncrementalManagement()

      expect(ClaudeCodeConfigManager.updateProfile).not.toHaveBeenCalled()
    })

    it('should handle user cancellation during delete confirmation', async () => {
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

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'delete' })
        .mockResolvedValueOnce({ selectedProfileIds: ['profile-2'] })
        .mockResolvedValueOnce({ confirmed: false }) // User cancels deletion

      await configureIncrementalManagement()

      expect(ClaudeCodeConfigManager.deleteProfiles).not.toHaveBeenCalled()
    })

    it('should handle user cancellation during profile selection for deletion', async () => {
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

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'delete' })
        .mockResolvedValueOnce({ selectedProfileIds: [] }) // User selects nothing

      await configureIncrementalManagement()

      expect(ClaudeCodeConfigManager.deleteProfiles).not.toHaveBeenCalled()
    })

    it('should handle auth_token profile type correctly', async () => {
      vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue(null)

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({
          profileName: 'Auth Token Profile',
          authType: 'auth_token' as const,
          apiKey: 'sk-ant-auth-token',
          baseUrl: 'https://api.anthropic.com',
          setAsDefault: true,
        } as any)
        .mockResolvedValueOnce({ continueAdding: false })

      vi.mocked(ClaudeCodeConfigManager.generateProfileId).mockReturnValue('auth-token-profile-id')
      vi.mocked(ClaudeCodeConfigManager.addProfile).mockResolvedValue({
        success: true,
        backupPath: '/test/backup.json',
      })
      vi.mocked(ClaudeCodeConfigManager.switchProfile).mockResolvedValue({
        success: true,
      })

      await configureIncrementalManagement()

      expect(ClaudeCodeConfigManager.addProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'auth-token-profile-id',
          name: 'Auth Token Profile',
          authType: 'auth_token' as const,
          apiKey: 'sk-ant-auth-token',
          baseUrl: 'https://api.anthropic.com',
        }),
      )
    })

    it('should handle setting non-default profile', async () => {
      vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue(null)

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({
          profileName: 'Non-Default Profile',
          authType: 'api_key' as const,
          apiKey: 'sk-ant-test-key',
          baseUrl: 'https://api.anthropic.com',
          setAsDefault: false, // Not set as default
        } as any)
        .mockResolvedValueOnce({ continueAdding: false })

      vi.mocked(ClaudeCodeConfigManager.generateProfileId).mockReturnValue('non-default-profile-id')
      vi.mocked(ClaudeCodeConfigManager.addProfile).mockResolvedValue({
        success: true,
        backupPath: '/test/backup.json',
      })

      await configureIncrementalManagement()

      expect(ClaudeCodeConfigManager.addProfile).toHaveBeenCalled()
      // Should not call switchProfile when setAsDefault is false
      expect(ClaudeCodeConfigManager.switchProfile).not.toHaveBeenCalled()
    })

    it('should handle editing CCR proxy profile', async () => {
      const mockConfig = {
        currentProfileId: 'profile-1',
        profiles: {
          'profile-1': {
            id: 'profile-1',
            name: 'CCR Profile',
            authType: 'ccr_proxy' as const,
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
          },
        },
        version: '1.0.0',
      }

      vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue(mockConfig)

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'edit' })
        .mockResolvedValueOnce({ selectedProfileId: 'profile-1' })
        .mockResolvedValueOnce({
          profileName: 'Updated CCR Profile',
        })

      vi.mocked(ClaudeCodeConfigManager.updateProfile).mockResolvedValue({
        success: true,
        backupPath: '/test/backup.json',
        updatedProfile: {
          id: 'profile-1',
          name: 'Updated CCR Profile',
          authType: 'ccr_proxy',
        },
      })

      const updatedProfile = {
        ...mockConfig.profiles['profile-1'],
        name: 'Updated CCR Profile',
        updatedAt: expect.any(String),
      }

      vi.mocked(ClaudeCodeConfigManager.getProfileById).mockResolvedValue(updatedProfile)

      await configureIncrementalManagement()

      expect(ClaudeCodeConfigManager.updateProfile).toHaveBeenCalledWith(
        'profile-1',
        expect.objectContaining({
          name: 'Updated CCR Profile',
        }),
      )
      const updateArgs = vi.mocked(ClaudeCodeConfigManager.updateProfile).mock.calls.at(-1)?.[1] as Record<string, any>
      expect(updateArgs).not.toHaveProperty('description')
    })

    it('should handle invalid action selection', async () => {
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

      // Mock invalid action (null/undefined)
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ action: null })

      await configureIncrementalManagement()

      expect(ClaudeCodeConfigManager.addProfile).not.toHaveBeenCalled()
      expect(ClaudeCodeConfigManager.updateProfile).not.toHaveBeenCalled()
      expect(ClaudeCodeConfigManager.deleteProfiles).not.toHaveBeenCalled()
    })
  })
})
