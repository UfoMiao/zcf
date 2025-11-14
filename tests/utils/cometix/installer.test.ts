import { exec } from 'node:child_process'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as installerModule from '../../../src/utils/cometix/installer'

// Don't destructure to allow proper mocking
const { isCometixLineInstalled, installCometixLine } = installerModule

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
// Use real i18n system for better integration testing
vi.mock('../../../src/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/i18n')>()
  return {
    ...actual,
    // Only mock ensureI18nInitialized to avoid initialization issues
    ensureI18nInitialized: vi.fn(),
  }
})
const wrapCommandWithSudo = vi.hoisted(() => vi.fn((command: string, args: string[]) => ({
  command,
  args,
  usedSudo: false,
})))
vi.mock('../../../src/utils/platform', () => ({
  wrapCommandWithSudo,
}))

describe('cCometixLine installer', () => {
  let consoleLogSpy: any
  let consoleErrorSpy: any

  beforeEach(() => {
    vi.clearAllMocks()
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    wrapCommandWithSudo.mockImplementation((command, args) => ({
      command,
      args,
      usedSudo: false,
    }))
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('isCometixLineInstalled', () => {
    it('should return true when CCometixLine is installed', async () => {
      const mockExec = vi.mocked(exec)
      mockExec.mockImplementation((_command, callback: any) => {
        callback(null, 'ccline@1.0.0', '')
        return {} as any // Mock ChildProcess return
      })

      const result = await isCometixLineInstalled()
      expect(result).toBe(true)
      expect(mockExec).toHaveBeenCalledWith('npm list -g @cometix/ccline', expect.any(Function))
    })

    it('should return false when CCometixLine is not installed', async () => {
      const mockExec = vi.mocked(exec)
      mockExec.mockImplementation((_command, callback: any) => {
        const error = new Error('Package not found')
        callback(error, '', 'npm ERR! 404 Not Found')
        return {} as any // Mock ChildProcess return
      })

      const result = await isCometixLineInstalled()
      expect(result).toBe(false)
    })

    it('should handle npm command errors gracefully', async () => {
      const mockExec = vi.mocked(exec)
      mockExec.mockImplementation((_command, callback: any) => {
        const error = new Error('npm command not found')
        callback(error, '', 'command not found: npm')
        return {} as any // Mock ChildProcess return
      })

      const result = await isCometixLineInstalled()
      expect(result).toBe(false)
    })
  })

  describe('installCometixLine', () => {
    it('should install CCometixLine successfully', async () => {
      const mockExec = vi.mocked(exec)
      mockExec
        .mockImplementationOnce((_command, callback: any) => {
          // First call to check if installed - return error (not installed)
          const error = new Error('Package not found')
          callback(error, '', 'npm ERR! 404 Not Found')
          return {} as any // Mock ChildProcess return
        })
        .mockImplementationOnce((_command, callback: any) => {
          // Second call to install
          callback(null, 'added 1 package', '')
          return {} as any // Mock ChildProcess return
        })

      await installCometixLine()

      expect(mockExec).toHaveBeenCalledTimes(2)
      expect(mockExec).toHaveBeenNthCalledWith(1, 'npm list -g @cometix/ccline', expect.any(Function))
      expect(mockExec).toHaveBeenNthCalledWith(2, 'npm install -g @cometix/ccline', expect.any(Function))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Installing CCometixLine...'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('CCometixLine installed successfully'))
    })

    it('should handle installation failure', async () => {
      const mockExec = vi.mocked(exec)
      mockExec.mockImplementation((_command, callback: any) => {
        const error = new Error('Installation failed')
        callback(error, '', 'npm ERR! Failed to install')
        return {} as any // Mock ChildProcess return
      })

      await expect(installCometixLine()).rejects.toThrow('Installation failed')
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to install CCometixLine'))
    })

    it('should skip installation if already installed', async () => {
      const mockExec = vi.mocked(exec)
      mockExec
        .mockImplementationOnce((_command, callback: any) => {
          // First call to check if installed - return success (installed)
          callback(null, 'ccline@1.0.0', '')
          return {} as any // Mock ChildProcess return
        })
        .mockImplementationOnce((_command, callback: any) => {
          // Second call to update
          callback(null, 'updated 1 package', '')
          return {} as any // Mock ChildProcess return
        })

      await installCometixLine()

      expect(mockExec).toHaveBeenCalledTimes(2)
      expect(mockExec).toHaveBeenNthCalledWith(1, 'npm list -g @cometix/ccline', expect.any(Function))
      expect(mockExec).toHaveBeenNthCalledWith(2, 'npm install -g @cometix/ccline', expect.any(Function))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('CCometixLine is already installed'))
    })

    it('should use sudo when wrapCommandWithSudo indicates elevated install', async () => {
      wrapCommandWithSudo.mockImplementation((command, args) => ({
        command: 'sudo',
        args: [command, ...args],
        usedSudo: true,
      }))

      const mockExec = vi.mocked(exec)
      mockExec
        .mockImplementationOnce((_command, callback: any) => {
          const error = new Error('Package not found')
          callback(error, '', 'npm ERR! 404 Not Found')
          return {} as any
        })
        .mockImplementationOnce((command, callback: any) => {
          if (command === 'sudo npm install -g @cometix/ccline') {
            callback(null, 'added 1 package', '')
          }
          else {
            callback(new Error('Unexpected command'), '', '')
          }
          return {} as any
        })

      await installCometixLine()

      expect(wrapCommandWithSudo).toHaveBeenCalledWith('npm', ['install', '-g', '@cometix/ccline'])
      expect(mockExec).toHaveBeenCalledWith('sudo npm install -g @cometix/ccline', expect.any(Function))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('sudo'))
    })
  })
})
