import type { AgentAdapter, AgentConfigFile, AgentContext, AgentSkillSpec, InstallOptions, UninstallOptions, UpdateOptions } from '../adapter-interface'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { i18n } from '../../i18n'
import { createTimestampedBackup } from '../backup'

const homeDir = join(homedir(), '.opencode')

const configFiles: AgentConfigFile[] = [
  { id: 'config', path: join(homeDir, 'config.json'), format: 'json', mergeStrategy: 'merge' },
]

const skillSpec: AgentSkillSpec = {
  skillsDir: join(homeDir, 'skills'),
  manifestName: 'SKILL.md',
  scopes: ['global', 'project'],
  transform(skill) {
    // OpenCode expects skills under .opencode/skills/<namespace>/<name>/SKILL.md
    const namespace = skill.meta.namespace || 'zcf'
    return {
      ...skill,
      targetPath: join(skill.targetPath, namespace, skill.meta.name),
    }
  },
}

/**
 * Pilot OpenCode adapter (skill-form only).
 *
 * Phase 0-2 (UFO-131) registers OpenCode so the registry can list it and the
 * skill engine can target its skill directory. Full install/update/uninstall
 * integration is intentionally out of scope for Phase 0-2 and will be handled
 * in Phase 3-4 (UFO-132).
 */
export const opencodeAdapter: AgentAdapter = {
  id: 'opencode',
  displayName: 'OpenCode',
  aliases: ['oc'],
  homeDir,
  configFiles,
  templateDir: 'templates/opencode',
  skillSpec,

  isInstalled(): boolean {
    return false
  },

  async install(_options: InstallOptions, _ctx: AgentContext): Promise<void> {
    throw new Error(i18n.t('errors:opencodeInstallNotImplemented'))
  },

  async update(_options: UpdateOptions, _ctx: AgentContext): Promise<void> {
    throw new Error(i18n.t('errors:opencodeUpdateNotImplemented'))
  },

  async uninstall(_options: UninstallOptions, _ctx: AgentContext): Promise<void> {
    throw new Error(i18n.t('errors:opencodeUninstallNotImplemented'))
  },

  async backup(file: AgentConfigFile): Promise<string | null> {
    return createTimestampedBackup(file, homeDir)
  },
}
