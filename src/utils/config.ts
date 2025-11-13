import type { AiOutputLanguage } from '../constants'
import type { ApiConfig, ClaudeSettings } from '../types/config'
import type { CopyDirOptions } from './fs-operations'
import { fileURLToPath } from 'node:url'
import ansis from 'ansis'
import dayjs from 'dayjs'
import inquirer from 'inquirer'
import { dirname, join } from 'pathe'
import { AI_OUTPUT_LANGUAGES, CLAUDE_DIR, CLAUDE_VSC_CONFIG_FILE, SETTINGS_FILE } from '../constants'
import { ensureI18nInitialized, i18n } from '../i18n'
import { addCompletedOnboarding, setPrimaryApiKey } from './claude-config'
import {
  copyDir,
  copyFile,
  ensureDir,
  exists,
  writeFile,
} from './fs-operations'
import { readJsonConfig, writeJsonConfig } from './json-config'
import { deepMerge } from './object-utils'
import { mergeAndCleanPermissions } from './permission-cleaner'

export type { ApiConfig } from '../types/config'

export function ensureClaudeDir(): void {
  ensureDir(CLAUDE_DIR)
}

export function backupExistingConfig(): string | null {
  if (!exists(CLAUDE_DIR)) {
    return null
  }

  const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss')
  const backupBaseDir = join(CLAUDE_DIR, 'backup')
  const backupDir = join(backupBaseDir, `backup_${timestamp}`)

  // Create backup directory
  ensureDir(backupDir)

  // Copy all files from CLAUDE_DIR to backup directory (excluding backup folder itself)
  const filter: CopyDirOptions['filter'] = (path) => {
    return !path.includes('/backup')
  }

  copyDir(CLAUDE_DIR, backupDir, { filter })

  return backupDir
}

export function copyConfigFiles(onlyMd: boolean = false): void {
  // Get the root directory of the package
  const currentFilePath = fileURLToPath(import.meta.url)
  // Navigate from dist/shared/xxx.mjs to package root
  const distDir = dirname(dirname(currentFilePath))
  const rootDir = dirname(distDir)
  const baseTemplateDir = join(rootDir, 'templates', 'claude-code')

  if (!onlyMd) {
    // Intelligently merge settings.json instead of copying
    const baseSettingsPath = join(baseTemplateDir, 'common', 'settings.json')
    const destSettingsPath = join(CLAUDE_DIR, 'settings.json')
    if (exists(baseSettingsPath)) {
      mergeSettingsFile(baseSettingsPath, destSettingsPath)
    }
  }
}

/**
 * Read default settings.json configuration from template directory
 */
function getDefaultSettings(): ClaudeSettings {
  try {
    // Get template directory path
    const currentFilePath = fileURLToPath(import.meta.url)
    const distDir = dirname(dirname(currentFilePath))
    const rootDir = dirname(distDir)
    const templateSettingsPath = join(rootDir, 'templates', 'claude-code', 'common', 'settings.json')

    return readJsonConfig<ClaudeSettings>(templateSettingsPath) || {}
  }
  catch (error) {
    console.error('Failed to read template settings', error)
    return {}
  }
}

export function configureApi(apiConfig: ApiConfig | null): ApiConfig | null {
  if (!apiConfig)
    return null

  // Get default configuration from template
  let settings = getDefaultSettings()

  // Merge with existing user configuration if available
  const existingSettings = readJsonConfig<ClaudeSettings>(SETTINGS_FILE)
  if (existingSettings) {
    // Use deepMerge for deep merge, preserving user's custom configuration
    settings = deepMerge(settings, existingSettings)
  }

  // Ensure env object exists
  if (!settings.env) {
    settings.env = {}
  }

  // Update API configuration based on auth type
  if (apiConfig.authType === 'api_key') {
    settings.env.ANTHROPIC_API_KEY = apiConfig.key
    // Remove auth token if switching to API key
    delete settings.env.ANTHROPIC_AUTH_TOKEN
  }
  else if (apiConfig.authType === 'auth_token') {
    settings.env.ANTHROPIC_AUTH_TOKEN = apiConfig.key
    // Remove API key if switching to auth token
    delete settings.env.ANTHROPIC_API_KEY
  }

  // Always update URL if provided
  if (apiConfig.url) {
    settings.env.ANTHROPIC_BASE_URL = apiConfig.url
  }

  writeJsonConfig(SETTINGS_FILE, settings)

  // Set primaryApiKey for third-party API (Claude Code 2.0 requirement)
  if (apiConfig.authType) {
    try {
      setPrimaryApiKey()
    }
    catch (error) {
      ensureI18nInitialized()
      console.error(i18n.t('mcp:primaryApiKeySetFailed'), error)
      // Don't fail the API configuration
    }
  }

  // Add hasCompletedOnboarding flag after successful API configuration
  try {
    addCompletedOnboarding()
  }
  catch (error) {
    // Log error but don't fail the API configuration
    console.error('Failed to set onboarding flag', error)
  }

  return apiConfig
}

