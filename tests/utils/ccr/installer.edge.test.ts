import { exec } from 'node:child_process'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as i18n from '../../../src/i18n'
import {
  getCcrVersion,
  installCcr,
  isCcrInstalled,
  startCcrService,
} from '../../../src/utils/ccr/installer'

vi.mock('node:child_process')
vi.mock('node:util', () => ({
  promisify: vi.fn((fn) => {
    return (...args: any[]) => {
      return new Promise((resolve, reject) => {
        fn(...args, (err: any, stdout: any, stderr: any) => {
          if (err)
            reject(err)
          else resolve({ stdout, stderr })
        })
      })
    }
  }),
}))
vi.mock('../../../src/i18n')

describe('cCR installer - edge cases', () => {
  let consoleLogSpy: any
  let consoleErrorSpy: any

  beforeEach(() => {
    vi.clearAllMocks()
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(i18n.getTranslation).mockReturnValue({
      ccr: {
        ccrAlreadyInstalled: 'CCR is already installed',
        installingCcr: 'Installing CCR...',
        ccrInstallSuccess: 'CCR installed successfully',
        ccrInstallFailed: 'Failed to install CCR',
        failedToStartCcrService: 'Failed to start CCR service',
        errorStartingCcrService: 'Error starting CCR service',
      },
      updater: {
        checkingVersion: 'Checking version...',
        ccrNotInstalled: 'CCR is not installed',
        ccrUpToDate: 'CCR is up to date (version: {version})',
        ccrNeedsUpdate: 'CCR needs update',
        updateConfirm: 'Do you want to update?',
        updating: 'Updating...',
        updateSuccess: 'Update successful',
        updateFailed: 'Update failed',
      },
    } as any)
  })

  afterEach(() => {
    consoleLogSpy?.mockRestore()
    consoleErrorSpy?.mockRestore()
  })

  describe('isCcrInstalled - edge cases', () => {
    it('should handle empty stdout', async () => {
      const mockExec = vi.mocked(exec)
      // @ts-expect-error - testing purpose
      mockExec.mockImplementation((cmd, callback) => {
        if (typeof callback === 'function') {
          callback(null, '', '')
        }
      })

      const result = await isCcrInstalled()
      expect(result).toEqual({ isInstalled: true, hasCorrectPackage: true }) // Empty output but no error means success
    })

    it('should handle malformed exec callback', async () => {
      const mockExec = vi.mocked(exec)
      // @ts-expect-error - testing purpose
      mockExec.mockImplementation((cmd, callback) => {
        if (typeof callback === 'function') {
          // @ts-expect-error - testing malformed callback
          callback(null)
        }
      })

      const result = await isCcrInstalled()
      expect(result).toEqual({ isInstalled: true, hasCorrectPackage: true })
    })

    it('should handle special characters in error messages', async () => {
      const mockExec = vi.mocked(exec)
      // @ts-expect-error - testing purpose
      mockExec.mockImplementation((cmd, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('命令未找到 🚫'), '', '')
        }
      })

      const result = await isCcrInstalled()
      expect(result).toEqual({ isInstalled: false, hasCorrectPackage: false })
    })
  })

  describe('getCcrVersion - edge cases', () => {
    it('should handle multiple version patterns in output', async () => {
      const mockExec = vi.mocked(exec)
      // @ts-expect-error - testing purpose
      mockExec.mockImplementation((cmd, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Version 1.0.0\nActual version: 2.3.4\n', '')
        }
      })

      const version = await getCcrVersion()
      expect(version).toBe('1.0.0') // Should return first match
    })

    it('should handle version with pre-release tags', async () => {
      const mockExec = vi.mocked(exec)
      // @ts-expect-error - testing purpose
      mockExec.mockImplementation((cmd, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'v3.0.0-alpha.1', '')
        }
      })

      const version = await getCcrVersion()
      expect(version).toBe('3.0.0')
    })
  })

  describe('installCcr - edge cases', () => {
    it('should handle network timeout errors', async () => {
      const mockExec = vi.mocked(exec)
      // @ts-expect-error - testing purpose
      mockExec.mockImplementation((cmd, callback) => {
        if (typeof callback === 'function') {
          if (cmd.includes('npm install')) {
            const error = new Error('ETIMEDOUT')
            callback(error, '', '')
          }
          else {
            callback(new Error('not found'), '', '')
          }
        }
      })

      await expect(installCcr('en')).rejects.toThrow('ETIMEDOUT')
    })

    it('should handle partial EEXIST error messages', async () => {
      const mockExec = vi.mocked(exec)
      // @ts-expect-error - testing purpose
      mockExec.mockImplementation((cmd, callback) => {
        if (typeof callback === 'function') {
          if (cmd.includes('npm install')) {
            const error = new Error('npm ERR! code EEXIST\nnpm ERR! path /usr/local/bin/ccr')
            callback(error, '', '')
          }
          else {
            callback(new Error('not found'), '', '')
          }
        }
      })

      await installCcr('en')
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('CCR is already installed'),
      )
    })

    it('should handle npm warnings in stdout', async () => {
      const mockExec = vi.mocked(exec)
      // @ts-expect-error - testing purpose
      mockExec.mockImplementation((cmd, callback) => {
        if (typeof callback === 'function') {
          if (cmd.includes('npm install')) {
            callback(null, 'npm WARN deprecated package@1.0.0\nadded 5 packages', '')
          }
          else {
            callback(new Error('not found'), '', '')
          }
        }
      })

      await installCcr('zh-CN')
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('CCR installed successfully'),
      )
    })

    it('should handle empty error objects', async () => {
      const mockExec = vi.mocked(exec)
      // @ts-expect-error - testing purpose
      mockExec.mockImplementation((cmd, callback) => {
        if (typeof callback === 'function') {
          if (cmd.includes('npm install')) {
            const error = new Error('Installation failed')
            callback(error, '', '')
          }
          else {
            callback(new Error('not found'), '', '')
          }
        }
      })

      await expect(installCcr('en')).rejects.toThrow()
    })
  })

  describe('startCcrService - edge cases', () => {
    it('should handle immediate service crash', async () => {
      const mockExec = vi.mocked(exec)
      // @ts-expect-error - testing purpose
      mockExec.mockImplementation((cmd, callback) => {
        if (typeof callback === 'function') {
          // Immediate error
          callback(new Error('Service crashed immediately'), '', '')
        }
      })

      await startCcrService('en')
      // Wait for async error handling
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to start CCR service'),
        expect.any(Error),
      )
    })

    it('should handle service with delayed error', async () => {
      const mockExec = vi.mocked(exec)
      // @ts-expect-error - testing purpose
      mockExec.mockImplementation((cmd, callback) => {
        if (typeof callback === 'function') {
          // Error after delay
          setTimeout(() => callback(new Error('Service crashed after start'), '', ''), 500)
        }
      })

      await startCcrService('zh-CN')
      // Should complete without waiting for delayed error
      expect(mockExec).toHaveBeenCalled()
    })

    it('should handle exception during exec', async () => {
      const mockExec = vi.mocked(exec)
      // @ts-expect-error - testing purpose
      mockExec.mockImplementation(() => {
        throw new Error('Exec failed')
      })

      await startCcrService('en')
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error starting CCR service'),
        expect.any(Error),
      )
    })

    it('should handle undefined language gracefully', async () => {
      const mockExec = vi.mocked(exec)
      // @ts-expect-error - testing purpose
      mockExec.mockImplementation((cmd, callback) => {
        if (typeof callback === 'function') {
          setTimeout(() => callback(null, '', ''), 10)
        }
      })

      await startCcrService(undefined)
      expect(i18n.getTranslation).toHaveBeenCalledWith('zh-CN')
    })
  })

  describe('race conditions', () => {
    it('should handle rapid successive calls to isCcrInstalled', async () => {
      const mockExec = vi.mocked(exec)
      let callCount = 0
      // @ts-expect-error - testing purpose
      mockExec.mockImplementation((cmd, callback) => {
        if (typeof callback === 'function') {
          callCount++
          setTimeout(() => callback(null, 'CCR version 1.0.0', ''), Math.random() * 50)
        }
      })

      const results = await Promise.all([
        isCcrInstalled(),
        isCcrInstalled(),
        isCcrInstalled(),
      ])

      expect(results).toEqual([
        { isInstalled: true, hasCorrectPackage: true },
        { isInstalled: true, hasCorrectPackage: true },
        { isInstalled: true, hasCorrectPackage: true },
      ])
      expect(callCount).toBeGreaterThanOrEqual(3)
    })
  })
})
