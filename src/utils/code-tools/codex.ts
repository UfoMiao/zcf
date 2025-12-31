import type { AiOutputLanguage, SupportedLang } from '../../constants'
import type { CodexUninstallItem, CodexUninstallResult } from './codex-uninstaller'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import ansis from 'ansis'
import dayjs from 'dayjs'
import inquirer from 'inquirer'
import ora from 'ora'
import { dirname, join } from 'pathe'
import semver from 'semver'
import { x } from 'tinyexec'
// Removed MCP config imports; MCP configuration moved to codex-configure.ts
import { AI_OUTPUT_LANGUAGES, CODEX_AGENTS_FILE, CODEX_AUTH_FILE, CODEX_CONFIG_FILE, CODEX_DIR, CODEX_PROMPTS_DIR, SUPPORTED_LANGS, ZCF_CONFIG_FILE } from '../../constants'
import { ensureI18nInitialized, format, i18n } from '../../i18n'
import { applyAiLanguageDirective } from '../config'
import { copyDir, copyFile, ensureDir, exists, readFile, writeFile } from '../fs-operations'
import { readJsonConfig, writeJsonConfig } from '../json-config'
import { normalizeTomlPath, wrapCommandWithSudo } from '../platform'
// Removed MCP selection and platform command imports from this module
import { addNumbersToChoices } from '../prompt-helpers'
import { resolveAiOutputLanguage } from '../prompts'
import { promptBoolean } from '../toggle-prompt'
import { parseToml } from '../toml-edit'
import { readDefaultTomlConfig, readZcfConfig, updateTomlConfig, updateZcfConfig } from '../zcf-config'
import { detectConfigManagementMode } from './codex-config-detector'
import { configureCodexMcp } from './codex-configure'

// Cache to avoid repeated backups in skip-prompt mode
let cachedSkipPromptBackup: string | null = null

// Public export for easy reuse and testing
export { applyCodexPlatformCommand } from './codex-platform'
export { CODEX_DIR }

export interface CodexProvider {
  id: string
  name: string
  baseUrl: string
  wireApi: string
  tempEnvKey: string
  requiresOpenaiAuth: boolean
  model?: string // Default model for this provider
}

export interface CodexMcpService {
  id: string
  command: string
  args: string[]
  env?: Record<string, string>
  startup_timeout_sec?: number
  // Preserve all extra configuration fields not directly managed by ZCF
  extraFields?: Record<string, any>
}

export interface CodexConfigData {
  model: string | null // Default model to use (gpt-5, gpt-5-codex, etc.)
  modelProvider: string | null // API provider for model_provider field
  providers: CodexProvider[]
  mcpServices: CodexMcpService[]
  managed: boolean
  otherConfig?: string[] // Lines that are not managed by ZCF
  modelProviderCommented?: boolean // Whether model_provider line should be commented out
}

