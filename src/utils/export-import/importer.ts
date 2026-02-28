/**
 * Main importer module for ZCF configuration import functionality
 *
 * This module provides the primary import functionality that:
 * - Validates import packages
 * - Extracts and verifies package contents
 * - Adapts paths for cross-platform compatibility
 * - Merges configurations based on user-selected strategy
 * - Creates backups before applying changes
 * - Handles rollback on failure
 */

import type {
  CodeType,
  ConfigConflict,
  ExportMetadata,
  ImportOptions,
  ImportResult,
  ProgressCallback,
} from '../../types/export-import'
import { mkdirSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { backupExistingConfig } from '../config'
import { copyFile, exists, readFile, writeFile } from '../fs-operations'
import { extractZipPackage } from './core'
import { mergeConfigs, mergeMcpServices, mergeProfiles } from './merger'
import { adaptConfigPaths, adaptMcpPaths } from './path-adapter'
import { validatePackage } from './validator'

/**
 * Default import options
 */
const DEFAULT_IMPORT_OPTIONS: Partial<ImportOptions> = {
  mergeStrategy: 'merge',
  importSensitive: false,
  backup: true,
  lang: 'en',
}

/**
 * Execute import operation
 *
 * @param options - Import options
 * @param progressCallback - Optional callback for progress updates
 * @returns Import result with status and metadata
 */
export async function executeImport(
  options: ImportOptions,
  progressCallback?: ProgressCallback,
): Promise<ImportResult> {
  let tempDir: string | null = null
  let backupPath: string | null = null

  try {
    // Merge with default options
    const opts: ImportOptions = {
      ...DEFAULT_IMPORT_OPTIONS,
      ...options,
    }

    // Step 1: Validate package
    progressCallback?.({
      step: 'Validating package',
      progress: 10,
    })

    const validation = validatePackage(opts.packagePath)

    if (!validation.valid) {
      return {
        success: false,
        error: `Package validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
        warnings: validation.warnings.map(w => w.message),
      }
    }

    const metadata = validation.metadata!

    // Step 2: Create backup if enabled
    if (opts.backup) {
      progressCallback?.({
        step: 'Creating backup',
        progress: 20,
      })

      backupPath = await createImportBackup(metadata.codeType)
    }

    // Step 3: Extract package
    progressCallback?.({
      step: 'Extracting package',
      progress: 30,
    })

    tempDir = join(homedir(), '.zcf-temp', `import-${Date.now()}`)
    mkdirSync(tempDir, { recursive: true })

    extractZipPackage(opts.packagePath, tempDir)

    // Step 4: Adapt paths for cross-platform compatibility
    progressCallback?.({
      step: 'Adapting paths',
      progress: 50,
    })

    const { adaptedFiles, warnings } = await adaptImportedFiles(
      tempDir,
      metadata,
    )

    // Step 5: Detect conflicts
    progressCallback?.({
      step: 'Detecting conflicts',
      progress: 60,
    })

    const conflicts = await detectImportConflicts(
      adaptedFiles,
      metadata,
      opts.mergeStrategy,
    )

    // Step 6: Apply configurations
    progressCallback?.({
      step: 'Applying configurations',
      progress: 75,
    })

    await applyImportedConfigs(
      adaptedFiles,
      metadata,
      opts.mergeStrategy,
      opts.importSensitive,
    )

    // Step 7: Complete
    progressCallback?.({
      step: 'Import complete',
      progress: 100,
    })

    return {
      success: true,
      fileCount: metadata.files.length,
      backupPath: backupPath || undefined,
      resolvedConflicts: conflicts,
      warnings: [
        ...validation.warnings.map(w => w.message),
        ...warnings,
      ],
      rollbackAvailable: backupPath !== null,
    }
  }
  catch (error) {
    // Attempt rollback if backup was created
    if (backupPath) {
      try {
        await rollbackFromBackup(backupPath)
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          warnings: ['Import failed but successfully rolled back to backup'],
          rollbackAvailable: false,
        }
      }
      catch (rollbackError) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          warnings: [
            `Rollback also failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`,
          ],
          rollbackAvailable: true,
          backupPath: backupPath || undefined,
        }
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      warnings: [],
      rollbackAvailable: false,
    }
  }
  finally {
    // Cleanup temporary directory
    if (tempDir) {
      try {
        rmSync(tempDir, { recursive: true, force: true })
      }
      catch {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Create backup before import
 */
async function createImportBackup(_codeType: CodeType): Promise<string> {
  // Use existing backup function from config.ts
  // It returns the backup directory path or null if no backup was needed
  const backupDir = backupExistingConfig()

  if (!backupDir) {
    throw new Error('Failed to create backup before import')
  }

  return backupDir
}

/**
 * Adapt imported files for cross-platform compatibility
 */
async function adaptImportedFiles(
  extractDir: string,
  metadata: ExportMetadata,
): Promise<{
  adaptedFiles: Map<string, any>
  warnings: string[]
}> {
  const adaptedFiles = new Map<string, any>()
  const warnings: string[] = []

  for (const fileInfo of metadata.files) {
    const filePath = join(extractDir, fileInfo.path)

    if (!exists(filePath)) {
      warnings.push(`File not found: ${fileInfo.path}`)
      continue
    }

    // Read file content
    const content = readFile(filePath, 'utf-8')

    // Parse JSON files
    if (filePath.endsWith('.json')) {
      try {
        const config = JSON.parse(content)

        // Adapt paths based on file type
        if (fileInfo.type === 'mcp' || fileInfo.path.includes('mcp')) {
          const { adapted, warnings: mcpWarnings } = adaptMcpPaths(
            config,
            metadata.platform,
          )
          adaptedFiles.set(fileInfo.path, adapted)
          warnings.push(...mcpWarnings)
        }
        else {
          const { adaptedConfig, warnings: pathWarnings } = adaptConfigPaths(
            config,
            metadata.platform,
          )
          adaptedFiles.set(fileInfo.path, adaptedConfig)
          warnings.push(...pathWarnings)
        }
      }
      catch (error) {
        warnings.push(`Failed to parse JSON file ${fileInfo.path}: ${error instanceof Error ? error.message : String(error)}`)
        adaptedFiles.set(fileInfo.path, content)
      }
    }
    else {
      // Non-JSON files: store as-is
      adaptedFiles.set(fileInfo.path, content)
    }
  }

  return { adaptedFiles, warnings }
}

/**
 * Detect conflicts between imported and existing configurations
 */
async function detectImportConflicts(
  adaptedFiles: Map<string, any>,
  metadata: ExportMetadata,
  mergeStrategy: ImportOptions['mergeStrategy'],
): Promise<ConfigConflict[]> {
  const conflicts: ConfigConflict[] = []

  // In replace mode, no conflicts are detected
  if (mergeStrategy === 'replace') {
    return conflicts
  }

  // Check each file for conflicts
  for (const [relativePath, importedConfig] of adaptedFiles.entries()) {
    const targetPath = resolveTargetPath(relativePath, metadata.codeType)

    if (!exists(targetPath)) {
      continue // No conflict if file doesn't exist
    }

    // Read existing config
    const existingContent = readFile(targetPath, 'utf-8')

    if (relativePath.endsWith('.json')) {
      try {
        const existingConfig = JSON.parse(existingContent)

        // Detect conflicts based on config type
        const { conflicts: fileConflicts } = mergeConfigs(
          existingConfig,
          importedConfig,
          mergeStrategy,
        )

        conflicts.push(...fileConflicts)
      }
      catch {
        // If parsing fails, treat as potential conflict
        conflicts.push({
          type: 'settings',
          name: relativePath,
          existing: existingContent,
          incoming: importedConfig,
          suggestedResolution: 'use-incoming',
        })
      }
    }
  }

  return conflicts
}

/**
 * Apply imported configurations to the system
 */
async function applyImportedConfigs(
  adaptedFiles: Map<string, any>,
  metadata: ExportMetadata,
  mergeStrategy: ImportOptions['mergeStrategy'],
  _importSensitive: boolean,
): Promise<void> {
  for (const [relativePath, importedConfig] of adaptedFiles.entries()) {
    const targetPath = resolveTargetPath(relativePath, metadata.codeType)

    // Create target directory if needed
    const targetDir = join(targetPath, '..')
    mkdirSync(targetDir, { recursive: true })

    // Handle based on merge strategy
    if (mergeStrategy === 'replace' || !exists(targetPath)) {
      // Replace or new file: write directly
      if (typeof importedConfig === 'string') {
        writeFile(targetPath, importedConfig, 'utf-8')
      }
      else {
        writeFile(targetPath, JSON.stringify(importedConfig, null, 2), 'utf-8')
      }
    }
    else {
      // Merge or skip-existing: read existing and merge
      const existingContent = readFile(targetPath, 'utf-8')

      if (relativePath.endsWith('.json')) {
        try {
          const existingConfig = JSON.parse(existingContent)

          let merged: any

          // Special handling for MCP configurations
          if (relativePath.includes('mcp')) {
            const { merged: mcpMerged } = mergeMcpServices(
              existingConfig,
              importedConfig,
              mergeStrategy,
            )
            merged = mcpMerged
          }
          // Special handling for profile configurations
          else if (relativePath.includes('profile') || relativePath.includes('zcf-config')) {
            const { merged: profileMerged } = mergeProfiles(
              existingConfig,
              importedConfig,
              mergeStrategy,
            )
            merged = profileMerged
          }
          // General merge
          else {
            const { merged: generalMerged } = mergeConfigs(
              existingConfig,
              importedConfig,
              mergeStrategy,
            )
            merged = generalMerged
          }

          writeFile(targetPath, JSON.stringify(merged, null, 2), 'utf-8')
        }
        catch (error) {
          throw new Error(`Failed to merge configuration ${relativePath}: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
      else {
        // Non-JSON files: use incoming or skip based on strategy
        if (mergeStrategy !== 'skip-existing') {
          if (typeof importedConfig === 'string') {
            writeFile(targetPath, importedConfig, 'utf-8')
          }
          else {
            writeFile(targetPath, JSON.stringify(importedConfig, null, 2), 'utf-8')
          }
        }
      }
    }
  }
}

/**
 * Resolve target path for imported file
 */
function resolveTargetPath(relativePath: string, _codeType: CodeType): string {
  const homeDir = homedir()

  // Extract code type from path (configs/claude-code/... or configs/codex/...)
  if (relativePath.startsWith('configs/claude-code/')) {
    const subPath = relativePath.replace('configs/claude-code/', '')
    return join(homeDir, '.claude', subPath)
  }
  else if (relativePath.startsWith('configs/codex/')) {
    const subPath = relativePath.replace('configs/codex/', '')
    return join(homeDir, '.codex', subPath)
  }
  else if (relativePath.startsWith('workflows/')) {
    const subPath = relativePath.replace('workflows/', '')
    return join(homeDir, '.claude', subPath)
  }
  else if (relativePath.startsWith('mcp/')) {
    const subPath = relativePath.replace('mcp/', '')
    return join(homeDir, '.claude', subPath)
  }

  // Default: place in .claude directory
  return join(homeDir, '.claude', relativePath)
}

/**
 * Rollback from backup
 */
async function rollbackFromBackup(backupPath: string): Promise<void> {
  if (!exists(backupPath)) {
    throw new Error(`Backup not found: ${backupPath}`)
  }

  const homeDir = homedir()
  const claudeDir = join(homeDir, '.claude')

  // Restore from backup
  // This is a simplified rollback - in production, you'd want more sophisticated logic
  const backupFiles = await import('fs-extra').then(fs => fs.readdirSync(backupPath, { recursive: true }))

  for (const file of backupFiles) {
    if (typeof file !== 'string') {
      continue
    }

    const sourcePath = join(backupPath, file)
    const targetPath = join(claudeDir, file)

    if (exists(sourcePath) && !sourcePath.endsWith('/')) {
      const targetDir = join(targetPath, '..')
      mkdirSync(targetDir, { recursive: true })
      copyFile(sourcePath, targetPath)
    }
  }
}

/**
 * Get import summary for preview
 */
export function getImportSummary(packagePath: string): {
  metadata?: ExportMetadata
  validation: any
  conflicts: ConfigConflict[]
} {
  const validation = validatePackage(packagePath)

  if (!validation.valid || !validation.metadata) {
    return {
      validation,
      conflicts: [],
    }
  }

  // For preview, we don't detect actual conflicts yet
  // That happens during the import process
  return {
    metadata: validation.metadata,
    validation,
    conflicts: [],
  }
}
