import { join } from 'pathe'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock all external dependencies
vi.mock('../../../../src/utils/fs-operations', () => ({
  copyDir: vi.fn(),
  ensureDir: vi.fn(),
  exists: vi.fn(),
}))

vi.mock('dayjs', () => ({
  default: vi.fn(() => ({
    format: vi.fn(() => '2024-01-01_12-00-00'),
  })),
}))

const mockedFsOps = await import('../../../../src/utils/fs-operations')
const mockedDayjs = (await import('dayjs')).default

const mockedExists = vi.mocked(mockedFsOps.exists)
const mockedCopyDir = vi.mocked(mockedFsOps.copyDir)
const mockedEnsureDir = vi.mocked(mockedFsOps.ensureDir)

// Import the functions to test after mocks are set up
const { backupCodexComplete, CODEX_DIR } = await import('../../../../src/utils/code-tools/codex')

describe('backupCodexComplete', () => {
  const expectedTimestamp = '2024-01-01_12-00-00'
  const expectedBackupDir = join(CODEX_DIR, 'backup', `backup_${expectedTimestamp}`)

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup dayjs mock to return consistent timestamp
    vi.mocked(mockedDayjs).mockReturnValue({
      format: vi.fn().mockReturnValue(expectedTimestamp),
    } as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should backup complete codex directory with timestamp', async () => {
    // Arrange
    mockedExists.mockImplementation(() => true)
    mockedCopyDir.mockImplementation(() => {})
    mockedEnsureDir.mockImplementation(() => {})

    // Act
    const result = backupCodexComplete()

    // Assert - Test core behavior
    expect(mockedExists).toHaveBeenCalledWith(CODEX_DIR)
    expect(mockedEnsureDir).toHaveBeenCalled() // createBackupDirectory calls ensureDir
    expect(mockedCopyDir).toHaveBeenCalledWith(
      CODEX_DIR,
      expectedBackupDir,
      expect.objectContaining({
        filter: expect.any(Function),
      }),
    )
    expect(result).toBe(expectedBackupDir)
  })

  it('should exclude backup directory from backup using filter', async () => {
    // Arrange
    mockedExists.mockImplementation(() => true)
    mockedCopyDir.mockImplementation(() => {})
    mockedEnsureDir.mockImplementation(() => {})

    // Act
    backupCodexComplete()

    // Assert - Check filter function excludes backup paths
    expect(mockedCopyDir).toHaveBeenCalled()
    const copyDirCall = mockedCopyDir.mock.calls[0]
    const options = copyDirCall[2] as any
    const filterFunction = options.filter

    // Test filter function
    expect(filterFunction('/some/path/file.txt')).toBe(true)
    expect(filterFunction('/some/path/backup/file.txt')).toBe(false)
    expect(filterFunction('/home/.codex/backup/old')).toBe(false)
    expect(filterFunction('/home/.codex/config.toml')).toBe(true)
  })

  it('should return backup path on success', async () => {
    // Arrange
    mockedExists.mockImplementation(() => true)
    mockedCopyDir.mockImplementation(() => {})
    mockedEnsureDir.mockImplementation(() => {})

    // Act
    const result = backupCodexComplete()

    // Assert
    expect(result).toBe(expectedBackupDir)
    expect(typeof result).toBe('string')
  })

  it('should return null when codex directory not exists', async () => {
    // Arrange
    mockedExists.mockImplementation(() => false)

    // Act
    const result = backupCodexComplete()

    // Assert
    expect(result).toBeNull()
    expect(mockedCopyDir).not.toHaveBeenCalled()
    expect(mockedEnsureDir).not.toHaveBeenCalled()
  })

  it('should handle backup creation errors gracefully', async () => {
    // Arrange
    mockedExists.mockImplementation(() => true)
    mockedEnsureDir.mockImplementation(() => {})
    mockedCopyDir.mockImplementation(() => {
      throw new Error('Permission denied')
    })

    // Act & Assert - Should throw the error since backupCodexFiles doesn't catch it
    expect(() => backupCodexComplete()).toThrow('Permission denied')
  })

  it('should handle directory creation errors gracefully', async () => {
    // Arrange
    mockedExists.mockImplementation(() => true)
    mockedEnsureDir.mockImplementation(() => {
      throw new Error('Disk full')
    })

    // Act & Assert - Should throw the error since backupCodexFiles doesn't catch it
    expect(() => backupCodexComplete()).toThrow('Disk full')
    expect(mockedCopyDir).not.toHaveBeenCalled()
  })

  it('should use correct timestamp format', async () => {
    // Arrange
    mockedExists.mockImplementation(() => true)
    mockedCopyDir.mockImplementation(() => {})
    mockedEnsureDir.mockImplementation(() => {})

    // Act
    backupCodexComplete()

    // Assert - Check dayjs format call
    expect(vi.mocked(mockedDayjs)).toHaveBeenCalled()
    const dayjsInstance = vi.mocked(mockedDayjs).mock.results[0].value
    expect(dayjsInstance.format).toHaveBeenCalledWith('YYYY-MM-DD_HH-mm-ss')
  })
})
