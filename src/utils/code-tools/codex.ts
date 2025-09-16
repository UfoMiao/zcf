import type { CodexUninstallItem, CodexUninstallResult } from './codex-uninstaller'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import ansis from 'ansis'
import dayjs from 'dayjs'
import inquirer from 'inquirer'
import { dirname, join } from 'pathe'
import semver from 'semver'
import { x } from 'tinyexec'
import { getMcpServices, MCP_SERVICE_CONFIGS } from '../../config/mcp-services'
import { ensureI18nInitialized, i18n } from '../../i18n'
import { copyDir, copyFile, ensureDir, exists, readFile, writeFile } from '../fs-operations'
import { readJsonConfig, writeJsonConfig } from '../json-config'
import { selectMcpServices } from '../mcp-selector'
import { isWindows } from '../platform'
import { addNumbersToChoices } from '../prompt-helpers'
import { readZcfConfig, updateZcfConfig } from '../zcf-config'

const CODEX_DIR = join(homedir(), '.codex')
const CODEX_CONFIG_FILE = join(CODEX_DIR, 'config.toml')
const CODEX_AUTH_FILE = join(CODEX_DIR, 'auth.json')
const CODEX_AGENTS_FILE = join(CODEX_DIR, 'AGENTS.md')
const CODEX_PROMPTS_DIR = join(CODEX_DIR, 'prompts')

interface CodexProvider {
  id: string
  name: string
  baseUrl: string
  wireApi: string
  envKey: string
}

interface CodexMcpService {
  id: string
  command: string
  args: string[]
  env?: Record<string, string>
  startup_timeout_ms?: number
}

interface CodexConfigData {
  modelProvider: string | null
  providers: CodexProvider[]
  mcpServices: CodexMcpService[]
  managed: boolean
  otherConfig?: string[] // Lines that are not managed by ZCF
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

function parseCodexConfig(content: string): CodexConfigData {
  const managed = content.includes('model_provider') || content.includes('[model_providers.') || content.includes('[mcp_servers.')
  const providers: CodexProvider[] = []
  const mcpServices: CodexMcpService[] = []
  const otherConfig: string[] = []

  const modelProviderMatch = content.match(/model_provider\s*=\s*"([^"]+)"/)
  const modelProvider = modelProviderMatch ? modelProviderMatch[1] : null

  const lines = content.split('\n')
  let inProviderSection = false
  let inMcpSection = false

  for (const line of lines) {
    const trimmedLine = line.trim()

    // Skip ZCF managed header comment (legacy support)
    if (trimmedLine.includes('Managed by ZCF')) {
      continue
    }

    // Check if entering a [model_providers.xxx] section
    if (trimmedLine.match(/^\[model_providers\./)) {
      inProviderSection = true
      continue
    }

    // Check if entering a [mcp_servers.xxx] section
    if (trimmedLine.match(/^\[mcp_servers\./)) {
      inMcpSection = true
      continue
    }

    // Check if leaving current section (next section starts)
    if ((inProviderSection || inMcpSection) && trimmedLine.startsWith('[')
      && !trimmedLine.match(/^\[model_providers\./)
      && !trimmedLine.match(/^\[mcp_servers\./)) {
      inProviderSection = false
      inMcpSection = false
    }

    // Skip lines inside managed sections
    if (inProviderSection || inMcpSection) {
      continue
    }

    // Skip model_provider line (managed by ZCF)
    if (trimmedLine.startsWith('model_provider')) {
      continue
    }

    // Skip empty lines and ZCF managed comments
    if (!trimmedLine
      || trimmedLine.startsWith('# --- MCP servers added by ZCF ---')
      || trimmedLine.startsWith('# --- model provider added by ZCF ---')) {
      continue
    }

    // Collect other configuration lines that are not managed by ZCF
    otherConfig.push(line)
  }

  const providerRegex = /\[model_providers\.([^\]]+)\]([\s\S]*?)(?=\n\[|$)/g
  let providerMatch: RegExpExecArray | null
  providerMatch = providerRegex.exec(content)
  while (providerMatch !== null) {
    const id = providerMatch[1]
    const block = providerMatch[2]
    const name = block.match(/name\s*=\s*"([^"]*)"/)?.[1] || id
    const baseUrl = block.match(/base_url\s*=\s*"([^"]*)"/)?.[1] || ''
    const wireApi = block.match(/wire_api\s*=\s*"([^"]*)"/)?.[1] || 'responses'
    const envKey = block.match(/env_key\s*=\s*"([^"]*)"/)?.[1] || 'OPENAI_API_KEY'

    providers.push({ id, name, baseUrl, wireApi, envKey })
    providerMatch = providerRegex.exec(content)
  }

