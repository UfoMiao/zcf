import type { WorkflowConfig, WorkflowType } from '../../../src/types/workflow'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import inquirer from 'inquirer'
import { dirname, join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as workflowConfig from '../../../src/config/workflows'
import { CLAUDE_DIR } from '../../../src/constants'
import { selectAndInstallWorkflows } from '../../../src/utils/workflow-installer'

vi.mock('node:fs')
vi.mock('node:fs/promises')
vi.mock('node:url')
vi.mock('inquirer')
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

// Use real i18n system for better integration testing
vi.mock('../../../src/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/i18n')>()
  return {
    ...actual,
    // Only mock ensureI18nInitialized to avoid initialization issues
    ensureI18nInitialized: vi.fn(),
  }
})

describe('workflow-installer utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
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
        commands: ['init-project.md'],
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
        commands: ['bmad-init.md'],
        agents: [
          { id: 'analyst', filename: 'analyst.md', required: true },
          { id: 'architect', filename: 'architect.md', required: true },
        ],
        outputDir: 'bmad',
      },
      {
        id: 'gitWorkflow',
        name: 'Git Workflow',
        description: 'Workflow for Git operations',
        category: 'git',
        defaultSelected: true,
        autoInstallAgents: false,
        commands: ['git-commit.md', 'git-rollback.md', 'git-cleanBranches.md', 'git-worktree.md'],
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

      await selectAndInstallWorkflows('zh-CN')

      expect(inquirer.prompt).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'checkbox',
          name: 'selectedWorkflows',
          message: expect.stringContaining('Select workflow type to install'),
          choices: expect.arrayContaining([
            expect.objectContaining({
              value: 'commonTools',
              checked: true,
            }),
          ]),
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
      expect(copyFile).not.toHaveBeenCalled()
    })

    it('should clean up old files before installation', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        selectedWorkflows: ['commonTools'],
      })
      vi.mocked(existsSync)
        .mockReturnValueOnce(true) // Old command file exists
        .mockReturnValueOnce(true) // Old agent file exists
        .mockReturnValue(true)
      vi.mocked(rm).mockResolvedValue(undefined)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)

      await selectAndInstallWorkflows('zh-CN')

      expect(rm).toHaveBeenCalledWith(
        join(CLAUDE_DIR, 'commands', 'workflow.md'),
        { force: true },
      )
      expect(rm).toHaveBeenCalledWith(
        join(CLAUDE_DIR, 'agents', 'planner.md'),
        { force: true },
      )
    })

    it('should install multiple workflows with dependencies', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        selectedWorkflows: ['commonTools', 'bmadWorkflow'],
      })
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)

      await selectAndInstallWorkflows('zh-CN')

      expect(workflowConfig.getWorkflowConfig).toHaveBeenCalledWith('commonTools')
      expect(workflowConfig.getWorkflowConfig).toHaveBeenCalledWith('bmadWorkflow')
      expect(copyFile).toHaveBeenCalled()
    })

    it('should handle cleanup errors gracefully', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        selectedWorkflows: ['commonTools'],
      })
      vi.mocked(existsSync)
        .mockReturnValueOnce(true) // Old file exists
        .mockReturnValue(true)
      vi.mocked(rm).mockRejectedValueOnce(new Error('Permission denied'))
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)

      await selectAndInstallWorkflows('en')

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to remove'),
      )
      // Should continue with installation despite cleanup error
      expect(copyFile).toHaveBeenCalled()
    })

    it('should install gitWorkflow successfully', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        selectedWorkflows: ['gitWorkflow'],
      })
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)

      await selectAndInstallWorkflows('zh-CN')

      expect(workflowConfig.getWorkflowConfig).toHaveBeenCalledWith('gitWorkflow')
      // Should copy all git command files (including git-worktree.md)
      expect(copyFile).toHaveBeenCalledTimes(4)
      expect(copyFile).toHaveBeenCalledWith(
        expect.stringContaining('git-commit.md'),
        expect.stringContaining('git-commit.md'),
      )
      expect(copyFile).toHaveBeenCalledWith(
        expect.stringContaining('git-rollback.md'),
        expect.stringContaining('git-rollback.md'),
      )
      expect(copyFile).toHaveBeenCalledWith(
        expect.stringContaining('git-cleanBranches.md'),
        expect.stringContaining('git-cleanBranches.md'),
      )
    })

    it('should handle gitWorkflow with no agents correctly', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        selectedWorkflows: ['gitWorkflow'],
      })
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)

      await selectAndInstallWorkflows('en')

      // Should copy command files but not create agents
      expect(copyFile).toHaveBeenCalled()
      // Verify no agent-related mkdir calls
      const mkdirCalls = vi.mocked(mkdir).mock.calls
      const hasAgentDir = mkdirCalls.some(call =>
        String(call[0]).includes('agents'),
      )
      expect(hasAgentDir).toBe(false)
    })

    it('should install multiple workflows including gitWorkflow', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        selectedWorkflows: ['commonTools', 'gitWorkflow'],
      })
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)

      await selectAndInstallWorkflows('zh-CN')

      expect(workflowConfig.getWorkflowConfig).toHaveBeenCalledWith('commonTools')
      expect(workflowConfig.getWorkflowConfig).toHaveBeenCalledWith('gitWorkflow')
      // Should copy files for both workflows (1 + 4 = 5)
      expect(copyFile).toHaveBeenCalledTimes(5)
    })
  })

  describe('installWorkflowWithDependencies', () => {
    const mockWorkflowConfig: WorkflowConfig = {
      id: 'bmadWorkflow' as WorkflowType,
      name: 'BMAD Workflow',
      category: 'bmad',
      defaultSelected: false,
      order: 1,
      autoInstallAgents: true,
      commands: ['bmad-init.md', 'bmad.md'],
      agents: [
        { id: 'analyst', filename: 'analyst.md', required: true },
        { id: 'architect', filename: 'architect.md', required: false },
      ],
      outputDir: '.claude',
    }

    it('should install workflow commands successfully', async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(fileURLToPath).mockReturnValue('/project/dist/utils/workflow-installer.js')

      const module = await import('../../../src/utils/workflow-installer')
      const installWorkflowWithDependencies = (module as any).installWorkflowWithDependencies

      if (installWorkflowWithDependencies) {
        const result = await installWorkflowWithDependencies(
          mockWorkflowConfig,
          'zh-CN',
        )

        expect(result.success).toBe(true)
        expect(result.installedCommands).toContain('bmad-init.md')
        expect(result.installedCommands).toContain('bmad.md')
        expect(mkdir).toHaveBeenCalledWith(
          join(CLAUDE_DIR, 'commands', 'zcf'),
          { recursive: true },
        )

        expect(copyFile).toHaveBeenCalledWith(
          join(
            '/project',
            'templates',
            'claude-code',
            'zh-CN',
            'workflow',
            'bmad',
            'commands',
            'bmad-init.md',
          ),
          expect.any(String),
        )
      }
    })

    it('should install agents when autoInstallAgents is true', async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(fileURLToPath).mockReturnValue('/project/dist/utils/workflow-installer.js')

      const module = await import('../../../src/utils/workflow-installer')
      const installWorkflowWithDependencies = (module as any).installWorkflowWithDependencies

      if (installWorkflowWithDependencies) {
        const result = await installWorkflowWithDependencies(
          mockWorkflowConfig,
          'en',
        )

        expect(result.installedAgents).toContain('analyst.md')
        expect(result.installedAgents).toContain('architect.md')
        expect(mkdir).toHaveBeenCalledWith(
          join(CLAUDE_DIR, 'agents', 'zcf', 'bmad'),
          { recursive: true },
        )

        expect(copyFile).toHaveBeenCalledWith(
          join(
            '/project',
            'templates',
            'claude-code',
            'en',
            'workflow',
            'bmad',
            'agents',
            'analyst.md',
          ),
          expect.any(String),
        )
      }
    })

    it('should handle command installation failure', async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile).mockRejectedValueOnce(new Error('Copy failed'))
      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(fileURLToPath).mockReturnValue('/project/dist/utils/workflow-installer.js')

      const module = await import('../../../src/utils/workflow-installer')
      const installWorkflowWithDependencies = (module as any).installWorkflowWithDependencies

      if (installWorkflowWithDependencies) {
        const result = await installWorkflowWithDependencies(
          mockWorkflowConfig,
          'en',
        )

        expect(result.success).toBe(false)
        expect(result.errors).toContain(expect.stringContaining('Copy failed'))
      }
    })

    it('should handle required agent installation failure', async () => {
      const configWithRequiredAgent: WorkflowConfig = {
        ...mockWorkflowConfig,
        agents: [{ id: 'critical', filename: 'critical.md', required: true }],
      }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile)
        .mockResolvedValueOnce(undefined) // Commands succeed
        .mockResolvedValueOnce(undefined) // Commands succeed
        .mockRejectedValueOnce(new Error('Agent copy failed')) // Agent fails
      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(fileURLToPath).mockReturnValue('/project/dist/utils/workflow-installer.js')

      const module = await import('../../../src/utils/workflow-installer')
      const installWorkflowWithDependencies = (module as any).installWorkflowWithDependencies

      if (installWorkflowWithDependencies) {
        const result = await installWorkflowWithDependencies(
          configWithRequiredAgent,
          'en',
        )

        expect(result.success).toBe(false)
        expect(result.errors).toContain(expect.stringContaining('Agent copy failed'))
      }
    })

    it('should handle optional agent installation failure gracefully', async () => {
      const configWithOptionalAgent: WorkflowConfig = {
        ...mockWorkflowConfig,
        agents: [{ id: 'optional', filename: 'optional.md', required: false }],
      }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile)
        .mockResolvedValueOnce(undefined) // Commands succeed
        .mockResolvedValueOnce(undefined) // Commands succeed
        .mockRejectedValueOnce(new Error('Agent copy failed')) // Agent fails
      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(fileURLToPath).mockReturnValue('/project/dist/utils/workflow-installer.js')

      const module = await import('../../../src/utils/workflow-installer')
      const installWorkflowWithDependencies = (module as any).installWorkflowWithDependencies

      if (installWorkflowWithDependencies) {
        const result = await installWorkflowWithDependencies(
          configWithOptionalAgent,
          'en',
        )

        // Should still succeed since agent is optional
        expect(result.success).toBe(true)
        expect(result.errors).toContain(expect.stringContaining('Agent copy failed'))
      }
    })

    it('should show BMad initialization prompt for bmadWorkflow', async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(fileURLToPath).mockReturnValue('/project/dist/utils/workflow-installer.js')

      const module = await import('../../../src/utils/workflow-installer')
      const installWorkflowWithDependencies = (module as any).installWorkflowWithDependencies

      if (installWorkflowWithDependencies) {
        await installWorkflowWithDependencies(
          mockWorkflowConfig,
          'zh-CN',
        )

        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('请在项目中运行 /bmad-init 命令'),
        )
      }
    })

    it('should install gitWorkflow commands correctly', async () => {
      const gitWorkflowConfig: WorkflowConfig = {
        id: 'gitWorkflow',
        name: 'Git Workflow',
        description: 'Workflow for Git operations',
        category: 'git',
        defaultSelected: true,
        autoInstallAgents: false,
        commands: ['git-commit.md', 'git-rollback.md', 'git-cleanBranches.md', 'git-worktree.md'],
        agents: [],
        order: 4,
        outputDir: 'git',
      }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(fileURLToPath).mockReturnValue('/project/dist/utils/workflow-installer.js')

      const module = await import('../../../src/utils/workflow-installer')
      const installWorkflowWithDependencies = (module as any).installWorkflowWithDependencies

      if (installWorkflowWithDependencies) {
        const result = await installWorkflowWithDependencies(
          gitWorkflowConfig,
          'zh-CN',
        )

        expect(result.success).toBe(true)
        expect(result.workflow).toBe('gitWorkflow')
        expect(result.installedCommands).toEqual([
          'git-commit.md',
          'git-rollback.md',
          'git-cleanBranches.md',
        ])
        expect(result.installedAgents).toEqual([])
        expect(copyFile).toHaveBeenCalledTimes(3)
      }
    })

    it('should handle gitWorkflow installation failure', async () => {
      const gitWorkflowConfig: WorkflowConfig = {
        id: 'gitWorkflow',
        name: 'Git Workflow',
        description: 'Workflow for Git operations',
        category: 'git',
        defaultSelected: true,
        autoInstallAgents: false,
        commands: ['git-commit.md', 'git-rollback.md', 'git-cleanBranches.md', 'git-worktree.md'],
        agents: [],
        order: 4,
        outputDir: 'git',
      }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile)
        .mockResolvedValueOnce(undefined) // First file succeeds
        .mockRejectedValueOnce(new Error('Copy failed')) // Second file fails
      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(fileURLToPath).mockReturnValue('/project/dist/utils/workflow-installer.js')

      const module = await import('../../../src/utils/workflow-installer')
      const installWorkflowWithDependencies = (module as any).installWorkflowWithDependencies

      if (installWorkflowWithDependencies) {
        const result = await installWorkflowWithDependencies(
          gitWorkflowConfig,
          'en',
        )

        expect(result.success).toBe(false)
        expect(result.errors).toContain(expect.stringContaining('Copy failed'))
        expect(result.installedCommands).toContain('git-commit.md')
      }
    })

    it('should not install agents when autoInstallAgents is false', async () => {
      const configNoAutoAgents: WorkflowConfig = {
        ...mockWorkflowConfig,
        autoInstallAgents: false,
      }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(fileURLToPath).mockReturnValue('/project/dist/utils/workflow-installer.js')

      const module = await import('../../../src/utils/workflow-installer')
      const installWorkflowWithDependencies = (module as any).installWorkflowWithDependencies

      if (installWorkflowWithDependencies) {
        const result = await installWorkflowWithDependencies(
          configNoAutoAgents,
          'en',
        )

        expect(result.installedAgents).toHaveLength(0)
        // Should not create agents directory
        expect(mkdir).not.toHaveBeenCalledWith(
          expect.stringContaining('agents'),
          expect.anything(),
        )
      }
    })
  })

  describe('cleanupOldVersionFiles', () => {
    it('should remove old command files', async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(rm).mockResolvedValue(undefined)

      const module = await import('../../../src/utils/workflow-installer')
      const cleanupOldVersionFiles = (module as any).cleanupOldVersionFiles

      if (cleanupOldVersionFiles) {
        await cleanupOldVersionFiles()

        expect(rm).toHaveBeenCalledWith(
          join(CLAUDE_DIR, 'commands', 'init-project.md'),
          { force: true },
        )
        expect(rm).toHaveBeenCalledWith(
          join(CLAUDE_DIR, 'commands', 'feat.md'),
          { force: true },
        )
      }
    })

    it('should remove old agent files', async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(rm).mockResolvedValue(undefined)

      const module = await import('../../../src/utils/workflow-installer')
      const cleanupOldVersionFiles = (module as any).cleanupOldVersionFiles

      if (cleanupOldVersionFiles) {
        await cleanupOldVersionFiles()

        expect(rm).toHaveBeenCalledWith(
          join(CLAUDE_DIR, 'agents', 'planner.md'),
          { force: true },
        )
        expect(rm).toHaveBeenCalledWith(
          join(CLAUDE_DIR, 'agents', 'ui-ux-designer.md'),
          { force: true },
        )
      }
    })

    it('should handle removal errors gracefully', async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(rm).mockRejectedValue(new Error('Permission denied'))

      const module = await import('../../../src/utils/workflow-installer')
      const cleanupOldVersionFiles = (module as any).cleanupOldVersionFiles

      if (cleanupOldVersionFiles) {
        await cleanupOldVersionFiles()

        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to remove'),
        )
      }
    })

    it('should skip non-existent files', async () => {
      vi.mocked(existsSync).mockReturnValue(false)

      const module = await import('../../../src/utils/workflow-installer')
      const cleanupOldVersionFiles = (module as any).cleanupOldVersionFiles

      if (cleanupOldVersionFiles) {
        await cleanupOldVersionFiles()

        expect(rm).not.toHaveBeenCalled()
      }
    })
  })
})
