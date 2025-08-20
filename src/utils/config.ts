import type { AiOutputLanguage, SupportedLang } from '../constants'
import type { ApiConfig, ClaudeSettings } from '../types/config'
import type { CopyDirOptions } from './fs-operations'
import { fileURLToPath } from 'node:url'
import dayjs from 'dayjs'
import { dirname, join } from 'pathe'
import { AI_OUTPUT_LANGUAGES, CLAUDE_DIR, SETTINGS_FILE } from '../constants'
import { getTranslation } from '../i18n'
import {
  copyDir,

  copyFile,
  ensureDir,
  exists,
  readDir,
  writeFile,
} from './fs-operations'
import { readJsonConfig, writeJsonConfig } from './json-config'
import { addCompletedOnboarding } from './mcp'
import { deepMerge } from './object-utils'
import { mergeAndCleanPermissions } from './permission-cleaner'
import { readZcfConfig } from './zcf-config'

export type { ApiConfig } from '../types/config'

export function ensureClaudeDir() {
  ensureDir(CLAUDE_DIR)
}

export function backupExistingConfig() {
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

export function copyConfigFiles(lang: SupportedLang, onlyMd: boolean = false) {
  // Get the root directory of the package
  const currentFilePath = fileURLToPath(import.meta.url)
  // Navigate from dist/shared/xxx.mjs to package root
  const distDir = dirname(dirname(currentFilePath))
  const rootDir = dirname(distDir)
  const baseTemplateDir = join(rootDir, 'templates')

  // Copy Claude memory files (mcp.md, personality.md, rules.md, technical-guides.md)
  copyClaudeMemoryFiles(lang, rootDir)

  if (!onlyMd) {
    // Intelligently merge settings.json instead of copying
    const baseSettingsPath = join(baseTemplateDir, 'settings.json')
    const destSettingsPath = join(CLAUDE_DIR, 'settings.json')
    if (exists(baseSettingsPath)) {
      mergeSettingsFile(baseSettingsPath, destSettingsPath)
    }
  }

  // Always copy CLAUDE.md from base template directory
  const claudeMdSource = join(baseTemplateDir, 'common', 'CLAUDE.md')
  const claudeMdDest = join(CLAUDE_DIR, 'CLAUDE.md')
  if (exists(claudeMdSource)) {
    copyFile(claudeMdSource, claudeMdDest)
  }
}

/**
 * Copy Claude memory related files only
 */
function copyClaudeMemoryFiles(lang: SupportedLang, rootDir: string) {
  const memorySourceDir = join(rootDir, 'templates', lang, 'memory')

  if (!exists(memorySourceDir)) {
    const i18n = getTranslation(lang)
    throw new Error(`${i18n.configuration.memoryDirNotFound || 'Memory directory not found:'} ${memorySourceDir}`)
  }

  // Copy all files from memory directory directly to CLAUDE_DIR
  const files = readDir(memorySourceDir)
  files?.forEach((file) => {
    if (file.endsWith('.md')) {
      const sourcePath = join(memorySourceDir, file)
      const destPath = join(CLAUDE_DIR, file)
      copyFile(sourcePath, destPath)
    }
  })
}

// These functions have been replaced by the more generic copyDir with filters

// ApiConfig type has been moved to types/config.ts

/**
 * Read default settings.json configuration from template directory
 */
function getDefaultSettings(): ClaudeSettings {
  try {
    // Get template directory path
    const currentFilePath = fileURLToPath(import.meta.url)
    const distDir = dirname(dirname(currentFilePath))
    const rootDir = dirname(distDir)
    const templateSettingsPath = join(rootDir, 'templates', 'common', 'settings.json')

    return readJsonConfig<ClaudeSettings>(templateSettingsPath) || {}
  }
  catch (error) {
    const lang = readZcfConfig()?.preferredLang || 'en'
    const i18n = getTranslation(lang)
    console.error(i18n.configuration.failedToReadTemplateSettings || 'Failed to read template settings', error)
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

  // Add hasCompletedOnboarding flag after successful API configuration
  try {
    addCompletedOnboarding()
  }
  catch (error) {
    // Log error but don't fail the API configuration
    const lang = readZcfConfig()?.preferredLang || 'en'
    const i18n = getTranslation(lang)
    console.error(i18n.configuration.failedToSetOnboarding || 'Failed to set onboarding flag', error)
  }

  return apiConfig
}

export function mergeConfigs(sourceFile: string, targetFile: string) {
  if (!exists(sourceFile))
    return

  const target = readJsonConfig<ClaudeSettings>(targetFile) || {}
  const source = readJsonConfig<ClaudeSettings>(sourceFile) || {}

  // Deep merge logic
  const merged = deepMerge(target, source)

  writeJsonConfig(targetFile, merged)
}

export function updateDefaultModel(model: 'opus' | 'sonnet' | 'opusplan' | 'default') {
  let settings = getDefaultSettings()

  const existingSettings = readJsonConfig<ClaudeSettings>(SETTINGS_FILE)
  if (existingSettings) {
    settings = existingSettings
  }

  // Update model in settings
  if (model === 'default') {
    // Remove model field to let Claude Code auto-select
    delete settings.model
  }
  else {
    settings.model = model
  }

  writeJsonConfig(SETTINGS_FILE, settings)
}

// Utility functions have been moved to object-utils.ts

/**
 * Merge settings.json intelligently
 * Preserves user's environment variables and custom configurations
 */
export function mergeSettingsFile(templatePath: string, targetPath: string): void {
  try {
    // Read template settings
    const templateSettings = readJsonConfig<ClaudeSettings>(templatePath)
    if (!templateSettings) {
      const lang = readZcfConfig()?.preferredLang || 'en'
      const i18n = getTranslation(lang)
      console.error(i18n.configuration?.failedToReadTemplateSettings || 'Failed to read template settings')
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
    const lang = readZcfConfig()?.preferredLang || 'en'
    const i18n = getTranslation(lang)
    console.error(i18n.configuration.failedToMergeSettings || 'Failed to merge settings', error)
    // If merge fails, preserve existing file
    if (exists(targetPath)) {
      const lang2 = readZcfConfig()?.preferredLang || 'en'
      const i18n2 = getTranslation(lang2)
      console.log(i18n2.configuration.preservingExistingSettings || 'Preserving existing settings')
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
export function getExistingModelConfig(): 'opus' | 'sonnet' | 'opusplan' | 'default' | null {
  const settings = readJsonConfig<ClaudeSettings>(SETTINGS_FILE)

  if (!settings) {
    return null
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

export function applyAiLanguageDirective(aiOutputLang: AiOutputLanguage | string) {
  // Write language directive to a separate language.md file
  const languageFile = join(CLAUDE_DIR, 'language.md')

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

  // Write to language.md file directly without markers
  writeFile(languageFile, directive)
}
