import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sanitizeClaudeSettings, validateClaudeSettings } from '../../../src/utils/config-validator'

vi.mock('../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn().mockReturnValue({ preferredLang: 'en' }),
}))

// Mock i18n system
vi.mock('../../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  i18n: {
    t: vi.fn((key: string, params?: any) => {
      // Mock translation function to return expected error messages
      switch (key) {
        case 'errors:invalidModel':
          return `Invalid model: ${params?.model}. Expected 'opus' or 'sonnet'`
        case 'errors:invalidEnvConfig':
          return 'Invalid env configuration: expected object'
        case 'errors:invalidBaseUrl':
          return 'Invalid ANTHROPIC_BASE_URL: expected string'
        case 'errors:invalidApiKeyConfig':
          return 'Invalid ANTHROPIC_API_KEY: expected string'
        case 'errors:invalidAuthTokenConfig':
          return 'Invalid ANTHROPIC_AUTH_TOKEN: expected string'
        case 'errors:invalidPermissionsConfig':
          return 'Invalid permissions configuration: expected object'
        case 'errors:invalidPermissionsAllow':
          return 'Invalid permissions.allow: expected array'
        default:
          return key
      }
    }),
  },
}))

describe('config-validator utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  describe('validateClaudeSettings', () => {
    it('should return false for null or undefined', () => {
      expect(validateClaudeSettings(null)).toBe(false)
      expect(validateClaudeSettings(undefined)).toBe(false)
    })

    it('should return false for non-object types', () => {
      expect(validateClaudeSettings('string')).toBe(false)
      expect(validateClaudeSettings(123)).toBe(false)
      expect(validateClaudeSettings(true)).toBe(false)
    })

    it('should validate valid empty object', () => {
      expect(validateClaudeSettings({})).toBe(true)
    })

    it('should validate valid model values', () => {
      expect(validateClaudeSettings({ model: 'opus' })).toBe(true)
      expect(validateClaudeSettings({ model: 'sonnet' })).toBe(true)
    })

    it('should reject invalid model values', () => {
      const consoleSpy = vi.spyOn(console, 'log')
      expect(validateClaudeSettings({ model: 'invalid' })).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Invalid model: invalid. Expected \'opus\' or \'sonnet\'')
    })

    it('should validate env object', () => {
      const settings = {
        env: {
          ANTHROPIC_API_KEY: 'test-key',
          ANTHROPIC_AUTH_TOKEN: 'test-token',
          ANTHROPIC_BASE_URL: 'https://api.example.com',
        },
      }
      expect(validateClaudeSettings(settings)).toBe(true)
    })

    it('should reject non-object env', () => {
      const consoleSpy = vi.spyOn(console, 'log')
      expect(validateClaudeSettings({ env: 'string' })).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Invalid env configuration: expected object')
    })

    it('should reject non-string ANTHROPIC_BASE_URL', () => {
      const consoleSpy = vi.spyOn(console, 'log')
      const settings = {
        env: {
          ANTHROPIC_BASE_URL: 123,
        },
      }
      expect(validateClaudeSettings(settings)).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Invalid ANTHROPIC_BASE_URL: expected string')
    })

    it('should reject non-string ANTHROPIC_API_KEY', () => {
      const consoleSpy = vi.spyOn(console, 'log')
      const settings = {
        env: {
          ANTHROPIC_API_KEY: true,
        },
      }
      expect(validateClaudeSettings(settings)).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Invalid ANTHROPIC_API_KEY: expected string')
    })

    it('should reject non-string ANTHROPIC_AUTH_TOKEN', () => {
      const consoleSpy = vi.spyOn(console, 'log')
      const settings = {
        env: {
          ANTHROPIC_AUTH_TOKEN: [],
        },
      }
      expect(validateClaudeSettings(settings)).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Invalid ANTHROPIC_AUTH_TOKEN: expected string')
    })

    it('should validate permissions with allow array', () => {
      const settings = {
        permissions: {
          allow: ['Read', 'Write', 'Execute'],
        },
      }
      expect(validateClaudeSettings(settings)).toBe(true)
    })

    it('should reject non-object permissions', () => {
      const consoleSpy = vi.spyOn(console, 'log')
      expect(validateClaudeSettings({ permissions: 'string' })).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Invalid permissions configuration: expected object')
    })

    it('should reject non-array permissions.allow', () => {
      const consoleSpy = vi.spyOn(console, 'log')
      const settings = {
        permissions: {
          allow: 'not-an-array',
        },
      }
      expect(validateClaudeSettings(settings)).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Invalid permissions.allow: expected array')
    })

    it('should validate complex valid settings', () => {
      const settings = {
        model: 'opus',
        env: {
          ANTHROPIC_API_KEY: 'key',
          CUSTOM_VAR: 'value',
        },
        permissions: {
          allow: ['Read', 'Write'],
        },
        customField: 'allowed',
      }
      expect(validateClaudeSettings(settings)).toBe(true)
    })
  })

  describe('sanitizeClaudeSettings', () => {
    it('should return empty object for null input', () => {
      expect(sanitizeClaudeSettings(null)).toEqual({})
    })

    it('should return empty object for undefined input', () => {
      expect(sanitizeClaudeSettings(undefined)).toEqual({})
    })

    it('should return empty object for string input', () => {
      expect(sanitizeClaudeSettings('string')).toEqual({})
    })

    it('should copy valid model', () => {
      expect(sanitizeClaudeSettings({ model: 'opus' })).toEqual({ model: 'opus' })
      expect(sanitizeClaudeSettings({ model: 'sonnet' })).toEqual({ model: 'sonnet' })
    })

    it('should filter out invalid model', () => {
      expect(sanitizeClaudeSettings({ model: 'invalid' })).toEqual({})
    })

    it('should sanitize env object', () => {
      const settings = {
        env: {
          STRING_VAR: 'value',
          NUMBER_VAR: 123,
          UNDEFINED_VAR: undefined,
          OBJECT_VAR: { nested: 'object' },
        },
      }
      const sanitized = sanitizeClaudeSettings(settings)
      expect(sanitized.env).toEqual({
        STRING_VAR: 'value',
        UNDEFINED_VAR: undefined,
      })
    })

    it('should handle invalid env type', () => {
      expect(sanitizeClaudeSettings({ env: 'not-object' })).toEqual({})
      expect(sanitizeClaudeSettings({ env: 123 })).toEqual({})
    })

    it('should sanitize permissions array', () => {
      const settings = {
        permissions: {
          allow: ['Read', 123, 'Write', null, 'Execute', { obj: 'val' }],
        },
      }
      const sanitized = sanitizeClaudeSettings(settings)
      expect(sanitized.permissions?.allow).toEqual(['Read', 'Write', 'Execute'])
    })

    it('should handle invalid permissions type', () => {
      expect(sanitizeClaudeSettings({ permissions: 'not-object' })).toEqual({})
    })

    it('should handle permissions without allow', () => {
      const settings = {
        permissions: {
          deny: ['DangerousOp'],
        },
      }
      const sanitized = sanitizeClaudeSettings(settings)
      expect(sanitized.permissions).toEqual({})
    })

    it('should preserve other properties', () => {
      const settings = {
        customField1: 'value1',
        customField2: { nested: 'object' },
        customField3: [1, 2, 3],
      }
      const sanitized = sanitizeClaudeSettings(settings)
      expect(sanitized).toEqual(settings)
    })

    it('should handle complex settings', () => {
      const settings = {
        model: 'opus',
        env: {
          VALID_STRING: 'string',
          INVALID_NUMBER: 42,
        },
        permissions: {
          allow: ['Read', false, 'Write'],
        },
        customField: 'preserved',
        anotherField: { complex: 'object' },
      }
      const sanitized = sanitizeClaudeSettings(settings)
      expect(sanitized).toEqual({
        model: 'opus',
        env: {
          VALID_STRING: 'string',
        },
        permissions: {
          allow: ['Read', 'Write'],
        },
        customField: 'preserved',
        anotherField: { complex: 'object' },
      })
    })

    it('should handle empty env and permissions', () => {
      const settings = {
        env: {},
        permissions: {},
      }
      const sanitized = sanitizeClaudeSettings(settings)
      expect(sanitized).toEqual({
        env: {},
        permissions: {},
      })
    })
  })
})
