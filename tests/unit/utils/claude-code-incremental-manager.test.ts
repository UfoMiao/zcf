import inquirer from 'inquirer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { i18n } from '../../../src/i18n'
import { ClaudeCodeConfigManager } from '../../../src/utils/claude-code-config-manager'
import { configureIncrementalManagement } from '../../../src/utils/claude-code-incremental-manager'
import { promptBoolean } from '../../../src/utils/toggle-prompt'
import { validateApiKey } from '../../../src/utils/validator'
// Mock dependencies
vi.mock('inquirer')
vi.mock('../../../src/utils/claude-code-config-manager')
vi.mock('../../../src/utils/json-config')
vi.mock('../../../src/utils/validator')
vi.mock('../../../src/utils/claude-config')
vi.mock('../../../src/utils/toggle-prompt', () => ({
  promptBoolean: vi.fn(),
}))

const mockedPromptBoolean = vi.mocked(promptBoolean)
function queuePromptBooleans(...values: boolean[]) {
  values.forEach(value => mockedPromptBoolean.mockResolvedValueOnce(value))
}
vi.mock('../../../src/utils/features', () => ({
  promptCustomModels: vi.fn().mockResolvedValue({
    primaryModel: 'claude-3-5-sonnet-20241022',
    fastModel: 'claude-3-5-haiku-20241022',
  }),
}))
vi.mock('../../../src/constants', () => ({
  ZCF_CONFIG_DIR: '/test/.zcf',
  SETTINGS_FILE: '/test/settings.json',
  ZCF_CONFIG_FILE: '/test/.zcf/config.toml',
}))
describe('claudeCode Incremental Configuration Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedPromptBoolean.mockReset()
    mockedPromptBoolean.mockResolvedValue(false)
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
        .mockResolvedValueOnce({ selectedProvider: 'custom' }) // Provider selection
        .mockResolvedValueOnce({
          profileName: 'Test Profile',
          authType: 'api_key' as const,
          apiKey: 'sk-ant-test-key',
          baseUrl: 'https://api.anthropic.com',
        } as any)
      queuePromptBooleans(true, false)

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
    it('should apply provider default models when adding preset profile', async () => {
      const { getProviderPreset } = await import('../../../src/config/api-providers')
      const minimaxPreset = getProviderPreset('minimax')

      expect(minimaxPreset?.claudeCode?.defaultModels?.length).toBeGreaterThan(0)

      vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue(null)
      vi.mocked(ClaudeCodeConfigManager.generateProfileId).mockReturnValue('minimax-profile-id')
      vi.mocked(ClaudeCodeConfigManager.addProfile).mockResolvedValue({
        success: true,
        addedProfile: {
          id: 'minimax-profile-id',
          name: minimaxPreset?.name || 'MiniMax',
          authType: minimaxPreset?.claudeCode?.authType || 'auth_token',
        },
      })
      vi.mocked(ClaudeCodeConfigManager.switchProfile).mockResolvedValue({ success: true })
      vi.mocked(validateApiKey).mockImplementationOnce(() => ({ isValid: true }))

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ selectedProvider: 'minimax' })
        .mockResolvedValueOnce({
          profileName: minimaxPreset?.name || 'MiniMax',
          apiKey: 'sk-minimax-key',
        } as any)
      queuePromptBooleans(false, false)

      await configureIncrementalManagement()

      const addedProfileArg = vi.mocked(ClaudeCodeConfigManager.addProfile).mock.calls.at(-1)?.[0] as Record<string, any>
      expect(addedProfileArg.primaryModel).toBe(minimaxPreset?.claudeCode?.defaultModels?.[0])
      expect(addedProfileArg.fastModel).toBe(minimaxPreset?.claudeCode?.defaultModels?.[1])
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
        .mockResolvedValueOnce({ selectedProvider: 'custom' }) // Provider selection
        .mockResolvedValueOnce({
          profileName: 'Test Profile',
          authType: 'api_key' as const,
          apiKey: 'sk-ant-test-key',
          baseUrl: 'https://api.anthropic.com',
        } as any) // Detailed information for adding configuration
      queuePromptBooleans(true, false)

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
      queuePromptBooleans(true)
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
        .mockResolvedValueOnce({ selectedProvider: 'custom' }) // Provider selection
        .mockResolvedValueOnce({
          profileName: 'API Profile',
          authType: 'api_key' as const,
          apiKey: 'sk-ant-test-key',
          baseUrl: 'https://api.anthropic.com',
        })
      queuePromptBooleans(true, false)
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
    it('should display raw auth type label when type is unknown', async () => {
      const mockConfig = {
        currentProfileId: 'profile-1',
        profiles: {
          'profile-1': {
            id: 'profile-1',
            name: 'Profile 1',
            authType: 'custom-auth' as any,
          },
          'profile-2': {
            id: 'profile-2',
            name: 'Profile 2',
            authType: 'api_key' as const,
          },
        },
      }
      vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue(mockConfig as any)
      let capturedChoices: any[] = []
      vi.mocked(inquirer.prompt)
        .mockImplementationOnce((() => Promise.resolve({ action: 'delete' })) as any)
        .mockImplementationOnce(((questions: any) => {
          const prompt = Array.isArray(questions) ? questions[0] : questions
          capturedChoices = prompt.choices
          return Promise.resolve({ selectedProfileIds: ['profile-1'] })
        }) as any)
      queuePromptBooleans(false)
      await configureIncrementalManagement()
      expect(capturedChoices.some(choice => String(choice.name).includes('custom-auth'))).toBe(true)
    })
  })
  describe('configuration validation', () => {
    async function captureAddQuestions(answerOverride: Partial<Record<string, any>> = {}) {
      const baseAnswer = {
        profileName: 'Test Profile',
        authType: 'api_key' as const,
        apiKey: 'sk-ant-valid',
        baseUrl: 'https://api.anthropic.com',
      }
      const answers = { ...baseAnswer, ...answerOverride }
      let capturedQuestions: any[] = []
      vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue(null)
      const mockPrompt = vi.mocked(inquirer.prompt)
      mockPrompt.mockImplementationOnce(((questions: any[]) => {
        capturedQuestions = questions
        return Promise.resolve({ selectedProvider: 'custom' })
      }) as any)
      mockPrompt.mockImplementationOnce(((questions: any[]) => {
        capturedQuestions = questions
        return Promise.resolve(answers)
      }) as any)
      queuePromptBooleans(Boolean(answerOverride.setAsDefault), false)
      vi.mocked(ClaudeCodeConfigManager.generateProfileId).mockReturnValue('test-profile-id')
      vi.mocked(ClaudeCodeConfigManager.addProfile).mockResolvedValue({
        success: true,
        addedProfile: {
          id: 'test-profile-id',
          name: answers.profileName,
          authType: answers.authType,
        },
      })
      await configureIncrementalManagement()
      return { capturedQuestions, answers }
    }
    it('should validate profile name input rules', async () => {
      const { capturedQuestions } = await captureAddQuestions()
      const nameQuestion = capturedQuestions.find(q => q.name === 'profileName')
      expect(nameQuestion.validate('   ')).toBe('multi-config:profileNameRequired')
      expect(nameQuestion.validate('Invalid@Name')).toBe('multi-config:profileNameInvalid')
      expect(nameQuestion.validate('Normal Name')).toBe(true)
    })
    it('should validate API key via helper', async () => {
      vi.mocked(validateApiKey).mockImplementation((value: string) => {
        if (value === 'invalid') {
          return { isValid: false, error: 'Invalid API key format' }
        }
        return { isValid: true }
      })
      const { capturedQuestions } = await captureAddQuestions()
      const apiQuestion = capturedQuestions.find(q => q.name === 'apiKey')
      expect(apiQuestion.validate('')).toBe('multi-config:apiKeyRequired')
      expect(apiQuestion.validate('invalid')).toBe('Invalid API key format')
      expect(apiQuestion.validate('sk-okay')).toBe(true)
    })
    it('should validate base URL format', async () => {
      const { capturedQuestions } = await captureAddQuestions()
      const baseUrlQuestion = capturedQuestions.find(q => q.name === 'baseUrl')
      expect(baseUrlQuestion.validate('')).toBe('multi-config:baseUrlRequired')
      expect(baseUrlQuestion.validate('not-a-url')).toBe('multi-config:baseUrlInvalid')
      expect(baseUrlQuestion.validate('https://valid.example.com')).toBe(true)
    })
    it('should skip API key and base URL when CCR proxy selected', async () => {
      const { capturedQuestions } = await captureAddQuestions({ authType: 'ccr_proxy', setAsDefault: false })
      const apiQuestion = capturedQuestions.find(q => q.name === 'apiKey')
      const baseUrlQuestion = capturedQuestions.find(q => q.name === 'baseUrl')
      expect(apiQuestion.when({ authType: 'ccr_proxy' })).toBe(false)
      expect(baseUrlQuestion.when({ authType: 'ccr_proxy' })).toBe(false)
    })
    it('should validate delete selections to prevent removing all profiles', async () => {
      const mockConfig = {
        currentProfileId: 'profile-1',
        profiles: {
          'profile-1': { id: 'profile-1', name: 'Profile 1', authType: 'api_key' as const },
          'profile-2': { id: 'profile-2', name: 'Profile 2', authType: 'auth_token' as const },
        },
      }
      vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue(mockConfig as any)
      let deletePrompt: any
      vi.mocked(inquirer.prompt)
        .mockImplementationOnce((() => Promise.resolve({ action: 'delete' })) as any)
        .mockImplementationOnce(((questions: any) => {
          deletePrompt = Array.isArray(questions) ? questions[0] : questions
          return Promise.resolve({ selectedProfileIds: ['profile-1'] })
        }) as any)
      queuePromptBooleans(false)
      await configureIncrementalManagement()
      expect(deletePrompt.validate([])).toBe('multi-config:selectAtLeastOne')
      expect(deletePrompt.validate(['profile-1', 'profile-2'])).toBe('multi-config:cannotDeleteAll')
      expect(deletePrompt.validate(['profile-1'])).toBe(true)
    })
  })
  describe('error handling and edge cases', () => {
    it('should skip adding duplicate profile when overwrite is declined', async () => {
      vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue({
        currentProfileId: '',
        profiles: {},
      } as any)
      vi.mocked(ClaudeCodeConfigManager.getProfileByName).mockReturnValue({
        id: 'duplicate',
        name: 'Duplicate',
        authType: 'api_key',
      } as any)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ selectedProvider: 'custom' }) // Provider selection
        .mockImplementationOnce((() => Promise.resolve({
          profileName: 'Duplicate',
          authType: 'api_key',
          apiKey: 'sk-ant-test-key',
          baseUrl: 'https://api.anthropic.com',
        })) as any)
      queuePromptBooleans(false, false, false)
      await configureIncrementalManagement()
      expect(ClaudeCodeConfigManager.updateProfile).not.toHaveBeenCalled()
      expect(ClaudeCodeConfigManager.addProfile).not.toHaveBeenCalled()
    })
    it('should overwrite existing profile when confirmed', async () => {
      vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue({
        currentProfileId: 'existing',
        profiles: {},
      } as any)
      vi.mocked(ClaudeCodeConfigManager.getProfileByName).mockReturnValue({
        id: 'existing',
        name: 'Duplicate',
        authType: 'api_key',
      } as any)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ selectedProvider: 'custom' }) // Provider selection
        .mockImplementationOnce((() => Promise.resolve({
          profileName: 'Duplicate',
          authType: 'api_key',
          apiKey: 'sk-ant-test-key',
          baseUrl: 'https://api.anthropic.com',
        })) as any)
      queuePromptBooleans(true, true, false)
      vi.mocked(ClaudeCodeConfigManager.updateProfile).mockResolvedValue({
        success: true,
        backupPath: '/test/backup.json',
        updatedProfile: {
          id: 'existing',
          name: 'Duplicate',
          authType: 'api_key',
          apiKey: 'sk-ant-test-key',
        },
      })
      vi.mocked(ClaudeCodeConfigManager.switchProfile).mockResolvedValue({ success: true })
      await configureIncrementalManagement()
      expect(ClaudeCodeConfigManager.updateProfile).toHaveBeenCalledWith('existing', expect.objectContaining({
        name: 'Duplicate',
        apiKey: 'sk-ant-test-key',
      }))
      expect(ClaudeCodeConfigManager.switchProfile).toHaveBeenCalledWith('existing')
    })
    it('should handle profile addition failure', async () => {
      vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue(null)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ selectedProvider: 'custom' }) // Provider selection
        .mockResolvedValueOnce({
          profileName: 'Test Profile',
          authType: 'api_key' as const,
          apiKey: 'sk-ant-test-key',
          baseUrl: 'https://api.anthropic.com',
        } as any)
      queuePromptBooleans(true, false)
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
      queuePromptBooleans(true)
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
      queuePromptBooleans(false)
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
        .mockResolvedValueOnce({ selectedProvider: 'custom' }) // Provider selection
        .mockResolvedValueOnce({
          profileName: 'Auth Token Profile',
          authType: 'auth_token' as const,
          apiKey: 'sk-ant-auth-token',
          baseUrl: 'https://api.anthropic.com',
        } as any)
      queuePromptBooleans(false, false)
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
        .mockResolvedValueOnce({ selectedProvider: 'custom' }) // Provider selection
        .mockResolvedValueOnce({
          profileName: 'Non-Default Profile',
          authType: 'api_key' as const,
          apiKey: 'sk-ant-test-key',
          baseUrl: 'https://api.anthropic.com',
        } as any)
      queuePromptBooleans(false, false)
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

    it('should handle preset provider with prefilled values', async () => {
      vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue(null)
      vi.mocked(ClaudeCodeConfigManager.generateProfileId).mockReturnValue('test-profile-id')

      // Mock preset provider selection
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ selectedProvider: '302ai' }) // Select preset
        .mockResolvedValueOnce({
          profileName: '302.AI',
          apiKey: 'sk-302-test-key',
        } as any)
      queuePromptBooleans(false, false)

      vi.mocked(ClaudeCodeConfigManager.addProfile).mockResolvedValue({
        success: true,
        backupPath: '/test/backup.json',
      })

      await configureIncrementalManagement()

      expect(ClaudeCodeConfigManager.addProfile).toHaveBeenCalled()
    })

    it('should handle model configuration with empty strings', async () => {
      vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue(null)
      vi.mocked(ClaudeCodeConfigManager.generateProfileId).mockReturnValue('test-profile-id')

      const { promptCustomModels } = await import('../../../src/utils/features')
      vi.mocked(promptCustomModels).mockResolvedValue({
        primaryModel: '',
        fastModel: '',
      })

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ selectedProvider: 'custom' })
        .mockResolvedValueOnce({
          profileName: 'Test Profile',
          authType: 'api_key' as const,
          apiKey: 'sk-ant-test-key',
          baseUrl: 'https://api.anthropic.com',
        } as any)
      queuePromptBooleans(false, false)

      vi.mocked(ClaudeCodeConfigManager.addProfile).mockResolvedValue({
        success: true,
        backupPath: '/test/backup.json',
      })

      await configureIncrementalManagement()

      const addProfileCall = vi.mocked(ClaudeCodeConfigManager.addProfile).mock.calls[0][0]
      expect(addProfileCall).not.toHaveProperty('primaryModel')
      expect(addProfileCall).not.toHaveProperty('fastModel')
    })

    it('should handle model configuration with only primary model', async () => {
      vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue(null)
      vi.mocked(ClaudeCodeConfigManager.generateProfileId).mockReturnValue('test-profile-id')

      const { promptCustomModels } = await import('../../../src/utils/features')
      vi.mocked(promptCustomModels).mockResolvedValue({
        primaryModel: 'claude-3-5-sonnet-20241022',
        fastModel: '',
      })

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ selectedProvider: 'custom' })
        .mockResolvedValueOnce({
          profileName: 'Test Profile',
          authType: 'api_key' as const,
          apiKey: 'sk-ant-test-key',
          baseUrl: 'https://api.anthropic.com',
        } as any)
      queuePromptBooleans(false, false)

      vi.mocked(ClaudeCodeConfigManager.addProfile).mockResolvedValue({
        success: true,
        backupPath: '/test/backup.json',
      })

      await configureIncrementalManagement()

      const addProfileCall = vi.mocked(ClaudeCodeConfigManager.addProfile).mock.calls[0][0]
      expect(addProfileCall).toHaveProperty('primaryModel', 'claude-3-5-sonnet-20241022')
      expect(addProfileCall).not.toHaveProperty('fastModel')
    })

    it('should continue adding profiles when user confirms', async () => {
      vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue(null)
      vi.mocked(ClaudeCodeConfigManager.generateProfileId)
        .mockReturnValueOnce('profile-1')
        .mockReturnValueOnce('profile-2')

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ selectedProvider: 'custom' })
        .mockResolvedValueOnce({
          profileName: 'Profile 1',
          authType: 'api_key' as const,
          apiKey: 'sk-ant-key-1',
          baseUrl: 'https://api.anthropic.com',
        } as any)
        .mockResolvedValueOnce({ selectedProvider: 'custom' })
        .mockResolvedValueOnce({
          profileName: 'Profile 2',
          authType: 'api_key' as const,
          apiKey: 'sk-ant-key-2',
          baseUrl: 'https://api.anthropic.com',
        } as any)
      queuePromptBooleans(true, true, false, false)

      vi.mocked(ClaudeCodeConfigManager.addProfile).mockResolvedValue({
        success: true,
        backupPath: '/test/backup.json',
      })
      vi.mocked(ClaudeCodeConfigManager.switchProfile).mockResolvedValue({
        success: true,
      })

      await configureIncrementalManagement()

      expect(ClaudeCodeConfigManager.addProfile).toHaveBeenCalledTimes(2)
    })
  })

  describe('copy profile functionality', () => {
    it('should show copy option in management menu', async () => {
      const mockConfig = {
        currentProfileId: 'profile-1',
        profiles: {
          'profile-1': {
            id: 'profile-1',
            name: 'Profile 1',
            authType: 'api_key' as const,
            apiKey: 'sk-ant-test-key',
            baseUrl: 'https://api.anthropic.com',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
          },
        },
        version: '1.0.0',
      }
      vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue(mockConfig)

      let capturedChoices: any[] = []
      vi.mocked(inquirer.prompt).mockImplementationOnce(((questions: any) => {
        const prompt = Array.isArray(questions) ? questions[0] : questions
        capturedChoices = prompt.choices
        return Promise.resolve({ action: 'skip' })
      }) as any)

      await configureIncrementalManagement()

      // Verify copy option exists and is positioned before delete
      const copyChoice = capturedChoices.find(c => c.value === 'copy')
      const deleteChoice = capturedChoices.find(c => c.value === 'delete')
      expect(copyChoice).toBeDefined()
      expect(deleteChoice).toBeDefined()

      const copyIndex = capturedChoices.findIndex(c => c.value === 'copy')
      const deleteIndex = capturedChoices.findIndex(c => c.value === 'delete')
      expect(copyIndex).toBeLessThan(deleteIndex)
    })

    it('should copy profile with -copy suffix and allow modifications', async () => {
      const mockConfig = {
        currentProfileId: 'profile-1',
        profiles: {
          'profile-1': {
            id: 'profile-1',
            name: 'Original Profile',
            authType: 'api_key' as const,
            apiKey: 'sk-ant-original-key',
            baseUrl: 'https://api.original.com',
            primaryModel: 'claude-3-5-sonnet-20241022',
            fastModel: 'claude-3-5-haiku-20241022',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
          },
        },
        version: '1.0.0',
      }
      vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue(mockConfig)

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'copy' }) // Select copy
        .mockResolvedValueOnce({ selectedProfileId: 'profile-1' }) // Select profile to copy
        .mockResolvedValueOnce({
          profileName: 'Original Profile-copy',
          authType: 'api_key' as const,
          apiKey: 'sk-ant-modified-key',
          baseUrl: 'https://api.modified.com',
        } as any)
      queuePromptBooleans(false)

      vi.mocked(ClaudeCodeConfigManager.generateProfileId).mockReturnValue('copied-profile-id')
      vi.mocked(ClaudeCodeConfigManager.addProfile).mockResolvedValue({
        success: true,
        backupPath: '/test/backup.json',
        addedProfile: {
          id: 'copied-profile-id',
          name: 'Original Profile-copy',
          authType: 'api_key',
          apiKey: 'sk-ant-modified-key',
          baseUrl: 'https://api.modified.com',
        },
      })

      await configureIncrementalManagement()

      expect(ClaudeCodeConfigManager.addProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Original Profile-copy',
          authType: 'api_key',
          apiKey: 'sk-ant-modified-key',
          baseUrl: 'https://api.modified.com',
        }),
      )
    })

    it('should copy profile and preserve model configuration', async () => {
      const mockConfig = {
        currentProfileId: 'profile-1',
        profiles: {
          'profile-1': {
            id: 'profile-1',
            name: 'Profile With Models',
            authType: 'api_key' as const,
            apiKey: 'sk-ant-test-key',
            baseUrl: 'https://api.anthropic.com',
            primaryModel: 'claude-3-opus-20240229',
            fastModel: 'claude-3-haiku-20240307',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
          },
        },
        version: '1.0.0',
      }
      vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue(mockConfig)

      const { promptCustomModels } = await import('../../../src/utils/features')
      vi.mocked(promptCustomModels).mockResolvedValue({
        primaryModel: 'claude-3-opus-20240229',
        fastModel: 'claude-3-haiku-20240307',
      })

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'copy' })
        .mockResolvedValueOnce({ selectedProfileId: 'profile-1' })
        .mockResolvedValueOnce({
          profileName: 'Profile With Models-copy',
          authType: 'api_key' as const,
          apiKey: 'sk-ant-test-key',
          baseUrl: 'https://api.anthropic.com',
        } as any)
      queuePromptBooleans(false)

      vi.mocked(ClaudeCodeConfigManager.generateProfileId).mockReturnValue('copied-profile-id')
      vi.mocked(ClaudeCodeConfigManager.addProfile).mockResolvedValue({
        success: true,
        backupPath: '/test/backup.json',
      })

      await configureIncrementalManagement()

      expect(ClaudeCodeConfigManager.addProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          primaryModel: 'claude-3-opus-20240229',
          fastModel: 'claude-3-haiku-20240307',
        }),
      )
    })

    it('should handle copy cancellation when no profile selected', async () => {
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
        .mockResolvedValueOnce({ action: 'copy' })
        .mockResolvedValueOnce({ selectedProfileId: null }) // User cancels

      await configureIncrementalManagement()

      expect(ClaudeCodeConfigManager.addProfile).not.toHaveBeenCalled()
    })

    it('should handle copy of CCR proxy profile', async () => {
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
        .mockResolvedValueOnce({ action: 'copy' })
        .mockResolvedValueOnce({ selectedProfileId: 'profile-1' })
        .mockResolvedValueOnce({
          profileName: 'CCR Profile-copy',
        } as any)
      queuePromptBooleans(false)

      vi.mocked(ClaudeCodeConfigManager.generateProfileId).mockReturnValue('copied-ccr-id')
      vi.mocked(ClaudeCodeConfigManager.addProfile).mockResolvedValue({
        success: true,
        backupPath: '/test/backup.json',
      })

      await configureIncrementalManagement()

      expect(ClaudeCodeConfigManager.addProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'CCR Profile-copy',
          authType: 'ccr_proxy',
        }),
      )
    })

    it('should allow user to modify copied profile name', async () => {
      const mockConfig = {
        currentProfileId: 'profile-1',
        profiles: {
          'profile-1': {
            id: 'profile-1',
            name: 'Original',
            authType: 'api_key' as const,
            apiKey: 'sk-ant-test-key',
            baseUrl: 'https://api.anthropic.com',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
          },
        },
        version: '1.0.0',
      }
      vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue(mockConfig)

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'copy' })
        .mockResolvedValueOnce({ selectedProfileId: 'profile-1' })
        .mockResolvedValueOnce({
          profileName: 'Custom Copy Name', // User changes the name
          authType: 'api_key' as const,
          apiKey: 'sk-ant-test-key',
          baseUrl: 'https://api.anthropic.com',
        } as any)
      queuePromptBooleans(false)

      vi.mocked(ClaudeCodeConfigManager.generateProfileId).mockReturnValue('custom-copy-id')
      vi.mocked(ClaudeCodeConfigManager.addProfile).mockResolvedValue({
        success: true,
        backupPath: '/test/backup.json',
      })

      await configureIncrementalManagement()

      expect(ClaudeCodeConfigManager.addProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Custom Copy Name',
        }),
      )
    })

    it('should set copied profile as default when requested', async () => {
      const mockConfig = {
        currentProfileId: 'profile-1',
        profiles: {
          'profile-1': {
            id: 'profile-1',
            name: 'Original',
            authType: 'api_key' as const,
            apiKey: 'sk-ant-test-key',
            baseUrl: 'https://api.anthropic.com',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
          },
        },
        version: '1.0.0',
      }
      vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue(mockConfig)

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ action: 'copy' })
        .mockResolvedValueOnce({ selectedProfileId: 'profile-1' })
        .mockResolvedValueOnce({
          profileName: 'Original-copy',
          authType: 'api_key' as const,
          apiKey: 'sk-ant-test-key',
          baseUrl: 'https://api.anthropic.com',
        } as any)
      queuePromptBooleans(true)

      vi.mocked(ClaudeCodeConfigManager.generateProfileId).mockReturnValue('copied-id')
      vi.mocked(ClaudeCodeConfigManager.addProfile).mockResolvedValue({
        success: true,
        backupPath: '/test/backup.json',
        addedProfile: {
          id: 'copied-id',
          name: 'Original-copy',
          authType: 'api_key',
          apiKey: 'sk-ant-test-key',
          baseUrl: 'https://api.anthropic.com',
        },
      })
      vi.mocked(ClaudeCodeConfigManager.switchProfile).mockResolvedValue({ success: true })
      vi.mocked(ClaudeCodeConfigManager.applyProfileSettings).mockResolvedValue()

      await configureIncrementalManagement()

      expect(ClaudeCodeConfigManager.switchProfile).toHaveBeenCalledWith('copied-id')
      expect(ClaudeCodeConfigManager.applyProfileSettings).toHaveBeenCalled()
    })
  })
})
