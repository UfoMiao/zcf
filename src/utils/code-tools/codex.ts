import type { SupportedLang } from '../../constants'
import type { CodexUninstallItem, CodexUninstallResult } from './codex-uninstaller'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import ansis from 'ansis'
import dayjs from 'dayjs'
import inquirer from 'inquirer'
import { load } from 'js-toml'
import { dirname, join } from 'pathe'
import semver from 'semver'
import { x } from 'tinyexec'
import { getMcpServices, MCP_SERVICE_CONFIGS } from '../../config/mcp-services'
import { ensureI18nInitialized, i18n } from '../../i18n'
import { applyAiLanguageDirective } from '../config'
import { copyDir, copyFile, ensureDir, exists, readFile, writeFile } from '../fs-operations'
import { readJsonConfig, writeJsonConfig } from '../json-config'
import { selectMcpServices } from '../mcp-selector'
import { isWindows } from '../platform'
import { addNumbersToChoices } from '../prompt-helpers'
import { resolveAiOutputLanguage } from '../prompts'
import { readZcfConfig, updateZcfConfig } from '../zcf-config'
import { detectConfigManagementMode } from './codex-config-detector'

const CODEX_DIR = join(homedir(), '.codex')
const CODEX_CONFIG_FILE = join(CODEX_DIR, 'config.toml')
const CODEX_AUTH_FILE = join(CODEX_DIR, 'auth.json')
const CODEX_AGENTS_FILE = join(CODEX_DIR, 'AGENTS.md')
const CODEX_PROMPTS_DIR = join(CODEX_DIR, 'prompts')

export interface CodexProvider {
  id: string
  name: string
  baseUrl: string
  wireApi: string
  envKey: string
  requiresOpenaiAuth: boolean
}

export interface CodexMcpService {
  id: string
  command: string
  args: string[]
  env?: Record<string, string>
  startup_timeout_ms?: number
}

export interface CodexConfigData {
  modelProvider: string | null
  providers: CodexProvider[]
  mcpServices: CodexMcpService[]
  managed: boolean
  otherConfig?: string[] // Lines that are not managed by ZCF
  modelProviderCommented?: boolean // Whether model_provider line should be commented out
}

function getRootDir(): string {
  const currentFilePath = fileURLToPath(import.meta.url)
  let dir = dirname(currentFilePath)

  while (dir !== dirname(dir)) {
    if (exists(join(dir, 'templates'))) {
      return dir
    }
    dir = dirname(dir)
  }

  return dirname(currentFilePath)
}

/**
 * Core function to install/update Codex CLI via npm
 * @param isUpdate - Whether this is an update (true) or fresh install (false)
 */
async function executeCodexInstallation(isUpdate: boolean): Promise<void> {
  const action = isUpdate ? 'update' : 'install'

  if (isUpdate) {
    console.log(ansis.cyan(i18n.t('codex:updatingCli')))
  }
  else {
    console.log(ansis.cyan(i18n.t('codex:installingCli')))
  }

  const result = await x('npm', ['install', '-g', '@openai/codex'])
  if (result.exitCode !== 0) {
    throw new Error(`Failed to ${action} codex CLI: exit code ${result.exitCode}`)
  }

  if (isUpdate) {
    console.log(ansis.green(i18n.t('codex:updateSuccess')))
  }
  else {
    console.log(ansis.green(i18n.t('codex:installSuccess')))
  }
}

/**
 * Get standardized uninstall options for custom uninstall mode
 */
function getUninstallOptions(): Array<{ name: string, value: CodexUninstallItem }> {
  return [
    { name: i18n.t('codex:uninstallItemConfig'), value: 'config' },
    { name: i18n.t('codex:uninstallItemAuth'), value: 'auth' },
    { name: i18n.t('codex:uninstallItemApiConfig'), value: 'api-config' },
    { name: i18n.t('codex:uninstallItemMcpConfig'), value: 'mcp-config' },
    { name: i18n.t('codex:uninstallItemSystemPrompt'), value: 'system-prompt' },
    { name: i18n.t('codex:uninstallItemWorkflow'), value: 'workflow' },
    { name: i18n.t('codex:uninstallItemCliPackage'), value: 'cli-package' },
    { name: i18n.t('codex:uninstallItemBackups'), value: 'backups' },
  ]
}

/**
 * Handle cancellation message display
 */
function handleUninstallCancellation(): void {
  console.log(ansis.yellow(i18n.t('codex:uninstallCancelled')))
}

export function createBackupDirectory(timestamp: string): string {
  const backupBaseDir = join(CODEX_DIR, 'backup')
  const backupDir = join(backupBaseDir, `backup_${timestamp}`)
  ensureDir(backupDir)
  return backupDir
}

export function backupCodexFiles(): string | null {
  if (!exists(CODEX_DIR))
    return null

  const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss')
  const backupDir = createBackupDirectory(timestamp)

  const filter = (path: string): boolean => {
    return !path.includes('/backup')
  }

  copyDir(CODEX_DIR, backupDir, { filter })
  return backupDir
}

export function backupCodexConfig(): string | null {
  if (!exists(CODEX_CONFIG_FILE))
    return null

  try {
    const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss')
    const backupDir = createBackupDirectory(timestamp)
    const backupPath = join(backupDir, 'config.toml')
    copyFile(CODEX_CONFIG_FILE, backupPath)
    return backupPath
  }
  catch {
    return null
  }
}

