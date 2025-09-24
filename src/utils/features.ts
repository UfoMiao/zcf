import type { SupportedLang } from '../constants'
import type { McpServerConfig } from '../types'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { getMcpServices } from '../config/mcp-services'
import { LANG_LABELS, SUPPORTED_LANGS } from '../constants'
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
      console.log(ansis.green(`✔ ${i18n.t('configuration:windowsMcpConfigFixed')}`))
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
          type: 'password',
          name: 'apiKey',
          message: service.apiKeyPrompt! + i18n.t('common:inputHidden'),
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

// Configure Codex default model
export async function configureCodexDefaultModelFeature(): Promise<void> {
  ensureI18nInitialized()

  // Check for existing Codex configuration
  const { readCodexConfig } = await import('./code-tools/codex')
  const existingConfig = readCodexConfig()

  const currentModel = existingConfig?.model

  if (currentModel) {
    // Display existing configuration
    console.log(`\n${ansis.blue(`ℹ ${i18n.t('configuration:existingModelConfig') || 'Existing model configuration'}`)}`)
    const modelDisplay = currentModel === 'gpt-5-codex'
      ? 'GPT-5-Codex'
      : currentModel === 'gpt-5'
        ? 'GPT-5'
        : currentModel.charAt(0).toUpperCase() + currentModel.slice(1)
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

  const { model } = await inquirer.prompt<{ model: 'gpt-5' | 'gpt-5-codex' | 'custom' }>({
    type: 'list',
    name: 'model',
    message: i18n.t('configuration:selectDefaultModel') || 'Select default model',
    choices: addNumbersToChoices([
      {
        name: i18n.t('configuration:codexModelOptions.gpt5'),
        value: 'gpt-5' as const,
      },
      {
        name: i18n.t('configuration:codexModelOptions.gpt5Codex'),
        value: 'gpt-5-codex' as const,
      },
      {
        name: i18n.t('configuration:codexModelOptions.custom'),
        value: 'custom' as const,
      },
    ]),
    default: currentModel ? ['gpt-5', 'gpt-5-codex', 'custom'].indexOf(currentModel as any) : 1, // Default to gpt-5-codex
  })

  if (!model) {
    await handleCancellation()
    return
  }

  if (model === 'custom') {
    // Handle custom model input
    const { customModel } = await inquirer.prompt<{ customModel: string }>({
      type: 'input',
      name: 'customModel',
      message: `${i18n.t('configuration:enterCustomModel')}${i18n.t('common:emptyToSkip')}`,
      default: '',
    })

    if (!customModel.trim()) {
      console.log(ansis.yellow(`⚠ ${i18n.t('configuration:customModelSkipped') || 'Custom model configuration skipped'}`))
      return
    }

    // Update Codex config with custom model
    await updateCodexModelProvider(customModel.trim())
    console.log(ansis.green(`✔ ${i18n.t('configuration:customModelConfigured') || 'Custom model configuration completed'}`))
    return
  }

  // Update Codex config with selected model
  await updateCodexModelProvider(model)
  console.log(ansis.green(`✔ ${i18n.t('configuration:modelConfigured') || 'Default model configured'}`))
}

// Configure Codex AI memory (output language and system prompt style)
export async function configureCodexAiMemoryFeature(): Promise<void> {
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
        name: i18n.t('configuration:configureSystemPromptStyle') || 'Configure global AI system prompt style',
        value: 'systemPrompt',
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
          ansis.blue(`ℹ ${i18n.t('configuration:existingLanguageConfig') || 'Existing AI output language configuration'}`)
        }`,
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

        // Even when not modifying, ensure AGENTS.md has language directive
        await ensureLanguageDirectiveInAgents(existingLang)
        return
      }
    }

    // Ask user to select language
    const { selectAiOutputLanguage } = await import('./prompts')
    const aiOutputLang = await selectAiOutputLanguage()

    // Update AGENTS.md with language directive
    await updateCodexLanguageDirective(aiOutputLang)
    updateZcfConfig({ aiOutputLang })
    console.log(ansis.green(`✔ ${i18n.t('configuration:aiLanguageConfigured') || 'AI output language configured'}`))
  }
  else if (option === 'systemPrompt') {
    // Get current AI output language from config
    const zcfConfig = readZcfConfig()
    const currentLang = zcfConfig?.aiOutputLang || 'English'

    // Regenerate system prompt with current language and style selection
    const { runCodexSystemPromptSelection } = await import('./code-tools/codex')
    await runCodexSystemPromptSelection()

    // Ensure language directive is preserved after system prompt change
    await ensureLanguageDirectiveInAgents(currentLang)

    console.log(ansis.green(`✔ ${i18n.t('configuration:systemPromptConfigured')}`))
  }
}

// Helper function to update Codex model provider
async function updateCodexModelProvider(modelProvider: string): Promise<void> {
  const { readCodexConfig, writeCodexConfig, backupCodexConfig, getBackupMessage } = await import('./code-tools/codex')

  // Create backup before modification
  const backupPath = backupCodexConfig()
  if (backupPath) {
    console.log(ansis.gray(getBackupMessage(backupPath)))
  }

  // Read existing config
  const existingConfig = readCodexConfig()

  // Update model provider
  const updatedConfig = {
    ...existingConfig,
    model: modelProvider, // Set the model field
    modelProvider: existingConfig?.modelProvider || null, // Preserve existing API provider
    providers: existingConfig?.providers || [],
    mcpServices: existingConfig?.mcpServices || [],
    managed: true,
    otherConfig: existingConfig?.otherConfig || [],
    modelProviderCommented: existingConfig?.modelProviderCommented,
  }

  // Write updated config
  writeCodexConfig(updatedConfig)
}

// Helper function to ensure language directive exists in AGENTS.md
async function ensureLanguageDirectiveInAgents(aiOutputLang: string): Promise<void> {
  const { readFile, writeFile, exists } = await import('./fs-operations')
  const { homedir } = await import('node:os')
  const { join } = await import('pathe')

  const CODEX_AGENTS_FILE = join(homedir(), '.codex', 'AGENTS.md')

  if (!exists(CODEX_AGENTS_FILE)) {
    console.log(ansis.yellow(i18n.t('codex:agentsFileNotFound')))
    return
  }

  // Read current content
  const content = readFile(CODEX_AGENTS_FILE)

  // Language mapping for display
  const languageLabels: Record<string, string> = {
    'Chinese': 'Chinese-simplified',
    'English': 'English',
    'zh-CN': 'Chinese-simplified',
    'en': 'English',
  }

  const langLabel = languageLabels[aiOutputLang] || aiOutputLang

  // Check if language directive already exists
  const hasLanguageDirective = /\*\*Most Important:\s*Always respond in [^*]+\*\*/i.test(content)

  if (!hasLanguageDirective) {
    // Add language directive if not present
    const { backupCodexAgents, getBackupMessage } = await import('./code-tools/codex')

    // Create backup before modification
    const backupPath = backupCodexAgents()
    if (backupPath) {
      console.log(ansis.gray(getBackupMessage(backupPath)))
    }

    let updatedContent = content
    if (!updatedContent.endsWith('\n')) {
      updatedContent += '\n'
    }
    updatedContent += `\n**Most Important:Always respond in ${langLabel}**\n`

    writeFile(CODEX_AGENTS_FILE, updatedContent)
    console.log(ansis.gray(`  ${i18n.t('configuration:addedLanguageDirective')}: ${langLabel}`))
  }
}

// Helper function to update Codex language directive in AGENTS.md
async function updateCodexLanguageDirective(aiOutputLang: string): Promise<void> {
  const { readFile, writeFile, exists } = await import('./fs-operations')
  const { backupCodexAgents, getBackupMessage } = await import('./code-tools/codex')
  const { homedir } = await import('node:os')
  const { join } = await import('pathe')

  const CODEX_AGENTS_FILE = join(homedir(), '.codex', 'AGENTS.md')

  if (!exists(CODEX_AGENTS_FILE)) {
    console.log(ansis.yellow(i18n.t('codex:agentsFileNotFound')))
    return
  }

  // Create backup before modification
  const backupPath = backupCodexAgents()
  if (backupPath) {
    console.log(ansis.gray(getBackupMessage(backupPath)))
  }

  // Read current content
  let content = readFile(CODEX_AGENTS_FILE)

  // Language mapping for display
  const languageLabels: Record<string, string> = {
    'Chinese': 'Chinese-simplified',
    'English': 'English',
    'zh-CN': 'Chinese-simplified',
    'en': 'English',
  }

  const langLabel = languageLabels[aiOutputLang] || aiOutputLang

  // Remove existing language directive if present
  content = content.replace(/\*\*Most Important:\s*Always respond in [^*]+\*\*\s*/g, '')

  // Add new language directive at the end
  if (!content.endsWith('\n')) {
    content += '\n'
  }

  content += `\n**Most Important:Always respond in ${langLabel}**\n`

  // Write updated content
  writeFile(CODEX_AGENTS_FILE, content)
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
