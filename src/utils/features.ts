import type { SupportedLang } from '../constants'
import type { McpServerConfig } from '../types'
import { existsSync, unlinkSync } from 'node:fs'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { getMcpServices } from '../config/mcp-services'
import { LANG_LABELS, SUPPORTED_LANGS, ZCF_CONFIG_FILE } from '../constants'
import { changeLanguage, ensureI18nInitialized, i18n } from '../i18n'
import { setupCcrConfiguration } from './ccr/config'
import { installCcr, isCcrInstalled } from './ccr/installer'
import {
  addCompletedOnboarding,
  backupMcpConfig,
  buildMcpServerConfig,
  fixWindowsMcpConfig,
  mergeMcpServers,
  readMcpConfig,
  writeMcpConfig,
} from './claude-config'
import {
  applyAiLanguageDirective,
  configureApi,
  getExistingApiConfig,
  getExistingModelConfig,
  updateCustomModel,
  updateDefaultModel,
} from './config'
import { modifyApiConfigPartially } from './config-operations'
import { selectMcpServices } from './mcp-selector'
import { configureOutputStyle } from './output-style'
import { isWindows } from './platform'
import { addNumbersToChoices } from './prompt-helpers'
import { importRecommendedEnv, importRecommendedPermissions, openSettingsJson } from './simple-config'
import { formatApiKeyDisplay, validateApiKey } from './validator'
import { readZcfConfig, updateZcfConfig } from './zcf-config'

// Helper function to handle cancelled operations
async function handleCancellation(): Promise<void> {
  ensureI18nInitialized()
  console.log(ansis.yellow(i18n.t('common:cancelled')))
}

