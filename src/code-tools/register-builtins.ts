import { claudeCodeAdapter } from './claude-code/adapter'
import { codexAdapter } from './codex/adapter'
import { registerCodeTool } from './registry'

let builtinsRegistered = false

/**
 * Register built-in code-tool adapters (idempotent).
 */
export function registerBuiltinCodeTools(): void {
  if (builtinsRegistered)
    return

  registerCodeTool(claudeCodeAdapter)
  registerCodeTool(codexAdapter)
  builtinsRegistered = true
}