export function backupCodexAgents(): string | null {
  if (!exists(CODEX_AGENTS_FILE))
    return null

  try {
    const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss')
    const backupDir = createBackupDirectory(timestamp)
    const backupPath = join(backupDir, 'AGENTS.md')
    copyFile(CODEX_AGENTS_FILE, backupPath)
    return backupPath
  }
  catch {
    return null
  }
}

export function backupCodexPrompts(): string | null {
  if (!exists(CODEX_PROMPTS_DIR))
    return null

  try {
    const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss')
    const backupDir = createBackupDirectory(timestamp)
    const backupPath = join(backupDir, 'prompts')
    copyDir(CODEX_PROMPTS_DIR, backupPath)
    return backupPath
  }
  catch {
    return null
  }
}

export function getBackupMessage(path: string | null): string {
  if (!path)
    return ''

  ensureI18nInitialized()
  return i18n.t('codex:backupSuccess', { path })
}

function sanitizeProviderName(input: string): string {
  const cleaned = input.trim()
  if (!cleaned)
    return ''
  return cleaned.replace(/[^\w.-]/g, '')
}

export function parseCodexConfig(content: string): CodexConfigData {
  // Handle empty content
  if (!content.trim()) {
    return {
      modelProvider: null,
      providers: [],
      mcpServices: [],
      managed: false,
      otherConfig: [],
      modelProviderCommented: undefined,
    }
  }

  try {
    // Parse TOML using js-toml
    const tomlData = load(content) as any

    // Extract providers from [model_providers.*] sections
    const providers: CodexProvider[] = []
    if (tomlData.model_providers) {
      for (const [id, providerData] of Object.entries(tomlData.model_providers)) {
        const provider = providerData as any
        providers.push({
          id,
          name: provider.name || id,
          baseUrl: provider.base_url || '',
          wireApi: provider.wire_api || 'responses',
          envKey: provider.env_key || 'OPENAI_API_KEY',
          requiresOpenaiAuth: provider.requires_openai_auth !== false,
        })
      }
    }

    // Extract MCP services from [mcp_servers.*] sections
    const mcpServices: CodexMcpService[] = []
    if (tomlData.mcp_servers) {
      for (const [id, mcpData] of Object.entries(tomlData.mcp_servers)) {
        const mcp = mcpData as any
        mcpServices.push({
          id,
          command: mcp.command || id,
          args: mcp.args || [],
          env: Object.keys(mcp.env || {}).length > 0 ? mcp.env : undefined,
          startup_timeout_ms: mcp.startup_timeout_ms,
        })
      }
    }

    // Check for model_provider (both commented and uncommented) from original content
    // We need to detect global model_provider from text because TOML parser might
    // incorrectly assign it to a section if it appears after a section header
    let modelProvider: string | null = null
    let modelProviderCommented: boolean | undefined

    // First check for commented model_provider
    const commentedMatch = content.match(/^(\s*)#\s*model_provider\s*=\s*"([^"]+)"/m)
    if (commentedMatch) {
      modelProvider = commentedMatch[2]
      modelProviderCommented = true
    }
    else {
      // Check for uncommented global model_provider
      // Look for model_provider that's not inside a section
      const lines = content.split('\n')
      let inSection = false

      for (const line of lines) {
        const trimmedLine = line.trim()

        // Skip empty lines
        if (!trimmedLine) {
          continue
        }

        // Check if we're entering a section
        if (trimmedLine.startsWith('[')) {
          inSection = true
          continue
        }

        // Skip comments (but reset inSection flag for non-section content)
        if (trimmedLine.startsWith('#')) {
          // Comments break section context - this allows for global config after comments
          if (trimmedLine.includes('--- model provider added by ZCF ---')) {
            inSection = false // ZCF comments mark global config area
          }
          continue
        }

        // If we find model_provider outside a section, it's global
        if (!inSection && trimmedLine.startsWith('model_provider')) {
          const match = trimmedLine.match(/model_provider\s*=\s*"([^"]+)"/)
          if (match) {
            modelProvider = match[1]
            modelProviderCommented = false
            break
          }
        }
      }
    }

    // Preserve other configuration sections (not managed by ZCF)
    const otherConfig: string[] = []
    const lines = content.split('\n')
    let skipCurrentSection = false
    let currentSection = ''

    for (const line of lines) {
      const trimmedLine = line.trim()

      // Skip ZCF managed comments
      if (trimmedLine.includes('--- model provider added by ZCF ---')
        || trimmedLine.includes('--- MCP servers added by ZCF ---')
        || trimmedLine.includes('Managed by ZCF')) {
        continue
      }

      // Detect section headers
      const sectionMatch = trimmedLine.match(/^\[([^\]]+)\]/)
      if (sectionMatch) {
        currentSection = sectionMatch[1]
        // Skip ZCF managed sections
        skipCurrentSection = currentSection.startsWith('model_providers.')
          || currentSection.startsWith('mcp_servers.')
      }

      // Skip model_provider line (managed by ZCF) only if we're not in a section
      if (!skipCurrentSection && (trimmedLine.startsWith('model_provider') || trimmedLine.startsWith('# model_provider'))) {
        continue
      }

      // Collect lines that are not in ZCF managed sections
      if (!skipCurrentSection && trimmedLine) {
        otherConfig.push(line)
      }
    }

    const managed = providers.length > 0 || mcpServices.length > 0 || modelProvider !== null

    return {
      modelProvider,
      providers,
      mcpServices,
      managed,
      otherConfig,
      modelProviderCommented,
    }
  }
  catch (error) {
    // Fallback to basic parsing if TOML parsing fails
    console.warn('TOML parsing failed, falling back to basic parsing:', error)
    return {
      modelProvider: null,
      providers: [],
      mcpServices: [],
      managed: false,
      otherConfig: content.split('\n'),
      modelProviderCommented: undefined,
    }
  }
}

