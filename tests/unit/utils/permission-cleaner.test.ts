import { describe, expect, it } from 'vitest'
import { cleanupPermissions, mergeAndCleanPermissions } from '../../../src/utils/permission-cleaner'

describe('permission-cleaner utilities', () => {
  describe('cleanupPermissions', () => {
    it('should remove redundant permissions when template has base permission', () => {
      const template = ['Bash', 'Read']
      const user = ['Bash(*)', 'Bash(mkdir:*)', 'Write', 'Read']

      const result = cleanupPermissions(template, user)

      expect(result).toContain('Bash')
      expect(result).toContain('Read')
      expect(result).toContain('Write')
      expect(result).not.toContain('Bash(*)')
      expect(result).not.toContain('Bash(mkdir:*)')
    })

    it('should remove invalid wildcard permissions', () => {
      const template = ['Read']
      const user = ['mcp__.*', 'mcp__*', 'mcp__(*)', 'Write']

      const result = cleanupPermissions(template, user)

      expect(result).toContain('Read')
      expect(result).toContain('Write')
      expect(result).not.toContain('mcp__.*')
      expect(result).not.toContain('mcp__*')
      expect(result).not.toContain('mcp__(*)')
    })

    it('should preserve permissions that do not start with template permissions', () => {
      const template = ['Bash']
      const user = ['BashScript', 'Basher', 'Write']

      const result = cleanupPermissions(template, user)

      expect(result).toContain('Bash')
      expect(result).not.toContain('BashScript') // Starts with "Bash" so removed
      expect(result).not.toContain('Basher') // Starts with "Bash" so removed
      expect(result).toContain('Write')
    })

    it('should handle empty template array', () => {
      const template: string[] = []
      const user = ['Read', 'Write', 'Execute']

      const result = cleanupPermissions(template, user)

      expect(result).toEqual(['Read', 'Write', 'Execute'])
    })

    it('should handle empty user array', () => {
      const template = ['Read', 'Write']
      const user: string[] = []

      const result = cleanupPermissions(template, user)

      expect(result).toEqual(['Read', 'Write'])
    })

    it('should handle duplicate permissions in template', () => {
      const template = ['Read', 'Read', 'Write']
      const user = ['Execute']

      const result = cleanupPermissions(template, user)

      expect(result).toContain('Read')
      expect(result).toContain('Write')
      expect(result).toContain('Execute')
      // Should have no duplicate Read
      const readCount = result.filter(p => p === 'Read').length
      expect(readCount).toBe(1)
    })

    it('should handle exact matches correctly', () => {
      const template = ['Bash', 'Read']
      const user = ['Bash', 'Read', 'Write']

      const result = cleanupPermissions(template, user)

      expect(result).toEqual(['Bash', 'Read', 'Write'])
      // No duplicates
      const bashCount = result.filter(p => p === 'Bash').length
      expect(bashCount).toBe(1)
    })
  })

  describe('mergeAndCleanPermissions', () => {
    it('should merge permissions without duplicates', () => {
      const template = ['read', 'write']
      const existing = ['write', 'execute']

      const result = mergeAndCleanPermissions(template, existing)

      expect(result).toContain('read')
      expect(result).toContain('write')
      expect(result).toContain('execute')
      // Check no duplicates
      const writeCount = result.filter(p => p === 'write').length
      expect(writeCount).toBe(1)
    })

    it('should handle undefined template', () => {
      const existing = ['read', 'write']

      const result = mergeAndCleanPermissions(undefined, existing)

      expect(result).toEqual(['read', 'write'])
    })

    it('should handle undefined existing', () => {
      const template = ['read', 'write']

      const result = mergeAndCleanPermissions(template, undefined)

      expect(result).toEqual(['read', 'write'])
    })

    it('should handle both undefined', () => {
      const result = mergeAndCleanPermissions(undefined, undefined)

      expect(result).toEqual([])
    })

    it('should filter out invalid wildcard permissions', () => {
      const template = ['read', 'write']
      const existing = ['execute', 'mcp__.*', 'mcp__*']

      const result = mergeAndCleanPermissions(template, existing)

      expect(result).toContain('read')
      expect(result).toContain('write')
      expect(result).toContain('execute')
      expect(result).not.toContain('mcp__.*')
      expect(result).not.toContain('mcp__*')
    })

    it('should handle empty arrays', () => {
      const result = mergeAndCleanPermissions([], [])

      expect(result).toEqual([])
    })
  })
})
