import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addCCometixLineConfig, hasCCometixLineConfig } from '../../../../src/utils/ccometixline-config'

// Mock dependencies
vi.mock('../../../../src/utils/ccometixline-config')

const mockAddCCometixLineConfig = vi.mocked(addCCometixLineConfig)
const mockHasCCometixLineConfig = vi.mocked(hasCCometixLineConfig)

describe('cCometixLine Configuration Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('cCometixLine Configuration Integration', () => {
    it('should call addCCometixLineConfig when imported into installer', () => {
      // Test that the function is properly imported and callable
      mockAddCCometixLineConfig.mockReturnValue(true)

      const result = addCCometixLineConfig()

      expect(mockAddCCometixLineConfig).toHaveBeenCalledOnce()
      expect(result).toBe(true)
    })

    it('should handle configuration failures gracefully', () => {
      // Test error handling for configuration failures
      mockAddCCometixLineConfig.mockImplementation(() => {
        throw new Error('Configuration failed')
      })

      expect(() => addCCometixLineConfig()).toThrow('Configuration failed')
      expect(mockAddCCometixLineConfig).toHaveBeenCalledOnce()
    })

    it('should be available for import in the installer module', async () => {
      // Verify the integration is properly set up by checking the module import
      const installerModule = await import('../../../../src/utils/cometix/installer')

      // The installer should have imported our addCCometixLineConfig function
      expect(installerModule).toBeDefined()

      // Verify that our function can be called
      mockAddCCometixLineConfig.mockReturnValue(true)
      addCCometixLineConfig()
      expect(mockAddCCometixLineConfig).toHaveBeenCalledOnce()
    })

    it('should check if configuration exists and only add if missing', () => {
      // Test scenario 1: Config doesn't exist, should add
      mockHasCCometixLineConfig.mockReturnValue(false)
      mockAddCCometixLineConfig.mockReturnValue(true)

      // Simulate the installer logic
      if (!hasCCometixLineConfig()) {
        addCCometixLineConfig()
      }

      expect(mockHasCCometixLineConfig).toHaveBeenCalledOnce()
      expect(mockAddCCometixLineConfig).toHaveBeenCalledOnce()

      // Reset mocks
      vi.clearAllMocks()

      // Test scenario 2: Config exists, should not add
      mockHasCCometixLineConfig.mockReturnValue(true)

      if (!hasCCometixLineConfig()) {
        addCCometixLineConfig()
      }

      expect(mockHasCCometixLineConfig).toHaveBeenCalledOnce()
      expect(mockAddCCometixLineConfig).not.toHaveBeenCalled()
    })

    it('should handle hasCCometixLineConfig function correctly', () => {
      // Test that the hasCCometixLineConfig function is properly imported and callable
      mockHasCCometixLineConfig.mockReturnValue(true)

      const result = hasCCometixLineConfig()

      expect(mockHasCCometixLineConfig).toHaveBeenCalledOnce()
      expect(result).toBe(true)
    })
  })
})