export function readCodexConfig(): CodexConfigData | null {
  if (!exists(CODEX_CONFIG_FILE))
    return null

  try {
    const content = readFile(CODEX_CONFIG_FILE)
    return parseCodexConfig(content)
  }
  catch {
    return null
  }
}

export function renderCodexConfig(data: CodexConfigData): string {
  const lines: string[] = []

  // CRITICAL: Add ZCF global configuration FIRST to ensure it's truly global
  // This prevents TOML parser from incorrectly assigning global keys to sections
  if (data.modelProvider || data.providers.length > 0 || data.modelProviderCommented) {
    lines.push('# --- model provider added by ZCF ---')

    if (data.modelProvider) {
      const commentPrefix = data.modelProviderCommented ? '# ' : ''
      lines.push(`${commentPrefix}model_provider = "${data.modelProvider}"`)
    }

    // Add blank line after global config
    lines.push('')
  }

  // Add preserved non-ZCF configuration after global config
  if (data.otherConfig && data.otherConfig.length > 0) {
    lines.push(...data.otherConfig)
    // Add blank line only if we have sections to add
    if (data.providers.length > 0 || data.mcpServices.length > 0) {
      lines.push('')
    }
  }

  // Add model providers sections
  if (data.providers.length > 0) {
    for (const provider of data.providers) {
      lines.push('')
      lines.push(`[model_providers.${provider.id}]`)
      lines.push(`name = "${provider.name}"`)
      lines.push(`base_url = "${provider.baseUrl}"`)
      lines.push(`wire_api = "${provider.wireApi}"`)
      lines.push(`env_key = "${provider.envKey}"`)
      lines.push(`requires_openai_auth = ${provider.requiresOpenaiAuth}`)
    }
  }

  // Add MCP servers sections
  if (data.mcpServices.length > 0) {
    lines.push('')
    lines.push('# --- MCP servers added by ZCF ---')
    for (const service of data.mcpServices) {
      lines.push(`[mcp_servers.${service.id}]`)
      lines.push(`command = "${service.command}"`)

      // Format args array
      const argsString = service.args.length > 0
        ? service.args.map(arg => `"${arg}"`).join(', ')
        : ''
      lines.push(`args = [${argsString}]`)

      // Add environment variables if present
      if (service.env && Object.keys(service.env).length > 0) {
        const envEntries = Object.entries(service.env)
          .map(([key, value]) => `${key} = "${value}"`)
          .join(', ')
        lines.push(`env = {${envEntries}}`)
      }

      // Add startup timeout if present
      if (service.startup_timeout_ms) {
        lines.push(`startup_timeout_ms = ${service.startup_timeout_ms}`)
      }

      lines.push('')
    }
    // Remove trailing blank line added by loop
    if (lines[lines.length - 1] === '') {
      lines.pop()
    }
  }

  // Ensure file ends with a newline but not multiple blank lines
  let result = lines.join('\n')
  if (result && !result.endsWith('\n')) {
    result += '\n'
  }

  return result
}

export function writeCodexConfig(data: CodexConfigData): void {
  ensureDir(CODEX_DIR)
  writeFile(CODEX_CONFIG_FILE, renderCodexConfig(data))
}

export function writeAuthFile(newEntries: Record<string, string>): void {
  ensureDir(CODEX_DIR)
  const existing = readJsonConfig<Record<string, string>>(CODEX_AUTH_FILE, { defaultValue: {} }) || {}
  const merged = { ...existing, ...newEntries }
  writeJsonConfig(CODEX_AUTH_FILE, merged, { pretty: true })
}

export async function isCodexInstalled(): Promise<boolean> {
  try {
    const result = await x('npm', ['list', '-g', '--depth=0'])
    if (result.exitCode !== 0) {
      return false
    }
    return result.stdout.includes('@openai/codex@')
  }
  catch {
    return false
  }
}

export async function getCodexVersion(): Promise<string | null> {
  try {
    const result = await x('npm', ['list', '-g', '--depth=0'])
    if (result.exitCode !== 0) {
      return null
    }

    const match = result.stdout.match(/@openai\/codex@(\S+)/)
    return match ? match[1] : null
  }
  catch {
    return null
  }
}

export async function checkCodexUpdate(): Promise<boolean> {
  try {
    const currentVersion = await getCodexVersion()
    if (!currentVersion) {
      return false
    }

    const result = await x('npm', ['view', '@openai/codex', '--json'])
    if (result.exitCode !== 0) {
      return false
    }

    const packageInfo = JSON.parse(result.stdout)
    const latestVersion = packageInfo['dist-tags']?.latest

    if (!latestVersion) {
      return false
    }

    return semver.gt(latestVersion, currentVersion)
  }
  catch {
    return false
  }
}

