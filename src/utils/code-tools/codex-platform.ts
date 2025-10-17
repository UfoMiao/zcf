import type { CodexMcpService } from './codex'
import { getMcpCommand, isWindows } from '../platform'

// KISS: 简单封装平台特定命令改写逻辑
export function applyCodexPlatformCommand(config: CodexMcpService): void {
  if (config.command === 'npx' && isWindows()) {
    const mcpCmd = getMcpCommand()
    config.command = mcpCmd[0]
    config.args = [...mcpCmd.slice(1), ...(config.args || [])]
  }
}
