import type { CodexUninstaller, CodexUninstallItem } from '../../../../src/utils/code-tools/codex-uninstaller'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock dependencies
vi.mock('fs-extra', () => ({
  pathExists: vi.fn(),
}))

vi.mock('tinyexec', () => ({
  exec: vi.fn(),
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

// Import mocked functions
const { pathExists } = await import('fs-extra')
const { exec } = await import('tinyexec')
const { moveToTrash } = await import('../../../../src/utils/trash')
const { readJsonConfig, writeJsonConfig } = await import('../../../../src/utils/json-config')
const { i18n } = await import('../../../../src/i18n')

// Get mock functions
const mockPathExists = vi.mocked(pathExists)
const mockExec = vi.mocked(exec)
const mockMoveToTrash = vi.mocked(moveToTrash)
const _mockReadJsonConfig = vi.mocked(readJsonConfig)
const _mockWriteJsonConfig = vi.mocked(writeJsonConfig)

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
    mockExec.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' } as any)

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
      mockExec.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' } as any)

      const result = await uninstaller.uninstallCliPackage()

      expect(mockExec).toHaveBeenCalledWith('npm', ['uninstall', '-g', '@openai/codex'])
      expect(result.success).toBe(true)
      expect(result.removed).toContain('@openai/codex package')
    })

    it('should handle package not found scenario', async () => {
      const notFoundError = new Error('Package not found')
      notFoundError.message = 'not found'
      mockExec.mockRejectedValue(notFoundError)

      const result = await uninstaller.uninstallCliPackage()

      expect(result.success).toBe(true)
      expect(result.warnings).toContain('mocked_codex:packageNotFound')
    })

    it('should handle npm uninstall failure', async () => {
      const error = new Error('Network error')
      mockExec.mockRejectedValue(error)

      const result = await uninstaller.uninstallCliPackage()

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Failed to uninstall Codex package: Network error')
    })
  })

  describe('completeUninstall', () => {
    it('should perform complete uninstall of all components', async () => {
      mockPathExists.mockResolvedValue(true as any)
      mockExec.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' } as any)

      const result = await uninstaller.completeUninstall()

      // Should remove entire .codex directory
      expect(mockMoveToTrash).toHaveBeenCalledWith(CODEX_DIR)
      // Should uninstall npm package
      expect(mockExec).toHaveBeenCalledWith('npm', ['uninstall', '-g', '@openai/codex'])

      expect(result.success).toBe(true)
      expect(result.removed).toContain('~/.codex/')
      expect(result.removed).toContain('@openai/codex package')
    })

    it('should handle partial failures gracefully', async () => {
      mockPathExists.mockResolvedValue(true as any)
      mockMoveToTrash.mockResolvedValue([{ success: false, path: CODEX_DIR, error: 'Permission denied' }])
      mockExec.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' } as any)

      const result = await uninstaller.completeUninstall()

      expect(result.success).toBe(true)
      expect(result.warnings).toContain('Failed to move ~/.codex/ to trash: Permission denied')
      expect(result.removed).toContain('@openai/codex package')
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
      mockExec.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' } as any)

      const results = await uninstaller.customUninstall(selectedItems)

      // Should remove config conflict since cli-package uninstall includes it
      expect(results).toHaveLength(1) // Only cli-package uninstall
      expect(mockExec).toHaveBeenCalledWith('npm', ['uninstall', '-g', '@openai/codex'])
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
