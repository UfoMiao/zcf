import cac from 'cac'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { version } from '../../package.json'
import { customizeHelp, setupCommands, withLanguageResolution } from '../../src/cli-setup'

// Mock commands
vi.mock('../../src/commands/menu', () => ({
  showMainMenu: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../src/commands/config-switch', () => ({
  configSwitchCommand: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../src/commands/uninstall', () => ({
  uninstall: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../src/commands/check-updates', () => ({
  checkUpdates: vi.fn().mockResolvedValue(undefined),
}))

// Use real i18n system for better integration testing
vi.mock('../../src/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/i18n')>()
  return {
    ...actual,
    // Only mock initialization functions to avoid setup issues in tests
    initI18n: vi.fn().mockResolvedValue(undefined),
    changeLanguage: vi.fn(),
    ensureI18nInitialized: vi.fn(),
  }
})

// Mock zcf-config
function createMockZcfConfig() {
  return {
    version: '1.0.0',
    preferredLang: 'en' as const,
    codeToolType: 'claude-code' as const,
    lastUpdated: new Date().toISOString(),
  }
}

vi.mock('../../src/utils/zcf-config', () => ({
  readZcfConfigAsync: vi.fn().mockResolvedValue(createMockZcfConfig()),
  readZcfConfig: vi.fn().mockReturnValue(createMockZcfConfig()),
  updateZcfConfig: vi.fn(),
}))

// Mock prompts
vi.mock('../../src/utils/prompts', () => ({
  selectScriptLanguage: vi.fn().mockResolvedValue('en'),
}))

const { changeLanguage, i18n } = await import('../../src/i18n')
const { checkUpdates } = await import('../../src/commands/check-updates')
const mockedCheckUpdates = vi.mocked(checkUpdates)
const { readZcfConfigAsync } = await import('../../src/utils/zcf-config')
const { selectScriptLanguage } = await import('../../src/utils/prompts')
const mockSelectScriptLanguage = vi.mocked(selectScriptLanguage)

