import type { ChildProcess } from 'node:child_process'
import { exec } from 'node:child_process'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
// Use real i18n system for better integration testing
import * as installerModule from '../../../src/utils/ccr/installer'

vi.mock('node:child_process', () => ({
  exec: vi.fn(),
}))
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
vi.mock('../../../src/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/i18n')>()
  return {
    ...actual,
    // Only mock ensureI18nInitialized to avoid initialization issues
    ensureI18nInitialized: vi.fn(),
  }
})

describe('cCR installer - edge cases', () => {
  let consoleLogSpy: any
  let consoleErrorSpy: any

  beforeEach(() => {
    vi.clearAllMocks()
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    // Real i18n system will be used, no complex mock needed
  })

  afterEach(() => {
    consoleLogSpy?.mockRestore()
    consoleErrorSpy?.mockRestore()
  })

  describe('isCcrInstalled - edge cases', () => {
    it('should handle empty stdout', async () => {
      const mockExec = exec as any
      mockExec.mockImplementation((_cmd: string, callback: any) => {
        if (typeof callback === 'function') {
          callback(null, '', '')
        }
        return {} as ChildProcess
      })

      const result = await installerModule.isCcrInstalled()
      expect(result).toEqual({ isInstalled: true, hasCorrectPackage: true }) // Empty output but no error means success
    })

    it('should handle malformed exec callback', async () => {
      const mockExec = exec as any
      mockExec.mockImplementation((_cmd: string, callback: any) => {
        if (typeof callback === 'function') {
          // Testing malformed callback
          callback(null)
        }
        return {} as ChildProcess
      })

      const result = await installerModule.isCcrInstalled()
      expect(result).toEqual({ isInstalled: true, hasCorrectPackage: true })
    })

    it('should handle special characters in error messages', async () => {
      const mockExec = exec as any
      mockExec.mockImplementation((_cmd: string, callback: any) => {
        if (typeof callback === 'function') {
          callback(new Error('命令未找到 🚫'), '', '')
        }
        return {} as ChildProcess
      })

      const result = await installerModule.isCcrInstalled()
      expect(result).toEqual({ isInstalled: false, hasCorrectPackage: false })
    })
  })

  describe('getCcrVersion - edge cases', () => {
    it('should handle multiple version patterns in output', async () => {
      const mockExec = exec as any
      mockExec.mockImplementation((_cmd: string, callback: any) => {
        if (typeof callback === 'function') {
          callback(null, 'Version 1.0.0\\nActual version: 2.3.4\\n', '')
        }
        return {} as ChildProcess
      })

      const version = await installerModule.getCcrVersion()
      expect(version).toBe('1.0.0') // Should return first match
    })

    it('should handle version with pre-release tags', async () => {
      const mockExec = exec as any
      mockExec.mockImplementation((_cmd: string, callback: any) => {
        if (typeof callback === 'function') {
          callback(null, 'v3.0.0-alpha.1', '')
        }
        return {} as ChildProcess
      })

      const version = await installerModule.getCcrVersion()
      expect(version).toBe('3.0.0')
    })
  })

  describe('installCcr - edge cases', () => {
    it('should handle network timeout errors', async () => {
      const mockExec = exec as any
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (typeof callback === 'function') {
          if (cmd.includes('npm install')) {
            const error = new Error('ETIMEDOUT')
            callback(error, '', '')
          }
          else {
            callback(new Error('not found'), '', '')
          }
        }
        return {} as ChildProcess
      })

      await expect(installerModule.installCcr()).rejects.toThrow('ETIMEDOUT')
    })

    it('should handle partial EEXIST error messages', async () => {
      const mockExec = exec as any
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (typeof callback === 'function') {
          if (cmd.includes('npm install')) {
            const error = new Error('npm ERR! code EEXIST\\nnpm ERR! path /usr/local/bin/ccr')
            callback(error, '', '')
          }
          else {
            callback(new Error('not found'), '', '')
          }
        }
        return {} as ChildProcess
      })

      await installerModule.installCcr()
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('is already installed'),
      )
    })

    it('should handle npm warnings in stdout', async () => {
      const mockExec = exec as any
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (typeof callback === 'function') {
          if (cmd.includes('npm install')) {
            callback(null, 'npm WARN deprecated package@1.0.0\\nadded 5 packages', '')
          }
          else {
            callback(new Error('not found'), '', '')
          }
        }
        return {} as ChildProcess
      })

      await installerModule.installCcr()
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('installation successful'),
      )
    })

    it('should handle empty error objects', async () => {
      const mockExec = exec as any
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (typeof callback === 'function') {
          if (cmd.includes('npm install')) {
            const error = new Error('Installation failed')
            callback(error, '', '')
          }
          else {
            callback(new Error('not found'), '', '')
          }
        }
        return {} as ChildProcess
      })

      await expect(installerModule.installCcr()).rejects.toThrow()
    })
  })

  describe('startCcrService - edge cases', () => {
    it('should handle immediate service crash', async () => {
      const mockExec = exec as any
      mockExec.mockImplementation((_cmd: string, callback: any) => {
        if (typeof callback === 'function') {
          // Immediate error
          callback(new Error('Service crashed immediately'), '', '')
        }
        return {} as ChildProcess
      })

      await installerModule.startCcrService()
      // Wait for async error handling
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to start CCR service'),
        expect.any(Error),
      )
    })

    it('should handle service with delayed error', async () => {
      const mockExec = exec as any
      mockExec.mockImplementation((_cmd: string, callback: any) => {
        if (typeof callback === 'function') {
          // Error after delay
          setTimeout(() => callback(new Error('Service crashed after start'), '', ''), 500)
        }
        return {} as ChildProcess
      })

      await installerModule.startCcrService()
      // Should complete without waiting for delayed error
      expect(mockExec).toHaveBeenCalled()
    })

    it('should handle exception during exec', async () => {
      const mockExec = exec as any
      mockExec.mockImplementation(() => {
        throw new Error('Exec failed')
      })

      await installerModule.startCcrService()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error starting CCR service'),
        expect.any(Error),
      )
    })

    it('should handle undefined language gracefully', async () => {
      const mockExec = exec as any
      mockExec.mockImplementation((_cmd: string, callback: any) => {
        if (typeof callback === 'function') {
          setTimeout(() => callback(null, '', ''), 10)
        }
        return {} as ChildProcess
      })

      await installerModule.startCcrService()
      // Real i18n system handles default language internally
    })
  })

  describe('race conditions', () => {
    it('should handle rapid successive calls to isCcrInstalled', async () => {
      const mockExec = exec as any
      let callCount = 0
      mockExec.mockImplementation((_cmd: string, callback: any) => {
        if (typeof callback === 'function') {
          callCount++
          setTimeout(() => callback(null, 'CCR version 1.0.0', ''), Math.random() * 50)
        }
        return {} as ChildProcess
      })

      const results = await Promise.all([
        installerModule.isCcrInstalled(),
        installerModule.isCcrInstalled(),
        installerModule.isCcrInstalled(),
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
