/**
 * Comprehensive test suite for export-import manifest module
 *
 * Tests cover:
 * - createManifest() - Manifest creation with various options
 * - validateManifest() - Manifest structure validation
 * - validateFileIntegrity() - File checksum verification
 * - manifestHasSensitiveData() - Sensitive data detection
 * - getManifestSummary() - Summary string generation
 * - parseVersion() / compareVersions() - Version utilities
 */

import type { ExportFileInfo, ExportMetadata } from '../../../../src/types/export-import'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { version as currentZcfVersion } from '../../../../package.json'
import {
  compareVersions,
  createManifest,
  getManifestSummary,
  manifestHasSensitiveData,
  parseVersion,
  validateFileIntegrity,
  validateManifest,
} from '../../../../src/utils/export-import/manifest'

// Mock core module
vi.mock('../../../../src/utils/export-import/core', () => ({
  getCurrentPlatform: vi.fn(() => {
    return process.platform as any
  }),
  calculateChecksum: vi.fn((filePath: string) => {
    if (filePath.includes('correct-checksum'))
      return 'abc123'
    if (filePath.includes('wrong-checksum'))
      return 'xyz789'
    if (filePath.includes('error-file'))
      throw new Error('File not found')
    return 'default-checksum'
  }),
}))

describe('export-import/manifest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createManifest', () => {
    it('should create manifest with required fields', () => {
      const files: ExportFileInfo[] = [
        {
          path: 'test.json',
          type: 'settings',
          size: 100,
          checksum: 'abc123',
        },
      ]

      const manifest = createManifest({
        codeType: 'claude-code',
        scope: ['all'],
        files,
      })

      expect(manifest.version).toBe(currentZcfVersion)
      expect(manifest.platform).toBeDefined()
      expect(manifest.codeType).toBe('claude-code')
      expect(manifest.scope).toEqual(['all'])
      expect(manifest.files).toEqual(files)
      expect(manifest.hasSensitiveData).toBe(false)
    })

    it('should detect sensitive data in files', () => {
      const files: ExportFileInfo[] = [
        {
          path: 'config.json',
          type: 'settings',
          size: 100,
          checksum: 'abc123',
          hasSensitiveData: true,
        },
      ]

      const manifest = createManifest({
        codeType: 'claude-code',
        scope: ['settings'],
        files,
      })

      expect(manifest.hasSensitiveData).toBe(true)
    })

    it('should include optional description and tags', () => {
      const manifest = createManifest({
        codeType: 'codex',
        scope: ['workflows'],
        files: [],
        description: 'Test export',
        tags: ['test', 'v1'],
      })

      expect(manifest.description).toBe('Test export')
      expect(manifest.tags).toEqual(['test', 'v1'])
    })

    it('should set exportDate to current time', () => {
      const beforeTime = new Date().toISOString()
      const manifest = createManifest({
        codeType: 'all',
        scope: ['all'],
        files: [],
      })
      const afterTime = new Date().toISOString()

      expect(manifest.exportDate).toBeDefined()
      expect(manifest.exportDate >= beforeTime).toBe(true)
      expect(manifest.exportDate <= afterTime).toBe(true)
    })

    it('should handle empty files array', () => {
      const manifest = createManifest({
        codeType: 'claude-code',
        scope: ['mcp'],
        files: [],
      })

      expect(manifest.files).toHaveLength(0)
      expect(manifest.hasSensitiveData).toBe(false)
    })
  })

  describe('validateManifest', () => {
    const createValidManifest = (): ExportMetadata => ({
      version: currentZcfVersion,
      exportDate: new Date().toISOString(),
      platform: process.platform as any,
      codeType: 'claude-code',
      scope: ['all'],
      hasSensitiveData: false,
      files: [],
    })

    it('should pass validation for valid manifest', () => {
      const manifest = createValidManifest()
      const result = validateManifest(manifest)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.metadata).toEqual(manifest)
    })

    it('should detect missing version', () => {
      const manifest = createValidManifest()
      delete (manifest as any).version

      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === 'MISSING_VERSION')).toBe(true)
    })

    it('should detect missing exportDate', () => {
      const manifest = createValidManifest()
      delete (manifest as any).exportDate

      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === 'MISSING_EXPORT_DATE')).toBe(true)
    })

    it('should detect missing platform', () => {
      const manifest = createValidManifest()
      delete (manifest as any).platform

      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === 'MISSING_PLATFORM')).toBe(true)
    })

    it('should detect missing codeType', () => {
      const manifest = createValidManifest()
      delete (manifest as any).codeType

      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === 'MISSING_CODE_TYPE')).toBe(true)
    })

    it('should detect invalid scope (not an array)', () => {
      const manifest = createValidManifest()
      ;(manifest as any).scope = 'not-an-array'

      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === 'INVALID_SCOPE')).toBe(true)
    })

    it('should detect invalid files (not an array)', () => {
      const manifest = createValidManifest()
      ;(manifest as any).files = 'not-an-array'

      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === 'INVALID_FILES')).toBe(true)
    })

    it('should validate file entries - missing path', () => {
      const manifest = createValidManifest()
      manifest.files = [
        {
          type: 'settings',
          size: 100,
          checksum: 'abc',
        } as any,
      ]

      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === 'MISSING_FILE_PATH')).toBe(true)
    })

    it('should validate file entries - missing type', () => {
      const manifest = createValidManifest()
      manifest.files = [
        {
          path: 'test.json',
          size: 100,
          checksum: 'abc',
        } as any,
      ]

      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === 'MISSING_FILE_TYPE')).toBe(true)
    })

    it('should validate file entries - invalid size', () => {
      const manifest = createValidManifest()
      manifest.files = [
        {
          path: 'test.json',
          type: 'settings',
          size: 'not-a-number' as any,
          checksum: 'abc',
        },
      ]

      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === 'INVALID_FILE_SIZE')).toBe(true)
    })

    it('should warn about missing checksum', () => {
      const manifest = createValidManifest()
      manifest.files = [
        {
          path: 'test.json',
          type: 'settings',
          size: 100,
        } as any,
      ]

      const result = validateManifest(manifest)

      expect(result.valid).toBe(true)
      expect(result.warnings.some(w => w.code === 'MISSING_CHECKSUM')).toBe(true)
    })

    it('should warn about version mismatch (major version)', () => {
      const manifest = createValidManifest()
      manifest.version = '99.0.0' // Different major version

      const result = validateManifest(manifest)

      expect(result.valid).toBe(true)
      expect(result.warnings.some(w => w.code === 'VERSION_MISMATCH')).toBe(true)
      expect(result.versionCompatible).toBe(false)
    })

    it('should not warn for same major version', () => {
      const manifest = createValidManifest()
      const currentMajor = currentZcfVersion.split('.')[0]
      manifest.version = `${currentMajor}.99.99` // Same major, different minor/patch

      const result = validateManifest(manifest)

      expect(result.warnings.every(w => w.code !== 'VERSION_MISMATCH')).toBe(true)
      expect(result.versionCompatible).toBe(true)
    })

    it('should warn about platform mismatch (win32 to linux)', () => {
      const manifest = createValidManifest()
      manifest.platform = process.platform === 'win32' ? 'linux' : 'win32'

      const result = validateManifest(manifest)

      if (process.platform !== 'darwin' && process.platform !== 'linux') {
        expect(result.warnings.some(w => w.code === 'PLATFORM_MISMATCH')).toBe(true)
        expect(result.platformCompatible).toBe(false)
      }
    })

    it('should consider darwin and linux compatible', async () => {
      const manifest = createValidManifest()
      manifest.platform = 'linux'

      // Mock getCurrentPlatform to return darwin
      const { getCurrentPlatform } = await import('../../../../src/utils/export-import/core')
      vi.mocked(getCurrentPlatform).mockReturnValueOnce('darwin')

      const result = validateManifest(manifest)

      expect(result.platformCompatible).toBe(true)
    })

    it('should return metadata only when valid', () => {
      const manifest = createValidManifest()
      delete (manifest as any).version

      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
      expect(result.metadata).toBeUndefined()
    })
  })

  describe('validateFileIntegrity', () => {
    it('should validate correct checksum', () => {
      const result = validateFileIntegrity('correct-checksum.txt', 'abc123')

      expect(result.valid).toBe(true)
      expect(result.actualChecksum).toBe('abc123')
    })

    it('should detect incorrect checksum', () => {
      const result = validateFileIntegrity('wrong-checksum.txt', 'abc123')

      expect(result.valid).toBe(false)
      expect(result.actualChecksum).toBe('xyz789')
    })

    it('should handle file read errors', () => {
      const result = validateFileIntegrity('error-file.txt', 'abc123')

      expect(result.valid).toBe(false)
      expect(result.actualChecksum).toBeUndefined()
    })
  })

  describe('manifestHasSensitiveData', () => {
    it('should return true when hasSensitiveData is true', () => {
      const manifest: ExportMetadata = {
        version: '1.0.0',
        exportDate: '2025-01-03',
        platform: 'linux',
        codeType: 'claude-code',
        scope: ['all'],
        hasSensitiveData: true,
        files: [],
      }

      expect(manifestHasSensitiveData(manifest)).toBe(true)
    })

    it('should return false when hasSensitiveData is false', () => {
      const manifest: ExportMetadata = {
        version: '1.0.0',
        exportDate: '2025-01-03',
        platform: 'linux',
        codeType: 'claude-code',
        scope: ['all'],
        hasSensitiveData: false,
        files: [],
      }

      expect(manifestHasSensitiveData(manifest)).toBe(false)
    })
  })

  describe('getManifestSummary', () => {
    it('should generate summary with all required fields', () => {
      const manifest: ExportMetadata = {
        version: '3.5.0',
        exportDate: '2025-01-03T00:00:00Z',
        platform: 'linux',
        codeType: 'claude-code',
        scope: ['all', 'workflows'],
        hasSensitiveData: false,
        files: [
          { path: 'f1.json', type: 'settings', size: 100, checksum: 'abc' },
          { path: 'f2.json', type: 'mcp', size: 200, checksum: 'def' },
        ],
      }

      const summary = getManifestSummary(manifest)

      expect(summary).toContain('ZCF Export Package')
      expect(summary).toContain('Version: 3.5.0')
      expect(summary).toContain('Platform: linux')
      expect(summary).toContain('Code Type: claude-code')
      expect(summary).toContain('Scope: all, workflows')
      expect(summary).toContain('Files: 2')
      expect(summary).toContain('Sensitive Data: No')
    })

    it('should include description when provided', () => {
      const manifest: ExportMetadata = {
        version: '1.0.0',
        exportDate: '2025-01-03',
        platform: 'win32',
        codeType: 'codex',
        scope: ['settings'],
        hasSensitiveData: false,
        files: [],
        description: 'Test export package',
      }

      const summary = getManifestSummary(manifest)

      expect(summary).toContain('Description: Test export package')
    })

    it('should include tags when provided', () => {
      const manifest: ExportMetadata = {
        version: '1.0.0',
        exportDate: '2025-01-03',
        platform: 'darwin',
        codeType: 'all',
        scope: ['all'],
        hasSensitiveData: false,
        files: [],
        tags: ['production', 'v1'],
      }

      const summary = getManifestSummary(manifest)

      expect(summary).toContain('Tags: production, v1')
    })

    it('should show "Yes" for sensitive data', () => {
      const manifest: ExportMetadata = {
        version: '1.0.0',
        exportDate: '2025-01-03',
        platform: 'linux',
        codeType: 'claude-code',
        scope: ['all'],
        hasSensitiveData: true,
        files: [],
      }

      const summary = getManifestSummary(manifest)

      expect(summary).toContain('Sensitive Data: Yes')
    })
  })

  describe('parseVersion', () => {
    it('should parse standard version', () => {
      const version = parseVersion('3.5.2')

      expect(version.major).toBe(3)
      expect(version.minor).toBe(5)
      expect(version.patch).toBe(2)
    })

    it('should handle single digit versions', () => {
      const version = parseVersion('1.0.0')

      expect(version.major).toBe(1)
      expect(version.minor).toBe(0)
      expect(version.patch).toBe(0)
    })

    it('should handle missing parts with default 0', () => {
      const version1 = parseVersion('2.5')

      expect(version1.major).toBe(2)
      expect(version1.minor).toBe(5)
      expect(version1.patch).toBe(0)

      const version2 = parseVersion('4')

      expect(version2.major).toBe(4)
      expect(version2.minor).toBe(0)
      expect(version2.patch).toBe(0)
    })

    it('should handle empty string', () => {
      const version = parseVersion('')

      expect(version.major).toBe(0)
      expect(version.minor).toBe(0)
      expect(version.patch).toBe(0)
    })
  })

  describe('compareVersions', () => {
    it('should detect v1 < v2 (major)', () => {
      expect(compareVersions('1.0.0', '2.0.0')).toBeLessThan(0)
    })

    it('should detect v1 > v2 (major)', () => {
      expect(compareVersions('3.0.0', '2.0.0')).toBeGreaterThan(0)
    })

    it('should detect v1 < v2 (minor)', () => {
      expect(compareVersions('1.2.0', '1.3.0')).toBeLessThan(0)
    })

    it('should detect v1 > v2 (minor)', () => {
      expect(compareVersions('1.5.0', '1.3.0')).toBeGreaterThan(0)
    })

    it('should detect v1 < v2 (patch)', () => {
      expect(compareVersions('1.2.3', '1.2.5')).toBeLessThan(0)
    })

    it('should detect v1 > v2 (patch)', () => {
      expect(compareVersions('1.2.9', '1.2.5')).toBeGreaterThan(0)
    })

    it('should return 0 for equal versions', () => {
      expect(compareVersions('2.5.8', '2.5.8')).toBe(0)
    })

    it('should prioritize major over minor and patch', () => {
      expect(compareVersions('2.0.0', '1.99.99')).toBeGreaterThan(0)
    })

    it('should prioritize minor over patch', () => {
      expect(compareVersions('1.3.0', '1.2.99')).toBeGreaterThan(0)
    })
  })

  describe('edge cases', () => {
    it('should handle manifest with all fields', () => {
      const manifest = createManifest({
        codeType: 'all',
        scope: ['all', 'workflows', 'mcp'],
        files: [
          { path: 'f1.json', type: 'settings', size: 100, checksum: 'abc', hasSensitiveData: true },
          { path: 'f2.md', type: 'workflows', size: 200, checksum: 'def' },
        ],
        description: 'Complete export',
        tags: ['full', 'backup', 'production'],
      })

      expect(manifest.version).toBeDefined()
      expect(manifest.exportDate).toBeDefined()
      expect(manifest.hasSensitiveData).toBe(true)
      expect(manifest.description).toBe('Complete export')
      expect(manifest.tags).toEqual(['full', 'backup', 'production'])
    })

    it('should validate complex manifest', () => {
      const manifest: ExportMetadata = {
        version: currentZcfVersion,
        exportDate: new Date().toISOString(),
        platform: process.platform as any,
        codeType: 'all',
        scope: ['all', 'workflows', 'mcp', 'settings'],
        hasSensitiveData: true,
        files: [
          { path: 'settings.json', type: 'settings', size: 500, checksum: 'abc123' },
          { path: 'workflow1.md', type: 'workflows', size: 1024, checksum: 'def456' },
          { path: 'mcp-config.json', type: 'mcp', size: 256, checksum: 'ghi789' },
        ],
        description: 'Full backup',
        tags: ['backup', 'v1'],
      }

      const result = validateManifest(manifest)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })
})