describe('cli-setup', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // Import modules to ensure they're loaded for mocking
    await import('../../src/commands/menu')
    await import('../../src/commands/config-switch')
    await import('../../src/commands/uninstall')
    await import('../../src/commands/check-updates')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('setupCommands', () => {
    it('should setup only the retained commands on cli instance', async () => {
      const cli = cac('test')
      const commandSpy = vi.spyOn(cli, 'command')
      const helpSpy = vi.spyOn(cli, 'help')
      const versionSpy = vi.spyOn(cli, 'version')

      await setupCommands(cli)

      // Check that the retained commands were registered
      expect(commandSpy).toHaveBeenCalledWith('', 'Show interactive menu (default)')
      expect(commandSpy).toHaveBeenCalledWith(
        'config-switch [target]',
        'Switch Claude Code API configuration, or list available configurations',
      )
      expect(commandSpy).toHaveBeenCalledWith('uninstall', 'Remove ccs configurations and tools')
      expect(commandSpy).toHaveBeenCalledWith(
        'check-updates',
        'Check and update Claude Code and ccs to latest versions',
      )

      // Removed commands should not be registered
      const registeredNames = commandSpy.mock.calls.map(call => call[0])
      expect(registeredNames).not.toContain('init')
      expect(registeredNames).not.toContain('update')
      expect(registeredNames).not.toContain('ccr')
      expect(registeredNames.some(name => name.startsWith('ccu'))).toBe(false)

      // Check help and version were setup
      expect(helpSpy).toHaveBeenCalled()
      expect(versionSpy).toHaveBeenCalled()
    })
  })

  describe('withLanguageResolution', () => {
    beforeEach(() => {
      vi.mocked(changeLanguage).mockReset()
      mockSelectScriptLanguage.mockResolvedValue('en')
      vi.mocked(readZcfConfigAsync).mockResolvedValue(createMockZcfConfig())
    })

    it('should switch language when option specifies different language', async () => {
      i18n.isInitialized = true
      i18n.language = 'en'

      const wrapped = await withLanguageResolution(async (_options: any) => {}, false)
      await wrapped({ lang: 'zh-CN' })

      expect(changeLanguage).toHaveBeenCalledWith('zh-CN')
    })

    it('should prompt for language when not skipping and config missing', async () => {
      i18n.isInitialized = true
      i18n.language = 'en'
      vi.mocked(readZcfConfigAsync).mockResolvedValue(null)
      mockSelectScriptLanguage.mockResolvedValue('zh-CN')

      const wrapped = await withLanguageResolution(async (_options: any) => {}, false)
      await wrapped({})

      expect(mockSelectScriptLanguage).toHaveBeenCalled()
      expect(changeLanguage).toHaveBeenCalledWith('zh-CN')
    })

    it('should avoid switching when target equals current language', async () => {
      i18n.isInitialized = true
      i18n.language = 'en'

      const wrapped = await withLanguageResolution(async (_options: any) => {}, true)
      await wrapped({ lang: 'en' })

      expect(changeLanguage).not.toHaveBeenCalled()
    })
  })

  describe('customizeHelp', () => {
    it('should add custom sections to help', () => {
      const sections: any[] = []

      const result = customizeHelp(sections)

      // Should add header
      expect(result[0].body).toContain('ccs - Claude Code Switch')

      // Should add commands section
      const commandsSection = result.find(s => s.title.includes('Commands'))
      expect(commandsSection).toBeDefined()
      expect(commandsSection.body).toContain('ccs config-switch')
      expect(commandsSection.body).toContain('ccs check-updates')

      // Should add options section
      const optionsSection = result.find(s => s.title.includes('Options'))
      expect(optionsSection).toBeDefined()
      expect(optionsSection.body).toContain('--lang')

      // Should add examples section
      const examplesSection = result.find(s => s.title.includes('Examples'))
      expect(examplesSection).toBeDefined()
      expect(examplesSection.body).toContain('npx @xwm111/ccs')
    })

    it('should maintain existing sections', () => {
      const existingSection = { title: 'Existing', body: 'test' }
      const sections = [existingSection]

      const result = customizeHelp(sections)

      // Existing section should be present
      expect(result).toContain(existingSection)
      // Should have header + existing + 3 new sections
      expect(result.length).toBe(5)
    })
  })

  describe('cLI integration', () => {
    it('should create a functional CLI setup', async () => {
      const cli = cac('test')

      // Setup shouldn't throw (now async)
      await expect(setupCommands(cli)).resolves.not.toThrow()

      // Check that commands are properly registered
      expect(cli.commands.length).toBeGreaterThan(0)

      // Verify version is set
      expect(cli.globalCommand.versionNumber).toBe(version)
    })
  })

  describe('command line options', () => {
    let cli: any

    beforeEach(async () => {
      cli = cac('ccs-test')
      await setupCommands(cli)
    })

    it('should recognize --lang option on the default command', () => {
      const parsed = cli.parse(['node', 'test', '-l', 'zh-CN'], { run: false })
      expect(parsed.options.lang).toBe('zh-CN')
    })

    it('should recognize --all-lang option', () => {
      const parsed = cli.parse(['node', 'test', '-g', 'zh-CN'], { run: false })
      expect(parsed.options.allLang).toBe('zh-CN')
    })

    it('should recognize --list option for config-switch', () => {
      const parsed = cli.parse(['node', 'test', 'config-switch', '--list'], { run: false })
      expect(parsed.options.list).toBe(true)
    })
  })

  describe('check command options', () => {
    let cli: any

    beforeEach(async () => {
      cli = cac('ccs-test')
      await setupCommands(cli)
    })

    it('should recognize -s as shortcut for check command skip mode', () => {
      const parsed = cli.parse(['node', 'test', 'check', '-s'], { run: false })
      expect(parsed.options.skipPrompt).toBe(true)
    })

    it('should pass options to checkUpdates action', async () => {
      const checkCommand = cli.commands.find((cmd: any) => cmd.name === 'check-updates')
      expect(checkCommand).toBeDefined()
      if (checkCommand?.commandAction) {
        await checkCommand.commandAction({ skipPrompt: true })
        expect(mockedCheckUpdates).toHaveBeenCalledWith({ skipPrompt: true })
      }
    })
  })

  describe('default command', () => {
    it('should invoke showMainMenu', async () => {
      const cli = cac('test')
      await setupCommands(cli)

      const { showMainMenu } = await import('../../src/commands/menu')

      // Execute the default command action
      const defaultCommand = cli.commands.find(cmd => cmd.name === '')
      expect(defaultCommand).toBeDefined()

      if (defaultCommand?.commandAction) {
        await defaultCommand.commandAction({})
        expect(showMainMenu).toHaveBeenCalled()
      }
    })
  })
})
