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

describe('cCU Command - Edge Cases', () => {
  let consoleLogSpy: any
  let consoleErrorSpy: any
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

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
    process.env = originalEnv
  })

  describe('edge cases', () => {
    it('should handle very long argument lists', async () => {
      const longArgs = Array.from({ length: 100 }).fill('--flag').map((arg, i) => `${arg}-${i}`)
      vi.mocked(x).mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 0,
      })

      await executeCcusage(longArgs)

      expect(x).toHaveBeenCalledWith(
        'npx',
        ['ccusage@latest', ...longArgs],
        expect.any(Object),
      )
    })

    it('should handle special characters in arguments', async () => {
      const specialArgs = ['--path="/home/user/My Documents"', '--filter=*.{js,ts}', '--emoji=🚀']
      vi.mocked(x).mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 0,
      })

      await executeCcusage(specialArgs)

      expect(x).toHaveBeenCalledWith(
        'npx',
        ['ccusage@latest', ...specialArgs],
        expect.any(Object),
      )
    })

    it('should handle concurrent executions', async () => {
      let callCount = 0
      vi.mocked(x).mockImplementation(() => {
        callCount++
        return {
          stdout: `Execution ${callCount}`,
          stderr: '',
          exitCode: 0,
          pipe: vi.fn(),
          process: { pid: 123 } as any,
          kill: vi.fn(),
          pid: 123,
        } as any
      })

      const results = await Promise.all([
        executeCcusage(['--test1']),
        executeCcusage(['--test2']),
        executeCcusage(['--test3']),
      ])

      expect(callCount).toBe(3)
      expect(results).toHaveLength(3)
    })

    it('should handle zcfConfig read errors', async () => {
      // Config read fails, but we catch it and use default
      vi.mocked(zcfConfig.readZcfConfigAsync)
        .mockRejectedValueOnce(new Error('Config file corrupted'))
        .mockRejectedValueOnce(new Error('Config file corrupted'))

      // x command succeeds
      vi.mocked(x).mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 0,
      })

      // Should still work with default language when config fails
      await executeCcusage()

      expect(x).toHaveBeenCalled()
    })

    it('should handle undefined zcfConfig fields', async () => {
      vi.mocked(zcfConfig.readZcfConfigAsync).mockResolvedValue({
        // preferredLang is undefined
      } as any)
      vi.mocked(x).mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 0,
      })

      await executeCcusage()

      // Should use default language
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Running Claude Code'),
      )
    })

    it('should handle x command throwing non-Error objects', async () => {
      vi.mocked(x).mockRejectedValueOnce('String error')

      await expect(executeCcusage()).rejects.toEqual('String error')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('CCUsage failed to run'),
      )
    })

    it('should handle x command with large output', async () => {
      const largeOutput = 'x'.repeat(1000000) // 1MB of output
      vi.mocked(x).mockResolvedValueOnce({
        stdout: largeOutput,
        stderr: '',
        exitCode: 0,
      })

      await executeCcusage()

      expect(x).toHaveBeenCalled()
    })

    it('should handle environment variable edge cases', async () => {
      // Test with DEBUG=true
      process.env.DEBUG = 'true'

      vi.mocked(x).mockRejectedValueOnce(new Error('Test error'))

      try {
        await executeCcusage()
      }
      catch {
        // Expected to throw
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error details'),
        expect.any(Error),
      )

      // Test with DEBUG not set
      delete process.env.DEBUG
      vi.clearAllMocks()
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      vi.mocked(zcfConfig.readZcfConfigAsync).mockResolvedValue({
        preferredLang: 'en',
      } as any)
      vi.mocked(x).mockRejectedValueOnce(new Error('Test error 2'))

      try {
        await executeCcusage()
      }
      catch {
        // Expected to throw
      }

      // Should not have Error details line when DEBUG is not set
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Error details'),
        expect.any(Error),
      )
    })

    it('should handle race condition in error handling', async () => {
      // Simulate rapid config read during error
      let configCallCount = 0
      vi.mocked(zcfConfig.readZcfConfigAsync).mockImplementation(async () => {
        configCallCount++
        await new Promise(resolve => setTimeout(resolve, 10))
        return {
          preferredLang: configCallCount % 2 === 0 ? 'en' : 'zh-CN',
        } as any
      })

      vi.mocked(x).mockRejectedValueOnce(new Error('Execution error'))

      await expect(executeCcusage()).rejects.toThrow('Execution error')

      // Config is no longer read by CCU command with global i18n
      expect(configCallCount).toBe(0)
    })

    it('should handle null arguments', async () => {
      vi.mocked(x).mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 0,
      })

      // When null is passed, it should be treated as empty array
      // @ts-expect-error - testing runtime behavior
      await executeCcusage(null)

      // The join will fail on null, but we should handle it
      expect(x).toHaveBeenCalled()
    })

    it('should handle arguments with null values', async () => {
      vi.mocked(x).mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 0,
      })

      // @ts-expect-error - testing runtime behavior
      await executeCcusage([null, undefined, '', 'valid-arg'])

      expect(x).toHaveBeenCalledWith(
        'npx',
        ['ccusage@latest', null, undefined, '', 'valid-arg'],
        expect.any(Object),
      )
    })
  })

  describe('performance scenarios', () => {
    it('should handle rapid successive calls', async () => {
      let executionCount = 0
      vi.mocked(x).mockImplementation(() => {
        executionCount++
        return {
          stdout: '',
          stderr: '',
          exitCode: 0,
          pipe: vi.fn(),
          process: { pid: 123 } as any,
          kill: vi.fn(),
          pid: 123,
        } as any
      })

      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(executeCcusage([`--test-${i}`]))
      }

      await Promise.all(promises)

      expect(executionCount).toBe(10)
    })

    it('should handle memory-intensive arguments', async () => {
      // Create a very large argument string
      const largeArg = `--data=${'x'.repeat(100000)}`
      vi.mocked(x).mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 0,
      })

      await executeCcusage([largeArg])

      expect(x).toHaveBeenCalledWith(
        'npx',
        ['ccusage@latest', largeArg],
        expect.any(Object),
      )
    })
  })
})
