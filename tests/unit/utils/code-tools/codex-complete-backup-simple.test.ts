import { describe, expect, it, vi } from 'vitest'
import { backupCodexComplete } from '../../../../src/utils/code-tools/codex'

// Mock all file system operations completely
vi.mock('../../../../src/utils/fs-operations', () => ({
  exists: vi.fn(() => true), // Default: directory exists
  ensureDir: vi.fn(),
  copyDir: vi.fn(),
  copyFile: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}))

// Mock dayjs for consistent timestamp
vi.mock('dayjs', () => ({
  default: vi.fn(() => ({
    format: vi.fn(() => '2024-01-01_12-00-00'),
  })),
}))

describe('backupCodexComplete - Simple Integration Test', () => {
  it('should be a function', () => {
    expect(typeof backupCodexComplete).toBe('function')
  })

  it('should return string path when successful', async () => {
    const result = backupCodexComplete()
    expect(typeof result).toBe('string')
    expect(result).toContain('backup_2024-01-01_12-00-00')
  })
})
