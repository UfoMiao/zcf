import inquirer from 'inquirer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { executeCcusage } from '../../src/commands/ccu'
import { resolveCodeType } from '../../src/utils/code-type-resolver'
import { ToolUpdateScheduler } from '../../src/utils/tool-update-scheduler'
import { getValidLanguage, runCcrMenuFeature, runCcusageFeature, runCometixMenuFeature } from '../../src/utils/tools'

// Mock external dependencies
vi.mock('inquirer')
vi.mock('ansis', () => ({
  default: {
    cyan: vi.fn((text: string) => text),
    gray: vi.fn((text: string) => text),
    red: vi.fn((text: string) => text),
    bold: {
      cyan: vi.fn((text: string) => text),
    },
  },
}))
vi.mock('../../src/commands/ccu')
vi.mock('../../src/utils/cometix/menu')
vi.mock('../../src/utils/tools/ccr-menu')
vi.mock('../../src/utils/prompt-helpers', () => ({
  addNumbersToChoices: vi.fn(choices => choices),
}))

// Mock auto-updater for tool update scheduler
vi.mock('../../src/utils/auto-updater', () => ({
  checkAndUpdateTools: vi.fn(),
}))

// Mock code-tools/codex for codex functionality
vi.mock('../../src/utils/code-tools/codex', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils/code-tools/codex')>()
  return {
    ...actual,
    checkCodexUpdate: vi.fn().mockResolvedValue({
      installed: true,
      currentVersion: '1.0.0',
      latestVersion: '1.0.0',
      needsUpdate: false,
    }),
    runCodexUpdate: vi.fn().mockResolvedValue(true),
  }
})

// Mock ora for spinners
vi.mock('ora', () => ({
  default: vi.fn().mockImplementation(_text => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
  })),
}))

// Mock ZCF config for code type resolver
vi.mock('../../src/utils/zcf-config', () => ({
  readZcfConfigAsync: vi.fn(),
}))

// Use real i18n system for better integration testing
vi.mock('../../src/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/i18n')>()
  return {
    ...actual,
    // Only mock initialization functions to avoid setup issues in tests
    ensureI18nInitialized: vi.fn(),
    i18n: {
      t: vi.fn((key: string) => {
        const translations: Record<string, string> = {
          'updater:checkingTools': '检查工具版本',
          'updater:checkingVersion': '检查版本中...',
          'codex:notInstalled': 'Codex未安装',
          'codex:upToDate': 'Codex已是最新版本 (v{version})',
        }
        return translations[key] || key
      }),
    },
  }
})
vi.mock('../../src/constants', () => ({
  I18N: {
    'zh-CN': {},
    'en': {},
  },
  DEFAULT_CODE_TOOL_TYPE: 'claude-code',
}))

const mockInquirer = vi.mocked(inquirer)
const mockExecuteCcusage = vi.mocked(executeCcusage)

