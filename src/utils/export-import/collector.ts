/**
 * Configuration file collector for export functionality
 *
 * This module handles collecting configuration files from the system
 * based on the selected code tool type and export scope.
 */

import type {
  CodeType,
  ConfigItemType,
  ExportFileInfo,
  ExportItem,
  ExportScope,
} from '../../types/export-import'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { CLAUDE_DIR, CODEX_DIR } from '../../constants'
import { exists, isDirectory, isFile, readDir } from '../fs-operations'
import { getFileInfo } from './core'

/**
 * Claude Code configuration file paths
 */
export const CLAUDE_CODE_FILES = {
  settings: join(CLAUDE_DIR, 'settings.json'),
  claudeMd: join(CLAUDE_DIR, 'CLAUDE.md'),
  config: join(homedir(), '.claude.json'),
  vscConfig: join(CLAUDE_DIR, 'config.json'),
  zcfConfig: join(CLAUDE_DIR, 'zcf-config.toml'),
}

/**
 * Codex configuration file paths
 */
export const CODEX_FILES = {
  config: join(CODEX_DIR, 'config.toml'),
  auth: join(CODEX_DIR, 'auth.json'),
  agents: join(CODEX_DIR, 'AGENTS.md'),
}

/**
 * Directory paths for different configuration types
 */
export const CONFIG_DIRS = {
  claudeCode: {
    workflows: join(CLAUDE_DIR, 'agents'),
    skills: join(CLAUDE_DIR, 'skills'),
    hooks: join(CLAUDE_DIR, 'hooks'),
  },
  codex: {
    workflows: join(CODEX_DIR, 'agents'),
    prompts: join(CODEX_DIR, 'prompts'),
  },
}

/**
 * Check if a workflow file is a ZCF standard workflow
 * ZCF workflows are installed in ~/.claude/agents/zcf/ directory and are excluded from export
 * @param relativePath - Relative path from the workflows directory
 * @returns true if it's a standard workflow that should be excluded from export
 */
function isZcfStandardWorkflow(relativePath: string): boolean {
  // Normalize path separators to forward slash
  const normalizedPath = relativePath.replace(/\\/g, '/')

  // Check if the path starts with 'zcf/' or is exactly 'zcf'
  return normalizedPath === 'zcf' || normalizedPath.startsWith('zcf/')
}

/**
 * Collect Claude Code configuration files
 */
export function collectClaudeCodeConfig(scope: ExportScope): ExportFileInfo[] {
  const files: ExportFileInfo[] = []

  // Include settings files only for 'all' or 'settings' scope
  if (scope === 'all' || scope === 'settings') {
    // Always include settings.json if it exists
    if (exists(CLAUDE_CODE_FILES.settings)) {
      files.push(getFileInfo(
        CLAUDE_CODE_FILES.settings,
        'configs/claude-code/settings.json',
        'settings',
      ))
    }

    // Include ZCF config if it exists
    if (exists(CLAUDE_CODE_FILES.zcfConfig)) {
      files.push(getFileInfo(
        CLAUDE_CODE_FILES.zcfConfig,
        'configs/claude-code/zcf-config.toml',
        'profiles',
      ))
    }

    // Include CLAUDE.md if it exists
    if (exists(CLAUDE_CODE_FILES.claudeMd)) {
      files.push(getFileInfo(
        CLAUDE_CODE_FILES.claudeMd,
        'configs/claude-code/CLAUDE.md',
        'settings',
      ))
    }
  }

  // Collect based on scope
  if (scope === 'all' || scope === 'workflows') {
    files.push(...collectWorkflows('claude-code'))
  }

  if (scope === 'all') {
    files.push(...collectSkills('claude-code'))
    files.push(...collectHooks('claude-code'))
  }

  return files
}

/**
 * Collect Codex configuration files
 */
