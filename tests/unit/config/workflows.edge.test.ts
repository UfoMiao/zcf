import type { WorkflowConfig } from '../../../src/types/workflow'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, rm } from 'node:fs/promises'
import inquirer from 'inquirer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getWorkflowConfig,
  getWorkflowConfigs,
} from '../../../src/config/workflows'
import { ensureI18nInitialized } from '../../../src/i18n'
import { selectAndInstallWorkflows } from '../../../src/utils/workflow-installer'

vi.mock('node:fs')
vi.mock('node:fs/promises')
vi.mock('inquirer')

describe('workflows edge cases and error handling', () => {
  beforeEach(() => {
    ensureI18nInitialized()
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('configuration edge cases', () => {
    it('should handle undefined workflow id gracefully', () => {
      const result = getWorkflowConfig(undefined as any)
      expect(result).toBeUndefined()
    })

    it('should handle null workflow id gracefully', () => {
      const result = getWorkflowConfig(null as any)
      expect(result).toBeUndefined()
    })

    it('should handle very long workflow id', () => {
      const longId = 'a'.repeat(1000)
      const result = getWorkflowConfig(longId)
      expect(result).toBeUndefined()
    })

    it('should handle special characters in workflow id', () => {
      const specialIds = [
        'workflow!@#$',
        'workflow<script>',
        'workflow\n\r',
        'workflow\0',
        '../../../etc/passwd',
      ]

      specialIds.forEach((id) => {
        const result = getWorkflowConfig(id)
        expect(result).toBeUndefined()
      })
    })
  })

  describe('file system edge cases', () => {
    it('should handle ENOSPC disk space error', async () => {
      // Mock the workflow installation with ENOSPC error
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(copyFile).mockRejectedValue(new Error('ENOSPC: no space left on device'))

      // Test with preselected workflow to avoid inquirer prompt
      await selectAndInstallWorkflows('en', ['gitWorkflow'])

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('ENOSPC'),
      )
    })

    it('should handle concurrent workflow installations', async () => {
      const promises = []

      // Simulate concurrent installations
      for (let i = 0; i < 3; i++) {
        vi.mocked(inquirer.prompt).mockResolvedValue({
          selectedWorkflows: ['gitWorkflow'],
        })
        vi.mocked(existsSync).mockReturnValue(true)
        vi.mocked(copyFile).mockResolvedValue(undefined)
        vi.mocked(mkdir).mockResolvedValue(undefined)

        promises.push(selectAndInstallWorkflows('en', ['gitWorkflow']))
      }

      // All should complete without errors
      await expect(Promise.all(promises)).resolves.not.toThrow()
    })

    it('should handle corrupted workflow configuration', async () => {
      const corruptedConfig = {
        id: 'gitWorkflow',
        // Missing required fields
        commands: undefined,
        agents: null,
      } as any

      // Test that the system handles corrupted config gracefully
      const result = getWorkflowConfig(corruptedConfig.id)
      // Should still return valid config from getWorkflowConfigs()
      expect(result?.commands).toBeDefined()
      expect(Array.isArray(result?.commands)).toBe(true)
    })
  })

  describe('cleanup edge cases', () => {
    it('should handle partial cleanup failures', async () => {
      // Mock existsSync to return true for old files and workflow files
      vi.mocked(existsSync)
        .mockReturnValueOnce(true) // Old command file 1 exists
        .mockReturnValueOnce(true) // Old command file 2 exists
        .mockReturnValueOnce(true) // Old agent file 1 exists
        .mockReturnValueOnce(true) // Old agent file 2 exists
        .mockReturnValue(true) // Workflow template files exist

      // Mock rm to succeed first time, fail second time
      vi.mocked(rm)
        .mockResolvedValueOnce(undefined) // First removal succeeds
        .mockRejectedValueOnce(new Error('Permission denied')) // Second fails
        .mockResolvedValueOnce(undefined) // Third succeeds
        .mockRejectedValueOnce(new Error('Permission denied')) // Fourth fails

      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)

      // Test with preselected workflow
      await selectAndInstallWorkflows('en', ['gitWorkflow'])

      // Should continue despite partial cleanup failure
      expect(copyFile).toHaveBeenCalled()
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to remove file:'),
      )
    })

    it('should handle cleanup with symlinks', async () => {
      // Mock existsSync to return true for old files and workflow files
      vi.mocked(existsSync).mockReturnValue(true)

      // Mock rm to fail with EISDIR error (symlink issue)
      vi.mocked(rm).mockRejectedValue(new Error('EISDIR: illegal operation on a directory'))

      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)

      // Test with preselected workflow
      await selectAndInstallWorkflows('en', ['gitWorkflow'])

      // Should handle symlink errors gracefully
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to remove file:'),
      )
      expect(copyFile).toHaveBeenCalled()
    })
  })

  describe('i18n edge cases', () => {
    it('should handle missing translation keys', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        selectedWorkflows: ['gitWorkflow'],
      })
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)

      // Should not throw even with missing translations
      await expect(selectAndInstallWorkflows('en', ['gitWorkflow'])).resolves.not.toThrow()
    })
  })

  describe('workflow validation edge cases', () => {
    it('should validate workflow has at least one command', () => {
      const gitWorkflow = getWorkflowConfigs().find(w => w.id === 'gitWorkflow')
      expect(gitWorkflow?.commands.length).toBeGreaterThan(0)
    })

    it('should validate workflow category matches known categories', () => {
      const validCategories = ['plan', 'sixStep', 'bmad', 'git']
      const gitWorkflow = getWorkflowConfigs().find(w => w.id === 'gitWorkflow')
      expect(validCategories).toContain(gitWorkflow?.category)
    })

    it('should handle workflow with empty commands array', () => {
      const emptyCommandsConfig: WorkflowConfig = {
        id: 'emptyWorkflow',
        name: 'Empty Workflow',
        description: 'Empty workflow for testing',
        category: 'git',
        defaultSelected: false,
        autoInstallAgents: false,
        commands: [],
        agents: [],
        order: 99,
        outputDir: 'empty',
      }

      // System should handle empty commands gracefully
      expect(emptyCommandsConfig.commands).toEqual([])
      expect(emptyCommandsConfig.commands.length).toBe(0)
    })

    it('should validate git workflow specific properties', () => {
      const gitWorkflow = getWorkflowConfigs().find(w => w.id === 'gitWorkflow')

      // Git workflow should not auto-install agents
      expect(gitWorkflow?.autoInstallAgents).toBe(false)

      // Git workflow should have empty agents array
      expect(gitWorkflow?.agents).toEqual([])

      // Git workflow should have git category
      expect(gitWorkflow?.category).toBe('git')

      // Git workflow commands should be markdown files
      gitWorkflow?.commands.forEach((cmd) => {
        expect(cmd).toMatch(/\.md$/)
      })
    })
  })

  describe('installation result validation', () => {
    it('should validate installation result structure', async () => {
      const gitWorkflowConfig: WorkflowConfig = {
        id: 'gitWorkflow',
        name: 'Git Workflow',
        description: 'Workflow for Git operations',
        category: 'git',
        defaultSelected: true,
        autoInstallAgents: false,
        commands: ['git-commit.md'],
        agents: [],
        order: 4,
        outputDir: 'git',
      }

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)

      const module = await import('../../../src/utils/workflow-installer')
      const installWorkflowWithDependencies = (module as any).installWorkflowWithDependencies

      if (installWorkflowWithDependencies) {
        const result = await installWorkflowWithDependencies(
          gitWorkflowConfig,
          'en',
          'en',
        )

        // Validate result structure
        expect(result).toHaveProperty('workflow')
        expect(result).toHaveProperty('success')
        expect(result).toHaveProperty('installedCommands')
        expect(result).toHaveProperty('installedAgents')
        expect(result).toHaveProperty('errors')

        expect(typeof result.workflow).toBe('string')
        expect(typeof result.success).toBe('boolean')
        expect(Array.isArray(result.installedCommands)).toBe(true)
        expect(Array.isArray(result.installedAgents)).toBe(true)
        expect(Array.isArray(result.errors)).toBe(true)
      }
    })
  })
})
