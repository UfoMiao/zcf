import type { CodeToolContext, CodeToolInitOptions } from '../types'
import { runClaudeCodeInit as runLegacyClaudeCodeInit } from './legacy-init'

export async function runClaudeCodeInit(
  options: CodeToolInitOptions,
  _ctx: CodeToolContext,
): Promise<void> {
  await runLegacyClaudeCodeInit({
    ...options,
    codeType: 'claude-code',
    skipBanner: true,
  })
}
