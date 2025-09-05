import process from 'node:process'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { checkUpdates } from '../../../src/commands/check-updates'
import { checkAndUpdateTools } from '../../../src/utils/auto-updater'

// Mock modules

vi.mock('../../../src/i18n', () => ({
  i18n: {
    t: vi.fn((key: string) => key),
  },
}))

vi.mock('../../../src/utils/auto-updater', () => ({
  checkAndUpdateTools: vi.fn(),
}))

// Mock console.error and process.exit
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
const mockProcessExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)

interface TestMocks {
  checkAndUpdateTools: any
}

let testMocks: TestMocks

describe('check-updates', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockConsoleError.mockClear()
    mockProcessExit.mockClear()

    testMocks = {
      checkAndUpdateTools: checkAndUpdateTools as any,
    }
  })

  describe('checkUpdates', () => {
    it('should call checkAndUpdateTools with default skipPrompt=false', async () => {
      testMocks.checkAndUpdateTools.mockResolvedValue(undefined)

      await checkUpdates()

      expect(testMocks.checkAndUpdateTools).toHaveBeenCalledWith(false)
    })

    it('should call checkAndUpdateTools with skipPrompt=true when specified', async () => {
      testMocks.checkAndUpdateTools.mockResolvedValue(undefined)

      await checkUpdates({ skipPrompt: true })

      expect(testMocks.checkAndUpdateTools).toHaveBeenCalledWith(true)
    })

    it('should call checkAndUpdateTools with skipPrompt=false when specified as false', async () => {
      testMocks.checkAndUpdateTools.mockResolvedValue(undefined)

      await checkUpdates({ skipPrompt: false })

      expect(testMocks.checkAndUpdateTools).toHaveBeenCalledWith(false)
    })

    it('should handle lang option (currently unused but part of interface)', async () => {
      testMocks.checkAndUpdateTools.mockResolvedValue(undefined)

      await checkUpdates({ lang: 'zh-CN', skipPrompt: true })

      expect(testMocks.checkAndUpdateTools).toHaveBeenCalledWith(true)
    })

    it('should handle empty options object', async () => {
      testMocks.checkAndUpdateTools.mockResolvedValue(undefined)

      await checkUpdates({})

      expect(testMocks.checkAndUpdateTools).toHaveBeenCalledWith(false)
    })

    it('should handle checkAndUpdateTools error and exit with code 1', async () => {
      const errorMessage = 'Update check failed'
      testMocks.checkAndUpdateTools.mockRejectedValue(new Error(errorMessage))

      await checkUpdates()

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining(`updater:errorCheckingUpdates ${errorMessage}`),
      )
      expect(mockProcessExit).toHaveBeenCalledWith(1)
    })

    it('should handle non-Error objects and convert to string', async () => {
      const errorMessage = 'String error'
      testMocks.checkAndUpdateTools.mockRejectedValue(errorMessage)

      await checkUpdates()

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining(`updater:errorCheckingUpdates ${errorMessage}`),
      )
      expect(mockProcessExit).toHaveBeenCalledWith(1)
    })

    it('should handle null error and convert to string', async () => {
      testMocks.checkAndUpdateTools.mockRejectedValue(null)

      await checkUpdates()

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('updater:errorCheckingUpdates null'),
      )
      expect(mockProcessExit).toHaveBeenCalledWith(1)
    })

    it('should handle undefined error and convert to string', async () => {
      testMocks.checkAndUpdateTools.mockRejectedValue(undefined)

      await checkUpdates()

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('updater:errorCheckingUpdates undefined'),
      )
      expect(mockProcessExit).toHaveBeenCalledWith(1)
    })

    it('should handle skipPrompt option from different sources', async () => {
      testMocks.checkAndUpdateTools.mockResolvedValue(undefined)

      // Test various skipPrompt scenarios
      await checkUpdates({ skipPrompt: undefined })
      expect(testMocks.checkAndUpdateTools).toHaveBeenLastCalledWith(false)

      testMocks.checkAndUpdateTools.mockClear()

      await checkUpdates({ skipPrompt: null as any })
      expect(testMocks.checkAndUpdateTools).toHaveBeenLastCalledWith(false)
    })
  })
})
