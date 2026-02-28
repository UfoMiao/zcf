import type { ExportMetadata } from '../../../src/types/export-import'
import { Buffer } from 'node:buffer'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import AdmZip from 'adm-zip'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  adaptPlatformPaths,
  calculateChecksum,
  calculateChecksumFromContent,
  createZipPackage,
  expandHomePath,
  extractZipPackage,
  getCurrentPlatform,
  getFileInfo,
  getZipEntries,
  hasSensitiveData,
  normalizePath,
  sanitizeConfig,
  unixToWindowsPath,
  validateZipFormat,
  windowsToUnixPath,
} from '../../../src/utils/export-import/core'
import * as fsOperations from '../../../src/utils/fs-operations'
import * as platform from '../../../src/utils/platform'

// Helper function to create valid test metadata
function createTestMetadata(): ExportMetadata {
  return {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    platform: 'linux' as const,
    codeType: 'claude-code' as const,
    scope: ['settings', 'workflows'],
    hasSensitiveData: false,
    files: [],
  }
}

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

    it('should handle non-path values', () => {
      const config = {
        name: 'test-config',
        version: '1.0.0',
        enabled: true,
      }

      const { config: adapted, mappings } = adaptPlatformPaths(config, 'win32', 'linux')

      expect(adapted).toEqual(config)
      expect(mappings).toHaveLength(0)
    })

    it('should handle null and undefined values', () => {
      const config = {
        path1: null,
        path2: undefined,
        path3: '/home/user/file.txt',
      }

      const { config: adapted } = adaptPlatformPaths(config, 'linux', 'win32')

      expect(adapted.path1).toBeNull()
      expect(adapted.path2).toBeUndefined()
    })

    it('should handle mixed path types', () => {
      const config = {
        mixedPath: 'C:relative/path',
      }

      const { config: adapted } = adaptPlatformPaths(config, 'win32', 'linux')

      expect(adapted.mixedPath).toBeTruthy()
    })

    it('should handle darwin to darwin platform (no conversion)', () => {
      const config = {
        path: '/Users/test/file.txt',
      }

      const { config: adapted, mappings } = adaptPlatformPaths(config, 'darwin', 'darwin')

      expect(adapted).toEqual(config)
      expect(mappings).toHaveLength(0)
    })

    it('should handle termux platform paths', () => {
      const config = {
        path: '/data/data/com.termux/files/home/config.json',
      }

      const { config: adapted, mappings } = adaptPlatformPaths(config, 'termux', 'linux')

      expect(adapted.path).toBeTruthy()
      expect(mappings).toHaveLength(0)
    })
  })

  describe('calculateChecksum', () => {
    let testDir: string
    let testFile: string

    beforeEach(() => {
      testDir = mkdtempSync(join(tmpdir(), 'zcf-test-'))
      testFile = join(testDir, 'test.txt')
      writeFileSync(testFile, 'test content', 'utf-8')
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should calculate checksum from file', () => {
      const checksum = calculateChecksum(testFile)

      expect(checksum).toBeTruthy()
      expect(typeof checksum).toBe('string')
      expect(checksum.length).toBe(64)
    })

    it('should produce same checksum for same file content', () => {
      const checksum1 = calculateChecksum(testFile)
      const checksum2 = calculateChecksum(testFile)

      expect(checksum1).toBe(checksum2)
    })
  })

  describe('getFileInfo', () => {
    let testDir: string
    let testFile: string

    beforeEach(() => {
      testDir = mkdtempSync(join(tmpdir(), 'zcf-test-'))
      testFile = join(testDir, 'test.txt')
      writeFileSync(testFile, 'test content', 'utf-8')
    })

    it('should get file info with metadata', () => {
      const fileInfo = getFileInfo(testFile, 'configs/test.txt', 'settings')

      expect(fileInfo).toHaveProperty('path', 'configs/test.txt')
      expect(fileInfo).toHaveProperty('type', 'settings')
      expect(fileInfo).toHaveProperty('size')
      expect(fileInfo).toHaveProperty('checksum')
      expect(fileInfo).toHaveProperty('originalPath', testFile)
      expect(fileInfo.size).toBeGreaterThan(0)
      expect(fileInfo.checksum.length).toBe(64)
    })
  })

  describe('createZipPackage', () => {
    let testDir: string
    let testFile: string
    let outputPath: string

    beforeEach(() => {
      testDir = mkdtempSync(join(tmpdir(), 'zcf-test-'))
      testFile = join(testDir, 'test.txt')
      outputPath = join(testDir, 'package.zip')
      writeFileSync(testFile, 'test content', 'utf-8')
    })

    it('should create zip package with files', () => {
      const metadata = createTestMetadata()

      const files = [
        { source: testFile, destination: 'configs/test.txt' },
      ]

      const result = createZipPackage(files, metadata, outputPath)

      expect(result).toBe(outputPath)
      expect(fsOperations.exists(outputPath)).toBe(true)
    })

    it('should include manifest.json in package', () => {
      const metadata = createTestMetadata()

      createZipPackage([], metadata, outputPath)

      const entries = getZipEntries(outputPath)
      expect(entries).toContain('manifest.json')
    })

    it('should skip non-existent files', () => {
      const metadata = createTestMetadata()

      const files = [
        { source: join(testDir, 'non-existent.txt'), destination: 'configs/test.txt' },
      ]

      expect(() => createZipPackage(files, metadata, outputPath)).not.toThrow()
    })

    it('should handle directory sources', () => {
      const subDir = join(testDir, 'subdir')
      mkdirSync(subDir)
      writeFileSync(join(subDir, 'file.txt'), 'content', 'utf-8')

      const metadata = createTestMetadata()

      const files = [
        { source: subDir, destination: 'configs' },
      ]

      const result = createZipPackage(files, metadata, outputPath)
      expect(result).toBe(outputPath)
    })
  })

  describe('extractZipPackage', () => {
    let testDir: string
    let packagePath: string
    let extractDir: string

    beforeEach(() => {
      testDir = mkdtempSync(join(tmpdir(), 'zcf-test-'))
      packagePath = join(testDir, 'package.zip')
      extractDir = join(testDir, 'extracted')

      const metadata = createTestMetadata()

      const testFile = join(testDir, 'test.txt')
      writeFileSync(testFile, 'test content', 'utf-8')

      const files = [
        { source: testFile, destination: 'configs/test.txt' },
      ]

      createZipPackage(files, metadata, packagePath)
    })

    it('should extract zip package', () => {
      const metadata = extractZipPackage(packagePath, extractDir)

      expect(metadata).toHaveProperty('version')
      expect(metadata).toHaveProperty('platform')
      expect(fsOperations.exists(join(extractDir, 'manifest.json'))).toBe(true)
    })

    it('should throw error if package does not exist', () => {
      expect(() => extractZipPackage('/non/existent/package.zip', extractDir))
        .toThrow('Package file does not exist')
    })

    it('should throw error if manifest is missing', () => {
      const invalidPackagePath = join(testDir, 'invalid.zip')
      const zip = new AdmZip()
      zip.addFile('some-file.txt', Buffer.from('content'))
      zip.writeZip(invalidPackagePath)

      expect(() => extractZipPackage(invalidPackagePath, extractDir))
        .toThrow('Invalid package: manifest.json not found')
    })
  })

  describe('validateZipFormat', () => {
    let testDir: string
    let validPackagePath: string
    let invalidPackagePath: string

    beforeEach(() => {
      testDir = mkdtempSync(join(tmpdir(), 'zcf-test-'))
      validPackagePath = join(testDir, 'valid.zip')
      invalidPackagePath = join(testDir, 'invalid.zip')

      const metadata = createTestMetadata()

      createZipPackage([], metadata, validPackagePath)
      writeFileSync(invalidPackagePath, 'not a zip file', 'utf-8')
    })

    it('should return true for valid zip file', () => {
      expect(validateZipFormat(validPackagePath)).toBe(true)
    })

    it('should return false for invalid zip file', () => {
      expect(validateZipFormat(invalidPackagePath)).toBe(false)
    })

    it('should return false for non-existent file', () => {
      expect(validateZipFormat('/non/existent/file.zip')).toBe(false)
    })
  })

  describe('getZipEntries', () => {
    let testDir: string
    let packagePath: string

    beforeEach(() => {
      testDir = mkdtempSync(join(tmpdir(), 'zcf-test-'))
      packagePath = join(testDir, 'package.zip')

      const metadata = createTestMetadata()

      const testFile = join(testDir, 'test.txt')
      writeFileSync(testFile, 'test content', 'utf-8')

      const files = [
        { source: testFile, destination: 'configs/test.txt' },
      ]

      createZipPackage(files, metadata, packagePath)
    })

    it('should return list of entries', () => {
      const entries = getZipEntries(packagePath)

      expect(Array.isArray(entries)).toBe(true)
      expect(entries.length).toBeGreaterThan(0)
      expect(entries).toContain('manifest.json')
      expect(entries).toContain('configs/test.txt')
    })
  })

  describe('expandHomePath', () => {
    it('should expand tilde to home directory', () => {
      const expanded = expandHomePath('~/config.json')

      expect(expanded).not.toContain('~')
      expect(expanded).toContain('config.json')
    })

    it('should expand $HOME to home directory', () => {
      const expanded = expandHomePath('$HOME/config.json')

      expect(expanded).not.toContain('$HOME')
      expect(expanded).toContain('config.json')
    })

    it('should handle Windows %USERPROFILE%', () => {
      vi.spyOn(platform, 'isWindows').mockReturnValue(true)
      const expanded = expandHomePath('%USERPROFILE%\\config.json')

      expect(expanded).not.toContain('%USERPROFILE%')
      expect(expanded).toContain('config.json')
    })

    it('should not modify paths without home markers', () => {
      const path = '/absolute/path/config.json'
      const expanded = expandHomePath(path)

      expect(expanded).toBe(path)
    })

    it('should handle just tilde', () => {
      const expanded = expandHomePath('~')

      expect(expanded).not.toBe('~')
      expect(expanded.length).toBeGreaterThan(0)
    })
  })

  describe('normalizePath', () => {
    it('should convert backslashes to forward slashes', () => {
      const normalized = normalizePath('C:\\Users\\Test\\file.txt')

      expect(normalized).toBe('C:/Users/Test/file.txt')
    })

    it('should not modify paths with forward slashes', () => {
      const path = '/home/user/file.txt'
      const normalized = normalizePath(path)

      expect(normalized).toBe(path)
    })

    it('should handle mixed slashes', () => {
      const normalized = normalizePath('C:\\Users/Test\\file.txt')

      expect(normalized).toBe('C:/Users/Test/file.txt')
    })

    it('should handle empty path', () => {
      const normalized = normalizePath('')

      expect(normalized).toBe('')
    })
  })

  describe('hasSensitiveData - additional cases', () => {
    it('should handle non-object values', () => {
      expect(hasSensitiveData(null)).toBe(false)
      expect(hasSensitiveData(undefined)).toBe(false)
      expect(hasSensitiveData('string')).toBe(false)
      expect(hasSensitiveData(123)).toBe(false)
    })

    it('should detect APIKEY field', () => {
      const config = {
        APIKEY: 'test-key-123',
      }

      expect(hasSensitiveData(config)).toBe(true)
    })

    it('should detect ANTHROPIC_AUTH_TOKEN', () => {
      const config = {
        env: {
          ANTHROPIC_AUTH_TOKEN: 'test-token-123',
        },
      }

      expect(hasSensitiveData(config)).toBe(true)
    })

    it('should handle deep nested structures', () => {
      const config = {
        apiKey: 'secret-key',
      }

      expect(hasSensitiveData(config)).toBe(true)
    })
  })

  describe('sanitizeConfig - additional cases', () => {
    it('should handle non-object values', () => {
      expect(sanitizeConfig(null)).toBeNull()
      expect(sanitizeConfig(undefined)).toBeUndefined()
      expect(sanitizeConfig('string')).toBe('string')
      expect(sanitizeConfig(123)).toBe(123)
    })

    it('should sanitize APIKEY field', () => {
      const config = {
        APIKEY: 'test-key-123',
      }

      const sanitized = sanitizeConfig(config)

      expect(sanitized.APIKEY).toBe('***REDACTED_API_KEY***')
    })

    it('should sanitize ANTHROPIC_AUTH_TOKEN', () => {
      const config = {
        env: {
          ANTHROPIC_AUTH_TOKEN: 'test-token-123',
        },
      }

      const sanitized = sanitizeConfig(config)

      expect(sanitized.env.ANTHROPIC_AUTH_TOKEN).toBe('***REDACTED_AUTH_TOKEN***')
    })

    it('should handle arrays with objects', () => {
      const config = {
        items: [
          { apiKey: 'key1' },
          { apiKey: 'key2' },
        ],
      }

      const sanitized = sanitizeConfig(config)

      expect(Array.isArray(sanitized.items)).toBe(true)
    })
  })

  describe('windowsToUnixPath - additional cases', () => {
    it('should handle lowercase drive letters', () => {
      const windowsPath = 'd:\\projects\\file.txt'
      const unixPath = windowsToUnixPath(windowsPath)

      expect(unixPath).toBe('/d/projects/file.txt')
    })

    it('should handle environment variables other than USERPROFILE', () => {
      const windowsPath = '%APPDATA%\\config.json'
      const unixPath = windowsToUnixPath(windowsPath)

      expect(unixPath).toBe('$APPDATA/config.json')
    })

    it('should handle empty string', () => {
      const result = windowsToUnixPath('')

      expect(result).toBe('')
    })
  })

  describe('unixToWindowsPath - additional cases', () => {
    it('should handle environment variables other than HOME', () => {
      const unixPath = '$USER/config.json'
      const windowsPath = unixToWindowsPath(unixPath)

      expect(windowsPath).toBe('%USER%\\config.json')
    })

    it('should handle paths without drive letter', () => {
      const unixPath = '/home/user/file.txt'
      const windowsPath = unixToWindowsPath(unixPath)

      expect(windowsPath).toContain('\\')
    })

    it('should handle empty string', () => {
      const result = unixToWindowsPath('')

      expect(result).toBe('')
    })
  })

  describe('getCurrentPlatform - additional cases', () => {
    it('should handle different platform values', () => {
      const testCases = [
        { platform: 'windows', expected: 'win32' },
        { platform: 'macos', expected: 'darwin' },
        { platform: 'linux', expected: 'linux' },
        { platform: 'termux', expected: 'termux' },
      ]

      testCases.forEach(({ platform: platformValue, expected }) => {
        vi.spyOn(platform, 'getPlatform').mockReturnValue(platformValue as any)
        const result = getCurrentPlatform()
        expect(result).toBe(expected)
      })
    })

    it('should default to linux for unknown platforms', () => {
      vi.spyOn(platform, 'getPlatform').mockReturnValue('unknown' as any)
      const result = getCurrentPlatform()

      expect(result).toBe('linux')
    })
  })
})
