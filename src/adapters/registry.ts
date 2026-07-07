import type { AgentAdapter, AgentId } from './adapter-interface'

/**
 * Registry of agent adapters.
 *
 * In Phase 0-2 adapters are registered explicitly in this module.
 * In Phase 3-4 (UFO-132) registration may be extended to load external
 * adapter definitions from ~/.ufomiao/zcf/adapters/ or npm packages.
 */
const adapterById = new Map<AgentId, AgentAdapter>()
const adapterByAlias = new Map<string, AgentAdapter>()

/**
 * Register an agent adapter.
 */
export function registerAgent(adapter: AgentAdapter): void {
  if (adapterById.has(adapter.id)) {
    throw new Error(`Agent adapter already registered: ${adapter.id}`)
  }

  adapterById.set(adapter.id, adapter)

  for (const alias of adapter.aliases) {
    const normalized = normalizeAlias(alias)
    if (adapterByAlias.has(normalized)) {
      throw new Error(`Agent alias already in use: ${alias}`)
    }
    adapterByAlias.set(normalized, adapter)
  }
}

/**
 * Resolve an adapter by canonical id or alias.
 */
export function resolveAgent(idOrAlias: string): AgentAdapter | undefined {
  const normalized = idOrAlias.toLowerCase().trim()
  return adapterById.get(normalized) ?? adapterByAlias.get(normalized)
}

/**
 * List all registered adapters (deduplicated).
 */
export function listAgents(): AgentAdapter[] {
  return Array.from(new Set(adapterById.values()))
}

/**
 * Return canonical ids of all registered adapters.
 */
export function listAgentIds(): AgentId[] {
  return Array.from(adapterById.keys())
}

/**
 * Detect which agent CLIs are currently installed.
 */
export async function detectInstalledAgents(): Promise<AgentAdapter[]> {
  const adapters = listAgents()
  const results = await Promise.all(
    adapters.map(async (adapter) => {
      try {
        const installed = await adapter.isInstalled()
        return installed ? adapter : null
      }
      catch {
        return null
      }
    }),
  )
  return results.filter((a): a is AgentAdapter => a !== null)
}

/**
 * Check whether an id or alias is registered.
 */
export function isAgentRegistered(idOrAlias: string): boolean {
  return resolveAgent(idOrAlias) !== undefined
}

function normalizeAlias(alias: string): string {
  return alias.toLowerCase().trim()
}
