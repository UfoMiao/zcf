import type { AgentAdapter, AgentConfigFile, AgentContext, AgentSkillSpec, InstallOptions, UninstallOptions, UpdateOptions } from '../adapter-interface'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { TemplateEngine } from '../../core/template-engine'
import { i18n } from '../../i18n'
import { exists, isDirectory, isFile, readDir } from '../../utils/fs-operations'
import { commandExists } from '../../utils/platform'
import { createTimestampedBackup } from '../backup'

const homeDir = join(homedir(), '.opencode')

const configFiles: AgentConfigFile[] = [
  { id: 'config', path: join(homeDir, 'config.json'), format: 'json', mergeStrategy: 'merge' },
]

const skillSpec: AgentSkillSpec = {
  skillsDir: join(homeDir, 'skills'),
  manifestName: 'SKILL.md',
  scopes: ['global', 'project'],
}

/**
 * Collect skill packages from the agent template directory.
 */
async function collectSkills(templateDir: string): Promise<Array<{ sourcePath: string, targetPath: string, meta: Record<string, unknown> }>> {
  const skillsDir = join(templateDir, 'skills')
  if (!exists(skillsDir)) {
    return []
  }

  const result: Array<{ sourcePath: string, targetPath: string, meta: Record<string, unknown> }> = []
  const namespaces = readDir(skillsDir)

  for (const namespace of namespaces) {
    const namespacePath = join(skillsDir, namespace)
    if (!isDirectory(namespacePath))
      continue

    const skillNames = readDir(namespacePath)
    for (const skillName of skillNames) {
      const skillPath = join(namespacePath, skillName)
      if (!isDirectory(skillPath))
        continue

      const manifestPath = join(skillPath, 'SKILL.md')
      if (isFile(manifestPath)) {
        result.push({
          sourcePath: skillPath,
          targetPath: join(skillSpec.skillsDir, namespace, skillName),
          meta: { namespace, name: skillName },
        })
      }
    }
  }

  return result
}

/**
 * Render all agent-specific templates plus shared common templates.
 */
async function renderAgentTemplates(adapter: AgentAdapter, options: { force?: boolean }, _ctx: AgentContext): Promise<void> {
  const engine = new TemplateEngine({ force: options.force })

  // Render adapter config files declared in configFiles.
  for (const file of adapter.configFiles) {
    await engine.renderConfigFile(file, adapter)
  }

  // Render shared common templates (output-styles, workflows, etc.).
  await engine.renderCommon('templates/common', adapter)

  // Render skill packages.
  const skills = await collectSkills(adapter.templateDir)
  for (const skill of skills) {
    const transformed = adapter.skillSpec.transform
      ? adapter.skillSpec.transform({
          meta: skill.meta as any,
          body: '',
          sourcePath: skill.sourcePath,
          targetPath: skill.targetPath,
        })
      : { ...skill, targetPath: skill.targetPath, meta: skill.meta as any, body: '', sourcePath: skill.sourcePath }
    await engine.renderSkill(transformed)
  }
}

/**
 * OpenCode adapter (pilot implementation).
 *
 * Uses the generic template engine to install configuration, common templates,
 * and skill packages into ~/.opencode/.
 */
export const opencodeAdapter: AgentAdapter = {
  id: 'opencode',
  displayName: 'OpenCode',
  aliases: ['oc'],
  homeDir,
  configFiles,
  templateDir: 'templates/opencode',
  skillSpec,

  async isInstalled(): Promise<boolean> {
    return await commandExists('opencode')
  },

  async install(options: InstallOptions, ctx: AgentContext): Promise<void> {
    if (!await this.isInstalled()) {
      console.warn(i18n.t('opencode:notInstalled'))
    }
    console.log(i18n.t('opencode:installingConfig'))
    await renderAgentTemplates(this, { force: options.force }, ctx)
    console.log(i18n.t('opencode:installComplete'))
  },

  async update(_options: UpdateOptions, ctx: AgentContext): Promise<void> {
    await renderAgentTemplates(this, { force: false }, ctx)
    console.log(i18n.t('opencode:updateComplete'))
  },

  async uninstall(_options: UninstallOptions, _ctx: AgentContext): Promise<void> {
    const { rmSync } = await import('node:fs')
    let removed = false

    for (const file of configFiles) {
      if (existsSync(file.path)) {
        await this.backup(file)
        rmSync(file.path, { force: true })
        removed = true
      }
    }

    const zcfSkillsDir = join(skillSpec.skillsDir, 'zcf')
    if (existsSync(zcfSkillsDir)) {
      rmSync(zcfSkillsDir, { recursive: true, force: true })
      removed = true
    }

    console.log(i18n.t(removed ? 'opencode:uninstallComplete' : 'opencode:skippedNoConfig'))
  },

  async backup(file: AgentConfigFile): Promise<string | null> {
    return createTimestampedBackup(file, homeDir)
  },
}
