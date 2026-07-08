import type { UninstallOptions } from '../../src/commands/uninstall'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { uninstall } from '../../src/commands/uninstall'
import { promptBoolean } from '../../src/utils/toggle-prompt'

// Mock dependencies
vi.mock('inquirer')
vi.mock('../../src/i18n')
vi.mock('../../src/utils/uninstaller')
vi.mock('../../src/utils/toggle-prompt', () => ({
  promptBoolean: vi.fn(),
}))

const zcfConfigMock = vi.hoisted(() => ({
  readZcfConfig: vi.fn(() => ({ codeToolType: 'claude-code' })),
  readZcfConfigAsync: vi.fn(async () => ({ codeToolType: 'claude-code' })),
}))

const resolveCodeTypeMock = vi.hoisted(() => vi.fn(async () => 'claude-code'))

vi.mock('../../src/utils/zcf-config', () => ({
  readZcfConfig: zcfConfigMock.readZcfConfig,
  readZcfConfigAsync: zcfConfigMock.readZcfConfigAsync,
}))
vi.mock('../../src/utils/code-type-resolver', () => ({
  resolveCodeType: resolveCodeTypeMock,
}))
vi.mock('../../src/utils/code-tools/codex')

// Mock modules
const mockInquirer = vi.hoisted(() => ({
  prompt: vi.fn(),
}))

const mockI18n = vi.hoisted(() => ({
  t: vi.fn((key: string) => key),
}))

const mockUninstaller = vi.hoisted(() => ({
  ZcfUninstaller: vi.fn().mockImplementation(() => ({
    completeUninstall: vi.fn().mockResolvedValue({ success: true, removed: [], errors: [], warnings: [] }),
    customUninstall: vi.fn().mockResolvedValue([{ success: true, removed: [], errors: [], warnings: [] }]),
  })),
}))

const codexUninstallMock = vi.hoisted(() => ({
  runCodexUninstall: vi.fn().mockResolvedValue(undefined),
}))

const mockedPromptBoolean = vi.mocked(promptBoolean)
function queuePromptBooleans(...values: boolean[]) {
  values.forEach(value => mockedPromptBoolean.mockResolvedValueOnce(value))
}

vi.mocked(await import('inquirer')).default = mockInquirer as any
vi.mocked(await import('../../src/i18n')).i18n = mockI18n as any
vi.mocked(await import('../../src/utils/uninstaller')).ZcfUninstaller = mockUninstaller.ZcfUninstaller
vi.mocked(await import('../../src/utils/code-tools/codex')).runCodexUninstall = codexUninstallMock.runCodexUninstall

