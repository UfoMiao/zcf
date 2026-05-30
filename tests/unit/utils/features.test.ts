import inquirer from 'inquirer'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}))

vi.mock('../../../src/utils/config', () => ({
  switchToOfficialLogin: vi.fn(),
}))

vi.mock('../../../src/utils/claude-code-incremental-manager', () => ({
  configureIncrementalManagement: vi.fn(),
}))

vi.mock('../../../src/commands/config-switch', () => ({
  configSwitchCommand: vi.fn(),
}))

vi.mock('../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn(),
  updateZcfConfig: vi.fn(),
}))

vi.mock('../../../src/utils/prompt-helpers', () => ({
  addNumbersToChoices: vi.fn(choices => choices),
}))

// Use real i18n system for better integration testing
vi.mock('../../../src/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/i18n')>()
  return {
    ...actual,
    ensureI18nInitialized: vi.fn(),
    changeLanguage: vi.fn(),
  }
})

describe('features utilities', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(inquirer.prompt).mockReset()
  })

  it('should load features module', async () => {
    const module = await import('../../../src/utils/features')
    expect(module).toBeDefined()
  })

  it('should export only the retained feature functions', async () => {
    const module = await import('../../../src/utils/features')
    expect(typeof module.configureApiFeature).toBe('function')
    expect(typeof module.promptCustomModels).toBe('function')
    expect(typeof module.changeScriptLanguageFeature).toBe('function')
  })

  describe('configureApiFeature', () => {
    it('should handle official login mode', async () => {
      const { configureApiFeature } = await import('../../../src/utils/features')
      const configModule = await import('../../../src/utils/config')

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ mode: 'official' })
      vi.mocked(configModule.switchToOfficialLogin).mockReturnValue(true)

      await configureApiFeature()

      expect(configModule.switchToOfficialLogin).toHaveBeenCalled()
    })

    it('should handle official login failure gracefully', async () => {
      const { configureApiFeature } = await import('../../../src/utils/features')
      const configModule = await import('../../../src/utils/config')

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ mode: 'official' })
      vi.mocked(configModule.switchToOfficialLogin).mockReturnValue(false)

      await expect(configureApiFeature()).resolves.not.toThrow()
    })

    it('should handle custom API mode via incremental manager', async () => {
      const { configureApiFeature } = await import('../../../src/utils/features')
      const incrementalModule = await import('../../../src/utils/claude-code-incremental-manager')

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ mode: 'custom' })

      await configureApiFeature()

      expect(incrementalModule.configureIncrementalManagement).toHaveBeenCalled()
    })

    it('should handle switch config mode', async () => {
      const { configureApiFeature } = await import('../../../src/utils/features')
      const configSwitchModule = await import('../../../src/commands/config-switch')

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ mode: 'switch' })

      await configureApiFeature()

      expect(configSwitchModule.configSwitchCommand).toHaveBeenCalled()
    })

    it('should handle skip mode without errors', async () => {
      const { configureApiFeature } = await import('../../../src/utils/features')

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ mode: 'skip' })

      await expect(configureApiFeature()).resolves.not.toThrow()
    })

    it('should handle cancellation (no mode selected)', async () => {
      const { configureApiFeature } = await import('../../../src/utils/features')

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ mode: undefined })

      await expect(configureApiFeature()).resolves.not.toThrow()
    })
  })

  describe('promptCustomModels', () => {
    it('should return collected model names', async () => {
      const { promptCustomModels } = await import('../../../src/utils/features')

      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ primaryModel: 'primary' })
        .mockResolvedValueOnce({ haikuModel: 'haiku' })
        .mockResolvedValueOnce({ sonnetModel: 'sonnet' })
        .mockResolvedValueOnce({ opusModel: 'opus' })

      const result = await promptCustomModels()

      expect(result).toEqual({
        primaryModel: 'primary',
        haikuModel: 'haiku',
        sonnetModel: 'sonnet',
        opusModel: 'opus',
      })
    })
  })

  describe('changeScriptLanguageFeature', () => {
    it('should update language when a new language is selected', async () => {
      const { changeScriptLanguageFeature } = await import('../../../src/utils/features')
      const zcfConfigModule = await import('../../../src/utils/zcf-config')

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ lang: 'en' })

      const result = await changeScriptLanguageFeature('zh-CN')

      expect(result).toBe('en')
      expect(zcfConfigModule.updateZcfConfig).toHaveBeenCalledWith({ preferredLang: 'en' })
    })

    it('should keep current language when nothing is selected', async () => {
      const { changeScriptLanguageFeature } = await import('../../../src/utils/features')

      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ lang: undefined })

      const result = await changeScriptLanguageFeature('zh-CN')

      expect(result).toBe('zh-CN')
    })
  })
})
