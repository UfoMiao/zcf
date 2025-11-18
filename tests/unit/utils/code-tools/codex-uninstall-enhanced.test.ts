import type { CodexUninstallItem } from '../../../../src/utils/code-tools/codex-uninstaller'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runCodexUninstall } from '../../../../src/utils/code-tools/codex'
import { promptBoolean } from '../../../../src/utils/toggle-prompt'

// Mock dependencies
vi.mock('../../../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  i18n: {
    t: vi.fn(),
  },
}))

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}))

vi.mock('ansis', () => ({
  default: {
    cyan: vi.fn(text => text),
    green: vi.fn(text => text),
    yellow: vi.fn(text => text),
    red: vi.fn(text => text),
  },
}))

vi.mock('../../../../src/utils/code-tools/codex-uninstaller', () => ({
  CodexUninstaller: vi.fn().mockImplementation(() => ({
    completeUninstall: vi.fn(),
    customUninstall: vi.fn(),
  })),
}))

vi.mock('../../../../src/utils/prompt-helpers', () => ({
  addNumbersToChoices: vi.fn(choices => choices),
}))

const mockReadZcfConfig = vi.hoisted(() => vi.fn(() => ({
  version: '1.0.0',
  preferredLang: 'en',
  templateLang: 'en',
  codeToolType: 'codex',
  lastUpdated: new Date().toISOString(),
} as any)))
vi.mock('../../../../src/utils/zcf-config', () => ({
  readZcfConfig: mockReadZcfConfig,
}))

vi.mock('../../../../src/utils/toggle-prompt', () => ({
  promptBoolean: vi.fn(),
}))

// Import mocked functions
const { i18n, ensureI18nInitialized } = await import('../../../../src/i18n')
const inquirer = await import('inquirer')
const { CodexUninstaller } = await import('../../../../src/utils/code-tools/codex-uninstaller')
const { addNumbersToChoices } = await import('../../../../src/utils/prompt-helpers')

// Get mock functions
const mockI18nT = vi.mocked(i18n.t)
const mockEnsureI18nInitialized = vi.mocked(ensureI18nInitialized)
const mockInquirerPrompt = vi.mocked(inquirer.default.prompt)
const mockCodexUninstaller = vi.mocked(CodexUninstaller)
const mockAddNumbersToChoices = vi.mocked(addNumbersToChoices)

// Mock console
const mockConsoleLog = vi.fn()
const mockConsoleError = vi.fn()
vi.stubGlobal('console', { log: mockConsoleLog, error: mockConsoleError })