export async function installCodexCli(): Promise<void> {
  ensureI18nInitialized()

  // Check if already installed
  if (await isCodexInstalled()) {
    // Check for updates if already installed
    const hasUpdate = await checkCodexUpdate()
    if (hasUpdate) {
      // Update available - install new version
      await executeCodexInstallation(true)
      return
    }
    else {
      // No updates, skip installation
      console.log(ansis.yellow(i18n.t('codex:alreadyInstalled')))
      return
    }
  }

  // Not installed - install new
  await executeCodexInstallation(false)
}

export async function runCodexWorkflowImport(): Promise<void> {
  ensureI18nInitialized()
  await runCodexSystemPromptSelection()
  await runCodexWorkflowSelection()
  console.log(ansis.green(i18n.t('codex:workflowInstall')))
}

/**
 * Run Codex workflow import with language selection (AI output language + system prompt + workflow)
 * Reuses Claude Code's language selection functionality
 */
export async function runCodexWorkflowImportWithLanguageSelection(): Promise<void> {
  ensureI18nInitialized()

  // Step 1: Select AI output language (uses global config memory)
  const zcfConfig = readZcfConfig()
  const aiOutputLang = await resolveAiOutputLanguage(
    i18n.language as SupportedLang,
    undefined, // No command line option
    zcfConfig,
  )

  // Step 2: Save AI output language to global config
  updateZcfConfig({ aiOutputLang })
  applyAiLanguageDirective(aiOutputLang)

  // Step 3: Continue with original workflow (system prompt + workflow selection)
  await runCodexSystemPromptSelection()
  await runCodexWorkflowSelection()
  console.log(ansis.green(i18n.t('codex:workflowInstall')))
}

export async function runCodexSystemPromptSelection(): Promise<void> {
  ensureI18nInitialized()
  const rootDir = getRootDir()
  const templateRoot = join(rootDir, 'templates', 'codex')

  // Read both legacy and new config formats
  const zcfConfig = readZcfConfig()
  const { readDefaultTomlConfig } = await import('../zcf-config')
  const tomlConfig = readDefaultTomlConfig()

  // Use intelligent template language selection
  const { resolveTemplateLanguage } = await import('../prompts')
  const preferredLang = await resolveTemplateLanguage(
    undefined, // No command line option for this function
    zcfConfig,
  )

  let langDir = join(templateRoot, preferredLang)

  if (!exists(langDir))
    langDir = join(templateRoot, 'zh-CN')

  const systemPromptSrc = join(langDir, 'system-prompt')
  if (!exists(systemPromptSrc))
    return

  // Available system prompt styles (same as Claude Code output styles)
  const availablePrompts = [
    {
      id: 'engineer-professional',
      name: i18n.t('configuration:outputStyles.engineer-professional.name'),
      description: i18n.t('configuration:outputStyles.engineer-professional.description'),
    },
    {
      id: 'laowang-engineer',
      name: i18n.t('configuration:outputStyles.laowang-engineer.name'),
      description: i18n.t('configuration:outputStyles.laowang-engineer.description'),
    },
    {
      id: 'nekomata-engineer',
      name: i18n.t('configuration:outputStyles.nekomata-engineer.name'),
      description: i18n.t('configuration:outputStyles.nekomata-engineer.description'),
    },
  ].filter(style => exists(join(systemPromptSrc, `${style.id}.md`)))

  if (availablePrompts.length === 0)
    return

  // Use the new intelligent detection function
  const { resolveSystemPromptStyle } = await import('../prompts')
  const systemPrompt = await resolveSystemPromptStyle(
    availablePrompts,
    undefined, // No command line option for this function
    tomlConfig,
  )

  if (!systemPrompt)
    return

  // Read selected system prompt file
  const promptFile = join(systemPromptSrc, `${systemPrompt}.md`)
  const content = readFile(promptFile)

  // Ensure CODEX directory exists
  ensureDir(CODEX_DIR)

  // Create backup before modifying AGENTS.md
  const backupPath = backupCodexAgents()
  if (backupPath) {
    console.log(ansis.gray(getBackupMessage(backupPath)))
  }

  // Write to AGENTS.md
  writeFile(CODEX_AGENTS_FILE, content)

  // Update ZCF configuration to save the selected system prompt style
  try {
    const { updateTomlConfig } = await import('../zcf-config')
    const { ZCF_CONFIG_FILE } = await import('../../constants')

    updateTomlConfig(ZCF_CONFIG_FILE, {
      codex: {
        systemPromptStyle: systemPrompt,
      },
    } as any) // Use any to bypass type checking temporarily
  }
  catch (error) {
    // Silently handle config update failure - the main functionality (writing AGENTS.md) has succeeded
    console.error('Failed to update ZCF config:', error)
  }
}

