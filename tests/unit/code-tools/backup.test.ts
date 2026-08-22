import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTimestampedBackup } from '../../../src/code-tools/backup'
import { copyFile, ensureDir, exists } from '../../../src/utils/fs-operations'

vi.mock('../../../src/utils/fs-operations', () => ({
  copyFile: vi.fn(),
  ensureDir: vi.fn(),
  exists: vi.fn(),
}))

describe('createTimestampedBackup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses a cross-platform basename for Windows paths', () => {
    vi.mocked(exists).mockReturnValue(true)
    const file = {
      id: 'settings',
      path: 'C:\\Users\\mia\\.claude\\settings.json',
      format: 'json' as const,
      mergeStrategy: 'merge' as const,
    }

    const backupPath = createTimestampedBackup(file, 'C:\\Users\\mia\\.claude')

    expect(backupPath).toMatch(/\/backup\/settings\.json\.backup_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/)
    expect(ensureDir).toHaveBeenCalledWith('C:/Users/mia/.claude/backup')
    expect(copyFile).toHaveBeenCalledWith(file.path, backupPath)
  })

  it('does nothing when the source file does not exist', () => {
    vi.mocked(exists).mockReturnValue(false)

    expect(createTimestampedBackup({
      id: 'settings',
      path: '/tmp/settings.json',
      format: 'json',
      mergeStrategy: 'merge',
    }, '/tmp/tool')).toBeNull()
    expect(copyFile).not.toHaveBeenCalled()
  })
})
