/**
 * Cross-platform path adaptation module for ZCF configuration import
 *
 * This module provides intelligent path adaptation functionality:
 * - Windows ↔ Unix path conversion
 * - Environment variable expansion ($HOME, %USERPROFILE%, etc.)
 * - MCP command path normalization
 * - Home directory path handling
 * - Relative vs absolute path detection and conversion
 */

import type {
  ExportMetadata,
  PathMapping,
  PlatformType,
} from '../../types/export-import'
import { homedir } from 'node:os'
import process from 'node:process'
import { isWindows } from '../platform'
import {
  adaptPlatformPaths,
  expandHomePath,
  getCurrentPlatform,
  normalizePath,
  unixToWindowsPath,
  windowsToUnixPath,
} from './core'

/**
 * Adapt configuration paths for cross-platform import
 *
 * @param config - Configuration object to adapt
 * @param sourcePlatform - Source platform from package metadata
 * @returns Adapted configuration and path mappings
 */
export function adaptConfigPaths(
  config: any,
  sourcePlatform: PlatformType,
): {
  adaptedConfig: any
  mappings: PathMapping[]
  warnings: string[]
} {
  const targetPlatform = getCurrentPlatform()
  const warnings: string[] = []

  // If platforms match, no adaptation needed
  if (sourcePlatform === targetPlatform) {
    return {
      adaptedConfig: JSON.parse(JSON.stringify(config)),
      mappings: [],
      warnings: [],
    }
  }

  // Perform path adaptation
  const { config: adaptedConfig, mappings } = adaptPlatformPaths(
    config,
    sourcePlatform,
    targetPlatform,
  )

  // Collect warnings from problematic adaptations
  for (const mapping of mappings) {
    if (mapping.warning) {
      warnings.push(mapping.warning)
    }

    // Warn if path type is complex
    if (mapping.type === 'mixed') {
      warnings.push(
        `Complex path detected: "${mapping.original}" → "${mapping.adapted}". Please verify manually.`,
      )
    }
  }

  return {
    adaptedConfig,
    mappings,
    warnings,
  }
}

/**
 * Adapt MCP service configuration paths
 *
 * MCP services require special handling for:
 * - Command paths (npx, node, python, etc.)
 * - Working directories
 * - Environment variables
 */
export function adaptMcpPaths(
  mcpConfig: any,
  sourcePlatform: PlatformType,
): {
  adapted: any
  warnings: string[]
} {
  if (!mcpConfig || typeof mcpConfig !== 'object') {
    return { adapted: mcpConfig, warnings: [] }
  }

  const targetPlatform = getCurrentPlatform()
  const warnings: string[] = []
  const adapted = JSON.parse(JSON.stringify(mcpConfig))

  // Process mcpServers if present
  if (adapted.mcpServers && typeof adapted.mcpServers === 'object') {
    for (const [serverName, serverConfig] of Object.entries(adapted.mcpServers)) {
      if (!serverConfig || typeof serverConfig !== 'object') {
        continue
      }

      const config = serverConfig as any

      // Adapt command path
      if (config.command && typeof config.command === 'string') {
        const adaptedCommand = adaptMcpCommand(
          config.command,
          sourcePlatform,
          targetPlatform,
        )

        if (adaptedCommand.changed) {
          config.command = adaptedCommand.command
          if (adaptedCommand.warning) {
            warnings.push(`[${serverName}] ${adaptedCommand.warning}`)
          }
        }
      }

      // Adapt args (may contain paths)
      if (config.args && Array.isArray(config.args)) {
        config.args = config.args.map((arg: any) => {
          if (typeof arg === 'string' && isPathLike(arg)) {
            return adaptSinglePath(arg, sourcePlatform, targetPlatform)
          }
          return arg
        })
      }

      // Adapt env variables (may contain paths)
      if (config.env && typeof config.env === 'object') {
        for (const [envKey, envValue] of Object.entries(config.env)) {
          if (typeof envValue === 'string' && isPathLike(envValue)) {
            config.env[envKey] = adaptSinglePath(envValue, sourcePlatform, targetPlatform)
          }
        }
      }
    }
  }

  return { adapted, warnings }
}

