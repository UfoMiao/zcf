import { exec } from 'tinyexec'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CODE_TOOL_TO_SKILLS_AGENTS,
  commandFileToSkillName,
  installSkills,
} from '../../../src/utils/skills-installer'

vi.mock('tinyexec', () => ({
  exec: vi.fn(),
}))

describe('skills-installer utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(exec).mockResolvedValue({ exitCode: 0 } as never)
  })

  describe('commandFileToSkillName', () => {
    it('should convert command filenames to skill directory names', () => {
      expect(commandFileToSkillName('init-project.md')).toBe('init-project')
      expect(commandFileToSkillName('git-cleanBranches.md')).toBe('git-clean-branches')
      expect(commandFileToSkillName('bmad-init.md')).toBe('bmad-init')
    })
  })

  describe('code tool to skills agents mapping', () => {
    it('should include universal for claude-code to enable symlink installs', () => {
      expect(CODE_TOOL_TO_SKILLS_AGENTS['claude-code']).toEqual(['claude-code', 'universal'])
      expect(CODE_TOOL_TO_SKILLS_AGENTS.codex).toEqual(['codex'])
    })
  })

  describe('installSkills', () => {
    it('should call skills CLI without --copy for claude-code', async () => {
      await installSkills({
        skillsPath: '/pkg/templates/skills/zh-CN',
        skillNames: ['init-project', 'workflow'],
        agent: 'claude-code',
        global: true,
      })

      expect(exec).toHaveBeenCalledWith('npx', [
        '-y',
        'skills',
        'add',
        '/pkg/templates/skills/zh-CN',
        '-y',
        '-a',
        'claude-code',
        '-a',
        'universal',
        '-g',
        '-s',
        'init-project',
        '-s',
        'workflow',
      ])
    })

    it('should call skills CLI without --copy for codex', async () => {
      await installSkills({
        skillsPath: '/pkg/templates/skills/en',
        skillNames: ['init-project'],
        agent: 'codex',
        global: true,
      })

      expect(exec).toHaveBeenCalledWith('npx', [
        '-y',
        'skills',
        'add',
        '/pkg/templates/skills/en',
        '-y',
        '-a',
        'codex',
        '-g',
        '-s',
        'init-project',
      ])
      const args = vi.mocked(exec).mock.calls[0]?.[1] ?? []
      expect(args).not.toContain('--copy')
    })

    it('should skip exec when no skills are requested', async () => {
      const result = await installSkills({
        skillsPath: '/pkg/templates/skills/zh-CN',
        skillNames: [],
        agent: 'claude-code',
      })

      expect(exec).not.toHaveBeenCalled()
      expect(result).toEqual({
        success: true,
        installedSkills: [],
        errors: [],
      })
    })

    it('should surface exec failures', async () => {
      vi.mocked(exec).mockRejectedValue(new Error('npx failed'))

      const result = await installSkills({
        skillsPath: '/pkg/templates/skills/zh-CN',
        skillNames: ['workflow'],
        agent: 'claude-code',
      })

      expect(result.success).toBe(false)
      expect(result.errors[0]).toContain('Failed to install skills')
    })
  })
})
