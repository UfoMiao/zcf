import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import semver from 'semver'

const execAsync = promisify(exec)

/**
 * Get installed version of a command-line tool
 *
 * This function detects the version regardless of installation method (npm, Homebrew, etc.)
 * by executing the command and parsing its version output.
 *
 * @param command - Command name (e.g., 'claude', 'ccr', 'codex')
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Version string or null if command is not installed
 */
export async function getInstalledVersion(command: string, maxRetries = 3): Promise<string | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Try -v first (more universal), then --version
      let stdout: string
      try {
        const result = await execAsync(`${command} -v`)
        stdout = result.stdout
      }
      catch {
        // Fallback to --version if -v doesn't work
        const result = await execAsync(`${command} --version`)
        stdout = result.stdout
      }

      // Extract version from output
      const versionMatch = stdout.match(/(\d+\.\d+\.\d+(?:-[\w.]+)?)/)
      return versionMatch ? versionMatch[1] : null
    }
    catch {
      if (attempt === maxRetries) {
        // Final attempt failed, return null
        return null
      }
      // Wait briefly before retry (100ms * attempt number)
      await new Promise(resolve => setTimeout(resolve, 100 * attempt))
    }
  }
  return null
}

export async function getLatestVersion(packageName: string, maxRetries = 3): Promise<string | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { stdout } = await execAsync(`npm view ${packageName} version`)
      return stdout.trim()
    }
    catch {
      if (attempt === maxRetries) {
        // Final attempt failed, return null
        return null
      }
      // Wait briefly before retry (200ms * attempt number for network calls)
      await new Promise(resolve => setTimeout(resolve, 200 * attempt))
    }
  }
  return null
}

export function compareVersions(current: string, latest: string): number {
  // Returns: -1 if current < latest, 0 if equal, 1 if current > latest
  if (!semver.valid(current) || !semver.valid(latest)) {
    return -1 // Assume update needed if version is invalid
  }

  return semver.compare(current, latest)
}

export function shouldUpdate(current: string, latest: string): boolean {
  return compareVersions(current, latest) < 0
}

export async function checkCcrVersion(): Promise<{
  installed: boolean
  currentVersion: string | null
  latestVersion: string | null
  needsUpdate: boolean
}> {
  const currentVersion = await getInstalledVersion('ccr')
  // Get the latest version from npm
  const latestVersion = await getLatestVersion('@musistudio/claude-code-router')

  return {
    installed: currentVersion !== null,
    currentVersion,
    latestVersion,
    needsUpdate: currentVersion && latestVersion ? shouldUpdate(currentVersion, latestVersion) : false,
  }
}

/**
 * Check Claude Code version and compare with latest npm version
 *
 * This function works for all installation methods (npm, Homebrew, etc.)
 * because it checks the installed version via command execution.
 *
 * @returns Version information including update availability
 */
export async function checkClaudeCodeVersion(): Promise<{
  installed: boolean
  currentVersion: string | null
  latestVersion: string | null
  needsUpdate: boolean
}> {
  const currentVersion = await getInstalledVersion('claude')
  const latestVersion = await getLatestVersion('@anthropic-ai/claude-code')

  return {
    installed: currentVersion !== null,
    currentVersion,
    latestVersion,
    needsUpdate: currentVersion && latestVersion ? shouldUpdate(currentVersion, latestVersion) : false,
  }
}

export async function checkCometixLineVersion(): Promise<{
  installed: boolean
  currentVersion: string | null
  latestVersion: string | null
  needsUpdate: boolean
}> {
  const currentVersion = await getInstalledVersion('ccline')
  const latestVersion = await getLatestVersion('@cometix/ccline')

  return {
    installed: currentVersion !== null,
    currentVersion,
    latestVersion,
    needsUpdate: currentVersion && latestVersion ? shouldUpdate(currentVersion, latestVersion) : false,
  }
}

/**
 * Check Claude Code version and prompt for update if needed
 *
 * @param skipPrompt - Whether to auto-update without user prompt (default: false)
 *
 * Behavior:
 * - Interactive mode (skipPrompt=false): Checks version and prompts user for confirmation
 * - Skip-prompt mode (skipPrompt=true): Checks version and auto-updates without prompting
 * - Gracefully handles errors without interrupting main flow
 */
export async function checkClaudeCodeVersionAndPrompt(
  skipPrompt: boolean = false,
): Promise<void> {
  try {
    // Check Claude Code version status
    const versionInfo = await checkClaudeCodeVersion()

    // Early return if no update is needed
    if (!versionInfo.needsUpdate) {
      return
    }

    // Lazy import to avoid circular dependencies and improve performance
    const { updateClaudeCode } = await import('./auto-updater')

    // Choose update strategy based on mode
    // In skip-prompt mode, don't force update, just skip user confirmation
    await updateClaudeCode(false, skipPrompt)
  }
  catch (error) {
    // Graceful error handling - log warning but don't interrupt main flow
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.warn(`Claude Code version check failed: ${errorMessage}`)
  }
}