describe('runCodexUninstall - Enhanced Version', () => {
  let mockUninstaller: {
    completeUninstall: ReturnType<typeof vi.fn>
    customUninstall: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockUninstaller = {
      completeUninstall: vi.fn(),
      customUninstall: vi.fn(),
    }

    mockCodexUninstaller.mockImplementation(() => mockUninstaller as any)
    mockI18nT.mockImplementation(((key: string) => `mocked_${key}`) as any)
    mockEnsureI18nInitialized.mockResolvedValue(undefined as any)
    mockAddNumbersToChoices.mockImplementation((choices: any) => choices)
    mockReadZcfConfig.mockReturnValue({
      version: '1.0.0',
      preferredLang: 'en',
      templateLang: 'en',
      codeToolType: 'codex',
      lastUpdated: new Date().toISOString(),
    } as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('mode selection', () => {
    it('should prompt for uninstall mode selection', async () => {
      mockInquirerPrompt
        .mockResolvedValueOnce({ mode: 'complete' }) // Mode selection
      vi.mocked(promptBoolean).mockResolvedValueOnce(true)

      mockUninstaller.completeUninstall.mockResolvedValue({
        success: true,
        removed: ['~/.codex/', '@openai/codex package'],
        removedConfigs: [],
        errors: [],
        warnings: [],
      })

      await runCodexUninstall()

      expect(mockInquirerPrompt).toHaveBeenCalledWith([{
        type: 'list',
        name: 'mode',
        message: 'mocked_codex:uninstallModePrompt',
        choices: [
          { name: 'mocked_codex:uninstallModeComplete', value: 'complete' },
          { name: 'mocked_codex:uninstallModeCustom', value: 'custom' },
        ],
        default: 'complete',
      }])
    })

    it('should handle cancelled mode selection', async () => {
      mockInquirerPrompt.mockResolvedValueOnce({ mode: null }) // Cancelled

      await runCodexUninstall()

      expect(mockConsoleLog).toHaveBeenCalledWith('mocked_codex:uninstallCancelled')
      expect(mockUninstaller.completeUninstall).not.toHaveBeenCalled()
      expect(mockUninstaller.customUninstall).not.toHaveBeenCalled()
    })

    it('should initialize uninstaller with preferred language from config', async () => {
      mockReadZcfConfig.mockReturnValueOnce({
        version: '1.0.0',
        preferredLang: 'zh-CN',
        templateLang: 'zh-CN',
        codeToolType: 'codex',
        lastUpdated: new Date().toISOString(),
      } as any)

      mockInquirerPrompt.mockResolvedValueOnce({ mode: null })

      await runCodexUninstall()

      expect(mockCodexUninstaller).toHaveBeenCalledWith('zh-CN')
    })
  })

  describe('complete uninstall mode', () => {
    it('should perform complete uninstall with confirmation', async () => {
      mockInquirerPrompt
        .mockResolvedValueOnce({ mode: 'complete' }) // Mode selection
      vi.mocked(promptBoolean).mockResolvedValueOnce(true)

      const mockResult = {
        success: true,
        removed: ['~/.codex/', '@openai/codex package'],
        removedConfigs: [],
        errors: [],
        warnings: ['Some warning'],
      }

      mockUninstaller.completeUninstall.mockResolvedValue(mockResult)

      await runCodexUninstall()

      expect(promptBoolean).toHaveBeenCalledWith({
        message: 'mocked_codex:uninstallPrompt',
        defaultValue: false,
      })

      expect(mockUninstaller.completeUninstall).toHaveBeenCalledTimes(1)
      expect(mockConsoleLog).toHaveBeenCalledWith('mocked_codex:uninstallSuccess')
    })

    it('should handle cancelled complete uninstall confirmation', async () => {
      mockInquirerPrompt
        .mockResolvedValueOnce({ mode: 'complete' }) // Mode selection
      vi.mocked(promptBoolean).mockResolvedValueOnce(false)

      await runCodexUninstall()

      expect(mockConsoleLog).toHaveBeenCalledWith('mocked_codex:uninstallCancelled')
      expect(mockUninstaller.completeUninstall).not.toHaveBeenCalled()
    })

    it('should display warnings and errors from complete uninstall', async () => {
      mockInquirerPrompt
        .mockResolvedValueOnce({ mode: 'complete' })
      vi.mocked(promptBoolean).mockResolvedValueOnce(true)

      const mockResult = {
        success: false,
        removed: ['~/.codex/'],
        removedConfigs: [],
        errors: ['Failed to uninstall package', 'Network error'],
        warnings: ['Permission denied for backup'],
      }

      mockUninstaller.completeUninstall.mockResolvedValue(mockResult)

      await runCodexUninstall()

      expect(mockConsoleLog).toHaveBeenCalledWith('⚠️ Permission denied for backup')
      expect(mockConsoleLog).toHaveBeenCalledWith('❌ Failed to uninstall package')
      expect(mockConsoleLog).toHaveBeenCalledWith('❌ Network error')
    })
  })

  describe('custom uninstall mode', () => {
    it('should show custom uninstall options and execute selected items', async () => {
      const selectedItems: CodexUninstallItem[] = ['config', 'auth', 'cli-package']

      mockInquirerPrompt
        .mockResolvedValueOnce({ mode: 'custom' }) // Mode selection
        .mockResolvedValueOnce({ items: selectedItems }) // Item selection

      const mockResults = [
        { success: true, removed: ['config.toml'], removedConfigs: [], errors: [], warnings: [] },
        { success: true, removed: ['auth.json'], removedConfigs: [], errors: [], warnings: [] },
        { success: true, removed: ['@openai/codex package'], removedConfigs: [], errors: [], warnings: [] },
      ]

      mockUninstaller.customUninstall.mockResolvedValue(mockResults)

      await runCodexUninstall()

      expect(mockInquirerPrompt).toHaveBeenCalledWith([{
        type: 'checkbox',
        name: 'items',
        message: 'mocked_codex:customUninstallPrompt',
        choices: [
          { name: 'mocked_codex:uninstallItemConfig', value: 'config' },
          { name: 'mocked_codex:uninstallItemAuth', value: 'auth' },
          { name: 'mocked_codex:uninstallItemApiConfig', value: 'api-config' },
          { name: 'mocked_codex:uninstallItemMcpConfig', value: 'mcp-config' },
          { name: 'mocked_codex:uninstallItemSystemPrompt', value: 'system-prompt' },
          { name: 'mocked_codex:uninstallItemWorkflow', value: 'workflow' },
          { name: 'mocked_codex:uninstallItemCliPackage', value: 'cli-package' },
          { name: 'mocked_codex:uninstallItemBackups', value: 'backups' },
        ],
      }])

      expect(mockUninstaller.customUninstall).toHaveBeenCalledWith(selectedItems)
      expect(mockConsoleLog).toHaveBeenCalledWith('mocked_codex:uninstallSuccess')
    })

    it('should handle empty custom selection', async () => {
      mockInquirerPrompt
        .mockResolvedValueOnce({ mode: 'custom' }) // Mode selection
        .mockResolvedValueOnce({ items: [] }) // Empty selection

      await runCodexUninstall()

      expect(mockConsoleLog).toHaveBeenCalledWith('mocked_codex:uninstallCancelled')
      expect(mockUninstaller.customUninstall).not.toHaveBeenCalled()
    })

    it('should display results for each custom uninstall item', async () => {
      mockInquirerPrompt
        .mockResolvedValueOnce({ mode: 'custom' })
        .mockResolvedValueOnce({ items: ['config', 'auth'] })

      const mockResults = [
        {
          success: true,
          removed: ['config.toml'],
          removedConfigs: [],
          errors: [],
          warnings: ['Config backup failed'],
        },
        {
          success: false,
          removed: [],
          removedConfigs: [],
          errors: ['Auth file locked'],
          warnings: [],
        },
      ]

      mockUninstaller.customUninstall.mockResolvedValue(mockResults)

      await runCodexUninstall()

      expect(mockConsoleLog).toHaveBeenCalledWith('⚠️ Config backup failed')
      expect(mockConsoleLog).toHaveBeenCalledWith('❌ Auth file locked')
    })
  })

  describe('error handling', () => {
    it('should handle uninstaller initialization failure', async () => {
      mockCodexUninstaller.mockImplementation(() => {
        throw new Error('Failed to initialize uninstaller')
      })

      await expect(runCodexUninstall()).rejects.toThrow('Failed to initialize uninstaller')
    })

    it('should handle complete uninstall execution failure', async () => {
      mockInquirerPrompt
        .mockResolvedValueOnce({ mode: 'complete' })
      vi.mocked(promptBoolean).mockResolvedValueOnce(true)

      mockUninstaller.completeUninstall.mockRejectedValue(new Error('Uninstall execution failed'))

      await expect(runCodexUninstall()).rejects.toThrow('Uninstall execution failed')
    })

    it('should handle custom uninstall execution failure', async () => {
      mockInquirerPrompt
        .mockResolvedValueOnce({ mode: 'custom' })
        .mockResolvedValueOnce({ items: ['config'] })

      mockUninstaller.customUninstall.mockRejectedValue(new Error('Custom uninstall failed'))

      await expect(runCodexUninstall()).rejects.toThrow('Custom uninstall failed')
    })
  })

  describe('result reporting', () => {
    it('should report successful removals', async () => {
      mockInquirerPrompt
        .mockResolvedValueOnce({ mode: 'complete' })
      vi.mocked(promptBoolean).mockResolvedValueOnce(true)

      const mockResult = {
        success: true,
        removed: ['~/.codex/', '@openai/codex package', 'config.toml'],
        removedConfigs: ['api settings'],
        errors: [],
        warnings: [],
      }

      mockUninstaller.completeUninstall.mockResolvedValue(mockResult)

      await runCodexUninstall()

      expect(mockConsoleLog).toHaveBeenCalledWith('✔ mocked_codex:removedItem')
      expect(mockConsoleLog).toHaveBeenCalledWith('✔ mocked_codex:removedItem')
      expect(mockConsoleLog).toHaveBeenCalledWith('✔ mocked_codex:removedItem')
      expect(mockConsoleLog).toHaveBeenCalledWith('✔ mocked_codex:removedConfig')
    })
  })
})
