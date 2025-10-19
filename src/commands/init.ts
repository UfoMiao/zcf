import type { AiOutputLanguage, CodeToolType, SupportedLang } from '../constants'
import type { McpServerConfig } from '../types'
import type { ApiConfigDefinition, ClaudeCodeProfile } from '../types/claude-code-config'
import type { CodexProvider } from '../utils/code-tools/codex'
import { existsSync } from 'node:fs'
import process from 'node:process'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { version } from '../../package.json'
import { getMcpServices, MCP_SERVICE_CONFIGS } from '../config/mcp-services'
import { WORKFLOW_CONFIG_BASE } from '../config/workflows'
import { CLAUDE_DIR, CODE_TOOL_BANNERS, DEFAULT_CODE_TOOL_TYPE, SETTINGS_FILE } from '../constants'
import { i18n } from '../i18n'
import { displayBannerWithInfo } from '../utils/banner'
import { backupCcrConfig, configureCcrProxy, createDefaultCcrConfig, readCcrConfig, setupCcrConfiguration, writeCcrConfig } from '../utils/ccr/config'
import { installCcr, isCcrInstalled } from '../utils/ccr/installer'
import {
  addCompletedOnboarding,
  backupMcpConfig,
  buildMcpServerConfig,
  fixWindowsMcpConfig,
  mergeMcpServers,
  readMcpConfig,
  setPrimaryApiKey,
  writeMcpConfig,
} from '../utils/claude-config'
import { runCodexFullInit } from '../utils/code-tools/codex'
import { resolveCodeType } from '../utils/code-type-resolver'
import { installCometixLine, isCometixLineInstalled } from '../utils/cometix/installer'
import {
  applyAiLanguageDirective,
  backupExistingConfig,
  configureApi,
  copyConfigFiles,
  ensureClaudeDir,
  getExistingApiConfig,
  promptApiConfigurationAction,
  switchToOfficialLogin,
} from '../utils/config'
import { configureApiCompletely, modifyApiConfigPartially } from '../utils/config-operations'
import { handleExitPromptError, handleGeneralError } from '../utils/error-handler'
import { handleMultipleInstallations } from '../utils/installation-manager'
import { getInstallationStatus, installClaudeCode } from '../utils/installer'
import { selectMcpServices } from '../utils/mcp-selector'
import { configureOutputStyle } from '../utils/output-style'
import { isTermux, isWindows } from '../utils/platform'
import { addNumbersToChoices } from '../utils/prompt-helpers'
import { resolveAiOutputLanguage } from '../utils/prompts'
import { formatApiKeyDisplay } from '../utils/validator'
import { checkClaudeCodeVersionAndPrompt } from '../utils/version-checker'
import { selectAndInstallWorkflows } from '../utils/workflow-installer'
import { readZcfConfig, updateZcfConfig } from '../utils/zcf-config'

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

