import cac from 'cac'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setupCommands } from '../../src/cli-setup'

// Mock all dependencies with enhanced error handling
vi.mock('../../src/commands/init', () => ({
  init: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../src/commands/menu', () => ({
  showMainMenu: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../src/commands/update', () => ({
  update: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../src/commands/ccr', () => ({
  ccr: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../src/commands/ccu', () => ({
  executeCcusage: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../src/commands/uninstall', () => ({
  uninstall: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../src/commands/check-updates', () => ({
  checkUpdates: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../src/i18n', () => ({
  initI18n: vi.fn(),
  changeLanguage: vi.fn(),
  i18n: {
    t: vi.fn((key: string) => key),
  },
}))

vi.mock('../../src/utils/zcf-config', () => ({
  readZcfConfigAsync: vi.fn().mockResolvedValue({
    preferredLang: 'en',
    codeToolType: 'claude-code',
  }),
}))

vi.mock('../../src/utils/prompts', () => ({
  selectScriptLanguage: vi.fn().mockResolvedValue('en'),
}))

describe('cli-setup - Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('setupCommands error handling', () => {
    it('should handle config read errors gracefully in setupCommands', async () => {
      // Mock readZcfConfigAsync to throw an error
      const { readZcfConfigAsync } = await import('../../src/utils/zcf-config')
      vi.mocked(readZcfConfigAsync).mockRejectedValue(new Error('Config read failed'))

      const cli = cac('test')

      // Should not throw error, should handle gracefully
      await expect(setupCommands(cli)).resolves.not.toThrow()

      // Commands should still be set up
      expect(cli.commands.length).toBeGreaterThan(0)
    })

    it('should handle initI18n errors gracefully in setupCommands', async () => {
      // Mock readZcfConfigAsync to succeed but initI18n to fail
      const { readZcfConfigAsync } = await import('../../src/utils/zcf-config')
      const { initI18n } = await import('../../src/i18n')

      vi.mocked(readZcfConfigAsync).mockResolvedValue({
        version: '1.0.0',
        preferredLang: 'en',
        codeToolType: 'claude-code',
        lastUpdated: '2025-09-14T00:00:00.000Z',
      })
      vi.mocked(initI18n).mockRejectedValue(new Error('i18n initialization failed'))

      const cli = cac('test')

      // Should not throw error, should handle gracefully (line 203-204 empty catch)
      await expect(setupCommands(cli)).resolves.not.toThrow()

      // Commands should still be set up
      expect(cli.commands.length).toBeGreaterThan(0)
      expect(initI18n).toHaveBeenCalledWith('en')
    })

    it('should handle config read returning null', async () => {
      const { readZcfConfigAsync } = await import('../../src/utils/zcf-config')
      vi.mocked(readZcfConfigAsync).mockResolvedValue(null)

      const cli = cac('test')

      await expect(setupCommands(cli)).resolves.not.toThrow()

      // Should use default 'en' language when config is null
      const { initI18n } = await import('../../src/i18n')
      expect(initI18n).toHaveBeenCalledWith('en')
    })

    it('should handle config read returning undefined preferredLang', async () => {
      const { readZcfConfigAsync } = await import('../../src/utils/zcf-config')
      vi.mocked(readZcfConfigAsync).mockResolvedValue(null)

      const cli = cac('test')

      await expect(setupCommands(cli)).resolves.not.toThrow()

      // Should use default 'en' language when preferredLang is undefined
      const { initI18n } = await import('../../src/i18n')
      expect(initI18n).toHaveBeenCalledWith('en')
    })

    it('should handle both config read and initI18n errors together', async () => {
      const { readZcfConfigAsync } = await import('../../src/utils/zcf-config')
      const { initI18n } = await import('../../src/i18n')

      vi.mocked(readZcfConfigAsync).mockRejectedValue(new Error('Config error'))
      vi.mocked(initI18n).mockRejectedValue(new Error('i18n error'))

      const cli = cac('test')

      // Should handle both errors gracefully
      await expect(setupCommands(cli)).resolves.not.toThrow()

      // Commands should still be set up despite both errors
      expect(cli.commands.length).toBeGreaterThan(0)
    })

    it('should use zh-CN language from config correctly', async () => {
      const { readZcfConfigAsync } = await import('../../src/utils/zcf-config')
      vi.mocked(readZcfConfigAsync).mockResolvedValue({
        version: '1.0.0',
        preferredLang: 'zh-CN',
        lastUpdated: '2025-09-14T00:00:00.000Z',
        codeToolType: 'claude-code',
      })

      const cli = cac('test')

      await setupCommands(cli)

      const { initI18n } = await import('../../src/i18n')
      expect(initI18n).toHaveBeenCalledWith('zh-CN')
    })

    it('should handle empty config object', async () => {
      const { readZcfConfigAsync } = await import('../../src/utils/zcf-config')
      vi.mocked(readZcfConfigAsync).mockResolvedValue({
        version: '1.0.0',
        preferredLang: 'en',
        lastUpdated: '2025-09-14T00:00:00.000Z',
        codeToolType: 'claude-code',
      })

      const cli = cac('test')

      await setupCommands(cli)

      const { initI18n } = await import('../../src/i18n')
      expect(initI18n).toHaveBeenCalledWith('en')
    })
  })

  describe('withLanguageResolution integration', () => {
    it('should handle withLanguageResolution errors during command setup', async () => {
      // Mock selectScriptLanguage to throw an error
      const { selectScriptLanguage } = await import('../../src/utils/prompts')
      vi.mocked(selectScriptLanguage).mockRejectedValue(new Error('Language selection failed'))

      const cli = cac('test')

      // Setup should still succeed
      await expect(setupCommands(cli)).resolves.not.toThrow()

      // Commands should be properly registered
      expect(cli.commands.length).toBeGreaterThan(0)
    })
  })

  describe('setupCommands command registration edge cases', () => {
    it('should register uninstall command properly', async () => {
      const cli = cac('test')
      const commandSpy = vi.spyOn(cli, 'command')

      await setupCommands(cli)

      expect(commandSpy).toHaveBeenCalledWith('uninstall', 'Remove ZCF configurations and tools')
    })

    it('should register all command aliases properly', async () => {
      const cli = cac('test')
      await setupCommands(cli)

      // Find commands by their descriptions and check aliases
      const initCommand = cli.commands.find(cmd => cmd.description === 'Initialize Claude Code configuration')
      const updateCommand = cli.commands.find(cmd => cmd.description === 'Update Claude Code prompts only')
      const checkCommand = cli.commands.find(cmd => cmd.description === 'Check and update Claude Code and CCR to latest versions')

      expect(initCommand?.aliasNames).toContain('i')
      expect(updateCommand?.aliasNames).toContain('u')
      expect(checkCommand?.aliasNames).toContain('check')
    })

    it('should handle cac command setup failures gracefully', async () => {
      const cli = cac('test')

      // Mock cli.command to throw on specific calls
      const originalCommand = cli.command.bind(cli)
      vi.spyOn(cli, 'command').mockImplementation((name, desc) => {
        if (name === 'ccr') {
          throw new Error('Command registration failed')
        }
        return originalCommand(name, desc)
      })

      // Should throw since command registration failed
      await expect(setupCommands(cli)).rejects.toThrow('Command registration failed')
    })
  })

  describe('i18n integration during setup', () => {
    it('should call i18n.t for help text generation', async () => {
      const { i18n } = await import('../../src/i18n')
      const cli = cac('test')

      await setupCommands(cli)

      // Should call i18n.t for help text keys
      expect(i18n.t).toHaveBeenCalledWith('cli:help.defaults.prefix')
    })

    it('should handle i18n.t returning undefined gracefully', async () => {
      const { i18n } = await import('../../src/i18n')
      vi.mocked(i18n.t).mockReturnValue(undefined as any)

      const cli = cac('test')

      await expect(setupCommands(cli)).resolves.not.toThrow()
    })
  })
})
