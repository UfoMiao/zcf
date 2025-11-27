import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as platform from '../../../../src/utils/platform'

// Mock dependencies
vi.mock('../../i18n')

const installerMock = vi.hoisted(() => ({
  installCodex: vi.fn(),
}))

vi.mock('../../../../src/utils/installer', () => installerMock)

const platformMock = vi.hoisted(() => {
  const shouldUseSudoForGlobalInstall = vi.fn(() => false)
  return {
    getPlatform: vi.fn(() => 'macos'),
    isTermux: vi.fn(() => false),
    isWSL: vi.fn(() => false),
    getWSLInfo: vi.fn(() => null),
    getTermuxPrefix: vi.fn(() => '/data/data/com.termux/files/usr'),
    getRecommendedInstallMethods: vi.fn(() => ['npm']),
    commandExists: vi.fn(async () => false),
    shouldUseSudoForGlobalInstall,
    wrapCommandWithSudo: vi.fn((command: string, args: string[]) => {
      if (shouldUseSudoForGlobalInstall()) {
        return {
          command: 'sudo',
          args: [command, ...args],
          usedSudo: true,
        }
      }

      return {
        command,
        args,
        usedSudo: false,
      }
    }),
  }
})

vi.mock('../../../../src/utils/platform', () => platformMock)

const mockExec = vi.hoisted(() => vi.fn())
const mockTinyexec = vi.hoisted(() => ({
  x: mockExec,
  exec: mockExec,
}))

vi.mock('tinyexec', () => ({
  __esModule: true,
  ...mockTinyexec,
  default: mockTinyexec,
}))

const installerModule = await import('../../../../src/utils/installer')
const mockedInstallCodex = vi.mocked(installerModule.installCodex)

