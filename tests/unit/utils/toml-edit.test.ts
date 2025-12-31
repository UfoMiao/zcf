import { beforeEach, describe, expect, it, vi } from 'vitest'

// Note: These tests use the actual toml-edit module (not mocked)
// because we want to verify the real functionality of format-preserving editing

describe('toml-edit utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('parseToml', () => {
    it('should parse simple TOML correctly', async () => {
      const { parseToml } = await import('../../../src/utils/toml-edit')

      const toml = `
name = "test"
version = "1.0.0"

[section]
key = "value"
`

      const result = parseToml<{
        name: string
        version: string
        section: { key: string }
      }>(toml)

      expect(result.name).toBe('test')
      expect(result.version).toBe('1.0.0')
      expect(result.section.key).toBe('value')
    })

    it('should parse nested TOML structures', async () => {
      const { parseToml } = await import('../../../src/utils/toml-edit')

      const toml = `
[parent]
name = "parent"

[parent.child]
name = "child"
value = 42
`

      const result = parseToml<{
        parent: {
          name: string
          child: { name: string, value: number }
        }
      }>(toml)

      expect(result.parent.name).toBe('parent')
      expect(result.parent.child.name).toBe('child')
      expect(result.parent.child.value).toBe(42)
    })

    it('should handle arrays in TOML', async () => {
      const { parseToml } = await import('../../../src/utils/toml-edit')

      const toml = `
items = ["a", "b", "c"]
numbers = [1, 2, 3]
`

      const result = parseToml<{
        items: string[]
        numbers: number[]
      }>(toml)

      expect(result.items).toEqual(['a', 'b', 'c'])
      expect(result.numbers).toEqual([1, 2, 3])
    })
  })

  describe('stringifyToml', () => {
    it('should stringify simple objects correctly', async () => {
      const { stringifyToml } = await import('../../../src/utils/toml-edit')

      const data = {
        name: 'test',
        version: '1.0.0',
      }

      const result = stringifyToml(data)

      expect(result).toContain('name = "test"')
      expect(result).toContain('version = "1.0.0"')
    })

    it('should stringify nested objects with sections', async () => {
      const { stringifyToml } = await import('../../../src/utils/toml-edit')

      const data = {
        section: {
          key: 'value',
          number: 42,
        },
      }

      const result = stringifyToml(data)

      expect(result).toContain('[section]')
      expect(result).toContain('key = "value"')
      expect(result).toContain('number = 42')
    })
  })

  describe('editToml', () => {
    it('should edit nested fields using dot notation', async () => {
      const { editToml } = await import('../../../src/utils/toml-edit')

      const original = `
[section]
key = "old-value"
other = "preserved"
`

      const result = editToml(original, 'section.key', 'new-value')

      expect(result).toContain('[section]')
      expect(result).toContain('key = "new-value"')
      expect(result).toContain('other = "preserved"')
      expect(result).not.toContain('old-value')
    })

    it('should preserve comments when editing nested fields', async () => {
      const { editToml } = await import('../../../src/utils/toml-edit')

      const original = `# Main configuration
# This comment should be preserved

# Section comment
[settings]
# This is an important setting
important = true
enabled = false
`

      const result = editToml(original, 'settings.enabled', true)

      expect(result).toContain('# Main configuration')
      expect(result).toContain('# This comment should be preserved')
      expect(result).toContain('# Section comment')
      expect(result).toContain('# This is an important setting')
      expect(result).toContain('enabled = true')
    })

    it('should handle boolean values in sections', async () => {
      const { editToml } = await import('../../../src/utils/toml-edit')

      const original = `[config]
enabled = false`

      const result = editToml(original, 'config.enabled', true)

      expect(result).toContain('enabled = true')
    })

    it('should handle numeric values in sections', async () => {
      const { editToml } = await import('../../../src/utils/toml-edit')

      const original = `[config]
count = 0`

      const result = editToml(original, 'config.count', 42)

      expect(result).toContain('count = 42')
    })

    it('should handle array values in sections', async () => {
      const { editToml } = await import('../../../src/utils/toml-edit')

      const original = `[config]
items = ["a", "b"]`

      const result = editToml(original, 'config.items', ['x', 'y', 'z'])

      expect(result).toContain('x')
      expect(result).toContain('y')
      expect(result).toContain('z')
    })

    it('should handle deeply nested paths', async () => {
      const { editToml } = await import('../../../src/utils/toml-edit')

      const original = `[parent.child]
value = "old"
other = "keep"
`

      const result = editToml(original, 'parent.child.value', 'new')

      expect(result).toContain('value = "new"')
      expect(result).toContain('other = "keep"')
    })
  })

  describe('batchEditToml', () => {
    it('should apply multiple edits to sections while preserving formatting', async () => {
      const { batchEditToml } = await import('../../../src/utils/toml-edit')

      const original = `# Config
[general]
name = "old"
version = "0.0.1"

[settings]
enabled = false
count = 0
`

      const edits: Array<[string, unknown]> = [
        ['general.name', 'new'],
        ['general.version', '1.0.0'],
        ['settings.enabled', true],
        ['settings.count', 42],
      ]

      const result = batchEditToml(original, edits)

      expect(result).toContain('# Config')
      expect(result).toContain('name = "new"')
      expect(result).toContain('version = "1.0.0"')
      expect(result).toContain('enabled = true')
      expect(result).toContain('count = 42')
    })
  })

  describe('initialization', () => {
    it('should handle repeated initialization safely', async () => {
      const { ensureTomlInit, ensureTomlInitSync, isTomlInitialized } = await import('../../../src/utils/toml-edit')

      // First call
      await ensureTomlInit()
      expect(isTomlInitialized()).toBe(true)

      // Repeated calls should be safe
      await ensureTomlInit()
      ensureTomlInitSync()
      expect(isTomlInitialized()).toBe(true)
    })
  })
})
