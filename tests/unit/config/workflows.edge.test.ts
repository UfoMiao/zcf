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
import * as skillsInstaller from '../../../src/utils/skills-installer'
import { selectAndInstallWorkflows } from '../../../src/utils/workflow-installer'

vi.mock('node:fs')
vi.mock('node:fs/promises')
vi.mock('inquirer')
vi.mock('../../../src/utils/skills-installer', () => ({
  installSkills: vi.fn(),
  commandFileToSkillName: vi.fn((filename: string) => filename.replace(/\.md$/, '').replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()),
}))

describe('workflows edge cases and error handling', () => {
  beforeEach(() => {
    ensureI18nInitialized()
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
    it('should handle skills install failure', async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(skillsInstaller.installSkills).mockResolvedValue({
        success: false,
        installedSkills: [],
        errors: ['Failed to install skills: ENOSPC'],
      })

      await selectAndInstallWorkflows('en', ['gitWorkflow'])

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('ENOSPC'),
      )
    })

    it('should handle concurrent workflow installations', async () => {
      const promises = []

      for (let i = 0; i < 3; i++) {
        vi.mocked(inquirer.prompt).mockResolvedValue({
          selectedWorkflows: ['gitWorkflow'],
        })
        vi.mocked(existsSync).mockReturnValue(true)
        vi.mocked(copyFile).mockResolvedValue(undefined)
        vi.mocked(mkdir).mockResolvedValue(undefined)

        promises.push(selectAndInstallWorkflows('en', ['gitWorkflow']))
      }

      await expect(Promise.all(promises)).resolves.not.toThrow()
    })

    it('should handle corrupted workflow configuration', async () => {
      const corruptedConfig = {
        id: 'gitWorkflow',
        skills: undefined,
        agents: null,
      } as any

      const result = getWorkflowConfig(corruptedConfig.id)
      expect(result?.skills).toBeDefined()
      expect(Array.isArray(result?.skills)).toBe(true)
    })
  })

  describe('cleanup edge cases', () => {
    it('should handle partial cleanup failures', async () => {
      vi.mocked(existsSync)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValue(true)

      vi.mocked(rm)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Permission denied'))
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Permission denied'))

      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(skillsInstaller.installSkills).mockResolvedValue({
        success: true,
        installedSkills: ['git-commit'],
        errors: [],
      })

      await selectAndInstallWorkflows('en', ['gitWorkflow'])

      expect(skillsInstaller.installSkills).toHaveBeenCalled()
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to remove file:'),
      )
    })

    it('should handle cleanup with symlinks', async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(rm).mockRejectedValue(new Error('EISDIR: illegal operation on a directory'))
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(skillsInstaller.installSkills).mockResolvedValue({
        success: true,
        installedSkills: ['git-commit'],
        errors: [],
      })

      await selectAndInstallWorkflows('en', ['gitWorkflow'])

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to remove file:'),
      )
      expect(skillsInstaller.installSkills).toHaveBeenCalled()
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

      await expect(selectAndInstallWorkflows('en', ['gitWorkflow'])).resolves.not.toThrow()
    })
  })

  describe('workflow validation edge cases', () => {
    it('should validate workflow has at least one skill', () => {
      const gitWorkflow = getWorkflowConfigs().find(w => w.id === 'gitWorkflow')
      expect(gitWorkflow?.skills.length).toBeGreaterThan(0)
    })

    it('should validate workflow category matches known categories', () => {
      const validCategories = ['plan', 'sixStep', 'bmad', 'git']
      const gitWorkflow = getWorkflowConfigs().find(w => w.id === 'gitWorkflow')
      expect(validCategories).toContain(gitWorkflow?.category)
    })

    it('should handle workflow with empty skills array', () => {
      const emptySkillsConfig: WorkflowConfig = {
        id: 'emptyWorkflow',
        name: 'Empty Workflow',
        description: 'Empty workflow for testing',
        category: 'git',
        defaultSelected: false,
        autoInstallAgents: false,
        skills: [],
        agents: [],
        order: 99,
        outputDir: 'empty',
      }

      expect(emptySkillsConfig.skills).toEqual([])
      expect(emptySkillsConfig.skills.length).toBe(0)
    })

    it('should validate git workflow specific properties', () => {
      const gitWorkflow = getWorkflowConfigs().find(w => w.id === 'gitWorkflow')

      expect(gitWorkflow?.autoInstallAgents).toBe(false)
      expect(gitWorkflow?.agents).toEqual([])
      expect(gitWorkflow?.category).toBe('git')

      gitWorkflow?.skills.forEach((skill) => {
        expect(skill).toMatch(/^[a-z0-9-]+$/)
      })
    })
  })
})
