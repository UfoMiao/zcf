/**
 * Comprehensive test suite for export-import validator module
 *
 * Tests cover:
 * - Package validation (validatePackage)
 * - Manifest validation (validateManifest)
 * - File integrity checks (validateFileIntegrity)
 * - Version compatibility (checkVersionCompatibility)
 * - Platform compatibility (checkPlatformCompatibility)
 * - Import options validation (validateImportOptions)
 */

import type { ExportMetadata } from '../../../../src/types/export-import'
import { mkdirSync, rmSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { version as currentZcfVersion } from '../../../../package.json'
import { validateImportOptions, validatePackage } from '../../../../src/utils/export-import/validator'

// Mock dependencies
vi.mock('../../../../src/utils/fs-operations', () => ({
  exists: vi.fn((path: string) => {
    // Simulate file existence based on path
    if (path.includes('non-existent')) {
      return false
    }
    if (path.includes('valid-package.zip')) {
      return true
    }
    if (path.includes('invalid-zip.zip')) {
      return true
    }
    return true
  }),
}))

// Store the original platform for later restoration
let mockPlatform: string = process.platform

vi.mock('../../../../src/utils/export-import/core', () => ({
  validateZipFormat: vi.fn((path: string) => {
    // Simulate zip validation
    if (path.includes('invalid-zip')) {
      return false
    }
    return true
  }),

  extractZipPackage: vi.fn((packagePath: string, _targetDir: string) => {
    // Simulate extraction errors
    if (packagePath.includes('corrupt-extraction')) {
      throw new Error('Extraction failed: corrupt archive')
    }

    // Return mock metadata based on test scenario
    if (packagePath.includes('missing-version')) {
      return {
        version: '', // Missing version
        exportDate: '2025-01-03T00:00:00Z',
        platform: 'win32',
        codeType: 'claude-code',
        scope: ['all'],
        hasSensitiveData: false,
        files: [],
      } as ExportMetadata
    }

    if (packagePath.includes('invalid-scope')) {
      return {
        version: currentZcfVersion,
        exportDate: '2025-01-03T00:00:00Z',
        platform: 'win32',
        codeType: 'claude-code',
        scope: 'not-an-array', // Invalid: should be array
        hasSensitiveData: false,
        files: [],
      } as any
    }

    if (packagePath.includes('invalid-files')) {
      return {
        version: currentZcfVersion,
        exportDate: '2025-01-03T00:00:00Z',
        platform: 'win32',
        codeType: 'claude-code',
        scope: ['all'],
        hasSensitiveData: false,
        files: [
          {
            // Missing required field 'path'
            type: 'settings',
            size: 100,
            checksum: 'abc123',
          },
        ],
      } as any
    }

    if (packagePath.includes('checksum-mismatch')) {
      return {
        version: currentZcfVersion,
        exportDate: '2025-01-03T00:00:00Z',
        platform: 'win32',
        codeType: 'claude-code',
        scope: ['all'],
        hasSensitiveData: false,
        files: [
          {
            path: 'settings.json',
            type: 'settings',
            size: 100,
            checksum: 'wrong-checksum',
          },
        ],
      } as ExportMetadata
    }

    if (packagePath.includes('version-major-mismatch')) {
      return {
        version: '2.0.0', // Different major version
        exportDate: '2025-01-03T00:00:00Z',
        platform: 'win32',
        codeType: 'claude-code',
        scope: ['all'],
        hasSensitiveData: false,
        files: [],
      } as ExportMetadata
    }

    if (packagePath.includes('version-minor-mismatch')) {
      // Calculate a different minor version
      const [major, minor, patch] = currentZcfVersion.split('.')
      const differentMinor = `${major}.${Number.parseInt(minor) - 1}.${patch}`
      return {
        version: differentMinor, // Different minor version
        exportDate: '2025-01-03T00:00:00Z',
        platform: 'win32',
        codeType: 'claude-code',
        scope: ['all'],
        hasSensitiveData: false,
        files: [],
      } as ExportMetadata
    }

    if (packagePath.includes('platform-win-to-linux')) {
      return {
        version: currentZcfVersion,
        exportDate: '2025-01-03T00:00:00Z',
        platform: 'win32', // Different platform
        codeType: 'claude-code',
        scope: ['all'],
        hasSensitiveData: false,
        files: [],
      } as ExportMetadata
    }

    if (packagePath.includes('platform-linux-to-mac')) {
      return {
        version: currentZcfVersion,
        exportDate: '2025-01-03T00:00:00Z',
        platform: 'linux', // Unix-like to Unix-like
        codeType: 'claude-code',
        scope: ['all'],
        hasSensitiveData: false,
        files: [],
      } as ExportMetadata
    }

    // Default valid metadata - matches current platform
    return {
      version: currentZcfVersion,
      exportDate: '2025-01-03T00:00:00Z',
      platform: mockPlatform, // Use current mock platform
      codeType: 'claude-code',
      scope: ['all'],
      hasSensitiveData: false,
      files: [
        {
          path: 'settings.json',
          type: 'settings',
          size: 100,
          checksum: 'valid-checksum',
        },
      ],
    } as ExportMetadata
  }),

  calculateChecksum: vi.fn((filePath: string) => {
    // Return matching or mismatching checksum based on scenario
    if (filePath.includes('settings.json')) {
      return 'valid-checksum'
    }
    return 'some-checksum'
  }),

  getCurrentPlatform: vi.fn(() => {
    return mockPlatform as any
  }),
}))

// Mock node:fs for temporary directory operations
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs')
  return {
    ...actual,
    mkdirSync: vi.fn(),
    rmSync: vi.fn(),
    writeFileSync: vi.fn(),
  }
})