/**
 * Adapt MCP command path (npx, node, python, etc.)
 */
function adaptMcpCommand(
  command: string,
  sourcePlatform: PlatformType,
  targetPlatform: PlatformType,
): {
  command: string
  changed: boolean
  warning?: string
} {
  // Common commands that don't need adaptation
  const commonCommands = ['npx', 'node', 'python', 'python3', 'uvx', 'deno']
  if (commonCommands.includes(command)) {
    return { command, changed: false }
  }

  // If command is an absolute path, adapt it
  if (isAbsolutePath(command)) {
    const adapted = adaptSinglePath(command, sourcePlatform, targetPlatform)
    return {
      command: adapted,
      changed: adapted !== command,
      warning: adapted !== command
        ? `Command path adapted: "${command}" → "${adapted}". Please verify it exists.`
        : undefined,
    }
  }

  // If command contains path separators, it might be a relative path
  if (command.includes('/') || command.includes('\\')) {
    const adapted = adaptSinglePath(command, sourcePlatform, targetPlatform)
    return {
      command: adapted,
      changed: adapted !== command,
      warning: `Relative command path adapted: "${command}" → "${adapted}". Ensure working directory is correct.`,
    }
  }

  // Otherwise, it's likely a system command, no adaptation needed
  return { command, changed: false }
}

/**
 * Check if a string is an absolute path
 */
function isAbsolutePath(path: string): boolean {
  // Unix absolute path
  if (path.startsWith('/')) {
    return true
  }

  // Windows absolute path (C:\, D:\, etc.)
  if (/^[A-Z]:[/\\]/i.test(path)) {
    return true
  }

  // Home directory expansion
  if (path.startsWith('~') || path.startsWith('$HOME') || path.includes('%USERPROFILE%')) {
    return true
  }

  return false
}

/**
 * Check if a string looks like a file path
 */
function isPathLike(str: string): boolean {
  if (!str || typeof str !== 'string') {
    return false
  }

  // Common path indicators
  return (
    str.includes('/')
    || str.includes('\\')
    || str.includes('~')
    || /^[A-Z]:/i.test(str) // Windows drive letter
    || str.startsWith('$HOME')
    || str.includes('%USERPROFILE%')
    || str.includes('%APPDATA%')
    || str.includes('%LOCALAPPDATA%')
  )
}

/**
 * Adapt a single path between platforms
 */
function adaptSinglePath(
  path: string,
  sourcePlatform: PlatformType,
  targetPlatform: PlatformType,
): string {
  if (sourcePlatform === targetPlatform) {
    return path
  }

  const sourceIsWindows = sourcePlatform === 'win32'
  const targetIsWindows = targetPlatform === 'win32'

  let adapted = path

  // Expand home directory before conversion
  adapted = expandHomePath(adapted)

  // Convert path format
  if (sourceIsWindows && !targetIsWindows) {
    adapted = windowsToUnixPath(adapted)
  }
  else if (!sourceIsWindows && targetIsWindows) {
    adapted = unixToWindowsPath(adapted)
  }

  return adapted
}

/**
 * Normalize paths in configuration to use forward slashes
 */
export function normalizeConfigPaths(config: any): any {
  if (!config || typeof config !== 'object') {
    return config
  }

  const normalized = JSON.parse(JSON.stringify(config))

  normalizePathsRecursively(normalized)

  return normalized
}

/**
 * Recursively normalize paths in configuration object
 */
function normalizePathsRecursively(obj: any): void {
  if (!obj || typeof obj !== 'object') {
    return
  }

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && isPathLike(value)) {
      obj[key] = normalizePath(value)
    }
    else if (typeof value === 'object') {
      normalizePathsRecursively(value)
    }
  }
}

/**
 * Replace home directory paths with tilde notation
 *
 * This makes paths more portable across users
 */
