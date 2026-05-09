/**
 * Comprehensive test suite for export-import collector module
 *
 * Tests cover:
 * - collectClaudeCodeConfig() - Claude Code configuration collection
 * - collectCodexConfig() - Codex configuration collection
 * - collectWorkflows() - Workflow/agent file collection with ZCF filtering
 * - collectSkills() - Skills collection (Claude Code only)
 * - collectHooks() - Hooks collection (Claude Code only)
 * - collectPrompts() - Prompts collection (Codex only)
 * - collectMcpConfig() - MCP configuration collection
 * - collectAllConfig() - Comprehensive collection
 * - collectCustomFiles() - Custom file selection
 * - getCollectionSummary() - Collection statistics
 */

import type { ExportItem } from '../../../../src/types/export-import'
import { join } from 'pathe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CLAUDE_DIR, CODEX_DIR } from '../../../../src/constants'
import {
  CLAUDE_CODE_FILES,
  CODEX_FILES,
  collectAllConfig,
  collectClaudeCodeConfig,
  collectCodexConfig,
  collectCustomFiles,
  collectHooks,
  collectMcpConfig,
  collectPrompts,
  collectSkills,
  collectWorkflows,
  CONFIG_DIRS,
  getCollectionSummary,
} from '../../../../src/utils/export-import/collector'

// Mock fs-operations
vi.mock('../../../../src/utils/fs-operations', () => ({
  exists: vi.fn((path: string) => {
    // Claude Code files
    if (path === CLAUDE_CODE_FILES.settings)
      return true
    if (path === CLAUDE_CODE_FILES.zcfConfig)
      return true
    if (path === CLAUDE_CODE_FILES.claudeMd)
      return true
    if (path === join(CLAUDE_DIR, 'mcp-settings.json'))
      return true

    // Codex files
    if (path === CODEX_FILES.config)
      return true
    if (path === CODEX_FILES.auth)
      return true
    if (path === CODEX_FILES.agents)
      return true
    if (path === join(CODEX_DIR, 'mcp.json'))
      return true

    // Directories
    if (path === CONFIG_DIRS.claudeCode.workflows)
      return true
    if (path === CONFIG_DIRS.claudeCode.skills)
      return true
    if (path === CONFIG_DIRS.claudeCode.hooks)
      return true
    if (path === CONFIG_DIRS.codex.workflows)
      return true
    if (path === CONFIG_DIRS.codex.prompts)
      return true

    // Custom files
    if (path.includes('custom-file.txt'))
      return true
    if (path.includes('custom-dir'))
      return true

    // Non-existent
    if (path.includes('non-existent'))
      return false

    return false
  }),

  isFile: vi.fn((path: string) => {
    // Custom directory test
    if (path.includes('custom-dir') && !path.includes('.txt'))
      return false

    // Specific files
    if (path.includes('.md') || path.includes('.sh') || path.includes('.txt'))
      return true

    // Configuration files
    if (path.includes('settings.json'))
      return true
    if (path.includes('config.toml'))
      return true
    if (path.includes('auth.json'))
      return true
    if (path.includes('mcp-settings.json'))
      return true
    if (path.includes('mcp.json'))
      return true
    if (path.includes('CLAUDE.md'))
      return true
    if (path.includes('AGENTS.md'))
      return true
    if (path.includes('zcf-config.toml'))
      return true

    // Directories
    if (path === CONFIG_DIRS.claudeCode.workflows)
      return false
    if (path === CONFIG_DIRS.claudeCode.skills)
      return false
    if (path === CONFIG_DIRS.claudeCode.hooks)
      return false
    if (path === CONFIG_DIRS.codex.workflows)
      return false
    if (path === CONFIG_DIRS.codex.prompts)
      return false

    // 'zcf' directory
    if (path.includes('zcf') && !path.includes('.'))
      return false

    return false
  }),

  isDirectory: vi.fn((path: string) => {
    // Directory paths
    if (path === CONFIG_DIRS.claudeCode.workflows)
      return true
    if (path === CONFIG_DIRS.claudeCode.skills)
      return true
    if (path === CONFIG_DIRS.claudeCode.hooks)
      return true
    if (path === CONFIG_DIRS.codex.workflows)
      return true
    if (path === CONFIG_DIRS.codex.prompts)
      return true

    // Custom directory
    if (path.includes('custom-dir') && !path.includes('.txt'))
      return true

    // 'zcf' workflow directory
    if (path.includes('zcf') && !path.includes('.'))
      return true

    return false
  }),

  readDir: vi.fn((dirPath: string) => {
    if (dirPath === CONFIG_DIRS.claudeCode.workflows || dirPath === CONFIG_DIRS.codex.workflows) {
      return ['user-workflow.md', 'zcf', 'custom-agent.md']
    }
    if (dirPath === CONFIG_DIRS.claudeCode.skills) {
      return ['skill1.md', 'skill2.md']
    }
    if (dirPath === CONFIG_DIRS.claudeCode.hooks) {
      return ['hook1.sh', 'hook2.sh']
    }
    if (dirPath === CONFIG_DIRS.codex.prompts) {
      return ['prompt1.md', 'prompt2.md']
    }
    if (dirPath.includes('custom-dir')) {
      return ['file1.txt', 'file2.txt']
    }
    if (dirPath.includes('zcf')) {
      return [] // ZCF directory is empty for filtering test
    }
    return []
  }),
}))

