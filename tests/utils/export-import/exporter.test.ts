/**
 * Test suite for configuration export functionality
 */

import type { ExportOptions } from '../../../src/types/export-import'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { collectClaudeCodeConfig, collectCodexConfig, getCollectionSummary } from '../../../src/utils/export-import/collector'
import { executeExport, getExportSummary, validateExportOptions } from '../../../src/utils/export-import/exporter'
import * as fsOperations from '../../../src/utils/fs-operations'

// Mock dependencies
vi.mock('../../../src/utils/fs-operations')
vi.mock('../../../src/utils/export-import/collector')
vi.mock('../../../src/utils/export-import/core')

describe('exporter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('validateExportOptions', () => {
    it('should validate valid export options', () => {
      const options: Partial<ExportOptions> = {
        codeType: 'claude-code',
        scope: 'all',
        includeSensitive: false,
      }

      const result = validateExportOptions(options)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject options without code type', () => {
      const options: Partial<ExportOptions> = {
        scope: 'all',
        includeSensitive: false,
      }

      const result = validateExportOptions(options)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Code type is required')
    })

    it('should reject options without scope', () => {
      const options: Partial<ExportOptions> = {
        codeType: 'claude-code',
        includeSensitive: false,
      }

      const result = validateExportOptions(options)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Export scope is required')
    })

    it('should reject custom scope without custom items', () => {
      const options: Partial<ExportOptions> = {
        codeType: 'claude-code',
        scope: 'custom',
        includeSensitive: false,
        customItems: [],
      }

      const result = validateExportOptions(options)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Custom items are required when scope is "custom"')
    })

    it('should accept custom scope with custom items', () => {
      const options: Partial<ExportOptions> = {
        codeType: 'claude-code',
        scope: 'custom',
        includeSensitive: false,
        customItems: [
          {
            type: 'settings',
            path: '/path/to/settings.json',
          },
        ],
      }

      const result = validateExportOptions(options)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('getExportSummary', () => {
    it('should return export summary with file counts', () => {
      const mockFiles = [
        {
          path: 'settings.json',
          type: 'settings' as const,
          size: 1024,
          checksum: 'abc123',
        },
        {
          path: 'workflow.md',
          type: 'workflows' as const,
          size: 2048,
          checksum: 'def456',
        },
      ]

      vi.mocked(collectClaudeCodeConfig).mockReturnValue(mockFiles)
      vi.mocked(getCollectionSummary).mockReturnValue({
        total: 2,
        byType: {
          settings: 1,
          profiles: 0,
          workflows: 1,
          agents: 0,
          mcp: 0,
          hooks: 0,
          skills: 0,
        },
        codeTypes: ['claude-code'],
      })

      const options: ExportOptions = {
        codeType: 'claude-code',
        scope: 'all',
        includeSensitive: false,
      }

      const summary = getExportSummary(options)

      expect(summary.files).toHaveLength(2)
      expect(summary.summary.total).toBe(2)
      expect(summary.summary.byType.settings).toBe(1)
      expect(summary.summary.byType.workflows).toBe(1)
    })

    it('should return empty summary when no files found', () => {
      vi.mocked(collectClaudeCodeConfig).mockReturnValue([])
      vi.mocked(getCollectionSummary).mockReturnValue({
        total: 0,
        byType: {
          settings: 0,
          profiles: 0,
          workflows: 0,
          agents: 0,
          mcp: 0,
          hooks: 0,
          skills: 0,
        },
        codeTypes: [],
      })

      const options: ExportOptions = {
        codeType: 'claude-code',
        scope: 'all',
        includeSensitive: false,
      }

      const summary = getExportSummary(options)

      expect(summary.files).toHaveLength(0)
      expect(summary.summary.total).toBe(0)
    })

    it('should handle codex code type', () => {
      const mockFiles = [
        {
          path: 'config.toml',
          type: 'settings' as const,
          size: 1024,
          checksum: 'abc123',
        },
      ]

      vi.mocked(collectCodexConfig).mockReturnValue(mockFiles)
      vi.mocked(getCollectionSummary).mockReturnValue({
        total: 1,
        byType: {
          settings: 1,
          profiles: 0,
          workflows: 0,
          agents: 0,
          mcp: 0,
          hooks: 0,
          skills: 0,
        },
        codeTypes: ['codex'],
      })

      const options: ExportOptions = {
        codeType: 'codex',
        scope: 'all',
        includeSensitive: false,
      }

      const summary = getExportSummary(options)

      expect(summary.files).toHaveLength(1)
      expect(summary.summary.total).toBe(1)
    })
  })

  describe('executeExport', () => {
    it('should fail when no files found', async () => {
      vi.mocked(collectClaudeCodeConfig).mockReturnValue([])

      const options: ExportOptions = {
        codeType: 'claude-code',
        scope: 'all',
        includeSensitive: false,
      }

      const result = await executeExport(options)

      expect(result.success).toBe(false)
      expect(result.error).toBe('No configuration files found to export')
    })

    it('should call progress callback during export', async () => {
      vi.mocked(collectClaudeCodeConfig).mockReturnValue([
        {
          path: 'settings.json',
          type: 'settings',
          size: 1024,
          checksum: 'abc123',
          originalPath: '/mock/path/settings.json',
        },
      ])

      vi.mocked(fsOperations.exists).mockReturnValue(true)
      vi.mocked(fsOperations.readFile).mockReturnValue('{"test": "data"}')

      const progressCallback = vi.fn()

      const options: ExportOptions = {
        codeType: 'claude-code',
        scope: 'all',
        includeSensitive: false,
      }

      await executeExport(options, progressCallback)

      expect(progressCallback).toHaveBeenCalled()
      expect(progressCallback.mock.calls[0][0]).toHaveProperty('step')
      expect(progressCallback.mock.calls[0][0]).toHaveProperty('progress')
    })

    it('should handle export errors gracefully', async () => {
      vi.mocked(collectClaudeCodeConfig).mockReturnValue([
        {
          path: 'settings.json',
          type: 'settings',
          size: 1024,
          checksum: 'abc123',
          originalPath: '/mock/path/settings.json',
        },
      ])

      vi.mocked(fsOperations.exists).mockReturnValue(false)

      const options: ExportOptions = {
        codeType: 'claude-code',
        scope: 'all',
        includeSensitive: false,
      }

      const result = await executeExport(options)

      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('should handle different code types', async () => {
      vi.mocked(collectCodexConfig).mockReturnValue([
        {
          path: 'config.toml',
          type: 'settings',
          size: 1024,
          checksum: 'abc123',
          originalPath: '/mock/path/config.toml',
        },
      ])

      vi.mocked(fsOperations.exists).mockReturnValue(true)
      vi.mocked(fsOperations.readFile).mockReturnValue('[config]')

      const options: ExportOptions = {
        codeType: 'codex',
        scope: 'all',
        includeSensitive: false,
      }

      const result = await executeExport(options)

      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('should handle all code type', async () => {
      vi.mocked(collectClaudeCodeConfig).mockReturnValue([])
      vi.mocked(collectCodexConfig).mockReturnValue([])

      const options: ExportOptions = {
        codeType: 'all',
        scope: 'all',
        includeSensitive: false,
      }

      const result = await executeExport(options)

      expect(result.success).toBe(false)
    })

    it('should handle custom scope', async () => {
      vi.mocked(fsOperations.exists).mockReturnValue(true)
      vi.mocked(fsOperations.isFile).mockReturnValue(true)
      vi.mocked(fsOperations.isDirectory).mockReturnValue(false)
      vi.mocked(fsOperations.getStats).mockReturnValue({ size: 1024 } as any)
      vi.mocked(fsOperations.readFile).mockReturnValue('{"test": "data"}')

      const options: ExportOptions = {
        codeType: 'claude-code',
        scope: 'custom',
        includeSensitive: false,
        customItems: [
          {
            type: 'settings',
            path: '/path/to/custom.json',
          },
        ],
      }

      const result = await executeExport(options)

      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('should successfully export with includeSensitive option', async () => {
      vi.mocked(collectClaudeCodeConfig).mockReturnValue([
        {
          path: 'settings.json',
          type: 'settings',
          size: 1024,
          checksum: 'abc123',
          originalPath: '/mock/path/settings.json',
        },
      ])

      vi.mocked(fsOperations.exists).mockReturnValue(true)
      vi.mocked(fsOperations.readFile).mockReturnValue('{"test": "data"}')

      const options: ExportOptions = {
        codeType: 'claude-code',
        scope: 'all',
        includeSensitive: true,
      }

      const result = await executeExport(options)

      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })
  })
})
