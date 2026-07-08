import { fileURLToPath } from 'node:url'
import inquirer from 'inquirer'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CLAUDE_DIR, CLAUDE_SKILLS_DIR, OPENCODE_SKILLS_DIR } from '../../../src/constants'

const mockUpdateOpenCodeSkillsPaths = vi.fn()
const mockReadZcfConfig = vi.fn()

vi.mock('node:url', () => ({
  fileURLToPath: vi.fn(),
}))

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}))

vi.mock('../../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  i18n: {
    t: vi.fn((key: string) => key),
    isInitialized: true,
  },
}))

vi.mock('../../../src/utils/fs-operations', () => ({
  copyDir: vi.fn(),
  exists: vi.fn(),
  isDirectory: vi.fn(),
  readDir: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('../../../src/utils/code-tools/opencode', () => ({
  updateOpenCodeSkillsPaths: (...args: any[]) => mockUpdateOpenCodeSkillsPaths(...args),
}))

vi.mock('../../../src/utils/zcf-config', () => ({
  readZcfConfig: () => mockReadZcfConfig(),
}))

async function loadWorkflowInstaller() {
  return import('../../../src/utils/workflow-installer')
}

async function loadFsOperations() {
  return import('../../../src/utils/fs-operations')
}

describe('workflow-installer skills installer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(fileURLToPath).mockReturnValue('/project/dist/utils/workflow-installer.js')
    mockReadZcfConfig.mockReturnValue({ codeToolType: 'claude-code' })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getRootDir', () => {
    it('resolves project root from dist path', async () => {
      const { getRootDir } = await loadWorkflowInstaller() as any
      expect(getRootDir()).toBe('/project')
    })
  })

  describe('selectAndInstallWorkflows', () => {
    it('installs preselected workflows for Claude Code', async () => {
      const fsOps = await loadFsOperations()
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.isDirectory).mockReturnValue(true)
      vi.mocked(fsOps.readDir).mockReturnValue(['init-project'])

      const { selectAndInstallWorkflows } = await loadWorkflowInstaller()
      const results = await selectAndInstallWorkflows('en', ['commonTools'])

      expect(results).toHaveLength(1)
      expect(results[0].workflow).toBe('commonTools')
      expect(results[0].success).toBe(true)
      expect(results[0].installedSkills).toContain('init-project')
      expect(fsOps.copyDir).toHaveBeenCalledWith(
        join('/project', 'templates', 'claude-code', 'skills', 'zcf', 'init-project'),
        join(CLAUDE_SKILLS_DIR, 'zcf', 'init-project'),
      )
    })

    it('registers OpenCode skill paths when codeToolType is opencode', async () => {
      mockReadZcfConfig.mockReturnValue({ codeToolType: 'opencode' })
      const fsOps = await loadFsOperations()
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.isDirectory).mockReturnValue(true)
      vi.mocked(fsOps.readDir).mockReturnValue(['skill-a'])

      const { selectAndInstallWorkflows } = await loadWorkflowInstaller()
      await selectAndInstallWorkflows('en', ['commonTools'])

      expect(mockUpdateOpenCodeSkillsPaths).toHaveBeenCalledWith([join(OPENCODE_SKILLS_DIR, 'zcf')])
    })

    it('returns empty results when user cancels selection', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ selectedWorkflows: [] })

      const { selectAndInstallWorkflows } = await loadWorkflowInstaller()
      const results = await selectAndInstallWorkflows('en')

      expect(results).toEqual([])
    })

    it('marks result as failed when source skill group is missing', async () => {
      const fsOps = await loadFsOperations()
      vi.mocked(fsOps.exists).mockReturnValue(false)

      const { selectAndInstallWorkflows } = await loadWorkflowInstaller()
      const results = await selectAndInstallWorkflows('en', ['commonTools'])

      expect(results[0].success).toBe(false)
      expect(results[0].errors?.length).toBeGreaterThan(0)
    })

    it('continues installation despite individual skill copy failures', async () => {
      const fsOps = await loadFsOperations()
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.isDirectory).mockReturnValue(true)
      vi.mocked(fsOps.readDir).mockReturnValue(['skill-a', 'skill-b'])
      vi.mocked(fsOps.copyDir)
        .mockImplementationOnce(() => { throw new Error('copy failed') })
        .mockImplementationOnce(() => {})

      const { selectAndInstallWorkflows } = await loadWorkflowInstaller()
      const results = await selectAndInstallWorkflows('en', ['commonTools'])

      expect(results[0].success).toBe(false)
      expect(results[0].installedSkills).toEqual(['skill-b'])
      expect(results[0].errors?.some(e => e.includes('copy failed'))).toBe(true)
    })

    it('cleans up old command/agent files before installing', async () => {
      const fsOps = await loadFsOperations()
      vi.mocked(fsOps.exists)
        .mockReturnValueOnce(true) // old commands/zcf
        .mockReturnValueOnce(true) // old agents/zcf
        .mockReturnValue(true)
      vi.mocked(fsOps.isDirectory).mockReturnValue(true)
      vi.mocked(fsOps.readDir).mockReturnValue(['skill-a'])

      const { selectAndInstallWorkflows } = await loadWorkflowInstaller()
      await selectAndInstallWorkflows('en', ['commonTools'])

      expect(fsOps.remove).toHaveBeenCalledWith(join(CLAUDE_DIR, 'commands', 'zcf'))
      expect(fsOps.remove).toHaveBeenCalledWith(join(CLAUDE_DIR, 'agents', 'zcf'))
    })
  })

  describe('uninstallSkillsForCodeTool', () => {
    it('removes skill group directories for the active tool', async () => {
      const fsOps = await loadFsOperations()
      vi.mocked(fsOps.exists).mockReturnValue(true)

      const { uninstallSkillsForCodeTool } = await loadWorkflowInstaller()
      await uninstallSkillsForCodeTool('claude-code')

      expect(fsOps.remove).toHaveBeenCalledWith(join(CLAUDE_SKILLS_DIR, 'zcf'))
      expect(fsOps.remove).toHaveBeenCalledWith(join(CLAUDE_SKILLS_DIR, 'bmad'))
    })

    it('cleans up OpenCode skill paths without duplicates', async () => {
      const fsOps = await loadFsOperations()
      vi.mocked(fsOps.exists).mockReturnValue(true)

      const { uninstallSkillsForCodeTool } = await loadWorkflowInstaller()
      await uninstallSkillsForCodeTool('opencode')

      expect(mockUpdateOpenCodeSkillsPaths).toHaveBeenCalledWith(
        [join(OPENCODE_SKILLS_DIR, 'zcf'), join(OPENCODE_SKILLS_DIR, 'bmad')],
        { remove: true },
      )
    })
  })
})
