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

describe('showMainMenu - edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(inquirer.prompt).mockReset()
  })

  it('should exit when no choice is returned', async () => {
    const { showMainMenu } = await import('../../../src/commands/menu')

    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ choice: undefined })

    await expect(showMainMenu()).resolves.not.toThrow()
    expect(inquirer.prompt).toHaveBeenCalledTimes(1)
  })

  it('should handle uppercase Q the same as lowercase q', async () => {
    const { showMainMenu } = await import('../../../src/commands/menu')

    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ choice: 'Q' })

    await expect(showMainMenu()).resolves.not.toThrow()
    expect(inquirer.prompt).toHaveBeenCalledTimes(1)
  })

  it('should keep looping until the user returns to menu and then exits', async () => {
    const { showMainMenu } = await import('../../../src/commands/menu')
    const togglePrompt = await import('../../../src/utils/toggle-prompt')

    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ choice: '1' })
      .mockResolvedValueOnce({ choice: 'q' })
    vi.mocked(togglePrompt.promptBoolean).mockResolvedValue(true)

    await showMainMenu()

    expect(inquirer.prompt).toHaveBeenCalledTimes(2)
  })

  it('should route ExitPromptError to handleExitPromptError', async () => {
    const { showMainMenu } = await import('../../../src/commands/menu')
    const errorHandler = await import('../../../src/utils/error-handler')

    const exitError = new Error('User force closed the prompt')
    vi.mocked(inquirer.prompt).mockRejectedValueOnce(exitError)
    vi.mocked(errorHandler.handleExitPromptError).mockReturnValue(true)

    await showMainMenu()

    expect(errorHandler.handleExitPromptError).toHaveBeenCalledWith(exitError)
    expect(errorHandler.handleGeneralError).not.toHaveBeenCalled()
  })

  it('should route generic errors to handleGeneralError', async () => {
    const { showMainMenu } = await import('../../../src/commands/menu')
    const errorHandler = await import('../../../src/utils/error-handler')

    const genericError = new Error('boom')
    vi.mocked(inquirer.prompt).mockRejectedValueOnce(genericError)
    vi.mocked(errorHandler.handleExitPromptError).mockReturnValue(false)

    await showMainMenu()

    expect(errorHandler.handleGeneralError).toHaveBeenCalledWith(genericError)
  })
})
