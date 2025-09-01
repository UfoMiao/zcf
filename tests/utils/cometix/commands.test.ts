import { exec, spawn } from 'node:child_process'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as commandsModule from '../../../src/utils/cometix/commands'

// Don't destructure to allow proper mocking
const { runCometixPrintConfig, runCometixTuiConfig } = commandsModule

vi.mock('node:child_process', () => ({
  exec: vi.fn(),
  spawn: vi.fn(),
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
    // Only mock initialization functions to avoid setup issues in tests
    ensureI18nInitialized: vi.fn(),
  }
})

describe('cCometixLine commands', () => {
  let consoleLogSpy: any
  let consoleErrorSpy: any

  beforeEach(() => {
    vi.clearAllMocks()
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('runCometixPrintConfig', () => {
    it('should print default configuration successfully', async () => {
      const mockExec = vi.mocked(exec)
      const configOutput = JSON.stringify(
        {
          segments: ['path', 'git', 'model', 'context'],
          theme: 'default',
        },
        null,
        2,
      )

      mockExec.mockImplementation((_command, callback: any) => {
        callback(null, configOutput, '')
        return {} as any
      })

      await runCometixPrintConfig()

      expect(mockExec).toHaveBeenCalledWith('ccline --print', expect.any(Function))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Printing CCometixLine configuration...'))
      expect(consoleLogSpy).toHaveBeenCalledWith(configOutput)
    })

    it('should handle ccline command not found', async () => {
      const mockExec = vi.mocked(exec)
      mockExec.mockImplementation((_command, callback: any) => {
        const error = new Error('command not found: ccline')
        callback(error, '', 'command not found: ccline')
        return {} as any
      })

      await expect(runCometixPrintConfig()).rejects.toThrow('command not found: ccline')
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('ccline command not found'),
      )
    })

    it('should handle configuration print failure', async () => {
      const mockExec = vi.mocked(exec)
      mockExec.mockImplementation((_command, callback: any) => {
        const error = new Error('Config file not found')
        callback(error, '', 'Error: Configuration file not found')
        return {} as any
      })

      await expect(runCometixPrintConfig()).rejects.toThrow('Config file not found')
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to print configuration'))
    })
  })

  describe('runCometixTuiConfig', () => {
    it('should run TUI configuration successfully', async () => {
      const mockSpawn = vi.mocked(spawn)
      const mockChild = {
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            // Simulate successful completion
            callback(0)
          }
          return mockChild
        }),
      }

      mockSpawn.mockReturnValue(mockChild as any)

      await runCometixTuiConfig()

      expect(mockSpawn).toHaveBeenCalledWith('ccline', ['-c'], {
        stdio: 'inherit',
        shell: true,
      })
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Entering CCometixLine TUI'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('TUI configuration completed'))
    })

    it('should handle ccline command not found in TUI config', async () => {
      const mockSpawn = vi.mocked(spawn)
      const mockChild = {
        on: vi.fn((event, callback) => {
          if (event === 'error') {
            // Simulate command not found error
            callback(new Error('spawn ccline ENOENT'))
          }
          return mockChild
        }),
      }

      mockSpawn.mockReturnValue(mockChild as any)

      await expect(runCometixTuiConfig()).rejects.toThrow('spawn ccline ENOENT')
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('ccline command not found'),
      )
    })

    it('should handle TUI configuration failure', async () => {
      const mockSpawn = vi.mocked(spawn)
      const mockChild = {
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            // Simulate exit with error code
            callback(1)
          }
          return mockChild
        }),
      }

      mockSpawn.mockReturnValue(mockChild as any)

      await expect(runCometixTuiConfig()).rejects.toThrow('ccline -c exited with code 1')
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to run TUI configuration'))
    })
  })
})