  const mcpRegex = /\[mcp_servers\.([^\]]+)\]([\s\S]*?)(?=\n\[|$)/g
  let mcpMatch: RegExpExecArray | null
  mcpMatch = mcpRegex.exec(content)
  while (mcpMatch !== null) {
    const id = mcpMatch[1]
    const block = mcpMatch[2]
    const command = block.match(/command\s*=\s*"([^"]*)"/)?.[1] || id
    const argsRaw = block.match(/args\s*=\s*\[([^\]]*)\]/)?.[1]
    const args = argsRaw
      ? argsRaw.split(',').map(item => item.trim()).filter(Boolean).map(item => item.replace(/^"|"$/g, ''))
      : []

    // Parse environment variables from env = {KEY = "value", KEY2 = "value2"} format
    const envMatch = block.match(/env\s*=\s*\{([^}]*)\}/)
    const env: Record<string, string> = {}
    if (envMatch) {
      const envContent = envMatch[1]
      const envPairs = envContent.split(',')
      for (const pair of envPairs) {
        const envVarMatch = pair.trim().match(/(\w+)\s*=\s*"([^"]*)"/)
        if (envVarMatch) {
          env[envVarMatch[1]] = envVarMatch[2]
        }
      }
    }

    // Parse startup timeout
    const timeoutMatch = block.match(/startup_timeout_ms\s*=\s*(\d+)/)
    const startup_timeout_ms = timeoutMatch ? Number.parseInt(timeoutMatch[1], 10) : undefined

    mcpServices.push({ id, command, args, env, startup_timeout_ms })
    mcpMatch = mcpRegex.exec(content)
  }

  return {
    modelProvider,
    providers,
    mcpServices,
    managed,
    otherConfig,
  }
}

function readCodexConfig(): CodexConfigData | null {
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

function renderCodexConfig(data: CodexConfigData): string {
  const lines: string[] = []

  // Add preserved non-ZCF configuration first
  if (data.otherConfig && data.otherConfig.length > 0) {
    lines.push(...data.otherConfig)
    lines.push('')
  }

  if (data.modelProvider || data.providers.length) {
    lines.push('# --- model provider added by ZCF ---')

    if (data.modelProvider)
      lines.push(`model_provider = "${data.modelProvider}"`)
  }

  if (data.providers.length) {
    for (const provider of data.providers) {
      lines.push('')
      lines.push(`[model_providers.${provider.id}]`)
      lines.push(`name = "${provider.name}"`)
      lines.push(`base_url = "${provider.baseUrl}"`)
      lines.push(`wire_api = "${provider.wireApi}"`)
      lines.push(`env_key = "${provider.envKey}"`)
    }
  }

  if (data.mcpServices.length) {
    lines.push('')
    lines.push('# --- MCP servers added by ZCF ---')
    for (const service of data.mcpServices) {
      lines.push(`[mcp_servers.${service.id}]`)
      lines.push(`command = "${service.command}"`)
      const argsString = service.args.length
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
    if (lines[lines.length - 1] === '')
      lines.pop()
  }

  lines.push('')
  return `${lines.join('\n')}\n`
}

function writeCodexConfig(data: CodexConfigData): void {
  ensureDir(CODEX_DIR)
  writeFile(CODEX_CONFIG_FILE, renderCodexConfig(data))
}

function writeAuthFile(newEntries: Record<string, string>): void {
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

export async function runCodexSystemPromptSelection(): Promise<void> {
  ensureI18nInitialized()
  const rootDir = getRootDir()
  const templateRoot = join(rootDir, 'templates', 'codex')

  const zcfConfig = readZcfConfig()
  const preferredLang = zcfConfig?.preferredLang === 'en' ? 'en' : 'zh-CN'
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

  // Prompt user to select system prompt style (single selection)
  const { systemPrompt } = await inquirer.prompt<{ systemPrompt: string }>([{
    type: 'list',
    name: 'systemPrompt',
    message: i18n.t('codex:systemPromptPrompt'),
    choices: addNumbersToChoices(availablePrompts.map(style => ({
      name: `${style.name} - ${ansis.gray(style.description)}`,
      value: style.id,
    }))),
    default: 'engineer-professional', // Default to engineer-professional
  }])

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
}

export async function runCodexWorkflowSelection(): Promise<void> {
  ensureI18nInitialized()
  const rootDir = getRootDir()
  const templateRoot = join(rootDir, 'templates', 'codex')

  const zcfConfig = readZcfConfig()
  const preferredLang = zcfConfig?.preferredLang === 'en' ? 'en' : 'zh-CN'
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

export async function configureCodexApi(): Promise<void> {
  ensureI18nInitialized()
  const existingConfig = readCodexConfig()

  const modeChoices = addNumbersToChoices([
    { name: i18n.t('codex:apiModeOfficial'), value: 'official' },
    { name: i18n.t('codex:apiModeCustom'), value: 'custom' },
  ])

  const { mode } = await inquirer.prompt<{ mode: 'official' | 'custom' }>([{
    type: 'list',
    name: 'mode',
    message: i18n.t('codex:apiModePrompt'),
    choices: modeChoices,
    default: 'custom',
  }])

  if (!mode) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return
  }

  if (mode === 'official') {
    const backupPath = backupCodexConfig()
    if (backupPath) {
      console.log(ansis.gray(getBackupMessage(backupPath)))
    }

    const configData: CodexConfigData = {
      modelProvider: null,
      providers: [],
      mcpServices: existingConfig?.mcpServices || [],
      managed: true,
      otherConfig: existingConfig?.otherConfig || [],
    }
    writeCodexConfig(configData)

    const auth = readJsonConfig<Record<string, string>>(CODEX_AUTH_FILE, { defaultValue: {} }) || {}
    if ('OPENAI_API_KEY' in auth) {
      delete auth.OPENAI_API_KEY
      writeJsonConfig(CODEX_AUTH_FILE, auth, { pretty: true })
    }

    updateZcfConfig({ codeToolType: 'codex' })
    console.log(ansis.green(i18n.t('codex:officialConfigured')))
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
      id,
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
