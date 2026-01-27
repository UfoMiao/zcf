/**
 * Sensitive data sanitizer for export functionality
 *
 * This module handles sanitizing sensitive information (API keys, tokens, etc.)
 * from configuration files before export.
 */

import type { ExportFileInfo } from '../../types/export-import'
import { hasSensitiveData, sanitizeConfig, SENSITIVE_FIELDS } from './core'

/**
 * Sanitize configuration content
 *
 * @param content - Configuration file content (JSON or TOML string)
 * @param _filePath - File path for context (unused, kept for API consistency)
 * @returns Sanitized content and sensitive data detection result
 */
export function sanitizeContent(
  content: string,
  _filePath: string,
): { sanitized: string, hadSensitiveData: boolean } {
  try {
    // Attempt to parse as JSON
    const parsed = JSON.parse(content)
    const hadSensitiveData = hasSensitiveData(parsed)

    if (hadSensitiveData) {
      const sanitized = sanitizeConfig(parsed)
      return {
        sanitized: JSON.stringify(sanitized, null, 2),
        hadSensitiveData: true,
      }
    }

    return {
      sanitized: content,
      hadSensitiveData: false,
    }
  }
  catch {
    // If not JSON, try TOML or treat as plain text
    return sanitizeTOMLContent(content)
  }
}

/**
 * Sanitize TOML configuration content
 *
 * @param content - TOML configuration content
 * @returns Sanitized content and sensitive data detection result
 */
function sanitizeTOMLContent(content: string): { sanitized: string, hadSensitiveData: boolean } {
  let hadSensitiveData = false
  let sanitized = content

  // Sanitize TOML key-value pairs
  // Pattern: apiKey = "value" or APIKEY = 'value'
  const apiKeyPattern = /^(\s*(?:api[Kk]ey|APIKEY|API_KEY)\s*=\s*)["']([^"']+)["']/gm
  if (apiKeyPattern.test(content)) {
    hadSensitiveData = true
    sanitized = sanitized.replace(apiKeyPattern, '$1"***REDACTED_API_KEY***"')
  }

  // Pattern: authToken = "value" or AUTH_TOKEN = "value"
  const authTokenPattern = /^(\s*(?:auth[Tt]oken|AUTH_TOKEN|ANTHROPIC_AUTH_TOKEN)\s*=\s*)["']([^"']+)["']/gm
  if (authTokenPattern.test(content)) {
    hadSensitiveData = true
    sanitized = sanitized.replace(authTokenPattern, '$1"***REDACTED_AUTH_TOKEN***"')
  }

  return {
    sanitized,
    hadSensitiveData,
  }
}

/**
 * Sanitize file content based on file type
 *
 * @param fileInfo - File information
 * @param content - File content
 * @returns Sanitized content and updated file info
 */
export function sanitizeFile(
  fileInfo: ExportFileInfo,
  content: string,
): { content: string, fileInfo: ExportFileInfo } {
  // Skip sanitization for non-config files
  if (!shouldSanitize(fileInfo.path)) {
    return {
      content,
      fileInfo,
    }
  }

  const { sanitized, hadSensitiveData } = sanitizeContent(content, fileInfo.path)

  return {
    content: sanitized,
    fileInfo: {
      ...fileInfo,
      hasSensitiveData: hadSensitiveData,
    },
  }
}

/**
 * Check if a file should be sanitized based on its path
 *
 * @param filePath - File path
 * @returns True if file should be sanitized
 */
function shouldSanitize(filePath: string): boolean {
  const configFilePatterns = [
    /settings\.json$/,
    /config\.toml$/,
    /auth\.json$/,
    /zcf-config\.toml$/,
    /mcp-settings\.json$/,
    /\.claude\.json$/,
  ]

  return configFilePatterns.some(pattern => pattern.test(filePath))
}

/**
 * Batch sanitize multiple files
 *
 * @param files - Array of file info with content
 * @returns Sanitized files with updated metadata
 */
export function sanitizeFiles(
  files: Array<{ fileInfo: ExportFileInfo, content: string }>,
): Array<{ fileInfo: ExportFileInfo, content: string }> {
  return files.map(({ fileInfo, content }) => {
    return sanitizeFile(fileInfo, content)
  })
}

/**
 * Get sanitization summary
 */
export interface SanitizationSummary {
  totalFiles: number
  sanitizedFiles: number
  filesWithSensitiveData: number
  sensitiveFieldsFound: string[]
}

export function getSanitizationSummary(
  files: Array<{ fileInfo: ExportFileInfo, hadSensitiveData?: boolean }>,
): SanitizationSummary {
  const filesWithSensitiveData = files.filter(f => f.hadSensitiveData || f.fileInfo.hasSensitiveData)
  const sanitizedFiles = files.filter(f => shouldSanitize(f.fileInfo.path))

  return {
    totalFiles: files.length,
    sanitizedFiles: sanitizedFiles.length,
    filesWithSensitiveData: filesWithSensitiveData.length,
    sensitiveFieldsFound: SENSITIVE_FIELDS.map(f => f.path),
  }
}

/**
 * Restore sensitive data placeholders (for import)
 *
 * This function helps identify where sensitive data needs to be restored
 * during import operations.
 */
export function detectSanitizedFields(content: string): string[] {
  const sanitizedFields: string[] = []

  if (content.includes('***REDACTED_API_KEY***')) {
    sanitizedFields.push('API Key')
  }

  if (content.includes('***REDACTED_AUTH_TOKEN***')) {
    sanitizedFields.push('Auth Token')
  }

  return sanitizedFields
}

/**
 * Check if content contains sanitized placeholders
 */
export function hasSanitizedData(content: string): boolean {
  return content.includes('***REDACTED_API_KEY***')
    || content.includes('***REDACTED_AUTH_TOKEN***')
}
