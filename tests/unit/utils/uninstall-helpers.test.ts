// Usage: Mock filesystem reads used by the uninstall helper tests.
import { readFileSync } from 'node:fs'
// Usage: Define and run unit-test lifecycle and assertion helpers.
import { beforeEach, describe, expect, it, vi } from 'vitest'
// Usage: Exercise path formatting, safe reads, and TOML section cleanup.
import { formatHomePath, readTextFile, removeTomlSections } from '../../../src/utils/uninstall-helpers'

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
}))

const mockReadFileSync = vi.mocked(readFileSync)

describe('uninstall helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('formatHomePath', () => {
    it('formats paths below a POSIX home directory', () => {
      expect(formatHomePath('/Users/mia/.codex/config.toml', '/Users/mia')).toBe('~/.codex/config.toml')
    })

    it('formats Windows paths using the same home-relative display', () => {
      expect(formatHomePath('C:\\Users\\Mia\\.codex\\config.toml', 'C:\\Users\\Mia')).toBe('~/.codex/config.toml')
    })

    it('does not shorten a path sharing only a home prefix', () => {
      expect(formatHomePath('/Users/miami/.codex/config.toml', '/Users/mia')).toBe('/Users/miami/.codex/config.toml')
    })
  })

  describe('readTextFile', () => {
    it('returns file contents', () => {
      mockReadFileSync.mockReturnValue('content')
      expect(readTextFile('/tmp/file')).toBe('content')
    })

    it('treats missing files as absent and rethrows other errors', () => {
      mockReadFileSync.mockImplementationOnce(() => {
        throw Object.assign(new Error('missing'), { code: 'ENOENT' })
      })
      expect(readTextFile('/tmp/missing')).toBeNull()

      const error = new Error('permission denied')
      mockReadFileSync.mockImplementationOnce(() => {
        throw error
      })
      expect(() => readTextFile('/tmp/forbidden')).toThrow(error)
    })
  })

  describe('removeTomlSections', () => {
    it('removes the requested section and nested tables while preserving others', () => {
      const content = [
        '[general]',
        'value = "keep"',
        '',
        '[claudeCode]',
        'enabled = true',
        '',
        '[claudeCode.profiles.default]',
        'apiKey = "secret"',
        '',
        '[codex]',
        'enabled = true',
        '',
      ].join('\n')

      expect(removeTomlSections(content, ['claudeCode'])).toBe(
        '[general]\nvalue = "keep"\n\n[codex]\nenabled = true\n',
      )
    })

    it('returns null when no requested section exists', () => {
      expect(removeTomlSections('[general]\nvalue = "keep"\n', ['claudeCode'])).toBeNull()
    })
  })
})
