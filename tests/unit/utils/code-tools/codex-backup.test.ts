import { homedir } from 'node:os'
import { join } from 'pathe'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock dependencies
vi.mock('../../../../src/i18n')
vi.mock('../../../../src/utils/fs-operations')
vi.mock('dayjs', () => ({
  default: () => ({
    format: vi.fn(() => '2024-01-01_14-30-00'),
  }),
}))

// Create mocks
const mockExists = vi.fn()
const mockEnsureDir = vi.fn()
const mockCopyDir = vi.fn()
const mockCopyFile = vi.fn()

vi.mocked(vi.doMock('../../../../src/utils/fs-operations', () => ({
  exists: mockExists,
  ensureDir: mockEnsureDir,
  copyDir: mockCopyDir,
  copyFile: mockCopyFile,
})))

describe('codex backup mechanism', () => {
  const CODEX_DIR = join(homedir(), '.codex')
  const BACKUP_BASE_DIR = join(CODEX_DIR, 'backup')

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset default mock implementations
    mockExists.mockReturnValue(true)
    mockEnsureDir.mockImplementation(() => {}) // Don't throw by default
    mockCopyDir.mockImplementation(() => {})
    mockCopyFile.mockImplementation(() => {})
  })

  describe('backupCodexFiles', () => {
    it('should create backup with timestamp when .codex directory exists', async () => {
      // Arrange
      mockExists.mockReturnValue(true)

      // Act
      const { backupCodexFiles } = await import('../../../../src/utils/code-tools/codex')
      const result = backupCodexFiles()

      // Assert
      const expectedBackupDir = join(BACKUP_BASE_DIR, 'backup_2024-01-01_14-30-00')
      expect(result).toBe(expectedBackupDir)
      expect(mockEnsureDir).toHaveBeenCalledWith(expectedBackupDir)
      expect(mockCopyDir).toHaveBeenCalledWith(
        CODEX_DIR,
        expectedBackupDir,
        expect.objectContaining({
          filter: expect.any(Function),
        }),
      )
    })

    it('should return null when .codex directory does not exist', async () => {
      // Arrange
      mockExists.mockReturnValue(false)

      // Act
      const { backupCodexFiles } = await import('../../../../src/utils/code-tools/codex')
      const result = backupCodexFiles()

      // Assert
      expect(result).toBeNull()
      expect(mockEnsureDir).not.toHaveBeenCalled()
      expect(mockCopyDir).not.toHaveBeenCalled()
    })

    it('should filter out backup directory when copying', async () => {
      // Arrange
      mockExists.mockReturnValue(true)
      let filterFunction: ((path: string) => boolean) | undefined

      mockCopyDir.mockImplementation((_src, _dest, options) => {
        filterFunction = options?.filter
      })

      // Act
      const { backupCodexFiles } = await import('../../../../src/utils/code-tools/codex')
      backupCodexFiles()

      // Assert
      expect(filterFunction).toBeDefined()
      if (filterFunction) {
        expect(filterFunction('/home/user/.codex/config.toml')).toBe(true)
        expect(filterFunction('/home/user/.codex/backup/old-backup')).toBe(false)
        expect(filterFunction('/home/user/.codex/some/backup/nested')).toBe(false)
      }
    })

    it('should handle copy errors gracefully', async () => {
      // Arrange
      mockExists.mockReturnValue(true)
      mockCopyDir.mockImplementation(() => {
        throw new Error('Copy failed')
      })

      // Act & Assert
      const { backupCodexFiles } = await import('../../../../src/utils/code-tools/codex')
      expect(() => backupCodexFiles()).toThrow('Copy failed')
    })
  })

  describe('createBackupDirectory', () => {
    it('should create backup directory with given timestamp', async () => {
      // Act
      const { createBackupDirectory } = await import('../../../../src/utils/code-tools/codex')
      const result = createBackupDirectory('2024-12-25_09-15-30')

      // Assert
      const expectedPath = join(BACKUP_BASE_DIR, 'backup_2024-12-25_09-15-30')
      expect(result).toBe(expectedPath)
      expect(mockEnsureDir).toHaveBeenCalledWith(expectedPath)
    })

    it('should handle directory creation errors', async () => {
      // Arrange
      mockEnsureDir.mockImplementation(() => {
        throw new Error('Permission denied')
      })

      // Act & Assert
      const { createBackupDirectory } = await import('../../../../src/utils/code-tools/codex')
      expect(() => createBackupDirectory('2024-12-25_09-15-30')).toThrow('Permission denied')
    })
  })

  describe('backupCodexConfig (modified)', () => {
    it('should backup config file to new backup directory format', async () => {
      // Arrange
      const configFile = join(CODEX_DIR, 'config.toml')
      mockExists.mockReturnValue(true)

      // Act
      const { backupCodexConfig } = await import('../../../../src/utils/code-tools/codex')
      const result = backupCodexConfig()

      // Assert
      const expectedBackupPath = join(BACKUP_BASE_DIR, 'backup_2024-01-01_14-30-00', 'config.toml')
      expect(result).toBe(expectedBackupPath)
      expect(mockEnsureDir).toHaveBeenCalled()
      expect(mockCopyFile).toHaveBeenCalledWith(configFile, expectedBackupPath)
    })

    it('should return null when config file does not exist', async () => {
      // Arrange
      mockExists.mockReturnValue(false)

      // Act
      const { backupCodexConfig } = await import('../../../../src/utils/code-tools/codex')
      const result = backupCodexConfig()

      // Assert
      expect(result).toBeNull()
      expect(mockCopyFile).not.toHaveBeenCalled()
    })
  })

  describe('backupCodexAgents', () => {
    it('should backup AGENTS.md file to backup directory', async () => {
      // Arrange
      const agentsFile = join(CODEX_DIR, 'AGENTS.md')
      mockExists.mockReturnValue(true)

      // Act
      const { backupCodexAgents } = await import('../../../../src/utils/code-tools/codex')
      const result = backupCodexAgents()

      // Assert
      const expectedBackupPath = join(BACKUP_BASE_DIR, 'backup_2024-01-01_14-30-00', 'AGENTS.md')
      expect(result).toBe(expectedBackupPath)
      expect(mockEnsureDir).toHaveBeenCalled()
      expect(mockCopyFile).toHaveBeenCalledWith(agentsFile, expectedBackupPath)
    })

    it('should return null when AGENTS.md does not exist', async () => {
      // Arrange
      mockExists.mockReturnValue(false)

      // Act
      const { backupCodexAgents } = await import('../../../../src/utils/code-tools/codex')
      const result = backupCodexAgents()

      // Assert
      expect(result).toBeNull()
      expect(mockCopyFile).not.toHaveBeenCalled()
    })
  })

  describe('backupCodexPrompts', () => {
    it('should backup prompts directory to backup directory', async () => {
      // Arrange
      const promptsDir = join(CODEX_DIR, 'prompts')
      mockExists.mockReturnValue(true)

      // Act
      const { backupCodexPrompts } = await import('../../../../src/utils/code-tools/codex')
      const result = backupCodexPrompts()

      // Assert
      const expectedBackupPath = join(BACKUP_BASE_DIR, 'backup_2024-01-01_14-30-00', 'prompts')
      expect(result).toBe(expectedBackupPath)
      expect(mockEnsureDir).toHaveBeenCalled()
      expect(mockCopyDir).toHaveBeenCalledWith(promptsDir, expectedBackupPath)
    })

    it('should return null when prompts directory does not exist', async () => {
      // Arrange
      mockExists.mockReturnValue(false)

      // Act
      const { backupCodexPrompts } = await import('../../../../src/utils/code-tools/codex')
      const result = backupCodexPrompts()

      // Assert
      expect(result).toBeNull()
      expect(mockCopyDir).not.toHaveBeenCalled()
    })

    it('should handle directory copy errors gracefully', async () => {
      // Arrange
      mockExists.mockReturnValue(true)
      mockCopyDir.mockImplementation(() => {
        throw new Error('Directory copy failed')
      })

      // Act
      const { backupCodexPrompts } = await import('../../../../src/utils/code-tools/codex')
      const result = backupCodexPrompts()

      // Assert - Should return null when copy fails
      expect(result).toBeNull()
    })
  })

  describe('getBackupMessage', () => {
    it('should return i18n formatted backup message', async () => {
      // Reset modules to ensure fresh import
      vi.resetModules()

      // Mock i18n properly before import
      const mockI18n = {
        t: vi.fn((key: string, options?: any) => {
          if (key === 'codex:backupSuccess' && options?.path) {
            return `✔ Backup created at ${options.path}`
          }
          return `mocked_${key}`
        }),
      }

      vi.doMock('../../../../src/i18n', () => ({
        ensureI18nInitialized: vi.fn(),
        i18n: mockI18n,
      }))

      // Act
      const { getBackupMessage } = await import('../../../../src/utils/code-tools/codex')
      const result = getBackupMessage('/path/to/backup')

      // Assert
      expect(mockI18n.t).toHaveBeenCalledWith('codex:backupSuccess', { path: '/path/to/backup' })
      expect(result).toBe('✔ Backup created at /path/to/backup')
    })

    it('should handle null path gracefully', async () => {
      // Act
      const { getBackupMessage } = await import('../../../../src/utils/code-tools/codex')
      const result = getBackupMessage(null)

      // Assert
      expect(result).toBe('')
    })
  })
})
