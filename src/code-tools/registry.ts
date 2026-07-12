import type { CodeToolAdapter, CodeToolId } from './types'

const adapterById = new Map<CodeToolId, CodeToolAdapter>()
const adapterByAlias = new Map<string, CodeToolAdapter>()

function normalizeKey(value: string): string {
  return value.toLowerCase().trim()
}

/**
 * Register a code-tool adapter. Built-in adapters are registered in register-builtins.ts.
 */
export function registerCodeTool(adapter: CodeToolAdapter): void {
  if (adapterById.has(adapter.id))
    throw new Error(`Code tool adapter already registered: ${adapter.id}`)

  adapterById.set(adapter.id, adapter)

  for (const alias of adapter.aliases) {
    const normalized = normalizeKey(alias)
    if (adapterByAlias.has(normalized))
      throw new Error(`Code tool alias already in use: ${alias}`)
    adapterByAlias.set(normalized, adapter)
  }

  adapterByAlias.set(normalizeKey(adapter.id), adapter)
}

/**
 * Resolve an adapter by canonical id or alias.
 */
export function resolveCodeTool(idOrAlias: string): CodeToolAdapter | undefined {
  return adapterByAlias.get(normalizeKey(idOrAlias))
}

/**
 * Get a registered adapter or throw.
 */
export function getCodeTool(idOrAlias: string): CodeToolAdapter {
  const adapter = resolveCodeTool(idOrAlias)
  if (!adapter)
    throw new Error(`Unknown code tool: ${idOrAlias}`)
  return adapter
}

/**
 * List all registered adapters (deduplicated).
 */
export function listCodeTools(): CodeToolAdapter[] {
  return Array.from(adapterById.values())
}

/**
 * Canonical ids of all registered adapters.
 */
export function listCodeToolIds(): CodeToolId[] {
  return Array.from(adapterById.keys())
}

/**
 * Check whether an id or alias is registered.
 */
export function isCodeToolRegistered(idOrAlias: string): boolean {
  return resolveCodeTool(idOrAlias) !== undefined
}

/**
 * Detect which agent CLIs are currently installed.
 */
export async function detectInstalledCodeTools(): Promise<CodeToolAdapter[]> {
  const adapters = listCodeTools()
  const results = await Promise.all(
    adapters.map(async (adapter) => {
      try {
        return await adapter.detectInstalled() ? adapter : null
      }
      catch {
        return null
      }
    }),
  )
  return results.filter((a): a is CodeToolAdapter => a !== null)
}

/**
 * Build alias map for CLI resolution (alias → canonical id).
 */
export function getCodeToolAliasMap(): Record<string, CodeToolId> {
  const map: Record<string, CodeToolId> = {}
  for (const adapter of listCodeTools()) {
    for (const alias of adapter.aliases)
      map[normalizeKey(alias)] = adapter.id
  }
  return map
}

/**
 * Banner strings keyed by canonical id.
 */
export function getCodeToolBanners(): Record<CodeToolId, string> {
  const banners = {} as Record<CodeToolId, string>
  for (const adapter of listCodeTools())
    banners[adapter.id] = adapter.banner
  return banners
}
