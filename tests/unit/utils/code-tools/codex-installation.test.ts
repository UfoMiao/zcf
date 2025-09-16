import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock dependencies
vi.mock('tinyexec')
vi.mock('../../i18n')

const mockExec = vi.fn()
vi.mocked(vi.doMock('tinyexec', () => ({
  x: mockExec,
})))

describe('codex installation checks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isCodexInstalled', () => {
    it('should return true when codex is installed globally', async () => {
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
      const { isCodexInstalled } = await import('../../../../src/utils/code-tools/codex')
      const result = await isCodexInstalled()

      // Assert
      expect(result).toBe(false)
    })

    it('should return false when npm command fails', async () => {
      // Arrange
      mockExec.mockRejectedValueOnce(new Error('npm not found'))

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

      // Act
      const { isCodexInstalled } = await import('../../../../src/utils/code-tools/codex')
      const result = await isCodexInstalled()

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('getCodexVersion', () => {
    it('should return version when codex is installed', async () => {
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

    it('should return null when codex is not installed', async () => {
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
      const { getCodexVersion } = await import('../../../../src/utils/code-tools/codex')
      const result = await getCodexVersion()

      // Assert
      expect(result).toBeNull()
    })

    it('should handle parsing errors gracefully', async () => {
      // Arrange
      mockExec.mockResolvedValueOnce({
        exitCode: 0,
        stdout: 'invalid output format',
        stderr: '',
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
      expect(result).toBe(true)
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
      expect(result).toBe(false)
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
      expect(result).toBe(false)
      expect(mockExec).toHaveBeenCalledTimes(1) // Should not check npm view if not installed
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
      expect(result).toBe(false)
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
      expect(result).toBe(true) // Beta should be considered older than stable
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
      expect(mockExec).not.toHaveBeenCalledWith('npm', ['install', '-g', '@openai/codex'])
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
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: 'installed successfully',
          stderr: '',
        })

      // Act
      const { installCodexCli } = await import('../../../../src/utils/code-tools/codex')
      await installCodexCli()

      // Assert
      expect(mockExec).toHaveBeenCalledWith('npm', ['list', '-g', '--depth=0'])
      expect(mockExec).toHaveBeenCalledWith('npm', ['install', '-g', '@openai/codex'])
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
      expect(mockExec).toHaveBeenCalledWith('npm', ['install', '-g', '@openai/codex'])
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
      expect(mockExec).not.toHaveBeenCalledWith('npm', ['install', '-g', '@openai/codex'])
    })
  })
})
