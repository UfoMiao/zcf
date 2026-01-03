/**
 * Comprehensive test suite for export-import core module
 *
 * Tests cover:
 * - calculateChecksum() / calculateChecksumFromContent()
 * - getCurrentPlatform()
 * - getFileInfo()
 * - hasSensitiveData() / sanitizeConfig()
 * - createZipPackage() / extractZipPackage()
 * - validateZipFormat() / getZipEntries()
 * - windowsToUnixPath() / unixToWindowsPath()
 * - adaptPlatformPaths()
 * - expandHomePath() / normalizePath()
 */

import type { ExportMetadata } from '../../../../src/types/export-import'
import { Buffer } from 'node:buffer'
import { homedir } from 'node:os'
import process from 'node:process'
import AdmZip from 'adm-zip'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
} from '../../../../src/utils/export-import/core'

// Mock fs-operations
vi.mock('../../../../src/utils/fs-operations', () => ({
  exists: vi.fn((path: string) => {
    if (path.includes('non-existent'))
      return false
    if (path.includes('test-file.txt'))
      return true
    if (path.includes('manifest.json'))
      return true
    if (path.includes('test-dir'))
      return true
    return true
  }),
  isFile: vi.fn((path: string) => {
    if (path.includes('test-dir'))
      return false
    return !path.includes('non-existent')
  }),
  isDirectory: vi.fn((path: string) => {
    return path.includes('test-dir')
  }),
  readFile: vi.fn((path: string) => {
    if (path.includes('test-file.txt'))
      return 'test content for checksum'
    if (path.includes('manifest.json'))
      return JSON.stringify({ version: '3.5.0', platform: 'win32' })
    return 'mock file content'
  }),
  statSync: vi.fn(() => ({
    size: 1024,
    mtime: new Date('2025-01-03T00:00:00Z'),
  })),
  getStats: vi.fn(() => ({
    size: 1024,
    mtime: new Date('2025-01-03T00:00:00Z'),
  })),
}))

// Mock platform detection
vi.mock('../../../../src/utils/platform', () => ({
  isWindows: vi.fn(() => process.platform === 'win32'),
  getPlatform: vi.fn(() => {
    if (process.platform === 'win32')
      return 'windows'
    if (process.platform === 'darwin')
      return 'macos'
    if (process.platform === 'linux')
      return 'linux'
    return 'unknown'
  }),
}))

