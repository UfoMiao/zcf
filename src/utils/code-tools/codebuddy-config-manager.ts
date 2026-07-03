import type { ClaudeCodeProfile } from '../../types/claude-code-config'
import { CODEBUDDY_SETTINGS_FILE, ZCF_CONFIG_FILE } from '../../constants'
import { readJsonConfig, writeJsonConfig } from '../json-config'
import { createDefaultTomlConfig, readDefaultTomlConfig, writeTomlConfig } from '../zcf-config'

// CodeBuddy-specific environment variable keys (do NOT share with ClaudeCode's ANTHROPIC_* keys)
// Reference: https://www.codebuddy.cn/docs/cli/env-vars
export const CODEBUDDY_ENV_KEYS = {
  API_KEY: 'CODEBUDDY_API_KEY',
  AUTH_TOKEN: 'CODEBUDDY_AUTH_TOKEN',
  BASE_URL: 'CODEBUDDY_BASE_URL',
  MODEL: 'CODEBUDDY_MODEL',
  SMALL_FAST_MODEL: 'CODEBUDDY_SMALL_FAST_MODEL',
  BIG_SLOW_MODEL: 'CODEBUDDY_BIG_SLOW_MODEL',
  // Legacy alias cleaned to avoid stale values from older ClaudeCode-style configs
  MODEL_LEGACY: 'ANTHROPIC_MODEL',
} as const

const CODEBUDDY_MODEL_ENV_KEYS = [
  CODEBUDDY_ENV_KEYS.MODEL,
  CODEBUDDY_ENV_KEYS.SMALL_FAST_MODEL,
  CODEBUDDY_ENV_KEYS.BIG_SLOW_MODEL,
  CODEBUDDY_ENV_KEYS.MODEL_LEGACY,
] as const

/**
 * Clear CodeBuddy model-related env keys from a settings.env object.
 * Independent from ClaudeCode's clearModelEnv — CodeBuddy uses CODEBUDDY_* naming.
 */
export function clearCodebuddyModelEnv(env: Record<string, string | undefined>): void {
  for (const key of CODEBUDDY_MODEL_ENV_KEYS) {
    delete env[key]
  }
}

/**
 * Clear all CodeBuddy auth/model env keys from a settings.env object.
 */
export function clearCodebuddyAuthEnv(env: Record<string, string | undefined>): void {
  delete env[CODEBUDDY_ENV_KEYS.API_KEY]
  delete env[CODEBUDDY_ENV_KEYS.AUTH_TOKEN]
  delete env[CODEBUDDY_ENV_KEYS.BASE_URL]
  clearCodebuddyModelEnv(env)
}

export interface OperationResult {
  success: boolean
  error?: string
  backupPath?: string
}

export class CodeBuddyConfigManager {
  /**
   * Apply profile settings to CodeBuddy runtime (~/.codebuddy/settings.json)
   */
  static async applyProfileSettings(profile: ClaudeCodeProfile | null): Promise<void> {
    const { ensureI18nInitialized } = await import('../../i18n')
    ensureI18nInitialized()

    try {
      const settings = readJsonConfig<any>(CODEBUDDY_SETTINGS_FILE) || {}

      if (!settings.env) {
        settings.env = {}
      }

      // Clean CodeBuddy model env keys upfront; will re-set based on profile below
      clearCodebuddyModelEnv(settings.env)
      // Also clear auth keys so switching profiles doesn't leave stale credentials
      delete settings.env[CODEBUDDY_ENV_KEYS.API_KEY]
      delete settings.env[CODEBUDDY_ENV_KEYS.AUTH_TOKEN]
      delete settings.env[CODEBUDDY_ENV_KEYS.BASE_URL]

      if (!profile) {
        writeJsonConfig(CODEBUDDY_SETTINGS_FILE, settings)
        return
      }

      if (profile.authType === 'api_key') {
        settings.env[CODEBUDDY_ENV_KEYS.API_KEY] = profile.apiKey
      }
      else if (profile.authType === 'auth_token') {
        settings.env[CODEBUDDY_ENV_KEYS.AUTH_TOKEN] = profile.apiKey
      }

      if (profile.baseUrl) {
        settings.env[CODEBUDDY_ENV_KEYS.BASE_URL] = profile.baseUrl
      }

      if (profile.primaryModel) {
        settings.env[CODEBUDDY_ENV_KEYS.MODEL] = profile.primaryModel
      }
      if (profile.defaultHaikuModel) {
        settings.env[CODEBUDDY_ENV_KEYS.SMALL_FAST_MODEL] = profile.defaultHaikuModel
      }
      if (profile.defaultSonnetModel) {
        settings.env[CODEBUDDY_ENV_KEYS.BIG_SLOW_MODEL] = profile.defaultSonnetModel
      }
      if (profile.defaultOpusModel) {
        // CodeBuddy has no OPUS equivalent; map to BIG_SLOW_MODEL if not already set
        if (!settings.env[CODEBUDDY_ENV_KEYS.BIG_SLOW_MODEL]) {
          settings.env[CODEBUDDY_ENV_KEYS.BIG_SLOW_MODEL] = profile.defaultOpusModel
        }
      }

      writeJsonConfig(CODEBUDDY_SETTINGS_FILE, settings)
    }
    catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to apply CodeBuddy profile settings: ${reason}`)
    }
  }

  static async applyCurrentProfile(): Promise<void> {
    const profile = this.getCurrentProfile()
    if (!profile) {
      return
    }
    await this.applyProfileSettings(profile)
  }

  static getCurrentProfile(): ClaudeCodeProfile | null {
    const tomlConfig = readDefaultTomlConfig()
    if (!tomlConfig?.codebuddy?.currentProfile || !tomlConfig.codebuddy.profiles) {
      return null
    }
    return tomlConfig.codebuddy.profiles[tomlConfig.codebuddy.currentProfile] || null
  }

  static writeConfig(updates: Partial<{ enabled: boolean, currentProfile: string, profiles: Record<string, ClaudeCodeProfile> }>): void {
    const tomlConfig = readDefaultTomlConfig() || createDefaultTomlConfig()
    const codebuddy = tomlConfig.codebuddy || { enabled: false, currentProfile: '', profiles: {} }
    const merged = {
      ...tomlConfig,
      codebuddy: {
        ...codebuddy,
        ...updates,
      },
    }
    writeTomlConfig(ZCF_CONFIG_FILE, merged)
  }

  static sanitizeProfile(profile: ClaudeCodeProfile): ClaudeCodeProfile {
    const sanitized: ClaudeCodeProfile = {
      name: profile.name,
      authType: profile.authType,
    }
    if (profile.apiKey)
      sanitized.apiKey = profile.apiKey
    if (profile.baseUrl)
      sanitized.baseUrl = profile.baseUrl
    if (profile.primaryModel)
      sanitized.primaryModel = profile.primaryModel
    if (profile.defaultHaikuModel)
      sanitized.defaultHaikuModel = profile.defaultHaikuModel
    if (profile.defaultSonnetModel)
      sanitized.defaultSonnetModel = profile.defaultSonnetModel
    if (profile.defaultOpusModel)
      sanitized.defaultOpusModel = profile.defaultOpusModel
    return sanitized
  }

  static generateProfileId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      || 'default'
  }
}