// Configure API
export async function configureApiFeature(): Promise<void> {
  ensureI18nInitialized()

  // Check for existing API configuration
  const existingApiConfig = getExistingApiConfig()

  if (existingApiConfig) {
    // Display existing configuration
    console.log(`\n${ansis.blue(`ℹ ${i18n.t('api:existingApiConfig')}`)}`)
    console.log(ansis.gray(`  ${i18n.t('api:apiConfigUrl')}: ${existingApiConfig.url || i18n.t('common:notConfigured')}`))
    console.log(
      ansis.gray(
        `  ${i18n.t('api:apiConfigKey')}: ${
          existingApiConfig.key ? formatApiKeyDisplay(existingApiConfig.key) : i18n.t('common:notConfigured')
        }`,
      ),
    )
    console.log(
      ansis.gray(`  ${i18n.t('api:apiConfigAuthType')}: ${existingApiConfig.authType || i18n.t('common:notConfigured')}\n`),
    )

    // Ask user what to do with existing config
    const { action } = await inquirer.prompt<{ action: string }>({
      type: 'list',
      name: 'action',
      message: i18n.t('api:selectApiAction'),
      choices: addNumbersToChoices([
        { name: i18n.t('api:keepExistingConfig'), value: 'keep' },
        { name: i18n.t('api:modifyAllConfig'), value: 'modify-all' },
        { name: i18n.t('api:modifyPartialConfig'), value: 'modify-partial' },
        { name: i18n.t('api:useCcrProxy'), value: 'use-ccr' },
      ]),
    })

    if (!action) {
      await handleCancellation()
      return
    }

    if (action === 'keep') {
      console.log(ansis.green(`✔ ${i18n.t('api:keepExistingConfig')}`))
      // Ensure onboarding flag is set for existing API config
      try {
        addCompletedOnboarding()
      }
      catch (error) {
        console.error(ansis.red(i18n.t('errors:failedToSetOnboarding')), error)
      }
      return
    }
    else if (action === 'modify-partial') {
      // Handle partial modification
      await modifyApiConfigPartially(existingApiConfig)
      // addCompletedOnboarding is already called inside modifyApiConfigPartially -> configureApi
      return
    }
    else if (action === 'use-ccr') {
      // Handle CCR proxy configuration
      const ccrStatus = await isCcrInstalled()
      if (!ccrStatus.hasCorrectPackage) {
        await installCcr()
      }
      else {
        console.log(ansis.green(`✔ ${i18n.t('ccr:ccrAlreadyInstalled')}`))
      }

      // Setup CCR configuration
      const ccrConfigured = await setupCcrConfiguration()
      if (ccrConfigured) {
        console.log(ansis.green(`✔ ${i18n.t('ccr:ccrSetupComplete')}`))
        // addCompletedOnboarding is already called inside setupCcrConfiguration
      }
      return
    }
    // If 'modify-all', continue to full configuration below
  }

  // Full configuration (new or modify-all)
  const { apiChoice } = await inquirer.prompt<{ apiChoice: string }>({
    type: 'list',
    name: 'apiChoice',
    message: i18n.t('api:configureApi'),
    choices: addNumbersToChoices([
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
      {
        name: `${i18n.t('api:useCcrProxy')} - ${ansis.gray(i18n.t('api:ccrProxyDesc'))}`,
        value: 'ccr_proxy',
        short: i18n.t('api:useCcrProxy'),
      },
      { name: i18n.t('api:skipApi'), value: 'skip' },
    ]),
  })

  if (!apiChoice || apiChoice === 'skip') {
    return
  }

  // Handle CCR proxy configuration
  if (apiChoice === 'ccr_proxy') {
    const ccrStatus = await isCcrInstalled()
    if (!ccrStatus.hasCorrectPackage) {
      await installCcr()
    }
    else {
      console.log(ansis.green(`✔ ${i18n.t('ccr:ccrAlreadyInstalled')}`))
    }

    // Setup CCR configuration
    const ccrConfigured = await setupCcrConfiguration()
    if (ccrConfigured) {
      console.log(ansis.green(`✔ ${i18n.t('ccr:ccrSetupComplete')}`))
      // addCompletedOnboarding is already called inside setupCcrConfiguration
    }
    return
  }

  const { url } = await inquirer.prompt<{ url: string }>({
    type: 'input',
    name: 'url',
    message: `${i18n.t('api:enterApiUrl')}${i18n.t('common:emptyToSkip')}`,
    validate: (value) => {
      if (!value) {
        // Allow skipping - this will be handled in the next check
        return true
      }
      try {
        void new URL(value)
        return true
      }
      catch {
        return i18n.t('api:invalidUrl')
      }
    },
  })

  if (url === undefined || !url) {
    await handleCancellation()
    return
  }

  const keyMessage = apiChoice === 'auth_token'
    ? `${i18n.t('api:enterAuthToken')}${i18n.t('common:emptyToSkip')}`
    : `${i18n.t('api:enterApiKey')}${i18n.t('common:emptyToSkip')}`
  const { key } = await inquirer.prompt<{ key: string }>({
    type: 'input',
    name: 'key',
    message: keyMessage,
    validate: (value) => {
      if (!value) {
        // Allow skipping - this will be handled in the next check
        return true
      }

      const validation = validateApiKey(value)
      if (!validation.isValid) {
        return validation.error || i18n.t('api:invalidKeyFormat')
      }

      return true
    },
  })

  if (key === undefined || !key) {
    await handleCancellation()
    return
  }

  const apiConfig = { url, key, authType: apiChoice as 'auth_token' | 'api_key' }
  const configuredApi = configureApi(apiConfig)

  if (configuredApi) {
    console.log(ansis.green(`✔ ${i18n.t('api:apiConfigSuccess')}`))
    console.log(ansis.gray(`  URL: ${configuredApi.url}`))
    console.log(ansis.gray(`  Key: ${formatApiKeyDisplay(configuredApi.key)}`))
    // addCompletedOnboarding is already called inside configureApi
  }
}

