import type { AiOutputLanguage } from '../constants'
import type { ApiConfig } from '../types/config'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { CLAUDE_DIR } from '../constants'
import { ensureI18nInitialized, i18n } from '../i18n'
import {
  applyAiLanguageDirective,
  backupExistingConfig,
  configureApi,
  getExistingApiConfig,
  switchToOfficialLogin,
} from './config'
import { configureOutputStyle } from './output-style'
import { addNumbersToChoices } from './prompt-helpers'
import { formatApiKeyDisplay, validateApiKey } from './validator'

/**
 * Configure API completely (for new config or full modification)
 */
export async function configureApiCompletely(
  preselectedAuthType?: 'auth_token' | 'api_key' | 'official',
): Promise<ApiConfig | null> {
  ensureI18nInitialized()
  let authType = preselectedAuthType

  if (!authType) {
    const { authType: selectedAuthType } = await inquirer.prompt<{ authType: 'auth_token' | 'api_key' | 'official' }>({
      type: 'list',
      name: 'authType',
      message: i18n.t('api:configureApi'),
      choices: addNumbersToChoices([
        {
          name: i18n.t('api:useOfficialLogin'),
          value: 'official',
          short: i18n.t('api:useOfficialLogin'),
        },
        {
          name: `${i18n.t('api:useAuthToken')} - ${ansis.gray(i18n.t('api:authTokenDesc'))}`,
          value: 'auth_token',
          short: i18n.t('api:useAuthToken'),
        },
        {
          name: `${i18n.t('api:useApiKey')} - ${ansis.gray(i18n.t('api:apiKeyDesc'))}`,
          value: 'api_key',
          short: i18n.t('api:useApiKey'),
        },
      ]),
    })

    if (!selectedAuthType) {
      console.log(ansis.yellow(i18n.t('common:cancelled')))
      return null
    }

    authType = selectedAuthType
  }

  // Handle official login mode
  if (authType === 'official') {
    const success = switchToOfficialLogin()
    if (success) {
      return null // No API config needed for official login
    }
    else {
      console.log(ansis.red(i18n.t('api:officialLoginFailed')))
      return null
    }
  }

  const { url } = await inquirer.prompt<{ url: string }>({
    type: 'input',
    name: 'url',
    message: i18n.t('api:enterApiUrl'),
    validate: async (value) => {
      if (!value)
        return i18n.t('api:urlRequired')
      try {
        void new URL(value)
        return true
      }
      catch {
        return i18n.t('api:invalidUrl')
      }
    },
  })

  if (url === undefined) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return null
  }

  const keyMessage = authType === 'auth_token'
    ? i18n.t('api:enterAuthToken')
    : i18n.t('api:enterApiKey')
  const { key } = await inquirer.prompt<{ key: string }>({
    type: 'input',
    name: 'key',
    message: keyMessage,
    validate: async (value: string) => {
      if (!value) {
        return i18n.t('api:keyRequired')
      }

      const validation = validateApiKey(value)
      if (!validation.isValid) {
        return validation.error || i18n.t('api:invalidKeyFormat')
      }

      return true
    },
  })

  if (key === undefined) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return null
  }

  console.log(ansis.gray(`  API Key: ${formatApiKeyDisplay(key)}`))

  return { url, key, authType }
}

/**
 * Modify API configuration partially
 */
