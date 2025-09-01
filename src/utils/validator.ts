import ansis from 'ansis'
import { ensureI18nInitialized, i18n } from '../i18n'

/**
 * Validate API Key format
 * @param apiKey - API Key to validate
 * @returns Validation result
 */
export function validateApiKey(apiKey: string): { isValid: boolean, error?: string } {
  // Empty check
  if (!apiKey || apiKey.trim() === '') {
    return {
      isValid: false,
      // Note: This should use i18next, but due to sync constraint in inquirer validate,
      // we temporarily use a generic message. This will be fixed when we refactor to async validation.
      error: 'API key cannot be empty',
    }
  }

  return { isValid: true }
}

/**
 * Format API Key for display (hide middle part)
 * @param apiKey - Original API Key
 * @returns Formatted API Key
 */
export function formatApiKeyDisplay(apiKey: string): string {
  if (!apiKey || apiKey.length < 12) {
    return apiKey
  }

  // Show first 8 and last 4 characters
  return `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`
}

/**
 * Display API Key validation error message
 * @param error - Error message
 */
export async function showApiKeyError(error: string): Promise<void> {
  ensureI18nInitialized()

  console.log(ansis.red(`✗ ${error}`))
  console.log(ansis.gray(i18n.t('api:apiKeyValidation.example')))
}

/**
 * Detect auth type from API key format
 * @param apiKey - API Key to analyze
 * @returns Detected auth type
 */
export function detectAuthType(apiKey: string): 'auth_token' | 'api_key' {
  // Claude API keys typically start with 'sk-ant-'
  if (apiKey.startsWith('sk-ant-')) {
    return 'auth_token'
  }
  // Default to api_key for other formats
  return 'api_key'
}
