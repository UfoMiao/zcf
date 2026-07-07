import { claudeCodeAdapter } from './claude-code'
import { codexAdapter } from './codex'
import { loadExternalAdapters } from './loader'
import { opencodeAdapter } from './opencode'
import { listAgentIds, registerAgent } from './registry'

export * from './adapter-interface'
export * from './loader'
export * from './registry'
export { claudeCodeAdapter, codexAdapter, opencodeAdapter }

/**
 * Register all built-in agent adapters.
 *
 * Call this once at application startup before resolving agents.
 * Each adapter is registered individually and skipped only if it is
 * already registered, keeping setup idempotent in long-running or test
 * environments.
 */
export async function registerAllAgents(): Promise<void> {
  if (!listAgentIds().includes(claudeCodeAdapter.id)) {
    registerAgent(claudeCodeAdapter)
  }
  if (!listAgentIds().includes(codexAdapter.id)) {
    registerAgent(codexAdapter)
  }
  if (!listAgentIds().includes(opencodeAdapter.id)) {
    registerAgent(opencodeAdapter)
  }

  try {
    const external = await loadExternalAdapters()
    for (const adapter of external) {
      if (!listAgentIds().includes(adapter.id)) {
        registerAgent(adapter)
      }
    }
  }
  catch {
    // External adapters are best-effort; do not fail startup.
  }
}
