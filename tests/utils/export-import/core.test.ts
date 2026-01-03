/**
 * Test suite for core utilities
 */

import { Buffer } from 'node:buffer'
import { describe, expect, it } from 'vitest'
import {
  adaptPlatformPaths,
  calculateChecksumFromContent,
  getCurrentPlatform,
  hasSensitiveData,
  sanitizeConfig,
  unixToWindowsPath,
  windowsToUnixPath,
} from '../../../src/utils/export-import/core'

describe('core utilities', () => {
  describe('calculateChecksumFromContent', () => {
    it('should calculate checksum from string content', () => {
      const content = 'test content'
      const checksum = calculateChecksumFromContent(content)

      expect(checksum).toBeTruthy()
      expect(typeof checksum).toBe('string')
      expect(checksum.length).toBe(64) // SHA-256 produces 64 hex characters
    })

    it('should produce same checksum for same content', () => {
      const content = 'test content'
      const checksum1 = calculateChecksumFromContent(content)
      const checksum2 = calculateChecksumFromContent(content)

      expect(checksum1).toBe(checksum2)
    })

    it('should produce different checksum for different content', () => {
      const content1 = 'test content 1'
      const content2 = 'test content 2'
      const checksum1 = calculateChecksumFromContent(content1)
      const checksum2 = calculateChecksumFromContent(content2)

      expect(checksum1).not.toBe(checksum2)
    })

    it('should calculate checksum from buffer', () => {
      const buffer = Buffer.from('test content', 'utf-8')
      const checksum = calculateChecksumFromContent(buffer)

      expect(checksum).toBeTruthy()
      expect(typeof checksum).toBe('string')
    })
  })

  describe('getCurrentPlatform', () => {
    it('should return valid platform type', () => {
      const platform = getCurrentPlatform()

      expect(['win32', 'darwin', 'linux', 'termux']).toContain(platform)
    })
  })

  describe('hasSensitiveData', () => {
    it('should detect API key in config', () => {
      const config = {
        apiKey: 'sk-1234567890abcdef',
      }

      expect(hasSensitiveData(config)).toBe(true)
    })

    it('should detect API key in nested config', () => {
      const config = {
        env: {
          ANTHROPIC_API_KEY: 'sk-1234567890abcdef',
        },
      }

      expect(hasSensitiveData(config)).toBe(true)
    })

    it('should detect API key in profiles', () => {
      const config = {
        profiles: {
          default: {
            apiKey: 'sk-1234567890abcdef',
          },
        },
      }

      expect(hasSensitiveData(config)).toBe(true)
    })

    it('should not detect sanitized placeholders as sensitive', () => {
      const config = {
        apiKey: '***REDACTED_API_KEY***',
      }

      expect(hasSensitiveData(config)).toBe(false)
    })

    it('should return false for config without sensitive data', () => {
      const config = {
        setting1: 'value1',
        setting2: 'value2',
      }

      expect(hasSensitiveData(config)).toBe(false)
    })
  })

  describe('sanitizeConfig', () => {
    it('should sanitize API key', () => {
      const config = {
        apiKey: 'sk-1234567890abcdef',
        otherSetting: 'value',
      }

      const sanitized = sanitizeConfig(config)

      expect(sanitized.apiKey).toBe('***REDACTED_API_KEY***')
      expect(sanitized.otherSetting).toBe('value')
    })

    it('should sanitize nested API key', () => {
      const config = {
        env: {
          ANTHROPIC_API_KEY: 'sk-1234567890abcdef',
          OTHER_VAR: 'value',
        },
      }

      const sanitized = sanitizeConfig(config)

      expect(sanitized.env.ANTHROPIC_API_KEY).toBe('***REDACTED_API_KEY***')
      expect(sanitized.env.OTHER_VAR).toBe('value')
    })

    it('should sanitize API keys in profiles', () => {
      const config = {
        profiles: {
          profile1: {
            apiKey: 'sk-profile1-key',
          },
          profile2: {
            apiKey: 'sk-profile2-key',
          },
        },
      }

      const sanitized = sanitizeConfig(config)

      expect(sanitized.profiles.profile1.apiKey).toBe('***REDACTED_API_KEY***')
      expect(sanitized.profiles.profile2.apiKey).toBe('***REDACTED_API_KEY***')
    })

    it('should not modify original config', () => {
      const config = {
        apiKey: 'sk-1234567890abcdef',
      }

      const originalApiKey = config.apiKey
      sanitizeConfig(config)

      expect(config.apiKey).toBe(originalApiKey)
    })
  })

  describe('windowsToUnixPath', () => {
    it('should convert Windows path to Unix path', () => {
      const windowsPath = 'C:\\Users\\Test\\file.txt'
      const unixPath = windowsToUnixPath(windowsPath)

      expect(unixPath).toBe('/c/Users/Test/file.txt')
    })

    it('should convert USERPROFILE to HOME', () => {
      const windowsPath = '%USERPROFILE%\\config.json'
      const unixPath = windowsToUnixPath(windowsPath)

      expect(unixPath).toBe('$HOME/config.json')
    })

    it('should handle already Unix-style paths', () => {
      const unixPath = '/home/user/file.txt'
      const result = windowsToUnixPath(unixPath)

      expect(result).toBe(unixPath)
    })
  })

  describe('unixToWindowsPath', () => {
    it('should convert Unix path to Windows path', () => {
      const unixPath = '/c/Users/Test/file.txt'
      const windowsPath = unixToWindowsPath(unixPath)

      expect(windowsPath).toBe('C:\\Users\\Test\\file.txt')
    })

    it('should convert HOME to USERPROFILE', () => {
      const unixPath = '$HOME/config.json'
      const windowsPath = unixToWindowsPath(unixPath)

      expect(windowsPath).toBe('%USERPROFILE%\\config.json')
    })

    it('should handle already Windows-style paths', () => {
      const windowsPath = 'C:\\Users\\Test\\file.txt'
      const result = unixToWindowsPath(windowsPath)

      expect(result).toBe(windowsPath)
    })
  })

  describe('adaptPlatformPaths', () => {
    it('should adapt paths from Windows to Unix', () => {
      const config = {
        path1: 'C:\\Users\\Test\\file.txt',
        path2: '%USERPROFILE%\\config.json',
      }

      const { config: adapted, mappings } = adaptPlatformPaths(config, 'win32', 'linux')

      expect(adapted.path1).toBe('/c/Users/Test/file.txt')
      expect(adapted.path2).toBe('$HOME/config.json')
      expect(mappings.length).toBeGreaterThan(0)
    })

    it('should adapt paths from Unix to Windows', () => {
      const config = {
        path1: '/home/user/file.txt',
        path2: '$HOME/config.json',
      }

      const { config: adapted, mappings } = adaptPlatformPaths(config, 'linux', 'win32')

      expect(adapted.path2).toBe('%USERPROFILE%\\config.json')
      expect(mappings.length).toBeGreaterThan(0)
    })

    it('should not modify config when platforms are same', () => {
      const config = {
        path: '/home/user/file.txt',
      }

      const { config: adapted, mappings } = adaptPlatformPaths(config, 'linux', 'linux')

      expect(adapted.path).toBe(config.path)
      expect(mappings).toHaveLength(0)
    })

    it('should handle nested paths', () => {
      const config = {
        settings: {
          configPath: 'C:\\Users\\Test\\config.json',
        },
      }

      const { config: adapted } = adaptPlatformPaths(config, 'win32', 'linux')

      expect(adapted.settings.configPath).toBe('/c/Users/Test/config.json')
    })
  })
})
