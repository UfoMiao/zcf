import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handleExitPromptError, handleGeneralError } from '../../../src/utils/error-handler'

vi.mock('ansis', () => ({
  default: {
    cyan: (text: string) => text,
    red: (text: string) => text,
    gray: (text: string) => text,
  },
}))

vi.mock('../../../src/utils/zcf-config', () => ({
  readZcfConfig: vi.fn(),
}))

describe('error-handler utilities', () => {
  let exitSpy: any
  let consoleLogSpy: any
  let consoleErrorSpy: any

  beforeEach(() => {
    vi.clearAllMocks()
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called')
    })
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    exitSpy.mockRestore()
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('handleExitPromptError', () => {
    it('should handle ExitPromptError and exit gracefully', async () => {
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')
      vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'zh-CN', version: '1.0.0', lastUpdated: '2024-01-01', codeToolType: 'claude-code' })

      const error = new Error('User exited')
      error.name = 'ExitPromptError'

      expect(() => handleExitPromptError(error)).toThrow('process.exit called')
      expect(consoleLogSpy).toHaveBeenCalled()
      expect(exitSpy).toHaveBeenCalledWith(0)
    })

    it('should use default language when config is not available', async () => {
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')
      vi.mocked(readZcfConfig).mockReturnValue(null)

      const error = new Error('User exited')
      error.name = 'ExitPromptError'

      expect(() => handleExitPromptError(error)).toThrow('process.exit called')
      expect(consoleLogSpy).toHaveBeenCalled()
      expect(exitSpy).toHaveBeenCalledWith(0)
    })

    it('should return false for non-ExitPromptError', () => {
      const error = new Error('Some other error')

      const result = handleExitPromptError(error)

      expect(result).toBe(false)
      expect(exitSpy).not.toHaveBeenCalled()
    })

    it('should return false for non-Error objects', () => {
      const result = handleExitPromptError('string error')

      expect(result).toBe(false)
      expect(exitSpy).not.toHaveBeenCalled()
    })

    it('should return false for null/undefined', () => {
      expect(handleExitPromptError(null)).toBe(false)
      expect(handleExitPromptError(undefined)).toBe(false)
      expect(exitSpy).not.toHaveBeenCalled()
    })
  })

  describe('handleGeneralError', () => {
    it('should handle Error objects with stack trace', async () => {
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')
      vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'en', version: '1.0.0', lastUpdated: '2024-01-01', codeToolType: 'claude-code' })

      const error = new Error('Test error')
      error.stack = 'Error: Test error\n    at test.js:1:1'

      expect(() => handleGeneralError(error)).toThrow('process.exit called')
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2)
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error:'), error)
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Stack:'))
      expect(exitSpy).toHaveBeenCalledWith(1)
    })

    it('should handle non-Error objects', async () => {
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')
      vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'zh-CN', version: '1.0.0', lastUpdated: '2024-01-01', codeToolType: 'claude-code' })

      expect(() => handleGeneralError('string error')).toThrow('process.exit called')
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
      expect(exitSpy).toHaveBeenCalledWith(1)
    })

    it('should use provided language parameter', async () => {
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')
      vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'zh-CN', version: '1.0.0', lastUpdated: '2024-01-01', codeToolType: 'claude-code' })

      expect(() => handleGeneralError(new Error('Test'))).toThrow('process.exit called')
      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(exitSpy).toHaveBeenCalledWith(1)
    })

    it('should fall back to en when no config and no lang provided', async () => {
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')
      vi.mocked(readZcfConfig).mockReturnValue(null)

      expect(() => handleGeneralError(new Error('Test'))).toThrow('process.exit called')
      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(exitSpy).toHaveBeenCalledWith(1)
    })

    it('should handle undefined error', async () => {
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')
      vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'en', version: '1.0.0', lastUpdated: '2024-01-01', codeToolType: 'claude-code' })

      expect(() => handleGeneralError(undefined)).toThrow('process.exit called')
      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(exitSpy).toHaveBeenCalledWith(1)
    })

    it('should handle null error', async () => {
      const { readZcfConfig } = await import('../../../src/utils/zcf-config')
      vi.mocked(readZcfConfig).mockReturnValue({ preferredLang: 'en', version: '1.0.0', lastUpdated: '2024-01-01', codeToolType: 'claude-code' })

      expect(() => handleGeneralError(null)).toThrow('process.exit called')
      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(exitSpy).toHaveBeenCalledWith(1)
    })
  })
})
