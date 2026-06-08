/**
 * Main exporter module for ZCF configuration export functionality
 *
 * This module provides the primary export functionality that:
 * - Collects configuration files based on scope and code type
 * - Sanitizes sensitive data (if requested)
 * - Creates export packages with proper metadata
 * - Validates and verifies the export process
 */

import type {
  CodeType,
  ExportFileInfo,
  ExportMetadata,
  ExportOptions,
  ExportResult,
  ExportScope,
  ProgressCallback,
} from '../../types/export-import'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { exists, readFile } from '../fs-operations'
import {
  collectAllConfig,
  collectClaudeCodeConfig,
  collectCodexConfig,
  collectCustomFiles,
  getCollectionSummary,
} from './collector'
import {
  calculateChecksumFromContent,
  createZipPackage,
} from './core'
import { createManifest } from './manifest'
import { sanitizeFile } from './sanitizer'

/**
 * Default export options
 */
const DEFAULT_EXPORT_OPTIONS: Partial<ExportOptions> = {
  includeSensitive: false,
  lang: 'en',
}

/**
 * Execute export operation
 *
 * @param options - Export options
 * @param progressCallback - Optional callback for progress updates
 * @returns Export result with package path and metadata
 */
export async function executeExport(
  options: ExportOptions,
  progressCallback?: ProgressCallback,
): Promise<ExportResult> {
  try {
    // Merge with default options
    const opts: ExportOptions = {
      ...DEFAULT_EXPORT_OPTIONS,
      ...options,
    }

    // Report progress: Starting
    progressCallback?.({
      step: 'Initializing export',
      progress: 0,
    })

    // Step 1: Collect configuration files
    progressCallback?.({
      step: 'Collecting configuration files',
      progress: 20,
    })

    const files = collectConfigFiles(opts.codeType, opts.scope, opts.customItems)

    if (files.length === 0) {
      return {
        success: false,
        error: 'No configuration files found to export',
        warnings: [],
      }
    }

    // Step 2: Process files (sanitize if needed)
    progressCallback?.({
      step: 'Processing files',
      progress: 40,
      total: files.length,
      completed: 0,
    })

    const processedFiles = await processFiles(files, opts.includeSensitive, (completed) => {
      progressCallback?.({
        step: 'Processing files',
        progress: 40 + (completed / files.length) * 20,
        total: files.length,
        completed,
      })
    })

    // Step 3: Create manifest
    progressCallback?.({
      step: 'Creating manifest',
      progress: 70,
    })

    const manifest = createExportManifest({
      codeType: opts.codeType,
      scope: opts.scope,
      files: processedFiles.map(f => f.fileInfo),
    })

    // Step 4: Create export package
    progressCallback?.({
      step: 'Creating export package',
      progress: 80,
    })

    const packagePath = await createPackage(
      processedFiles,
      manifest,
      opts.outputPath,
    )

    // Step 5: Verify package
    progressCallback?.({
      step: 'Verifying package',
      progress: 90,
    })

    const verification = await verifyPackage(packagePath)

    if (!verification.success) {
      return {
        success: false,
        error: verification.error,
        warnings: verification.warnings,
      }
    }

    // Complete
    progressCallback?.({
      step: 'Export complete',
      progress: 100,
    })

    return {
      success: true,
      packagePath,
      fileCount: files.length,
      packageSize: verification.packageSize,
      warnings: verification.warnings,
    }
  }
  catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      warnings: [],
    }
  }
}

/**
 * Collect configuration files based on options
 */
function collectConfigFiles(
  codeType: CodeType,
  scope: ExportScope,
  customItems?: ExportOptions['customItems'],
): ExportFileInfo[] {
  if (scope === 'custom' && customItems && customItems.length > 0) {
    return collectCustomFiles(customItems)
  }

  if (codeType === 'all') {
    return collectAllConfig(codeType, scope)
  }
  else if (codeType === 'claude-code') {
    return collectClaudeCodeConfig(scope)
  }
  else if (codeType === 'codex') {
    return collectCodexConfig(scope)
  }

  return []
}

/**
 * Process files: read content, sanitize if needed
 */
