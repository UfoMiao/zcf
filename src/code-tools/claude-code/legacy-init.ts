import type { AiOutputLanguage, CodeToolType, SupportedLang } from '../../constants'
import type { McpServerConfig } from '../../types'
import type { ApiConfigDefinition, ClaudeCodeProfile } from '../../types/claude-code-config'
import type { ProviderDefinition, ProviderProfile } from '../types'
import { existsSync } from 'node:fs'
import process from 'node:process'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { version } from '../../../package.json'
import { getMcpServices, MCP_SERVICE_CONFIGS } from '../../config/mcp-services'
import { WORKFLOW_CONFIG_BASE } from '../../config/workflows'
import { API_DEFAULT_URL, CLAUDE_DIR, SETTINGS_FILE } from '../../constants'
import { i18n } from '../../i18n'
import { displayBannerWithInfo } from '../../utils/banner'
import { backupCcrConfig, configureCcrProxy, createDefaultCcrConfig, readCcrConfig, setupCcrConfiguration, writeCcrConfig } from '../../utils/ccr/config'
import { installCcr, isCcrInstalled } from '../../utils/ccr/installer'
import {
  addCompletedOnboarding,
  backupMcpConfig,
  buildMcpServerConfig,
  fixWindowsMcpConfig,
  mergeMcpServers,
  readMcpConfig,
  writeMcpConfig,
} from '../../utils/claude-config'
import { installCometixLine, isCometixLineInstalled } from '../../utils/cometix/installer'
import {
  applyAiLanguageDirective,
  backupExistingConfig,
  configureApi,
  copyConfigFiles,
  ensureClaudeDir,
  getExistingApiConfig,
  switchToOfficialLogin,
} from '../../utils/config'
import { handleExitPromptError, handleGeneralError } from '../../utils/error-handler'
import { handleMultipleInstallations } from '../../utils/installation-manager'
import { getInstallationStatus, installClaudeCode } from '../../utils/installer'
import { selectMcpServices } from '../../utils/mcp-selector'
import { configureOutputStyle } from '../../utils/output-style'
import { isTermux, isWindows } from '../../utils/platform'
import { addNumbersToChoices } from '../../utils/prompt-helpers'
import { resolveAiOutputLanguage } from '../../utils/prompts'
import { promptBoolean } from '../../utils/toggle-prompt'
import { formatApiKeyDisplay } from '../../utils/validator'
import { checkClaudeCodeVersionAndPrompt } from '../../utils/version-checker'
import { selectAndInstallWorkflows } from '../../utils/workflow-installer'
import { readZcfConfig, updateZcfConfig } from '../../utils/zcf-config'
import { getCodeToolBanner, getCodeToolDisplayName } from '../presentation'
import { readProviderDefinitions, validateProviderDefinitions } from '../provider-profiles'

export interface InitOptions {
  configLang?: SupportedLang
  aiOutputLang?: AiOutputLanguage | string
  force?: boolean
  skipBanner?: boolean
  skipPrompt?: boolean
  codeType?: CodeToolType | string // Accept abbreviations like 'cc', 'cx'
  // Non-interactive parameters
  configAction?: 'new' | 'backup' | 'merge' | 'docs-only' | 'skip'
  apiType?: 'auth_token' | 'api_key' | 'ccr_proxy' | 'skip'
  apiKey?: string // Used for both API key and auth token
  apiUrl?: string
  apiModel?: string // Primary API model (e.g., claude-sonnet-4-5)
  apiHaikuModel?: string // Default Haiku model
  apiSonnetModel?: string // Default Sonnet model
  apiOpusModel?: string // Default Opus model
  provider?: string // API provider preset (302ai, glm, minimax, kimi, custom)
  mcpServices?: string[] | string | boolean
  workflows?: string[] | string | boolean
  outputStyles?: string[] | string | boolean
  defaultOutputStyle?: string
  allLang?: string // New: unified language parameter
  installCometixLine?: string | boolean // New: CCometixLine installation control
  // Multi-configuration parameters
  apiConfigs?: string // JSON string for multiple API configurations
  apiConfigsFile?: string // Path to JSON file with API configurations
}