export function mergeConfigs(sourceFile: string, targetFile: string): void {
  if (!exists(sourceFile))
    return

  const target = readJsonConfig<ClaudeSettings>(targetFile) || {}
  const source = readJsonConfig<ClaudeSettings>(sourceFile) || {}

  // Deep merge logic
  const merged = deepMerge(target, source)

  writeJsonConfig(targetFile, merged)
}

/**
 * Update custom model configuration using environment variables
 * @param primaryModel - Primary model name for general tasks
 * @param fastModel - Fast model name for background tasks (optional)
 */
export function updateCustomModel(primaryModel?: string, fastModel?: string): void {
  // Skip if both models are empty
  if (!primaryModel?.trim() && !fastModel?.trim()) {
    return
  }

  let settings = getDefaultSettings()

  const existingSettings = readJsonConfig<ClaudeSettings>(SETTINGS_FILE)
  if (existingSettings) {
    settings = existingSettings
  }

  // Delete model field for custom configuration
  delete settings.model

  // Initialize env object if it doesn't exist
  settings.env = settings.env || {}

  // Set environment variables only if values are provided
  if (primaryModel?.trim()) {
    settings.env.ANTHROPIC_MODEL = primaryModel.trim()
  }
  if (fastModel?.trim()) {
    settings.env.ANTHROPIC_SMALL_FAST_MODEL = fastModel.trim()
  }

  writeJsonConfig(SETTINGS_FILE, settings)
}

/**
 * Update the default model configuration in settings.json
 * @param model - The model type to set: opus, sonnet, sonnet[1m], default, or custom
 * Note: 'custom' model type is handled differently - it should use environment variables instead
 */
export function updateDefaultModel(model: 'opus' | 'sonnet' | 'sonnet[1m]' | 'default' | 'custom'): void {
  let settings = getDefaultSettings()

  const existingSettings = readJsonConfig<ClaudeSettings>(SETTINGS_FILE)
  if (existingSettings) {
    settings = existingSettings
  }

  // Ensure env object exists
  if (!settings.env) {
    settings.env = {}
  }

  // Clean custom model environment variables when switching away from custom
  if (model !== 'custom' && settings.env) {
    delete settings.env.ANTHROPIC_MODEL
    delete settings.env.ANTHROPIC_SMALL_FAST_MODEL
  }

  // Update model in settings
  if (model === 'default') {
    // Remove model field to let Claude Code auto-select
    delete settings.model
  }
  else if (model === 'custom') {
    // For custom model, remove model field (environment variables should be set via updateCustomModel)
    delete settings.model
  }
  else {
    settings.model = model
  }

  writeJsonConfig(SETTINGS_FILE, settings)
}

/**
 * Merge settings.json intelligently
 * Preserves user's environment variables and custom configurations
 */
export function mergeSettingsFile(templatePath: string, targetPath: string): void {
  try {
    // Read template settings
    const templateSettings = readJsonConfig<ClaudeSettings>(templatePath)
    if (!templateSettings) {
      console.error('Failed to read template settings')
      return
    }

    // If target doesn't exist, just copy template
    if (!exists(targetPath)) {
      writeJsonConfig(targetPath, templateSettings)
      return
    }

    // Read existing settings
    const existingSettings = readJsonConfig<ClaudeSettings>(targetPath) || {}

    // Special handling for env variables - preserve all user's env vars
    const mergedEnv = {
      ...(templateSettings.env || {}), // Template env vars first
      ...(existingSettings.env || {}), // User's env vars override (preserving API keys, etc.)
    }

    // Merge settings with special handling for arrays
    const mergedSettings = deepMerge(templateSettings, existingSettings, {
      mergeArrays: true,
      arrayMergeStrategy: 'unique',
    })

    // Ensure user's env vars are preserved
    mergedSettings.env = mergedEnv

    // Handle permissions.allow array specially to avoid duplicates and clean invalid entries
    if (mergedSettings.permissions && mergedSettings.permissions.allow) {
      mergedSettings.permissions.allow = mergeAndCleanPermissions(
        templateSettings.permissions?.allow,
        existingSettings.permissions?.allow,
      )
    }

    // Write merged settings
    writeJsonConfig(targetPath, mergedSettings)
  }
  catch (error) {
    console.error('Failed to merge settings', error)
    // If merge fails, preserve existing file
    if (exists(targetPath)) {
      console.log('Preserving existing settings')
    }
    else {
      // If no existing file and merge failed, copy template as fallback
      copyFile(templatePath, targetPath)
    }
  }
}

/**
 * Get existing model configuration from settings.json
 */
export function getExistingModelConfig(): 'opus' | 'sonnet' | 'sonnet[1m]' | 'default' | 'custom' | null {
  const settings = readJsonConfig<ClaudeSettings>(SETTINGS_FILE)

  if (!settings) {
    return null
  }

  // Check if using custom model configuration via environment variables
  if (settings.env && (settings.env.ANTHROPIC_MODEL || settings.env.ANTHROPIC_SMALL_FAST_MODEL)) {
    return 'custom'
  }

  // If model field doesn't exist, it means using default
  if (!settings.model) {
    return 'default'
  }

  return settings.model
}

