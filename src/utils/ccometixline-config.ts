import type { ClaudeSettings } from '../types/config'
import { SETTINGS_FILE } from '../constants'
// Usage: Track ownership of the generated status-line setting.
import { markZcfSettingsField } from './claude-config'
import { exists } from './fs-operations'
import { readJsonConfig, writeJsonConfig } from './json-config'
import { getPlatformStatusLineConfig } from './statusline-validator'

/**
 * Adds CCometixLine statusLine configuration to Claude Code settings
 */
export function addCCometixLineConfig(): boolean {
  try {
    // Get platform-specific configuration
    const statusLineConfig = getPlatformStatusLineConfig()

    // Read existing settings or create new ones
    let settings: ClaudeSettings = {}
    if (exists(SETTINGS_FILE)) {
      settings = readJsonConfig<ClaudeSettings>(SETTINGS_FILE) || {}
    }

    // Add statusLine configuration
    settings.statusLine = statusLineConfig

    // Write updated settings
    writeJsonConfig(SETTINGS_FILE, settings)
    markZcfSettingsField('statusLine', statusLineConfig)

    return true
  }
  catch (error) {
    console.error('Failed to add CCometixLine configuration:', error)
    return false
  }
}

/**
 * Checks if CCometixLine statusLine configuration exists
 */
export function hasCCometixLineConfig(): boolean {
  try {
    if (!exists(SETTINGS_FILE)) {
      return false
    }

    const settings = readJsonConfig<ClaudeSettings>(SETTINGS_FILE)
    return !!(settings?.statusLine?.command?.includes('ccline'))
  }
  catch {
    return false
  }
}

/**
 * Removes CCometixLine statusLine configuration
 */
export function removeCCometixLineConfig(): boolean {
  try {
    if (!exists(SETTINGS_FILE)) {
      return true // Nothing to remove
    }

    const settings = readJsonConfig<ClaudeSettings>(SETTINGS_FILE)
    if (!settings) {
      return true
    }

    // Remove statusLine configuration
    delete settings.statusLine

    // Write updated settings
    writeJsonConfig(SETTINGS_FILE, settings)

    return true
  }
  catch (error) {
    console.error('Failed to remove CCometixLine configuration:', error)
    return false
  }
}

/**
 * Gets the current CCometixLine configuration display text for different platforms
 */
export function getCCometixLineConfigText(): string {
  const config = getPlatformStatusLineConfig()

  return `{
  "statusLine": {
    "type": "${config.type}",
    "command": "${config.command}",
    "padding": ${config.padding}
  }
}`
}