export async function validateSkipPromptOptions(options: InitOptions): Promise<void> {
  // Apply --all-lang logic first
  if (options.allLang) {
    if (options.allLang === 'zh-CN' || options.allLang === 'en') {
      // Use allLang for config and AI output language parameters
      options.configLang = options.allLang as SupportedLang
      options.aiOutputLang = options.allLang
    }
    else {
      // Use en for config-lang, allLang for ai-output-lang
      options.configLang = 'en'
      options.aiOutputLang = options.allLang
    }
  }

  // Validate and process provider parameter
  if (options.provider) {
    const { getValidProviderIds, getProviderPreset } = await import('../../config/api-providers')
    const validProviders = [...getValidProviderIds(), 'custom']

    if (!validProviders.includes(options.provider)) {
      throw new Error(
        i18n.t('errors:invalidProvider', {
          provider: options.provider,
          validProviders: validProviders.join(', '),
        }),
      )
    }

    // Auto-set apiType based on provider preset's authType
    if (!options.apiType) {
      const preset = options.provider !== 'custom' ? getProviderPreset(options.provider) : null
      options.apiType = preset?.claudeCode?.authType || 'api_key'
    }
  }

  // Set defaults
  if (!options.configAction) {
    options.configAction = 'backup'
  }
  // Parse outputStyles parameter
  if (typeof options.outputStyles === 'string') {
    if (options.outputStyles === 'skip') {
      options.outputStyles = false
    }
    else if (options.outputStyles === 'all') {
      options.outputStyles = ['engineer-professional', 'nekomata-engineer', 'laowang-engineer']
    }
    else {
      options.outputStyles = options.outputStyles.split(',').map(s => s.trim())
    }
  }
  if (options.outputStyles === undefined) {
    options.outputStyles = ['engineer-professional', 'nekomata-engineer', 'laowang-engineer']
  }

  // Set default output style
  if (!options.defaultOutputStyle) {
    options.defaultOutputStyle = 'engineer-professional'
  }
  // Parse installCometixLine parameter
  if (typeof options.installCometixLine === 'string') {
    options.installCometixLine = options.installCometixLine.toLowerCase() === 'true'
  }
  if (options.installCometixLine === undefined) {
    options.installCometixLine = true
  }

  // Validate configAction
  if (options.configAction && !['new', 'backup', 'merge', 'docs-only', 'skip'].includes(options.configAction)) {
    throw new Error(
      i18n.t('errors:invalidConfigAction', { value: options.configAction }),
    )
  }

  // Validate apiType
  if (options.apiType && !['auth_token', 'api_key', 'ccr_proxy', 'skip'].includes(options.apiType)) {
    throw new Error(
      i18n.t('errors:invalidApiType', { value: options.apiType }),
    )
  }

  // Validate multi-configuration parameters
  if (options.apiConfigs && options.apiConfigsFile) {
    throw new Error(i18n.t('multi-config:conflictingParams'))
  }

  // Validate API model parameters
  const modelParams: Array<[string, unknown]> = [
    ['apiModel', options.apiModel],
    ['apiHaikuModel', options.apiHaikuModel],
    ['apiSonnetModel', options.apiSonnetModel],
    ['apiOpusModel', options.apiOpusModel],
  ]
  for (const [key, value] of modelParams) {
    if (value !== undefined && typeof value !== 'string') {
      if (key === 'apiModel')
        throw new Error(i18n.t('errors:invalidApiModel', { value }))
      throw new Error(i18n.t('errors:invalidModelParam', { key, value }))
    }
  }

  // Validate required API parameters (both use apiKey now)
  if (options.apiType === 'api_key' && !options.apiKey) {
    throw new Error(i18n.t('errors:apiKeyRequiredForApiKey'))
  }

  if (options.apiType === 'auth_token' && !options.apiKey) {
    throw new Error(i18n.t('errors:apiKeyRequiredForAuthToken'))
  }

  // Parse and validate MCP services
  if (typeof options.mcpServices === 'string') {
    if (options.mcpServices === 'skip') {
      options.mcpServices = false
    }
    else if (options.mcpServices === 'all') {
      options.mcpServices = MCP_SERVICE_CONFIGS.filter(s => !s.requiresApiKey).map(s => s.id)
    }
    else {
      options.mcpServices = options.mcpServices.split(',').map(s => s.trim())
    }
  }
  if (Array.isArray(options.mcpServices)) {
    const validServices = MCP_SERVICE_CONFIGS.map(s => s.id)
    for (const service of options.mcpServices) {
      if (!validServices.includes(service)) {
        throw new Error(i18n.t('errors:invalidMcpService', { service, validServices: validServices.join(', ') }))
      }
    }
  }

  // Parse and validate output styles
  if (Array.isArray(options.outputStyles)) {
    const validStyles = ['engineer-professional', 'nekomata-engineer', 'laowang-engineer', 'default', 'explanatory', 'learning']
    for (const style of options.outputStyles) {
      if (!validStyles.includes(style)) {
        throw new Error(i18n.t('errors:invalidOutputStyle', { style, validStyles: validStyles.join(', ') }))
      }
    }
  }

  // Validate default output style
  if (options.defaultOutputStyle) {
    const validStyles = ['engineer-professional', 'nekomata-engineer', 'laowang-engineer', 'default', 'explanatory', 'learning']
    if (!validStyles.includes(options.defaultOutputStyle)) {
      throw new Error(i18n.t('errors:invalidDefaultOutputStyle', { style: options.defaultOutputStyle, validStyles: validStyles.join(', ') }))
    }
  }

  // Parse and validate workflows
  if (typeof options.workflows === 'string') {
    if (options.workflows === 'skip') {
      options.workflows = false
    }
    else if (options.workflows === 'all') {
      options.workflows = WORKFLOW_CONFIG_BASE.map(w => w.id)
    }
    else {
      options.workflows = options.workflows.split(',').map(s => s.trim())
    }
  }
  if (Array.isArray(options.workflows)) {
    const validWorkflows = WORKFLOW_CONFIG_BASE.map(w => w.id)
    for (const workflow of options.workflows) {
      if (!validWorkflows.includes(workflow)) {
        throw new Error(i18n.t('errors:invalidWorkflow', { workflow, validWorkflows: validWorkflows.join(', ') }))
      }
    }
  }

  // Set default MCP services (use "all" as explicit default)
  if (options.mcpServices === undefined) {
    options.mcpServices = 'all'
    // Convert "all" to actual service array
    options.mcpServices = MCP_SERVICE_CONFIGS.filter(s => !s.requiresApiKey).map(s => s.id)
  }

  // Set default workflows (use "all" as explicit default)
  if (options.workflows === undefined) {
    options.workflows = 'all'
    // Convert "all" to actual workflow array
    options.workflows = WORKFLOW_CONFIG_BASE.map(w => w.id)
  }
}

