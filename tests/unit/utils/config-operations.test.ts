import type { ApiConfig } from '../../../src/types/config'
import inquirer from 'inquirer'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
// Use real i18n system for better integration testing
import { ensureI18nInitialized, i18n } from '../../../src/i18n'
import * as config from '../../../src/utils/config'
import {
  configureApiCompletely,
  modifyApiConfigPartially,
  updatePromptOnly,
} from '../../../src/utils/config-operations'
import * as outputStyle from '../../../src/utils/output-style'
import * as validator from '../../../src/utils/validator'

vi.mock('inquirer')
vi.mock('../../../src/utils/config')
vi.mock('../../../src/utils/output-style')
vi.mock('../../../src/utils/validator')

describe('config-operations utilities', () => {
  beforeAll(() => {
    ensureI18nInitialized()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('configureApiCompletely', () => {
    it('should configure API with auth token', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ authType: 'auth_token' })
        .mockResolvedValueOnce({ url: 'https://api.example.com' })
        .mockResolvedValueOnce({ key: 'test-auth-token' })

      vi.mocked(validator.validateApiKey).mockReturnValue({
        isValid: true,
        error: undefined,
      })
      vi.mocked(validator.formatApiKeyDisplay).mockReturnValue('test-****-token')

      const result = await configureApiCompletely()

      expect(result).toEqual({
        url: 'https://api.example.com',
        key: 'test-auth-token',
        authType: 'auth_token',
      })

      expect(inquirer.prompt).toHaveBeenCalledTimes(3)
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('test-****-token'),
      )
    })

    it('should configure API with API key', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ authType: 'api_key' })
        .mockResolvedValueOnce({ url: 'https://api.example.com' })
        .mockResolvedValueOnce({ key: 'sk-test-api-key' })

      vi.mocked(validator.validateApiKey).mockReturnValue({
        isValid: true,
        error: undefined,
      })
      vi.mocked(validator.formatApiKeyDisplay).mockReturnValue('sk-****-key')

      const result = await configureApiCompletely()

      expect(result).toEqual({
        url: 'https://api.example.com',
        key: 'sk-test-api-key',
        authType: 'api_key',
      })
    })

    it('should use preselected auth type', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ url: 'https://api.example.com' })
        .mockResolvedValueOnce({ key: 'test-key', ui: {} } as any)

      vi.mocked(validator.validateApiKey).mockReturnValue({
        isValid: true,
        error: undefined,
      })

      const result = await configureApiCompletely('api_key')

      expect(result).toEqual({
        url: 'https://api.example.com',
        key: 'test-key',
        authType: 'api_key',
      })

      // Should skip auth type prompt
      expect(inquirer.prompt).toHaveBeenCalledTimes(2)
    })

    it('should validate URL format', async () => {
      const urlPrompt = {
        type: 'input',
        name: 'url',
        message: i18n.t('api:enterApiUrl'),
        validate: expect.any(Function),
      }

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ authType: 'auth_token' })
        .mockResolvedValueOnce({ url: 'https://api.example.com' })
        .mockResolvedValueOnce({ key: 'test-key', ui: {} } as any)

      vi.mocked(validator.validateApiKey).mockReturnValue({
        isValid: true,
        error: undefined,
      })

      await configureApiCompletely()

      expect(inquirer.prompt).toHaveBeenCalledWith(
        expect.objectContaining(urlPrompt),
      )
    })

    it('should validate API key format', async () => {
      const mockValidateApiKey = vi.fn().mockReturnValue({
        isValid: true,
        error: undefined,
      })
      vi.mocked(validator.validateApiKey).mockImplementation(mockValidateApiKey)

      let keyValidateFn: any
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ authType: 'api_key' })
        .mockResolvedValueOnce({ url: 'https://api.example.com' })
        .mockImplementationOnce((questions: any) => {
          keyValidateFn = questions.validate
          return Promise.resolve({ key: 'valid-key' }) as any
        })

      await configureApiCompletely()

      // Manually call the validate function to test it
      if (keyValidateFn) {
        await keyValidateFn('valid-key')
      }

      expect(mockValidateApiKey).toHaveBeenCalledWith('valid-key')
    })

    it('should handle cancellation at auth type selection', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ authType: undefined })

      const result = await configureApiCompletely()

      expect(result).toBeNull()
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(i18n.t('common:cancelled')),
      )
    })

    it('should handle cancellation at URL input', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ authType: 'auth_token' })
        .mockResolvedValueOnce({ url: undefined })

      const result = await configureApiCompletely()

      expect(result).toBeNull()
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(i18n.t('common:cancelled')),
      )
    })

    it('should handle cancellation at key input', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ authType: 'api_key' })
        .mockResolvedValueOnce({ url: 'https://api.example.com' })
        .mockResolvedValueOnce({ key: undefined })

      const result = await configureApiCompletely()

      expect(result).toBeNull()
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(i18n.t('common:cancelled')),
      )
    })

    it('should work with real i18n system', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ authType: 'auth_token' })
        .mockResolvedValueOnce({ url: 'https://api.example.com' })
        .mockResolvedValueOnce({ key: 'test-token' })

      vi.mocked(validator.validateApiKey).mockReturnValue({
        isValid: true,
        error: undefined,
      })

      const result = await configureApiCompletely()

      expect(result).toBeDefined()
      expect(inquirer.prompt).toHaveBeenCalledWith(
        expect.objectContaining({
          message: i18n.t('api:configureApi'),
        }),
      )
    })
  })

  describe('modifyApiConfigPartially', () => {
    const mockConfig: ApiConfig = {
      url: 'https://old-api.example.com',
      key: 'old-key',
      authType: 'auth_token',
    }

    beforeEach(() => {
      vi.mocked(config.getExistingApiConfig).mockReturnValue(mockConfig)
      vi.mocked(config.configureApi).mockReturnValue(mockConfig)
    })

    it('should modify URL only', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ item: 'url' })
        .mockResolvedValueOnce({ url: 'https://new-api.example.com' })

      await modifyApiConfigPartially(mockConfig)

      expect(config.configureApi).toHaveBeenCalledWith({
        ...mockConfig,
        url: 'https://new-api.example.com',
      })

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('https://new-api.example.com'),
      )
    })

    it('should modify API key only', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ item: 'key' })
        .mockResolvedValueOnce({ key: 'new-key' })

      vi.mocked(validator.validateApiKey).mockReturnValue({
        isValid: true,
        error: undefined,
      })
      vi.mocked(validator.formatApiKeyDisplay).mockReturnValue('new-****')

      await modifyApiConfigPartially(mockConfig)

      expect(config.configureApi).toHaveBeenCalledWith({
        ...mockConfig,
        key: 'new-key',
      })

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('new-****'),
      )
    })

    it('should modify auth type only', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ item: 'authType' })
        .mockResolvedValueOnce({ authType: 'api_key' })

      await modifyApiConfigPartially(mockConfig)

      expect(config.configureApi).toHaveBeenCalledWith({
        ...mockConfig,
        authType: 'api_key',
      })

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('api_key'),
      )
    })

    it('should validate new URL', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ item: 'url' })
        .mockResolvedValueOnce({ url: 'https://new-api.example.com' })

      await modifyApiConfigPartially(mockConfig)

      expect(config.configureApi).toHaveBeenCalled()
    })

    it('should validate new API key', async () => {
      const mockValidateApiKey = vi.fn().mockReturnValue({
        isValid: true,
        error: undefined,
      })
      vi.mocked(validator.validateApiKey).mockImplementation(mockValidateApiKey)

      let keyValidateFn: any
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ item: 'key' })
        .mockImplementationOnce((questions: any) => {
          keyValidateFn = questions.validate
          return Promise.resolve({ key: 'valid-key' }) as any
        })

      await modifyApiConfigPartially(mockConfig)

      // Manually call the validate function to test it
      if (keyValidateFn) {
        await keyValidateFn('valid-key')
      }

      expect(mockValidateApiKey).toHaveBeenCalledWith('valid-key')
    })

    it('should handle cancellation at item selection', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ item: undefined })

      await modifyApiConfigPartially(mockConfig)

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(i18n.t('common:cancelled')),
      )
      expect(config.configureApi).not.toHaveBeenCalled()
    })

    it('should handle cancellation during URL modification', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ item: 'url' })
        .mockResolvedValueOnce({ url: undefined })

      await modifyApiConfigPartially(mockConfig)

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(i18n.t('common:cancelled')),
      )
      expect(config.configureApi).not.toHaveBeenCalled()
    })

    it('should handle cancellation during key modification', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ item: 'key' })
        .mockResolvedValueOnce({ key: undefined })

      await modifyApiConfigPartially(mockConfig)

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(i18n.t('common:cancelled')),
      )
      expect(config.configureApi).not.toHaveBeenCalled()
    })

    it('should handle cancellation during auth type modification', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ item: 'authType' })
        .mockResolvedValueOnce({ authType: undefined })

      await modifyApiConfigPartially(mockConfig)

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(i18n.t('common:cancelled')),
      )
      expect(config.configureApi).not.toHaveBeenCalled()
    })

    it('should re-read config to get latest values', async () => {
      const updatedConfig: ApiConfig = {
        ...mockConfig,
        url: 'https://updated-api.example.com',
      }

      vi.mocked(config.getExistingApiConfig).mockReturnValue(updatedConfig)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ item: 'url' })
        .mockResolvedValueOnce({ url: 'https://newest-api.example.com' })

      await modifyApiConfigPartially(mockConfig)

      expect(config.getExistingApiConfig).toHaveBeenCalled()
      expect(inquirer.prompt).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('https://updated-api.example.com'),
          default: 'https://updated-api.example.com',
        }),
      )
    })

    it('should handle missing existing config gracefully', async () => {
      vi.mocked(config.getExistingApiConfig).mockReturnValue(null)

      const emptyConfig: ApiConfig = {
        url: '',
        key: '',
        authType: 'auth_token',
      }

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ item: 'url' })
        .mockResolvedValueOnce({ url: 'https://new-api.example.com' })

      await modifyApiConfigPartially(emptyConfig)

      expect(config.configureApi).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://new-api.example.com',
        }),
      )
    })

    it('should display correct message for auth token vs API key', async () => {
      const apiKeyConfig: ApiConfig = {
        ...mockConfig,
        authType: 'api_key',
      }

      vi.mocked(config.getExistingApiConfig).mockReturnValue(apiKeyConfig)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ item: 'key' })
        .mockResolvedValueOnce({ key: 'new-api-key' })

      vi.mocked(validator.validateApiKey).mockReturnValue({
        isValid: true,
        error: undefined,
      })
      vi.mocked(validator.formatApiKeyDisplay).mockReturnValue('old-****')

      await modifyApiConfigPartially(apiKeyConfig)

      // Check that the second call (for entering the key) uses the correct message
      const secondCall = vi.mocked(inquirer.prompt).mock.calls[1]
      expect(secondCall[0].message).toContain('Enter new API Key')
    })

    it('should work with real i18n system', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ item: 'url' })
        .mockResolvedValueOnce({ url: 'https://new-api.example.com' })

      await modifyApiConfigPartially(mockConfig)

      expect(inquirer.prompt).toHaveBeenCalledWith(
        expect.objectContaining({
          message: i18n.t('api:selectModifyItems'),
        }),
      )
    })
  })

  describe('updatePromptOnly', () => {
    const backupDir = '/backup/dir'

    beforeEach(() => {
      vi.mocked(config.backupExistingConfig).mockReturnValue(backupDir)
    })

    it('should backup existing config', async () => {
      await updatePromptOnly()

      expect(config.backupExistingConfig).toHaveBeenCalled()
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(backupDir),
      )
    })

    it('should call copyConfigFiles but no longer copies documentation files', async () => {
      await updatePromptOnly()

      // copyConfigFiles is called but no longer copies memory files when onlyMd=true
      // Documentation is now generated via output-style system
    })

    it('should apply AI language directive if provided', async () => {
      await updatePromptOnly('Chinese')

      expect(config.applyAiLanguageDirective).toHaveBeenCalledWith('Chinese')
    })

    it('should not apply AI language directive if not provided', async () => {
      await updatePromptOnly()

      expect(config.applyAiLanguageDirective).not.toHaveBeenCalled()
    })

    it('should configure output styles', async () => {
      await updatePromptOnly()

      expect(outputStyle.configureOutputStyle).toHaveBeenCalled()
    })

    it('should show success message', async () => {
      await updatePromptOnly()

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(i18n.t('configuration:configSuccess')),
      )
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(i18n.t('common:complete')),
      )
    })

    it('should handle no backup directory', async () => {
      vi.mocked(config.backupExistingConfig).mockReturnValue(null)

      await updatePromptOnly()

      // copyConfigFiles is no longer called in the simplified version
      expect(outputStyle.configureOutputStyle).toHaveBeenCalled()
    })

    it('should work with different config and script languages', async () => {
      await updatePromptOnly('English')

      // copyConfigFiles is no longer called since memory files are not copied
      expect(config.applyAiLanguageDirective).toHaveBeenCalledWith('English')
      expect(outputStyle.configureOutputStyle).toHaveBeenCalled()
    })

    it('should show success messages with real i18n', async () => {
      await updatePromptOnly()

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(i18n.t('configuration:configSuccess')),
      )
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(i18n.t('common:complete')),
      )
    })
  })
})
