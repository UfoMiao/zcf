/**
 * Comprehensive test suite for export-import importer module
 *
 * Tests cover:
 * - executeImport() - Main import operation with progress tracking
 * - getImportSummary() - Import preview and validation
 * - Backup creation and rollback functionality
 * - Path adaptation for cross-platform compatibility
 * - Conflict detection and resolution
 * - Configuration merging strategies (merge, replace, skip-existing)
 * - Error handling and recovery
 * - Sensitive data handling
 */

import type { ExportMetadata, ImportOptions, ProgressCallback } from '../../../../src/types/export-import'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { executeImport, getImportSummary } from '../../../../src/utils/export-import/importer'

// Mock dependencies
vi.mock('../../../../src/utils/fs-operations', () => ({
  exists: vi.fn((path: string) => {
    if (path.includes('test-package.zip'))
      return true
    if (path.includes('settings.json'))
      return true
    if (path.includes('zcf-config.toml'))
      return true
    if (path.includes('mcp-settings.json'))
      return true
    if (path.includes('backup'))
      return true
    // Support temporary extraction directory
    if (path.includes('.zcf-temp'))
      return true
    if (path.includes('CLAUDE.md'))
      return true
    return false
  }),
  readFile: vi.fn((path: string) => {
    if (path.includes('settings.json')) {
      return JSON.stringify({
        apiKey: 'existing-key',
        model: 'claude-sonnet-4',
      })
    }
    if (path.includes('mcp-settings.json')) {
      return JSON.stringify({
        mcpServers: {
          server1: { command: '/usr/bin/server1' },
        },
      })
    }
    if (path.includes('zcf-config.toml')) {
      return 'version = "3.4.3"\napi_key = "test-key"'
    }
    if (path.includes('CLAUDE.md')) {
      return '# CLAUDE.md\n\nTest markdown file'
    }
    return '{}'
  }),
  writeFile: vi.fn(),
  copyFile: vi.fn(),
}))

vi.mock('../../../../src/utils/config', () => ({
  backupExistingConfig: vi.fn(() => '/Users/test/.claude/backup/backup-2025-01-05'),
}))

vi.mock('../../../../src/utils/export-import/validator', () => ({
  validatePackage: vi.fn((path: string) => {
    if (path.includes('invalid')) {
      return {
        valid: false,
        errors: [{ message: 'Invalid package format' }],
        warnings: [],
      }
    }

    return {
      valid: true,
      metadata: {
        version: '1.0.0',
        exportDate: '2025-01-05T00:00:00.000Z',
        createdAt: '2025-01-05T00:00:00.000Z',
        platform: 'darwin',
        codeType: 'claude-code',
        scope: ['settings'],
        hasSensitiveData: false,
        files: [
          {
            path: 'configs/claude-code/settings.json',
            type: 'settings',
            checksum: 'abc123',
            size: 256,
          },
        ],
        description: 'Test export',
        tags: ['claude-code', 'settings'],
      } as ExportMetadata,
      errors: [],
      warnings: [],
    }
  }),
}))

vi.mock('../../../../src/utils/export-import/core', () => ({
  extractZipPackage: vi.fn((_packagePath, extractDir) => {
    // Simulate extraction
    return extractDir
  }),
}))

vi.mock('../../../../src/utils/export-import/path-adapter', () => ({
  adaptConfigPaths: vi.fn(config => ({
    adaptedConfig: config,
    warnings: [],
  })),
  adaptMcpPaths: vi.fn(config => ({
    adapted: config,
    warnings: [],
  })),
}))

vi.mock('../../../../src/utils/export-import/merger', () => ({
  mergeConfigs: vi.fn((existing, incoming, strategy) => {
    if (strategy === 'replace') {
      return {
        merged: incoming,
        conflicts: [],
      }
    }
    if (strategy === 'skip-existing') {
      return {
        merged: existing,
        conflicts: [],
      }
    }
    return {
      merged: { ...existing, ...incoming },
      conflicts: [],
    }
  }),
  mergeMcpServices: vi.fn((existing, incoming, strategy) => ({
    merged: strategy === 'replace' ? incoming : { ...existing, ...incoming },
    conflicts: [],
  })),
  mergeProfiles: vi.fn((existing, incoming, strategy) => ({
    merged: strategy === 'replace' ? incoming : { ...existing, ...incoming },
    conflicts: [],
  })),
}))

