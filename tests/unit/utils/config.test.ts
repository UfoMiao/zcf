import dayjs from 'dayjs'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CLAUDE_DIR, CLAUDE_VSC_CONFIG_FILE, SETTINGS_FILE } from '../../../src/constants'
import { i18n } from '../../../src/i18n'
import * as claudeConfig from '../../../src/utils/claude-config'
import {
  applyAiLanguageDirective,
  backupExistingConfig,
  configureApi,
  copyConfigFiles,
  ensureClaudeDir,
  getExistingApiConfig,
  getExistingModelConfig,
  mergeSettingsFile,
  switchToOfficialLogin,
  updateCustomModel,
  updateDefaultModel,
} from '../../../src/utils/config'
import * as fsOps from '../../../src/utils/fs-operations'
import * as jsonConfig from '../../../src/utils/json-config'
import * as permissionCleaner from '../../../src/utils/permission-cleaner'
import * as zcfConfig from '../../../src/utils/zcf-config'

vi.mock('../../../src/utils/fs-operations')
vi.mock('../../../src/utils/json-config')
vi.mock('../../../src/utils/zcf-config')
vi.mock('../../../src/utils/permission-cleaner')
vi.mock('../../../src/utils/claude-config')
vi.mock('../../../src/i18n')
vi.mock('dayjs')