export async function runCodexWorkflowSelection(): Promise<void> {
  ensureI18nInitialized()
  const rootDir = getRootDir()
  const templateRoot = join(rootDir, 'templates', 'codex')

  const zcfConfig = readZcfConfig()
  // Use templateLang with fallback to preferredLang for backward compatibility
  const templateLang = zcfConfig?.templateLang || zcfConfig?.preferredLang || 'en'
  const preferredLang = templateLang === 'en' ? 'en' : 'zh-CN'
  let langDir = join(templateRoot, preferredLang)

  if (!exists(langDir))
    langDir = join(templateRoot, 'zh-CN')

  const workflowSrc = join(langDir, 'workflow')
  if (!exists(workflowSrc))
    return

  // Get available workflow files (recursively)
  const allWorkflows = getAllWorkflowFiles(workflowSrc)

  if (allWorkflows.length === 0)
    return

  // Prompt user to select workflows (multi-select, default all selected)
  const { workflows } = await inquirer.prompt<{ workflows: string[] }>([{
    type: 'checkbox',
    name: 'workflows',
    message: i18n.t('codex:workflowSelectionPrompt'),
    choices: addNumbersToChoices(allWorkflows.map(workflow => ({
      name: workflow.name,
      value: workflow.path,
      checked: true, // Default all selected
    }))),
  }])

  if (!workflows || workflows.length === 0)
    return

  // Ensure prompts directory exists
  ensureDir(CODEX_PROMPTS_DIR)

  // Create backup before modifying prompts directory
  const backupPath = backupCodexPrompts()
  if (backupPath) {
    console.log(ansis.gray(getBackupMessage(backupPath)))
  }

  // Copy selected workflow files to prompts directory (flattened)
  for (const workflowPath of workflows) {
    const content = readFile(workflowPath)
    const filename = workflowPath.split('/').pop() || 'workflow.md'
    const targetPath = join(CODEX_PROMPTS_DIR, filename)
    writeFile(targetPath, content)
  }
}

function getAllWorkflowFiles(dirPath: string): Array<{ name: string, path: string }> {
  const workflows: Array<{ name: string, path: string }> = []

  // This is a simplified implementation for TDD
  // In production, we would recursively scan directories
  const sixStepDir = join(dirPath, 'sixStep', 'prompts')
  if (exists(sixStepDir)) {
    const workflowFile = join(sixStepDir, 'workflow.md')
    if (exists(workflowFile)) {
      workflows.push({
        name: i18n.t('workflow:workflowOption.sixStepsWorkflow'),
        path: workflowFile,
      })
    }
  }

  return workflows
}

function toProvidersList(providers: CodexProvider[]): Array<{ name: string, value: string }> {
  return providers.map(provider => ({ name: provider.name || provider.id, value: provider.id }))
}

/**
 * Create API configuration choices for inquirer (official login + providers)
 * @param providers - List of providers
 * @param currentProvider - Currently active provider ID
 * @param isCommented - Whether the current provider is commented out
 * @returns Array of formatted choices for inquirer
 */

function createApiConfigChoices(providers: CodexProvider[], currentProvider?: string | null, isCommented?: boolean): Array<{ name: string, value: string }> {
  const choices: Array<{ name: string, value: string }> = []

  // Add official login option first
  const isOfficialMode = !currentProvider || isCommented
  choices.push({
    name: isOfficialMode
      ? `${ansis.green('● ')}${i18n.t('codex:useOfficialLogin')} ${ansis.yellow('(当前)')}`
      : `  ${i18n.t('codex:useOfficialLogin')}`,
    value: 'official',
  })

  // Add provider options
  providers.forEach((provider) => {
    const isCurrent = currentProvider === provider.id && !isCommented
    choices.push({
      name: isCurrent
        ? `${ansis.green('● ')}${provider.name} - ${ansis.gray(provider.id)} ${ansis.yellow('(当前)')}`
        : `  ${provider.name} - ${ansis.gray(provider.id)}`,
      value: provider.id,
    })
  })

  return choices
}

