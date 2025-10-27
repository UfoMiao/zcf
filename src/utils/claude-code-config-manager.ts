import type { CcrConfig } from '../types/ccr'
import type { ClaudeCodeConfigData, ClaudeCodeProfile, OperationResult } from '../types/claude-code-config'
import type { ZcfTomlConfig } from '../types/toml-config'
import dayjs from 'dayjs'
import { join } from 'pathe'
import { SETTINGS_FILE, ZCF_CONFIG_DIR, ZCF_CONFIG_FILE } from '../constants'
import { copyFile, ensureDir, exists } from './fs-operations'
import { readJsonConfig } from './json-config'
import { createDefaultTomlConfig, readDefaultTomlConfig, writeTomlConfig } from './zcf-config'

export class ClaudeCodeConfigManager {
  static readonly CONFIG_FILE = ZCF_CONFIG_FILE
  static readonly LEGACY_CONFIG_FILE = join(ZCF_CONFIG_DIR, 'claude-code-configs.json')

  /**
   * Ensure configuration directory exists
   */
  private static ensureConfigDir(): void {
    ensureDir(ZCF_CONFIG_DIR)
  }

  /**
   * Read TOML configuration
   */
  private static readTomlConfig(): ZcfTomlConfig | null {
    return readDefaultTomlConfig()
  }

  /**
   * Load TOML configuration, falling back to default when missing
   */
  private static loadTomlConfig(): ZcfTomlConfig {
    const existingConfig = this.readTomlConfig()
    if (existingConfig) {
      return existingConfig
    }
    return createDefaultTomlConfig()
  }

  /**
   * Migrate legacy JSON-based configuration into TOML storage
   */
  private static migrateFromLegacyConfig(): ClaudeCodeConfigData | null {
    if (!exists(this.LEGACY_CONFIG_FILE)) {
      return null
    }

    try {
      const legacyConfig = readJsonConfig<any>(this.LEGACY_CONFIG_FILE)
      if (!legacyConfig) {
        return null
      }

      const normalizedProfiles: Record<string, ClaudeCodeProfile> = {}
      const existingKeys = new Set<string>()
      let migratedCurrentKey = ''

      Object.entries(legacyConfig.profiles || {}).forEach(([legacyKey, profile]) => {
        const sourceProfile = profile as ClaudeCodeProfile
        const name = sourceProfile.name?.trim() || legacyKey
        const baseKey = this.generateProfileId(name)
        let uniqueKey = baseKey || legacyKey
        let suffix = 2
        while (existingKeys.has(uniqueKey)) {
          uniqueKey = `${baseKey || legacyKey}-${suffix++}`
        }
        existingKeys.add(uniqueKey)

        const sanitizedProfile = this.sanitizeProfile({
          ...sourceProfile,
          name,
        })

        normalizedProfiles[uniqueKey] = {
          ...sanitizedProfile,
          id: uniqueKey,
        }

        if (legacyConfig.currentProfileId === legacyKey || legacyConfig.currentProfileId === sourceProfile.id) {
          migratedCurrentKey = uniqueKey
        }
      })

      if (!migratedCurrentKey && legacyConfig.currentProfileId) {
        const fallbackKey = this.generateProfileId(legacyConfig.currentProfileId)
        if (existingKeys.has(fallbackKey)) {
          migratedCurrentKey = fallbackKey
        }
      }

      if (!migratedCurrentKey && existingKeys.size > 0) {
        migratedCurrentKey = Array.from(existingKeys)[0]
      }

      const migratedConfig: ClaudeCodeConfigData = {
        currentProfileId: migratedCurrentKey,
        profiles: normalizedProfiles,
      }

      this.writeConfig(migratedConfig)
      return migratedConfig
    }
    catch (error) {
      console.error('Failed to migrate legacy Claude Code config:', error)
      return null
    }
  }

  /**
   * Read configuration
   */
  static readConfig(): ClaudeCodeConfigData | null {
    try {
      const tomlConfig = readDefaultTomlConfig()
      if (!tomlConfig || !tomlConfig.claudeCode) {
        return this.migrateFromLegacyConfig()
      }

      const { claudeCode } = tomlConfig
      const rawProfiles = claudeCode.profiles || {}
      const sanitizedProfiles = Object.fromEntries(
        Object.entries(rawProfiles).map(([key, profile]) => {
          const storedProfile = this.sanitizeProfile({
            ...(profile as ClaudeCodeProfile),
            name: (profile as ClaudeCodeProfile).name || key,
          })
          return [key, { ...storedProfile, id: key }]
        }),
      )

      const configData: ClaudeCodeConfigData = {
        currentProfileId: claudeCode.currentProfile || '',
        profiles: sanitizedProfiles,
      }

      if (Object.keys(configData.profiles).length === 0) {
        const migrated = this.migrateFromLegacyConfig()
        if (migrated) {
          return migrated
        }
      }

      return configData
    }
    catch (error) {
      console.error('Failed to read Claude Code config:', error)
      return null
    }
  }

