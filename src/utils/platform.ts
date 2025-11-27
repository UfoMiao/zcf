import * as nodeFs from 'node:fs'
import { platform } from 'node:os'
import process from 'node:process'
import { dirname } from 'pathe'
import { exec } from 'tinyexec'

/**
 * Commands that require cmd /c wrapper on Windows for proper execution context
 * Add new commands here if they need Windows-specific handling
 */
const WINDOWS_WRAPPED_COMMANDS = ['npx', 'uvx', 'uv']

export function getPlatform(): 'windows' | 'macos' | 'linux' {
  const p = platform()
  if (p === 'win32')
    return 'windows'
  if (p === 'darwin')
    return 'macos'
  return 'linux'
}

export function isTermux(): boolean {
  return !!(process.env.PREFIX && process.env.PREFIX.includes('com.termux'))
    || !!process.env.TERMUX_VERSION
    || nodeFs.existsSync('/data/data/com.termux/files/usr')
}

export function getTermuxPrefix(): string {
  return process.env.PREFIX || '/data/data/com.termux/files/usr'
}

export function isWindows(): boolean {
  return getPlatform() === 'windows'
}

export interface WSLInfo {
  isWSL: true
  distro: string | null
  version: string | null
}

export function isWSL(): boolean {
  // Check WSL_DISTRO_NAME environment variable (most reliable method)
  if (process.env.WSL_DISTRO_NAME) {
    return true
  }

  // Check /proc/version for Microsoft or WSL indicators
  if (nodeFs.existsSync('/proc/version')) {
    try {
      const version = nodeFs.readFileSync('/proc/version', 'utf8')
      if (version.includes('Microsoft') || version.includes('WSL')) {
        return true
      }
    }
    catch {
      // Ignore read errors
    }
  }

  // Check for Windows mount points as fallback
  if (nodeFs.existsSync('/mnt/c')) {
    return true
  }

  return false
}

export function getWSLDistro(): string | null {
  // Priority 1: WSL_DISTRO_NAME environment variable
  if (process.env.WSL_DISTRO_NAME) {
    return process.env.WSL_DISTRO_NAME
  }

  // Priority 2: Read from /etc/os-release
  if (nodeFs.existsSync('/etc/os-release')) {
    try {
      const osRelease = nodeFs.readFileSync('/etc/os-release', 'utf8')
      const nameMatch = osRelease.match(/^PRETTY_NAME="(.+)"$/m)
      if (nameMatch) {
        return nameMatch[1]
      }
    }
    catch {
      // Ignore read errors
    }
  }

  return null
}

export function getWSLInfo(): WSLInfo | null {
  if (!isWSL()) {
    return null
  }

  let version: string | null = null
  if (nodeFs.existsSync('/proc/version')) {
    try {
      version = nodeFs.readFileSync('/proc/version', 'utf8').trim()
    }
    catch {
      // Ignore read errors
    }
  }

  return {
    isWSL: true,
    distro: getWSLDistro(),
    version,
  }
}

/**
 * Get MCP command with platform-specific wrapper if needed
 * @param command - The base command to execute (default: 'npx')
 * @returns Command array with Windows wrapper if applicable
 */
export function getMcpCommand(command: string = 'npx'): string[] {
  if (isWindows() && WINDOWS_WRAPPED_COMMANDS.includes(command)) {
    return ['cmd', '/c', command]
  }
  return [command]
}

/**
 * Normalize Windows paths by converting backslashes to forward slashes
 * This ensures Windows paths like "C:\Program Files\nodejs\npx.cmd" are correctly
 * written as "C:/Program Files/nodejs/npx.cmd" in TOML format, avoiding escape issues
 * Unified function used by getSystemRoot() and normalizePath() to avoid code duplication
 * @param str - The string to normalize (typically a Windows path)
 * @returns The normalized string with backslashes replaced by forward slashes
 */
export function normalizeTomlPath(str: string): string {
  // Normalize: convert backslashes to forward slashes and collapse duplicates
  return str
    .replace(/\\+/g, '/')
    .replace(/\/+/g, '/')
}

export function getSystemRoot(): string | null {
  // For Windows environments, prefer exact 'SYSTEMROOT' over 'SystemRoot'.
  // On Windows, env keys are case-insensitive and the last write wins, so
  // explicitly check key presence to keep behavior deterministic across CI.
  if (!isWindows())
    return null

  const env = process.env as Record<string, string | undefined>

  let systemRoot = 'C:\\Windows'
  if (Object.prototype.hasOwnProperty.call(env, 'SYSTEMROOT') && env.SYSTEMROOT)
    systemRoot = env.SYSTEMROOT
  else if (Object.prototype.hasOwnProperty.call(env, 'SystemRoot') && env.SystemRoot)
    systemRoot = env.SystemRoot

  // Use unified normalization function
  return normalizeTomlPath(systemRoot)
}