export function collectCodexConfig(scope: ExportScope): ExportFileInfo[] {
  const files: ExportFileInfo[] = []

  // Include settings files only for 'all' or 'settings' scope
  if (scope === 'all' || scope === 'settings') {
    // Always include config.toml if it exists
    if (exists(CODEX_FILES.config)) {
      files.push(getFileInfo(
        CODEX_FILES.config,
        'configs/codex/config.toml',
        'settings',
      ))
    }

    // Include auth.json if it exists
    if (exists(CODEX_FILES.auth)) {
      files.push(getFileInfo(
        CODEX_FILES.auth,
        'configs/codex/auth.json',
        'settings',
      ))
    }

    // Include AGENTS.md if it exists
    if (exists(CODEX_FILES.agents)) {
      files.push(getFileInfo(
        CODEX_FILES.agents,
        'configs/codex/AGENTS.md',
        'settings',
      ))
    }
  }

  // Collect based on scope
  if (scope === 'all' || scope === 'workflows') {
    files.push(...collectWorkflows('codex'))
  }

  if (scope === 'all') {
    files.push(...collectPrompts())
  }

  return files
}

/**
 * Collect workflow/agent files (excludes ZCF standard workflows)
 */
export function collectWorkflows(codeType: 'claude-code' | 'codex'): ExportFileInfo[] {
  const files: ExportFileInfo[] = []
  const configKey = codeType === 'claude-code' ? 'claudeCode' : 'codex'
  const workflowDir = CONFIG_DIRS[configKey].workflows

  if (!exists(workflowDir) || !isDirectory(workflowDir)) {
    return files
  }

  const entries = readDir(workflowDir)
  for (const entry of entries) {
    const fullPath = join(workflowDir, entry)
    if (isFile(fullPath)) {
      // Skip ZCF standard workflows
      if (!isZcfStandardWorkflow(entry)) {
        files.push(getFileInfo(
          fullPath,
          `workflows/${codeType}/${entry}`,
          'workflows',
        ))
      }
    }
    else if (isDirectory(fullPath)) {
      // Recursively collect files in subdirectories, excluding ZCF standard workflows
      const subdirFiles = collectDirectoryFilesWithFilter(
        fullPath,
        `workflows/${codeType}/${entry}`,
        'workflows',
        entry, // Pass the subdirectory name for filtering
      )
      files.push(...subdirFiles)
    }
  }

  return files
}

/**
 * Collect skill files (Claude Code only)
 */
export function collectSkills(_codeType: 'claude-code'): ExportFileInfo[] {
  const files: ExportFileInfo[] = []
  const skillsDir = CONFIG_DIRS.claudeCode.skills

  if (!exists(skillsDir) || !isDirectory(skillsDir)) {
    return files
  }

  return collectDirectoryFiles(skillsDir, 'skills', 'skills')
}

/**
 * Collect hook files (Claude Code only)
 */
export function collectHooks(_codeType: 'claude-code'): ExportFileInfo[] {
  const files: ExportFileInfo[] = []
  const hooksDir = CONFIG_DIRS.claudeCode.hooks

  if (!exists(hooksDir) || !isDirectory(hooksDir)) {
    return files
  }

  return collectDirectoryFiles(hooksDir, 'hooks', 'hooks')
}

/**
 * Collect prompt files (Codex only)
 */
export function collectPrompts(): ExportFileInfo[] {
  const files: ExportFileInfo[] = []
  const promptsDir = CONFIG_DIRS.codex.prompts

  if (!exists(promptsDir) || !isDirectory(promptsDir)) {
    return files
  }

  return collectDirectoryFiles(promptsDir, 'prompts', 'workflows')
}

/**
 * Collect MCP configuration files
 */
export function collectMcpConfig(codeType: CodeType): ExportFileInfo[] {
  const files: ExportFileInfo[] = []

  if (codeType === 'claude-code' || codeType === 'all') {
    const mcpSettingsPath = join(CLAUDE_DIR, 'mcp-settings.json')
    if (exists(mcpSettingsPath)) {
      files.push(getFileInfo(
        mcpSettingsPath,
        'mcp/claude-code/mcp-settings.json',
        'mcp',
      ))
    }
  }

  if (codeType === 'codex' || codeType === 'all') {
    const codexMcpPath = join(CODEX_DIR, 'mcp.json')
    if (exists(codexMcpPath)) {
      files.push(getFileInfo(
        codexMcpPath,
        'mcp/codex/mcp.json',
        'mcp',
      ))
    }
  }

  return files
}

/**
 * Recursively collect all files in a directory
 */
