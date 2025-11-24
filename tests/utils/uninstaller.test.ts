import type { UninstallItem } from '../../src/utils/uninstaller'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ZcfUninstaller } from '../../src/utils/uninstaller'

// Mock dependencies
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

// Mock modules
const mockFs = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}))

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
      // Return just the last part of the key (after ':')
      const parts = key.split(':')
      return parts[parts.length - 1]
    }),
  } as any, // Type assertion to avoid TypeScript errors for missing i18n methods
}))

const mockTrash = vi.hoisted(() => ({
  moveToTrash: vi.fn().mockResolvedValue([{ success: true }]),
}))
const installerModule = await import('../../src/utils/installer')
const mockUninstallCodeTool = vi.mocked(installerModule.uninstallCodeTool)

vi.mocked(await import('node:fs')).existsSync = mockFs.existsSync
vi.mocked(await import('node:fs')).readFileSync = mockFs.readFileSync
vi.mocked(await import('node:fs')).writeFileSync = mockFs.writeFileSync
vi.mocked(await import('node:fs')).unlinkSync = mockFs.unlinkSync
vi.mocked(await import('fs-extra')).pathExists = mockFsExtra.pathExists
vi.mocked(await import('../../src/utils/json-config')).readJsonConfig = mockJsonConfig.readJsonConfig
vi.mocked(await import('../../src/utils/json-config')).writeJsonConfig = mockJsonConfig.writeJsonConfig
vi.mocked(await import('tinyexec')).exec = mockExec.exec
vi.mocked(await import('node:os')).homedir = mockOs.homedir
vi.mocked(await import('pathe')).join = vi.fn().mockImplementation((...parts) => parts.join('/'))
vi.mocked(await import('../../src/i18n')).i18n = mockI18n.i18n
vi.mocked(await import('../../src/utils/trash')).moveToTrash = mockTrash.moveToTrash

