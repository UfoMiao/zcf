import type { InstallationStatus } from './installer'
import type { ClaudeCodeInstallation } from './zcf-config'
import { homedir } from 'node:os'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { join } from 'pathe'
import { CLAUDE_DIR } from '../constants'
import { ensureI18nInitialized, i18n } from '../i18n'
import { removeLocalClaudeCode } from './installer'
import { getZcfConfig, updateZcfConfig } from './zcf-config'

/**
 * Installation method type
 */
export type InstallationMethod = 'global' | 'local' | 'none'

/**
 * Let user choose installation method when multiple installations are detected
 */
export async function chooseInstallationMethod(): Promise<InstallationMethod> {
  ensureI18nInitialized()

  const choices = [
    {
      name: i18n.t('installation:chooseGlobal'),
      value: 'global' as const,
    },
    {
      name: i18n.t('installation:chooseLocal'),
      value: 'local' as const,
    },
  ]

  const { installMethod } = await inquirer.prompt([
    {
      type: 'list',
      name: 'installMethod',
      message: i18n.t('installation:chooseInstallationMethod'),
      choices,
    },
  ])

  return installMethod
}

/**
 * Handle installations scenario - ask user to choose when needed
 */
export async function handleMultipleInstallations(
  status: InstallationStatus,
): Promise<InstallationMethod> {
  ensureI18nInitialized()

  // Check if user has already made a choice previously
  const existingConfig = getZcfConfig()
  const previousChoice = existingConfig.claudeCodeInstallation

  // If user has already chosen and the chosen installation still exists, respect their choice
  if (previousChoice) {
    if (previousChoice.type === 'global' && status.hasGlobal) {
      return 'global'
    }
    if (previousChoice.type === 'local' && status.hasLocal) {
      return 'local'
    }
    // If previously chosen installation no longer exists, continue to ask user
  }

  // No installation found
  if (!status.hasGlobal && !status.hasLocal) {
    return 'none'
  }

  // Only global installation exists - use it directly
  if (status.hasGlobal && !status.hasLocal) {
    return 'global'
  }

  // Need user to choose: either only local exists, or both exist
  if (status.hasGlobal && status.hasLocal) {
    // Multiple installations detected
    console.warn(
      ansis.yellow(`⚠️  ${i18n.t('installation:multipleInstallationsDetected')}`),
    )
    console.log(`${i18n.t('installation:globalInstallation')}: ${i18n.t('installation:available')}`)
    console.log(`${i18n.t('installation:localInstallation')}: ${status.localPath}`)
  }
  else {
    // Only local installation exists - ask if user wants to keep it or install global
    console.warn(
      ansis.yellow(`⚠️  ${i18n.t('installation:onlyLocalInstallationDetected')}`),
    )
    console.log(`${i18n.t('installation:localInstallation')}: ${status.localPath}`)
    console.log(`${i18n.t('installation:globalInstallation')}: ${i18n.t('installation:notInstalled')}`)
  }

  const choice = await chooseInstallationMethod()

  try {
    if (choice === 'global') {
      // If global doesn't exist, need to install it first
      if (!status.hasGlobal) {
        console.log(ansis.blue(`${i18n.t('installation:installingGlobalClaudeCode')}...`))
        const { installClaudeCode } = await import('./installer')
        await installClaudeCode()
        console.log(ansis.green(`✔ ${i18n.t('installation:globalInstallationCompleted')}`))
      }

      // Remove local installation if it exists
      if (status.hasLocal) {
        console.log(ansis.blue(`${i18n.t('installation:removingLocalInstallation')}...`))
        await removeLocalClaudeCode()
        console.log(ansis.green(`✔ ${i18n.t('installation:localInstallationRemoved')}`))
      }

      // Save global installation config
      await saveInstallationConfig({
        type: 'global',
        path: 'claude',
        configDir: CLAUDE_DIR,
      })
    }
    else {
      console.log(ansis.green(`✔ ${i18n.t('installation:usingLocalInstallation')}`))

      // Save local installation config
      await saveInstallationConfig({
        type: 'local',
        path: status.localPath,
        configDir: join(homedir(), '.claude'),
      })
    }

    return choice
  }
  catch (error) {
    if (choice === 'global') {
      console.error(ansis.red(`✖ ${i18n.t('installation:failedToRemoveLocalInstallation')}: ${error}`))
      throw error
    }
    else {
      console.error(ansis.red(`✖ ${i18n.t('installation:failedToSaveInstallationConfig')}: ${error}`))
      // Don't throw for config save failure, still return the choice
      return choice
    }
  }
}

/**
 * Save installation configuration to ZCF config
 */
async function saveInstallationConfig(installation: ClaudeCodeInstallation): Promise<void> {
  try {
    updateZcfConfig({
      claudeCodeInstallation: installation,
    })
  }
  catch (error) {
    console.error(ansis.red(`✖ ${i18n.t('installation:failedToSaveInstallationConfig')}: ${error}`))
    // Don't throw - config save failure shouldn't break the main flow
  }
}

/**
 * Get Claude Code configuration directory based on saved preference
 */
export function getClaudeCodeConfigDir(): string {
  try {
    const config = getZcfConfig()
    return config.claudeCodeInstallation?.configDir || CLAUDE_DIR
  }
  catch {
    return CLAUDE_DIR
  }
}
