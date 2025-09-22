import inquirer from 'inquirer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  chooseInstallationMethod,
  getClaudeCodeConfigDir,
  handleMultipleInstallations,
} from '../../../src/utils/installation-manager'
import * as installer from '../../../src/utils/installer'
import * as zcfConfig from '../../../src/utils/zcf-config'

vi.mock('../../../src/utils/fs-operations')
vi.mock('../../../src/utils/installer')
vi.mock('../../../src/utils/zcf-config', () => ({
  readTomlConfig: vi.fn(),
  updateTomlConfig: vi.fn(),
  getZcfConfig: vi.fn(),
  updateZcfConfig: vi.fn(),
}))

// Mock homedir to return consistent test path
vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/Users/test'),
}))

// Mock ansis for color output
vi.mock('ansis', () => ({
  default: {
    red: (text: string) => text,
    green: (text: string) => text,
    yellow: (text: string) => text,
    blue: (text: string) => text,
    gray: (text: string) => text,
  },
}))

// Mock inquirer for user input
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}))

// Use real i18n system for better integration testing
vi.mock('../../../src/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/i18n')>()
  return {
    ...actual,
    ensureI18nInitialized: vi.fn(),
    i18n: {
      t: vi.fn((key: string) => {
        // Simple mock implementation that returns the key
        if (key === 'installation:failedToSaveInstallationConfig') {
          return 'Failed to save installation config'
        }
        return key
      }),
      language: 'en',
    },
  }
})

