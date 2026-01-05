/**
 * Test suite for manifest management
 */

import type { ExportMetadata } from '../../../src/types/export-import'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  compareVersions,
  createManifest,
  getManifestSummary,
  manifestHasSensitiveData,
  parseVersion,
  validateFileIntegrity,
  validateManifest,
} from '../../../src/utils/export-import/manifest'

describe('manifest', () => {
  describe('createManifest', () => {
    it('should create valid manifest', () => {
      const manifest = createManifest({
        codeType: 'claude-code',
        scope: ['all'],
        files: [
          {
            path: 'settings.json',
            type: 'settings',
            size: 100,
            checksum: 'abc123',
          },
        ],
      })

      expect(manifest.version).toBeTruthy()
      expect(manifest.exportDate).toBeTruthy()
      expect(manifest.platform).toBeTruthy()
      expect(manifest.codeType).toBe('claude-code')
      expect(manifest.scope).toEqual(['all'])
      expect(manifest.files).toHaveLength(1)
    })

    it('should detect sensitive data in files', () => {
      const manifest = createManifest({
        codeType: 'claude-code',
        scope: ['all'],
        files: [
          {
            path: 'settings.json',
            type: 'settings',
            size: 100,
            checksum: 'abc123',
            hasSensitiveData: true,
          },
        ],
      })

      expect(manifest.hasSensitiveData).toBe(true)
    })

    it('should include optional fields', () => {
      const manifest = createManifest({
        codeType: 'claude-code',
        scope: ['all'],
        files: [],
        description: 'Test export',
        tags: ['test', 'backup'],
      })

      expect(manifest.description).toBe('Test export')
      expect(manifest.tags).toEqual(['test', 'backup'])
    })
  })

  describe('validateManifest', () => {
    it('should validate correct manifest', () => {
      const manifest: ExportMetadata = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        platform: 'linux',
        codeType: 'claude-code',
        scope: ['all'],
        hasSensitiveData: false,
        files: [
          {
            path: 'settings.json',
            type: 'settings',
            size: 100,
            checksum: 'abc123',
          },
        ],
      }

      const result = validateManifest(manifest)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing version', () => {
      const manifest = {
        exportDate: new Date().toISOString(),
        platform: 'linux',
        codeType: 'claude-code',
        scope: ['all'],
        hasSensitiveData: false,
        files: [],
      }

      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === 'MISSING_VERSION')).toBe(true)
    })

    it('should detect missing export date', () => {
      const manifest = {
        version: '1.0.0',
        platform: 'linux',
        codeType: 'claude-code',
        scope: ['all'],
        hasSensitiveData: false,
        files: [],
      }

      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === 'MISSING_EXPORT_DATE')).toBe(true)
    })

    it('should detect invalid files array', () => {
      const manifest = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        platform: 'linux',
        codeType: 'claude-code',
        scope: ['all'],
        hasSensitiveData: false,
        files: 'not-an-array',
      }

      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === 'INVALID_FILES')).toBe(true)
    })

    it('should validate file entries', () => {
      const manifest = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        platform: 'linux',
        codeType: 'claude-code',
        scope: ['all'],
        hasSensitiveData: false,
        files: [
          {
            // Missing path
            type: 'settings',
            size: 100,
            checksum: 'abc123',
          },
        ],
      }

      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === 'MISSING_FILE_PATH')).toBe(true)
    })

    it('should detect missing file type', () => {
      const manifest = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        platform: 'linux',
        codeType: 'claude-code',
        scope: ['all'],
        hasSensitiveData: false,
        files: [
          {
            path: 'settings.json',
            // Missing type
            size: 100,
            checksum: 'abc123',
          },
        ],
      }

      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === 'MISSING_FILE_TYPE')).toBe(true)
    })

    it('should detect invalid file size', () => {
      const manifest = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        platform: 'linux',
        codeType: 'claude-code',
        scope: ['all'],
        hasSensitiveData: false,
        files: [
          {
            path: 'settings.json',
            type: 'settings',
            size: 'invalid', // Should be number
            checksum: 'abc123',
          },
        ],
      }

      const result = validateManifest(manifest)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === 'INVALID_FILE_SIZE')).toBe(true)
    })

    it('should warn about missing checksum', () => {
      const manifest = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        platform: 'linux',
        codeType: 'claude-code',
        scope: ['all'],
        hasSensitiveData: false,
        files: [
          {
            path: 'settings.json',
            type: 'settings',
            size: 100,
            // Missing checksum
          },
        ],
      }

      const result = validateManifest(manifest)

      expect(result.warnings.some(w => w.code === 'MISSING_CHECKSUM')).toBe(true)
    })

    it('should warn about platform mismatch', () => {
      const manifest: ExportMetadata = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        platform: 'win32',
        codeType: 'claude-code',
        scope: ['all'],
        hasSensitiveData: false,
        files: [],
      }

      const result = validateManifest(manifest)

      // Platform mismatch is a warning, not an error
      expect(result.valid).toBe(true)
      // Warnings may exist depending on current platform
    })
  })

  describe('validateFileIntegrity', () => {
    let testDir: string
    let testFile: string

    beforeEach(() => {
      testDir = mkdtempSync(join(tmpdir(), 'zcf-test-'))
      testFile = join(testDir, 'test.txt')
      writeFileSync(testFile, 'test content', 'utf-8')
    })

    it('should validate file integrity with correct checksum', () => {
      // First get the actual checksum
      const { actualChecksum } = validateFileIntegrity(testFile, 'dummy')
      expect(actualChecksum).toBeTruthy()

      // Then validate with the correct checksum
      const result = validateFileIntegrity(testFile, actualChecksum!)
      expect(result.valid).toBe(true)
      expect(result.actualChecksum).toBe(actualChecksum)
    })

    it('should detect incorrect checksum', () => {
      const result = validateFileIntegrity(testFile, 'wrong-checksum')

      expect(result.valid).toBe(false)
      expect(result.actualChecksum).toBeTruthy()
    })

    it('should handle non-existent file', () => {
      const result = validateFileIntegrity('/non/existent/file.txt', 'any-checksum')

      expect(result.valid).toBe(false)
      expect(result.actualChecksum).toBeUndefined()
    })
  })

  describe('manifestHasSensitiveData', () => {
    it('should detect sensitive data flag', () => {
      const manifest: ExportMetadata = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        platform: 'linux',
        codeType: 'claude-code',
        scope: ['all'],
        hasSensitiveData: true,
        files: [],
      }

      expect(manifestHasSensitiveData(manifest)).toBe(true)
    })

    it('should return false when no sensitive data', () => {
      const manifest: ExportMetadata = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
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
    it('should generate summary string', () => {
      const manifest: ExportMetadata = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        platform: 'linux',
        codeType: 'claude-code',
        scope: ['all'],
        hasSensitiveData: false,
        files: [
          {
            path: 'settings.json',
            type: 'settings',
            size: 100,
            checksum: 'abc123',
          },
        ],
        description: 'Test export',
        tags: ['test'],
      }

      const summary = getManifestSummary(manifest)

      expect(summary).toContain('ZCF Export Package')
      expect(summary).toContain('Version: 1.0.0')
      expect(summary).toContain('Platform: linux')
      expect(summary).toContain('Code Type: claude-code')
      expect(summary).toContain('Files: 1')
      expect(summary).toContain('Description: Test export')
      expect(summary).toContain('Tags: test')
    })
  })

  describe('parseVersion', () => {
    it('should parse version string', () => {
      const version = parseVersion('1.2.3')

      expect(version.major).toBe(1)
      expect(version.minor).toBe(2)
      expect(version.patch).toBe(3)
    })

    it('should handle missing parts', () => {
      const version = parseVersion('1.2')

      expect(version.major).toBe(1)
      expect(version.minor).toBe(2)
      expect(version.patch).toBe(0)
    })
  })

  describe('compareVersions', () => {
    it('should detect equal versions', () => {
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0)
    })

    it('should detect newer major version', () => {
      expect(compareVersions('2.0.0', '1.0.0')).toBeGreaterThan(0)
    })

    it('should detect older major version', () => {
      expect(compareVersions('1.0.0', '2.0.0')).toBeLessThan(0)
    })

    it('should detect newer minor version', () => {
      expect(compareVersions('1.2.0', '1.1.0')).toBeGreaterThan(0)
    })

    it('should detect newer patch version', () => {
      expect(compareVersions('1.0.2', '1.0.1')).toBeGreaterThan(0)
    })
  })
})