function collectDirectoryFiles(
  dirPath: string,
  relativePath: string,
  type: ConfigItemType,
): ExportFileInfo[] {
  const files: ExportFileInfo[] = []

  if (!exists(dirPath) || !isDirectory(dirPath)) {
    return files
  }

  const entries = readDir(dirPath)
  for (const entry of entries) {
    const fullPath = join(dirPath, entry)
    const relPath = `${relativePath}/${entry}`

    if (isFile(fullPath)) {
      files.push(getFileInfo(fullPath, relPath, type))
    }
    else if (isDirectory(fullPath)) {
      // Recursively collect files in subdirectories
      files.push(...collectDirectoryFiles(fullPath, relPath, type))
    }
  }

  return files
}

/**
 * Recursively collect files in a directory with ZCF standard workflow filtering
 * @param dirPath - Directory path
 * @param relativePath - Relative path for export
 * @param type - Configuration item type
 * @param baseDir - Base directory name (for filtering ZCF standard workflows)
 */
function collectDirectoryFilesWithFilter(
  dirPath: string,
  relativePath: string,
  type: ConfigItemType,
  baseDir: string,
): ExportFileInfo[] {
  const files: ExportFileInfo[] = []

  if (!exists(dirPath) || !isDirectory(dirPath)) {
    return files
  }

  const entries = readDir(dirPath)
  for (const entry of entries) {
    const fullPath = join(dirPath, entry)
    const relPath = `${relativePath}/${entry}`

    // Build relative path from workflow directory root for filtering
    const workflowRelativePath = `${baseDir}/${entry}`

    if (isFile(fullPath)) {
      // Skip ZCF standard workflows
      if (!isZcfStandardWorkflow(workflowRelativePath)) {
        files.push(getFileInfo(fullPath, relPath, type))
      }
    }
    else if (isDirectory(fullPath)) {
      // Recursively collect files in subdirectories
      files.push(...collectDirectoryFilesWithFilter(fullPath, relPath, type, workflowRelativePath))
    }
  }

  return files
}

/**
 * Collect all configuration files based on code type and scope
 */
export function collectAllConfig(codeType: CodeType, scope: ExportScope): ExportFileInfo[] {
  const files: ExportFileInfo[] = []

  if (codeType === 'claude-code' || codeType === 'all') {
    files.push(...collectClaudeCodeConfig(scope))
  }

  if (codeType === 'codex' || codeType === 'all') {
    files.push(...collectCodexConfig(scope))
  }

  // Collect MCP files if scope includes them
  if (scope === 'all' || scope === 'mcp') {
    files.push(...collectMcpConfig(codeType))
  }

  return files
}

/**
 * Collect custom selection of files
 */
export function collectCustomFiles(items: ExportItem[]): ExportFileInfo[] {
  const files: ExportFileInfo[] = []

  for (const item of items) {
    if (exists(item.path)) {
      if (isFile(item.path)) {
        files.push(getFileInfo(
          item.path,
          item.name || item.path,
          item.type,
        ))
      }
      else if (isDirectory(item.path)) {
        files.push(...collectDirectoryFiles(
          item.path,
          item.name || item.path,
          item.type,
        ))
      }
    }
  }

  return files
}

/**
 * Get collection summary
 */
export interface CollectionSummary {
  total: number
  byType: Record<ConfigItemType, number>
  codeTypes: CodeType[]
}

export function getCollectionSummary(files: ExportFileInfo[]): CollectionSummary {
  const byType: Record<ConfigItemType, number> = {
    settings: 0,
    profiles: 0,
    workflows: 0,
    agents: 0,
    mcp: 0,
    hooks: 0,
    skills: 0,
  }

  for (const file of files) {
    byType[file.type] = (byType[file.type] || 0) + 1
  }

  // Determine which code types are included
  const codeTypes: CodeType[] = []
  const hasClaudeCode = files.some(f => f.path.includes('claude-code'))
  const hasCodex = files.some(f => f.path.includes('codex'))

  if (hasClaudeCode && hasCodex) {
    codeTypes.push('all')
  }
  else if (hasClaudeCode) {
    codeTypes.push('claude-code')
  }
  else if (hasCodex) {
    codeTypes.push('codex')
  }

  return {
    total: files.length,
    byType,
    codeTypes,
  }
}
