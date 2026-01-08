/**
 * Test suite for sanitizer functionality
 */

import type { ExportFileInfo } from '../../../src/types/export-import'
import { describe, expect, it } from 'vitest'
import {
  detectSanitizedFields,
  getSanitizationSummary,
  hasSanitizedData,
  sanitizeContent,
  sanitizeFile,
  sanitizeFiles,
} from '../../../src/utils/export-import/sanitizer'

describe('sanitizer', () => {
  describe('sanitizeContent', () => {
    it('should sanitize JSON content with API key', () => {
      const content = JSON.stringify({
        apiKey: 'sk-1234567890abcdef',
        setting: 'value',
      }, null, 2)

      const { sanitized, hadSensitiveData } = sanitizeContent(content, 'config.json')

      expect(hadSensitiveData).toBe(true)

      const parsed = JSON.parse(sanitized)
      expect(parsed.apiKey).toBe('***REDACTED_API_KEY***')
      expect(parsed.setting).toBe('value')
    })

    it('should handle JSON without sensitive data', () => {
      const content = JSON.stringify({
        setting1: 'value1',
        setting2: 'value2',
      }, null, 2)

      const { sanitized, hadSensitiveData } = sanitizeContent(content, 'config.json')

      expect(hadSensitiveData).toBe(false)
      expect(sanitized).toBe(content)
    })

    it('should sanitize TOML content with API key', () => {
      const content = `
[profile]
apiKey = "sk-1234567890abcdef"
setting = "value"
      `.trim()

      const { sanitized, hadSensitiveData } = sanitizeContent(content, 'config.toml')

      expect(hadSensitiveData).toBe(true)
      expect(sanitized).toContain('***REDACTED_API_KEY***')
      expect(sanitized).toContain('setting = "value"')
    })

    it('should sanitize TOML content with auth token', () => {
      const content = `
[auth]
authToken = "token-1234567890"
      `.trim()

      const { sanitized, hadSensitiveData } = sanitizeContent(content, 'config.toml')

      expect(hadSensitiveData).toBe(true)
      expect(sanitized).toContain('***REDACTED_AUTH_TOKEN***')
    })

    it('should handle TOML without sensitive data', () => {
      const content = `
[settings]
theme = "dark"
language = "en"
      `.trim()

      const { sanitized, hadSensitiveData } = sanitizeContent(content, 'config.toml')

      expect(hadSensitiveData).toBe(false)
      expect(sanitized).toBe(content)
    })
  })

  describe('sanitizeFile', () => {
    it('should sanitize config files', () => {
      const fileInfo: ExportFileInfo = {
        path: 'settings.json',
        type: 'settings',
        size: 100,
        checksum: 'abc123',
      }

      const content = JSON.stringify({
        apiKey: 'sk-1234567890abcdef',
      })

      const { content: sanitized, fileInfo: updatedInfo } = sanitizeFile(fileInfo, content)

      expect(updatedInfo.hasSensitiveData).toBe(true)
      expect(sanitized).toContain('***REDACTED_API_KEY***')
    })

    it('should skip sanitization for non-config files', () => {
      const fileInfo: ExportFileInfo = {
        path: 'workflow.md',
        type: 'workflows',
        size: 100,
        checksum: 'abc123',
      }

      const content = 'This is a workflow file with apiKey = "test"'

      const { content: sanitized, fileInfo: updatedInfo } = sanitizeFile(fileInfo, content)

      expect(updatedInfo.hasSensitiveData).toBeUndefined()
      expect(sanitized).toBe(content)
    })

    it('should handle files without sensitive data', () => {
      const fileInfo: ExportFileInfo = {
        path: 'settings.json',
        type: 'settings',
        size: 100,
        checksum: 'abc123',
      }

      const content = JSON.stringify({
        theme: 'dark',
        language: 'en',
      })

      const { content: sanitized, fileInfo: updatedInfo } = sanitizeFile(fileInfo, content)

      expect(updatedInfo.hasSensitiveData).toBe(false)
      expect(sanitized).toBe(content)
    })
  })

  describe('sanitizeFiles', () => {
    it('should sanitize multiple files', () => {
      const files = [
        {
          fileInfo: {
            path: 'settings.json',
            type: 'settings' as const,
            size: 100,
            checksum: 'abc123',
          },
          content: JSON.stringify({ apiKey: 'sk-test1' }),
        },
        {
          fileInfo: {
            path: 'config.toml',
            type: 'profiles' as const,
            size: 200,
            checksum: 'def456',
          },
          content: 'apiKey = "sk-test2"',
        },
      ]

      const sanitized = sanitizeFiles(files)

      expect(sanitized).toHaveLength(2)
      expect(sanitized[0].content).toContain('***REDACTED_API_KEY***')
      expect(sanitized[1].content).toContain('***REDACTED_API_KEY***')
    })

    it('should handle empty file list', () => {
      const sanitized = sanitizeFiles([])

      expect(sanitized).toHaveLength(0)
    })
  })

  describe('getSanitizationSummary', () => {
    it('should provide summary of sanitization', () => {
      const files = [
        {
          fileInfo: {
            path: 'settings.json',
            type: 'settings' as const,
            size: 100,
            checksum: 'abc123',
            hasSensitiveData: true,
          },
        },
        {
          fileInfo: {
            path: 'workflow.md',
            type: 'workflows' as const,
            size: 200,
            checksum: 'def456',
          },
        },
      ]

      const summary = getSanitizationSummary(files)

      expect(summary.totalFiles).toBe(2)
      expect(summary.filesWithSensitiveData).toBe(1)
      expect(summary.sanitizedFiles).toBe(1)
      expect(summary.sensitiveFieldsFound.length).toBeGreaterThan(0)
    })

    it('should handle files without sensitive data', () => {
      const files = [
        {
          fileInfo: {
            path: 'workflow.md',
            type: 'workflows' as const,
            size: 100,
            checksum: 'abc123',
          },
        },
      ]

      const summary = getSanitizationSummary(files)

      expect(summary.filesWithSensitiveData).toBe(0)
    })
  })

  describe('detectSanitizedFields', () => {
    it('should detect redacted API key', () => {
      const content = JSON.stringify({
        apiKey: '***REDACTED_API_KEY***',
      })

      const fields = detectSanitizedFields(content)

      expect(fields).toContain('API Key')
    })

    it('should detect redacted auth token', () => {
      const content = JSON.stringify({
        authToken: '***REDACTED_AUTH_TOKEN***',
      })

      const fields = detectSanitizedFields(content)

      expect(fields).toContain('Auth Token')
    })

    it('should detect multiple sanitized fields', () => {
      const content = JSON.stringify({
        apiKey: '***REDACTED_API_KEY***',
        authToken: '***REDACTED_AUTH_TOKEN***',
      })

      const fields = detectSanitizedFields(content)

      expect(fields).toContain('API Key')
      expect(fields).toContain('Auth Token')
    })

    it('should return empty array for non-sanitized content', () => {
      const content = JSON.stringify({
        theme: 'dark',
      })

      const fields = detectSanitizedFields(content)

      expect(fields).toHaveLength(0)
    })
  })

  describe('hasSanitizedData', () => {
    it('should detect sanitized API key', () => {
      const content = '***REDACTED_API_KEY***'

      expect(hasSanitizedData(content)).toBe(true)
    })

    it('should detect sanitized auth token', () => {
      const content = '***REDACTED_AUTH_TOKEN***'

      expect(hasSanitizedData(content)).toBe(true)
    })

    it('should return false for non-sanitized content', () => {
      const content = 'normal content'

      expect(hasSanitizedData(content)).toBe(false)
    })
  })
})