export function validateSkipPromptOptions(options: InitOptions): void {
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
    throw new Error('Cannot specify both --api-configs and --api-configs-file at the same time')
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

export async function init(options: InitOptions = {}): Promise<void> {
  // Validate options if in skip-prompt mode (outside try-catch to allow errors to propagate in tests)
  if (options.skipPrompt) {
    validateSkipPromptOptions(options)
  }

  try {
    // Step 2: Read ZCF config once for multiple uses
    const zcfConfig = readZcfConfig()

    // Step 3: Select code tool
    let codeToolType: CodeToolType
    try {
      codeToolType = await resolveCodeType(options.codeType)
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(ansis.red(`${i18n.t('errors:generalError')} ${errorMessage}`))
      // Fallback to default value
      codeToolType = DEFAULT_CODE_TOOL_TYPE
    }
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
      // For Claude Code, always use the new incremental configuration management
      if (codeToolType === 'claude-code') {
        const { configureIncrementalManagement } = await import('../utils/claude-code-incremental-manager')
        await configureIncrementalManagement()
        return null
      }

      // For Codex or other tools, keep the existing logic
      if (existingConfig) {
        // Handle existing configuration with smart choices using common function
        const customConfigAction = await promptApiConfigurationAction()

        if (customConfigAction === 'modify-partial') {
          await modifyApiConfigPartially(existingConfig)
          return null // No need to configure again
        }
        else if (customConfigAction === 'modify-all') {
          return await configureApiCompletely()
        }
        else if (customConfigAction === 'keep-existing') {
          try {
            addCompletedOnboarding()
          }
          catch (error) {
            console.error(ansis.red(i18n.t('errors:failedToSetOnboarding')), error)
          }
          // Set primaryApiKey for third-party API (Claude Code 2.0 requirement)
          try {
            setPrimaryApiKey()
          }
          catch (error) {
            const { ensureI18nInitialized, i18n: i18nModule } = await import('../i18n')
            ensureI18nInitialized()
            console.error(i18nModule.t('mcp:primaryApiKeySetFailed'), error)
          }
          return null
        }
      }
      else {
        // No existing config, show standard choices
        const { apiChoice } = await inquirer.prompt<{ apiChoice: string }>({
          type: 'list',
          name: 'apiChoice',
          message: i18n.t('api:configureApi'),
          choices: [
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
          ],
        })

        if (!apiChoice) {
          console.log(ansis.yellow(i18n.t('common:cancelled')))
          process.exit(0)
        }

        return await configureApiCompletely(apiChoice as 'auth_token' | 'api_key')
      }
    }

    // Display banner based on selected code tool
    if (!options.skipBanner) {
      displayBannerWithInfo(CODE_TOOL_BANNERS[codeToolType] || 'ZCF')
    }

    // Show Termux environment info if detected
    if (isTermux()) {
      console.log(ansis.yellow(`\nℹ ${i18n.t('installation:termuxDetected')}`))
      console.log(ansis.gray(i18n.t('installation:termuxEnvironmentInfo')))
    }

    // Step 2.1: Select config language with intelligent detection (skip duplicate prompts for Codex)
    let configLang = options.configLang
    if (codeToolType === 'codex') {
      if (!configLang) {
        if (options.skipPrompt) {
          configLang = zcfConfig?.templateLang || 'en'
        }
        else {
          configLang = zcfConfig?.templateLang || (i18n.language as SupportedLang) || 'en'
        }
      }
    }
    else {
      if (!configLang) {
        const { resolveTemplateLanguage } = await import('../utils/prompts')
        configLang = await resolveTemplateLanguage(
          options.configLang,
          zcfConfig,
          options.skipPrompt,
        )
      }
    }

    if (!configLang) {
      configLang = 'en'
    }

    if (codeToolType === 'codex') {
      // Map InitOptions to CodexFullInitOptions
      const apiMode = options.apiType === 'auth_token'
        ? 'official'
        : options.apiType === 'api_key'
          ? 'custom'
          : options.apiType === 'skip'
            ? 'skip'
            : options.skipPrompt ? 'skip' : undefined

      const customApiConfig = options.apiType === 'api_key' && options.apiKey
        ? {
            type: 'api_key' as const,
            token: options.apiKey,
            baseUrl: options.apiUrl,
          }
        : undefined

      // Convert workflows parameter to string array
      let selectedWorkflows: string[] | undefined
      if (Array.isArray(options.workflows)) {
        selectedWorkflows = options.workflows
      }
      else if (typeof options.workflows === 'string') {
        selectedWorkflows = [options.workflows]
      }
      else if (options.workflows === true) {
        selectedWorkflows = [] // Empty array means install all workflows
      }

      const resolvedAiOutputLang = await runCodexFullInit({
        aiOutputLang: options.aiOutputLang,
        skipPrompt: options.skipPrompt,
        apiMode,
        customApiConfig,
        workflows: selectedWorkflows,
      })
      updateZcfConfig({
        version,
        preferredLang: i18n.language as SupportedLang, // ZCF界面语言
        templateLang: configLang, // 模板语言
        aiOutputLang: resolvedAiOutputLang
          ?? options.aiOutputLang
          ?? zcfConfig?.aiOutputLang
          ?? 'en',
        codeToolType,
      })
      console.log(ansis.green(i18n.t('codex:setupComplete')))
      return
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
            await installClaudeCode()
            console.log(ansis.green(`✔ ${i18n.t('installation:globalInstallationCompleted')}`))
          }

          // Always remove local installation in skip-prompt mode
          if (installationStatus.hasGlobal && installationStatus.hasLocal) {
            console.log(ansis.yellow(`⚠️  ${i18n.t('installation:multipleInstallationsDetected')}`))
          }
          console.log(ansis.blue(`${i18n.t('installation:removingLocalInstallation')}...`))
          const { removeLocalClaudeCode } = await import('../utils/installer')
          await removeLocalClaudeCode()
          console.log(ansis.green(`✔ ${i18n.t('installation:localInstallationRemoved')}`))
        }
        // If only global exists, no action needed
      }
    }
    else {
      // No installation found - install Claude Code
      if (options.skipPrompt) {
        // In skip-prompt mode, auto-install Claude Code
        await installClaudeCode()
      }
      else {
        const { shouldInstall } = await inquirer.prompt<{ shouldInstall: boolean }>({
          type: 'confirm',
          name: 'shouldInstall',
          message: i18n.t('installation:installPrompt'),
          default: true,
        })

        if (shouldInstall === undefined) {
          console.log(ansis.yellow(i18n.t('common:cancelled')))
          process.exit(0)
        }

        if (shouldInstall) {
          await installClaudeCode()
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
          await handleMultiConfigurations(options, codeToolType)
          apiConfig = null // Multi-config handles its own API configuration
        }
        else if (options.apiType === 'auth_token' && options.apiKey) {
          apiConfig = {
            authType: 'auth_token',
            key: options.apiKey,
            url: options.apiUrl || 'https://api.anthropic.com',
          }
        }
        else if (options.apiType === 'api_key' && options.apiKey) {
          apiConfig = {
            authType: 'api_key',
            key: options.apiKey,
            url: options.apiUrl || 'https://api.anthropic.com',
          }
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

    // Step 10: Configure MCP services (skip if only updating docs)
    if (action !== 'docs-only') {
      let shouldConfigureMcp = false

      if (options.skipPrompt) {
        // In skip-prompt mode, configure MCP only if services are not explicitly disabled
        shouldConfigureMcp = options.mcpServices !== false
      }
      else {
        const { shouldConfigureMcp: userChoice } = await inquirer.prompt<{ shouldConfigureMcp: boolean }>({
          type: 'confirm',
          name: 'shouldConfigureMcp',
          message: i18n.t('mcp:configureMcp'),
          default: true,
        })

        if (userChoice === undefined) {
          console.log(ansis.yellow(i18n.t('common:cancelled')))
          process.exit(0)
        }

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

            // Handle services that require API key
            if (service.requiresApiKey) {
              if (options.skipPrompt) {
                // In skip-prompt mode, skip services that require API keys
                console.log(ansis.yellow(`${i18n.t('common:skip')}: ${service.name} (requires API key)`))
                continue
              }
              else {
                const response = await inquirer.prompt<{ apiKey: string }>({
                  type: 'password',
                  name: 'apiKey',
                  message: service.apiKeyPrompt! + i18n.t('common:inputHidden'),
                  validate: value => !!value || i18n.t('api:keyRequired'),
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
        const { shouldInstallCometix: userChoice } = await inquirer.prompt<{ shouldInstallCometix: boolean }>({
          type: 'confirm',
          name: 'shouldInstallCometix',
          message: i18n.t('cometix:installCometixPrompt'),
          default: true,
        })

        if (userChoice === undefined) {
          console.log(ansis.yellow(i18n.t('common:cancelled')))
          process.exit(0)
        }

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
      codeToolType,
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
 * @param codeToolType - Target code tool type
 */
export async function handleMultiConfigurations(options: InitOptions, codeToolType: 'claude-code' | 'codex'): Promise<void> {
  const { ensureI18nInitialized } = await import('../i18n')
  ensureI18nInitialized()

  try {
    let configs: ApiConfigDefinition[] = []

    // Parse API configurations from JSON string
    if (options.apiConfigs) {
      try {
        configs = JSON.parse(options.apiConfigs) as ApiConfigDefinition[]
      }
      catch (error) {
        throw new Error(`Invalid API configs JSON: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    // Parse API configurations from file
    if (options.apiConfigsFile) {
      try {
        const { readFile } = await import('../utils/fs-operations')
        const fileContent = readFile(options.apiConfigsFile)
        configs = JSON.parse(fileContent) as ApiConfigDefinition[]
      }
      catch (error) {
        throw new Error(`Failed to read API configs file: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    // Validate configurations
    validateApiConfigs(configs)

    // Process configurations based on code tool type
    if (codeToolType === 'claude-code') {
      await handleClaudeCodeConfigs(configs)
    }
    else if (codeToolType === 'codex') {
      await handleCodexConfigs(configs)
    }

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
export function validateApiConfigs(configs: ApiConfigDefinition[]): void {
  if (!Array.isArray(configs)) {
    throw new TypeError('API configs must be an array')
  }

  const names = new Set<string>()

  for (const config of configs) {
    // Validate required fields
    if (!config.name || typeof config.name !== 'string' || config.name.trim() === '') {
      throw new Error('Each config must have a valid name')
    }

    if (!['api_key', 'auth_token', 'ccr_proxy'].includes(config.type)) {
      throw new Error(`Invalid auth type: ${config.type}`)
    }

    // Validate name uniqueness
    if (names.has(config.name)) {
      throw new Error(`Duplicate config name: ${config.name}`)
    }
    names.add(config.name)

    // Validate API key for non-CCR types
    if (config.type !== 'ccr_proxy' && !config.key) {
      throw new Error(`Config "${config.name}" requires API key`)
    }
  }
}

/**
 * Handle Claude Code API configurations
 * @param configs - Array of API configurations
 */
async function handleClaudeCodeConfigs(configs: ApiConfigDefinition[]): Promise<void> {
  const { ClaudeCodeConfigManager } = await import('../utils/claude-code-config-manager')
  const addedProfiles: ClaudeCodeProfile[] = []

  for (const config of configs) {
    if (config.type === 'ccr_proxy') {
      throw new Error(`CCR proxy type is reserved and cannot be added manually (config: "${config.name}")`)
    }

    const profile = await convertToClaudeCodeProfile(config)
    const result = await ClaudeCodeConfigManager.addProfile(profile)

    if (!result.success) {
      throw new Error(`Failed to add profile "${config.name}": ${result.error}`)
    }

    const storedProfile = result.addedProfile
      || ClaudeCodeConfigManager.getProfileByName(config.name)
      || profile
    addedProfiles.push(storedProfile)

    console.log(ansis.green(`✔ ${i18n.t('multi-config:profileAdded', { name: config.name })}`))
  }

  if (addedProfiles.length > 0) {
    const summary = addedProfiles
      .map(profile => `${profile.name} [${profile.authType}]`)
      .join(', ')
    console.log(ansis.gray(`  • ${ClaudeCodeConfigManager.CONFIG_FILE}: ${summary}`))
  }

  // Set default profile if specified
  const defaultConfig = configs.find(c => c.default)
  if (defaultConfig) {
    const profile = addedProfiles.find(p => p.name === defaultConfig.name)
      || ClaudeCodeConfigManager.getProfileByName(defaultConfig.name)
    if (profile && profile.id) {
      await ClaudeCodeConfigManager.switchProfile(profile.id)
      await ClaudeCodeConfigManager.applyProfileSettings(profile)
      console.log(ansis.green(`✔ ${i18n.t('multi-config:defaultProfileSet', { name: defaultConfig.name })}`))
    }
  }

  // Sync CCR configuration if needed
  await ClaudeCodeConfigManager.syncCcrProfile()
}

/**
 * Handle Codex API configurations
 * @param configs - Array of API configurations
 */
async function handleCodexConfigs(configs: ApiConfigDefinition[]): Promise<void> {
  // Import Codex provider management functions
  const { addProviderToExisting } = await import('../utils/code-tools/codex-provider-manager')

  for (const config of configs) {
    try {
      const provider = convertToCodexProvider(config)
      const result = await addProviderToExisting(provider, config.key || '')

      if (!result.success) {
        throw new Error(`Failed to add provider "${config.name}": ${result.error}`)
      }

      console.log(ansis.green(`✔ ${i18n.t('multi-config:providerAdded', { name: config.name })}`))
    }
    catch (error) {
      console.error(ansis.red(`Failed to add provider "${config.name}": ${error instanceof Error ? error.message : String(error)}`))
      throw error
    }
  }

  // Set default provider if specified
  const defaultConfig = configs.find(c => c.default)
  if (defaultConfig) {
    // Import and call Codex provider switching function
    const { switchCodexProvider } = await import('../utils/code-tools/codex')
    await switchCodexProvider(defaultConfig.name)
    console.log(ansis.green(`✔ ${i18n.t('multi-config:defaultProviderSet', { name: defaultConfig.name })}`))
  }
}

/**
 * Convert API config definition to Claude Code profile
 * @param config - API configuration definition
 */
async function convertToClaudeCodeProfile(config: ApiConfigDefinition): Promise<ClaudeCodeProfile> {
  const { ClaudeCodeConfigManager } = await import('../utils/claude-code-config-manager')

  const profile: ClaudeCodeProfile = {
    name: config.name,
    authType: config.type,
    apiKey: config.key,
    baseUrl: config.url,
    id: ClaudeCodeConfigManager.generateProfileId(config.name),
  }

  return profile
}

/**
 * Convert API config definition to Codex provider
 * @param config - API configuration definition
 */
function convertToCodexProvider(config: ApiConfigDefinition): CodexProvider {
  return {
    id: config.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    name: config.name,
    baseUrl: config.url || 'https://api.anthropic.com',
    wireApi: 'chat' as const,
    envKey: 'ANTHROPIC_API_KEY',
    requiresOpenaiAuth: false,
  }
}