describe('codex installation checks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockExec.mockReset()
    vi.mocked(platform.getPlatform).mockReturnValue('macos')
    vi.mocked(platform.shouldUseSudoForGlobalInstall).mockReturnValue(false)
    mockedInstallCodex.mockReset()
    mockedInstallCodex.mockResolvedValue(undefined)
  })

  describe('isCodexInstalled', () => {
    it('should return true when codex is installed globally via npm', async () => {
      // Arrange
      mockExec.mockResolvedValueOnce({
        exitCode: 0,
        stdout: `
/usr/local/lib
├── @openai/codex@1.0.0
└── other-package@1.0.0
        `.trim(),
        stderr: '',
      })

      // Act
      const { isCodexInstalled } = await import('../../../../src/utils/code-tools/codex')
      const result = await isCodexInstalled()

      // Assert
      expect(result).toBe(true)
      expect(mockExec).toHaveBeenCalledWith('npm', ['list', '-g', '--depth=0'])
    })

    it('should return true when codex is installed via Homebrew', async () => {
      // Arrange - npm check fails
      mockExec.mockResolvedValueOnce({
        exitCode: 0,
        stdout: '/usr/local/lib\n└── other-package@1.0.0',
        stderr: '',
      })
      // Homebrew check succeeds
      mockExec.mockResolvedValueOnce({
        exitCode: 0,
        stdout: 'codex 1.0.0',
        stderr: '',
      })

      // Act
      const { isCodexInstalled } = await import('../../../../src/utils/code-tools/codex')
      const result = await isCodexInstalled()

      // Assert
      expect(result).toBe(true)
      expect(mockExec).toHaveBeenCalledWith('brew', ['list', '--cask', 'codex'], expect.objectContaining({ throwOnError: false }))
    })

    it('should return false when codex is not installed', async () => {
      // Arrange - npm check fails
      mockExec.mockResolvedValueOnce({
        exitCode: 0,
        stdout: `
/usr/local/lib
└── other-package@1.0.0
        `.trim(),
        stderr: '',
      })
      // Homebrew check fails
      mockExec.mockResolvedValueOnce({
        exitCode: 1,
        stdout: '',
        stderr: 'Error: No available formula with the name "codex"',
      })

      // Act
      const { isCodexInstalled } = await import('../../../../src/utils/code-tools/codex')
      const result = await isCodexInstalled()

      // Assert
      expect(result).toBe(false)
    })

    it('should return false when npm command fails', async () => {
      // Arrange
      mockExec.mockRejectedValueOnce(new Error('npm not found'))
      // Homebrew check also fails
      mockExec.mockRejectedValueOnce(new Error('brew not found'))

      // Act
      const { isCodexInstalled } = await import('../../../../src/utils/code-tools/codex')
      const result = await isCodexInstalled()

      // Assert
      expect(result).toBe(false)
    })

    it('should handle non-zero exit codes gracefully', async () => {
      // Arrange
      mockExec.mockResolvedValueOnce({
        exitCode: 1,
        stdout: '',
        stderr: 'some error',
      })
      // Homebrew check also fails
      mockExec.mockResolvedValueOnce({
        exitCode: 1,
        stdout: '',
        stderr: 'brew error',
      })

      // Act
      const { isCodexInstalled } = await import('../../../../src/utils/code-tools/codex')
      const result = await isCodexInstalled()

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('getCodexVersion', () => {
    it('should return version when codex is installed via npm', async () => {
      // Arrange
      mockExec.mockResolvedValueOnce({
        exitCode: 0,
        stdout: `
/usr/local/lib
├── @openai/codex@1.2.3
└── other-package@1.0.0
        `.trim(),
        stderr: '',
      })

      // Act
      const { getCodexVersion } = await import('../../../../src/utils/code-tools/codex')
      const result = await getCodexVersion()

      // Assert
      expect(result).toBe('1.2.3')
    })

    it('should return version when codex is installed via Homebrew', async () => {
      // Arrange - npm check fails
      mockExec.mockResolvedValueOnce({
        exitCode: 0,
        stdout: '/usr/local/lib\n└── other-package@1.0.0',
        stderr: '',
      })
      // Homebrew info check succeeds with v2 JSON format
      mockExec.mockResolvedValueOnce({
        exitCode: 0,
        stdout: JSON.stringify({
          casks: [{
            token: 'codex',
            installed: '2.0.0', // v2 format: installed is a string
          }],
        }),
        stderr: '',
      })

      // Act
      const { getCodexVersion } = await import('../../../../src/utils/code-tools/codex')
      const result = await getCodexVersion()

      // Assert
      expect(result).toBe('2.0.0')
      expect(mockExec).toHaveBeenCalledWith('brew', ['info', '--cask', 'codex', '--json=v2'], expect.objectContaining({ throwOnError: false }))
    })

    it('should return null when codex is not installed', async () => {
      // Arrange - npm check fails
      mockExec.mockResolvedValueOnce({
        exitCode: 0,
        stdout: `
/usr/local/lib
└── other-package@1.0.0
        `.trim(),
        stderr: '',
      })
      // Homebrew check fails
      mockExec.mockResolvedValueOnce({
        exitCode: 1,
        stdout: '',
        stderr: 'Error: No available formula with the name "codex"',
      })

      // Act
      const { getCodexVersion } = await import('../../../../src/utils/code-tools/codex')
      const result = await getCodexVersion()

      // Assert
      expect(result).toBeNull()
    })

    it('should return null when Homebrew cask is known but not installed', async () => {
      // Arrange - npm check fails
      mockExec.mockResolvedValueOnce({
        exitCode: 0,
        stdout: '/usr/local/lib\n└── other-package@1.0.0',
        stderr: '',
      })
      // Homebrew info succeeds but shows not installed (installed: null)
      mockExec.mockResolvedValueOnce({
        exitCode: 0,
        stdout: JSON.stringify({
          casks: [{
            token: 'codex',
            installed: null, // v2 format: null when not installed
            version: '2.0.0',
          }],
        }),
        stderr: '',
      })

      // Act
      const { getCodexVersion } = await import('../../../../src/utils/code-tools/codex')
      const result = await getCodexVersion()

      // Assert
      expect(result).toBeNull()
    })

    it('should handle parsing errors gracefully', async () => {
      // Arrange - npm parsing fails
      mockExec.mockResolvedValueOnce({
        exitCode: 0,
        stdout: 'invalid output format',
        stderr: '',
      })
      // Homebrew check also fails
      mockExec.mockResolvedValueOnce({
        exitCode: 1,
        stdout: '',
        stderr: 'error',
      })

      // Act
      const { getCodexVersion } = await import('../../../../src/utils/code-tools/codex')
      const result = await getCodexVersion()

      // Assert
      expect(result).toBeNull()
    })

    it('should return null when npm command fails', async () => {
      // Arrange
      mockExec.mockRejectedValueOnce(new Error('npm not found'))
      // Homebrew also fails
      mockExec.mockRejectedValueOnce(new Error('brew not found'))

      // Act
      const { getCodexVersion } = await import('../../../../src/utils/code-tools/codex')
      const result = await getCodexVersion()

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('checkCodexUpdate', () => {
    it('should return true when update is available', async () => {
      // Arrange - First call for current version
      mockExec.mockResolvedValueOnce({
        exitCode: 0,
        stdout: `
/usr/local/lib
├── @openai/codex@1.0.0
        `.trim(),
        stderr: '',
      })

      // Second call for latest version
      mockExec.mockResolvedValueOnce({
        exitCode: 0,
        stdout: JSON.stringify({
          'dist-tags': {
            latest: '1.1.0',
          },
        }),
        stderr: '',
      })

      // Act
      const { checkCodexUpdate } = await import('../../../../src/utils/code-tools/codex')
      const result = await checkCodexUpdate()

      // Assert
      expect(result).toEqual({
        installed: true,
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        needsUpdate: true,
      })
      expect(mockExec).toHaveBeenCalledWith('npm', ['list', '-g', '--depth=0'])
      expect(mockExec).toHaveBeenCalledWith('npm', ['view', '@openai/codex', '--json'])
    })

    it('should return false when no update is available', async () => {
      // Arrange - First call for current version
      mockExec.mockResolvedValueOnce({
        exitCode: 0,
        stdout: `
/usr/local/lib
├── @openai/codex@1.1.0
        `.trim(),
        stderr: '',
      })

      // Second call for latest version
      mockExec.mockResolvedValueOnce({
        exitCode: 0,
        stdout: JSON.stringify({
          'dist-tags': {
            latest: '1.1.0',
          },
        }),
        stderr: '',
      })

      // Act
      const { checkCodexUpdate } = await import('../../../../src/utils/code-tools/codex')
      const result = await checkCodexUpdate()

      // Assert
      expect(result).toEqual({
        installed: true,
        currentVersion: '1.1.0',
        latestVersion: '1.1.0',
        needsUpdate: false,
      })
    })

    it('should return false when codex is not installed', async () => {
      // Arrange
      mockExec.mockResolvedValueOnce({
        exitCode: 0,
        stdout: `
/usr/local/lib
└── other-package@1.0.0
        `.trim(),
        stderr: '',
      })

      // Act
      const { checkCodexUpdate } = await import('../../../../src/utils/code-tools/codex')
      const result = await checkCodexUpdate()

      // Assert
      expect(result).toEqual({
        installed: false,
        currentVersion: null,
        latestVersion: null,
        needsUpdate: false,
      })
      // getCodexVersion now checks both npm and Homebrew
      expect(mockExec).toHaveBeenCalledTimes(2) // npm check + brew check
    })

    it('should return false when npm view fails', async () => {
      // Arrange - First call for current version
      mockExec.mockResolvedValueOnce({
        exitCode: 0,
        stdout: `
/usr/local/lib
├── @openai/codex@1.0.0
        `.trim(),
        stderr: '',
      })

      // Second call fails
      mockExec.mockRejectedValueOnce(new Error('network error'))

      // Act
      const { checkCodexUpdate } = await import('../../../../src/utils/code-tools/codex')
      const result = await checkCodexUpdate()

      // Assert
      expect(result).toEqual({
        installed: false,
        currentVersion: null,
        latestVersion: null,
        needsUpdate: false,
      })
    })

    it('should handle version comparison edge cases', async () => {
      // Arrange - First call for current version
      mockExec.mockResolvedValueOnce({
        exitCode: 0,
        stdout: `
/usr/local/lib
├── @openai/codex@1.0.0-beta.1
        `.trim(),
        stderr: '',
      })

      // Second call for latest version
      mockExec.mockResolvedValueOnce({
        exitCode: 0,
        stdout: JSON.stringify({
          'dist-tags': {
            latest: '1.0.0',
          },
        }),
        stderr: '',
      })

      // Act
      const { checkCodexUpdate } = await import('../../../../src/utils/code-tools/codex')
      const result = await checkCodexUpdate()

      // Assert
      expect(result).toEqual({
        installed: true,
        currentVersion: '1.0.0-beta.1',
        latestVersion: '1.0.0',
        needsUpdate: true, // Beta should be considered older than stable
      })
    })
  })

  describe('installCodexCli (updated with checks)', () => {
    it('should skip installation when codex is already installed', async () => {
      // Arrange - Mock isCodexInstalled to return true first, then normal output for subsequent calls
      mockExec
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: `
/usr/local/lib
├── @openai/codex@1.0.0
└── other-package@1.0.0
          `.trim(),
          stderr: '',
        })

      // Act
      const { installCodexCli } = await import('../../../../src/utils/code-tools/codex')
      await installCodexCli()

      // Assert
      expect(mockExec).toHaveBeenCalledWith('npm', ['list', '-g', '--depth=0'])
      expect(mockedInstallCodex).not.toHaveBeenCalled()
    })

    it('should install codex when not already installed', async () => {
      // Arrange - Mock isCodexInstalled to return false (no codex in output)
      mockExec
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: `
/usr/local/lib
└── other-package@1.0.0
          `.trim(),
          stderr: '',
        })
        // Mock Homebrew check (also fails)
        .mockResolvedValueOnce({
          exitCode: 1,
          stdout: '',
          stderr: 'Error: No available formula with the name "codex"',
        })

      // Act
      const { installCodexCli } = await import('../../../../src/utils/code-tools/codex')
      await installCodexCli()

      // Assert
      expect(mockExec).toHaveBeenCalledWith('npm', ['list', '-g', '--depth=0'])
      expect(mockedInstallCodex).toHaveBeenCalledWith(false)
    })

    it('should pass skipMethodSelection flag to installCodex when requested', async () => {
      mockExec.mockResolvedValueOnce({
        exitCode: 0,
        stdout: `
/usr/local/lib
└── other-package@1.0.0
        `.trim(),
        stderr: '',
      })
      // Mock Homebrew check (fails)
      mockExec.mockResolvedValueOnce({
        exitCode: 1,
        stdout: '',
        stderr: 'Error: No available formula with the name "codex"',
      })

      const { installCodexCli } = await import('../../../../src/utils/code-tools/codex')
      await installCodexCli(true)

      expect(mockExec).toHaveBeenCalledWith('npm', ['list', '-g', '--depth=0'])
      expect(mockedInstallCodex).toHaveBeenCalledWith(true)
    })

    it('should check for updates when already installed and update if available', async () => {
      // Arrange - Mock isCodexInstalled to return true
      mockExec
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: `
/usr/local/lib
├── @openai/codex@1.0.0
└── other-package@1.0.0
          `.trim(),
          stderr: '',
        })
        // Mock getCodexVersion (inside checkCodexUpdate)
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: `
/usr/local/lib
├── @openai/codex@1.0.0
          `.trim(),
          stderr: '',
        })
        // Mock npm view for latest version
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: JSON.stringify({
            'dist-tags': {
              latest: '1.1.0',
            },
          }),
          stderr: '',
        })
        // Mock detectCodexInstallMethod - brew check (fails)
        .mockResolvedValueOnce({
          exitCode: 1,
          stdout: '',
          stderr: 'Error: No available formula with the name "codex"',
        })
        // Mock detectCodexInstallMethod - npm check (succeeds)
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: '/usr/local/lib\n└── @openai/codex@1.0.0',
          stderr: '',
        })
        // Mock the actual update installation
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: 'updated successfully',
          stderr: '',
        })

      // Act
      const { installCodexCli } = await import('../../../../src/utils/code-tools/codex')
      await installCodexCli()

      // Assert
      expect(mockExec).toHaveBeenCalledWith('npm', ['list', '-g', '--depth=0'])
      expect(mockExec).toHaveBeenCalledWith('npm', ['view', '@openai/codex', '--json'])
      expect(mockExec).toHaveBeenCalledWith('npm', ['install', '-g', '@openai/codex@latest'])
      expect(mockedInstallCodex).not.toHaveBeenCalled()
    })

    it('should surface errors when the update command exits with a failure code', async () => {
      mockExec
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: `
/usr/local/lib
├── @openai/codex@1.0.0
└── other-package@1.0.0
          `.trim(),
          stderr: '',
        })
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: `
/usr/local/lib
├── @openai/codex@1.0.0
          `.trim(),
          stderr: '',
        })
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: JSON.stringify({
            'dist-tags': { latest: '1.1.0' },
          }),
          stderr: '',
        })
        // Mock detectCodexInstallMethod - brew check (fails)
        .mockResolvedValueOnce({
          exitCode: 1,
          stdout: '',
          stderr: 'Error: No available formula with the name "codex"',
        })
        // Mock detectCodexInstallMethod - npm check (succeeds)
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: '/usr/local/lib\n└── @openai/codex@1.0.0',
          stderr: '',
        })
        // Mock actual update command (fails)
        .mockResolvedValueOnce({
          exitCode: 1,
          stdout: '',
          stderr: 'permission denied',
        })

      const { installCodexCli } = await import('../../../../src/utils/code-tools/codex')

      await expect(installCodexCli()).rejects.toThrow('Failed to update codex CLI: exit code 1')
      expect(mockedInstallCodex).not.toHaveBeenCalled()
    })

    it('should skip when already installed and no updates available', async () => {
      // Arrange - Mock isCodexInstalled to return true
      mockExec
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: `
/usr/local/lib
├── @openai/codex@1.1.0
└── other-package@1.0.0
          `.trim(),
          stderr: '',
        })
        // Mock getCodexVersion (inside checkCodexUpdate)
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: `
/usr/local/lib
├── @openai/codex@1.1.0
          `.trim(),
          stderr: '',
        })
        // Mock npm view for latest version (same as current)
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: JSON.stringify({
            'dist-tags': {
              latest: '1.1.0',
            },
          }),
          stderr: '',
        })

      // Act
      const { installCodexCli } = await import('../../../../src/utils/code-tools/codex')
      await installCodexCli()

      // Assert
      expect(mockExec).toHaveBeenCalledWith('npm', ['list', '-g', '--depth=0'])
      expect(mockExec).toHaveBeenCalledWith('npm', ['view', '@openai/codex', '--json'])
      // Should NOT call install when no update is needed
      expect(mockExec).not.toHaveBeenCalledWith('npm', ['install', '-g', '@openai/codex@latest'])
      expect(mockedInstallCodex).not.toHaveBeenCalled()
    })

    it('should update via Homebrew when detected', async () => {
      // Arrange - Mock isCodexInstalled to return true
      mockExec
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: `
/usr/local/lib
├── @openai/codex@1.0.0
└── other-package@1.0.0
          `.trim(),
          stderr: '',
        })
        // Mock getCodexVersion (inside checkCodexUpdate)
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: `
/usr/local/lib
├── @openai/codex@1.0.0
          `.trim(),
          stderr: '',
        })
        // Mock npm view for latest version
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: JSON.stringify({
            'dist-tags': {
              latest: '1.1.0',
            },
          }),
          stderr: '',
        })
        // Mock detectCodexInstallMethod - brew check (succeeds)
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: 'codex 1.0.0',
          stderr: '',
        })
        // Mock Homebrew upgrade
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: 'upgraded successfully',
          stderr: '',
        })

      // Act
      const { installCodexCli } = await import('../../../../src/utils/code-tools/codex')
      await installCodexCli()

      // Assert
      expect(mockExec).toHaveBeenCalledWith('brew', ['list', '--cask', 'codex'], expect.objectContaining({ throwOnError: false }))
      expect(mockExec).toHaveBeenCalledWith('brew', ['upgrade', '--cask', 'codex'])
      expect(mockedInstallCodex).not.toHaveBeenCalled()
    })

    it('should handle Homebrew upgrade failure', async () => {
      // Arrange
      mockExec
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: '/usr/local/lib\n├── @openai/codex@1.0.0',
          stderr: '',
        })
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: '/usr/local/lib\n├── @openai/codex@1.0.0',
          stderr: '',
        })
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: JSON.stringify({ 'dist-tags': { latest: '1.1.0' } }),
          stderr: '',
        })
        // Mock detectCodexInstallMethod - brew check (succeeds)
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: 'codex 1.0.0',
          stderr: '',
        })
        // Mock Homebrew upgrade (fails)
        .mockResolvedValueOnce({
          exitCode: 1,
          stdout: '',
          stderr: 'permission denied',
        })

      const { installCodexCli } = await import('../../../../src/utils/code-tools/codex')

      await expect(installCodexCli()).rejects.toThrow('Failed to update codex via Homebrew: exit code 1')
    })

    it('should fallback to npm when install method is unknown', async () => {
      // Arrange
      mockExec
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: '/usr/local/lib\n├── @openai/codex@1.0.0',
          stderr: '',
        })
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: '/usr/local/lib\n├── @openai/codex@1.0.0',
          stderr: '',
        })
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: JSON.stringify({ 'dist-tags': { latest: '1.1.0' } }),
          stderr: '',
        })
        // Mock detectCodexInstallMethod - brew check (fails)
        .mockResolvedValueOnce({
          exitCode: 1,
          stdout: '',
          stderr: 'brew not found',
        })
        // Mock detectCodexInstallMethod - npm check (fails)
        .mockResolvedValueOnce({
          exitCode: 1,
          stdout: '',
          stderr: 'not found',
        })
        // Mock npm install (fallback)
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: 'installed successfully',
          stderr: '',
        })

      // Act
      const { installCodexCli } = await import('../../../../src/utils/code-tools/codex')
      await installCodexCli()

      // Assert - Should fallback to npm install
      expect(mockExec).toHaveBeenCalledWith('npm', ['install', '-g', '@openai/codex@latest'])
    })

    it('should use sudo when needed for npm install', async () => {
      // Mock platform to return Linux (needs sudo)
      vi.mocked(platform.getPlatform).mockReturnValue('linux')
      vi.mocked(platform.shouldUseSudoForGlobalInstall).mockReturnValue(true)

      mockExec
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: '/usr/lib\n├── @openai/codex@1.0.0',
          stderr: '',
        })
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: '/usr/lib\n├── @openai/codex@1.0.0',
          stderr: '',
        })
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: JSON.stringify({ 'dist-tags': { latest: '1.1.0' } }),
          stderr: '',
        })
        // Mock detectCodexInstallMethod - brew check (fails)
        .mockResolvedValueOnce({
          exitCode: 1,
          stdout: '',
          stderr: '',
        })
        // Mock detectCodexInstallMethod - npm check (succeeds)
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: '/usr/lib\n└── @openai/codex@1.0.0',
          stderr: '',
        })
        // Mock sudo npm install
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: 'installed successfully',
          stderr: '',
        })

      const { installCodexCli } = await import('../../../../src/utils/code-tools/codex')
      await installCodexCli()

      // Assert - Should use sudo
      expect(mockExec).toHaveBeenCalledWith('sudo', ['npm', 'install', '-g', '@openai/codex@latest'])

      // Restore platform mock
      vi.mocked(platform.getPlatform).mockReturnValue('macos')
      vi.mocked(platform.shouldUseSudoForGlobalInstall).mockReturnValue(false)
    })

    it('should handle unknown install method fallback with sudo', async () => {
      // Mock platform to return Linux (needs sudo)
      vi.mocked(platform.getPlatform).mockReturnValue('linux')
      vi.mocked(platform.shouldUseSudoForGlobalInstall).mockReturnValue(true)

      mockExec
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: '/usr/lib\n├── @openai/codex@1.0.0',
          stderr: '',
        })
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: '/usr/lib\n├── @openai/codex@1.0.0',
          stderr: '',
        })
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: JSON.stringify({ 'dist-tags': { latest: '1.1.0' } }),
          stderr: '',
        })
        // Mock detectCodexInstallMethod - brew check (fails)
        .mockResolvedValueOnce({
          exitCode: 1,
          stdout: '',
          stderr: '',
        })
        // Mock detectCodexInstallMethod - npm check (fails - unknown method)
        .mockResolvedValueOnce({
          exitCode: 1,
          stdout: '',
          stderr: '',
        })
        // Mock sudo npm install (fallback)
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: 'installed successfully',
          stderr: '',
        })

      const { installCodexCli } = await import('../../../../src/utils/code-tools/codex')
      await installCodexCli()

      // Assert - Should use sudo for fallback
      expect(mockExec).toHaveBeenCalledWith('sudo', ['npm', 'install', '-g', '@openai/codex@latest'])

      // Restore platform mock
      vi.mocked(platform.getPlatform).mockReturnValue('macos')
      vi.mocked(platform.shouldUseSudoForGlobalInstall).mockReturnValue(false)
    })
  })
})
