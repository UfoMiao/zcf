import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import process from 'node:process'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  copyDir,
  copyFile,
  ensureDir,
  ensureFileDir,
  exists,
  FileSystemError,
  getStats,
  isDirectory,
  isExecutable,
  isFile,
  readDir,
  readFile,
  remove,
  removeFile,
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

    it('should throw FileSystemError when source does not exist', () => {
      vi.mocked(existsSync).mockReturnValue(false)

      expect(() => copyDir('/source', '/dest')).toThrow(FileSystemError)
      expect(() => copyDir('/source', '/dest')).toThrow('Source directory does not exist')
    })

    it('should skip files when overwrite is false and destination exists', () => {
      const mockStats = { isDirectory: () => false, isFile: () => true }
      vi.mocked(existsSync)
        .mockReturnValueOnce(true) // source exists
        .mockReturnValueOnce(false) // dest doesn't exist initially
        .mockReturnValueOnce(true) // dest file exists during copy
      vi.mocked(readdirSync).mockReturnValue(['file1.txt'] as any)
      vi.mocked(statSync).mockReturnValue(mockStats as any)

      copyDir('/source', '/dest', { overwrite: false })

      expect(copyFileSync).not.toHaveBeenCalled()
    })
  })

  describe('readDir', () => {
    it('should read directory contents', () => {
      vi.mocked(readdirSync).mockReturnValue(['file1.txt', 'file2.txt'] as any)

      const result = readDir('/test/dir')

      expect(result).toEqual(['file1.txt', 'file2.txt'])
      expect(readdirSync).toHaveBeenCalledWith('/test/dir')
    })

    it('should throw FileSystemError on read failure', () => {
      vi.mocked(readdirSync).mockImplementation(() => {
        throw new Error('Permission denied')
      })

      expect(() => readDir('/test/dir')).toThrow(FileSystemError)
      expect(() => readDir('/test/dir')).toThrow('Failed to read directory')
    })
  })

  describe('getStats', () => {
    it('should return file stats', () => {
      const mockStats = { isDirectory: () => false, isFile: () => true }
      vi.mocked(statSync).mockReturnValue(mockStats as any)

      const result = getStats('/test/file.txt')

      expect(result).toBe(mockStats)
      expect(statSync).toHaveBeenCalledWith('/test/file.txt')
    })

    it('should throw FileSystemError on stats failure', () => {
      vi.mocked(statSync).mockImplementation(() => {
        throw new Error('File not found')
      })

      expect(() => getStats('/test/file.txt')).toThrow(FileSystemError)
      expect(() => getStats('/test/file.txt')).toThrow('Failed to get stats for')
    })
  })

  describe('isDirectory', () => {
    it('should return true for directory', () => {
      const mockStats = { isDirectory: () => true }
      vi.mocked(statSync).mockReturnValue(mockStats as any)

      const result = isDirectory('/test/dir')

      expect(result).toBe(true)
    })

    it('should return false for file', () => {
      const mockStats = { isDirectory: () => false }
      vi.mocked(statSync).mockReturnValue(mockStats as any)

      const result = isDirectory('/test/file.txt')

      expect(result).toBe(false)
    })

    it('should return false on stats failure', () => {
      vi.mocked(statSync).mockImplementation(() => {
        throw new Error('File not found')
      })

      const result = isDirectory('/test/notfound')

      expect(result).toBe(false)
    })
  })

  describe('isFile', () => {
    it('should return true for file', () => {
      const mockStats = { isFile: () => true }
      vi.mocked(statSync).mockReturnValue(mockStats as any)

      const result = isFile('/test/file.txt')

      expect(result).toBe(true)
    })

    it('should return false for directory', () => {
      const mockStats = { isFile: () => false }
      vi.mocked(statSync).mockReturnValue(mockStats as any)

      const result = isFile('/test/dir')

      expect(result).toBe(false)
    })

    it('should return false on stats failure', () => {
      vi.mocked(statSync).mockImplementation(() => {
        throw new Error('File not found')
      })

      const result = isFile('/test/notfound')

      expect(result).toBe(false)
    })
  })

  describe('removeFile', () => {
    it('should remove existing file', () => {
      vi.mocked(existsSync).mockReturnValue(true)

      removeFile('/test/file.txt')

      expect(unlinkSync).toHaveBeenCalledWith('/test/file.txt')
    })

    it('should not attempt to remove non-existent file', () => {
      vi.mocked(existsSync).mockReturnValue(false)

      removeFile('/test/nonexistent.txt')

      expect(unlinkSync).not.toHaveBeenCalled()
    })

    it('should throw FileSystemError on removal failure', () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(unlinkSync).mockImplementation(() => {
        throw new Error('Permission denied')
      })

      expect(() => removeFile('/test/file.txt')).toThrow(FileSystemError)
      expect(() => removeFile('/test/file.txt')).toThrow('Failed to remove file')
    })
  })

  describe('isExecutable', () => {
    beforeEach(() => {
      // Reset process.platform mock for each test
      vi.clearAllMocks()
    })

    it('should return false for non-existent file', async () => {
      vi.mocked(existsSync).mockReturnValue(false)

      const result = await isExecutable('/test/nonexistent')

      expect(result).toBe(false)
    })

    it('should return false for directory', async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(statSync).mockReturnValue({ isFile: () => false } as any)

      const result = await isExecutable('/test/dir')

      expect(result).toBe(false)
    })

    it('should check execute permission on Unix-like systems', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux', writable: true })
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(statSync).mockReturnValue({
        isFile: () => true,
        mode: 0o755, // Execute permission set
      } as any)

      const result = await isExecutable('/test/executable')

      expect(result).toBe(true)
    })

    it('should return false when no execute permission on Unix-like systems', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin', writable: true })
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(statSync).mockReturnValue({
        isFile: () => true,
        mode: 0o644, // No execute permission
      } as any)

      const result = await isExecutable('/test/notexecutable')

      expect(result).toBe(false)
    })

    it('should check file extension on Windows', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32', writable: true })
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(statSync).mockReturnValue({
        isFile: () => true,
        mode: 0o644,
      } as any)

      const result = await isExecutable('/test/program.exe')

      expect(result).toBe(true)
    })

    it('should return true for files without extension on Windows', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32', writable: true })
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(statSync).mockReturnValue({
        isFile: () => true,
        mode: 0o644,
      } as any)

      const result = await isExecutable('/test/program')

      expect(result).toBe(true)
    })

    it('should return false for non-executable extensions on Windows', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32', writable: true })
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(statSync).mockReturnValue({
        isFile: () => true,
        mode: 0o644,
      } as any)

      const result = await isExecutable('/test/document.txt')

      expect(result).toBe(false)
    })

    it('should return false on stats error', async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(statSync).mockImplementation(() => {
        throw new Error('Permission denied')
      })

      const result = await isExecutable('/test/file')

      expect(result).toBe(false)
    })
  })

  describe('remove', () => {
    it('should do nothing for non-existent path', async () => {
      vi.mocked(existsSync).mockReturnValue(false)

      await remove('/test/nonexistent')

      expect(statSync).not.toHaveBeenCalled()
    })

    it('should remove file', async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(statSync).mockReturnValue({
        isDirectory: () => false,
        isFile: () => true,
      } as any)

      await remove('/test/file.txt')

      expect(unlinkSync).toHaveBeenCalledWith('/test/file.txt')
    })

    it('should remove empty directory', async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(statSync).mockReturnValue({
        isDirectory: () => true,
        isFile: () => false,
      } as any)
      vi.mocked(readdirSync).mockReturnValue([])
      vi.mocked(rmSync).mockImplementation(() => {})

      await remove('/test/empty-dir')

      expect(rmSync).toHaveBeenCalledWith('/test/empty-dir', { recursive: true, force: true })
    })

    it('should remove directory with contents recursively', async () => {
      // Mock directory structure: /test/dir -> /test/dir/subdir -> /test/dir/file.txt
      vi.mocked(existsSync)
        .mockReturnValueOnce(true) // initial check
        .mockReturnValueOnce(true) // subdir exists
        .mockReturnValueOnce(true) // file exists

      vi.mocked(statSync)
        .mockReturnValueOnce({ isDirectory: () => true } as any) // /test/dir is directory
        .mockReturnValueOnce({ isDirectory: () => true } as any) // subdir is directory
        .mockReturnValueOnce({ isDirectory: () => false } as any) // file is not directory

      vi.mocked(readdirSync)
        .mockReturnValueOnce(['subdir', 'file.txt'] as any) // /test/dir contents
        .mockReturnValueOnce([]) // subdir is empty

      vi.mocked(rmSync).mockImplementation(() => {})

      await remove('/test/dir')

      expect(rmSync).toHaveBeenCalledTimes(2) // Once for subdir, once for main dir
    })

    it('should throw FileSystemError on directory removal failure', async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(statSync).mockReturnValue({
        isDirectory: () => true,
        isFile: () => false,
      } as any)
      vi.mocked(readdirSync).mockReturnValue([])
      vi.mocked(rmSync).mockImplementation(() => {
        throw new Error('Permission denied')
      })

      await expect(remove('/test/dir')).rejects.toThrow(FileSystemError)
      await expect(remove('/test/dir')).rejects.toThrow('Failed to remove')
    })

    it('should throw FileSystemError on general removal failure', async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(statSync).mockImplementation(() => {
        throw new Error('General error')
      })

      await expect(remove('/test/path')).rejects.toThrow(FileSystemError)
      await expect(remove('/test/path')).rejects.toThrow('Failed to remove')
    })
  })
})
