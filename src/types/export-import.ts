/**
 * Type definitions for ZCF configuration export and import functionality
 *
 * This module provides comprehensive type definitions for the export/import system,
 * supporting both Claude Code and Codex configurations with cross-platform compatibility.
 */

/**
 * Code tool type for configuration management
 */
export type CodeType = 'claude-code' | 'codex' | 'all'

/**
 * Export scope options - defines what configuration items to include in the export
 */
export type ExportScope = 'all' | 'workflows' | 'mcp' | 'settings' | 'custom'

/**
 * Merge strategy for importing configurations
 * - replace: Completely replace existing configuration
 * - merge: Deep merge with existing configuration (imported config takes precedence)
 * - skip-existing: Only import items that don't exist in current config
 */
export type MergeStrategy = 'replace' | 'merge' | 'skip-existing'

/**
 * Configuration item type for selective export/import
 */
export type ConfigItemType = 'settings' | 'profiles' | 'workflows' | 'agents' | 'mcp' | 'hooks' | 'skills'

/**
 * Platform identifier for cross-platform path adaptation
 */
export type PlatformType = 'win32' | 'darwin' | 'linux' | 'termux'

/**
 * Individual export item specification for custom exports
 */
export interface ExportItem {
  /** Type of configuration item */
  type: ConfigItemType
  /** Specific item name or path (optional - if omitted, exports all items of this type) */
  name?: string
  /** Original file path (relative to config root) */
  path: string
}

/**
 * Options for export operation
 */
export interface ExportOptions {
  /** Target code tool(s) to export configuration from */
  codeType: CodeType
  /** Export scope - what to include in the export package */
  scope: ExportScope
  /** Custom items for selective export (only used when scope is 'custom') */
  customItems?: ExportItem[]
  /** Whether to include sensitive data (API keys, tokens) */
  includeSensitive: boolean
  /** Output path for the export package (defaults to current directory) */
  outputPath?: string
  /** Language for interactive prompts */
  lang?: string
}

/**
 * File information in the export package manifest
 */
export interface ExportFileInfo {
  /** Relative path within the export package */
  path: string
  /** Type of configuration item */
  type: ConfigItemType
  /** File size in bytes */
  size: number
  /** SHA-256 checksum for integrity verification */
  checksum: string
  /** Whether this file contains sensitive data */
  hasSensitiveData?: boolean
  /** Original absolute path (for reference, not included in export) */
  originalPath?: string
}

/**
 * Export package metadata - stored as manifest.json in the root of the package
 */
export interface ExportMetadata {
  /** ZCF version that created this export */
  version: string
  /** Export creation timestamp (ISO 8601 format) */
  exportDate: string
  /** Source platform identifier */
  platform: PlatformType
  /** Code tool(s) included in this export */
  codeType: CodeType
  /** Export scope items included */
  scope: string[]
  /** Whether this package contains sensitive data (API keys, tokens) */
  hasSensitiveData: boolean
  /** List of all files in the package with metadata */
  files: ExportFileInfo[]
  /** Optional description of the export */
  description?: string
  /** Optional tags for categorization */
  tags?: string[]
}

/**
 * Options for import operation
 */
export interface ImportOptions {
  /** Path to the export package (.zip file) */
  packagePath: string
  /** Target code tool to import into (auto-detected from package if not specified) */
  targetCodeType?: CodeType
  /** Merge strategy for handling conflicts with existing configuration */
  mergeStrategy: MergeStrategy
  /** Whether to import sensitive data (if available in package) */
  importSensitive: boolean
  /** Whether to create backup before import */
  backup: boolean
  /** Language for interactive prompts */
  lang?: string
}

/**
 * Validation error information
 */
export interface ValidationError {
  /** Error code for programmatic handling */
  code: string
  /** Human-readable error message */
  message: string
  /** Field or item that caused the error */
  field?: string
  /** Additional context or details */
  details?: any
}

/**
 * Validation warning information (non-fatal issues)
 */
export interface ValidationWarning {
  /** Warning code for programmatic handling */
  code: string
  /** Human-readable warning message */
  message: string
  /** Field or item that triggered the warning */
  field?: string
  /** Additional context or details */
  details?: any
}

/**
 * Result of package validation
 */
export interface ValidationResult {
  /** Whether the package passed validation */
  valid: boolean
  /** Fatal errors that prevent import */
  errors: ValidationError[]
  /** Non-fatal warnings (import can proceed with caution) */
  warnings: ValidationWarning[]
  /** Package metadata (if successfully extracted) */
  metadata?: ExportMetadata
  /** Platform compatibility check result */
  platformCompatible?: boolean
  /** Version compatibility check result */
  versionCompatible?: boolean
}

/**
 * Conflict information for merge operations
 */
export interface ConfigConflict {
  /** Type of conflicting item */
  type: ConfigItemType
  /** Name/identifier of the conflicting item */
  name: string
  /** Existing value in current configuration */
  existing: any
  /** New value from import package */
  incoming: any
  /** Suggested resolution strategy */
  suggestedResolution?: 'use-existing' | 'use-incoming' | 'merge' | 'rename'
}

/**
 * Result of export operation
 */
export interface ExportResult {
  /** Whether the export succeeded */
  success: boolean
  /** Path to the created export package */
  packagePath?: string
  /** Number of files included in the export */
  fileCount?: number
  /** Total size of the export package in bytes */
  packageSize?: number
  /** Error message if export failed */
  error?: string
  /** List of warnings encountered during export */
  warnings?: string[]
}

/**
 * Result of import operation
 */
export interface ImportResult {
  /** Whether the import succeeded */
  success: boolean
  /** Number of files imported */
  fileCount?: number
  /** Path to backup created before import (if backup was enabled) */
  backupPath?: string
  /** List of conflicts that were resolved */
  resolvedConflicts?: ConfigConflict[]
  /** Error message if import failed */
  error?: string
  /** List of warnings encountered during import */
  warnings?: string[]
  /** Whether a rollback is available */
  rollbackAvailable?: boolean
}

/**
 * Sensitive data field definition for sanitization
 */
export interface SensitiveField {
  /** Field path (dot notation, e.g., 'env.ANTHROPIC_API_KEY') */
  path: string
  /** Replacement value for sanitized field */
  replacement: string
  /** Pattern to detect the field (optional, for complex matching) */
  pattern?: RegExp
}

/**
 * Path mapping for cross-platform adaptation
 */
export interface PathMapping {
  /** Original path from source platform */
  original: string
  /** Adapted path for target platform */
  adapted: string
  /** Type of path (absolute, relative, environment variable, etc.) */
  type: 'absolute' | 'relative' | 'env-var' | 'mixed'
  /** Whether the path was successfully adapted */
  success: boolean
  /** Warning message if adaptation has potential issues */
  warning?: string
}

/**
 * Progress information for export/import operations
 */
export interface ProgressInfo {
  /** Current step description */
  step: string
  /** Current progress (0-100) */
  progress: number
  /** Total number of items to process */
  total?: number
  /** Number of items completed */
  completed?: number
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number
}

/**
 * Callback function for progress updates
 */
export type ProgressCallback = (info: ProgressInfo) => void