export async function configureCodexApi(): Promise<void> {
  ensureI18nInitialized()
  const existingConfig = readCodexConfig()

  // Check if there are existing providers for switch option
  const hasProviders = existingConfig?.providers && existingConfig.providers.length > 0

  const modeChoices = [
    { name: i18n.t('codex:apiModeOfficial'), value: 'official' },
    { name: i18n.t('codex:apiModeCustom'), value: 'custom' },
  ]

  // Add switch option if providers exist
  if (hasProviders) {
    modeChoices.push({ name: i18n.t('codex:configSwitchMode'), value: 'switch' })
  }

  const { mode } = await inquirer.prompt<{ mode: 'official' | 'custom' | 'switch' }>([{
    type: 'list',
    name: 'mode',
    message: i18n.t('codex:apiModePrompt'),
    choices: addNumbersToChoices(modeChoices),
    default: 'custom',
  }])

  if (!mode) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return
  }

  if (mode === 'official') {
    // Use new official login logic - preserve providers but comment model_provider
    const success = await switchToOfficialLogin()
    if (success) {
      updateZcfConfig({ codeToolType: 'codex' })
    }
    return
  }

  if (mode === 'switch') {
    // Switch API config mode - includes official login and providers
    if (!hasProviders) {
      console.log(ansis.yellow(i18n.t('codex:noProvidersAvailable')))
      return
    }

    const currentProvider = existingConfig?.modelProvider
    const isCommented = existingConfig?.modelProviderCommented
    const choices = createApiConfigChoices(existingConfig!.providers, currentProvider, isCommented)

    const { selectedConfig } = await inquirer.prompt<{ selectedConfig: string }>([{
      type: 'list',
      name: 'selectedConfig',
      message: i18n.t('codex:apiConfigSwitchPrompt'),
      choices: addNumbersToChoices(choices),
    }])

    if (!selectedConfig) {
      console.log(ansis.yellow(i18n.t('common:cancelled')))
      return
    }

    let success = false
    if (selectedConfig === 'official') {
      success = await switchToOfficialLogin()
    }
    else {
      success = await switchToProvider(selectedConfig)
    }

    if (success) {
      updateZcfConfig({ codeToolType: 'codex' })
    }
    return
  }

  // Custom API configuration mode - check if we should use incremental management
  const managementMode = detectConfigManagementMode()

  if (managementMode.mode === 'management' && managementMode.hasProviders) {
    // Use incremental management for existing configurations
    const { default: { configureIncrementalManagement } } = await import('./codex-config-switch')
    await configureIncrementalManagement()
    return
  }

  // Always backup existing config before modification
  const backupPath = backupCodexConfig()
  if (backupPath) {
    console.log(ansis.gray(getBackupMessage(backupPath)))
  }

  const providers: CodexProvider[] = []
  const authEntries: Record<string, string> = {}
  const existingMap = new Map(existingConfig?.providers.map(provider => [provider.id, provider]))
  const currentSessionProviders = new Map<string, CodexProvider>()

  let addMore = true
  const existingValues = existingMap.size ? Array.from(existingMap.values()) : []
  const firstExisting = existingValues.length === 1 ? existingValues[0] : undefined

  while (addMore) {
    const answers = await inquirer.prompt<{ providerName: string, baseUrl: string, wireApi: string, apiKey: string }>([
      {
        type: 'input',
        name: 'providerName',
        message: i18n.t('codex:providerNamePrompt'),
        default: firstExisting?.name,
        validate: (input: string) => {
          const sanitized = sanitizeProviderName(input)
          if (!sanitized)
            return i18n.t('codex:providerNameRequired')
          if (sanitized !== input.trim())
            return i18n.t('codex:providerNameInvalid')
          return true
        },
      },
      {
        type: 'input',
        name: 'baseUrl',
        message: i18n.t('codex:providerBaseUrlPrompt'),
        default: (answers: any) => existingMap.get(answers.providerId)?.baseUrl || 'https://api.openai.com/v1',
        validate: input => !!input || i18n.t('codex:providerBaseUrlRequired'),
      },
      {
        type: 'list',
        name: 'wireApi',
        message: i18n.t('codex:providerProtocolPrompt'),
        choices: [
          { name: i18n.t('codex:protocolResponses'), value: 'responses' },
          { name: i18n.t('codex:protocolChat'), value: 'chat' },
        ],
        default: (answers: any) => existingMap.get(sanitizeProviderName(answers.providerName))?.wireApi || 'responses',
      },
      {
        type: 'password',
        name: 'apiKey',
        message: i18n.t('codex:providerApiKeyPrompt') + i18n.t('common:inputHidden'),
        validate: input => !!input || i18n.t('codex:providerApiKeyRequired'),
      },
    ])

    const providerId = sanitizeProviderName(answers.providerName)
    const envKey = `${providerId.toUpperCase().replace(/-/g, '_')}_API_KEY`

    // Check for duplicate names
    const existingProvider = existingMap.get(providerId)
    const sessionProvider = currentSessionProviders.get(providerId)

    if (existingProvider || sessionProvider) {
      const sourceType = existingProvider ? 'existing' : 'session'
      const sourceProvider = existingProvider || sessionProvider

      const { shouldOverwrite } = await inquirer.prompt<{ shouldOverwrite: boolean }>([{
        type: 'confirm',
        name: 'shouldOverwrite',
        message: i18n.t('codex:providerDuplicatePrompt', {
          name: sourceProvider!.name,
          source: sourceType === 'existing' ? i18n.t('codex:existingConfig') : i18n.t('codex:currentSession'),
        }),
        default: false,
      }])

      if (!shouldOverwrite) {
        console.log(ansis.yellow(i18n.t('codex:providerDuplicateSkipped')))
        continue
      }

      // Remove from session providers if overwriting session provider
      if (sessionProvider) {
        currentSessionProviders.delete(providerId)
        const sessionIndex = providers.findIndex(p => p.id === providerId)
        if (sessionIndex !== -1) {
          providers.splice(sessionIndex, 1)
        }
      }
    }

    const newProvider: CodexProvider = {
      id: providerId,
      name: answers.providerName,
      baseUrl: answers.baseUrl,
      wireApi: answers.wireApi || 'responses',
      envKey,
      requiresOpenaiAuth: true,
    }

    providers.push(newProvider)
    currentSessionProviders.set(providerId, newProvider)
    authEntries[envKey] = answers.apiKey

    const { addAnother } = await inquirer.prompt<{ addAnother: boolean }>([{
      type: 'confirm',
      name: 'addAnother',
      message: i18n.t('codex:addProviderPrompt'),
      default: false,
    }])

    addMore = addAnother
  }

  if (providers.length === 0) {
    console.log(ansis.yellow(i18n.t('codex:noProvidersConfigured')))
    return
  }

  const { defaultProvider } = await inquirer.prompt<{ defaultProvider: string }>([{
    type: 'list',
    name: 'defaultProvider',
    message: i18n.t('codex:selectDefaultProviderPrompt'),
    choices: addNumbersToChoices(toProvidersList(providers)),
    default: existingConfig?.modelProvider || providers[0].id,
  }])

  writeCodexConfig({
    modelProvider: defaultProvider,
    providers,
    mcpServices: existingConfig?.mcpServices || [],
    managed: true,
    otherConfig: existingConfig?.otherConfig || [],
  })

  writeAuthFile(authEntries)
  updateZcfConfig({ codeToolType: 'codex' })
  console.log(ansis.green(i18n.t('codex:apiConfigured')))
}

