import type { UninstallItem } from '../../src/utils/uninstaller'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ZcfUninstaller } from '../../src/utils/uninstaller'

// Mock dependencies - more comprehensive edge case mocking
vi.mock('node:fs')
vi.mock('fs-extra')
vi.mock('tinyexec')
vi.mock('pathe')
vi.mock('node:os')
vi.mock('../../src/utils/json-config')
vi.mock('../../src/i18n')
vi.mock('../../src/utils/trash')
vi.mock('../../src/utils/installer', () => ({
  uninstallCodeTool: vi.fn(),
}))

// Enhanced mock modules with edge case behaviors
const mockFsExtra = vi.hoisted(() => ({
  pathExists: vi.fn(),
}))

const mockJsonConfig = vi.hoisted(() => ({
  readJsonConfig: vi.fn(),
  writeJsonConfig: vi.fn(),
}))

const mockExec = vi.hoisted(() => ({
  exec: vi.fn(),
}))

const mockOs = vi.hoisted(() => ({
  homedir: vi.fn().mockReturnValue('/home/user'),
}))

const mockI18n = vi.hoisted(() => ({
  i18n: {
    t: vi.fn((key: string) => {
      const parts = key.split(':')
      return parts[parts.length - 1]
    }),
    init: vi.fn(),
    loadResources: vi.fn(),
    use: vi.fn(),
    modules: {},
    language: 'en',
    languages: ['en', 'zh-CN'],
    options: {},
    isInitialized: true,
  } as any,
}))

const mockTrash = vi.hoisted(() => ({
  moveToTrash: vi.fn(),
}))

vi.mocked(await import('fs-extra')).pathExists = mockFsExtra.pathExists
vi.mocked(await import('../../src/utils/json-config')).readJsonConfig = mockJsonConfig.readJsonConfig
vi.mocked(await import('../../src/utils/json-config')).writeJsonConfig = mockJsonConfig.writeJsonConfig
vi.mocked(await import('tinyexec')).exec = mockExec.exec
vi.mocked(await import('node:os')).homedir = mockOs.homedir
vi.mocked(await import('pathe')).join = vi.fn().mockImplementation((...parts) => parts.join('/'))
vi.mocked(await import('../../src/i18n')).i18n = mockI18n.i18n
vi.mocked(await import('../../src/utils/trash')).moveToTrash = mockTrash.moveToTrash
const installerModule = await import('../../src/utils/installer')
const mockUninstallCodeTool = vi.mocked(installerModule.uninstallCodeTool)

// Mock constants
vi.mock('../../src/constants', () => ({
  ZCF_CONFIG_FILE: '/home/user/.ufomiao/zcf/config.json',
  ZCF_CONFIG_DIR: '/home/user/.ufomiao/zcf',
  CLAUDE_DIR: '/home/user/.claude',
  SETTINGS_FILE: '/home/user/.claude/settings.json',
  ClAUDE_CONFIG_FILE: '/home/user/.claude.json',
  CLAUDE_MD_FILE: '/home/user/.claude/CLAUDE.md',
}))