async function processFiles(
  files: ExportFileInfo[],
  includeSensitive: boolean,
  progressCallback?: (completed: number) => void,
): Promise<Array<{ fileInfo: ExportFileInfo, content: string }>> {
  const processed: Array<{ fileInfo: ExportFileInfo, content: string }> = []

  for (let i = 0; i < files.length; i++) {
    const fileInfo = files[i]

    if (!fileInfo.originalPath || !exists(fileInfo.originalPath)) {
      continue
    }

    // Read file content
    const content = readFile(fileInfo.originalPath, 'utf-8')

    // Sanitize if needed
    if (!includeSensitive) {
      const sanitized = sanitizeFile(fileInfo, content)
      processed.push({
        fileInfo: sanitized.fileInfo,
        content: sanitized.content,
      })
    }
    else {
      processed.push({
        fileInfo,
        content,
      })
    }

    progressCallback?.(i + 1)
  }

  return processed
}

/**
 * Create export manifest
 */
function createExportManifest(options: {
  codeType: CodeType
  scope: ExportScope
  files: ExportFileInfo[]
}): ExportMetadata {
  const scopeArray: string[] = options.scope === 'all'
    ? ['settings', 'workflows', 'mcp', 'hooks', 'skills']
    : [options.scope]

  return createManifest({
    codeType: options.codeType,
    scope: scopeArray,
    files: options.files,
    description: `ZCF Configuration Export - ${options.codeType}`,
    tags: [options.codeType, options.scope],
  })
}

/**
 * Create export package (zip file)
 */
async function createPackage(
  files: Array<{ fileInfo: ExportFileInfo, content: string }>,
  manifest: ExportMetadata,
  outputPath?: string,
): Promise<string> {
  // Determine output path
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const defaultFileName = `zcf-export-${timestamp}.zip`
  const packagePath = outputPath
    ? join(outputPath, defaultFileName)
    : join(homedir(), defaultFileName)

  // Create temporary directory for staging
  const tempDir = join(homedir(), '.zcf-temp', `export-${Date.now()}`)
  mkdirSync(tempDir, { recursive: true })

  try {
    // Write files to temp directory and update manifest checksums
    const updatedFiles: ExportFileInfo[] = []
    const zipFiles: Array<{ source: string, destination: string }> = []

    for (const { fileInfo, content } of files) {
      const targetPath = join(tempDir, fileInfo.path)
      const targetDir = join(targetPath, '..')

      // Create directory structure
      mkdirSync(targetDir, { recursive: true })

      // Write file
      writeFileSync(targetPath, content, 'utf-8')

      // Update checksum with actual content
      const checksum = calculateChecksumFromContent(content)

      updatedFiles.push({
        ...fileInfo,
        checksum,
      })

      zipFiles.push({
        source: targetPath,
        destination: fileInfo.path,
      })
    }

    // Update manifest with corrected checksums
    const updatedManifest: ExportMetadata = {
      ...manifest,
      files: updatedFiles,
    }

    // Create zip package
    const zipPath = createZipPackage(zipFiles, updatedManifest, packagePath)

    return zipPath
  }
  finally {
    // Cleanup temp directory
    try {
      rmSync(tempDir, { recursive: true, force: true })
    }
    catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Verify created package
 */
async function verifyPackage(
  packagePath: string,
): Promise<{
  success: boolean
  error?: string
  warnings?: string[]
  packageSize?: number
}> {
  try {
    if (!exists(packagePath)) {
      return {
        success: false,
        error: 'Package file was not created',
        warnings: [],
      }
    }

    // Get package size
    const { statSync } = await import('node:fs')
    const stats = statSync(packagePath)
    const packageSize = stats.size

    // Verify it's a valid zip
    const { validateZipFormat } = await import('./core')
    if (!validateZipFormat(packagePath)) {
      return {
        success: false,
        error: 'Created file is not a valid zip package',
        warnings: [],
      }
    }

    return {
      success: true,
      packageSize,
      warnings: [],
    }
  }
  catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      warnings: [],
    }
  }
}

/**
 * Get export summary for preview
 */
export function getExportSummary(options: ExportOptions): {
  files: ExportFileInfo[]
  summary: {
    total: number
    byType: Record<string, number>
    codeTypes: CodeType[]
  }
} {
  const files = collectConfigFiles(
    options.codeType,
    options.scope,
    options.customItems,
  )

  const summary = getCollectionSummary(files)

  return {
    files,
    summary,
  }
}

/**
 * Validate export options
 */
export function validateExportOptions(options: Partial<ExportOptions>): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!options.codeType) {
    errors.push('Code type is required')
  }

  if (!options.scope) {
    errors.push('Export scope is required')
  }

  if (options.scope === 'custom' && (!options.customItems || options.customItems.length === 0)) {
    errors.push('Custom items are required when scope is "custom"')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
