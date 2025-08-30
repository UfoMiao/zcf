import type { SupportedLang } from '../../constants'
import type { CcrConfig, CcrProvider, CcrRouter, ProviderPreset } from '../../types/ccr'
import { exec } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import process from 'node:process'
import { promisify } from 'node:util'
import ansis from 'ansis'
import dayjs from 'dayjs'
import inquirer from 'inquirer'
import { join } from 'pathe'
import { SETTINGS_FILE } from '../../constants'
import { getTranslation } from '../../i18n'
import { backupExistingConfig } from '../config'
import { readJsonConfig, writeJsonConfig } from '../json-config'
import { addCompletedOnboarding } from '../mcp'
import { fetchProviderPresets } from './presets'

const execAsync = promisify(exec)

const CCR_CONFIG_DIR = join(homedir(), '.claude-code-router')
const CCR_CONFIG_FILE = join(CCR_CONFIG_DIR, 'config.json')
const CCR_BACKUP_DIR = CCR_CONFIG_DIR // Keep backups in the same directory as CCR

export function ensureCcrConfigDir(): void {
  if (!existsSync(CCR_CONFIG_DIR)) {
    mkdirSync(CCR_CONFIG_DIR, { recursive: true })
  }
}

export function backupCcrConfig(scriptLang: SupportedLang): string | null {
  const i18n = getTranslation(scriptLang)

  try {
    if (!existsSync(CCR_CONFIG_FILE)) {
      return null
    }

    // CCR_BACKUP_DIR is the same as CCR_CONFIG_DIR, no need to create it separately
    // It should already exist if there's a config file

    // Create timestamped backup filename matching CCR's format
    // Format: config.json.2025-08-10T09-23-18-335Z.bak
    const timestamp = `${dayjs().format('YYYY-MM-DDTHH-mm-ss-SSS')}Z`
    const backupFileName = `config.json.${timestamp}.bak`
    const backupPath = join(CCR_BACKUP_DIR, backupFileName)

    // Copy the config file to backup
    console.log(ansis.cyan(`${i18n.ccr.backupCcrConfig}`))
    copyFileSync(CCR_CONFIG_FILE, backupPath)
    console.log(ansis.green(`✔ ${i18n.ccr.ccrBackupSuccess.replace('{path}', backupPath)}`))

    return backupPath
  }
  catch (error: any) {
    console.error(ansis.red(`${i18n.ccr.ccrBackupFailed}:`), error.message)
    return null
  }
}

export function readCcrConfig(): CcrConfig | null {
  if (!existsSync(CCR_CONFIG_FILE)) {
    return null
  }
  return readJsonConfig<CcrConfig>(CCR_CONFIG_FILE)
}

export function writeCcrConfig(config: CcrConfig): void {
  ensureCcrConfigDir()
  writeJsonConfig(CCR_CONFIG_FILE, config)
}

export async function configureCcrProxy(ccrConfig: CcrConfig): Promise<void> {
  // Read current settings
  const settings = readJsonConfig<any>(SETTINGS_FILE) || {}

  // Extract CCR server info
  const host = ccrConfig.HOST || '127.0.0.1'
  const port = ccrConfig.PORT || 3456
  const apiKey = ccrConfig.APIKEY || 'sk-zcf-x-ccr'

  // Update environment variables in settings
  if (!settings.env) {
    settings.env = {}
  }

  settings.env.ANTHROPIC_BASE_URL = `http://${host}:${port}`
  settings.env.ANTHROPIC_API_KEY = apiKey

  // Write back to settings
  writeJsonConfig(SETTINGS_FILE, settings)
}

export async function selectCcrPreset(scriptLang: SupportedLang): Promise<ProviderPreset | 'skip' | null> {
  const i18n = getTranslation(scriptLang)

  // Try to fetch online presets first
  console.log(ansis.cyan(`${i18n.ccr.fetchingPresets}`))
  const presets = await fetchProviderPresets()

  if (!presets || presets.length === 0) {
    console.log(ansis.yellow(`${i18n.ccr.noPresetsAvailable}`))
    return null
  }

  // Let user select a preset
  try {
    const choices = [
      {
        name: `1. ${i18n.ccr.skipOption}`,
        value: 'skip' as const,
      },
      ...presets.map((p, index) => ({
        name: `${index + 2}. ${p.name}`,
        value: p,
      })),
    ]

    const { preset } = await inquirer.prompt<{ preset: ProviderPreset | 'skip' }>({
      type: 'list',
      name: 'preset',
      message: i18n.ccr.selectCcrPreset,
      choices,
    })

    return preset
  }
  catch (error: any) {
    if (error.name === 'ExitPromptError') {
      console.log(ansis.yellow(i18n.common.cancelled))
      return null
    }
    throw error
  }
}

