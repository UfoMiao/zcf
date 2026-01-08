/**
 * Core utilities for ZCF configuration export and import
 *
 * This module provides fundamental functionality for:
 * - Collecting configuration files from the system
 * - Sanitizing sensitive data (API keys, tokens)
 * - Creating and extracting zip packages
 * - Validating package integrity
 * - Adapting paths for cross-platform compatibility
 */

import type {
  ExportFileInfo,
  ExportMetadata,
  PathMapping,
  PlatformType,
  SensitiveField,
} from '../../types/export-import'
import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { homedir } from 'node:os'
import AdmZip from 'adm-zip'
import { join } from 'pathe'
import { exists, getStats, isDirectory, isFile, readFile } from '../fs-operations'
import { getPlatform, isWindows } from '../platform'

/**
 * Calculate SHA-256 checksum of a file
 */
export function calculateChecksum(filePath: string): string {
  const content = readFile(filePath, 'utf-8')
  return createHash('sha256').update(content).digest('hex')
}

/**
 * Calculate SHA-256 checksum of a buffer or string
 */
export function calculateChecksumFromContent(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex')
}

/**
 * Get current platform type
 */
export function getCurrentPlatform(): PlatformType {
  const platform = getPlatform()
  if (platform === 'windows')
    return 'win32'
  if (platform === 'macos')
    return 'darwin'
  if (platform === 'linux')
    return 'linux'
  if (platform === 'termux')
    return 'termux'
  return 'linux' // Default fallback
}

/**
 * Get file information with metadata
 */
export function getFileInfo(
  filePath: string,
  relativePath: string,
  type: ExportFileInfo['type'],
): ExportFileInfo {
  const stats = getStats(filePath)
  const checksum = calculateChecksum(filePath)

  return {
    path: relativePath,
    type,
    size: stats.size,
    checksum,
    originalPath: filePath,
  }
}

/**
 * Sensitive field definitions for various configuration files
 */
export const SENSITIVE_FIELDS: SensitiveField[] = [
  {
    path: 'env.ANTHROPIC_API_KEY',
    replacement: '***REDACTED_API_KEY***',
  },
  {
    path: 'env.ANTHROPIC_AUTH_TOKEN',
    replacement: '***REDACTED_AUTH_TOKEN***',
  },
  {
    path: 'apiKey',
    replacement: '***REDACTED_API_KEY***',
  },
  {
    path: 'APIKEY',
    replacement: '***REDACTED_API_KEY***',
  },
  {
    path: 'profiles.*.apiKey',
    replacement: '***REDACTED_API_KEY***',
  },
]

/**
 * Check if a JSON object contains sensitive data
 */
export function hasSensitiveData(obj: any): boolean {
  if (!obj || typeof obj !== 'object')
    return false

  for (const field of SENSITIVE_FIELDS) {
    const pathParts = field.path.split('.')
    let current = obj

    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i]

      // Handle wildcard in path (e.g., profiles.*.apiKey)
      if (part === '*') {
        if (typeof current === 'object') {
          for (const key of Object.keys(current)) {
            const remaining = pathParts.slice(i + 1).join('.')
            const tempField = { path: remaining, replacement: field.replacement }
            if (hasSensitiveDataInPath(current[key], tempField))
              return true
          }
        }
        break
      }

      if (current[part] === undefined)
        break

      if (i === pathParts.length - 1) {
        // Reached the final part of the path
        const value = current[part]
        if (value && typeof value === 'string' && value !== field.replacement)
          return true
      }

      current = current[part]
    }
  }

  return false
}

/**
 * Helper function to check sensitive data in a specific path
 */
function hasSensitiveDataInPath(obj: any, field: SensitiveField): boolean {
  if (!obj || typeof obj !== 'object')
    return false

  const pathParts = field.path.split('.')
  let current = obj

  for (let i = 0; i < pathParts.length; i++) {
    const part = pathParts[i]

    if (current[part] === undefined)
      return false

    if (i === pathParts.length - 1) {
      const value = current[part]
      return value && typeof value === 'string' && value !== field.replacement
    }

    current = current[part]
  }

  return false
}