export async function configureCodexMcp(): Promise<void> {
  ensureI18nInitialized()
  const existingConfig = readCodexConfig()

  // Always backup existing config before modification
  const backupPath = backupCodexConfig()
  if (backupPath) {
    console.log(ansis.gray(getBackupMessage(backupPath)))
  }

  const selectedIds = await selectMcpServices()

  if (!selectedIds)
    return

  const servicesMeta = await getMcpServices()
  const baseProviders = existingConfig?.providers || []
  const selection: CodexMcpService[] = []
  const existingMap = new Map((existingConfig?.mcpServices || []).map(service => [service.id, service]))

  if (selectedIds.length === 0) {
    console.log(ansis.yellow(i18n.t('codex:noMcpConfigured')))
    writeCodexConfig({
      modelProvider: existingConfig?.modelProvider || null,
      providers: baseProviders,
      mcpServices: Array.from(existingMap.values()),
      managed: true,
      otherConfig: existingConfig?.otherConfig || [],
    })
    updateZcfConfig({ codeToolType: 'codex' })
    return
  }

  for (const id of selectedIds) {
    const configInfo = MCP_SERVICE_CONFIGS.find(service => service.id === id)
    if (!configInfo)
      continue

    const serviceMeta = servicesMeta.find(service => service.id === id)
    let command = configInfo.config.command || id
    const args = (configInfo.config.args || []).map(arg => String(arg))

    if (isWindows() && command === 'npx')
      command = 'npx.cmd'

    // Get environment variables from the service config
    const env = { ...(configInfo.config.env || {}) }

    // If service requires API key, prompt for it and add to env
    if (configInfo.requiresApiKey && configInfo.apiKeyEnvVar) {
      const promptMessage = serviceMeta?.apiKeyPrompt || i18n.t('mcp:apiKeyPrompt')
      const { apiKey } = await inquirer.prompt<{ apiKey: string }>([{
        type: 'password',
        name: 'apiKey',
        message: promptMessage + i18n.t('common:inputHidden'),
        validate: input => !!input || i18n.t('api:keyRequired'),
      }])

      if (!apiKey)
        continue

      // Add API key to environment variables instead of auth.json
      env[configInfo.apiKeyEnvVar] = apiKey
    }

    selection.push({
      id: id.toLowerCase(), // Convert to lowercase for Codex compatibility
      command,
      args,
      env: Object.keys(env).length > 0 ? env : undefined,
      startup_timeout_ms: configInfo.config.startup_timeout_ms,
    })
  }

  const selectionMap = new Map(selection.map(service => [service.id, service]))
  const mergedMap = new Map(existingMap)
  for (const service of selectionMap.values())
    mergedMap.set(service.id, service)

  writeCodexConfig({
    modelProvider: existingConfig?.modelProvider || null,
    providers: baseProviders,
    mcpServices: Array.from(mergedMap.values()),
    managed: true,
    otherConfig: existingConfig?.otherConfig || [],
  })

  updateZcfConfig({ codeToolType: 'codex' })
  console.log(ansis.green(i18n.t('codex:mcpConfigured')))
}

export async function runCodexFullInit(): Promise<void> {
  ensureI18nInitialized()
  await installCodexCli()
  await runCodexWorkflowImport()
  await configureCodexApi()
  await configureCodexMcp()
}

export async function runCodexUpdate(): Promise<void> {
  ensureI18nInitialized()

  // Check for Codex CLI updates
  const hasUpdate = await checkCodexUpdate()
  if (hasUpdate) {
    await executeCodexInstallation(true)
  }
  else {
    console.log(ansis.yellow(i18n.t('codex:alreadyInstalled')))
  }
}

export async function runCodexUninstall(): Promise<void> {
  ensureI18nInitialized()

  // Import CodexUninstaller dynamically to avoid circular dependency
  const { CodexUninstaller } = await import('./codex-uninstaller')
  const uninstaller = new CodexUninstaller('en') // TODO: Use actual language from config

  // Step 1: Mode selection
  const { mode } = await inquirer.prompt<{ mode: 'complete' | 'custom' | null }>([{
    type: 'list',
    name: 'mode',
    message: i18n.t('codex:uninstallModePrompt'),
    choices: addNumbersToChoices([
      { name: i18n.t('codex:uninstallModeComplete'), value: 'complete' },
      { name: i18n.t('codex:uninstallModeCustom'), value: 'custom' },
    ]),
    default: 'complete',
  }])

  if (!mode) {
    handleUninstallCancellation()
    return
  }

  try {
    if (mode === 'complete') {
      // Step 2a: Complete uninstall
      const { confirm } = await inquirer.prompt<{ confirm: boolean }>([{
        type: 'confirm',
        name: 'confirm',
        message: i18n.t('codex:uninstallPrompt'),
        default: false,
      }])

      if (!confirm) {
        handleUninstallCancellation()
        return
      }

      const result = await uninstaller.completeUninstall()
      displayUninstallResults([result])
    }
    else if (mode === 'custom') {
      // Step 2b: Custom uninstall
      const { items } = await inquirer.prompt<{ items: CodexUninstallItem[] }>([{
        type: 'checkbox',
        name: 'items',
        message: i18n.t('codex:customUninstallPrompt'),
        choices: addNumbersToChoices(getUninstallOptions()),
      }])

      if (!items || items.length === 0) {
        handleUninstallCancellation()
        return
      }

      const results = await uninstaller.customUninstall(items)
      displayUninstallResults(results)
    }

    console.log(ansis.green(i18n.t('codex:uninstallSuccess')))
  }
  catch (error: any) {
    console.error(ansis.red(`Error during uninstall: ${error.message}`))
    throw error
  }
}

