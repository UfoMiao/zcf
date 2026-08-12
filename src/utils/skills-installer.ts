import type { CodeToolType } from '../constants'
// Usage: Inspect and mark installed global skill files.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
// Usage: Resolve the user's global skills directories.
import { homedir } from 'node:os'
// Usage: Build platform-independent skill paths.
import { join } from 'pathe'
import { exec } from 'tinyexec'
// Usage: Mark generated skills and recognize files already owned by ZCF.
import { isZcfResourceContent, markZcfResourceContent } from './config-ownership'

/**
 * Maps ZCF code tool types to skills CLI agent identifiers.
 * claude-code includes `universal` so non-interactive `-y` installs use symlink mode
 * (canonical `~/.agents/skills/` + symlink in `~/.claude/skills/`).
 */
export const CODE_TOOL_TO_SKILLS_AGENTS: Record<CodeToolType, string[]> = {
  'claude-code': ['claude-code', 'universal'],
  'codex': ['codex'],
}

export interface SkillsInstallOptions {
  skillsPath: string
  skillNames: string[]
  agent: CodeToolType
  global?: boolean
}

export interface SkillsInstallResult {
  success: boolean
  installedSkills: string[]
  errors: string[]
}

function getGlobalSkillRoots(agent: CodeToolType): string[] {
  return agent === 'claude-code'
    ? [join(homedir(), '.agents', 'skills'), join(homedir(), '.claude', 'skills')]
    : [join(homedir(), '.agents', 'skills')]
}

function getExistingGlobalSkillNames(skillNames: string[], agent: CodeToolType): Set<string> {
  const existingSkills = new Set<string>()
  for (const root of getGlobalSkillRoots(agent)) {
    for (const skillName of skillNames) {
      const skillFile = join(root, skillName, 'SKILL.md')
      if (existsSync(skillFile))
        existingSkills.add(skillName)
    }
  }
  return existingSkills
}

function normalizeSkillContent(content: string): string {
  return content.replace(/\r\n?/g, '\n').trimEnd()
}

function markInstalledGlobalSkills(
  skillsPath: string,
  skillNames: string[],
  agent: CodeToolType,
  existingSkills: Set<string>,
): void {
  for (const root of getGlobalSkillRoots(agent)) {
    for (const skillName of skillNames) {
      const skillFile = join(root, skillName, 'SKILL.md')
      const templateFile = join(skillsPath, skillName, 'SKILL.md')
      if (existingSkills.has(skillName) || !existsSync(skillFile) || !existsSync(templateFile))
        continue
      try {
        const content = readFileSync(skillFile, 'utf8')
        const template = readFileSync(templateFile, 'utf8')
        if (!isZcfResourceContent(content) && normalizeSkillContent(content) === normalizeSkillContent(template))
          writeFileSync(skillFile, markZcfResourceContent(content), 'utf8')
      }
      catch {
        // The CLI already reported installation success; leave unreadable files untouched.
      }
    }
  }
}

/**
 * Install skills via the open skills CLI (`npx -y skills add`).
 * Thin wrapper aligned with CodeToolRegistry routing — extend here when registry lands.
 */
export async function installSkills(options: SkillsInstallOptions): Promise<SkillsInstallResult> {
  const { skillsPath, skillNames, agent, global = true } = options
  const result: SkillsInstallResult = {
    success: true,
    installedSkills: [],
    errors: [],
  }

  if (skillNames.length === 0)
    return result

  const skillsAgents = CODE_TOOL_TO_SKILLS_AGENTS[agent]
  const args = [
    '-y',
    'skills',
    'add',
    skillsPath,
    '-y',
  ]

  for (const skillsAgent of skillsAgents)
    args.push('-a', skillsAgent)

  if (global)
    args.push('-g')

  for (const skill of skillNames)
    args.push('-s', skill)

  const existingGlobalSkillNames = global
    ? getExistingGlobalSkillNames(skillNames, agent)
    : new Set<string>()

  try {
    await exec('npx', args)
    if (global)
      markInstalledGlobalSkills(skillsPath, skillNames, agent, existingGlobalSkillNames)
    result.installedSkills.push(...skillNames)
  }
  catch (error) {
    result.success = false
    result.errors.push(`Failed to install skills: ${error}`)
  }

  return result
}

/**
 * Convert legacy command filename (e.g. git-cleanBranches.md) to skills directory name.
 */
export function commandFileToSkillName(filename: string): string {
  const base = filename.replace(/\.md$/, '')
  return base.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}
