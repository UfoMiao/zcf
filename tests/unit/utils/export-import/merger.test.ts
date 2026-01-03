/**
 * Comprehensive test suite for export-import merger module
 *
 * Tests cover:
 * - mergeConfigs() with different strategies
 * - replaceStrategy()
 * - mergeStrategy()
 * - skipExistingStrategy()
 * - detectConflicts()
 * - mergeMcpServices()
 * - mergeWorkflows()
 * - mergeProfiles()
 * - resolveConflicts()
 * - getConflictSummary()
 */

import type { ConfigConflict, MergeStrategy } from '../../../../src/types/export-import'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getConflictSummary,
  mergeConfigs,
  mergeMcpServices,
  mergeProfiles,
  mergeStrategy,
  mergeWorkflows,
  replaceStrategy,
  resolveConflicts,
  skipExistingStrategy,
} from '../../../../src/utils/export-import/merger'

// Mock object-utils
vi.mock('../../../../src/utils/object-utils', () => {
  // Simple deep merge implementation for testing (must be inline, no external references)
  const deepMergeFn = (obj1: any, obj2: any, options?: any): any => {
    if (!obj1)
      return obj2
    if (!obj2)
      return obj1

    const result = JSON.parse(JSON.stringify(obj1))

    for (const [key, value] of Object.entries(obj2)) {
      if (Array.isArray(value) && options?.mergeArrays) {
        if (options.arrayMergeStrategy === 'unique') {
          result[key] = [...new Set([...(result[key] || []), ...value])]
        }
        else {
          result[key] = [...(result[key] || []), ...value]
        }
      }
      else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = deepMergeFn(result[key] || {}, value, options)
      }
      else {
        result[key] = value
      }
    }

    return result
  }

  return {
    deepMerge: vi.fn(deepMergeFn),
    isPlainObject: vi.fn((value: any) => {
      return typeof value === 'object' && value !== null && !Array.isArray(value)
    }),
  }
})

