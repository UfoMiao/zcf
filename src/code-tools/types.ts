import type { AiOutputLanguage, SupportedLang } from '../constants'
import type { InstallMethod } from '../types/config'
import type { UninstallItem } from '../utils/uninstaller'
import type { CodeToolType } from './definitions'

export type CodeToolCapability
  = | 'init'
    | 'update'
    | 'uninstall'
    | 'backup'
    | 'configurations'
    | 'providers'
    | 'tool-update'
    | 'menu'

export type CodeToolMenuAction = string

export interface CodeToolMenuItem {
  key: string
  labelKey: string
  descriptionKey?: string
  action: CodeToolMenuAction
  promptToReturn?: boolean
}

export interface CodeToolMenuCapability {
  items: readonly CodeToolMenuItem[]
  extras?: readonly CodeToolMenuItem[]
  uninstallLabelKey: string
  uninstallDescriptionKey: string
  updateLabelKey: string
  updateDescriptionKey: string
  updateAction: CodeToolMenuAction
  run: (action: CodeToolMenuAction) => Promise<void>
}

export type ConfigFileFormat = 'json' | 'toml' | 'markdown' | 'yaml'
export type ConfigMergeStrategy = 'copy' | 'merge' | 'overwrite' | 'append' | 'skip'

export interface CodeToolConfigFile {
  id: string
  path: string
  format: ConfigFileFormat
  mergeStrategy: ConfigMergeStrategy
}

export interface CodeToolInstallation {
  command: string
  npmPackage: string
  homebrewCask?: string
  supportedMethods: readonly InstallMethod[]
  recommendedMethods: Partial<Record<'macos' | 'linux' | 'windows', readonly InstallMethod[]>>
  nativeCommands?: Partial<Record<'curl' | 'powershell' | 'cmd', {
    command: string
    args: readonly string[]
  }>>
  storesInstallMethodInMcpConfig?: boolean
}

export interface CodeToolPaths {
  homeDir: string
  configFiles: readonly CodeToolConfigFile[]
  memoryFile?: string
  skillsDir?: string
  templateDir?: string
  agentsDir?: string
  legacyWorkflowPaths?: readonly string[]
}

export interface CodeToolDefinition {
  id: CodeToolType
  displayName: string
  displayNameKey: string
  aliases: readonly string[]
  paths: CodeToolPaths
  skillsAgents: readonly string[]
  installation: CodeToolInstallation
}

export interface CodeToolContext {
  lang: SupportedLang
  force?: boolean
  skipPrompt?: boolean
}

export interface CodeToolInitOptions {
  configLang?: SupportedLang
  aiOutputLang?: AiOutputLanguage | string
  force?: boolean
  skipBanner?: boolean
  skipPrompt?: boolean
  configAction?: 'new' | 'backup' | 'merge' | 'docs-only' | 'skip'
  apiType?: 'auth_token' | 'api_key' | 'ccr_proxy' | 'skip'
  apiKey?: string
  apiUrl?: string
  apiModel?: string
  apiHaikuModel?: string
  apiSonnetModel?: string
  apiOpusModel?: string
  provider?: string
  mcpServices?: string[] | string | boolean
  workflows?: string[] | string | boolean
  outputStyles?: string[] | string | boolean
  defaultOutputStyle?: string
  allLang?: string
  installCometixLine?: string | boolean
  apiConfigs?: string
  apiConfigsFile?: string
}

export interface CodeToolUpdateOptions {
  configLang?: SupportedLang
  aiOutputLang?: AiOutputLanguage | string
  skipBanner?: boolean
  skipPrompt?: boolean
}

export interface CodeToolUninstallOptions {
  lang?: SupportedLang
  mode?: 'complete' | 'custom' | 'interactive'
  items?: UninstallItem[] | string
}

export interface ConfigItem {
  id: string
  name: string
  isActive?: boolean
  description?: string
}

export interface UpdateCheckResult {
  hasUpdate: boolean
  currentVersion?: string
  latestVersion?: string
}

/** CLI `--api-configs` JSON item before an adapter normalizes it to ProviderProfile. */
export interface ProviderDefinition {
  name?: string
  type?: 'api_key' | 'auth_token' | 'ccr_proxy'
  key?: string
  url?: string
  default?: boolean
  primaryModel?: string
  defaultHaikuModel?: string
  defaultSonnetModel?: string
  defaultOpusModel?: string
  provider?: string
}

export interface ProviderProfile {
  id: string
  name: string
  provider?: string
  baseUrl?: string
  auth: {
    type: 'api_key' | 'auth_token' | 'oauth' | 'ccr_proxy'
    credential?: string
    envKey?: string
  }
  models: {
    primary?: string
    small?: string
    medium?: string
    large?: string
  }
  protocol?: string
  /** Import-time default only; adapters persist it through their own switch API. */
  default?: boolean
}

export interface CodeToolConfigurationCapability {
  list: (ctx: CodeToolContext) => Promise<ConfigItem[]>
  switch: (target: string, ctx: CodeToolContext) => Promise<void>
  displayList?: (ctx: CodeToolContext) => Promise<void>
  interactiveSwitch?: (ctx: CodeToolContext) => Promise<void>
}

export interface CodeToolProviderCapability {
  toProfiles: (definitions: ProviderDefinition[]) => Promise<ProviderProfile[]>
  importDefinitions: (profiles: ProviderProfile[], ctx: CodeToolContext) => Promise<void>
}

export interface CodeToolAdapter {
  readonly definition: CodeToolDefinition
  detectInstalled: () => Promise<boolean>
  validateInitOptions: (options: CodeToolInitOptions) => Promise<void>
  init: (options: CodeToolInitOptions, ctx: CodeToolContext) => Promise<AiOutputLanguage | string | undefined | void>
  update: (options: CodeToolUpdateOptions, ctx: CodeToolContext) => Promise<void>
  uninstall: (options: CodeToolUninstallOptions, ctx: CodeToolContext) => Promise<void>
  backup?: (file: CodeToolConfigFile) => Promise<string | null>
  checkUpdates?: (ctx: CodeToolContext) => Promise<UpdateCheckResult>
  updateTools?: (skipPrompt: boolean, ctx: CodeToolContext) => Promise<void>
  configurations?: CodeToolConfigurationCapability
  providers?: CodeToolProviderCapability
  menu: CodeToolMenuCapability
}
