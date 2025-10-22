import type { CodexMcpService } from './codex'
import { getMcpCommand, isWindows } from '../platform'

/**
 * Apply platform-specific command transformation for Codex MCP services
 * Handles Windows cmd /c wrapper for commands like npx, uvx, etc.
 */
export function applyCodexPlatformCommand(config: CodexMcpService): void {
  // Only process if command exists (avoid wrapping configs without command, e.g., SSE services)
  if (isWindows() && config.command) {
    const mcpCmd = getMcpCommand(config.command)
    // Only modify if command needs Windows wrapper (cmd /c)
    if (mcpCmd[0] === 'cmd') {
      config.command = mcpCmd[0]
      config.args = [...mcpCmd.slice(1), ...(config.args || [])]
    }
  }
}
