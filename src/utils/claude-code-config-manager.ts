import type { CcrConfig } from '../types/ccr'
import type { ClaudeCodeConfigData, ClaudeCodeProfile, OperationResult } from '../types/claude-code-config'
import dayjs from 'dayjs'
import { join } from 'pathe'
import { ZCF_CONFIG_DIR } from '../constants'
import { ensureDir, exists, readFile, writeFile } from './fs-operations'
import { writeJsonConfig } from './json-config'

export class ClaudeCodeConfigManager {
  static readonly CONFIG_FILE = join(ZCF_CONFIG_DIR, 'claude-code-configs.json')
  static readonly CONFIG_VERSION = '1.0.0'

  /**
   * Ensure configuration directory exists
   */
  private static ensureConfigDir(): void {
    ensureDir(ZCF_CONFIG_DIR)
  }

  /**
   * Read configuration
   */
  static readConfig(): ClaudeCodeConfigData | null {
    try {
      if (!exists(this.CONFIG_FILE)) {
        return null
      }

      const content = readFile(this.CONFIG_FILE)
      const config = JSON.parse(content) as ClaudeCodeConfigData

      // Validate configuration version
      if (config.version !== this.CONFIG_VERSION) {
        console.warn(`Claude Code config version mismatch. Expected: ${this.CONFIG_VERSION}, Found: ${config.version}`)
      }

      return config
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

      const configToWrite = {
        ...config,
        version: this.CONFIG_VERSION,
      }

      const content = JSON.stringify(configToWrite, null, 2)
      writeFile(this.CONFIG_FILE, content)
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
      version: this.CONFIG_VERSION,
    }
  }

  /**
   * Backup configuration
   */
  static backupConfig(): string | null {
    try {
      const config = this.readConfig()
      if (!config) {
        return null
      }

      const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss')
      const backupPath = join(ZCF_CONFIG_DIR, `claude-code-configs.backup.${timestamp}.json`)

      const backupData = {
        ...config,
        backupAt: new Date().toISOString(),
        originalFile: this.CONFIG_FILE,
      }

      writeJsonConfig(backupPath, backupData)
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
      if (config.profiles[profile.id]) {
        return {
          success: false,
          error: `Profile with ID "${profile.id}" already exists`,
          backupPath: backupPath || undefined,
        }
      }

      // 检查名称冲突
      const existingNames = Object.values(config.profiles).map(p => p.name || '')
      if (existingNames.includes(profile.name)) {
        return {
          success: false,
          error: `Profile with name "${profile.name}" already exists`,
          backupPath: backupPath || undefined,
        }
      }

      // 设置时间戳
      const now = new Date().toISOString()
      profile.createdAt = now
      profile.updatedAt = now

      // 添加配置
      config.profiles[profile.id] = profile

      // 如果这是第一个配置，设为当前配置
      if (!config.currentProfileId) {
        config.currentProfileId = profile.id
      }

      // 写入配置
      this.writeConfig(config)

      return {
        success: true,
        backupPath: backupPath || undefined,
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

      // 检查名称冲突（如果更新了名称）
      if (data.name && data.name !== config.profiles[id].name) {
        const existingNames = Object.values(config.profiles)
          .filter(p => p.id !== id)
          .map(p => p.name || '')

        if (existingNames.includes(data.name)) {
          return {
            success: false,
            error: `Profile with name "${data.name}" already exists`,
            backupPath: backupPath || undefined,
          }
        }
      }

      // 更新配置（保留不可变字段）
      const updatedProfile: ClaudeCodeProfile = {
        ...config.profiles[id],
        ...data,
        id, // 确保ID不被更改
        updatedAt: new Date().toISOString(),
      }

      config.profiles[id] = updatedProfile
      this.writeConfig(config)

      return {
        success: true,
        backupPath: backupPath || undefined,
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
    return `${name
      .toLowerCase()
      .trim()
      .replace(/\W+/g, '-') // Replace spaces and non-word characters with hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    }-${Math.random().toString(36).substring(2, 8)}` // Add random suffix for uniqueness
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
          error: `Profile with ID "${id}" not found`,
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

    // 创建或更新CCR配置
    const ccrProfile: ClaudeCodeProfile = {
      id: ccrProfileId,
      name: 'CCR Proxy',
      authType: 'ccr_proxy',
      description: 'CCR代理配置（动态同步）',
      createdAt: existingCcrProfile?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    config.profiles[ccrProfileId] = ccrProfile

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
    if (!isUpdate) {
      if (!profile.id || typeof profile.id !== 'string' || profile.id.trim() === '') {
        errors.push('Profile ID is required')
      }

      if (!profile.name || typeof profile.name !== 'string' || profile.name.trim() === '') {
        errors.push('Profile name is required')
      }
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
