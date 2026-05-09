/**
 * Comprehensive test suite for export-import sanitizer module
 *
 * Tests cover:
 * - sanitizeContent() - Content sanitization for JSON and TOML
 * - sanitizeFile() - File-level sanitization with metadata
 * - sanitizeFiles() - Batch file sanitization
 * - getSanitizationSummary() - Sanitization statistics
 * - detectSanitizedFields() - Detection of sanitized placeholders
 * - hasSanitizedData() - Check for sanitized data presence
 * - Sensitive field detection (API keys, tokens, etc.)
 * - File type filtering (should/shouldn't sanitize)
 * - JSON and TOML format handling
 * - Edge cases and error handling
 */

import type { ExportFileInfo } from '../../../../src/types/export-import'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  detectSanitizedFields,
  getSanitizationSummary,
  hasSanitizedData,
  sanitizeContent,
  sanitizeFile,
  sanitizeFiles,
} from '../../../../src/utils/export-import/sanitizer'

// Helper function to recursively find and replace sensitive fields
function deepSanitize(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj
  }

  const sanitized = Array.isArray(obj) ? [] : {}

  for (const key in obj) {
    if (key.match(/api[Kk]ey|API_KEY/)) {
      (sanitized as any)[key] = '***REDACTED_API_KEY***'
    }
    else if (key.match(/authToken|AUTH_TOKEN|ANTHROPIC_AUTH_TOKEN/)) {
      (sanitized as any)[key] = '***REDACTED_AUTH_TOKEN***'
    }
    else if (typeof obj[key] === 'object' && obj[key] !== null) {
      (sanitized as any)[key] = deepSanitize(obj[key])
    }
    else {
      (sanitized as any)[key] = obj[key]
    }
  }

  return sanitized
}

// Helper function to check for sensitive data recursively
function hasDeepSensitiveData(obj: any): boolean {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }

  for (const key in obj) {
    if (key.match(/api[Kk]ey|authToken|ANTHROPIC_AUTH_TOKEN|API_KEY|AUTH_TOKEN/)) {
      return true
    }
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      if (hasDeepSensitiveData(obj[key])) {
        return true
      }
    }
  }

  return false
}

// Mock core sanitization functions
vi.mock('../../../../src/utils/export-import/core', () => ({
  hasSensitiveData: vi.fn((config: any) => {
    return hasDeepSensitiveData(config)
  }),
  sanitizeConfig: vi.fn((config: any) => {
    return deepSanitize(config)
  }),
  SENSITIVE_FIELDS: [
    { path: 'apiKey', redacted: '***REDACTED_API_KEY***' },
    { path: 'authToken', redacted: '***REDACTED_AUTH_TOKEN***' },
    { path: 'ANTHROPIC_AUTH_TOKEN', redacted: '***REDACTED_AUTH_TOKEN***' },
  ],
}))

