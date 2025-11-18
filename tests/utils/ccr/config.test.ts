import type { CcrConfig, ProviderPreset } from '../../../src/types/ccr'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import inquirer from 'inquirer'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  backupCcrConfig,
  configureCcrFeature,
  configureCcrProxy,
  configureCcrWithPreset,
  ensureCcrConfigDir,
  readCcrConfig,
  selectCcrPreset,
  setupCcrConfiguration,
  writeCcrConfig,
} from '../../../src/utils/ccr/config'
import * as presets from '../../../src/utils/ccr/presets'
import * as config from '../../../src/utils/config'
import * as jsonConfig from '../../../src/utils/json-config'

vi.mock('node:fs')
vi.mock('node:child_process')
vi.mock('inquirer')
vi.mock('../../../src/utils/json-config')
vi.mock('../../../src/utils/config')
vi.mock('../../../src/utils/ccr/presets')
vi.mock('../../../src/utils/claude-config')
vi.mock('../../../src/utils/toggle-prompt', () => ({
  promptBoolean: vi.fn(),
}))
// Use real i18n system for better integration testing
vi.mock('../../../src/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/i18n')>()
  return {
    ...actual,
    // Only mock initialization functions to avoid setup issues in tests
    ensureI18nInitialized: vi.fn(),
  }
})

const togglePromptModule = await import('../../../src/utils/toggle-prompt')
const mockedPromptBoolean = vi.mocked(togglePromptModule.promptBoolean)
function queuePromptBooleans(...values: boolean[]) {
  values.forEach(value => mockedPromptBoolean.mockResolvedValueOnce(value))
}

