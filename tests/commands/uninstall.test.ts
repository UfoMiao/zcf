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

const mockedPromptBoolean = vi.mocked(promptBoolean)
function queuePromptBooleans(...values: boolean[]) {
  values.forEach(value => mockedPromptBoolean.mockResolvedValueOnce(value))
}

vi.mocked(await import('inquirer')).default = mockInquirer as any
vi.mocked(await import('../../src/i18n')).i18n = mockI18n as any
vi.mocked(await import('../../src/utils/uninstaller')).ZcfUninstaller = mockUninstaller.ZcfUninstaller

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
      expect(mockInquirer.prompt).toHaveBeenCalledWith({
        type: 'list',
        name: 'mainChoice',
        message: 'uninstall:selectMainOption',
        choices: expect.arrayContaining([
          expect.objectContaining({ value: 'complete', short: 'uninstall:completeUninstall' }),
          expect.objectContaining({ value: 'custom', short: 'uninstall:customUninstall' }),
        ]),
      })
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
      expect(mockInquirer.prompt).toHaveBeenCalledWith({
        type: 'checkbox',
        name: 'customItems',
        message: 'uninstall:selectItemsToRemove common:multiSelectHint',
        choices: expect.arrayContaining([
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
        ]),
        validate: expect.any(Function),
      })

      expect(mockCustomUninstall).toHaveBeenCalledWith(['output-styles', 'commands'])
    })

    it('should validate that at least one item is selected in custom mode', async () => {
      mockInquirer.prompt
        .mockResolvedValueOnce({ mainChoice: 'custom' })
        .mockResolvedValueOnce({ customItems: [] })

      await uninstall()

      const validateFn = vi.mocked(mockInquirer.prompt).mock.calls[1][0].validate
      expect(validateFn([])).toBe('uninstall:selectAtLeastOne')
      expect(validateFn(['output-styles'])).toBe(true)
    })
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
})
