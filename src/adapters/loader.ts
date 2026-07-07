import type { AgentAdapter, AgentId } from './adapter-interface'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { join } from 'pathe'
import { ZCF_CONFIG_DIR } from '../constants'
import { parseToml } from '../utils/toml-edit'

export interface ExternalAdapterManifest {
  id: AgentId
  displayName: string
  aliases?: string[]
  /** Absolute or relative path to the adapter implementation module */
  main?: string
  /** NPM package name that exports the adapter */
  package?: string
  /** Exported member to read from the module. Defaults to "default" or "adapter". */
  export?: string
}

const EXTERNAL_ADAPTERS_DIR = join(ZCF_CONFIG_DIR, 'adapters')

function isValidManifest(obj: unknown): obj is ExternalAdapterManifest {
  if (!obj || typeof obj !== 'object')
    return false
  const o = obj as Record<string, unknown>
  return typeof o.id === 'string' && typeof o.displayName === 'string'
}

async function resolveAdapterModule(manifest: ExternalAdapterManifest, manifestDir: string): Promise<AgentAdapter> {
  let moduleUrl: string | undefined

  if (manifest.package) {
    moduleUrl = manifest.package
  }
  else if (manifest.main) {
    const mainPath = manifest.main.startsWith('/')
      ? manifest.main
      : join(manifestDir, manifest.main)
    moduleUrl = pathToFileURL(mainPath).href
  }

  if (!moduleUrl) {
    throw new Error(`External adapter "${manifest.id}" must specify "main" or "package".`)
  }

  const mod = await import(moduleUrl)
  const exportName = manifest.export || 'default'
  const exported = exportName === 'default' ? mod.default : mod[exportName]
  const adapter: AgentAdapter = typeof exported === 'function' ? exported(manifest) : exported

  if (!adapter || typeof adapter.install !== 'function' || typeof adapter.isInstalled !== 'function') {
    throw new Error(`External adapter "${manifest.id}" does not export a valid AgentAdapter.`)
  }

  return adapter
}

/**
 * Load external adapter manifests from `~/.ufomiao/zcf/adapters/*.toml` and
 * from NPM packages referenced by those manifests.
 *
 * This is intentionally lenient: a broken adapter is logged and skipped so
 * that one bad community package cannot break the whole CLI.
 */
export async function loadExternalAdapters(adaptersDir: string = EXTERNAL_ADAPTERS_DIR): Promise<AgentAdapter[]> {
  if (!existsSync(adaptersDir)) {
    return []
  }

  const entries = readdirSync(adaptersDir)
  const adapters: AgentAdapter[] = []

  for (const entry of entries) {
    if (!entry.endsWith('.toml'))
      continue

    const manifestPath = join(adaptersDir, entry)
    try {
      const content = readFileSync(manifestPath, 'utf-8')
      const manifest = parseToml<ExternalAdapterManifest>(content)

      if (!isValidManifest(manifest)) {
        console.warn(`[zcf] Skipping invalid adapter manifest: ${manifestPath}`)
        continue
      }

      const adapter = await resolveAdapterModule(manifest, adaptersDir)
      adapters.push(adapter)
    }
    catch (error) {
      console.warn(`[zcf] Failed to load external adapter from ${manifestPath}: ${(error as Error).message}`)
    }
  }

  return adapters
}
