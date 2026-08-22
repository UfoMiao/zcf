import type { CodeToolAdapter } from './types'
import { claudeCodeAdapter } from './claude-code/adapter'
import { codexAdapter } from './codex/adapter'
import { CodeToolRegistry } from './registry'

export const BUILTIN_CODE_TOOL_ADAPTERS: readonly CodeToolAdapter[] = [
  claudeCodeAdapter,
  codexAdapter,
]

export function createBuiltinCodeToolRegistry(): CodeToolRegistry {
  const registry = new CodeToolRegistry()
  for (const adapter of BUILTIN_CODE_TOOL_ADAPTERS)
    registry.register(adapter)
  return registry
}

let builtinRegistry: CodeToolRegistry | undefined

export function getCodeToolRegistry(): CodeToolRegistry {
  builtinRegistry ??= createBuiltinCodeToolRegistry()
  return builtinRegistry
}