describe('export-import/core', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('calculateChecksum', () => {
    it('should calculate SHA-256 checksum from file path', () => {
      const checksum = calculateChecksum('test-file.txt')

      expect(checksum).toBeDefined()
      expect(typeof checksum).toBe('string')
      expect(checksum.length).toBe(64) // SHA-256 produces 64 hex characters
    })

    it('should return same checksum for same content', () => {
      const checksum1 = calculateChecksum('test-file.txt')
      const checksum2 = calculateChecksum('test-file.txt')

      expect(checksum1).toBe(checksum2)
    })
  })

  describe('calculateChecksumFromContent', () => {
    it('should calculate checksum from string content', () => {
      const content = 'test content'
      const checksum = calculateChecksumFromContent(content)

      expect(checksum).toBeDefined()
      expect(typeof checksum).toBe('string')
      expect(checksum.length).toBe(64)
    })

    it('should calculate checksum from Buffer content', () => {
      const buffer = Buffer.from('test content', 'utf-8')
      const checksum = calculateChecksumFromContent(buffer)

      expect(checksum).toBeDefined()
      expect(checksum.length).toBe(64)
    })

    it('should return same checksum for same content', () => {
      const checksum1 = calculateChecksumFromContent('identical content')
      const checksum2 = calculateChecksumFromContent('identical content')

      expect(checksum1).toBe(checksum2)
    })

    it('should return different checksums for different content', () => {
      const checksum1 = calculateChecksumFromContent('content A')
      const checksum2 = calculateChecksumFromContent('content B')

      expect(checksum1).not.toBe(checksum2)
    })
  })

  describe('getCurrentPlatform', () => {
    it('should return current platform type', () => {
      const platform = getCurrentPlatform()

      expect(platform).toBeDefined()
      expect(['win32', 'darwin', 'linux', 'termux']).toContain(platform)
    })

    it('should match process.platform for standard platforms', () => {
      const platform = getCurrentPlatform()

      if (process.platform === 'win32' || process.platform === 'darwin' || process.platform === 'linux') {
        expect(platform).toBe(process.platform)
      }
    })
  })

  describe('getFileInfo', () => {
    it('should return complete file information', () => {
      const fileInfo = getFileInfo('test-file.txt', 'relative/test-file.txt', 'settings')

      expect(fileInfo).toBeDefined()
      expect(fileInfo.path).toBe('relative/test-file.txt') // relativePath parameter
      expect(fileInfo.type).toBe('settings')
      expect(fileInfo.size).toBe(1024)
      expect(fileInfo.checksum).toBeDefined()
      expect(fileInfo.checksum.length).toBe(64)
      expect(fileInfo.originalPath).toBe('test-file.txt')
    })

    it('should calculate correct checksum for file', () => {
      const fileInfo = getFileInfo('test-file.txt', 'config/test.txt', 'settings')
      const directChecksum = calculateChecksum('test-file.txt')

      expect(fileInfo.checksum).toBe(directChecksum)
    })

    it('should include file size from stats', () => {
      const fileInfo = getFileInfo('test-file.txt', 'mcp/test.txt', 'mcp')

      expect(fileInfo.size).toBe(1024)
    })
  })

  describe('hasSensitiveData', () => {
    it('should detect API key in config', () => {
      const config = {
        apiKey: 'sk-ant-api03-actual-key-here',
      }

      const result = hasSensitiveData(config)

      expect(result).toBe(true)
    })

    it('should detect API key in nested profile', () => {
      const config = {
        profiles: {
          default: {
            apiKey: 'sk-ant-api03-sensitive-key',
          },
        },
      }

      const result = hasSensitiveData(config)

      expect(result).toBe(true)
    })

    it('should detect environment variable API keys', () => {
      const config = {
        env: {
          ANTHROPIC_API_KEY: 'sk-ant-actual-key',
        },
      }

      const result = hasSensitiveData(config)

      expect(result).toBe(true)
    })

    it('should return false for already redacted keys', () => {
      const config = {
        apiKey: '***REDACTED_API_KEY***',
      }

      const result = hasSensitiveData(config)

      expect(result).toBe(false)
    })

    it('should return false for config without sensitive data', () => {
      const config = {
        theme: 'dark',
        language: 'en',
        settings: {
          autoSave: true,
        },
      }

      const result = hasSensitiveData(config)

      expect(result).toBe(false)
    })

    it('should handle null/undefined config', () => {
      expect(hasSensitiveData(null)).toBe(false)
      expect(hasSensitiveData(undefined)).toBe(false)
      expect(hasSensitiveData('string')).toBe(false)
    })

    it('should handle wildcard paths in sensitive fields', () => {
      const config = {
        profiles: {
          profile1: { apiKey: 'key1' },
          profile2: { apiKey: 'key2' },
        },
      }

      const result = hasSensitiveData(config)

      expect(result).toBe(true)
    })
  })

  describe('sanitizeConfig', () => {
    it('should replace API key with redacted placeholder', () => {
      const config = {
        apiKey: 'sk-ant-api03-actual-key',
      }

      const sanitized = sanitizeConfig(config)

      expect(sanitized.apiKey).toBe('***REDACTED_API_KEY***')
    })

    it('should sanitize nested API keys in profiles', () => {
      const config = {
        profiles: {
          default: {
            apiKey: 'sk-ant-actual-key',
          },
        },
      }

      const sanitized = sanitizeConfig(config)

      expect(sanitized.profiles.default.apiKey).toBe('***REDACTED_API_KEY***')
    })

    it('should sanitize multiple sensitive fields', () => {
      const config = {
        apiKey: 'key1',
        profiles: {
          p1: { apiKey: 'key2' },
        },
        env: {
          ANTHROPIC_API_KEY: 'key3',
        },
      }

      const sanitized = sanitizeConfig(config)

      expect(sanitized.apiKey).toBe('***REDACTED_API_KEY***')
      expect(sanitized.profiles.p1.apiKey).toBe('***REDACTED_API_KEY***')
      expect(sanitized.env.ANTHROPIC_API_KEY).toBe('***REDACTED_API_KEY***')
    })

    it('should not modify original config', () => {
      const config = {
        apiKey: 'sk-ant-original',
      }

      const sanitized = sanitizeConfig(config)

      expect(config.apiKey).toBe('sk-ant-original')
      expect(sanitized.apiKey).toBe('***REDACTED_API_KEY***')
    })

    it('should preserve non-sensitive fields', () => {
      const config = {
        apiKey: 'sk-ant-key',
        theme: 'dark',
        settings: {
          autoSave: true,
        },
      }

      const sanitized = sanitizeConfig(config)

      expect(sanitized.theme).toBe('dark')
      expect(sanitized.settings.autoSave).toBe(true)
    })

    it('should handle null/undefined config', () => {
      expect(sanitizeConfig(null)).toBeNull()
      expect(sanitizeConfig(undefined)).toBeUndefined()
      expect(sanitizeConfig('string')).toBe('string')
    })
  })

  describe('createZipPackage & extractZipPackage', () => {
    it('should create zip package with manifest and files', () => {
      const files = [
        { source: 'test-file.txt', destination: 'config/test-file.txt' },
      ]
      const metadata: ExportMetadata = {
        version: '3.5.0',
        exportDate: '2025-01-03T00:00:00Z',
        platform: 'win32',
        codeType: 'claude-code',
        scope: ['all'],
        hasSensitiveData: false,
        files: [],
      }
      const outputPath = 'test-package.zip'

      const result = createZipPackage(files, metadata, outputPath)

      expect(result).toBe(outputPath)
    })

    it('should include manifest.json in zip package', () => {
      const files: Array<{ source: string, destination: string }> = []
      const metadata: ExportMetadata = {
        version: '3.5.0',
        exportDate: '2025-01-03T00:00:00Z',
        platform: 'linux',
        codeType: 'claude-code',
        scope: ['settings'],
        hasSensitiveData: false,
        files: [],
      }
      const outputPath = 'manifest-test.zip'

      createZipPackage(files, metadata, outputPath)

      const zip = new AdmZip(outputPath)
      const entries = zip.getEntries()
      const hasManifest = entries.some((entry: any) => entry.entryName === 'manifest.json')

      expect(hasManifest).toBe(true)
    })

    it('should extract zip package and return metadata', () => {
      const packagePath = 'test-package.zip'
      const targetDir = 'extracted'

      const metadata = extractZipPackage(packagePath, targetDir)

      expect(metadata).toBeDefined()
      expect(metadata.version).toBeDefined()
      expect(metadata.platform).toBeDefined()
    })

    it('should throw error if package does not exist', () => {
      expect(() => {
        extractZipPackage('non-existent-package.zip', 'target')
      }).toThrow('Package file does not exist')
    })
  })

  describe('validateZipFormat', () => {
    it('should return true for valid zip file', () => {
      // Create a valid zip for testing
      const zip = new AdmZip()
      zip.addFile('test.txt', Buffer.from('content'))
      zip.writeZip('valid-test.zip')

      const result = validateZipFormat('valid-test.zip')

      expect(result).toBe(true)
    })

    it('should return false for invalid zip format', () => {
      const result = validateZipFormat('not-a-zip-file.txt')

      expect(result).toBe(false)
    })

    it('should return false for non-existent file', () => {
      const result = validateZipFormat('definitely-does-not-exist.zip')

      expect(result).toBe(false)
    })
  })

  describe('getZipEntries', () => {
    it('should return list of entry names in zip', () => {
      const zip = new AdmZip()
      zip.addFile('file1.txt', Buffer.from('content1'))
      zip.addFile('dir/file2.txt', Buffer.from('content2'))
      zip.writeZip('entries-test.zip')

      const entries = getZipEntries('entries-test.zip')

      expect(entries).toContain('file1.txt')
      expect(entries).toContain('dir/file2.txt')
      expect(entries.length).toBe(2)
    })

    it('should return empty array for empty zip', () => {
      const zip = new AdmZip()
      zip.writeZip('empty-test.zip')

      const entries = getZipEntries('empty-test.zip')

      expect(entries).toHaveLength(0)
    })
  })

  describe('windowsToUnixPath', () => {
    it('should convert backslashes to forward slashes', () => {
      const result = windowsToUnixPath('C:\\Users\\test\\config')

      expect(result).toBe('/c/Users/test/config')
    })

    it('should convert drive letter to Unix format', () => {
      const result = windowsToUnixPath('D:\\Projects\\app')

      expect(result).toBe('/d/Projects/app')
    })

    it('should convert %USERPROFILE% to $HOME', () => {
      const result = windowsToUnixPath('%USERPROFILE%\\Documents')

      expect(result).toBe('$HOME/Documents')
    })

    it('should convert other environment variables', () => {
      const result = windowsToUnixPath('%APPDATA%\\config')

      expect(result).toBe('$APPDATA/config')
    })

    it('should handle paths without drive letter', () => {
      const result = windowsToUnixPath('relative\\path\\to\\file')

      expect(result).toBe('relative/path/to/file')
    })
  })

  describe('unixToWindowsPath', () => {
    it('should convert forward slashes to backslashes', () => {
      const result = unixToWindowsPath('/home/user/config')

      expect(result).toBe('\\home\\user\\config')
    })

    it('should convert Unix drive format to Windows', () => {
      const result = unixToWindowsPath('/c/Users/test')

      expect(result).toBe('C:\\Users\\test')
    })

    it('should convert $HOME to %USERPROFILE%', () => {
      const result = unixToWindowsPath('$HOME/Documents')

      expect(result).toBe('%USERPROFILE%\\Documents')
    })

    it('should convert other environment variables', () => {
      const result = unixToWindowsPath('$CONFIG_DIR/settings')

      expect(result).toBe('%CONFIG_DIR%\\settings')
    })

    it('should handle relative paths', () => {
      const result = unixToWindowsPath('relative/path/to/file')

      expect(result).toBe('relative\\path\\to\\file')
    })
  })

  describe('adaptPlatformPaths', () => {
    it('should return unchanged config for same platform', () => {
      const config = { path: '/home/user/config' }
      const platform = getCurrentPlatform()

      const result = adaptPlatformPaths(config, platform, platform)

      expect(result.config).toEqual(config)
      expect(result.mappings).toHaveLength(0)
    })

    it('should adapt Windows paths to Unix', () => {
      const config = { path: 'C:\\Users\\test\\config' }

      const result = adaptPlatformPaths(config, 'win32', 'linux')

      expect(result.config.path).not.toContain('\\')
      expect(result.mappings.length).toBeGreaterThan(0)
      expect(result.mappings[0].original).toBe('C:\\Users\\test\\config')
      expect(result.mappings[0].type).toBe('absolute')
    })

    it('should adapt Unix paths to Windows', () => {
      const config = { path: '/home/user/config' }

      const result = adaptPlatformPaths(config, 'linux', 'win32')

      expect(result.config.path).toContain('\\')
      expect(result.mappings.length).toBeGreaterThan(0)
    })

    it('should adapt nested paths recursively', () => {
      const config = {
        level1: {
          path1: 'C:\\path1',
          level2: {
            path2: 'D:\\path2',
          },
        },
      }

      const result = adaptPlatformPaths(config, 'win32', 'linux')

      expect(result.config.level1.path1).not.toContain('\\')
      expect(result.config.level1.level2.path2).not.toContain('\\')
      expect(result.mappings.length).toBe(2)
    })

    it('should preserve non-path strings', () => {
      const config = {
        name: 'test',
        version: '1.0.0',
        flag: true,
      }

      const result = adaptPlatformPaths(config, 'win32', 'linux')

      expect(result.config).toEqual(config)
      expect(result.mappings).toHaveLength(0)
    })

    it('should record path type in mappings', () => {
      const config = {
        absolute: '/usr/bin/node',
        envVar: '$HOME/config',
      }

      const result = adaptPlatformPaths(config, 'linux', 'win32')

      const absoluteMapping = result.mappings.find(m => m.original === '/usr/bin/node')
      const envVarMapping = result.mappings.find(m => m.original === '$HOME/config')

      expect(absoluteMapping?.type).toBe('absolute')
      expect(envVarMapping?.type).toBe('env-var')
    })
  })

  describe('expandHomePath', () => {
    const home = homedir()

    it('should expand tilde to home directory', () => {
      const result = expandHomePath('~/config')

      expect(result).toBe(`${home}/config`)
    })

    it('should expand $HOME to home directory', () => {
      const result = expandHomePath('$HOME/Documents')

      expect(result).toBe(`${home}/Documents`)
    })

    it('should expand %USERPROFILE% on Windows', () => {
      if (process.platform === 'win32') {
        const result = expandHomePath('%USERPROFILE%\\AppData')

        expect(result).toBe(`${home}\\AppData`)
      }
      else {
        expect(true).toBe(true) // Skip on non-Windows
      }
    })

    it('should handle standalone tilde', () => {
      const result = expandHomePath('~')

      expect(result).toBe(home)
    })

    it('should preserve paths without home reference', () => {
      const result = expandHomePath('/absolute/path')

      expect(result).toBe('/absolute/path')
    })
  })

  describe('normalizePath', () => {
    it('should convert backslashes to forward slashes', () => {
      const result = normalizePath('C:\\Users\\test\\config')

      expect(result).toBe('C:/Users/test/config')
    })

    it('should preserve forward slashes', () => {
      const result = normalizePath('/home/user/config')

      expect(result).toBe('/home/user/config')
    })

    it('should handle mixed slashes', () => {
      const result = normalizePath('C:\\Users/test\\config')

      expect(result).toBe('C:/Users/test/config')
    })

    it('should handle paths with no slashes', () => {
      const result = normalizePath('filename.txt')

      expect(result).toBe('filename.txt')
    })
  })

  describe('edge cases', () => {
    it('should handle empty config in adaptPlatformPaths', () => {
      const result = adaptPlatformPaths({}, 'win32', 'linux')

      expect(result.config).toEqual({})
      expect(result.mappings).toHaveLength(0)
    })

    it('should handle arrays in config', () => {
      const config = {
        paths: ['C:\\path1', 'D:\\path2'],
      }

      const result = adaptPlatformPaths(config, 'win32', 'linux')

      // Arrays ARE adapted by the recursive function
      expect(result.config.paths[0]).not.toContain('\\')
      expect(result.config.paths[1]).not.toContain('\\')
      expect(result.mappings.length).toBe(2)
    })

    it('should handle null values in config', () => {
      const config = {
        value: null,
        path: 'C:\\test',
      }

      const result = adaptPlatformPaths(config, 'win32', 'linux')

      expect(result.config.value).toBeNull()
      expect(result.mappings.length).toBeGreaterThan(0)
    })

    it('should handle deeply nested structures', () => {
      const config = {
        a: { b: { c: { d: { path: 'C:\\deep\\path' } } } },
      }

      const result = adaptPlatformPaths(config, 'win32', 'linux')

      expect(result.config.a.b.c.d.path).not.toContain('\\')
      expect(result.mappings.length).toBe(1)
    })
  })
})
