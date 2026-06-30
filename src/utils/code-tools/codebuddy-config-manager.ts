import type { ClaudeCodeProfile } from '../../types/claude-code-config'
import { CODEBUDDY_SETTINGS_FILE, ZCF_CONFIG_FILE } from '../../constants'
import { clearModelEnv } from '../config.model-keys'
import { readJsonConfig, writeJsonConfig } from '../json-config'
import { createDefaultTomlConfig, readDefaultTomlConfig, writeTomlConfig } from '../zcf-config'

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

      // Clean model variables upfront; will re-set based on profile below
      clearModelEnv(settings.env)

      if (!profile) {
        writeJsonConfig(CODEBUDDY_SETTINGS_FILE, settings)
        return
      }

      if (profile.authType === 'api_key') {
        settings.env.ANTHROPIC_API_KEY = profile.apiKey
        delete settings.env.ANTHROPIC_AUTH_TOKEN
      }
      else if (profile.authType === 'auth_token') {
        settings.env.ANTHROPIC_AUTH_TOKEN = profile.apiKey
        delete settings.env.ANTHROPIC_API_KEY
      }

      if (profile.baseUrl) {
        settings.env.ANTHROPIC_BASE_URL = profile.baseUrl
      }

      if (profile.primaryModel) {
        settings.env.ANTHROPIC_MODEL = profile.primaryModel
      }
      if (profile.defaultHaikuModel) {
        settings.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = profile.defaultHaikuModel
      }
      if (profile.defaultSonnetModel) {
        settings.env.ANTHROPIC_DEFAULT_SONNET_MODEL = profile.defaultSonnetModel
      }
      if (profile.defaultOpusModel) {
        settings.env.ANTHROPIC_DEFAULT_OPUS_MODEL = profile.defaultOpusModel
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
