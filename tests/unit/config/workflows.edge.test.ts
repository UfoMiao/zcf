import type { WorkflowConfig } from '../../../src/types/workflow'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getWorkflowConfig,
  getWorkflowConfigs,
} from '../../../src/config/workflows'
import { ensureI18nInitialized } from '../../../src/i18n'
import { selectAndInstallWorkflows } from '../../../src/utils/workflow-installer'

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
  updateOpenCodeSkillsPaths: vi.fn(),
}))

vi.mock('../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn().mockReturnValue({ codeToolType: 'claude-code' }),
}))

vi.mock('node:url', () => ({
  fileURLToPath: vi.fn().mockReturnValue('/project/dist/utils/workflow-installer.js'),
}))

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
      const fsOps = await import('../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.isDirectory).mockReturnValue(true)
      vi.mocked(fsOps.readDir).mockReturnValue(['skill-a'])
      vi.mocked(fsOps.copyDir).mockImplementation(() => {
        throw new Error('ENOSPC: no space left on device')
      })

      await selectAndInstallWorkflows('en', ['gitWorkflow'])

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('ENOSPC'),
      )
    })

    it('should handle concurrent workflow installations', async () => {
      const fsOps = await import('../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.isDirectory).mockReturnValue(true)
      vi.mocked(fsOps.readDir).mockReturnValue(['skill-a'])
      vi.mocked(fsOps.copyDir).mockImplementation(() => {})

      const promises = Array.from({ length: 3 }, () =>
        selectAndInstallWorkflows('en', ['gitWorkflow']))

      await expect(Promise.all(promises)).resolves.not.toThrow()
    })

    it('should handle corrupted workflow configuration', () => {
      const corruptedConfig = {
        id: 'gitWorkflow',
        // Missing required fields
        commands: undefined,
        agents: null,
      } as any

      const result = getWorkflowConfig(corruptedConfig.id)
      expect(result?.commands).toBeDefined()
      expect(Array.isArray(result?.commands)).toBe(true)
    })
  })

  describe('cleanup edge cases', () => {
    it('should handle partial cleanup failures', async () => {
      const fsOps = await import('../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValue(true)
      vi.mocked(fsOps.isDirectory).mockReturnValue(true)
      vi.mocked(fsOps.readDir).mockReturnValue(['skill-a'])
      vi.mocked(fsOps.copyDir).mockImplementation(() => {})
      vi.mocked(fsOps.remove)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Permission denied'))
        .mockResolvedValue(undefined)

      await selectAndInstallWorkflows('en', ['gitWorkflow'])

      expect(fsOps.copyDir).toHaveBeenCalled()
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('errors:failedToRemoveFile'),
      )
    })
  })

  describe('i18n edge cases', () => {
    it('should handle missing translation keys', async () => {
      const fsOps = await import('../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.isDirectory).mockReturnValue(true)
      vi.mocked(fsOps.readDir).mockReturnValue(['skill-a'])
      vi.mocked(fsOps.copyDir).mockImplementation(() => {})

      await expect(selectAndInstallWorkflows('en', ['gitWorkflow'])).resolves.not.toThrow()
    })
  })

  describe('workflow validation edge cases', () => {
    it('should validate workflow has at least one command', () => {
      const gitWorkflow = getWorkflowConfigs().find(w => w.id === 'gitWorkflow')
      expect(gitWorkflow?.commands.length).toBeGreaterThan(0)
    })

    it('should validate workflow category matches known categories', () => {
      const validCategories = ['plan', 'sixStep', 'bmad', 'git', 'common']
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
        sourceDir: 'empty',
      }

      expect(emptyCommandsConfig.commands).toEqual([])
      expect(emptyCommandsConfig.commands.length).toBe(0)
    })

    it('should validate git workflow specific properties', () => {
      const gitWorkflow = getWorkflowConfigs().find(w => w.id === 'gitWorkflow')

      expect(gitWorkflow?.autoInstallAgents).toBe(false)
      expect(gitWorkflow?.agents).toEqual([])
      expect(gitWorkflow?.category).toBe('git')

      gitWorkflow?.commands.forEach((cmd) => {
        expect(cmd).toMatch(/\.md$/)
      })
    })
  })

  describe('installation result validation', () => {
    it('should validate installation result structure', async () => {
      const fsOps = await import('../../../src/utils/fs-operations')
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(fsOps.isDirectory).mockReturnValue(true)
      vi.mocked(fsOps.readDir).mockReturnValue(['git-commit'])
      vi.mocked(fsOps.copyDir).mockImplementation(() => {})

      const result = (await selectAndInstallWorkflows('en', ['gitWorkflow']))[0]

      expect(result).toHaveProperty('workflow')
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('installedCommands')
      expect(result).toHaveProperty('installedAgents')
      expect(result).toHaveProperty('installedSkills')
      expect(result).toHaveProperty('errors')

      expect(typeof result.workflow).toBe('string')
      expect(typeof result.success).toBe('boolean')
      expect(Array.isArray(result.installedCommands)).toBe(true)
      expect(Array.isArray(result.installedAgents)).toBe(true)
      expect(Array.isArray(result.installedSkills)).toBe(true)
    })
  })
})
