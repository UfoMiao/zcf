import type { ClaudeSettings } from '../types/config';
import { type SupportedLang } from '../constants';
import { getTranslation } from '../i18n';
import { readZcfConfig } from './zcf-config';

/**
 * Validate Claude settings configuration
 */
export function validateClaudeSettings(settings: any): settings is ClaudeSettings {
  if (!settings || typeof settings !== 'object') {
    return false;
  }

  // Get i18n based on user's preferred language
  const zcfConfig = readZcfConfig();
  const lang: SupportedLang = zcfConfig?.preferredLang || 'en';
  const i18n = getTranslation(lang);

  // Validate model if present
  if (settings.model && !['opus', 'sonnet'].includes(settings.model)) {
    console.warn(`Invalid model: ${settings.model}. Expected 'opus' or 'sonnet'`);
    return false;
  }

  // Validate env object if present
  if (settings.env) {
    if (typeof settings.env !== 'object') {
      console.warn(i18n.errors.invalidEnvConfig || 'Invalid env configuration: expected object');
      return false;
    }

    // Validate API configuration
    const { ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, ANTHROPIC_BASE_URL } = settings.env;
    
    if (ANTHROPIC_BASE_URL && typeof ANTHROPIC_BASE_URL !== 'string') {
      console.warn(i18n.errors.invalidApiUrl || 'Invalid ANTHROPIC_BASE_URL: expected string');
      return false;
    }

    if (ANTHROPIC_API_KEY && typeof ANTHROPIC_API_KEY !== 'string') {
      console.warn(i18n.errors.invalidApiKey || 'Invalid ANTHROPIC_API_KEY: expected string');
      return false;
    }

    if (ANTHROPIC_AUTH_TOKEN && typeof ANTHROPIC_AUTH_TOKEN !== 'string') {
      console.warn(i18n.errors.invalidAuthToken || 'Invalid ANTHROPIC_AUTH_TOKEN: expected string');
      return false;
    }
  }

  // Validate permissions if present
  if (settings.permissions) {
    if (typeof settings.permissions !== 'object') {
      console.warn(i18n.errors.invalidPermissionsConfig || 'Invalid permissions configuration: expected object');
      return false;
    }

    if (settings.permissions.allow && !Array.isArray(settings.permissions.allow)) {
      console.warn(i18n.errors.invalidPermissionsAllow || 'Invalid permissions.allow: expected array');
      return false;
    }
  }

  return true;
}

/**
 * Sanitize and fix common configuration issues
 */
export function sanitizeClaudeSettings(settings: any): ClaudeSettings {
  const sanitized: ClaudeSettings = {};

  // Handle null/undefined/non-object input
  if (!settings || typeof settings !== 'object') {
    return sanitized;
  }

  // Copy valid model
  if (settings.model && ['opus', 'sonnet'].includes(settings.model)) {
    sanitized.model = settings.model;
  }

  // Copy and validate env
  if (settings.env && typeof settings.env === 'object') {
    sanitized.env = {};
    for (const [key, value] of Object.entries(settings.env)) {
      if (typeof value === 'string' || value === undefined) {
        sanitized.env[key] = value;
      }
    }
  }

  // Copy and validate permissions
  if (settings.permissions && typeof settings.permissions === 'object') {
    sanitized.permissions = {};
    if (Array.isArray(settings.permissions.allow)) {
      sanitized.permissions.allow = settings.permissions.allow.filter(
        (item: any) => typeof item === 'string'
      );
    }
  }

  // Copy other valid properties
  for (const [key, value] of Object.entries(settings)) {
    if (!['model', 'env', 'permissions'].includes(key)) {
      (sanitized as any)[key] = value;
    }
  }

  return sanitized;
}