export async function runClaudeCodeInit(options: InitOptions = {}): Promise<void> {
  // Validate options if in skip-prompt mode (outside try-catch to allow errors to propagate in tests)
  if (options.skipPrompt) {
    await validateSkipPromptOptions(options)
  }

  try {
    // Step 2: Read ZCF config once for multiple uses
    const zcfConfig = readZcfConfig()

    const codeToolType = 'claude-code' as const
    options.codeType = codeToolType

    // Add the new API configuration mode selection function
    async function selectApiConfigurationMode(): Promise<string> {
      const { apiMode } = await inquirer.prompt<{ apiMode: string }>({
        type: 'list',
        name: 'apiMode',
        message: i18n.t('api:selectApiMode'),
        choices: [
          {
            name: i18n.t('api:useOfficialLogin'),
            value: 'official',
          },
          {
            name: i18n.t('api:customApiConfig'),
            value: 'custom',
          },
          {
            name: i18n.t('api:useCcrProxy'),
            value: 'ccr',
          },
          {
            name: i18n.t('api:skipApi'),
            value: 'skip',
          },
        ],
      })
      return apiMode
    }

    async function handleCustomApiConfiguration(existingConfig: any): Promise<any> {
      void existingConfig
      const { configureIncrementalManagement } = await import('../../utils/claude-code-incremental-manager')
      await configureIncrementalManagement()
      return null
    }

    // Display banner based on selected code tool
    if (!options.skipBanner) {
      displayBannerWithInfo(getCodeToolBanner(codeToolType))
    }

    // Show Termux environment info if detected
    if (isTermux()) {
      console.log(ansis.yellow(`\nℹ ${i18n.t('installation:termuxDetected')}`))
      console.log(ansis.gray(i18n.t('installation:termuxEnvironmentInfo')))
    }

    // Step 2.1: Select config language with intelligent detection
    let configLang = options.configLang
    if (!configLang) {
      const { resolveTemplateLanguage } = await import('../../utils/prompts')
      configLang = await resolveTemplateLanguage(
        options.configLang,
        zcfConfig,
        options.skipPrompt,
        getCodeToolDisplayName(codeToolType),
      )
    }

    if (!configLang) {
      configLang = 'en'
    }

    // Step 4: Select AI output language
    const aiOutputLang = await resolveAiOutputLanguage(i18n.language as SupportedLang, options.aiOutputLang, zcfConfig, options.skipPrompt)

    // Step 4: Check and handle Claude Code installation
    const installationStatus = await getInstallationStatus()

    // Handle installations (including none, single, or multiple)
    if (installationStatus.hasGlobal || installationStatus.hasLocal) {
      // Handle existing installations - always use the installation manager in interactive mode
      if (!options.skipPrompt) {
        await handleMultipleInstallations(installationStatus)
      }
      else {
        // Skip-prompt mode: prefer global, auto-handle conflicts
        if (installationStatus.hasLocal) {
          // If local installation exists, we prefer global - install global if needed, then remove local
          if (!installationStatus.hasGlobal) {
            console.log(ansis.blue(`${i18n.t('installation:installingGlobalClaudeCode')}...`))
            await installClaudeCode(true) // Skip method selection in non-interactive mode
            console.log(ansis.green(`✔ ${i18n.t('installation:globalInstallationCompleted')}`))
          }

          // Always remove local installation in skip-prompt mode
          if (installationStatus.hasGlobal && installationStatus.hasLocal) {
            console.log(ansis.yellow(`⚠️  ${i18n.t('installation:multipleInstallationsDetected')}`))
          }
          console.log(ansis.blue(`${i18n.t('installation:removingLocalInstallation')}...`))
          const { removeLocalClaudeCode } = await import('../../utils/installer')
          await removeLocalClaudeCode()
          console.log(ansis.green(`✔ ${i18n.t('installation:localInstallationRemoved')}`))
        }
        // If only global exists, no action needed
      }

      // Verify installation and ensure symlink exists (handles cask installations without symlink)
      // This runs regardless of skipPrompt mode to fix broken/missing symlinks
      const { verifyInstallation, displayVerificationResult } = await import('../../utils/installer')
      const verification = await verifyInstallation('claude-code')
      if (verification.symlinkCreated) {
        console.log(ansis.green(`✔ ${i18n.t('installation:alreadyInstalled')}`))
        displayVerificationResult(verification, 'claude-code')
      }
      else if (!verification.success) {
        // If verification failed, try to install
        console.log(ansis.yellow(`⚠ ${i18n.t('installation:verificationFailed')}`))
        if (verification.error) {
          console.log(ansis.gray(`  ${verification.error}`))
        }
      }
    }
    else {
      // No installation found - install Claude Code
      if (options.skipPrompt) {
        // In skip-prompt mode, auto-install Claude Code with npm (skip method selection)
        await installClaudeCode(true)
      }
      else {
        const shouldInstall = await promptBoolean({
          message: i18n.t('installation:installPrompt'),
          defaultValue: true,
        })

        if (shouldInstall) {
          // In interactive mode, allow method selection
          await installClaudeCode(false)
        }
        else {
          console.log(ansis.yellow(i18n.t('common:skip')))
        }
      }
    }

    // Step 4.5: Check for Claude Code updates (if any installation exists)
    if (installationStatus.hasGlobal || installationStatus.hasLocal) {
      // Skip version check if Claude Code was just installed (it's already latest)
      await checkClaudeCodeVersionAndPrompt(options.skipPrompt)
    }

    // Step 5: Handle existing config
    ensureClaudeDir()
    let action = 'new' // default action for new installation

    if (existsSync(SETTINGS_FILE) && !options.force) {
      if (options.skipPrompt) {
        // In skip-prompt mode, use configAction option (default: backup)
        action = options.configAction || 'backup'
        if (action === 'skip') {
          console.log(ansis.yellow(i18n.t('common:skip')))
          return
        }
      }
      else {
        const { action: userAction } = await inquirer.prompt<{ action: string }>({
          type: 'list',
          name: 'action',
          message: i18n.t('configuration:existingConfig'),
          choices: addNumbersToChoices([
            { name: i18n.t('configuration:backupAndOverwrite'), value: 'backup' },
            { name: i18n.t('configuration:updateDocsOnly'), value: 'docs-only' },
            { name: i18n.t('configuration:mergeConfig'), value: 'merge' },
            { name: i18n.t('common:skip'), value: 'skip' },
          ]),
        })

        if (!userAction) {
          console.log(ansis.yellow(i18n.t('common:cancelled')))
          process.exit(0)
        }

        action = userAction

        // Handle special cases early
        if (action === 'skip') {
          console.log(ansis.yellow(i18n.t('common:skip')))
          return
        }
      }
    }
    else if (options.skipPrompt && options.configAction) {
      action = options.configAction
    }

    // Step 6: Configure API (skip if only updating docs)
    let apiConfig = null
    const isNewInstall = !existsSync(SETTINGS_FILE)
    if (action !== 'docs-only' && (isNewInstall || ['backup', 'merge', 'new'].includes(action))) {
      // In skip-prompt mode, handle API configuration directly
      if (options.skipPrompt) {
        // Handle multi-configuration parameters (priority over traditional single config)
        if (options.apiConfigs || options.apiConfigsFile) {
          const { handleMultiConfigurations } = await import('../multi-config')
          await handleMultiConfigurations(options, 'claude-code')
          apiConfig = null
        }
        else if (options.provider && options.apiKey) {
          // Handle provider-based configuration
          const { getProviderPreset } = await import('../../config/api-providers')
          const preset = options.provider !== 'custom' ? getProviderPreset(options.provider) : null

          apiConfig = {
            authType: preset?.claudeCode?.authType || 'api_key',
            key: options.apiKey,
            url: preset?.claudeCode?.baseUrl || options.apiUrl || API_DEFAULT_URL,
          }

          // Apply provider preset models if available
          if (preset?.claudeCode?.defaultModels && preset.claudeCode.defaultModels.length > 0) {
            const [primary, haiku, sonnet, opus] = preset.claudeCode.defaultModels
            options.apiModel = options.apiModel || primary
            options.apiHaikuModel = options.apiHaikuModel || haiku
            options.apiSonnetModel = options.apiSonnetModel || sonnet
            options.apiOpusModel = options.apiOpusModel || opus
          }

          // Save configuration to ZCF TOML config for persistence and switching
          await saveSingleConfigToToml(apiConfig, options.provider, options)
        }
        else if (options.apiType === 'auth_token' && options.apiKey) {
          apiConfig = {
            authType: 'auth_token' as const,
            key: options.apiKey,
            url: options.apiUrl || API_DEFAULT_URL,
          }

          // Save configuration to ZCF TOML config for persistence and switching
          await saveSingleConfigToToml(apiConfig, undefined, options)
        }
        else if (options.apiType === 'api_key' && options.apiKey) {
          apiConfig = {
            authType: 'api_key' as const,
            key: options.apiKey,
            url: options.apiUrl || API_DEFAULT_URL,
          }

          // Save configuration to ZCF TOML config for persistence and switching
          await saveSingleConfigToToml(apiConfig, undefined, options)
        }
        else if (options.apiType === 'ccr_proxy') {
          // Handle CCR proxy configuration in skip-prompt mode
          const ccrStatus = await isCcrInstalled()
          if (!ccrStatus.hasCorrectPackage) {
            await installCcr()
          }
          else {
            console.log(ansis.green(`✔ ${i18n.t('ccr:ccrAlreadyInstalled')}`))
          }

          // Backup existing CCR config if exists
          const existingCcrConfig = readCcrConfig()
          if (existingCcrConfig) {
            const backupPath = await backupCcrConfig()
            if (backupPath) {
              console.log(ansis.gray(`✔ ${i18n.t('ccr:ccrBackupSuccess')}: ${backupPath}`))
            }
          }

          // Create default skip configuration (empty providers - user configures in UI)
          const defaultCcrConfig = createDefaultCcrConfig()

          // Write CCR config
          writeCcrConfig(defaultCcrConfig)
          console.log(ansis.green(`✔ ${i18n.t('ccr:ccrConfigSuccess')}`))

          // Configure proxy in settings.json
          await configureCcrProxy(defaultCcrConfig)
          console.log(ansis.green(`✔ ${i18n.t('ccr:proxyConfigSuccess')}`))

          // Sync ClaudeCodeConfigManager state
          const { ClaudeCodeConfigManager } = await import('../../utils/claude-code-config-manager')
          const ccrResult = await ClaudeCodeConfigManager.switchToCcr()
          if (!ccrResult.success) {
            console.error(ansis.red(i18n.t('ccr:ccrConfigFailed')))
            if (process.env.DEBUG) {
              console.error(ansis.gray(ccrResult.error))
            }
          }

          // Add onboarding flag
          try {
            addCompletedOnboarding()
          }
          catch (error) {
            console.error(ansis.red(i18n.t('errors:failedToSetOnboarding')), error)
          }

          apiConfig = null // CCR sets up its own proxy config
        }
      }
      else {
        // Check for existing API configuration
        const existingApiConfig = getExistingApiConfig()

        // Use unified API configuration mode selection
        const apiMode = await selectApiConfigurationMode()

        switch (apiMode) {
          case 'official': {
            // Handle official login
            const success = switchToOfficialLogin()
            if (success) {
              // Sync ClaudeCodeConfigManager state
              const { ClaudeCodeConfigManager } = await import('../../utils/claude-code-config-manager')
              const syncResult = await ClaudeCodeConfigManager.switchToOfficial()
              if (!syncResult.success) {
                console.error(ansis.red(i18n.t('api:officialLoginFailed')))
                if (process.env.DEBUG) {
                  console.error(ansis.gray(syncResult.error))
                }
              }
              console.log(ansis.green(`✔ ${i18n.t('api:officialLoginConfigured')}`))
              apiConfig = null // No need for API config
            }
            else {
              console.log(ansis.red(i18n.t('api:officialLoginFailed')))
            }
            break
          }

          case 'custom':
            // Handle custom API configuration with smart existing config handling
            apiConfig = await handleCustomApiConfiguration(existingApiConfig)
            break

          case 'ccr': {
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
              // Sync ClaudeCodeConfigManager state so "Switch API Config" reflects CCR as current
              const { ClaudeCodeConfigManager } = await import('../../utils/claude-code-config-manager')
              const ccrResult = await ClaudeCodeConfigManager.switchToCcr()
              if (!ccrResult.success) {
                console.error(ansis.red(i18n.t('ccr:ccrConfigFailed')))
                if (process.env.DEBUG) {
                  console.error(ansis.gray(ccrResult.error))
                }
              }
              console.log(ansis.green(`✔ ${i18n.t('ccr:ccrSetupComplete')}`))
              // CCR configuration already sets up the proxy in settings.json
              // addCompletedOnboarding is already called inside setupCcrConfiguration
              apiConfig = null // No need for traditional API config
            }
            break
          }

          case 'skip':
            // Skip API configuration
            apiConfig = null
            break

          default:
            console.log(ansis.yellow(i18n.t('common:cancelled')))
            process.exit(0)
        }
      }
    }

    // Step 7: Execute the chosen action
    if (['backup', 'docs-only', 'merge'].includes(action)) {
      const backupDir = backupExistingConfig()
      if (backupDir) {
        console.log(ansis.gray(`✔ ${i18n.t('configuration:backupSuccess')}: ${backupDir}`))
      }
    }

    if (action === 'docs-only') {
      // Only copy base config files without agents/commands
      copyConfigFiles(true)
      // Select and install workflows
      if (options.skipPrompt) {
        // Use provided workflows or default to all workflows, skip if false
        if (options.workflows !== false) {
          await selectAndInstallWorkflows(configLang!, options.workflows as string[])
        }
      }
      else {
        await selectAndInstallWorkflows(configLang!)
      }
    }
    else if (['backup', 'merge', 'new'].includes(action)) {
      // Copy all base config files
      copyConfigFiles(false)
      // Select and install workflows
      if (options.skipPrompt) {
        // Use provided workflows or default to all workflows, skip if false
        if (options.workflows !== false) {
          await selectAndInstallWorkflows(configLang!, options.workflows as string[])
        }
      }
      else {
        await selectAndInstallWorkflows(configLang!)
      }
    }

    // Step 8: Apply language directive to CLAUDE.md
    applyAiLanguageDirective(aiOutputLang as AiOutputLanguage | string)
    // Step 8.5: Configure Output Styles
    if (options.skipPrompt) {
      // Use provided output styles and default
      if (options.outputStyles !== false) {
        await configureOutputStyle(
          options.outputStyles as string[],
          options.defaultOutputStyle,
        )
      }
    }
    else {
      await configureOutputStyle()
    }

    // Step 9: Apply API configuration (skip if only updating docs)
    if (apiConfig && action !== 'docs-only') {
      const configuredApi = configureApi(apiConfig as any)
      if (configuredApi) {
        console.log(ansis.green(`✔ ${i18n.t('api:apiConfigSuccess')}`))
        console.log(ansis.gray(`  URL: ${configuredApi.url}`))
        console.log(ansis.gray(`  Key: ${formatApiKeyDisplay(configuredApi.key)}`))
        // addCompletedOnboarding is now called inside configureApi
      }
    }

    // Step 9.5: Configure API models if provided (Claude Code only)
    const hasModelParams = options.apiModel || options.apiHaikuModel || options.apiSonnetModel || options.apiOpusModel
    if (hasModelParams && action !== 'docs-only') {
      if (options.skipPrompt) {
        // In skip-prompt mode, configure models
        const { updateCustomModel } = await import('../../utils/config')
        updateCustomModel(
          options.apiModel || undefined,
          options.apiHaikuModel || undefined,
          options.apiSonnetModel || undefined,
          options.apiOpusModel || undefined,
        )
        console.log(ansis.green(`✔ ${i18n.t('api:modelConfigSuccess')}`))
        if (options.apiModel) {
          console.log(ansis.gray(`  ${i18n.t('api:primaryModel')}: ${options.apiModel}`))
        }
        if (options.apiHaikuModel)
          console.log(ansis.gray(`  Haiku: ${options.apiHaikuModel}`))
        if (options.apiSonnetModel)
          console.log(ansis.gray(`  Sonnet: ${options.apiSonnetModel}`))
        if (options.apiOpusModel)
          console.log(ansis.gray(`  Opus: ${options.apiOpusModel}`))
      }
    }

    // Step 10: Configure MCP services (skip if only updating docs)
    if (action !== 'docs-only') {
      let shouldConfigureMcp = false

      if (options.skipPrompt) {
        // In skip-prompt mode, configure MCP only if services are not explicitly disabled
        shouldConfigureMcp = options.mcpServices !== false
      }
      else {
        const userChoice = await promptBoolean({
          message: i18n.t('mcp:configureMcp'),
          defaultValue: true,
        })

        shouldConfigureMcp = userChoice
      }

      if (shouldConfigureMcp) {
        // Show Windows-specific notice
        if (isWindows()) {
          console.log(ansis.blue(`ℹ ${i18n.t('installation:windowsDetected')}`))
        }

        // Use common MCP selector or skip-prompt services
        let selectedServices: string[] | undefined

        if (options.skipPrompt) {
          selectedServices = options.mcpServices as string[]
        }
        else {
          selectedServices = await selectMcpServices()
          if (selectedServices === undefined) {
            process.exit(0)
          }
        }

        if (selectedServices.length > 0) {
          // Backup existing MCP config if exists
          const mcpBackupPath = backupMcpConfig()
          if (mcpBackupPath) {
            console.log(ansis.gray(`✔ ${i18n.t('mcp:mcpBackupSuccess')}: ${mcpBackupPath}`))
          }

          // Build MCP server configs
          const newServers: Record<string, McpServerConfig> = {}

          for (const serviceId of selectedServices) {
            const services = await getMcpServices()
            const service = services.find(s => s.id === serviceId)
            if (!service)
              continue

            let config = service.config

            // Special handling: serena context differs by code tool
            if (service.id === 'serena' && Array.isArray(config.args)) {
              const adjusted = { ...config, args: [...(config.args || [])] }
              const idx = adjusted.args.indexOf('--context')
              if (idx >= 0 && idx + 1 < adjusted.args.length) {
                adjusted.args[idx + 1] = 'ide-assistant'
              }
              else {
                adjusted.args.push('--context', 'ide-assistant')
              }
              config = adjusted
            }

            // Handle services that require API key
            if (service.requiresApiKey) {
              if (options.skipPrompt) {
                // In skip-prompt mode, skip services that require API keys
                console.log(ansis.yellow(`${i18n.t('common:skip')}: ${service.name} (requires API key)`))
                continue
              }
              else {
                const response = await inquirer.prompt<{ apiKey: string }>({
                  type: 'input',
                  name: 'apiKey',
                  message: service.apiKeyPrompt!,
                  validate: (value: string) => !!value || i18n.t('api:keyRequired'),
                })

                if (!response.apiKey) {
                  console.log(ansis.yellow(`${i18n.t('common:skip')}: ${service.name}`))
                  continue
                }

                config = buildMcpServerConfig(service.config, response.apiKey, service.apiKeyPlaceholder, service.apiKeyEnvVar)
              }
            }

            newServers[service.id] = config
          }

          // Merge with existing config
          const existingConfig = readMcpConfig()
          let mergedConfig = mergeMcpServers(existingConfig, newServers)

          // Fix Windows config if needed
          mergedConfig = fixWindowsMcpConfig(mergedConfig)

          // Write the config with error handling
          try {
            writeMcpConfig(mergedConfig)
            console.log(ansis.green(`✔ ${i18n.t('mcp:mcpConfigSuccess')}`))
          }
          catch (error) {
            console.error(ansis.red(`${i18n.t('errors:failedToWriteMcpConfig')} ${error}`))
          }
        }
      }
    }

    // Step 11: CCometixLine installation
    const cometixInstalled = await isCometixLineInstalled()
    if (!cometixInstalled) {
      let shouldInstallCometix = false

      if (options.skipPrompt) {
        // Use installCometixLine option or default to true
        shouldInstallCometix = options.installCometixLine !== false
      }
      else {
        const userChoice = await promptBoolean({
          message: i18n.t('cometix:installCometixPrompt'),
          defaultValue: true,
        })

        shouldInstallCometix = userChoice
      }

      if (shouldInstallCometix) {
        await installCometixLine()
      }
      else {
        console.log(ansis.yellow(i18n.t('cometix:cometixSkipped')))
      }
    }
    else {
      console.log(ansis.green(`✔ ${i18n.t('cometix:cometixAlreadyInstalled')}`))
    }

    // Step 12: Save zcf config
    updateZcfConfig({
      version,
      preferredLang: i18n.language as SupportedLang, // ZCF界面语言
      templateLang: configLang, // 模板语言
      aiOutputLang: aiOutputLang as AiOutputLanguage | string,
      codeToolType: 'claude-code',
    })

    // Step 13: Success message
    console.log(ansis.green(`✔ ${i18n.t('configuration:configSuccess')} ${CLAUDE_DIR}`))
    console.log(`\n${ansis.cyan(i18n.t('common:complete'))}`)
  }
  catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error)
    }
  }
}

