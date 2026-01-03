/**
 * Test suite for export command
 */

import inquirer from 'inquirer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { exportCommand } from '../../src/commands/export'
import * as i18n from '../../src/i18n'
import * as exporter from '../../src/utils/export-import/exporter'

// Mock dependencies
vi.mock('inquirer')
vi.mock('../../src/i18n')
vi.mock('../../src/utils/export-import/exporter')
vi.mock('../../src/utils/error-handler')

const mockInquirer = vi.mocked(inquirer)

describe('export command', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock i18n
    vi.mocked(i18n.ensureI18nInitialized).mockReturnValue(undefined)
    vi.mocked(i18n.i18n.t).mockImplementation(((key: string | string[], options?: any) => {
      // Handle array keys by using first key
      const actualKey = Array.isArray(key) ? key[0] : key
      // Return a mock translation based on the key
      const translations: Record<string, string> = {
        'export:title': 'Configuration Export',
        'export:selectCodeType': 'Select code tool to export',
        'export:codeTypeClaudeCode': 'Claude Code',
        'export:codeTypeCodex': 'Codex',
        'export:codeTypeBoth': 'Both',
        'export:selectScope': 'Select export scope',
        'export:scopeAll': 'Full configuration',
        'export:scopeWorkflows': 'Workflows only',
        'export:scopeMcp': 'MCP services only',
        'export:scopeSettings': 'Settings only',
        'export:includeSensitive': 'Include sensitive information?',
        'export:selectOutputPath': 'Select output path',
        'export:defaultPath': 'Default path',
        'export:customPath': 'Custom path',
        'export:collecting': 'Collecting configuration files...',
        'export:collectedFiles': `Collected ${options?.count || 0} files`,
        'export:fileList': 'File list:',
        'export:confirmExport': 'Confirm export?',
        'export:packaging': 'Creating ZIP package...',
        'export:complete': '✅ Export complete!',
        'export:packagePath': 'Package path',
        'export:fileCount': 'File count',
        'export:packageSize': 'Package size',
        'export:exportFailed': 'Export failed',
        'export:noFilesToExport': 'No configuration files found to export',
        'common:operationCancelled': 'Operation cancelled',
      }
      return translations[actualKey] || actualKey
    }) as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('direct export with command line options', () => {
    it('should execute export with valid options', async () => {
      const mockResult = {
        success: true,
        packagePath: '/path/to/export.zip',
        fileCount: 10,
        packageSize: 1024000,
        warnings: [],
      }

      vi.mocked(exporter.validateExportOptions).mockReturnValue({
        valid: true,
        errors: [],
      })

      vi.mocked(exporter.executeExport).mockResolvedValue(mockResult)

      const options = {
        codeType: 'claude-code',
        scope: 'all',
        includeSensitive: false,
      }

      await exportCommand(options)

      expect(exporter.validateExportOptions).toHaveBeenCalled()
      expect(exporter.executeExport).toHaveBeenCalled()
    })

    it('should handle validation errors', async () => {
      vi.mocked(exporter.validateExportOptions).mockReturnValue({
        valid: false,
        errors: ['Code type is required'],
      })

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: string | number | null | undefined) => {
        throw new Error(`process.exit(${code})`)
      }) as any)

      const options = {
        codeType: 'claude-code',
        scope: 'all',
      }

      try {
        await exportCommand(options)
      }
      catch (error: any) {
        expect(error.message).toBe('process.exit(1)')
      }

      expect(exitSpy).toHaveBeenCalledWith(1)
      expect(exporter.executeExport).not.toHaveBeenCalled()

      exitSpy.mockRestore()
    })

    it('should handle export failure', async () => {
      const mockResult = {
        success: false,
        error: 'Export failed due to error',
        warnings: [],
      }

      vi.mocked(exporter.validateExportOptions).mockReturnValue({
        valid: true,
        errors: [],
      })

      vi.mocked(exporter.executeExport).mockResolvedValue(mockResult)

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: string | number | null | undefined) => {
        throw new Error(`process.exit(${code})`)
      }) as any)

      const options = {
        codeType: 'claude-code',
        scope: 'all',
      }

      try {
        await exportCommand(options)
      }
      catch (error: any) {
        expect(error.message).toBe('process.exit(1)')
      }

      expect(exitSpy).toHaveBeenCalledWith(1)

      exitSpy.mockRestore()
    })
  })

  describe('interactive export', () => {
    it('should handle interactive export flow', async () => {
      // Mock inquirer prompts
      mockInquirer.prompt.mockImplementation((async (questions: any) => {
        if (Array.isArray(questions) && questions[0]?.name === 'codeType') {
          return { codeType: 'claude-code' }
        }
        if (Array.isArray(questions) && questions[0]?.name === 'scope') {
          return { scope: 'all' }
        }
        if (Array.isArray(questions) && questions[0]?.name === 'includeSensitive') {
          return { includeSensitive: false }
        }
        if (Array.isArray(questions) && questions[0]?.name === 'pathChoice') {
          return { pathChoice: 'default' }
        }
        if (Array.isArray(questions) && questions[0]?.name === 'confirm') {
          return { confirm: true }
        }
        return {}
      }) as any)

      // Mock export summary
      vi.mocked(exporter.getExportSummary).mockReturnValue({
        files: [
          {
            path: 'settings.json',
            type: 'settings',
            size: 1024,
            checksum: 'abc123',
          },
        ],
        summary: {
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
          codeTypes: ['claude-code'],
        },
      })

      // Mock execute export
      vi.mocked(exporter.executeExport).mockResolvedValue({
        success: true,
        packagePath: '/path/to/export.zip',
        fileCount: 1,
        packageSize: 1024,
        warnings: [],
      })

      await exportCommand({})

      expect(inquirer.prompt).toHaveBeenCalled()
      expect(exporter.getExportSummary).toHaveBeenCalled()
      expect(exporter.executeExport).toHaveBeenCalled()
    })

    it('should cancel export when user does not confirm', async () => {
      mockInquirer.prompt.mockImplementation((async (questions: any) => {
        if (Array.isArray(questions) && questions[0]?.name === 'codeType') {
          return { codeType: 'claude-code' }
        }
        if (Array.isArray(questions) && questions[0]?.name === 'scope') {
          return { scope: 'all' }
        }
        if (Array.isArray(questions) && questions[0]?.name === 'includeSensitive') {
          return { includeSensitive: false }
        }
        if (Array.isArray(questions) && questions[0]?.name === 'pathChoice') {
          return { pathChoice: 'default' }
        }
        if (Array.isArray(questions) && questions[0]?.name === 'confirm') {
          return { confirm: false }
        }
        return {}
      }) as any)

      vi.mocked(exporter.getExportSummary).mockReturnValue({
        files: [
          {
            path: 'settings.json',
            type: 'settings',
            size: 1024,
            checksum: 'abc123',
          },
        ],
        summary: {
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
          codeTypes: ['claude-code'],
        },
      })

      await exportCommand({})

      expect(exporter.executeExport).not.toHaveBeenCalled()
    })

    it('should handle no files to export', async () => {
      mockInquirer.prompt.mockImplementation((async (questions: any) => {
        if (Array.isArray(questions) && questions[0]?.name === 'codeType') {
          return { codeType: 'claude-code' }
        }
        if (Array.isArray(questions) && questions[0]?.name === 'scope') {
          return { scope: 'all' }
        }
        if (Array.isArray(questions) && questions[0]?.name === 'includeSensitive') {
          return { includeSensitive: false }
        }
        if (Array.isArray(questions) && questions[0]?.name === 'pathChoice') {
          return { pathChoice: 'default' }
        }
        return {}
      }) as any)

      vi.mocked(exporter.getExportSummary).mockReturnValue({
        files: [],
        summary: {
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
        },
      })

      await exportCommand({})

      expect(exporter.executeExport).not.toHaveBeenCalled()
    })
  })

  describe('code type and scope normalization', () => {
    it('should normalize code type aliases', async () => {
      vi.mocked(exporter.validateExportOptions).mockReturnValue({
        valid: true,
        errors: [],
      })

      vi.mocked(exporter.executeExport).mockResolvedValue({
        success: true,
        packagePath: '/path/to/export.zip',
        fileCount: 1,
      })

      // Test 'cc' alias
      await exportCommand({ codeType: 'cc', scope: 'all' })
      expect(exporter.executeExport).toHaveBeenCalledWith(
        expect.objectContaining({ codeType: 'claude-code' }),
        expect.any(Function),
      )

      // Test 'cx' alias
      await exportCommand({ codeType: 'cx', scope: 'all' })
      expect(exporter.executeExport).toHaveBeenCalledWith(
        expect.objectContaining({ codeType: 'codex' }),
        expect.any(Function),
      )
    })

    it('should normalize scope aliases', async () => {
      vi.mocked(exporter.validateExportOptions).mockReturnValue({
        valid: true,
        errors: [],
      })

      vi.mocked(exporter.executeExport).mockResolvedValue({
        success: true,
        packagePath: '/path/to/export.zip',
        fileCount: 1,
      })

      // Test 'wf' alias
      await exportCommand({ codeType: 'claude-code', scope: 'wf' })
      expect(exporter.executeExport).toHaveBeenCalledWith(
        expect.objectContaining({ scope: 'workflows' }),
        expect.any(Function),
      )

      // Test 'config' alias
      await exportCommand({ codeType: 'claude-code', scope: 'config' })
      expect(exporter.executeExport).toHaveBeenCalledWith(
        expect.objectContaining({ scope: 'settings' }),
        expect.any(Function),
      )
    })
  })
})
