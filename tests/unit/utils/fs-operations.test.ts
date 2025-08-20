import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  copyDir,
  copyFile,
  ensureDir,
  ensureFileDir,
  exists,
  FileSystemError,
  readFile,
  writeFile,
} from '../../../src/utils/fs-operations'

vi.mock('node:fs')

describe('fs-operations utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fileSystemError', () => {
    it('should create error with message and path', () => {
      const error = new FileSystemError('Test error', '/test/path')

      expect(error.message).toBe('Test error')
      expect(error.path).toBe('/test/path')
      expect(error.name).toBe('FileSystemError')
    })

    it('should create error with cause', () => {
      const cause = new Error('Original error')
      const error = new FileSystemError('Test error', '/test/path', cause)

      expect(error.cause).toBe(cause)
    })
  })

  describe('exists', () => {
    it('should return true when path exists', () => {
      vi.mocked(existsSync).mockReturnValue(true)

      const result = exists('/test/path')

      expect(result).toBe(true)
      expect(existsSync).toHaveBeenCalledWith('/test/path')
    })

    it('should return false when path does not exist', () => {
      vi.mocked(existsSync).mockReturnValue(false)

      const result = exists('/test/path')

      expect(result).toBe(false)
    })
  })

  describe('ensureDir', () => {
    it('should create directory if it does not exist', () => {
      vi.mocked(existsSync).mockReturnValue(false)

      ensureDir('/test/dir')

      expect(mkdirSync).toHaveBeenCalledWith('/test/dir', { recursive: true })
    })

    it('should not create directory if it exists', () => {
      vi.mocked(existsSync).mockReturnValue(true)

      ensureDir('/test/dir')

      expect(mkdirSync).not.toHaveBeenCalled()
    })
  })

  describe('ensureFileDir', () => {
    it('should ensure parent directory exists', () => {
      vi.mocked(existsSync).mockReturnValue(false)

      ensureFileDir('/test/dir/file.txt')

      expect(mkdirSync).toHaveBeenCalledWith('/test/dir', { recursive: true })
    })
  })

  describe('readFile', () => {
    it('should read file content', () => {
      vi.mocked(readFileSync).mockReturnValue('file content')

      const result = readFile('/test/file.txt')

      expect(result).toBe('file content')
      expect(readFileSync).toHaveBeenCalledWith('/test/file.txt', 'utf-8')
    })

    it('should read file with custom encoding', () => {
      vi.mocked(readFileSync).mockReturnValue('file content')

      readFile('/test/file.txt', 'ascii')

      expect(readFileSync).toHaveBeenCalledWith('/test/file.txt', 'ascii')
    })

    it('should throw FileSystemError on read failure', () => {
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error('Read failed')
      })

      expect(() => readFile('/test/file.txt')).toThrow(FileSystemError)
      expect(() => readFile('/test/file.txt')).toThrow('Failed to read file')
    })
  })

  describe('writeFile', () => {
    it('should write file content', () => {
      vi.mocked(existsSync).mockReturnValue(true)

      writeFile('/test/file.txt', 'content')

      expect(writeFileSync).toHaveBeenCalledWith('/test/file.txt', 'content', 'utf-8')
    })

    it('should create parent directory if needed', () => {
      vi.mocked(existsSync).mockReturnValue(false)

      writeFile('/test/dir/file.txt', 'content')

      expect(mkdirSync).toHaveBeenCalled()
      expect(writeFileSync).toHaveBeenCalled()
    })

    it('should write with custom encoding', () => {
      vi.mocked(existsSync).mockReturnValue(true)

      writeFile('/test/file.txt', 'content', 'ascii')

      expect(writeFileSync).toHaveBeenCalledWith('/test/file.txt', 'content', 'ascii')
    })

    it('should throw FileSystemError on write failure', () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(writeFileSync).mockImplementation(() => {
        throw new Error('Write failed')
      })

      expect(() => writeFile('/test/file.txt', 'content')).toThrow(FileSystemError)
      expect(() => writeFile('/test/file.txt', 'content')).toThrow('Failed to write file')
    })
  })

  describe('copyFile', () => {
    it('should copy file', () => {
      vi.mocked(existsSync).mockReturnValue(true)

      copyFile('/source/file.txt', '/dest/file.txt')

      expect(copyFileSync).toHaveBeenCalledWith('/source/file.txt', '/dest/file.txt')
    })

    it('should create destination directory if needed', () => {
      vi.mocked(existsSync).mockReturnValue(false)

      copyFile('/source/file.txt', '/dest/dir/file.txt')

      expect(mkdirSync).toHaveBeenCalled()
      expect(copyFileSync).toHaveBeenCalled()
    })

    it('should throw FileSystemError on copy failure', () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFileSync).mockImplementation(() => {
        throw new Error('Copy failed')
      })

      expect(() => copyFile('/source/file.txt', '/dest/file.txt')).toThrow(FileSystemError)
      expect(() => copyFile('/source/file.txt', '/dest/file.txt')).toThrow('Failed to copy file')
    })
  })

  describe('copyDir', () => {
    it('should copy directory recursively', () => {
      const mockStats = { isDirectory: () => false, isFile: () => true }
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readdirSync).mockReturnValue(['file1.txt', 'file2.txt'] as any)
      vi.mocked(statSync).mockReturnValue(mockStats as any)

      copyDir('/source', '/dest')

      expect(copyFileSync).toHaveBeenCalledTimes(2)
    })

    it('should handle subdirectories', () => {
      const fileStats = { isDirectory: () => false, isFile: () => true }
      const dirStats = { isDirectory: () => true, isFile: () => false }

      // Mock existsSync - return false for dest/subdir so it gets created
      vi.mocked(existsSync)
        .mockReturnValueOnce(true) // /source exists
        .mockReturnValueOnce(false) // /dest doesn't exist initially
        .mockReturnValueOnce(true) // /source/subdir exists
        .mockReturnValueOnce(false) // /dest/subdir doesn't exist
        .mockReturnValue(true) // default to true

      vi.mocked(readdirSync)
        .mockReturnValueOnce(['subdir', 'file.txt'] as any) // /source contents
        .mockReturnValueOnce(['subfile.txt'] as any) // /source/subdir contents

      // Mock stats for each path check
      vi.mocked(statSync)
        .mockReturnValueOnce(dirStats as any) // /source/subdir is directory
        .mockReturnValueOnce(fileStats as any) // /source/file.txt is file
        .mockReturnValueOnce(fileStats as any) // /source/subdir/subfile.txt is file

      copyDir('/source', '/dest')

      // Should have created directories
      expect(mkdirSync).toHaveBeenCalledTimes(2)
      // Should have copied 2 files
      expect(copyFileSync).toHaveBeenCalledTimes(2)
    })

    it('should apply filter function', () => {
      const mockStats = { isDirectory: () => false, isFile: () => true }
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readdirSync).mockReturnValue(['file1.txt', 'file2.md'] as any)
      vi.mocked(statSync).mockReturnValue(mockStats as any)

      const filter = (path: string) => path.endsWith('.txt')

      copyDir('/source', '/dest', { filter })

      expect(copyFileSync).toHaveBeenCalledTimes(1)
      expect(copyFileSync).toHaveBeenCalledWith(
        expect.stringContaining('file1.txt'),
        expect.anything(),
      )
    })

    it('should throw FileSystemError on failure', () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readdirSync).mockImplementation(() => {
        throw new Error('Read failed')
      })

      expect(() => copyDir('/source', '/dest')).toThrow(FileSystemError)
      expect(() => copyDir('/source', '/dest')).toThrow('Failed to read directory')
    })
  })
})
