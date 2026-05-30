import inquirer from 'inquirer'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}))

vi.mock('../../../src/utils/banner', () => ({
  displayBannerWithInfo: vi.fn(),
}))

vi.mock('../../../src/utils/features', () => ({
  configureApiFeature: vi.fn(),
  changeScriptLanguageFeature: vi.fn(),
}))

vi.mock('../../../src/commands/check-updates', () => ({
  checkUpdates: vi.fn(),
}))

vi.mock('../../../src/commands/uninstall', () => ({
  uninstall: vi.fn(),
}))

vi.mock('../../../src/utils/error-handler', () => ({
  handleExitPromptError: vi.fn().mockReturnValue(false),
  handleGeneralError: vi.fn(),
}))

vi.mock('../../../src/utils/toggle-prompt', () => ({
  promptBoolean: vi.fn(),
}))

vi.mock('../../../src/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/i18n')>()
  return {
    ...actual,
    ensureI18nInitialized: vi.fn(),
    i18n: {
      t: vi.fn((key: string) => key),
      language: 'zh-CN',
    },
  }
})

describe('showMainMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(inquirer.prompt).mockReset()
  })

  it('should export showMainMenu function', async () => {
    const module = await import('../../../src/commands/menu')
    expect(typeof module.showMainMenu).toBe('function')
  })

  it('should exit immediately when Q is selected', async () => {
    const { showMainMenu } = await import('../../../src/commands/menu')

    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ choice: 'q' })

    await expect(showMainMenu()).resolves.not.toThrow()
    expect(inquirer.prompt).toHaveBeenCalledTimes(1)
  })

  it('should call configureApiFeature when 1 is selected', async () => {
    const { showMainMenu } = await import('../../../src/commands/menu')
    const features = await import('../../../src/utils/features')
    const togglePrompt = await import('../../../src/utils/toggle-prompt')

    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ choice: '1' })
    // Decline returning to menu so the loop exits
    vi.mocked(togglePrompt.promptBoolean).mockResolvedValue(false)

    await showMainMenu()

    expect(features.configureApiFeature).toHaveBeenCalled()
  })

  it('should call changeScriptLanguageFeature when 0 is selected', async () => {
    const { showMainMenu } = await import('../../../src/commands/menu')
    const features = await import('../../../src/utils/features')

    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ choice: '0' })
      .mockResolvedValueOnce({ choice: 'q' })

    await showMainMenu()

    expect(features.changeScriptLanguageFeature).toHaveBeenCalled()
  })

  it('should call uninstall when - is selected', async () => {
    const { showMainMenu } = await import('../../../src/commands/menu')
    const uninstallModule = await import('../../../src/commands/uninstall')

    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ choice: '-' })
      .mockResolvedValueOnce({ choice: 'q' })

    await showMainMenu()

    expect(uninstallModule.uninstall).toHaveBeenCalled()
  })

  it('should call checkUpdates when + is selected', async () => {
    const { showMainMenu } = await import('../../../src/commands/menu')
    const checkUpdatesModule = await import('../../../src/commands/check-updates')

    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ choice: '+' })
      .mockResolvedValueOnce({ choice: 'q' })

    await showMainMenu()

    expect(checkUpdatesModule.checkUpdates).toHaveBeenCalled()
  })

  it('should ask to return to menu after API action and exit if declined', async () => {
    const { showMainMenu } = await import('../../../src/commands/menu')
    const togglePrompt = await import('../../../src/utils/toggle-prompt')

    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ choice: '1' })
    vi.mocked(togglePrompt.promptBoolean).mockResolvedValue(false)

    await showMainMenu()

    expect(togglePrompt.promptBoolean).toHaveBeenCalled()
    // only one prompt call since declining return-to-menu exits the loop
    expect(inquirer.prompt).toHaveBeenCalledTimes(1)
  })
})
