import { beforeEach, describe, expect, it, vi } from 'vitest'
import { moveToTrash } from '../../src/utils/trash'

// Mock dependencies
vi.mock('fs-extra')
vi.mock('trash')

const mockFsExtra = vi.hoisted(() => ({
  pathExists: vi.fn(),
}))

const mockTrash = vi.hoisted(() => vi.fn())

vi.mocked(await import('fs-extra')).pathExists = mockFsExtra.pathExists
vi.mocked(await import('trash')).default = mockTrash

describe('moveToTrash', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('single path operations', () => {
    it('should successfully move existing file to trash', async () => {
      const testPath = '/test/file.txt'
      mockFsExtra.pathExists.mockResolvedValue(true)
      mockTrash.mockResolvedValue(undefined)

      const results = await moveToTrash(testPath)

      expect(results).toHaveLength(1)
      expect(results[0]).toEqual({
        success: true,
        path: testPath,
      })
      expect(mockFsExtra.pathExists).toHaveBeenCalledWith(testPath)
      expect(mockTrash).toHaveBeenCalledWith(testPath)
    })

    it('should successfully move existing directory to trash', async () => {
      const testPath = '/test/directory'
      mockFsExtra.pathExists.mockResolvedValue(true)
      mockTrash.mockResolvedValue(undefined)

      const results = await moveToTrash(testPath)

      expect(results).toHaveLength(1)
      expect(results[0]).toEqual({
        success: true,
        path: testPath,
      })
      expect(mockFsExtra.pathExists).toHaveBeenCalledWith(testPath)
      expect(mockTrash).toHaveBeenCalledWith(testPath)
    })

    it('should handle non-existent path gracefully', async () => {
      const testPath = '/non/existent/path'
      mockFsExtra.pathExists.mockResolvedValue(false)

      const results = await moveToTrash(testPath)

      expect(results).toHaveLength(1)
      expect(results[0]).toEqual({
        success: false,
        path: testPath,
        error: 'Path does not exist',
      })
      expect(mockFsExtra.pathExists).toHaveBeenCalledWith(testPath)
      expect(mockTrash).not.toHaveBeenCalled()
    })

    it('should handle trash operation errors', async () => {
      const testPath = '/test/file.txt'
      const errorMessage = 'Permission denied'
      mockFsExtra.pathExists.mockResolvedValue(true)
      mockTrash.mockRejectedValue(new Error(errorMessage))

      const results = await moveToTrash(testPath)

      expect(results).toHaveLength(1)
      expect(results[0]).toEqual({
        success: false,
        path: testPath,
        error: errorMessage,
      })
      expect(mockFsExtra.pathExists).toHaveBeenCalledWith(testPath)
      expect(mockTrash).toHaveBeenCalledWith(testPath)
    })
  })

  describe('batch operations', () => {
    it('should move multiple paths to trash', async () => {
      const testPaths = ['/test/file1.txt', '/test/file2.txt', '/test/dir']
      mockFsExtra.pathExists.mockResolvedValue(true)
      mockTrash.mockResolvedValue(undefined)

      const results = await moveToTrash(testPaths)

      expect(results).toHaveLength(3)
      testPaths.forEach((path, index) => {
        expect(results[index]).toEqual({
          success: true,
          path,
        })
        expect(mockFsExtra.pathExists).toHaveBeenCalledWith(path)
        expect(mockTrash).toHaveBeenCalledWith(path)
      })
    })

    it('should handle mixed success and failure in batch', async () => {
      const testPaths = ['/test/exists.txt', '/test/not-exists.txt', '/test/error.txt']
      mockFsExtra.pathExists
        .mockResolvedValueOnce(true) // exists.txt
        .mockResolvedValueOnce(false) // not-exists.txt
        .mockResolvedValueOnce(true) // error.txt

      mockTrash
        .mockResolvedValueOnce(undefined) // exists.txt success
        .mockRejectedValueOnce(new Error('Failed to trash')) // error.txt fails

      const results = await moveToTrash(testPaths)

      expect(results).toHaveLength(3)
      expect(results[0]).toEqual({
        success: true,
        path: testPaths[0],
      })
      expect(results[1]).toEqual({
        success: false,
        path: testPaths[1],
        error: 'Path does not exist',
      })
      expect(results[2]).toEqual({
        success: false,
        path: testPaths[2],
        error: 'Failed to trash',
      })
    })
  })

  describe('edge cases', () => {
    it('should handle empty array', async () => {
      const results = await moveToTrash([])
      expect(results).toHaveLength(0)
      expect(mockFsExtra.pathExists).not.toHaveBeenCalled()
      expect(mockTrash).not.toHaveBeenCalled()
    })

    it('should handle undefined error message', async () => {
      const testPath = '/test/file.txt'
      mockFsExtra.pathExists.mockResolvedValue(true)
      mockTrash.mockRejectedValue({ code: 'UNKNOWN' }) // Error without message

      const results = await moveToTrash(testPath)

      expect(results[0]).toEqual({
        success: false,
        path: testPath,
        error: 'Unknown error occurred',
      })
    })
  })
})