describe('uninstall command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedPromptBoolean.mockReset()
    mockedPromptBoolean.mockResolvedValue(false)
    mockInquirer.prompt.mockReset()
    mockUninstaller.ZcfUninstaller.mockImplementation(() => ({
      completeUninstall: vi.fn().mockResolvedValue({ success: true, removed: [], errors: [], warnings: [] }),
      customUninstall: vi.fn().mockResolvedValue([{ success: true, removed: [], errors: [], warnings: [] }]),
    }))
  })

  describe('interactive mode', () => {
    it('should show main choice menu with complete and custom options', async () => {
      // Mock user selecting complete uninstall
      mockInquirer.prompt
        .mockResolvedValueOnce({ mainChoice: 'complete' })
        .mockResolvedValueOnce({ confirm: true }) // Mock confirmation
      queuePromptBooleans(true)

      await uninstall()

      // Should call prompt with numbered choices and descriptions
      expect(mockInquirer.prompt).toHaveBeenCalled()

      const firstPromptArg = mockInquirer.prompt.mock.calls[0][0]
      const firstPrompt = Array.isArray(firstPromptArg) ? firstPromptArg[0] : firstPromptArg

      expect(firstPrompt).toEqual(expect.objectContaining({
        type: 'list',
        name: 'mainChoice',
        message: 'uninstall:selectMainOption',
      }))
      expect(firstPrompt.choices).toEqual(expect.arrayContaining([
        expect.objectContaining({ value: 'complete' }),
        expect.objectContaining({ value: 'custom' }),
      ]))
    })

    it('should execute complete uninstall when selected', async () => {
      const mockCompleteUninstall = vi.fn().mockResolvedValue({
        success: true,
        removed: ['~/.claude', '~/.claude.json', '~/.claude-code-router'],
        errors: [],
        warnings: [],
      })

      mockUninstaller.ZcfUninstaller.mockImplementation(() => ({
        completeUninstall: mockCompleteUninstall,
      }))

      mockInquirer.prompt
        .mockResolvedValueOnce({ mainChoice: 'complete' })
        .mockResolvedValueOnce({ confirm: true })
      queuePromptBooleans(true)

      await uninstall()

      expect(mockCompleteUninstall).toHaveBeenCalled()
    })

    it('should show custom uninstall options when custom is selected', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ mainChoice: 'custom' })
        .mockResolvedValueOnce({ customItems: ['output-styles', 'commands'] })
        .mockResolvedValueOnce({ confirm: true })
      queuePromptBooleans(true)

      const mockCustomUninstall = vi.fn().mockResolvedValue([
        { success: true, removed: [], errors: [], warnings: [] },
      ])

      mockUninstaller.ZcfUninstaller.mockImplementation(() => ({
        customUninstall: mockCustomUninstall,
      }))

      await uninstall()

      // Should show custom options menu with checkbox type
      const secondPromptArg = mockInquirer.prompt.mock.calls[1][0]
      const secondPrompt = Array.isArray(secondPromptArg) ? secondPromptArg[0] : secondPromptArg
      expect(secondPrompt).toEqual(expect.objectContaining({
        type: 'checkbox',
        name: 'customItems',
        message: 'uninstall:selectItemsToRemove common:multiSelectHint',
        validate: expect.any(Function),
      }))
      expect(secondPrompt.choices).toEqual(expect.arrayContaining([
        expect.objectContaining({ value: 'output-styles' }),
        expect.objectContaining({ value: 'commands' }),
        expect.objectContaining({ value: 'agents' }),
        expect.objectContaining({ value: 'claude-md' }),
        expect.objectContaining({ value: 'permissions-envs' }),
        expect.objectContaining({ value: 'mcps' }),
        expect.objectContaining({ value: 'ccr' }),
        expect.objectContaining({ value: 'ccline' }),
        expect.objectContaining({ value: 'claude-code' }),
        expect.objectContaining({ value: 'backups' }),
        expect.objectContaining({ value: 'zcf-config' }),
      ]))

      expect(mockCustomUninstall).toHaveBeenCalledWith(['output-styles', 'commands'])
    })

    it('should validate that at least one item is selected in custom mode', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ mainChoice: 'custom' })
        .mockResolvedValueOnce({ customItems: [] })

      await uninstall()

      const secondPromptArg = vi.mocked(mockInquirer.prompt).mock.calls[1][0]
      const validateFn = (Array.isArray(secondPromptArg) ? secondPromptArg[0] : secondPromptArg).validate
      expect(validateFn([])).toBe('uninstall:selectAtLeastOne')
      expect(validateFn(['output-styles'])).toBe(true)
    })
  })

  it('should fall back to config when code type resolution fails and run Codex uninstaller', async () => {
    resolveCodeTypeMock.mockRejectedValueOnce(new Error('invalid code type'))
    zcfConfigMock.readZcfConfig.mockReturnValueOnce({ codeToolType: 'codex' })

    await uninstall({ codeType: 'unknown' })

    expect(resolveCodeTypeMock).toHaveBeenCalled()
    expect(codexUninstallMock.runCodexUninstall).toHaveBeenCalled()
  })

  describe('non-interactive mode', () => {
    it('should execute complete uninstall when mode is complete', async () => {
      const mockCompleteUninstall = vi.fn().mockResolvedValue({
        success: true,
        removed: [],
        errors: [],
        warnings: [],
      })

      mockUninstaller.ZcfUninstaller.mockImplementation(() => ({
        completeUninstall: mockCompleteUninstall,
      }))

      // Mock confirmation for non-interactive mode
      mockInquirer.prompt.mockResolvedValueOnce({ confirm: true })

      const options: UninstallOptions = {
        mode: 'complete',
      }

      queuePromptBooleans(true)

      await uninstall(options)

      expect(mockCompleteUninstall).toHaveBeenCalled()
    })

    it('should execute custom uninstall when mode is custom with items', async () => {
      const mockCustomUninstall = vi.fn().mockResolvedValue([
        { success: true, removed: [], errors: [], warnings: [] },
      ])

      mockUninstaller.ZcfUninstaller.mockImplementation(() => ({
        customUninstall: mockCustomUninstall,
      }))

      // Mock confirmation for custom uninstall
      mockInquirer.prompt.mockResolvedValueOnce({ confirm: true })

      const options: UninstallOptions = {
        mode: 'custom',
        items: ['output-styles', 'commands'],
      }

      queuePromptBooleans(true)

      await uninstall(options)

      expect(mockCustomUninstall).toHaveBeenCalledWith(['output-styles', 'commands'])
    })
  })

  describe('language support', () => {
    it('should initialize i18n with provided language', async () => {
      const mockCompleteUninstall = vi.fn().mockResolvedValue({
        success: true,
        removed: [],
        errors: [],
        warnings: [],
      })

      mockUninstaller.ZcfUninstaller.mockImplementation(() => ({
        completeUninstall: mockCompleteUninstall,
      }))

      mockInquirer.prompt.mockResolvedValueOnce({ confirm: true })

      const options: UninstallOptions = {
        lang: 'zh-CN',
        mode: 'complete',
      }

      queuePromptBooleans(true)

      await uninstall(options)

      expect(mockCompleteUninstall).toHaveBeenCalled()
    })

    it('should use English as default language', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ mainChoice: 'complete' })
        .mockResolvedValueOnce({ confirm: true })
      queuePromptBooleans(true)

      await uninstall()

      // Should use default English language
      // This would be tested by checking i18n initialization calls
    })
  })

  describe('codex uninstall flow', () => {
    it('should delegate to Codex uninstaller when codex code type selected', async () => {
      const { resolveCodeType } = await import('../../src/utils/code-type-resolver')
      vi.mocked(resolveCodeType).mockResolvedValueOnce('codex')

      await uninstall({ codeType: 'codex' })

      expect(codexUninstallMock.runCodexUninstall).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should handle cancellation gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Mock process.exit to avoid actual exit
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

      // Create ExitPromptError to simulate user cancellation
      const exitError = new Error('User cancelled')
      exitError.name = 'ExitPromptError'
      mockInquirer.prompt.mockRejectedValueOnce(exitError)

      await uninstall()

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('common:goodbye'))
      expect(exitSpy).toHaveBeenCalledWith(0)

      consoleSpy.mockRestore()
      consoleErrorSpy.mockRestore()
      exitSpy.mockRestore()
    })

    it('should handle uninstaller errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const mockCompleteUninstall = vi.fn().mockResolvedValue({
        success: false,
        removed: [],
        errors: ['Failed to remove directory'],
        warnings: [],
      })

      mockUninstaller.ZcfUninstaller.mockImplementation(() => ({
        completeUninstall: mockCompleteUninstall,
      }))

      mockInquirer.prompt
        .mockResolvedValueOnce({ mainChoice: 'complete' })
        .mockResolvedValueOnce({ confirm: true })
      queuePromptBooleans(true)

      await uninstall()

      expect(mockCompleteUninstall).toHaveBeenCalled()
      // Should show error details in the uninstall results
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to remove directory'))

      consoleSpy.mockRestore()
    })
  })

  it('should display removed configs and combined custom success when both files and configs are removed', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    mockInquirer.prompt
      .mockResolvedValueOnce({ mainChoice: 'custom' })
      .mockResolvedValueOnce({ customItems: ['output-styles'] })
    queuePromptBooleans(true)

    const mockCustomUninstall = vi.fn().mockResolvedValue([
      {
        success: true,
        removed: ['fileA'],
        removedConfigs: ['configA'],
        errors: [],
        warnings: [],
      },
    ])

    mockUninstaller.ZcfUninstaller.mockImplementation(() => ({
      customUninstall: mockCustomUninstall,
    }))

    await uninstall()

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('uninstall:removedConfigs'))
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('uninstall:customSuccessBoth'))
    logSpy.mockRestore()
  })

  it('should show config-only success message when no files removed', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    mockInquirer.prompt
      .mockResolvedValueOnce({ mainChoice: 'custom' })
      .mockResolvedValueOnce({ customItems: ['output-styles'] })
    queuePromptBooleans(true)

    const mockCustomUninstall = vi.fn().mockResolvedValue([
      {
        success: true,
        removed: [],
        removedConfigs: ['configA'],
        errors: [],
        warnings: [],
      },
    ])

    mockUninstaller.ZcfUninstaller.mockImplementation(() => ({
      customUninstall: mockCustomUninstall,
    }))

    await uninstall()

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('uninstall:customSuccessConfigs'))
    logSpy.mockRestore()
  })
})
