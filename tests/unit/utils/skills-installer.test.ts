import { describe, expect, it } from 'vitest'
import { commandFileToSkillName } from '../../../src/utils/skills-installer'

describe('skills-installer utilities', () => {
  describe('commandFileToSkillName', () => {
    it('should convert command filenames to skill directory names', () => {
      expect(commandFileToSkillName('init-project.md')).toBe('init-project')
      expect(commandFileToSkillName('git-cleanBranches.md')).toBe('git-clean-branches')
      expect(commandFileToSkillName('bmad-init.md')).toBe('bmad-init')
    })
  })
})
