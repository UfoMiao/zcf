import type { CodexUninstaller, CodexUninstallItem } from '../../../../src/utils/code-tools/codex-uninstaller'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock dependencies
vi.mock('fs-extra', () => ({
  pathExists: vi.fn(),
}))

vi.mock('../../../../src/utils/trash', () => ({
  moveToTrash: vi.fn(),
}))

vi.mock('../../../../src/utils/json-config', () => ({
  readJsonConfig: vi.fn(),
  writeJsonConfig: vi.fn(),
}))

vi.mock('../../../../src/i18n', () => ({
  i18n: {
    t: vi.fn(),
  },
}))

const installerMock = vi.hoisted(() => ({
  uninstallCodeTool: vi.fn(),
}))

vi.mock('../../../../src/utils/installer', () => installerMock)

// Import mocked functions
const { pathExists } = await import('fs-extra')
const { moveToTrash } = await import('../../../../src/utils/trash')
const { readJsonConfig, writeJsonConfig } = await import('../../../../src/utils/json-config')
const { i18n } = await import('../../../../src/i18n')
const { uninstallCodeTool } = await import('../../../../src/utils/installer')

// Get mock functions
const mockPathExists = vi.mocked(pathExists)
const mockMoveToTrash = vi.mocked(moveToTrash)
const _mockReadJsonConfig = vi.mocked(readJsonConfig)
const _mockWriteJsonConfig = vi.mocked(writeJsonConfig)
const mockUninstallCodeTool = vi.mocked(uninstallCodeTool)

// Suppress unused variable warnings - these are intentionally unused in tests
void _mockReadJsonConfig
void _mockWriteJsonConfig
const mockI18nT = vi.mocked(i18n.t)