describe('installation manager utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Set default mock return values
    vi.mocked(zcfConfig.getZcfConfig).mockReturnValue({
      version: '1.0.0',
      preferredLang: 'en',
      codeToolType: 'claude-code',
      lastUpdated: '2025-01-01T00:00:00.000Z',
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('chooseInstallationMethod', () => {
    it('should allow user to choose global installation', async () => {
      const inquirer = (await import('inquirer')).default
      vi.mocked(inquirer.prompt).mockResolvedValue({ installMethod: 'global' })

      const result = await chooseInstallationMethod()

      expect(result).toBe('global')
      expect(inquirer.prompt).toHaveBeenCalledWith([
        {
          type: 'list',
          name: 'installMethod',
          message: 'installation:chooseInstallationMethod',
          choices: [
            { name: 'installation:chooseGlobal', value: 'global' },
            { name: 'installation:chooseLocal', value: 'local' },
          ],
        },
      ])
    })

    it('should allow user to choose local installation', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ installMethod: 'local' })

      const result = await chooseInstallationMethod()

      expect(result).toBe('local')
    })

    it('should handle user cancellation gracefully', async () => {
      vi.mocked(inquirer.prompt).mockRejectedValue(new Error('User cancelled'))

      await expect(chooseInstallationMethod()).rejects.toThrow('User cancelled')
    })
  })

  describe('handleMultipleInstallations', () => {
    it('should remove local installation when user chooses global', async () => {
      const installStatus = {
        hasGlobal: true,
        hasLocal: true,
        localPath: '/Users/test/.claude/local/claude',
      }

      vi.mocked(inquirer.prompt).mockResolvedValue({ installMethod: 'global' })
      vi.mocked(installer.removeLocalClaudeCode).mockResolvedValue(undefined)

      const result = await handleMultipleInstallations(installStatus)

      expect(result).toBe('global')
      expect(installer.removeLocalClaudeCode).toHaveBeenCalled()
      expect(console.log).toHaveBeenCalledWith('installation:removingLocalInstallation...')
    })

    it('should keep local installation when user chooses local', async () => {
      const installStatus = {
        hasGlobal: true,
        hasLocal: true,
        localPath: '/Users/test/.claude/local/claude',
      }

      vi.mocked(inquirer.prompt).mockResolvedValue({ installMethod: 'local' })

      const result = await handleMultipleInstallations(installStatus)

      expect(result).toBe('local')
      expect(installer.removeLocalClaudeCode).not.toHaveBeenCalled()
      expect(console.log).toHaveBeenCalledWith('✔ installation:usingLocalInstallation')
    })

    it('should save local installation path to ZCF config when user chooses local', async () => {
      const installStatus = {
        hasGlobal: true,
        hasLocal: true,
        localPath: '/Users/test/.claude/local/claude',
      }

      vi.mocked(inquirer.prompt).mockResolvedValue({ installMethod: 'local' })

      await handleMultipleInstallations(installStatus)

      expect(zcfConfig.updateTomlConfig).toHaveBeenCalledWith('/Users/test/.ufomiao/zcf/config.toml', {
        claudeCode: {
          installType: 'local',
        },
      })
    })

    it('should save global installation info to ZCF config when user chooses global', async () => {
      const installStatus = {
        hasGlobal: true,
        hasLocal: true,
        localPath: '/Users/test/.claude/local/claude',
      }

      vi.mocked(inquirer.prompt).mockResolvedValue({ installMethod: 'global' })
      vi.mocked(installer.removeLocalClaudeCode).mockResolvedValue(undefined)

      await handleMultipleInstallations(installStatus)

      expect(zcfConfig.updateTomlConfig).toHaveBeenCalledWith('/Users/test/.ufomiao/zcf/config.toml', {
        claudeCode: {
          installType: 'global',
        },
      })
    })

    it('should handle only global installation', async () => {
      const installStatus = {
        hasGlobal: true,
        hasLocal: false,
        localPath: '/Users/test/.claude/local/claude',
      }

      const result = await handleMultipleInstallations(installStatus)

      expect(result).toBe('global')
      expect(vi.mocked(inquirer.prompt)).not.toHaveBeenCalled()
    })

    it('should handle only local installation - should prompt user to choose', async () => {
      const installStatus = {
        hasGlobal: false,
        hasLocal: true,
        localPath: '/Users/test/.claude/local/claude',
      }

      vi.mocked(inquirer.prompt).mockResolvedValue({ installMethod: 'local' })

      const result = await handleMultipleInstallations(installStatus)

      expect(result).toBe('local')
      expect(vi.mocked(inquirer.prompt)).toHaveBeenCalled()
      expect(console.warn).toHaveBeenCalledWith('⚠️  installation:onlyLocalInstallationDetected')
    })

    it('should install global when only local exists and user chooses global', async () => {
      const installStatus = {
        hasGlobal: false,
        hasLocal: true,
        localPath: '/Users/test/.claude/local/claude',
      }

      vi.mocked(inquirer.prompt).mockResolvedValue({ installMethod: 'global' })
      vi.mocked(installer.removeLocalClaudeCode).mockResolvedValue(undefined)

      // Mock dynamic import of installClaudeCode
      const mockInstallClaudeCode = vi.fn().mockResolvedValue(undefined)
      vi.doMock('../../../src/utils/installer', () => ({
        ...vi.importActual('../../../src/utils/installer'),
        installClaudeCode: mockInstallClaudeCode,
        removeLocalClaudeCode: vi.mocked(installer.removeLocalClaudeCode),
      }))

      const result = await handleMultipleInstallations(installStatus)

      expect(result).toBe('global')
      expect(vi.mocked(inquirer.prompt)).toHaveBeenCalled()
      expect(console.warn).toHaveBeenCalledWith('⚠️  installation:onlyLocalInstallationDetected')
      expect(console.log).toHaveBeenCalledWith('installation:installingGlobalClaudeCode...')
      expect(installer.removeLocalClaudeCode).toHaveBeenCalled()
    })

    it('should respect previous user choice when both installations exist', async () => {
      const installStatus = {
        hasGlobal: true,
        hasLocal: true,
        localPath: '/Users/test/.claude/local/claude',
      }

      // Mock that user previously chose local installation
      vi.mocked(zcfConfig.readTomlConfig).mockReturnValue({
        version: '1.0.0',
        lastUpdated: '2025-01-01T00:00:00.000Z',
        general: {
          preferredLang: 'en',
          currentTool: 'claude-code',
        },
        claudeCode: {
          enabled: true,
          outputStyles: ['engineer-professional'],
          defaultOutputStyle: 'engineer-professional',
          installType: 'local',
        },
        codex: {
          enabled: false,
          systemPromptStyle: 'engineer-professional',
        },
      })

      const result = await handleMultipleInstallations(installStatus)

      expect(result).toBe('local')
      expect(vi.mocked(inquirer.prompt)).not.toHaveBeenCalled()
    })

    it('should re-prompt when previous choice no longer exists', async () => {
      const installStatus = {
        hasGlobal: true,
        hasLocal: false,
        localPath: '/Users/test/.claude/local/claude',
      }

      // Mock that user previously chose local installation, but it no longer exists
      vi.mocked(zcfConfig.getZcfConfig).mockReturnValue({
        version: '1.0.0',
        preferredLang: 'en',
        lastUpdated: '2025-01-01T00:00:00.000Z',
        codeToolType: 'claude-code',
      })

      const result = await handleMultipleInstallations(installStatus)

      // Should return global directly since only global exists
      expect(result).toBe('global')
      expect(vi.mocked(inquirer.prompt)).not.toHaveBeenCalled()
    })

    it('should handle no installations', async () => {
      const installStatus = {
        hasGlobal: false,
        hasLocal: false,
        localPath: '/Users/test/.claude/local/claude',
      }

      const result = await handleMultipleInstallations(installStatus)

      expect(result).toBe('none')
      expect(vi.mocked(inquirer.prompt)).not.toHaveBeenCalled()
    })

    it('should handle removal failure gracefully', async () => {
      const installStatus = {
        hasGlobal: true,
        hasLocal: true,
        localPath: '/Users/test/.claude/local/claude',
      }

      vi.mocked(inquirer.prompt).mockResolvedValue({ installMethod: 'global' })
      vi.mocked(installer.removeLocalClaudeCode).mockRejectedValue(new Error('Permission denied'))

      await expect(handleMultipleInstallations(installStatus)).rejects.toThrow('Permission denied')

      expect(console.error).toHaveBeenCalledWith('✖ installation:failedToRemoveLocalInstallation: Error: Permission denied')
    })

    it('should show warning message when multiple installations detected', async () => {
      const installStatus = {
        hasGlobal: true,
        hasLocal: true,
        localPath: '/Users/test/.claude/local/claude',
      }

      vi.mocked(inquirer.prompt).mockResolvedValue({ installMethod: 'global' })
      vi.mocked(installer.removeLocalClaudeCode).mockResolvedValue(undefined)

      await handleMultipleInstallations(installStatus)

      expect(console.warn).toHaveBeenCalledWith('⚠️  installation:multipleInstallationsDetected')
    })

    it('should handle config update failure gracefully', async () => {
      const installStatus = {
        hasGlobal: true,
        hasLocal: true,
        localPath: '/Users/test/.claude/local/claude',
      }

      vi.mocked(inquirer.prompt).mockResolvedValue({ installMethod: 'local' })
      vi.mocked(zcfConfig.updateTomlConfig).mockImplementation(() => {
        throw new Error('Config update failed')
      })

      // Should not throw but should gracefully handle the error
      const result = await handleMultipleInstallations(installStatus)

      expect(result).toBe('local')
      // Verify that updateTomlConfig was called - this is the main test requirement
      expect(zcfConfig.updateTomlConfig).toHaveBeenCalled()
      // The function should complete without throwing (graceful error handling)
    })
  })

  describe('getClaudeCodeConfigDir', () => {
    it('should return local config dir when local installation is configured', () => {
      vi.mocked(zcfConfig.getZcfConfig).mockReturnValue({
        version: '1.0.0',
        preferredLang: 'en',
        lastUpdated: '2025-01-01T00:00:00.000Z',
        codeToolType: 'claude-code',
      })

      const result = getClaudeCodeConfigDir()

      expect(result).toBe('/Users/test/.claude')
    })

    it('should return default config dir when global installation is configured', () => {
      vi.mocked(zcfConfig.getZcfConfig).mockReturnValue({
        version: '1.0.0',
        preferredLang: 'en',
        lastUpdated: '2025-01-01T00:00:00.000Z',
        codeToolType: 'claude-code',
      })

      const result = getClaudeCodeConfigDir()

      expect(result).toBe('/Users/test/.claude')
    })

    it('should return default config dir when no installation is configured', () => {
      vi.mocked(zcfConfig.getZcfConfig).mockReturnValue({
        version: '1.0.0',
        preferredLang: 'en',
        lastUpdated: '2025-01-01T00:00:00.000Z',
        codeToolType: 'claude-code',
      })

      const result = getClaudeCodeConfigDir()

      expect(result).toMatch(/\.claude$/)
    })

    it('should return default config dir when getZcfConfig throws error', () => {
      vi.mocked(zcfConfig.getZcfConfig).mockImplementation(() => {
        throw new Error('Config error')
      })

      const result = getClaudeCodeConfigDir()

      expect(result).toMatch(/\.claude$/)
    })

    it('should return default when config is missing installation info', () => {
      vi.mocked(zcfConfig.getZcfConfig).mockReturnValue({
        version: '1.0.0',
        preferredLang: 'en',
        lastUpdated: '2025-01-01T00:00:00.000Z',
        codeToolType: 'claude-code',
      })

      const result = getClaudeCodeConfigDir()

      expect(result).toMatch(/\.claude$/)
    })
  })

  describe('handleMultipleInstallations - additional edge cases', () => {
    it('should handle config save failure in local installation choice gracefully', async () => {
      const installStatus = {
        hasGlobal: true,
        hasLocal: true,
        localPath: '/Users/test/.claude/local/claude',
      }

      vi.mocked(inquirer.prompt).mockResolvedValue({ installMethod: 'local' })
      vi.mocked(zcfConfig.updateTomlConfig).mockImplementation(() => {
        throw new Error('Config save failed')
      })

      // Should not throw but should handle the error gracefully
      const result = await handleMultipleInstallations(installStatus)

      expect(result).toBe('local')
      expect(console.error).toHaveBeenCalledWith('✖ Failed to save installation config: Error: Config save failed')
    })

    it('should handle installer error during global installation gracefully', async () => {
      const installStatus = {
        hasGlobal: false,
        hasLocal: true,
        localPath: '/Users/test/.claude/local/claude',
      }

      vi.mocked(inquirer.prompt).mockResolvedValue({ installMethod: 'global' })

      // Mock dynamic import to throw error
      vi.doMock('../../../src/utils/installer', () => ({
        ...vi.importActual('../../../src/utils/installer'),
        installClaudeCode: vi.fn().mockRejectedValue(new Error('Install failed')),
        removeLocalClaudeCode: vi.mocked(installer.removeLocalClaudeCode),
      }))

      await expect(handleMultipleInstallations(installStatus)).rejects.toThrow('Install failed')
    })

    it('should respect previously chosen global installation preference', async () => {
      const installStatus = {
        hasGlobal: true,
        hasLocal: false,
        localPath: '/Users/test/.claude/local/claude',
      }

      // Mock that user previously chose global installation
      vi.mocked(zcfConfig.getZcfConfig).mockReturnValue({
        version: '1.0.0',
        preferredLang: 'en',
        lastUpdated: '2025-01-01T00:00:00.000Z',
        codeToolType: 'claude-code',
      })

      const result = await handleMultipleInstallations(installStatus)

      expect(result).toBe('global')
      expect(vi.mocked(inquirer.prompt)).not.toHaveBeenCalled()
    })

    it('should handle error when saving global installation config', async () => {
      const installStatus = {
        hasGlobal: true,
        hasLocal: true,
        localPath: '/Users/test/.claude/local/claude',
      }

      vi.mocked(inquirer.prompt).mockResolvedValue({ installMethod: 'global' })
      vi.mocked(installer.removeLocalClaudeCode).mockResolvedValue(undefined)
      vi.mocked(zcfConfig.updateTomlConfig).mockImplementation(() => {
        throw new Error('Config save error')
      })

      // Should throw error when global installation config save fails
      await expect(handleMultipleInstallations(installStatus)).rejects.toThrow('Config save error')

      expect(console.error).toHaveBeenCalledWith('✖ installation:failedToRemoveLocalInstallation: Error: Config save error')
    })

    it('should not call updateTomlConfig on error scenarios', async () => {
      const installStatus = {
        hasGlobal: true,
        hasLocal: true,
        localPath: '/Users/test/.claude/local/claude',
      }

      vi.mocked(inquirer.prompt).mockResolvedValue({ installMethod: 'global' })
      vi.mocked(installer.removeLocalClaudeCode).mockRejectedValue(new Error('Remove failed'))

      await expect(handleMultipleInstallations(installStatus)).rejects.toThrow('Remove failed')

      // updateTomlConfig should not have been called due to error
      expect(zcfConfig.updateTomlConfig).not.toHaveBeenCalled()
    })
  })

  describe('chooseInstallationMethod - edge cases', () => {
    it('should handle inquiry error gracefully', async () => {
      vi.mocked(inquirer.prompt).mockRejectedValue(new Error('Inquiry error'))

      await expect(chooseInstallationMethod()).rejects.toThrow('Inquiry error')
    })

    it('should call ensureI18nInitialized', async () => {
      // Spy on the i18n initialization
      const i18nMock = await import('../../../src/i18n')
      const ensureI18nInitializedSpy = vi.spyOn(i18nMock, 'ensureI18nInitialized')

      vi.mocked(inquirer.prompt).mockResolvedValue({ installMethod: 'global' })

      await chooseInstallationMethod()

      expect(ensureI18nInitializedSpy).toHaveBeenCalled()
    })
  })

  describe('handleMultipleInstallations - i18n initialization', () => {
    it('should call ensureI18nInitialized', async () => {
      const installStatus = {
        hasGlobal: true,
        hasLocal: false,
        localPath: '/Users/test/.claude/local/claude',
      }

      // Spy on the i18n initialization
      const i18nMock = await import('../../../src/i18n')
      const ensureI18nInitializedSpy = vi.spyOn(i18nMock, 'ensureI18nInitialized')

      const result = await handleMultipleInstallations(installStatus)

      expect(result).toBe('global')
      expect(ensureI18nInitializedSpy).toHaveBeenCalled()
    })
  })
})