export function shouldUseSudoForGlobalInstall(): boolean {
  if (isTermux())
    return false

  if (getPlatform() !== 'linux')
    return false

  const npmPrefix = getGlobalNpmPrefix()
  if (npmPrefix) {
    // If the prefix lives inside the user's home directory or is writable, sudo is unnecessary
    if (isPathInsideHome(npmPrefix) || canWriteToPath(npmPrefix))
      return false
  }

  const getuid = (process as NodeJS.Process & { getuid?: () => number }).getuid
  if (typeof getuid !== 'function')
    return false

  try {
    return getuid() !== 0
  }
  catch {
    return false
  }
}

export function wrapCommandWithSudo(
  command: string,
  args: string[],
): { command: string, args: string[], usedSudo: boolean } {
  if (shouldUseSudoForGlobalInstall()) {
    return {
      command: 'sudo',
      args: [command, ...args],
      usedSudo: true,
    }
  }

  return {
    command,
    args,
    usedSudo: false,
  }
}

const WRITE_CHECK_FLAG = 0o2

function normalizePath(path: string): string {
  // Use unified normalization function, then remove trailing slashes
  return normalizeTomlPath(path).replace(/\/+$/, '')
}

function isPathInsideHome(path: string): boolean {
  const home = process.env.HOME
  if (!home)
    return false

  const normalizedHome = normalizePath(home)
  const normalizedPath = normalizePath(path)
  return normalizedPath === normalizedHome || normalizedPath.startsWith(`${normalizedHome}/`)
}

function canWriteToPath(path: string): boolean {
  try {
    nodeFs.accessSync(path, WRITE_CHECK_FLAG)
    return true
  }
  catch {
    return false
  }
}

function getGlobalNpmPrefix(): string | null {
  const env = process.env
  const envPrefix = env.npm_config_prefix || env.NPM_CONFIG_PREFIX || env.PREFIX
  if (envPrefix)
    return envPrefix

  const execPath = process.execPath
  if (execPath) {
    const binDir = dirname(execPath)
    return dirname(binDir)
  }

  return null
}

export async function commandExists(command: string): Promise<boolean> {
  try {
    // First try standard which/where command
    const cmd = getPlatform() === 'windows' ? 'where' : 'which'
    const res = await exec(cmd, [command])
    if (res.exitCode === 0) {
      return true
    }
  }
  catch {
    // Continue to fallback checks
  }

  // For Termux environment, check specific paths
  if (isTermux()) {
    const termuxPrefix = getTermuxPrefix()
    const possiblePaths = [
      `${termuxPrefix}/bin/${command}`,
      `${termuxPrefix}/usr/bin/${command}`,
      `/data/data/com.termux/files/usr/bin/${command}`,
    ]

    for (const path of possiblePaths) {
      if (nodeFs.existsSync(path)) {
        return true
      }
    }
  }

  // Final fallback: check common paths on Linux/Mac
  if (getPlatform() !== 'windows') {
    const commonPaths = [
      `/usr/local/bin/${command}`,
      `/usr/bin/${command}`,
      `/bin/${command}`,
      `${process.env.HOME}/.local/bin/${command}`,
    ]

    for (const path of commonPaths) {
      if (nodeFs.existsSync(path)) {
        return true
      }
    }
  }

  return false
}

/**
 * Get recommended install methods for a code tool based on current platform
 * Returns methods in priority order (most recommended first)
 */
export type CodeType = 'claude-code' | 'codex'
export type InstallMethod = 'npm' | 'homebrew' | 'curl' | 'powershell' | 'cmd' | 'npm-global' | 'native'

export function getRecommendedInstallMethods(codeType: CodeType): InstallMethod[] {
  const platform = getPlatform()
  const wsl = isWSL()

  // Claude Code recommendations
  if (codeType === 'claude-code') {
    if (platform === 'macos') {
      return ['homebrew', 'curl', 'npm']
    }
    if (platform === 'linux' || wsl) {
      return ['curl', 'npm']
    }
    if (platform === 'windows') {
      return ['powershell', 'npm']
    }
  }

  // Codex recommendations
  if (codeType === 'codex') {
    if (platform === 'macos') {
      return ['homebrew', 'npm']
    }
    if (platform === 'linux' || wsl || platform === 'windows') {
      return ['npm']
    }
  }

  // Default fallback
  return ['npm']
}
