import type { ChildProcess } from 'node:child_process'
import { exec } from 'node:child_process'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as installerModule from '../../../src/utils/ccr/installer'

// Don't destructure to allow proper mocking
const { getCcrVersion, startCcrService } = installerModule

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

describe('cCR installer', () => {
  let consoleLogSpy: any
  let consoleErrorSpy: any

  beforeEach(() => {
    vi.clearAllMocks()
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    wrapCommandWithSudo.mockImplementation((command: string, args: string[]) => ({
      command,
      args,
      usedSudo: false,
    }))
  })

  afterEach(() => {
    consoleLogSpy?.mockRestore()
    consoleErrorSpy?.mockRestore()
  })

  describe('isCcrInstalled', () => {
    it('should detect correct package when installed', async () => {
      const mockExec = exec as any
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (typeof callback === 'function') {
          if (cmd === 'ccr version') {
            callback(null, 'CCR version 1.0.0', '')
          }
          else if (cmd === 'npm list -g @musistudio/claude-code-router') {
            callback(null, '@musistudio/claude-code-router@1.0.36', '')
          }
          else {
            callback(new Error('command not found'), '', '')
          }
        }
        return {} as ChildProcess
      })

      const result = await installerModule.isCcrInstalled()
      expect(result.isInstalled).toBe(true)
      expect(result.hasCorrectPackage).toBe(true)
    })

    it('should detect incorrect package when ccr exists but correct package not installed', async () => {
      const mockExec = exec as any
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (typeof callback === 'function') {
          if (cmd === 'ccr version') {
            callback(null, 'CCR version 2.1.1', '')
          }
          else if (cmd === 'npm list -g @musistudio/claude-code-router') {
            callback(new Error('not found'), '', '')
          }
          else {
            callback(new Error('command not found'), '', '')
          }
        }
        return {} as ChildProcess
      })

      const result = await installerModule.isCcrInstalled()
      expect(result.isInstalled).toBe(true)
      expect(result.hasCorrectPackage).toBe(false)
    })

    it('should return false for both when nothing is installed', async () => {
      const mockExec = exec as any
      mockExec.mockImplementation((_cmd: string, callback: any) => {
        if (typeof callback === 'function') {
          callback(new Error('command not found'), '', '')
        }
        return {} as ChildProcess
      })

      const result = await installerModule.isCcrInstalled()
      expect(result.isInstalled).toBe(false)
      expect(result.hasCorrectPackage).toBe(false)
    })
  })

  describe('getCcrVersion', () => {
    it('should extract version from ccr version output', async () => {
      const mockExec = exec as any
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (typeof callback === 'function') {
          if (cmd === 'ccr version') {
            callback(null, 'CCR version 1.2.3', '')
          }
          else {
            callback(new Error('command not found'), '', '')
          }
        }
        return {} as ChildProcess
      })

      const version = await getCcrVersion()
      expect(version).toBe('1.2.3')
    })

    it('should handle version with additional text', async () => {
      const mockExec = exec as any
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (typeof callback === 'function') {
          if (cmd === 'ccr version') {
            callback(null, 'claude-code-router version: 1.0.36', '')
          }
          else {
            callback(new Error('command not found'), '', '')
          }
        }
        return {} as ChildProcess
      })

      const version = await getCcrVersion()
      expect(version).toBe('1.0.36')
    })

    it('should return null when version pattern not found', async () => {
      const mockExec = exec as any
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (typeof callback === 'function') {
          if (cmd === 'ccr version') {
            callback(null, 'No version info', '')
          }
          else {
            callback(new Error('command not found'), '', '')
          }
        }
        return {} as ChildProcess
      })

      const version = await getCcrVersion()
      expect(version).toBeNull()
    })

    it('should return null when command fails', async () => {
      const mockExec = exec as any
      mockExec.mockImplementation((_cmd: string, callback: any) => {
        if (typeof callback === 'function') {
          callback(new Error('command not found'), '', '')
        }
        return {} as ChildProcess
      })

      const version = await getCcrVersion()
      expect(version).toBeNull()
    })
  })

  describe('installCcr', () => {
    it('should skip installation if already installed and no incorrect package', async () => {
      // Mock the internal functions to avoid complex execution paths
      const mockExec = exec as any
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (typeof callback === 'function') {
          if (cmd.includes('claude-code-router')) {
            // No incorrect package - don't throw error, just return empty stdout
            callback(null, '', 'not found')
          }
          else if (cmd.includes('ccr --version')) {
            // CCR is installed
            callback(null, 'CCR version 1.0.0', '')
          }
          else if (cmd.includes('npm list -g @anthropic/ccr')) {
            // Correct package is installed
            callback(null, '@anthropic/ccr@1.0.0', '')
          }
          else {
            callback(null, 'success', '')
          }
        }
        return {} as ChildProcess
      })

      await installerModule.installCcr()

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('is already installed'))
    })

    it('should reinstall if incorrect package is detected even if ccr command exists', async () => {
      const mockExec = exec as any
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (typeof callback === 'function') {
          if (cmd === 'ccr version') {
            // CCR command exists
            callback(null, 'CCR version 2.1.1', '')
          }
          else if (cmd === 'npm list -g @musistudio/claude-code-router') {
            // Correct package NOT installed
            callback(new Error('not found'), '', '')
          }
          else if (cmd === 'npm list -g claude-code-router') {
            // Incorrect package is installed
            callback(null, 'claude-code-router@2.1.1', '')
          }
          else if (cmd === 'npm uninstall -g claude-code-router') {
            callback(null, 'removed 1 package', '')
          }
          else if (cmd === 'npm install -g @musistudio/claude-code-router --force') {
            callback(null, 'added 1 package', '')
          }
          else {
            callback(new Error('command not found'), '', '')
          }
        }
        return {} as ChildProcess
      })

      await installerModule.installCcr()

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Detected incorrect package'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Successfully uninstalled'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Installing Claude Code Router'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('installation successful'))
    })

    it('should install CCR when not installed', async () => {
      // Mock isCcrInstalled to return not installed
      vi.spyOn(installerModule, 'isCcrInstalled').mockResolvedValue({ isInstalled: false, hasCorrectPackage: false })
      const mockExec = exec as any
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (typeof callback === 'function') {
          if (cmd === 'ccr version' || cmd === 'which ccr') {
            callback(new Error('not found'), '', '')
          }
          else if (cmd === 'npm list -g claude-code-router') {
            callback(new Error('not found'), '', '')
          }
          else if (cmd === 'npm install -g @musistudio/claude-code-router --force') {
            callback(null, 'added 1 package', '')
          }
          else {
            callback(new Error('command not found'), '', '')
          }
        }
        return {} as ChildProcess
      })

      await installerModule.installCcr()

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Installing Claude Code Router'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('installation successful'))
    })

    it('should install correct package when neither is installed', async () => {
      const mockExec = exec as any
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (typeof callback === 'function') {
          if (cmd === 'ccr version' || cmd === 'which ccr') {
            // CCR command not found
            callback(new Error('not found'), '', '')
          }
          else if (cmd === 'npm list -g @musistudio/claude-code-router') {
            // Correct package not installed
            callback(new Error('not found'), '', '')
          }
          else if (cmd === 'npm list -g claude-code-router') {
            // Incorrect package also not installed
            callback(new Error('not found'), '', '')
          }
          else if (cmd === 'npm install -g @musistudio/claude-code-router --force') {
            callback(null, 'added 1 package', '')
          }
          else {
            callback(new Error('command not found'), '', '')
          }
        }
        return {} as ChildProcess
      })

      await installerModule.installCcr()

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Installing Claude Code Router'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('installation successful'))
    })

    it('should use sudo for installation when platform requires elevation', async () => {
      wrapCommandWithSudo.mockImplementation((command, args) => ({
        command: 'sudo',
        args: [command, ...args],
        usedSudo: true,
      }))

      const mockExec = exec as any
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (typeof callback === 'function') {
          if (cmd === 'ccr version' || cmd === 'which ccr') {
            callback(new Error('not found'), '', '')
          }
          else if (cmd === 'npm list -g @musistudio/claude-code-router') {
            callback(new Error('not found'), '', '')
          }
          else if (cmd === 'sudo npm install -g @musistudio/claude-code-router --force') {
            callback(null, 'added 1 package', '')
          }
          else {
            callback(new Error('command not found'), '', '')
          }
        }
        return {} as ChildProcess
      })

      await installerModule.installCcr()

      expect(wrapCommandWithSudo).toHaveBeenCalledWith('npm', ['install', '-g', '@musistudio/claude-code-router', '--force'])
      expect(mockExec).toHaveBeenCalledWith('sudo npm install -g @musistudio/claude-code-router --force', expect.any(Function))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('sudo'))
    })

    it('should continue installation even if uninstall fails', async () => {
      const mockExec = exec as any
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (typeof callback === 'function') {
          if (cmd === 'ccr version') {
            // CCR command exists (incorrect package installed)
            callback(null, 'CCR version 2.1.1', '')
          }
          else if (cmd === 'npm list -g @musistudio/claude-code-router') {
            // Correct package not installed
            callback(new Error('not found'), '', '')
          }
          else if (cmd === 'npm list -g claude-code-router') {
            // Incorrect package is installed
            callback(null, 'claude-code-router@2.1.1', '')
          }
          else if (cmd === 'npm uninstall -g claude-code-router') {
            // Uninstall fails
            callback(new Error('Permission denied'), '', '')
          }
          else if (cmd === 'npm install -g @musistudio/claude-code-router --force') {
            callback(null, 'added 1 package', '')
          }
          else {
            callback(new Error('command not found'), '', '')
          }
        }
        return {} as ChildProcess
      })

      await installerModule.installCcr()

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Detected incorrect package'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to uninstall'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Installing Claude Code Router'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('installation successful'))
    })

    it('should handle EEXIST error gracefully', async () => {
      // Mock isCcrInstalled to return not installed
      vi.spyOn(installerModule, 'isCcrInstalled').mockResolvedValue({ isInstalled: false, hasCorrectPackage: false })
      const mockExec = exec as any
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (typeof callback === 'function') {
          if (cmd === 'ccr version' || cmd === 'which ccr') {
            callback(new Error('not found'), '', '')
          }
          else if (cmd === 'npm list -g claude-code-router') {
            callback(new Error('not found'), '', '')
          }
          else if (cmd === 'npm install -g @musistudio/claude-code-router --force') {
            const error = new Error('EEXIST: file already exists')
            callback(error, '', '')
          }
          else {
            callback(new Error('command not found'), '', '')
          }
        }
        return {} as ChildProcess
      })

      await installerModule.installCcr()

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('is already installed'))
    })

    it('should throw error for non-EEXIST installation failures', async () => {
      // Mock isCcrInstalled to return not installed
      vi.spyOn(installerModule, 'isCcrInstalled').mockResolvedValue({ isInstalled: false, hasCorrectPackage: false })
      const mockExec = exec as any
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (typeof callback === 'function') {
          if (cmd === 'ccr version' || cmd === 'which ccr') {
            callback(new Error('not found'), '', '')
          }
          else if (cmd === 'npm list -g claude-code-router') {
            callback(new Error('not found'), '', '')
          }
          else if (cmd === 'npm install -g @musistudio/claude-code-router --force') {
            callback(new Error('Permission denied'), '', '')
          }
          else {
            callback(new Error('command not found'), '', '')
          }
        }
        return {} as ChildProcess
      })

      await expect(installerModule.installCcr()).rejects.toThrow('Permission denied')
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to install Claude Code Router'))
    })
  })

  describe('startCcrService', () => {
    it('should start CCR service successfully', async () => {
      const mockExec = exec as any
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (cmd === 'ccr') {
          // Simulate successful start (no error)
          if (typeof callback === 'function') {
            setTimeout(() => callback(null, '', ''), 10)
          }
        }
        return {} as ChildProcess
      })

      await startCcrService()

      // Service should be called
      expect(mockExec).toHaveBeenCalledWith('ccr', expect.any(Function))
    })

    it('should handle service start failure', async () => {
      const mockExec = exec as any
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (cmd === 'ccr') {
          // Call the callback asynchronously to simulate real behavior
          if (typeof callback === 'function') {
            setTimeout(() => callback(new Error('Service failed'), '', ''), 0)
          }
        }
        return {} as ChildProcess
      })

      await startCcrService()

      // Wait a bit for the async callback to be processed
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to start CCR service'),
        expect.any(Error),
      )
    })

    it('should use default language when not specified', async () => {
      const mockExec = exec as any
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (cmd === 'ccr') {
          if (typeof callback === 'function') {
            setTimeout(() => callback(null, '', ''), 10)
          }
        }
        return {} as ChildProcess
      })

      // Just verify the function runs without error - i18n integration is handled globally
      await expect(startCcrService()).resolves.not.toThrow()
    })
  })
})
