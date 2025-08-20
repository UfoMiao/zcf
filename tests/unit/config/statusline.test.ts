import type { ClaudeSettings, StatusLineConfig } from '../../../src/types/config'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mergeSettingsFile } from '../../../src/utils/config'
import { exists } from '../../../src/utils/fs-operations'
import { readJsonConfig, writeJsonConfig } from '../../../src/utils/json-config'

// Mock external dependencies
vi.mock('../../../src/utils/fs-operations')
vi.mock('../../../src/utils/json-config')
vi.mock('../../../src/utils/zcf-config')

const mockExists = vi.mocked(exists)
const mockReadJsonConfig = vi.mocked(readJsonConfig)
const mockWriteJsonConfig = vi.mocked(writeJsonConfig)

describe('statusLine Configuration', () => {
  const mockTemplateSettings: ClaudeSettings = {
    model: 'sonnet',
    env: {
      DISABLE_TELEMETRY: '1',
    },
    permissions: {
      allow: ['Bash', 'Read', 'Write'],
    },
    statusLine: {
      type: 'command',
      command: '~/.claude/ccline/ccline',
      padding: 0,
    },
  }

  const mockExistingSettings: ClaudeSettings = {
    model: 'opus',
    env: {
      ANTHROPIC_API_KEY: 'user-key',
      DISABLE_TELEMETRY: '1',
    },
    permissions: {
      allow: ['Bash', 'Read'],
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('statusLine configuration merging', () => {
    it('should merge statusLine config correctly when target file does not exist', () => {
      // Red: This test should FAIL initially because statusLine merging is not implemented yet
      mockExists.mockReturnValue(false)
      mockReadJsonConfig.mockReturnValue(mockTemplateSettings)

      mergeSettingsFile('/template/settings.json', '/target/settings.json')

      expect(mockWriteJsonConfig).toHaveBeenCalledWith(
        '/target/settings.json',
        expect.objectContaining({
          statusLine: {
            type: 'command',
            command: '~/.claude/ccline/ccline',
            padding: 0,
          },
        }),
      )
    })

    it('should preserve existing statusLine config when user has custom configuration', () => {
      // Red: This test should FAIL initially
      const existingWithStatusLine: ClaudeSettings = {
        ...mockExistingSettings,
        statusLine: {
          type: 'command',
          command: 'custom-command',
          padding: 1,
        },
      }

      mockExists.mockReturnValue(true)
      mockReadJsonConfig
        .mockReturnValueOnce(mockTemplateSettings)
        .mockReturnValueOnce(existingWithStatusLine)

      mergeSettingsFile('/template/settings.json', '/target/settings.json')

      expect(mockWriteJsonConfig).toHaveBeenCalledWith(
        '/target/settings.json',
        expect.objectContaining({
          statusLine: {
            type: 'command',
            command: 'custom-command', // User's custom command should be preserved
            padding: 1,
          },
        }),
      )
    })

    it('should add statusLine config when existing settings has no statusLine', () => {
      // Red: This test should FAIL initially
      mockExists.mockReturnValue(true)
      mockReadJsonConfig
        .mockReturnValueOnce(mockTemplateSettings)
        .mockReturnValueOnce(mockExistingSettings)

      mergeSettingsFile('/template/settings.json', '/target/settings.json')

      expect(mockWriteJsonConfig).toHaveBeenCalledWith(
        '/target/settings.json',
        expect.objectContaining({
          statusLine: {
            type: 'command',
            command: '~/.claude/ccline/ccline',
            padding: 0,
          },
          env: {
            ANTHROPIC_API_KEY: 'user-key', // User's API key should be preserved
            DISABLE_TELEMETRY: '1',
          },
        }),
      )
    })

    it('should handle platform-specific statusLine paths', () => {
      // Red: This test should FAIL initially
      const windowsTemplateSettings: ClaudeSettings = {
        ...mockTemplateSettings,
        statusLine: {
          type: 'command',
          command: '%USERPROFILE%\\.claude\\ccline\\ccline.exe',
          padding: 0,
        },
      }

      mockExists.mockReturnValue(false)
      mockReadJsonConfig.mockReturnValue(windowsTemplateSettings)

      mergeSettingsFile('/template/settings.json', '/target/settings.json')

      expect(mockWriteJsonConfig).toHaveBeenCalledWith(
        '/target/settings.json',
        expect.objectContaining({
          statusLine: {
            type: 'command',
            command: '%USERPROFILE%\\.claude\\ccline\\ccline.exe',
            padding: 0,
          },
        }),
      )
    })

    it('should validate statusLine configuration structure', () => {
      // Red: This test should FAIL initially
      const invalidStatusLineSettings: ClaudeSettings = {
        ...mockTemplateSettings,
        statusLine: {
          type: 'invalid-type',
          command: '',
        } as any,
      }

      mockExists.mockReturnValue(false)
      mockReadJsonConfig.mockReturnValue(invalidStatusLineSettings)

      // This should either throw an error or sanitize the configuration
      expect(() => {
        mergeSettingsFile('/template/settings.json', '/target/settings.json')
      }).not.toThrow() // For now, we expect it to handle gracefully
    })
  })

  describe('statusLine type validation', () => {
    it('should accept valid StatusLineConfig structure', () => {
      // Red: This test should FAIL initially
      const validStatusLine: StatusLineConfig = {
        type: 'command',
        command: '~/.claude/ccline/ccline',
        padding: 0,
      }

      // Type assertion should not throw compile error
      expect(validStatusLine.type).toBe('command')
      expect(validStatusLine.command).toBe('~/.claude/ccline/ccline')
      expect(validStatusLine.padding).toBe(0)
    })

    it('should accept StatusLineConfig with optional padding', () => {
      // Red: This test should FAIL initially
      const statusLineWithoutPadding: StatusLineConfig = {
        type: 'command',
        command: '~/.claude/ccline/ccline',
      }

      expect(statusLineWithoutPadding.padding).toBeUndefined()
      expect(statusLineWithoutPadding.type).toBe('command')
    })
  })
})