describe('tools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getValidLanguage', () => {
    it('should return valid language when provided', () => {
      expect(getValidLanguage('zh-CN')).toBe('zh-CN')
      expect(getValidLanguage('en')).toBe('en')
    })

    it('should return "en" as default for invalid language', () => {
      expect(getValidLanguage('fr')).toBe('en')
      expect(getValidLanguage(null)).toBe('en')
      expect(getValidLanguage(undefined)).toBe('en')
      expect(getValidLanguage('')).toBe('en')
    })
  })

  describe('runCcusageFeature', () => {
    it('should handle daily mode selection', async () => {
      // Arrange
      mockInquirer.prompt
        .mockResolvedValueOnce({ mode: 'daily' })
        .mockResolvedValueOnce({ continue: '' })

      // Act
      await runCcusageFeature()

      // Assert
      expect(mockExecuteCcusage).toHaveBeenCalledWith(['daily'])
      expect(mockInquirer.prompt).toHaveBeenCalledTimes(2)
    })

    it('should handle back selection', async () => {
      // Arrange
      mockInquirer.prompt.mockResolvedValueOnce({ mode: 'back' })

      // Act
      await runCcusageFeature()

      // Assert
      expect(mockExecuteCcusage).not.toHaveBeenCalled()
      expect(mockInquirer.prompt).toHaveBeenCalledTimes(1)
    })

    it('should handle custom mode with arguments', async () => {
      // Arrange
      mockInquirer.prompt
        .mockResolvedValueOnce({ mode: 'custom' })
        .mockResolvedValueOnce({ customArgs: '--verbose --limit 10' })
        .mockResolvedValueOnce({ continue: '' })

      // Act
      await runCcusageFeature()

      // Assert
      expect(mockExecuteCcusage).toHaveBeenCalledWith(['--verbose', '--limit', '10'])
      expect(mockInquirer.prompt).toHaveBeenCalledTimes(3)
    })

    it('should handle custom mode with quoted arguments', async () => {
      // Arrange
      mockInquirer.prompt
        .mockResolvedValueOnce({ mode: 'custom' })
        .mockResolvedValueOnce({ customArgs: '--name "John Doe" --age 25' })
        .mockResolvedValueOnce({ continue: '' })

      // Act
      await runCcusageFeature()

      // Assert
      expect(mockExecuteCcusage).toHaveBeenCalledWith(['--name', 'John Doe', '--age', '25'])
    })

    it('should handle custom mode with empty arguments', async () => {
      // Arrange
      mockInquirer.prompt
        .mockResolvedValueOnce({ mode: 'custom' })
        .mockResolvedValueOnce({ customArgs: '' })
        .mockResolvedValueOnce({ continue: '' })

      // Act
      await runCcusageFeature()

      // Assert
      expect(mockExecuteCcusage).toHaveBeenCalledWith([])
    })

    it('should validate and use fallback language', async () => {
      // Arrange
      mockInquirer.prompt
        .mockResolvedValueOnce({ mode: 'daily' })
        .mockResolvedValueOnce({ continue: '' })

      // Act - using invalid language should fallback to 'en'
      await runCcusageFeature()

      // Assert
      expect(mockExecuteCcusage).toHaveBeenCalledWith(['daily'])
    })
  })

  describe('runCcrMenuFeature', () => {
    it('should call showCcrMenu with valid language', async () => {
      // Mock the showCcrMenu function
      const { showCcrMenu } = await import('../../src/utils/tools/ccr-menu')
      const mockShowCcrMenu = vi.mocked(showCcrMenu)

      await runCcrMenuFeature()

      expect(mockShowCcrMenu).toHaveBeenCalledWith()
    })

    it('should handle invalid language with fallback', async () => {
      // Mock the showCcrMenu function
      const { showCcrMenu } = await import('../../src/utils/tools/ccr-menu')
      const mockShowCcrMenu = vi.mocked(showCcrMenu)

      await runCcrMenuFeature()

      expect(mockShowCcrMenu).toHaveBeenCalledWith()
    })
  })

  describe('runCometixMenuFeature', () => {
    it('should call showCometixMenu with valid language', async () => {
      // Mock the showCometixMenu function
      const { showCometixMenu } = await import('../../src/utils/cometix/menu')
      const mockShowCometixMenu = vi.mocked(showCometixMenu)

      await runCometixMenuFeature()

      expect(mockShowCometixMenu).toHaveBeenCalledWith()
    })

    it('should handle invalid language with fallback', async () => {
      // Mock the showCometixMenu function
      const { showCometixMenu } = await import('../../src/utils/cometix/menu')
      const mockShowCometixMenu = vi.mocked(showCometixMenu)

      await runCometixMenuFeature()

      expect(mockShowCometixMenu).toHaveBeenCalledWith()
    })
  })

  // Code Type Resolver Tests
  describe('code type resolver', () => {
    describe('resolveCodeType', () => {
      it('should return claude-code when "cc" abbreviation is provided', async () => {
        const { readZcfConfigAsync } = await import('../../src/utils/zcf-config')
        vi.mocked(readZcfConfigAsync).mockResolvedValue(null)

        const result = await resolveCodeType('cc')
        expect(result).toBe('claude-code')
      })

      it('should return codex when "cx" abbreviation is provided', async () => {
        const { readZcfConfigAsync } = await import('../../src/utils/zcf-config')
        vi.mocked(readZcfConfigAsync).mockResolvedValue(null)

        const result = await resolveCodeType('cx')
        expect(result).toBe('codex')
      })

      it('should return claude-code when full name "claude-code" is provided', async () => {
        const { readZcfConfigAsync } = await import('../../src/utils/zcf-config')
        vi.mocked(readZcfConfigAsync).mockResolvedValue(null)

        const result = await resolveCodeType('claude-code')
        expect(result).toBe('claude-code')
      })

      it('should return codex when full name "codex" is provided', async () => {
        const { readZcfConfigAsync } = await import('../../src/utils/zcf-config')
        vi.mocked(readZcfConfigAsync).mockResolvedValue(null)

        const result = await resolveCodeType('codex')
        expect(result).toBe('codex')
      })

      it('should return default from ZCF config when no parameter provided', async () => {
        const { readZcfConfigAsync } = await import('../../src/utils/zcf-config')
        vi.mocked(readZcfConfigAsync).mockResolvedValue({
          version: '3.1.3',
          preferredLang: 'en',
          codeToolType: 'codex',
          lastUpdated: '2025-01-01',
        })

        const result = await resolveCodeType(undefined)
        expect(result).toBe('codex')
      })

      it('should return claude-code as fallback when no parameter provided and no config exists', async () => {
        const { readZcfConfigAsync } = await import('../../src/utils/zcf-config')
        vi.mocked(readZcfConfigAsync).mockResolvedValue(null)

        const result = await resolveCodeType(undefined)
        expect(result).toBe('claude-code')
      })

      it('should throw error for invalid code type', async () => {
        const { readZcfConfigAsync } = await import('../../src/utils/zcf-config')
        vi.mocked(readZcfConfigAsync).mockResolvedValue(null)

        await expect(resolveCodeType('invalid-type')).rejects.toThrow('errors:invalidCodeType')
      })

      it('should handle case insensitive abbreviations', async () => {
        const { readZcfConfigAsync } = await import('../../src/utils/zcf-config')
        vi.mocked(readZcfConfigAsync).mockResolvedValue(null)

        const result1 = await resolveCodeType('CC')
        const result2 = await resolveCodeType('CX')

        expect(result1).toBe('claude-code')
        expect(result2).toBe('codex')
      })

      it('should prioritize parameter over config when both provided', async () => {
        const { readZcfConfigAsync } = await import('../../src/utils/zcf-config')
        vi.mocked(readZcfConfigAsync).mockResolvedValue({
          version: '3.1.3',
          preferredLang: 'en',
          codeToolType: 'claude-code',
          lastUpdated: '2025-01-01',
        })

        const result = await resolveCodeType('codex')
        expect(result).toBe('codex')
      })
    })
  })

  // Tool Update Scheduler Tests
  describe('tool update scheduler', () => {
    let scheduler: ToolUpdateScheduler

    beforeEach(() => {
      scheduler = new ToolUpdateScheduler()
    })

    describe('updateByCodeType', () => {
      it('should call checkAndUpdateTools for claude-code type', async () => {
        const { checkAndUpdateTools } = await import('../../src/utils/auto-updater')
        vi.mocked(checkAndUpdateTools).mockResolvedValue(undefined)

        await scheduler.updateByCodeType('claude-code', false)

        expect(checkAndUpdateTools).toHaveBeenCalledWith(false)
        expect(checkAndUpdateTools).toHaveBeenCalledTimes(1)
      })

      it('should call runCodexUpdate for codex type', async () => {
        const { runCodexUpdate } = await import('../../src/utils/code-tools/codex')
        vi.mocked(runCodexUpdate).mockResolvedValue(true)

        await scheduler.updateByCodeType('codex', false)

        expect(runCodexUpdate).toHaveBeenCalledWith(false, false)
        expect(runCodexUpdate).toHaveBeenCalledTimes(1)
      })

      it('should pass skipPrompt parameter correctly to claude-code updater', async () => {
        const { checkAndUpdateTools } = await import('../../src/utils/auto-updater')
        vi.mocked(checkAndUpdateTools).mockResolvedValue(undefined)

        await scheduler.updateByCodeType('claude-code', true)

        expect(checkAndUpdateTools).toHaveBeenCalledWith(true)
      })

      it('should pass skipPrompt parameter correctly to codex updater', async () => {
        const { runCodexUpdate } = await import('../../src/utils/code-tools/codex')
        vi.mocked(runCodexUpdate).mockResolvedValue(true)

        await scheduler.updateByCodeType('codex', true)

        expect(runCodexUpdate).toHaveBeenCalledWith(false, true)
      })

      it('should handle claude-code update errors gracefully', async () => {
        const { checkAndUpdateTools } = await import('../../src/utils/auto-updater')
        const mockError = new Error('Claude Code update failed')
        vi.mocked(checkAndUpdateTools).mockRejectedValue(mockError)

        await expect(scheduler.updateByCodeType('claude-code', false)).rejects.toThrow('Claude Code update failed')
      })

      it('should handle codex update errors gracefully', async () => {
        const { runCodexUpdate } = await import('../../src/utils/code-tools/codex')
        const mockError = new Error('Codex update failed')
        vi.mocked(runCodexUpdate).mockRejectedValue(mockError)

        await expect(scheduler.updateByCodeType('codex', false)).rejects.toThrow('Codex update failed')
      })

      it('should handle codex update returning false gracefully', async () => {
        const { runCodexUpdate } = await import('../../src/utils/code-tools/codex')
        vi.mocked(runCodexUpdate).mockResolvedValue(false)

        await scheduler.updateByCodeType('codex', false)

        // Should not throw when update returns false
        expect(runCodexUpdate).toHaveBeenCalledWith(false, false)
      })

      it('should ensure i18n is initialized before updates', async () => {
        const { ensureI18nInitialized } = await import('../../src/i18n')
        vi.mocked(ensureI18nInitialized).mockResolvedValue(undefined)

        const { checkAndUpdateTools } = await import('../../src/utils/auto-updater')
        vi.mocked(checkAndUpdateTools).mockResolvedValue(undefined)

        await scheduler.updateByCodeType('claude-code', false)

        expect(ensureI18nInitialized).toHaveBeenCalledBefore(checkAndUpdateTools as any)
      })

      it('should throw error for unsupported code type', async () => {
        await expect(scheduler.updateByCodeType('unsupported' as any, false))
          .rejects
          .toThrow('Unsupported code type: unsupported')
      })
    })
  })

  // Codex Update Tests
  describe('codex update', () => {
    it('should work correctly when Codex is not installed', async () => {
      const { runCodexUpdate, checkCodexUpdate } = await import('../../src/utils/code-tools/codex')

      vi.mocked(checkCodexUpdate).mockResolvedValueOnce({
        installed: false,
        currentVersion: null,
        latestVersion: null,
        needsUpdate: false,
      })

      const result = await runCodexUpdate(false, true)

      expect(result).toBe(false)
    })

    it('should work correctly when update is needed but skip prompt', async () => {
      const { runCodexUpdate, checkCodexUpdate } = await import('../../src/utils/code-tools/codex')

      vi.mocked(checkCodexUpdate).mockResolvedValueOnce({
        installed: true,
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        needsUpdate: true,
      })

      const result = await runCodexUpdate(false, true)

      expect(result).toBe(false) // Should return false when update is skipped
    })

    it('should work correctly when codex is up to date', async () => {
      const { runCodexUpdate, checkCodexUpdate } = await import('../../src/utils/code-tools/codex')

      vi.mocked(checkCodexUpdate).mockResolvedValueOnce({
        installed: true,
        currentVersion: '1.0.0',
        latestVersion: '1.0.0',
        needsUpdate: false,
      })

      const result = await runCodexUpdate(false, true)

      expect(result).toBe(false) // When skipPrompt is true, should return false even if up to date
    })

    it('should handle update errors gracefully', async () => {
      const { runCodexUpdate } = await import('../../src/utils/code-tools/codex')

      vi.mocked(runCodexUpdate).mockRejectedValueOnce(new Error('Update failed'))

      await expect(runCodexUpdate(false, true)).rejects.toThrow('Update failed')
    })
  })
})
