import type { AgentAdapter, AgentConfigFile, AgentContext, AgentSkillSpec, InstallOptions, UninstallOptions, UpdateOptions } from '../adapter-interface'
import { join } from 'pathe'
import { ClAUDE_CONFIG_FILE, CLAUDE_DIR, CLAUDE_MD_FILE, CLAUDE_VSC_CONFIG_FILE, SETTINGS_FILE } from '../../constants'
import { isClaudeCodeInstalled } from '../../utils/installer'
import { createTimestampedBackup } from '../backup'

const homeDir = CLAUDE_DIR

const configFiles: AgentConfigFile[] = [
  { id: 'settings', path: SETTINGS_FILE, format: 'json', mergeStrategy: 'merge' },
  { id: 'claude-md', path: CLAUDE_MD_FILE, format: 'markdown', mergeStrategy: 'append' },
  { id: 'claude-json', path: ClAUDE_CONFIG_FILE, format: 'json', mergeStrategy: 'merge' },
  { id: 'vs-code-config', path: CLAUDE_VSC_CONFIG_FILE, format: 'json', mergeStrategy: 'merge' },
]

const skillSpec: AgentSkillSpec = {
  skillsDir: join(CLAUDE_DIR, 'skills'),
  manifestName: 'SKILL.md',
  scopes: ['global', 'project'],
}

function toInitOptions(options: InstallOptions): Record<string, unknown> {
  return { ...options, codeType: 'claude-code' as const }
}

function toUpdateOptions(options: UpdateOptions): Record<string, unknown> {
  return { ...options, codeType: 'claude-code' as const }
}

function toUninstallOptions(options: UninstallOptions): Record<string, unknown> {
  return { ...options, codeType: 'claude-code' as const }
}

/**
 * Legacy Claude Code adapter.
 *
 * Phase 0-2 (UFO-131) keeps this as a thin proxy over existing commands.
 * Phase 3-4 (UFO-132) will inline the business logic here and thin the
 * command layer to pure parameter parsing.
 */
export const claudeCodeAdapter: AgentAdapter = {
  id: 'claude-code',
  displayName: 'Claude Code',
  aliases: ['cc', 'claude'],
  homeDir,
  configFiles,
  templateDir: 'templates/claude-code',
  skillSpec,

  isInstalled: isClaudeCodeInstalled,

  async install(options: InstallOptions, _ctx: AgentContext): Promise<void> {
    const { init } = await import('../../commands/init')
    await init(toInitOptions(options) as any)
  },

  async update(options: UpdateOptions, _ctx: AgentContext): Promise<void> {
    const { update } = await import('../../commands/update')
    await update(toUpdateOptions(options) as any)
  },

  async uninstall(options: UninstallOptions, _ctx: AgentContext): Promise<void> {
    const { uninstall } = await import('../../commands/uninstall')
    await uninstall(toUninstallOptions(options) as any)
  },

  async backup(file: AgentConfigFile): Promise<string | null> {
    return createTimestampedBackup(file, homeDir)
  },
}
