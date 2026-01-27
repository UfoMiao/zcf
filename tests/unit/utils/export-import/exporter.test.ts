/**
 * Comprehensive test suite for export-import exporter module
 *
 * Tests cover:
 * - executeExport() - Main export operation with progress tracking
 * - getExportSummary() - Export preview and file collection
 * - validateExportOptions() - Export options validation
 * - Progress callback functionality
 * - Error handling and recovery
 * - Package creation and verification
 * - File sanitization integration
 * - Cross-platform compatibility
 */

import type { ExportOptions, ProgressCallback } from '../../../../src/types/export-import'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { executeExport, getExportSummary, validateExportOptions } from '../../../../src/utils/export-import/exporter'

// Mock dependencies
vi.mock('../../../../src/utils/fs-operations', () => ({
  exists: vi.fn((path: string) => {
    // Handle original paths
    if (path.includes('settings.json'))
      return true
    if (path.includes('zcf-config.toml'))
      return true
    if (path.includes('.claude/skills'))
      return true
    // Handle export package paths (dynamically generated)
    if (path.includes('zcf-export-') && path.endsWith('.zip'))
      return true
    if (path.includes('test-export.zip'))
      return true
    return false
  }),
  readFile: vi.fn((path: string) => {
    if (path.includes('settings.json')) {
      return JSON.stringify({
        apiKey: 'test-api-key',
        model: 'claude-sonnet-4',
      })
    }
    if (path.includes('zcf-config.toml')) {
      return 'version = "3.4.3"\napi_key = "test-key"'
    }
    return '{}'
  }),
  writeFile: vi.fn(),
}))

vi.mock('../../../../src/utils/export-import/collector', () => ({
  collectClaudeCodeConfig: vi.fn(() => [
    {
      path: 'configs/claude-code/settings.json',
      type: 'settings',
      originalPath: '/Users/test/.claude/settings.json',
      checksum: 'abc123',
      size: 1024,
    },
  ]),
  collectCodexConfig: vi.fn(() => [
    {
      path: 'configs/codex/settings.json',
      type: 'settings',
      originalPath: '/Users/test/.codex/settings.json',
      checksum: 'def456',
      size: 1024,
    },
  ]),
  collectAllConfig: vi.fn(() => [
    {
      path: 'configs/claude-code/settings.json',
      type: 'settings',
      originalPath: '/Users/test/.claude/settings.json',
      checksum: 'abc123',
      size: 1024,
    },
    {
      path: 'configs/codex/settings.json',
      type: 'settings',
      originalPath: '/Users/test/.codex/settings.json',
      checksum: 'def456',
      size: 1024,
    },
  ]),
  collectCustomFiles: vi.fn((items: string[]) => items.map(item => ({
    path: `custom/${item}`,
    type: 'custom',
    originalPath: `/Users/test/.claude/${item}`,
    checksum: 'custom123',
    size: 1024,
  }))),
  getCollectionSummary: vi.fn((files) => {
    // Dynamically count files by type
    const byType: Record<string, number> = {}
    for (const file of files) {
      byType[file.type] = (byType[file.type] || 0) + 1
    }

    return {
      total: files.length,
      byType,
      codeTypes: ['claude-code'],
    }
  }),
}))

vi.mock('../../../../src/utils/export-import/sanitizer', () => ({
  sanitizeFile: vi.fn((fileInfo, content) => ({
    fileInfo: {
      ...fileInfo,
      hasSensitiveData: content.includes('api') || content.includes('key'),
    },
    content: content.replace(/api[Kk]ey["\s:]*["'][^"']+["']/g, 'apiKey: "***REDACTED_API_KEY***"'),
  })),
}))

vi.mock('../../../../src/utils/export-import/manifest', () => ({
  createManifest: vi.fn(options => ({
    version: '1.0.0',
    createdAt: '2025-01-05T00:00:00.000Z',
    platform: 'darwin',
    codeType: options.codeType,
    scope: options.scope,
    files: options.files,
    description: options.description,
    tags: options.tags,
  })),
}))

vi.mock('../../../../src/utils/export-import/core', () => ({
  calculateChecksumFromContent: vi.fn(content => `checksum-${content.length}`),
  createZipPackage: vi.fn((_files, _manifest, outputPath) => outputPath),
  validateZipFormat: vi.fn(() => true),
}))

vi.mock('node:fs', () => ({
  mkdirSync: vi.fn(),
  rmSync: vi.fn(),
  writeFileSync: vi.fn(),
  statSync: vi.fn(() => ({ size: 1024 })),
}))

vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/Users/test'),
}))

