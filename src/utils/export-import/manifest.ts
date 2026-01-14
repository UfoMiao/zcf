/**
 * Manifest management for export/import packages
 *
 * This module handles creation, validation, and management of package manifest files
 * that contain metadata about exported configurations.
 */

import type {
  ExportFileInfo,
  ExportMetadata,
  ValidationError,
  ValidationResult,
  ValidationWarning,
} from '../../types/export-import'
import { version as zcfVersion } from '../../../package.json'
import {
  calculateChecksum,
  getCurrentPlatform,
} from './core'

/**
 * Create a manifest for an export package
 */
export function createManifest(options: {
  codeType: ExportMetadata['codeType']
  scope: string[]
  files: ExportFileInfo[]
  description?: string
  tags?: string[]
}): ExportMetadata {
  const hasSensitive = options.files.some(file => file.hasSensitiveData)

  return {
    version: zcfVersion,
    exportDate: new Date().toISOString(),
    platform: getCurrentPlatform(),
    codeType: options.codeType,
    scope: options.scope,
    hasSensitiveData: hasSensitive,
    files: options.files,
    description: options.description,
    tags: options.tags,
  }
}

/**
 * Validate manifest structure
 */
export function validateManifest(manifest: any): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // Check required fields
  if (!manifest.version) {
    errors.push({
      code: 'MISSING_VERSION',
      message: 'Manifest is missing version field',
      field: 'version',
    })
  }

  if (!manifest.exportDate) {
    errors.push({
      code: 'MISSING_EXPORT_DATE',
      message: 'Manifest is missing exportDate field',
      field: 'exportDate',
    })
  }

  if (!manifest.platform) {
    errors.push({
      code: 'MISSING_PLATFORM',
      message: 'Manifest is missing platform field',
      field: 'platform',
    })
  }

  if (!manifest.codeType) {
    errors.push({
      code: 'MISSING_CODE_TYPE',
      message: 'Manifest is missing codeType field',
      field: 'codeType',
    })
  }

  if (!manifest.scope || !Array.isArray(manifest.scope)) {
    errors.push({
      code: 'INVALID_SCOPE',
      message: 'Manifest scope must be an array',
      field: 'scope',
    })
  }

  if (!manifest.files || !Array.isArray(manifest.files)) {
    errors.push({
      code: 'INVALID_FILES',
      message: 'Manifest files must be an array',
      field: 'files',
    })
  }

  // Validate file entries
  if (manifest.files && Array.isArray(manifest.files)) {
    for (let i = 0; i < manifest.files.length; i++) {
      const file = manifest.files[i]

      if (!file.path) {
        errors.push({
          code: 'MISSING_FILE_PATH',
          message: `File entry at index ${i} is missing path`,
          field: `files[${i}].path`,
        })
      }

      if (!file.type) {
        errors.push({
          code: 'MISSING_FILE_TYPE',
          message: `File entry at index ${i} is missing type`,
          field: `files[${i}].type`,
        })
      }

      if (typeof file.size !== 'number') {
        errors.push({
          code: 'INVALID_FILE_SIZE',
          message: `File entry at index ${i} has invalid size`,
          field: `files[${i}].size`,
        })
      }

      if (!file.checksum) {
        warnings.push({
          code: 'MISSING_CHECKSUM',
          message: `File entry at index ${i} is missing checksum`,
          field: `files[${i}].checksum`,
        })
      }
    }
  }

  // Version compatibility check
  if (manifest.version) {
    const manifestMajor = Number.parseInt(manifest.version.split('.')[0])
    const currentMajor = Number.parseInt(zcfVersion.split('.')[0])

    if (manifestMajor !== currentMajor) {
      warnings.push({
        code: 'VERSION_MISMATCH',
        message: `Package was created with ZCF v${manifest.version}, current version is v${zcfVersion}`,
        field: 'version',
        details: {
          packageVersion: manifest.version,
          currentVersion: zcfVersion,
        },
      })
    }
  }

  // Platform compatibility check
  const currentPlatform = getCurrentPlatform()
  const platformCompatible = manifest.platform === currentPlatform
    || (manifest.platform === 'darwin' && currentPlatform === 'linux')
    || (manifest.platform === 'linux' && currentPlatform === 'darwin')

  if (!platformCompatible) {
    warnings.push({
      code: 'PLATFORM_MISMATCH',
      message: `Package was created on ${manifest.platform}, importing to ${currentPlatform} may require path adjustments`,
      field: 'platform',
      details: {
        sourcePlatform: manifest.platform,
        targetPlatform: currentPlatform,
      },
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metadata: errors.length === 0 ? manifest as ExportMetadata : undefined,
    platformCompatible,
    versionCompatible: warnings.every(w => w.code !== 'VERSION_MISMATCH'),
  }
}

/**
 * Validate file integrity against manifest
 */
export function validateFileIntegrity(
  filePath: string,
  expectedChecksum: string,
): { valid: boolean, actualChecksum?: string } {
  try {
    const actualChecksum = calculateChecksum(filePath)
    return {
      valid: actualChecksum === expectedChecksum,
      actualChecksum,
    }
  }
  catch {
    return {
      valid: false,
    }
  }
}

/**
 * Check if manifest indicates sensitive data is present
 */
export function manifestHasSensitiveData(manifest: ExportMetadata): boolean {
  return manifest.hasSensitiveData === true
}

/**
 * Get manifest summary for display
 */
export function getManifestSummary(manifest: ExportMetadata): string {
  const lines: string[] = []

  lines.push(`ZCF Export Package`)
  lines.push(`Version: ${manifest.version}`)
  lines.push(`Created: ${new Date(manifest.exportDate).toLocaleString()}`)
  lines.push(`Platform: ${manifest.platform}`)
  lines.push(`Code Type: ${manifest.codeType}`)
  lines.push(`Scope: ${manifest.scope.join(', ')}`)
  lines.push(`Files: ${manifest.files.length}`)
  lines.push(`Sensitive Data: ${manifest.hasSensitiveData ? 'Yes' : 'No'}`)

  if (manifest.description) {
    lines.push(`Description: ${manifest.description}`)
  }

  if (manifest.tags && manifest.tags.length > 0) {
    lines.push(`Tags: ${manifest.tags.join(', ')}`)
  }

  return lines.join('\n')
}

/**
 * Parse manifest version
 */
export function parseVersion(version: string): { major: number, minor: number, patch: number } {
  const parts = version.split('.')
  return {
    major: Number.parseInt(parts[0] || '0'),
    minor: Number.parseInt(parts[1] || '0'),
    patch: Number.parseInt(parts[2] || '0'),
  }
}

/**
 * Compare versions
 * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  const ver1 = parseVersion(v1)
  const ver2 = parseVersion(v2)

  if (ver1.major !== ver2.major)
    return ver1.major - ver2.major

  if (ver1.minor !== ver2.minor)
    return ver1.minor - ver2.minor

  return ver1.patch - ver2.patch
}