/**
 * Display uninstall results with proper formatting
 */
function displayUninstallResults(results: CodexUninstallResult[]): void {
  for (const result of results) {
    // Display removed items
    for (const item of result.removed) {
      console.log(ansis.green(`✔ ${i18n.t('codex:removedItem', { item })}`))
    }

    // Display removed configurations
    for (const config of result.removedConfigs) {
      console.log(ansis.green(`✔ ${i18n.t('codex:removedConfig', { config })}`))
    }

    // Display warnings
    for (const warning of result.warnings) {
      console.log(ansis.yellow(`⚠️ ${warning}`))
    }

    // Display errors
    for (const error of result.errors) {
      console.log(ansis.red(`❌ ${error}`))
    }
  }
}

/**
 * Get current active Codex provider
 * @returns Current provider ID or null if not set
 */
export async function getCurrentCodexProvider(): Promise<string | null> {
  const config = readCodexConfig()
  return config?.modelProvider || null
}

/**
 * List all available Codex providers
 * @returns Array of available providers
 */
export async function listCodexProviders(): Promise<CodexProvider[]> {
  const config = readCodexConfig()
  return config?.providers || []
}

/**
 * Switch to a different Codex provider
 * @param providerId - ID of the provider to switch to
 * @returns True if switch was successful, false otherwise
 */
export async function switchCodexProvider(providerId: string): Promise<boolean> {
  ensureI18nInitialized()

  const existingConfig = readCodexConfig()
  if (!existingConfig) {
    console.log(ansis.red(i18n.t('codex:configNotFound')))
    return false
  }

  // Check if provider exists
  const providerExists = existingConfig.providers.some(provider => provider.id === providerId)
  if (!providerExists) {
    console.log(ansis.red(i18n.t('codex:providerNotFound', { provider: providerId })))
    return false
  }

  // Create backup before modification
  const backupPath = backupCodexConfig()
  if (backupPath) {
    console.log(ansis.gray(getBackupMessage(backupPath)))
  }

  // Update model provider
  const updatedConfig: CodexConfigData = {
    ...existingConfig,
    modelProvider: providerId,
  }

  try {
    writeCodexConfig(updatedConfig)
    console.log(ansis.green(i18n.t('codex:providerSwitchSuccess', { provider: providerId })))
    return true
  }
  catch (error) {
    console.error(ansis.red(`Error switching provider: ${(error as Error).message}`))
    return false
  }
}

/**
 * Switch to official login mode (comment out model_provider, set OPENAI_API_KEY to null)
 * @returns True if switch was successful, false otherwise
 */
export async function switchToOfficialLogin(): Promise<boolean> {
  ensureI18nInitialized()

  const existingConfig = readCodexConfig()
  if (!existingConfig) {
    console.log(ansis.red(i18n.t('codex:configNotFound')))
    return false
  }

  // Create backup before modification
  const backupPath = backupCodexConfig()
  if (backupPath) {
    console.log(ansis.gray(getBackupMessage(backupPath)))
  }

  try {
    // Comment out model_provider but keep providers configuration
    const updatedConfig: CodexConfigData = {
      ...existingConfig,
      modelProvider: existingConfig.modelProvider, // Keep the current provider value
      modelProviderCommented: true, // Mark as commented
    }

    writeCodexConfig(updatedConfig)

    // Clear auth.json for official mode - VSCode will handle authentication
    writeJsonConfig(CODEX_AUTH_FILE, {}, { pretty: true })

    console.log(ansis.green(i18n.t('codex:officialConfigured')))
    return true
  }
  catch (error) {
    console.error(ansis.red(`Error switching to official login: ${(error as Error).message}`))
    return false
  }
}

/**
 * Switch to a specific provider (uncomment model_provider, set environment variable in auth.json)
 * @param providerId - ID of the provider to switch to
 * @returns True if switch was successful, false otherwise
 */
export async function switchToProvider(providerId: string): Promise<boolean> {
  ensureI18nInitialized()

  const existingConfig = readCodexConfig()
  if (!existingConfig) {
    console.log(ansis.red(i18n.t('codex:configNotFound')))
    return false
  }

  // Check if provider exists
  const provider = existingConfig.providers.find(p => p.id === providerId)
  if (!provider) {
    console.log(ansis.red(i18n.t('codex:providerNotFound', { provider: providerId })))
    return false
  }

  // Create backup before modification
  const backupPath = backupCodexConfig()
  if (backupPath) {
    console.log(ansis.gray(getBackupMessage(backupPath)))
  }

  try {
    // Uncomment model_provider and set to specified provider
    const updatedConfig: CodexConfigData = {
      ...existingConfig,
      modelProvider: providerId,
      modelProviderCommented: false, // Ensure it's not commented
    }

    writeCodexConfig(updatedConfig)

    // Set OPENAI_API_KEY to the provider's environment variable value for VSCode
    const auth = readJsonConfig<Record<string, string | null>>(CODEX_AUTH_FILE, { defaultValue: {} }) || {}
    const envValue = auth[provider.envKey] || null
    auth.OPENAI_API_KEY = envValue
    writeJsonConfig(CODEX_AUTH_FILE, auth, { pretty: true })

    console.log(ansis.green(i18n.t('codex:providerSwitchSuccess', { provider: providerId })))
    return true
  }
  catch (error) {
    console.error(ansis.red(`Error switching to provider: ${(error as Error).message}`))
    return false
  }
}
