import type { ClaudeSettings } from '../../../src/types/config'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addCCometixLineConfig,
  getCCometixLineConfigText,
  hasCCometixLineConfig,
  removeCCometixLineConfig,
} from '../../../src/utils/ccometixline-config'
import { exists } from '../../../src/utils/fs-operations'
import { readJsonConfig, writeJsonConfig } from '../../../src/utils/json-config'

// Mock dependencies
vi.mock('../../../src/utils/json-config')
vi.mock('../../../src/utils/fs-operations')
vi.mock('../../../src/utils/statusline-validator', () => ({
  getPlatformStatusLineConfig: vi.fn(() => ({
    type: 'command',
    command: '~/.claude/ccline/ccline',
    padding: 0,
  })),
}))

const mockReadJsonConfig = vi.mocked(readJsonConfig)
const mockWriteJsonConfig = vi.mocked(writeJsonConfig)
const mockExists = vi.mocked(exists)

describe('cCometixLine Configuration', () => {
  let consoleErrorSpy: any

  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    consoleErrorSpy.mockRestore()
  })

  describe('addCCometixLineConfig', () => {
    it('should add statusLine config when settings file does not exist', () => {
      mockExists.mockReturnValue(false)

      const result = addCCometixLineConfig()

      expect(result).toBe(true)
      expect(mockWriteJsonConfig).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          statusLine: expect.objectContaining({
            type: 'command',
            command: expect.stringContaining('ccline'),
          }),
        }),
      )
    })

    it('should add statusLine config to existing settings', () => {
      const existingSettings: ClaudeSettings = {
        model: 'opus',
        env: {
          ANTHROPIC_API_KEY: 'test-key',
        },
      }

      mockExists.mockReturnValue(true)
      mockReadJsonConfig.mockReturnValue(existingSettings)

      const result = addCCometixLineConfig()

      expect(result).toBe(true)
      expect(mockWriteJsonConfig).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          model: 'opus',
          env: {
            ANTHROPIC_API_KEY: 'test-key',
          },
          statusLine: expect.objectContaining({
            type: 'command',
            command: expect.stringContaining('ccline'),
          }),
        }),
      )
    })

    it('should handle errors gracefully', () => {
      mockExists.mockImplementation(() => {
        throw new Error('File system error')
      })

      const result = addCCometixLineConfig()

      expect(result).toBe(false)
    })
  })

  describe('hasCCometixLineConfig', () => {
    it('should return false when settings file does not exist', () => {
      mockExists.mockReturnValue(false)

      const result = hasCCometixLineConfig()

      expect(result).toBe(false)
    })

    it('should return true when CCometixLine statusLine exists', () => {
      const settingsWithCCline: ClaudeSettings = {
        statusLine: {
          type: 'command',
          command: '~/.claude/ccline/ccline',
          padding: 0,
        },
      }

      mockExists.mockReturnValue(true)
      mockReadJsonConfig.mockReturnValue(settingsWithCCline)

      const result = hasCCometixLineConfig()

      expect(result).toBe(true)
    })

    it('should return false when statusLine exists but is not CCometixLine', () => {
      const settingsWithOtherStatusLine: ClaudeSettings = {
        statusLine: {
          type: 'command',
          command: 'other-command',
          padding: 0,
        },
      }

      mockExists.mockReturnValue(true)
      mockReadJsonConfig.mockReturnValue(settingsWithOtherStatusLine)

      const result = hasCCometixLineConfig()

      expect(result).toBe(false)
    })

    it('should handle errors gracefully', () => {
      mockExists.mockImplementation(() => {
        throw new Error('File system error')
      })

      const result = hasCCometixLineConfig()

      expect(result).toBe(false)
    })
  })

  describe('removeCCometixLineConfig', () => {
    it('should return true when settings file does not exist', () => {
      mockExists.mockReturnValue(false)

      const result = removeCCometixLineConfig()

      expect(result).toBe(true)
    })

    it('should remove statusLine config from existing settings', () => {
      const settingsWithStatusLine: ClaudeSettings = {
        model: 'opus',
        statusLine: {
          type: 'command',
          command: '~/.claude/ccline/ccline',
          padding: 0,
        },
        env: {
          ANTHROPIC_API_KEY: 'test-key',
        },
      }

      mockExists.mockReturnValue(true)
      mockReadJsonConfig.mockReturnValue(settingsWithStatusLine)

      const result = removeCCometixLineConfig()

      expect(result).toBe(true)
      expect(mockWriteJsonConfig).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          model: 'opus',
          env: {
            ANTHROPIC_API_KEY: 'test-key',
          },
        }),
      )

      // Verify statusLine was removed
      const writtenConfig = mockWriteJsonConfig.mock.calls[0][1] as ClaudeSettings
      expect(writtenConfig.statusLine).toBeUndefined()
    })

    it('should handle errors gracefully', () => {
      mockExists.mockImplementation(() => {
        throw new Error('File system error')
      })

      const result = removeCCometixLineConfig()

      expect(result).toBe(false)
    })
  })

  describe('getCCometixLineConfigText', () => {
    it('should return formatted configuration text', () => {
      const result = getCCometixLineConfigText()

      expect(result).toContain('"statusLine"')
      expect(result).toContain('"type": "command"')
      expect(result).toContain('"command"')
      expect(result).toContain('ccline')
      expect(result).toContain('"padding"')
    })
  })
})