/**
 * Sanitize sensitive data in a JSON object
 * Returns a new object with sensitive fields replaced
 */
export function sanitizeConfig(config: any): any {
  if (!config || typeof config !== 'object')
    return config

  const sanitized = JSON.parse(JSON.stringify(config)) // Deep clone

  for (const field of SENSITIVE_FIELDS) {
    sanitizeField(sanitized, field.path.split('.'), field.replacement)
  }

  return sanitized
}

/**
 * Recursively sanitize a field based on its path
 */
function sanitizeField(obj: any, pathParts: string[], replacement: string): void {
  if (!obj || typeof obj !== 'object' || pathParts.length === 0)
    return

  const [current, ...remaining] = pathParts

  // Handle wildcard
  if (current === '*') {
    for (const key of Object.keys(obj)) {
      sanitizeField(obj[key], remaining, replacement)
    }
    return
  }

  if (remaining.length === 0) {
    // Reached the target field
    if (obj[current] !== undefined) {
      obj[current] = replacement
    }
  }
  else {
    // Continue recursion
    if (obj[current] !== undefined) {
      sanitizeField(obj[current], remaining, replacement)
    }
  }
}

/**
 * Create a zip package from files
 *
 * @param files - Array of file paths to include
 * @param metadata - Package metadata
 * @param outputPath - Output path for the zip file
 * @returns Path to the created zip file
 */
export function createZipPackage(
  files: Array<{ source: string, destination: string }>,
  metadata: ExportMetadata,
  outputPath: string,
): string {
  const zip = new AdmZip()

  // Add manifest.json as the first file
  zip.addFile('manifest.json', Buffer.from(JSON.stringify(metadata, null, 2), 'utf-8'))

  // Add all configuration files
  for (const file of files) {
    if (exists(file.source)) {
      if (isDirectory(file.source)) {
        // Add directory recursively
        zip.addLocalFolder(file.source, file.destination)
      }
      else if (isFile(file.source)) {
        // Add single file
        const content = readFile(file.source, 'utf-8')
        zip.addFile(file.destination, Buffer.from(content, 'utf-8'))
      }
    }
  }

  // Write zip to disk
  zip.writeZip(outputPath)

  return outputPath
}

/**
 * Extract a zip package
 *
 * @param packagePath - Path to the zip file
 * @param targetDir - Directory to extract to
 * @returns Extracted metadata
 */
export function extractZipPackage(packagePath: string, targetDir: string): ExportMetadata {
  if (!exists(packagePath)) {
    throw new Error(`Package file does not exist: ${packagePath}`)
  }

  const zip = new AdmZip(packagePath)

  // Extract all files
  zip.extractAllTo(targetDir, true)

  // Read and parse manifest
  const manifestPath = join(targetDir, 'manifest.json')
  if (!exists(manifestPath)) {
    throw new Error('Invalid package: manifest.json not found')
  }

  const manifestContent = readFile(manifestPath, 'utf-8')
  const metadata: ExportMetadata = JSON.parse(manifestContent)

  return metadata
}

/**
 * Validate zip file format
 */
export function validateZipFormat(packagePath: string): boolean {
  try {
    const zip = new AdmZip(packagePath)
    const entries = zip.getEntries()
    return entries.length > 0
  }
  catch {
    return false
  }
}

/**
 * Get zip package entry list
 */
export function getZipEntries(packagePath: string): string[] {
  const zip = new AdmZip(packagePath)
  return zip.getEntries().map((entry: any) => entry.entryName)
}

/**
 * Adapt Windows path to Unix path
 */