// Configure MCP
export async function configureMcpFeature(): Promise<void> {
  ensureI18nInitialized()

  // Check if Windows needs fix
  if (isWindows()) {
    const { fixWindows } = await inquirer.prompt<{ fixWindows: boolean }>({
      type: 'confirm',
      name: 'fixWindows',
      message: i18n.t('configuration:fixWindowsMcp') || 'Fix Windows MCP configuration?',
      default: true,
    })

    if (fixWindows) {
      const existingConfig = readMcpConfig() || { mcpServers: {} }
      const fixedConfig = fixWindowsMcpConfig(existingConfig)
      writeMcpConfig(fixedConfig)
      console.log(ansis.green(`✔ Windows MCP configuration fixed`))
    }
  }

  // Use common MCP selector
  const selectedServices = await selectMcpServices()

  if (!selectedServices) {
    return
  }

  if (selectedServices.length > 0) {
    const mcpBackupPath = backupMcpConfig()
    if (mcpBackupPath) {
      console.log(ansis.gray(`✔ ${i18n.t('mcp:mcpBackupSuccess')}: ${mcpBackupPath}`))
    }

    const newServers: Record<string, McpServerConfig> = {}

    for (const serviceId of selectedServices) {
      const service = (await getMcpServices()).find(s => s.id === serviceId)
      if (!service)
        continue

      let config = service.config

      if (service.requiresApiKey) {
        const { apiKey } = await inquirer.prompt<{ apiKey: string }>({
          type: 'input',
          name: 'apiKey',
          message: service.apiKeyPrompt!,
          validate: async value => !!value || i18n.t('api:keyRequired'),
        })

        if (apiKey) {
          config = buildMcpServerConfig(service.config, apiKey, service.apiKeyPlaceholder, service.apiKeyEnvVar)
        }
        else {
          continue
        }
      }

      newServers[service.id] = config
    }

    const existingConfig = readMcpConfig()
    let mergedConfig = mergeMcpServers(existingConfig, newServers)
    mergedConfig = fixWindowsMcpConfig(mergedConfig)

    writeMcpConfig(mergedConfig)
    console.log(ansis.green(`✔ ${i18n.t('mcp:mcpConfigSuccess')}`))
  }
}

// Configure default model
export async function configureDefaultModelFeature(): Promise<void> {
  ensureI18nInitialized()

  // Check for existing model configuration
  const existingModel = getExistingModelConfig()

  if (existingModel) {
    // Display existing configuration
    console.log(`\n${ansis.blue(`ℹ ${i18n.t('configuration:existingModelConfig') || 'Existing model configuration'}`)}`)
    const modelDisplay
      = existingModel === 'default'
        ? i18n.t('configuration:defaultModelOption') || 'Default (Let Claude Code choose)'
        : existingModel.charAt(0).toUpperCase() + existingModel.slice(1)
    console.log(ansis.gray(`  ${i18n.t('configuration:currentModel') || 'Current model'}: ${modelDisplay}\n`))

    // Ask user what to do with existing config
    const { modify } = await inquirer.prompt<{ modify: boolean }>({
      type: 'confirm',
      name: 'modify',
      message: i18n.t('configuration:modifyModel') || 'Modify model configuration?',
      default: false,
    })

    if (!modify) {
      console.log(ansis.green(`✔ ${i18n.t('configuration:keepModel') || 'Keeping existing model configuration'}`))
      return
    }
  }

  const { model } = await inquirer.prompt<{ model: 'opus' | 'sonnet' | 'opusplan' | 'default' | 'custom' }>({
    type: 'list',
    name: 'model',
    message: i18n.t('configuration:selectDefaultModel') || 'Select default model',
    choices: addNumbersToChoices([
      {
        name: i18n.t('configuration:defaultModelOption') || 'Default - Let Claude Code choose',
        value: 'default' as const,
      },
      {
        name: i18n.t('configuration:opusModelOption') || 'Opus - Only use opus, high token consumption, use with caution',
        value: 'opus' as const,
      },
      {
        name:
          i18n.t('configuration:opusPlanModelOption')
          || 'OpusPlan - Use Opus for planning, write code with sonnet, recommended',
        value: 'opusplan' as const,
      },
      {
        name: i18n.t('configuration:customModelOption') || 'Custom - Specify custom model names',
        value: 'custom' as const,
      },
    ]),
    default: existingModel ? ['default', 'opus', 'opusplan', 'custom'].indexOf(existingModel) : 0,
  })

  if (!model) {
    await handleCancellation()
    return
  }

  if (model === 'custom') {
    // Handle custom model input
    const { primaryModel, fastModel } = await promptCustomModels()

    // Check if both inputs are skipped
    if (!primaryModel.trim() && !fastModel.trim()) {
      console.log(ansis.yellow(`⚠ ${i18n.t('configuration:customModelSkipped') || 'Custom model configuration skipped'}`))
      return
    }

    // Use the new updateCustomModel function to handle environment variables
    updateCustomModel(primaryModel, fastModel)
    console.log(ansis.green(`✔ ${i18n.t('configuration:customModelConfigured') || 'Custom model configuration completed'}`))
    return
  }

  updateDefaultModel(model)
  console.log(ansis.green(`✔ ${i18n.t('configuration:modelConfigured') || 'Default model configured'}`))
}

