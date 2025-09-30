import type { ClaudeSettings } from '../types/config'
import { ensureI18nInitialized, i18n } from '../i18n'

/**
 * Validate Claude settings configuration
 */
export function validateClaudeSettings(settings: any): settings is ClaudeSettings {
  ensureI18nInitialized()

  if (!settings || typeof settings !== 'object') {
    return false
  }

  // Validate model if present
  if (settings.model && !['opus', 'sonnet'].includes(settings.model)) {
    console.log(i18n.t('errors:invalidModel', { model: settings.model }))
    return false
  }

  // Validate env object if present
  if (settings.env) {
    if (typeof settings.env !== 'object') {
      console.log(i18n.t('errors:invalidEnvConfig'))
      return false
    }

    // Validate API configuration
    const { ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, ANTHROPIC_BASE_URL } = settings.env

    if (ANTHROPIC_BASE_URL && typeof ANTHROPIC_BASE_URL !== 'string') {
      console.log(i18n.t('errors:invalidBaseUrl'))
      return false
    }

    if (ANTHROPIC_API_KEY && typeof ANTHROPIC_API_KEY !== 'string') {
      console.log(i18n.t('errors:invalidApiKeyConfig'))
      return false
    }

    if (ANTHROPIC_AUTH_TOKEN && typeof ANTHROPIC_AUTH_TOKEN !== 'string') {
      console.log(i18n.t('errors:invalidAuthTokenConfig'))
      return false
    }
  }

  // Validate permissions if present
  if (settings.permissions) {
    if (typeof settings.permissions !== 'object') {
      console.log(i18n.t('errors:invalidPermissionsConfig'))
      return false
    }

    if (settings.permissions.allow && !Array.isArray(settings.permissions.allow)) {
      console.log(i18n.t('errors:invalidPermissionsAllow'))
      return false
    }
  }

  return true
}

/**
 * Sanitize and fix common configuration issues
 */
export function sanitizeClaudeSettings(settings: any): ClaudeSettings {
  const sanitized: ClaudeSettings = {}

  // Handle null/undefined/non-object input
  if (!settings || typeof settings !== 'object') {
    return sanitized
  }

  // Copy valid model
  if (settings.model && ['opus', 'sonnet'].includes(settings.model)) {
    sanitized.model = settings.model
  }

  // Copy and validate env
  if (settings.env && typeof settings.env === 'object') {
    sanitized.env = {}
    for (const [key, value] of Object.entries(settings.env)) {
      if (typeof value === 'string' || value === undefined) {
        sanitized.env[key] = value as string
      }
    }
  }

  // Copy and validate permissions
  if (settings.permissions && typeof settings.permissions === 'object') {
    sanitized.permissions = {}
    if (Array.isArray(settings.permissions.allow)) {
      sanitized.permissions.allow = settings.permissions.allow.filter(
        (item: any) => typeof item === 'string',
      )
    }
  }

  // Copy other valid properties
  for (const [key, value] of Object.entries(settings)) {
    if (!['model', 'env', 'permissions'].includes(key)) {
      (sanitized as any)[key] = value
    }
  }

  return sanitized
}