export interface CodexVersionInfo {
  installed: boolean
  currentVersion: string | null
  latestVersion: string | null
  needsUpdate: boolean
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
 * Detect Codex installation method
 * @returns Installation method: 'npm', 'homebrew', or 'unknown'
 */
async function detectCodexInstallMethod(): Promise<'npm' | 'homebrew' | 'unknown'> {
  try {
    // Check if installed via Homebrew (macOS/Linux)
    // Codex is distributed as a Homebrew cask, so we need to use --cask flag
    const brewResult = await x('brew', ['list', '--cask', 'codex'], { throwOnError: false })
    if (brewResult.exitCode === 0) {
      return 'homebrew'
    }
  }
  catch {
    // Homebrew not available or codex not installed via brew
  }

  try {
    // Check if installed via npm
    const npmResult = await x('npm', ['list', '-g', '@openai/codex'], { throwOnError: false })
    if (npmResult.exitCode === 0 && npmResult.stdout.includes('@openai/codex')) {
      return 'npm'
    }
  }
  catch {
    // npm not available or codex not installed via npm
  }

  return 'unknown'
}

/**
 * Core function to install/update Codex CLI via npm or Homebrew
 * @param isUpdate - Whether this is an update (true) or fresh install (false)
 */
async function executeCodexInstallation(isUpdate: boolean, skipMethodSelection: boolean = false): Promise<void> {
  if (isUpdate) {
    console.log(ansis.cyan(i18n.t('codex:updatingCli')))

    // Detect installation method for updates
    const installMethod = await detectCodexInstallMethod()

    if (installMethod === 'homebrew') {
      // Update via Homebrew
      // Codex is distributed as a Homebrew cask, so we need to use --cask flag
      console.log(ansis.gray(i18n.t('codex:detectedHomebrew')))
      const result = await x('brew', ['upgrade', '--cask', 'codex'])
      if (result.exitCode !== 0) {
        throw new Error(`Failed to update codex via Homebrew: exit code ${result.exitCode}`)
      }
    }
    else if (installMethod === 'npm') {
      // Update via npm
      console.log(ansis.gray(i18n.t('codex:detectedNpm')))
      const { command, args, usedSudo } = wrapCommandWithSudo('npm', ['install', '-g', '@openai/codex@latest'])
      if (usedSudo)
        console.log(ansis.yellow(i18n.t('codex:usingSudo')))

      const result = await x(command, args)
      if (result.exitCode !== 0) {
        throw new Error(`Failed to update codex CLI: exit code ${result.exitCode}`)
      }
    }
    else {
      // Unknown installation method - fall back to npm
      console.log(ansis.yellow(i18n.t('codex:unknownInstallMethod')))
      console.log(ansis.gray(i18n.t('codex:fallingBackToNpm')))
      const { command, args, usedSudo } = wrapCommandWithSudo('npm', ['install', '-g', '@openai/codex@latest'])
      if (usedSudo)
        console.log(ansis.yellow(i18n.t('codex:usingSudo')))

      const result = await x(command, args)
      if (result.exitCode !== 0) {
        throw new Error(`Failed to update codex CLI: exit code ${result.exitCode}`)
      }
    }

    console.log(ansis.green(i18n.t('codex:updateSuccess')))
  }
  else {
    // Use the new installCodex function for installation
    const { installCodex } = await import('../installer')
    await installCodex(skipMethodSelection)
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

  // Skip-prompt模式：只在首次调用时创建备份，其余复用
  if (process.env.ZCF_CODEX_SKIP_PROMPT_SINGLE_BACKUP === 'true' && cachedSkipPromptBackup)
    return cachedSkipPromptBackup

  const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss')
  const backupDir = createBackupDirectory(timestamp)

  const filter = (path: string): boolean => {
    return !path.includes('/backup')
  }

  copyDir(CODEX_DIR, backupDir, { filter })
  if (process.env.ZCF_CODEX_SKIP_PROMPT_SINGLE_BACKUP === 'true')
    cachedSkipPromptBackup = backupDir

  return backupDir
}

/**
 * Backup complete Codex directory with all configuration files
 * This provides the same comprehensive backup functionality as Claude Code
 *
 * Note: This is an alias for backupCodexFiles() to maintain API consistency
 * while following DRY principles (Don't Repeat Yourself)
 */
export function backupCodexComplete(): string | null {
  return backupCodexFiles()
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
  if (process.env.ZCF_CODEX_SKIP_PROMPT_SINGLE_BACKUP === 'true' && cachedSkipPromptBackup)
    return cachedSkipPromptBackup
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
  if (process.env.ZCF_CODEX_SKIP_PROMPT_SINGLE_BACKUP === 'true' && cachedSkipPromptBackup)
    return cachedSkipPromptBackup
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

  // Provide fallback message when i18n is not initialized
  // This prevents migration failures when called before initI18n()
  // (e.g., programmatic calls to getCurrentCodexProvider/listCodexProviders)
  if (!i18n.isInitialized) {
    return `Backup created: ${path}`
  }

  return i18n.t('codex:backupSuccess', { path })
}

/**
 * Check if the Codex config needs env_key to temp_env_key migration
 * @returns true if migration is needed, false otherwise
 */
export function needsEnvKeyMigration(): boolean {
  if (!exists(CODEX_CONFIG_FILE))
    return false

  try {
    const content = readFile(CODEX_CONFIG_FILE)
    // Check if any provider section has old env_key field (not temp_env_key)
    const hasOldEnvKey = /^\s*env_key\s*=/m.test(content)

    // Migration needed if has any old env_key (regardless of temp_env_key presence)
    // This ensures all providers are migrated even if some already use temp_env_key
    return hasOldEnvKey
  }
  catch {
    return false
  }
}

/**
 * Migrate env_key to temp_env_key in Codex config file
 * This performs an in-place migration of the TOML config file
 *
 * For provider sections that already have temp_env_key, the env_key line is removed.
 * For provider sections that only have env_key, it is converted to temp_env_key.
 * This prevents duplicate keys in TOML which would cause parse errors.
 *
 * @returns true if migration was performed, false otherwise
 */
export function migrateEnvKeyToTempEnvKey(): boolean {
  if (!exists(CODEX_CONFIG_FILE))
    return false

  try {
    const content = readFile(CODEX_CONFIG_FILE)

    // Check if migration is needed
    if (!needsEnvKeyMigration())
      return false

    // Create backup before migration
    const backupPath = backupCodexConfig()
    if (backupPath) {
      console.log(ansis.gray(getBackupMessage(backupPath)))
    }

    // Perform smart migration that handles mixed state
    // Split content into provider sections and process each separately
    const migratedContent = migrateEnvKeyInContent(content)

    // Write migrated content
    writeFile(CODEX_CONFIG_FILE, migratedContent)

    // Update ZCF config to mark migration as complete
    updateTomlConfig(ZCF_CONFIG_FILE, {
      codex: {
        envKeyMigrated: true,
      },
    } as any)

    // Provide fallback message when i18n is not initialized
    // This prevents migration failures when called before initI18n()
    const message = i18n.isInitialized
      ? i18n.t('codex:envKeyMigrationComplete')
      : '✔ env_key to temp_env_key migration completed'
    console.log(ansis.green(message))
    return true
  }
  catch (error) {
    console.error(ansis.yellow(`env_key migration warning: ${(error as Error).message}`))
    return false
  }
}

/**
 * Migrate env_key to temp_env_key in TOML content
 * Handles mixed state where both env_key and temp_env_key may exist in the same section
 *
 * @param content - The TOML content to migrate
 * @returns The migrated content
 */
export function migrateEnvKeyInContent(content: string): string {
  const lines = content.split('\n')
  const result: string[] = []

  // Track if current section already has temp_env_key
  let currentSectionHasTempEnvKey = false
  let currentSection = ''

  // First pass: identify sections and their temp_env_key presence
  const sectionHasTempEnvKey = new Map<string, boolean>()
  let tempSection = ''

  for (const line of lines) {
    // Check if this is a section header
    const sectionMatch = line.match(/^\s*\[([^\]]+)\]/)
    if (sectionMatch) {
      tempSection = sectionMatch[1]
    }

    // Check if this section has temp_env_key
    if (tempSection && /^\s*temp_env_key\s*=/.test(line)) {
      sectionHasTempEnvKey.set(tempSection, true)
    }
  }

  // Second pass: process lines
  for (const line of lines) {
    // Check if this is a section header
    const sectionMatch = line.match(/^\s*\[([^\]]+)\]/)
    if (sectionMatch) {
      currentSection = sectionMatch[1]
      currentSectionHasTempEnvKey = sectionHasTempEnvKey.get(currentSection) || false
    }

    // Check if this line has env_key
    const envKeyMatch = line.match(/^(\s*)env_key(\s*=.*)$/)
    if (envKeyMatch) {
      if (currentSectionHasTempEnvKey) {
        // Section already has temp_env_key, remove the env_key line entirely
        // Skip adding this line to result
        continue
      }
      else {
        // Section doesn't have temp_env_key, convert env_key to temp_env_key
        result.push(`${envKeyMatch[1]}temp_env_key${envKeyMatch[2]}`)
        continue
      }
    }

    result.push(line)
  }

  return result.join('\n')
}

/**
 * Ensure env_key migration is performed if needed
 * This should be called before any Codex config modification operation
 */
export function ensureEnvKeyMigration(): void {
  // Check ZCF config to see if migration has already been done
  const tomlConfig = readDefaultTomlConfig()

  // Skip if already migrated
  if (tomlConfig?.codex?.envKeyMigrated)
    return

  // Perform migration if needed
  if (needsEnvKeyMigration()) {
    migrateEnvKeyToTempEnvKey()
  }
}

function sanitizeProviderName(input: string): string {
  const cleaned = input.trim()
  if (!cleaned)
    return ''
  // Replace dots with hyphens, then remove any characters that are not word chars, dots, or hyphens
  return cleaned.toLowerCase().replace(/\./g, '-').replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')
}