/**
 * Handle multi-configuration API setup
 * @param options - Command line options
 */
export async function handleMultiConfigurations(options: InitOptions): Promise<void> {
  const { ensureI18nInitialized } = await import('../../i18n')
  ensureI18nInitialized()

  try {
    const configs = readProviderDefinitions(options)
    await validateApiConfigs(configs)
    const profiles = await Promise.all(configs.map(config => createClaudeCodeProviderProfile(config)))
    await importClaudeProviderDefinitions(profiles)

    console.log(ansis.green(`✔ ${i18n.t('multi-config:configsAddedSuccessfully')}`))
  }
  catch (error) {
    console.error(ansis.red(`${i18n.t('multi-config:configsFailed')}: ${error instanceof Error ? error.message : String(error)}`))
    throw error
  }
}

/**
 * Validate API configurations
 * @param configs - Array of API configurations to validate
 */
export async function validateApiConfigs(configs: ApiConfigDefinition[]): Promise<void> {
  await validateProviderDefinitions(configs)
}

/**
 * Handle Claude Code API configurations
 * @param profiles - Normalized provider profiles
 */
export async function importClaudeProviderDefinitions(profiles: ProviderProfile[]): Promise<void> {
  const { ClaudeCodeConfigManager } = await import('../../utils/claude-code-config-manager')
  const addedProfiles: ClaudeCodeProfile[] = []

  for (const profile of profiles) {
    if (profile.auth.type === 'ccr_proxy') {
      throw new Error(i18n.t('multi-config:ccrProxyReserved', { name: profile.name }))
    }

    const claudeProfile = serializeClaudeCodeProviderProfile(
      profile,
      ClaudeCodeConfigManager.generateProfileId(profile.name),
    )
    const result = await ClaudeCodeConfigManager.addProfile(claudeProfile)

    if (!result.success) {
      throw new Error(i18n.t('multi-config:configProfileAddFailed', { name: profile.name, error: result.error }))
    }

    const storedProfile = result.addedProfile
      || ClaudeCodeConfigManager.getProfileByName(profile.name)
      || claudeProfile
    addedProfiles.push(storedProfile)

    console.log(ansis.green(`✔ ${i18n.t('multi-config:profileAdded', { name: profile.name })}`))
  }

  if (addedProfiles.length > 0) {
    const summary = addedProfiles
      .map(item => `${item.name} [${item.authType}]`)
      .join(', ')
    console.log(ansis.gray(`  • ${ClaudeCodeConfigManager.CONFIG_FILE}: ${summary}`))
  }

  const defaultProfile = profiles.find(item => item.default)
  if (defaultProfile) {
    const profile = addedProfiles.find(item => item.name === defaultProfile.name)
      || ClaudeCodeConfigManager.getProfileByName(defaultProfile.name)
    if (profile && profile.id) {
      await ClaudeCodeConfigManager.switchProfile(profile.id)
      await ClaudeCodeConfigManager.applyProfileSettings(profile)
      console.log(ansis.green(`✔ ${i18n.t('multi-config:defaultProfileSet', { name: defaultProfile.name })}`))
    }
  }

  await ClaudeCodeConfigManager.syncCcrProfile()
}

