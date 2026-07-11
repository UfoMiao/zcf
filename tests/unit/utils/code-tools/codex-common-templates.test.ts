import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}))

vi.mock('../../../../src/utils/fs-operations', () => ({
  exists: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  ensureDir: vi.fn(),
}))

vi.mock('../../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn(),
  updateZcfConfig: vi.fn(),
  readDefaultTomlConfig: vi.fn(),
  updateTomlConfig: vi.fn(),
}))

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}))

vi.mock('../../../../src/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../src/i18n')>()
  return {
    ...actual,
    ensureI18nInitialized: vi.fn(),
  }
})

vi.mock('../../../../src/utils/prompts', () => ({
  resolveTemplateLanguage: vi.fn(() => Promise.resolve('zh-CN')),
  resolveSystemPromptStyle: vi.fn(() => Promise.resolve('engineer-professional')),
}))

vi.mock('../../../../src/utils/workflow-installer', () => ({
  selectAndInstallWorkflows: vi.fn(),
}))

let mockZcfConfig: any
let mockPrompts: any
let mockWorkflowInstaller: any

describe('codex - common templates usage', () => {
  beforeEach(async () => {
    mockZcfConfig = vi.mocked(await import('../../../../src/utils/zcf-config'))
    mockPrompts = vi.mocked(await import('../../../../src/utils/prompts'))
    mockWorkflowInstaller = vi.mocked(await import('../../../../src/utils/workflow-installer'))

    mockZcfConfig.readZcfConfig.mockReturnValue({
      templateLang: 'zh-CN',
      preferredLang: 'zh-CN',
    })
    mockZcfConfig.updateZcfConfig.mockImplementation(() => {})
    mockZcfConfig.readDefaultTomlConfig.mockReturnValue({})

    mockPrompts.resolveTemplateLanguage.mockResolvedValue('zh-CN')
    mockPrompts.resolveSystemPromptStyle.mockResolvedValue('engineer-professional')
    mockWorkflowInstaller.selectAndInstallWorkflows.mockReset()
    mockWorkflowInstaller.selectAndInstallWorkflows.mockResolvedValue(undefined)

    const { initI18n } = await import('../../../../src/i18n')
    await initI18n('zh-CN')
  })

  describe('runCodexWorkflowSelection - skills installer integration', () => {
    it('should delegate interactive workflow selection to selectAndInstallWorkflows for codex', async () => {
      const codex = await import('../../../../src/utils/code-tools/codex')

      await codex.runCodexWorkflowSelection()

      expect(mockWorkflowInstaller.selectAndInstallWorkflows).toHaveBeenCalledWith(
        'zh-CN',
        undefined,
        'codex',
      )
    })

    it('should pass preselected workflow ids in skip-prompt mode', async () => {
      const codex = await import('../../../../src/utils/code-tools/codex')

      await codex.runCodexWorkflowSelection({
        skipPrompt: true,
        workflows: ['gitWorkflow', 'commonTools'],
      })

      expect(mockWorkflowInstaller.selectAndInstallWorkflows).toHaveBeenCalledWith(
        'zh-CN',
        ['gitWorkflow', 'commonTools'],
        'codex',
      )
    })

    it('should install all workflows when skip-prompt mode has no preset list', async () => {
      const codex = await import('../../../../src/utils/code-tools/codex')

      await codex.runCodexWorkflowSelection({ skipPrompt: true })

      expect(mockWorkflowInstaller.selectAndInstallWorkflows).toHaveBeenCalledWith(
        'zh-CN',
        ['commonTools', 'sixStepsWorkflow', 'featPlanUx', 'gitWorkflow', 'bmadWorkflow'],
        'codex',
      )
    })

    it('should skip workflow installation when workflows is false', async () => {
      const codex = await import('../../../../src/utils/code-tools/codex')

      await codex.runCodexWorkflowSelection({ skipPrompt: true, workflows: false })

      expect(mockWorkflowInstaller.selectAndInstallWorkflows).not.toHaveBeenCalled()
    })
  })
})
