import type { ClaudeConfiguration } from '../../src/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ensureApiKeyApproved,
  manageApiKeyApproval,
  removeApiKeyFromRejected,
} from '../../src/utils/claude-config'

import { readJsonConfig, writeJsonConfig } from '../../src/utils/json-config'

// Mock the file system operations
vi.mock('../../src/utils/json-config', () => ({
  readJsonConfig: vi.fn(),
  writeJsonConfig: vi.fn(),
}))

vi.mock('../../src/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/constants')>()
  return {
    ...actual,
    ClAUDE_CONFIG_FILE: '/mock/.claude/settings.json',
  }
})

describe('aPI Key Approval Management', () => {
  const CCR_API_KEY = 'sk-zcf-x-ccr'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('ensureApiKeyApproved', () => {
    it('should add API key to approved list when customApiKeyResponses does not exist', () => {
      // Red phase: Test should fail initially
      const config: ClaudeConfiguration = {
        mcpServers: {},
        hasCompletedOnboarding: true,
      }

      const result = ensureApiKeyApproved(config, CCR_API_KEY)

      expect(result.customApiKeyResponses).toBeDefined()
      expect(result.customApiKeyResponses?.approved).toContain(CCR_API_KEY)
      expect(result.customApiKeyResponses?.rejected).toEqual([])
    })

    it('should add API key to approved list when approved array does not exist', () => {
      const config: ClaudeConfiguration = {
        mcpServers: {},
        hasCompletedOnboarding: true,
        customApiKeyResponses: {
          approved: [],
          rejected: [],
        },
      }

      const result = ensureApiKeyApproved(config, CCR_API_KEY)

      expect(result.customApiKeyResponses?.approved).toContain(CCR_API_KEY)
      expect(result.customApiKeyResponses?.rejected).toEqual([])
    })

    it('should not duplicate API key if already in approved list', () => {
      const config: ClaudeConfiguration = {
        mcpServers: {},
        hasCompletedOnboarding: true,
        customApiKeyResponses: {
          approved: [CCR_API_KEY],
          rejected: [],
        },
      }

      const result = ensureApiKeyApproved(config, CCR_API_KEY)

      expect(result.customApiKeyResponses?.approved).toEqual([CCR_API_KEY])
      expect(result.customApiKeyResponses?.approved.length).toBe(1)
    })

    it('should move API key from rejected to approved list', () => {
      const config: ClaudeConfiguration = {
        mcpServers: {},
        hasCompletedOnboarding: true,
        customApiKeyResponses: {
          approved: [],
          rejected: [CCR_API_KEY],
        },
      }

      const result = ensureApiKeyApproved(config, CCR_API_KEY)

      expect(result.customApiKeyResponses?.approved).toContain(CCR_API_KEY)
      expect(result.customApiKeyResponses?.rejected).not.toContain(CCR_API_KEY)
    })

    it('should preserve other API keys when managing specific one', () => {
      const otherApiKey = 'sk-other-key'
      const config: ClaudeConfiguration = {
        mcpServers: {},
        hasCompletedOnboarding: true,
        customApiKeyResponses: {
          approved: [otherApiKey],
          rejected: [CCR_API_KEY, 'sk-another-rejected'],
        },
      }

      const result = ensureApiKeyApproved(config, CCR_API_KEY)

      expect(result.customApiKeyResponses?.approved).toContain(CCR_API_KEY)
      expect(result.customApiKeyResponses?.approved).toContain(otherApiKey)
      expect(result.customApiKeyResponses?.rejected).toContain('sk-another-rejected')
      expect(result.customApiKeyResponses?.rejected).not.toContain(CCR_API_KEY)
    })
  })

  describe('removeApiKeyFromRejected', () => {
    it('should remove API key from rejected list', () => {
      const config: ClaudeConfiguration = {
        mcpServers: {},
        customApiKeyResponses: {
          approved: [],
          rejected: [CCR_API_KEY, 'other-key'],
        },
      }

      const result = removeApiKeyFromRejected(config, CCR_API_KEY)

      expect(result.customApiKeyResponses?.rejected).not.toContain(CCR_API_KEY)
      expect(result.customApiKeyResponses?.rejected).toContain('other-key')
    })

    it('should handle empty rejected list gracefully', () => {
      const config: ClaudeConfiguration = {
        mcpServers: {},
        customApiKeyResponses: {
          approved: [],
          rejected: [],
        },
      }

      const result = removeApiKeyFromRejected(config, CCR_API_KEY)

      expect(result.customApiKeyResponses?.rejected).toEqual([])
    })

    it('should handle missing customApiKeyResponses gracefully', () => {
      const config: ClaudeConfiguration = {
        mcpServers: {},
      }

      const result = removeApiKeyFromRejected(config, CCR_API_KEY)

      expect(result).toEqual(config)
    })
  })

  describe('manageApiKeyApproval', () => {
    it('should read config, manage API key, and write back to file', () => {
      const mockConfig: ClaudeConfiguration = {
        mcpServers: {},
        hasCompletedOnboarding: true,
        customApiKeyResponses: {
          approved: [],
          rejected: [CCR_API_KEY],
        },
      }

      vi.mocked(readJsonConfig).mockReturnValue(mockConfig)

      manageApiKeyApproval(CCR_API_KEY)

      expect(readJsonConfig).toHaveBeenCalledWith('/mock/.claude/settings.json')
      expect(writeJsonConfig).toHaveBeenCalledWith('/mock/.claude/settings.json', expect.objectContaining({
        customApiKeyResponses: expect.objectContaining({
          approved: expect.arrayContaining([CCR_API_KEY]),
          rejected: expect.not.arrayContaining([CCR_API_KEY]),
        }),
      }))
    })

    it('should create new config if file does not exist', () => {
      vi.mocked(readJsonConfig).mockReturnValue(null)

      manageApiKeyApproval(CCR_API_KEY)

      expect(writeJsonConfig).toHaveBeenCalledWith('/mock/.claude/settings.json', expect.objectContaining({
        mcpServers: {},
        customApiKeyResponses: expect.objectContaining({
          approved: expect.arrayContaining([CCR_API_KEY]),
          rejected: [],
        }),
      }))
    })

    it('should handle file read errors gracefully', () => {
      // Mock console.error to suppress stderr output during testing
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      vi.mocked(readJsonConfig).mockImplementation(() => {
        throw new Error('File read error')
      })

      // Should not throw error, should handle gracefully
      expect(() => manageApiKeyApproval(CCR_API_KEY)).not.toThrow()

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalled()

      // Restore console.error
      consoleErrorSpy.mockRestore()
    })

    it('should handle file write errors gracefully', () => {
      // Mock console.error to suppress stderr output during testing
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const mockConfig: ClaudeConfiguration = {
        mcpServers: {},
        hasCompletedOnboarding: true,
      }

      vi.mocked(readJsonConfig).mockReturnValue(mockConfig)
      vi.mocked(writeJsonConfig).mockImplementation(() => {
        throw new Error('File write error')
      })

      // Should not throw error, should handle gracefully
      expect(() => manageApiKeyApproval(CCR_API_KEY)).not.toThrow()

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalled()

      // Restore console.error
      consoleErrorSpy.mockRestore()
    })
  })

  describe('edge Cases', () => {
    it('should handle undefined API key gracefully', () => {
      const config: ClaudeConfiguration = {
        mcpServers: {},
      }

      expect(() => ensureApiKeyApproved(config, undefined as any)).not.toThrow()
    })

    it('should handle empty string API key gracefully', () => {
      const config: ClaudeConfiguration = {
        mcpServers: {},
      }

      const result = ensureApiKeyApproved(config, '')

      expect(result.customApiKeyResponses?.approved || []).not.toContain('')
    })

    it('should handle malformed config gracefully', () => {
      const malformedConfig = {
        mcpServers: {},
        customApiKeyResponses: null, // Malformed
      } as any

      expect(() => ensureApiKeyApproved(malformedConfig, CCR_API_KEY)).not.toThrow()
    })

    it('should truncate API key to 20 characters for storage', () => {
      const config: ClaudeConfiguration = {
        mcpServers: {},
      }

      // Test with a long API key (more than 20 characters)
      const longApiKey = 'sk-zcf-x-ccr-very-long-api-key-that-exceeds-20-characters'
      const expectedTruncated = longApiKey.substring(0, 20) // 'sk-zcf-x-ccr-very-lo'

      const result = ensureApiKeyApproved(config, longApiKey)

      expect(result.customApiKeyResponses?.approved).toContain(expectedTruncated)
      expect(result.customApiKeyResponses?.approved).not.toContain(longApiKey)
      expect(expectedTruncated).toHaveLength(20)
    })

    it('should truncate API key when removing from rejected list', () => {
      const longApiKey = 'sk-zcf-x-ccr-very-long-api-key-that-exceeds-20-characters'
      const expectedTruncated = longApiKey.substring(0, 20)

      const config: ClaudeConfiguration = {
        mcpServers: {},
        customApiKeyResponses: {
          approved: [],
          rejected: [expectedTruncated], // Already truncated in rejected list
        },
      }

      const result = removeApiKeyFromRejected(config, longApiKey)

      expect(result.customApiKeyResponses?.rejected).not.toContain(expectedTruncated)
      expect(result.customApiKeyResponses?.rejected).toHaveLength(0)
    })

    it('should handle exactly 20 character API key without truncation', () => {
      const config: ClaudeConfiguration = {
        mcpServers: {},
      }

      // Exactly 20 characters
      const exactApiKey = 'sk-zcf-x-ccr-exact20'
      expect(exactApiKey).toHaveLength(20)

      const result = ensureApiKeyApproved(config, exactApiKey)

      expect(result.customApiKeyResponses?.approved).toContain(exactApiKey)
      expect(result.customApiKeyResponses?.approved?.[0]).toBe(exactApiKey)
    })

    it('should handle short API key without padding', () => {
      const config: ClaudeConfiguration = {
        mcpServers: {},
      }

      // Short API key (less than 20 characters)
      const shortApiKey = 'sk-short'
      expect(shortApiKey.length).toBeLessThan(20)

      const result = ensureApiKeyApproved(config, shortApiKey)

      expect(result.customApiKeyResponses?.approved).toContain(shortApiKey)
      expect(result.customApiKeyResponses?.approved?.[0]).toBe(shortApiKey)
    })
  })
})
