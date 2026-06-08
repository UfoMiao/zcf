/**
 * Package validation module for ZCF configuration import
 *
 * This module provides comprehensive validation functionality including:
 * - Zip file format validation
 * - Package structure verification
 * - Manifest validation and parsing
 * - File integrity checks (checksums)
 * - Version compatibility validation
 * - Platform compatibility validation
 */

import type {
  ExportMetadata,
  ValidationError,
  ValidationResult,
  ValidationWarning,
} from '../../types/export-import'
import { mkdirSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { version as currentVersion } from '../../../package.json'
import { exists } from '../fs-operations'
import {
  calculateChecksum,
  extractZipPackage,
  getCurrentPlatform,
  validateZipFormat,
} from './core'

/**
 * Validate an import package comprehensively
 *
 * @param packagePath - Path to the zip package file
 * @returns Validation result with errors, warnings, and metadata
 */
export function validatePackage(packagePath: string): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // Step 1: Check if package file exists
  if (!exists(packagePath)) {
    errors.push({
      code: 'PACKAGE_NOT_FOUND',
      message: `Package file does not exist: ${packagePath}`,
      field: 'packagePath',
    })

    return {
      valid: false,
      errors,
      warnings,
    }
  }

  // Step 2: Validate zip format
  if (!validateZipFormat(packagePath)) {
    errors.push({
      code: 'INVALID_ZIP_FORMAT',
      message: 'Invalid or corrupted ZIP file format',
      field: 'packagePath',
    })

    return {
      valid: false,
      errors,
      warnings,
    }
  }

  // Step 3: Extract package to temporary location
  const tempDir = join(homedir(), '.zcf-temp', `import-validation-${Date.now()}`)
  let metadata: ExportMetadata

  try {
    mkdirSync(tempDir, { recursive: true })

    try {
      metadata = extractZipPackage(packagePath, tempDir)
    }
    catch (error) {
      errors.push({
        code: 'EXTRACTION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to extract package',
        field: 'packagePath',
      })

      return {
        valid: false,
        errors,
        warnings,
      }
    }

    // Step 4: Validate manifest structure
    const manifestErrors = validateManifest(metadata)
    errors.push(...manifestErrors)

    if (errors.length > 0) {
      return {
        valid: false,
        errors,
        warnings,
        metadata,
      }
    }

    // Step 5: Validate file integrity (checksums)
    const integrityResult = validateFileIntegrity(tempDir, metadata)
    errors.push(...integrityResult.errors)
    warnings.push(...integrityResult.warnings)

    // Step 6: Check version compatibility
    const versionResult = checkVersionCompatibility(metadata.version)
    warnings.push(...versionResult.warnings)

    // Step 7: Check platform compatibility
    const platformResult = checkPlatformCompatibility(metadata.platform)
    warnings.push(...platformResult.warnings)

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata,
      platformCompatible: platformResult.compatible,
      versionCompatible: versionResult.compatible,
    }
  }
  finally {
    // Cleanup temporary directory
    try {
      rmSync(tempDir, { recursive: true, force: true })
    }
    catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Validate manifest structure and required fields
 */
function validateManifest(metadata: ExportMetadata): ValidationError[] {
  const errors: ValidationError[] = []

  // Check required fields
  if (!metadata.version) {
    errors.push({
      code: 'MISSING_FIELD',
      message: 'Manifest missing required field: version',
      field: 'version',
    })
  }

  if (!metadata.exportDate) {
    errors.push({
      code: 'MISSING_FIELD',
      message: 'Manifest missing required field: exportDate',
      field: 'exportDate',
    })
  }

  if (!metadata.platform) {
    errors.push({
      code: 'MISSING_FIELD',
      message: 'Manifest missing required field: platform',
      field: 'platform',
    })
  }

  if (!metadata.codeType) {
    errors.push({
      code: 'MISSING_FIELD',
      message: 'Manifest missing required field: codeType',
      field: 'codeType',
    })
  }

  if (!metadata.scope || !Array.isArray(metadata.scope)) {
    errors.push({
      code: 'INVALID_FIELD',
      message: 'Manifest field "scope" must be an array',
      field: 'scope',
    })
  }

  if (!metadata.files || !Array.isArray(metadata.files)) {
    errors.push({
      code: 'INVALID_FIELD',
      message: 'Manifest field "files" must be an array',
      field: 'files',
    })
  }

  if (typeof metadata.hasSensitiveData !== 'boolean') {
    errors.push({
      code: 'INVALID_FIELD',
      message: 'Manifest field "hasSensitiveData" must be a boolean',
      field: 'hasSensitiveData',
    })
  }

  // Validate file entries
  if (metadata.files && Array.isArray(metadata.files)) {
    for (let i = 0; i < metadata.files.length; i++) {
      const file = metadata.files[i]

      if (!file.path) {
        errors.push({
          code: 'INVALID_FILE_ENTRY',
          message: `File entry ${i} missing required field: path`,
          field: `files[${i}].path`,
        })
      }

      if (!file.type) {
        errors.push({
          code: 'INVALID_FILE_ENTRY',
          message: `File entry ${i} missing required field: type`,
          field: `files[${i}].type`,
        })
      }

      if (typeof file.size !== 'number') {
        errors.push({
          code: 'INVALID_FILE_ENTRY',
          message: `File entry ${i} field "size" must be a number`,
          field: `files[${i}].size`,
        })
      }

      if (!file.checksum) {
        errors.push({
          code: 'INVALID_FILE_ENTRY',
          message: `File entry ${i} missing required field: checksum`,
          field: `files[${i}].checksum`,
        })
      }
    }
  }

  return errors
}

/**
 * Validate file integrity by comparing checksums
 */
function validateFileIntegrity(
  extractDir: string,
  metadata: ExportMetadata,
): {
  errors: ValidationError[]
  warnings: ValidationWarning[]
} {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  if (!metadata.files || !Array.isArray(metadata.files)) {
    return { errors, warnings }
  }

  for (const fileInfo of metadata.files) {
    const filePath = join(extractDir, fileInfo.path)

    // Check if file exists
    if (!exists(filePath)) {
      errors.push({
        code: 'FILE_MISSING',
        message: `File listed in manifest not found in package: ${fileInfo.path}`,
        field: 'files',
        details: { path: fileInfo.path },
      })
      continue
    }

    // Verify checksum
    try {
      const actualChecksum = calculateChecksum(filePath)
      if (actualChecksum !== fileInfo.checksum) {
        errors.push({
          code: 'CHECKSUM_MISMATCH',
          message: `Checksum mismatch for file: ${fileInfo.path}`,
          field: 'files',
          details: {
            path: fileInfo.path,
            expected: fileInfo.checksum,
            actual: actualChecksum,
          },
        })
      }
    }
    catch (error) {
      warnings.push({
        code: 'CHECKSUM_VERIFICATION_FAILED',
        message: `Could not verify checksum for file: ${fileInfo.path}`,
        field: 'files',
        details: {
          path: fileInfo.path,
          error: error instanceof Error ? error.message : String(error),
        },
      })
    }
  }

  return { errors, warnings }
}

/**
 * Check version compatibility
 */
function checkVersionCompatibility(packageVersion: string): {
  compatible: boolean
  warnings: ValidationWarning[]
} {
  const warnings: ValidationWarning[] = []

  try {
    const packageMajor = Number.parseInt(packageVersion.split('.')[0], 10)
    const currentMajor = Number.parseInt(currentVersion.split('.')[0], 10)

    // Major version mismatch
    if (packageMajor !== currentMajor) {
      warnings.push({
        code: 'VERSION_MISMATCH',
        message: `Package created with ZCF v${packageVersion}, current version is v${currentVersion}`,
        field: 'version',
        details: {
          packageVersion,
          currentVersion,
          severity: 'high',
        },
      })

      return { compatible: false, warnings }
    }

    // Minor version difference (warning only)
    if (packageVersion !== currentVersion) {
      warnings.push({
        code: 'VERSION_DIFFERENCE',
        message: `Package created with ZCF v${packageVersion}, current version is v${currentVersion}`,
        field: 'version',
        details: {
          packageVersion,
          currentVersion,
          severity: 'low',
        },
      })
    }

    return { compatible: true, warnings }
  }
  catch {
    warnings.push({
      code: 'VERSION_PARSE_ERROR',
      message: `Could not parse version numbers: package=${packageVersion}, current=${currentVersion}`,
      field: 'version',
    })

    return { compatible: true, warnings }
  }
}

/**
 * Check platform compatibility
 */
function checkPlatformCompatibility(sourcePlatform: string): {
  compatible: boolean
  warnings: ValidationWarning[]
} {
  const warnings: ValidationWarning[] = []
  const targetPlatform = getCurrentPlatform()

  if (sourcePlatform !== targetPlatform) {
    const isWindowsToUnix = sourcePlatform === 'win32' && targetPlatform !== 'win32'
    const isUnixToWindows = sourcePlatform !== 'win32' && targetPlatform === 'win32'

    if (isWindowsToUnix || isUnixToWindows) {
      warnings.push({
        code: 'PLATFORM_MISMATCH',
        message: `Package created on ${sourcePlatform}, importing to ${targetPlatform}. Some paths may need adjustment.`,
        field: 'platform',
        details: {
          sourcePlatform,
          targetPlatform,
          severity: 'medium',
        },
      })

      return { compatible: true, warnings }
    }

    // Different Unix-like platforms (Linux/macOS/Termux)
    warnings.push({
      code: 'PLATFORM_DIFFERENCE',
      message: `Package created on ${sourcePlatform}, importing to ${targetPlatform}`,
      field: 'platform',
      details: {
        sourcePlatform,
        targetPlatform,
        severity: 'low',
      },
    })
  }

  return { compatible: true, warnings }
}

/**
 * Validate import options before executing import
 */
export function validateImportOptions(options: {
  packagePath: string
  targetCodeType?: string
  mergeStrategy?: string
  backup?: boolean
}): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!options.packagePath) {
    errors.push('Package path is required')
  }

  if (!exists(options.packagePath)) {
    errors.push(`Package file does not exist: ${options.packagePath}`)
  }

  if (options.targetCodeType) {
    const validCodeTypes = ['claude-code', 'codex', 'all']
    if (!validCodeTypes.includes(options.targetCodeType)) {
      errors.push(`Invalid target code type: ${options.targetCodeType}`)
    }
  }

  if (options.mergeStrategy) {
    const validStrategies = ['replace', 'merge', 'skip-existing']
    if (!validStrategies.includes(options.mergeStrategy)) {
      errors.push(`Invalid merge strategy: ${options.mergeStrategy}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