export async function configureCcrWithPreset(preset: ProviderPreset, scriptLang: SupportedLang): Promise<CcrConfig> {
  const i18n = getTranslation(scriptLang)

  // Create provider configuration
  const provider: CcrProvider = {
    name: preset.name, // Use the original name from JSON
    api_base_url: preset.baseURL || '',
    api_key: '',
    models: preset.models,
  }

  // Add transformer if present
  if (preset.transformer) {
    provider.transformer = preset.transformer
  }

  // Ask for API key if required
  if (preset.requiresApiKey) {
    try {
      const { apiKey } = await inquirer.prompt<{ apiKey: string }>({
        type: 'input',
        name: 'apiKey',
        message: i18n.ccr.enterApiKeyForProvider.replace('{provider}', preset.name),
        validate: value => !!value || i18n.api.keyRequired,
      })

      provider.api_key = apiKey
    }
    catch (error: any) {
      if (error.name === 'ExitPromptError') {
        throw error // Re-throw to be handled by setupCcrConfiguration
      }
      throw error
    }
  }
  else {
    provider.api_key = 'sk-free'
  }

  // Let user select default model if there are multiple models
  let defaultModel = preset.models[0]
  if (preset.models.length > 1) {
    try {
      const { model } = await inquirer.prompt<{ model: string }>({
        type: 'list',
        name: 'model',
        message: i18n.ccr.selectDefaultModelForProvider.replace('{provider}', preset.name),
        choices: preset.models.map((m, index) => ({
          name: `${index + 1}. ${m}`,
          value: m,
        })),
      })
      defaultModel = model
    }
    catch (error: any) {
      if (error.name === 'ExitPromptError') {
        throw error
      }
      throw error
    }
  }

  // Build router configuration
  const router: CcrRouter = {
    default: `${preset.name},${defaultModel}`, // Use the original name
    background: `${preset.name},${defaultModel}`,
    think: `${preset.name},${defaultModel}`,
    longContext: `${preset.name},${defaultModel}`,
    longContextThreshold: 60000,
    webSearch: `${preset.name},${defaultModel}`,
  }

  // Build complete config
  const config: CcrConfig = {
    LOG: true,
    CLAUDE_PATH: '',
    HOST: '127.0.0.1',
    PORT: 3456,
    APIKEY: 'sk-zcf-x-ccr',
    API_TIMEOUT_MS: '600000',
    PROXY_URL: '',
    transformers: [],
    Providers: [provider],
    Router: router,
  }

  return config
}

export async function restartAndCheckCcrStatus(scriptLang: SupportedLang): Promise<void> {
  const i18n = getTranslation(scriptLang)

  try {
    // Restart CCR service
    console.log(ansis.cyan(`${i18n.ccr.restartingCcr}`))
    await execAsync('ccr restart')
    console.log(ansis.green(`✔ ${i18n.ccr.ccrRestartSuccess}`))

    // Check CCR status
    console.log(ansis.cyan(`${i18n.ccr.checkingCcrStatus}`))
    const { stdout } = await execAsync('ccr status')
    console.log(ansis.gray(stdout))
  }
  catch (error: any) {
    console.error(ansis.red(`${i18n.ccr.ccrRestartFailed}:`), error.message || error)
    // Log full error details for debugging
    if (process.env.DEBUG) {
      console.error('Full error:', error)
    }
  }
}

