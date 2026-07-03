import type { CodeBuddyProfile } from '../../types/codebuddy-config'
import { CODEBUDDY_SETTINGS_FILE, ZCF_CONFIG_FILE } from '../../constants'
import { clearCodeBuddyEnv } from '../config.model-keys'
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
  static async applyProfileSettings(profile: CodeBuddyProfile | null): Promise<void> {
    const { ensureI18nInitialized } = await import('../../i18n')
    ensureI18nInitialized()

    try {
      const settings = readJsonConfig<any>(CODEBUDDY_SETTINGS_FILE) || {}

      if (!settings.env) {
        settings.env = {}
      }

      // Clean CodeBuddy env variables upfront; will re-set based on profile below
      clearCodeBuddyEnv(settings.env)

      if (!profile) {
        writeJsonConfig(CODEBUDDY_SETTINGS_FILE, settings)
        return
      }

      if (profile.authType === 'api_key') {
        settings.env.CODEBUDDY_API_KEY = profile.apiKey
      }
      else if (profile.authType === 'auth_token') {
        settings.env.CODEBUDDY_AUTH_TOKEN = profile.apiKey
      }

      if (profile.baseUrl) {
        settings.env.CODEBUDDY_BASE_URL = profile.baseUrl
      }

      if (profile.primaryModel) {
        settings.env.CODEBUDDY_MODEL = profile.primaryModel
      }
      if (profile.smallFastModel) {
        settings.env.CODEBUDDY_SMALL_FAST_MODEL = profile.smallFastModel
      }
      if (profile.bigSlowModel) {
        settings.env.CODEBUDDY_BIG_SLOW_MODEL = profile.bigSlowModel
      }
      if (profile.codeSubagentModel) {
        settings.env.CODEBUDDY_CODE_SUBAGENT_MODEL = profile.codeSubagentModel
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

  static getCurrentProfile(): CodeBuddyProfile | null {
    const tomlConfig = readDefaultTomlConfig()
    if (!tomlConfig?.codebuddy?.currentProfile || !tomlConfig.codebuddy.profiles) {
      return null
    }
    return tomlConfig.codebuddy.profiles[tomlConfig.codebuddy.currentProfile] || null
  }

  static writeConfig(updates: Partial<{ enabled: boolean, currentProfile: string, profiles: Record<string, CodeBuddyProfile> }>): void {
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

  static sanitizeProfile(profile: CodeBuddyProfile): CodeBuddyProfile {
    const sanitized: CodeBuddyProfile = {
      name: profile.name,
      authType: profile.authType,
    }
    if (profile.apiKey)
      sanitized.apiKey = profile.apiKey
    if (profile.baseUrl)
      sanitized.baseUrl = profile.baseUrl
    if (profile.primaryModel)
      sanitized.primaryModel = profile.primaryModel
    if (profile.smallFastModel)
      sanitized.smallFastModel = profile.smallFastModel
    if (profile.bigSlowModel)
      sanitized.bigSlowModel = profile.bigSlowModel
    if (profile.codeSubagentModel)
      sanitized.codeSubagentModel = profile.codeSubagentModel
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