describe('codexUninstaller', () => {
  let uninstaller: CodexUninstaller
  const CODEX_DIR = join(homedir(), '.codex')
  const CODEX_CONFIG_FILE = join(CODEX_DIR, 'config.toml')
  const CODEX_AUTH_FILE = join(CODEX_DIR, 'auth.json')
  const CODEX_AGENTS_FILE = join(CODEX_DIR, 'AGENTS.md')
  const CODEX_PROMPTS_DIR = join(CODEX_DIR, 'prompts')

  beforeEach(async () => {
    vi.clearAllMocks()
    mockI18nT.mockImplementation(((key: string) => `mocked_${key}`) as any)
    mockMoveToTrash.mockResolvedValue([{ success: true, path: 'test' }])
    mockPathExists.mockResolvedValue(true as any)
    mockUninstallCodeTool.mockResolvedValue(true)

    // Import the actual class after mocks are setup
    const { CodexUninstaller: ActualCodexUninstaller } = await import('../../../../src/utils/code-tools/codex-uninstaller')
    uninstaller = new ActualCodexUninstaller('en')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('removeConfig', () => {
    it('should successfully remove config file and move to trash', async () => {
      mockPathExists.mockResolvedValue(true as any)

      const result = await uninstaller.removeConfig()

      expect(mockPathExists).toHaveBeenCalledWith(CODEX_CONFIG_FILE)
      expect(mockMoveToTrash).toHaveBeenCalledWith(CODEX_CONFIG_FILE)
      expect(result).toEqual({
        success: true,
        removed: ['config.toml'],
        removedConfigs: [],
        errors: [],
        warnings: [],
      })
    })

    it('should handle missing config file gracefully', async () => {
      mockPathExists.mockResolvedValue(false as any)

      const result = await uninstaller.removeConfig()

      expect(mockMoveToTrash).not.toHaveBeenCalled()
      expect(result.success).toBe(true)
      expect(result.warnings).toContain('mocked_codex:configNotFound')
    })

    it('should handle trash operation failure', async () => {
      mockMoveToTrash.mockResolvedValue([{ success: false, path: CODEX_CONFIG_FILE, error: 'Permission denied' }])

      const result = await uninstaller.removeConfig()

      expect(result.success).toBe(true)
      expect(result.warnings).toContain('Permission denied')
    })
  })

  describe('removeAuth', () => {
    it('should successfully remove auth file', async () => {
      mockPathExists.mockResolvedValue(true as any)

      const result = await uninstaller.removeAuth()

      expect(mockPathExists).toHaveBeenCalledWith(CODEX_AUTH_FILE)
      expect(mockMoveToTrash).toHaveBeenCalledWith(CODEX_AUTH_FILE)
      expect(result.success).toBe(true)
      expect(result.removed).toContain('auth.json')
    })

    it('should warn when auth file does not exist', async () => {
      mockPathExists.mockResolvedValue(false as any)

      const result = await uninstaller.removeAuth()

      expect(result.success).toBe(true)
      expect(result.warnings).toContain('mocked_codex:authNotFound')
    })
  })

  describe('removeSystemPrompt', () => {
    it('should successfully remove system prompt file', async () => {
      mockPathExists.mockResolvedValue(true as any)

      const result = await uninstaller.removeSystemPrompt()

      expect(mockPathExists).toHaveBeenCalledWith(CODEX_AGENTS_FILE)
      expect(mockMoveToTrash).toHaveBeenCalledWith(CODEX_AGENTS_FILE)
      expect(result.success).toBe(true)
      expect(result.removed).toContain('AGENTS.md')
    })
  })

  describe('removeWorkflow', () => {
    it('should successfully remove workflow directory', async () => {
      mockPathExists.mockResolvedValue(true as any)

      const result = await uninstaller.removeWorkflow()

      expect(mockPathExists).toHaveBeenCalledWith(CODEX_PROMPTS_DIR)
      expect(mockMoveToTrash).toHaveBeenCalledWith(CODEX_PROMPTS_DIR)
      expect(result.success).toBe(true)
      expect(result.removed).toContain('prompts/')
    })
  })

  describe('uninstallCliPackage', () => {
    it('should successfully uninstall npm package', async () => {
      mockUninstallCodeTool.mockResolvedValue(true)

      const result = await uninstaller.uninstallCliPackage()

      expect(mockUninstallCodeTool).toHaveBeenCalledWith('codex')
      expect(result.success).toBe(true)
      expect(result.removed).toContain('@openai/codex')
    })

    it('should handle package not found scenario', async () => {
      const notFoundError = new Error('Package not found')
      notFoundError.message = 'not found'
      mockUninstallCodeTool.mockRejectedValue(notFoundError)

      const result = await uninstaller.uninstallCliPackage()

      expect(result.success).toBe(true)
      expect(result.warnings).toContain('mocked_codex:packageNotFound')
    })

    it('should handle npm uninstall failure', async () => {
      const error = new Error('Network error')
      mockUninstallCodeTool.mockRejectedValue(error)

      const result = await uninstaller.uninstallCliPackage()

      expect(result.success).toBe(false)
      expect(result.errors).toContain('mocked_uninstall:uninstallFailed')
    })
  })

  describe('completeUninstall', () => {
    it('should perform complete uninstall of all components', async () => {
      mockPathExists.mockResolvedValue(true as any)
      mockUninstallCodeTool.mockResolvedValue(true)

      const result = await uninstaller.completeUninstall()

      // Should remove entire .codex directory
      expect(mockMoveToTrash).toHaveBeenCalledWith(CODEX_DIR)
      // Should uninstall npm package
      expect(mockUninstallCodeTool).toHaveBeenCalledWith('codex')

      expect(result.success).toBe(true)
      expect(result.removed).toContain('~/.codex/')
      expect(result.removed).toContain('@openai/codex')
    })

    it('should handle partial failures gracefully', async () => {
      mockPathExists.mockResolvedValue(true as any)
      mockMoveToTrash.mockResolvedValue([{ success: false, path: CODEX_DIR, error: 'Permission denied' }])
      mockUninstallCodeTool.mockResolvedValue(true)

      const result = await uninstaller.completeUninstall()

      expect(result.success).toBe(true)
      expect(result.warnings).toContain('Failed to move ~/.codex/ to trash: Permission denied')
      expect(result.removed).toContain('@openai/codex')
    })
  })

  describe('customUninstall', () => {
    it('should handle custom uninstall with selected items', async () => {
      const selectedItems: CodexUninstallItem[] = ['config', 'auth']
      mockPathExists.mockResolvedValue(true as any)

      const results = await uninstaller.customUninstall(selectedItems)

      expect(results).toHaveLength(2)
      expect(mockMoveToTrash).toHaveBeenCalledWith(CODEX_CONFIG_FILE)
      expect(mockMoveToTrash).toHaveBeenCalledWith(CODEX_AUTH_FILE)
    })

    it('should resolve conflicts correctly', async () => {
      // cli-package should include config removal
      const selectedItems: CodexUninstallItem[] = ['cli-package', 'config']
      mockPathExists.mockResolvedValue(true as any)
      mockUninstallCodeTool.mockResolvedValue(true)

      const results = await uninstaller.customUninstall(selectedItems)

      // Should remove config conflict since cli-package uninstall includes it
      expect(results).toHaveLength(1) // Only cli-package uninstall
      expect(mockUninstallCodeTool).toHaveBeenCalledWith('codex')
    })

    it('should handle errors in individual uninstall items', async () => {
      const selectedItems: CodexUninstallItem[] = ['config']
      const error = new Error('File system error')
      mockPathExists.mockRejectedValue(error)

      const results = await uninstaller.customUninstall(selectedItems)

      expect(results).toHaveLength(1)
      expect(results[0].success).toBe(false)
      expect(results[0].errors[0]).toContain('Failed to remove config')
    })
  })

  describe('conflict resolution', () => {
    it('should remove conflicting items when cli-package is selected', async () => {
      const items: CodexUninstallItem[] = ['cli-package', 'config', 'auth', 'system-prompt']

      // Access private method through type assertion
      const resolvedItems = (uninstaller as any).resolveConflicts(items)

      // cli-package installation should include config and auth removal
      expect(resolvedItems).toContain('cli-package')
      expect(resolvedItems).not.toContain('config')
      expect(resolvedItems).not.toContain('auth')
      expect(resolvedItems).toContain('system-prompt') // This should remain
    })
  })

  describe('removeApiConfig', () => {
    it('should successfully remove API configuration from TOML file', async () => {
      const tomlContent = `# Managed by ZCF
model_provider = "custom-provider"

[model_providers.custom-provider]
name = "Custom Provider"
base_url = "https://api.example.com/v1"
wire_api = "responses"
env_key = "CUSTOM_API_KEY"

[mcp_servers.context7]
command = "npx"
args = ["-y", "context7"]
`

      // Mock fs operations
      const mockReadFileSync = vi.fn().mockReturnValue(tomlContent)
      const mockWriteFileSync = vi.fn()

      vi.doMock('node:fs', () => ({
        readFileSync: mockReadFileSync,
        writeFileSync: mockWriteFileSync,
      }))

      mockPathExists.mockResolvedValue(true as any)

      const result = await uninstaller.removeApiConfig()

      expect(result.success).toBe(true)
      expect(mockReadFileSync).toHaveBeenCalledWith(CODEX_CONFIG_FILE, 'utf-8')
      expect(mockWriteFileSync).toHaveBeenCalled()

      const writtenContent = mockWriteFileSync.mock.calls[0][1]
      expect(writtenContent).not.toContain('model_provider = "custom-provider"')
      expect(writtenContent).not.toContain('[model_providers.custom-provider]')
      expect(writtenContent).toContain('[mcp_servers.context7]')
      expect(result.removedConfigs).toHaveLength(1)
    })

    it('should handle multiple provider sections correctly', async () => {
      const complexTomlContent = `model_provider = "provider1"

[model_providers.provider1]
name = "Provider 1"
base_url = "https://api.provider1.com/v1"

[model_providers.provider2]
name = "Provider 2"
base_url = "https://api.provider2.com/v1"
wire_api = "chat"

[mcp_servers.context7]
command = "npx"
`

      const mockReadFileSync = vi.fn().mockReturnValue(complexTomlContent)
      const mockWriteFileSync = vi.fn()

      vi.doMock('node:fs', () => ({
        readFileSync: mockReadFileSync,
        writeFileSync: mockWriteFileSync,
      }))

      mockPathExists.mockResolvedValue(true as any)

      const result = await uninstaller.removeApiConfig()

      expect(result.success).toBe(true)
      const writtenContent = mockWriteFileSync.mock.calls[0][1]
      expect(writtenContent).not.toContain('model_provider')
      expect(writtenContent).not.toContain('[model_providers.provider1]')
      expect(writtenContent).not.toContain('[model_providers.provider2]')
      expect(writtenContent).toContain('[mcp_servers.context7]')
    })

    it('should handle file read errors gracefully', async () => {
      const mockReadFileSync = vi.fn().mockImplementation(() => {
        throw new Error('Permission denied')
      })

      vi.doMock('node:fs', () => ({
        readFileSync: mockReadFileSync,
        writeFileSync: vi.fn(),
      }))

      mockPathExists.mockResolvedValue(true as any)

      const result = await uninstaller.removeApiConfig()

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Failed to remove API config: Permission denied')
    })

    it('should handle missing config file gracefully', async () => {
      mockPathExists.mockResolvedValue(false as any)

      const result = await uninstaller.removeApiConfig()

      expect(result.success).toBe(true)
      expect(result.warnings).toContain('mocked_codex:configNotFound')
    })
  })

  describe('removeMcpConfig', () => {
    it('should successfully remove MCP server configurations', async () => {
      const tomlContent = `model_provider = "custom-provider"

[model_providers.custom-provider]
name = "Custom Provider"

[mcp_servers.context7]
command = "npx"
args = ["-y", "context7"]

[mcp_servers.exa]
command = "npx"
args = ["-y", "exa-mcp-server"]
env = {EXA_API_KEY = "test-key"}
`

      const mockReadFileSync = vi.fn().mockReturnValue(tomlContent)
      const mockWriteFileSync = vi.fn()

      vi.doMock('node:fs', () => ({
        readFileSync: mockReadFileSync,
        writeFileSync: mockWriteFileSync,
      }))

      mockPathExists.mockResolvedValue(true as any)

      const result = await uninstaller.removeMcpConfig()

      expect(result.success).toBe(true)
      const writtenContent = mockWriteFileSync.mock.calls[0][1]
      expect(writtenContent).toContain('[model_providers.custom-provider]')
      expect(writtenContent).not.toContain('[mcp_servers.context7]')
      expect(writtenContent).not.toContain('[mcp_servers.exa]')
      expect(result.removedConfigs).toHaveLength(1)
    })

    it('should handle nested MCP configurations correctly', async () => {
      const nestedTomlContent = `[mcp_servers.complex]
command = "npx"
args = ["-y", "complex-server"]
env = {
  API_KEY = "secret"
  BASE_URL = "https://api.example.com"
}

[mcp_servers.simple]
command = "simple-command"

[other_section]
key = "value"
`

      const mockReadFileSync = vi.fn().mockReturnValue(nestedTomlContent)
      const mockWriteFileSync = vi.fn()

      vi.doMock('node:fs', () => ({
        readFileSync: mockReadFileSync,
        writeFileSync: mockWriteFileSync,
      }))

      mockPathExists.mockResolvedValue(true as any)

      const result = await uninstaller.removeMcpConfig()

      expect(result.success).toBe(true)
      const writtenContent = mockWriteFileSync.mock.calls[0][1]
      expect(writtenContent).not.toContain('[mcp_servers.complex]')
      expect(writtenContent).not.toContain('[mcp_servers.simple]')
      expect(writtenContent).toContain('[other_section]')
      expect(writtenContent).toContain('key = "value"')
    })

    it('should handle write errors during MCP config removal', async () => {
      const mockReadFileSync = vi.fn().mockReturnValue('[mcp_servers.test]\ncommand = "test"')
      const mockWriteFileSync = vi.fn().mockImplementation(() => {
        throw new Error('Write permission denied')
      })

      vi.doMock('node:fs', () => ({
        readFileSync: mockReadFileSync,
        writeFileSync: mockWriteFileSync,
      }))

      mockPathExists.mockResolvedValue(true as any)

      const result = await uninstaller.removeMcpConfig()

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Failed to remove MCP config: Write permission denied')
    })

    it('should warn when MCP config file is missing', async () => {
      mockPathExists.mockResolvedValue(false as any)

      const result = await uninstaller.removeMcpConfig()

      expect(result.success).toBe(true)
      expect(result.warnings).toContain('mocked_codex:configNotFound')
    })
  })

  describe('removeBackups', () => {
    it('should successfully remove backup directory', async () => {
      const CODEX_BACKUP_DIR = join(CODEX_DIR, 'backup')
      mockPathExists.mockResolvedValue(true as any)
      mockMoveToTrash.mockResolvedValue([{ success: true, path: CODEX_BACKUP_DIR }])

      const result = await uninstaller.removeBackups()

      expect(mockPathExists).toHaveBeenCalledWith(CODEX_BACKUP_DIR)
      expect(mockMoveToTrash).toHaveBeenCalledWith(CODEX_BACKUP_DIR)
      expect(result.success).toBe(true)
      expect(result.removed).toContain('backup/')
    })

    it('should handle missing backup directory gracefully', async () => {
      mockPathExists.mockResolvedValue(false as any)

      const result = await uninstaller.removeBackups()

      expect(mockMoveToTrash).not.toHaveBeenCalled()
      expect(result.success).toBe(true)
      expect(result.warnings).toContain('mocked_codex:backupNotFound')
    })

    it('should handle trash operation failure for backups', async () => {
      const CODEX_BACKUP_DIR = join(CODEX_DIR, 'backup')
      mockPathExists.mockResolvedValue(true as any)
      mockMoveToTrash.mockResolvedValue([{ success: false, path: CODEX_BACKUP_DIR, error: 'Access denied' }])

      const result = await uninstaller.removeBackups()

      expect(result.success).toBe(true)
      expect(result.warnings).toContain('Access denied')
      expect(result.removed).toContain('backup/')
    })

    it('should handle backup removal exceptions', async () => {
      mockPathExists.mockRejectedValue(new Error('Filesystem error'))

      const result = await uninstaller.removeBackups()

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Failed to remove backups: Filesystem error')
    })
  })

  describe('uninstallCliPackage error handling', () => {
    it('should capture errors from cli uninstall and mark failure', async () => {
      const failingUninstaller = new (await import('../../../../src/utils/code-tools/codex-uninstaller')).CodexUninstaller('en')
      vi.spyOn(failingUninstaller, 'uninstallCliPackage').mockRejectedValue(new Error('boom'))
      mockPathExists.mockResolvedValue(false as any)

      const result = await failingUninstaller.completeUninstall()

      expect(result.success).toBe(false)
      expect(result.errors[0]).toContain('Complete uninstall failed')
    })
  })

  describe('customUninstall error handling', () => {
    it('should return error result when executeUninstallItem throws', async () => {
      const failingUninstaller = new (await import('../../../../src/utils/code-tools/codex-uninstaller')).CodexUninstaller('en')
      vi.spyOn(failingUninstaller as any, 'executeUninstallItem').mockRejectedValue(new Error('fail'))

      const results = await failingUninstaller.customUninstall(['config'])

      expect(results[0].success).toBe(false)
      expect(results[0].errors[0]).toContain('Failed to execute config')
    })
  })

  describe('executeUninstallItem', () => {
    it('should correctly route config item to removeConfig', async () => {
      const removeConfigSpy = vi.spyOn(uninstaller, 'removeConfig').mockResolvedValue({
        success: true,
        removed: ['config.toml'],
        removedConfigs: [],
        errors: [],
        warnings: [],
      })

      const result = await (uninstaller as any).executeUninstallItem('config')

      expect(removeConfigSpy).toHaveBeenCalled()
      expect(result.success).toBe(true)
      expect(result.removed).toContain('config.toml')
    })

    it('should correctly route api-config item to removeApiConfig', async () => {
      const removeApiConfigSpy = vi.spyOn(uninstaller, 'removeApiConfig').mockResolvedValue({
        success: true,
        removed: [],
        removedConfigs: ['API configuration removed'],
        errors: [],
        warnings: [],
      })

      const result = await (uninstaller as any).executeUninstallItem('api-config')

      expect(removeApiConfigSpy).toHaveBeenCalled()
      expect(result.success).toBe(true)
      expect(result.removedConfigs).toContain('API configuration removed')
    })

    it('should correctly route mcp-config item to removeMcpConfig', async () => {
      const removeMcpConfigSpy = vi.spyOn(uninstaller, 'removeMcpConfig').mockResolvedValue({
        success: true,
        removed: [],
        removedConfigs: ['MCP configuration removed'],
        errors: [],
        warnings: [],
      })

      const result = await (uninstaller as any).executeUninstallItem('mcp-config')

      expect(removeMcpConfigSpy).toHaveBeenCalled()
      expect(result.success).toBe(true)
      expect(result.removedConfigs).toContain('MCP configuration removed')
    })

    it('should correctly route backups item to removeBackups', async () => {
      const removeBackupsSpy = vi.spyOn(uninstaller, 'removeBackups').mockResolvedValue({
        success: true,
        removed: ['backup/'],
        removedConfigs: [],
        errors: [],
        warnings: [],
      })

      const result = await (uninstaller as any).executeUninstallItem('backups')

      expect(removeBackupsSpy).toHaveBeenCalled()
      expect(result.success).toBe(true)
      expect(result.removed).toContain('backup/')
    })

    it('should handle unknown uninstall item type', async () => {
      const result = await (uninstaller as any).executeUninstallItem('unknown-item')

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Unknown uninstall item: unknown-item')
      expect(result.removed).toHaveLength(0)
      expect(result.removedConfigs).toHaveLength(0)
    })
  })

  describe('edge cases', () => {
    it('should handle empty selected items array', async () => {
      const results = await uninstaller.customUninstall([])

      expect(results).toHaveLength(0)
    })

    it('should handle unknown uninstall item', async () => {
      const unknownItem = 'unknown-item' as CodexUninstallItem

      const results = await uninstaller.customUninstall([unknownItem])

      expect(results).toHaveLength(1)
      expect(results[0].success).toBe(false)
      expect(results[0].errors[0]).toContain('Unknown uninstall item: unknown-item')
    })

    it('should handle file system permission errors', async () => {
      const error = new Error('EACCES: permission denied')
      mockMoveToTrash.mockRejectedValue(error)

      const result = await uninstaller.removeConfig()

      expect(result.success).toBe(false)
      expect(result.errors[0]).toContain('Failed to remove config')
    })
  })
})
