import ansis from 'ansis';
import { I18N, type SupportedLang } from '../constants';

/**
 * Validate API Key format
 * @param apiKey - API Key to validate
 * @param lang - Language for error messages
 * @returns Validation result
 */
export function validateApiKey(apiKey: string, lang: SupportedLang = 'zh-CN'): { isValid: boolean; error?: string } {
  const i18n = I18N[lang];

  // Empty check
  if (!apiKey || apiKey.trim() === '') {
    return {
      isValid: false,
      error: i18n.apiKeyValidation.empty,
    };
  }

  return { isValid: true };
}

/**
 * Format API Key for display (hide middle part)
 * @param apiKey - Original API Key
 * @returns Formatted API Key
 */
export function formatApiKeyDisplay(apiKey: string): string {
  if (!apiKey || apiKey.length < 12) {
    return apiKey;
  }

  // Show first 8 and last 4 characters
  return `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`;
}

/**
 * Display API Key validation error message
 * @param error - Error message
 * @param lang - Language for example format
 */
export function showApiKeyError(error: string, lang: SupportedLang = 'zh-CN'): void {
  const i18n = I18N[lang];

  console.log(ansis.red(`✗ ${error}`));
  console.log(ansis.gray(i18n.apiKeyValidation.example));
}

/**
 * Detect auth type from API key format
 * @param apiKey - API Key to analyze
 * @returns Detected auth type
 */
export function detectAuthType(apiKey: string): 'auth_token' | 'api_key' {
  // Claude API keys typically start with 'sk-ant-'
  if (apiKey.startsWith('sk-ant-')) {
    return 'auth_token';
  }
  // Default to api_key for other formats
  return 'api_key';
}