export function parseCodexConfig(content: string): CodexConfigData {
  // Handle empty content
  if (!content.trim()) {
    return {
      model: null,
      modelProvider: null,
      providers: [],
      mcpServices: [],
      managed: false,
      otherConfig: [],
      modelProviderCommented: undefined,
    }
  }

  try {
    // Normalize problematic Windows backslashes in SYSTEMROOT to prevent TOML parse failures
    // e.g. env = {SYSTEMROOT = "C:\\Windows"} or "C:\Windows" => use forward slashes
    const normalizedContent = content.replace(/(SYSTEMROOT\s*=\s*")[^"\n]+("?)/g, (match) => {
      return match.replace(/\\\\/g, '/').replace(/\\/g, '/').replace('C:/Windows"?', 'C:/Windows"')
    })

    // Parse TOML using smol-toml
    const tomlData = parseToml(normalizedContent) as any

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
          tempEnvKey: provider.temp_env_key || 'OPENAI_API_KEY',
          requiresOpenaiAuth: provider.requires_openai_auth !== false,
          model: provider.model || undefined, // Parse model field from provider
        })
      }
    }

    // Extract MCP services from [mcp_servers.*] sections
    const mcpServices: CodexMcpService[] = []
    if (tomlData.mcp_servers) {
      // Define known fields that ZCF directly manages
      const KNOWN_MCP_FIELDS = new Set(['command', 'args', 'env', 'startup_timeout_sec'])

      for (const [id, mcpData] of Object.entries(tomlData.mcp_servers)) {
        const mcp = mcpData as any

        // Collect extra fields not directly managed by ZCF
        const extraFields: Record<string, any> = {}
        for (const [key, value] of Object.entries(mcp)) {
          if (!KNOWN_MCP_FIELDS.has(key)) {
            extraFields[key] = value
          }
        }

        mcpServices.push({
          id,
          command: mcp.command || id,
          args: mcp.args || [],
          env: Object.keys(mcp.env || {}).length > 0 ? mcp.env : undefined,
          startup_timeout_sec: mcp.startup_timeout_sec,
          // Only add extraFields if there are any extra fields
          extraFields: Object.keys(extraFields).length > 0 ? extraFields : undefined,
        })
      }
    }

    // Extract model (default model) and model_provider (API provider)
    // We need to detect these from text because TOML parser might incorrectly assign
    // global keys to sections if they appear after section headers
    const model: string | null = tomlData.model || null
    let modelProvider: string | null = null
    let modelProviderCommented: boolean | undefined

    // First check for commented model_provider in raw text
    const commentedMatch = content.match(/^(\s*)#\s*model_provider\s*=\s*"([^"]+)"/m)
    if (commentedMatch) {
      modelProvider = commentedMatch[2]
      modelProviderCommented = true
    }
    else {
      // Check for global model_provider (not inside sections) using text parsing
      // as TOML parser may incorrectly assign it to a section
      const lines = content.split('\n')
      let inSection = false

      for (const line of lines) {
        const trimmedLine = line.trim()

        if (!trimmedLine)
          continue

        // Check if we're entering a section
        if (trimmedLine.startsWith('[')) {
          inSection = true
          continue
        }

        // Skip comments (but reset inSection flag for ZCF comments)
        if (trimmedLine.startsWith('#')) {
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

      // Fallback to parsed TOML data if not found in text parsing
      if (!modelProvider) {
        modelProvider = tomlData.model_provider || null
        modelProviderCommented = false
      }
    }

    // Preserve other configuration (line-scan, skip ZCF-managed sections/fields)
    const otherConfig: string[] = []
    const lines = content.split('\n')
    let skipCurrentSection = false

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed)
        continue

      // Skip ZCF managed comments/headers
      if (/^#\s*---\s*model provider added by ZCF\s*---\s*$/i.test(trimmed))
        continue
      if (/^#\s*---\s*MCP servers added by ZCF\s*---\s*$/i.test(trimmed))
        continue
      if (/Managed by ZCF/i.test(trimmed))
        continue

      // Section header detection
      const sec = trimmed.match(/^\[([^\]]+)\]/)
      if (sec) {
        const name = sec[1]
        skipCurrentSection = name.startsWith('model_providers.') || name.startsWith('mcp_servers.')
        // Do not push the section header if it's ZCF-managed; allow non-managed sections to pass
        if (skipCurrentSection)
          continue
        otherConfig.push(line)
        continue
      }

      // Global managed fields
      if (/^#?\s*model_provider\s*=/.test(trimmed))
        continue
      if (/^model\s*=/.test(trimmed))
        continue

      if (!skipCurrentSection) {
        otherConfig.push(line)
      }
    }

    const managed = providers.length > 0 || mcpServices.length > 0 || modelProvider !== null || model !== null

    return {
      model,
      modelProvider,
      providers,
      mcpServices,
      managed,
      otherConfig,
      modelProviderCommented,
    }
  }
  catch (error) {
    // Graceful fallback to basic parsing if TOML parsing fails
    // Only show warning in development/debug mode to avoid user confusion
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
      console.warn('TOML parsing failed, falling back to basic parsing:', error)
    }

    // Clean previously managed sections to avoid duplication on subsequent renders
    const cleaned = content
      // Remove ZCF headers
      .replace(/^\s*#\s*---\s*model provider added by ZCF\s*---\s*$/gim, '')
      .replace(/^\s*#\s*---\s*MCP servers added by ZCF\s*---\s*$/gim, '')
      // Remove entire [model_providers.*] and [mcp_servers.*] blocks
      .replace(/^\[model_providers\.[^\]]+\][\s\S]*?(?=^\[|$)/gim, '')
      .replace(/^\[mcp_servers\.[^\]]+\][\s\S]*?(?=^\[|$)/gim, '')
      // Remove global model/model_provider lines (commented or not)
      .replace(/^\s*(?:#\s*)?model_provider\s*=.*$/gim, '')
      .replace(/^\s*model\s*=.*$/gim, '')
      // Collapse excessive blank lines
      .replace(/\n{3,}/g, '\n\n')

    const otherConfig = cleaned
      .split('\n')
      .map(l => l.replace(/\s+$/g, ''))
      .filter(l => l.trim().length > 0)

    return {
      model: null,
      modelProvider: null,
      providers: [],
      mcpServices: [],
      managed: false,
      otherConfig,
      modelProviderCommented: undefined,
    }
  }
}

/**
 * Format a value for use within an inline TOML table (recursive helper)
 * @param value - Value to format
 * @returns Formatted string representation of the value
 */
function formatInlineTableValue(value: any): string {
  // Handle null/undefined - return empty string (caller should skip)
  if (value === null || value === undefined) {
    return ''
  }

  // Handle string type
  if (typeof value === 'string') {
    const normalized = normalizeTomlPath(value)
    // Use single quotes for inline table string values to avoid escaping issues
    return `'${normalized}'`
  }

  // Handle number and boolean types
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  // Handle array type
  if (Array.isArray(value)) {
    const items = value.map((item) => {
      if (typeof item === 'string') {
        const normalized = normalizeTomlPath(item)
        return `'${normalized}'`
      }
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        return formatInlineTable(item)
      }
      return String(item)
    }).join(', ')
    return `[${items}]`
  }

  // Handle nested object type (inline table) - recursive call
  if (typeof value === 'object') {
    return formatInlineTable(value)
  }

  return String(value)
}

/**
 * Format an object as a TOML inline table
 * @param obj - Object to format as inline table
 * @returns Formatted inline table string like {key1 = value1, key2 = value2}
 */
function formatInlineTable(obj: Record<string, any>): string {
  const entries = Object.entries(obj)
    .filter(([_, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `${k} = ${formatInlineTableValue(v)}`)
    .join(', ')
  return `{${entries}}`
}

/**
 * Format a TOML field value based on its type
 * @param key - Field name
 * @param value - Field value (can be string, number, boolean, array, object)
 * @returns Formatted TOML string, or empty string if value should be skipped
 */
function formatTomlField(key: string, value: any): string {
  // Skip null/undefined values
  if (value === null || value === undefined) {
    return ''
  }

  // Handle string type
  if (typeof value === 'string') {
    // Use normalizeTomlPath to handle path normalization (backslashes to forward slashes)
    const normalized = normalizeTomlPath(value)
    // Escape quotes for TOML string format
    const escaped = normalized.replace(/"/g, '\\"')
    return `${key} = "${escaped}"`
  }

  // Handle number and boolean types
  if (typeof value === 'number' || typeof value === 'boolean') {
    return `${key} = ${value}`
  }

  // Handle array type
  if (Array.isArray(value)) {
    const items = value.map((item) => {
      if (typeof item === 'string') {
        // Use normalizeTomlPath for array string items
        const normalized = normalizeTomlPath(item)
        const escaped = normalized.replace(/"/g, '\\"')
        return `"${escaped}"`
      }
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        return formatInlineTable(item)
      }
      return String(item)
    }).join(', ')
    return `${key} = [${items}]`
  }

  // Handle object type (inline table)
  if (typeof value === 'object') {
    return `${key} = ${formatInlineTable(value)}`
  }

  // Unknown type, skip
  return ''
}

export function readCodexConfig(): CodexConfigData | null {
  if (!exists(CODEX_CONFIG_FILE))
    return null

  // Ensure env_key migration is performed before reading config
  ensureEnvKeyMigration()

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
  if (data.model || data.modelProvider || data.providers.length > 0 || data.modelProviderCommented) {
    lines.push('# --- model provider added by ZCF ---')

    // Add model field if present
    if (data.model) {
      lines.push(`model = "${data.model}"`)
    }

    if (data.modelProvider) {
      const commentPrefix = data.modelProviderCommented ? '# ' : ''
      lines.push(`${commentPrefix}model_provider = "${data.modelProvider}"`)
    }

    // Add blank line after global config
    lines.push('')
  }

  // Add preserved non-ZCF configuration after global config
  if (data.otherConfig && data.otherConfig.length > 0) {
    const preserved = data.otherConfig.filter((raw) => {
      const l = String(raw).trim()
      if (!l)
        return false
      // Guard: never re-insert any ZCF-managed headers/sections/fields
      if (/^#\s*---\s*model provider added by ZCF\s*---\s*$/i.test(l))
        return false
      if (/^#\s*---\s*MCP servers added by ZCF\s*---\s*$/i.test(l))
        return false
      if (/^\[\s*mcp_servers\./i.test(l))
        return false
      if (/^\[\s*model_providers\./i.test(l))
        return false
      if (/^#?\s*model_provider\s*=/.test(l))
        return false
      // Only filter out global model field (not inside sections)
      // This regex checks if it's a top-level model field (not inside a section)
      if (/^\s*model\s*=/.test(l) && !l.includes('['))
        return false
      return true
    })
    if (preserved.length > 0) {
      lines.push(...preserved)
      // Add blank line only if we have sections to add
      if (data.providers.length > 0 || data.mcpServices.length > 0) {
        lines.push('')
      }
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
      lines.push(`temp_env_key = "${provider.tempEnvKey}"`)
      lines.push(`requires_openai_auth = ${provider.requiresOpenaiAuth}`)
      // Add model field if present
      if (provider.model) {
        lines.push(`model = "${provider.model}"`)
      }
    }
  }

  // Add MCP servers sections
  if (data.mcpServices.length > 0) {
    lines.push('')
    lines.push('# --- MCP servers added by ZCF ---')
    for (const service of data.mcpServices) {
      lines.push(`[mcp_servers.${service.id}]`)
      // Normalize Windows paths: convert backslashes to forward slashes
      // Same approach as getSystemRoot() for consistency
      const normalizedCommand = normalizeTomlPath(service.command)
      lines.push(`command = "${normalizedCommand}"`)

      // Format args array
      const argsString = service.args.length > 0
        ? service.args.map(arg => `"${arg}"`).join(', ')
        : ''
      lines.push(`args = [${argsString}]`)

      // Add environment variables if present
      if (service.env && Object.keys(service.env).length > 0) {
        // Use single quotes for env values to avoid escaping Windows paths
        // TOML single-quoted strings are literal and don't require backslash escaping
        const envEntries = Object.entries(service.env)
          .map(([key, value]) => `${key} = '${value}'`)
          .join(', ')
        lines.push(`env = {${envEntries}}`)
      }

      // Add startup timeout if present
      if (service.startup_timeout_sec) {
        lines.push(`startup_timeout_sec = ${service.startup_timeout_sec}`)
      }

      // Add extra fields if present
      if (service.extraFields) {
        for (const [key, value] of Object.entries(service.extraFields)) {
          const formatted = formatTomlField(key, value)
          if (formatted) {
            lines.push(formatted)
          }
        }
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
  // Ensure env_key migration is performed before any config modification
  ensureEnvKeyMigration()

  ensureDir(CODEX_DIR)

  // Note: Codex config uses top-level fields (model, model_provider) which cannot be
  // edited incrementally with editToml (it only supports nested paths with dots).
  // Instead, we rely on renderCodexConfig which preserves user customizations through
  // the otherConfig field - this captures all non-ZCF-managed sections and lines
  // from the existing config and includes them in the rendered output.
  //
  // This approach ensures:
  // - User's [projects.*] sections are preserved
  // - User's custom settings and comments in otherConfig are preserved
  // - ZCF-managed sections (model_providers.*, mcp_servers.*) are properly updated
  writeFile(CODEX_CONFIG_FILE, renderCodexConfig(data))
}

export function writeAuthFile(newEntries: Record<string, string>): void {
  ensureDir(CODEX_DIR)
  const existing = readJsonConfig<Record<string, string>>(CODEX_AUTH_FILE, { defaultValue: {} }) || {}
  const merged = { ...existing, ...newEntries }
  writeJsonConfig(CODEX_AUTH_FILE, merged, { pretty: true })
}

export async function isCodexInstalled(): Promise<boolean> {
  // Check npm installation
  try {
    const npmResult = await x('npm', ['list', '-g', '--depth=0'])
    if (npmResult.exitCode === 0 && npmResult.stdout.includes('@openai/codex@')) {
      return true
    }
  }
  catch {
    // npm check failed, continue to Homebrew check
  }

  // Check Homebrew installation
  try {
    const brewResult = await x('brew', ['list', '--cask', 'codex'], { throwOnError: false })
    if (brewResult.exitCode === 0) {
      return true
    }
  }
  catch {
    // Homebrew check failed
  }

  return false
}

export async function getCodexVersion(): Promise<string | null> {
  // Try npm first
  try {
    const npmResult = await x('npm', ['list', '-g', '--depth=0'])
    if (npmResult.exitCode === 0) {
      const match = npmResult.stdout.match(/@openai\/codex@(\S+)/)
      if (match) {
        return match[1]
      }
    }
  }
  catch {
    // npm check failed, continue to Homebrew check
  }

  // Try Homebrew
  try {
    const brewResult = await x('brew', ['info', '--cask', 'codex', '--json=v2'], { throwOnError: false })
    if (brewResult.exitCode === 0) {
      const info = JSON.parse(brewResult.stdout)
      // Homebrew cask info v2 format: { "casks": [...] }
      if (info.casks && Array.isArray(info.casks) && info.casks.length > 0) {
        const cask = info.casks[0]
        // In v2 format, 'installed' is a string (version) or null if not installed
        if (cask.installed && typeof cask.installed === 'string') {
          return cask.installed
        }
      }
    }
  }
  catch {
    // Homebrew check failed
  }

  return null
}

export async function checkCodexUpdate(): Promise<CodexVersionInfo> {
  try {
    const currentVersion = await getCodexVersion()
    if (!currentVersion) {
      return {
        installed: false,
        currentVersion: null,
        latestVersion: null,
        needsUpdate: false,
      }
    }

    const result = await x('npm', ['view', '@openai/codex', '--json'])
    if (result.exitCode !== 0) {
      return {
        installed: true,
        currentVersion,
        latestVersion: null,
        needsUpdate: false,
      }
    }

    const packageInfo = JSON.parse(result.stdout)
    const latestVersion = packageInfo['dist-tags']?.latest

    if (!latestVersion) {
      return {
        installed: true,
        currentVersion,
        latestVersion: null,
        needsUpdate: false,
      }
    }

    const needsUpdate = semver.gt(latestVersion, currentVersion)

    return {
      installed: true,
      currentVersion,
      latestVersion,
      needsUpdate,
    }
  }
  catch {
    return {
      installed: false,
      currentVersion: null,
      latestVersion: null,
      needsUpdate: false,
    }
  }
}

export async function installCodexCli(skipMethodSelection: boolean = false): Promise<void> {
  ensureI18nInitialized()

  // Check if already installed
  if (await isCodexInstalled()) {
    // Check for updates if already installed
    const { needsUpdate } = await checkCodexUpdate()
    if (needsUpdate) {
      // Update available - install new version
      await executeCodexInstallation(true, skipMethodSelection)
      return
    }
    else {
      // No updates, skip installation
      console.log(ansis.yellow(i18n.t('codex:alreadyInstalled')))
      return
    }
  }

  // Not installed - install new
  await executeCodexInstallation(false, skipMethodSelection)
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
export interface CodexWorkflowLanguageOptions {
  aiOutputLang?: AiOutputLanguage | string
  skipPrompt?: boolean
}

export async function runCodexWorkflowImportWithLanguageSelection(
  options?: CodexFullInitOptions,
): Promise<AiOutputLanguage | string> {
  ensureI18nInitialized()

  // Step 1: Select AI output language (uses global config memory)
  const zcfConfig = readZcfConfig()
  const { aiOutputLang: commandLineOption, skipPrompt = false } = options ?? {}

  const aiOutputLang = await resolveAiOutputLanguage(
    i18n.language as SupportedLang,
    commandLineOption,
    zcfConfig,
    skipPrompt,
  )

  // Step 2: Save AI output language to global config
  updateZcfConfig({ aiOutputLang })
  applyAiLanguageDirective(aiOutputLang)

  // Step 3: Continue with original workflow (system prompt + workflow selection)
  await runCodexSystemPromptSelection(skipPrompt)
  ensureCodexAgentsLanguageDirective(aiOutputLang)
  await runCodexWorkflowSelection(options)
  console.log(ansis.green(i18n.t('codex:workflowInstall')))

  return aiOutputLang
}

export async function runCodexSystemPromptSelection(skipPrompt = false): Promise<void> {
  ensureI18nInitialized()
  const rootDir = getRootDir()

  // Read both legacy and new config formats
  const zcfConfig = readZcfConfig()
  const { readDefaultTomlConfig } = await import('../zcf-config')
  const tomlConfig = readDefaultTomlConfig()

  // Use intelligent template language selection
  const { resolveTemplateLanguage } = await import('../prompts')
  const preferredLang = await resolveTemplateLanguage(
    undefined, // No command line option for this function
    zcfConfig,
    skipPrompt, // Pass skipPrompt flag
  )

  updateZcfConfig({ templateLang: preferredLang })

  // Use shared output-styles from common directory
  let systemPromptSrc = join(rootDir, 'templates', 'common', 'output-styles', preferredLang)

  if (!exists(systemPromptSrc))
    systemPromptSrc = join(rootDir, 'templates', 'common', 'output-styles', 'zh-CN')

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
    {
      id: 'ojousama-engineer',
      name: i18n.t('configuration:outputStyles.ojousama-engineer.name'),
      description: i18n.t('configuration:outputStyles.ojousama-engineer.description'),
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
    skipPrompt, // Pass skipPrompt flag
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

export async function runCodexWorkflowSelection(options?: CodexFullInitOptions): Promise<void> {
  ensureI18nInitialized()

  const { skipPrompt = false, workflows: presetWorkflows = [] } = options ?? {}
  const rootDir = getRootDir()

  const zcfConfig = readZcfConfig()
  // Use templateLang with fallback to preferredLang for backward compatibility
  const templateLang = zcfConfig?.templateLang || zcfConfig?.preferredLang || 'en'
  let preferredLang = templateLang === 'en' ? 'en' : 'zh-CN'

  // Workflows are now in templates/common/workflow/{category}/{lang}
  const workflowSrc = join(rootDir, 'templates', 'common', 'workflow')
  if (!exists(workflowSrc))
    return

  // Get available workflow files (recursively)
  let allWorkflows = getAllWorkflowFiles(workflowSrc, preferredLang)

  // If no workflows found for preferred language, fallback to zh-CN
  if (allWorkflows.length === 0 && preferredLang === 'en') {
    preferredLang = 'zh-CN'
    allWorkflows = getAllWorkflowFiles(workflowSrc, preferredLang)
  }

  if (allWorkflows.length === 0)
    return

  // Handle skipPrompt mode
  if (skipPrompt) {
    // Ensure prompts directory exists
    ensureDir(CODEX_PROMPTS_DIR)

    // Create backup before modifying prompts directory
    const backupPath = backupCodexPrompts()
    if (backupPath) {
      console.log(ansis.gray(getBackupMessage(backupPath)))
    }

    let workflowsToInstall: string[]

    // If specific workflows are provided, install only those
    if (presetWorkflows.length > 0) {
      const selectedWorkflows = allWorkflows.filter(workflow =>
        presetWorkflows.includes(workflow.name),
      )
      // Expand grouped selections (e.g., Git) to concrete files
      workflowsToInstall = expandSelectedWorkflowPaths(selectedWorkflows.map(w => w.path), workflowSrc, preferredLang)
    }
    else {
      // If no specific workflows provided, install all available workflows
      workflowsToInstall = expandSelectedWorkflowPaths(allWorkflows.map(w => w.path), workflowSrc, preferredLang)
    }

    // Copy selected workflow files to prompts directory (flattened)
    for (const workflowPath of workflowsToInstall) {
      const content = readFile(workflowPath)
      const filename = workflowPath.split('/').pop() || 'workflow.md'
      const targetPath = join(CODEX_PROMPTS_DIR, filename)
      writeFile(targetPath, content)
    }

    return
  }

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

  // Expand grouped selections (e.g., Git) to concrete files
  const finalWorkflowPaths = expandSelectedWorkflowPaths(workflows, workflowSrc, preferredLang)

  // Copy selected workflow files to prompts directory (flattened)
  for (const workflowPath of finalWorkflowPaths) {
    const content = readFile(workflowPath)
    const filename = workflowPath.split('/').pop() || 'workflow.md'
    const targetPath = join(CODEX_PROMPTS_DIR, filename)
    writeFile(targetPath, content)
  }
}

// Sentinel value for grouped Git workflow option
const GIT_GROUP_SENTINEL = '::gitGroup'

function getAllWorkflowFiles(workflowSrc: string, preferredLang: string): Array<{ name: string, path: string }> {
  const workflows: Array<{ name: string, path: string }> = []

  // workflowSrc is templates/common/workflow/
  // Check for sixStep workflow (single file, use real path directly)
  const sixStepFile = join(workflowSrc, 'sixStep', preferredLang, 'workflow.md')
  if (exists(sixStepFile)) {
    workflows.push({
      name: i18n.t('workflow:workflowOption.sixStepsWorkflow'),
      path: sixStepFile,
    })
  }

  // Add Git workflow as a grouped option mirroring Claude Code's description
  const gitPromptsDir = join(workflowSrc, 'git', preferredLang)
  if (exists(gitPromptsDir)) {
    workflows.push({
      name: i18n.t('workflow:workflowOption.gitWorkflow'),
      // Use sentinel path for grouped selection; expanded later
      path: GIT_GROUP_SENTINEL,
    })
  }

  return workflows
}

// Expand grouped selections to actual file paths
function expandSelectedWorkflowPaths(paths: string[], workflowSrc: string, preferredLang: string): string[] {
  const expanded: string[] = []
  for (const p of paths) {
    if (p === GIT_GROUP_SENTINEL) {
      expanded.push(...getGitPromptFiles(workflowSrc, preferredLang))
    }
    else {
      expanded.push(p)
    }
  }
  return expanded
}

// Resolve actual Git prompt files from templates
function getGitPromptFiles(workflowSrc: string, preferredLang: string): string[] {
  const gitPromptsDir = join(workflowSrc, 'git', preferredLang)
  const files = [
    'git-commit.md',
    'git-rollback.md',
    'git-cleanBranches.md',
    'git-worktree.md',
  ]

  const resolved: string[] = []
  for (const f of files) {
    const full = join(gitPromptsDir, f)
    if (exists(full))
      resolved.push(full)
  }
  return resolved
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

/**
 * Apply custom API configuration directly (for skipPrompt mode)
 */
async function applyCustomApiConfig(customApiConfig: NonNullable<CodexFullInitOptions['customApiConfig']>): Promise<void> {
  const { type, token, baseUrl, model } = customApiConfig

  // Always backup existing config before modification
  const backupPath = backupCodexComplete()
  if (backupPath) {
    console.log(ansis.gray(getBackupMessage(backupPath)))
  }

  const existingConfig = readCodexConfig()
  const existingAuth = readJsonConfig<Record<string, string>>(CODEX_AUTH_FILE, { defaultValue: {} }) || {}
  const providers: CodexProvider[] = []
  const authEntries: Record<string, string> = { ...existingAuth }

  // Create provider based on configuration
  const providerId = type === 'auth_token' ? 'official-auth-token' : 'custom-api-key'
  const providerName = type === 'auth_token' ? 'Official Auth Token' : 'Custom API Key'
  const existingProvider = existingConfig?.providers.find(p => p.id === providerId)

  providers.push({
    id: providerId,
    name: providerName,
    baseUrl: baseUrl || existingProvider?.baseUrl || 'https://api.anthropic.com',
    wireApi: existingProvider?.wireApi || 'responses',
    tempEnvKey: existingProvider?.tempEnvKey || `${providerId.toUpperCase()}_API_KEY`,
    requiresOpenaiAuth: existingProvider?.requiresOpenaiAuth ?? false,
    model: model || existingProvider?.model,
  })

  // Preserve other providers (without duplicating current one)
  if (existingConfig?.providers) {
    providers.push(...existingConfig.providers.filter(p => p.id !== providerId))
  }

  // Store auth entry if token provided
  if (token) {
    authEntries[providerId] = token
    // Also write OPENAI_API_KEY for compatibility with Codex CLI expectations
    authEntries.OPENAI_API_KEY = token
  }

  // Write configuration files
  const configData: CodexConfigData = {
    model: model || existingConfig?.model || 'claude-3-5-sonnet-20241022', // Prefer provided model, then existing, fallback default
    modelProvider: providerId,
    modelProviderCommented: false,
    providers,
    mcpServices: existingConfig?.mcpServices || [],
    managed: true,
    otherConfig: existingConfig?.otherConfig || [],
  }

  // Write TOML format for config file using managed renderer
  writeCodexConfig(configData)
  // Auth file remains JSON format
  writeJsonConfig(CODEX_AUTH_FILE, authEntries)

  updateZcfConfig({ codeToolType: 'codex' })

  console.log(ansis.green(`✔ ${i18n.t('codex:apiConfigured')}`))
}

export async function configureCodexApi(options?: CodexFullInitOptions): Promise<void> {
  ensureI18nInitialized()

  const { skipPrompt = false, apiMode, customApiConfig } = options ?? {}
  const existingConfig = readCodexConfig()
  const existingAuth = readJsonConfig<Record<string, string | null>>(CODEX_AUTH_FILE, { defaultValue: {} }) || {}

  // Handle skipPrompt mode
  if (skipPrompt) {
    if (apiMode === 'skip') {
      // Skip API configuration entirely
      return
    }

    if (apiMode === 'custom' && customApiConfig) {
      // Use custom API configuration directly
      await applyCustomApiConfig(customApiConfig)
      return
    }

    if (apiMode === 'official') {
      // Use official API mode
      const success = await switchToOfficialLogin()
      if (success) {
        updateZcfConfig({ codeToolType: 'codex' })
      }
      return
    }
  }

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
  const backupPath = backupCodexComplete()
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
    // Step 1: Select API provider (custom or preset)
    const { getApiProviders } = await import('../../config/api-providers')
    const apiProviders = getApiProviders('codex')

    const providerChoices = [
      { name: i18n.t('api:customProvider'), value: 'custom' },
      ...apiProviders.map((p: any) => ({ name: p.name, value: p.id })),
    ]

    const { selectedProvider } = await inquirer.prompt<{ selectedProvider: string }>([{
      type: 'list',
      name: 'selectedProvider',
      message: i18n.t('api:selectApiProvider'),
      choices: addNumbersToChoices(providerChoices),
    }])

    let prefilledBaseUrl: string | undefined
    let prefilledWireApi: 'responses' | 'chat' | undefined
    let prefilledModel: string | undefined

    if (selectedProvider !== 'custom') {
      const provider = apiProviders.find((p: any) => p.id === selectedProvider)
      if (provider?.codex) {
        prefilledBaseUrl = provider.codex.baseUrl
        prefilledWireApi = provider.codex.wireApi
        prefilledModel = provider.codex.defaultModel
        console.log(ansis.gray(i18n.t('api:providerSelected', { name: provider.name })))
      }
    }

    const answers = await inquirer.prompt<{ providerName: string, baseUrl: string, wireApi: string, apiKey: string }>([
      {
        type: 'input',
        name: 'providerName',
        message: i18n.t('codex:providerNamePrompt'),
        default: selectedProvider !== 'custom' ? apiProviders.find((p: any) => p.id === selectedProvider)?.name : firstExisting?.name,
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
        default: prefilledBaseUrl || ((answers: any) => existingMap.get(answers.providerId)?.baseUrl || 'https://api.openai.com/v1'),
        when: () => selectedProvider === 'custom',
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
        default: prefilledWireApi || ((answers: any) => existingMap.get(sanitizeProviderName(answers.providerName))?.wireApi || 'responses'),
        when: () => selectedProvider === 'custom', // Only ask if custom
      },
      {
        type: 'input',
        name: 'apiKey',
        message: selectedProvider !== 'custom'
          ? i18n.t('api:enterProviderApiKey', { provider: apiProviders.find((p: any) => p.id === selectedProvider)?.name || selectedProvider })
          : i18n.t('codex:providerApiKeyPrompt'),
        validate: (input: string) => !!input || i18n.t('codex:providerApiKeyRequired'),
      },
    ])

    // For custom provider, prompt for model configuration
    let customModel: string | undefined
    if (selectedProvider === 'custom') {
      const { model } = await inquirer.prompt<{ model: string }>([{
        type: 'input',
        name: 'model',
        message: `${i18n.t('configuration:enterCustomModel')}${i18n.t('common:emptyToSkip')}`,
        default: 'gpt-5-codex',
      }])
      if (model.trim()) {
        customModel = model.trim()
      }
    }

    const providerId = sanitizeProviderName(answers.providerName)
    const tempEnvKey = `${providerId.toUpperCase().replace(/-/g, '_')}_API_KEY`

    // Check for duplicate names
    const existingProvider = existingMap.get(providerId)
    const sessionProvider = currentSessionProviders.get(providerId)

    if (existingProvider || sessionProvider) {
      const sourceType = existingProvider ? 'existing' : 'session'
      const sourceProvider = existingProvider || sessionProvider

      const shouldOverwrite = await promptBoolean({
        message: i18n.t('codex:providerDuplicatePrompt', {
          name: sourceProvider!.name,
          source: sourceType === 'existing' ? i18n.t('codex:existingConfig') : i18n.t('codex:currentSession'),
        }),
        defaultValue: false,
      })

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
      baseUrl: selectedProvider === 'custom' ? answers.baseUrl : prefilledBaseUrl!,
      wireApi: selectedProvider === 'custom' ? (answers.wireApi || 'responses') : prefilledWireApi!,
      tempEnvKey,
      requiresOpenaiAuth: true,
      model: customModel || prefilledModel || 'gpt-5-codex', // Use custom model, provider's default model, or fallback
    }

    providers.push(newProvider)
    currentSessionProviders.set(providerId, newProvider)
    authEntries[tempEnvKey] = answers.apiKey

    const addAnother = await promptBoolean({
      message: i18n.t('codex:addProviderPrompt'),
      defaultValue: false,
    })

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

  const selectedProvider = providers.find(provider => provider.id === defaultProvider)
  if (selectedProvider) {
    const tempEnvKey = selectedProvider.tempEnvKey
    const defaultApiKey = authEntries[tempEnvKey] ?? existingAuth[tempEnvKey] ?? null
    if (defaultApiKey)
      authEntries.OPENAI_API_KEY = defaultApiKey
  }

  writeCodexConfig({
    model: existingConfig?.model || null,
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

export { configureCodexMcp }

export interface CodexFullInitOptions extends CodexWorkflowLanguageOptions {
  // Workflow selection options
  workflows?: string[] // Specific workflows to install, empty means all
  // MCP service options
  mcpServices?: string[] | false // Specific MCP services to install, false means skip
  // API configuration options
  apiMode?: 'official' | 'custom' | 'skip' // API mode selection
  customApiConfig?: {
    type: 'auth_token' | 'api_key'
    token?: string
    baseUrl?: string
    model?: string // Model parameter for Codex
  }
}

export async function runCodexFullInit(
  options?: CodexFullInitOptions,
): Promise<AiOutputLanguage | string> {
  ensureI18nInitialized()

  await installCodexCli(options?.skipPrompt || false)
  const aiOutputLang = await runCodexWorkflowImportWithLanguageSelection(options)
  await configureCodexApi(options)
  await configureCodexMcp(options)

  return aiOutputLang
}

function ensureCodexAgentsLanguageDirective(aiOutputLang: AiOutputLanguage | string): void {
  if (!exists(CODEX_AGENTS_FILE))
    return

  const content = readFile(CODEX_AGENTS_FILE)
  const targetLabel = resolveCodexLanguageLabel(aiOutputLang)
  const directiveRegex = /\*\*Most Important:\s*Always respond in ([^*]+)\*\*/i
  const existingMatch = directiveRegex.exec(content)

  if (existingMatch && normalizeLanguageLabel(existingMatch[1]) === normalizeLanguageLabel(targetLabel))
    return

  let updatedContent = content.replace(/\*\*Most Important:\s*Always respond in [^*]+\*\*\s*/gi, '').trimEnd()

  if (updatedContent.length > 0 && !updatedContent.endsWith('\n'))
    updatedContent += '\n'

  updatedContent += `\n**Most Important:Always respond in ${targetLabel}**\n`

  const backupPath = backupCodexAgents()
  if (backupPath)
    console.log(ansis.gray(getBackupMessage(backupPath)))

  writeFile(CODEX_AGENTS_FILE, updatedContent)
  console.log(ansis.gray(`  ${i18n.t('configuration:addedLanguageDirective')}: ${targetLabel}`))
}

function resolveCodexLanguageLabel(aiOutputLang: AiOutputLanguage | string): string {
  const directive = AI_OUTPUT_LANGUAGES[aiOutputLang as AiOutputLanguage]?.directive
  if (directive) {
    const match = directive.match(/Always respond in\s+(.+)/i)
    if (match)
      return match[1].trim()
  }

  if (typeof aiOutputLang === 'string')
    return aiOutputLang

  return 'English'
}

function normalizeLanguageLabel(label: string): string {
  return label.trim().toLowerCase()
}

export async function runCodexUpdate(force = false, skipPrompt = false): Promise<boolean> {
  ensureI18nInitialized()
  console.log(ansis.bold.cyan(`\n🔍 ${i18n.t('updater:checkingTools')}\n`))
  const spinner = ora(i18n.t('updater:checkingVersion')).start()

  try {
    const { installed, currentVersion, latestVersion, needsUpdate } = await checkCodexUpdate()
    spinner.stop()

    if (!installed) {
      console.log(ansis.yellow(i18n.t('codex:notInstalled')))
      return false
    }

    if (!needsUpdate && !force) {
      console.log(ansis.green(format(i18n.t('codex:upToDate'), { version: currentVersion || '' })))
      return true
    }

    if (!latestVersion) {
      console.log(ansis.yellow(i18n.t('codex:cannotCheckVersion')))
      return false
    }

    // Show version info
    console.log(ansis.cyan(format(i18n.t('codex:currentVersion'), { version: currentVersion || '' })))
    console.log(ansis.cyan(format(i18n.t('codex:latestVersion'), { version: latestVersion })))

    // Handle confirmation based on skipPrompt mode
    if (!skipPrompt) {
      // Interactive mode: Ask for confirmation
      const confirm = await promptBoolean({
        message: i18n.t('codex:confirmUpdate'),
        defaultValue: true,
      })

      if (!confirm) {
        console.log(ansis.gray(i18n.t('codex:updateSkipped')))
        return true
      }
    }
    else {
      // Skip-prompt mode: Auto-update with notification
      console.log(ansis.cyan(i18n.t('codex:autoUpdating')))
    }

    // Perform update
    const updateSpinner = ora(i18n.t('codex:updating')).start()

    try {
      await executeCodexInstallation(true)
      updateSpinner.succeed(i18n.t('codex:updateSuccess'))
      return true
    }
    catch (error) {
      updateSpinner.fail(i18n.t('codex:updateFailed'))
      console.error(ansis.red(error instanceof Error ? error.message : String(error)))
      return false
    }
  }
  catch (error) {
    spinner.fail(i18n.t('codex:checkFailed'))
    console.error(ansis.red(error instanceof Error ? error.message : String(error)))
    return false
  }
}

export async function runCodexUninstall(): Promise<void> {
  ensureI18nInitialized()

  // Import CodexUninstaller dynamically to avoid circular dependency
  const { CodexUninstaller } = await import('./codex-uninstaller')
  const zcfConfig = readZcfConfig()
  const preferredLang = zcfConfig?.preferredLang
  const uninstallLang: SupportedLang
    = preferredLang && SUPPORTED_LANGS.includes(preferredLang as SupportedLang)
      ? preferredLang as SupportedLang
      : 'en'
  const uninstaller = new CodexUninstaller(uninstallLang)

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
      const confirm = await promptBoolean({
        message: i18n.t('codex:uninstallPrompt'),
        defaultValue: false,
      })

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
  const backupPath = backupCodexComplete()
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
  const backupPath = backupCodexComplete()
  if (backupPath) {
    console.log(ansis.gray(getBackupMessage(backupPath)))
  }

  try {
    let preservedModelProvider = existingConfig.modelProvider
    if (!preservedModelProvider) {
      try {
        const rawContent = readFile(CODEX_CONFIG_FILE)
        const parsedToml = parseToml(rawContent) as Record<string, any>
        if (typeof parsedToml.model_provider === 'string' && parsedToml.model_provider.trim().length > 0)
          preservedModelProvider = parsedToml.model_provider.trim()
      }
      catch {
        // Ignore read/parse failures; fall back to parsed config value
      }
    }

    const shouldCommentModelProvider = typeof preservedModelProvider === 'string' && preservedModelProvider.length > 0

    // Comment out model_provider but keep providers configuration
    const updatedConfig: CodexConfigData = {
      ...existingConfig,
      modelProvider: shouldCommentModelProvider ? preservedModelProvider : existingConfig.modelProvider,
      modelProviderCommented: shouldCommentModelProvider
        ? true
        : existingConfig.modelProviderCommented,
    }

    writeCodexConfig(updatedConfig)

    // Set OPENAI_API_KEY to null for official mode - preserve other auth settings
    const auth = readJsonConfig<Record<string, string | null>>(CODEX_AUTH_FILE, { defaultValue: {} }) || {}
    auth.OPENAI_API_KEY = null
    writeJsonConfig(CODEX_AUTH_FILE, auth, { pretty: true })

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
  const backupPath = backupCodexComplete()
  if (backupPath) {
    console.log(ansis.gray(getBackupMessage(backupPath)))
  }

  try {
    // Determine the model to use
    let targetModel = existingConfig.model

    if (provider.model) {
      // Provider has a specific model, use it
      targetModel = provider.model
    }
    else {
      // Provider doesn't have a model, check current model
      const currentModel = existingConfig.model
      if (currentModel !== 'gpt-5' && currentModel !== 'gpt-5-codex') {
        // Current model is neither gpt-5 nor gpt-5-codex, change to gpt-5-codex
        targetModel = 'gpt-5-codex'
      }
      // Otherwise keep the current model (gpt-5 or gpt-5-codex)
    }

    // Uncomment model_provider and set to specified provider
    const updatedConfig: CodexConfigData = {
      ...existingConfig,
      model: targetModel,
      modelProvider: providerId,
      modelProviderCommented: false, // Ensure it's not commented
    }

    writeCodexConfig(updatedConfig)

    // Set OPENAI_API_KEY to the provider's environment variable value for VSCode
    const auth = readJsonConfig<Record<string, string | null>>(CODEX_AUTH_FILE, { defaultValue: {} }) || {}
    const envValue = auth[provider.tempEnvKey] || null
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
