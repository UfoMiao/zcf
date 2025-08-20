import type { ApiConfig } from '../../../src/types/config'
import inquirer from 'inquirer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getTranslation } from '../../../src/i18n'
import * as aiPersonality from '../../../src/utils/ai-personality'
import * as config from '../../../src/utils/config'
import {
  configureApiCompletely,
  modifyApiConfigPartially,
  updatePromptOnly,
} from '../../../src/utils/config-operations'
import * as validator from '../../../src/utils/validator'

vi.mock('inquirer')
vi.mock('../../../src/utils/config')
vi.mock('../../../src/utils/ai-personality')
vi.mock('../../../src/utils/validator')

describe('config-operations utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('configureApiCompletely', () => {
    const i18n = getTranslation('en')

    it('should configure API with auth token', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ authType: 'auth_token' })
        .mockResolvedValueOnce({ url: 'https://api.example.com' })
        .mockResolvedValueOnce({ key: 'test-auth-token' })

      vi.mocked(validator.validateApiKey).mockReturnValue({
        isValid: true,
        error: null,
      })
      vi.mocked(validator.formatApiKeyDisplay).mockReturnValue('test-****-token')

      const result = await configureApiCompletely(i18n, 'en')

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
        error: null,
      })
      vi.mocked(validator.formatApiKeyDisplay).mockReturnValue('sk-****-key')

      const result = await configureApiCompletely(i18n, 'en')

      expect(result).toEqual({
        url: 'https://api.example.com',
        key: 'sk-test-api-key',
        authType: 'api_key',
      })
    })

    it('should use preselected auth type', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ url: 'https://api.example.com' })
        .mockResolvedValueOnce({ key: 'test-key' })

      vi.mocked(validator.validateApiKey).mockReturnValue({
        isValid: true,
        error: null,
      })

      const result = await configureApiCompletely(i18n, 'en', 'api_key')

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
        message: i18n.api.enterApiUrl,
        validate: expect.any(Function),
      }

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ authType: 'auth_token' })
        .mockImplementationOnce(async (prompt: any) => {
          // Test URL validation
          const validator = prompt.validate
          expect(validator('')).toBe(i18n.api.urlRequired)
          expect(validator('not-a-url')).toBe(i18n.api.invalidUrl)
          expect(validator('https://valid.url')).toBe(true)
          return { url: 'https://api.example.com' }
        })
        .mockResolvedValueOnce({ key: 'test-key' })

      vi.mocked(validator.validateApiKey).mockReturnValue({
        isValid: true,
        error: null,
      })

      await configureApiCompletely(i18n, 'en')

      expect(inquirer.prompt).toHaveBeenCalledWith(
        expect.objectContaining(urlPrompt),
      )
    })

    it('should validate API key format', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ authType: 'api_key' })
        .mockResolvedValueOnce({ url: 'https://api.example.com' })
        .mockImplementationOnce(async (prompt: any) => {
          // Test key validation
          const keyValidator = prompt.validate

          vi.mocked(validator.validateApiKey)
            .mockReturnValueOnce({ isValid: false, error: 'Invalid format' })
            .mockReturnValueOnce({ isValid: true, error: null })

          expect(keyValidator('')).toBe(i18n.api.keyRequired)
          expect(keyValidator('invalid')).toBe('Invalid format')
          expect(keyValidator('valid-key')).toBe(true)

          return { key: 'valid-key' }
        })

      vi.mocked(validator.validateApiKey).mockReturnValue({
        isValid: true,
        error: null,
      })

      await configureApiCompletely(i18n, 'en')

      expect(validator.validateApiKey).toHaveBeenCalled()
    })

    it('should handle cancellation at auth type selection', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ authType: undefined })

      const result = await configureApiCompletely(i18n, 'en')

      expect(result).toBeNull()
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(i18n.common.cancelled),
      )
    })

    it('should handle cancellation at URL input', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ authType: 'auth_token' })
        .mockResolvedValueOnce({ url: undefined })

      const result = await configureApiCompletely(i18n, 'en')

      expect(result).toBeNull()
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(i18n.common.cancelled),
      )
    })

    it('should handle cancellation at key input', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ authType: 'api_key' })
        .mockResolvedValueOnce({ url: 'https://api.example.com' })
        .mockResolvedValueOnce({ key: undefined })

      const result = await configureApiCompletely(i18n, 'en')

      expect(result).toBeNull()
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(i18n.common.cancelled),
      )
    })

    it('should work with Chinese language', async () => {
      const zhI18n = getTranslation('zh-CN')

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ authType: 'auth_token' })
        .mockResolvedValueOnce({ url: 'https://api.example.com' })
        .mockResolvedValueOnce({ key: 'test-token' })

      vi.mocked(validator.validateApiKey).mockReturnValue({
        isValid: true,
        error: null,
      })

      const result = await configureApiCompletely(zhI18n, 'zh-CN')

      expect(result).toBeDefined()
      expect(inquirer.prompt).toHaveBeenCalledWith(
        expect.objectContaining({
          message: zhI18n.api.configureApi,
        }),
      )
    })
  })

  describe('modifyApiConfigPartially', () => {
    const i18n = getTranslation('en')
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

      await modifyApiConfigPartially(mockConfig, i18n, 'en')

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
        error: null,
      })
      vi.mocked(validator.formatApiKeyDisplay).mockReturnValue('new-****')

      await modifyApiConfigPartially(mockConfig, i18n, 'en')

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

      await modifyApiConfigPartially(mockConfig, i18n, 'en')

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
        .mockImplementationOnce(async (prompt: any) => {
          const validator = prompt.validate
          expect(validator('')).toBe(i18n.api.urlRequired)
          expect(validator('invalid-url')).toBe(i18n.api.invalidUrl)
          expect(validator('https://valid.url')).toBe(true)
          return { url: 'https://new-api.example.com' }
        })

      await modifyApiConfigPartially(mockConfig, i18n, 'en')

      expect(config.configureApi).toHaveBeenCalled()
    })

    it('should validate new API key', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ item: 'key' })
        .mockImplementationOnce(async (prompt: any) => {
          const keyValidator = prompt.validate

          vi.mocked(validator.validateApiKey)
            .mockReturnValueOnce({ isValid: false, error: 'Invalid format' })
            .mockReturnValueOnce({ isValid: true, error: null })

          expect(keyValidator('')).toBe(i18n.api.keyRequired)
          expect(keyValidator('invalid')).toBe('Invalid format')
          expect(keyValidator('valid-key')).toBe(true)

          return { key: 'valid-key' }
        })

      vi.mocked(validator.validateApiKey).mockReturnValue({
        isValid: true,
        error: null,
      })

      await modifyApiConfigPartially(mockConfig, i18n, 'en')

      expect(validator.validateApiKey).toHaveBeenCalled()
    })

    it('should handle cancellation at item selection', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ item: undefined })

      await modifyApiConfigPartially(mockConfig, i18n, 'en')

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(i18n.common.cancelled),
      )
      expect(config.configureApi).not.toHaveBeenCalled()
    })

    it('should handle cancellation during URL modification', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ item: 'url' })
        .mockResolvedValueOnce({ url: undefined })

      await modifyApiConfigPartially(mockConfig, i18n, 'en')

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(i18n.common.cancelled),
      )
      expect(config.configureApi).not.toHaveBeenCalled()
    })

    it('should handle cancellation during key modification', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ item: 'key' })
        .mockResolvedValueOnce({ key: undefined })

      await modifyApiConfigPartially(mockConfig, i18n, 'en')

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(i18n.common.cancelled),
      )
      expect(config.configureApi).not.toHaveBeenCalled()
    })

    it('should handle cancellation during auth type modification', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ item: 'authType' })
        .mockResolvedValueOnce({ authType: undefined })

      await modifyApiConfigPartially(mockConfig, i18n, 'en')

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(i18n.common.cancelled),
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

      await modifyApiConfigPartially(mockConfig, i18n, 'en')

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

      await modifyApiConfigPartially(emptyConfig, i18n, 'en')

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
        error: null,
      })
      vi.mocked(validator.formatApiKeyDisplay).mockReturnValue('old-****')

      await modifyApiConfigPartially(apiKeyConfig, i18n, 'en')

      // Check that the second call (for entering the key) uses the correct message
      const secondCall = vi.mocked(inquirer.prompt).mock.calls[1]
      expect(secondCall[0].message).toContain('Enter new API Key')
    })

    it('should work with Chinese language', async () => {
      const zhI18n = getTranslation('zh-CN')

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ item: 'url' })
        .mockResolvedValueOnce({ url: 'https://new-api.example.com' })

      await modifyApiConfigPartially(mockConfig, zhI18n, 'zh-CN')

      expect(inquirer.prompt).toHaveBeenCalledWith(
        expect.objectContaining({
          message: zhI18n.api.selectModifyItems,
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
      await updatePromptOnly('en', 'en')

      expect(config.backupExistingConfig).toHaveBeenCalled()
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(backupDir),
      )
    })

    it('should copy only documentation files', async () => {
      await updatePromptOnly('zh-CN', 'zh-CN')

      expect(config.copyConfigFiles).toHaveBeenCalledWith('zh-CN', true)
    })

    it('should apply AI language directive if provided', async () => {
      await updatePromptOnly('en', 'en', 'Chinese')

      expect(config.applyAiLanguageDirective).toHaveBeenCalledWith('Chinese')
    })

    it('should not apply AI language directive if not provided', async () => {
      await updatePromptOnly('en', 'en')

      expect(config.applyAiLanguageDirective).not.toHaveBeenCalled()
    })

    it('should configure AI personality', async () => {
      await updatePromptOnly('en', 'en')

      expect(aiPersonality.configureAiPersonality).toHaveBeenCalledWith('en')
    })

    it('should show success message', async () => {
      const i18n = getTranslation('en')

      await updatePromptOnly('en', 'en')

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(i18n.configuration.configSuccess),
      )
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(i18n.common.complete),
      )
    })

    it('should handle no backup directory', async () => {
      vi.mocked(config.backupExistingConfig).mockReturnValue(null)

      await updatePromptOnly('en', 'en')

      expect(config.copyConfigFiles).toHaveBeenCalled()
      expect(aiPersonality.configureAiPersonality).toHaveBeenCalled()
    })

    it('should work with different config and script languages', async () => {
      await updatePromptOnly('zh-CN', 'en', 'English')

      expect(config.copyConfigFiles).toHaveBeenCalledWith('zh-CN', true)
      expect(config.applyAiLanguageDirective).toHaveBeenCalledWith('English')
      expect(aiPersonality.configureAiPersonality).toHaveBeenCalledWith('en')
    })

    it('should show Chinese success messages', async () => {
      const zhI18n = getTranslation('zh-CN')

      await updatePromptOnly('zh-CN', 'zh-CN')

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(zhI18n.configuration.configSuccess),
      )
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(zhI18n.common.complete),
      )
    })
  })
})