/**
 * Save single API configuration to ZCF TOML config
 * Handles profile creation, switching, and error reporting
 * @param apiConfig - API configuration object
 * @param apiConfig.authType - API authentication type
 * @param apiConfig.key - API key
 * @param apiConfig.url - API URL
 * @param provider - Optional provider name
 * @param options - Command line options for models
 * @param options.apiModel - Primary API model
 * @param options.apiHaikuModel - Default Haiku model
 * @param options.apiSonnetModel - Default Sonnet model
 * @param options.apiOpusModel - Default Opus model
 */
async function saveSingleConfigToToml(
  apiConfig: { authType: 'api_key' | 'auth_token', key: string, url?: string },
  provider?: string,
  options?: { apiModel?: string, apiHaikuModel?: string, apiSonnetModel?: string, apiOpusModel?: string },
): Promise<void> {
  try {
    const { ClaudeCodeConfigManager } = await import('../../utils/claude-code-config-manager')
    const profile = await convertSingleConfigToProfile(apiConfig, provider, options)
    const result = await ClaudeCodeConfigManager.addProfile(profile)

    if (result.success) {
      const savedProfile = result.addedProfile || ClaudeCodeConfigManager.getProfileByName(profile.name) || profile
      // Set as default and apply settings
      if (savedProfile.id) {
        await ClaudeCodeConfigManager.switchProfile(savedProfile.id)
        await ClaudeCodeConfigManager.applyProfileSettings(savedProfile)
      }
      console.log(ansis.green(`✔ ${i18n.t('configuration:singleConfigSaved', { name: profile.name })}`))
    }
    else {
      console.warn(ansis.yellow(`${i18n.t('configuration:singleConfigSaveFailed')}: ${result.error}`))
    }
  }
  catch (error) {
    console.warn(ansis.yellow(`${i18n.t('configuration:singleConfigSaveFailed')}: ${error instanceof Error ? error.message : String(error)}`))
  }
}

