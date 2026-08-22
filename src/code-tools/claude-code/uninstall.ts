import type { CodeToolContext, CodeToolUninstallOptions } from '../types'
import { runLegacyClaudeCodeUninstall } from './legacy-uninstall'

export async function runClaudeCodeUninstall(
  options: CodeToolUninstallOptions,
  _ctx: CodeToolContext,
): Promise<void> {
  await runLegacyClaudeCodeUninstall({
    ...options,
    codeType: 'claude-code',
  })
}