describe('exporter module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('executeExport()', () => {
    it('should execute export successfully with minimal options', async () => {
      const options: ExportOptions = {
        codeType: 'claude-code',
        scope: 'settings',
        includeSensitive: false,
      }

      const result = await executeExport(options)

      expect(result.success).toBe(true)
      expect(result.packagePath).toBeDefined()
      expect(result.fileCount).toBe(1)
      expect(result.packageSize).toBe(1024)
    })

    it('should execute export with progress callback', async () => {
      const options: ExportOptions = {
        codeType: 'claude-code',
        scope: 'all',
        includeSensitive: false,
      }

      const progressSteps: any[] = []
      const progressCallback: ProgressCallback = (update) => {
        progressSteps.push(update)
      }

      const result = await executeExport(options, progressCallback)

      expect(result.success).toBe(true)
      expect(progressSteps.length).toBeGreaterThan(0)
      expect(progressSteps[0].step).toBe('Initializing export')
      expect(progressSteps[progressSteps.length - 1].step).toBe('Export complete')
      expect(progressSteps[progressSteps.length - 1].progress).toBe(100)
    })

    it('should handle export with custom output path', async () => {
      const options: ExportOptions = {
        codeType: 'claude-code',
        scope: 'settings',
        outputPath: '/custom/output/path',
        includeSensitive: false,
      }

      const result = await executeExport(options)

      expect(result.success).toBe(true)
      expect(result.packagePath).toContain('/custom/output/path')
    })

    it('should sanitize sensitive data by default', async () => {
      const options: ExportOptions = {
        codeType: 'claude-code',
        scope: 'settings',
        includeSensitive: false,
      }

      const result = await executeExport(options)

      expect(result.success).toBe(true)
      // Verify sanitizeFile was called
      const { sanitizeFile } = await import('../../../../src/utils/export-import/sanitizer')
      expect(sanitizeFile).toHaveBeenCalled()
    })

    it('should include sensitive data when includeSensitive is true', async () => {
      const options: ExportOptions = {
        codeType: 'claude-code',
        scope: 'settings',
        includeSensitive: true,
      }

      const result = await executeExport(options)

      expect(result.success).toBe(true)
      // Verify sanitizeFile was NOT called
      const { sanitizeFile } = await import('../../../../src/utils/export-import/sanitizer')
      expect(sanitizeFile).not.toHaveBeenCalled()
    })

    it('should handle export for all code types', async () => {
      const options: ExportOptions = {
        codeType: 'all',
        scope: 'all',
        includeSensitive: false,
      }

      const result = await executeExport(options)

      expect(result.success).toBe(true)
      expect(result.fileCount).toBe(2) // Both claude-code and codex
    })

    it('should handle custom scope with custom items', async () => {
      const options: ExportOptions = {
        codeType: 'claude-code',
        scope: 'custom',
        customItems: [
          { type: 'settings' as const, path: 'settings' },
          { type: 'workflows' as const, path: 'workflows/agent.json' },
        ],
        includeSensitive: false,
      }

      const result = await executeExport(options)

      expect(result.success).toBe(true)
      expect(result.fileCount).toBe(2)
    })

    it('should return error when no files found', async () => {
      const { collectClaudeCodeConfig } = await import('../../../../src/utils/export-import/collector')
      vi.mocked(collectClaudeCodeConfig).mockReturnValueOnce([])

      const options: ExportOptions = {
        codeType: 'claude-code',
        scope: 'settings',
        includeSensitive: false,
      }

      const result = await executeExport(options)

      expect(result.success).toBe(false)
      expect(result.error).toBe('No configuration files found to export')
    })

    it('should handle package verification failure', async () => {
      const { exists } = await import('../../../../src/utils/fs-operations')
      // Mock exists to return false only for the package file check
      // First calls are for original files (should return true)
      // Last call is for package verification (should return false)
      vi.mocked(exists).mockImplementation((path: string) => {
        // Original source files exist
        if (path.includes('settings.json') || path.includes('zcf-config.toml'))
          return true
        // But the created package doesn't exist (verification fails)
        if (path.includes('zcf-export-') && path.endsWith('.zip'))
          return false
        return false
      })

      const options: ExportOptions = {
        codeType: 'claude-code',
        scope: 'settings',
        includeSensitive: false,
      }

      const result = await executeExport(options)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Package file was not created')
    })

    it('should handle invalid zip format', async () => {
      const { validateZipFormat } = await import('../../../../src/utils/export-import/core')
      const { exists } = await import('../../../../src/utils/fs-operations')

      // Ensure package file exists but is invalid format
      vi.mocked(exists).mockImplementation((_path: string) => {
        // All files should exist
        return true
      })
      vi.mocked(validateZipFormat).mockReturnValueOnce(false)

      const options: ExportOptions = {
        codeType: 'claude-code',
        scope: 'settings',
        includeSensitive: false,
      }

      const result = await executeExport(options)

      expect(result.success).toBe(false)
      expect(result.error).toContain('not a valid zip package')
    })

    it('should handle export errors gracefully', async () => {
      const { collectClaudeCodeConfig } = await import('../../../../src/utils/export-import/collector')
      vi.mocked(collectClaudeCodeConfig).mockImplementationOnce(() => {
        throw new Error('Collection failed')
      })

      const options: ExportOptions = {
        codeType: 'claude-code',
        scope: 'settings',
        includeSensitive: false,
      }

      const result = await executeExport(options)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Collection failed')
    })

    it('should track progress through all stages', async () => {
      const options: ExportOptions = {
        codeType: 'claude-code',
        scope: 'all',
        includeSensitive: false,
      }

      const progressUpdates: any[] = []
      const callback: ProgressCallback = (update) => {
        progressUpdates.push(update)
      }

      await executeExport(options, callback)

      const stages = progressUpdates.map(u => u.step)
      expect(stages).toContain('Initializing export')
      expect(stages).toContain('Collecting configuration files')
      expect(stages).toContain('Processing files')
      expect(stages).toContain('Creating manifest')
      expect(stages).toContain('Creating export package')
      expect(stages).toContain('Verifying package')
      expect(stages).toContain('Export complete')
    })

    it('should process multiple files with progress tracking', async () => {
      const { collectClaudeCodeConfig } = await import('../../../../src/utils/export-import/collector')
      const { exists } = await import('../../../../src/utils/fs-operations')

      // Mock exists to return true for all files
      vi.mocked(exists).mockImplementation(() => true)

      vi.mocked(collectClaudeCodeConfig).mockReturnValueOnce([
        {
          path: 'configs/claude-code/settings.json',
          type: 'settings',
          originalPath: '/Users/test/.claude/settings.json',
          checksum: 'abc1',
          size: 1024,
        },
        {
          path: 'configs/claude-code/zcf-config.toml',
          type: 'settings',
          originalPath: '/Users/test/.claude/zcf-config.toml',
          checksum: 'abc2',
          size: 1024,
        },
        {
          path: 'configs/claude-code/skills/skill1.json',
          type: 'skills',
          originalPath: '/Users/test/.claude/skills/skill1.json',
          checksum: 'abc3',
          size: 1024,
        },
      ])

      const options: ExportOptions = {
        codeType: 'claude-code',
        scope: 'all',
        includeSensitive: false,
      }

      const progressUpdates: any[] = []
      const callback: ProgressCallback = (update) => {
        if (update.step === 'Processing files' && update.total !== undefined) {
          progressUpdates.push(update)
        }
      }

      const result = await executeExport(options, callback)

      expect(result.success).toBe(true)
      expect(result.fileCount).toBe(3)
      expect(progressUpdates.length).toBeGreaterThan(0)
      expect(progressUpdates[progressUpdates.length - 1].completed).toBe(3)
    })

    it('should handle Codex export', async () => {
      const { exists } = await import('../../../../src/utils/fs-operations')

      // Mock exists to return true for all files
      vi.mocked(exists).mockImplementation(() => true)

      const options: ExportOptions = {
        codeType: 'codex',
        scope: 'settings',
        includeSensitive: false,
      }

      const result = await executeExport(options)

      expect(result.success).toBe(true)
      const { collectCodexConfig } = await import('../../../../src/utils/export-import/collector')
      expect(collectCodexConfig).toHaveBeenCalled()
    })

    it('should cleanup temp directory on success', async () => {
      const { rmSync } = await import('node:fs')

      const options: ExportOptions = {
        codeType: 'claude-code',
        scope: 'settings',
        includeSensitive: false,
      }

      await executeExport(options)

      expect(rmSync).toHaveBeenCalled()
    })

    it('should cleanup temp directory on failure', async () => {
      const { rmSync } = await import('node:fs')
      const { createZipPackage } = await import('../../../../src/utils/export-import/core')
      // Simulate failure during package creation (after temp directory is created)
      vi.mocked(createZipPackage).mockImplementationOnce(() => {
        throw new Error('Zip creation failed')
      })

      const options: ExportOptions = {
        codeType: 'claude-code',
        scope: 'settings',
        includeSensitive: false,
      }

      await executeExport(options)

      // Cleanup should still be called in finally block
      expect(rmSync).toHaveBeenCalled()
    })

    it('should handle cleanup errors gracefully', async () => {
      const { rmSync } = await import('node:fs')
      const { exists } = await import('../../../../src/utils/fs-operations')

      // Mock exists to return true for all files
      vi.mocked(exists).mockImplementation(() => true)

      // Mock rmSync to throw error but not affect export success
      vi.mocked(rmSync).mockImplementationOnce(() => {
        throw new Error('Cleanup failed')
      })

      const options: ExportOptions = {
        codeType: 'claude-code',
        scope: 'settings',
        includeSensitive: false,
      }

      // Should not throw despite cleanup failure
      const result = await executeExport(options)
      expect(result.success).toBe(true)
    })
  })

  describe('getExportSummary()', () => {
    it('should return export summary with file list', () => {
      const options: ExportOptions = {
        codeType: 'claude-code',
        scope: 'settings',
        includeSensitive: false,
      }

      const summary = getExportSummary(options)

      expect(summary).toBeDefined()
      expect(summary.files).toHaveLength(1)
      expect(summary.summary.total).toBe(1)
      expect(summary.summary.codeTypes).toContain('claude-code')
    })

    it('should summarize multiple files by type', async () => {
      const { collectClaudeCodeConfig } = await import('../../../../src/utils/export-import/collector')
      vi.mocked(collectClaudeCodeConfig).mockReturnValueOnce([
        { path: 'settings.json', type: 'settings', originalPath: '/test/settings.json', checksum: 'a', size: 1024 },
        { path: 'workflow1.json', type: 'workflows', originalPath: '/test/workflow1.json', checksum: 'b', size: 1024 },
        { path: 'workflow2.json', type: 'workflows', originalPath: '/test/workflow2.json', checksum: 'c', size: 1024 },
      ])

      const options: ExportOptions = {
        codeType: 'claude-code',
        scope: 'all',
        includeSensitive: false,
      }

      const summary = getExportSummary(options)

      expect(summary.summary.total).toBe(3)
      expect(summary.summary.byType).toHaveProperty('settings')
      expect(summary.summary.byType).toHaveProperty('workflows')
    })

    it('should handle custom scope in summary', () => {
      const options: ExportOptions = {
        codeType: 'claude-code',
        scope: 'custom',
        customItems: [
          { type: 'settings' as const, path: 'file1' },
          { type: 'workflows' as const, path: 'file2' },
          { type: 'skills' as const, path: 'file3' },
        ],
        includeSensitive: false,
      }

      const summary = getExportSummary(options)

      expect(summary.files).toHaveLength(3)
      expect(summary.summary.total).toBe(3)
    })

    it('should handle all code types in summary', () => {
      const options: ExportOptions = {
        codeType: 'all',
        scope: 'all',
        includeSensitive: false,
      }

      const summary = getExportSummary(options)

      expect(summary.files).toHaveLength(2)
      expect(summary.summary.total).toBe(2)
    })
  })

  describe('validateExportOptions()', () => {
    it('should validate complete options', () => {
      const options: ExportOptions = {
        codeType: 'claude-code',
        scope: 'settings',
        includeSensitive: false,
      }

      const validation = validateExportOptions(options)

      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should reject missing code type', () => {
      const options = {
        scope: 'settings',
      } as any

      const validation = validateExportOptions(options)

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Code type is required')
    })

    it('should reject missing scope', () => {
      const options = {
        codeType: 'claude-code',
      } as any

      const validation = validateExportOptions(options)

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Export scope is required')
    })

    it('should reject custom scope without custom items', () => {
      const options: ExportOptions = {
        codeType: 'claude-code',
        scope: 'custom',
        includeSensitive: false,
      }

      const validation = validateExportOptions(options)

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Custom items are required when scope is "custom"')
    })

    it('should reject custom scope with empty custom items', () => {
      const options: ExportOptions = {
        codeType: 'claude-code',
        scope: 'custom',
        customItems: [],
        includeSensitive: false,
      }

      const validation = validateExportOptions(options)

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Custom items are required when scope is "custom"')
    })

    it('should accept custom scope with valid custom items', () => {
      const options: ExportOptions = {
        codeType: 'claude-code',
        scope: 'custom',
        customItems: [
          { type: 'settings' as const, path: 'file1' },
          { type: 'workflows' as const, path: 'file2' },
        ],
        includeSensitive: false,
      }

      const validation = validateExportOptions(options)

      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should accumulate multiple validation errors', () => {
      const options = {} as any

      const validation = validateExportOptions(options)

      expect(validation.valid).toBe(false)
      expect(validation.errors.length).toBeGreaterThanOrEqual(2)
      expect(validation.errors).toContain('Code type is required')
      expect(validation.errors).toContain('Export scope is required')
    })
  })
})