async function convertSingleConfigToProfile(
  apiConfig: { authType: 'api_key' | 'auth_token', key: string, url?: string },
  provider?: string,
  options?: { apiModel?: string, apiHaikuModel?: string, apiSonnetModel?: string, apiOpusModel?: string },
): Promise<ClaudeCodeProfile> {
  const { ClaudeCodeConfigManager } = await import('../../utils/claude-code-config-manager')

  // Generate configuration name based on provider or use default
  const configName = provider && provider !== 'custom'
    ? provider
    : 'custom-config'

  // Apply provider preset if specified
  let baseUrl = apiConfig.url || API_DEFAULT_URL
  let primaryModel = options?.apiModel
  let defaultHaikuModel = options?.apiHaikuModel
  let defaultSonnetModel = options?.apiSonnetModel
  let defaultOpusModel = options?.apiOpusModel
  let authType = apiConfig.authType

  if (provider && provider !== 'custom') {
    const { getProviderPreset } = await import('../../config/api-providers')
    const preset = getProviderPreset(provider)

    if (preset?.claudeCode) {
      baseUrl = apiConfig.url || preset.claudeCode.baseUrl
      authType = preset.claudeCode.authType
      if (preset.claudeCode.defaultModels && preset.claudeCode.defaultModels.length > 0) {
        const [p, h, s, o] = preset.claudeCode.defaultModels
        primaryModel = primaryModel || p
        defaultHaikuModel = defaultHaikuModel || h
        defaultSonnetModel = defaultSonnetModel || s
        defaultOpusModel = defaultOpusModel || o
      }
    }
  }

  const profile: ClaudeCodeProfile = {
    name: configName,
    authType,
    apiKey: apiConfig.key,
    baseUrl,
    primaryModel,
    defaultHaikuModel,
    defaultSonnetModel,
    defaultOpusModel,
    id: ClaudeCodeConfigManager.generateProfileId(configName),
  }

  return profile
}

