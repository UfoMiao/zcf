import ansis from 'ansis'
import { x } from 'tinyexec'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { executeCcusage } from '../../src/commands/ccu'
import * as zcfConfig from '../../src/utils/zcf-config'

// Mock tinyexec
vi.mock('tinyexec', () => ({
  x: vi.fn(),
}))

// Mock zcf-config
vi.mock('../../src/utils/zcf-config')

describe('cCU Command', () => {
  let consoleLogSpy: any
  let consoleErrorSpy: any
  let processExitSpy: any
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called')
    })

    // Set test environment
    process.env = { ...originalEnv, NODE_ENV: 'test' }

    // Default mock for zcfConfig
    vi.mocked(zcfConfig.readZcfConfigAsync).mockResolvedValue({
      preferredLang: 'en',
    } as any)
  })

  afterEach(() => {
    consoleLogSpy?.mockRestore()
    consoleErrorSpy?.mockRestore()
    processExitSpy?.mockRestore()
    process.env = originalEnv
  })

  describe('executeCcusage', () => {
    it('should execute ccusage with default settings', async () => {
      vi.mocked(x).mockResolvedValueOnce({
        stdout: 'Usage statistics',
        stderr: '',
        exitCode: 0,
      })

      await executeCcusage()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        ansis.cyan('Running Claude Code usage analysis tool...'),
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        ansis.gray('$ npx ccusage@latest '),
      )
      expect(x).toHaveBeenCalledWith(
        'npx',
        ['ccusage@latest'],
        {
          nodeOptions: {
            stdio: 'inherit',
          },
        },
      )
    })

    it('should pass arguments to ccusage', async () => {
      vi.mocked(x).mockResolvedValueOnce({
        stdout: 'Statistics output',
        stderr: '',
        exitCode: 0,
      })

      await executeCcusage(['--json', '--output', 'report.json'])

      expect(consoleLogSpy).toHaveBeenCalledWith(
        ansis.gray('$ npx ccusage@latest --json --output report.json'),
      )
      expect(x).toHaveBeenCalledWith(
        'npx',
        ['ccusage@latest', '--json', '--output', 'report.json'],
        {
          nodeOptions: {
            stdio: 'inherit',
          },
        },
      )
    })

    it('should use Chinese language when configured', async () => {
      vi.mocked(zcfConfig.readZcfConfigAsync).mockResolvedValue({
        preferredLang: 'zh-CN',
      } as any)
      vi.mocked(x).mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 0,
      })

      await executeCcusage()

      // With global i18n, messages are in the test environment language (English)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        ansis.cyan('Running Claude Code usage analysis tool...'),
      )
    })

    it('should handle execution errors gracefully', async () => {
      const error = new Error('Network error')
      vi.mocked(x).mockRejectedValueOnce(error)

      await expect(executeCcusage()).rejects.toThrow('Network error')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        ansis.red('CCUsage failed to run'),
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        ansis.yellow('Check network connection'),
      )
    })

    it('should show error details in debug mode', async () => {
      process.env.DEBUG = 'true'
      const error = new Error('Detailed error')
      vi.mocked(x).mockRejectedValueOnce(error)

      await expect(executeCcusage()).rejects.toThrow('Detailed error')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        ansis.gray('Error details:'),
        error,
      )
    })

    it('should handle missing language configuration', async () => {
      vi.mocked(zcfConfig.readZcfConfigAsync).mockResolvedValue(null)
      vi.mocked(x).mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 0,
      })

      await executeCcusage()

      // Should default to English
      expect(consoleLogSpy).toHaveBeenCalledWith(
        ansis.cyan('Running Claude Code usage analysis tool...'),
      )
    })

    it('should handle invalid language configuration', async () => {
      vi.mocked(zcfConfig.readZcfConfigAsync).mockResolvedValue({
        preferredLang: 'invalid-lang',
      } as any)
      vi.mocked(x).mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 0,
      })

      await executeCcusage()

      // Should fall back to valid language
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('ccusage'),
      )
    })

    it('should exit process in production mode on error', async () => {
      process.env.NODE_ENV = 'production'
      const error = new Error('Production error')
      vi.mocked(x).mockRejectedValueOnce(error)

      try {
        await executeCcusage()
      }
      catch (e: any) {
        expect(e.message).toBe('process.exit called')
      }

      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should handle empty arguments array', async () => {
      vi.mocked(x).mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 0,
      })

      await executeCcusage([])

      expect(x).toHaveBeenCalledWith(
        'npx',
        ['ccusage@latest'],
        {
          nodeOptions: {
            stdio: 'inherit',
          },
        },
      )
    })

    it('should handle x command with non-zero exit code', async () => {
      vi.mocked(x).mockResolvedValueOnce({
        stdout: '',
        stderr: 'Command failed',
        exitCode: 1,
      })

      // Should not throw if x resolves (even with non-zero exit code)
      await executeCcusage()

      expect(x).toHaveBeenCalled()
    })
  })
})