/**
 * Prompt user for custom model names
 * @returns Object containing primaryModel and fastModel strings (may be empty for skip)
 */
async function promptCustomModels(): Promise<{ primaryModel: string, fastModel: string }> {
  const { primaryModel } = await inquirer.prompt<{ primaryModel: string }>({
    type: 'input',
    name: 'primaryModel',
    message: `${i18n.t('configuration:enterPrimaryModel')}${i18n.t('common:emptyToSkip')}`,
    default: '',
  })

  const { fastModel } = await inquirer.prompt<{ fastModel: string }>({
    type: 'input',
    name: 'fastModel',
    message: `${i18n.t('configuration:enterFastModel')}${i18n.t('common:emptyToSkip')}`,
    default: '',
  })

  return { primaryModel, fastModel }
}

// Configure AI memory
export async function configureAiMemoryFeature(): Promise<void> {
  ensureI18nInitialized()

  const { option } = await inquirer.prompt<{ option: string }>({
    type: 'list',
    name: 'option',
    message: i18n.t('configuration:selectMemoryOption') || 'Select configuration option',
    choices: addNumbersToChoices([
      {
        name: i18n.t('configuration:configureAiLanguage') || 'Configure AI output language',
        value: 'language',
      },
      {
        name: i18n.t('configuration:configureOutputStyle') || 'Configure global AI output style',
        value: 'outputStyle',
      },
    ]),
  })

  if (!option) {
    return
  }

  if (option === 'language') {
    const zcfConfig = readZcfConfig()
    const existingLang = zcfConfig?.aiOutputLang

    // Show existing language configuration if any
    if (existingLang) {
      console.log(
        `\n${
          ansis.blue(`ℹ ${i18n.t('configuration:existingLanguageConfig') || 'Existing AI output language configuration'}`)}`,
      )
      console.log(ansis.gray(`  ${i18n.t('configuration:currentLanguage') || 'Current language'}: ${existingLang}\n`))

      const { modify } = await inquirer.prompt<{ modify: boolean }>({
        type: 'confirm',
        name: 'modify',
        message: i18n.t('configuration:modifyLanguage') || 'Modify AI output language?',
        default: false,
      })

      if (!modify) {
        console.log(ansis.green(`✔ ${i18n.t('configuration:keepLanguage') || 'Keeping existing language configuration'}`))
        return
      }
    }

    // Ask user to select language (don't use resolveAiOutputLanguage to avoid auto-skip)
    const { selectAiOutputLanguage } = await import('./prompts')
    const aiOutputLang = await selectAiOutputLanguage()

    applyAiLanguageDirective(aiOutputLang)
    updateZcfConfig({ aiOutputLang })
    console.log(ansis.green(`✔ ${i18n.t('configuration:aiLanguageConfigured') || 'AI output language configured'}`))
  }
  else if (option === 'outputStyle') {
    await configureOutputStyle()
  }
}

