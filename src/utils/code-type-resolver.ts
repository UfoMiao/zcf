import type { CodeToolType } from '../constants'
import { CODE_TOOL_TYPES, DEFAULT_CODE_TOOL_TYPE } from '../constants'
import { i18n } from '../i18n'
import { readZcfConfigAsync } from './zcf-config'

function isLegacyCodeToolType(id: string): id is CodeToolType {
  return (CODE_TOOL_TYPES as readonly string[]).includes(id)
}

type AdaptersModule = typeof import('../adapters')

let adaptersPromise: Promise<AdaptersModule> | undefined

async function getAdapters(): Promise<AdaptersModule> {
  if (!adaptersPromise) {
    adaptersPromise = import('../adapters')
  }
  return adaptersPromise
}

async function ensureAgentsRegistered(): Promise<void> {
  const adapters = await getAdapters()
  if (adapters.listAgentIds().length === 0) {
    adapters.registerAllAgents()
  }
}

function getValidOptions(adapters: AdaptersModule): string {
  const agentList = adapters.listAgents().filter(a => isLegacyCodeToolType(a.id))
  const ids = agentList.map(a => a.id)
  const aliases = agentList.flatMap(a => a.aliases)
  return [...new Set([...ids, ...aliases])].sort().join(', ')
}

/**
 * Resolve code type from parameter, abbreviation, or default config.
 *
 * Phase 0-2 (UFO-131) delegates resolution to the agent registry while
 * preserving the legacy CodeToolType return type for existing commands.
 * Only adapters whose id is in the legacy CODE_TOOL_TYPES are returned to
 * avoid leaking pilot agents (e.g. opencode) into downstream commands.
 *
 * @param codeTypeParam - Code type parameter from command line
 * @returns Resolved code tool type
 */
export async function resolveCodeType(codeTypeParam?: string): Promise<CodeToolType> {
  const adapters = await getAdapters()
  await ensureAgentsRegistered()

  // If parameter is provided, resolve it via the registry
  if (codeTypeParam) {
    const normalizedParam = codeTypeParam.toLowerCase().trim()

    if (adapters.isAgentRegistered(normalizedParam)) {
      const adapter = adapters.resolveAgent(normalizedParam)!
      if (isLegacyCodeToolType(adapter.id)) {
        return adapter.id
      }
    }

    // Prepare valid options for error message
    const validOptions = getValidOptions(adapters)

    // Get the actual default value that will be used
    let defaultValue = DEFAULT_CODE_TOOL_TYPE
    try {
      const config = await readZcfConfigAsync()
      if (config?.codeToolType && adapters.isAgentRegistered(config.codeToolType)) {
        const adapter = adapters.resolveAgent(config.codeToolType)!
        if (isLegacyCodeToolType(adapter.id)) {
          defaultValue = adapter.id
        }
      }
    }
    catch {
      // If config reading fails, use DEFAULT_CODE_TOOL_TYPE
    }

    throw new Error(
      i18n.t('errors:invalidCodeType', { value: codeTypeParam, validOptions, defaultValue }),
    )
  }

  // No parameter provided, use config default
  try {
    const config = await readZcfConfigAsync()
    if (config?.codeToolType && adapters.isAgentRegistered(config.codeToolType)) {
      const adapter = adapters.resolveAgent(config.codeToolType)!
      if (isLegacyCodeToolType(adapter.id)) {
        return adapter.id
      }
    }
  }
  catch {
    // If config reading fails, continue to fallback
  }

  // Fallback to default
  return DEFAULT_CODE_TOOL_TYPE
}

/**
 * Check if a value is a valid legacy code tool type or alias.
 */
export async function isValidCodeType(value: string): Promise<boolean> {
  const adapters = await getAdapters()
  await ensureAgentsRegistered()
  if (!adapters.isAgentRegistered(value)) {
    return false
  }
  const adapter = adapters.resolveAgent(value)!
  return isLegacyCodeToolType(adapter.id)
}
