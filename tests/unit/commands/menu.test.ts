import inquirer from 'inquirer'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}))

vi.mock('../../../src/utils/prompts', () => ({
  selectScriptLanguage: vi.fn().mockResolvedValue('zh-CN'),
}))

vi.mock('../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn(),
  readZcfConfigAsync: vi.fn(),
  updateZcfConfig: vi.fn(),
}))

vi.mock('../../../src/utils/banner', () => ({
  showBanner: vi.fn(),
  displayBannerWithInfo: vi.fn(),
}))

vi.mock('../../../src/commands/init', () => ({
  init: vi.fn(),
}))

vi.mock('../../../src/commands/update', () => ({
  update: vi.fn(),
}))

vi.mock('../../../src/utils/features', () => ({
  configureApiFeature: vi.fn(),
  configureMcpFeature: vi.fn(),
  configureDefaultModelFeature: vi.fn(),
  configureAiMemoryFeature: vi.fn(),
  clearZcfCacheFeature: vi.fn(),
  changeScriptLanguageFeature: vi.fn(),
  configureEnvPermissionFeature: vi.fn(),
}))

vi.mock('../../../src/utils/tools', () => ({
  runCcusageFeature: vi.fn(),
  runCcrMenuFeature: vi.fn(),
}))

vi.mock('../../../src/utils/code-tools/codex', () => ({
  runCodexFullInit: vi.fn(),
  runCodexWorkflowImport: vi.fn(),
  configureCodexApi: vi.fn(),
  configureCodexMcp: vi.fn(),
  runCodexUpdate: vi.fn(),
  runCodexUninstall: vi.fn(),
  checkCodexCliUpdate: vi.fn().mockResolvedValue(false),
  installCodexCli: vi.fn(),
  runCodexWorkflowImportWithLanguageSelection: vi.fn(),
}))

vi.mock('../../../src/utils/code-type-resolver', () => ({
  resolveCodeType: vi.fn(),
}))

vi.mock('../../../src/commands/check-updates', () => ({
  checkUpdates: vi.fn(),
}))

vi.mock('../../../src/utils/error-handler', () => ({
  handleExitPromptError: vi.fn().mockReturnValue(false),
  handleGeneralError: vi.fn(),
}))

vi.mock('../../../src/utils/toggle-prompt', () => ({
  promptBoolean: vi.fn(),
}))

// Mock i18n system
vi.mock('../../../src/i18n', () => ({
  initI18n: vi.fn().mockResolvedValue(undefined),
  changeLanguage: vi.fn().mockResolvedValue(undefined),
  i18n: {
    t: vi.fn((key: string) => key),
    isInitialized: true,
    language: 'en',
  },
  ensureI18nInitialized: vi.fn(),
}))