describe('zcfUninstaller - Edge Cases', () => {
  let uninstaller: ZcfUninstaller

  beforeEach(() => {
    uninstaller = new ZcfUninstaller()
    vi.clearAllMocks()
    // Reset all mocks to default resolved states
    mockFsExtra.pathExists.mockResolvedValue(false)
    mockTrash.moveToTrash.mockResolvedValue([{ success: true }])
    mockJsonConfig.readJsonConfig.mockReturnValue({})
    mockJsonConfig.writeJsonConfig.mockReturnValue(undefined)
    mockExec.exec.mockResolvedValue({ stdout: '', stderr: '' })
    mockUninstallCodeTool.mockReset()
  })

  describe('constructor edge cases', () => {
    it('should initialize with Chinese language', () => {
      const chineseUninstaller = new ZcfUninstaller('zh-CN')
      expect(chineseUninstaller).toBeInstanceOf(ZcfUninstaller)
    })

    it('should handle conflict resolution setup correctly', () => {
      // Test private conflictResolution map functionality indirectly
      expect(uninstaller).toBeInstanceOf(ZcfUninstaller)
    })
  })

  describe('removeOutputStyles edge cases', () => {
    it('should handle null/undefined settings gracefully', async () => {
      mockFsExtra.pathExists
        .mockResolvedValueOnce(true) // settings.json exists
        .mockResolvedValueOnce(true) // output-styles directory exists
      mockJsonConfig.readJsonConfig.mockReturnValue(null)
      mockTrash.moveToTrash.mockResolvedValue([{ success: true }])

      const result = await uninstaller.removeOutputStyles()

      expect(result.success).toBe(true)
      expect(result.warnings).toHaveLength(0)
      expect(result.removed).toContain('~/.claude/output-styles/')
    })

    it('should handle empty settings object', async () => {
      mockFsExtra.pathExists
        .mockResolvedValueOnce(true) // settings.json exists
        .mockResolvedValueOnce(true) // output-styles directory exists
      mockJsonConfig.readJsonConfig.mockReturnValue({})
      mockTrash.moveToTrash.mockResolvedValue([{ success: true }])

      const result = await uninstaller.removeOutputStyles()

      expect(result.success).toBe(true)
      expect(result.warnings).toHaveLength(0)
      expect(result.removed).toContain('~/.claude/output-styles/')
    })

    it('should handle writeJsonConfig errors', async () => {
      const settingsWithOutputStyle = { outputStyle: 'test', other: 'value' }
      mockFsExtra.pathExists.mockResolvedValue(true)
      mockJsonConfig.readJsonConfig.mockReturnValue(settingsWithOutputStyle)
      mockJsonConfig.writeJsonConfig.mockImplementation(() => {
        throw new Error('Write permission denied')
      })

      const result = await uninstaller.removeOutputStyles()

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Failed to remove output styles: Write permission denied')
    })

    it('should handle trash operation failure', async () => {
      mockFsExtra.pathExists
        .mockResolvedValueOnce(true) // settings.json exists
        .mockResolvedValueOnce(true) // output-styles directory exists

      mockJsonConfig.readJsonConfig.mockReturnValue({ outputStyle: 'test' })
      mockJsonConfig.writeJsonConfig.mockImplementation(() => {})
      mockTrash.moveToTrash.mockResolvedValue([{ success: false, error: 'Trash operation failed' }])

      const result = await uninstaller.removeOutputStyles()

      expect(result.success).toBe(true)
      expect(result.removedConfigs).toContain('outputStyle field from settings.json')
      expect(result.removed).toContain('~/.claude/output-styles/')
      expect(result.warnings).toContain('Trash operation failed')
    })

    it('should handle pathExists rejection', async () => {
      mockFsExtra.pathExists.mockRejectedValue(new Error('Permission denied'))

      const result = await uninstaller.removeOutputStyles()

      expect(result.success).toBe(false)
      expect(result.errors[0]).toContain('Permission denied')
    })
  })

  describe('removeCustomCommands edge cases', () => {
    it('should handle trash failure with fallback error message', async () => {
      mockFsExtra.pathExists.mockResolvedValue(true)
      mockTrash.moveToTrash.mockResolvedValue([{ success: false }]) // No error message

      const result = await uninstaller.removeCustomCommands()

      expect(result.success).toBe(true)
      expect(result.warnings).toContain('Failed to move to trash')
    })

    it('should handle unexpected errors during removal', async () => {
      mockFsExtra.pathExists.mockImplementation(() => {
        throw new Error('Unexpected file system error')
      })

      const result = await uninstaller.removeCustomCommands()

      expect(result.success).toBe(false)
      expect(result.errors[0]).toContain('Unexpected file system error')
    })
  })

  describe('removeCustomAgents edge cases', () => {
    it('should handle async errors correctly', async () => {
      mockFsExtra.pathExists.mockRejectedValue(new Error('Async pathExists error'))

      const result = await uninstaller.removeCustomAgents()

      expect(result.success).toBe(false)
      expect(result.errors[0]).toContain('Async pathExists error')
    })
  })

  describe('removeClaudeMd edge cases', () => {
    it('should handle multiple failure scenarios', async () => {
      mockFsExtra.pathExists.mockResolvedValue(true)
      mockTrash.moveToTrash.mockResolvedValue([{ success: false, error: 'CLAUDE.md is in use' }])

      const result = await uninstaller.removeClaudeMd()

      expect(result.success).toBe(true)
      expect(result.warnings).toContain('CLAUDE.md is in use')
    })
  })

  describe('removePermissionsAndEnvs edge cases', () => {
    it('should handle partial removal scenarios', async () => {
      const settingsWithPermissionsOnly = { permissions: {}, otherConfig: 'value' }
      mockFsExtra.pathExists.mockResolvedValue(true)
      mockJsonConfig.readJsonConfig.mockReturnValue(settingsWithPermissionsOnly)
      mockJsonConfig.writeJsonConfig.mockImplementation(() => {})

      const result = await uninstaller.removePermissionsAndEnvs()

      expect(result.success).toBe(true)
      expect(result.removedConfigs).toContain('permissions configuration')
      expect(result.removedConfigs).not.toContain('environment variables')
    })

    it('should handle partial removal with env only', async () => {
      const settingsWithEnvOnly = { env: {}, otherConfig: 'value' }
      mockFsExtra.pathExists.mockResolvedValue(true)
      mockJsonConfig.readJsonConfig.mockReturnValue(settingsWithEnvOnly)
      mockJsonConfig.writeJsonConfig.mockImplementation(() => {})

      const result = await uninstaller.removePermissionsAndEnvs()

      expect(result.success).toBe(true)
      expect(result.removedConfigs).toContain('environment variables')
      expect(result.removedConfigs).not.toContain('permissions configuration')
    })

    it('should handle writeJsonConfig failure', async () => {
      const settingsWithBoth = { permissions: {}, env: {} }
      mockFsExtra.pathExists.mockResolvedValue(true)
      mockJsonConfig.readJsonConfig.mockReturnValue(settingsWithBoth)
      mockJsonConfig.writeJsonConfig.mockImplementation(() => {
        throw new Error('Config write failed')
      })

      const result = await uninstaller.removePermissionsAndEnvs()

      expect(result.success).toBe(false)
      expect(result.errors[0]).toContain('Config write failed')
    })
  })

  describe('removeMcps edge cases', () => {
    it('should handle empty mcpServers object', async () => {
      const configWithEmptyMcpServers = { mcpServers: {}, otherConfig: 'value' }
      mockFsExtra.pathExists.mockResolvedValue(true)
      mockJsonConfig.readJsonConfig.mockReturnValue(configWithEmptyMcpServers)
      mockJsonConfig.writeJsonConfig.mockImplementation(() => {})

      const result = await uninstaller.removeMcps()

      expect(result.success).toBe(true)
      expect(result.removedConfigs).toContain('mcpServers from .claude.json')
    })

    it('should handle corrupted .claude.json file', async () => {
      mockFsExtra.pathExists.mockResolvedValue(true)
      mockJsonConfig.readJsonConfig.mockImplementation(() => {
        throw new Error('JSON parsing failed')
      })

      const result = await uninstaller.removeMcps()

      expect(result.success).toBe(false)
      expect(result.errors[0]).toContain('JSON parsing failed')
    })
  })

  describe('uninstallCcr edge cases', () => {
    it('should handle CCR directory not existing but npm package existing', async () => {
      mockFsExtra.pathExists.mockResolvedValue(false)
      mockExec.exec.mockResolvedValue({ stdout: 'uninstalled', stderr: '' })

      const result = await uninstaller.uninstallCcr()

      expect(result.success).toBe(true)
      expect(result.removed).not.toContain('.claude-code-router/')
      expect(result.removed).toContain('@musistudio/claude-code-router package')
    })

    it('should handle different npm error messages', async () => {
      mockFsExtra.pathExists.mockResolvedValue(true)
      mockTrash.moveToTrash.mockResolvedValue([{ success: true }])
      mockExec.exec.mockRejectedValue(new Error('ENOENT: not installed'))

      const result = await uninstaller.uninstallCcr()

      expect(result.success).toBe(true)
      expect(result.warnings).toContain('ccrPackageNotFound')
    })

    it('should handle npm timeout errors', async () => {
      mockFsExtra.pathExists.mockResolvedValue(true)
      mockTrash.moveToTrash.mockResolvedValue([{ success: true }])
      mockExec.exec.mockRejectedValue(new Error('npm ERR! timeout'))

      const result = await uninstaller.uninstallCcr()

      expect(result.success).toBe(false)
      expect(result.errors[0]).toContain('npm ERR! timeout')
    })

    it('should handle general uninstall failures', async () => {
      mockFsExtra.pathExists.mockImplementation(() => {
        throw new Error('General CCR uninstall failure')
      })

      const result = await uninstaller.uninstallCcr()

      expect(result.success).toBe(false)
      expect(result.errors[0]).toContain('General CCR uninstall failure')
    })
  })

  describe('uninstallCcline edge cases', () => {
    it('should handle ccline not installed error variations', async () => {
      mockExec.exec.mockRejectedValue(new Error('Package not installed globally'))

      const result = await uninstaller.uninstallCcline()

      expect(result.success).toBe(true)
      expect(result.warnings).toContain('cclinePackageNotFound')
    })

    it('should handle npm permission errors', async () => {
      mockExec.exec.mockRejectedValue(new Error('EACCES: permission denied'))

      const result = await uninstaller.uninstallCcline()

      expect(result.success).toBe(false)
      expect(result.errors[0]).toContain('EACCES: permission denied')
    })
  })

  describe('uninstallClaudeCode edge cases', () => {
    it('should handle .claude.json not existing but package existing', async () => {
      mockFsExtra.pathExists.mockResolvedValue(false)
      mockUninstallCodeTool.mockResolvedValue(true)

      const result = await uninstaller.uninstallClaudeCode()

      expect(result.success).toBe(true)
      expect(result.removed).not.toContain('.claude.json (includes MCP configuration)')
      expect(result.removed).toContain('@anthropic-ai/claude-code')
    })

    it('should handle npm network errors', async () => {
      mockFsExtra.pathExists.mockResolvedValue(true)
      mockTrash.moveToTrash.mockResolvedValue([{ success: true }])
      mockUninstallCodeTool.mockRejectedValue(new Error('network error'))

      const result = await uninstaller.uninstallClaudeCode()

      expect(result.success).toBe(false)
      expect(result.errors[0]).toBe('uninstallFailed')
    })
  })

  describe('removeBackups edge cases', () => {
    it('should handle backup directory permission issues', async () => {
      mockFsExtra.pathExists.mockResolvedValue(true)
      mockTrash.moveToTrash.mockResolvedValue([{ success: false, error: 'Permission denied for backup/' }])

      const result = await uninstaller.removeBackups()

      expect(result.success).toBe(true)
      expect(result.warnings).toContain('Permission denied for backup/')
    })

    it('should handle pathExists throwing unexpected errors', async () => {
      mockFsExtra.pathExists.mockRejectedValue(new Error('Backup check failed'))

      const result = await uninstaller.removeBackups()

      expect(result.success).toBe(false)
      expect(result.errors[0]).toContain('Backup check failed')
    })
  })

  describe('removeZcfConfig edge cases', () => {
    it('should handle zcf config file access issues', async () => {
      mockFsExtra.pathExists.mockResolvedValue(true)
      mockTrash.moveToTrash.mockResolvedValue([{ success: false, error: 'File is locked' }])

      const result = await uninstaller.removeZcfConfig()

      expect(result.success).toBe(true)
      expect(result.warnings).toContain('File is locked')
    })
  })

  describe('completeUninstall edge cases', () => {
    it('should handle mixed success/failure scenarios', async () => {
      mockFsExtra.pathExists.mockResolvedValue(true)
      mockTrash.moveToTrash
        .mockResolvedValueOnce([{ success: true }]) // .claude success
        .mockResolvedValueOnce([{ success: false, error: '.claude.json locked' }]) // .claude.json fail
        .mockResolvedValueOnce([{ success: true }]) // .claude-code-router success

      mockExec.exec
        .mockResolvedValueOnce({ stdout: 'ccr uninstalled', stderr: '' }) // CCR success
        .mockRejectedValueOnce(new Error('ccline not found')) // CCline fail
        .mockResolvedValueOnce({ stdout: 'claude-code uninstalled', stderr: '' }) // Claude Code success

      const result = await uninstaller.completeUninstall()

      expect(result.success).toBe(true)
      expect(result.removed).toContain('~/.claude/')
      expect(result.removed).toContain('~/.claude-code-router/')
      expect(result.warnings).toContain('Failed to move ~/.claude.json to trash: .claude.json locked')
      expect(result.warnings).toContain('cclinePackageNotFound')
      expect(result.removed).toContain('@anthropic-ai/claude-code package')
    })

    it('should handle pathExists failure during directory checks', async () => {
      mockFsExtra.pathExists.mockImplementation((path) => {
        if (path.includes('.claude-code-router')) {
          throw new Error('Path check failed')
        }
        return Promise.resolve(true)
      })

      mockTrash.moveToTrash.mockResolvedValue([{ success: true }])
      mockExec.exec.mockResolvedValue({ stdout: 'uninstalled', stderr: '' })

      const result = await uninstaller.completeUninstall()

      expect(result.success).toBe(true)
      expect(result.warnings).toContain('Failed to remove ~/.claude-code-router/: Path check failed')
    })

    it('should handle complete failure scenario', async () => {
      // Make homedir fail to trigger outer catch block
      mockOs.homedir.mockImplementation(() => {
        throw new Error('Complete filesystem failure')
      })

      const result = await uninstaller.completeUninstall()

      expect(result.success).toBe(false)
      expect(result.errors[0]).toContain('Complete filesystem failure')
    })

    it('should handle npm package identification errors', async () => {
      // Reset homedir mock for this test
      mockOs.homedir.mockReturnValue('/home/user')
      mockFsExtra.pathExists.mockResolvedValue(false)
      mockExec.exec.mockImplementation((_cmd, args) => {
        const pkg = args[2]
        if (pkg.includes('claude-code-router')) {
          return Promise.reject(new Error('not found'))
        }
        if (pkg.includes('ccline')) {
          return Promise.reject(new Error('not installed'))
        }
        if (pkg.includes('claude-code')) {
          return Promise.reject(new Error('not found'))
        }
        return Promise.resolve({ stdout: 'uninstalled', stderr: '' })
      })

      const result = await uninstaller.completeUninstall()

      expect(result.success).toBe(true)
      expect(result.warnings).toContain('ccrPackageNotFound')
      expect(result.warnings).toContain('cclinePackageNotFound')
      expect(result.warnings).toContain('claudeCodePackageNotFound')
    })
  })

  describe('customUninstall edge cases', () => {
    it('should handle execution errors gracefully', async () => {
      const items: UninstallItem[] = ['invalid-item' as UninstallItem]

      const results = await uninstaller.customUninstall(items)

      expect(results).toHaveLength(1)
      expect(results[0].success).toBe(false)
      expect(results[0].errors[0]).toContain('Unknown uninstall item: invalid-item')
    })

    it('should handle method execution throwing errors', async () => {
      const items: UninstallItem[] = ['output-styles']

      // Mock removeOutputStyles to throw an error
      vi.spyOn(uninstaller, 'removeOutputStyles').mockRejectedValue(new Error('Method execution failed'))

      const results = await uninstaller.customUninstall(items)

      expect(results).toHaveLength(1)
      expect(results[0].success).toBe(false)
      expect(results[0].errors[0]).toContain('Method execution failed')
    })

    it('should handle complex conflict resolution scenarios', async () => {
      const items: UninstallItem[] = ['claude-code', 'mcps', 'ccr', 'commands', 'agents']

      const mockUninstallClaudeCode = vi.spyOn(uninstaller, 'uninstallClaudeCode')
        .mockResolvedValue({ success: true, removed: [], removedConfigs: [], errors: [], warnings: [] })
      const mockUninstallCcr = vi.spyOn(uninstaller, 'uninstallCcr')
        .mockResolvedValue({ success: true, removed: [], removedConfigs: [], errors: [], warnings: [] })
      const mockRemoveCommands = vi.spyOn(uninstaller, 'removeCustomCommands')
        .mockResolvedValue({ success: true, removed: [], removedConfigs: [], errors: [], warnings: [] })
      const mockRemoveAgents = vi.spyOn(uninstaller, 'removeCustomAgents')
        .mockResolvedValue({ success: true, removed: [], removedConfigs: [], errors: [], warnings: [] })
      const mockRemoveMcps = vi.spyOn(uninstaller, 'removeMcps')
        .mockResolvedValue({ success: true, removed: [], removedConfigs: [], errors: [], warnings: [] })

      const results = await uninstaller.customUninstall(items)

      // claude-code should be executed, mcps should be filtered out due to conflict
      expect(mockUninstallClaudeCode).toHaveBeenCalled()
      expect(mockUninstallCcr).toHaveBeenCalled()
      expect(mockRemoveCommands).toHaveBeenCalled()
      expect(mockRemoveAgents).toHaveBeenCalled()
      expect(mockRemoveMcps).not.toHaveBeenCalled() // Filtered out by conflict resolution

      expect(results).toHaveLength(4) // claude-code, ccr, commands, agents (mcps removed)
    })
  })

  describe('executeUninstallItem edge cases', () => {
    it('should handle all valid uninstall items without conflicts', async () => {
      const validItems: UninstallItem[] = [
        'output-styles',
        'commands',
        'agents',
        'claude-md',
        'permissions-envs',
        'mcps',
        'ccr',
        'ccline',
        'backups',
        'zcf-config',
      ]

      // Mock all methods to return success
      const mockMethods = [
        'removeOutputStyles',
        'removeCustomCommands',
        'removeCustomAgents',
        'removeClaudeMd',
        'removePermissionsAndEnvs',
        'removeMcps',
        'uninstallCcr',
        'uninstallCcline',
        'removeBackups',
        'removeZcfConfig',
      ]

      mockMethods.forEach((method) => {
        vi.spyOn(uninstaller, method as any).mockResolvedValue({
          success: true,
          removed: [],
          errors: [],
          warnings: [],
        })
      })

      const results = await uninstaller.customUninstall(validItems)

      expect(results).toHaveLength(validItems.length)
      results.forEach((result) => {
        expect(result.success).toBe(true)
      })
    })
  })

  describe('resolveConflicts edge cases', () => {
    it('should handle empty items array', async () => {
      const results = await uninstaller.customUninstall([])
      expect(results).toHaveLength(0)
    })

    it('should handle items without conflicts', async () => {
      const items: UninstallItem[] = ['commands', 'agents', 'backups']

      const mockRemoveCommands = vi.spyOn(uninstaller, 'removeCustomCommands')
        .mockResolvedValue({ success: true, removed: [], removedConfigs: [], errors: [], warnings: [] })
      const mockRemoveAgents = vi.spyOn(uninstaller, 'removeCustomAgents')
        .mockResolvedValue({ success: true, removed: [], removedConfigs: [], errors: [], warnings: [] })
      const mockRemoveBackups = vi.spyOn(uninstaller, 'removeBackups')
        .mockResolvedValue({ success: true, removed: [], removedConfigs: [], errors: [], warnings: [] })

      const results = await uninstaller.customUninstall(items)

      expect(mockRemoveCommands).toHaveBeenCalled()
      expect(mockRemoveAgents).toHaveBeenCalled()
      expect(mockRemoveBackups).toHaveBeenCalled()
      expect(results).toHaveLength(3)
    })
  })
})
