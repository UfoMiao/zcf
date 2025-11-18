import { existsSync } from 'node:fs'
import inquirer from 'inquirer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as ccrCommands from '../../../src/utils/ccr/commands'
import * as ccrConfig from '../../../src/utils/ccr/config'
import * as ccrInstaller from '../../../src/utils/ccr/installer'
import { promptBoolean } from '../../../src/utils/toggle-prompt'
import { showCcrMenu } from '../../../src/utils/tools/ccr-menu'

vi.mock('node:fs')
vi.mock('inquirer')
vi.mock('../../../src/utils/ccr/installer')
vi.mock('../../../src/utils/ccr/config')
vi.mock('../../../src/utils/ccr/commands')
vi.mock('../../../src/utils/error-handler', () => ({
  handleGeneralError: vi.fn((error: Error) => {
    console.error(`Error: ${error.message}`)
  }),
  handleExitPromptError: vi.fn(),
}))
vi.mock('../../../src/utils/toggle-prompt', () => ({
  promptBoolean: vi.fn(),
}))

describe('cCR Menu', () => {
  let consoleLogSpy: any
  const mockedPromptBoolean = vi.mocked(promptBoolean)

  beforeEach(() => {
    vi.clearAllMocks()
    mockedPromptBoolean.mockReset()
    mockedPromptBoolean.mockResolvedValue(false)
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    // Mock existsSync to return true for CCR config file
    vi.mocked(existsSync).mockReturnValue(true)

    // Mock readCcrConfig to return a valid CCR config by default
    vi.mocked(ccrConfig.readCcrConfig).mockReturnValue({
      APIKEY: 'test-key',
      Providers: [
        {
          Provider: 'anthropic',
          APIKey: 'test-key',
        },
      ],
      Router: {
        Routes: [],
      },
    } as any)
  })

  it('should display CCR menu options', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ choice: '0' })

    await showCcrMenu()

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('CCR - Claude Code Router Management'))
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Initialize CCR'))
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Start CCR UI'))
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Check CCR Status'))
  })

  it('should handle initialize CCR option', async () => {
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ choice: '1' })
    vi.mocked(ccrInstaller.isCcrInstalled).mockResolvedValue({ isInstalled: false, hasCorrectPackage: false })
    vi.mocked(ccrInstaller.installCcr).mockResolvedValue()
    vi.mocked(ccrConfig.configureCcrFeature).mockResolvedValue()

    await showCcrMenu()

    expect(ccrInstaller.isCcrInstalled).toHaveBeenCalled()
    expect(ccrInstaller.installCcr).toHaveBeenCalled()
    expect(ccrConfig.configureCcrFeature).toHaveBeenCalled()
  })

  it('should skip CCR installation if already installed', async () => {
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ choice: '1' })
    vi.mocked(ccrInstaller.isCcrInstalled).mockResolvedValue({ isInstalled: true, hasCorrectPackage: true })
    vi.mocked(ccrConfig.configureCcrFeature).mockResolvedValue()

    await showCcrMenu()

    expect(ccrInstaller.isCcrInstalled).toHaveBeenCalled()
    expect(ccrInstaller.installCcr).not.toHaveBeenCalled()
    expect(ccrConfig.configureCcrFeature).toHaveBeenCalled()
  })

  it('should handle start UI option', async () => {
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ choice: '2' })
    vi.mocked(ccrCommands.runCcrUi).mockResolvedValue()

    await showCcrMenu()

    expect(ccrCommands.runCcrUi).toHaveBeenCalledWith('test-key')
  })

  it('should handle check status option', async () => {
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ choice: '3' })
    vi.mocked(ccrCommands.runCcrStatus).mockResolvedValue()

    await showCcrMenu()

    expect(ccrCommands.runCcrStatus).toHaveBeenCalled()
  })

  it('should handle restart option', async () => {
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ choice: '4' })
    vi.mocked(ccrCommands.runCcrRestart).mockResolvedValue()

    await showCcrMenu()

    expect(ccrCommands.runCcrRestart).toHaveBeenCalled()
  })

  it('should handle start option', async () => {
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ choice: '5' })
    vi.mocked(ccrCommands.runCcrStart).mockResolvedValue()

    await showCcrMenu()

    expect(ccrCommands.runCcrStart).toHaveBeenCalled()
  })

  it('should handle stop option', async () => {
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ choice: '6' })
    vi.mocked(ccrCommands.runCcrStop).mockResolvedValue()

    await showCcrMenu()

    expect(ccrCommands.runCcrStop).toHaveBeenCalled()
  })

  it('should return false when back option is selected', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ choice: '0' })

    const result = await showCcrMenu()

    expect(result).toBe(false)
  })

  it('should loop back to menu when continue is selected', async () => {
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ choice: '3' })
      .mockResolvedValueOnce({ choice: '0' })
    mockedPromptBoolean.mockResolvedValueOnce(true).mockResolvedValue(false)
    vi.mocked(ccrCommands.runCcrStatus).mockResolvedValue()

    await showCcrMenu()

    expect(ccrCommands.runCcrStatus).toHaveBeenCalledTimes(1)
    expect(mockedPromptBoolean).toHaveBeenCalledTimes(1)
    expect(inquirer.prompt).toHaveBeenCalledTimes(2)
  })
})
