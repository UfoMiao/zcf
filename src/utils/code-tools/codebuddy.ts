import type { AiOutputLanguage, SupportedLang } from '../../constants'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { version } from '../../../package.json'
import { CODEBUDDY_DIR, CODEBUDDY_MD_FILE, SUPPORTED_LANGS } from '../../constants'
import { ensureI18nInitialized, i18n } from '../../i18n'
import { ensureDir, exists, writeFile } from '../fs-operations'
import { addNumbersToChoices } from '../prompt-helpers'
import { promptBoolean } from '../toggle-prompt'
import { updateZcfConfig } from '../zcf-config'
import { readSettings } from './codebuddy-config'
import { CodeBuddyConfigManager } from './codebuddy-config-manager'

// Public exports
export { CODEBUDDY_DIR }
export { CodeBuddyConfigManager }

/**
 * Full initialization for CodeBuddy
 */
export async function runCodebuddyFullInit(options: {
  configLang?: SupportedLang
  aiOutputLang?: AiOutputLanguage
  force?: boolean
  skipPrompt?: boolean
  configAction?: string
  apiType?: string
  apiKey?: string
  apiUrl?: string
  apiModel?: string
  apiHaikuModel?: string
  apiSonnetModel?: string
  apiOpusModel?: string
  mcpServices?: string
  workflows?: string
  outputStyles?: string
  defaultOutputStyle?: string
  allLang?: string
} = {}): Promise<void> {
  ensureI18nInitialized()

  const configLang = options.configLang
    ? (SUPPORTED_LANGS.includes(options.configLang as any) ? options.configLang : 'en')
    : 'en'

  console.log(ansis.cyan.bold(i18n.t('installation:codebuddyFullInit') || '=== CodeBuddy Full Initialization ==='))
  console.log('')

  // 1. Ensure ~/.codebuddy/ directory exists
  ensureDir(CODEBUDDY_DIR)

  // 2. Write CODEBUDDY.md entry file
  await ensureCodebuddyMd(configLang, options.aiOutputLang)

  // 3. Configure API profile
  await configureCodebuddyApi(options)

  // 4. Configure MCP services
  await configureCodebuddyMcp({
    mcpServices: options.mcpServices,
    skipPrompt: options.skipPrompt,
  })

  // 5. Update ZCF config
  updateZcfConfig({
    version,
    templateLang: configLang,
    codeToolType: 'codebuddy',
  })

  console.log('')
  console.log(ansis.green.bold(i18n.t('installation:codebuddySetupComplete') || 'CodeBuddy setup complete!'))
}

/**
 * Update CodeBuddy prompts/workflows
 */
export async function runCodebuddyUpdate(skipBanner: boolean = false, _skipPrompt: boolean = false): Promise<boolean> {
  ensureI18nInitialized()

  if (!skipBanner) {
    console.log(ansis.cyan.bold(i18n.t('updater:codebuddyUpdateTitle') || '=== CodeBuddy Update ==='))
  }

  // Ensure CODEBUDDY.md exists
  const codebuddyMdExists = exists(CODEBUDDY_MD_FILE)
  if (!codebuddyMdExists) {
    console.log(ansis.yellow(i18n.t('updater:codebuddyMdNotFound') || 'CODEBUDDY.md not found. Creating new one...'))
    await ensureCodebuddyMd('en')
  }

  // Apply current profile settings
  await CodeBuddyConfigManager.applyCurrentProfile()

  console.log(ansis.green(i18n.t('updater:codebuddyUpdateComplete') || 'CodeBuddy update complete!'))
  return true
}

/**
 * Uninstall CodeBuddy configurations
 */
export async function runCodebuddyUninstall(): Promise<void> {
  ensureI18nInitialized()

  console.log(ansis.cyan.bold(i18n.t('uninstall:codebuddyUninstallTitle') || '=== CodeBuddy Uninstall ==='))

  const confirm = await promptBoolean({
    message: i18n.t('uninstall:codebuddyConfirmUninstall') || 'Remove all CodeBuddy configurations?',
    defaultValue: false,
  })

  if (!confirm) {
    console.log(ansis.yellow(i18n.t('common:cancelled') || 'Cancelled'))
    return
  }

  // Clear profile settings
  await CodeBuddyConfigManager.applyProfileSettings(null)

  // Update ZCF config to disable codebuddy
  updateZcfConfig({ codeToolType: 'claude-code' })

  console.log(ansis.green(i18n.t('uninstall:codebuddyUninstallComplete') || 'CodeBuddy configurations removed!'))
}

/**
 * Configure CodeBuddy API
 */