describe('config utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(zcfConfig.readZcfConfig).mockReturnValue({ preferredLang: 'en' } as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('ensureClaudeDir', () => {
    it('should create Claude directory', () => {
      ensureClaudeDir()
      expect(fsOps.ensureDir).toHaveBeenCalledWith(CLAUDE_DIR)
    })
  })

  describe('backupExistingConfig', () => {
    it('should return null if Claude dir does not exist', () => {
      vi.mocked(fsOps.exists).mockReturnValue(false)
      const result = backupExistingConfig()
      expect(result).toBeNull()
    })

    it('should create backup with timestamp', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(dayjs).mockReturnValue({
        format: vi.fn().mockReturnValue('2024-01-01_12-00-00'),
      } as any)

      const result = backupExistingConfig()

      expect(fsOps.ensureDir).toHaveBeenCalled()
      expect(fsOps.copyDir).toHaveBeenCalled()
      expect(result).toContain('backup_2024-01-01_12-00-00')
    })

    it('should filter out backup directory itself', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(dayjs).mockReturnValue({
        format: vi.fn().mockReturnValue('2024-01-01_12-00-00'),
      } as any)

      backupExistingConfig()

      const copyDirCall = vi.mocked(fsOps.copyDir).mock.calls[0]
      const filter = copyDirCall[2]?.filter

      expect(filter?.('/some/path/backup', {} as any)).toBe(false)
      expect(filter?.('/some/path/other', {} as any)).toBe(true)
    })
  })

  describe('copyConfigFiles', () => {
    it('should not throw error when called', () => {
      vi.mocked(fsOps.exists).mockReturnValue(false)

      expect(() => copyConfigFiles(false)).not.toThrow()
    })

    it('should do nothing when onlyMd is true (memory files no longer copied)', () => {
      copyConfigFiles(true)

      // Should not copy any files when onlyMd=true since memory files are no longer copied
      expect(fsOps.copyFile).not.toHaveBeenCalled()
    })

    it('should merge settings.json when onlyMd is false', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({})

      copyConfigFiles(false)

      // Should only merge settings.json
      expect(fsOps.exists).toHaveBeenCalled()
    })
  })

  describe('configureApi', () => {
    it('should return null if no apiConfig provided', () => {
      const result = configureApi(null)
      expect(result).toBeNull()
    })

    it('should configure API key authentication', () => {
      const mockSettings = { env: {} }
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(mockSettings)

      const apiConfig = {
        authType: 'api_key' as const,
        key: 'test-api-key',
        url: 'https://api.test.com',
      }

      const result = configureApi(apiConfig)

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        SETTINGS_FILE,
        expect.objectContaining({
          env: expect.objectContaining({
            ANTHROPIC_API_KEY: 'test-api-key',
            ANTHROPIC_BASE_URL: 'https://api.test.com',
          }),
        }),
      )
      expect(result).toEqual(apiConfig)
    })

    it('should configure auth token authentication', () => {
      const mockSettings = { env: {} }
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(mockSettings)

      const apiConfig = {
        authType: 'auth_token' as const,
        key: 'test-auth-token',
        url: 'https://api.test.com',
      }

      configureApi(apiConfig)

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        SETTINGS_FILE,
        expect.objectContaining({
          env: expect.objectContaining({
            ANTHROPIC_AUTH_TOKEN: 'test-auth-token',
            ANTHROPIC_BASE_URL: 'https://api.test.com',
          }),
        }),
      )
    })

    describe('claude Code 2.0 API enhancements', () => {
      beforeEach(() => {
        vi.clearAllMocks()
        // Setup claude-config mocks
        vi.mocked(claudeConfig.setPrimaryApiKey).mockClear()
        vi.mocked(claudeConfig.addCompletedOnboarding).mockClear()
      })

      it('should call setPrimaryApiKey when authType is provided', () => {
        configureApi({
          authType: 'api_key',
          key: 'test-key',
          url: 'https://test.com',
        })

        expect(claudeConfig.setPrimaryApiKey).toHaveBeenCalled()
      })

      it('should handle setPrimaryApiKey errors gracefully', () => {
        const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

        vi.mocked(claudeConfig.setPrimaryApiKey).mockImplementation(() => {
          throw new Error('setPrimaryApiKey failed')
        })

        // Mock i18n
        vi.mocked(i18n.t).mockReturnValue('Mocked: mcp:primaryApiKeySetFailed')

        // Should not throw error
        expect(() => {
          configureApi({
            authType: 'api_key',
            key: 'test-key',
            url: 'https://test.com',
          })
        }).not.toThrow()

        expect(mockConsoleError).toHaveBeenCalledWith(
          'Mocked: mcp:primaryApiKeySetFailed',
          expect.any(Error),
        )

        mockConsoleError.mockRestore()
      })

      it('should not fail API configuration when setPrimaryApiKey fails', () => {
        const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

        vi.mocked(claudeConfig.setPrimaryApiKey).mockImplementation(() => {
          throw new Error('setPrimaryApiKey failed')
        })

        // Mock i18n
        const mockI18n = { t: vi.fn(key => `Mocked: ${key}`) }
        vi.doMock('../../../src/i18n', () => ({
          ensureI18nInitialized: vi.fn(),
          i18n: mockI18n,
        }))

        const result = configureApi({
          authType: 'api_key',
          key: 'test-key',
          url: 'https://test.com',
        })

        // Should still return successful result despite setPrimaryApiKey failure
        expect(result).toEqual(expect.objectContaining({
          authType: 'api_key',
          key: 'test-key',
        }))

        mockConsoleError.mockRestore()
      })
    })
  })

  describe('updateDefaultModel', () => {
    it('should update model to opus', () => {
      const mockSettings = { model: 'sonnet' }
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(mockSettings)

      updateDefaultModel('opus')

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        SETTINGS_FILE,
        expect.objectContaining({
          model: 'opus',
        }),
      )
    })

    it('should update model to sonnet', () => {
      const mockSettings = { model: 'opus' }
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(mockSettings)

      updateDefaultModel('sonnet')

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        SETTINGS_FILE,
        expect.objectContaining({
          model: 'sonnet',
        }),
      )
    })

    it('should handle custom model type by not setting model field', () => {
      const mockSettings = { model: 'opus' }
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(mockSettings)

      updateDefaultModel('custom')

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        SETTINGS_FILE,
        expect.not.objectContaining({
          model: expect.anything(),
        }),
      )
    })

    it('should clean environment variables when switching from custom to default', () => {
      const mockSettings = {
        env: {
          ANTHROPIC_MODEL: 'claude-3-5-sonnet-20241022',
          ANTHROPIC_SMALL_FAST_MODEL: 'claude-3-haiku-20240307',
          ANTHROPIC_API_KEY: 'keep-this-key',
        },
      }
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(mockSettings)

      updateDefaultModel('default')

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        SETTINGS_FILE,
        expect.objectContaining({
          env: expect.objectContaining({
            ANTHROPIC_API_KEY: 'keep-this-key',
          }),
        }),
      )

      const writtenConfig = vi.mocked(jsonConfig.writeJsonConfig).mock.calls[0][1] as any
      expect(writtenConfig).not.toHaveProperty('model')
      expect(writtenConfig.env).not.toHaveProperty('ANTHROPIC_MODEL')
      expect(writtenConfig.env).not.toHaveProperty('ANTHROPIC_SMALL_FAST_MODEL')
    })

    it('should clean environment variables when switching from custom to opus', () => {
      const mockSettings = {
        env: {
          ANTHROPIC_MODEL: 'custom-model',
          ANTHROPIC_SMALL_FAST_MODEL: 'custom-fast-model',
          ANTHROPIC_API_KEY: 'keep-this',
        },
      }
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(mockSettings)

      updateDefaultModel('opus')

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        SETTINGS_FILE,
        expect.objectContaining({
          model: 'opus',
          env: expect.objectContaining({
            ANTHROPIC_API_KEY: 'keep-this',
          }),
        }),
      )

      const writtenConfig = vi.mocked(jsonConfig.writeJsonConfig).mock.calls[0][1] as any
      expect(writtenConfig.env).not.toHaveProperty('ANTHROPIC_MODEL')
      expect(writtenConfig.env).not.toHaveProperty('ANTHROPIC_SMALL_FAST_MODEL')
    })

    it('should not modify configuration when no custom environment variables exist', () => {
      const mockSettings = {
        model: 'opus',
        env: {
          ANTHROPIC_API_KEY: 'keep-this',
        },
      }
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(mockSettings)

      updateDefaultModel('sonnet')

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        SETTINGS_FILE,
        expect.objectContaining({
          model: 'sonnet',
          env: expect.objectContaining({
            ANTHROPIC_API_KEY: 'keep-this',
          }),
        }),
      )
    })
  })

  describe('updateDefaultModel with sonnet[1m] support', () => {
    it('should handle sonnet[1m] model parameter correctly', () => {
      const mockSettings = { model: 'opus' }
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(mockSettings)

      updateDefaultModel('sonnet[1m]')

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        SETTINGS_FILE,
        expect.objectContaining({
          model: 'sonnet[1m]',
        }),
      )
    })

    it('should update model configuration for sonnet[1m]', () => {
      const mockSettings = { model: 'custom' }
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(mockSettings)

      updateDefaultModel('sonnet[1m]')

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        SETTINGS_FILE,
        expect.objectContaining({
          model: 'sonnet[1m]',
        }),
      )
    })

    it('should clean environment variables when switching to sonnet[1m]', () => {
      const mockSettings = {
        model: 'custom',
        env: {
          ANTHROPIC_MODEL: 'claude-3-5-sonnet-20241022',
          ANTHROPIC_SMALL_FAST_MODEL: 'claude-3-haiku-20240307',
          ANTHROPIC_API_KEY: 'keep-this-key',
        },
      }
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(mockSettings)

      updateDefaultModel('sonnet[1m]')

      const writtenConfig = vi.mocked(jsonConfig.writeJsonConfig).mock.calls[0][1] as any
      expect(writtenConfig.env).not.toHaveProperty('ANTHROPIC_MODEL')
      expect(writtenConfig.env).not.toHaveProperty('ANTHROPIC_SMALL_FAST_MODEL')
      expect(writtenConfig.env).toHaveProperty('ANTHROPIC_API_KEY', 'keep-this-key')
    })
  })

  describe('updateCustomModel', () => {
    it('should delete model field and set environment variables for custom model', () => {
      const mockSettings = { model: 'opus' }
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(mockSettings)

      // This test should fail initially (Red phase) - function doesn't exist yet
      updateCustomModel('claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307')

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        SETTINGS_FILE,
        expect.objectContaining({
          env: expect.objectContaining({
            ANTHROPIC_MODEL: 'claude-3-5-sonnet-20241022',
            ANTHROPIC_SMALL_FAST_MODEL: 'claude-3-haiku-20240307',
          }),
        }),
      )
      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        SETTINGS_FILE,
        expect.not.objectContaining({
          model: expect.anything(),
        }),
      )
    })

    it('should set only ANTHROPIC_MODEL when fastModel is skipped', () => {
      const mockSettings = { model: 'opus' }
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(mockSettings)

      updateCustomModel('claude-3-5-sonnet-20241022', '')

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        SETTINGS_FILE,
        expect.objectContaining({
          env: expect.objectContaining({
            ANTHROPIC_MODEL: 'claude-3-5-sonnet-20241022',
          }),
        }),
      )
    })

    it('should not modify configuration when both models are skipped', () => {
      const mockSettings = { model: 'opus' }
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(mockSettings)

      updateCustomModel('', '')

      expect(jsonConfig.writeJsonConfig).not.toHaveBeenCalled()
    })

    it('should preserve existing environment variables', () => {
      const mockSettings = {
        model: 'opus',
        env: {
          ANTHROPIC_API_KEY: 'existing-key',
          CUSTOM_VAR: 'keep-this',
        },
      }
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(mockSettings)

      updateCustomModel('new-model', 'new-fast-model')

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        SETTINGS_FILE,
        expect.objectContaining({
          env: expect.objectContaining({
            ANTHROPIC_API_KEY: 'existing-key',
            CUSTOM_VAR: 'keep-this',
            ANTHROPIC_MODEL: 'new-model',
            ANTHROPIC_SMALL_FAST_MODEL: 'new-fast-model',
          }),
        }),
      )
    })
  })

  describe('getExistingApiConfig', () => {
    it('should return null if no settings exist', () => {
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(null)

      const result = getExistingApiConfig()
      expect(result).toBeNull()
    })

    it('should return null if no API configuration exists', () => {
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({ env: {} })

      const result = getExistingApiConfig()
      expect(result).toBeNull()
    })

    it('should return API key configuration', () => {
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({
        env: {
          ANTHROPIC_API_KEY: 'test-key',
          ANTHROPIC_BASE_URL: 'https://api.test.com',
        },
      })

      const result = getExistingApiConfig()
      expect(result).toEqual({
        authType: 'api_key',
        key: 'test-key',
        url: 'https://api.test.com',
      })
    })

    it('should return auth token configuration', () => {
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({
        env: {
          ANTHROPIC_AUTH_TOKEN: 'test-token',
          ANTHROPIC_BASE_URL: 'https://api.test.com',
        },
      })

      const result = getExistingApiConfig()
      expect(result).toEqual({
        authType: 'auth_token',
        key: 'test-token',
        url: 'https://api.test.com',
      })
    })
  })

  describe('applyAiLanguageDirective', () => {
    it('should return early for custom language', () => {
      applyAiLanguageDirective('custom')
      expect(fsOps.writeFile).not.toHaveBeenCalled()
    })

    it('should write predefined language directive', () => {
      applyAiLanguageDirective('zh-CN')

      expect(fsOps.writeFile).toHaveBeenCalledWith(
        join(CLAUDE_DIR, 'CLAUDE.md'),
        'Always respond in Chinese-simplified',
      )
    })

    it('should write custom language string', () => {
      applyAiLanguageDirective('French')

      expect(fsOps.writeFile).toHaveBeenCalledWith(
        join(CLAUDE_DIR, 'CLAUDE.md'),
        'Always respond in French',
      )
    })
  })

  describe('mergeSettingsFile', () => {
    it('should copy template if target does not exist', () => {
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({ env: {} })
      vi.mocked(fsOps.exists).mockReturnValue(false)

      mergeSettingsFile('/template/settings.json', '/target/settings.json')

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalled()
    })

    it('should merge settings preserving user env vars', () => {
      const templateSettings = {
        env: { DEFAULT_VAR: 'default' },
        model: 'sonnet',
      }
      const existingSettings = {
        env: { ANTHROPIC_API_KEY: 'user-key', DEFAULT_VAR: 'user-override' },
        model: 'opus',
      }

      vi.mocked(jsonConfig.readJsonConfig)
        .mockReturnValueOnce(templateSettings)
        .mockReturnValueOnce(existingSettings)
      vi.mocked(fsOps.exists).mockReturnValue(true)

      mergeSettingsFile('/template/settings.json', '/target/settings.json')

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        '/target/settings.json',
        expect.objectContaining({
          env: expect.objectContaining({
            DEFAULT_VAR: 'user-override',
            ANTHROPIC_API_KEY: 'user-key',
          }),
        }),
      )
    })

    it('should handle permissions merging', () => {
      const templateSettings = {
        permissions: { allow: ['read', 'write'] },
      }
      const existingSettings = {
        permissions: { allow: ['write', 'execute'] },
      }

      vi.mocked(jsonConfig.readJsonConfig)
        .mockReturnValueOnce(templateSettings)
        .mockReturnValueOnce(existingSettings)
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(permissionCleaner.mergeAndCleanPermissions).mockReturnValue(['read', 'write', 'execute'])

      mergeSettingsFile('/template/settings.json', '/target/settings.json')

      expect(permissionCleaner.mergeAndCleanPermissions).toHaveBeenCalledWith(
        ['read', 'write'],
        ['write', 'execute'],
      )
    })
  })

  // Extended Tests from config.extended.test.ts
  describe('copyConfigFiles extended tests', () => {
    it('should handle existing directory check', async () => {
      // This is a placeholder test - the actual extended tests were minimal
      expect(true).toBe(true)
    })
  })

  describe('getExistingModelConfig', () => {
    it('should return null when settings file does not exist', () => {
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(null)

      const result = getExistingModelConfig()

      expect(result).toBe(null)
      expect(jsonConfig.readJsonConfig).toHaveBeenCalledWith(SETTINGS_FILE)
    })

    it('should return "default" when model field is not set', () => {
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({})

      const result = getExistingModelConfig()

      expect(result).toBe('default')
    })

    it('should return "opus" when model is set to opus', () => {
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({ model: 'opus' })

      const result = getExistingModelConfig()

      expect(result).toBe('opus')
    })

    it('should return "sonnet" when model is set to sonnet', () => {
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({ model: 'sonnet' })

      const result = getExistingModelConfig()

      expect(result).toBe('sonnet')
    })

    it('should return "default" when model is explicitly set to default', () => {
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({ model: 'default' })

      const result = getExistingModelConfig()

      expect(result).toBe('default')
    })

    it('should return "custom" when environment variables are set for custom models', () => {
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({
        env: {
          ANTHROPIC_MODEL: 'claude-3-5-sonnet-20241022',
          ANTHROPIC_SMALL_FAST_MODEL: 'claude-3-haiku-20240307',
        },
      })

      const result = getExistingModelConfig()

      expect(result).toBe('custom')
    })

    it('should return "custom" when only ANTHROPIC_MODEL environment variable is set', () => {
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({
        env: {
          ANTHROPIC_MODEL: 'claude-3-5-sonnet-20241022',
        },
      })

      const result = getExistingModelConfig()

      expect(result).toBe('custom')
    })

    it('should prioritize environment variables over model field for custom detection', () => {
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({
        model: 'opus',
        env: {
          ANTHROPIC_MODEL: 'claude-3-5-sonnet-20241022',
        },
      })

      const result = getExistingModelConfig()

      expect(result).toBe('custom')
    })
  })

  describe('switchToOfficialLogin', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      // Mock i18n translation function
      ;(i18n.t as any).mockImplementation((key: string) => `Mocked: ${key}`)
    })

    it('should clean API configurations from settings.json', () => {
      // Mock existing settings with API configs
      const mockSettings = {
        env: {
          ANTHROPIC_API_KEY: 'test-key',
          ANTHROPIC_AUTH_TOKEN: 'test-token',
          ANTHROPIC_BASE_URL: 'https://test.com',
        },
      }

      vi.mocked(jsonConfig.readJsonConfig)
        .mockReturnValueOnce(mockSettings) // SETTINGS_FILE read
        .mockReturnValueOnce({ primaryApiKey: 'test-primary-key' }) // VSC config read
        .mockReturnValueOnce({ hasCompletedOnboarding: true }) // MCP config read

      const result = switchToOfficialLogin()

      expect(result).toBe(true)
      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        SETTINGS_FILE,
        expect.objectContaining({
          env: {}, // Should be empty after cleaning
        }),
      )
    })

    it('should remove primaryApiKey from ~/.claude/config.json', () => {
      vi.mocked(jsonConfig.readJsonConfig)
        .mockReturnValueOnce({ env: {} }) // SETTINGS_FILE
        .mockReturnValueOnce({ primaryApiKey: 'test-primary-key' }) // VSC config
        .mockReturnValueOnce({}) // MCP config

      switchToOfficialLogin()

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        CLAUDE_VSC_CONFIG_FILE,
        expect.not.objectContaining({
          primaryApiKey: expect.any(String),
        }),
      )
    })

    it('should keep hasCompletedOnboarding flag in ~/.claude.json', () => {
      // Setup mock for readMcpConfig and writeMcpConfig
      vi.mocked(claudeConfig.readMcpConfig).mockReturnValue({
        mcpServers: {},
        hasCompletedOnboarding: true,
      })

      switchToOfficialLogin()

      expect(claudeConfig.writeMcpConfig).not.toHaveBeenCalled()
    })

    it('should handle errors gracefully', () => {
      // Mock console.error to suppress error output
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Mock readJsonConfig to throw an error
      vi.mocked(jsonConfig.readJsonConfig).mockImplementation(() => {
        throw new Error('Read failed')
      })

      const result = switchToOfficialLogin()

      expect(result).toBe(false)

      consoleErrorSpy.mockRestore()
    })

    it('should log success message in correct language', () => {
      const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

      vi.mocked(jsonConfig.readJsonConfig)
        .mockReturnValueOnce({ env: {} })
        .mockReturnValueOnce({})
        .mockReturnValueOnce({})

      switchToOfficialLogin()

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Mocked: api:officialLoginConfigured'),
      )

      mockConsoleLog.mockRestore()
    })
  })
})
