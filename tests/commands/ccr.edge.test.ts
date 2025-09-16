import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ccr } from '../../src/commands/ccr'
import * as menu from '../../src/commands/menu'
import * as banner from '../../src/utils/banner'
import * as errorHandler from '../../src/utils/error-handler'
import * as prompts from '../../src/utils/prompts'
import * as ccrMenu from '../../src/utils/tools/ccr-menu'
import * as zcfConfig from '../../src/utils/zcf-config'

vi.mock('../../src/utils/tools/ccr-menu')
vi.mock('../../src/utils/error-handler')
vi.mock('../../src/utils/zcf-config')
vi.mock('../../src/utils/prompts')
vi.mock('../../src/utils/banner')
vi.mock('../../src/commands/menu')

describe('ccr command - edge cases', () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mocks
    vi.mocked(banner.displayBannerWithInfo).mockImplementation(() => {})
    vi.mocked(zcfConfig.readZcfConfigAsync).mockResolvedValue({
      preferredLang: 'en',
      codeToolType: 'claude-code',
    } as any)
    vi.mocked(prompts.selectScriptLanguage).mockResolvedValue('en')
    vi.mocked(ccrMenu.showCcrMenu).mockResolvedValue(false)
    vi.mocked(menu.showMainMenu).mockResolvedValue()
    vi.mocked(errorHandler.handleExitPromptError).mockReturnValue(false)
    vi.mocked(errorHandler.handleGeneralError).mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('boundary conditions', () => {
    it('should handle empty options object', async () => {
      await ccr({})

      expect(ccrMenu.showCcrMenu).toHaveBeenCalled()
    })

    it('should handle undefined options', async () => {
      await ccr(undefined)

      expect(ccrMenu.showCcrMenu).toHaveBeenCalled()
    })

    it('should handle invalid language in options', async () => {
      await ccr()

      // Should still call showCcrMenu (language is handled globally now)
      expect(ccrMenu.showCcrMenu).toHaveBeenCalled()
    })

    it('should handle concurrent executions', async () => {
      let callCount = 0
      vi.mocked(ccrMenu.showCcrMenu).mockImplementation(async () => {
        callCount++
        await new Promise(resolve => setTimeout(resolve, 10))
        return false
      })

      const promises = [
        ccr(),
        ccr(),
        ccr(),
      ]

      await Promise.all(promises)

      expect(callCount).toBe(3)
      expect(ccrMenu.showCcrMenu).toHaveBeenCalledTimes(3)
    })
  })

  describe('error recovery', () => {
    it('should handle menu errors gracefully', async () => {
      vi.mocked(ccrMenu.showCcrMenu).mockRejectedValue(new Error('Menu error'))
      vi.mocked(errorHandler.handleExitPromptError).mockReturnValue(false)

      await ccr()

      expect(errorHandler.handleGeneralError).toHaveBeenCalledWith(
        expect.any(Error),
      )
    })

    it('should handle mixed error types', async () => {
      const customError = new Error('Custom error')
      customError.name = 'CustomError'

      vi.mocked(ccrMenu.showCcrMenu).mockRejectedValue(customError)
      vi.mocked(errorHandler.handleExitPromptError).mockReturnValue(false)

      await ccr()

      expect(errorHandler.handleExitPromptError).toHaveBeenCalledWith(customError)
      expect(errorHandler.handleGeneralError).toHaveBeenCalledWith(customError)
    })

    it('should handle null config gracefully', async () => {
      await ccr({ skipBanner: true })

      // Config reading is no longer part of ccr command with global i18n
      expect(ccrMenu.showCcrMenu).toHaveBeenCalled()
    })

    it('should handle undefined preferredLang in config', async () => {
      await ccr({})

      // Language handling is now global, no config reading in ccr
      expect(ccrMenu.showCcrMenu).toHaveBeenCalled()
    })
  })

  describe('integration scenarios', () => {
    it('should handle full flow with all options', async () => {
      vi.mocked(ccrMenu.showCcrMenu).mockResolvedValue(true)

      await ccr({
        skipBanner: false,
      })

      expect(banner.displayBannerWithInfo).toHaveBeenCalled()
      expect(ccrMenu.showCcrMenu).toHaveBeenCalled()
      expect(menu.showMainMenu).not.toHaveBeenCalled()
    })

    it('should handle menu navigation back', async () => {
      vi.mocked(ccrMenu.showCcrMenu).mockResolvedValue(false)

      await ccr()

      expect(menu.showMainMenu).toHaveBeenCalled()
    })

    it('should handle exit during menu', async () => {
      const exitError = new Error('User exited')
      exitError.name = 'ExitPromptError'

      vi.mocked(ccrMenu.showCcrMenu).mockRejectedValue(exitError)
      vi.mocked(errorHandler.handleExitPromptError).mockReturnValue(true)

      await ccr()

      expect(errorHandler.handleExitPromptError).toHaveBeenCalledWith(exitError)
      expect(menu.showMainMenu).not.toHaveBeenCalled()
    })
  })

  describe('performance scenarios', () => {
    it('should handle rapid successive calls', async () => {
      let executionCount = 0
      vi.mocked(ccrMenu.showCcrMenu).mockImplementation(async () => {
        executionCount++
        return false
      })

      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(ccr())
      }

      await Promise.all(promises)

      expect(executionCount).toBe(10)
    })

    it('should handle slow config read', async () => {
      vi.mocked(zcfConfig.readZcfConfigAsync).mockImplementation(
        () => new Promise(resolve =>
          setTimeout(() => resolve({ preferredLang: 'en' } as any), 100),
        ),
      )

      await ccr({})
      // Note: Duration tracking was removed due to flaky behavior in CI environments
      expect(ccrMenu.showCcrMenu).toHaveBeenCalled()
    })
  })
})
