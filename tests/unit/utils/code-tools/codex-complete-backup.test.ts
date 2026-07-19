import { join } from 'pathe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CODEX_AGENTS_FILE, CODEX_AUTH_FILE, CODEX_CONFIG_FILE, CODEX_DIR, CODEX_PROMPTS_DIR } from '../../../../src/constants'

// Mock all external dependencies
vi.mock('../../../../src/utils/fs-operations', () => ({
  copyDir: vi.fn(),
  copyFile: vi.fn(),
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
const mockedCopyFile = vi.mocked(mockedFsOps.copyFile)
const mockedEnsureDir = vi.mocked(mockedFsOps.ensureDir)

const { backupCodexComplete, backupCodexTargets } = await import('../../../../src/utils/code-tools/codex')

describe('backupCodexTargets', () => {
  const expectedTimestamp = '2024-01-01_12-00-00'
  const expectedBackupDir = join(CODEX_DIR, 'backup', `backup_${expectedTimestamp}`)

  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.ZCF_CODEX_SKIP_PROMPT_SINGLE_BACKUP

    vi.mocked(mockedDayjs).mockReturnValue({
      format: vi.fn().mockReturnValue(expectedTimestamp),
    } as any)
  })

  it('should backup only requested config and auth files', () => {
    mockedExists.mockImplementation((path: string) => {
      return path === CODEX_CONFIG_FILE || path === CODEX_AUTH_FILE
    })
    mockedCopyFile.mockImplementation(() => {})
    mockedEnsureDir.mockImplementation(() => {})

    const result = backupCodexTargets(['config', 'auth'])

    expect(mockedCopyFile).toHaveBeenCalledWith(CODEX_CONFIG_FILE, join(expectedBackupDir, 'config.toml'))
    expect(mockedCopyFile).toHaveBeenCalledWith(CODEX_AUTH_FILE, join(expectedBackupDir, 'auth.json'))
    expect(mockedCopyDir).not.toHaveBeenCalled()
    expect(result).toBe(join(expectedBackupDir, 'config.toml'))
  })

  it('should backup agents and prompts directories when requested', () => {
    mockedExists.mockImplementation((path: string) => {
      return path === CODEX_AGENTS_FILE || path === CODEX_PROMPTS_DIR
    })
    mockedCopyFile.mockImplementation(() => {})
    mockedCopyDir.mockImplementation(() => {})
    mockedEnsureDir.mockImplementation(() => {})

    const result = backupCodexTargets(['agents', 'prompts'])

    expect(mockedCopyFile).toHaveBeenCalledWith(CODEX_AGENTS_FILE, join(expectedBackupDir, 'AGENTS.md'))
    expect(mockedCopyDir).toHaveBeenCalledWith(CODEX_PROMPTS_DIR, join(expectedBackupDir, 'prompts'))
    expect(result).toBe(join(expectedBackupDir, 'AGENTS.md'))
  })

  it('should return null when no target files exist', () => {
    mockedExists.mockImplementation(() => false)

    const result = backupCodexTargets(['config', 'auth'])

    expect(result).toBeNull()
    expect(mockedCopyFile).not.toHaveBeenCalled()
    expect(mockedCopyDir).not.toHaveBeenCalled()
  })

  it('should reuse backup directory in skip-prompt mode', () => {
    process.env.ZCF_CODEX_SKIP_PROMPT_SINGLE_BACKUP = 'true'
    mockedExists.mockImplementation((path: string) => path === CODEX_CONFIG_FILE || path === CODEX_AUTH_FILE)
    mockedCopyFile.mockImplementation(() => {})
    mockedEnsureDir.mockImplementation(() => {})

    backupCodexTargets(['config'])
    backupCodexTargets(['auth'])

    expect(mockedEnsureDir).toHaveBeenCalledTimes(1)
    expect(mockedCopyFile).toHaveBeenCalledTimes(2)
  })

  it('backupCodexComplete should include all known codex targets', () => {
    mockedExists.mockImplementation(() => true)
    mockedCopyFile.mockImplementation(() => {})
    mockedCopyDir.mockImplementation(() => {})
    mockedEnsureDir.mockImplementation(() => {})

    backupCodexComplete()

    expect(mockedCopyFile).toHaveBeenCalledWith(CODEX_CONFIG_FILE, join(expectedBackupDir, 'config.toml'))
    expect(mockedCopyFile).toHaveBeenCalledWith(CODEX_AUTH_FILE, join(expectedBackupDir, 'auth.json'))
    expect(mockedCopyFile).toHaveBeenCalledWith(CODEX_AGENTS_FILE, join(expectedBackupDir, 'AGENTS.md'))
    expect(mockedCopyDir).toHaveBeenCalledWith(CODEX_PROMPTS_DIR, join(expectedBackupDir, 'prompts'))
  })
})
