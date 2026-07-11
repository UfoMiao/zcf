import type { WorkflowConfig, WorkflowType } from '../../../src/types/workflow'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import inquirer from 'inquirer'
import { dirname, join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as workflowConfig from '../../../src/config/workflows'
import { CLAUDE_DIR } from '../../../src/constants'
import * as skillsInstaller from '../../../src/utils/skills-installer'
import { selectAndInstallWorkflows } from '../../../src/utils/workflow-installer'

vi.mock('node:fs')
vi.mock('node:fs/promises', () => ({
  copyFile: vi.fn(),
  mkdir: vi.fn(),
  rm: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}))
vi.mock('node:url')
vi.mock('inquirer')
vi.mock('../../../src/utils/skills-installer', () => ({
  installSkills: vi.fn(),
  commandFileToSkillName: vi.fn((filename: string) => filename.replace(/\.md$/, '').replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()),
}))
vi.mock('../../../src/config/workflows', () => ({
  getOrderedWorkflows: vi.fn(),
  getWorkflowConfig: vi.fn(),
  getWorkflowConfigs: vi.fn(),
  WORKFLOW_CONFIG_BASE: [
    { id: 'commonTools', defaultSelected: true, order: 1 },
    { id: 'sixStepsWorkflow', defaultSelected: true, order: 2 },
    { id: 'featPlanUx', defaultSelected: true, order: 3 },
    { id: 'gitWorkflow', defaultSelected: true, order: 4 },
    { id: 'bmadWorkflow', defaultSelected: true, order: 5 },
  ],
}))

vi.mock('../../../src/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/i18n')>()
  return {
    ...actual,
    ensureI18nInitialized: vi.fn(),
  }
})

describe('workflow-installer utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(skillsInstaller.installSkills).mockResolvedValue({
      success: true,
      installedSkills: [],
      errors: [],
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getRootDir', () => {
    it('should return the correct root directory', async () => {
      const mockFilePath = '/path/to/project/dist/utils/workflow-installer.js'
      vi.mocked(fileURLToPath).mockReturnValue(mockFilePath)

      const module = await import('../../../src/utils/workflow-installer')
      const getRootDir = (module as any).getRootDir || (() => {
        const currentFilePath = fileURLToPath(import.meta.url)
        const distDir = dirname(dirname(currentFilePath))
        return dirname(distDir)
      })

      const result = getRootDir()
      expect(result).toBe('/path/to/project')
    })
  })

  describe('selectAndInstallWorkflows', () => {
    const mockWorkflows = [
      {
        id: 'commonTools' as WorkflowType,
        nameKey: 'workflowOption.commonTools',
        descriptionKey: 'workflowDescription.commonTools',
        category: 'common',
        defaultSelected: true,
        order: 1,
        autoInstallAgents: false,
        skills: ['init-project'],
        agents: [],
        outputDir: 'common',
      },
      {
        id: 'bmadWorkflow' as WorkflowType,
        nameKey: 'workflowOption.bmadWorkflow',
        descriptionKey: 'workflowDescription.bmadWorkflow',
        category: 'bmad',
        defaultSelected: false,
        order: 2,
        autoInstallAgents: true,
        skills: ['bmad-init'],
        agents: [
          { id: 'analyst', filename: 'analyst.md', required: true },
          { id: 'architect', filename: 'architect.md', required: true },
        ],
        outputDir: 'bmad',
      },
      {
        id: 'gitWorkflow' as WorkflowType,
        name: 'Git Workflow',
        description: 'Workflow for Git operations',
        category: 'git',
        defaultSelected: true,
        autoInstallAgents: false,
        skills: ['git-commit', 'git-rollback', 'git-clean-branches', 'git-worktree'],
        agents: [],
        order: 4,
        outputDir: 'git',
      },
    ] as WorkflowConfig[]

    beforeEach(() => {
      vi.mocked(workflowConfig.getOrderedWorkflows).mockReturnValue(mockWorkflows)
      vi.mocked(workflowConfig.getWorkflowConfig).mockImplementation(id =>
        mockWorkflows.find(w => w.id === id) || undefined,
      )
    })

    it('should display workflow choices and handle selection', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        selectedWorkflows: ['commonTools'],
      })
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(skillsInstaller.installSkills).mockResolvedValue({
        success: true,
        installedSkills: ['init-project'],
        errors: [],
      })

      await selectAndInstallWorkflows('zh-CN')

      expect(inquirer.prompt).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'checkbox',
          name: 'selectedWorkflows',
          message: expect.stringContaining('Select workflow type to install'),
        }),
      )
    })

    it('should handle user cancellation', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        selectedWorkflows: [],
      })

      await selectAndInstallWorkflows('zh-CN')

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Operation cancelled'),
      )
      expect(skillsInstaller.installSkills).not.toHaveBeenCalled()
    })

    it('should clean up old files before installation', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        selectedWorkflows: ['commonTools'],
      })
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(rm).mockResolvedValue(undefined)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(skillsInstaller.installSkills).mockResolvedValue({
        success: true,
        installedSkills: ['init-project'],
        errors: [],
      })

      await selectAndInstallWorkflows('zh-CN')

      expect(rm).toHaveBeenCalledWith(
        join(CLAUDE_DIR, 'commands', 'workflow.md'),
        { recursive: true, force: true },
      )
      expect(rm).toHaveBeenCalledWith(
        join(CLAUDE_DIR, 'agents', 'planner.md'),
        { recursive: true, force: true },
      )
    })

    it('should install skills via skills CLI for selected workflows', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        selectedWorkflows: ['commonTools', 'bmadWorkflow'],
      })
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(skillsInstaller.installSkills).mockResolvedValue({
        success: true,
        installedSkills: ['init-project', 'bmad-init'],
        errors: [],
      })

      await selectAndInstallWorkflows('zh-CN')

      expect(skillsInstaller.installSkills).toHaveBeenCalledWith(
        expect.objectContaining({
          skillNames: expect.arrayContaining(['init-project', 'bmad-init']),
          agent: 'claude-code',
          global: true,
        }),
      )
    })

    it('should install gitWorkflow skills from templates/skills/{lang}', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        selectedWorkflows: ['gitWorkflow'],
      })
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(skillsInstaller.installSkills).mockResolvedValue({
        success: true,
        installedSkills: ['git-commit', 'git-rollback', 'git-clean-branches', 'git-worktree'],
        errors: [],
      })

      await selectAndInstallWorkflows('zh-CN')

      expect(skillsInstaller.installSkills).toHaveBeenCalledWith(
        expect.objectContaining({
          skillsPath: expect.stringMatching(/templates[/\\]skills[/\\]zh-CN$/),
          skillNames: ['git-commit', 'git-rollback', 'git-clean-branches', 'git-worktree'],
        }),
      )
    })
  })
})
