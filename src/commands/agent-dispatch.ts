import type { AgentAdapter, AgentContext, InstallOptions, UninstallOptions, UpdateOptions } from '../adapters/adapter-interface'
import { DEFAULT_CODE_TOOL_TYPE } from '../constants'
import { i18n } from '../i18n'
import { readZcfConfigAsync } from '../utils/zcf-config'

/**
 * Safely translate a key, falling back to the key itself when i18n is not
 * initialized or the translation is missing.
 */
function t(key: string, options?: Record<string, unknown>): string {
  try {
    const result = i18n.t(key, options)
    return typeof result === 'string' ? result : key
  }
  catch {
    return key
  }
}

export interface AgentCommandOptions {
  agent?: string
  codeType?: string
  lang?: string
  configLang?: string
  aiOutputLang?: string
  force?: boolean
  skipPrompt?: boolean
  [key: string]: unknown
}

async function getAdaptersModule(): Promise<typeof import('../adapters')> {
  return import('../adapters')
}

/**
 * Build a human-readable list of valid agent ids and aliases for error messages.
 */
function getValidAgentOptions(adapters: typeof import('../adapters')): string {
  const ids = adapters.listAgentIds()
  const aliases = adapters.listAgents().flatMap(a => a.aliases)
  return [...new Set([...ids, ...aliases])].sort().join(', ')
}

/**
 * Resolve the target agent adapter from CLI options or ZCF config.
 *
 * The registry is registered on first call so external adapters loaded by
 * Phase 3-4 extensions are discoverable.
 */
export async function resolveAgentAdapter(options: AgentCommandOptions): Promise<AgentAdapter> {
  const adapters = await getAdaptersModule()
  await adapters.registerAllAgents()

  const preferred = options.agent || options.codeType
  if (preferred) {
    const adapter = adapters.resolveAgent(preferred)
    if (adapter) {
      return adapter
    }

    const validOptions = getValidAgentOptions(adapters)
    console.error(
      t('errors:invalidCodeType', {
        value: preferred,
        validOptions,
        defaultValue: DEFAULT_CODE_TOOL_TYPE,
      }),
    )
  }

  try {
    const config = await readZcfConfigAsync()
    if (config?.codeToolType) {
      const adapter = adapters.resolveAgent(config.codeToolType)
      if (adapter) {
        return adapter
      }
    }
  }
  catch {
    // Ignore config read failures and fall back to the default adapter.
  }

  const defaultAdapter = adapters.resolveAgent(DEFAULT_CODE_TOOL_TYPE)
  if (!defaultAdapter) {
    throw new Error(`Default agent adapter "${DEFAULT_CODE_TOOL_TYPE}" is not registered.`)
  }
  return defaultAdapter
}

/**
 * Build the agent context passed to adapter lifecycle methods.
 */
export function buildAgentContext(options: AgentCommandOptions): AgentContext {
  return {
    lang: (options.configLang || options.lang || i18n.language || 'en') as any,
    force: options.force,
    skipPrompt: options.skipPrompt,
  }
}

/**
 * Dispatch an install command to the resolved adapter.
 */
export async function dispatchInstall(options: InstallOptions & AgentCommandOptions): Promise<void> {
  const { runInstall } = await import('../core/install-runner')
  const adapter = await resolveAgentAdapter(options)
  const ctx = buildAgentContext(options)
  await runInstall(adapter, options, ctx)
}

/**
 * Dispatch an update command to the resolved adapter.
 */
export async function dispatchUpdate(options: UpdateOptions & AgentCommandOptions): Promise<void> {
  const adapter = await resolveAgentAdapter(options)
  const ctx = buildAgentContext(options)
  await adapter.update(options, ctx)
}

/**
 * Dispatch an uninstall command to the resolved adapter.
 */
export async function dispatchUninstall(options: UninstallOptions & AgentCommandOptions): Promise<void> {
  const adapter = await resolveAgentAdapter(options)
  const ctx = buildAgentContext(options)
  await adapter.uninstall(options, ctx)
}

/**
 * Dispatch a configuration switch or list operation to the resolved adapter.
 */
export async function dispatchConfigSwitch(
  target: string | undefined,
  options: { agent?: string, codeType?: string, list?: boolean, lang?: string },
): Promise<void> {
  const adapter = await resolveAgentAdapter(options)
  const ctx = buildAgentContext(options)

  if (options.list) {
    const configs = await adapter.listConfigurations?.()
    if (!configs || configs.length === 0) {
      console.log(t('multi-config:noConfigurationsAvailable', { agent: adapter.displayName }))
      return
    }
    console.log(t('multi-config:availableConfigurations', { agent: adapter.displayName }))
    configs.forEach((config) => {
      const marker = config.isActive ? '* ' : '  '
      console.log(`${marker}${config.name} (${config.id})`)
    })
    return
  }

  if (target) {
    if (!adapter.switchConfiguration) {
      throw new Error(t('errors:configSwitchNotSupported', { agent: adapter.displayName }))
    }
    await adapter.switchConfiguration(target, ctx)
    return
  }

  if (!adapter.listConfigurations || !adapter.switchConfiguration) {
    throw new Error(t('errors:configSwitchNotSupported', { agent: adapter.displayName }))
  }

  const configs = await adapter.listConfigurations()
  if (!configs || configs.length === 0) {
    console.log(t('multi-config:noConfigurationsAvailable', { agent: adapter.displayName }))
    return
  }

  const { default: inquirer } = await import('inquirer')
  const { selectedConfig } = await inquirer.prompt<{ selectedConfig: string }>([{
    type: 'list',
    name: 'selectedConfig',
    message: t('multi-config:selectConfiguration', { agent: adapter.displayName }),
    choices: configs.map(c => ({ name: `${c.isActive ? '* ' : ''}${c.name}`, value: c.id })),
  }])

  if (selectedConfig) {
    await adapter.switchConfiguration(selectedConfig, ctx)
  }
}

/**
 * Dispatch an update check to the resolved adapter.
 */
export async function dispatchCheckUpdates(
  options: { agent?: string, codeType?: string, skipPrompt?: boolean, lang?: string },
): Promise<void> {
  const adapter = await resolveAgentAdapter(options)
  const ctx = buildAgentContext(options)

  if (!adapter.checkUpdates) {
    console.log(t('updater:checkUpdatesNotSupported', { agent: adapter.displayName }))
    return
  }

  const result = await adapter.checkUpdates(ctx)
  if (!result.hasUpdate) {
    console.log(t('updater:noUpdateAvailable', { agent: adapter.displayName }))
    return
  }

  console.log(
    t('updater:updateAvailable', {
      agent: adapter.displayName,
      currentVersion: result.currentVersion || '',
      latestVersion: result.latestVersion || '',
    }),
  )
}
