import * as fs from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { copyDir } from '../../../src/utils/fs-operations'

vi.mock('node:fs')

describe('final push for 90% branch coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle recursive directory copy', () => {
    // Mock for source directory check
    vi.mocked(fs.existsSync)
      .mockReturnValueOnce(true) // source exists
      .mockReturnValueOnce(false) // dest doesn't exist
      .mockReturnValueOnce(true) // recursive call: source/subdir exists
      .mockReturnValueOnce(false) // recursive call: dest/subdir doesn't exist

    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined)
    vi.mocked(fs.readdirSync)
      .mockReturnValueOnce(['subdir'] as any)
      .mockReturnValueOnce([] as any) // subdir is empty
    vi.mocked(fs.statSync).mockReturnValue({
      isDirectory: () => true,
      isFile: () => false,
    } as any)
    vi.mocked(fs.copyFileSync).mockImplementation(() => undefined)

    copyDir('/source', '/dest')

    // Should have created dest dir
    expect(fs.mkdirSync).toHaveBeenCalledWith('/dest', { recursive: true })
    expect(fs.mkdirSync).toHaveBeenCalledWith('/dest/subdir', { recursive: true })
  })

  it('should handle directory with both files and subdirectories', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined)
    vi.mocked(fs.readdirSync)
      .mockReturnValueOnce(['file.txt', 'subdir'] as any)
      .mockReturnValueOnce([] as any) // subdir is empty

    let statCallCount = 0
    vi.mocked(fs.statSync).mockImplementation(() => {
      statCallCount++
      return {
        isDirectory: () => statCallCount === 2, // second call is for subdir
        isFile: () => statCallCount === 1, // first call is for file
      } as any
    })

    vi.mocked(fs.copyFileSync).mockImplementation(() => undefined)

    copyDir('/source', '/dest')

    expect(fs.copyFileSync).toHaveBeenCalledWith('/source/file.txt', '/dest/file.txt')
  })
})
