import type { StatusLineConfig } from '../../../src/types/config'
import { describe, expect, it, vi } from 'vitest'
import { isWindows } from '../../../src/utils/platform'
import { getPlatformStatusLineConfig, sanitizeStatusLineConfig, validateStatusLineConfig } from '../../../src/utils/statusline-validator'

// Mock platform utility
vi.mock('../../../src/utils/platform', () => ({
  isWindows: vi.fn(),
}))

const mockIsWindows = vi.mocked(isWindows)

describe('statusLine Validator', () => {
  describe('validateStatusLineConfig', () => {
    it('should validate correct StatusLine configuration', () => {
      const validConfig: StatusLineConfig = {
        type: 'command',
        command: '~/.claude/ccline/ccline',
        padding: 0,
      }

      expect(validateStatusLineConfig(validConfig)).toBe(true)
    })

    it('should validate StatusLine configuration without padding', () => {
      const validConfig: StatusLineConfig = {
        type: 'command',
        command: '~/.claude/ccline/ccline',
      }

      expect(validateStatusLineConfig(validConfig)).toBe(true)
    })

    it('should reject configuration with wrong type', () => {
      const invalidConfig = {
        type: 'invalid',
        command: '~/.claude/ccline/ccline',
      }

      expect(validateStatusLineConfig(invalidConfig)).toBe(false)
    })

    it('should reject configuration with empty command', () => {
      const invalidConfig = {
        type: 'command',
        command: '',
      }

      expect(validateStatusLineConfig(invalidConfig)).toBe(false)
    })

    it('should reject configuration with negative padding', () => {
      const invalidConfig = {
        type: 'command',
        command: '~/.claude/ccline/ccline',
        padding: -1,
      }

      expect(validateStatusLineConfig(invalidConfig)).toBe(false)
    })

    it('should reject null or undefined', () => {
      expect(validateStatusLineConfig(null)).toBe(false)
      expect(validateStatusLineConfig(undefined)).toBe(false)
    })
  })

  describe('sanitizeStatusLineConfig', () => {
    it('should sanitize and return valid configuration', () => {
      const inputConfig = {
        type: 'command',
        command: '  ~/.claude/ccline/ccline  ',
        padding: 2,
        extraField: 'should be removed',
      }

      const result = sanitizeStatusLineConfig(inputConfig)

      expect(result).toEqual({
        type: 'command',
        command: '~/.claude/ccline/ccline',
        padding: 2,
      })
    })

    it('should return null for invalid configuration', () => {
      const invalidConfig = {
        type: 'invalid',
        command: '',
      }

      expect(sanitizeStatusLineConfig(invalidConfig)).toBeNull()
    })

    it('should handle configuration without padding', () => {
      const inputConfig = {
        type: 'command',
        command: '~/.claude/ccline/ccline',
      }

      const result = sanitizeStatusLineConfig(inputConfig)

      expect(result).toEqual({
        type: 'command',
        command: '~/.claude/ccline/ccline',
      })
    })
  })

  describe('getPlatformStatusLineConfig', () => {
    it('should return Windows configuration on Windows platform', () => {
      // Mock Windows platform
      mockIsWindows.mockReturnValue(true)

      const result = getPlatformStatusLineConfig()

      expect(result).toEqual({
        type: 'command',
        command: '%USERPROFILE%\\.claude\\ccline\\ccline.exe',
        padding: 0,
      })
    })

    it('should return Unix configuration on non-Windows platforms', () => {
      // Mock Unix platform
      mockIsWindows.mockReturnValue(false)

      const result = getPlatformStatusLineConfig()

      expect(result).toEqual({
        type: 'command',
        command: '~/.claude/ccline/ccline',
        padding: 0,
      })
    })
  })
})