/**
 * Get existing API configuration from settings.json
 */
export function getExistingApiConfig(): ApiConfig | null {
  const settings = readJsonConfig<ClaudeSettings>(SETTINGS_FILE)

  if (!settings || !settings.env) {
    return null
  }

  const { ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, ANTHROPIC_BASE_URL } = settings.env

  // Check if any API configuration exists
  if (!ANTHROPIC_BASE_URL && !ANTHROPIC_API_KEY && !ANTHROPIC_AUTH_TOKEN) {
    return null
  }

  // Determine auth type based on which key is present
  let authType: 'auth_token' | 'api_key' | undefined
  let key: string | undefined

  if (ANTHROPIC_AUTH_TOKEN) {
    authType = 'auth_token'
    key = ANTHROPIC_AUTH_TOKEN
  }
  else if (ANTHROPIC_API_KEY) {
    authType = 'api_key'
    key = ANTHROPIC_API_KEY
  }

  return {
    url: ANTHROPIC_BASE_URL || '',
    key: key || '',
    authType,
  }
}

export function applyAiLanguageDirective(aiOutputLang: AiOutputLanguage | string): void {
  // Write language directive directly to CLAUDE.md file
  const claudeFile = join(CLAUDE_DIR, 'CLAUDE.md')

  // Prepare the language directive
  let directive = ''
  if (aiOutputLang === 'custom') {
    // Custom language will be handled by the caller
    return
  }
  else if (AI_OUTPUT_LANGUAGES[aiOutputLang as AiOutputLanguage]) {
    directive = AI_OUTPUT_LANGUAGES[aiOutputLang as AiOutputLanguage].directive
  }
  else {
    // It's a custom language string
    directive = `Always respond in ${aiOutputLang}`
  }

  // Write to CLAUDE.md file directly without markers
  writeFile(claudeFile, directive)
}

/**
 * Switch to official login mode - remove all third-party API configurations
 * Removes: ANTHROPIC_BASE_URL, ANTHROPIC_AUTH_TOKEN, ANTHROPIC_API_KEY from settings.json
 * Removes: primaryApiKey from ~/.claude/config.json
 */
export function switchToOfficialLogin(): boolean {
  try {
    ensureI18nInitialized()

    // 1. Clean settings.json - remove all API-related env vars
    const settings = readJsonConfig<ClaudeSettings>(SETTINGS_FILE) || {}
    if (settings.env) {
      delete settings.env.ANTHROPIC_BASE_URL
      delete settings.env.ANTHROPIC_AUTH_TOKEN
      delete settings.env.ANTHROPIC_API_KEY
    }
    writeJsonConfig(SETTINGS_FILE, settings)

    // 2. Clean ~/.claude/config.json - remove primaryApiKey
    const vscConfig = readJsonConfig<{ primaryApiKey?: string }>(CLAUDE_VSC_CONFIG_FILE)
    if (vscConfig) {
      delete vscConfig.primaryApiKey
      writeJsonConfig(CLAUDE_VSC_CONFIG_FILE, vscConfig)
    }

    console.log(i18n.t('api:officialLoginConfigured'))
    return true
  }
  catch (error) {
    ensureI18nInitialized()
    console.error(i18n.t('api:officialLoginFailed'), error)
    return false
  }
}

/**
 * Prompt user for API configuration action when existing config is found
 * Returns the user's choice for how to handle existing configuration
 */
export async function promptApiConfigurationAction(): Promise<'modify-partial' | 'modify-all' | 'keep-existing' | null> {
  ensureI18nInitialized()

  const existingConfig = getExistingApiConfig()

  // If no existing config, return null
  if (!existingConfig) {
    return null
  }

  // Display existing configuration
  console.log(`\n${ansis.blue(`ℹ ${i18n.t('api:existingApiConfig')}`)}`)
  console.log(ansis.gray(`  ${i18n.t('api:apiConfigUrl')}: ${existingConfig.url || 'N/A'}`))
  console.log(ansis.gray(`  ${i18n.t('api:apiConfigKey')}: ${existingConfig.key ? `***${existingConfig.key.slice(-4)}` : 'N/A'}`))
  console.log(ansis.gray(`  ${i18n.t('api:apiConfigAuthType')}: ${existingConfig.authType || 'N/A'}\n`))

  const { choice } = await inquirer.prompt<{ choice: 'modify-partial' | 'modify-all' | 'keep-existing' | undefined }>({
    type: 'list',
    name: 'choice',
    message: i18n.t('api:selectCustomConfigAction'),
    choices: [
      {
        name: i18n.t('api:modifyPartialConfig'),
        value: 'modify-partial',
      },
      {
        name: i18n.t('api:modifyAllConfig'),
        value: 'modify-all',
      },
      {
        name: i18n.t('api:keepExistingConfig'),
        value: 'keep-existing',
      },
    ],
  })

  return choice || null
}