vi.mock('node:fs', () => ({
  mkdirSync: vi.fn(),
  rmSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(() => '{}'),
}))

vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/Users/test'),
}))

vi.mock('fs-extra', () => ({
  readdirSync: vi.fn(() => ['settings.json', 'workflows/agent.json']),
}))

describe('importer module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('executeImport()', () => {
    it('should execute import successfully with minimal options', async () => {
      const options: ImportOptions = {
        packagePath: '/test/test-package.zip',
        mergeStrategy: 'merge',
        importSensitive: false,
        backup: true,
      }

      const result = await executeImport(options)

      expect(result.success).toBe(true)
      expect(result.fileCount).toBe(1)
      expect(result.backupPath).toBeDefined()
      expect(result.rollbackAvailable).toBe(true)
    })

    it('should execute import with progress callback', async () => {
      const options: ImportOptions = {
        packagePath: '/test/test-package.zip',
        mergeStrategy: 'merge',
        importSensitive: false,
        backup: true,
      }

      const progressSteps: any[] = []
      const progressCallback: ProgressCallback = (update) => {
        progressSteps.push(update)
      }

      const result = await executeImport(options, progressCallback)

      expect(result.success).toBe(true)
      expect(progressSteps.length).toBeGreaterThan(0)
      expect(progressSteps[0].step).toBe('Validating package')
      expect(progressSteps[progressSteps.length - 1].step).toBe('Import complete')
      expect(progressSteps[progressSteps.length - 1].progress).toBe(100)
    })

    it('should handle package validation failure', async () => {
      const options: ImportOptions = {
        packagePath: '/test/invalid-package.zip',
        mergeStrategy: 'merge',
        importSensitive: false,
        backup: true,
      }

      const result = await executeImport(options)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Package validation failed')
    })

    it('should create backup before import', async () => {
      const { backupExistingConfig } = await import('../../../../src/utils/config')

      const options: ImportOptions = {
        packagePath: '/test/test-package.zip',
        mergeStrategy: 'merge',
        backup: true,
        importSensitive: false,
      }

      const result = await executeImport(options)

      expect(result.success).toBe(true)
      expect(backupExistingConfig).toHaveBeenCalled()
      expect(result.backupPath).toBeDefined()
    })

    it('should skip backup when backup option is false', async () => {
      const { backupExistingConfig } = await import('../../../../src/utils/config')

      const options: ImportOptions = {
        packagePath: '/test/test-package.zip',
        mergeStrategy: 'merge',
        backup: false,
        importSensitive: false,
      }

      const result = await executeImport(options)

      expect(result.success).toBe(true)
      expect(backupExistingConfig).not.toHaveBeenCalled()
      expect(result.backupPath).toBeUndefined()
    })

    it('should handle merge strategy correctly', async () => {
      const { mergeConfigs } = await import('../../../../src/utils/export-import/merger')

      const options: ImportOptions = {
        packagePath: '/test/test-package.zip',
        mergeStrategy: 'merge',
        importSensitive: false,
        backup: true,
      }

      const result = await executeImport(options)

      expect(result.success).toBe(true)
      expect(mergeConfigs).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        'merge',
      )
    })

    it('should handle replace strategy correctly', async () => {
      const { writeFile } = await import('../../../../src/utils/fs-operations')

      const options: ImportOptions = {
        packagePath: '/test/test-package.zip',
        mergeStrategy: 'replace',
        importSensitive: false,
        backup: true,
      }

      const result = await executeImport(options)

      expect(result.success).toBe(true)
      // In replace mode, files are written directly without calling mergeConfigs
      expect(writeFile).toHaveBeenCalled()
    })

    it('should handle skip-existing strategy correctly', async () => {
      const { mergeConfigs } = await import('../../../../src/utils/export-import/merger')

      const options: ImportOptions = {
        packagePath: '/test/test-package.zip',
        mergeStrategy: 'skip-existing',
        importSensitive: false,
        backup: true,
      }

      const result = await executeImport(options)

      expect(result.success).toBe(true)
      expect(mergeConfigs).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        'skip-existing',
      )
    })

    it('should extract package to temporary directory', async () => {
      const { extractZipPackage } = await import('../../../../src/utils/export-import/core')
      const { mkdirSync } = await import('node:fs')

      const options: ImportOptions = {
        packagePath: '/test/test-package.zip',
        mergeStrategy: 'merge',
        importSensitive: false,
        backup: true,
      }

      await executeImport(options)

      expect(mkdirSync).toHaveBeenCalled()
      expect(extractZipPackage).toHaveBeenCalledWith(
        '/test/test-package.zip',
        expect.stringContaining('.zcf-temp/import-'),
      )
    })

    it('should adapt paths for cross-platform compatibility', async () => {
      const { adaptConfigPaths } = await import('../../../../src/utils/export-import/path-adapter')

      const options: ImportOptions = {
        packagePath: '/test/test-package.zip',
        mergeStrategy: 'merge',
        importSensitive: false,
        backup: true,
      }

      await executeImport(options)

      expect(adaptConfigPaths).toHaveBeenCalled()
    })

    it('should detect and resolve conflicts', async () => {
      const options: ImportOptions = {
        packagePath: '/test/test-package.zip',
        mergeStrategy: 'merge',
        importSensitive: false,
        backup: true,
      }

      const result = await executeImport(options)

      expect(result.success).toBe(true)
      expect(result.resolvedConflicts).toBeDefined()
      expect(Array.isArray(result.resolvedConflicts)).toBe(true)
    })

    it('should handle import errors with rollback', async () => {
      const { backupExistingConfig } = await import('../../../../src/utils/config')
      const { extractZipPackage } = await import('../../../../src/utils/export-import/core')

      vi.mocked(backupExistingConfig).mockReturnValueOnce('/Users/test/.claude/backup/test-backup')
      vi.mocked(extractZipPackage).mockImplementationOnce(() => {
        throw new Error('Extraction failed')
      })

      const options: ImportOptions = {
        packagePath: '/test/test-package.zip',
        mergeStrategy: 'merge',
        backup: true,
        importSensitive: false,
      }

      const result = await executeImport(options)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Extraction failed')
      expect(result.warnings).toContain('Import failed but successfully rolled back to backup')
    })

    it('should handle rollback failure', async () => {
      const { backupExistingConfig } = await import('../../../../src/utils/config')
      const { extractZipPackage } = await import('../../../../src/utils/export-import/core')
      const { exists } = await import('../../../../src/utils/fs-operations')

      vi.mocked(backupExistingConfig).mockReturnValueOnce('/Users/test/.claude/backup/test-backup')
      vi.mocked(extractZipPackage).mockImplementationOnce(() => {
        throw new Error('Extraction failed')
      })
      vi.mocked(exists).mockReturnValueOnce(false) // Backup not found

      const options: ImportOptions = {
        packagePath: '/test/test-package.zip',
        mergeStrategy: 'merge',
        backup: true,
        importSensitive: false,
      }

      const result = await executeImport(options)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Extraction failed')
      expect(result.warnings!.some(w => w.includes('Rollback also failed'))).toBe(true)
    })

    it('should cleanup temp directory on success', async () => {
      const { rmSync } = await import('node:fs')

      const options: ImportOptions = {
        packagePath: '/test/test-package.zip',
        mergeStrategy: 'merge',
        importSensitive: false,
        backup: true,
      }

      await executeImport(options)

      expect(rmSync).toHaveBeenCalled()
    })

    it('should cleanup temp directory on failure', async () => {
      const { rmSync } = await import('node:fs')
      const { extractZipPackage } = await import('../../../../src/utils/export-import/core')

      vi.mocked(extractZipPackage).mockImplementationOnce(() => {
        throw new Error('Test error')
      })

      const options: ImportOptions = {
        packagePath: '/test/test-package.zip',
        mergeStrategy: 'merge',
        backup: false,
        importSensitive: false,
      }

      await executeImport(options)

      expect(rmSync).toHaveBeenCalled()
    })

    it('should handle cleanup errors gracefully', async () => {
      const { rmSync } = await import('node:fs')

      vi.mocked(rmSync).mockImplementationOnce(() => {
        throw new Error('Cleanup failed')
      })

      const options: ImportOptions = {
        packagePath: '/test/test-package.zip',
        mergeStrategy: 'merge',
        importSensitive: false,
        backup: true,
      }

      // Should not throw despite cleanup failure
      const result = await executeImport(options)
      expect(result.success).toBe(true)
    })

    it('should track progress through all stages', async () => {
      const options: ImportOptions = {
        packagePath: '/test/test-package.zip',
        mergeStrategy: 'merge',
        importSensitive: false,
        backup: true,
      }

      const progressUpdates: any[] = []
      const callback: ProgressCallback = (update) => {
        progressUpdates.push(update)
      }

      await executeImport(options, callback)

      const stages = progressUpdates.map(u => u.step)
      expect(stages).toContain('Validating package')
      expect(stages).toContain('Creating backup')
      expect(stages).toContain('Extracting package')
      expect(stages).toContain('Adapting paths')
      expect(stages).toContain('Detecting conflicts')
      expect(stages).toContain('Applying configurations')
      expect(stages).toContain('Import complete')
    })

    it('should handle validation warnings', async () => {
      const { validatePackage } = await import('../../../../src/utils/export-import/validator')

      vi.mocked(validatePackage).mockReturnValueOnce({
        valid: true,
        metadata: {
          version: '1.0.0',
          exportDate: '2025-01-05T00:00:00.000Z',
          createdAt: '2025-01-05T00:00:00.000Z',
          platform: 'darwin',
          codeType: 'claude-code',
          scope: ['settings'],
          hasSensitiveData: false,
          files: [
            {
              path: 'configs/claude-code/settings.json',
              type: 'settings',
              checksum: 'abc123',
              size: 256,
            },
          ],
          description: 'Test export',
          tags: ['claude-code', 'settings'],
        } as ExportMetadata,
        errors: [],
        warnings: [{ code: 'PLATFORM_MISMATCH', message: 'Platform mismatch detected' }],
      })

      const options: ImportOptions = {
        packagePath: '/test/test-package.zip',
        mergeStrategy: 'merge',
        importSensitive: false,
        backup: true,
      }

      const result = await executeImport(options)

      expect(result.success).toBe(true)
      expect(result.warnings).toContain('Platform mismatch detected')
    })

    it('should handle path adaptation warnings', async () => {
      const { adaptConfigPaths } = await import('../../../../src/utils/export-import/path-adapter')

      vi.mocked(adaptConfigPaths).mockReturnValueOnce({
        adaptedConfig: {},
        mappings: [],
        warnings: ['Path adaptation warning'],
      })

      const options: ImportOptions = {
        packagePath: '/test/test-package.zip',
        mergeStrategy: 'merge',
        importSensitive: false,
        backup: true,
      }

      const result = await executeImport(options)

      expect(result.success).toBe(true)
      expect(result.warnings).toContain('Path adaptation warning')
    })

    it('should handle MCP configurations specially', async () => {
      const { validatePackage } = await import('../../../../src/utils/export-import/validator')
      const { mergeMcpServices } = await import('../../../../src/utils/export-import/merger')

      vi.mocked(validatePackage).mockReturnValueOnce({
        valid: true,
        metadata: {
          version: '1.0.0',
          exportDate: '2025-01-05T00:00:00.000Z',
          createdAt: '2025-01-05T00:00:00.000Z',
          platform: 'darwin',
          codeType: 'claude-code',
          scope: ['mcp'],
          hasSensitiveData: false,
          files: [
            {
              path: 'configs/claude-code/mcp-settings.json',
              type: 'mcp',
              checksum: 'mcp123',
              size: 512,
            },
          ],
          description: 'MCP export',
          tags: ['claude-code', 'mcp'],
        } as ExportMetadata,
        errors: [],
        warnings: [],
      })

      const options: ImportOptions = {
        packagePath: '/test/test-package.zip',
        mergeStrategy: 'merge',
        importSensitive: false,
        backup: true,
      }

      await executeImport(options)

      expect(mergeMcpServices).toHaveBeenCalled()
    })

    it('should handle profile configurations specially', async () => {
      const { validatePackage } = await import('../../../../src/utils/export-import/validator')
      const { mergeProfiles } = await import('../../../../src/utils/export-import/merger')
      const { exists } = await import('../../../../src/utils/fs-operations')

      vi.mocked(validatePackage).mockReturnValueOnce({
        valid: true,
        metadata: {
          version: '1.0.0',
          exportDate: '2025-01-05T00:00:00.000Z',
          createdAt: '2025-01-05T00:00:00.000Z',
          platform: 'darwin',
          codeType: 'claude-code',
          scope: ['settings'],
          hasSensitiveData: false,
          files: [
            {
              path: 'configs/claude-code/zcf-config.json',
              type: 'settings',
              checksum: 'profile123',
              size: 256,
            },
          ],
          description: 'Profile export',
          tags: ['claude-code', 'settings'],
        } as ExportMetadata,
        errors: [],
        warnings: [],
      })

      // Ensure target file exists to trigger merge logic
      vi.mocked(exists).mockImplementation((path: string) => {
        if (path.includes('test-package.zip'))
          return true
        if (path.includes('backup'))
          return true
        if (path.includes('.zcf-temp'))
          return true
        // Target zcf-config.json file must exist to trigger mergeProfiles
        if (path.includes('zcf-config.json'))
          return true
        return false
      })

      const options: ImportOptions = {
        packagePath: '/test/test-package.zip',
        mergeStrategy: 'merge',
        importSensitive: false,
        backup: true,
      }

      await executeImport(options)

      expect(mergeProfiles).toHaveBeenCalled()
    })

    it('should write new files when they do not exist', async () => {
      const { exists, writeFile } = await import('../../../../src/utils/fs-operations')

      vi.mocked(exists).mockImplementation((path: string) => {
        if (path.includes('test-package.zip'))
          return true
        if (path.includes('backup'))
          return true
        // Extracted files in temp directory must exist
        if (path.includes('.zcf-temp'))
          return true
        // Target files don't exist (to trigger new file creation)
        if (path.includes('.claude/settings.json'))
          return false
        if (path.includes('.codex/settings.json'))
          return false
        return false
      })

      const options: ImportOptions = {
        packagePath: '/test/test-package.zip',
        mergeStrategy: 'merge',
        importSensitive: false,
        backup: true,
      }

      await executeImport(options)

      expect(writeFile).toHaveBeenCalled()
    })

    it('should handle import without sensitive data flag', async () => {
      const options: ImportOptions = {
        packagePath: '/test/test-package.zip',
        mergeStrategy: 'merge',
        importSensitive: false,
        backup: true,
      }

      const result = await executeImport(options)

      expect(result.success).toBe(true)
    })

    it('should handle import with sensitive data flag', async () => {
      const options: ImportOptions = {
        packagePath: '/test/test-package.zip',
        mergeStrategy: 'merge',
        importSensitive: true,
        backup: true,
      }

      const result = await executeImport(options)

      expect(result.success).toBe(true)
    })

    it('should handle Codex import', async () => {
      const { validatePackage } = await import('../../../../src/utils/export-import/validator')

      vi.mocked(validatePackage).mockReturnValueOnce({
        valid: true,
        metadata: {
          version: '1.0.0',
          exportDate: '2025-01-05T00:00:00.000Z',
          createdAt: '2025-01-05T00:00:00.000Z',
          platform: 'darwin',
          codeType: 'codex',
          scope: ['settings'],
          hasSensitiveData: false,
          files: [
            {
              path: 'configs/codex/settings.json',
              type: 'settings',
              checksum: 'codex123',
              size: 256,
            },
          ],
          description: 'Codex export',
          tags: ['codex', 'settings'],
        } as ExportMetadata,
        errors: [],
        warnings: [],
      })

      const options: ImportOptions = {
        packagePath: '/test/codex-package.zip',
        mergeStrategy: 'merge',
        importSensitive: false,
        backup: true,
      }

      const result = await executeImport(options)

      expect(result.success).toBe(true)
    })

    it('should handle missing files in package', async () => {
      const { exists } = await import('../../../../src/utils/fs-operations')

      vi.mocked(exists).mockImplementation((path: string) => {
        if (path.includes('test-package.zip'))
          return true
        if (path.includes('backup'))
          return true
        if (path.includes('.zcf-temp'))
          return false // File not found in extracted directory
        return false
      })

      const options: ImportOptions = {
        packagePath: '/test/test-package.zip',
        mergeStrategy: 'merge',
        importSensitive: false,
        backup: true,
      }

      const result = await executeImport(options)

      expect(result.success).toBe(true)
      expect(result.warnings!.some(w => w.includes('File not found'))).toBe(true)
    })

    it('should handle JSON parsing errors gracefully', async () => {
      const { readFile, exists } = await import('../../../../src/utils/fs-operations')

      // Ensure extraction directory files exist
      vi.mocked(exists).mockImplementation((_path: string) => {
        return true // All files exist
      })

      // Mock readFile to return invalid JSON for extracted files in temp directory
      vi.mocked(readFile).mockImplementation((path: string) => {
        // For extracted files in temp directory, return invalid JSON
        if (path.includes('.zcf-temp') && path.includes('.json')) {
          return 'invalid json {{{'
        }
        // For target files, return valid content
        if (path.includes('.claude/settings.json')) {
          return JSON.stringify({
            apiKey: 'existing-key',
            model: 'claude-sonnet-4',
          })
        }
        return '{}'
      })

      const options: ImportOptions = {
        packagePath: '/test/test-package.zip',
        mergeStrategy: 'merge',
        importSensitive: false,
        backup: true,
      }

      const result = await executeImport(options)

      expect(result.success).toBe(true)
      expect(result.warnings).toBeDefined()
      expect(result.warnings!.some(w => w.includes('Failed to parse'))).toBe(true)
    })

    it('should handle non-JSON files', async () => {
      const { validatePackage } = await import('../../../../src/utils/export-import/validator')
      const { writeFile, exists } = await import('../../../../src/utils/fs-operations')

      vi.mocked(validatePackage).mockReturnValueOnce({
        valid: true,
        metadata: {
          version: '1.0.0',
          exportDate: '2025-01-05T00:00:00.000Z',
          createdAt: '2025-01-05T00:00:00.000Z',
          platform: 'darwin',
          codeType: 'claude-code',
          scope: ['settings'],
          hasSensitiveData: false,
          files: [
            {
              path: 'configs/claude-code/CLAUDE.md',
              type: 'settings',
              checksum: 'md123',
              size: 1024,
            },
          ],
          description: 'Markdown export',
          tags: ['claude-code', 'custom'],
        } as ExportMetadata,
        errors: [],
        warnings: [],
      })

      // Ensure all files exist including extracted markdown files
      vi.mocked(exists).mockImplementation((path: string) => {
        if (path.includes('test-package.zip'))
          return true
        if (path.includes('backup'))
          return true
        if (path.includes('.zcf-temp'))
          return true
        if (path.includes('CLAUDE.md'))
          return true
        return false
      })

      const options: ImportOptions = {
        packagePath: '/test/test-package.zip',
        mergeStrategy: 'merge',
        importSensitive: false,
        backup: true,
      }

      await executeImport(options)

      expect(writeFile).toHaveBeenCalled()
    })
  })

  describe('getImportSummary()', () => {
    it('should return import summary with metadata', () => {
      const summary = getImportSummary('/test/test-package.zip')

      expect(summary).toBeDefined()
      expect(summary.metadata).toBeDefined()
      expect(summary.validation).toBeDefined()
      expect(summary.validation.valid).toBe(true)
    })

    it('should return validation errors for invalid package', () => {
      const summary = getImportSummary('/test/invalid-package.zip')

      expect(summary.validation.valid).toBe(false)
      expect(summary.validation.errors).toHaveLength(1)
      expect(summary.metadata).toBeUndefined()
    })

    it('should include metadata for valid package', () => {
      const summary = getImportSummary('/test/test-package.zip')

      expect(summary.metadata).toBeDefined()
      expect(summary.metadata!.codeType).toBe('claude-code')
      expect(summary.metadata!.files).toHaveLength(1)
    })

    it('should initialize conflicts as empty array', () => {
      const summary = getImportSummary('/test/test-package.zip')

      expect(summary.conflicts).toBeDefined()
      expect(Array.isArray(summary.conflicts)).toBe(true)
      expect(summary.conflicts).toHaveLength(0)
    })
  })
})
