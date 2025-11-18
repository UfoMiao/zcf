import type { CcrConfig, ProviderPreset } from '../../../src/types/ccr'
import { existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import inquirer from 'inquirer'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
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

describe('cCR config - edge cases', () => {
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

  describe('ensureCcrConfigDir - edge cases', () => {
    it('should handle permission errors', () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(mkdirSync).mockImplementation(() => {
        throw new Error('EACCES: permission denied')
      })

      expect(() => ensureCcrConfigDir()).toThrow('EACCES')
    })

    it('should handle very long directory paths', () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(mkdirSync).mockImplementation(() => undefined as any)

      ensureCcrConfigDir()

      expect(mkdirSync).toHaveBeenCalledWith(CCR_CONFIG_DIR, { recursive: true })
    })
  })

  describe('readCcrConfig - edge cases', () => {
    it('should handle corrupted JSON', () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(jsonConfig.readJsonConfig).mockImplementation(() => {
        throw new Error('Invalid JSON')
      })

      expect(() => readCcrConfig()).toThrow('Invalid JSON')
    })

    it('should handle file read permissions error', () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(jsonConfig.readJsonConfig).mockImplementation(() => {
        throw new Error('EACCES: permission denied')
      })

      expect(() => readCcrConfig()).toThrow('EACCES')
    })

    it('should handle null return from readJsonConfig', () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(null)

      const result = readCcrConfig()
      expect(result).toBeNull()
    })
  })

  describe('writeCcrConfig - edge cases', () => {
    it('should handle write permission errors', () => {
      const mockConfig: CcrConfig = {
        Providers: [],
        Router: { default: 'test' },
      }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(jsonConfig.writeJsonConfig).mockImplementation(() => {
        throw new Error('EACCES: permission denied')
      })

      expect(() => writeCcrConfig(mockConfig)).toThrow('EACCES')
    })

    it('should handle disk full errors', () => {
      const mockConfig: CcrConfig = {
        Providers: [],
        Router: { default: 'test' },
      }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(jsonConfig.writeJsonConfig).mockImplementation(() => {
        throw new Error('ENOSPC: no space left on device')
      })

      expect(() => writeCcrConfig(mockConfig)).toThrow('ENOSPC')
    })

    it('should handle very large config objects', () => {
      const largeConfig: CcrConfig = {
        Providers: Array.from({ length: 1000 }, () => ({
          name: 'provider',
          api_base_url: 'https://api.example.com',
          api_key: 'key',
          models: Array.from({ length: 100 }, () => 'model'),
        })),
        Router: { default: 'test' },
      }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(jsonConfig.writeJsonConfig).mockImplementation(() => {})

      writeCcrConfig(largeConfig)

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        CCR_CONFIG_FILE,
        largeConfig,
      )
    })
  })

  describe('configureCcrProxy - edge cases', () => {
    it('should handle null settings', async () => {
      const mockCcrConfig: CcrConfig = {
        HOST: '127.0.0.1',
        PORT: 3456,
        Providers: [],
        Router: { default: 'test' },
      }

      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(null)
      vi.mocked(jsonConfig.writeJsonConfig).mockImplementation(() => {})

      await configureCcrProxy(mockCcrConfig)

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          env: expect.any(Object),
        }),
      )
    })

    it('should handle existing env variables', async () => {
      const mockSettings = {
        env: {
          EXISTING_VAR: 'existing_value',
          ANTHROPIC_BASE_URL: 'old_url',
        },
      }
      const mockCcrConfig: CcrConfig = {
        HOST: '192.168.1.1',
        PORT: 8080,
        Providers: [],
        Router: { default: 'test' },
      }

      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(mockSettings)
      vi.mocked(jsonConfig.writeJsonConfig).mockImplementation(() => {})

      await configureCcrProxy(mockCcrConfig)

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          env: expect.objectContaining({
            EXISTING_VAR: 'existing_value',
            ANTHROPIC_BASE_URL: 'http://192.168.1.1:8080',
          }),
        }),
      )
    })

    it('should handle special characters in config values', async () => {
      const mockCcrConfig: CcrConfig = {
        HOST: '::1', // IPv6 localhost
        PORT: 3456,
        APIKEY: 'sk-测试key-🚀',
        Providers: [],
        Router: { default: 'test' },
      }

      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({})
      vi.mocked(jsonConfig.writeJsonConfig).mockImplementation(() => {})

      await configureCcrProxy(mockCcrConfig)

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          env: {
            ANTHROPIC_BASE_URL: 'http://::1:3456',
            ANTHROPIC_API_KEY: 'sk-测试key-🚀',
          },
        }),
      )
    })
  })

  describe('selectCcrPreset - edge cases', () => {
    it('should handle fetch timeout', async () => {
      vi.useFakeTimers()
      vi.mocked(presets.fetchProviderPresets).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve([]), 10000)),
      )

      const promise = selectCcrPreset()

      // Should eventually return null or empty
      vi.advanceTimersByTime(10000)
      const result = await promise

      expect(result).toBeNull()
      vi.useRealTimers()
    })

    it('should handle malformed preset data', async () => {
      const malformedPresets = [
        {
          name: undefined,
          provider: 'test',
          requiresApiKey: true,
          models: [],
        },
      ] as any

      vi.mocked(presets.fetchProviderPresets).mockResolvedValue(malformedPresets)
      vi.mocked(inquirer.prompt).mockResolvedValue({ preset: malformedPresets[0] })

      const result = await selectCcrPreset()

      expect(result).toEqual(malformedPresets[0])
    })

    it('should handle non-ExitPromptError in prompt', async () => {
      const mockPresets: ProviderPreset[] = [
        {
          name: 'Test',
          provider: 'test',
          requiresApiKey: false,
          models: ['model1'],
        },
      ]

      vi.mocked(presets.fetchProviderPresets).mockResolvedValue(mockPresets)
      vi.mocked(inquirer.prompt).mockRejectedValue(new Error('Generic error'))

      await expect(selectCcrPreset()).rejects.toThrow('Generic error')
    })
  })

  describe('configureCcrWithPreset - edge cases', () => {
    it('should handle preset with empty models array', async () => {
      const mockPreset: ProviderPreset = {
        name: 'EmptyProvider',
        provider: 'empty',
        requiresApiKey: false,
        models: [],
      }

      const result = await configureCcrWithPreset(mockPreset)

      expect(result.Router.default).toBe('EmptyProvider,undefined')
    })

    it('should handle API key validation failure', async () => {
      const mockPreset: ProviderPreset = {
        name: 'Provider',
        provider: 'provider',
        requiresApiKey: true,
        models: ['model1'],
      }

      vi.mocked(inquirer.prompt).mockResolvedValue({ apiKey: '' })

      const result = await configureCcrWithPreset(mockPreset)

      expect(result.Providers[0].api_key).toBe('')
    })

    it('should handle ExitPromptError during API key input', async () => {
      const mockPreset: ProviderPreset = {
        name: 'Provider',
        provider: 'provider',
        requiresApiKey: true,
        models: ['model1'],
      }

      const error = new Error('User cancelled')
      error.name = 'ExitPromptError'
      vi.mocked(inquirer.prompt).mockImplementationOnce((() => Promise.reject(error)) as any)

      await expect(configureCcrWithPreset(mockPreset)).rejects.toThrow(error)
    })

    it('should handle preset with very long model names', async () => {
      const longModelName = `model_${'x'.repeat(500)}`
      const mockPreset: ProviderPreset = {
        name: 'LongProvider',
        provider: 'long',
        requiresApiKey: false,
        models: [longModelName],
      }

      const result = await configureCcrWithPreset(mockPreset)

      expect(result.Router.default).toBe(`LongProvider,${longModelName}`)
    })
  })

  describe('setupCcrConfiguration - edge cases', () => {
    // Complex integration tests for setupCcrConfiguration have been removed
    // due to high maintenance cost and low testing value.
    // Edge cases are better tested in the individual component functions.

    it('should handle configuration error and return false', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(presets.fetchProviderPresets).mockRejectedValue(new Error('Network error'))

      const result = await setupCcrConfiguration()

      expect(result).toBe(false)
      // Error is logged in catch block
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('should handle ExitPromptError during overwrite prompt', async () => {
      const existingConfig: CcrConfig = {
        Providers: [],
        Router: { default: 'old' },
      }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(existingConfig)

      const error = new Error('User cancelled')
      error.name = 'ExitPromptError'
      mockedPromptBoolean.mockRejectedValueOnce(error)

      const result = await setupCcrConfiguration()

      expect(result).toBe(false)
      // ExitPromptError is handled silently
    })
  })

  describe('configureCcrFeature - edge cases', () => {
    it('should handle concurrent calls', async () => {
      vi.mocked(config.backupExistingConfig).mockReturnValue('/backup/dir')
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(presets.fetchProviderPresets).mockResolvedValue([])

      const promises = [
        configureCcrFeature(),
        configureCcrFeature(),
        configureCcrFeature(),
      ]

      await Promise.all(promises)

      expect(config.backupExistingConfig).toHaveBeenCalledTimes(3)
    })

    it('should handle exception during backup', async () => {
      vi.mocked(config.backupExistingConfig).mockImplementation(() => {
        throw new Error('Backup failed')
      })

      await expect(configureCcrFeature()).rejects.toThrow('Backup failed')
    })
  })

  describe('race conditions', () => {
    it('should handle simultaneous config reads and writes', async () => {
      const config1: CcrConfig = {
        Providers: [{ name: 'p1', api_base_url: '', api_key: '', models: [] }],
        Router: { default: 'p1' },
      }
      const config2: CcrConfig = {
        Providers: [{ name: 'p2', api_base_url: '', api_key: '', models: [] }],
        Router: { default: 'p2' },
      }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(jsonConfig.writeJsonConfig).mockImplementation(() => {})

      await Promise.all([
        writeCcrConfig(config1),
        writeCcrConfig(config2),
      ])

      expect(jsonConfig.writeJsonConfig).toHaveBeenCalledTimes(2)
    })
  })
})
