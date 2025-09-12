import { existsSync, readFileSync } from 'node:fs'
import { platform } from 'node:os'
import process from 'node:process'
import { exec } from 'tinyexec'

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
    || existsSync('/data/data/com.termux/files/usr')
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
  if (existsSync('/proc/version')) {
    try {
      const version = readFileSync('/proc/version', 'utf8')
      if (version.includes('Microsoft') || version.includes('WSL')) {
        return true
      }
    }
    catch {
      // Ignore read errors
    }
  }

  // Check for Windows mount points as fallback
  if (existsSync('/mnt/c')) {
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
  if (existsSync('/etc/os-release')) {
    try {
      const osRelease = readFileSync('/etc/os-release', 'utf8')
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
  if (existsSync('/proc/version')) {
    try {
      version = readFileSync('/proc/version', 'utf8').trim()
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

export function getMcpCommand(): string[] {
  if (isWindows()) {
    return ['cmd', '/c', 'npx']
  }
  return ['npx']
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
      if (existsSync(path)) {
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
      if (existsSync(path)) {
        return true
      }
    }
  }

  return false
}
