import type { StatusLineConfig } from '../types/config'

/**
 * Validates StatusLine configuration structure
 */
export function validateStatusLineConfig(config: any): config is StatusLineConfig {
  if (!config || typeof config !== 'object') {
    return false
  }

  // Check required fields
  if (config.type !== 'command') {
    return false
  }

  if (!config.command || typeof config.command !== 'string' || config.command.trim() === '') {
    return false
  }

  // Check optional fields
  if (config.padding !== undefined) {
    if (typeof config.padding !== 'number' || config.padding < 0) {
      return false
    }
  }

  return true
}

/**
 * Sanitizes StatusLine configuration, removing invalid properties
 */
export function sanitizeStatusLineConfig(config: any): StatusLineConfig | null {
  if (!validateStatusLineConfig(config)) {
    return null
  }

  const sanitized: StatusLineConfig = {
    type: 'command',
    command: config.command.trim(),
  }

  if (config.padding !== undefined && typeof config.padding === 'number' && config.padding >= 0) {
    sanitized.padding = config.padding
  }

  return sanitized
}

/**
 * Gets platform-specific StatusLine configuration suggestions
 */
export function getPlatformStatusLineConfig(): StatusLineConfig {
  return {
    type: 'command',
    command: '~/.claude/ccline/ccline',
    padding: 0,
  }
}