  /**
   * Write configuration
   */
  static writeConfig(config: ClaudeCodeConfigData): void {
    try {
      this.ensureConfigDir()

      const keyMap = new Map<string, string>()
      const sanitizedProfiles = Object.fromEntries(
        Object.entries(config.profiles).map(([key, profile]) => {
          const normalizedName = profile.name?.trim() || key
          const profileKey = this.generateProfileId(normalizedName)
          keyMap.set(key, profileKey)

          const sanitizedProfile = this.sanitizeProfile({
            ...profile,
            name: normalizedName,
          })
          return [profileKey, sanitizedProfile]
        }),
      )

      const tomlConfig = this.loadTomlConfig()
      const nextTomlConfig: ZcfTomlConfig = {
        ...tomlConfig,
        claudeCode: {
          ...tomlConfig.claudeCode,
          currentProfile: keyMap.get(config.currentProfileId) || config.currentProfileId,
          profiles: sanitizedProfiles,
        },
      }

      writeTomlConfig(this.CONFIG_FILE, nextTomlConfig)
    }
    catch (error) {
      console.error('Failed to write Claude Code config:', error)
      throw new Error(`Failed to write config: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Create empty configuration
   */
  static createEmptyConfig(): ClaudeCodeConfigData {
    return {
      currentProfileId: '',
      profiles: {},
    }
  }

  /**
   * Apply profile settings to Claude Code runtime
   */
  static async applyProfileSettings(profile: ClaudeCodeProfile | null): Promise<void> {
    const { ensureI18nInitialized, i18n } = await import('../i18n')
    ensureI18nInitialized()

    try {
      if (!profile) {
        const { switchToOfficialLogin } = await import('./config')
        switchToOfficialLogin()
        return
      }

      const { readJsonConfig, writeJsonConfig } = await import('./json-config')
      const settings = readJsonConfig<any>(SETTINGS_FILE) || {}

      if (!settings.env)
        settings.env = {}

      let shouldRestartCcr = false

      if (profile.authType === 'api_key') {
        settings.env.ANTHROPIC_API_KEY = profile.apiKey
        delete settings.env.ANTHROPIC_AUTH_TOKEN
      }
      else if (profile.authType === 'auth_token') {
        settings.env.ANTHROPIC_AUTH_TOKEN = profile.apiKey
        delete settings.env.ANTHROPIC_API_KEY
      }
      else if (profile.authType === 'ccr_proxy') {
        const { readCcrConfig } = await import('./ccr/config')
        const ccrConfig = readCcrConfig()
        if (!ccrConfig) {
          throw new Error(i18n.t('ccr:ccrNotConfigured') || 'CCR proxy configuration not found')
        }

        const host = ccrConfig.HOST || '127.0.0.1'
        const port = ccrConfig.PORT || 3456
        const apiKey = ccrConfig.APIKEY || 'sk-zcf-x-ccr'

        settings.env.ANTHROPIC_BASE_URL = `http://${host}:${port}`
        settings.env.ANTHROPIC_API_KEY = apiKey
        delete settings.env.ANTHROPIC_AUTH_TOKEN
        shouldRestartCcr = true
      }

      if (profile.authType !== 'ccr_proxy') {
        if (profile.baseUrl)
          settings.env.ANTHROPIC_BASE_URL = profile.baseUrl
        else
          delete settings.env.ANTHROPIC_BASE_URL
      }

      // Apply model configuration if provided
      if (profile.primaryModel) {
        settings.env.ANTHROPIC_MODEL = profile.primaryModel
      }
      else {
        delete settings.env.ANTHROPIC_MODEL
      }

      if (profile.fastModel) {
        settings.env.ANTHROPIC_SMALL_FAST_MODEL = profile.fastModel
      }
      else {
        delete settings.env.ANTHROPIC_SMALL_FAST_MODEL
      }

      writeJsonConfig(SETTINGS_FILE, settings)

      const { setPrimaryApiKey, addCompletedOnboarding } = await import('./claude-config')
      setPrimaryApiKey()
      addCompletedOnboarding()

      if (shouldRestartCcr) {
        const { runCcrRestart } = await import('./ccr/commands')
        await runCcrRestart()
      }
    }
    catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new Error(`${i18n.t('multi-config:failedToApplySettings')}: ${reason}`)
    }
  }

  static async applyCurrentProfile(): Promise<void> {
    const currentProfile = this.getCurrentProfile()
    await this.applyProfileSettings(currentProfile)
  }

  /**
   * Remove unsupported fields from profile payload
   */
  private static sanitizeProfile(profile: ClaudeCodeProfile): ClaudeCodeProfile {
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
    if (profile.fastModel)
      sanitized.fastModel = profile.fastModel

    return sanitized
  }

  /**
   * Backup configuration
   */
  static backupConfig(): string | null {
    try {
      if (!exists(this.CONFIG_FILE)) {
        return null
      }

      const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss')
      const backupPath = join(ZCF_CONFIG_DIR, `config.backup.${timestamp}.toml`)

      copyFile(this.CONFIG_FILE, backupPath)
      return backupPath
    }
    catch (error) {
      console.error('Failed to backup Claude Code config:', error)
      return null
    }
  }

  /**
   * Add configuration
   */
  static async addProfile(profile: ClaudeCodeProfile): Promise<OperationResult> {
    try {
      // 验证配置
      const validationErrors = this.validateProfile(profile)
      if (validationErrors.length > 0) {
        return {
          success: false,
          error: `Validation failed: ${validationErrors.join(', ')}`,
        }
      }

      // 备份现有配置
      const backupPath = this.backupConfig()

      // 读取现有配置或创建新配置
      let config = this.readConfig()
      if (!config) {
        config = this.createEmptyConfig()
      }

      // 检查ID冲突
      if (profile.id && config.profiles[profile.id]) {
        return {
          success: false,
          error: `Profile with ID "${profile.id}" already exists`,
          backupPath: backupPath || undefined,
        }
      }

      // 检查名称冲突
      const normalizedName = profile.name.trim()
      const profileKey = this.generateProfileId(normalizedName)
      const existingNames = Object.values(config.profiles).map(p => p.name || '')
      if (config.profiles[profileKey] || existingNames.some(name => name.toLowerCase() === normalizedName.toLowerCase())) {
        return {
          success: false,
          error: `Profile with name "${profile.name}" already exists`,
          backupPath: backupPath || undefined,
        }
      }

      const sanitizedProfile = this.sanitizeProfile({
        ...profile,
        name: normalizedName,
      })

      const runtimeProfile = {
        ...sanitizedProfile,
        id: profileKey,
      }

      // 添加配置
      config.profiles[profileKey] = runtimeProfile

      // 如果这是第一个配置，设为当前配置
      if (!config.currentProfileId) {
        config.currentProfileId = profileKey
      }

      // 写入配置
      this.writeConfig(config)

      return {
        success: true,
        backupPath: backupPath || undefined,
        addedProfile: runtimeProfile,
      }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Update configuration
   */
  static async updateProfile(id: string, data: Partial<ClaudeCodeProfile>): Promise<OperationResult> {
    try {
      // 验证更新的数据
      const validationErrors = this.validateProfile(data, true)
      if (validationErrors.length > 0) {
        return {
          success: false,
          error: `Validation failed: ${validationErrors.join(', ')}`,
        }
      }

      // 备份现有配置
      const backupPath = this.backupConfig()

      // 读取现有配置
      const config = this.readConfig()
      if (!config || !config.profiles[id]) {
        return {
          success: false,
          error: `Profile with ID "${id}" not found`,
          backupPath: backupPath || undefined,
        }
      }

      const existingProfile = config.profiles[id]
      const nextName = data.name !== undefined ? data.name.trim() : existingProfile.name
      const nextKey = this.generateProfileId(nextName)
      const nameChanged = nextKey !== id

      if (nameChanged) {
        const duplicateName = Object.entries(config.profiles)
          .some(([key, profile]) => key !== id && (profile.name || '').toLowerCase() === nextName.toLowerCase())
        if (duplicateName || config.profiles[nextKey]) {
          return {
            success: false,
            error: `Profile with name "${data.name}" already exists`,
            backupPath: backupPath || undefined,
          }
        }
      }

      const mergedProfile: ClaudeCodeProfile = this.sanitizeProfile({
        ...existingProfile,
        ...data,
        name: nextName,
      })

      if (nameChanged) {
        delete config.profiles[id]
        config.profiles[nextKey] = {
          ...mergedProfile,
          id: nextKey,
        }
        if (config.currentProfileId === id) {
          config.currentProfileId = nextKey
        }
      }
      else {
        config.profiles[id] = {
          ...mergedProfile,
          id,
        }
      }

      this.writeConfig(config)

      return {
        success: true,
        backupPath: backupPath || undefined,
        updatedProfile: {
          ...mergedProfile,
          id: nameChanged ? nextKey : id,
        },
      }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Delete configuration
   */
  static async deleteProfile(id: string): Promise<OperationResult> {
    try {
      // 备份现有配置
      const backupPath = this.backupConfig()

      // 读取现有配置
      const config = this.readConfig()
      if (!config || !config.profiles[id]) {
        return {
          success: false,
          error: `Profile with ID "${id}" not found`,
          backupPath: backupPath || undefined,
        }
      }

      // 检查是否为最后一个配置
      const profileCount = Object.keys(config.profiles).length
      if (profileCount === 1) {
        return {
          success: false,
          error: 'Cannot delete the last profile. At least one profile must remain.',
          backupPath: backupPath || undefined,
        }
      }

      // 删除配置
      delete config.profiles[id]

      // 如果删除的是当前配置，切换到其他配置
      if (config.currentProfileId === id) {
        const remainingIds = Object.keys(config.profiles)
        config.currentProfileId = remainingIds[0]
      }

      this.writeConfig(config)

      return {
        success: true,
        backupPath: backupPath || undefined,
        remainingProfiles: Object.entries(config.profiles).map(([key, profile]) => ({
          ...profile,
          id: key,
        })),
      }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Delete multiple configurations
   */
  static async deleteProfiles(ids: string[]): Promise<OperationResult & { newCurrentProfileId?: string }> {
    try {
      // 备份现有配置
      const backupPath = this.backupConfig()

      // 读取现有配置
      const config = this.readConfig()
      if (!config) {
        return {
          success: false,
          error: 'No configuration found',
          backupPath: backupPath || undefined,
        }
      }

      // 检查所有ID是否存在
      const missingIds = ids.filter(id => !config.profiles[id])
      if (missingIds.length > 0) {
        return {
          success: false,
          error: `Profiles not found: ${missingIds.join(', ')}`,
          backupPath: backupPath || undefined,
        }
      }

      // 检查是否要删除所有配置
      const remainingCount = Object.keys(config.profiles).length - ids.length
      if (remainingCount === 0) {
        return {
          success: false,
          error: 'Cannot delete all profiles. At least one profile must remain.',
          backupPath: backupPath || undefined,
        }
      }

      // 删除配置
      let newCurrentProfileId: string | undefined
      ids.forEach((id) => {
        delete config.profiles[id]
      })

      // 如果当前配置被删除，选择新的当前配置
      if (ids.includes(config.currentProfileId)) {
        const remainingIds = Object.keys(config.profiles)
        config.currentProfileId = remainingIds[0]
        newCurrentProfileId = config.currentProfileId
      }

      this.writeConfig(config)

      return {
        success: true,
        backupPath: backupPath || undefined,
        newCurrentProfileId,
        deletedProfiles: ids,
        remainingProfiles: Object.entries(config.profiles).map(([key, profile]) => ({
          ...profile,
          id: key,
        })),
      }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Generate profile ID from name
   */
  static generateProfileId(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphen
      .replace(/^-+|-+$/g, '') || 'profile'
  }

  /**
   * Switch configuration
   */
  static async switchProfile(id: string): Promise<OperationResult> {
    try {
      // 读取现有配置
      const config = this.readConfig()
      if (!config || !config.profiles[id]) {
        return {
          success: false,
          error: 'Profile not found',
        }
      }

      // 如果已经是当前配置，直接返回成功
      if (config.currentProfileId === id) {
        return { success: true }
      }

      // 更新当前配置ID
      config.currentProfileId = id
      this.writeConfig(config)

      return { success: true }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * List all configurations
   */
  static listProfiles(): ClaudeCodeProfile[] {
    const config = this.readConfig()
    if (!config) {
      return []
    }

    return Object.values(config.profiles)
  }

  /**
   * Get current configuration
   */
  static getCurrentProfile(): ClaudeCodeProfile | null {
    const config = this.readConfig()
    if (!config || !config.currentProfileId) {
      return null
    }

    return config.profiles[config.currentProfileId] || null
  }

  /**
   * Get configuration by ID
   */
  static getProfileById(id: string): ClaudeCodeProfile | null {
    const config = this.readConfig()
    if (!config) {
      return null
    }

    return config.profiles[id] || null
  }

  /**
   * Get configuration by name
   */
  static getProfileByName(name: string): ClaudeCodeProfile | null {
    const config = this.readConfig()
    if (!config) {
      return null
    }

    return Object.values(config.profiles).find(p => p.name === name) || null
  }

  /**
   * Sync CCR configuration
   */
  static async syncCcrProfile(): Promise<void> {
    try {
      // 读取CCR配置
      const { readCcrConfig } = await import('./ccr/config')
      const ccrConfig = readCcrConfig()

      if (!ccrConfig) {
        // 如果没有CCR配置，删除CCR profile（如果存在）
        await this.ensureCcrProfileExists(ccrConfig)
        return
      }

      // 确保CCR profile存在且最新
      await this.ensureCcrProfileExists(ccrConfig)
    }
    catch (error) {
      console.error('Failed to sync CCR profile:', error)
    }
  }

  /**
   * 确保CCR配置文件存在
   */
  private static async ensureCcrProfileExists(ccrConfig: CcrConfig | null): Promise<void> {
    const config = this.readConfig() || this.createEmptyConfig()
    const ccrProfileId = 'ccr-proxy'
    const existingCcrProfile = config.profiles[ccrProfileId]

    if (!ccrConfig) {
      // 删除CCR配置（如果存在）
      if (existingCcrProfile) {
        delete config.profiles[ccrProfileId]
        // 如果删除的是当前配置，切换到其他配置
        if (config.currentProfileId === ccrProfileId) {
          const remainingIds = Object.keys(config.profiles)
          config.currentProfileId = remainingIds[0] || ''
        }
        this.writeConfig(config)
      }
      return
    }

    const host = ccrConfig.HOST || '127.0.0.1'
    const port = ccrConfig.PORT || 3456
    const apiKey = ccrConfig.APIKEY || 'sk-zcf-x-ccr'
    const baseUrl = `http://${host}:${port}`

    // 创建或更新CCR配置
    const ccrProfile: ClaudeCodeProfile = {
      name: 'CCR Proxy',
      authType: 'ccr_proxy',
      baseUrl,
      apiKey,
    }

    config.profiles[ccrProfileId] = {
      ...ccrProfile,
      id: ccrProfileId,
    }

    // 如果没有当前配置，设为当前配置
    if (!config.currentProfileId) {
      config.currentProfileId = ccrProfileId
    }

    this.writeConfig(config)
  }

  /**
   * Switch to official login
   */
  static async switchToOfficial(): Promise<OperationResult> {
    try {
      const config = this.readConfig()
      if (!config) {
        return { success: true } // 没有配置就是官方模式
      }

      // 清除当前配置ID，表示使用官方登录
      config.currentProfileId = ''
      this.writeConfig(config)

      return { success: true }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Switch to CCR proxy
   */
  static async switchToCcr(): Promise<OperationResult> {
    try {
      // 确保CCR配置存在
      await this.syncCcrProfile()

      const config = this.readConfig()
      if (!config || !config.profiles['ccr-proxy']) {
        return {
          success: false,
          error: 'CCR proxy configuration not found. Please configure CCR first.',
        }
      }

      return await this.switchProfile('ccr-proxy')
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Validate configuration
   */
  static validateProfile(profile: Partial<ClaudeCodeProfile>, isUpdate: boolean = false): string[] {
    const errors: string[] = []

    // 必需字段验证
    if (!isUpdate && (!profile.name || typeof profile.name !== 'string' || profile.name.trim() === '')) {
      errors.push('Profile name is required')
    }

    if (profile.name && typeof profile.name !== 'string') {
      errors.push('Profile name must be a string')
    }

    // authType验证
    if (profile.authType && !['api_key', 'auth_token', 'ccr_proxy'].includes(profile.authType)) {
      errors.push('Invalid auth type. Must be one of: api_key, auth_token, ccr_proxy')
    }

    // API密钥验证
    if (profile.authType === 'api_key' || profile.authType === 'auth_token') {
      if (!profile.apiKey || typeof profile.apiKey !== 'string' || profile.apiKey.trim() === '') {
        errors.push('API key is required for api_key and auth_token types')
      }
    }

    // URL验证
    if (profile.baseUrl) {
      try {
        // eslint-disable-next-line no-new
        new URL(profile.baseUrl)
      }
      catch {
        errors.push('Invalid base URL format')
      }
    }

    return errors
  }

  /**
   * 检查是否为最后一个配置
   */
  static isLastProfile(id: string): boolean {
    const config = this.readConfig()
    if (!config || !config.profiles[id]) {
      return false
    }

    return Object.keys(config.profiles).length === 1
  }
}
