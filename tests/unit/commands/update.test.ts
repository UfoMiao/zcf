import inquirer from 'inquirer'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}))

vi.mock('ansis', () => ({
  default: {
    green: (text: string) => text,
    yellow: (text: string) => text,
    cyan: (text: string) => text,
    red: (text: string) => text,
    gray: (text: string) => text,
    blue: (text: string) => text,
    bold: (text: string) => text,
  },
}))

vi.mock('../../../src/utils/fs-operations', () => ({
  copyFile: vi.fn(),
  ensureDir: vi.fn(),
  writeFile: vi.fn(),
}))

vi.mock('../../../src/utils/config-operations', () => ({
  updatePromptOnly: vi.fn(),
}))

vi.mock('../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn(),
  updateZcfConfig: vi.fn(),
}))

vi.mock('../../../src/utils/prompts', () => ({
  selectScriptLanguage: vi.fn(),
  resolveAiOutputLanguage: vi.fn(),
}))

vi.mock('../../../src/utils/platform', () => ({
  getConfigDir: vi.fn().mockReturnValue('/home/user/.config'),
  isWindows: vi.fn().mockReturnValue(false),
}))

// Mock i18n system
vi.mock('../../../src/i18n', () => ({
  initI18n: vi.fn().mockResolvedValue(undefined),
  i18n: {
    t: vi.fn((key: string) => key),
    isInitialized: true,
    language: 'en',
  },
  ensureI18nInitialized: vi.fn(),
}))

vi.mock('../../../src/utils/workflow-installer', () => ({
  selectAndInstallWorkflows: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../../src/utils/version-checker', () => ({
  checkClaudeCodeVersionAndPrompt: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../src/utils/banner', () => ({
  displayBanner: vi.fn(),
}))

describe('update command', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)

    // Initialize i18n for test environment
    const { initI18n } = await import('../../../src/i18n')
    await initI18n('en')
  })

  it('should load update module', async () => {
    const module = await import('../../../src/commands/update')
    expect(module).toBeDefined()
    expect(module.update).toBeDefined()
  })

  it('should export update function', async () => {
    const { update } = await import('../../../src/commands/update')
    expect(typeof update).toBe('function')
  })

  describe('update function', () => {
    it('should handle update with existing config', async () => {
      const { update } = await import('../../../src/commands/update')
      const { readZcfConfig, updateZcfConfig } = await import('../../../src/utils/zcf-config')
      const { resolveAiOutputLanguage } = await import('../../../src/utils/prompts')
      const { updatePromptOnly: _updatePromptOnly } = await import('../../../src/utils/config-operations')
      const { selectAndInstallWorkflows } = await import('../../../src/utils/workflow-installer')

      vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'zh-CN' } as any)
      vi.mocked(inquirer.prompt).mockResolvedValue({ lang: 'zh-CN' })
      vi.mocked(resolveAiOutputLanguage).mockResolvedValue('chinese-simplified')
      vi.mocked(_updatePromptOnly).mockResolvedValue(undefined)
      vi.mocked(updateZcfConfig).mockResolvedValue(undefined)
      vi.mocked(selectAndInstallWorkflows).mockResolvedValue(undefined)

      await update({ skipBanner: true })

      expect(inquirer.prompt).toHaveBeenCalled()
      expect(_updatePromptOnly).toHaveBeenCalled()
    })

    it('should handle update without existing config', async () => {
      const { update } = await import('../../../src/commands/update')
      const { resolveAiOutputLanguage } = await import('../../../src/utils/prompts')
      const { updatePromptOnly: _updatePromptOnly } = await import('../../../src/utils/config-operations')
      const { selectAndInstallWorkflows } = await import('../../../src/utils/workflow-installer')
      const inquirer = await import('inquirer')

      vi.mocked(inquirer.default.prompt).mockResolvedValue({ lang: 'en' })
      vi.mocked(resolveAiOutputLanguage).mockResolvedValue('english')
      vi.mocked(selectAndInstallWorkflows).mockResolvedValue(undefined)

      await update({ skipBanner: true })

      expect(inquirer.default.prompt).toHaveBeenCalled()
      expect(_updatePromptOnly).toHaveBeenCalled()
    })

    it('should handle cancel update', async () => {
      const { update } = await import('../../../src/commands/update')
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')

      vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'zh-CN' } as any)
      vi.mocked(inquirer.prompt).mockResolvedValue({})

      await update({ skipBanner: true })

      expect(process.exit).toHaveBeenCalledWith(0)
    })

    it('should handle options correctly', async () => {
      const { update } = await import('../../../src/commands/update')
      const { readZcfConfig, updateZcfConfig } = await import('../../../src/utils/zcf-config')
      const { resolveAiOutputLanguage } = await import('../../../src/utils/prompts')
      const { updatePromptOnly: _updatePromptOnly } = await import('../../../src/utils/config-operations')

      vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'zh-CN' } as any)
      vi.mocked(resolveAiOutputLanguage).mockResolvedValue('chinese-simplified')
      vi.mocked(_updatePromptOnly).mockResolvedValue(undefined)
      vi.mocked(updateZcfConfig).mockResolvedValue(undefined)

      const { selectAndInstallWorkflows } = await import('../../../src/utils/workflow-installer')
      vi.mocked(selectAndInstallWorkflows).mockResolvedValue(undefined)

      await update({ configLang: 'en', aiOutputLang: 'chinese-simplified', skipBanner: true })

      expect(selectAndInstallWorkflows).toHaveBeenCalled()
      expect(_updatePromptOnly).toHaveBeenCalledWith('chinese-simplified')
    })

    it('should handle errors gracefully', async () => {
      const { update } = await import('../../../src/commands/update')
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')
      const error = new Error('Test error')

      vi.mocked(readZcfConfig).mockImplementation(() => {
        throw error
      })

      await update({ skipBanner: true })

      expect(console.error).toHaveBeenCalled()
    })
  })
})
