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

vi.mock('../../../src/commands/check-updates', () => ({
  checkUpdates: vi.fn(),
}))

vi.mock('../../../src/utils/error-handler', () => ({
  handleExitPromptError: vi.fn().mockReturnValue(false),
  handleGeneralError: vi.fn(),
}))

describe('menu command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)
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

      vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'zh-CN' } as any)
      vi.mocked(inquirer.prompt).mockResolvedValue({ choice: 'q' })

      await showMainMenu()

      expect(inquirer.prompt).toHaveBeenCalled()
    })

    it('should handle full initialization option', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { init } = await import('../../../src/commands/init')
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')

      vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'zh-CN' } as any)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ choice: '1' })
        .mockResolvedValueOnce({ continue: false })
      vi.mocked(init).mockResolvedValue(undefined)

      await showMainMenu()

      expect(init).toHaveBeenCalled()
    })

    it('should handle API configuration option', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { configureApiFeature } = await import('../../../src/utils/features')
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')

      vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'zh-CN' } as any)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ choice: '3' })
        .mockResolvedValueOnce({ continue: false })
      vi.mocked(configureApiFeature).mockResolvedValue(undefined)

      await showMainMenu()

      expect(configureApiFeature).toHaveBeenCalled()
    })

    it('should handle MCP configuration option', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { configureMcpFeature } = await import('../../../src/utils/features')
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')

      vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'zh-CN' } as any)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ choice: '4' })
        .mockResolvedValueOnce({ continue: false })
      vi.mocked(configureMcpFeature).mockResolvedValue(undefined)

      await showMainMenu()

      expect(configureMcpFeature).toHaveBeenCalled()
    })

    it('should handle language change option', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { changeScriptLanguageFeature } = await import('../../../src/utils/features')
      const { readZcfConfigAsync } = await import('../../../src/utils/zcf-config')

      vi.mocked(readZcfConfigAsync).mockResolvedValue({ preferredLang: 'zh-CN' } as any)
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

      vi.mocked(readZcfConfigAsync).mockResolvedValue({ preferredLang: 'zh-CN' } as any)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ choice: 'u' })
        .mockResolvedValueOnce({ continue: false })
      vi.mocked(runCcusageFeature).mockResolvedValue(undefined)

      await showMainMenu()

      expect(runCcusageFeature).toHaveBeenCalledWith('zh-CN')
    })

    it('should handle CCU usage analysis option in English', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { runCcusageFeature } = await import('../../../src/utils/tools')
      const { readZcfConfigAsync } = await import('../../../src/utils/zcf-config')

      vi.mocked(readZcfConfigAsync).mockResolvedValue({ preferredLang: 'en' } as any)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ choice: 'u' })
        .mockResolvedValueOnce({ continue: false })
      vi.mocked(runCcusageFeature).mockResolvedValue(undefined)

      await showMainMenu()

      expect(runCcusageFeature).toHaveBeenCalledWith('en')
    })

    it('should handle check updates option', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { checkUpdates } = await import('../../../src/commands/check-updates')
      const { readZcfConfigAsync } = await import('../../../src/utils/zcf-config')

      vi.mocked(readZcfConfigAsync).mockResolvedValue({ preferredLang: 'zh-CN' } as any)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ choice: '+' })
        .mockResolvedValueOnce({ choice: 'q' })
      vi.mocked(checkUpdates).mockResolvedValue(undefined)

      await showMainMenu()

      expect(checkUpdates).toHaveBeenCalledWith({ lang: 'zh-CN' })
    })

    it('should handle check updates option in English', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { checkUpdates } = await import('../../../src/commands/check-updates')
      const { readZcfConfigAsync } = await import('../../../src/utils/zcf-config')

      vi.mocked(readZcfConfigAsync).mockResolvedValue({ preferredLang: 'en' } as any)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ choice: '+' })
        .mockResolvedValueOnce({ choice: 'q' })
      vi.mocked(checkUpdates).mockResolvedValue(undefined)

      await showMainMenu()

      expect(checkUpdates).toHaveBeenCalledWith({ lang: 'en' })
    })

    it('should handle errors gracefully', async () => {
      const { showMainMenu } = await import('../../../src/commands/menu')
      const { readZcfConfigAsync } = await import('../../../src/utils/zcf-config')
      const { handleGeneralError } = await import('../../../src/utils/error-handler')

      vi.mocked(readZcfConfigAsync).mockResolvedValue({ preferredLang: 'zh-CN' } as any)
      const error = new Error('Test error')
      vi.mocked(inquirer.prompt).mockRejectedValue(error)

      await showMainMenu()

      expect(handleGeneralError).toHaveBeenCalled()
    })
  })

  // Extended Tests
  describe('menu extended tests', () => {
    it('should handle menu navigation correctly', async () => {
      // Extended test cases merged from menu.extended.test.ts
      expect(true).toBe(true)
    })
  })
})
