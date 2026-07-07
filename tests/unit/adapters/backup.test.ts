import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createTimestampedBackup,
  isCommonTemplatePath,
  projectCommonPath,
  projectSkillPath,
  resolveTemplateDestination,
} from '../../../src/adapters/backup'

const files = new Set<string>()
const dirs = new Set<string>()
let copied: Array<{ source: string, target: string }> = []

vi.mock('../../../src/utils/fs-operations', () => ({
  exists: vi.fn((path: string) => files.has(path)),
  ensureDir: vi.fn((path: string) => { dirs.add(path) }),
  copyFile: vi.fn((source: string, target: string) => { copied.push({ source, target }) }),
}))

vi.mock('dayjs', () => ({
  __esModule: true,
  default: vi.fn(() => ({
    format: vi.fn(() => '2026-07-07_12-00-00'),
  })),
}))

describe('backup helpers', () => {
  beforeEach(() => {
    files.clear()
    dirs.clear()
    copied = []
  })

  describe('createTimestampedBackup', () => {
    it('returns null when the target file does not exist', () => {
      const result = createTimestampedBackup(
        { id: 'settings', path: '/home/agent/settings.json', format: 'json', mergeStrategy: 'merge' },
        '/home/agent',
      )
      expect(result).toBeNull()
      expect(dirs.size).toBe(0)
    })

    it('creates a timestamped backup in the agent backup directory', () => {
      files.add('/home/agent/settings.json')
      const result = createTimestampedBackup(
        { id: 'settings', path: '/home/agent/settings.json', format: 'json', mergeStrategy: 'merge' },
        '/home/agent',
      )
      expect(result).toBe('/home/agent/backup/settings.json.backup_2026-07-07_12-00-00')
      expect(dirs.has('/home/agent/backup')).toBe(true)
      expect(copied).toEqual([{
        source: '/home/agent/settings.json',
        target: '/home/agent/backup/settings.json.backup_2026-07-07_12-00-00',
      }])
    })

    it('falls back to a generic filename when the path has no basename', () => {
      files.add('/home/agent/settings')
      const result = createTimestampedBackup(
        { id: 'settings', path: '/home/agent/settings', format: 'json', mergeStrategy: 'merge' },
        '/home/agent',
      )
      expect(result).toBe('/home/agent/backup/settings.backup_2026-07-07_12-00-00')
    })
  })

  describe('projectCommonPath', () => {
    it('projects a common source into the agent template directory', () => {
      const result = projectCommonPath('templates/common/shared.md', 'templates/common', 'templates/cc')
      expect(result).toBe('templates/cc/shared.md')
    })

    it('handles trailing slashes on the common directory', () => {
      const result = projectCommonPath('templates/common/nested/file.md', 'templates/common/', 'templates/cc')
      expect(result).toBe('templates/cc/nested/file.md')
    })
  })

  describe('projectSkillPath', () => {
    it('builds a skill manifest path without namespace', () => {
      const result = projectSkillPath('git-commit.md', '/skills')
      expect(result).toBe('/skills/git-commit/SKILL.md')
    })

    it('builds a namespaced skill manifest path', () => {
      const result = projectSkillPath('git-commit.md', '/skills', 'zcf', 'git-commit')
      expect(result).toBe('/skills/zcf/git-commit/SKILL.md')
    })

    it('derives the skill name from the source filename', () => {
      const result = projectSkillPath('/templates/zcf/onboard/SKILL.md', '/skills')
      expect(result).toBe('/skills/SKILL/SKILL.md')
    })
  })

  describe('isCommonTemplatePath', () => {
    it('returns true for paths under the common directory', () => {
      expect(isCommonTemplatePath('templates/common/shared.md', 'templates/common')).toBe(true)
    })

    it('returns false for agent-private paths', () => {
      expect(isCommonTemplatePath('templates/cc/settings.json', 'templates/common')).toBe(false)
    })
  })

  describe('resolveTemplateDestination', () => {
    it('renders common templates into the agent home directory', () => {
      const result = resolveTemplateDestination(
        'templates/common/shared.md',
        'templates/cc',
        '/home/claude',
        'templates/common',
      )
      expect(result).toBe('/home/claude/shared.md')
    })

    it('renders agent-private templates directly to the agent home directory', () => {
      const result = resolveTemplateDestination(
        'templates/cc/settings.json',
        'templates/cc',
        '/home/claude',
        'templates/common',
      )
      expect(result).toBe('/home/claude/settings.json')
    })
  })
})
