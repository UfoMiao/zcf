import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fsOps from '../../../src/utils/fs-operations'
import {
  backupJsonConfig,
  isValidJsonFile,
  mergeJsonConfigs,
  readJsonConfig,
  updateJsonConfig,
  writeJsonConfig,
} from '../../../src/utils/json-config'
import * as zcfConfig from '../../../src/utils/zcf-config'

vi.mock('../../../src/utils/fs-operations')
vi.mock('../../../src/utils/zcf-config')
// Use real i18n system for better integration testing
vi.mock('../../../src/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/i18n')>()
  return {
    ...actual,
    // Only mock initialization functions to avoid setup issues in tests
    ensureI18nInitialized: vi.fn(),
    i18n: {
      t: vi.fn((key: string) => key),
    },
  }
})
vi.mock('dayjs', () => ({
  default: () => ({
    format: () => '2024-01-01_12-00-00',
  }),
}))

describe('json-config utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(zcfConfig.readZcfConfig).mockReturnValue({ preferredLang: 'en' } as any)
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('readJsonConfig', () => {
    it('should read and parse JSON file', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.readFile).mockReturnValue('{"key": "value"}')

      const result = readJsonConfig('/test/config.json')

      expect(result).toEqual({ key: 'value' })
      expect(fsOps.readFile).toHaveBeenCalledWith('/test/config.json')
    })

    it('should return default value when file does not exist', () => {
      vi.mocked(fsOps.exists).mockReturnValue(false)

      const result = readJsonConfig('/test/config.json', { defaultValue: { test: true } })

      expect(result).toEqual({ test: true })
      expect(fsOps.readFile).not.toHaveBeenCalled()
    })

    it('should return null when file does not exist and no default', () => {
      vi.mocked(fsOps.exists).mockReturnValue(false)

      const result = readJsonConfig('/test/config.json')

      expect(result).toBeNull()
    })

    it('should validate data with validator function', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.readFile).mockReturnValue('{"key": "value"}')

      const validate = (data: any): data is { key: string } => {
        return typeof data.key === 'string'
      }

      const result = readJsonConfig('/test/config.json', { validate })

      expect(result).toEqual({ key: 'value' })
    })

    it('should return default when validation fails', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.readFile).mockReturnValue('{"key": 123}')

      const validate = (data: any): data is { key: string } => {
        return typeof data.key === 'string'
      }

      const result = readJsonConfig('/test/config.json', {
        validate,
        defaultValue: { key: 'default' },
      })

      expect(result).toEqual({ key: 'default' })
      expect(console.log).toHaveBeenCalled()
    })

    it('should sanitize data', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.readFile).mockReturnValue('{"key": "VALUE"}')

      const sanitize = (data: any) => ({
        ...data,
        key: data.key.toLowerCase(),
      })

      const result = readJsonConfig('/test/config.json', { sanitize })

      expect(result).toEqual({ key: 'value' })
    })

    it('should handle JSON parse errors', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.readFile).mockReturnValue('invalid json')

      const result = readJsonConfig('/test/config.json', { defaultValue: { fallback: true } })

      expect(result).toEqual({ fallback: true })
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('writeJsonConfig', () => {
    it('should write JSON with pretty formatting', () => {
      const data = { key: 'value', nested: { prop: true } }

      writeJsonConfig('/test/config.json', data)

      expect(fsOps.writeFile).toHaveBeenCalledWith(
        '/test/config.json',
        JSON.stringify(data, null, 2),
      )
    })

    it('should write minified JSON when pretty is false', () => {
      const data = { key: 'value' }

      writeJsonConfig('/test/config.json', data, { pretty: false })

      expect(fsOps.writeFile).toHaveBeenCalledWith(
        '/test/config.json',
        JSON.stringify(data),
      )
    })

    it('should backup existing file when backup is true', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      const data = { key: 'value' }

      writeJsonConfig('/test/config.json', data, { backup: true })

      expect(fsOps.ensureDir).toHaveBeenCalled()
      expect(fsOps.copyFile).toHaveBeenCalled()
    })

    it('should not backup when file does not exist', () => {
      vi.mocked(fsOps.exists).mockReturnValue(false)
      const data = { key: 'value' }

      writeJsonConfig('/test/config.json', data, { backup: true })

      expect(fsOps.copyFile).not.toHaveBeenCalled()
    })
  })

  describe('updateJsonConfig', () => {
    it('should merge updates with existing config', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.readFile).mockReturnValue('{"existing": "value", "key": "old"}')

      const result = updateJsonConfig('/test/config.json', { key: 'new' })

      expect(result).toEqual({ existing: 'value', key: 'new' })
      expect(fsOps.writeFile).toHaveBeenCalled()
    })

    it('should create new config when file does not exist', () => {
      vi.mocked(fsOps.exists).mockReturnValue(false)

      const result = updateJsonConfig('/test/config.json', { key: 'value' })

      expect(result).toEqual({ key: 'value' })
      expect(fsOps.writeFile).toHaveBeenCalled()
    })
  })

  describe('backupJsonConfig', () => {
    it('should backup file with timestamp', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)

      const result = backupJsonConfig('/test/config.json')

      expect(result).toContain('backup_2024-01-01_12-00-00')
      expect(fsOps.ensureDir).toHaveBeenCalled()
      expect(fsOps.copyFile).toHaveBeenCalledWith(
        '/test/config.json',
        expect.stringContaining('backup_2024-01-01_12-00-00'),
      )
    })

    it('should use custom backup directory', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)

      backupJsonConfig('/test/config.json', '/custom/backup')

      expect(fsOps.ensureDir).toHaveBeenCalledWith('/custom/backup')
    })

    it('should return null when file does not exist', () => {
      vi.mocked(fsOps.exists).mockReturnValue(false)

      const result = backupJsonConfig('/test/config.json')

      expect(result).toBeNull()
      expect(fsOps.copyFile).not.toHaveBeenCalled()
    })
  })

  describe('isValidJsonFile', () => {
    it('should return true for valid JSON file', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.readFile).mockReturnValue('{"valid": "json"}')

      const result = isValidJsonFile('/test/valid.json')

      expect(result).toBe(true)
    })

    it('should return false for invalid JSON file', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.readFile).mockReturnValue('invalid json')

      const result = isValidJsonFile('/test/invalid.json')

      expect(result).toBe(false)
    })

    it('should return false for non-existent file', () => {
      vi.mocked(fsOps.exists).mockReturnValue(false)

      const result = isValidJsonFile('/test/missing.json')

      expect(result).toBe(false)
      expect(fsOps.readFile).not.toHaveBeenCalled()
    })

    it('should handle read errors gracefully', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.readFile).mockImplementation(() => {
        throw new Error('Read error')
      })

      const result = isValidJsonFile('/test/error.json')

      expect(result).toBe(false)
    })
  })

  describe('mergeJsonConfigs', () => {
    it('should merge multiple configs from files', () => {
      vi.mocked(fsOps.exists)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
      vi.mocked(fsOps.readFile)
        .mockReturnValueOnce('{"a": 1, "b": 2}')
        .mockReturnValueOnce('{"b": 3, "c": 4}')
        .mockReturnValueOnce('{"d": 5}')

      const result = mergeJsonConfigs(['/file1.json', '/file2.json', '/file3.json'])

      expect(result).toEqual({ a: 1, b: 3, c: 4, d: 5 })
    })

    it('should handle non-existent files', () => {
      vi.mocked(fsOps.exists)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)
      vi.mocked(fsOps.readFile)
        .mockReturnValueOnce('{"a": 1}')
        .mockReturnValueOnce('{"b": 2}')

      const result = mergeJsonConfigs(['/file1.json', '/missing.json', '/file3.json'])

      expect(result).toEqual({ a: 1, b: 2 })
    })
  })

  describe('edge Cases and Error Handling', () => {
    describe('backupJsonConfig error handling', () => {
      it('should handle backup error and return null', () => {
        vi.mocked(fsOps.exists).mockReturnValue(true)
        vi.mocked(fsOps.readFile).mockReturnValue('{"test": true}')
        vi.mocked(fsOps.ensureDir).mockImplementation(() => {})
        vi.mocked(fsOps.copyFile).mockImplementation(() => {
          throw new Error('Write error')
        })
        vi.mocked(zcfConfig.readZcfConfig).mockReturnValue({ preferredLang: 'zh-CN' } as any)

        const result = backupJsonConfig('/test/config.json')

        expect(result).toBe(null)
        expect(console.error).toHaveBeenCalledWith(expect.any(String), expect.any(Error))
      })

      it('should use default language when ZCF config is null', () => {
        vi.mocked(fsOps.exists).mockReturnValue(true)
        vi.mocked(fsOps.readFile).mockReturnValue('{"test": true}')
        vi.mocked(fsOps.ensureDir).mockImplementation(() => {})
        vi.mocked(fsOps.copyFile).mockImplementation(() => {
          throw new Error('Write error')
        })
        vi.mocked(zcfConfig.readZcfConfig).mockReturnValue(null)

        const result = backupJsonConfig('/test/config.json')

        expect(result).toBe(null)
        expect(console.error).toHaveBeenCalledWith(expect.any(String), expect.any(Error))
      })

      it('should handle createDirectory error', () => {
        vi.mocked(fsOps.exists).mockReturnValue(true)
        vi.mocked(fsOps.readFile).mockReturnValue('{"test": true}')
        vi.mocked(fsOps.ensureDir).mockImplementation(() => {
          throw new Error('Create directory error')
        })
        vi.mocked(zcfConfig.readZcfConfig).mockReturnValue({ preferredLang: 'en' } as any)

        const result = backupJsonConfig('/test/config.json')

        expect(result).toBe(null)
        expect(console.error).toHaveBeenCalledWith(expect.any(String), expect.any(Error))
      })

      it('should handle path without filename', () => {
        vi.mocked(fsOps.exists).mockReturnValue(true)
        vi.mocked(fsOps.readFile).mockReturnValue('{"test": true}')
        vi.mocked(fsOps.ensureDir).mockImplementation(() => {})
        vi.mocked(fsOps.copyFile).mockImplementation(() => {})

        const result = backupJsonConfig('/')

        expect(result).not.toBe(null)
        if (result) {
          expect(result).toContain('config.json.backup_')
        }
      })
    })

    describe('readJsonConfig edge cases', () => {
      it('should handle validation failure with ZCF config', () => {
        vi.mocked(fsOps.exists).mockReturnValue(true)
        vi.mocked(fsOps.readFile).mockReturnValue('{"valid": "json"}')
        vi.mocked(zcfConfig.readZcfConfig).mockReturnValue({ preferredLang: 'zh-CN' } as any)

        const validator = vi.fn().mockReturnValue(false) as any
        const result = readJsonConfig('/test.json', {
          validate: validator,
          defaultValue: { default: true },
        })

        expect(result).toEqual({ default: true })
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Invalid configuration'))
      })

      it('should handle validation failure without ZCF config', () => {
        vi.mocked(fsOps.exists).mockReturnValue(true)
        vi.mocked(fsOps.readFile).mockReturnValue('{"valid": "json"}')
        vi.mocked(zcfConfig.readZcfConfig).mockReturnValue(null)

        const validator = vi.fn().mockReturnValue(false) as any
        const result = readJsonConfig('/test.json', {
          validate: validator,
          defaultValue: { default: true },
        })

        expect(result).toEqual({ default: true })
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Invalid configuration'))
      })

      it('should handle JSON parse error without ZCF config', () => {
        vi.mocked(fsOps.exists).mockReturnValue(true)
        vi.mocked(fsOps.readFile).mockReturnValue('invalid json')
        vi.mocked(zcfConfig.readZcfConfig).mockReturnValue(null)

        const result = readJsonConfig('/test.json')

        expect(result).toBe(null)
        expect(console.error).toHaveBeenCalledWith('Failed to parse JSON: /test.json', expect.any(Error))
      })
    })

    describe('mergeJsonConfigs edge cases', () => {
      it('should return default value when no configs are valid', () => {
        vi.mocked(fsOps.exists).mockReturnValue(false)

        const result = mergeJsonConfigs(['/test1.json', '/test2.json'], {
          defaultValue: { default: true },
        })

        expect(result).toEqual({ default: true })
      })

      it('should return null when no configs are valid and no default value', () => {
        vi.mocked(fsOps.exists).mockReturnValue(false)

        const result = mergeJsonConfigs(['/test1.json', '/test2.json'])

        expect(result).toBe(null)
      })

      it('should merge multiple configs with later overriding earlier', () => {
        vi.mocked(fsOps.exists).mockReturnValue(true)
        vi.mocked(fsOps.readFile)
          .mockReturnValueOnce('{"a": 1, "b": 2}')
          .mockReturnValueOnce('{"b": 3, "c": 4}')
          .mockReturnValueOnce('{"c": 5, "d": 6}')

        const result = mergeJsonConfigs(['/test1.json', '/test2.json', '/test3.json'])

        expect(result).toEqual({
          a: 1,
          b: 3,
          c: 5,
          d: 6,
        })
      })

      it('should skip invalid JSON files during merge', () => {
        vi.mocked(fsOps.exists).mockReturnValue(true)
        vi.mocked(fsOps.readFile)
          .mockReturnValueOnce('{"a": 1}')
          .mockReturnValueOnce('invalid json')
          .mockReturnValueOnce('{"b": 2}')

        const result = mergeJsonConfigs(['/test1.json', '/test2.json', '/test3.json'])

        expect(result).toEqual({
          a: 1,
          b: 2,
        })
      })

      it('should handle empty array input', () => {
        const result = mergeJsonConfigs([])

        expect(result).toBe(null)
      })

      it('should handle all non-existent files with default value', () => {
        vi.mocked(fsOps.exists).mockReturnValue(false)

        const defaultConfig = { foo: 'bar', baz: 42 }
        const result = mergeJsonConfigs(
          ['/nonexistent1.json', '/nonexistent2.json'],
          { defaultValue: defaultConfig },
        )

        expect(result).toEqual(defaultConfig)
      })
    })
  })
})