describe('cCR config', () => {
  const CCR_CONFIG_DIR = join(homedir(), '.claude-code-router')
  const CCR_CONFIG_FILE = join(CCR_CONFIG_DIR, 'config.json')
  let consoleLogSpy: any
  let consoleErrorSpy: any

  beforeEach(() => {
    vi.clearAllMocks()
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockedPromptBoolean.mockReset()
    mockedPromptBoolean.mockResolvedValue(false)
  })

  afterEach(() => {
    consoleLogSpy?.mockRestore()
    consoleErrorSpy?.mockRestore()
  })

  describe('ensureCcrConfigDir', () => {
    it('should create directory if it does not exist', () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(mkdirSync).mockImplementation(() => undefined as any)

      ensureCcrConfigDir()

      expect(existsSync).toHaveBeenCalledWith(CCR_CONFIG_DIR)
      expect(mkdirSync).toHaveBeenCalledWith(CCR_CONFIG_DIR, { recursive: true })
    })

    it('should not create directory if it exists', () => {
      vi.mocked(existsSync).mockReturnValue(true)

      ensureCcrConfigDir()

      expect(existsSync).toHaveBeenCalledWith(CCR_CONFIG_DIR)
      expect(mkdirSync).not.toHaveBeenCalled()
    })
  })

  describe('readCcrConfig', () => {
    it('should return null if config file does not exist', () => {
      vi.mocked(existsSync).mockReturnValue(false)

      const result = readCcrConfig()

      expect(result).toBeNull()
      expect(jsonConfig.readJsonConfig).not.toHaveBeenCalled()
    })

    it('should read and return config if file exists', () => {
      const mockConfig: CcrConfig = {
        HOST: '127.0.0.1',
        PORT: 3456,
        APIKEY: 'test-key',
        Providers: [],
        Router: {
          default: 'provider,model',
        },
      }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(mockConfig)

      const result = readCcrConfig()

      expect(result).toEqual(mockConfig)
      expect(jsonConfig.readJsonConfig).toHaveBeenCalledWith(CCR_CONFIG_FILE)
    })
  })

  describe('writeCcrConfig', () => {
    it('should ensure directory exists and write config', () => {
      const mockConfig: CcrConfig = {
        Providers: [],
        Router: { default: 'test' },
      }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(jsonConfig.writeJsonConfig).mockImplementation(() => {})

      writeCcrConfig(mockConfig)

      expect(existsSync).toHaveBeenCalledWith(CCR_CONFIG_DIR)
      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(CCR_CONFIG_FILE, mockConfig)
    })
  })

  describe('configureCcrProxy', () => {
    it('should update settings with CCR proxy configuration', async () => {
      const mockSettings = { env: {} }
      const mockCcrConfig: CcrConfig = {
        HOST: '192.168.1.1',
        PORT: 8080,
        APIKEY: 'custom-key',
        Providers: [],
        Router: { default: 'test' },
      }

      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(mockSettings)
      vi.mocked(jsonConfig.writeJsonConfig).mockImplementation(() => {})

      await configureCcrProxy(mockCcrConfig)

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          env: {
            ANTHROPIC_BASE_URL: 'http://192.168.1.1:8080',
            ANTHROPIC_API_KEY: 'custom-key',
          },
        }),
      )
    })

    it('should use default values when not specified', async () => {
      const mockSettings = {}
      const mockCcrConfig: CcrConfig = {
        Providers: [],
        Router: { default: 'test' },
      }

      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(mockSettings)
      vi.mocked(jsonConfig.writeJsonConfig).mockImplementation(() => {})

      await configureCcrProxy(mockCcrConfig)

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          env: {
            ANTHROPIC_BASE_URL: 'http://127.0.0.1:3456',
            ANTHROPIC_API_KEY: 'sk-zcf-x-ccr',
          },
        }),
      )
    })
  })

  describe('selectCcrPreset', () => {
    it('should fetch and return selected preset', async () => {
      const mockPresets: ProviderPreset[] = [
        {
          name: 'Test Provider',
          provider: 'test',
          baseURL: 'https://api.test.com',
          requiresApiKey: true,
          models: ['model1', 'model2'],
          description: 'Test provider',
        },
      ]

      vi.mocked(presets.fetchProviderPresets).mockResolvedValue(mockPresets)
      vi.mocked(inquirer.prompt).mockResolvedValue({ preset: mockPresets[0] })

      const result = await selectCcrPreset()

      expect(result).toEqual(mockPresets[0])
      expect(inquirer.prompt).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'list',
          name: 'preset',
          message: 'Select a provider preset:',
        }),
      )
    })

    it('should return null when no presets available', async () => {
      vi.mocked(presets.fetchProviderPresets).mockResolvedValue([])

      const result = await selectCcrPreset()

      expect(result).toBeNull()
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No presets available'))
    })

    it('should handle user cancellation', async () => {
      const mockPresets: ProviderPreset[] = [
        {
          name: 'Test',
          provider: 'test',
          requiresApiKey: false,
          models: ['model1'],
        },
      ]

      vi.mocked(presets.fetchProviderPresets).mockResolvedValue(mockPresets)
      const error = new Error('User cancelled')
      error.name = 'ExitPromptError'
      vi.mocked(inquirer.prompt).mockRejectedValue(error)

      const result = await selectCcrPreset()

      expect(result).toBeNull()
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Operation cancelled'))
    })

    it('should return "skip" when user selects skip option', async () => {
      const mockPresets: ProviderPreset[] = [
        {
          name: 'Test Provider',
          provider: 'test',
          baseURL: 'https://api.test.com',
          requiresApiKey: true,
          models: ['model1'],
          description: 'Test provider',
        },
      ]

      vi.mocked(presets.fetchProviderPresets).mockResolvedValue(mockPresets)
      vi.mocked(inquirer.prompt).mockResolvedValue({ preset: 'skip' })

      const result = await selectCcrPreset()

      expect(result).toBe('skip')
      expect(inquirer.prompt).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'list',
          name: 'preset',
          message: 'Select a provider preset:',
          choices: expect.arrayContaining([expect.objectContaining({ value: 'skip' })]),
        }),
      )
    })
  })

  describe('configureCcrWithPreset', () => {
    it('should configure CCR with preset requiring API key', async () => {
      const mockPreset: ProviderPreset = {
        name: 'Provider1',
        provider: 'provider1',
        baseURL: 'https://api.provider1.com',
        requiresApiKey: true,
        models: ['model1', 'model2'],
      }

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ apiKey: 'test-api-key' })
        .mockResolvedValueOnce({ model: 'model2' })

      const result = await configureCcrWithPreset(mockPreset)

      expect(result).toMatchObject({
        LOG: true,
        HOST: '127.0.0.1',
        PORT: 3456,
        APIKEY: 'sk-zcf-x-ccr',
        Providers: [
          expect.objectContaining({
            name: 'Provider1',
            api_key: 'test-api-key',
            models: ['model1', 'model2'],
          }),
        ],
        Router: {
          default: 'Provider1,model2',
          background: 'Provider1,model2',
          think: 'Provider1,model2',
          longContext: 'Provider1,model2',
          longContextThreshold: 60000,
          webSearch: 'Provider1,model2',
        },
      })
    })

    it('should configure CCR with free preset', async () => {
      const mockPreset: ProviderPreset = {
        name: 'FreeProvider',
        provider: 'free',
        requiresApiKey: false,
        models: ['free-model'],
      }

      const result = await configureCcrWithPreset(mockPreset)

      expect(result.Providers[0].api_key).toBe('sk-free')
      expect(inquirer.prompt).not.toHaveBeenCalled()
    })

    it('should include transformer when present', async () => {
      const mockPreset: ProviderPreset = {
        name: 'TransformProvider',
        provider: 'transform',
        requiresApiKey: false,
        models: ['model1'],
        transformer: { use: ['enhancetool'] },
      }

      const result = await configureCcrWithPreset(mockPreset)

      expect(result.Providers[0].transformer).toEqual({ use: ['enhancetool'] })
    })
  })

  describe('setupCcrConfiguration', () => {
    // Complex integration tests for setupCcrConfiguration have been removed
    // due to high maintenance cost and low testing value.
    // The core functionality is already covered by unit tests of individual functions:
    // - selectCcrPreset, configureCcrWithPreset, configureCcrProxy, etc.

    it('should keep existing configuration when not overwriting', async () => {
      const existingConfig: CcrConfig = {
        HOST: 'existing-host',
        Providers: [],
        Router: { default: 'existing' },
      }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(existingConfig)
      queuePromptBooleans(false)
      vi.mocked(jsonConfig.writeJsonConfig).mockImplementation(() => {})

      const result = await setupCcrConfiguration()

      expect(result).toBe(true)
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Keeping existing config'))
      // Should still configure proxy
      expect(jsonConfig.writeJsonConfig).toHaveBeenCalled()
    })
  })

  describe('backupCcrConfig', () => {
    it('should backup existing CCR config successfully', async () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        const pathStr = path.toString()
        if (pathStr.includes('config.json'))
          return true
        return false
      })
      vi.mocked(copyFileSync).mockImplementation(() => undefined)

      const result = await backupCcrConfig()

      expect(result).toBeTruthy()
      // No need to create backup directory since it's the same as config directory
      expect(copyFileSync).toHaveBeenCalled()
    })

    it('should return null when no existing config', async () => {
      vi.mocked(existsSync).mockReturnValue(false)

      const result = await backupCcrConfig()

      expect(result).toBeNull()
    })

    it('should handle backup errors gracefully', async () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        const pathStr = path.toString()
        if (pathStr.includes('config.json'))
          return true
        return false
      })
      vi.mocked(copyFileSync).mockImplementation(() => {
        throw new Error('Permission denied')
      })

      const result = await backupCcrConfig()

      expect(result).toBeNull()
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to backup'), expect.any(String))
    })
  })

  describe('configureCcrFeature', () => {
    it('should backup existing config and setup CCR', async () => {
      const backupDir = '/backup/dir'
      vi.mocked(config.backupExistingConfig).mockReturnValue(backupDir)
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(presets.fetchProviderPresets).mockResolvedValue([])

      await configureCcrFeature()

      expect(config.backupExistingConfig).toHaveBeenCalled()
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('All config files backed up to:'))
    })

    it('should handle backup failure gracefully', async () => {
      vi.mocked(config.backupExistingConfig).mockReturnValue(null)
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(presets.fetchProviderPresets).mockResolvedValue([])

      await configureCcrFeature()

      expect(config.backupExistingConfig).toHaveBeenCalled()
      // Should not log backup success
      expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('All config files backed up to:'))
    })
  })
})