export async function configureCodebuddyApi(options: {
  apiType?: string
  apiKey?: string
  apiUrl?: string
  apiModel?: string
  apiHaikuModel?: string
  apiSonnetModel?: string
  apiOpusModel?: string
  skipPrompt?: boolean
} = {}): Promise<void> {
  ensureI18nInitialized()

  if (options.skipPrompt && options.apiType) {
    // Non-interactive mode
    await CodeBuddyConfigManager.applyProfileSettings({
      name: 'default',
      authType: options.apiType as any,
      apiKey: options.apiKey,
      baseUrl: options.apiUrl,
      primaryModel: options.apiModel,
      defaultHaikuModel: options.apiHaikuModel,
      defaultSonnetModel: options.apiSonnetModel,
      defaultOpusModel: options.apiOpusModel,
    })
    return
  }

  // Interactive mode
  const { apiChoice } = await inquirer.prompt<{ apiChoice: string }>({
    type: 'list',
    name: 'apiChoice',
    message: i18n.t('api:configureApi') || 'Select API configuration',
    choices: addNumbersToChoices([
      { name: `${i18n.t('api:useAuthToken')} - ${ansis.gray(i18n.t('api:authTokenDesc') || 'Use Auth Token')}`, value: 'auth_token' },
      { name: `${i18n.t('api:useApiKey')} - ${ansis.gray(i18n.t('api:apiKeyDesc') || 'Use API Key')}`, value: 'api_key' },
      { name: i18n.t('api:skipApi') || 'Skip', value: 'skip' },
    ]),
  })

  if (!apiChoice || apiChoice === 'skip') {
    console.log(ansis.yellow(i18n.t('common:cancelled') || 'Skipped'))
    return
  }

  const { apiKey } = await inquirer.prompt<{ apiKey: string }>({
    type: 'input',
    name: 'apiKey',
    message: i18n.t('api:enterApiKey') || 'Enter API key',
  })

  const { apiUrl } = await inquirer.prompt<{ apiUrl: string }>({
    type: 'input',
    name: 'apiUrl',
    message: `${i18n.t('api:enterApiUrl') || 'Enter API URL'} ${i18n.t('common:emptyToSkip') || '(empty to skip)'}`,
    default: '',
  })

  await CodeBuddyConfigManager.applyProfileSettings({
    name: 'default',
    authType: apiChoice as any,
    apiKey: apiKey || undefined,
    baseUrl: apiUrl || undefined,
  })

  console.log(ansis.green(i18n.t('api:apiConfigComplete') || 'API configuration complete!'))
}

/**
 * Configure CodeBuddy MCP services
 */
export async function configureCodebuddyMcp(options: {
  mcpServices?: string
  skipPrompt?: boolean
} = {}): Promise<void> {
  ensureI18nInitialized()

  if (options.mcpServices === 'skip') {
    console.log(ansis.yellow(i18n.t('mcp:mcpSkipped') || 'MCP configuration skipped'))
    return
  }

  if (options.skipPrompt) {
    console.log(ansis.gray(i18n.t('mcp:mcpNonInteractiveSkipped') || 'MCP configuration requires interactive mode, skipped'))
    return
  }

  try {
    const { getMcpServices } = await import('../../config/mcp-services')
    const { backupMcpConfig, buildMcpServerConfig, mergeMcpServers, readMcpConfig, writeMcpConfig, fixWindowsMcpConfig } = await import('./codebuddy-config')
    const { selectMcpServices } = await import('../mcp-selector')

    await getMcpServices()
    const selectedServices = await selectMcpServices()

    if (!selectedServices || selectedServices.length === 0) {
      console.log(ansis.yellow(i18n.t('mcp:mcpSkipped') || 'No MCP services selected'))
      return
    }

    const backupPath = backupMcpConfig()
    if (backupPath) {
      console.log(ansis.gray(`${i18n.t('mcp:mcpBackupSuccess')}: ${backupPath}`))
    }

    const newServers: Record<string, any> = {}

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
          validate: async (value: string) => !!value || i18n.t('api:keyRequired') || 'Key required',
        })

        if (apiKey) {
          config = buildMcpServerConfig(service.config, apiKey, service.apiKeyPlaceholder, service.apiKeyEnvVar)
        }
      }

      newServers[service.id] = config
    }

    const existingConfig = readMcpConfig()
    let mergedConfig = mergeMcpServers(existingConfig, newServers)
    mergedConfig = fixWindowsMcpConfig(mergedConfig)

    writeMcpConfig(mergedConfig)
    console.log(ansis.green(i18n.t('mcp:mcpConfigSuccess') || 'MCP configuration complete!'))
  }
  catch (error) {
    console.error(ansis.red(`${i18n.t('mcp:mcpConfigFailed') || 'MCP configuration failed'}: ${error}`))
  }
}

/**
 * Read CodeBuddy configuration from settings.json
 */
export function readCodebuddyConfig<T = Record<string, unknown>>(): T | null {
  return readSettings<T>()
}

/**
 * Ensure CODEBUDDY.md file exists with language directive
 */
export async function ensureCodebuddyMd(
  _configLang: SupportedLang = 'en',
  aiOutputLang?: AiOutputLanguage,
): Promise<void> {
  if (!exists(CODEBUDDY_MD_FILE)) {
    const langDirective = aiOutputLang
      ? (aiOutputLang === 'zh-CN' ? 'Always respond in Chinese-simplified' : 'Always respond in English')
      : ''

    const content = langDirective
      ? `**Most Important: ${langDirective}**\n`
      : '# CodeBuddy Instructions\n'

    writeFile(CODEBUDDY_MD_FILE, content)
    console.log(ansis.green(i18n.t('installation:codebuddyMdCreated', { path: CODEBUDDY_MD_FILE })))
  }
}
