import { beforeEach, describe, expect, it, vi } from 'vitest'
import { detectAuthType, formatApiKeyDisplay, showApiKeyError, validateApiKey } from '../../../src/utils/validator'

vi.mock('ansis', () => ({
  default: {
    red: (text: string) => text,
    gray: (text: string) => text,
  },
}))

describe('validator utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  describe('validateApiKey', () => {
    it('should return invalid for empty string', () => {
      const result = validateApiKey('')
      expect(result.isValid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should return invalid for whitespace only', () => {
      const result = validateApiKey('   ')
      expect(result.isValid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should return valid for non-empty API key', () => {
      const result = validateApiKey('sk-ant-api-key-123456')
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should return valid for any non-empty string', () => {
      const result = validateApiKey('any-api-key')
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should use zh-CN as default language', () => {
      const result = validateApiKey('')
      expect(result.isValid).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('formatApiKeyDisplay', () => {
    it('should hide middle part of long API key', () => {
      const apiKey = 'sk-ant-api-key-123456789012345'
      const formatted = formatApiKeyDisplay(apiKey)
      expect(formatted).toBe('sk-ant-a...2345')
    })

    it('should return original key if less than 12 characters', () => {
      const apiKey = 'short-key'
      const formatted = formatApiKeyDisplay(apiKey)
      expect(formatted).toBe('short-key')
    })

    it('should handle empty string', () => {
      const formatted = formatApiKeyDisplay('')
      expect(formatted).toBe('')
    })

    it('should handle null/undefined by returning the input', () => {
      const formatted = formatApiKeyDisplay(null as any)
      expect(formatted).toBe(null)
    })

    it('should format exactly 12 character key', () => {
      const apiKey = '123456789012'
      const formatted = formatApiKeyDisplay(apiKey)
      expect(formatted).toBe('12345678...9012')
    })

    it('should format very long API keys correctly', () => {
      const apiKey = `sk-ant-api03-${'a'.repeat(50)}-1234`
      const formatted = formatApiKeyDisplay(apiKey)
      expect(formatted).toBe('sk-ant-a...1234')
    })
  })

  describe('showApiKeyError', () => {
    it('should log error message in red', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      await showApiKeyError('Invalid API key')

      expect(consoleSpy).toHaveBeenCalledWith('✗ Invalid API key')
      expect(consoleSpy).toHaveBeenCalledTimes(2)
    })

    it('should log example format in gray', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      await showApiKeyError('Error message')

      expect(consoleSpy).toHaveBeenCalledTimes(2)
      // Second call should be the example
      expect(consoleSpy.mock.calls[1][0]).toBeDefined()
    })

    it('should use zh-CN as default language', () => {
      const consoleSpy = vi.spyOn(console, 'log')
      showApiKeyError('Error')

      expect(consoleSpy).toHaveBeenCalledWith('✗ Error')
      expect(consoleSpy).toHaveBeenCalledTimes(2)
    })
  })

  describe('detectAuthType', () => {
    it('should detect auth_token for keys starting with sk-ant-', () => {
      const authType = detectAuthType('sk-ant-api03-123456')
      expect(authType).toBe('auth_token')
    })

    it('should return api_key for keys not starting with sk-ant-', () => {
      const authType = detectAuthType('api-key-123456')
      expect(authType).toBe('api_key')
    })

    it('should return api_key for empty string', () => {
      const authType = detectAuthType('')
      expect(authType).toBe('api_key')
    })

    it('should handle case sensitivity correctly', () => {
      const authType1 = detectAuthType('SK-ANT-123456')
      expect(authType1).toBe('api_key') // Case sensitive, so not auth_token

      const authType2 = detectAuthType('sk-ant-123456')
      expect(authType2).toBe('auth_token')
    })

    it('should detect api_key for partial match', () => {
      const authType = detectAuthType('xsk-ant-123456')
      expect(authType).toBe('api_key')
    })
  })
})