export function showConfigurationTips(scriptLang: SupportedLang, apiKey?: string): void {
  const i18n = getTranslation(scriptLang)

  console.log(ansis.bold.cyan(`\n📌 ${i18n.ccr.configTips}:`))
  console.log(ansis.blue(`  • ${i18n.ccr.advancedConfigTip}`))
  console.log(ansis.blue(`  • ${i18n.ccr.manualConfigTip}`))
  console.log(ansis.bold.yellow(`  • ${i18n.ccr.useClaudeCommand}`))

  // Show API key for UI login
  if (apiKey) {
    console.log(ansis.bold.green(`  • ${i18n.ccr.ccrUiApiKey || 'CCR UI API Key'}: ${apiKey}`))
    console.log(ansis.gray(`    ${i18n.ccr.ccrUiApiKeyHint || 'Use this API key to login to CCR UI'}`))
  }

  console.log('') // Add empty line for better readability
}

export function createDefaultCcrConfig(): CcrConfig {
  return {
    LOG: false,
    CLAUDE_PATH: '',
    HOST: '127.0.0.1',
    PORT: 3456,
    APIKEY: 'sk-zcf-x-ccr',
    API_TIMEOUT_MS: '600000',
    PROXY_URL: '',
    transformers: [],
    Providers: [], // Empty providers array - user configures in UI
    Router: {} as CcrRouter, // Empty router configuration - user configures in UI
  }
}

export async function setupCcrConfiguration(scriptLang: SupportedLang): Promise<boolean> {
  const i18n = getTranslation(scriptLang)

  try {
    // Check for existing config
    const existingConfig = readCcrConfig()
    if (existingConfig) {
      console.log(ansis.blue(`ℹ ${i18n.ccr.existingCcrConfig}`))
      let shouldBackupAndReconfigure = false
      try {
        const result = await inquirer.prompt<{ overwrite: boolean }>({
          type: 'confirm',
          name: 'overwrite',
          message: i18n.ccr.overwriteCcrConfig,
          default: false,
        })
        shouldBackupAndReconfigure = result.overwrite
      }
      catch (error: any) {
        if (error.name === 'ExitPromptError') {
          console.log(ansis.yellow(i18n.common.cancelled))
          return false
        }
        throw error
      }

      if (!shouldBackupAndReconfigure) {
        console.log(ansis.yellow(`${i18n.ccr.keepingExistingConfig}`))
        // Still need to configure proxy in settings.json
        await configureCcrProxy(existingConfig)
        return true
      }

      // Backup existing CCR configuration
      backupCcrConfig(scriptLang)
    }

    // Select preset
    const preset = await selectCcrPreset(scriptLang)
    if (!preset) {
      return false
    }

    let config: CcrConfig

    if (preset === 'skip') {
      // User chose to skip, create empty configuration
      console.log(ansis.yellow(`${i18n.ccr.skipConfiguring}`))
      config = createDefaultCcrConfig()
    }
    else {
      // Configure with preset
      config = await configureCcrWithPreset(preset, scriptLang)
    }

    // Write CCR config
    writeCcrConfig(config)
    console.log(ansis.green(`✔ ${i18n.ccr.ccrConfigSuccess}`))

    // Configure proxy in settings.json (always needed)
    await configureCcrProxy(config)
    console.log(ansis.green(`✔ ${i18n.ccr.proxyConfigSuccess}`))

    // Restart CCR and check status
    await restartAndCheckCcrStatus(scriptLang)

    // Show configuration tips with API key
    showConfigurationTips(scriptLang, config.APIKEY)

    // Add hasCompletedOnboarding flag after successful CCR configuration
    try {
      addCompletedOnboarding()
    }
    catch (error) {
      console.error(ansis.red(i18n.configuration.failedToSetOnboarding), error)
    }

    return true
  }
  catch (error: any) {
    if (error.name === 'ExitPromptError') {
      console.log(ansis.yellow(i18n.common.cancelled))
      return false
    }
    console.error(ansis.red(`${i18n.ccr.ccrConfigFailed}:`), error)
    return false
  }
}

export async function configureCcrFeature(scriptLang: SupportedLang): Promise<void> {
  const i18n = getTranslation(scriptLang)

  // Backup existing settings.json
  const backupDir = backupExistingConfig()
  if (backupDir) {
    console.log(ansis.gray(`✔ ${i18n.configuration.backupSuccess}: ${backupDir}`))
  }

  // Run CCR setup
  await setupCcrConfiguration(scriptLang)
}
