import inquirer from 'inquirer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  handleClaudeCodeDirectSwitch,
  handleClaudeCodeInteractiveSwitch,
  handleCodexInteractiveSwitch,
} from '../../../src/code-tools/configuration-ui'
import { ClaudeCodeConfigManager } from '../../../src/utils/claude-code-config-manager'
import { listCodexProviders, readCodexConfig, switchToOfficialLogin, switchToProvider } from '../../../src/utils/code-tools/codex'

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}))
vi.mock('../../../src/utils/claude-code-config-manager', () => ({
  ClaudeCodeConfigManager: {
    applyProfileSettings: vi.fn(),
    getProfileById: vi.fn(),
    readConfig: vi.fn(),
    switchProfile: vi.fn(),
    switchToCcr: vi.fn(),
    switchToOfficial: vi.fn(),
  },
}))
vi.mock('../../../src/utils/code-tools/codex', () => ({
  listCodexProviders: vi.fn(),
  readCodexConfig: vi.fn(),
  switchToOfficialLogin: vi.fn(),
  switchToProvider: vi.fn(),
}))
vi.mock('../../../src/utils/prompt-helpers', () => ({
  addNumbersToChoices: vi.fn(choices => choices),
}))
vi.mock('../../../src/i18n', () => ({
  i18n: {
    t: vi.fn((key: string) => key),
  },
}))

describe('code tool configuration UI edge paths', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('reports application failures after switching to official or CCR modes', async () => {
    vi.mocked(ClaudeCodeConfigManager.switchToOfficial).mockResolvedValue({ success: true })
    vi.mocked(ClaudeCodeConfigManager.switchToCcr).mockResolvedValue({ success: true })
    vi.mocked(ClaudeCodeConfigManager.applyProfileSettings).mockRejectedValue(new Error('apply failed'))

    await handleClaudeCodeDirectSwitch('official')
    await handleClaudeCodeDirectSwitch('ccr')

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('apply failed'))
  })

  it('handles missing and unknown Claude profiles without mutating settings', async () => {
    vi.mocked(ClaudeCodeConfigManager.readConfig)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({
        profiles: {
          one: { id: 'one', name: 'One', authType: 'api_key' },
        },
      } as any)

    await handleClaudeCodeDirectSwitch('missing')
    await handleClaudeCodeDirectSwitch('missing')

    expect(ClaudeCodeConfigManager.switchProfile).not.toHaveBeenCalled()
  })

  it('reports profile application failures after resolving a profile by name', async () => {
    vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue({
      profiles: {
        one: { id: 'one', name: 'One', authType: 'api_key' },
      },
    } as any)
    vi.mocked(ClaudeCodeConfigManager.switchProfile).mockResolvedValue({ success: true })
    vi.mocked(ClaudeCodeConfigManager.applyProfileSettings).mockRejectedValue('apply failed')

    await handleClaudeCodeDirectSwitch('One')

    expect(ClaudeCodeConfigManager.switchProfile).toHaveBeenCalledWith('one')
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('apply failed'))
  })

  it('handles cancellation and ExitPromptError in interactive Claude selection', async () => {
    vi.mocked(ClaudeCodeConfigManager.readConfig).mockReturnValue({
      profiles: {
        one: { id: 'one', name: 'One', authType: 'api_key' },
      },
    } as any)
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ selectedConfig: undefined })
      .mockRejectedValueOnce(Object.assign(new Error('exit'), { name: 'ExitPromptError' }))

    await handleClaudeCodeInteractiveSwitch()
    await handleClaudeCodeInteractiveSwitch()

    expect(console.log).toHaveBeenCalled()
  })

  it('handles cancellation in interactive Codex selection', async () => {
    vi.mocked(listCodexProviders).mockResolvedValue([{
      id: 'one',
      name: 'One',
      baseUrl: 'https://example.test',
    }] as any)
    vi.mocked(readCodexConfig).mockReturnValue(null)
    vi.mocked(inquirer.prompt).mockResolvedValue({ selectedConfig: undefined })

    await handleCodexInteractiveSwitch()

    expect(switchToOfficialLogin).not.toHaveBeenCalled()
    expect(switchToProvider).not.toHaveBeenCalled()
  })
})
