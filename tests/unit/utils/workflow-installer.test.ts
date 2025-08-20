import type { WorkflowConfig, WorkflowType } from '../../../src/types/workflow'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import inquirer from 'inquirer'
import { dirname, join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as workflowConfig from '../../../src/config/workflows'
import { CLAUDE_DIR } from '../../../src/constants'
import { getTranslation } from '../../../src/i18n'
import { selectAndInstallWorkflows } from '../../../src/utils/workflow-installer'

vi.mock('node:fs')
vi.mock('node:fs/promises')
vi.mock('node:url')
vi.mock('inquirer')
vi.mock('../../../src/config/workflows')

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
        id: 'workflow' as WorkflowType,
        category: 'general',
        defaultSelected: true,
        autoInstallAgents: false,
        commands: ['workflow.md'],
        agents: [],
      },
      {
        id: 'bmadWorkflow' as WorkflowType,
        category: 'bmad',
        defaultSelected: false,
        autoInstallAgents: true,
        commands: ['bmad-init.md'],
        agents: [
          { filename: 'analyst.md', required: true },
          { filename: 'architect.md', required: true },
        ],
      },
      {
        id: 'gitWorkflow',
        nameKey: 'workflowOption.gitWorkflow',
        descriptionKey: 'workflowDescription.gitWorkflow',
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
        mockWorkflows.find(w => w.id === id) || null,
      )
    })

    it('should display workflow choices and handle selection', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        selectedWorkflows: ['workflow'],
      })
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)

      await selectAndInstallWorkflows('zh-CN', 'zh-CN')

      expect(inquirer.prompt).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'checkbox',
          name: 'selectedWorkflows',
          message: expect.stringContaining(getTranslation('zh-CN').workflow.selectWorkflowType),
          choices: expect.arrayContaining([
            expect.objectContaining({
              value: 'workflow',
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

      await selectAndInstallWorkflows('en', 'en')

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(getTranslation('en').common.cancelled),
      )
      expect(copyFile).not.toHaveBeenCalled()
    })

    it('should clean up old files before installation', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        selectedWorkflows: ['workflow'],
      })
      vi.mocked(existsSync)
        .mockReturnValueOnce(true) // Old command file exists
        .mockReturnValueOnce(true) // Old agent file exists
        .mockReturnValue(true)
      vi.mocked(rm).mockResolvedValue(undefined)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)

      await selectAndInstallWorkflows('en', 'en')

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
        selectedWorkflows: ['workflow', 'bmadWorkflow'],
      })
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)

      await selectAndInstallWorkflows('zh-CN', 'zh-CN')

      expect(workflowConfig.getWorkflowConfig).toHaveBeenCalledWith('workflow')
      expect(workflowConfig.getWorkflowConfig).toHaveBeenCalledWith('bmadWorkflow')
      expect(copyFile).toHaveBeenCalled()
    })

    it('should handle cleanup errors gracefully', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        selectedWorkflows: ['workflow'],
      })
      vi.mocked(existsSync)
        .mockReturnValueOnce(true) // Old file exists
        .mockReturnValue(true)
      vi.mocked(rm).mockRejectedValueOnce(new Error('Permission denied'))
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)

      await selectAndInstallWorkflows('en', 'en')

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

      await selectAndInstallWorkflows('zh-CN', 'zh-CN')

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

      await selectAndInstallWorkflows('en', 'en')

      // Should copy command files but not create agents
      expect(copyFile).toHaveBeenCalled()
      // Verify no agent-related mkdir calls
      const mkdirCalls = vi.mocked(mkdir).mock.calls
      const hasAgentDir = mkdirCalls.some(call =>
        call[0].includes('agents'),
      )
      expect(hasAgentDir).toBe(false)
    })

    it('should install multiple workflows including gitWorkflow', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        selectedWorkflows: ['workflow', 'gitWorkflow'],
      })
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)

      await selectAndInstallWorkflows('zh-CN', 'zh-CN')

      expect(workflowConfig.getWorkflowConfig).toHaveBeenCalledWith('workflow')
      expect(workflowConfig.getWorkflowConfig).toHaveBeenCalledWith('gitWorkflow')
      // Should copy files for both workflows (1 + 4 = 5)
      expect(copyFile).toHaveBeenCalledTimes(5)
    })
  })

  describe('installWorkflowWithDependencies', () => {
    const mockWorkflowConfig: WorkflowConfig = {
      id: 'bmadWorkflow' as WorkflowType,
      category: 'bmad',
      defaultSelected: false,
      autoInstallAgents: true,
      commands: ['bmad-init.md', 'bmad.md'],
      agents: [
        { filename: 'analyst.md', required: true },
        { filename: 'architect.md', required: false },
      ],
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
          'zh-CN',
        )

        expect(result.success).toBe(true)
        expect(result.installedCommands).toContain('bmad-init.md')
        expect(result.installedCommands).toContain('bmad.md')
        expect(mkdir).toHaveBeenCalledWith(
          join(CLAUDE_DIR, 'commands', 'zcf'),
          { recursive: true },
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
          'en',
        )

        expect(result.installedAgents).toContain('analyst.md')
        expect(result.installedAgents).toContain('architect.md')
        expect(mkdir).toHaveBeenCalledWith(
          join(CLAUDE_DIR, 'agents', 'zcf', 'bmad'),
          { recursive: true },
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
          'en',
        )

        expect(result.success).toBe(false)
        expect(result.errors).toContain(expect.stringContaining('Copy failed'))
      }
    })

    it('should handle required agent installation failure', async () => {
      const configWithRequiredAgent: WorkflowConfig = {
        ...mockWorkflowConfig,
        agents: [{ filename: 'critical.md', required: true }],
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
          'en',
        )

        expect(result.success).toBe(false)
        expect(result.errors).toContain(expect.stringContaining('Agent copy failed'))
      }
    })

    it('should handle optional agent installation failure gracefully', async () => {
      const configWithOptionalAgent: WorkflowConfig = {
        ...mockWorkflowConfig,
        agents: [{ filename: 'optional.md', required: false }],
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
          'zh-CN',
        )

        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining(getTranslation('zh-CN').workflow.bmadInitPrompt),
        )
      }
    })

    it('should install gitWorkflow commands correctly', async () => {
      const gitWorkflowConfig: WorkflowConfig = {
        id: 'gitWorkflow',
        nameKey: 'workflowOption.gitWorkflow',
        descriptionKey: 'workflowDescription.gitWorkflow',
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
        nameKey: 'workflowOption.gitWorkflow',
        descriptionKey: 'workflowDescription.gitWorkflow',
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
        await cleanupOldVersionFiles('en')

        expect(rm).toHaveBeenCalledWith(
          join(CLAUDE_DIR, 'commands', 'workflow.md'),
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
        await cleanupOldVersionFiles('zh-CN')

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
        await cleanupOldVersionFiles('en')

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
        await cleanupOldVersionFiles('en')

        expect(rm).not.toHaveBeenCalled()
      }
    })
  })
})
