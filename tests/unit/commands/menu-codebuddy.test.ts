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

vi.mock('../../../src/commands/uninstall', () => ({
  uninstall: vi.fn(),
}))

vi.mock('../../../src/utils/features', () => ({
  changeScriptLanguageFeature: vi.fn(),
  clearZcfCacheFeature: vi.fn(),
}))

vi.mock('../../../src/utils/tools', () => ({
  runCcusageFeature: vi.fn(),
  runCcrMenuFeature: vi.fn(),
  runCometixMenuFeature: vi.fn(),
}))

vi.mock('../../../src/utils/code-tools/codex', () => ({
  runCodexFullInit: vi.fn(),
  runCodexWorkflowImportWithLanguageSelection: vi.fn(),
  configureCodexApi: vi.fn(),
  configureCodexMcp: vi.fn(),
  runCodexUpdate: vi.fn(),
  runCodexUninstall: vi.fn(),
}))

vi.mock('../../../src/utils/code-tools/codebuddy', () => ({
  runCodebuddyFullInit: vi.fn(),
  runCodebuddyUpdate: vi.fn(),
  configureCodebuddyApi: vi.fn(),
  configureCodebuddyMcp: vi.fn(),
  runCodebuddyUninstall: vi.fn(),
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

describe('menu codebuddy', () => {
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

    const { initI18n } = await import('../../../src/i18n')
    await initI18n('en')
  })

  it('should display CodeBuddy banner', async () => {
    const { showMainMenu } = await import('../../../src/commands/menu')
    const { readZcfConfig } = await import('../../../src/utils/zcf-config')
    const { displayBannerWithInfo } = await import('../../../src/utils/banner')

    vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'en', codeToolType: 'codebuddy' } as any)
    vi.mocked(inquirer.prompt).mockResolvedValue({ choice: 'q' })

    await showMainMenu()

    expect(displayBannerWithInfo).toHaveBeenCalledWith(expect.stringContaining('CodeBuddy'))
  })

  it('should handle full init option', async () => {
    const { showMainMenu } = await import('../../../src/commands/menu')
    const { readZcfConfig } = await import('../../../src/utils/zcf-config')
    const { runCodebuddyFullInit } = await import('../../../src/utils/code-tools/codebuddy')

    vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'en', codeToolType: 'codebuddy' } as any)
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ choice: '1' })
    queuePromptBooleans(false)

    await showMainMenu()

    expect(runCodebuddyFullInit).toHaveBeenCalled()
  })

  it('should handle check updates option', async () => {
    const { showMainMenu } = await import('../../../src/commands/menu')
    const { readZcfConfig } = await import('../../../src/utils/zcf-config')
    const { runCodebuddyUpdate } = await import('../../../src/utils/code-tools/codebuddy')

    vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'en', codeToolType: 'codebuddy' } as any)
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ choice: '2' }).mockResolvedValueOnce({ choice: 'q' })

    await showMainMenu()

    expect(runCodebuddyUpdate).toHaveBeenCalledWith(true)
  })

  it('should handle configure API option', async () => {
    const { showMainMenu } = await import('../../../src/commands/menu')
    const { readZcfConfig } = await import('../../../src/utils/zcf-config')
    const { configureCodebuddyApi } = await import('../../../src/utils/code-tools/codebuddy')

    vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'en', codeToolType: 'codebuddy' } as any)
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ choice: '3' })
    queuePromptBooleans(false)

    await showMainMenu()

    expect(configureCodebuddyApi).toHaveBeenCalled()
  })

  it('should handle configure MCP option', async () => {
    const { showMainMenu } = await import('../../../src/commands/menu')
    const { readZcfConfig } = await import('../../../src/utils/zcf-config')
    const { configureCodebuddyMcp } = await import('../../../src/utils/code-tools/codebuddy')

    vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'en', codeToolType: 'codebuddy' } as any)
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ choice: '4' })
    queuePromptBooleans(false)

    await showMainMenu()

    expect(configureCodebuddyMcp).toHaveBeenCalled()
  })

  it('should handle language change option', async () => {
    const { showMainMenu } = await import('../../../src/commands/menu')
    const { readZcfConfig } = await import('../../../src/utils/zcf-config')
    const { changeScriptLanguageFeature } = await import('../../../src/utils/features')

    vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'en', codeToolType: 'codebuddy' } as any)
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ choice: '0' }).mockResolvedValueOnce({ choice: 'q' })
    vi.mocked(changeScriptLanguageFeature).mockResolvedValue('zh-CN')

    await showMainMenu()

    expect(changeScriptLanguageFeature).toHaveBeenCalled()
  })

  it('should handle uninstall option', async () => {
    const { showMainMenu } = await import('../../../src/commands/menu')
    const { readZcfConfig } = await import('../../../src/utils/zcf-config')
    const { runCodebuddyUninstall } = await import('../../../src/utils/code-tools/codebuddy')

    vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'en', codeToolType: 'codebuddy' } as any)
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ choice: '-' }).mockResolvedValueOnce({ choice: 'q' })

    await showMainMenu()

    expect(runCodebuddyUninstall).toHaveBeenCalled()
  })

  it('should handle update option via plus key', async () => {
    const { showMainMenu } = await import('../../../src/commands/menu')
    const { readZcfConfig } = await import('../../../src/utils/zcf-config')
    const { checkUpdates } = await import('../../../src/commands/check-updates')

    vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'en', codeToolType: 'codebuddy' } as any)
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ choice: '+' }).mockResolvedValueOnce({ choice: 'q' })
    vi.mocked(checkUpdates).mockResolvedValue(undefined)

    await showMainMenu()

    expect(checkUpdates).toHaveBeenCalledWith({})
  })

  it('should handle switch code tool option', async () => {
    const { showMainMenu } = await import('../../../src/commands/menu')
    const { readZcfConfig, updateZcfConfig } = await import('../../../src/utils/zcf-config')

    vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'en', codeToolType: 'codebuddy' } as any)
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ choice: 's' })
      .mockResolvedValueOnce({ tool: 'claude-code' })
      .mockResolvedValueOnce({ choice: 'q' })

    await showMainMenu()

    expect(updateZcfConfig).toHaveBeenCalledWith(expect.objectContaining({ codeToolType: 'claude-code' }))
  })

  it('should handle quit option', async () => {
    const { showMainMenu } = await import('../../../src/commands/menu')
    const { readZcfConfig } = await import('../../../src/utils/zcf-config')

    vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'en', codeToolType: 'codebuddy' } as any)
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ choice: 'q' })

    await showMainMenu()

    expect(inquirer.prompt).toHaveBeenCalled()
  })

  it('should handle cancelled input', async () => {
    const { showMainMenu } = await import('../../../src/commands/menu')
    const { readZcfConfig } = await import('../../../src/utils/zcf-config')

    vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'en', codeToolType: 'codebuddy' } as any)
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ choice: '' }).mockResolvedValueOnce({ choice: 'q' })

    await expect(showMainMenu()).resolves.not.toThrow()
  })

  it('should handle invalid choice gracefully', async () => {
    const { showMainMenu } = await import('../../../src/commands/menu')
    const { readZcfConfig } = await import('../../../src/utils/zcf-config')

    vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'en', codeToolType: 'codebuddy' } as any)
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ choice: '99' }).mockResolvedValueOnce({ choice: 'q' })

    await expect(showMainMenu()).resolves.not.toThrow()
  })

  it('should validate codebuddy menu choices', async () => {
    const { showMainMenu } = await import('../../../src/commands/menu')
    const { readZcfConfig } = await import('../../../src/utils/zcf-config')

    vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'en', codeToolType: 'codebuddy' } as any)
    vi.mocked(inquirer.prompt).mockResolvedValue({ choice: 'q' })

    await showMainMenu()

    const promptConfig = vi.mocked(inquirer.prompt).mock.calls[0][0] as any
    expect(promptConfig.validate('1')).toBe(true)
    expect(promptConfig.validate('x')).toBe('common:invalidChoice')
  })

  it('should handle switch to same code tool', async () => {
    const { showMainMenu } = await import('../../../src/commands/menu')
    const { readZcfConfig, updateZcfConfig } = await import('../../../src/utils/zcf-config')

    vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'en', codeToolType: 'codebuddy' } as any)
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ choice: 's' })
      .mockResolvedValueOnce({ tool: 'codebuddy' })
      .mockResolvedValueOnce({ choice: 'q' })

    await showMainMenu()

    expect(updateZcfConfig).not.toHaveBeenCalled()
  })

  it('should exit menu when user declines to continue', async () => {
    const { showMainMenu } = await import('../../../src/commands/menu')
    const { readZcfConfig } = await import('../../../src/utils/zcf-config')
    const { runCodebuddyFullInit } = await import('../../../src/utils/code-tools/codebuddy')

    vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'en', codeToolType: 'codebuddy' } as any)
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ choice: '1' })
    queuePromptBooleans(false)

    await showMainMenu()

    expect(runCodebuddyFullInit).toHaveBeenCalled()
  })
})
