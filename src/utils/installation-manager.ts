import type { InstallationStatus } from './installer'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { CLAUDE_DIR, ZCF_CONFIG_FILE } from '../constants'
import { ensureI18nInitialized, i18n } from '../i18n'
import { removeLocalClaudeCode } from './installer'
import { readTomlConfig, updateTomlConfig } from './zcf-config'

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

  // Check if user has already made a choice previously in TOML config
  const tomlConfig = readTomlConfig(ZCF_CONFIG_FILE)
  if (tomlConfig && tomlConfig.general?.currentTool === 'claude-code') {
    const previousChoice = tomlConfig.claudeCode?.installType

    // If user has already chosen and the chosen installation still exists, respect their choice
    if (previousChoice) {
      if (previousChoice === 'global' && status.hasGlobal) {
        return 'global'
      }
      if (previousChoice === 'local' && status.hasLocal) {
        return 'local'
      }
      // If previously chosen installation no longer exists, continue to ask user
    }
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

      // Save user choice to TOML config (partial update)
      updateTomlConfig(ZCF_CONFIG_FILE, {
        claudeCode: {
          installType: 'global',
        },
      } as any) // Type assertion for partial update
    }
    else {
      console.log(ansis.green(`✔ ${i18n.t('installation:usingLocalInstallation')}`))

      // Save user choice to TOML config (partial update)
      updateTomlConfig(ZCF_CONFIG_FILE, {
        claudeCode: {
          installType: 'local',
        },
      } as any) // Type assertion for partial update
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
 * Note: Installation configuration is now managed through TOML config installType field
 * This function is no longer needed as we simplified the configuration structure
 */

/**
 * Get Claude Code configuration directory based on saved preference
 */
export function getClaudeCodeConfigDir(): string {
  // Always use standard Claude directory since we simplified the config structure
  return CLAUDE_DIR
}
