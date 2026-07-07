import { claudeCodeAdapter } from './claude-code'
import { codexAdapter } from './codex'
import { opencodeAdapter } from './opencode'
import { listAgentIds, registerAgent } from './registry'

export * from './adapter-interface'
export * from './registry'
export { claudeCodeAdapter, codexAdapter, opencodeAdapter }

/**
 * Register all built-in agent adapters.
 *
 * Call this once at application startup before resolving agents.
 * The registry is process-scoped, so repeated calls are no-ops to
 * keep setup idempotent in long-running or test environments.
 */
export function registerAllAgents(): void {
  if (listAgentIds().length > 0) {
    return
  }
  registerAgent(claudeCodeAdapter)
  registerAgent(codexAdapter)
  registerAgent(opencodeAdapter)
}