// Mock core module
vi.mock('../../../../src/utils/export-import/core', () => ({
  getFileInfo: vi.fn((filePath: string, relativePath: string, type: string) => ({
    path: relativePath,
    type,
    size: 1024,
    checksum: 'mock-checksum-12345',
    originalPath: filePath,
  })),
}))

describe('export-import/collector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('collectClaudeCodeConfig', () => {
    it('should collect all settings for "all" scope', () => {
      const files = collectClaudeCodeConfig('all')

      expect(files.length).toBeGreaterThan(0)
      expect(files.some(f => f.path.includes('settings.json'))).toBe(true)
      expect(files.some(f => f.path.includes('zcf-config.toml'))).toBe(true)
      expect(files.some(f => f.path.includes('CLAUDE.md'))).toBe(true)
    })

    it('should collect only settings for "settings" scope', () => {
      const files = collectClaudeCodeConfig('settings')

      expect(files.length).toBeGreaterThan(0)
      expect(files.some(f => f.path.includes('settings.json'))).toBe(true)
      expect(files.some(f => f.type === 'workflows')).toBe(false)
    })

    it('should collect workflows for "workflows" scope', () => {
      const files = collectClaudeCodeConfig('workflows')

      expect(files.some(f => f.type === 'workflows')).toBe(true)
      expect(files.some(f => f.type === 'settings')).toBe(false)
    })

    it('should exclude ZCF standard workflows', () => {
      const files = collectClaudeCodeConfig('all')

      const workflows = files.filter(f => f.type === 'workflows')
      expect(workflows.some(f => f.path.includes('zcf/'))).toBe(false)
    })

    it('should collect skills and hooks for "all" scope', () => {
      const files = collectClaudeCodeConfig('all')

      expect(files.some(f => f.type === 'skills')).toBe(true)
      expect(files.some(f => f.type === 'hooks')).toBe(true)
    })

    it('should not collect skills/hooks for "workflows" scope', () => {
      const files = collectClaudeCodeConfig('workflows')

      expect(files.some(f => f.type === 'skills')).toBe(false)
      expect(files.some(f => f.type === 'hooks')).toBe(false)
    })
  })

  describe('collectCodexConfig', () => {
    it('should collect all settings for "all" scope', () => {
      const files = collectCodexConfig('all')

      expect(files.length).toBeGreaterThan(0)
      expect(files.some(f => f.path.includes('config.toml'))).toBe(true)
      expect(files.some(f => f.path.includes('auth.json'))).toBe(true)
      expect(files.some(f => f.path.includes('AGENTS.md'))).toBe(true)
    })

    it('should collect only settings for "settings" scope', () => {
      const files = collectCodexConfig('settings')

      expect(files.some(f => f.path.includes('config.toml'))).toBe(true)
      expect(files.some(f => f.type === 'workflows')).toBe(false)
    })

    it('should collect workflows for "workflows" scope', () => {
      const files = collectCodexConfig('workflows')

      expect(files.some(f => f.type === 'workflows')).toBe(true)
      expect(files.some(f => f.type === 'settings')).toBe(false)
    })

    it('should collect prompts for "all" scope', () => {
      const files = collectCodexConfig('all')

      expect(files.some(f => f.type === 'workflows' && f.path.includes('prompts'))).toBe(true)
    })
  })

  describe('collectWorkflows', () => {
    it('should collect Claude Code workflows', () => {
      const files = collectWorkflows('claude-code')

      expect(files.length).toBeGreaterThan(0)
      expect(files.every(f => f.type === 'workflows')).toBe(true)
      expect(files.some(f => f.path.includes('user-workflow.md'))).toBe(true)
      expect(files.some(f => f.path.includes('custom-agent.md'))).toBe(true)
    })

    it('should collect Codex workflows', () => {
      const files = collectWorkflows('codex')

      expect(files.length).toBeGreaterThan(0)
      expect(files.every(f => f.type === 'workflows')).toBe(true)
    })

    it('should exclude ZCF standard workflows', () => {
      const files = collectWorkflows('claude-code')

      expect(files.some(f => f.path.includes('zcf/'))).toBe(false)
      expect(files.some(f => f.path === 'workflows/claude-code/zcf')).toBe(false)
    })
  })

  describe('collectSkills', () => {
    it('should collect skill files', () => {
      const files = collectSkills('claude-code')

      expect(files.length).toBeGreaterThan(0)
      expect(files.every(f => f.type === 'skills')).toBe(true)
      expect(files.some(f => f.path.includes('skill1.md'))).toBe(true)
      expect(files.some(f => f.path.includes('skill2.md'))).toBe(true)
    })
  })

  describe('collectHooks', () => {
    it('should collect hook files', () => {
      const files = collectHooks('claude-code')

      expect(files.length).toBeGreaterThan(0)
      expect(files.every(f => f.type === 'hooks')).toBe(true)
      expect(files.some(f => f.path.includes('hook1.sh'))).toBe(true)
      expect(files.some(f => f.path.includes('hook2.sh'))).toBe(true)
    })
  })

  describe('collectPrompts', () => {
    it('should collect prompt files', () => {
      const files = collectPrompts()

      expect(files.length).toBeGreaterThan(0)
      expect(files.every(f => f.type === 'workflows')).toBe(true)
      expect(files.some(f => f.path.includes('prompt1.md'))).toBe(true)
      expect(files.some(f => f.path.includes('prompt2.md'))).toBe(true)
    })
  })

  describe('collectMcpConfig', () => {
    it('should collect Claude Code MCP config for "claude-code" type', () => {
      const files = collectMcpConfig('claude-code')

      expect(files.length).toBeGreaterThan(0)
      expect(files.some(f => f.path.includes('mcp-settings.json'))).toBe(true)
    })

    it('should collect Codex MCP config for "codex" type', () => {
      const files = collectMcpConfig('codex')

      expect(files.length).toBeGreaterThan(0)
      expect(files.some(f => f.path.includes('mcp.json'))).toBe(true)
    })

    it('should collect both MCP configs for "all" type', () => {
      const files = collectMcpConfig('all')

      expect(files.some(f => f.path.includes('mcp-settings.json'))).toBe(true)
      expect(files.some(f => f.path.includes('mcp.json'))).toBe(true)
    })
  })

  describe('collectAllConfig', () => {
    it('should collect Claude Code and MCP config for "claude-code" type', () => {
      const files = collectAllConfig('claude-code', 'all')

      expect(files.length).toBeGreaterThan(0)
      expect(files.some(f => f.path.includes('configs/claude-code'))).toBe(true)
    })

    it('should collect Codex and MCP config for "codex" type', () => {
      const files = collectAllConfig('codex', 'all')

      expect(files.length).toBeGreaterThan(0)
      expect(files.some(f => f.path.includes('configs/codex'))).toBe(true)
    })

    it('should collect all config types for "all" type', () => {
      const files = collectAllConfig('all', 'all')

      expect(files.length).toBeGreaterThan(0)
      expect(files.some(f => f.path.includes('configs/claude-code'))).toBe(true)
      expect(files.some(f => f.path.includes('configs/codex'))).toBe(true)
    })

    it('should collect only MCP files for "mcp" scope', () => {
      const files = collectAllConfig('all', 'mcp')

      expect(files.length).toBeGreaterThan(0)
      expect(files.every(f => f.type === 'mcp')).toBe(true)
    })

    it('should respect scope parameter for settings', () => {
      const filesSettings = collectAllConfig('claude-code', 'settings')

      expect(filesSettings.length).toBeGreaterThan(0)
      expect(filesSettings.some(f => f.type === 'settings' || f.type === 'profiles')).toBe(true)
    })

    it('should respect scope parameter for workflows', () => {
      const filesWorkflows = collectAllConfig('claude-code', 'workflows')

      expect(filesWorkflows.length).toBeGreaterThan(0)
      expect(filesWorkflows.every(f => f.type === 'workflows')).toBe(true)
    })
  })

  describe('collectCustomFiles', () => {
    it('should collect single file', () => {
      const items: ExportItem[] = [
        {
          type: 'settings',
          path: 'custom-file.txt',
          name: 'custom.txt',
        },
      ]

      const files = collectCustomFiles(items)

      expect(files.length).toBe(1)
      expect(files[0].path).toBe('custom.txt')
      expect(files[0].type).toBe('settings')
    })

    it('should collect directory recursively', () => {
      const items: ExportItem[] = [
        {
          type: 'workflows',
          path: 'custom-dir',
          name: 'custom',
        },
      ]

      const files = collectCustomFiles(items)

      expect(files.length).toBeGreaterThan(1)
      expect(files.every(f => f.type === 'workflows')).toBe(true)
    })

    it('should skip non-existent files', () => {
      const items: ExportItem[] = [
        {
          type: 'settings',
          path: 'non-existent-file.txt',
        },
      ]

      const files = collectCustomFiles(items)

      expect(files).toHaveLength(0)
    })

    it('should use path as name if name is not provided', () => {
      const items: ExportItem[] = [
        {
          type: 'settings',
          path: 'custom-file.txt',
        },
      ]

      const files = collectCustomFiles(items)

      expect(files[0].path).toBe('custom-file.txt')
    })

    it('should collect multiple items', () => {
      const items: ExportItem[] = [
        { type: 'settings', path: 'custom-file.txt', name: 'file1.txt' },
        { type: 'workflows', path: 'custom-dir', name: 'dir1' },
      ]

      const files = collectCustomFiles(items)

      expect(files.length).toBeGreaterThan(2)
      expect(files.some(f => f.path === 'file1.txt')).toBe(true)
      expect(files.some(f => f.path.includes('dir1'))).toBe(true)
    })
  })

  describe('getCollectionSummary', () => {
    it('should count total files', () => {
      const files = collectAllConfig('all', 'all')
      const summary = getCollectionSummary(files)

      expect(summary.total).toBe(files.length)
      expect(summary.total).toBeGreaterThan(0)
    })

    it('should group files by type', () => {
      const files = collectAllConfig('all', 'all')
      const summary = getCollectionSummary(files)

      expect(summary.byType.settings).toBeGreaterThan(0)
      expect(summary.byType.workflows).toBeGreaterThan(0)
      expect(summary.byType.mcp).toBeGreaterThan(0)
    })

    it('should detect "all" code type when both present', () => {
      const files = collectAllConfig('all', 'all')
      const summary = getCollectionSummary(files)

      expect(summary.codeTypes).toContain('all')
      expect(summary.codeTypes.length).toBe(1)
    })

    it('should detect "claude-code" type', () => {
      const files = collectAllConfig('claude-code', 'all')
      const summary = getCollectionSummary(files)

      expect(summary.codeTypes).toContain('claude-code')
      expect(summary.codeTypes).not.toContain('codex')
      expect(summary.codeTypes).not.toContain('all')
    })

    it('should detect "codex" type', () => {
      const files = collectAllConfig('codex', 'all')
      const summary = getCollectionSummary(files)

      expect(summary.codeTypes).toContain('codex')
      expect(summary.codeTypes).not.toContain('claude-code')
      expect(summary.codeTypes).not.toContain('all')
    })

    it('should handle empty file list', () => {
      const summary = getCollectionSummary([])

      expect(summary.total).toBe(0)
      expect(summary.codeTypes).toHaveLength(0)
    })

    it('should initialize all type counters', () => {
      const summary = getCollectionSummary([])

      expect(summary.byType.settings).toBe(0)
      expect(summary.byType.profiles).toBe(0)
      expect(summary.byType.workflows).toBe(0)
      expect(summary.byType.agents).toBe(0)
      expect(summary.byType.mcp).toBe(0)
      expect(summary.byType.hooks).toBe(0)
      expect(summary.byType.skills).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('should handle ZCF workflow in subdir', () => {
      const files = collectWorkflows('claude-code')

      // Should exclude 'zcf' directory entirely
      expect(files.some(f => f.path.includes('zcf/'))).toBe(false)
      expect(files.some(f => f.path.endsWith('/zcf'))).toBe(false)
    })

    it('should include non-ZCF workflows', () => {
      const files = collectWorkflows('claude-code')

      expect(files.some(f => f.path.includes('user-workflow.md'))).toBe(true)
      expect(files.some(f => f.path.includes('custom-agent.md'))).toBe(true)
    })
  })
})