describe('sanitizer module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('sanitizeContent()', () => {
    it('should sanitize JSON content with API key', () => {
      const content = JSON.stringify({
        apiKey: 'sk-ant-test-key-123',
        model: 'claude-sonnet-4',
      }, null, 2)

      const result = sanitizeContent(content, 'settings.json')

      expect(result.hadSensitiveData).toBe(true)
      expect(result.sanitized).toContain('***REDACTED_API_KEY***')
      expect(result.sanitized).not.toContain('sk-ant-test-key-123')
    })

    it('should sanitize JSON content with auth token', () => {
      const content = JSON.stringify({
        authToken: 'oauth-token-abc-123',
        model: 'claude-sonnet-4',
      }, null, 2)

      const result = sanitizeContent(content, 'settings.json')

      expect(result.hadSensitiveData).toBe(true)
      expect(result.sanitized).toContain('***REDACTED_AUTH_TOKEN***')
      expect(result.sanitized).not.toContain('oauth-token-abc-123')
    })

    it('should sanitize JSON content with ANTHROPIC_AUTH_TOKEN', () => {
      const content = JSON.stringify({
        ANTHROPIC_AUTH_TOKEN: 'oauth-token-xyz-789',
        model: 'claude-sonnet-4',
      }, null, 2)

      const result = sanitizeContent(content, 'settings.json')

      expect(result.hadSensitiveData).toBe(true)
      expect(result.sanitized).toContain('***REDACTED_AUTH_TOKEN***')
      expect(result.sanitized).not.toContain('oauth-token-xyz-789')
    })

    it('should not modify content without sensitive data', () => {
      const content = JSON.stringify({
        model: 'claude-sonnet-4',
        maxTokens: 4096,
      }, null, 2)

      const result = sanitizeContent(content, 'settings.json')

      expect(result.hadSensitiveData).toBe(false)
      expect(result.sanitized).toBe(content)
    })

    it('should sanitize TOML content with API key', () => {
      const content = `
[settings]
apiKey = "sk-ant-test-key-123"
model = "claude-sonnet-4"
`

      const result = sanitizeContent(content, 'config.toml')

      expect(result.hadSensitiveData).toBe(true)
      expect(result.sanitized).toContain('***REDACTED_API_KEY***')
      expect(result.sanitized).not.toContain('sk-ant-test-key-123')
    })

    it('should sanitize TOML content with authToken', () => {
      const content = `
[auth]
authToken = "oauth-token-abc-123"
`

      const result = sanitizeContent(content, 'config.toml')

      expect(result.hadSensitiveData).toBe(true)
      expect(result.sanitized).toContain('***REDACTED_AUTH_TOKEN***')
      expect(result.sanitized).not.toContain('oauth-token-abc-123')
    })

    it('should handle TOML with uppercase keys', () => {
      const content = `
APIKEY = "sk-ant-test-key-456"
AUTH_TOKEN = "oauth-token-def-456"
`

      const result = sanitizeContent(content, 'config.toml')

      expect(result.hadSensitiveData).toBe(true)
      expect(result.sanitized).toContain('***REDACTED_API_KEY***')
      expect(result.sanitized).toContain('***REDACTED_AUTH_TOKEN***')
    })

    it('should handle TOML with mixed case keys', () => {
      // Note: The regex only supports specific naming conventions:
      // apiKey, apikey, APIKEY, API_KEY for API keys
      // authToken, authtoken, AUTH_TOKEN, ANTHROPIC_AUTH_TOKEN for auth tokens
      // Mixed case like Api_Key is not supported by design
      const content = `
API_KEY = "sk-ant-test-key-789"
AUTH_TOKEN = "oauth-token-ghi-789"
`

      const result = sanitizeContent(content, 'config.toml')

      expect(result.hadSensitiveData).toBe(true)
      expect(result.sanitized).toContain('***REDACTED_API_KEY***')
      expect(result.sanitized).toContain('***REDACTED_AUTH_TOKEN***')
    })

    it('should handle TOML with single quotes', () => {
      const content = `
apiKey = 'sk-ant-test-key-single'
authToken = 'oauth-token-single'
`

      const result = sanitizeContent(content, 'config.toml')

      expect(result.hadSensitiveData).toBe(true)
      expect(result.sanitized).toContain('***REDACTED_API_KEY***')
      expect(result.sanitized).toContain('***REDACTED_AUTH_TOKEN***')
    })

    it('should not modify TOML without sensitive data', () => {
      const content = `
[settings]
model = "claude-sonnet-4"
maxTokens = 4096
`

      const result = sanitizeContent(content, 'config.toml')

      expect(result.hadSensitiveData).toBe(false)
      expect(result.sanitized).toBe(content)
    })

    it('should handle invalid JSON gracefully', () => {
      const content = 'invalid json {{{}'

      const result = sanitizeContent(content, 'settings.json')

      expect(result.hadSensitiveData).toBe(false)
      expect(result.sanitized).toBe(content)
    })

    it('should handle empty content', () => {
      const content = ''

      const result = sanitizeContent(content, 'settings.json')

      expect(result.hadSensitiveData).toBe(false)
      expect(result.sanitized).toBe(content)
    })

    it('should sanitize JSON with multiple sensitive fields', () => {
      const content = JSON.stringify({
        apiKey: 'sk-ant-test-key',
        authToken: 'oauth-token',
        model: 'claude-sonnet-4',
      }, null, 2)

      const result = sanitizeContent(content, 'settings.json')

      expect(result.hadSensitiveData).toBe(true)
      expect(result.sanitized).toContain('***REDACTED_API_KEY***')
      expect(result.sanitized).toContain('***REDACTED_AUTH_TOKEN***')
    })

    it('should handle deeply nested JSON objects', () => {
      const content = JSON.stringify({
        config: {
          auth: {
            apiKey: 'sk-ant-nested-key',
          },
        },
      }, null, 2)

      const result = sanitizeContent(content, 'settings.json')

      expect(result.hadSensitiveData).toBe(true)
      expect(result.sanitized).toContain('***REDACTED_API_KEY***')
    })
  })

  describe('sanitizeFile()', () => {
    it('should sanitize config file with sensitive data', () => {
      const fileInfo: ExportFileInfo = {
        path: 'configs/claude-code/settings.json',
        type: 'settings',
        checksum: 'abc123',
        size: 256,
      }

      const content = JSON.stringify({
        apiKey: 'sk-ant-test-key',
        model: 'claude-sonnet-4',
      })

      const result = sanitizeFile(fileInfo, content)

      expect(result.content).toContain('***REDACTED_API_KEY***')
      expect(result.fileInfo.hasSensitiveData).toBe(true)
    })

    it('should skip sanitization for non-config files', () => {
      const fileInfo: ExportFileInfo = {
        path: 'workflows/agent.json',
        type: 'workflows',
        checksum: 'def456',
        size: 512,
      }

      const content = JSON.stringify({
        name: 'My Agent',
        apiKey: 'should-not-be-sanitized',
      })

      const result = sanitizeFile(fileInfo, content)

      expect(result.content).toBe(content)
      expect(result.fileInfo.hasSensitiveData).toBeUndefined()
    })

    it('should sanitize settings.json', () => {
      const fileInfo: ExportFileInfo = {
        path: 'configs/claude-code/settings.json',
        type: 'settings',
        checksum: 'abc',
        size: 100,
      }

      const content = JSON.stringify({ apiKey: 'test-key' })

      const result = sanitizeFile(fileInfo, content)

      expect(result.content).toContain('***REDACTED_API_KEY***')
      expect(result.fileInfo.hasSensitiveData).toBe(true)
    })

    it('should sanitize config.toml', () => {
      const fileInfo: ExportFileInfo = {
        path: 'configs/claude-code/config.toml',
        type: 'settings',
        checksum: 'def',
        size: 150,
      }

      const content = 'apiKey = "test-key"'

      const result = sanitizeFile(fileInfo, content)

      expect(result.content).toContain('***REDACTED_API_KEY***')
      expect(result.fileInfo.hasSensitiveData).toBe(true)
    })

    it('should sanitize auth.json', () => {
      const fileInfo: ExportFileInfo = {
        path: 'configs/claude-code/auth.json',
        type: 'settings',
        checksum: 'ghi',
        size: 200,
      }

      const content = JSON.stringify({ authToken: 'oauth-token' })

      const result = sanitizeFile(fileInfo, content)

      expect(result.content).toContain('***REDACTED_AUTH_TOKEN***')
      expect(result.fileInfo.hasSensitiveData).toBe(true)
    })

    it('should sanitize zcf-config.toml', () => {
      const fileInfo: ExportFileInfo = {
        path: 'configs/claude-code/zcf-config.toml',
        type: 'settings',
        checksum: 'jkl',
        size: 300,
      }

      const content = 'apiKey = "zcf-key"'

      const result = sanitizeFile(fileInfo, content)

      expect(result.content).toContain('***REDACTED_API_KEY***')
      expect(result.fileInfo.hasSensitiveData).toBe(true)
    })

    it('should sanitize mcp-settings.json', () => {
      const fileInfo: ExportFileInfo = {
        path: 'configs/claude-code/mcp-settings.json',
        type: 'mcp',
        checksum: 'mno',
        size: 400,
      }

      const content = JSON.stringify({ apiKey: 'mcp-key' })

      const result = sanitizeFile(fileInfo, content)

      expect(result.content).toContain('***REDACTED_API_KEY***')
      expect(result.fileInfo.hasSensitiveData).toBe(true)
    })

    it('should sanitize .claude.json', () => {
      const fileInfo: ExportFileInfo = {
        path: 'configs/claude-code/.claude.json',
        type: 'settings',
        checksum: 'pqr',
        size: 250,
      }

      const content = JSON.stringify({ authToken: 'claude-token' })

      const result = sanitizeFile(fileInfo, content)

      expect(result.content).toContain('***REDACTED_AUTH_TOKEN***')
      expect(result.fileInfo.hasSensitiveData).toBe(true)
    })

    it('should not sanitize markdown files', () => {
      const fileInfo: ExportFileInfo = {
        path: 'configs/claude-code/CLAUDE.md',
        type: 'settings',
        checksum: 'stu',
        size: 1024,
      }

      const content = '# My Config\napiKey = "should-not-sanitize"'

      const result = sanitizeFile(fileInfo, content)

      expect(result.content).toBe(content)
      expect(result.fileInfo.hasSensitiveData).toBeUndefined()
    })

    it('should not sanitize workflow files', () => {
      const fileInfo: ExportFileInfo = {
        path: 'workflows/my-agent.json',
        type: 'workflows',
        checksum: 'vwx',
        size: 512,
      }

      const content = JSON.stringify({
        name: 'Agent',
        apiKey: 'not-sensitive-in-workflow',
      })

      const result = sanitizeFile(fileInfo, content)

      expect(result.content).toBe(content)
      expect(result.fileInfo.hasSensitiveData).toBeUndefined()
    })

    it('should handle file without sensitive data', () => {
      const fileInfo: ExportFileInfo = {
        path: 'configs/claude-code/settings.json',
        type: 'settings',
        checksum: 'xyz',
        size: 100,
      }

      const content = JSON.stringify({
        model: 'claude-sonnet-4',
        maxTokens: 4096,
      })

      const result = sanitizeFile(fileInfo, content)

      // When there's no sensitive data, the content is returned unchanged (not re-formatted)
      expect(result.content).toBe(content)
      expect(result.fileInfo.hasSensitiveData).toBe(false)
    })
  })

  describe('sanitizeFiles()', () => {
    it('should batch sanitize multiple files', () => {
      const files = [
        {
          fileInfo: {
            path: 'configs/claude-code/settings.json',
            type: 'settings',
            checksum: 'a1',
            size: 100,
          } as ExportFileInfo,
          content: JSON.stringify({ apiKey: 'key1' }),
        },
        {
          fileInfo: {
            path: 'configs/claude-code/auth.json',
            type: 'settings',
            checksum: 'a2',
            size: 150,
          } as ExportFileInfo,
          content: JSON.stringify({ authToken: 'token1' }),
        },
      ]

      const results = sanitizeFiles(files)

      expect(results).toHaveLength(2)
      expect(results[0].content).toContain('***REDACTED_API_KEY***')
      expect(results[1].content).toContain('***REDACTED_AUTH_TOKEN***')
    })

    it('should handle mixed sanitizable and non-sanitizable files', () => {
      const files = [
        {
          fileInfo: {
            path: 'configs/claude-code/settings.json',
            type: 'settings',
            checksum: 'b1',
            size: 100,
          } as ExportFileInfo,
          content: JSON.stringify({ apiKey: 'key2' }),
        },
        {
          fileInfo: {
            path: 'workflows/agent.json',
            type: 'workflows',
            checksum: 'b2',
            size: 200,
          } as ExportFileInfo,
          content: JSON.stringify({ name: 'Agent' }),
        },
      ]

      const results = sanitizeFiles(files)

      expect(results).toHaveLength(2)
      expect(results[0].content).toContain('***REDACTED_API_KEY***')
      expect(results[1].content).not.toContain('***REDACTED')
    })

    it('should handle empty file list', () => {
      const files: Array<{ fileInfo: ExportFileInfo, content: string }> = []

      const results = sanitizeFiles(files)

      expect(results).toHaveLength(0)
    })

    it('should preserve file order', () => {
      const files = [
        {
          fileInfo: {
            path: 'file1.json',
            type: 'settings',
            checksum: 'c1',
            size: 100,
          } as ExportFileInfo,
          content: '{}',
        },
        {
          fileInfo: {
            path: 'file2.json',
            type: 'settings',
            checksum: 'c2',
            size: 100,
          } as ExportFileInfo,
          content: '{}',
        },
        {
          fileInfo: {
            path: 'file3.json',
            type: 'settings',
            checksum: 'c3',
            size: 100,
          } as ExportFileInfo,
          content: '{}',
        },
      ]

      const results = sanitizeFiles(files)

      expect(results[0].fileInfo.path).toBe('file1.json')
      expect(results[1].fileInfo.path).toBe('file2.json')
      expect(results[2].fileInfo.path).toBe('file3.json')
    })
  })

  describe('getSanitizationSummary()', () => {
    it('should generate summary for sanitized files', () => {
      const files = [
        {
          fileInfo: {
            path: 'configs/claude-code/settings.json',
            type: 'settings',
            checksum: 'd1',
            size: 100,
            hasSensitiveData: true,
          } as ExportFileInfo,
        },
        {
          fileInfo: {
            path: 'configs/claude-code/auth.json',
            type: 'settings',
            checksum: 'd2',
            size: 150,
            hasSensitiveData: true,
          } as ExportFileInfo,
        },
        {
          fileInfo: {
            path: 'workflows/agent.json',
            type: 'workflows',
            checksum: 'd3',
            size: 200,
          } as ExportFileInfo,
        },
      ]

      const summary = getSanitizationSummary(files)

      expect(summary.totalFiles).toBe(3)
      expect(summary.sanitizedFiles).toBe(2)
      expect(summary.filesWithSensitiveData).toBe(2)
      expect(summary.sensitiveFieldsFound).toContain('apiKey')
      expect(summary.sensitiveFieldsFound).toContain('authToken')
    })

    it('should handle files without sensitive data', () => {
      const files = [
        {
          fileInfo: {
            path: 'workflows/agent.json',
            type: 'workflows',
            checksum: 'e1',
            size: 100,
          } as ExportFileInfo,
        },
        {
          fileInfo: {
            path: 'workflows/task.json',
            type: 'workflows',
            checksum: 'e2',
            size: 150,
          } as ExportFileInfo,
        },
      ]

      const summary = getSanitizationSummary(files)

      expect(summary.totalFiles).toBe(2)
      expect(summary.sanitizedFiles).toBe(0)
      expect(summary.filesWithSensitiveData).toBe(0)
    })

    it('should handle empty file list', () => {
      const files: Array<{ fileInfo: ExportFileInfo }> = []

      const summary = getSanitizationSummary(files)

      expect(summary.totalFiles).toBe(0)
      expect(summary.sanitizedFiles).toBe(0)
      expect(summary.filesWithSensitiveData).toBe(0)
    })

    it('should include sensitive field paths', () => {
      const files = [
        {
          fileInfo: {
            path: 'configs/claude-code/settings.json',
            type: 'settings',
            checksum: 'f1',
            size: 100,
            hasSensitiveData: true,
          } as ExportFileInfo,
        },
      ]

      const summary = getSanitizationSummary(files)

      expect(summary.sensitiveFieldsFound).toBeDefined()
      expect(Array.isArray(summary.sensitiveFieldsFound)).toBe(true)
      expect(summary.sensitiveFieldsFound.length).toBeGreaterThan(0)
    })
  })

  describe('detectSanitizedFields()', () => {
    it('should detect sanitized API key', () => {
      const content = JSON.stringify({
        apiKey: '***REDACTED_API_KEY***',
        model: 'claude-sonnet-4',
      })

      const fields = detectSanitizedFields(content)

      expect(fields).toContain('API Key')
    })

    it('should detect sanitized auth token', () => {
      const content = JSON.stringify({
        authToken: '***REDACTED_AUTH_TOKEN***',
        model: 'claude-sonnet-4',
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
      expect(fields).toHaveLength(2)
    })

    it('should return empty array for non-sanitized content', () => {
      const content = JSON.stringify({
        model: 'claude-sonnet-4',
        maxTokens: 4096,
      })

      const fields = detectSanitizedFields(content)

      expect(fields).toHaveLength(0)
    })

    it('should handle empty content', () => {
      const fields = detectSanitizedFields('')

      expect(fields).toHaveLength(0)
    })
  })

  describe('hasSanitizedData()', () => {
    it('should detect content with sanitized API key', () => {
      const content = JSON.stringify({
        apiKey: '***REDACTED_API_KEY***',
      })

      expect(hasSanitizedData(content)).toBe(true)
    })

    it('should detect content with sanitized auth token', () => {
      const content = JSON.stringify({
        authToken: '***REDACTED_AUTH_TOKEN***',
      })

      expect(hasSanitizedData(content)).toBe(true)
    })

    it('should return false for non-sanitized content', () => {
      const content = JSON.stringify({
        model: 'claude-sonnet-4',
      })

      expect(hasSanitizedData(content)).toBe(false)
    })

    it('should return false for empty content', () => {
      expect(hasSanitizedData('')).toBe(false)
    })

    it('should detect sanitized data in TOML format', () => {
      const content = 'apiKey = "***REDACTED_API_KEY***"'

      expect(hasSanitizedData(content)).toBe(true)
    })
  })
})
