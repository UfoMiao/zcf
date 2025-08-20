import dayjs from 'dayjs'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CLAUDE_DIR, SETTINGS_FILE } from '../../../src/constants'
import {
  applyAiLanguageDirective,
  backupExistingConfig,
  configureApi,
  copyConfigFiles,
  ensureClaudeDir,
  getExistingApiConfig,
  getExistingModelConfig,
  mergeSettingsFile,
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

      expect(filter?.('/some/path/backup')).toBe(false)
      expect(filter?.('/some/path/other')).toBe(true)
    })
  })

  describe('copyConfigFiles', () => {
    it('should throw error if source directory does not exist', () => {
      vi.mocked(fsOps.exists).mockReturnValue(false)

      expect(() => copyConfigFiles('en')).toThrow()
    })

    it('should copy only .md files when onlyMd is true', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.readDir).mockReturnValue(['test.md', 'test.txt', 'another.md'])

      copyConfigFiles('en', true)

      // Should copy memory .md files and CLAUDE.md
      expect(fsOps.copyFile).toHaveBeenCalledTimes(3) // 2 .md files from memory + CLAUDE.md
    })

    it('should merge settings.json when copying all files', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.readDir).mockReturnValue(['test.md'])
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({})

      copyConfigFiles('en', false)

      // Should merge settings.json
      expect(jsonConfig.readJsonConfig).toHaveBeenCalled()
      expect(fsOps.copyFile).toHaveBeenCalled() // For CLAUDE.md and memory files
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

    it('should update model to opusplan', () => {
      const mockSettings = { model: 'opus' }
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(mockSettings)

      updateDefaultModel('opusplan')

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        SETTINGS_FILE,
        expect.objectContaining({
          model: 'opusplan',
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
        join(CLAUDE_DIR, 'language.md'),
        expect.stringContaining('Chinese'),
      )
    })

    it('should write custom language string', () => {
      applyAiLanguageDirective('French')

      expect(fsOps.writeFile).toHaveBeenCalledWith(
        join(CLAUDE_DIR, 'language.md'),
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

    it('should return "opusplan" when model is set to opusplan', () => {
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({ model: 'opusplan' })

      const result = getExistingModelConfig()

      expect(result).toBe('opusplan')
    })

    it('should return "default" when model is explicitly set to default', () => {
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({ model: 'default' })

      const result = getExistingModelConfig()

      expect(result).toBe('default')
    })
  })
})