export function windowsToUnixPath(path: string): string {
  // Convert backslashes to forward slashes
  let converted = path.replace(/\\/g, '/')

  // Convert drive letters: C:/... to /c/...
  const driveMatch = converted.match(/^([A-Z]):\//i)
  if (driveMatch) {
    converted = `/${driveMatch[1].toLowerCase()}${converted.slice(2)}`
  }

  // Convert environment variables
  converted = converted.replace(/%([^%]+)%/g, (_, varName) => {
    if (varName.toUpperCase() === 'USERPROFILE') {
      return '$HOME'
    }
    return `$${varName}`
  })

  return converted
}

/**
 * Adapt Unix path to Windows path
 */
export function unixToWindowsPath(path: string): string {
  let converted = path

  // Convert /c/... to C:/...
  const unixDriveMatch = converted.match(/^\/([a-z])\//i)
  if (unixDriveMatch) {
    converted = `${unixDriveMatch[1].toUpperCase()}:/${converted.slice(3)}`
  }

  // Convert forward slashes to backslashes
  converted = converted.replace(/\//g, '\\')

  // Convert environment variables
  converted = converted.replace(/\$([A-Z_]+)/g, (_, varName) => {
    if (varName === 'HOME') {
      return '%USERPROFILE%'
    }
    return `%${varName}%`
  })

  return converted
}

/**
 * Adapt configuration paths for cross-platform compatibility
 */
export function adaptPlatformPaths(
  config: any,
  sourcePlatform: PlatformType,
  targetPlatform: PlatformType,
): { config: any, mappings: PathMapping[] } {
  if (sourcePlatform === targetPlatform) {
    return { config: JSON.parse(JSON.stringify(config)), mappings: [] }
  }

  const adapted = JSON.parse(JSON.stringify(config))
  const mappings: PathMapping[] = []

  adaptPathsRecursively(adapted, sourcePlatform, targetPlatform, mappings)

  return { config: adapted, mappings }
}

/**
 * Recursively adapt paths in configuration object
 */
function adaptPathsRecursively(
  obj: any,
  sourcePlatform: PlatformType,
  targetPlatform: PlatformType,
  mappings: PathMapping[],
  currentPath: string = '',
): void {
  if (!obj || typeof obj !== 'object')
    return

  for (const [key, value] of Object.entries(obj)) {
    const fullPath = currentPath ? `${currentPath}.${key}` : key

    if (typeof value === 'string') {
      // Check if this looks like a file path
      if (isPathLike(value)) {
        const adapted = adaptSinglePath(value, sourcePlatform, targetPlatform)
        if (adapted !== value) {
          obj[key] = adapted
          mappings.push({
            original: value,
            adapted,
            type: getPathType(value),
            success: true,
          })
        }
      }
    }
    else if (typeof value === 'object') {
      adaptPathsRecursively(value, sourcePlatform, targetPlatform, mappings, fullPath)
    }
  }
}

/**
 * Check if a string looks like a file path
 */
function isPathLike(str: string): boolean {
  // Common path indicators
  return (
    str.includes('/')
    || str.includes('\\')
    || str.includes('~')
    || str.match(/^[A-Z]:/i) !== null // Windows drive letter
    || str.startsWith('$HOME')
    || str.startsWith('%USERPROFILE%')
  )
}

/**
 * Determine path type
 */
function getPathType(path: string): PathMapping['type'] {
  if (path.includes('$') || path.includes('%'))
    return 'env-var'
  if (path.startsWith('/') || path.match(/^[A-Z]:/i))
    return 'absolute'
  if (path.includes('/') || path.includes('\\'))
    return 'relative'
  return 'mixed'
}

/**
 * Adapt a single path between platforms
 */
function adaptSinglePath(
  path: string,
  sourcePlatform: PlatformType,
  targetPlatform: PlatformType,
): string {
  const sourceIsWindows = sourcePlatform === 'win32'
  const targetIsWindows = targetPlatform === 'win32'

  if (sourceIsWindows && !targetIsWindows) {
    return windowsToUnixPath(path)
  }
  else if (!sourceIsWindows && targetIsWindows) {
    return unixToWindowsPath(path)
  }

  return path
}

/**
 * Expand user home directory in path
 */
export function expandHomePath(path: string): string {
  if (path.startsWith('~/') || path === '~') {
    return path.replace(/^~/, homedir())
  }
  if (path.includes('$HOME')) {
    return path.replace(/\$HOME/g, homedir())
  }
  if (isWindows() && path.includes('%USERPROFILE%')) {
    return path.replace(/%USERPROFILE%/g, homedir())
  }
  return path
}

/**
 * Normalize path to use forward slashes
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/')
}
