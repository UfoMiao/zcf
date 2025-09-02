import cac from 'cac'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { version } from '../../package.json'
import {

  customizeHelp,
  setupCommands,
} from '../../src/cli-setup'

// Mock commands
vi.mock('../../src/commands/init', () => ({
  init: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../src/commands/menu', () => ({
  showMainMenu: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../src/commands/update', () => ({
  update: vi.fn().mockResolvedValue(undefined),
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
vi.mock('../../src/utils/zcf-config', () => ({
  readZcfConfigAsync: vi.fn().mockResolvedValue({
    preferredLang: 'en',
  }),
  readZcfConfig: vi.fn().mockReturnValue({
    preferredLang: 'en',
  }),
  updateZcfConfig: vi.fn(),
}))

// Mock prompts
vi.mock('../../src/utils/prompts', () => ({
  selectScriptLanguage: vi.fn().mockResolvedValue('en'),
}))

describe('cli-setup', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // Import modules to ensure they're loaded for mocking
    await import('../../src/commands/init')
    await import('../../src/commands/menu')
    await import('../../src/commands/update')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('setupCommands', () => {
    it('should setup all commands on cli instance', async () => {
      const cli = cac('test')
      const commandSpy = vi.spyOn(cli, 'command')
      const helpSpy = vi.spyOn(cli, 'help')
      const versionSpy = vi.spyOn(cli, 'version')

      await setupCommands(cli)

      // Check that commands were registered
      expect(commandSpy).toHaveBeenCalledWith('', 'Show interactive menu (default)')
      expect(commandSpy).toHaveBeenCalledWith('init', 'Initialize Claude Code configuration')
      expect(commandSpy).toHaveBeenCalledWith('update', 'Update Claude Code prompts only')
      expect(commandSpy).toHaveBeenCalledWith('ccr', 'Configure Claude Code Router for model proxy')
      expect(commandSpy).toHaveBeenCalledWith('ccu [...args]', 'Run Claude Code usage analysis tool')
      expect(commandSpy).toHaveBeenCalledWith('check-updates', 'Check and update Claude Code and CCR to latest versions')

      // Check help and version were setup
      expect(helpSpy).toHaveBeenCalled()
      expect(versionSpy).toHaveBeenCalled()
    })
  })

  describe('customizeHelp', () => {
    it('should add custom sections to help', () => {
      const sections: any[] = []

      const result = customizeHelp(sections)

      // Should add header
      expect(result[0].body).toContain('ZCF - Zero-Config Claude-Code Flow')

      // Should add commands section
      const commandsSection = result.find(s => s.title.includes('Commands'))
      expect(commandsSection).toBeDefined()
      expect(commandsSection.body).toContain('zcf init')
      expect(commandsSection.body).toContain('zcf update')

      // Should add options section
      const optionsSection = result.find(s => s.title.includes('Options'))
      expect(optionsSection).toBeDefined()
      expect(optionsSection.body).toContain('--lang')
      expect(optionsSection.body).toContain('--config-lang')
      expect(optionsSection.body).toContain('--force')

      // Should add examples section
      const examplesSection = result.find(s => s.title.includes('Examples'))
      expect(examplesSection).toBeDefined()
      expect(examplesSection.body).toContain('npx zcf')
      expect(examplesSection.body).toContain('npx zcf init')
      expect(examplesSection.body).toContain('npx zcf u')
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
      // cac stores commands in the commands array
      expect(cli.commands.length).toBeGreaterThan(0)

      // Verify version is set
      expect(cli.globalCommand.versionNumber).toBe(version)
    })
  })

  describe('command line argument shortcuts', () => {
    let cli: any

    beforeEach(async () => {
      cli = cac('zcf-test')
      await setupCommands(cli)
    })

    describe('new single-character shortcuts', () => {
      it('should recognize -s as shortcut for --skip-prompt', () => {
        const parsed = cli.parse(['node', 'test', 'init', '-s'], { run: false })
        expect(parsed.options.skipPrompt).toBe(true)
      })

      it('should recognize -c as shortcut for --config-lang', () => {
        const parsed = cli.parse(['node', 'test', 'init', '-c', 'zh-CN'], { run: false })
        expect(parsed.options.configLang).toBe('zh-CN')
      })

      it('should recognize -a as shortcut for --ai-output-lang', () => {
        const parsed = cli.parse(['node', 'test', 'init', '-a', 'en'], { run: false })
        expect(parsed.options.aiOutputLang).toBe('en')
      })

      it('should recognize -r as shortcut for --config-action', () => {
        const parsed = cli.parse(['node', 'test', 'init', '-r', 'backup'], { run: false })
        expect(parsed.options.configAction).toBe('backup')
      })

      it('should recognize -t as shortcut for --api-type', () => {
        const parsed = cli.parse(['node', 'test', 'init', '-t', 'api_key'], { run: false })
        expect(parsed.options.apiType).toBe('api_key')
      })

      it('should recognize -k as shortcut for --api-key', () => {
        const parsed = cli.parse(['node', 'test', 'init', '-k', 'sk-test'], { run: false })
        expect(parsed.options.apiKey).toBe('sk-test')
      })

      it('should recognize -u as shortcut for --api-url', () => {
        const parsed = cli.parse(['node', 'test', 'init', '-u', 'https://api.example.com'], { run: false })
        expect(parsed.options.apiUrl).toBe('https://api.example.com')
      })

      it('should recognize -m as shortcut for --mcp-services', () => {
        const parsed = cli.parse(['node', 'test', 'init', '-m', 'context7,exa'], { run: false })
        expect(parsed.options.mcpServices).toBe('context7,exa')
      })

      it('should recognize -w as shortcut for --workflows', () => {
        const parsed = cli.parse(['node', 'test', 'init', '-w', 'bmadWorkflow'], { run: false })
        expect(parsed.options.workflows).toBe('bmadWorkflow')
      })

      it('should recognize -o as shortcut for --output-styles', () => {
        const parsed = cli.parse(['node', 'test', 'init', '-o', 'nekomata-engineer'], { run: false })
        expect(parsed.options.outputStyles).toBe('nekomata-engineer')
      })

      it('should recognize -d as shortcut for --default-output-style', () => {
        const parsed = cli.parse(['node', 'test', 'init', '-d', 'engineer-professional'], { run: false })
        expect(parsed.options.defaultOutputStyle).toBe('engineer-professional')
      })

      it('should recognize -g as shortcut for --all-lang', () => {
        const parsed = cli.parse(['node', 'test', 'init', '-g', 'zh-CN'], { run: false })
        expect(parsed.options.allLang).toBe('zh-CN')
      })

      it('should recognize -x as shortcut for --install-cometix-line', () => {
        const parsed = cli.parse(['node', 'test', 'init', '-x', 'false'], { run: false })
        expect(parsed.options.installCometixLine).toBe('false')
      })

      it('should work with multiple new shortcuts together', () => {
        const parsed = cli.parse(['node', 'test', 'init', '-s', '-c', 'zh-CN', '-a', 'en', '-t', 'api_key'], { run: false })
        expect(parsed.options.skipPrompt).toBe(true)
        expect(parsed.options.configLang).toBe('zh-CN')
        expect(parsed.options.aiOutputLang).toBe('en')
        expect(parsed.options.apiType).toBe('api_key')
      })
    })

    describe('shortcut conflict prevention', () => {
      it('should not conflict with existing -l shortcut (lang)', () => {
        const parsed = cli.parse(['node', 'test', 'init', '-l', 'zh-CN'], { run: false })
        expect(parsed.options.lang).toBe('zh-CN')
      })

      it('should not conflict with existing -f shortcut (force)', () => {
        const parsed = cli.parse(['node', 'test', 'init', '-f'], { run: false })
        expect(parsed.options.force).toBe(true)
      })
    })

    describe('help text verification', () => {
      it('should display all shortcuts in help text', () => {
        const helpSections = customizeHelp([])
        const optionsSection = helpSections.find(s => s.title.includes('Options'))

        // All new single-character shortcuts should be present
        expect(optionsSection.body).toContain('-s') // skip-prompt
        expect(optionsSection.body).toContain('-c') // config-lang
        expect(optionsSection.body).toContain('-a') // ai-output-lang
        expect(optionsSection.body).toContain('-o') // config-action
        expect(optionsSection.body).toContain('-t') // api-type
        expect(optionsSection.body).toContain('-k') // api-key
        expect(optionsSection.body).toContain('-u') // api-url
        expect(optionsSection.body).toContain('-m') // mcp-services
        expect(optionsSection.body).toContain('-w') // workflows
        expect(optionsSection.body).toContain('-o') // output-styles
        expect(optionsSection.body).toContain('-g') // all-lang
        expect(optionsSection.body).toContain('-x') // install-cometix-line
      })

      it('should have proper formatting in help text', () => {
        const helpSections = customizeHelp([])
        const optionsSection = helpSections.find(s => s.title.includes('Options'))

        // Should contain properly formatted options
        expect(optionsSection.body).toContain('--skip-prompt, -s')
        expect(optionsSection.body).toContain('--config-lang, -c')
        expect(optionsSection.body).toContain('--ai-output-lang, -a')
      })
    })
  })
})