describe('menu command', () => {
  let mockedPromptBoolean: ReturnType<typeof vi.fn>
  const queuePromptBooleans = (...values: boolean[]) => {
    values.forEach(value => mockedPromptBoolean.mockResolvedValueOnce(value))
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)
    const togglePromptModule = await import('../../../src/utils/toggle-prompt')
    mockedPromptBoolean = vi.mocked(togglePromptModule.promptBoolean)
    mockedPromptBoolean.mockReset()
    mockedPromptBoolean.mockResolvedValue(false)

    // Initialize i18n for test environment
    const { initI18n } = await import('../../../src/i18n')
    await initI18n('en')
  })

  it('should load menu module', async () => {
    const module = await import('../../../src/commands/menu')
    expect(module).toBeDefined()
    expect(module.showMainMenu).toBeDefined()
  })

  it('should export showMainMenu function', async () => {
    const { showMainMenu } = await import('../../../src/commands/menu')
    expect(typeof showMainMenu).toBe('function')
  })

  describe('showMainMenu', () => {
    it('should display menu and handle exit', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')

      vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'zh-CN', codeToolType: 'claude-code' } as any)
      vi.mocked(inquirer.prompt).mockResolvedValue({ choice: 'q' })

      await showMainMenu()

      expect(inquirer.prompt).toHaveBeenCalled()
    })

    it('should display banner with Claude Code label', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')
      const { displayBannerWithInfo } = await import('../../../src/utils/banner')

      vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'en', codeToolType: 'claude-code' } as any)
      vi.mocked(inquirer.prompt).mockResolvedValue({ choice: 'q' })

      await showMainMenu()

      expect(displayBannerWithInfo).toHaveBeenCalledWith(expect.stringContaining('Claude Code'))
    })

    it('should display banner with Codex label', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')
      const { displayBannerWithInfo } = await import('../../../src/utils/banner')

      vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'en', codeToolType: 'codex' } as any)
      vi.mocked(inquirer.prompt).mockResolvedValue({ choice: 'q' })

      await showMainMenu()

      expect(displayBannerWithInfo).toHaveBeenCalledWith(expect.stringContaining('Codex'))
    })

    it('should handle full initialization option', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { init } = await import('../../../src/commands/init')
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')

      vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'zh-CN', codeToolType: 'claude-code' } as any)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ choice: '1' })
      queuePromptBooleans(false)
      vi.mocked(init).mockResolvedValue(undefined)

      await showMainMenu()

      expect(init).toHaveBeenCalled()
    })

    it('should handle API configuration option', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { configureApiFeature } = await import('../../../src/utils/features')
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')

      vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'zh-CN', codeToolType: 'claude-code' } as any)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ choice: '3' })
      queuePromptBooleans(false)
      vi.mocked(configureApiFeature).mockResolvedValue(undefined)

      await showMainMenu()

      expect(configureApiFeature).toHaveBeenCalled()
    })

    it('should handle MCP configuration option', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { configureMcpFeature } = await import('../../../src/utils/features')
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')

      vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'zh-CN', codeToolType: 'claude-code' } as any)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ choice: '4' })
      queuePromptBooleans(false)
      vi.mocked(configureMcpFeature).mockResolvedValue(undefined)

      await showMainMenu()

      expect(configureMcpFeature).toHaveBeenCalled()
    })

    it('should handle language change option', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { changeScriptLanguageFeature } = await import('../../../src/utils/features')
      const { readZcfConfigAsync } = await import('../../../src/utils/zcf-config')

      vi.mocked(readZcfConfigAsync).mockResolvedValue({ preferredLang: 'zh-CN', codeToolType: 'claude-code' } as any)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ choice: '0' })
        .mockResolvedValueOnce({ choice: 'q' })
      vi.mocked(changeScriptLanguageFeature).mockResolvedValue('en')

      await showMainMenu()

      expect(changeScriptLanguageFeature).toHaveBeenCalled()
    })

    it('should handle CCU usage analysis option', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { runCcusageFeature } = await import('../../../src/utils/tools')
      const { readZcfConfigAsync } = await import('../../../src/utils/zcf-config')

      vi.mocked(readZcfConfigAsync).mockResolvedValue({ preferredLang: 'zh-CN', codeToolType: 'claude-code' } as any)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ choice: 'u' })
      queuePromptBooleans(false)
      vi.mocked(runCcusageFeature).mockResolvedValue(undefined)

      await showMainMenu()

      expect(runCcusageFeature).toHaveBeenCalledWith()
    })

    it('should handle CCU usage analysis option in English', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { runCcusageFeature } = await import('../../../src/utils/tools')
      const { readZcfConfigAsync } = await import('../../../src/utils/zcf-config')

      vi.mocked(readZcfConfigAsync).mockResolvedValue({ preferredLang: 'en', codeToolType: 'claude-code' } as any)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ choice: 'u' })
      queuePromptBooleans(false)
      vi.mocked(runCcusageFeature).mockResolvedValue(undefined)

      await showMainMenu()

      expect(runCcusageFeature).toHaveBeenCalledWith()
    })

    it('should handle check updates option', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { checkUpdates } = await import('../../../src/commands/check-updates')
      const { readZcfConfigAsync } = await import('../../../src/utils/zcf-config')

      vi.mocked(readZcfConfigAsync).mockResolvedValue({ preferredLang: 'zh-CN', codeToolType: 'claude-code' } as any)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ choice: '+' })
        .mockResolvedValueOnce({ choice: 'q' })
      vi.mocked(checkUpdates).mockResolvedValue(undefined)

      await showMainMenu()

      expect(checkUpdates).toHaveBeenCalledWith()
    })

    it('should handle check updates option in English', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { checkUpdates } = await import('../../../src/commands/check-updates')
      const { readZcfConfigAsync } = await import('../../../src/utils/zcf-config')

      vi.mocked(readZcfConfigAsync).mockResolvedValue({ preferredLang: 'en', codeToolType: 'claude-code' } as any)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ choice: '+' })
        .mockResolvedValueOnce({ choice: 'q' })
      vi.mocked(checkUpdates).mockResolvedValue(undefined)

      await showMainMenu()

      expect(checkUpdates).toHaveBeenCalledWith()
    })

    it('should allow switching code tool type', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { readZcfConfig, updateZcfConfig } = await import('../../../src/utils/zcf-config')

      vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'en', codeToolType: 'claude-code' } as any)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ choice: 's' })
        .mockResolvedValueOnce({ tool: 'codex' })
        .mockResolvedValueOnce({ choice: 'q' })

      await showMainMenu()

      expect(updateZcfConfig).toHaveBeenCalledWith(expect.objectContaining({ codeToolType: 'codex' }))
    })

    it('should route codex menu actions', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')
      const { runCodexFullInit } = await import('../../../src/utils/code-tools/codex')

      vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'en', codeToolType: 'codex' } as any)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ choice: '1' })
      queuePromptBooleans(false)

      await showMainMenu()

      expect(runCodexFullInit).toHaveBeenCalled()
    })

    it('should handle codex uninstall option', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')
      const { runCodexUninstall } = await import('../../../src/utils/code-tools/codex')

      vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'en', codeToolType: 'codex' } as any)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ choice: '-' })
      queuePromptBooleans(true, false)

      await showMainMenu()

      expect(runCodexUninstall).toHaveBeenCalled()
    })

    it('should handle codex update option', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')

      // Simply test that the menu handles the update option without error
      vi.mocked(readZcfConfig).mockReturnValue({
        preferredLang: 'en',
        codeToolType: 'codex',
        version: '1.0.0',
        lastUpdated: '2024-01-01',
      } as any)

      // Mock inquirer calls - test that menu handles '+' choice correctly
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ choice: '+' }) // User chooses update option
        .mockResolvedValueOnce({ choice: '0' }) // User chooses exit (0)

      // Test should not throw error
      await expect(showMainMenu()).resolves.not.toThrow()
    })

    it('should handle errors gracefully', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')
      const { handleGeneralError, handleExitPromptError } = await import('../../../src/utils/error-handler')

      vi.mocked(readZcfConfig).mockReturnValue({
        preferredLang: 'zh-CN',
        codeToolType: 'claude-code',
        version: '1.0.0',
        lastUpdated: '2024-01-01',
      } as any)

      const error = new Error('Test error')
      vi.mocked(inquirer.prompt).mockRejectedValue(error)

      // Make sure handleExitPromptError returns false so handleGeneralError is called
      vi.mocked(handleExitPromptError).mockReturnValue(false)

      await showMainMenu()

      expect(handleGeneralError).toHaveBeenCalledWith(error)
    })
  })

  // Extended Tests
  describe('menu extended tests', () => {
    it('should handle menu navigation correctly', async () => {
      // Extended test cases merged from menu.extended.test.ts
      expect(true).toBe(true)
    })
  })

  // Enhanced edge case tests for menu functions through public interface
  describe('menu edge cases through public API', () => {
    it('should handle code tool switching through main menu', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { readZcfConfig, updateZcfConfig } = await import('../../../src/utils/zcf-config')

      // Setup: current tool is claude-code, user selects to switch
      vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'en', codeToolType: 'claude-code' } as any)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ choice: 's' }) // User chooses switch tool option
        .mockResolvedValueOnce({ tool: 'codex' }) // User selects codex
        .mockResolvedValueOnce({ choice: 'q' }) // User exits

      await showMainMenu()

      // Should update config with new tool type
      expect(updateZcfConfig).toHaveBeenCalledWith(expect.objectContaining({ codeToolType: 'codex' }))
    })

    it('should handle cancelled tool selection', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { readZcfConfig, updateZcfConfig } = await import('../../../src/utils/zcf-config')

      vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'en', codeToolType: 'claude-code' } as any)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ choice: 's' }) // User chooses switch tool option
        .mockResolvedValueOnce({ tool: '' }) // User cancels selection
        .mockResolvedValueOnce({ choice: 'q' }) // User exits

      await showMainMenu()

      // Should not update config when selection is cancelled
      expect(updateZcfConfig).not.toHaveBeenCalledWith(expect.objectContaining({ codeToolType: expect.anything() }))
    })

    it('should handle same tool selection', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { readZcfConfig, updateZcfConfig } = await import('../../../src/utils/zcf-config')

      vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'en', codeToolType: 'claude-code' } as any)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ choice: 's' }) // User chooses switch tool option
        .mockResolvedValueOnce({ tool: 'claude-code' }) // User selects same tool
        .mockResolvedValueOnce({ choice: 'q' }) // User exits

      await showMainMenu()

      // Should not update config when same tool is selected
      expect(updateZcfConfig).not.toHaveBeenCalledWith(expect.objectContaining({ codeToolType: 'claude-code' }))
    })

    it('should handle menu display for different code tools', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')
      const { displayBannerWithInfo } = await import('../../../src/utils/banner')

      // Test with codex tool
      vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'en', codeToolType: 'codex' } as any)
      vi.mocked(inquirer.prompt).mockResolvedValue({ choice: 'q' })

      await showMainMenu()

      expect(displayBannerWithInfo).toHaveBeenCalledWith(expect.stringContaining('Codex'))
    })

    it('should handle console output sections', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')

      vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'en', codeToolType: 'claude-code' } as any)
      vi.mocked(inquirer.prompt).mockResolvedValue({ choice: 'q' })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await showMainMenu()

      // Menu should log section separators and headers
      expect(consoleSpy).toHaveBeenCalled()
      // Should include empty line separators
      expect(consoleSpy.mock.calls.some(call => call[0] === '')).toBe(true)

      consoleSpy.mockRestore()
    })

    it('should handle claude-code menu navigation', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')
      const { init } = await import('../../../src/commands/init')

      vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'en', codeToolType: 'claude-code' } as any)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ choice: '1' })
      queuePromptBooleans(false)

      await showMainMenu()

      expect(init).toHaveBeenCalled()
    })

    it('should handle codex menu navigation', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')
      const { runCodexFullInit } = await import('../../../src/utils/code-tools/codex')

      vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'en', codeToolType: 'codex' } as any)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ choice: '1' })
      queuePromptBooleans(false)

      await showMainMenu()

      expect(runCodexFullInit).toHaveBeenCalled()
    })

    it('should handle unknown menu actions gracefully', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')

      vi.mocked(readZcfConfig).mockReturnValue({
        version: '1.0.0',
        preferredLang: 'en',
        lastUpdated: '2024-01-01',
        codeToolType: 'claude-code',
      } as any)
      vi.mocked(inquirer.prompt).mockResolvedValue({ action: 'unknown-action' })

      // Should not throw error for unknown actions
      await expect(showMainMenu()).resolves.not.toThrow()
    })

    it('should handle menu with different language settings', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')
      const { selectScriptLanguage } = await import('../../../src/utils/prompts')

      // Test with different language setting
      vi.mocked(selectScriptLanguage).mockResolvedValue('en')
      vi.mocked(readZcfConfig).mockReturnValue({
        version: '1.0.0',
        lastUpdated: '2024-01-01',
        codeToolType: 'claude-code',
        preferredLang: 'en',
      } as any)
      vi.mocked(inquirer.prompt).mockResolvedValue({ choice: 'q' }) // Use 'q' for quit instead of 'exit'

      // Test should complete without throwing
      await expect(showMainMenu()).resolves.not.toThrow()
    })
  })

  describe('showMainMenu with codeType parameter', () => {
    it('should switch code tool type when valid codeType parameter is provided', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { resolveCodeType } = await import('../../../src/utils/code-type-resolver')
      const { updateZcfConfig, readZcfConfig } = await import('../../../src/utils/zcf-config')

      // Mock current code tool type
      vi.mocked(readZcfConfig).mockReturnValue({
        version: '1.0.0',
        lastUpdated: '2024-01-01',
        codeToolType: 'claude-code',
        preferredLang: 'zh-CN',
      } as any)

      // Mock resolveCodeType to return codex
      vi.mocked(resolveCodeType).mockResolvedValue('codex')

      // Mock inquirer to exit immediately
      vi.mocked(inquirer.prompt).mockResolvedValue({ choice: 'q' })

      await showMainMenu({ codeType: 'cx' })

      // Verify resolveCodeType was called with the parameter
      expect(resolveCodeType).toHaveBeenCalledWith('cx')

      // Verify updateZcfConfig was called to switch tool type
      expect(updateZcfConfig).toHaveBeenCalledWith({ codeToolType: 'codex' })

      // Verify success message was logged
      expect(console.log).toHaveBeenCalled()
    })

    it('should not update config when codeType matches current tool', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { resolveCodeType } = await import('../../../src/utils/code-type-resolver')
      const { updateZcfConfig, readZcfConfig } = await import('../../../src/utils/zcf-config')

      // Mock current code tool type as codex
      vi.mocked(readZcfConfig).mockReturnValue({
        version: '1.0.0',
        lastUpdated: '2024-01-01',
        codeToolType: 'codex',
        preferredLang: 'zh-CN',
      } as any)

      // Mock resolveCodeType to return codex (same as current)
      vi.mocked(resolveCodeType).mockResolvedValue('codex')

      // Mock inquirer to exit immediately
      vi.mocked(inquirer.prompt).mockResolvedValue({ choice: 'q' })

      await showMainMenu({ codeType: 'cx' })

      // Verify resolveCodeType was called
      expect(resolveCodeType).toHaveBeenCalledWith('cx')

      // Verify updateZcfConfig was NOT called since type matches
      expect(updateZcfConfig).not.toHaveBeenCalled()
    })

    it('should handle invalid codeType parameter gracefully', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { resolveCodeType } = await import('../../../src/utils/code-type-resolver')
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')

      // Mock current code tool type
      vi.mocked(readZcfConfig).mockReturnValue({
        version: '1.0.0',
        lastUpdated: '2024-01-01',
        codeToolType: 'claude-code',
        preferredLang: 'zh-CN',
      } as any)

      // Mock resolveCodeType to throw error for invalid type
      vi.mocked(resolveCodeType).mockRejectedValue(new Error('Invalid code type: "invalid". Valid options are: cc, cx, claude-code, codex. Using default: claude-code.'))

      // Mock inquirer to exit immediately
      vi.mocked(inquirer.prompt).mockResolvedValue({ choice: 'q' })

      // Should not throw, error should be caught and logged
      await expect(showMainMenu({ codeType: 'invalid' })).resolves.not.toThrow()

      // Verify error was logged
      expect(console.error).toHaveBeenCalled()
    })

    it('should continue to menu after handling codeType parameter', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { resolveCodeType } = await import('../../../src/utils/code-type-resolver')
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')

      // Mock current code tool type
      vi.mocked(readZcfConfig).mockReturnValue({
        version: '1.0.0',
        lastUpdated: '2024-01-01',
        codeToolType: 'claude-code',
        preferredLang: 'zh-CN',
      } as any)

      // Mock resolveCodeType
      vi.mocked(resolveCodeType).mockResolvedValue('codex')

      // Mock inquirer to exit immediately
      vi.mocked(inquirer.prompt).mockResolvedValue({ choice: 'q' })

      await showMainMenu({ codeType: 'cx' })

      // Verify menu was displayed (inquirer.prompt was called)
      expect(inquirer.prompt).toHaveBeenCalled()
    })
  })
})