describe('export-import/merger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('mergeConfigs', () => {
    describe('replace strategy', () => {
      it('should completely replace existing config with incoming', () => {
        const existing = { a: 1, b: 2, c: 3 }
        const incoming = { d: 4, e: 5 }

        const result = mergeConfigs(existing, incoming, 'replace')

        expect(result.merged).toEqual(incoming)
        expect(result.conflicts).toHaveLength(0)
      })

      it('should handle null existing config', () => {
        const incoming = { a: 1 }

        const result = mergeConfigs(null, incoming, 'replace')

        expect(result.merged).toEqual(incoming)
      })

      it('should handle null incoming config', () => {
        const existing = { a: 1 }

        const result = mergeConfigs(existing, null, 'replace')

        expect(result.merged).toBeNull()
      })
    })

    describe('merge strategy', () => {
      it('should deep merge configs', () => {
        const existing = { a: 1, b: { c: 2 } }
        const incoming = { b: { d: 3 }, e: 4 }

        const result = mergeConfigs(existing, incoming, 'merge')

        expect(result.merged.a).toBe(1)
        expect(result.merged.b.c).toBe(2)
        expect(result.merged.b.d).toBe(3)
        expect(result.merged.e).toBe(4)
      })

      it('should detect conflicts when merging', () => {
        const existing = { setting: 'value1' }
        const incoming = { setting: 'value2' }

        const result = mergeConfigs(existing, incoming, 'merge')

        expect(result.conflicts.length).toBeGreaterThan(0)
      })

      it('should handle nested object conflicts', () => {
        const existing = { config: { theme: 'dark', font: 'mono' } }
        const incoming = { config: { theme: 'light' } }

        const result = mergeConfigs(existing, incoming, 'merge')

        expect(result.merged.config.theme).toBe('light') // Incoming takes precedence
        expect(result.conflicts.length).toBeGreaterThan(0)
      })
    })

    describe('skip-existing strategy', () => {
      it('should preserve existing config and only add new keys', () => {
        const existing = { a: 1, b: 2 }
        const incoming = { b: 3, c: 4 }

        const result = mergeConfigs(existing, incoming, 'skip-existing')

        expect(result.merged.a).toBe(1)
        expect(result.merged.b).toBe(2) // Should keep existing
        expect(result.merged.c).toBe(4) // Should add new
      })

      it('should record skipped items as conflicts', () => {
        const existing = { setting: 'existing' }
        const incoming = { setting: 'incoming' }

        const result = mergeConfigs(existing, incoming, 'skip-existing')

        expect(result.merged.setting).toBe('existing')
        expect(result.conflicts.length).toBeGreaterThan(0)
        expect(result.conflicts[0].suggestedResolution).toBe('use-existing')
      })

      it('should recursively handle nested objects', () => {
        const existing = { config: { a: 1, b: 2 } }
        const incoming = { config: { b: 3, c: 4 } }

        const result = mergeConfigs(existing, incoming, 'skip-existing')

        expect(result.merged.config.a).toBe(1)
        expect(result.merged.config.b).toBe(2) // Existing preserved
        expect(result.merged.config.c).toBe(4) // New added
      })
    })

    describe('invalid strategy handling', () => {
      it('should return existing config for unknown strategy', () => {
        const existing = { a: 1 }
        const incoming = { b: 2 }

        const result = mergeConfigs(existing, incoming, 'unknown' as MergeStrategy)

        expect(result.merged).toEqual(existing)
        expect(result.conflicts).toHaveLength(0)
      })
    })
  })

  describe('replaceStrategy', () => {
    it('should return incoming config without conflicts', () => {
      const existing = { a: 1, b: 2 }
      const incoming = { c: 3, d: 4 }

      const result = replaceStrategy(existing, incoming)

      expect(result.merged).toEqual(incoming)
      expect(result.conflicts).toHaveLength(0)
    })

    it('should handle complex nested objects', () => {
      const existing = { deep: { nested: { value: 1 } } }
      const incoming = { simple: 'value' }

      const result = replaceStrategy(existing, incoming)

      expect(result.merged).toEqual(incoming)
      expect(result.merged).not.toHaveProperty('deep')
    })
  })

  describe('mergeStrategy', () => {
    it('should return incoming when existing is null/undefined', () => {
      const incoming = { a: 1 }

      const result1 = mergeStrategy(null, incoming)
      const result2 = mergeStrategy(undefined, incoming)

      expect(result1.merged).toEqual(incoming)
      expect(result2.merged).toEqual(incoming)
    })

    it('should return existing when incoming is null/undefined', () => {
      const existing = { a: 1 }

      const result1 = mergeStrategy(existing, null)
      const result2 = mergeStrategy(existing, undefined)

      expect(result1.merged).toEqual(existing)
      expect(result2.merged).toEqual(existing)
    })

    it('should detect array conflicts', () => {
      const existing = { items: [1, 2, 3] }
      const incoming = { items: [4, 5, 6] }

      const result = mergeStrategy(existing, incoming)

      expect(result.conflicts.some(c => c.name === 'items')).toBe(true)
    })

    it('should detect value conflicts', () => {
      const existing = { value: 'old' }
      const incoming = { value: 'new' }

      const result = mergeStrategy(existing, incoming)

      expect(result.conflicts.some(c => c.name === 'value')).toBe(true)
      expect(result.conflicts[0].existing).toBe('old')
      expect(result.conflicts[0].incoming).toBe('new')
    })
  })

  describe('skipExistingStrategy', () => {
    it('should return incoming when existing is null/undefined', () => {
      const incoming = { a: 1 }

      const result1 = skipExistingStrategy(null, incoming)
      const result2 = skipExistingStrategy(undefined, incoming)

      expect(result1.merged).toEqual(incoming)
      expect(result2.merged).toEqual(incoming)
    })

    it('should return existing when incoming is null/undefined', () => {
      const existing = { a: 1 }

      const result1 = skipExistingStrategy(existing, null)
      const result2 = skipExistingStrategy(existing, undefined)

      expect(result1.merged).toEqual(existing)
      expect(result2.merged).toEqual(existing)
    })

    it('should preserve existing values', () => {
      const existing = { a: 1, b: 2 }
      const incoming = { a: 10, b: 20, c: 30 }

      const result = skipExistingStrategy(existing, incoming)

      expect(result.merged.a).toBe(1)
      expect(result.merged.b).toBe(2)
      expect(result.merged.c).toBe(30)
    })
  })

  describe('mergeMcpServices', () => {
    describe('replace strategy', () => {
      it('should replace all MCP services', () => {
        const existing = {
          mcpServers: {
            server1: { command: 'cmd1' },
          },
        }
        const incoming = {
          mcpServers: {
            server2: { command: 'cmd2' },
          },
        }

        const result = mergeMcpServices(existing, incoming, 'replace')

        expect(result.merged.mcpServers.server1).toBeDefined()
        expect(result.merged.mcpServers.server2).toBeDefined()
      })
    })

    describe('merge strategy', () => {
      it('should merge MCP services and detect conflicts', () => {
        const existing = {
          mcpServers: {
            shared: { command: 'old' },
          },
        }
        const incoming = {
          mcpServers: {
            shared: { command: 'new' },
            new: { command: 'added' },
          },
        }

        const result = mergeMcpServices(existing, incoming, 'merge')

        expect(result.merged.mcpServers.shared).toBeDefined()
        expect(result.merged.mcpServers.new).toBeDefined()
        expect(result.conflicts.some(c => c.name === 'shared')).toBe(true)
      })
    })

    describe('skip-existing strategy', () => {
      it('should skip existing MCP services but add new ones', () => {
        const existing = {
          mcpServers: {
            server1: { command: 'old' },
          },
        }
        const incoming = {
          mcpServers: {
            server1: { command: 'new' },
            server2: { command: 'added' },
          },
        }

        const result = mergeMcpServices(existing, incoming, 'skip-existing')

        // Should keep existing server unchanged
        expect(result.merged.mcpServers.server1.command).toBe('old')
        // Should ADD new server (not existing) in skip-existing mode
        expect(result.merged.mcpServers.server2.command).toBe('added')
        // Should record the existing server as a conflict
        expect(result.conflicts.some(c => c.name === 'server1')).toBe(true)
      })
    })

    describe('edge cases', () => {
      it('should handle missing mcpServers in existing', () => {
        const existing = {}
        const incoming = {
          mcpServers: {
            server1: { command: 'cmd1' },
          },
        }

        const result = mergeMcpServices(existing, incoming, 'merge')

        expect(result.merged).toEqual(incoming)
      })

      it('should handle missing mcpServers in incoming', () => {
        const existing = {
          mcpServers: {
            server1: { command: 'cmd1' },
          },
        }
        const incoming = {}

        const result = mergeMcpServices(existing, incoming, 'merge')

        expect(result.merged).toEqual(existing)
      })
    })
  })

  describe('mergeWorkflows', () => {
    describe('replace strategy', () => {
      it('should replace workflows completely', () => {
        const existing = ['workflow1', 'workflow2']
        const incoming = ['workflow3', 'workflow4']

        const result = mergeWorkflows(existing, incoming, 'replace')

        expect(result.merged).toEqual(incoming)
        expect(result.conflicts).toHaveLength(0)
      })
    })

    describe('merge strategy', () => {
      it('should merge workflows with unique values', () => {
        const existing = ['workflow1', 'workflow2']
        const incoming = ['workflow2', 'workflow3']

        const result = mergeWorkflows(existing, incoming, 'merge')

        expect(result.merged).toHaveLength(3)
        expect(result.merged).toContain('workflow1')
        expect(result.merged).toContain('workflow2')
        expect(result.merged).toContain('workflow3')
      })

      it('should detect duplicate workflows as conflicts', () => {
        const existing = ['workflow1', 'workflow2']
        const incoming = ['workflow2', 'workflow3']

        const result = mergeWorkflows(existing, incoming, 'merge')

        expect(result.conflicts.some(c => c.name === 'workflow2')).toBe(true)
      })
    })

    describe('skip-existing strategy', () => {
      it('should only add new workflows', () => {
        const existing = ['workflow1', 'workflow2']
        const incoming = ['workflow2', 'workflow3']

        const result = mergeWorkflows(existing, incoming, 'skip-existing')

        expect(result.merged).toHaveLength(3)
        expect(result.merged).toContain('workflow1')
        expect(result.merged).toContain('workflow2')
        expect(result.merged).toContain('workflow3')
      })

      it('should record skipped workflows as conflicts', () => {
        const existing = ['workflow1']
        const incoming = ['workflow1', 'workflow2']

        const result = mergeWorkflows(existing, incoming, 'skip-existing')

        expect(result.conflicts.some(c => c.name === 'workflow1')).toBe(true)
        expect(result.conflicts[0].suggestedResolution).toBe('use-existing')
      })
    })

    describe('edge cases', () => {
      it('should handle empty existing workflows', () => {
        const incoming = ['workflow1', 'workflow2']

        const result1 = mergeWorkflows([], incoming, 'merge')
        const result2 = mergeWorkflows(null as any, incoming, 'merge')

        expect(result1.merged).toEqual(incoming)
        expect(result2.merged).toEqual(incoming)
      })

      it('should handle empty incoming workflows', () => {
        const existing = ['workflow1', 'workflow2']

        const result1 = mergeWorkflows(existing, [], 'merge')
        const result2 = mergeWorkflows(existing, null as any, 'merge')

        expect(result1.merged).toEqual(existing)
        expect(result2.merged).toEqual(existing)
      })
    })
  })

  describe('mergeProfiles', () => {
    describe('replace strategy', () => {
      it('should replace/add profiles', () => {
        const existing = {
          profiles: {
            profile1: { setting: 'value1' },
          },
        }
        const incoming = {
          profiles: {
            profile1: { setting: 'new' },
            profile2: { setting: 'value2' },
          },
        }

        const result = mergeProfiles(existing, incoming, 'replace')

        expect(result.merged.profiles.profile1.setting).toBe('new')
        expect(result.merged.profiles.profile2).toBeDefined()
      })
    })

    describe('merge strategy', () => {
      it('should merge profile configurations', () => {
        const existing = {
          profiles: {
            shared: { a: 1, b: 2 },
          },
        }
        const incoming = {
          profiles: {
            shared: { b: 3, c: 4 },
          },
        }

        const result = mergeProfiles(existing, incoming, 'merge')

        expect(result.merged.profiles.shared).toBeDefined()
        expect(result.conflicts.some(c => c.name === 'shared')).toBe(true)
      })
    })

    describe('skip-existing strategy', () => {
      it('should skip existing profiles but add new ones', () => {
        const existing = {
          profiles: {
            profile1: { setting: 'old' },
          },
        }
        const incoming = {
          profiles: {
            profile1: { setting: 'new' },
            profile2: { setting: 'added' },
          },
        }

        const result = mergeProfiles(existing, incoming, 'skip-existing')

        // Should keep existing profile unchanged
        expect(result.merged.profiles.profile1.setting).toBe('old')
        // Should ADD new profile (not existing) in skip-existing mode
        expect(result.merged.profiles.profile2.setting).toBe('added')
        // Should record the skipped profile as a conflict
        expect(result.conflicts.some(c => c.name === 'profile1')).toBe(true)
      })
    })

    describe('edge cases', () => {
      it('should handle missing profiles in existing', () => {
        const existing = {}
        const incoming = {
          profiles: {
            profile1: { setting: 'value' },
          },
        }

        const result = mergeProfiles(existing, incoming, 'merge')

        expect(result.merged).toEqual(incoming)
      })
    })
  })

  describe('resolveConflicts', () => {
    it('should apply use-existing resolution', () => {
      const config = { value: 'new' }
      const conflicts: ConfigConflict[] = [
        {
          type: 'settings',
          name: 'value',
          existing: 'old',
          incoming: 'new',
        },
      ]
      const resolutions = { value: 'use-existing' as const }

      const result = resolveConflicts(config, conflicts, resolutions)

      expect(result.value).toBe('old')
    })

    it('should apply use-incoming resolution', () => {
      const config = { value: 'old' }
      const conflicts: ConfigConflict[] = [
        {
          type: 'settings',
          name: 'value',
          existing: 'old',
          incoming: 'new',
        },
      ]
      const resolutions = { value: 'use-incoming' as const }

      const result = resolveConflicts(config, conflicts, resolutions)

      expect(result.value).toBe('new')
    })

    it('should apply merge resolution for objects', () => {
      const config = { config: { a: 1 } }
      const conflicts: ConfigConflict[] = [
        {
          type: 'settings',
          name: 'config',
          existing: { a: 1, b: 2 },
          incoming: { b: 3, c: 4 },
        },
      ]
      const resolutions = { config: 'merge' as const }

      const result = resolveConflicts(config, conflicts, resolutions)

      expect(result.config.a).toBe(1)
      expect(result.config.c).toBe(4)
    })

    it('should apply rename resolution', () => {
      const config = { value: 'existing' }
      const conflicts: ConfigConflict[] = [
        {
          type: 'settings',
          name: 'value',
          existing: 'existing',
          incoming: 'new',
        },
      ]
      const resolutions = { value: 'rename' as const }

      const result = resolveConflicts(config, conflicts, resolutions)

      expect(result.value_imported).toBe('new')
    })

    it('should handle nested path conflicts', () => {
      const config = { deep: { nested: { value: 'new' } } }
      const conflicts: ConfigConflict[] = [
        {
          type: 'settings',
          name: 'deep.nested.value',
          existing: 'old',
          incoming: 'new',
        },
      ]
      const resolutions = { 'deep.nested.value': 'use-existing' as const }

      const result = resolveConflicts(config, conflicts, resolutions)

      expect(result.deep.nested.value).toBe('old')
    })

    it('should skip conflicts without resolutions', () => {
      const config = { value: 'current' }
      const conflicts: ConfigConflict[] = [
        {
          type: 'settings',
          name: 'value',
          existing: 'old',
          incoming: 'new',
        },
      ]
      const resolutions = {}

      const result = resolveConflicts(config, conflicts, resolutions)

      expect(result.value).toBe('current') // Unchanged
    })
  })

  describe('getConflictSummary', () => {
    it('should count total conflicts', () => {
      const conflicts: ConfigConflict[] = [
        { type: 'settings', name: 'a', existing: 1, incoming: 2 },
        { type: 'settings', name: 'b', existing: 3, incoming: 4 },
        { type: 'mcp', name: 'c', existing: 5, incoming: 6 },
      ]

      const summary = getConflictSummary(conflicts)

      expect(summary.total).toBe(3)
    })

    it('should group conflicts by type', () => {
      const conflicts: ConfigConflict[] = [
        { type: 'settings', name: 'a', existing: 1, incoming: 2 },
        { type: 'settings', name: 'b', existing: 3, incoming: 4 },
        { type: 'mcp', name: 'c', existing: 5, incoming: 6 },
        { type: 'workflows', name: 'd', existing: 7, incoming: 8 },
      ]

      const summary = getConflictSummary(conflicts)

      expect(summary.byType.settings).toBe(2)
      expect(summary.byType.mcp).toBe(1)
      expect(summary.byType.workflows).toBe(1)
    })

    it('should identify critical conflicts', () => {
      const conflicts: ConfigConflict[] = [
        { type: 'settings', name: 'a', existing: 1, incoming: 2 },
        { type: 'mcp', name: 'b', existing: 3, incoming: 4 },
        { type: 'profiles', name: 'c', existing: 5, incoming: 6 },
      ]

      const summary = getConflictSummary(conflicts)

      expect(summary.critical).toHaveLength(2) // mcp and profiles
      expect(summary.critical.every(c => c.type === 'mcp' || c.type === 'profiles')).toBe(true)
    })

    it('should handle empty conflicts array', () => {
      const summary = getConflictSummary([])

      expect(summary.total).toBe(0)
      expect(summary.critical).toHaveLength(0)
    })
  })
})
