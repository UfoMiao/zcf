import type { AgentConfigFile } from './adapter-interface'
import dayjs from 'dayjs'
import { join } from 'pathe'
import { copyFile, ensureDir, exists } from '../utils/fs-operations'

/**
 * Create a timestamped backup of a configuration file.
 *
 * Backups are stored in `<homeDir>/backup/` to keep them discoverable and
 * outside of the agent's normal config directory.
 *
 * @returns The backup path, or null when the target file does not exist yet.
 */
export function createTimestampedBackup(file: AgentConfigFile, homeDir: string): string | null {
  const targetPath = file.path
  if (!exists(targetPath)) {
    return null
  }

  const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss')
  const fileName = targetPath.split('/').pop() || 'config'
  const backupDir = join(homeDir, 'backup')
  const backupPath = join(backupDir, `${fileName}.backup_${timestamp}`)

  ensureDir(backupDir)
  copyFile(targetPath, backupPath)
  return backupPath
}

/**
 * Resolve the destination path for a projected common template.
 *
 * Common resources are rendered into the agent's private template directory
 * so that downstream tooling can treat them as agent-native files.
 */
export function projectCommonPath(commonSource: string, commonDir: string, agentTemplateDir: string): string {
  const relative = commonSource.slice(commonDir.length).replace(/^\/+/, '')
  return join(agentTemplateDir, relative)
}

/**
 * Resolve the destination path for a skill manifest.
 */
export function projectSkillPath(skillSource: string, skillsDir: string, namespace?: string, name?: string): string {
  const skillName = name || skillSource.split('/').pop()?.replace(/\.md$/i, '') || 'skill'
  return namespace ? join(skillsDir, namespace, skillName, 'SKILL.md') : join(skillsDir, skillName, 'SKILL.md')
}

/**
 * Determine whether a source path belongs to a common template directory.
 */
export function isCommonTemplatePath(source: string, commonDir: string): boolean {
  const normalizedCommon = commonDir.replace(/\/$/, '')
  return source.startsWith(normalizedCommon)
}

/**
 * Compute the agent-specific destination for a template source.
 *
 * - Agent-private templates (`templates/<agent>/...`) render directly to the
 *   agent home directory, preserving the internal directory structure.
 * - Common templates (`templates/common/...`) are projected under the agent's
 *   template directory first, then rendered relative to the agent home.
 */
export function resolveTemplateDestination(
  source: string,
  agentTemplateDir: string,
  agentHomeDir: string,
  commonDir: string,
): string {
  if (isCommonTemplatePath(source, commonDir)) {
    const projected = projectCommonPath(source, commonDir, agentTemplateDir)
    return projected.replace(agentTemplateDir, agentHomeDir)
  }

  return source.replace(agentTemplateDir, agentHomeDir)
}