describe('export-import/validator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validatePackage', () => {
    describe('package existence validation', () => {
      it('should return error if package file does not exist', () => {
        const result = validatePackage('/path/to/non-existent-package.zip')

        expect(result.valid).toBe(false)
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0]).toMatchObject({
          code: 'PACKAGE_NOT_FOUND',
          field: 'packagePath',
        })
        expect(result.errors[0].message).toContain('non-existent-package.zip')
      })

      it('should proceed to zip validation if package exists', () => {
        const result = validatePackage('/path/to/valid-package.zip')

        // Should not have PACKAGE_NOT_FOUND error
        expect(result.errors.every(e => e.code !== 'PACKAGE_NOT_FOUND')).toBe(true)
      })
    })

    describe('zip format validation', () => {
      it('should return error for invalid zip format', () => {
        const result = validatePackage('/path/to/invalid-zip.zip')

        expect(result.valid).toBe(false)
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0]).toMatchObject({
          code: 'INVALID_ZIP_FORMAT',
          field: 'packagePath',
        })
      })

      it('should proceed to extraction if zip format is valid', () => {
        const result = validatePackage('/path/to/valid-package.zip')

        // Should not have INVALID_ZIP_FORMAT error
        expect(result.errors.every(e => e.code !== 'INVALID_ZIP_FORMAT')).toBe(true)
      })
    })

    describe('package extraction', () => {
      it('should handle extraction failures gracefully', () => {
        const result = validatePackage('/path/to/corrupt-extraction.zip')

        expect(result.valid).toBe(false)
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0]).toMatchObject({
          code: 'EXTRACTION_FAILED',
          field: 'packagePath',
        })
        expect(result.errors[0].message).toContain('Extraction failed')
      })

      it('should create temporary directory for extraction', () => {
        validatePackage('/path/to/valid-package.zip')

        expect(mkdirSync).toHaveBeenCalled()
        const mkdirCall = vi.mocked(mkdirSync).mock.calls[0]
        expect(mkdirCall[0]).toContain('.zcf-temp')
        expect(mkdirCall[0]).toContain('import-validation-')
        expect(mkdirCall[1]).toMatchObject({ recursive: true })
      })

      it('should clean up temporary directory after validation', () => {
        validatePackage('/path/to/valid-package.zip')

        expect(rmSync).toHaveBeenCalled()
        const rmCall = vi.mocked(rmSync).mock.calls[0]
        expect(rmCall[0]).toContain('.zcf-temp')
        expect(rmCall[1]).toMatchObject({ recursive: true, force: true })
      })

      it('should clean up even if validation fails', () => {
        validatePackage('/path/to/missing-version.zip')

        expect(rmSync).toHaveBeenCalled()
      })
    })

    describe('manifest validation', () => {
      it('should validate manifest after successful extraction', () => {
        const result = validatePackage('/path/to/valid-package.zip')

        expect(result.metadata).toBeDefined()
        expect(result.metadata?.version).toBe(currentZcfVersion)
      })

      it('should return errors for missing required fields', () => {
        const result = validatePackage('/path/to/missing-version.zip')

        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.code === 'MISSING_FIELD' && e.field === 'version')).toBe(true)
      })

      it('should return errors for invalid field types', () => {
        const result = validatePackage('/path/to/invalid-scope.zip')

        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.code === 'INVALID_FIELD' && e.field === 'scope')).toBe(true)
      })

      it('should validate file entries in manifest', () => {
        const result = validatePackage('/path/to/invalid-files.zip')

        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.code === 'INVALID_FILE_ENTRY')).toBe(true)
      })
    })

    describe('version compatibility', () => {
      it('should warn about major version mismatch', () => {
        const result = validatePackage('/path/to/version-major-mismatch.zip')

        expect(result.versionCompatible).toBe(false)
        expect(result.warnings.some(w =>
          w.code === 'VERSION_MISMATCH'
          && w.details?.severity === 'high',
        )).toBe(true)
      })

      it('should warn about minor version difference', () => {
        const result = validatePackage('/path/to/version-minor-mismatch.zip')

        expect(result.versionCompatible).toBe(true)
        expect(result.warnings.some(w =>
          w.code === 'VERSION_DIFFERENCE'
          && w.details?.severity === 'low',
        )).toBe(true)
      })

      it('should not warn if versions match exactly', () => {
        const result = validatePackage('/path/to/valid-package.zip')

        expect(result.versionCompatible).toBe(true)
        expect(result.warnings.filter(w =>
          w.code === 'VERSION_MISMATCH' || w.code === 'VERSION_DIFFERENCE',
        )).toHaveLength(0)
      })
    })

    describe('platform compatibility', () => {
      it('should warn about Windows to Unix platform mismatch', () => {
        // Change mock platform to linux
        mockPlatform = 'linux'

        const result = validatePackage('/path/to/platform-win-to-linux.zip')

        expect(result.platformCompatible).toBe(true)
        expect(result.warnings.some(w =>
          w.code === 'PLATFORM_MISMATCH'
          && w.details?.severity === 'medium',
        )).toBe(true)

        // Restore original platform
        mockPlatform = process.platform
      })

      it('should warn about Unix-like platform differences', () => {
        // Change mock platform to darwin
        mockPlatform = 'darwin'

        const result = validatePackage('/path/to/platform-linux-to-mac.zip')

        expect(result.platformCompatible).toBe(true)
        expect(result.warnings.some(w =>
          w.code === 'PLATFORM_DIFFERENCE'
          && w.details?.severity === 'low',
        )).toBe(true)

        // Restore original platform
        mockPlatform = process.platform
      })

      it('should not warn if platforms match', () => {
        // Reset to original platform
        mockPlatform = process.platform

        const result = validatePackage('/path/to/valid-package.zip')

        expect(result.platformCompatible).toBe(true)
        expect(result.warnings.filter(w =>
          w.code === 'PLATFORM_MISMATCH' || w.code === 'PLATFORM_DIFFERENCE',
        )).toHaveLength(0)
      })
    })

    describe('complete validation flow', () => {
      it('should return valid result for completely valid package', () => {
        const result = validatePackage('/path/to/valid-package.zip')

        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
        expect(result.metadata).toBeDefined()
        expect(result.versionCompatible).toBe(true)
        expect(result.platformCompatible).toBe(true)
      })

      it('should include metadata even with warnings', () => {
        const result = validatePackage('/path/to/version-minor-mismatch.zip')

        expect(result.valid).toBe(true)
        expect(result.warnings.length).toBeGreaterThan(0)
        expect(result.metadata).toBeDefined()
      })

      it('should stop early on fatal errors', () => {
        const result = validatePackage('/path/to/non-existent-package.zip')

        expect(result.valid).toBe(false)
        expect(result.metadata).toBeUndefined()
      })
    })
  })

  describe('validateImportOptions', () => {
    describe('required field validation', () => {
      it('should return error if packagePath is missing', () => {
        const result = validateImportOptions({
          packagePath: '',
          backup: true,
        })

        expect(result.valid).toBe(false)
        expect(result.errors).toContain('Package path is required')
      })

      it('should return error if packagePath file does not exist', () => {
        const result = validateImportOptions({
          packagePath: '/path/to/non-existent.zip',
          backup: true,
        })

        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.includes('does not exist'))).toBe(true)
      })

      it('should validate successfully if packagePath exists', () => {
        const result = validateImportOptions({
          packagePath: '/path/to/valid-package.zip',
          backup: true,
        })

        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })
    })

    describe('targetCodeType validation', () => {
      it('should accept valid code types', () => {
        const validTypes = ['claude-code', 'codex', 'all']

        for (const type of validTypes) {
          const result = validateImportOptions({
            packagePath: '/path/to/valid-package.zip',
            targetCodeType: type,
            backup: true,
          })

          expect(result.valid).toBe(true)
        }
      })

      it('should reject invalid code types', () => {
        const result = validateImportOptions({
          packagePath: '/path/to/valid-package.zip',
          targetCodeType: 'invalid-type',
          backup: true,
        })

        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.includes('Invalid target code type'))).toBe(true)
      })

      it('should allow missing targetCodeType', () => {
        const result = validateImportOptions({
          packagePath: '/path/to/valid-package.zip',
          backup: true,
        })

        expect(result.valid).toBe(true)
      })
    })

    describe('mergeStrategy validation', () => {
      it('should accept valid merge strategies', () => {
        const validStrategies = ['replace', 'merge', 'skip-existing']

        for (const strategy of validStrategies) {
          const result = validateImportOptions({
            packagePath: '/path/to/valid-package.zip',
            mergeStrategy: strategy,
            backup: true,
          })

          expect(result.valid).toBe(true)
        }
      })

      it('should reject invalid merge strategies', () => {
        const result = validateImportOptions({
          packagePath: '/path/to/valid-package.zip',
          mergeStrategy: 'invalid-strategy',
          backup: true,
        })

        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.includes('Invalid merge strategy'))).toBe(true)
      })

      it('should allow missing mergeStrategy', () => {
        const result = validateImportOptions({
          packagePath: '/path/to/valid-package.zip',
          backup: true,
        })

        expect(result.valid).toBe(true)
      })
    })

    describe('multiple validation errors', () => {
      it('should accumulate multiple errors', () => {
        const result = validateImportOptions({
          packagePath: '/path/to/non-existent.zip',
          targetCodeType: 'invalid-type',
          mergeStrategy: 'invalid-strategy',
          backup: true,
        })

        expect(result.valid).toBe(false)
        expect(result.errors.length).toBeGreaterThanOrEqual(3)
      })

      it('should return all errors together', () => {
        const result = validateImportOptions({
          packagePath: '',
          targetCodeType: 'bad-type',
          mergeStrategy: 'bad-strategy',
          backup: false,
        })

        expect(result.errors).toContain('Package path is required')
        expect(result.errors.some(e => e.includes('Invalid target code type'))).toBe(true)
        expect(result.errors.some(e => e.includes('Invalid merge strategy'))).toBe(true)
      })
    })

    describe('edge cases', () => {
      it('should handle options with all valid fields', () => {
        const result = validateImportOptions({
          packagePath: '/path/to/valid-package.zip',
          targetCodeType: 'claude-code',
          mergeStrategy: 'merge',
          backup: true,
        })

        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should handle options with minimal required fields', () => {
        const result = validateImportOptions({
          packagePath: '/path/to/valid-package.zip',
          backup: false,
        })

        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })
    })
  })
})