export function replaceHomeWithTilde(config: any): any {
  if (!config || typeof config !== 'object') {
    return config
  }

  const replaced = JSON.parse(JSON.stringify(config))
  const home = homedir()

  replaceHomeRecursively(replaced, home)

  return replaced
}

/**
 * Recursively replace home directory with tilde
 */
function replaceHomeRecursively(obj: any, homeDir: string): void {
  if (!obj || typeof obj !== 'object') {
    return
  }

  const normalizedHome = normalizePath(homeDir)

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && value.includes(homeDir)) {
      obj[key] = value.replace(homeDir, '~')
    }
    else if (typeof value === 'string' && value.includes(normalizedHome)) {
      obj[key] = value.replace(normalizedHome, '~')
    }
    else if (typeof value === 'object') {
      replaceHomeRecursively(value, homeDir)
    }
  }
}

/**
 * Expand environment variables in path
 */
export function expandEnvVars(path: string): string {
  let expanded = path

  // Expand $HOME or %USERPROFILE%
  if (expanded.includes('$HOME') || expanded.includes('%USERPROFILE%')) {
    expanded = expandHomePath(expanded)
  }

  // Expand %APPDATA% on Windows
  if (isWindows() && expanded.includes('%APPDATA%')) {
    const appData = process.env.APPDATA
    if (appData) {
      expanded = expanded.replace(/%APPDATA%/g, appData)
    }
  }

  // Expand %LOCALAPPDATA% on Windows
  if (isWindows() && expanded.includes('%LOCALAPPDATA%')) {
    const localAppData = process.env.LOCALAPPDATA
    if (localAppData) {
      expanded = expanded.replace(/%LOCALAPPDATA%/g, localAppData)
    }
  }

  // Expand other Unix environment variables
  if (!isWindows()) {
    expanded = expanded.replace(/\$([A-Z_]+)/g, (match, varName) => {
      return process.env[varName] || match
    })
  }

  return expanded
}

/**
 * Get path adaptation summary for user review
 */
export function getPathAdaptationSummary(
  metadata: ExportMetadata,
  config: any,
): {
  needsAdaptation: boolean
  sourcePlatform: PlatformType
  targetPlatform: PlatformType
  estimatedChanges: number
  criticalPaths: string[]
} {
  const sourcePlatform = metadata.platform
  const targetPlatform = getCurrentPlatform()
  const needsAdaptation = sourcePlatform !== targetPlatform

  if (!needsAdaptation) {
    return {
      needsAdaptation: false,
      sourcePlatform,
      targetPlatform,
      estimatedChanges: 0,
      criticalPaths: [],
    }
  }

  // Estimate how many paths will be changed
  const estimatedChanges = countPaths(config)

  // Identify critical paths that need manual review
  const criticalPaths = findCriticalPaths(config)

  return {
    needsAdaptation: true,
    sourcePlatform,
    targetPlatform,
    estimatedChanges,
    criticalPaths,
  }
}

/**
 * Count paths in configuration
 */
function countPaths(obj: any, count = 0): number {
  if (!obj || typeof obj !== 'object') {
    return count
  }

  for (const value of Object.values(obj)) {
    if (typeof value === 'string' && isPathLike(value)) {
      count++
    }
    else if (typeof value === 'object') {
      count = countPaths(value, count)
    }
  }

  return count
}

/**
 * Find critical paths that may need manual verification
 */
function findCriticalPaths(obj: any, paths: string[] = [], currentPath = ''): string[] {
  if (!obj || typeof obj !== 'object') {
    return paths
  }

  for (const [key, value] of Object.entries(obj)) {
    const fullPath = currentPath ? `${currentPath}.${key}` : key

    if (typeof value === 'string' && isPathLike(value)) {
      // Check if this is a critical path (e.g., command paths, executable paths)
      if (
        key.includes('command')
        || key.includes('executable')
        || key.includes('binary')
        || isAbsolutePath(value)
      ) {
        paths.push(`${fullPath}: ${value}`)
      }
    }
    else if (typeof value === 'object') {
      findCriticalPaths(value, paths, fullPath)
    }
  }

  return paths
}
