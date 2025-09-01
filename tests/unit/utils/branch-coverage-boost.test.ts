import * as fs from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { copyDir } from '../../../src/utils/fs-operations'

// Mock fs module
vi.mock('node:fs')

describe('branch coverage boost tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should apply filter function when provided', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined)
    vi.mocked(fs.readdirSync).mockReturnValue(['file1.txt', 'file2.js'] as any)
    vi.mocked(fs.statSync).mockReturnValue({
      isDirectory: () => false,
      isFile: () => true,
    } as any)
    vi.mocked(fs.copyFileSync).mockImplementation(() => {})

    // Filter that only allows .js files
    const filter = (path: string) => path.endsWith('.js')

    copyDir('/source', '/dest', { filter })

    // Should only copy file2.js
    expect(fs.copyFileSync).toHaveBeenCalledTimes(1)
    expect(fs.copyFileSync).toHaveBeenCalledWith('/source/file2.js', '/dest/file2.js')
  })
})