describe('zcfUninstaller', () => {
  let uninstaller: ZcfUninstaller

  beforeEach(() => {
    uninstaller = new ZcfUninstaller()
    vi.clearAllMocks()
    mockUninstallCodeTool.mockReset()
  })

  describe('removeOutputStyles', () => {
    it('should remove outputStyle field from settings.json', async () => {
      const settingsPath = '/home/user/.claude/settings.json'
      const mockSettings = {
        outputStyle: 'engineer-professional',
        otherSetting: 'value',
      }

      mockFsExtra.pathExists.mockResolvedValue(true)
      mockJsonConfig.readJsonConfig.mockReturnValue(mockSettings)
      mockJsonConfig.writeJsonConfig.mockReturnValue(undefined)

      const result = await uninstaller.removeOutputStyles()

      expect(mockJsonConfig.readJsonConfig).toHaveBeenCalledWith(settingsPath)
      expect(mockJsonConfig.writeJsonConfig).toHaveBeenCalledWith(settingsPath, {
        otherSetting: 'value',
      })
      expect(result.success).toBe(true)
      expect(result.removedConfigs).toContain('outputStyle field from settings.json')
    })

    it('should handle missing settings.json gracefully', async () => {
      mockFsExtra.pathExists.mockResolvedValue(false)

      const result = await uninstaller.removeOutputStyles()

      expect(result.success).toBe(true)
      expect(result.warnings).toContain('settingsJsonNotFound')
    })

    it('should handle settings.json without outputStyle field', async () => {
      const mockSettings = {
        otherSetting: 'value',
      }

      mockFsExtra.pathExists.mockResolvedValue(true)
      mockJsonConfig.readJsonConfig.mockReturnValue(mockSettings)

      const result = await uninstaller.removeOutputStyles()

      expect(result.success).toBe(true)
      expect(result.warnings).toHaveLength(0)
    })
  })

  describe('removeCustomCommands', () => {
    it('should remove commands/zcf/ directory', async () => {
      const commandsPath = '/home/user/.claude/commands/zcf'
      mockFsExtra.pathExists.mockResolvedValue(true)
      mockTrash.moveToTrash.mockResolvedValue([{ success: true, path: commandsPath }])

      const result = await uninstaller.removeCustomCommands()

      expect(mockTrash.moveToTrash).toHaveBeenCalledWith(commandsPath)
      expect(result.success).toBe(true)
      expect(result.removed).toContain('commands/zcf/')
    })

    it('should handle missing commands directory gracefully', async () => {
      mockFsExtra.pathExists.mockResolvedValue(false)

      const result = await uninstaller.removeCustomCommands()

      expect(result.success).toBe(true)
      expect(result.warnings).toContain('commandsNotFound')
    })
  })

  describe('removeCustomAgents', () => {
    it('should remove agents/zcf/ directory', async () => {
      const agentsPath = '/home/user/.claude/agents/zcf'
      mockFsExtra.pathExists.mockResolvedValue(true)
      mockTrash.moveToTrash.mockResolvedValue([{ success: true }])

      const result = await uninstaller.removeCustomAgents()

      expect(mockTrash.moveToTrash).toHaveBeenCalledWith(agentsPath)
      expect(result.success).toBe(true)
      expect(result.removed).toContain('agents/zcf/')
    })

    it('should warn when agents directory is missing', async () => {
      mockFsExtra.pathExists.mockResolvedValue(false)

      const result = await uninstaller.removeCustomAgents()

      expect(result.success).toBe(true)
      expect(result.warnings).toContain('agentsNotFound')
    })
  })

  describe('removeClaudeMd', () => {
    it('should remove CLAUDE.md file when present', async () => {
      const claudeMdPath = '/home/user/.claude/CLAUDE.md'
      mockFsExtra.pathExists.mockResolvedValue(true)
      mockTrash.moveToTrash.mockResolvedValue([{ success: true }])

      const result = await uninstaller.removeClaudeMd()

      expect(mockTrash.moveToTrash).toHaveBeenCalledWith(claudeMdPath)
      expect(result.success).toBe(true)
      expect(result.removed).toContain('CLAUDE.md')
    })

    it('should warn when CLAUDE.md file is missing', async () => {
      mockFsExtra.pathExists.mockResolvedValue(false)

      const result = await uninstaller.removeClaudeMd()

      expect(result.success).toBe(true)
      expect(result.warnings).toContain('claudeMdNotFound')
    })
  })

  describe('removeMcps', () => {
    it('should remove mcpServers field from .claude.json only', async () => {
      const claudeJsonPath = '/home/user/.claude.json'
      const mockConfig = {
        mcpServers: { server1: {}, server2: {} },
        otherConfig: 'value',
      }

      mockFsExtra.pathExists.mockResolvedValue(true)
      mockJsonConfig.readJsonConfig.mockReturnValue(mockConfig)
      mockJsonConfig.writeJsonConfig.mockReturnValue(undefined)

      const result = await uninstaller.removeMcps()

      expect(mockJsonConfig.readJsonConfig).toHaveBeenCalledWith(claudeJsonPath)
      expect(mockJsonConfig.writeJsonConfig).toHaveBeenCalledWith(claudeJsonPath, {
        otherConfig: 'value',
      })
      expect(result.success).toBe(true)
      expect(result.removedConfigs).toContain('mcpServers from .claude.json')
    })

    it('should handle missing .claude.json gracefully', async () => {
      mockFsExtra.pathExists.mockResolvedValue(false)

      const result = await uninstaller.removeMcps()

      expect(result.success).toBe(true)
      expect(result.warnings).toContain('claudeJsonNotFound')
    })
  })

  describe('uninstallClaudeCode', () => {
    it('should remove .claude.json completely and uninstall npm package', async () => {
      const claudeJsonPath = '/home/user/.claude.json'
      mockFsExtra.pathExists.mockResolvedValue(true)
      mockTrash.moveToTrash.mockResolvedValue([{ success: true }])
      mockUninstallCodeTool.mockResolvedValue(true)

      const result = await uninstaller.uninstallClaudeCode()

      expect(mockTrash.moveToTrash).toHaveBeenCalledWith(claudeJsonPath)
      expect(mockUninstallCodeTool).toHaveBeenCalledWith('claude-code')
      expect(result.success).toBe(true)
      expect(result.removed).toContain('.claude.json (includes MCP configuration)')
      expect(result.removed).toContain('@anthropic-ai/claude-code')
    })

    it('should handle npm uninstall failures gracefully', async () => {
      mockFsExtra.pathExists.mockResolvedValue(true)
      mockTrash.moveToTrash.mockResolvedValue([{ success: true }])
      mockUninstallCodeTool.mockRejectedValue(new Error('npm not found'))

      const result = await uninstaller.uninstallClaudeCode()

      expect(mockUninstallCodeTool).toHaveBeenCalledWith('claude-code')
      expect(result.success).toBe(true)
      expect(result.warnings).toContain('claudeCodePackageNotFound')
    })
  })

  describe('uninstallCcr', () => {
    it('should remove CCR directory and uninstall npm package', async () => {
      const ccrPath = '/home/user/.claude-code-router'
      mockFsExtra.pathExists.mockResolvedValue(true)
      mockTrash.moveToTrash.mockResolvedValue([{ success: true }])
      mockExec.exec.mockResolvedValue({ stdout: 'uninstalled', stderr: '' })

      const result = await uninstaller.uninstallCcr()

      expect(mockTrash.moveToTrash).toHaveBeenCalledWith(ccrPath)
      expect(mockExec.exec).toHaveBeenCalledWith('npm', ['uninstall', '-g', '@musistudio/claude-code-router'])
      expect(result.success).toBe(true)
    })
  })

  describe('uninstallCcline', () => {
    it('should uninstall ccline npm package', async () => {
      mockExec.exec.mockResolvedValue({ stdout: 'uninstalled', stderr: '' })

      const result = await uninstaller.uninstallCcline()

      expect(mockExec.exec).toHaveBeenCalledWith('npm', ['uninstall', '-g', '@cometix/ccline'])
      expect(result.success).toBe(true)
      expect(result.removed).toContain('@cometix/ccline package')
    })
  })

  describe('completeUninstall', () => {
    it('should remove all directories and uninstall all packages', async () => {
      mockTrash.moveToTrash.mockResolvedValue([{ success: true }])
      mockExec.exec.mockResolvedValue({ stdout: 'uninstalled', stderr: '' })

      const result = await uninstaller.completeUninstall()

      expect(mockTrash.moveToTrash).toHaveBeenCalledWith('/home/user/.claude')
      expect(mockTrash.moveToTrash).toHaveBeenCalledWith('/home/user/.claude.json')
      expect(mockTrash.moveToTrash).toHaveBeenCalledWith('/home/user/.claude-code-router')

      expect(mockExec.exec).toHaveBeenCalledWith('npm', ['uninstall', '-g', '@musistudio/claude-code-router'])
      expect(mockExec.exec).toHaveBeenCalledWith('npm', ['uninstall', '-g', '@cometix/ccline'])
      expect(mockExec.exec).toHaveBeenCalledWith('npm', ['uninstall', '-g', '@anthropic-ai/claude-code'])

      expect(result.success).toBe(true)
      expect(result.removed).toHaveLength(6) // 3 directories + 3 packages
    })

    it('should continue uninstalling even if some operations fail', async () => {
      mockTrash.moveToTrash.mockResolvedValue([{ success: true }])
      mockExec.exec
        .mockResolvedValueOnce({ stdout: 'uninstalled', stderr: '' }) // CCR success
        .mockRejectedValueOnce(new Error('ccline not found')) // CCLine failed
        .mockResolvedValueOnce({ stdout: 'uninstalled', stderr: '' }) // Claude Code success

      const result = await uninstaller.completeUninstall()

      expect(result.success).toBe(true)
      expect(result.removed).toContain('~/.claude-code-router/')
      expect(result.removed).toContain('@anthropic-ai/claude-code package')
      expect(result.warnings).toContain('cclinePackageNotFound')
    })
  })

  describe('customUninstall', () => {
    it('should resolve conflicts between claude-code and mcps', async () => {
      const items: UninstallItem[] = ['claude-code', 'mcps', 'commands']

      // Mock individual methods
      const mockUninstallClaudeCode = vi.spyOn(uninstaller, 'uninstallClaudeCode')
        .mockResolvedValue({ success: true, removed: [], removedConfigs: [], errors: [], warnings: [] })
      const mockRemoveCommands = vi.spyOn(uninstaller, 'removeCustomCommands')
        .mockResolvedValue({ success: true, removed: [], removedConfigs: [], errors: [], warnings: [] })
      const mockRemoveMcps = vi.spyOn(uninstaller, 'removeMcps')
        .mockResolvedValue({ success: true, removed: [], removedConfigs: [], errors: [], warnings: [] })

      const results = await uninstaller.customUninstall(items)

      // Should call uninstallClaudeCode and removeCommands, but NOT removeMcps (due to conflict resolution)
      expect(mockUninstallClaudeCode).toHaveBeenCalled()
      expect(mockRemoveCommands).toHaveBeenCalled()
      expect(mockRemoveMcps).not.toHaveBeenCalled()

      expect(results).toHaveLength(2) // Only claude-code and commands
    })

    it('should execute mcps removal when claude-code is not selected', async () => {
      const items: UninstallItem[] = ['mcps', 'commands']

      const mockRemoveMcps = vi.spyOn(uninstaller, 'removeMcps')
        .mockResolvedValue({ success: true, removed: [], removedConfigs: [], errors: [], warnings: [] })
      const mockRemoveCommands = vi.spyOn(uninstaller, 'removeCustomCommands')
        .mockResolvedValue({ success: true, removed: [], removedConfigs: [], errors: [], warnings: [] })

      const results = await uninstaller.customUninstall(items)

      expect(mockRemoveMcps).toHaveBeenCalled()
      expect(mockRemoveCommands).toHaveBeenCalled()
      expect(results).toHaveLength(2)
    })
  })

  describe('error handling', () => {
    it('should handle file system errors gracefully', async () => {
      mockFsExtra.pathExists.mockRejectedValue(new Error('Permission denied'))

      const result = await uninstaller.removeOutputStyles()

      expect(result.success).toBe(false)
      expect(result.errors?.[0]).toMatch(/Permission denied|Failed to remove output styles/)
    })

    it('should handle npm command failures gracefully', async () => {
      mockExec.exec.mockRejectedValue(new Error('npm command failed'))

      const result = await uninstaller.uninstallCcline()

      expect(result.success).toBe(false)
      expect(result.errors?.[0]).toMatch(/npm command failed|Failed to uninstall CCometixLine/)
    })
  })
})