export async function createClaudeCodeProviderProfile(config: ProviderDefinition): Promise<ProviderProfile> {
  let baseUrl = config.url
  let primaryModel = config.primaryModel
  let smallModel = config.defaultHaikuModel
  let mediumModel = config.defaultSonnetModel
  let largeModel = config.defaultOpusModel
  let authType: ProviderProfile['auth']['type'] = config.type === 'auth_token'
    ? 'auth_token'
    : config.type === 'ccr_proxy'
      ? 'ccr_proxy'
      : 'api_key'

  if (config.provider && config.provider !== 'custom') {
    const { getProviderPreset } = await import('../../config/api-providers')
    const preset = getProviderPreset(config.provider)

    if (preset?.claudeCode) {
      baseUrl = baseUrl || preset.claudeCode.baseUrl
      authType = preset.claudeCode.authType
      if (preset.claudeCode.defaultModels && preset.claudeCode.defaultModels.length > 0) {
        const [p, h, s, o] = preset.claudeCode.defaultModels
        primaryModel = primaryModel || p
        smallModel = smallModel || h
        mediumModel = mediumModel || s
        largeModel = largeModel || o
      }
    }
  }

  return {
    id: config.name!.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    name: config.name!,
    provider: config.provider,
    baseUrl,
    auth: {
      type: authType,
      credential: config.key,
      envKey: authType === 'auth_token'
        ? 'ANTHROPIC_AUTH_TOKEN'
        : authType === 'api_key'
          ? 'ANTHROPIC_API_KEY'
          : undefined,
    },
    models: {
      primary: primaryModel,
      small: smallModel,
      medium: mediumModel,
      large: largeModel,
    },
    default: config.default,
  }
}

export function serializeClaudeCodeProviderProfile(
  profile: ProviderProfile,
  id: string = profile.id,
): ClaudeCodeProfile {
  return {
    id,
    name: profile.name,
    authType: profile.auth.type === 'auth_token'
      ? 'auth_token'
      : profile.auth.type === 'ccr_proxy'
        ? 'ccr_proxy'
        : 'api_key',
    apiKey: profile.auth.credential,
    baseUrl: profile.baseUrl,
    primaryModel: profile.models.primary,
    defaultHaikuModel: profile.models.small,
    defaultSonnetModel: profile.models.medium,
    defaultOpusModel: profile.models.large,
  }
}