// Clear ZCF cache
export async function clearZcfCacheFeature(): Promise<void> {
  ensureI18nInitialized()

  const { confirm } = await inquirer.prompt<{ confirm: boolean }>({
    type: 'confirm',
    name: 'confirm',
    message: i18n.t('configuration:confirmClearCache') || 'Clear all ZCF preferences cache?',
    default: false,
  })

  if (!confirm) {
    await handleCancellation()
    return
  }

  if (existsSync(ZCF_CONFIG_FILE)) {
    unlinkSync(ZCF_CONFIG_FILE)
    console.log(ansis.green(`✔ ${i18n.t('configuration:cacheCleared') || 'ZCF cache cleared'}`))
  }
  else {
    console.log(ansis.yellow('No cache found'))
  }
}

// Change script language
export async function changeScriptLanguageFeature(currentLang: SupportedLang): Promise<SupportedLang> {
  ensureI18nInitialized()

  const { lang } = await inquirer.prompt<{ lang: SupportedLang }>({
    type: 'list',
    name: 'lang',
    message: i18n.t('language:selectScriptLang'),
    choices: addNumbersToChoices(
      SUPPORTED_LANGS.map(l => ({
        name: LANG_LABELS[l],
        value: l,
      })),
    ),
    default: SUPPORTED_LANGS.indexOf(currentLang),
  })

  if (!lang) {
    return currentLang
  }

  updateZcfConfig({ preferredLang: lang })

  await changeLanguage(lang)

  console.log(ansis.green(`✔ ${i18n.t('language:languageChanged') || 'Language changed'}`))

  return lang
}

// Configure environment variables and permissions
export async function configureEnvPermissionFeature(): Promise<void> {
  ensureI18nInitialized()

  const { choice } = await inquirer.prompt<{ choice: string }>({
    type: 'list',
    name: 'choice',
    message: i18n.t('configuration:selectEnvPermissionOption') || 'Select option',
    choices: addNumbersToChoices([
      {
        name: `${i18n.t('configuration:importRecommendedEnv') || 'Import environment'} ${ansis.gray(
          `- ${i18n.t('configuration:importRecommendedEnvDesc') || 'Import env settings'}`,
        )}`,
        value: 'env',
      },
      {
        name: `${i18n.t('configuration:importRecommendedPermissions') || 'Import permissions'} ${ansis.gray(
          `- ${i18n.t('configuration:importRecommendedPermissionsDesc') || 'Import permission settings'}`,
        )}`,
        value: 'permissions',
      },
      {
        name: `${i18n.t('configuration:openSettingsJson') || 'Open settings'} ${ansis.gray(
          `- ${i18n.t('configuration:openSettingsJsonDesc') || 'View settings file'}`,
        )}`,
        value: 'open',
      },
    ]),
  })

  if (!choice) {
    await handleCancellation()
    return
  }

  try {
    switch (choice) {
      case 'env':
        await importRecommendedEnv()
        console.log(ansis.green(`✅ ${i18n.t('configuration:envImportSuccess')}`))
        break
      case 'permissions':
        await importRecommendedPermissions()
        console.log(ansis.green(`✅ ${i18n.t('configuration:permissionsImportSuccess') || 'Permissions imported'}`))
        break
      case 'open':
        console.log(ansis.cyan(i18n.t('configuration:openingSettingsJson') || 'Opening settings.json...'))
        await openSettingsJson()
        break
    }
  }
  catch (error: any) {
    console.error(ansis.red(`${i18n.t('common:error')}: ${error.message}`))
  }
}
