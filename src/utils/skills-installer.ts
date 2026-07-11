import type { CodeToolType } from '../constants'
import { exec } from 'tinyexec'

/** Maps ZCF code tool types to skills CLI agent identifiers. */
export const CODE_TOOL_TO_SKILLS_AGENT: Record<CodeToolType, string> = {
  'claude-code': 'claude-code',
  'codex': 'codex',
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

  const skillsAgent = CODE_TOOL_TO_SKILLS_AGENT[agent]
  const args = [
    '-y',
    'skills',
    'add',
    skillsPath,
    '-a',
    skillsAgent,
    '-y',
    '--copy',
  ]

  if (global)
    args.push('-g')

  for (const skill of skillNames)
    args.push('-s', skill)

  try {
    await exec('npx', args)
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