export async function modifyApiConfigPartially(
  existingConfig: ApiConfig,
): Promise<void> {
  ensureI18nInitialized()
  let currentConfig: ApiConfig = { ...existingConfig }

  // Re-read config to ensure we have the latest values
  const latestConfig = getExistingApiConfig()
  if (latestConfig) {
    currentConfig = latestConfig
  }

  const { item } = await inquirer.prompt<{ item: 'url' | 'key' | 'authType' }>({
    type: 'list',
    name: 'item',
    message: i18n.t('api:selectModifyItems'),
    choices: addNumbersToChoices([
      { name: i18n.t('api:modifyApiUrl'), value: 'url' },
      { name: i18n.t('api:modifyApiKey'), value: 'key' },
      { name: i18n.t('api:modifyAuthType'), value: 'authType' },
    ]),
  })

  if (!item) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return
  }

  if (item === 'url') {
    const { url } = await inquirer.prompt<{ url: string }>({
      type: 'input',
      name: 'url',
      message: i18n.t('api:enterNewApiUrl').replace('{url}', currentConfig.url || i18n.t('common:none')),
      default: currentConfig.url,
      validate: async (value) => {
        if (!value)
          return i18n.t('api:urlRequired')
        try {
          void new URL(value)
          return true
        }
        catch {
          return i18n.t('api:invalidUrl')
        }
      },
    })

    if (url === undefined) {
      console.log(ansis.yellow(i18n.t('common:cancelled')))
      return
    }

    // Update and save immediately
    currentConfig.url = url
    const savedConfig = configureApi(currentConfig)

    if (savedConfig) {
      console.log(ansis.green(`✔ ${i18n.t('api:modificationSaved')}`))
      console.log(ansis.gray(`  ${i18n.t('api:apiConfigUrl')}: ${savedConfig.url}`))
      // Note: addCompletedOnboarding is already called inside configureApi
    }
  }
  else if (item === 'key') {
    const authType = currentConfig.authType || 'auth_token'
    const keyMessage
      = authType === 'auth_token'
        ? i18n.t('api:enterNewApiKey').replace('{key}', currentConfig.key ? formatApiKeyDisplay(currentConfig.key) : i18n.t('common:none'))
        : i18n.t('api:enterNewApiKey').replace('{key}', currentConfig.key ? formatApiKeyDisplay(currentConfig.key) : i18n.t('common:none'))

    const { key } = await inquirer.prompt<{ key: string }>({
      type: 'input',
      name: 'key',
      message: keyMessage,
      validate: async (value: string) => {
        if (!value) {
          return i18n.t('api:keyRequired')
        }

        const validation = validateApiKey(value)
        if (!validation.isValid) {
          return validation.error || i18n.t('api:invalidKeyFormat')
        }

        return true
      },
    })

    if (key === undefined) {
      console.log(ansis.yellow(i18n.t('common:cancelled')))
      return
    }

    // Update and save immediately
    currentConfig.key = key
    const savedConfig = configureApi(currentConfig)

    if (savedConfig) {
      console.log(ansis.green(`✔ ${i18n.t('api:modificationSaved')}`))
      console.log(ansis.gray(`  ${i18n.t('api:apiConfigKey')}: ${formatApiKeyDisplay(savedConfig.key)}`))
      // Note: addCompletedOnboarding is already called inside configureApi
    }
  }
  else if (item === 'authType') {
    const { authType } = await inquirer.prompt<{ authType: 'auth_token' | 'api_key' }>({
      type: 'list',
      name: 'authType',
      message: i18n.t('api:selectNewAuthType').replace('{type}', currentConfig.authType || i18n.t('common:none')),
      choices: addNumbersToChoices([
        { name: 'Auth Token (OAuth)', value: 'auth_token' },
        { name: 'API Key', value: 'api_key' },
      ]),
      default: currentConfig.authType === 'api_key' ? 1 : 0,
    })

    if (authType === undefined) {
      console.log(ansis.yellow(i18n.t('common:cancelled')))
      return
    }

    // Update and save immediately
    currentConfig.authType = authType
    const savedConfig = configureApi(currentConfig)

    if (savedConfig) {
      console.log(ansis.green(`✔ ${i18n.t('api:modificationSaved')}`))
      console.log(ansis.gray(`  ${i18n.t('api:apiConfigAuthType')}: ${savedConfig.authType}`))
      // Note: addCompletedOnboarding is already called inside configureApi
    }
  }
}

/**
 * Update only prompt/documentation files
 */
export async function updatePromptOnly(
  aiOutputLang?: AiOutputLanguage | string,
): Promise<void> {
  ensureI18nInitialized()

  // Backup existing config
  const backupDir = backupExistingConfig()
  if (backupDir) {
    console.log(ansis.gray(`✔ ${i18n.t('configuration:backupSuccess')}: ${backupDir}`))
  }

  // Apply AI language directive if provided
  if (aiOutputLang) {
    applyAiLanguageDirective(aiOutputLang)
  }

  // Configure output styles
  await configureOutputStyle()

  console.log(ansis.green(`✔ ${i18n.t('configuration:configSuccess')} ${CLAUDE_DIR}`))
  console.log(`\n${ansis.cyan(i18n.t('common:complete'))}`)
}
